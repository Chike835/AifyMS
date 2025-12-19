import { useState, useEffect } from 'react';
import { X, Check } from 'lucide-react';
import api from '../../utils/api';

const BatchSelectorModal = ({ isOpen, onClose, product, quantity, onConfirm }) => {
    const [recipe, setRecipe] = useState(null);
    const [availableBatches, setAvailableBatches] = useState([]);
    const [selectedBatches, setSelectedBatches] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Determine if we are selecting raw materials for a manufactured product
    // or just batches for a regular product.
    // We assume if fetchRecipe is successful, it's manufactured logic.
    const [isManufacturedLogic, setIsManufacturedLogic] = useState(false);

    const requiredQuantity = isManufacturedLogic && recipe
        ? parseFloat(quantity) * parseFloat(recipe.conversion_factor)
        : parseFloat(quantity);

    const selectedTotal = selectedBatches.reduce((sum, batch) => sum + parseFloat(batch.quantity_deducted || 0), 0);
    const isValid = selectedTotal >= requiredQuantity - 0.001; // Allow small floating point differences

    useEffect(() => {
        if (isOpen && product) {
            loadData();
        } else {
            // Reset state when modal closes
            setRecipe(null);
            setAvailableBatches([]);
            setSelectedBatches([]);
            setError('');
            setIsManufacturedLogic(false);
        }
    }, [isOpen, product]);

    const loadData = async () => {
        setLoading(true);
        setError('');
        try {
            // Check if product is manufactured/virtual by trying to fetch recipe
            // If product type is 'service' or 'virtual' without recipe, it shouldn't be here ideally,
            // but logic handles 'available batches' which might be empty.

            let targetProductId = product.id;
            let isManuf = false;

            // Try fetching recipe first if it looks like a manufactured product
            if (product.type === 'manufactured' || product.type === 'manufactured_virtual') {
                try {
                    const recipeResponse = await api.get(`/recipes/by-virtual/${product.id}`);
                    if (recipeResponse.data.recipe) {
                        const recipeData = recipeResponse.data.recipe;
                        setRecipe(recipeData);
                        targetProductId = recipeData.raw_product_id;
                        isManuf = true;
                    }
                } catch (err) {
                    // No recipe found, fallback to regular logic (or maybe it's just a regular product with wrong type)
                    // But if it's manufactured type, we might want to warn? 
                    // For now, assume if no recipe, treat as regular product inventory check
                    console.log("No recipe found, treating as regular item check");
                }
            }

            setIsManufacturedLogic(isManuf);

            // Fetch available batches for the target product (raw material or the product itself)
            const batchesResponse = await api.get(`/inventory/batches/available/${targetProductId}`);
            setAvailableBatches(batchesResponse.data.batches || []);

        } catch (err) {
            setError(err.response?.data?.error || 'Failed to load batch data');
        } finally {
            setLoading(false);
        }
    };

    const toggleBatchSelection = (batch) => {
        setSelectedBatches((prev) => {
            const existing = prev.find((b) => b.inventory_batch_id === batch.id);
            if (existing) {
                return prev.filter((b) => b.inventory_batch_id !== batch.id);
            } else {
                // Add batch with max available quantity
                return [
                    ...prev,
                    {
                        inventory_batch_id: batch.id,
                        instance_code: batch.instance_code,
                        available_quantity: parseFloat(batch.remaining_quantity),
                        quantity_deducted: parseFloat(batch.remaining_quantity),
                    },
                ];
            }
        });
    };

    const updateQuantity = (batchId, qty) => {
        setSelectedBatches((prev) =>
            prev.map((b) =>
                b.inventory_batch_id === batchId
                    ? { ...b, quantity_deducted: Math.max(0, Math.min(parseFloat(qty), b.available_quantity)) }
                    : b
            )
        );
    };

    const handleConfirm = () => {
        if (!isValid) {
            setError(`Selected quantity (${selectedTotal.toFixed(3)}) is less than required (${requiredQuantity.toFixed(3)})`);
            return;
        }
        onConfirm(selectedBatches);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">Select Batches</h2>
                        <p className="text-sm text-gray-600 mt-1">
                            {product.name} - {quantity} {product.base_unit}
                        </p>
                        {isManufacturedLogic && recipe && (
                            <p className="text-sm font-medium text-primary-600 mt-2">
                                Required Raw Material: {requiredQuantity.toFixed(3)} {recipe.raw_product?.base_unit || 'KG'}
                                (Product: {recipe.raw_product?.name})
                            </p>
                        )}
                        {!isManufacturedLogic && (
                            <p className="text-sm font-medium text-gray-600 mt-2">
                                Required: {requiredQuantity.toFixed(3)} {product.base_unit}
                            </p>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <X className="h-6 w-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {loading ? (
                        <div className="text-center py-12">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
                            <p className="mt-4 text-gray-600">Loading available batches...</p>
                        </div>
                    ) : error ? (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                            {error}
                        </div>
                    ) : (
                        <>
                            {availableBatches.length === 0 ? (
                                <div className="text-center py-12 text-gray-600">
                                    No available batches found for this product.
                                    {isManufacturedLogic ? ' Ensure raw materials are in stock.' : ' Ensure product is in stock.'}
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {availableBatches.map((batch) => {
                                        const isSelected = selectedBatches.some((b) => b.inventory_batch_id === batch.id);
                                        const selectedBatch = selectedBatches.find((b) => b.inventory_batch_id === batch.id);

                                        return (
                                            <div
                                                key={batch.id}
                                                className={`border rounded-lg p-4 ${isSelected ? 'border-primary-500 bg-primary-50' : 'border-gray-200'
                                                    }`}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center space-x-4">
                                                        <input
                                                            type="checkbox"
                                                            checked={isSelected}
                                                            onChange={() => toggleBatchSelection(batch)}
                                                            className="h-5 w-5 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
                                                        />
                                                        <div>
                                                            <div className="font-medium text-gray-900">
                                                                {batch.instance_code}
                                                            </div>
                                                            <div className="text-sm text-gray-600">
                                                                Available: {parseFloat(batch.remaining_quantity).toFixed(3)} {isManufacturedLogic ? recipe?.raw_product?.base_unit : product.base_unit}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    {isSelected && (
                                                        <div className="flex items-center space-x-2">
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                max={batch.remaining_quantity}
                                                                step="0.001"
                                                                value={selectedBatch?.quantity_deducted || 0}
                                                                onChange={(e) => updateQuantity(batch.id, e.target.value)}
                                                                className="w-32 px-3 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                                                            />
                                                            <span className="text-sm text-gray-600">
                                                                {isManufacturedLogic ? recipe?.raw_product?.base_unit : product.base_unit}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {selectedBatches.length > 0 && (
                                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                                    <div className="flex justify-between items-center">
                                        <span className="font-medium text-gray-700">Selected Total:</span>
                                        <span className={`text-lg font-bold ${isValid ? 'text-green-600' : 'text-red-600'}`}>
                                            {selectedTotal.toFixed(3)} {isManufacturedLogic ? recipe?.raw_product?.base_unit : product.base_unit}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center mt-2">
                                        <span className="text-sm text-gray-600">Required:</span>
                                        <span className="text-sm font-medium text-gray-900">
                                            {requiredQuantity.toFixed(3)} {isManufacturedLogic ? recipe?.raw_product?.base_unit : product.base_unit}
                                        </span>
                                    </div>
                                    {!isValid && (
                                        <p className="text-sm text-red-600 mt-2">
                                            Need {(requiredQuantity - selectedTotal).toFixed(3)} more
                                        </p>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end space-x-4 p-6 border-t border-gray-200 bg-gray-50">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={!isValid || selectedBatches.length === 0}
                        className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
                    >
                        <Check className="h-5 w-5" />
                        <span>Confirm Selection</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BatchSelectorModal;
