import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { Package, Plus, ArrowRightLeft, Edit } from 'lucide-react';

const Inventory = () => {
  const { hasPermission, user } = useAuth();
  const queryClient = useQueryClient();
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [selectedInstance, setSelectedInstance] = useState(null);
  const [formData, setFormData] = useState({
    product_id: '',
    branch_id: user?.branch_id || '',
    instance_code: '',
    initial_quantity: '',
  });
  const [transferData, setTransferData] = useState({
    to_branch_id: '',
    notes: '',
  });
  const [adjustData, setAdjustData] = useState({
    new_quantity: '',
    reason: '',
  });

  // Fetch inventory instances
  const { data, isLoading } = useQuery({
    queryKey: ['inventoryInstances'],
    queryFn: async () => {
      const response = await api.get('/inventory/instances');
      return response.data.instances || [];
    },
  });

  // Fetch products (raw_tracked only)
  const { data: products } = useQuery({
    queryKey: ['products', 'raw_tracked'],
    queryFn: async () => {
      const response = await api.get('/products?type=raw_tracked');
      return response.data.products || [];
    },
  });

  // Fetch branches
  const { data: branches } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      const response = await api.get('/branches');
      return response.data.branches || [];
    },
  });

  // Transfer mutation
  const transferMutation = useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/inventory/transfer', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventoryInstances'] });
      setShowTransferModal(false);
      setSelectedInstance(null);
      setTransferData({ to_branch_id: '', notes: '' });
      alert('Transfer completed successfully!');
    },
    onError: (error) => {
      alert(error.response?.data?.error || 'Failed to transfer instance');
    },
  });

  // Adjust mutation
  const adjustMutation = useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/inventory/adjust', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventoryInstances'] });
      setShowAdjustModal(false);
      setSelectedInstance(null);
      setAdjustData({ new_quantity: '', reason: '' });
      alert('Stock adjusted successfully!');
    },
    onError: (error) => {
      alert(error.response?.data?.error || 'Failed to adjust stock');
    },
  });

  // Register new coil mutation
  const registerMutation = useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/inventory/instances', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventoryInstances'] });
      setShowRegisterModal(false);
      setFormData({
        product_id: '',
        branch_id: '',
        instance_code: '',
        initial_quantity: '',
      });
      alert('Coil registered successfully!');
    },
    onError: (error) => {
      alert(error.response?.data?.error || 'Failed to register coil');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    registerMutation.mutate({
      ...formData,
      initial_quantity: parseFloat(formData.initial_quantity),
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const instances = data || [];

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Inventory Management</h1>
          <p className="text-gray-600 mt-2">Manage coils and stock instances</p>
        </div>
        {hasPermission('stock_add_opening') && (
          <button
            onClick={() => setShowRegisterModal(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Plus className="h-5 w-5" />
            <span>Register New Coil</span>
          </button>
        )}
      </div>

      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Instance Code
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Product
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Branch
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Initial Quantity
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Remaining
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {instances.map((instance) => (
              <tr key={instance.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {instance.instance_code}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{instance.product?.name}</div>
                  <div className="text-sm text-gray-500">{instance.product?.sku}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {instance.branch?.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {parseFloat(instance.initial_quantity).toFixed(3)} {instance.product?.base_unit}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {parseFloat(instance.remaining_quantity).toFixed(3)} {instance.product?.base_unit}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      instance.status === 'in_stock'
                        ? 'bg-green-100 text-green-800'
                        : instance.status === 'depleted'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {instance.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex justify-end space-x-2">
                    {hasPermission('stock_transfer_init') && (
                      <button
                        onClick={() => {
                          setSelectedInstance(instance);
                          setTransferData({ to_branch_id: '', notes: '' });
                          setShowTransferModal(true);
                        }}
                        className="text-blue-600 hover:text-blue-900"
                        title="Transfer"
                      >
                        <ArrowRightLeft className="h-4 w-4" />
                      </button>
                    )}
                    {hasPermission('stock_adjust') && (
                      <button
                        onClick={() => {
                          setSelectedInstance(instance);
                          setAdjustData({ new_quantity: instance.remaining_quantity, reason: '' });
                          setShowAdjustModal(true);
                        }}
                        className="text-orange-600 hover:text-orange-900"
                        title="Adjust"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Register Coil Modal */}
      {showRegisterModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Register New Coil</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Product *
                </label>
                <select
                  required
                  value={formData.product_id}
                  onChange={(e) => setFormData({ ...formData, product_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Select Product</option>
                  {products?.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name} ({product.sku})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Instance Code *
                </label>
                <input
                  type="text"
                  required
                  value={formData.instance_code}
                  onChange={(e) => setFormData({ ...formData, instance_code: e.target.value })}
                  placeholder="e.g., COIL-001"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Initial Quantity *
                </label>
                <input
                  type="number"
                  required
                  step="0.001"
                  min="0"
                  value={formData.initial_quantity}
                  onChange={(e) => setFormData({ ...formData, initial_quantity: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div className="flex space-x-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowRegisterModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={registerMutation.isPending}
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {registerMutation.isPending ? 'Registering...' : 'Register'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transfer Modal */}
      {showTransferModal && selectedInstance && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Transfer Instance</h2>
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-600">Instance: <span className="font-medium">{selectedInstance.instance_code}</span></div>
              <div className="text-sm text-gray-600">Product: <span className="font-medium">{selectedInstance.product?.name}</span></div>
              <div className="text-sm text-gray-600">Current Branch: <span className="font-medium">{selectedInstance.branch?.name}</span></div>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                transferMutation.mutate({
                  instance_id: selectedInstance.id,
                  to_branch_id: transferData.to_branch_id,
                  notes: transferData.notes,
                });
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Destination Branch *
                </label>
                <select
                  required
                  value={transferData.to_branch_id}
                  onChange={(e) => setTransferData({ ...transferData, to_branch_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Select Branch</option>
                  {branches
                    ?.filter((b) => b.id !== selectedInstance.branch_id)
                    .map((branch) => (
                      <option key={branch.id} value={branch.id}>
                        {branch.name} ({branch.code})
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={transferData.notes}
                  onChange={(e) => setTransferData({ ...transferData, notes: e.target.value })}
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Optional notes about the transfer"
                />
              </div>
              <div className="flex space-x-4 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowTransferModal(false);
                    setSelectedInstance(null);
                    setTransferData({ to_branch_id: '', notes: '' });
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={transferMutation.isPending}
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {transferMutation.isPending ? 'Transferring...' : 'Transfer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Adjust Modal */}
      {showAdjustModal && selectedInstance && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Adjust Stock</h2>
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-600">Instance: <span className="font-medium">{selectedInstance.instance_code}</span></div>
              <div className="text-sm text-gray-600">Product: <span className="font-medium">{selectedInstance.product?.name}</span></div>
              <div className="text-sm text-gray-600">Current Quantity: <span className="font-medium">{parseFloat(selectedInstance.remaining_quantity).toFixed(3)} {selectedInstance.product?.base_unit}</span></div>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                adjustMutation.mutate({
                  instance_id: selectedInstance.id,
                  new_quantity: parseFloat(adjustData.new_quantity),
                  reason: adjustData.reason,
                });
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  New Quantity *
                </label>
                <input
                  type="number"
                  required
                  step="0.001"
                  min="0"
                  value={adjustData.new_quantity}
                  onChange={(e) => setAdjustData({ ...adjustData, new_quantity: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reason *
                </label>
                <textarea
                  required
                  value={adjustData.reason}
                  onChange={(e) => setAdjustData({ ...adjustData, reason: e.target.value })}
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Explain why this adjustment is needed"
                />
              </div>
              <div className="flex space-x-4 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAdjustModal(false);
                    setSelectedInstance(null);
                    setAdjustData({ new_quantity: '', reason: '' });
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adjustMutation.isPending}
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {adjustMutation.isPending ? 'Adjusting...' : 'Adjust Stock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;

