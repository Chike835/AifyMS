import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { RotateCcw, TrendingUp, TrendingDown } from 'lucide-react';

const StockAdjustment = () => {
  const { user, hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    inventory_batch_id: '',
    adjustment_type: 'increase', // 'increase' or 'decrease'
    quantity: '',
    reason: '',
  });

  // Fetch inventory batches
  const { data: batches, isLoading: batchesLoading } = useQuery({
    queryKey: ['inventoryBatches'],
    queryFn: async () => {
      const response = await api.get('/inventory/batches');
      return response.data.batches || [];
    },
  });

  // Adjustment mutation
  const adjustMutation = useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/inventory/stock-adjustment', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventoryBatches'] });
      setFormData({
        inventory_batch_id: '',
        adjustment_type: 'increase',
        quantity: '',
        reason: '',
      });
      alert('Stock adjusted successfully!');
    },
    onError: (error) => {
      alert(error.response?.data?.error || 'Failed to adjust stock');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.inventory_batch_id || !formData.quantity || !formData.reason) {
      alert('Please fill in all required fields');
      return;
    }

    adjustMutation.mutate({
      ...formData,
      quantity: parseFloat(formData.quantity),
    });
  };

  const selectedBatch = batches?.find(b => b.id === formData.inventory_batch_id);

  if (!hasPermission('stock_adjust')) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">You do not have permission to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center space-x-3">
          <RotateCcw className="h-8 w-8" />
          <span>Stock Adjustment</span>
        </h1>
        <p className="text-gray-600 mt-2">Adjust inventory batch quantities</p>
      </div>

      <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Inventory Batch Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Inventory Batch *
              </label>
              <select
                value={formData.inventory_batch_id}
                onChange={(e) => setFormData({ ...formData, inventory_batch_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                required
                disabled={batchesLoading}
              >
                <option value="">Select a batch</option>
                {batches?.map((batch) => (
                  <option key={batch.id} value={batch.id}>
                    {batch.instance_code || batch.batch_identifier} - {batch.product?.name} 
                    (Current: {batch.remaining_quantity} {batch.product?.base_unit})
                  </option>
                ))}
              </select>
              {selectedBatch && (
                <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Current Quantity:</span> {selectedBatch.remaining_quantity} {selectedBatch.product?.base_unit}
                  </p>
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Initial Quantity:</span> {selectedBatch.initial_quantity} {selectedBatch.product?.base_unit}
                  </p>
                </div>
              )}
            </div>

            {/* Adjustment Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Adjustment Type *
              </label>
              <div className="flex space-x-4">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    value="increase"
                    checked={formData.adjustment_type === 'increase'}
                    onChange={(e) => setFormData({ ...formData, adjustment_type: e.target.value })}
                    className="text-primary-600 focus:ring-primary-500"
                  />
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  <span className="text-gray-700">Increase</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    value="decrease"
                    checked={formData.adjustment_type === 'decrease'}
                    onChange={(e) => setFormData({ ...formData, adjustment_type: e.target.value })}
                    className="text-primary-600 focus:ring-primary-500"
                  />
                  <TrendingDown className="h-5 w-5 text-red-600" />
                  <span className="text-gray-700">Decrease</span>
                </label>
              </div>
            </div>

            {/* Quantity */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Adjustment Quantity *
              </label>
              <input
                type="number"
                step="0.001"
                min="0.001"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                required
                placeholder="Enter quantity"
              />
              {selectedBatch && (
                <p className="text-sm text-gray-500 mt-1">
                  Unit: {selectedBatch.product?.base_unit}
                </p>
              )}
              {selectedBatch && formData.adjustment_type === 'decrease' && formData.quantity && (
                <p className="text-sm text-red-600 mt-1">
                  New quantity will be: {Math.max(0, selectedBatch.remaining_quantity - parseFloat(formData.quantity) || 0).toFixed(3)} {selectedBatch.product?.base_unit}
                </p>
              )}
              {selectedBatch && formData.adjustment_type === 'increase' && formData.quantity && (
                <p className="text-sm text-green-600 mt-1">
                  New quantity will be: {(selectedBatch.remaining_quantity + parseFloat(formData.quantity) || 0).toFixed(3)} {selectedBatch.product?.base_unit}
                </p>
              )}
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reason for Adjustment *
            </label>
            <textarea
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              required
              placeholder="Explain the reason for this adjustment (e.g., damage, found stock, correction, etc.)"
            />
          </div>

          {/* Submit Button */}
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => setFormData({
                inventory_batch_id: '',
                adjustment_type: 'increase',
                quantity: '',
                reason: '',
              })}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Reset
            </button>
            <button
              type="submit"
              disabled={adjustMutation.isPending}
              className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              <RotateCcw className="h-4 w-4" />
              <span>{adjustMutation.isPending ? 'Adjusting...' : 'Adjust Stock'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StockAdjustment;





























