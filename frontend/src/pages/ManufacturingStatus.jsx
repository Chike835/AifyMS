import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { 
  Factory, 
  Search, 
  Calendar, 
  Building2, 
  User,
  CheckCircle,
  Truck,
  Eye,
  X,
  Filter
} from 'lucide-react';

const ManufacturingStatus = () => {
  const { user, hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [customerFilter, setCustomerFilter] = useState('');
  const [productFilter, setProductFilter] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [workerName, setWorkerName] = useState('');
  const [formError, setFormError] = useState('');

  // Fetch branches for Super Admin
  const { data: branchesData } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      const response = await api.get('/branches');
      return response.data.branches || [];
    },
    enabled: user?.role_name === 'Super Admin'
  });

  // Fetch customers for filter
  const { data: customersData } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const response = await api.get('/customers');
      return response.data.customers || [];
    }
  });

  // Fetch all sales orders with production status
  const { data, isLoading, error } = useQuery({
    queryKey: ['manufacturingOrders', dateFilter, branchFilter, customerFilter, productFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('order_type', 'invoice');
      if (dateFilter) params.append('start_date', dateFilter);
      if (branchFilter) params.append('branch_id', branchFilter);
      if (customerFilter) params.append('customer_id', customerFilter);
      const response = await api.get(`/sales?${params.toString()}`);
      return response.data.orders || [];
    }
  });

  // Fetch order details
  const { data: orderDetails } = useQuery({
    queryKey: ['orderDetails', selectedOrder?.id],
    queryFn: async () => {
      if (!selectedOrder?.id) return null;
      const response = await api.get(`/sales/${selectedOrder.id}`);
      return response.data.order;
    },
    enabled: !!selectedOrder?.id && showDetailModal
  });

  // Update production status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ orderId, status, workerName }) => {
      const response = await api.put(`/sales/${orderId}/production-status`, {
        production_status: status,
        worker_name: workerName || null
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['manufacturingOrders']);
      queryClient.invalidateQueries(['orderDetails', selectedOrder?.id]);
      setShowStatusModal(false);
      setSelectedOrder(null);
      setWorkerName('');
      setFormError('');
    },
    onError: (err) => {
      setFormError(err.response?.data?.error || 'Failed to update status');
      setTimeout(() => setFormError(''), 5000);
    }
  });

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN'
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-NG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Filter orders
  const filteredOrders = data?.filter(order => {
    if (searchTerm && !order.invoice_number.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    if (productFilter) {
      const hasProduct = order.items?.some(item => 
        item.product?.id === productFilter || 
        item.product?.name?.toLowerCase().includes(productFilter.toLowerCase())
      );
      if (!hasProduct) return false;
    }
    return true;
  }) || [];

  // Group orders by status
  const queueOrders = filteredOrders.filter(o => o.production_status === 'queue');
  const inProductionOrders = filteredOrders.filter(o => o.production_status === 'produced' && !o.dispatcher_name);
  const producedOrders = filteredOrders.filter(o => o.production_status === 'produced' && o.dispatcher_name);
  const deliveredOrders = filteredOrders.filter(o => o.production_status === 'delivered');

  // Statistics
  const stats = {
    queue: queueOrders.length,
    in_production: inProductionOrders.length,
    produced: producedOrders.length,
    delivered: deliveredOrders.length,
    today_production: producedOrders.filter(o => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return new Date(o.updated_at || o.created_at) >= today;
    }).length
  };

  const handleMarkProduced = (order) => {
    setSelectedOrder(order);
    setWorkerName('');
    setShowStatusModal(true);
    setFormError('');
  };

  const handleMarkDelivered = (order) => {
    if (window.confirm(`Mark order ${order.invoice_number} as delivered?`)) {
      updateStatusMutation.mutate({
        orderId: order.id,
        status: 'delivered',
        workerName: null
      });
    }
  };

  const handleSubmitStatus = (e) => {
    e.preventDefault();
    setFormError('');

    if (!workerName.trim()) {
      setFormError('Worker name is required');
      return;
    }

    updateStatusMutation.mutate({
      orderId: selectedOrder.id,
      status: 'produced',
      workerName: workerName.trim()
    });
  };

  const OrderCard = ({ order }) => (
    <div
      className="bg-white rounded-lg shadow p-4 mb-3 cursor-pointer hover:shadow-lg transition-shadow border border-gray-200"
      onClick={() => {
        setSelectedOrder(order);
        setShowDetailModal(true);
      }}
    >
      <div className="flex justify-between items-start mb-2">
        <div>
          <h4 className="font-semibold text-gray-900">{order.invoice_number}</h4>
          <p className="text-xs text-gray-500">{formatDate(order.created_at)}</p>
        </div>
        <span className="text-sm font-medium text-primary-600">
          {formatCurrency(order.total_amount)}
        </span>
      </div>
      <div className="space-y-1 text-sm">
        <p className="text-gray-700">
          <span className="font-medium">Customer:</span> {order.customer?.name || 'Walk-in'}
        </p>
        {order.branch && (
          <p className="text-gray-600">
            <span className="font-medium">Branch:</span> {order.branch.name}
          </p>
        )}
        <p className="text-gray-600">
          <span className="font-medium">Items:</span> {order.items?.length || 0}
        </p>
      </div>
      <div className="mt-3 flex space-x-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setSelectedOrder(order);
            setShowDetailModal(true);
          }}
          className="flex-1 px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 flex items-center justify-center space-x-1"
        >
          <Eye className="h-3 w-3" />
          <span>View</span>
        </button>
        {order.production_status === 'queue' && hasPermission('production_update_status') && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleMarkProduced(order);
            }}
            className="flex-1 px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 flex items-center justify-center space-x-1"
          >
            <CheckCircle className="h-3 w-3" />
            <span>Produced</span>
          </button>
        )}
        {order.production_status === 'produced' && hasPermission('production_update_status') && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleMarkDelivered(order);
            }}
            className="flex-1 px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center justify-center space-x-1"
          >
            <Truck className="h-3 w-3" />
            <span>Delivered</span>
          </button>
        )}
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Manufacturing Status</h1>
        <p className="text-gray-600">View and manage production status across all orders</p>
      </div>

      {/* Statistics Bar */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">In Queue</div>
          <div className="text-2xl font-bold text-yellow-600">{stats.queue}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">In Production</div>
          <div className="text-2xl font-bold text-blue-600">{stats.in_production}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Produced</div>
          <div className="text-2xl font-bold text-green-600">{stats.produced}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Delivered</div>
          <div className="text-2xl font-bold text-purple-600">{stats.delivered}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Today's Production</div>
          <div className="text-2xl font-bold text-primary-600">{stats.today_production}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Invoice #..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="pl-10 w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>
          {user?.role_name === 'Super Admin' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <select
                  value={branchFilter}
                  onChange={(e) => setBranchFilter(e.target.value)}
                  className="pl-10 w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">All Branches</option>
                  {branchesData?.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <select
                value={customerFilter}
                onChange={(e) => setCustomerFilter(e.target.value)}
                className="pl-10 w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500"
              >
                <option value="">All Customers</option>
                {customersData?.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Product</label>
            <input
              type="text"
              placeholder="Product name..."
              value={productFilter}
              onChange={(e) => setProductFilter(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>
        {(dateFilter || branchFilter || customerFilter || productFilter || searchTerm) && (
          <div className="mt-4">
            <button
              onClick={() => {
                setDateFilter('');
                setBranchFilter('');
                setCustomerFilter('');
                setProductFilter('');
                setSearchTerm('');
              }}
              className="flex items-center space-x-2 text-sm text-gray-600 hover:text-gray-900"
            >
              <X className="h-4 w-4" />
              <span>Clear Filters</span>
            </button>
          </div>
        )}
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Queue Column */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 flex items-center space-x-2">
              <span className="w-3 h-3 bg-yellow-500 rounded-full"></span>
              <span>Queue ({stats.queue})</span>
            </h3>
          </div>
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {queueOrders.map((order) => (
              <OrderCard key={order.id} order={order} />
            ))}
            {queueOrders.length === 0 && (
              <div className="text-center py-8 text-gray-400 text-sm">No orders in queue</div>
            )}
          </div>
        </div>

        {/* In Production Column */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 flex items-center space-x-2">
              <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
              <span>In Production ({stats.in_production})</span>
            </h3>
          </div>
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {inProductionOrders.map((order) => (
              <OrderCard key={order.id} order={order} />
            ))}
            {inProductionOrders.length === 0 && (
              <div className="text-center py-8 text-gray-400 text-sm">No orders in production</div>
            )}
          </div>
        </div>

        {/* Produced Column */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 flex items-center space-x-2">
              <span className="w-3 h-3 bg-green-500 rounded-full"></span>
              <span>Produced ({stats.produced})</span>
            </h3>
          </div>
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {producedOrders.map((order) => (
              <OrderCard key={order.id} order={order} />
            ))}
            {producedOrders.length === 0 && (
              <div className="text-center py-8 text-gray-400 text-sm">No orders produced</div>
            )}
          </div>
        </div>

        {/* Delivered Column */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 flex items-center space-x-2">
              <span className="w-3 h-3 bg-purple-500 rounded-full"></span>
              <span>Delivered ({stats.delivered})</span>
            </h3>
          </div>
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {deliveredOrders.map((order) => (
              <OrderCard key={order.id} order={order} />
            ))}
            {deliveredOrders.length === 0 && (
              <div className="text-center py-8 text-gray-400 text-sm">No orders delivered</div>
            )}
          </div>
        </div>
      </div>

      {/* Order Detail Modal */}
      {showDetailModal && selectedOrder && orderDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Order Details</h2>
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedOrder(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <p className="text-sm text-gray-500">Invoice Number</p>
                <p className="text-lg font-semibold">{orderDetails.invoice_number}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Date</p>
                <p className="text-lg font-semibold">{formatDate(orderDetails.created_at)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Customer</p>
                <p className="text-lg font-semibold">{orderDetails.customer?.name || 'Walk-in'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Amount</p>
                <p className="text-lg font-semibold text-primary-600">
                  {formatCurrency(orderDetails.total_amount)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Production Status</p>
                <span className={`inline-block px-3 py-1 rounded text-sm font-medium ${
                  orderDetails.production_status === 'queue' ? 'bg-yellow-100 text-yellow-800' :
                  orderDetails.production_status === 'produced' ? 'bg-green-100 text-green-800' :
                  orderDetails.production_status === 'delivered' ? 'bg-purple-100 text-purple-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {orderDetails.production_status?.toUpperCase() || 'N/A'}
                </span>
              </div>
              {orderDetails.dispatcher_name && (
                <div>
                  <p className="text-sm text-gray-500">Worker</p>
                  <p className="text-lg font-semibold">{orderDetails.dispatcher_name}</p>
                </div>
              )}
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4">Items</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Product</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Quantity</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Unit Price</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {orderDetails.items?.map((item) => (
                      <tr key={item.id}>
                        <td className="px-4 py-3 text-sm">{item.product?.name || 'N/A'}</td>
                        <td className="px-4 py-3 text-sm text-right">{item.quantity}</td>
                        <td className="px-4 py-3 text-sm text-right">{formatCurrency(item.unit_price)}</td>
                        <td className="px-4 py-3 text-sm text-right font-medium">{formatCurrency(item.subtotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Status Update Modal */}
      {showStatusModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Mark as Produced</h2>
              <button
                onClick={() => {
                  setShowStatusModal(false);
                  setSelectedOrder(null);
                  setWorkerName('');
                  setFormError('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <form onSubmit={handleSubmitStatus}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Worker Name *
                </label>
                <input
                  type="text"
                  value={workerName}
                  onChange={(e) => setWorkerName(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500"
                  required
                  placeholder="Enter worker name"
                />
              </div>
              {formError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-800 rounded-lg text-sm">
                  {formError}
                </div>
              )}
              <div className="flex space-x-3">
                <button
                  type="submit"
                  className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700"
                >
                  Mark as Produced
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowStatusModal(false);
                    setSelectedOrder(null);
                    setWorkerName('');
                    setFormError('');
                  }}
                  className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManufacturingStatus;


