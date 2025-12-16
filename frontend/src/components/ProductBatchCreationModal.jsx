import React, { useState, useEffect } from 'react';
import { X, Save, AlertCircle, Plus, CheckCircle } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../utils/api';

const ProductBatchCreationModal = ({
  product,
  onClose,
  onSkip,
  onComplete
}) => {
  const [batches, setBatches] = useState([]);
  const [error, setError] = useState('');
  const queryClient = useQueryClient();

  // Fetch branches
  const { data: branchesData } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      const response = await api.get('/branches');
      return response.data.branches || [];
    }
  });

  // Fetch batch types for product's category AND all active batch types
  const { data: batchTypesData } = useQuery({
    queryKey: ['categoryBatchTypes', product?.category_id],
    queryFn: async () => {
      // Always fetch all active batch types for selection
      const allTypesResponse = await api.get('/settings/batches/types');
      const allTypes = (allTypesResponse.data.batch_types || []).filter(bt => bt.is_active);
      
      // Also get category-assigned types for initial batch creation
      let categoryTypes = [];
      if (product?.category_id) {
        try {
          const categoryResponse = await api.get(`/settings/batches/types/category/${product.category_id}`);
          categoryTypes = categoryResponse.data.batch_types || [];
        } catch (err) {
          console.error('Failed to fetch category batch types:', err);
        }
      }
      
      // If no category types, use global default or first active type
      if (categoryTypes.length === 0) {
        const defaultType = allTypes.find(bt => bt.is_default);
        if (defaultType) {
          categoryTypes = [defaultType];
        } else if (allTypes.length > 0) {
          categoryTypes = [allTypes[0]];
        }
      }
      
      return { 
        batch_types: allTypes, // All types for selection
        category_batch_types: categoryTypes // Category types for initial batches
      };
    },
    enabled: !!product
  });

  // Initialize batches with category-assigned batch types
  useEffect(() => {
    if (batchTypesData?.category_batch_types && batchTypesData.category_batch_types.length > 0) {
      const initialBatches = batchTypesData.category_batch_types.map(bt => ({
        batch_type_id: bt.id,
        batch_type_name: bt.name,
        branch_id: '',
        initial_quantity: '',
        instance_code: '',
        grouped: true
      }));
      setBatches(initialBatches);
    }
  }, [batchTypesData]);

  const updateBatch = (index, field, value) => {
    const newBatches = [...batches];
    newBatches[index][field] = value;
    setBatches(newBatches);
  };

  const removeBatch = (index) => {
    setBatches(batches.filter((_, i) => i !== index));
  };

  const addBatch = () => {
    // Add a new empty batch row - user can select any batch type
    setBatches([...batches, {
      batch_type_id: '',
      batch_type_name: '',
      branch_id: '',
      initial_quantity: '',
      instance_code: '',
      grouped: true
    }]);
  };

  const createBatchesMutation = useMutation({
    mutationFn: async (batchesToCreate) => {
      const results = [];
      for (const batch of batchesToCreate) {
        try {
          const response = await api.post(`/products/${product.id}/batches`, {
            branch_id: batch.branch_id,
            batch_type_id: batch.batch_type_id,
            initial_quantity: parseFloat(batch.initial_quantity) || 0,
            instance_code: batch.grouped ? (batch.instance_code || null) : null,
            grouped: batch.grouped
          });
          results.push({ success: true, batch: response.data.batch });
        } catch (err) {
          results.push({ 
            success: false, 
            error: err.response?.data?.error || 'Failed to create batch',
            batch_type: batch.batch_type_name
          });
        }
      }
      return results;
    },
    onSuccess: (results) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['inventoryInstances'] });
      const successCount = results.filter(r => r.success).length;
      const failCount = results.filter(r => !r.success).length;
      
      if (failCount > 0) {
        const errors = results.filter(r => !r.success).map(r => `${r.batch_type}: ${r.error}`).join(', ');
        setError(`Created ${successCount} batch(es), but ${failCount} failed: ${errors}`);
      } else {
        onComplete(successCount);
      }
    },
    onError: (err) => {
      setError(err.response?.data?.error || 'Failed to create batches');
    }
  });

  const handleCreateDefaults = async () => {
    if (!product) {
      onSkip();
      return;
    }
    // Product type check removed - any product can have batches

    // Auto-create batches with 0 balance for all available batch types
    try {
      await api.post(`/products/${product.id}/batches/defaults`);
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['inventoryInstances'] });
      queryClient.invalidateQueries({ queryKey: ['productBatches', product.id] });
      onComplete(0); // Pass 0 to indicate auto-created
    } catch (err) {
      console.error('Failed to create default batches:', err);
      setError(err.response?.data?.error || 'Failed to create default batches');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!product) {
      // Product type check removed - any product can have batches
      onSkip();
      return;
    }

    // Validate batches - all must have branch and batch type
    const invalidBatches = batches.filter(b => {
      if (!b.branch_id || !b.batch_type_id) return true;
      if (b.grouped && !b.instance_code?.trim()) return true;
      return false;
    });

    if (invalidBatches.length > 0) {
      setError('Please ensure all batches have a branch and batch type selected. Grouped batches also require an instance code.');
      return;
    }

    if (batches.length === 0) {
      setError('Please add at least one batch');
      return;
    }

    const validBatches = batches;

    // Create batches (with 0 quantity if not specified)
    const batchesToCreate = validBatches.map(b => ({
      ...b,
      initial_quantity: b.initial_quantity || '0'
    }));

    createBatchesMutation.mutate(batchesToCreate);
  };

  if (!product) return null;

  // Only show for raw_tracked products
  if (product.type !== 'raw_tracked') {
    return null;
  }

  const batchTypes = batchTypesData?.batch_types || [];
  const branches = branchesData || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <div>
            <h3 className="text-xl font-semibold text-gray-900">Create Batches for Product</h3>
            <p className="text-sm text-gray-500 mt-1">
              {product.name} ({product.sku})
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Configure initial batches for this product. You can skip to create default batches with 0 balance.
            </p>
          </div>
          <button 
            onClick={onSkip} 
            className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className={`p-3 rounded-md text-sm flex items-center gap-2 ${
              error.includes('Created') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
            }`}>
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {(!batchTypesData || batchTypes.length === 0) ? (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                No batch types are assigned to this product's category. 
                Default batches will be created using the global default batch type.
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                {batches.map((batch, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="font-medium text-gray-900">
                        Batch {index + 1}{batch.batch_type_name ? `: ${batch.batch_type_name}` : ''}
                      </h4>
                      {batches.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeBatch(index)}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          Remove
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Branch *
                        </label>
                        <select
                          required
                          value={batch.branch_id}
                          onChange={(e) => updateBatch(index, 'branch_id', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                        >
                          <option value="">Select Branch</option>
                          {branches.map(branch => (
                            <option key={branch.id} value={branch.id}>
                              {branch.name} ({branch.code})
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
                          value={batch.batch_type_id}
                          onChange={(e) => {
                            const selectedType = batchTypes.find(bt => bt.id === e.target.value);
                            updateBatch(index, 'batch_type_id', e.target.value);
                            updateBatch(index, 'batch_type_name', selectedType?.name || '');
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                        >
                          <option value="">Select Batch Type</option>
                          {batchTypes.map(type => (
                            <option key={type.id} value={type.id}>
                              {type.name} {type.is_default && '(Default)'}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Initial Quantity ({product.base_unit || ''})
                        </label>
                        <input
                          type="number"
                          step="0.001"
                          min="0"
                          value={batch.initial_quantity}
                          onChange={(e) => updateBatch(index, 'initial_quantity', e.target.value)}
                          placeholder="0 (leave empty for 0 balance)"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                        />
                      </div>

                      <div>
                        <label className="flex items-center space-x-2 mb-1">
                          <input
                            type="checkbox"
                            checked={batch.grouped}
                            onChange={(e) => updateBatch(index, 'grouped', e.target.checked)}
                            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                          />
                          <span className="text-sm font-medium text-gray-700">Grouped Batch</span>
                        </label>
                        {batch.grouped && (
                          <input
                            type="text"
                            placeholder="Instance Code (e.g., COIL-001)"
                            value={batch.instance_code}
                            onChange={(e) => updateBatch(index, 'instance_code', e.target.value)}
                            className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                          />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={addBatch}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>Add Another Batch</span>
              </button>
            </>
          )}
        </form>

        <div className="border-t border-gray-200 p-6 bg-gray-50 flex justify-between items-center">
          <button
            type="button"
            onClick={handleCreateDefaults}
            disabled={createBatchesMutation.isPending}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50"
          >
            Create Defaults (0 Balance)
          </button>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onSkip}
              disabled={createBatchesMutation.isPending}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50"
            >
              Skip
            </button>
            <button
              type="submit"
              onClick={handleSubmit}
              disabled={createBatchesMutation.isPending || batches.length === 0}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2"
            >
              {createBatchesMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Creating...</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  <span>Create Batches</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductBatchCreationModal;

