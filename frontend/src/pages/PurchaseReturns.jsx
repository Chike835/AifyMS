import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { sortData } from '../utils/sortUtils';
import SortIndicator from '../components/common/SortIndicator';
import { RotateCcw, Plus, Eye, Check, X, Search } from 'lucide-react';
import ListToolbar from '../components/common/ListToolbar';
import ExportModal from '../components/import/ExportModal';

const PurchaseReturns = () => {
  const queryClient = useQueryClient();
  const { hasPermission } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showExportModal, setShowExportModal] = useState(false);
  const [limit, setLimit] = useState(25);
  const [visibleColumns, setVisibleColumns] = useState({
    return_number: true,
    original_po: true,
    supplier: true,
    amount: true,
    status: true,
    date: true,
    actions: true
  });
  const [selectedReturn, setSelectedReturn] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

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

  // Create return form state
  const [returnForm, setReturnForm] = useState({
    purchase_id: '',
    reason: '',
    items: []
  });
  const [purchaseSearch, setPurchaseSearch] = useState('');
  const [selectedPurchase, setSelectedPurchase] = useState(null);

  // Fetch purchase returns
  const { data, isLoading, error } = useQuery({
    queryKey: ['purchase-returns', statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      const response = await api.get(`/purchase-returns?${params.toString()}`);
      return response.data;
    }
  });

  // Search purchases
  const { data: purchasesData } = useQuery({
    queryKey: ['purchases-search', purchaseSearch],
    queryFn: async () => {
      if (!purchaseSearch || purchaseSearch.length < 2) return { purchases: [] };
      const response = await api.get(`/purchases?search=${purchaseSearch}`);
      return response.data;
    },
    enabled: purchaseSearch.length >= 2
  });

  // Create return mutation
  const createMutation = useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/purchase-returns', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['purchase-returns']);
      setShowCreateModal(false);
      resetForm();
    }
  });

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: async (id) => {
      const response = await api.put(`/purchase-returns/${id}/approve`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['purchase-returns']);
      setShowDetailModal(false);
      setSelectedReturn(null);
    }
  });

  // Cancel mutation
  const cancelMutation = useMutation({
    mutationFn: async (id) => {
      const response = await api.put(`/purchase-returns/${id}/cancel`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['purchase-returns']);
      setShowDetailModal(false);
      setSelectedReturn(null);
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

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const resetForm = () => {
    setReturnForm({
      purchase_id: '',
      reason: '',
      items: []
    });
    setPurchaseSearch('');
    setSelectedPurchase(null);
  };

  const handleSelectPurchase = (purchase) => {
    setSelectedPurchase(purchase);
    setReturnForm(prev => ({
      ...prev,
      purchase_id: purchase.id,
      items: purchase.items?.map(item => ({
        purchase_item_id: item.id,
        product_name: item.product?.name,
        original_quantity: parseFloat(item.quantity),
        unit_cost: parseFloat(item.unit_cost),
        inventory_batch_id: item.inventory_batch_id,
        instance_code: item.inventory_batch?.instance_code || item.inventory_batch?.batch_identifier,
        return_quantity: 0
      })) || []
    }));
    setPurchaseSearch('');
  };

  const handleItemQuantityChange = (index, quantity) => {
    const newItems = [...returnForm.items];
    newItems[index].return_quantity = Math.min(
      Math.max(0, parseFloat(quantity) || 0),
      newItems[index].original_quantity
    );
    setReturnForm(prev => ({ ...prev, items: newItems }));
  };

  const handleSubmitReturn = (e) => {
    e.preventDefault();

    const itemsToReturn = returnForm.items
      .filter(item => item.return_quantity > 0)
      .map(item => ({
        purchase_item_id: item.purchase_item_id,
        quantity: item.return_quantity,
        inventory_batch_id: item.inventory_batch_id
      }));

    if (itemsToReturn.length === 0) {
      alert('Please select at least one item to return');
      return;
    }

    createMutation.mutate({
      purchase_id: returnForm.purchase_id,
      reason: returnForm.reason,
      items: itemsToReturn
    });
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
        {error.response?.data?.error || error.message || 'Failed to load purchase returns'}
      </div>
    );
  }

  const returns = data?.returns || [];

  // Filter by search term
  const filteredReturns = sortData(returns.filter(ret => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      ret.return_number?.toLowerCase().includes(search) ||
      ret.purchase?.purchase_number?.toLowerCase().includes(search) ||
      ret.supplier?.name?.toLowerCase().includes(search)
    );
  }), sortField, sortDirection);

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Purchase Returns</h1>
          <p className="text-gray-600 mt-2">Manage returns to suppliers</p>
        </div>
        {hasPermission('purchase_return_create') && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Plus className="h-5 w-5" />
            <span>New Return</span>
          </button>
        )}
      </div>

      {/* List Toolbar */}
      <ListToolbar
        limit={limit}
        onLimitChange={setLimit}
        visibleColumns={visibleColumns}
        onColumnVisibilityChange={setVisibleColumns}
        onPrint={() => window.print()}
        onExport={() => setShowExportModal(true)}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search by return #, PO #, supplier..."
      >
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </ListToolbar>

      {/* Export Modal */}
      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        entity="purchase-returns"
        title="Export Purchase Returns"
      />

      {/* Returns Table */}
      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {visibleColumns.return_number && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button onClick={() => handleSort('return_number')} className="flex items-center gap-1">
                    Return #
                    <SortIndicator field="return_number" sortField={sortField} sortDirection={sortDirection} />
                  </button>
                </th>
              )}
              {visibleColumns.original_po && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button onClick={() => handleSort('purchase.purchase_number')} className="flex items-center gap-1">
                    Original PO
                    <SortIndicator field="purchase.purchase_number" sortField={sortField} sortDirection={sortDirection} />
                  </button>
                </th>
              )}
              {visibleColumns.supplier && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button onClick={() => handleSort('supplier.name')} className="flex items-center gap-1">
                    Supplier
                    <SortIndicator field="supplier.name" sortField={sortField} sortDirection={sortDirection} />
                  </button>
                </th>
              )}
              {visibleColumns.amount && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button onClick={() => handleSort('total_amount')} className="flex items-center gap-1">
                    Amount
                    <SortIndicator field="total_amount" sortField={sortField} sortDirection={sortDirection} />
                  </button>
                </th>
              )}
              {visibleColumns.status && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button onClick={() => handleSort('status')} className="flex items-center gap-1">
                    Status
                    <SortIndicator field="status" sortField={sortField} sortDirection={sortDirection} />
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
              {visibleColumns.actions && (
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredReturns.length === 0 ? (
              <tr>
                <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                  <RotateCcw className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No purchase returns found</p>
                </td>
              </tr>
            ) : (
              filteredReturns.slice(0, limit === -1 ? undefined : limit).map((ret) => (
                <tr key={ret.id} className="hover:bg-gray-50">
                  {visibleColumns.return_number && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {ret.return_number}
                      </div>
                      <div className="text-xs text-gray-500">
                        {ret.items?.length || 0} item(s)
                      </div>
                    </td>
                  )}
                  {visibleColumns.original_po && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {ret.purchase?.purchase_number}
                    </td>
                  )}
                  {visibleColumns.supplier && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {ret.supplier?.name || '-'}
                      </div>
                    </td>
                  )}
                  {visibleColumns.amount && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {formatCurrency(ret.total_amount)}
                    </td>
                  )}
                  {visibleColumns.status && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(ret.status)}`}>
                        {ret.status}
                      </span>
                    </td>
                  )}
                  {visibleColumns.date && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(ret.created_at)}
                    </td>
                  )}
                  {visibleColumns.actions && (
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => {
                            setSelectedReturn(ret);
                            setShowDetailModal(true);
                          }}
                          className="text-primary-600 hover:text-primary-900 p-1"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        {ret.status === 'pending' && hasPermission('purchase_return_approve') && (
                          <button
                            onClick={() => approveMutation.mutate(ret.id)}
                            className="text-green-600 hover:text-green-900 p-1"
                            title="Approve"
                            disabled={approveMutation.isPending}
                          >
                            <Check className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>

        <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 text-sm text-gray-500">
          {filteredReturns.length} return(s)
        </div>
      </div>

      {/* Create Return Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Create Purchase Return</h2>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  resetForm();
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmitReturn} className="space-y-6">
              {/* Purchase Search */}
              {!selectedPurchase && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Search Purchase Order *
                  </label>
                  <input
                    type="text"
                    value={purchaseSearch}
                    onChange={(e) => setPurchaseSearch(e.target.value)}
                    placeholder="Enter PO number..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  {purchasesData?.purchases?.length > 0 && (
                    <div className="mt-2 border border-gray-200 rounded-lg max-h-48 overflow-y-auto">
                      {purchasesData.purchases.map((purchase) => (
                        <button
                          key={purchase.id}
                          type="button"
                          onClick={() => handleSelectPurchase(purchase)}
                          className="w-full px-3 py-2 text-left hover:bg-gray-50 border-b last:border-b-0"
                        >
                          <div className="text-sm font-medium text-gray-900">
                            {purchase.purchase_number}
                          </div>
                          <div className="text-xs text-gray-500">
                            {purchase.supplier?.name || 'No supplier'} • {formatCurrency(purchase.total_amount)}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Selected Purchase */}
              {selectedPurchase && (
                <>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {selectedPurchase.purchase_number}
                        </p>
                        <p className="text-xs text-gray-500">
                          {selectedPurchase.supplier?.name || 'No supplier'} • {formatDate(selectedPurchase.created_at)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={resetForm}
                        className="text-sm text-primary-600 hover:text-primary-700"
                      >
                        Change
                      </button>
                    </div>
                  </div>

                  {/* Return Items */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Items to Return
                    </label>
                    <div className="space-y-2">
                      {returnForm.items.map((item, index) => (
                        <div key={item.purchase_item_id} className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">{item.product_name}</p>
                            <p className="text-xs text-gray-500">
                              Purchased: {item.original_quantity} • {formatCurrency(item.unit_cost)} each
                              {item.instance_code && (
                                <span className="ml-2 px-1 py-0.5 bg-blue-100 text-blue-700 rounded">
                                  {item.instance_code}
                                </span>
                              )}
                            </p>
                          </div>
                          <div className="w-32">
                            <input
                              type="number"
                              step="0.001"
                              min="0"
                              max={item.original_quantity}
                              value={item.return_quantity}
                              onChange={(e) => handleItemQuantityChange(index, e.target.value)}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                              placeholder="Qty"
                            />
                          </div>
                          <div className="w-24 text-right text-sm font-medium">
                            {formatCurrency(item.return_quantity * item.unit_cost)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Reason */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Reason for Return *
                    </label>
                    <textarea
                      value={returnForm.reason}
                      onChange={(e) => setReturnForm(prev => ({ ...prev, reason: e.target.value }))}
                      rows={3}
                      placeholder="Describe the reason for this return..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      required
                    />
                  </div>

                  {/* Total */}
                  <div className="pt-4 border-t border-gray-200">
                    <div className="flex items-center justify-between text-lg font-bold">
                      <span>Total Return Amount:</span>
                      <span>
                        {formatCurrency(
                          returnForm.items.reduce((sum, item) => sum + (item.return_quantity * item.unit_cost), 0)
                        )}
                      </span>
                    </div>
                  </div>
                </>
              )}

              {/* Actions */}
              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    resetForm();
                  }}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!selectedPurchase || createMutation.isPending}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
                >
                  {createMutation.isPending ? 'Creating...' : 'Create Return'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedReturn && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {selectedReturn.return_number}
                </h2>
                <p className="text-gray-600">Purchase Return Details</p>
              </div>
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedReturn(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500">Original PO</p>
                <p className="text-sm font-medium text-gray-900">
                  {selectedReturn.purchase?.purchase_number}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500">Supplier</p>
                <p className="text-sm font-medium text-gray-900">
                  {selectedReturn.supplier?.name || '-'}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500">Status</p>
                <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(selectedReturn.status)}`}>
                  {selectedReturn.status}
                </span>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500">Total Amount</p>
                <p className="text-sm font-bold text-gray-900">
                  {formatCurrency(selectedReturn.total_amount)}
                </p>
              </div>
            </div>

            {/* Reason */}
            <div className="mb-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <p className="text-xs text-yellow-600 font-medium mb-1">Return Reason</p>
              <p className="text-sm text-yellow-900">{selectedReturn.reason}</p>
            </div>

            {/* Items */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Returned Items</h3>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Product</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Qty</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Cost</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {selectedReturn.items?.map((item) => (
                      <tr key={item.id}>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {item.product?.name}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {parseFloat(item.quantity).toFixed(3)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {formatCurrency(item.unit_cost)}
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

            {/* Meta */}
            <div className="text-xs text-gray-500 border-t border-gray-200 pt-4 space-y-1">
              <p>Created by {selectedReturn.creator?.full_name} on {formatDate(selectedReturn.created_at)}</p>
              {selectedReturn.approver && (
                <p>Approved by {selectedReturn.approver?.full_name} on {formatDate(selectedReturn.approved_at)}</p>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-3 pt-4 mt-4 border-t border-gray-200">
              {selectedReturn.status === 'pending' && (
                <>
                  {hasPermission('purchase_return_approve') && (
                    <button
                      onClick={() => approveMutation.mutate(selectedReturn.id)}
                      disabled={approveMutation.isPending}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                    >
                      Approve Return
                    </button>
                  )}
                  {hasPermission('purchase_return_create') && (
                    <button
                      onClick={() => cancelMutation.mutate(selectedReturn.id)}
                      disabled={cancelMutation.isPending}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                    >
                      Cancel Return
                    </button>
                  )}
                </>
              )}
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedReturn(null);
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

export default PurchaseReturns;

