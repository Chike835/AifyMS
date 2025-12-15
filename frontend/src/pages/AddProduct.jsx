import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronUp, ChevronDown, Plus, ImageIcon, X } from 'lucide-react';
import api from '../utils/api';
import AttributeRenderer from '../components/AttributeRenderer';
import { useAuth } from '../context/AuthContext';

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
        className={`w-11 h-6 rounded-full transition-colors ${checked ? 'bg-primary-600' : 'bg-gray-300'
          }`}
      />
      <div
        className={`absolute left-0.5 top-0.5 bg-white w-5 h-5 rounded-full transition-transform shadow ${checked ? 'translate-x-5' : 'translate-x-0'
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
  { value: 'manufactured_virtual', label: 'Manufactured' },
  { value: 'variable', label: 'Variable' }
];

const sellingPriceTaxTypes = [
  { value: 'exclusive', label: 'Exclusive' },
  { value: 'inclusive', label: 'Inclusive' }
];

const AddProduct = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const isEditMode = !!id;
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [previewVariants, setPreviewVariants] = useState([]);
  const [selectedPreviewSuffixes, setSelectedPreviewSuffixes] = useState(new Set());
  const [pendingVariantDeletions, setPendingVariantDeletions] = useState(new Set());

  const generateVariantsMutation = useMutation({
    mutationFn: async ({ isDryRun = true, allowedSuffixes = null }) => {
      // Validation
      if (productType !== 'variable') {
        throw new Error('Product must be a variable product to generate variants.');
      }

      // In edit mode, check if product type has been changed but not saved
      if (isEditMode && product?.type) {
        const savedProductType = product.type;
        const currentProductType = productType;
        
        if (savedProductType !== 'variable' && currentProductType === 'variable') {
          throw new Error(
            'Please save the product with type "Variable" before generating variants. ' +
            `The product is currently saved as "${savedProductType}" but you have changed it to "variable" in the form.`
          );
        }
      }

      if (selectedVariations.length === 0) {
        throw new Error('No variations selected. Please select at least one variation.');
      }

      // Validate that each selected variation has at least one value selected
      const variationsWithoutValues = [];
      selectedVariations.forEach(varId => {
        const valueIds = selectedVariationValues[varId];
        if (!valueIds || !Array.isArray(valueIds) || valueIds.length === 0) {
          const variation = variationsData?.find(v => v.id === varId);
          const variationName = variation?.name || `Variation ID ${varId}`;
          variationsWithoutValues.push(variationName);
        }
      });

      if (variationsWithoutValues.length > 0) {
        throw new Error(
          `Please select at least one value for each variation. Missing values for: ${variationsWithoutValues.join(', ')}`
        );
      }

      // Build config for selective generation - filter out any with empty valueIds (shouldn't happen after validation, but defensive)
      const variationConfigs = selectedVariations
        .map(varId => ({
          variationId: varId,
          valueIds: selectedVariationValues[varId] || []
        }))
        .filter(config => config.valueIds && Array.isArray(config.valueIds) && config.valueIds.length > 0);

      if (variationConfigs.length === 0) {
        throw new Error('No valid variation configurations. Please ensure each variation has at least one value selected.');
      }

      console.log(`[generateVariantsMutation] Generating variants (dryRun=${isDryRun})`, {
        variationIds: selectedVariations,
        configCount: variationConfigs.length,
        payload: {
          variation_ids: selectedVariations,
          variation_configs: variationConfigs.map(c => ({
            variationId: c.variationId,
            valueIdsCount: c.valueIds.length
          }))
        }
      });

      const payload = {
        variation_ids: selectedVariations,
        variation_configs: variationConfigs
      };

      if (allowedSuffixes) {
        payload.allowed_sku_suffixes = allowedSuffixes;
      }

      const response = await api.post(`/products/${id}/generate-variants?dry_run=${isDryRun}`, payload);
      return { ...response.data, isDryRun };
    },
    onSuccess: async (data) => {
      if (data.isDryRun) {
        setPreviewVariants(data.variants || []);
        // Default select all
        const allSuffixes = (data.variants || []).map(v => v.sku_suffix);
        setSelectedPreviewSuffixes(new Set(allSuffixes));
        console.log(`[generateVariantsMutation] ${data.variants?.length} variants set for preview`);
      } else {
        setPreviewVariants([]); // Clear preview on save
        setSelectedPreviewSuffixes(new Set());
        console.log(`[generateVariantsMutation] Success: ${data.message || 'Variants generated successfully'}`);
        queryClient.invalidateQueries({ queryKey: ['products'] }); // Refetch list
        try {
          await new Promise(resolve => setTimeout(resolve, 200));
          await loadProductData(true);
          console.log(`[generateVariantsMutation] Product data reloaded after variant generation`);
          setTimeout(() => {
            alert(data.message || 'Variants generated successfully');
          }, 100);
        } catch (error) {
          console.error(`[generateVariantsMutation] Error reloading product data:`, error);
        }
      }
    },
    onError: (error) => {
      console.error(`[generateVariantsMutation] Error:`, error);
      console.error(`[generateVariantsMutation] Error details:`, {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        statusText: error.response?.statusText,
        url: error.config?.url,
        method: error.config?.method,
        payload: error.config?.data ? JSON.parse(error.config.data) : null
      });
      console.log(`[generateVariantsMutation] Current product type state: ${productType}`);
      console.log(`[generateVariantsMutation] Saved product type: ${product?.type}`);
      console.log(`[generateVariantsMutation] Selected variations:`, selectedVariations);
      console.log(`[generateVariantsMutation] Selected variation values:`, selectedVariationValues);

      let errorMessage = error.response?.data?.error || error.message || 'Failed to generate variants';
      const errorDetails = error.response?.data?.details ? `\n\nDetails: ${JSON.stringify(error.response.data.details, null, 2)}` : '';

      // Detect type mismatch: UI state is 'variable' but database has different type
      if (isEditMode && product?.type) {
        const savedProductType = product.type;
        const currentProductType = productType;
        const isTypeMismatch = 
          (errorMessage.includes('not a variable product') || 
           errorMessage.includes('Product is not a variable product')) &&
          currentProductType === 'variable' &&
          savedProductType !== 'variable';

        if (isTypeMismatch) {
          errorMessage = `Please save the product with type "Variable" before generating variants. ` +
            `The product is currently saved as "${savedProductType}" but you have changed it to "variable" in the form. ` +
            `Save the product first, then try generating variants again.`;
          console.log('[generateVariantsMutation] Detected type mismatch - product type changed but not saved');
        }
      }

      alert(errorMessage + errorDetails);

      // If we get a type mismatch error, try to sync state
      if (errorMessage.includes('not a variable product') || (error.response?.status === 400 && productType !== 'variable')) {
        console.log('[generateVariantsMutation] Attempting to refresh product data due to type mismatch');
        loadProductData(true);
      }
    }
  });


  // ... (inside the table render)

  // Helper to toggle selection
  const togglePreviewSelection = (suffix) => {
    const newSet = new Set(selectedPreviewSuffixes);
    if (newSet.has(suffix)) {
      newSet.delete(suffix);
    } else {
      newSet.add(suffix);
    }
    setSelectedPreviewSuffixes(newSet);
  };

  const toggleAllPreviewSelection = (e) => {
    if (e.target.checked) {
      const allSuffixes = previewVariants.map(v => v.sku_suffix);
      setSelectedPreviewSuffixes(new Set(allSuffixes));
    } else {
      setSelectedPreviewSuffixes(new Set());
    }
  };

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
  const [attributeValues, setAttributeValues] = useState({});
  const [selectedVariations, setSelectedVariations] = useState([]);
  const [selectedVariationValues, setSelectedVariationValues] = useState({}); // { variationId: [valueId, ...] }

  const { data: variationsData } = useQuery({
    queryKey: ['variations'],
    queryFn: async () => {
      const response = await api.get('/variations');
      return response.data.variations;
    }
  });

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
  // Full product object (for access to non-form fields like variants in render)
  const [product, setProduct] = useState(null);

  // Fetch reference data
  const { data: unitsData } = useQuery({
    queryKey: ['units'],
    queryFn: async () => {
      const res = await api.get('/units');
      const data = res.data;
      return Array.isArray(data) ? data : (data.units || []);
    }
  });

  const categoryBranchScope = user?.branch_id || null;
  const { data: categoriesData } = useQuery({
    queryKey: ['categories', categoryBranchScope || 'global'],
    queryFn: async () => {
      const res = await api.get('/categories', {
        params: {
          branch_id: categoryBranchScope || undefined,
          include_global: 'true'
        }
      });
      const data = res.data;
      return Array.isArray(data) ? data : (data.categories || []);
    }
  });

  // Fetch selected category details (for attribute schema)
  const { data: selectedCategory } = useQuery({
    queryKey: ['category', categoryId],
    queryFn: async () => {
      if (!categoryId) return null;
      const res = await api.get(`/categories/${categoryId}`);
      return res.data.category || null;
    },
    enabled: !!categoryId
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

  // Manufacturing settings (colors, designs, gauge config) REMOVED - replaced by variations system

  // Transform data to options format
  const units = (unitsData || []).map((u) => ({
    value: u.id,
    label: `${u.name} (${u.abbreviation})`
  }));

  const categories = (categoriesData || [])
    .filter((c) => !c.parent_id)
    .map((c) => ({ value: c.id, label: c.name }));

  const subCategories = (categoriesData || [])
    .filter((c) => c.parent_id === categoryId && categoryId)
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
  // Bidirectional tax calculation handlers
  // Handler for Exclusive Tax Price change
  const handlePurchasePriceExcChange = (val) => {
    setPurchasePriceExcTax(val);
    const exc = parseFloat(val);
    const selectedTax = (taxRatesData || []).find((t) => t.id === taxRateId);
    const rate = selectedTax ? parseFloat(selectedTax.rate) : 0;

    if (isTaxable && !isNaN(exc) && exc > 0 && rate > 0) {
      const inc = exc * (1 + rate / 100);
      setPurchasePriceIncTax(inc.toFixed(2));
    } else if (!val || val === '') {
      // Clear inc tax if exc tax is cleared
      setPurchasePriceIncTax('');
    } else if (!isTaxable || rate === 0) {
      // If not taxable or no rate, inc tax equals exc tax
      setPurchasePriceIncTax(val);
    }
  };

  // Handler for Inclusive Tax Price change
  const handlePurchasePriceIncChange = (val) => {
    setPurchasePriceIncTax(val);
    const inc = parseFloat(val);
    const selectedTax = (taxRatesData || []).find((t) => t.id === taxRateId);
    const rate = selectedTax ? parseFloat(selectedTax.rate) : 0;

    if (isTaxable && !isNaN(inc) && inc > 0 && rate > 0) {
      const exc = inc / (1 + rate / 100);
      setPurchasePriceExcTax(exc.toFixed(2));
    } else if (!val || val === '') {
      // Clear exc tax if inc tax is cleared
      setPurchasePriceExcTax('');
    } else if (!isTaxable || rate === 0) {
      // If not taxable or no rate, exc tax equals inc tax
      setPurchasePriceExcTax(val);
    }
  };

  // Recalculate if tax rate changes (keep simpler effect for rate changes)
  useEffect(() => {
    const exc = parseFloat(purchasePriceExcTax);
    const selectedTax = (taxRatesData || []).find((t) => t.id === taxRateId);
    const rate = selectedTax ? parseFloat(selectedTax.rate) : 0;

    if (isTaxable && !isNaN(exc) && rate >= 0 && purchasePriceExcTax) {
      const inc = exc * (1 + rate / 100);
      setPurchasePriceIncTax(inc.toFixed(2));
    }
  }, [taxRateId, isTaxable, taxRatesData]);

  // Load product data if in edit mode
  const loadProductData = useCallback(async (forceRefresh = false) => {
    if (!isEditMode) {
      console.log(`[loadProductData] Not in edit mode, skipping`);
      return;
    }

    console.log(`[loadProductData] Loading product data for id: ${id}`);
    let productData = location.state?.editProduct;

    // Fetch if:
    // 1. We are forcing a refresh
    // 2. No local state data
    // 3. Local state data is missing variants (incomplete data from list view)
    const shouldFetch = forceRefresh || !productData || !Array.isArray(productData.variants);

    if (shouldFetch) {
      try {
        console.log(`[loadProductData] Fetching product from API...`);
        const res = await api.get(`/products/${id}`);
        console.log(`[loadProductData] API response received:`, {
          hasProduct: !!res.data.product,
          hasData: !!res.data,
          variantsType: typeof (res.data.product?.variants || res.data?.variants),
          variantsLength: res.data.product?.variants?.length || res.data?.variants?.length || 0
        });
        productData = res.data.product || res.data;
        console.log(`[loadProductData] Raw API Response keys:`, Object.keys(res.data));
        if (res.data.product) {
          console.log(`[loadProductData] res.data.product keys:`, Object.keys(res.data.product));
          console.log(`[loadProductData] res.data.product.variants type:`, typeof res.data.product.variants);
          if (Array.isArray(res.data.product.variants)) {
            console.log(`[loadProductData] res.data.product.variants length:`, res.data.product.variants.length);
          }
        }
      } catch (err) {
        console.error('[loadProductData] Failed to fetch product:', err);
        setSubmitError('Failed to load product details');
        return;
      }
    } else {
      console.log(`[loadProductData] Using product data from location.state`);
    }

    if (productData) {
      // Ensure variants is always an array (defensive check)
      if (!Array.isArray(productData.variants)) {
        console.warn(`[loadProductData] Product variants is not an array (type: ${typeof productData.variants}), defaulting to empty array`);
        productData.variants = [];
      }

      // Debug logging for variants
      console.log(`[loadProductData] Product has ${productData.variants.length} variants`);
      if (productData.variants.length > 0) {
        const variantsWithChild = productData.variants.filter(v => v?.child).length;
        const variantsWithoutChild = productData.variants.length - variantsWithChild;
        console.log(`[loadProductData] Variants with child: ${variantsWithChild}, without child: ${variantsWithoutChild}`);
        if (variantsWithoutChild > 0) {
          console.warn(`[loadProductData] Warning: ${variantsWithoutChild} variants missing child relationship`);
        }
        // Log first variant structure for debugging
        if (productData.variants[0]) {
          console.log(`[loadProductData] First variant structure:`, {
            id: productData.variants[0].id,
            hasChild: !!productData.variants[0].child,
            childId: productData.variants[0].child?.id,
            childSku: productData.variants[0].child?.sku
          });
        }
      } else {
        console.log(`[loadProductData] Product has no variants (empty array)`);
      }
      setProduct(productData);
      setProductName(productData.name || '');
      setSku(productData.sku || '');
      setProductType(productData.type || 'standard');
      setUnitId(productData.unit_id || productData.unit?.id || '');
      setBrandId(productData.brand_id || productData.brandAttribute?.id || '');
      setCategoryId(productData.category_id || productData.categoryRef?.id || '');
      setSubCategoryId(productData.sub_category_id || '');
      setBusinessLocationIds(productData.business_location_ids || productData.business_locations?.map(bl => bl.id) || []);
      setWeight(productData.weight || '');
      setReorderQuantity(productData.reorder_quantity || '');
      setManageStock(!!productData.manage_stock);
      setNotForSelling(!!productData.not_for_selling);

      // Pricing
      setIsTaxable(!!productData.is_taxable);
      setTaxRateId(productData.tax_rate_id || '');
      setSellingPriceTaxType(productData.selling_price_tax_type || 'exclusive');
      setPurchasePriceExcTax(productData.cost_price || '');
      setPurchasePriceIncTax(productData.cost_price_inc_tax || '');
      setProfitMargin(productData.profit_margin || '25.00');
      setSellingPriceExcTax(productData.sale_price || '');

      // Attributes
      if (productData.attribute_values) {
        setAttributeValues(productData.attribute_values);
      }

      if (productData.type === 'variable') {
        const variationIds = [];

        if (Array.isArray(productData.variation_assignments)) {
          productData.variation_assignments.forEach(va => variationIds.push(va.variation_id));
        }
        // REMOVED: Incorrect fallback to use product IDs as variation IDs
        // else if (Array.isArray(productData.variations)) {
        //   productData.variations.forEach(v => variationIds.push(v.id));
        // }

        if (variationIds.length > 0) {
          const uniqueIds = [...new Set(variationIds)];
          setSelectedVariations(uniqueIds);
        }
      }

      // Image
      if (productData.image_url) {
        setImagePreview(productData.image_url);
      }
    }
  }, [id, isEditMode, location.state]);

  useEffect(() => {
    loadProductData();
  }, [loadProductData]);

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
    console.log('[handleSubmit] Called with addStock:', addStock);
    setSubmitError(null);

    // Validate required fields
    if (!productName.trim()) {
      setSubmitError('Product Name is required');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (!sku.trim()) {
      setSubmitError('SKU is required');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (!unitId) {
      setSubmitError('Unit is required');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    const salePrice = parseFloat(sellingPriceExcTax);
    if (isNaN(salePrice) || salePrice <= 0) {
      setSubmitError('Valid selling price is required');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    console.log('[handleSubmit] Validation passed, submitting...');
    setIsSubmitting(true);

    try {
      // 1. Process Pending Deletions (if any) - Only in Edit Mode
      if (isEditMode && pendingVariantDeletions.size > 0) {
        console.log(`[handleSubmit] Processing ${pendingVariantDeletions.size} variant deletions...`);
        try {
          // Use bulk delete endpoint for efficiency
          await api.post(`/products/${id}/variants/bulk-delete`, {
            variantIds: Array.from(pendingVariantDeletions)
          });
          console.log('[handleSubmit] Bulk deletion successful');
        } catch (delErr) {
          console.error(`[handleSubmit] Failed to delete variants:`, delErr);
          throw new Error(`Failed to delete variants: ${delErr.message}`);
        }
      }

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
        business_location_ids: businessLocationIds,
        attribute_default_values: Object.keys(attributeValues).length > 0 ? attributeValues : undefined,
        variation_ids: productType === 'variable' ? selectedVariations : []
      };

      let response;
      let finalProductId = id;

      if (isEditMode) {
        response = await api.put(`/products/${id}`, payload);
      } else {
        response = await api.post('/products', payload);
        finalProductId = response.data.product?.id;
      }

      // 2. Process Pending Variant Creations (if any) - For both New and Edit
      // Only proceed if we have a valid product ID and selected suffixes
      if (productType === 'variable' && selectedPreviewSuffixes.size > 0 && finalProductId) {
        console.log(`[handleSubmit] Generating ${selectedPreviewSuffixes.size} variants...`);

        const variationConfigs = selectedVariations.map(varId => ({
          variationId: varId,
          valueIds: selectedVariationValues[varId] || []
        }));

        await api.post(`/products/${finalProductId}/generate-variants?dry_run=false`, {
          variation_ids: selectedVariations,
          variation_configs: variationConfigs,
          allowed_sku_suffixes: Array.from(selectedPreviewSuffixes)
        });
      }

      queryClient.invalidateQueries({ queryKey: ['products'] });

      console.log('[handleSubmit] Success, navigating...');
      if (addStock) {
        // Navigate to stock management or inventory page
        navigate('/inventory', { state: { productId: response.data.product?.id || finalProductId } });
      } else {
        navigate('/products');
      }
    } catch (error) {
      console.error('[handleSubmit] Error:', error);
      const errorMessage = error.response?.data?.error || error.message || `Failed to ${isEditMode ? 'update' : 'create'} product`;
      setSubmitError(errorMessage);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{isEditMode ? 'Edit Product' : 'Add new product'}</h1>
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

            {productType === 'variable' && (
              <div className="md:col-span-2 bg-gray-50 p-4 rounded-lg border border-gray-200">
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Variations</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {variationsData?.map((variation) => (
                    <div key={variation.id} className="md:col-span-2 space-y-2">
                      <label className="flex items-center space-x-2 cursor-pointer font-medium">
                        <input
                          type="checkbox"
                          className="rounded border-gray-300 text-primary-600 shadow-sm focus:border-primary-300 focus:ring focus:ring-primary-200 focus:ring-opacity-50"
                          checked={selectedVariations.includes(variation.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedVariations([...selectedVariations, variation.id]);
                              // Default: select all values
                              const allValueIds = variation.values?.map(v => v.id) || [];
                              setSelectedVariationValues(prev => ({
                                ...prev,
                                [variation.id]: allValueIds
                              }));
                            } else {
                              setSelectedVariations(selectedVariations.filter(id => id !== variation.id));
                              // Remove from selected values
                              const newValues = { ...selectedVariationValues };
                              delete newValues[variation.id];
                              setSelectedVariationValues(newValues);
                            }
                          }}
                        />
                        <span className="text-sm text-gray-700">{variation.name}</span>
                      </label>

                      {/* Show values if variation is selected */}
                      {selectedVariations.includes(variation.id) && (
                        <div className="ml-6 flex flex-wrap gap-2">
                          {variation.values?.map(val => (
                            <label key={val.id} className={`
                                      inline-flex items-center px-2 py-1 rounded-md text-xs border cursor-pointer select-none
                                      ${selectedVariationValues[variation.id]?.includes(val.id)
                                ? 'bg-primary-50 border-primary-200 text-primary-700'
                                : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}
                                  `}>
                              <input
                                type="checkbox"
                                className="sr-only"
                                checked={selectedVariationValues[variation.id]?.includes(val.id) || false}
                                onChange={(e) => {
                                  const currentSelected = selectedVariationValues[variation.id] || [];
                                  let newSelected;
                                  if (e.target.checked) {
                                    newSelected = [...currentSelected, val.id];
                                  } else {
                                    newSelected = currentSelected.filter(id => id !== val.id);
                                  }
                                  setSelectedVariationValues(prev => ({
                                    ...prev,
                                    [variation.id]: newSelected
                                  }));
                                }}
                              />
                              {val.value}
                            </label>
                          ))}
                          {(!variation.values || variation.values.length === 0) && (
                            <span className="text-xs text-red-500">No values defined</span>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                  {(!variationsData || variationsData.length === 0) && (
                    <span className="text-sm text-gray-500 italic">No variations found. Create them in Settings.</span>
                  )}
                </div>
              </div>
            )}
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

          {/* Gauge/Color/Design dropdowns REMOVED - replaced by variations system */}

          {/* Dynamic Attributes Section (from attribute_schema) */}
          {selectedCategory?.attribute_schema && selectedCategory.attribute_schema.length > 0 && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h4 className="text-sm font-semibold text-gray-900 mb-4">Additional Attributes</h4>
              <AttributeRenderer
                schema={selectedCategory.attribute_schema}
                values={attributeValues}
                onChange={setAttributeValues}
                className="grid grid-cols-1 md:grid-cols-2 gap-6"
              />
            </div>
          )}
        </CollapsibleSection>

        {/* Variants Management Section (Variable Product Edit Mode) */}
        {isEditMode && productType === 'variable' && (
          <CollapsibleSection title="Product Variants">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-gray-500">
                    Selected Variations: {selectedVariations.length}.
                    Click preview to see combinations.
                  </p>
                  {previewVariants.length > 0 && (
                    <p className="text-sm text-amber-600 font-semibold mt-1">
                      Previewing {previewVariants.length} variants ({selectedPreviewSuffixes.size} selected for creation)
                    </p>
                  )}
                  {product && Array.isArray(product.variants) && previewVariants.length === 0 && (
                    <p className="text-sm text-gray-600 mt-1">
                      Variants in database: {product.variants.length}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  {previewVariants.length > 0 && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setPreviewVariants([]);
                          setSelectedPreviewSuffixes(new Set());
                        }}
                        className="px-3 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (selectedPreviewSuffixes.size === 0) {
                            alert('Please select at least one variant to create.');
                            return;
                          }
                          // Just confirm selection (visual feedback only)
                          alert('Selection confirmed. Click "Save & Add Stock" or "Update" to finalize changes.');
                        }}
                        disabled={selectedPreviewSuffixes.size === 0}
                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                      >
                        Confirm Selection ({selectedPreviewSuffixes.size})
                      </button>
                    </>
                  )}
                  {previewVariants.length === 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        if (productType !== 'variable') {
                          alert('Please set Product Type to "Variable" before previewing variants.');
                          return;
                        }
                        generateVariantsMutation.mutate({ isDryRun: true });
                      }}
                      disabled={generateVariantsMutation.isPending || selectedVariations.length === 0}
                      className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
                    >
                      {generateVariantsMutation.isPending ? 'Generating...' : 'Preview Variants'}
                    </button>
                  )}
                </div>
              </div>

              {/* Variants List */}
              {(previewVariants.length > 0 || (product && Array.isArray(product.variants) && product.variants.length > 0)) ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left">
                          {/* Empty header for checkbox column (or could be 'Select') */}
                          {previewVariants.length > 0 && (
                            <input
                              type="checkbox"
                              checked={previewVariants.length > 0 && selectedPreviewSuffixes.size === previewVariants.length}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  const allSuffixes = previewVariants.map(v => v.sku_suffix);
                                  setSelectedPreviewSuffixes(new Set(allSuffixes));
                                } else {
                                  setSelectedPreviewSuffixes(new Set());
                                }
                              }}
                              className="rounded border-gray-300 text-primary-600 shadow-sm focus:border-primary-300 focus:ring focus:ring-primary-200 focus:ring-opacity-50"
                            />
                          )}
                          {/* If showing saved variants, header might need to be consistent */}
                          {previewVariants.length === 0 && (
                            <span className="sr-only">Delete</span>
                          )}
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {previewVariants.length > 0 ? (
                        // Render Preview Variants (Flat Object)
                        previewVariants.map((variant, idx) => (
                          <tr key={`preview-${idx}`} className={selectedPreviewSuffixes.has(variant.sku_suffix) ? "bg-amber-50" : "bg-gray-50 opacity-50"}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <input
                                type="checkbox"
                                checked={selectedPreviewSuffixes.has(variant.sku_suffix)}
                                onChange={() => {
                                  const newSet = new Set(selectedPreviewSuffixes);
                                  if (newSet.has(variant.sku_suffix)) {
                                    newSet.delete(variant.sku_suffix);
                                  } else {
                                    newSet.add(variant.sku_suffix);
                                  }
                                  setSelectedPreviewSuffixes(newSet);
                                }}
                                className="rounded border-gray-300 text-primary-600 shadow-sm focus:border-primary-300 focus:ring focus:ring-primary-200 focus:ring-opacity-50"
                              />
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{variant.sku || '-'}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{variant.name || '-'}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{variant.sale_price || '-'}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">0 (New)</td>
                          </tr>
                        ))
                      ) : (
                        // Render Saved Variants (Nested .child Object)
                        product.variants
                          .filter(variant => variant?.child)
                          .map((variant) => {
                            const isDeletable = !variant.child?.current_stock || parseFloat(variant.child.current_stock) === 0;
                            const isMarkedForDeletion = pendingVariantDeletions.has(variant.id);

                            return (
                              <tr key={variant.id} className={isMarkedForDeletion ? "bg-red-50" : ""}>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <input
                                    type="checkbox"
                                    disabled={!isDeletable}
                                    checked={isMarkedForDeletion}
                                    onChange={(e) => {
                                      const newSet = new Set(pendingVariantDeletions);
                                      if (e.target.checked) {
                                        newSet.add(variant.id);
                                      } else {
                                        newSet.delete(variant.id);
                                      }
                                      setPendingVariantDeletions(newSet);
                                    }}
                                    className="rounded border-gray-300 text-red-600 shadow-sm focus:border-red-300 focus:ring focus:ring-red-200 focus:ring-opacity-50 disabled:opacity-30 disabled:cursor-not-allowed"
                                  />
                                </td>
                                <td className={`px-6 py-4 whitespace-nowrap text-sm ${isMarkedForDeletion ? 'text-gray-400 line-through' : 'text-gray-900'}`}>{variant.child?.sku || '-'}</td>
                                <td className={`px-6 py-4 whitespace-nowrap text-sm ${isMarkedForDeletion ? 'text-gray-400 line-through' : 'text-gray-900'}`}>{variant.child?.name || '-'}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{variant.child?.sale_price || '-'}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{variant.child?.current_stock ?? '-'}</td>
                              </tr>
                            );
                          })
                      )}
                    </tbody>
                  </table>
                  {product && product.variants && product.variants.filter(v => !v?.child).length > 0 && previewVariants.length === 0 && (
                    <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
                      Warning: {product.variants.filter(v => !v?.child).length} variant(s) are missing child product data and were not displayed.
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-500 italic mt-4">No variants generated yet.</p>
              )}
            </div>
          </CollapsibleSection>
        )}

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
                        onChange={(e) => handlePurchasePriceExcChange(e.target.value)}
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
                        onChange={(e) => handlePurchasePriceIncChange(e.target.value)}
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
            {isSubmitting ? 'Saving...' : (isEditMode ? 'Update' : 'Save')}
          </button>
        </div>
      </form >
    </div >
  );
};

export default AddProduct;

