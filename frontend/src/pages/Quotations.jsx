import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { FileText, Eye, Trash2, ArrowRight, Search, X, Plus, Clock, AlertCircle } from 'lucide-react';
import ManufacturedItemSelector from '../components/sales/ManufacturedItemSelector';

const Quotations = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { hasPermission } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedQuotation, setSelectedQuotation] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [showCoilSelector, setShowCoilSelector] = useState(false);
  const [quotationToConvert, setQuotationToConvert] = useState(null);

  // Fetch quotations
  const { data, isLoading, error } = useQuery({
    queryKey: ['quotations', statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      const response = await api.get(`/sales/quotations?${params.toString()}`);
      return response.data;
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await api.delete(`/sales/quotations/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['quotations']);
      setShowDeleteConfirm(false);
      setDeleteId(null);
    }
  });

  // Convert to invoice mutation
  const convertMutation = useMutation({
    mutationFn: async ({ id, item_assignments }) => {
      const response = await api.post(`/sales/quotations/${id}/convert`, { item_assignments });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['quotations']);
      queryClient.invalidateQueries(['sales']);
      setShowDetailModal(false);
      setSelectedQuotation(null);
    }
  });

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN'
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-NG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-NG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getDaysUntilExpiry = (validUntil) => {
    if (!validUntil) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiryDate = new Date(validUntil);
    expiryDate.setHours(0, 0, 0, 0);
    const diffTime = expiryDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const handleDelete = (id) => {
    setDeleteId(id);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    if (deleteId) {
      deleteMutation.mutate(deleteId);
    }
  };

  const handleConvertToInvoice = (quotation) => {
    if (quotation.is_expired) {
      alert('This quotation has expired and cannot be converted.');
      return;
    }

    // Check if quotation has manufactured products that need coil selection
    const hasManufactured = quotation.items?.some(item => item.product?.type === 'manufactured_virtual');
    
    if (hasManufactured) {
      // Show coil selection modal for manufactured items
      setQuotationToConvert(quotation);
      setShowCoilSelector(true);
      return;
    }

    // No manufactured products, convert directly
    convertMutation.mutate({ id: quotation.id, item_assignments: {} });
  };

  const handleCoilSelectionConfirm = (itemAssignments) => {
    if (quotationToConvert) {
      convertMutation.mutate({ 
        id: quotationToConvert.id, 
        item_assignments: itemAssignments 
      });
    }
    setShowCoilSelector(false);
    setQuotationToConvert(null);
  };

  const handleCoilSelectionCancel = () => {
    setShowCoilSelector(false);
    setQuotationToConvert(null);
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
        {error.response?.data?.error || error.message || 'Failed to load quotations'}
      </div>
    );
  }

  const quotations = data?.quotations || [];

  // Filter by search term
  const filteredQuotations = quotations.filter(quote => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      quote.invoice_number?.toLowerCase().includes(search) ||
      quote.customer?.name?.toLowerCase().includes(search)
    );
  });

  // Calculate stats
  const activeCount = quotations.filter(q => !q.is_expired).length;
  const expiredCount = quotations.filter(q => q.is_expired).length;
  const totalValue = quotations.reduce((sum, q) => sum + parseFloat(q.total_amount || 0), 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Quotations</h1>
          <p className="text-gray-600 mt-2">Manage price quotes for customers</p>
        </div>
        {hasPermission('pos_access') && (
          <button
            onClick={() => navigate('/sales/add')}
            className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Plus className="h-5 w-5" />
            <span>New Quotation</span>
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
          <p className="text-sm text-gray-500">Total Quotations</p>
          <p className="text-2xl font-bold text-gray-900">{quotations.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
          <p className="text-sm text-gray-500">Active</p>
          <p className="text-2xl font-bold text-green-600">{activeCount}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
          <p className="text-sm text-gray-500">Expired</p>
          <p className="text-2xl font-bold text-red-600">{expiredCount}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
          <p className="text-sm text-gray-500">Total Value</p>
          <p className="text-2xl font-bold text-primary-600">{formatCurrency(totalValue)}</p>
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
            placeholder="Search by quote #, customer..."
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
          <option value="active">Active</option>
          <option value="expired">Expired</option>
        </select>
      </div>

      {/* Quotations Table */}
      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Quote #
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Customer
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Items
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Valid Until
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
            {filteredQuotations.length === 0 ? (
              <tr>
                <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No quotations found</p>
                  {searchTerm && (
                    <p className="text-sm mt-1">Try adjusting your search</p>
                  )}
                </td>
              </tr>
            ) : (
              filteredQuotations.map((quote) => {
                const daysUntil = getDaysUntilExpiry(quote.valid_until);
                const isExpiringSoon = daysUntil !== null && daysUntil >= 0 && daysUntil <= 3;
                
                return (
                  <tr key={quote.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {quote.invoice_number}
                      </div>
                      <div className="text-xs text-gray-500">
                        {quote.branch?.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {quote.customer?.name || 'Walk-in'}
                      </div>
                      {quote.customer?.phone && (
                        <div className="text-xs text-gray-500">{quote.customer.phone}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {quote.items?.length || 0} item(s)
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {formatCurrency(quote.total_amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {formatDate(quote.valid_until)}
                      </div>
                      {daysUntil !== null && !quote.is_expired && (
                        <div className={`text-xs ${isExpiringSoon ? 'text-orange-600' : 'text-gray-500'}`}>
                          {daysUntil === 0 ? 'Expires today' : `${daysUntil} day(s) left`}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {quote.is_expired ? (
                        <span className="flex items-center space-x-1 px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                          <AlertCircle className="h-3 w-3" />
                          <span>Expired</span>
                        </span>
                      ) : isExpiringSoon ? (
                        <span className="flex items-center space-x-1 px-2 py-1 text-xs font-medium rounded-full bg-orange-100 text-orange-800">
                          <Clock className="h-3 w-3" />
                          <span>Expiring Soon</span>
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                          Active
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => {
                            setSelectedQuotation(quote);
                            setShowDetailModal(true);
                          }}
                          className="text-primary-600 hover:text-primary-900 p-1"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        {!quote.is_expired && (
                          <button
                            onClick={() => handleConvertToInvoice(quote)}
                            className="text-green-600 hover:text-green-900 p-1"
                            title="Convert to Invoice"
                            disabled={convertMutation.isPending}
                          >
                            <ArrowRight className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(quote.id)}
                          className="text-red-600 hover:text-red-900 p-1"
                          title="Delete Quotation"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 text-sm text-gray-500">
          {filteredQuotations.length} quotation(s)
        </div>
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedQuotation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {selectedQuotation.invoice_number}
                </h2>
                <p className="text-gray-600">Quotation Details</p>
              </div>
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedQuotation(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500">Customer</p>
                <p className="text-sm font-medium text-gray-900">
                  {selectedQuotation.customer?.name || 'Walk-in Customer'}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500">Total</p>
                <p className="text-sm font-bold text-gray-900">
                  {formatCurrency(selectedQuotation.total_amount)}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500">Valid Until</p>
                <p className="text-sm font-medium text-gray-900">
                  {formatDate(selectedQuotation.valid_until)}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500">Status</p>
                {selectedQuotation.is_expired ? (
                  <span className="text-sm font-medium text-red-600">Expired</span>
                ) : (
                  <span className="text-sm font-medium text-green-600">Active</span>
                )}
              </div>
            </div>

            {/* Quotation Notes */}
            {selectedQuotation.quotation_notes && (
              <div className="mb-6 p-4 bg-purple-50 rounded-lg border border-purple-200">
                <p className="text-xs text-purple-600 font-medium mb-1">Notes</p>
                <p className="text-sm text-purple-900">{selectedQuotation.quotation_notes}</p>
              </div>
            )}

            {/* Items */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Items</h3>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Product</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Qty</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Price</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {selectedQuotation.items?.map((item) => (
                      <tr key={item.id}>
                        <td className="px-4 py-3">
                          <div className="text-sm font-medium text-gray-900">
                            {item.product?.name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {item.product?.sku}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {parseFloat(item.quantity).toFixed(3)}
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
                </table>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedQuotation(null);
                }}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Close
              </button>
              {!selectedQuotation.is_expired && (
                <button
                  onClick={() => handleConvertToInvoice(selectedQuotation)}
                  disabled={convertMutation.isPending}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center space-x-2"
                >
                  <ArrowRight className="h-4 w-4" />
                  <span>Convert to Invoice</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Delete Quotation?</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this quotation? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeleteId(null);
                }}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleteMutation.isPending}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Coil Selection Modal for Manufactured Items */}
      <ManufacturedItemSelector
        isOpen={showCoilSelector}
        items={quotationToConvert?.items || []}
        onConfirm={handleCoilSelectionConfirm}
        onCancel={handleCoilSelectionCancel}
      />
    </div>
  );
};

export default Quotations;

