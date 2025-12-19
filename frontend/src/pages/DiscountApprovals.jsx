import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { CheckCircle, XCircle, Edit2, RotateCcw, Filter, Search, AlertCircle } from 'lucide-react';
import DiscountApprovalDetail from '../components/discount/DiscountApprovalDetail';

const DiscountApprovals = () => {
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState({
    status: 'pending',
    start_date: '',
    end_date: '',
    customer_id: '',
    branch_id: '',
    search: ''
  });
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [selectedSale, setSelectedSale] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [actionType, setActionType] = useState(null); // 'approve', 'decline', 'edit', 'restore'

  // Check permission
  if (!hasPermission('sale_discount_approve')) {
    return (
      <div className="p-6">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-red-800">You do not have permission to view discount approvals.</p>
        </div>
      </div>
    );
  }

  // Fetch discount approvals
  const { data, isLoading } = useQuery({
    queryKey: ['discount-approvals', filters, page, limit],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.start_date) params.append('start_date', filters.start_date);
      if (filters.end_date) params.append('end_date', filters.end_date);
      if (filters.customer_id) params.append('customer_id', filters.customer_id);
      if (filters.branch_id) params.append('branch_id', filters.branch_id);
      if (filters.search) params.append('search', filters.search);
      params.append('page', page);
      params.append('limit', limit);
      
      const response = await api.get(`/discount-approvals?${params.toString()}`);
      return response.data;
    }
  });

  // Fetch customers for filter
  const { data: customersData } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const response = await api.get('/customers');
      return response.data.customers || [];
    }
  });

  // Fetch branches for filter
  const { data: branchesData } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      const response = await api.get('/branches');
      return response.data.branches || [];
    }
  });

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: async (saleId) => {
      const response = await api.put(`/discount-approvals/${saleId}/approve`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['discount-approvals']);
      setShowDetailModal(false);
      setSelectedSale(null);
    }
  });

  // Decline mutation
  const declineMutation = useMutation({
    mutationFn: async ({ saleId, reason }) => {
      const response = await api.put(`/discount-approvals/${saleId}/decline`, { reason });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['discount-approvals']);
      setShowDetailModal(false);
      setSelectedSale(null);
    }
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ saleId, items }) => {
      const response = await api.put(`/discount-approvals/${saleId}/update`, { items });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['discount-approvals']);
      setShowDetailModal(false);
      setSelectedSale(null);
    }
  });

  // Restore mutation
  const restoreMutation = useMutation({
    mutationFn: async ({ saleId, items }) => {
      const response = await api.put(`/discount-approvals/${saleId}/restore`, { items });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['discount-approvals']);
      setShowDetailModal(false);
      setSelectedSale(null);
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

  const calculateDiscount = (sale) => {
    let totalDiscount = 0;
    sale.items?.forEach(item => {
      const standardPrice = parseFloat(item.product?.sale_price || 0);
      const sellingPrice = parseFloat(item.unit_price || 0);
      if (sellingPrice < standardPrice) {
        totalDiscount += (standardPrice - sellingPrice) * parseFloat(item.quantity || 0);
      }
    });
    return totalDiscount;
  };

  const handleAction = (sale, type) => {
    setSelectedSale(sale);
    setActionType(type);
    setShowDetailModal(true);
  };

  const sales = data?.sales || [];
  const totalDiscount = data?.totalDiscount || 0;
  const pagination = data?.pagination || { total: 0, page: 1, limit: 25, pages: 1 };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Discount Approvals</h1>
          <p className="text-gray-600 mt-2">Review and approve sales with discounted prices</p>
        </div>
        {totalDiscount > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2">
            <p className="text-sm text-amber-800">
              <span className="font-semibold">Total Discount:</span> {formatCurrency(totalDiscount)}
            </p>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filters.status}
              onChange={(e) => {
                setFilters({ ...filters, status: e.target.value });
                setPage(1);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">All</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="declined">Declined</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Start Date</label>
            <input
              type="date"
              value={filters.start_date}
              onChange={(e) => {
                setFilters({ ...filters, start_date: e.target.value });
                setPage(1);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">End Date</label>
            <input
              type="date"
              value={filters.end_date}
              onChange={(e) => {
                setFilters({ ...filters, end_date: e.target.value });
                setPage(1);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Customer</label>
            <select
              value={filters.customer_id}
              onChange={(e) => {
                setFilters({ ...filters, customer_id: e.target.value });
                setPage(1);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">All Customers</option>
              {customersData?.map(customer => (
                <option key={customer.id} value={customer.id}>{customer.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Branch</label>
            <select
              value={filters.branch_id}
              onChange={(e) => {
                setFilters({ ...filters, branch_id: e.target.value });
                setPage(1);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">All Branches</option>
              {branchesData?.map(branch => (
                <option key={branch.id} value={branch.id}>{branch.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={filters.search}
                onChange={(e) => {
                  setFilters({ ...filters, search: e.target.value });
                  setPage(1);
                }}
                placeholder="Invoice #, Customer..."
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-primary-600"></div>
        </div>
      ) : sales.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white px-6 py-12 text-center">
          <AlertCircle className="mx-auto mb-4 h-12 w-12 text-gray-400" />
          <p className="text-lg font-medium text-gray-700">No discount approvals found</p>
          <p className="mt-1 text-sm text-gray-500">Try adjusting your filters.</p>
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Branch</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Discount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sales.map((sale) => {
                  const discount = calculateDiscount(sale);
                  return (
                    <tr key={sale.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{sale.invoice_number}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{sale.customer?.name || 'Walk-in'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{sale.branch?.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{formatCurrency(sale.total_amount)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-amber-600 font-medium">{formatCurrency(discount)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          sale.discount_status === 'pending' ? 'bg-amber-100 text-amber-800' :
                          sale.discount_status === 'approved' ? 'bg-green-100 text-green-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {sale.discount_status || 'N/A'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">{formatDate(sale.created_at)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center gap-2">
                          {sale.discount_status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleAction(sale, 'approve')}
                                className="text-green-600 hover:text-green-900"
                                title="Approve"
                              >
                                <CheckCircle className="h-5 w-5" />
                              </button>
                              <button
                                onClick={() => handleAction(sale, 'decline')}
                                className="text-red-600 hover:text-red-900"
                                title="Decline"
                              >
                                <XCircle className="h-5 w-5" />
                              </button>
                              <button
                                onClick={() => handleAction(sale, 'edit')}
                                className="text-blue-600 hover:text-blue-900"
                                title="Edit"
                              >
                                <Edit2 className="h-5 w-5" />
                              </button>
                            </>
                          )}
                          {sale.discount_status === 'declined' && (
                            <button
                              onClick={() => handleAction(sale, 'restore')}
                              className="text-blue-600 hover:text-blue-900"
                              title="Restore"
                            >
                              <RotateCcw className="h-5 w-5" />
                            </button>
                          )}
                          <button
                            onClick={() => handleAction(sale, 'view')}
                            className="text-gray-600 hover:text-gray-900"
                            title="View Details"
                          >
                            <AlertCircle className="h-5 w-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} results
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={pagination.page === 1}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}
                  disabled={pagination.page === pagination.pages}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedSale && (
        <DiscountApprovalDetail
          sale={selectedSale}
          actionType={actionType}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedSale(null);
            setActionType(null);
          }}
          onApprove={(saleId) => approveMutation.mutate(saleId)}
          onDecline={(saleId, reason) => declineMutation.mutate({ saleId, reason })}
          onUpdate={(saleId, items) => updateMutation.mutate({ saleId, items })}
          onRestore={(saleId, items) => restoreMutation.mutate({ saleId, items })}
          isProcessing={
            approveMutation.isPending ||
            declineMutation.isPending ||
            updateMutation.isPending ||
            restoreMutation.isPending
          }
        />
      )}
    </div>
  );
};

export default DiscountApprovals;
