import React, { useState, useEffect } from 'react';
import { X, Save, AlertCircle, Plus } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../utils/api';

const VariantBatchModal = ({
    variant,
    parentProduct,
    maxQuantity,
    purchasedQuantity,
    purchaseUnit,
    branches,
    onClose,
    onSuccess
}) => {
    const [formData, setFormData] = useState({
        branch_id: '',
        batch_type_id: '',
        initial_quantity: '',
        instance_code: '',
        grouped: true
    });
    const [error, setError] = useState('');
    const [remainingQty, setRemainingQty] = useState(0);

    const queryClient = useQueryClient();

    useEffect(() => {
        setRemainingQty(parseFloat(maxQuantity) || 0);
    }, [maxQuantity]);

    // Fetch product details to get category
    const { data: productData } = useQuery({
        queryKey: ['product', variant?.id],
        queryFn: async () => {
            if (!variant?.id) return null;
            const response = await api.get(`/products/${variant.id}`);
            return response.data.product;
        },
        enabled: !!variant?.id
    });

    // Fetch batch types - filtered by category if product has one, otherwise all
    const { data: batchTypesData } = useQuery({
        queryKey: ['batchTypes', productData?.category_id],
        queryFn: async () => {
            if (productData?.category_id) {
                // Fetch batch types for this category
                const response = await api.get(`/settings/batches/types/category/${productData.category_id}`);
                return { batch_types: response.data.batch_types || [] };
            } else {
                // Fetch all active batch types
                const response = await api.get('/settings/batches/types');
                return response.data;
            }
        },
        enabled: !!variant?.id
    });

    const createBatchMutation = useMutation({
        mutationFn: (data) => api.post(`/products/${variant.id}/batches`, data),
        onSuccess: (response) => {
            queryClient.invalidateQueries(['inventory']);
            const createdBatch = response.data;

            const batchedAmount = parseFloat(formData.initial_quantity);
            const newRemaining = remainingQty - batchedAmount;

            onSuccess(createdBatch, batchedAmount);

            if (newRemaining > 0) {
                setFormData(prev => ({
                    ...prev,
                    initial_quantity: '',
                    instance_code: ''
                }));
                setRemainingQty(newRemaining);
                setError('');
                // Show success message but keep modal open for another batch
            } else {
                // All quantity batched, close modal
                onClose();
            }
        },
        onError: (err) => {
            setError(err.response?.data?.error || 'Failed to create batch');
        }
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        setError('');

        if (!formData.branch_id) {
            setError('Please select a branch');
            return;
        }

        if (!formData.batch_type_id) {
            setError('Please select a batch type');
            return;
        }

        if (!formData.initial_quantity || parseFloat(formData.initial_quantity) <= 0) {
            setError('Please enter a valid quantity');
            return;
        }

        if (parseFloat(formData.initial_quantity) > remainingQty) {
            setError(`Quantity cannot exceed remaining unbatched amount (${remainingQty})`);
            return;
        }

        if (formData.grouped && !formData.instance_code) {
            setError('Instance code is required for grouped batches');
            return;
        }

        const payload = {
            product_id: variant.id, // Use variant (child product) ID
            branch_id: formData.branch_id,
            batch_type_id: formData.batch_type_id,
            initial_quantity: parseFloat(formData.initial_quantity),
            instance_code: formData.grouped ? formData.instance_code : null,
            grouped: formData.grouped
        };

        createBatchMutation.mutate(payload);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
                <div className="flex justify-between items-center p-4 border-b border-gray-100">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900">Add Inventory Batch</h3>
                        <p className="text-sm text-gray-500">
                            {variant?.sku || variant?.child?.sku || 'N/A'} - {(variant?.variation_values || variant?.child?.variation_values || []).map(v => v?.name || v?.value).filter(Boolean).join(', ') || 'Variant'}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full text-gray-500">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                    {error && (
                        <div className={`p-3 rounded-md text-sm flex items-center gap-2 ${error.startsWith('Batch created') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                            <AlertCircle className="h-4 w-4" />
                            {error}
                        </div>
                    )}

                    <div className="bg-blue-50 p-3 rounded-md text-sm text-blue-700 mb-4">
                        <div className="flex justify-between">
                            <span>Total Purchased:</span>
                            <span className="font-semibold">{purchasedQuantity} {purchaseUnit?.abbreviation || purchaseUnit?.name || ''}</span>
                        </div>
                        <div className="flex justify-between mt-1">
                            <span>Remaining to Batch:</span>
                            <span className="font-bold">{remainingQty.toFixed(3)} {parentProduct?.base_unit || ''}</span>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Branch *
                        </label>
                        <select
                            required
                            className="w-full border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                            value={formData.branch_id}
                            onChange={(e) => setFormData({ ...formData, branch_id: e.target.value })}
                        >
                            <option value="">Select Branch</option>
                            {(branches || []).map(branch => (
                                <option key={branch.id} value={branch.id}>
                                    {branch.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Batch Type *
                        </label>
                        <select
                            required
                            className="w-full border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                            value={formData.batch_type_id}
                            onChange={(e) => setFormData({ ...formData, batch_type_id: e.target.value })}
                        >
                            <option value="">Select Batch Type</option>
                            {(batchTypesData?.batch_types || []).map(type => (
                                <option key={type.id} value={type.id}>
                                    {type.name}
                                </option>
                            ))}
                        </select>
                        {batchTypesData?.batch_types?.length === 0 && productData?.category_id && (
                            <p className="text-xs text-orange-600 mt-1">
                                No batch types assigned to this product's category. Please assign batch types in Batch Settings.
                            </p>
                        )}
                    </div>

                    <div className="flex items-center gap-3">
                        <label className="text-sm font-medium text-gray-700">Grouped Batch</label>
                        <label className="relative inline-flex cursor-pointer items-center">
                            <input
                                type="checkbox"
                                checked={formData.grouped}
                                onChange={(e) => setFormData({ ...formData, grouped: e.target.checked })}
                                className="peer sr-only"
                            />
                            <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-primary-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none"></div>
                        </label>
                    </div>

                    {formData.grouped && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Instance Code *
                            </label>
                            <input
                                type="text"
                                placeholder="e.g., COIL-001"
                                className="w-full border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                                value={formData.instance_code}
                                onChange={(e) => setFormData({ ...formData, instance_code: e.target.value })}
                            />
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Quantity for this batch *
                        </label>
                        <div className="flex items-center gap-2">
                            <input
                                type="number"
                                step="0.01"
                                required
                                className="w-full border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                                value={formData.initial_quantity}
                                onChange={(e) => setFormData({ ...formData, initial_quantity: e.target.value })}
                            />
                            <span className="text-gray-500 text-sm whitespace-nowrap">
                                / {remainingQty}
                            </span>
                        </div>
                    </div>

                    <div className="flex justify-end space-x-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                        >
                            {remainingQty > 0 ? `Close (Remaining: ${remainingQty.toFixed(3)})` : 'Close'}
                        </button>
                        <button
                            type="submit"
                            disabled={createBatchMutation.isPending || remainingQty <= 0}
                            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2"
                        >
                            {createBatchMutation.isPending ? 'Creating...' : (
                                <>
                                    <Plus className="h-4 w-4" />
                                    <span>Create Batch</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default VariantBatchModal;
