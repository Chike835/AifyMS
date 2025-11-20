import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { Truck, CheckCircle } from 'lucide-react';

const Shipments = () => {
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showDeliverModal, setShowDeliverModal] = useState(false);
  const [deliverData, setDeliverData] = useState({
    dispatcher_name: '',
    vehicle_plate: '',
    delivery_signature: '',
  });

  // Fetch shipments
  const { data, isLoading } = useQuery({
    queryKey: ['shipments'],
    queryFn: async () => {
      const response = await api.get('/sales/shipments');
      return response.data.orders || [];
    },
  });

  // Mark as delivered mutation
  const deliverMutation = useMutation({
    mutationFn: async ({ orderId, data }) => {
      const response = await api.put(`/sales/${orderId}/deliver`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipments'] });
      setShowDeliverModal(false);
      setSelectedOrder(null);
      setDeliverData({ dispatcher_name: '', vehicle_plate: '', delivery_signature: '' });
      alert('Order marked as delivered successfully!');
    },
    onError: (error) => {
      alert(error.response?.data?.error || 'Failed to mark as delivered');
    },
  });

  const handleMarkDelivered = (order) => {
    setSelectedOrder(order);
    setDeliverData({ dispatcher_name: '', vehicle_plate: '', delivery_signature: '' });
    setShowDeliverModal(true);
  };

  const handleSubmitDeliver = (e) => {
    e.preventDefault();
    if (!deliverData.dispatcher_name.trim()) {
      alert('Dispatcher name is required');
      return;
    }
    deliverMutation.mutate({
      orderId: selectedOrder.id,
      data: deliverData,
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
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Shipments</h1>
          <p className="text-gray-600 mt-2">Orders ready for delivery</p>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="bg-white rounded-lg shadow border border-gray-200 p-12 text-center">
          <Truck className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">No orders ready for shipment</p>
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
                    <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                      Ready for Delivery
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
                    onClick={() => handleMarkDelivered(order)}
                    className="ml-4 flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <CheckCircle className="h-5 w-5" />
                    <span>Mark as Delivered</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Deliver Modal */}
      {showDeliverModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Mark as Delivered</h2>
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-600">
                Invoice: <span className="font-medium">{selectedOrder.invoice_number}</span>
              </div>
            </div>
            <form onSubmit={handleSubmitDeliver} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Dispatcher Name *
                </label>
                <input
                  type="text"
                  required
                  value={deliverData.dispatcher_name}
                  onChange={(e) =>
                    setDeliverData({ ...deliverData, dispatcher_name: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Enter dispatcher name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Vehicle Plate
                </label>
                <input
                  type="text"
                  value={deliverData.vehicle_plate}
                  onChange={(e) =>
                    setDeliverData({ ...deliverData, vehicle_plate: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="e.g., ABC-123-XY"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Delivery Signature (Base64)
                </label>
                <textarea
                  value={deliverData.delivery_signature}
                  onChange={(e) =>
                    setDeliverData({ ...deliverData, delivery_signature: e.target.value })
                  }
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Optional: Base64 encoded signature image"
                />
              </div>
              <div className="flex space-x-4 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowDeliverModal(false);
                    setSelectedOrder(null);
                    setDeliverData({
                      dispatcher_name: '',
                      vehicle_plate: '',
                      delivery_signature: '',
                    });
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={deliverMutation.isPending}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {deliverMutation.isPending ? 'Updating...' : 'Mark as Delivered'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Shipments;

