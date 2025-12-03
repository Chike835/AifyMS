import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { ShoppingBag, Plus, Trash2, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react';

const AddPurchase = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState([
    { product_id: '', quantity: '', unit_cost: '', instance_code: '', purchase_unit_id: '', purchased_quantity: '' }
  ]);

  // Fetch suppliers
  const { data: suppliersData } = useQuery({
    queryKey: ['suppliers'],
    queryFn: async () => {
      const response = await api.get('/suppliers');
      return response.data.suppliers || [];
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

  // Fetch units
  const { data: unitsData } = useQuery({
    queryKey: ['units'],
    queryFn: async () => {
      const response = await api.get('/units');
      return Array.isArray(response.data) ? response.data : (response.data.units || []);
    }
  });

  // Create purchase mutation
  const createMutation = useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/purchases', data);
      return response.data;
    },
    onSuccess: (data) => {
      setFormSuccess(`Purchase ${data.purchase?.purchase_number} created successfully! ${data.inventory_batches_created > 0 ? `${data.inventory_batches_created} inventory batch(es) registered.` : ''}`);
      setFormError('');
      // Reset form after short delay
      setTimeout(() => {
        navigate('/purchases');
      }, 2000);
    },
    onError: (error) => {
      setFormError(error.response?.data?.error || 'Failed to create purchase');
      setFormSuccess('');
    }
  });

  const suppliers = suppliersData || [];
  const products = productsData || [];
  const units = unitsData || [];

  // Get product by ID
  const getProduct = (productId) => {
    return products.find(p => p.id === productId);
  };

  // Check if product is raw_tracked
  const isRawTracked = (productId) => {
    const product = getProduct(productId);
    return product?.type === 'raw_tracked';
  };

  // Add new item row
  const addItem = () => {
    setItems([...items, { product_id: '', quantity: '', unit_cost: '', instance_code: '', purchase_unit_id: '', purchased_quantity: '' }]);
  };

  // Remove item row
  const removeItem = (index) => {
    if (items.length > 1) {
      const newItems = items.filter((_, i) => i !== index);
      setItems(newItems);
    }
  };

  // Get units for a product (all units that can convert to product's base unit)
  const getUnitsForProduct = (productId) => {
    const product = getProduct(productId);
    if (!product || !product.unit_id) return units;
    
    // Return all units, but prioritize the product's base unit
    return units.sort((a, b) => {
      if (a.id === product.unit_id) return -1;
      if (b.id === product.unit_id) return 1;
      return 0;
    });
  };

  // Calculate conversion factor and base quantity
  const calculateConversion = (item) => {
    const product = getProduct(item.product_id);
    if (!product || !item.purchase_unit_id || !item.purchased_quantity) {
      return { baseQuantity: parseFloat(item.quantity) || 0, conversionFactor: 1, purchaseUnit: null };
    }

    const purchaseUnit = units.find(u => u.id === item.purchase_unit_id);
    const baseUnit = units.find(u => u.id === product.unit_id);
    
    if (!purchaseUnit || !baseUnit) {
      return { baseQuantity: parseFloat(item.quantity) || 0, conversionFactor: 1, purchaseUnit };
    }

    // If same unit, no conversion
    if (purchaseUnit.id === baseUnit.id) {
      return { 
        baseQuantity: parseFloat(item.purchased_quantity) || 0, 
        conversionFactor: 1, 
        purchaseUnit 
      };
    }

    // Calculate conversion factor
    let conversionFactor = 1;
    if (purchaseUnit.base_unit_id === baseUnit.id) {
      conversionFactor = parseFloat(purchaseUnit.conversion_factor) || 1;
    } else if (baseUnit.base_unit_id === purchaseUnit.id) {
      conversionFactor = 1 / (parseFloat(baseUnit.conversion_factor) || 1);
    } else if (purchaseUnit.is_base_unit && baseUnit.base_unit_id === purchaseUnit.id) {
      conversionFactor = 1 / (parseFloat(baseUnit.conversion_factor) || 1);
    }

    const baseQuantity = (parseFloat(item.purchased_quantity) || 0) * conversionFactor;
    return { baseQuantity, conversionFactor, purchaseUnit };
  };

  // Update item field
  const updateItem = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;

    // If product changes, reset instance_code if not raw_tracked
    if (field === 'product_id') {
      const product = getProduct(value);
      if (product?.type !== 'raw_tracked') {
        newItems[index].instance_code = '';
      }
      // Auto-populate unit_cost from product cost_price if available
      if (product?.cost_price) {
        newItems[index].unit_cost = parseFloat(product.cost_price).toFixed(2);
      }
      // Reset purchase unit to product's base unit
      if (product?.unit_id) {
        newItems[index].purchase_unit_id = product.unit_id;
      }
    }

    // If purchase_unit_id or purchased_quantity changes, update base quantity
    if (field === 'purchase_unit_id' || field === 'purchased_quantity') {
      const conversion = calculateConversion(newItems[index]);
      newItems[index].quantity = conversion.baseQuantity.toFixed(3);
    }

    setItems(newItems);
  };

  // Calculate item subtotal
  const calculateSubtotal = (item) => {
    const qty = parseFloat(item.quantity) || 0;
    const cost = parseFloat(item.unit_cost) || 0;
    return (qty * cost).toFixed(2);
  };

  // Calculate total amount
  const calculateTotal = () => {
    return items.reduce((sum, item) => {
      return sum + parseFloat(calculateSubtotal(item));
    }, 0).toFixed(2);
  };

  // Validate and submit
  const handleSubmit = (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    // Validate items
    const validItems = items.filter(item => item.product_id && item.quantity && item.unit_cost);
    if (validItems.length === 0) {
      setFormError('At least one valid item is required');
      return;
    }

    // Validate raw_tracked items have instance codes
    for (const item of validItems) {
      const product = getProduct(item.product_id);
      if (product?.type === 'raw_tracked' && !item.instance_code?.trim()) {
        setFormError(`Instance Code (Coil/Pallet Number) is required for "${product.name}"`);
        return;
      }
    }

    // Prepare data
    const purchaseData = {
      supplier_id: supplierId || null,
      notes: notes.trim() || null,
      items: validItems.map(item => {
        const conversion = calculateConversion(item);
        return {
          product_id: item.product_id,
          quantity: conversion.baseQuantity,
          unit_cost: parseFloat(item.unit_cost),
          instance_code: item.instance_code?.trim() || null,
          purchase_unit_id: item.purchase_unit_id || null,
          purchased_quantity: item.purchase_unit_id ? parseFloat(item.purchased_quantity || item.quantity) : null
        };
      })
    };

    createMutation.mutate(purchaseData);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/purchases')}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Add Purchase</h1>
            <p className="text-gray-600 mt-1">Create a new purchase order</p>
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
        {/* Supplier Selection */}
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Supplier Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Supplier (Optional)
              </label>
              <select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Select Supplier</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name} {supplier.phone ? `(${supplier.phone})` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes (Optional)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Purchase notes..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>
        </div>

        {/* Items */}
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Purchase Items</h2>
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
              const isTracked = isRawTracked(item.product_id);

              return (
                <div key={index} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                    {/* Product Selection */}
                    <div className="md:col-span-3">
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
                            {p.name} ({p.sku}) - {p.type}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Purchase Unit */}
                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        Purchase Unit
                      </label>
                      <select
                        value={item.purchase_unit_id || product?.unit_id || ''}
                        onChange={(e) => updateItem(index, 'purchase_unit_id', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                      >
                        <option value="">Select Unit</option>
                        {getUnitsForProduct(item.product_id).map((unit) => (
                          <option key={unit.id} value={unit.id}>
                            {unit.name} ({unit.abbreviation})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Purchased Quantity */}
                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        Purchased Qty *
                      </label>
                      <input
                        type="number"
                        step="0.001"
                        min="0.001"
                        value={item.purchased_quantity || item.quantity}
                        onChange={(e) => updateItem(index, 'purchased_quantity', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                        placeholder="0.00"
                        required
                      />
                    </div>

                    {/* Stored Quantity (Base Unit) - Read-only preview */}
                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        Stored Qty {product?.base_unit ? `(${product.base_unit})` : ''}
                      </label>
                      <div className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-sm text-gray-700">
                        {(() => {
                          const conversion = calculateConversion(item);
                          return conversion.baseQuantity.toFixed(3);
                        })()}
                      </div>
                      {item.purchase_unit_id && item.purchase_unit_id !== product?.unit_id && (
                        <p className="text-xs text-blue-600 mt-1">
                          Conversion: {calculateConversion(item).conversionFactor.toFixed(4)}x
                        </p>
                      )}
                    </div>

                    {/* Unit Cost */}
                    <div className="md:col-span-1">
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        Unit Cost *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.unit_cost}
                        onChange={(e) => updateItem(index, 'unit_cost', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                        placeholder="0.00"
                        required
                      />
                    </div>

                    {/* Instance Code (for raw_tracked) */}
                    <div className="md:col-span-1">
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        {isTracked ? 'Coil/Pallet # *' : 'Instance Code'}
                      </label>
                      <input
                        type="text"
                        value={item.instance_code}
                        onChange={(e) => updateItem(index, 'instance_code', e.target.value)}
                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm ${
                          isTracked 
                            ? 'border-orange-300 bg-orange-50' 
                            : 'border-gray-300 bg-gray-100'
                        }`}
                        placeholder={isTracked ? 'COIL-001' : 'N/A'}
                        disabled={!isTracked}
                        required={isTracked}
                      />
                      {isTracked && (
                        <p className="text-xs text-orange-600 mt-1">Required for inventory tracking</p>
                      )}
                    </div>

                    {/* Subtotal & Delete */}
                    <div className="md:col-span-1 flex items-end justify-between">
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

                  {/* Product Type Indicator */}
                  {product && (
                    <div className="mt-2 flex items-center space-x-2">
                      <span className={`px-2 py-0.5 text-xs rounded-full ${
                        product.type === 'raw_tracked'
                          ? 'bg-orange-100 text-orange-700'
                          : product.type === 'manufactured_virtual'
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {product.type}
                      </span>
                      {product.type === 'raw_tracked' && (
                        <span className="text-xs text-gray-500">
                          → Will create inventory instance automatically
                        </span>
                      )}
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
              <p className="font-medium">Inventory Integration</p>
              <p className="mt-1">
                When purchasing <strong>raw_tracked</strong> products (e.g., coils, pallets), 
                a unique Instance Code is required. The system will automatically create an 
                inventory instance for each item, making it available for sales and production.
              </p>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => navigate('/purchases')}
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
                <ShoppingBag className="h-4 w-4" />
                <span>Create Purchase</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddPurchase;

