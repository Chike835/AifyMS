import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { ClipboardList, Plus, Trash2, AlertCircle, CheckCircle, ArrowLeft, Package } from 'lucide-react';
import CoilSelectorModal from '../components/pos/CoilSelectorModal';
import Decimal from 'decimal.js';

const AddSale = () => {
  const navigate = useNavigate();
  const { user, hasPermission } = useAuth();
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [orderType, setOrderType] = useState('invoice');
  const [validUntil, setValidUntil] = useState('');
  const [quotationNotes, setQuotationNotes] = useState('');
  const [items, setItems] = useState([
    { product_id: '', quantity: '', unit_price: '', item_assignments: [] }
  ]);

  // Coil selection modal state
  const [showCoilModal, setShowCoilModal] = useState(false);
  const [currentItemIndex, setCurrentItemIndex] = useState(null);
  const [currentProduct, setCurrentProduct] = useState(null);
  const [currentQuantity, setCurrentQuantity] = useState(0);

  // Fetch customers
  const { data: customersData } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const response = await api.get('/customers');
      return response.data.customers || [];
    }
  });

  // Fetch products
  const { data: productsData } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const response = await api.get('/products');
      return response.data.products || [];
    }
  });

  // Fetch recipes for manufactured products
  const { data: recipesData } = useQuery({
    queryKey: ['recipes'],
    queryFn: async () => {
      const response = await api.get('/recipes');
      return response.data.recipes || [];
    }
  });

  // Create sale mutation
  const createMutation = useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/sales', data);
      return response.data;
    },
    onSuccess: (data) => {
      setFormSuccess(`Sale ${data.order?.invoice_number} created successfully!`);
      setFormError('');
      setTimeout(() => {
        navigate('/sales');
      }, 2000);
    },
    onError: (error) => {
      setFormError(error.response?.data?.error || 'Failed to create sale');
      setFormSuccess('');
    }
  });

  const customers = customersData || [];
  const products = productsData || [];
  const recipes = recipesData || [];

  // Get product by ID
  const getProduct = (productId) => {
    return products.find(p => p.id === productId);
  };

  // Get recipe for a manufactured_virtual product
  const getRecipe = (productId) => {
    return recipes.find(r => r.virtual_product_id === productId);
  };

  // Check if product is manufactured_virtual
  const isManufactured = (productId) => {
    const product = getProduct(productId);
    return product?.type === 'manufactured_virtual';
  };

  // Calculate required raw material for a manufactured product
  const calculateRequiredRawMaterial = (productId, quantity) => {
    const recipe = getRecipe(productId);
    if (!recipe) return 0;
    return new Decimal(quantity || 0).times(new Decimal(recipe.conversion_factor || 0)).toNumber();
  };

  // Add new item row
  const addItem = () => {
    setItems([...items, { product_id: '', quantity: '', unit_price: '', item_assignments: [] }]);
  };

  // Remove item row
  const removeItem = (index) => {
    if (items.length > 1) {
      const newItems = items.filter((_, i) => i !== index);
      setItems(newItems);
    }
  };

  // Update item field
  const updateItem = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;

    // If product changes, reset assignments and set default price
    if (field === 'product_id') {
      newItems[index].item_assignments = [];
      const product = getProduct(value);
      if (product?.sale_price) {
        newItems[index].unit_price = parseFloat(product.sale_price).toFixed(2);
      }
    }

    // If quantity changes for manufactured product, clear assignments (need re-selection)
    if (field === 'quantity' && isManufactured(newItems[index].product_id)) {
      newItems[index].item_assignments = [];
    }

    setItems(newItems);
  };

  // Open coil selector modal
  const openCoilSelector = (index) => {
    const item = items[index];
    if (!item.quantity || parseFloat(item.quantity) <= 0) {
      setFormError('Please enter quantity first');
      return;
    }

    const product = getProduct(item.product_id);
    setCurrentItemIndex(index);
    setCurrentProduct(product);
    setCurrentQuantity(parseFloat(item.quantity));
    setShowCoilModal(true);
  };

  // Handle coil selection from modal
  const handleCoilSelection = (assignments) => {
    if (currentItemIndex === null) return;

    const newItems = [...items];
    newItems[currentItemIndex].item_assignments = assignments;
    setItems(newItems);
    setShowCoilModal(false);
    setCurrentItemIndex(null);
  };

  // Calculate item subtotal
  const calculateSubtotal = (item) => {
    const qty = new Decimal(item.quantity || 0);
    const price = new Decimal(item.unit_price || 0);
    return qty.times(price).toFixed(2);
  };

  // Calculate total amount
  const calculateTotal = () => {
    return items.reduce((sum, item) => {
      return sum.plus(new Decimal(calculateSubtotal(item)));
    }, new Decimal(0)).toFixed(2);
  };

  // Check if all manufactured items have assignments
  const allManufacturedItemsHaveAssignments = () => {
    for (const item of items) {
      if (item.product_id && isManufactured(item.product_id) && item.quantity) {
        const required = new Decimal(calculateRequiredRawMaterial(item.product_id, item.quantity));
        const assigned = item.item_assignments.reduce((sum, a) =>
          sum.plus(new Decimal(a.quantity_deducted || 0)), new Decimal(0)
        );
        if (assigned.minus(required).abs().greaterThan(0.001)) {
          return false;
        }
      }
    }
    return true;
  };

  // Validate and submit
  const handleSubmit = (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    // Validate items
    const validItems = items.filter(item => item.product_id && item.quantity && item.unit_price);
    if (validItems.length === 0) {
      setFormError('At least one valid item is required');
      return;
    }

    // Validate manufactured items have coil assignments
    if (!allManufacturedItemsHaveAssignments()) {
      setFormError('Please select coils for all manufactured products');
      return;
    }

    // Validate quotation fields
    if (orderType === 'quotation' && !validUntil) {
      setFormError('Valid Until date is required for quotations');
      return;
    }

    // Prepare data
    const saleData = {
      customer_id: customerId || null,
      order_type: orderType,
      valid_until: orderType === 'quotation' ? validUntil : null,
      quotation_notes: orderType === 'quotation' ? quotationNotes : null,
      payment_status: orderType === 'draft' ? 'unpaid' : 'unpaid',
      items: validItems.map(item => ({
        product_id: item.product_id,
        quantity: new Decimal(item.quantity).toNumber(),
        unit_price: new Decimal(item.unit_price).toNumber(),
        item_assignments: isManufactured(item.product_id) ? item.item_assignments : undefined
      }))
    };

    createMutation.mutate(saleData);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/sales')}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">New Sale</h1>
            <p className="text-gray-600 mt-1">Create a new sales order, quotation, or draft</p>
          </div>
        </div>
      </div>

      {/* Success Message */}
      {formSuccess && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start space-x-3">
          <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
          <div className="text-green-700">{formSuccess}</div>
        </div>
      )}

      {/* Error Message */}
      {formError && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-3">
          <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
          <div className="text-red-700">{formError}</div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Order Type & Customer */}
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Order Type *
              </label>
              <select
                value={orderType}
                onChange={(e) => setOrderType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
              >
                <option value="invoice">Invoice</option>
                {hasPermission('quote_manage') && (
                  <option value="quotation">Quotation</option>
                )}
                {hasPermission('draft_manage') && (
                  <option value="draft">Draft</option>
                )}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Customer (Optional)
              </label>
              <select
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Walk-in Customer</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name} {customer.phone ? `(${customer.phone})` : ''}
                  </option>
                ))}
              </select>
            </div>
            {orderType === 'quotation' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Valid Until *
                  </label>
                  <input
                    type="date"
                    value={validUntil}
                    onChange={(e) => setValidUntil(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    required={orderType === 'quotation'}
                  />
                </div>
              </>
            )}
          </div>
          {orderType === 'quotation' && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Quotation Notes
              </label>
              <textarea
                value={quotationNotes}
                onChange={(e) => setQuotationNotes(e.target.value)}
                rows={2}
                placeholder="Terms, conditions, or special notes..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          )}
        </div>

        {/* Items */}
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Order Items</h2>
            <button
              type="button"
              onClick={addItem}
              className="flex items-center space-x-1 px-3 py-1.5 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Add Item</span>
            </button>
          </div>

          <div className="space-y-4">
            {items.map((item, index) => {
              const product = getProduct(item.product_id);
              const isManuf = isManufactured(item.product_id);
              const recipe = isManuf ? getRecipe(item.product_id) : null;
              const requiredRaw = isManuf && item.quantity ? calculateRequiredRawMaterial(item.product_id, item.quantity) : 0;
              const assignedTotal = item.item_assignments.reduce((sum, a) => sum + parseFloat(a.quantity_deducted || 0), 0);
              const hasValidAssignments = isManuf ? Math.abs(assignedTotal - requiredRaw) < 0.001 : true;

              return (
                <div key={index} className={`p-4 rounded-lg border ${isManuf && !hasValidAssignments ? 'bg-orange-50 border-orange-200' : 'bg-gray-50 border-gray-200'}`}>
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                    {/* Product Selection */}
                    <div className="md:col-span-4">
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        Product *
                      </label>
                      <select
                        value={item.product_id}
                        onChange={(e) => updateItem(index, 'product_id', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                        required
                      >
                        <option value="">Select Product</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.sku})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Quantity */}
                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        Quantity * {product?.base_unit ? `(${product.base_unit})` : ''}
                      </label>
                      <input
                        type="number"
                        step="0.001"
                        min="0.001"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                        placeholder="0.00"
                        required
                      />
                    </div>

                    {/* Unit Price */}
                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        Unit Price *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.unit_price}
                        onChange={(e) => updateItem(index, 'unit_price', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                        placeholder="0.00"
                        required
                        disabled={!hasPermission('sale_edit_price') && product?.sale_price}
                      />
                    </div>

                    {/* Coil Selection (for manufactured) */}
                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        {isManuf ? 'Coil Selection *' : 'Material'}
                      </label>
                      {isManuf ? (
                        <button
                          type="button"
                          onClick={() => openCoilSelector(index)}
                          className={`w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors ${hasValidAssignments
                            ? 'bg-green-100 text-green-700 border border-green-300'
                            : 'bg-orange-100 text-orange-700 border border-orange-300 hover:bg-orange-200'
                            }`}
                        >
                          {hasValidAssignments ? (
                            <span className="flex items-center justify-center space-x-1">
                              <CheckCircle className="h-4 w-4" />
                              <span>{item.item_assignments.length} coil(s)</span>
                            </span>
                          ) : (
                            <span className="flex items-center justify-center space-x-1">
                              <Package className="h-4 w-4" />
                              <span>Select Coils</span>
                            </span>
                          )}
                        </button>
                      ) : (
                        <div className="px-3 py-2 bg-gray-100 rounded-lg text-sm text-gray-500">
                          N/A
                        </div>
                      )}
                    </div>

                    {/* Subtotal & Delete */}
                    <div className="md:col-span-2 flex items-end justify-between">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">
                          Subtotal
                        </label>
                        <div className="px-3 py-2 bg-gray-100 rounded-lg text-sm font-medium text-gray-900">
                          ₦{calculateSubtotal(item)}
                        </div>
                      </div>
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                          title="Remove item"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Product Info & Requirements */}
                  {product && (
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className={`px-2 py-0.5 text-xs rounded-full ${product.type === 'raw_tracked'
                        ? 'bg-orange-100 text-orange-700'
                        : product.type === 'manufactured_virtual'
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-gray-100 text-gray-700'
                        }`}>
                        {product.type}
                      </span>
                      {isManuf && recipe && item.quantity && (
                        <span className="text-xs text-gray-500">
                          Requires: {requiredRaw.toFixed(3)} {recipe.raw_product?.base_unit || 'KG'} of raw material
                          {assignedTotal > 0 && (
                            <span className={assignedTotal >= requiredRaw ? 'text-green-600' : 'text-orange-600'}>
                              {' '}(Selected: {assignedTotal.toFixed(3)})
                            </span>
                          )}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Coil Assignment Details */}
                  {isManuf && item.item_assignments.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {item.item_assignments.map((assignment, aIdx) => {
                        return (
                          <span key={aIdx} className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded">
                            {assignment.instance_code}: {parseFloat(assignment.quantity_deducted).toFixed(3)}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Total */}
          <div className="mt-6 pt-4 border-t border-gray-200 flex justify-end">
            <div className="text-right">
              <p className="text-sm text-gray-500">Total Amount</p>
              <p className="text-2xl font-bold text-gray-900">₦{calculateTotal()}</p>
            </div>
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <AlertCircle className="h-5 w-5 text-blue-500 mt-0.5" />
            <div className="text-sm text-blue-700">
              <p className="font-medium">Order Types</p>
              <ul className="mt-1 space-y-1">
                <li><strong>Invoice:</strong> Creates a confirmed sales order with inventory deduction.</li>
                <li><strong>Quotation:</strong> Creates a price quote for customer review (no inventory impact).</li>
                <li><strong>Draft:</strong> Saves the order for later completion (no inventory impact).</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => navigate('/sales')}
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
          >
            {createMutation.isPending ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Creating...</span>
              </>
            ) : (
              <>
                <ClipboardList className="h-4 w-4" />
                <span>
                  {orderType === 'invoice' ? 'Create Invoice' :
                    orderType === 'quotation' ? 'Create Quotation' : 'Save Draft'}
                </span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Coil Selector Modal */}
      <CoilSelectorModal
        isOpen={showCoilModal && currentProduct !== null}
        product={currentProduct}
        quantity={currentQuantity}
        onConfirm={handleCoilSelection}
        onClose={() => {
          setShowCoilModal(false);
          setCurrentItemIndex(null);
          setCurrentProduct(null);
        }}
      />
    </div>
  );
};

export default AddSale;

