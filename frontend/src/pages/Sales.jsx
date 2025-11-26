import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { ClipboardList, Plus, Eye, Search, X, FileText, Download } from 'lucide-react';

const Sales = () => {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('');
  const [productionStatusFilter, setProductionStatusFilter] = useState('');
  const [orderTypeFilter, setOrderTypeFilter] = useState('invoice');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Fetch sales orders
  const { data, isLoading, error } = useQuery({
    queryKey: ['sales', paymentStatusFilter, productionStatusFilter, orderTypeFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (paymentStatusFilter) params.append('payment_status', paymentStatusFilter);
      if (productionStatusFilter) params.append('production_status', productionStatusFilter);
      if (orderTypeFilter) params.append('order_type', orderTypeFilter);
      const response = await api.get(`/sales?${params.toString()}`);
      return response.data;
    }
  });

  // Fetch order details
  const { data: detailData, isLoading: detailLoading } = useQuery({
    queryKey: ['saleDetail', selectedOrder?.id],
    queryFn: async () => {
      if (!selectedOrder?.id) return null;
      const response = await api.get(`/sales/${selectedOrder.id}`);
      return response.data.order;
    },
    enabled: !!selectedOrder?.id && showDetailModal
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
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getPaymentStatusColor = (status) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'partial': return 'bg-yellow-100 text-yellow-800';
      case 'unpaid': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getProductionStatusColor = (status) => {
    switch (status) {
      case 'queue': return 'bg-orange-100 text-orange-800';
      case 'produced': return 'bg-blue-100 text-blue-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'na': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getOrderTypeColor = (type) => {
    switch (type) {
      case 'invoice': return 'bg-primary-100 text-primary-800';
      case 'quotation': return 'bg-purple-100 text-purple-800';
      case 'draft': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
        {error.response?.data?.error || error.message || 'Failed to load sales'}
      </div>
    );
  }

  const orders = data?.orders || [];

  // Filter by search term
  const filteredOrders = orders.filter(order => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      order.invoice_number?.toLowerCase().includes(search) ||
      order.customer?.name?.toLowerCase().includes(search) ||
      order.branch?.name?.toLowerCase().includes(search)
    );
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Sales Orders</h1>
          <p className="text-gray-600 mt-2">Manage invoices, quotations, and sales</p>
        </div>
        <div className="flex items-center space-x-3">
          {hasPermission('data_export_operational') && (
            <button
              onClick={() => window.open('/api/export/sales', '_blank')}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <Download className="h-5 w-5" />
              <span>Export</span>
            </button>
          )}
          {hasPermission('pos_access') && (
            <button
              onClick={() => navigate('/sales/add')}
              className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              <Plus className="h-5 w-5" />
              <span>New Sale</span>
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by invoice #, customer..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
        <select
          value={orderTypeFilter}
          onChange={(e) => setOrderTypeFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">All Types</option>
          <option value="invoice">Invoices</option>
          <option value="quotation">Quotations</option>
          <option value="draft">Drafts</option>
        </select>
        <select
          value={paymentStatusFilter}
          onChange={(e) => setPaymentStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">All Payment Status</option>
          <option value="unpaid">Unpaid</option>
          <option value="partial">Partial</option>
          <option value="paid">Paid</option>
        </select>
        <select
          value={productionStatusFilter}
          onChange={(e) => setProductionStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">All Production Status</option>
          <option value="na">N/A</option>
          <option value="queue">In Queue</option>
          <option value="produced">Produced</option>
          <option value="delivered">Delivered</option>
        </select>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
          <p className="text-sm text-gray-500">Total Orders</p>
          <p className="text-2xl font-bold text-gray-900">{orders.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
          <p className="text-sm text-gray-500">Unpaid</p>
          <p className="text-2xl font-bold text-red-600">
            {orders.filter(o => o.payment_status === 'unpaid').length}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
          <p className="text-sm text-gray-500">In Production</p>
          <p className="text-2xl font-bold text-orange-600">
            {orders.filter(o => o.production_status === 'queue').length}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
          <p className="text-sm text-gray-500">Total Value</p>
          <p className="text-2xl font-bold text-green-600">
            {formatCurrency(orders.reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0))}
          </p>
        </div>
      </div>

      {/* Sales Table */}
      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Invoice #
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Customer
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Branch
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Payment
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Production
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredOrders.length === 0 ? (
              <tr>
                <td colSpan="9" className="px-6 py-12 text-center text-gray-500">
                  <ClipboardList className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No sales orders found</p>
                  {(searchTerm || paymentStatusFilter || productionStatusFilter) && (
                    <p className="text-sm mt-1">Try adjusting your filters</p>
                  )}
                </td>
              </tr>
            ) : (
              filteredOrders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {order.invoice_number}
                    </div>
                    <div className="text-xs text-gray-500">
                      {order.items?.length || 0} item(s)
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {order.customer?.name || 'Walk-in'}
                    </div>
                    {order.customer?.phone && (
                      <div className="text-xs text-gray-500">{order.customer.phone}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {order.branch?.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {formatCurrency(order.total_amount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getOrderTypeColor(order.order_type || 'invoice')}`}>
                      {order.order_type || 'invoice'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPaymentStatusColor(order.payment_status)}`}>
                      {order.payment_status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getProductionStatusColor(order.production_status)}`}>
                      {order.production_status === 'na' ? 'N/A' : order.production_status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(order.created_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => {
                          setSelectedOrder(order);
                          setShowDetailModal(true);
                        }}
                        className="text-primary-600 hover:text-primary-900"
                        title="View Details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => window.open(`/api/print/invoice/${order.id}`, '_blank')}
                        className="text-gray-600 hover:text-gray-900"
                        title="Print Invoice"
                      >
                        <FileText className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination Info */}
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 text-sm text-gray-500">
          Showing {filteredOrders.length} of {orders.length} orders
        </div>
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {selectedOrder.invoice_number}
                </h2>
                <p className="text-gray-600">Sales Order Details</p>
              </div>
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

            {detailLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              </div>
            ) : detailData ? (
              <>
                {/* Summary */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Customer</p>
                    <p className="text-sm font-medium text-gray-900">
                      {detailData.customer?.name || 'Walk-in Customer'}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Branch</p>
                    <p className="text-sm font-medium text-gray-900">
                      {detailData.branch?.name}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Payment Status</p>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPaymentStatusColor(detailData.payment_status)}`}>
                      {detailData.payment_status}
                    </span>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Total Amount</p>
                    <p className="text-sm font-bold text-gray-900">
                      {formatCurrency(detailData.total_amount)}
                    </p>
                  </div>
                </div>

                {/* Production Info */}
                {detailData.production_status !== 'na' && (
                  <div className="bg-orange-50 rounded-lg p-4 mb-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-orange-800">Production Status</p>
                        <span className={`inline-block mt-1 px-2 py-1 text-xs font-medium rounded-full ${getProductionStatusColor(detailData.production_status)}`}>
                          {detailData.production_status}
                        </span>
                      </div>
                      {detailData.dispatcher_name && (
                        <div className="text-right">
                          <p className="text-xs text-orange-600">Dispatcher</p>
                          <p className="text-sm font-medium text-orange-800">{detailData.dispatcher_name}</p>
                          {detailData.vehicle_plate && (
                            <p className="text-xs text-orange-600">{detailData.vehicle_plate}</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Items Table */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Items</h3>
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Product</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Qty</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Unit Price</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {detailData.items?.map((item) => (
                          <tr key={item.id}>
                            <td className="px-4 py-3">
                              <div className="text-sm font-medium text-gray-900">
                                {item.product?.name}
                              </div>
                              <div className="text-xs text-gray-500">
                                {item.product?.sku}
                              </div>
                              {item.assignments?.length > 0 && (
                                <div className="mt-1">
                                  {item.assignments.map((assignment) => (
                                    <span
                                      key={assignment.id}
                                      className="inline-block mr-1 px-1.5 py-0.5 text-xs font-mono bg-blue-50 text-blue-700 rounded"
                                    >
                                      {assignment.inventory_batch?.instance_code || assignment.inventory_batch?.batch_identifier}: {parseFloat(assignment.quantity_deducted).toFixed(3)} {assignment.inventory_batch?.product?.base_unit}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {parseFloat(item.quantity).toFixed(3)} {item.product?.base_unit}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {formatCurrency(item.unit_price)}
                            </td>
                            <td className="px-4 py-3 text-sm font-medium text-gray-900">
                              {formatCurrency(item.subtotal)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-gray-50">
                        <tr>
                          <td colSpan="3" className="px-4 py-3 text-sm font-medium text-gray-900 text-right">
                            Total:
                          </td>
                          <td className="px-4 py-3 text-sm font-bold text-gray-900">
                            {formatCurrency(detailData.total_amount)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>

                {/* Meta */}
                <div className="text-xs text-gray-500 border-t border-gray-200 pt-4">
                  <p>Created on {formatDate(detailData.created_at)}</p>
                </div>
              </>
            ) : (
              <p className="text-gray-500">Unable to load order details</p>
            )}

            <div className="mt-6 pt-4 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => window.open(`/api/print/invoice/${selectedOrder.id}`, '_blank')}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                Print Invoice
              </button>
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedOrder(null);
                }}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sales;

