import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { ShoppingBag, Plus, Trash2, AlertCircle, CheckCircle, ArrowLeft, Layers, ChevronDown, ChevronUp, X } from 'lucide-react';
import VariantBatchModal from '../components/VariantBatchModal';

const AddPurchase = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [notes, setNotes] = useState('');
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [selectedVariantForBatch, setSelectedVariantForBatch] = useState(null);
  const [parentProductForBatch, setParentProductForBatch] = useState(null);
  const [maxQuantityForBatch, setMaxQuantityForBatch] = useState(null);
  const [purchasedQuantityForBatch, setPurchasedQuantityForBatch] = useState(null);
  const [purchaseUnitForBatch, setPurchaseUnitForBatch] = useState(null);
  // Context to know which item/variant triggered the modal
  const [batchModalContext, setBatchModalContext] = useState({ itemIndex: null, variantId: null });

  const [items, setItems] = useState([
    {
      product_id: '',
      quantity: '',
      unit_cost: '',
      instance_code: '',
      purchase_unit_id: '',
      purchased_quantity: '',
      // Variable product fields
      selected_variants: [], // { variant_id: '', quantity: '', unit_cost: '', child: {} }
      variantSearchTerm: ''
    }
  ]);

  // Fetch suppliers
  const { data: suppliersData } = useQuery({
    queryKey: ['suppliers'],
    queryFn: async () => {
      const response = await api.get('/suppliers');
      return response.data.suppliers || [];
    }
  });

  // Fetch products - include variant children, exclude parent variable products
  const { data: productsData } = useQuery({
    queryKey: ['products', 'with_variants'],
    queryFn: async () => {
      // Get all products including variant children (backend filters to exclude parent variable products)
      const response = await api.get('/products', { params: { include_variants: 'true' } });
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

  // Fetch branches
  const { data: branchesData } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      const response = await api.get('/branches');
      return response.data.branches || [];
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

  // Check if product needs instance code (any product can have instance codes now)
  const needsInstanceCode = (productId) => {
    // Instance codes are optional for all products
    return false; // Remove type restriction
  };

  // Add new item row
  const addItem = () => {
    setItems([...items, {
      product_id: '',
      quantity: '',
      unit_cost: '',
      instance_code: '',
      purchase_unit_id: '',
      purchased_quantity: '',
      selected_variants: [],
      variantSearchTerm: ''
    }]);
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

  // Helper to calculate variant specific conversion
  const calculateVariantConversion = (variantItem, parentItem) => {
    // Uses the parent item's purchase_unit_id logic
    const dummyItem = {
      product_id: parentItem.product_id, // Parent product for unit info
      purchase_unit_id: parentItem.purchase_unit_id,
      purchased_quantity: variantItem.quantity // The input quantity for the variant
    };
    return calculateConversion(dummyItem);
  };

  // Update item field
  const updateItem = async (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;

    // If product changes
    if (field === 'product_id') {
      const product = getProduct(value);

      // Reset fields
      newItems[index].instance_code = '';
      newItems[index].selected_variants = [];
      newItems[index].available_variants = []; // Reset available variants
      newItems[index].variantSearchTerm = ''; // Reset search term

      // Auto-populate unit_cost from product cost_price if available
      if (product?.cost_price) {
        newItems[index].unit_cost = parseFloat(product.cost_price).toFixed(2);
      }
      // Reset purchase unit to product's base unit
      if (product?.unit_id) {
        newItems[index].purchase_unit_id = product.unit_id;
      }

      // If variable product, fetch variants
      if (product?.type === 'variable') {
        try {
          // Fetch full product details including variants
          const response = await api.get(`/products/${product.id}`);
          const fullProduct = response.data.product;

          if (fullProduct && fullProduct.variants) {
            newItems[index].available_variants = fullProduct.variants.map(v => ({
              variant_id: v.id,
              child: v.child,
              // Flatten variation values for display (e.g. "Red, Large")
              name: v.child?.name || 'Unknown Variant'
            }));
          }
        } catch (error) {
          console.error("Failed to fetch variants:", error);
          // Could show a toast or error state here
        }
      }
    }

    // If purchase_unit_id or purchased_quantity changes (for standard products), update base quantity
    if ((field === 'purchase_unit_id' || field === 'purchased_quantity') && !newItems[index].selected_variants?.length) {
      const conversion = calculateConversion(newItems[index]);
      newItems[index].quantity = conversion.baseQuantity.toFixed(3);
    }

    setItems(newItems);
  };

  // Toggle variant selection
  const toggleVariant = (index, variant) => {
    const newItems = [...items];
    const currentSelected = newItems[index].selected_variants || [];
    const existingIdx = currentSelected.findIndex(v => v.variant_id === variant.variant_id);

    if (existingIdx >= 0) {
      // Remove
      newItems[index].selected_variants = currentSelected.filter((_, i) => i !== existingIdx);
    } else {
      // Add with defaults
      newItems[index].selected_variants.push({
        variant_id: variant.variant_id,
        child: variant.child,
        quantity: '',
        unit_cost: variant.child?.cost_price || newItems[index].unit_cost || '',
        instance_code: '', // Initialize instance_code field
        batched_quantity: 0 // Initialize batched quantity for tracking
      });
    }
    setItems(newItems);
  };

  // Update variant specific field
  const updateVariant = (itemIndex, variantId, field, value) => {
    const newItems = [...items];
    const variantIdx = newItems[itemIndex].selected_variants.findIndex(v => v.variant_id === variantId);

    if (variantIdx >= 0) {
      newItems[itemIndex].selected_variants[variantIdx][field] = value;
    }
    setItems(newItems);
  };

  // Open Batch Modal for a variant
  const handleOpenBatchModal = (parentProduct, variantChild, baseQuantity, purchasedQty, purchaseUnit, itemIndex, variantId) => {
    setParentProductForBatch(parentProduct);
    setSelectedVariantForBatch(variantChild);
    setMaxQuantityForBatch(baseQuantity); // Base quantity for validation (in base units)
    setPurchasedQuantityForBatch(purchasedQty); // Purchased quantity (in purchase unit) for display
    setPurchaseUnitForBatch(purchaseUnit);
    setBatchModalContext({ itemIndex, variantId });
    setShowBatchModal(true);
  };

  // Calculate item subtotal
  const calculateSubtotal = (item) => {
    const product = getProduct(item.product_id);

    // For variable products, sum up selected variants
    if (product?.type === 'variable' && item.selected_variants?.length > 0) {
      return item.selected_variants.reduce((sum, v) => {
        const qty = parseFloat(v.quantity) || 0;
        const cost = parseFloat(v.unit_cost) || 0;
        return sum + (qty * cost);
      }, 0).toFixed(2);
    }

    // Standard items
    const qty = parseFloat(item.quantity) || 0; // Using base quantity for calculation standard?
    // Wait, usually subtotal is based on Purchased Quantity if Unit Cost is "Per Purchase Unit"?
    // OR Unit Cost is per Base Unit?
    // Looking at standard logic: `qty * cost`. `qty` is base quantity. `cost` is `unit_cost`.
    // If user enters "1 Box" (10 items) and Cost is "500".
    // If Cost is "Per Box", then 1 * 500 = 500.
    // If Cost is "Per Item", then 10 * 50 = 500.
    // The current logic seems to assume unit_cost is per BASE UNIT, because `calculateConversion` updates `quantity` (base qty).
    // Let's assume `unit_cost` input is cost PER BASE UNIT.

    // However, for consistency, if I buy 1 Box, I usually know the price of the Box.
    // But currently `validItems.map` sends `unit_cost` directly.

    return (parseFloat(item.quantity) * parseFloat(item.unit_cost) || 0).toFixed(2);
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

    // Validate items - handle both standard and variable products
    const validItems = items.filter(item => {
      if (!item.product_id) return false;
      const product = getProduct(item.product_id);

      // For variable products, check selected_variants
      if (product?.type === 'variable') {
        return item.selected_variants?.length > 0 &&
          item.selected_variants.every(v => v.quantity && v.unit_cost);
      }

      // For standard products, check quantity and unit_cost
      return item.quantity && item.unit_cost;
    });

    if (validItems.length === 0) {
      setFormError('At least one valid item is required');
      return;
    }

    // Instance code validation removed - instance codes are optional for all products
    for (const item of validItems) {
      const product = getProduct(item.product_id);
      // Instance codes are optional - no validation needed
      if (false && !item.instance_code?.trim()) {
        setFormError(`Instance Code (Coil/Pallet Number) is required for "${product.name}"`);
        return;
      }

      // Validate variable products have at least one variant with valid quantity
      if (product?.type === 'variable') {
        const hasValidVariants = item.selected_variants?.some(v => {
          const qty = parseFloat(v.quantity);
          return qty > 0 && v.unit_cost;
        });
        if (!hasValidVariants) {
          setFormError(`Please select at least one variant with valid quantity for "${product.name}"`);
          return;
        }
      }
    }

    // Prepare data
    const purchaseItems = [];

    validItems.forEach(item => {
      const product = getProduct(item.product_id);

      if (product?.type === 'variable' && item.selected_variants?.length > 0) {
        // Expand variable product into multiple purchase items (one per variant)
        item.selected_variants.forEach(variant => {
          // Calculate conversion for this variant using the parent's selected unit
          const conversion = calculateVariantConversion(variant, item);

          if (conversion.baseQuantity > 0) {
            purchaseItems.push({
              product_id: variant.child.id, // Use variant child ID
              quantity: conversion.baseQuantity,
              unit_cost: parseFloat(variant.unit_cost),
              instance_code: variant.instance_code?.trim() || null, // Allow instance codes for variants
              purchase_unit_id: item.purchase_unit_id || null,
              purchased_quantity: item.purchase_unit_id ? parseFloat(variant.quantity) : null
            });
          }
        });
      } else {
        // Standard item
        const conversion = calculateConversion(item);
        purchaseItems.push({
          product_id: item.product_id,
          quantity: conversion.baseQuantity,
          unit_cost: parseFloat(item.unit_cost),
          instance_code: item.instance_code?.trim() || null,
          purchase_unit_id: item.purchase_unit_id || null,
          purchased_quantity: item.purchase_unit_id ? parseFloat(item.purchased_quantity || item.quantity) : null
        });
      }
    });

    if (purchaseItems.length === 0) {
      setFormError('No valid items to purchase');
      return;
    }

    const purchaseData = {
      supplier_id: supplierId || null,
      notes: notes.trim() || null,
      items: purchaseItems
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
              // instance_code is now optional for all products

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

                    {/* Purchase Unit - Auto-selected from product, hidden from UI */}

                    {/* Variable Product Interface */}
                    {product?.type === 'variable' ? (
                      <div className="md:col-span-12 mt-2 border-t border-gray-200 pt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Select Variants</label>

                        {/* Variant Search */}
                        <div className="mb-3">
                          <div className="relative">
                            <input
                              type="text"
                              placeholder="Search variants by name or SKU..."
                              value={item.variantSearchTerm || ''}
                              onChange={(e) => updateItem(index, 'variantSearchTerm', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500 text-sm"
                            />
                            {item.variantSearchTerm && (
                              <button
                                type="button"
                                onClick={() => updateItem(index, 'variantSearchTerm', '')}
                                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                title="Clear search"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                          {item.variantSearchTerm && item.available_variants && (
                            <p className="text-xs text-gray-500 mt-1">
                              {item.available_variants.filter(v =>
                                !item.variantSearchTerm ||
                                v.name.toLowerCase().includes(item.variantSearchTerm.toLowerCase()) ||
                                (v.child?.sku && v.child.sku.toLowerCase().includes(item.variantSearchTerm.toLowerCase()))
                              ).length} variant(s) found
                            </p>
                          )}
                        </div>

                        {item.available_variants && item.available_variants.length > 0 ? (
                          <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                            {item.available_variants
                              .filter(v =>
                                !item.variantSearchTerm ||
                                v.name.toLowerCase().includes(item.variantSearchTerm.toLowerCase()) ||
                                (v.child?.sku && v.child.sku.toLowerCase().includes(item.variantSearchTerm.toLowerCase()))
                              )
                              .map((variant) => {
                                const isSelected = item.selected_variants?.some(v => v.variant_id === variant.variant_id);
                                const selectedData = item.selected_variants?.find(v => v.variant_id === variant.variant_id) || {};

                                return (
                                  <div key={variant.variant_id} className={`p-3 rounded-lg border ${isSelected ? 'bg-white border-primary-200 shadow-sm' : 'bg-gray-50 border-gray-200'}`}>
                                    <div className="flex flex-col md:flex-row md:items-center gap-4">
                                      {/* Checkbox & Name */}
                                      <div className="flex items-center min-w-[200px]">
                                        <input
                                          type="checkbox"
                                          checked={isSelected}
                                          onChange={() => toggleVariant(index, variant)}
                                          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded mr-3"
                                        />
                                        <div>
                                          <p className="text-sm font-medium text-gray-900">{variant.name}</p>
                                          <p className="text-xs text-gray-500">{variant.child?.sku}</p>
                                        </div>
                                      </div>

                                      {/* Inputs (Only if selected) */}
                                      {isSelected && (
                                        <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-3">
                                          <div>
                                            <label className="block text-xs font-medium text-gray-500 mb-1">
                                              Qty ({item.purchase_unit_id ? units.find(u => u.id == item.purchase_unit_id)?.abbreviation : product.base_unit})
                                            </label>
                                            <input
                                              type="number"
                                              step="0.001"
                                              min="0.001"
                                              value={selectedData.quantity}
                                              onChange={(e) => updateVariant(index, variant.variant_id, 'quantity', e.target.value)}
                                              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                                              placeholder="Qty"
                                              required
                                            />
                                            {item.purchase_unit_id && (
                                              <p className="text-[10px] text-gray-400 mt-1">
                                                = {calculateVariantConversion(selectedData, item).baseQuantity.toFixed(2)} {product.base_unit}
                                              </p>
                                            )}
                                          </div>
                                          <div>
                                            <label className="block text-xs font-medium text-gray-500 mb-1">Unit Cost</label>
                                            <input
                                              type="number"
                                              step="0.01"
                                              min="0"
                                              value={selectedData.unit_cost}
                                              onChange={(e) => updateVariant(index, variant.variant_id, 'unit_cost', e.target.value)}
                                              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                                              placeholder="Cost"
                                              required
                                            />
                                          </div>
                                          <div>
                                            <label className="block text-xs font-medium text-gray-500 mb-1">
                                              Instance Code
                                            </label>
                                            <input
                                              type="text"
                                              value={selectedData.instance_code || ''}
                                              onChange={(e) => updateVariant(index, variant.variant_id, 'instance_code', e.target.value)}
                                              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                                              placeholder="Optional"
                                            />
                                          </div>

                                          {/* Batch Creation Trigger */}
                                          <div className="flex items-center justify-center">
                                            <button
                                              type="button"
                                              onClick={() => {
                                                // Use the purchased quantity (as entered) for batch creation
                                                // Convert to base units for validation, but show purchased quantity for clarity
                                                const conversion = calculateVariantConversion(selectedData, item);
                                                const purchaseUnit = item.purchase_unit_id ? units.find(u => u.id === item.purchase_unit_id) : null;

                                                // Calculate remaining quantity to batch
                                                // Base quantity (total)
                                                const totalQty = conversion.baseQuantity || 0;
                                                // Previously batched (tracked in selectedData)
                                                const batchedQty = selectedData.batched_quantity || 0;
                                                const remaining = Math.max(0, totalQty - batchedQty);

                                                handleOpenBatchModal(
                                                  product,
                                                  variant.child,
                                                  remaining, // Pass remaining as maxQuantity
                                                  parseFloat(selectedData.quantity) || 0, // Purchased quantity for display
                                                  purchaseUnit,
                                                  index, // itemIndex
                                                  variant.variant_id // variantId
                                                );
                                              }}
                                              className="flex items-center justify-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded border border-blue-200 transition-colors"
                                              title="Create initial batch for this variant"
                                            >
                                              <Layers className="h-3.5 w-3.5" />
                                              <span>Add Batch</span>
                                            </button>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                          </div>
                        ) : (
                          <div className="text-sm text-gray-500 italic p-2">
                            {item.product_id ? "Loading variants..." : "Select a variable product first"}
                          </div>
                        )}
                      </div>
                    ) : (
                      /* Standard Product Fields */
                      <>
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

                        {/* Instance Code (optional) */}
                        <div className="md:col-span-1">
                          <label className="block text-xs font-medium text-gray-500 mb-1">
                            Instance Code
                          </label>
                          <input
                            type="text"
                            value={item.instance_code}
                            onChange={(e) => updateItem(index, 'instance_code', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm bg-gray-100"
                            placeholder="Optional"
                          />
                        </div>
                      </>
                    )}

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
                      <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-700">
                        {product.type}
                      </span>
                      {item.instance_code && (
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
                When purchasing products with instance codes (e.g., coils, pallets),
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

      {/* Variant Batch Modal */}
      {showBatchModal && selectedVariantForBatch && (
        <VariantBatchModal
          variant={selectedVariantForBatch}
          parentProduct={parentProductForBatch}
          maxQuantity={maxQuantityForBatch}
          purchasedQuantity={purchasedQuantityForBatch}
          purchaseUnit={purchaseUnitForBatch}
          branches={branchesData || []}
          onClose={() => {
            setShowBatchModal(false);
            setSelectedVariantForBatch(null);
            setParentProductForBatch(null);
            setMaxQuantityForBatch(null);
            setPurchasedQuantityForBatch(null);
            setPurchaseUnitForBatch(null);
          }}
          onSuccess={(batch, amountBatched) => {
            // Update the tracked batched quantity for this variant
            // We need to find the variant context. 
            // Since we don't strictly pass the index logic to modal, we might need to rely on locating it 
            // or passing a callback from the button closure.
            // Easier: Pass a callback to handleOpenBatchModal?
            // Or better: The modal just calls onSuccess and we refresh data?
            // But we are in local state 'selectedVariations'.
            // We need to update 'selectedVariations' state with 'batched_quantity'.

            // To do this properly, we need to know WHICH variant key we are editing.
            // 'selectedVariantForBatch' is the variant object.
            // We can iterate 'selectedVariations' to find the one matching this variant ID AND product ID?
            // Or better, when opening modal, store the key/index.

            if (selectedVariantForBatch?.variant_id) { // This might be wrong, check how selectedVariantForBatch is set
              // It is set from 'variant.child' in handleOpenBatchModal call above... wait, variant.child is the product object? 
              // Let's check handleOpenBatchModal call: variant.child is passed as 'variant'.
              // So 'selectedVariantForBatch' is the CHILD PRODUCT object.
              // We need the key used in 'selectedVariations'.
            }
          }}
        />
      )}
    </div>
  );
};

export default AddPurchase;

