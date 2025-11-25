import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { DollarSign, History, Search, Save, X, AlertCircle, CheckCircle } from 'lucide-react';

const UpdatePrice = () => {
  const queryClient = useQueryClient();
  const { hasPermission } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [priceForm, setPriceForm] = useState({
    sale_price: '',
    cost_price: '',
    reason: ''
  });
  const [formSuccess, setFormSuccess] = useState('');
  const [formError, setFormError] = useState('');

  // Fetch products
  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const response = await api.get('/products');
      return response.data.products || [];
    }
  });

  // Fetch price history
  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ['price-history', selectedProduct?.id],
    queryFn: async () => {
      if (!selectedProduct?.id) return null;
      const response = await api.get(`/products/${selectedProduct.id}/price-history`);
      return response.data;
    },
    enabled: !!selectedProduct?.id && showHistoryModal
  });

  // Update price mutation
  const updateMutation = useMutation({
    mutationFn: async ({ productId, data }) => {
      const response = await api.put(`/products/${productId}/price`, data);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['products']);
      setFormSuccess(`Price updated for ${data.product?.name}`);
      setFormError('');
      setPriceForm({ sale_price: '', cost_price: '', reason: '' });
      setSelectedProduct(null);
    },
    onError: (error) => {
      setFormError(error.response?.data?.error || 'Failed to update price');
      setFormSuccess('');
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

  const handleSelectProduct = (product) => {
    setSelectedProduct(product);
    setPriceForm({
      sale_price: product.sale_price || '',
      cost_price: product.cost_price || '',
      reason: ''
    });
    setFormError('');
    setFormSuccess('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!selectedProduct) {
      setFormError('Please select a product first');
      return;
    }

    const data = {};
    if (priceForm.sale_price !== '' && parseFloat(priceForm.sale_price) !== parseFloat(selectedProduct.sale_price || 0)) {
      data.sale_price = parseFloat(priceForm.sale_price);
    }
    if (priceForm.cost_price !== '' && parseFloat(priceForm.cost_price) !== parseFloat(selectedProduct.cost_price || 0)) {
      data.cost_price = parseFloat(priceForm.cost_price);
    }

    if (Object.keys(data).length === 0) {
      setFormError('No price changes detected');
      return;
    }

    if (priceForm.reason) {
      data.reason = priceForm.reason;
    }

    updateMutation.mutate({ productId: selectedProduct.id, data });
  };

  const products = productsData || [];
  const filteredProducts = products.filter(p => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      p.name?.toLowerCase().includes(search) ||
      p.sku?.toLowerCase().includes(search)
    );
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Update Prices</h1>
          <p className="text-gray-600 mt-2">Manage product prices with history tracking</p>
        </div>
      </div>

      {/* Success/Error Messages */}
      {formSuccess && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start space-x-3">
          <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
          <div className="text-green-700">{formSuccess}</div>
        </div>
      )}
      {formError && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-3">
          <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
          <div className="text-red-700">{formError}</div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Product Selection */}
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Select Product</h2>
          
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name or SKU..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {productsLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg">
              {filteredProducts.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  No products found
                </div>
              ) : (
                filteredProducts.map((product) => (
                  <div
                    key={product.id}
                    onClick={() => handleSelectProduct(product)}
                    className={`p-3 border-b last:border-b-0 cursor-pointer hover:bg-gray-50 transition-colors ${
                      selectedProduct?.id === product.id ? 'bg-primary-50 border-l-4 border-l-primary-500' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{product.name}</p>
                        <p className="text-xs text-gray-500">{product.sku}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">
                          {formatCurrency(product.sale_price)}
                        </p>
                        {hasPermission('product_view_cost') && product.cost_price && (
                          <p className="text-xs text-gray-500">
                            Cost: {formatCurrency(product.cost_price)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Price Update Form */}
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Update Price</h2>
            {selectedProduct && (
              <button
                onClick={() => setShowHistoryModal(true)}
                className="flex items-center space-x-1 text-sm text-primary-600 hover:text-primary-700"
              >
                <History className="h-4 w-4" />
                <span>View History</span>
              </button>
            )}
          </div>

          {selectedProduct ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{selectedProduct.name}</p>
                    <p className="text-xs text-gray-500">{selectedProduct.sku}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedProduct(null);
                      setPriceForm({ sale_price: '', cost_price: '', reason: '' });
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sale Price
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₦</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={priceForm.sale_price}
                    onChange={(e) => setPriceForm(prev => ({ ...prev, sale_price: e.target.value }))}
                    className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="0.00"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Current: {formatCurrency(selectedProduct.sale_price)}
                </p>
              </div>

              {hasPermission('product_view_cost') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cost Price
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₦</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={priceForm.cost_price}
                      onChange={(e) => setPriceForm(prev => ({ ...prev, cost_price: e.target.value }))}
                      className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="0.00"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Current: {formatCurrency(selectedProduct.cost_price)}
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reason for Change (Optional)
                </label>
                <textarea
                  value={priceForm.reason}
                  onChange={(e) => setPriceForm(prev => ({ ...prev, reason: e.target.value }))}
                  rows={2}
                  placeholder="Supplier price increase, promotion, etc."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <button
                type="submit"
                disabled={updateMutation.isPending}
                className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors flex items-center justify-center space-x-2"
              >
                {updateMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Updating...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    <span>Update Price</span>
                  </>
                )}
              </button>
            </form>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <DollarSign className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>Select a product to update its price</p>
            </div>
          )}
        </div>
      </div>

      {/* Price History Modal */}
      {showHistoryModal && selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Price History</h2>
                <p className="text-gray-600">{selectedProduct.name} ({selectedProduct.sku})</p>
              </div>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {historyLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              </div>
            ) : historyData?.history?.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <History className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No price history found</p>
              </div>
            ) : (
              <div className="space-y-3">
                {historyData?.history?.map((entry) => (
                  <div key={entry.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        {entry.new_sale_price && (
                          <p className="text-sm">
                            <span className="text-gray-500">Sale Price:</span>{' '}
                            <span className="text-red-600 line-through">
                              {formatCurrency(entry.old_sale_price)}
                            </span>{' '}
                            →{' '}
                            <span className="text-green-600 font-medium">
                              {formatCurrency(entry.new_sale_price)}
                            </span>
                          </p>
                        )}
                        {entry.new_cost_price && (
                          <p className="text-sm">
                            <span className="text-gray-500">Cost Price:</span>{' '}
                            <span className="text-red-600 line-through">
                              {formatCurrency(entry.old_cost_price)}
                            </span>{' '}
                            →{' '}
                            <span className="text-green-600 font-medium">
                              {formatCurrency(entry.new_cost_price)}
                            </span>
                          </p>
                        )}
                        {entry.reason && (
                          <p className="text-xs text-gray-500 italic">
                            "{entry.reason}"
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500">{formatDate(entry.created_at)}</p>
                        <p className="text-xs text-gray-400">by {entry.user?.full_name}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-6 pt-4 border-t border-gray-200">
              <button
                onClick={() => setShowHistoryModal(false)}
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

export default UpdatePrice;

