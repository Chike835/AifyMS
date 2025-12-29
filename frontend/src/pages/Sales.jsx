import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import ListToolbar from '../components/common/ListToolbar';
import ExportModal from '../components/import/ExportModal';
import { sortData } from '../utils/sortUtils';
import SortIndicator from '../components/common/SortIndicator';
import { ClipboardList, Plus } from 'lucide-react';
import SaleDetailModal from '../components/sales/SaleDetailModal';
import SaleActionDropdown from '../components/sales/SaleActionDropdown';

const Sales = () => {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('');
  const [productionStatusFilter, setProductionStatusFilter] = useState('');
  const [orderTypeFilter, setOrderTypeFilter] = useState('invoice');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Sorting
  const [sortField, setSortField] = useState('created_at');
  const [sortDirection, setSortDirection] = useState('desc');

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);

  // Column visibility
  const [visibleColumns, setVisibleColumns] = useState({
    invoice_number: true,
    customer: true,
    branch: true,
    total: true,
    type: true,
    payment: true,
    production: true,
    date: true
  });

  // Export modal
  const [showExportModal, setShowExportModal] = useState(false);

  // Fetch sales orders
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['sales', paymentStatusFilter, productionStatusFilter, orderTypeFilter, page, limit, searchTerm],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (paymentStatusFilter) params.append('payment_status', paymentStatusFilter);
      if (productionStatusFilter) params.append('production_status', productionStatusFilter);
      if (orderTypeFilter) params.append('order_type', orderTypeFilter);
      if (searchTerm) params.append('search', searchTerm);
      params.append('page', page);
      params.append('limit', limit === -1 ? 10000 : limit);
      const response = await api.get(`/sales?${params.toString()}`);
      return response.data;
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

  const handleDeleteSub = async (id) => {
    if (window.confirm('Are you sure you want to delete this sale? This action cannot be undone.')) {
      try {
        await api.delete(`/sales/${id}`);
        queryClient.invalidateQueries(['sales']);
        refetch();
      } catch (error) {
        alert('Failed to delete sale: ' + (error.response?.data?.error || error.message));
      }
    }
  };

  const handleApproveSale = async (saleId) => {
    if (window.confirm('Are you sure you want to approve this sale for production?')) {
      try {
        await api.put(`/sales/${saleId}/approve-manufacturing`);
        queryClient.invalidateQueries(['sales']);
        queryClient.invalidateQueries(['sale', saleId]);
        refetch();
        alert('Sale approved for production successfully');
      } catch (error) {
        alert('Failed to approve sale: ' + (error.response?.data?.error || error.message));
      }
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
  const pagination = data?.pagination || { total: 0, page: 1, limit: 25, total_pages: 1 };

  // Filter by search term (Server-side now)
  const filteredOrders = sortData(orders, sortField, sortDirection);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sales Orders</h1>
          <p className="text-sm text-primary-600">Manage invoices, quotations, and sales</p>
        </div>
        <div className="flex items-center space-x-3">
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

      {/* Toolbar */}
      <ListToolbar
        limit={limit}
        onLimitChange={(newLimit) => {
          setLimit(newLimit);
          setPage(1);
        }}
        visibleColumns={visibleColumns}
        onColumnVisibilityChange={setVisibleColumns}
        onExport={() => setShowExportModal(true)}
        searchTerm={searchTerm}
        onSearchChange={(value) => {
          setSearchTerm(value);
          setPage(1);
        }}
        searchPlaceholder="Search by invoice #, customer..."
      >
        {/* Additional filters */}
        <select
          value={orderTypeFilter}
          onChange={(e) => setOrderTypeFilter(e.target.value)}
          className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">All Types</option>
          <option value="invoice">Invoices</option>
          <option value="quotation">Quotations</option>
          <option value="draft">Drafts</option>
        </select>
        <select
          value={paymentStatusFilter}
          onChange={(e) => setPaymentStatusFilter(e.target.value)}
          className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">All Payment</option>
          <option value="unpaid">Unpaid</option>
          <option value="partial">Partial</option>
          <option value="paid">Paid</option>
        </select>
        <select
          value={productionStatusFilter}
          onChange={(e) => setProductionStatusFilter(e.target.value)}
          className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">All Production</option>
          <option value="na">N/A</option>
          <option value="queue">In Queue</option>
          <option value="produced">Produced</option>
          <option value="delivered">Delivered</option>
        </select>
      </ListToolbar>

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
          <p className="text-sm text-gray-500">In Queue</p>
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
      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-visible">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {visibleColumns.invoice_number && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button onClick={() => handleSort('invoice_number')} className="flex items-center gap-1">
                    Invoice #
                    <SortIndicator field="invoice_number" sortField={sortField} sortDirection={sortDirection} />
                  </button>
                </th>
              )}
              {visibleColumns.customer && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button onClick={() => handleSort('customer.name')} className="flex items-center gap-1">
                    Customer
                    <SortIndicator field="customer.name" sortField={sortField} sortDirection={sortDirection} />
                  </button>
                </th>
              )}
              {visibleColumns.branch && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button onClick={() => handleSort('branch.name')} className="flex items-center gap-1">
                    Branch
                    <SortIndicator field="branch.name" sortField={sortField} sortDirection={sortDirection} />
                  </button>
                </th>
              )}
              {visibleColumns.total && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button onClick={() => handleSort('total_amount')} className="flex items-center gap-1">
                    Total
                    <SortIndicator field="total_amount" sortField={sortField} sortDirection={sortDirection} />
                  </button>
                </th>
              )}
              {visibleColumns.type && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button onClick={() => handleSort('order_type')} className="flex items-center gap-1">
                    Type
                    <SortIndicator field="order_type" sortField={sortField} sortDirection={sortDirection} />
                  </button>
                </th>
              )}
              {visibleColumns.payment && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button onClick={() => handleSort('payment_status')} className="flex items-center gap-1">
                    Payment
                    <SortIndicator field="payment_status" sortField={sortField} sortDirection={sortDirection} />
                  </button>
                </th>
              )}
              {visibleColumns.production && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button onClick={() => handleSort('production_status')} className="flex items-center gap-1">
                    Production
                    <SortIndicator field="production_status" sortField={sortField} sortDirection={sortDirection} />
                  </button>
                </th>
              )}
              {visibleColumns.date && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button onClick={() => handleSort('created_at')} className="flex items-center gap-1">
                    Date
                    <SortIndicator field="created_at" sortField={sortField} sortDirection={sortDirection} />
                  </button>
                </th>
              )}
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
                <tr
                  key={order.id}
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => {
                    setSelectedOrder(order);
                    setShowDetailModal(true);
                  }}
                >
                  {visibleColumns.invoice_number && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {order.invoice_number}
                      </div>
                      <div className="text-xs text-gray-500">
                        {order.items?.length || 0} item(s)
                      </div>
                    </td>
                  )}
                  {visibleColumns.customer && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {order.customer?.name || 'Walk-in'}
                      </div>
                      {order.customer?.phone && (
                        <div className="text-xs text-gray-500">{order.customer.phone}</div>
                      )}
                    </td>
                  )}
                  {visibleColumns.branch && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {order.branch?.name}
                    </td>
                  )}
                  {visibleColumns.total && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {formatCurrency(order.total_amount)}
                    </td>
                  )}
                  {visibleColumns.type && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getOrderTypeColor(order.order_type || 'invoice')}`}>
                        {order.order_type || 'invoice'}
                      </span>
                    </td>
                  )}
                  {visibleColumns.payment && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPaymentStatusColor(order.payment_status)}`}>
                        {order.payment_status}
                      </span>
                    </td>
                  )}
                  {visibleColumns.production && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getProductionStatusColor(order.production_status)}`}>
                        {order.production_status === 'na' ? 'N/A' : order.production_status}
                      </span>
                    </td>
                  )}
                  {visibleColumns.date && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(order.created_at)}
                    </td>
                  )}
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium" onClick={(e) => e.stopPropagation()}>
                    <SaleActionDropdown
                      sale={order}
                      onView={() => {
                        setSelectedOrder(order);
                        setShowDetailModal(true);
                      }}
                      onDelete={() => handleDeleteSub(order.id)}
                      onApproveSale={() => handleApproveSale(order.id)}
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination Info */}
        {pagination.total > 0 && (
          <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
            <span className="text-sm text-gray-500">
              Showing {filteredOrders.length} of {pagination.total} orders
            </span>
            {pagination.total_pages > 1 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-600">
                  Page {pagination.page} of {pagination.total_pages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(pagination.total_pages, p + 1))}
                  disabled={page >= pagination.total_pages}
                  className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Export Modal */}
      {showExportModal && (
        <ExportModal
          isOpen={showExportModal}
          onClose={() => setShowExportModal(false)}
          entity="sales"
          title="Export Sales"
        />
      )}

      {/* Detail Modal */}
      <SaleDetailModal
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedOrder(null);
        }}
        saleId={selectedOrder?.id}
      />
    </div>
  );
};

export default Sales;
