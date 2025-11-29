import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronUp, ChevronDown, Plus, ImageIcon, X } from 'lucide-react';
import api from '../utils/api';

// Toggle Switch Component
const Toggle = ({ checked, onChange, label }) => (
  <label className="inline-flex items-center cursor-pointer">
    <div className="relative">
      <input
        type="checkbox"
        className="sr-only"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <div
        className={`w-11 h-6 rounded-full transition-colors ${
          checked ? 'bg-primary-600' : 'bg-gray-300'
        }`}
      />
      <div
        className={`absolute left-0.5 top-0.5 bg-white w-5 h-5 rounded-full transition-transform shadow ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </div>
    {label && <span className="ml-2 text-sm text-gray-700">{label}</span>}
  </label>
);

// Collapsible Section Component
const CollapsibleSection = ({ title, children, defaultOpen = true, titleColor = 'text-primary-600' }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-6 py-4 bg-gray-50 border-b border-gray-200 hover:bg-gray-100 transition-colors"
      >
        <h3 className={`font-semibold ${titleColor}`}>{title}</h3>
        {isOpen ? (
          <ChevronUp className="h-5 w-5 text-gray-500" />
        ) : (
          <ChevronDown className="h-5 w-5 text-gray-500" />
        )}
      </button>
      {isOpen && <div className="p-6">{children}</div>}
    </div>
  );
};

// Form Input Component
const FormInput = ({ label, required, type = 'text', placeholder, value, onChange, className = '' }) => (
  <div className={className}>
    <label className="block text-sm font-medium text-gray-700 mb-1">
      {label}{required && <span className="text-red-500">*</span>}
    </label>
    <input
      type={type}
      placeholder={placeholder || label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
    />
  </div>
);

// Form Select Component
const FormSelect = ({ label, required, options, value, onChange, placeholder, onAdd, className = '' }) => (
  <div className={className}>
    <label className="block text-sm font-medium text-gray-700 mb-1">
      {label}{required && <span className="text-red-500">*</span>}
    </label>
    <div className="flex gap-2">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm bg-white"
      >
        <option value="">{placeholder || `Please Select`}</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {onAdd && (
        <button
          type="button"
          onClick={onAdd}
          className="px-3 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
        </button>
      )}
    </div>
  </div>
);

// Multi-Select Tags Component
const MultiSelectTags = ({ label, options, selectedIds, onChange }) => {
  const handleToggle = (id) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((i) => i !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const selectedOptions = options.filter((opt) => selectedIds.includes(opt.value));

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <div className="min-h-[42px] px-3 py-2 border border-gray-300 rounded-md bg-white flex flex-wrap gap-2 items-center">
        {selectedOptions.length === 0 ? (
          <span className="text-gray-400 text-sm">Click to select locations...</span>
        ) : (
          selectedOptions.map((opt) => (
            <span
              key={opt.value}
              className="inline-flex items-center gap-1 px-2 py-1 bg-primary-600 text-white text-xs rounded-md"
            >
              <X className="h-3 w-3 cursor-pointer" onClick={() => handleToggle(opt.value)} />
              {opt.label}
            </span>
          ))
        )}
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {options
          .filter((opt) => !selectedIds.includes(opt.value))
          .map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => handleToggle(opt.value)}
              className="px-2 py-1 border border-gray-300 text-gray-600 text-xs rounded-md hover:bg-gray-100 transition-colors"
            >
              + {opt.label}
            </button>
          ))}
      </div>
    </div>
  );
};

// Product Types mapping
const productTypes = [
  { value: 'standard', label: 'Single' },
  { value: 'compound', label: 'Combo' },
  { value: 'raw_tracked', label: 'Raw (Tracked)' },
  { value: 'manufactured_virtual', label: 'Manufactured' }
];

const sellingPriceTaxTypes = [
  { value: 'exclusive', label: 'Exclusive' },
  { value: 'inclusive', label: 'Inclusive' }
];

const AddProduct = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Page-level toggles
  const [manageStock, setManageStock] = useState(false);
  const [notForSelling, setNotForSelling] = useState(false);

  // Product Information
  const [productName, setProductName] = useState('');
  const [sku, setSku] = useState('');
  const [productType, setProductType] = useState('standard');
  const [unitId, setUnitId] = useState('');
  const [brandId, setBrandId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [subCategoryId, setSubCategoryId] = useState('');
  const [businessLocationIds, setBusinessLocationIds] = useState([]);
  const [weight, setWeight] = useState('');
  const [reorderQuantity, setReorderQuantity] = useState('');

  // Pricing
  const [isTaxable, setIsTaxable] = useState(false);
  const [taxRateId, setTaxRateId] = useState('');
  const [sellingPriceTaxType, setSellingPriceTaxType] = useState('exclusive');
  const [purchasePriceExcTax, setPurchasePriceExcTax] = useState('');
  const [purchasePriceIncTax, setPurchasePriceIncTax] = useState('');
  const [profitMargin, setProfitMargin] = useState('25.00');
  const [sellingPriceExcTax, setSellingPriceExcTax] = useState('');

  // Image
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  // Submitting state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  // Fetch reference data
  const { data: unitsData } = useQuery({
    queryKey: ['units'],
    queryFn: async () => {
      const res = await api.get('/units');
      const data = res.data;
      return Array.isArray(data) ? data : (data.units || []);
    }
  });

  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await api.get('/categories');
      const data = res.data;
      return Array.isArray(data) ? data : (data.categories || []);
    }
  });

  const { data: brandsData } = useQuery({
    queryKey: ['brands'],
    queryFn: async () => {
      const res = await api.get('/attributes/brands');
      const data = res.data;
      return Array.isArray(data) ? data : (data.brands || []);
    }
  });

  const { data: branchesData } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      const res = await api.get('/branches');
      const data = res.data;
      return Array.isArray(data) ? data : (data.branches || []);
    }
  });

  const { data: taxRatesData } = useQuery({
    queryKey: ['taxRates'],
    queryFn: async () => {
      const res = await api.get('/tax-rates');
      const data = res.data;
      // API returns { tax_rates: [...] }
      return Array.isArray(data) ? data : (data.tax_rates || []);
    }
  });

  // Transform data to options format
  const units = (unitsData || []).map((u) => ({
    value: u.id,
    label: `${u.name} (${u.abbreviation})`
  }));

  const categories = (categoriesData || [])
    .filter((c) => !c.parent_id)
    .map((c) => ({ value: c.id, label: c.name }));

  const subCategories = (categoriesData || [])
    .filter((c) => c.parent_id === categoryId)
    .map((c) => ({ value: c.id, label: c.name }));

  const brands = (brandsData || []).map((b) => ({
    value: b.id,
    label: b.name
  }));

  const branches = (branchesData || []).map((b) => ({
    value: b.id,
    label: `${b.name} (${b.code})`
  }));

  const taxRates = (taxRatesData || []).map((t) => ({
    value: t.id,
    label: `${t.name} (${t.rate}%)`
  }));

  // Calculate selling price based on cost and profit margin
  const calculateSellingPrice = useCallback(() => {
    const cost = parseFloat(purchasePriceExcTax) || 0;
    const margin = parseFloat(profitMargin) || 0;
    if (cost > 0 && margin >= 0) {
      const selling = cost * (1 + margin / 100);
      setSellingPriceExcTax(selling.toFixed(2));
    }
  }, [purchasePriceExcTax, profitMargin]);

  useEffect(() => {
    calculateSellingPrice();
  }, [calculateSellingPrice]);

  // Calculate inc tax from exc tax
  useEffect(() => {
    const excTax = parseFloat(purchasePriceExcTax) || 0;
    const selectedTax = (taxRatesData || []).find((t) => t.id === taxRateId);
    const rate = selectedTax ? parseFloat(selectedTax.rate) : 0;
    if (isTaxable && excTax > 0 && rate > 0) {
      const incTax = excTax * (1 + rate / 100);
      setPurchasePriceIncTax(incTax.toFixed(2));
    } else {
      setPurchasePriceIncTax(purchasePriceExcTax);
    }
  }, [purchasePriceExcTax, taxRateId, isTaxable, taxRatesData]);

  // Handle image selection
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB');
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Generate SKU
  const generateSku = () => {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    setSku(`PRD-${timestamp}-${random}`);
  };

  // Get unit display name for base_unit field
  const getUnitName = () => {
    const unit = (unitsData || []).find((u) => u.id === unitId);
    return unit ? unit.abbreviation : '';
  };

  // Get category name
  const getCategoryName = () => {
    const cat = (categoriesData || []).find((c) => c.id === categoryId);
    return cat ? cat.name : '';
  };

  // Submit form
  const handleSubmit = async (addStock = false) => {
    setSubmitError(null);

    // Validate required fields
    if (!productName.trim()) {
      setSubmitError('Product Name is required');
      return;
    }
    if (!sku.trim()) {
      setSubmitError('SKU is required');
      return;
    }
    if (!unitId) {
      setSubmitError('Unit is required');
      return;
    }
    const salePrice = parseFloat(sellingPriceExcTax);
    if (isNaN(salePrice) || salePrice <= 0) {
      setSubmitError('Valid selling price is required');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        sku: sku.trim(),
        name: productName.trim(),
        type: productType,
        base_unit: getUnitName(),
        unit_id: unitId || null,
        sale_price: parseFloat(sellingPriceExcTax) || 0,
        cost_price: parseFloat(purchasePriceExcTax) || null,
        cost_price_inc_tax: parseFloat(purchasePriceIncTax) || null,
        tax_rate: 0,
        tax_rate_id: taxRateId || null,
        is_taxable: isTaxable,
        selling_price_tax_type: sellingPriceTaxType,
        profit_margin: parseFloat(profitMargin) || 25.00,
        brand_id: brandId || null,
        category: getCategoryName(),
        category_id: categoryId || null,
        sub_category_id: subCategoryId || null,
        weight: weight ? parseFloat(weight) : null,
        reorder_quantity: reorderQuantity ? parseFloat(reorderQuantity) : null,
        manage_stock: manageStock,
        not_for_selling: notForSelling,
        business_location_ids: businessLocationIds
      };

      const response = await api.post('/products', payload);

      queryClient.invalidateQueries({ queryKey: ['products'] });

      if (addStock) {
        // Navigate to stock management or inventory page
        navigate('/inventory', { state: { productId: response.data.product?.id } });
      } else {
        navigate('/products');
      }
    } catch (error) {
      setSubmitError(error.response?.data?.error || error.message || 'Failed to create product');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Add new product</h1>
          <p className="text-sm text-primary-600">Manage your products</p>
        </div>
        <div className="flex items-center gap-6">
          <Toggle checked={manageStock} onChange={setManageStock} label="Manage Stock?" />
          <Toggle checked={notForSelling} onChange={setNotForSelling} label="Not for selling" />
        </div>
      </div>

      {/* Error Alert */}
      {submitError && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {submitError}
        </div>
      )}

      <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
        {/* Product Information Section */}
        <CollapsibleSection title="Product Information">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormInput
              label="Product Name"
              required
              placeholder="Product Name"
              value={productName}
              onChange={setProductName}
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">SKU:</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="SKU"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                />
                <button
                  type="button"
                  onClick={generateSku}
                  className="px-3 py-2 bg-gray-100 text-gray-700 text-sm rounded-md hover:bg-gray-200 transition-colors border border-gray-300"
                >
                  Generate
                </button>
              </div>
            </div>

            <FormSelect
              label="Product Type"
              required
              options={productTypes}
              value={productType}
              onChange={setProductType}
              placeholder="Select Type"
            />
            <FormSelect
              label="Unit"
              required
              options={units}
              value={unitId}
              onChange={setUnitId}
              placeholder="Please Select"
              onAdd={() => navigate('/inventory/settings/units')}
            />

            <FormSelect
              label="Brand"
              options={brands}
              value={brandId}
              onChange={setBrandId}
              placeholder="Please Select"
              onAdd={() => navigate('/settings', { state: { tab: 'brands' } })}
            />
            <FormSelect
              label="Category"
              options={categories}
              value={categoryId}
              onChange={(val) => {
                setCategoryId(val);
                setSubCategoryId('');
              }}
              placeholder="Please Select"
            />

            <FormSelect
              label="Sub Category"
              options={subCategories}
              value={subCategoryId}
              onChange={setSubCategoryId}
              placeholder="None"
            />
            <MultiSelectTags
              label="Business Locations:"
              options={branches}
              selectedIds={businessLocationIds}
              onChange={setBusinessLocationIds}
            />

            <FormInput
              label="Weight"
              type="number"
              placeholder="Weight"
              value={weight}
              onChange={setWeight}
            />
            <FormInput
              label="Reorder Quantity"
              type="number"
              placeholder="Reorder quantity"
              value={reorderQuantity}
              onChange={setReorderQuantity}
            />
          </div>
        </CollapsibleSection>

        {/* Pricing Section */}
        <CollapsibleSection title="Pricing">
          <div className="space-y-6">
            {/* Tax Settings Row */}
            <div className="flex flex-col md:flex-row items-start md:items-end gap-6">
              <div>
                <Toggle checked={isTaxable} onChange={setIsTaxable} label="Taxable ?" />
              </div>
              <FormSelect
                label="Applicable Tax:"
                options={taxRates}
                value={taxRateId}
                onChange={setTaxRateId}
                placeholder="None"
                className="flex-1"
              />
              <FormSelect
                label="Selling Price Tax Type"
                required
                options={sellingPriceTaxTypes}
                value={sellingPriceTaxType}
                onChange={setSellingPriceTaxType}
                placeholder="Select"
                className="flex-1"
              />
            </div>

            {/* Pricing Table */}
            <div className="overflow-hidden rounded-lg border border-gray-200">
              <div className="grid grid-cols-4">
                {/* Purchase Price Header */}
                <div className="bg-blue-600 text-white px-4 py-3 text-sm font-semibold">
                  Purchase Price
                </div>
                {/* Profit Margin Header */}
                <div className="bg-green-500 text-white px-4 py-3 text-sm font-semibold flex items-center gap-2">
                  Profit Margin %
                  <span className="w-4 h-4 bg-white text-green-500 rounded-full flex items-center justify-center text-xs">
                    i
                  </span>
                </div>
                {/* Default Selling Price Header */}
                <div className="bg-amber-500 text-white px-4 py-3 text-sm font-semibold">
                  Default Selling Price
                </div>
                {/* Product Image Header */}
                <div className="bg-red-500 text-white px-4 py-3 text-sm font-semibold">
                  Product Image
                </div>
              </div>

              <div className="grid grid-cols-4 bg-white">
                {/* Purchase Price Fields */}
                <div className="p-4 border-r border-gray-200">
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">
                        Exc. Tax<span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={purchasePriceExcTax}
                        onChange={(e) => setPurchasePriceExcTax(e.target.value)}
                        placeholder="0"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">
                        Inc. Tax<span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={purchasePriceIncTax}
                        onChange={(e) => setPurchasePriceIncTax(e.target.value)}
                        placeholder="0"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Profit Margin Field */}
                <div className="p-4 border-r border-gray-200">
                  <input
                    type="number"
                    step="0.01"
                    value={profitMargin}
                    onChange={(e) => setProfitMargin(e.target.value)}
                    placeholder="25.00"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                {/* Selling Price Field */}
                <div className="p-4 border-r border-gray-200">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Exc. Tax</label>
                    <input
                      type="number"
                      step="0.01"
                      value={sellingPriceExcTax}
                      onChange={(e) => setSellingPriceExcTax(e.target.value)}
                      placeholder="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>

                {/* Product Image Field */}
                <div className="p-4">
                  <label className="block text-xs text-gray-600 mb-1">Product Image:</label>
                  <div className="flex items-start gap-3">
                    {imagePreview ? (
                      <div className="relative">
                        <img
                          src={imagePreview}
                          alt="Preview"
                          className="w-16 h-16 object-cover rounded border border-gray-200"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setImageFile(null);
                            setImagePreview(null);
                          }}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="w-16 h-16 border-2 border-dashed border-gray-300 rounded flex items-center justify-center text-gray-400">
                        <ImageIcon className="h-6 w-6" />
                      </div>
                    )}
                    <div>
                      <label className="cursor-pointer">
                        <span className="px-3 py-1.5 bg-gray-100 text-gray-700 text-xs rounded border border-gray-300 hover:bg-gray-200 transition-colors">
                          Choose Files
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageChange}
                          className="hidden"
                        />
                      </label>
                      <p className="text-xs text-gray-500 mt-1">No file chosen</p>
                      <p className="text-xs text-gray-400">Max file size: 5MB</p>
                      <p className="text-xs text-gray-400">Aspect ratio should be 1:1</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CollapsibleSection>

        {/* Action Buttons */}
        <div className="flex justify-center gap-4 pt-4">
          <button
            type="button"
            onClick={() => handleSubmit(true)}
            disabled={isSubmitting}
            className="px-6 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-md font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save & Add Stock
          </button>
          <button
            type="button"
            onClick={() => handleSubmit(false)}
            disabled={isSubmitting}
            className="px-8 py-2.5 bg-yellow-400 text-gray-900 rounded-md font-medium hover:bg-yellow-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Saving...' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddProduct;

