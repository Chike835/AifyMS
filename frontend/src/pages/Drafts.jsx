import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { FileEdit, Eye, Trash2, ArrowRight, Search, X, Plus } from 'lucide-react';
import ManufacturedItemSelector from '../components/sales/ManufacturedItemSelector';

const Drafts = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { hasPermission } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDraft, setSelectedDraft] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [showCoilSelector, setShowCoilSelector] = useState(false);
  const [draftToConvert, setDraftToConvert] = useState(null);

  // Fetch drafts
  const { data, isLoading, error } = useQuery({
    queryKey: ['drafts'],
    queryFn: async () => {
      const response = await api.get('/sales/drafts');
      return response.data;
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await api.delete(`/sales/drafts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['drafts']);
      setShowDeleteConfirm(false);
      setDeleteId(null);
    }
  });

  // Convert to invoice mutation
  const convertMutation = useMutation({
    mutationFn: async ({ id, item_assignments }) => {
      const response = await api.post(`/sales/drafts/${id}/convert`, { item_assignments });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['drafts']);
      queryClient.invalidateQueries(['sales']);
      setShowDetailModal(false);
      setSelectedDraft(null);
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

  const handleDelete = (id) => {
    setDeleteId(id);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    if (deleteId) {
      deleteMutation.mutate(deleteId);
    }
  };

  const handleConvertToInvoice = (draft) => {
    // Check if draft has manufactured products that need coil selection
    const hasManufactured = draft.items?.some(item => item.product?.type === 'manufactured_virtual');
    
    if (hasManufactured) {
      // Show coil selection modal for manufactured items
      setDraftToConvert(draft);
      setShowCoilSelector(true);
      return;
    }

    // No manufactured products, convert directly
    convertMutation.mutate({ id: draft.id, item_assignments: {} });
  };

  const handleCoilSelectionConfirm = (itemAssignments) => {
    if (draftToConvert) {
      convertMutation.mutate({ 
        id: draftToConvert.id, 
        item_assignments: itemAssignments 
      });
    }
    setShowCoilSelector(false);
    setDraftToConvert(null);
  };

  const handleCoilSelectionCancel = () => {
    setShowCoilSelector(false);
    setDraftToConvert(null);
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
        {error.response?.data?.error || error.message || 'Failed to load drafts'}
      </div>
    );
  }

  const drafts = data?.drafts || [];

  // Filter by search term
  const filteredDrafts = drafts.filter(draft => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      draft.invoice_number?.toLowerCase().includes(search) ||
      draft.customer?.name?.toLowerCase().includes(search)
    );
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Drafts</h1>
          <p className="text-gray-600 mt-2">Manage saved draft orders</p>
        </div>
        {hasPermission('pos_access') && (
          <button
            onClick={() => navigate('/sales/add')}
            className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Plus className="h-5 w-5" />
            <span>New Draft</span>
          </button>
        )}
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by draft #, customer..."
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
      </div>

      {/* Drafts Table */}
      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Draft #
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
                Created
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredDrafts.length === 0 ? (
              <tr>
                <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                  <FileEdit className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No drafts found</p>
                  {searchTerm && (
                    <p className="text-sm mt-1">Try adjusting your search</p>
                  )}
                </td>
              </tr>
            ) : (
              filteredDrafts.map((draft) => (
                <tr key={draft.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {draft.invoice_number}
                    </div>
                    <div className="text-xs text-gray-500">
                      {draft.branch?.name}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {draft.customer?.name || 'Walk-in'}
                    </div>
                    {draft.customer?.phone && (
                      <div className="text-xs text-gray-500">{draft.customer.phone}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {draft.items?.length || 0} item(s)
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {formatCurrency(draft.total_amount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(draft.created_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => {
                          setSelectedDraft(draft);
                          setShowDetailModal(true);
                        }}
                        className="text-primary-600 hover:text-primary-900 p-1"
                        title="View Details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleConvertToInvoice(draft)}
                        className="text-green-600 hover:text-green-900 p-1"
                        title="Convert to Invoice"
                        disabled={convertMutation.isPending}
                      >
                        <ArrowRight className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(draft.id)}
                        className="text-red-600 hover:text-red-900 p-1"
                        title="Delete Draft"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 text-sm text-gray-500">
          {filteredDrafts.length} draft(s)
        </div>
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedDraft && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {selectedDraft.invoice_number}
                </h2>
                <p className="text-gray-600">Draft Details</p>
              </div>
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedDraft(null);
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
                  {selectedDraft.customer?.name || 'Walk-in Customer'}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500">Total</p>
                <p className="text-sm font-bold text-gray-900">
                  {formatCurrency(selectedDraft.total_amount)}
                </p>
              </div>
            </div>

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
                    {selectedDraft.items?.map((item) => (
                      <tr key={item.id}>
                        <td className="px-4 py-3">
                          <div className="text-sm font-medium text-gray-900">
                            {item.product?.name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {item.product?.sku}
                            {item.product?.type === 'manufactured_virtual' && (
                              <span className="ml-1 px-1 py-0.5 bg-purple-100 text-purple-700 rounded text-xs">
                                manufactured
                              </span>
                            )}
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
                  setSelectedDraft(null);
                }}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => handleConvertToInvoice(selectedDraft)}
                disabled={convertMutation.isPending}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center space-x-2"
              >
                <ArrowRight className="h-4 w-4" />
                <span>Convert to Invoice</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Delete Draft?</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this draft? This action cannot be undone.
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
        items={draftToConvert?.items || []}
        onConfirm={handleCoilSelectionConfirm}
        onCancel={handleCoilSelectionCancel}
      />
    </div>
  );
};

export default Drafts;

