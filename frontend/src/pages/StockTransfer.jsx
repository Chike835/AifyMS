import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { Truck, ArrowRightLeft } from 'lucide-react';

const StockTransfer = () => {
  const { user, hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    inventory_batch_id: '',
    from_branch_id: user?.branch_id || '',
    to_branch_id: '',
    quantity: '',
    notes: '',
  });

  // Fetch inventory batches
  const { data: batches, isLoading: batchesLoading } = useQuery({
    queryKey: ['inventoryBatches'],
    queryFn: async () => {
      const response = await api.get('/inventory/batches');
      return response.data.batches || [];
    },
  });

  // Fetch branches
  const { data: branches, isLoading: branchesLoading } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      const response = await api.get('/branches');
      return response.data.branches || [];
    },
  });

  // Transfer mutation
  const transferMutation = useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/inventory/stock-transfer', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventoryBatches'] });
      setFormData({
        inventory_batch_id: '',
        from_branch_id: user?.branch_id || '',
        to_branch_id: '',
        quantity: '',
        notes: '',
      });
      alert('Stock transfer completed successfully!');
    },
    onError: (error) => {
      alert(error.response?.data?.error || 'Failed to transfer stock');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.inventory_batch_id || !formData.to_branch_id || !formData.quantity) {
      alert('Please fill in all required fields');
      return;
    }

    if (formData.from_branch_id === formData.to_branch_id) {
      alert('Source and destination branches cannot be the same');
      return;
    }

    transferMutation.mutate({
      ...formData,
      quantity: parseFloat(formData.quantity),
    });
  };

  const selectedBatch = batches?.find(b => b.id === formData.inventory_batch_id);

  if (!hasPermission('stock_transfer_init')) {
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
          <Truck className="h-8 w-8" />
          <span>Stock Transfer</span>
        </h1>
        <p className="text-gray-600 mt-2">Transfer inventory batches between branches</p>
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
                    ({batch.remaining_quantity} {batch.product?.base_unit} remaining)
                  </option>
                ))}
              </select>
              {selectedBatch && (
                <p className="text-sm text-gray-500 mt-1">
                  Available: {selectedBatch.remaining_quantity} {selectedBatch.product?.base_unit}
                </p>
              )}
            </div>

            {/* From Branch */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                From Branch *
              </label>
              <select
                value={formData.from_branch_id}
                onChange={(e) => setFormData({ ...formData, from_branch_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                required
                disabled={branchesLoading}
              >
                <option value="">Select source branch</option>
                {branches?.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </div>

            {/* To Branch */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                To Branch *
              </label>
              <select
                value={formData.to_branch_id}
                onChange={(e) => setFormData({ ...formData, to_branch_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                required
                disabled={branchesLoading}
              >
                <option value="">Select destination branch</option>
                {branches?.filter(b => b.id !== formData.from_branch_id).map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Quantity */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quantity to Transfer *
              </label>
              <input
                type="number"
                step="0.001"
                min="0.001"
                max={selectedBatch?.remaining_quantity || ''}
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
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="Optional notes about this transfer"
            />
          </div>

          {/* Submit Button */}
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => setFormData({
                inventory_batch_id: '',
                from_branch_id: user?.branch_id || '',
                to_branch_id: '',
                quantity: '',
                notes: '',
              })}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Reset
            </button>
            <button
              type="submit"
              disabled={transferMutation.isPending}
              className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              <ArrowRightLeft className="h-4 w-4" />
              <span>{transferMutation.isPending ? 'Transferring...' : 'Transfer Stock'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StockTransfer;



