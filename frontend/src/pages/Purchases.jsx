import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { ShoppingBag, Plus, Eye, Search, X } from 'lucide-react';

const Purchases = () => {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedPurchase, setSelectedPurchase] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Fetch purchases
  const { data, isLoading, error } = useQuery({
    queryKey: ['purchases', statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      const response = await api.get(`/purchases?${params.toString()}`);
      return response.data;
    }
  });

  // Fetch purchase details
  const { data: detailData, isLoading: detailLoading } = useQuery({
    queryKey: ['purchaseDetail', selectedPurchase?.id],
    queryFn: async () => {
      if (!selectedPurchase?.id) return null;
      const response = await api.get(`/purchases/${selectedPurchase.id}`);
      return response.data.purchase;
    },
    enabled: !!selectedPurchase?.id && showDetailModal
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

  const getStatusColor = (status) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'confirmed': return 'bg-blue-100 text-blue-800';
      case 'received': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentStatusColor = (status) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'partial': return 'bg-yellow-100 text-yellow-800';
      case 'unpaid': return 'bg-red-100 text-red-800';
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
        {error.response?.data?.error || error.message || 'Failed to load purchases'}
      </div>
    );
  }

  const purchases = data?.purchases || [];

  // Filter by search term
  const filteredPurchases = purchases.filter(purchase => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      purchase.purchase_number?.toLowerCase().includes(search) ||
      purchase.supplier?.name?.toLowerCase().includes(search) ||
      purchase.branch?.name?.toLowerCase().includes(search)
    );
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Purchases</h1>
          <p className="text-gray-600 mt-2">Manage purchase orders and inventory receipts</p>
        </div>
        {hasPermission('stock_add_opening') && (
          <button
            onClick={() => navigate('/purchases/add')}
            className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Plus className="h-5 w-5" />
            <span>Add Purchase</span>
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by PO number, supplier..."
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
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">All Status</option>
          <option value="draft">Draft</option>
          <option value="confirmed">Confirmed</option>
          <option value="received">Received</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Purchases Table */}
      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                PO Number
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Supplier
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Branch
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Payment
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
            {filteredPurchases.length === 0 ? (
              <tr>
                <td colSpan="8" className="px-6 py-12 text-center text-gray-500">
                  <ShoppingBag className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No purchases found</p>
                  {(searchTerm || statusFilter) && (
                    <p className="text-sm mt-1">Try adjusting your filters</p>
                  )}
                </td>
              </tr>
            ) : (
              filteredPurchases.map((purchase) => (
                <tr key={purchase.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {purchase.purchase_number}
                    </div>
                    <div className="text-xs text-gray-500">
                      by {purchase.creator?.full_name}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {purchase.supplier?.name || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {purchase.branch?.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {formatCurrency(purchase.total_amount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(purchase.status)}`}>
                      {purchase.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPaymentStatusColor(purchase.payment_status)}`}>
                      {purchase.payment_status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(purchase.created_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => {
                        setSelectedPurchase(purchase);
                        setShowDetailModal(true);
                      }}
                      className="text-primary-600 hover:text-primary-900"
                      title="View Details"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination Info */}
        {data?.pagination && (
          <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 text-sm text-gray-500">
            Showing {filteredPurchases.length} of {data.pagination.total} purchases
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedPurchase && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {selectedPurchase.purchase_number}
                </h2>
                <p className="text-gray-600">Purchase Order Details</p>
              </div>
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedPurchase(null);
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
                    <p className="text-xs text-gray-500">Supplier</p>
                    <p className="text-sm font-medium text-gray-900">
                      {detailData.supplier?.name || 'N/A'}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Branch</p>
                    <p className="text-sm font-medium text-gray-900">
                      {detailData.branch?.name}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Status</p>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(detailData.status)}`}>
                      {detailData.status}
                    </span>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Total</p>
                    <p className="text-sm font-bold text-gray-900">
                      {formatCurrency(detailData.total_amount)}
                    </p>
                  </div>
                </div>

                {/* Items Table */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Items</h3>
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Product</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Qty</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Unit Cost</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Subtotal</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Instance</th>
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
                                {item.product?.sku} - {item.product?.type}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {parseFloat(item.quantity).toFixed(3)} {item.product?.base_unit}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {formatCurrency(item.unit_cost)}
                            </td>
                            <td className="px-4 py-3 text-sm font-medium text-gray-900">
                              {formatCurrency(item.subtotal)}
                            </td>
                            <td className="px-4 py-3">
                              {item.inventory_instance ? (
                                <div>
                                  <span className="text-sm font-mono text-primary-600">
                                    {item.inventory_instance.instance_code}
                                  </span>
                                  <span className={`ml-2 px-1.5 py-0.5 text-xs rounded-full ${
                                    item.inventory_instance.status === 'in_stock'
                                      ? 'bg-green-100 text-green-800'
                                      : 'bg-gray-100 text-gray-800'
                                  }`}>
                                    {item.inventory_instance.status}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-sm text-gray-400">-</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Notes */}
                {detailData.notes && (
                  <div className="mb-6">
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Notes</h3>
                    <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                      {detailData.notes}
                    </p>
                  </div>
                )}

                {/* Meta */}
                <div className="text-xs text-gray-500 border-t border-gray-200 pt-4">
                  <p>Created by {detailData.creator?.full_name} on {formatDate(detailData.created_at)}</p>
                </div>
              </>
            ) : (
              <p className="text-gray-500">Unable to load purchase details</p>
            )}

            <div className="mt-6 pt-4 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedPurchase(null);
                }}
                className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
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

export default Purchases;

