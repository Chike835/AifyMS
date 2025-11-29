import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import ListToolbar from '../components/common/ListToolbar';
import ExportModal from '../components/import/ExportModal';
import { Factory, CheckCircle } from 'lucide-react';

const ProductionQueue = () => {
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [workerName, setWorkerName] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [limit, setLimit] = useState(25);
  const [showExportModal, setShowExportModal] = useState(false);

  // Fetch production queue
  const { data, isLoading } = useQuery({
    queryKey: ['productionQueue'],
    queryFn: async () => {
      const response = await api.get('/sales/production-queue');
      return response.data.orders || [];
    },
  });

  // Update production status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ orderId, status, workerName }) => {
      const response = await api.put(`/sales/${orderId}/production-status`, {
        production_status: status,
        worker_name: workerName,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['productionQueue'] });
      queryClient.invalidateQueries({ queryKey: ['shipments'] });
      setShowStatusModal(false);
      setSelectedOrder(null);
      setWorkerName('');
      alert('Status updated successfully!');
    },
    onError: (error) => {
      alert(error.response?.data?.error || 'Failed to update status');
    },
  });

  const handleMarkProduced = (order) => {
    setSelectedOrder(order);
    setWorkerName('');
    setShowStatusModal(true);
  };

  const handleSubmitStatus = (e) => {
    e.preventDefault();
    if (!workerName.trim()) {
      alert('Worker name is required');
      return;
    }
    updateStatusMutation.mutate({
      orderId: selectedOrder.id,
      status: 'produced',
      workerName: workerName.trim(),
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const orders = data || [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Production Queue</h1>
          <p className="text-sm text-primary-600">Orders waiting to be produced</p>
        </div>
      </div>

      {/* Toolbar */}
      <ListToolbar
        limit={limit}
        onLimitChange={setLimit}
        onExport={() => setShowExportModal(true)}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search orders..."
        showColumnVisibility={false}
      />

      {/* Export Modal */}
      {showExportModal && (
        <ExportModal
          isOpen={showExportModal}
          onClose={() => setShowExportModal(false)}
          entity="production-queue"
          title="Export Production Queue"
        />
      )}

      {orders.length === 0 ? (
        <div className="bg-white rounded-lg shadow border border-gray-200 p-12 text-center">
          <Factory className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">No orders in production queue</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order.id} className="bg-white rounded-lg shadow border border-gray-200 p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-4 mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {order.invoice_number}
                    </h3>
                    <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                      In Queue
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-4">
                    <div>
                      <span className="font-medium">Customer:</span>{' '}
                      {order.customer?.name || 'Walk-in'}
                    </div>
                    <div>
                      <span className="font-medium">Branch:</span> {order.branch?.name}
                    </div>
                    <div>
                      <span className="font-medium">Total:</span> ₦
                      {parseFloat(order.total_amount).toLocaleString()}
                    </div>
                    <div>
                      <span className="font-medium">Date:</span>{' '}
                      {new Date(order.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Items:</h4>
                    <ul className="space-y-1">
                      {order.items?.map((item) => (
                        <li key={item.id} className="text-sm text-gray-600">
                          {item.product?.name} - {parseFloat(item.quantity).toFixed(2)}{' '}
                          {item.product?.base_unit}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                {hasPermission('production_update_status') && (
                  <button
                    onClick={() => handleMarkProduced(order)}
                    className="ml-4 flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <CheckCircle className="h-5 w-5" />
                    <span>Mark as Produced</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Status Update Modal */}
      {showStatusModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Mark as Produced</h2>
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-600">
                Invoice: <span className="font-medium">{selectedOrder.invoice_number}</span>
              </div>
            </div>
            <form onSubmit={handleSubmitStatus} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Worker Name *
                </label>
                <input
                  type="text"
                  required
                  value={workerName}
                  onChange={(e) => setWorkerName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Enter worker name"
                />
              </div>
              <div className="flex space-x-4 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowStatusModal(false);
                    setSelectedOrder(null);
                    setWorkerName('');
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateStatusMutation.isPending}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {updateStatusMutation.isPending ? 'Updating...' : 'Mark as Produced'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductionQueue;

