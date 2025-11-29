import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import ImportModal from '../components/import/ImportModal';
import ExportModal from '../components/import/ExportModal';
import ListToolbar from '../components/common/ListToolbar';
import {
  Download,
  Package,
  Plus,
  Filter,
  X,
  MoreVertical,
  Eye,
  Edit2,
  Trash2,
  Tag,
  Layers,
  Printer,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

const productTypeLabels = {
  standard: 'Single',
  compound: 'Combo',
  raw_tracked: 'Raw (Tracked)',
  manufactured_virtual: 'Manufactured'
};

const Products = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { hasPermission } = useAuth();

  // Filter states
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    type: '',
    category_id: '',
    unit_id: '',
    tax_rate_id: '',
    brand_id: '',
    branch_id: '',
    status: 'active',
    not_for_selling: ''
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);

  // Selection
  const [selectedProducts, setSelectedProducts] = useState([]);

  // Column visibility
  const [visibleColumns, setVisibleColumns] = useState({
    image: true,
    product: true,
    business_location: true,
    unit_price: true,
    selling_price: true,
    current_stock: true,
    type: true,
    category: true,
    brand: true,
    tax: true
  });

  // Modals
  const [showImportModal, setShowImportModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [viewModalProduct, setViewModalProduct] = useState(null);
  const [batchModalProduct, setBatchModalProduct] = useState(null);
  const [batchListModalProduct, setBatchListModalProduct] = useState(null);
  const [deleteModalProduct, setDeleteModalProduct] = useState(null);

  // Action menu
  const [openActionMenu, setOpenActionMenu] = useState(null);
  const actionMenuRef = useRef(null);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Close action menu on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (actionMenuRef.current && !actionMenuRef.current.contains(event.target)) {
        setOpenActionMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch products
  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['products', filters, debouncedSearch, page, limit],
    queryFn: async () => {
      const params = { page, limit };
      if (filters.type) params.type = filters.type;
      if (filters.category_id) params.category_id = filters.category_id;
      if (filters.unit_id) params.unit_id = filters.unit_id;
      if (filters.tax_rate_id) params.tax_rate_id = filters.tax_rate_id;
      if (filters.brand_id) params.brand_id = filters.brand_id;
      if (filters.branch_id) params.branch_id = filters.branch_id;
      if (filters.status) params.status = filters.status;
      if (filters.not_for_selling) params.not_for_selling = filters.not_for_selling;
      if (debouncedSearch.trim()) params.search = debouncedSearch.trim();

      const response = await api.get('/products', { params });
      return response.data;
    }
  });

  // Fetch reference data for filters
  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await api.get('/categories');
      return res.data.categories || res.data || [];
    }
  });

  const { data: unitsData } = useQuery({
    queryKey: ['units'],
    queryFn: async () => {
      const res = await api.get('/units');
      return res.data.units || res.data || [];
    }
  });

  const { data: taxRatesData } = useQuery({
    queryKey: ['taxRates'],
    queryFn: async () => {
      const res = await api.get('/tax-rates');
      return res.data.tax_rates || res.data || [];
    }
  });

  const { data: brandsData } = useQuery({
    queryKey: ['brands'],
    queryFn: async () => {
      const res = await api.get('/attributes/brands');
      return res.data.brands || res.data || [];
    }
  });

  const { data: branchesData } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      const res = await api.get('/branches');
      return res.data.branches || res.data || [];
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/products/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setDeleteModalProduct(null);
    }
  });

  const products = data?.products || [];
  const pagination = data?.pagination || { total: 0, page: 1, limit: 25, total_pages: 1 };
  const totals = data?.totals || { total_stock: 0, total_purchase_price: 0, total_selling_price: 0 };

  const canImport = hasPermission('product_add');
  const canExport = hasPermission('product_view');
  const canAdd = hasPermission('product_add');
  const canEdit = hasPermission('product_edit');
  const canDelete = hasPermission('product_delete');
  const canViewBatches = hasPermission('batch_view') || hasPermission('product_view');
  const canAddBatch = hasPermission('batch_create') || hasPermission('stock_add_opening');

  const handleImportSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['products'] });
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedProducts(products.map((p) => p.id));
    } else {
      setSelectedProducts([]);
    }
  };

  const handleSelectProduct = (id, checked) => {
    if (checked) {
      setSelectedProducts([...selectedProducts, id]);
    } else {
      setSelectedProducts(selectedProducts.filter((pid) => pid !== id));
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const clearFilters = () => {
    setFilters({
      type: '',
      category_id: '',
      unit_id: '',
      tax_rate_id: '',
      brand_id: '',
      branch_id: '',
      status: 'active',
      not_for_selling: ''
    });
    setPage(1);
  };

  const formatCurrency = (value) => {
    const num = parseFloat(value) || 0;
    return `₦${num.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
  };

  const formatStock = (product) => {
    const stock = parseFloat(product.current_stock) || 0;
    const unit = product.unit?.abbreviation || product.base_unit || '';
    return `${stock.toLocaleString(undefined, { maximumFractionDigits: 3 })} ${unit}`.trim();
  };

  const getBusinessLocations = (product) => {
    if (product.business_locations && product.business_locations.length > 0) {
      return product.business_locations.map((b) => b.name).join(', ');
    }
    return '—';
  };


  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Products</h1>
          <p className="text-sm text-primary-600">Manage your products</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => navigate('/inventory/print-labels')}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
          >
            <Printer className="h-4 w-4" />
            Print Labels
          </button>
          {canAdd && (
            <button
              onClick={() => navigate('/products/add')}
              className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white shadow hover:bg-orange-600"
            >
              <Plus className="h-4 w-4" />
              Add
            </button>
          )}
          {canExport && (
            <button
              onClick={() => setShowExportModal(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-green-700"
            >
              <Download className="h-4 w-4" />
              Export
            </button>
          )}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium shadow-sm ${
              showFilters
                ? 'border-primary-500 bg-primary-50 text-primary-700'
                : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Filter className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-700">Filters</h3>
            <button
              onClick={() => setShowFilters(false)}
              className="inline-flex items-center gap-1 rounded bg-red-500 px-3 py-1 text-xs font-medium text-white hover:bg-red-600"
            >
              <X className="h-3 w-3" /> Close Filter
            </button>
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
            {/* Product Type */}
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Product Type:</label>
              <select
                value={filters.type}
                onChange={(e) => handleFilterChange('type', e.target.value)}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                <option value="">All</option>
                <option value="standard">Single</option>
                <option value="compound">Combo</option>
                <option value="raw_tracked">Raw (Tracked)</option>
                <option value="manufactured_virtual">Manufactured</option>
              </select>
            </div>

            {/* Category */}
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Category:</label>
              <select
                value={filters.category_id}
                onChange={(e) => handleFilterChange('category_id', e.target.value)}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                <option value="">All</option>
                {(categoriesData || [])
                  .filter((c) => !c.parent_id)
                  .map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
              </select>
            </div>

            {/* Unit */}
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Unit:</label>
              <select
                value={filters.unit_id}
                onChange={(e) => handleFilterChange('unit_id', e.target.value)}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                <option value="">All</option>
                {(unitsData || []).map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.name} ({unit.abbreviation})
                  </option>
                ))}
              </select>
            </div>

            {/* Tax */}
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Tax:</label>
              <select
                value={filters.tax_rate_id}
                onChange={(e) => handleFilterChange('tax_rate_id', e.target.value)}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                <option value="">All</option>
                {(taxRatesData || []).map((tax) => (
                  <option key={tax.id} value={tax.id}>
                    {tax.name} ({tax.rate}%)
                  </option>
                ))}
              </select>
            </div>

            {/* Brand */}
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Brand:</label>
              <select
                value={filters.brand_id}
                onChange={(e) => handleFilterChange('brand_id', e.target.value)}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                <option value="">All</option>
                {(brandsData || []).map((brand) => (
                  <option key={brand.id} value={brand.id}>
                    {brand.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Business Location */}
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Business Location:</label>
              <select
                value={filters.branch_id}
                onChange={(e) => handleFilterChange('branch_id', e.target.value)}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                <option value="">All</option>
                {(branchesData || []).map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Status:</label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                <option value="">All</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            {/* Not for Selling Toggle */}
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Not for selling:</label>
              <div className="flex items-center gap-2 pt-1">
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    checked={filters.not_for_selling === 'true'}
                    onChange={(e) => handleFilterChange('not_for_selling', e.target.checked ? 'true' : '')}
                    className="peer sr-only"
                  />
                  <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-primary-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none"></div>
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <ListToolbar
        limit={limit}
        onLimitChange={(newLimit) => {
          setLimit(newLimit);
          setPage(1);
        }}
        visibleColumns={visibleColumns}
        onColumnVisibilityChange={setVisibleColumns}
        onExport={() => setShowExportModal(true)}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search products..."
      />

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-primary-600"></div>
        </div>
      ) : products.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white px-6 py-12 text-center">
          <Package className="mx-auto mb-4 h-12 w-12 text-gray-400" />
          <p className="text-lg font-medium text-gray-700">No products found</p>
          <p className="mt-1 text-sm text-gray-500">Try adjusting your filters or adding products.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="w-10 px-3 py-3">
                    <input
                      type="checkbox"
                      checked={selectedProducts.length === products.length && products.length > 0}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                    Action
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                    SKU
                  </th>
                  {visibleColumns.product && (
                    <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                      Product
                    </th>
                  )}
                  {visibleColumns.category && (
                    <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                      Category
                    </th>
                  )}
                  {visibleColumns.business_location && (
                    <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                      Business Location <span className="text-primary-500">ⓘ</span>
                    </th>
                  )}
                  {visibleColumns.unit_price && (
                    <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-600">
                      Unit Purchase Price
                    </th>
                  )}
                  {visibleColumns.selling_price && (
                    <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-600">
                      Selling Price
                    </th>
                  )}
                  {visibleColumns.current_stock && (
                    <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-600">
                      Current Stock
                    </th>
                  )}
                  {visibleColumns.brand && (
                    <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                      Brand
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {products.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-3 py-3">
                      <input
                        type="checkbox"
                        checked={selectedProducts.includes(product.id)}
                        onChange={(e) => handleSelectProduct(product.id, e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                    </td>
                    <td className="px-3 py-3">
                      <div className="relative" ref={openActionMenu === product.id ? actionMenuRef : null}>
                        <button
                          onClick={() => setOpenActionMenu(openActionMenu === product.id ? null : product.id)}
                          className="inline-flex items-center gap-1 rounded border border-gray-300 bg-white px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                        >
                          <MoreVertical className="h-3.5 w-3.5" />
                        </button>
                        {openActionMenu === product.id && (
                          <div className="absolute left-0 top-full z-30 mt-1 w-44 rounded-md border border-gray-200 bg-white py-1 shadow-lg">
                            <button
                              onClick={() => {
                                setViewModalProduct(product);
                                setOpenActionMenu(null);
                              }}
                              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                            >
                              <Eye className="h-4 w-4" /> View
                            </button>
                            <button
                              onClick={() => {
                                navigate('/inventory/print-labels', { state: { productId: product.id } });
                                setOpenActionMenu(null);
                              }}
                              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                            >
                              <Tag className="h-4 w-4" /> Labels
                            </button>
                            {canEdit && (
                              <button
                                onClick={() => {
                                  navigate(`/products/add`, { state: { editProduct: product } });
                                  setOpenActionMenu(null);
                                }}
                                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                              >
                                <Edit2 className="h-4 w-4" /> Edit
                              </button>
                            )}
                            {canDelete && (
                              <button
                                onClick={() => {
                                  setDeleteModalProduct(product);
                                  setOpenActionMenu(null);
                                }}
                                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" /> Delete
                              </button>
                            )}
                            <div className="my-1 border-t border-gray-100"></div>
                            {canAddBatch && product.type === 'raw_tracked' && (
                              <button
                                onClick={() => {
                                  setBatchModalProduct(product);
                                  setOpenActionMenu(null);
                                }}
                                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                              >
                                <Plus className="h-4 w-4" /> Add Batch
                              </button>
                            )}
                            {canViewBatches && product.type === 'raw_tracked' && (
                              <button
                                onClick={() => {
                                  setBatchListModalProduct(product);
                                  setOpenActionMenu(null);
                                }}
                                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                              >
                                <Layers className="h-4 w-4" /> List Batch
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-sm font-medium text-gray-900">{product.sku}</td>
                    {visibleColumns.product && (
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-3">
                          {visibleColumns.image && (
                            <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded border border-gray-200 bg-gray-100">
                              {product.image_url ? (
                                <img
                                  src={product.image_url}
                                  alt={product.name}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-gray-400">
                                  <Package className="h-5 w-5" />
                                </div>
                              )}
                            </div>
                          )}
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {product.name}
                              {product.not_for_selling && (
                                <span className="ml-2 inline-block rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-700">
                                  Not for selling
                                </span>
                              )}
                            </p>
                            {product.brandAttribute?.name && (
                              <span className="mr-1 inline-block rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-700">
                                {product.brandAttribute.name}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                    )}
                    {visibleColumns.category && (
                      <td className="px-3 py-3 text-sm text-gray-700">
                        {product.categoryRef?.name || product.category || '—'}
                      </td>
                    )}
                    {visibleColumns.business_location && (
                      <td className="max-w-[200px] truncate px-3 py-3 text-sm text-gray-700">
                        {getBusinessLocations(product)}
                      </td>
                    )}
                    {visibleColumns.unit_price && (
                      <td className="whitespace-nowrap px-3 py-3 text-right text-sm text-gray-700">
                        {product.cost_price !== undefined && product.cost_price !== null
                          ? formatCurrency(product.cost_price)
                          : '—'}
                      </td>
                    )}
                    {visibleColumns.selling_price && (
                      <td className="whitespace-nowrap px-3 py-3 text-right text-sm font-semibold text-gray-900">
                        {formatCurrency(product.sale_price)}
                      </td>
                    )}
                    {visibleColumns.current_stock && (
                      <td className="whitespace-nowrap px-3 py-3 text-right text-sm text-gray-700">
                        {formatStock(product)}
                      </td>
                    )}
                    {visibleColumns.brand && (
                      <td className="px-3 py-3 text-sm text-gray-700">
                        {product.brandAttribute?.name || product.brand || '—'}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
              {/* Footer Totals */}
              <tfoot className="bg-gray-100">
                <tr>
                  <td colSpan={4} className="px-3 py-3 text-sm font-semibold text-gray-700">
                    Total
                  </td>
                  {visibleColumns.category && <td></td>}
                  {visibleColumns.business_location && <td></td>}
                  {visibleColumns.unit_price && (
                    <td className="whitespace-nowrap px-3 py-3 text-right text-sm font-semibold text-gray-900">
                      {formatCurrency(totals.total_purchase_price)}
                    </td>
                  )}
                  {visibleColumns.selling_price && (
                    <td className="whitespace-nowrap px-3 py-3 text-right text-sm font-semibold text-gray-900">
                      {formatCurrency(totals.total_selling_price)}
                    </td>
                  )}
                  {visibleColumns.current_stock && (
                    <td className="whitespace-nowrap px-3 py-3 text-right text-sm font-semibold text-gray-900">
                      {totals.total_stock.toLocaleString(undefined, { maximumFractionDigits: 3 })}
                    </td>
                  )}
                  {visibleColumns.brand && <td></td>}
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {pagination.total_pages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} entries
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="inline-flex items-center rounded border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            {Array.from({ length: Math.min(5, pagination.total_pages) }, (_, i) => {
              const pageNum = i + 1 + Math.max(0, page - 3);
              if (pageNum > pagination.total_pages) return null;
              return (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  className={`rounded px-3 py-1.5 text-sm font-medium ${
                    pageNum === page
                      ? 'bg-primary-600 text-white'
                      : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
            <button
              onClick={() => setPage((p) => Math.min(pagination.total_pages, p + 1))}
              disabled={page === pagination.total_pages}
              className="inline-flex items-center rounded border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      {showImportModal && (
        <ImportModal
          isOpen={showImportModal}
          onClose={() => setShowImportModal(false)}
          onSuccess={handleImportSuccess}
          entity="products"
          title="Import Products"
        />
      )}

      {showExportModal && (
        <ExportModal
          isOpen={showExportModal}
          onClose={() => setShowExportModal(false)}
          entity="products"
          title="Export Products"
        />
      )}

      {/* View Product Modal */}
      {viewModalProduct && (
        <ProductViewModal product={viewModalProduct} onClose={() => setViewModalProduct(null)} />
      )}

      {/* Add Batch Modal */}
      {batchModalProduct && (
        <ProductBatchModal
          product={batchModalProduct}
          onClose={() => setBatchModalProduct(null)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['products'] });
            setBatchModalProduct(null);
          }}
        />
      )}

      {/* Batch List Modal */}
      {batchListModalProduct && (
        <ProductBatchListModal product={batchListModalProduct} onClose={() => setBatchListModalProduct(null)} />
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-semibold text-gray-900">Delete Product</h3>
            <p className="mb-6 text-gray-600">
              Are you sure you want to delete <strong>{deleteModalProduct.name}</strong>? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteModalProduct(null)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteMutation.mutate(deleteModalProduct.id)}
                disabled={deleteMutation.isPending}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
            {deleteMutation.isError && (
              <p className="mt-4 text-sm text-red-600">
                {deleteMutation.error?.response?.data?.error || 'Failed to delete product'}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Product View Modal Component
const ProductViewModal = ({ product, onClose }) => {
  const formatCurrency = (value) => {
    const num = parseFloat(value) || 0;
    return `₦${num.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h3 className="text-lg font-semibold text-gray-900">Product Details</h3>
          <button onClick={onClose} className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-6">
          <div className="mb-6 flex items-start gap-6">
            <div className="h-24 w-24 flex-shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-gray-100">
              {product.image_url ? (
                <img src={product.image_url} alt={product.name} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-gray-400">
                  <Package className="h-10 w-10" />
                </div>
              )}
            </div>
            <div>
              <h4 className="text-xl font-semibold text-gray-900">{product.name}</h4>
              <p className="text-sm text-gray-500">SKU: {product.sku}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <span className="inline-block rounded bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700">
                  {productTypeLabels[product.type] || product.type}
                </span>
                {product.not_for_selling && (
                  <span className="inline-block rounded bg-red-100 px-2 py-1 text-xs font-medium text-red-700">
                    Not for selling
                  </span>
                )}
                {product.is_active === false && (
                  <span className="inline-block rounded bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">
                    Inactive
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-500">Category</label>
              <p className="text-sm text-gray-900">{product.categoryRef?.name || product.category || '—'}</p>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">Brand</label>
              <p className="text-sm text-gray-900">{product.brandAttribute?.name || product.brand || '—'}</p>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">Unit</label>
              <p className="text-sm text-gray-900">
                {product.unit ? `${product.unit.name} (${product.unit.abbreviation})` : product.base_unit || '—'}
              </p>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">Tax Rate</label>
              <p className="text-sm text-gray-900">
                {product.taxRate ? `${product.taxRate.name} (${product.taxRate.rate}%)` : '—'}
              </p>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">Purchase Price</label>
              <p className="text-sm text-gray-900">
                {product.cost_price !== undefined && product.cost_price !== null
                  ? formatCurrency(product.cost_price)
                  : '—'}
              </p>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">Selling Price</label>
              <p className="text-sm font-semibold text-gray-900">{formatCurrency(product.sale_price)}</p>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">Profit Margin</label>
              <p className="text-sm text-gray-900">{product.profit_margin || 0}%</p>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">Current Stock</label>
              <p className="text-sm text-gray-900">
                {parseFloat(product.current_stock || 0).toLocaleString()} {product.base_unit || ''}
              </p>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">Weight</label>
              <p className="text-sm text-gray-900">{product.weight || '—'}</p>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">Manage Stock</label>
              <p className="text-sm text-gray-900">{product.manage_stock ? 'Yes' : 'No'}</p>
            </div>
            <div className="col-span-2">
              <label className="text-xs font-medium text-gray-500">Business Locations</label>
              <p className="text-sm text-gray-900">
                {product.business_locations && product.business_locations.length > 0
                  ? product.business_locations.map((b) => b.name).join(', ')
                  : '—'}
              </p>
            </div>
          </div>
        </div>
        <div className="border-t border-gray-200 px-6 py-4">
          <button
            onClick={onClose}
            className="w-full rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// Product Batch Modal Component
const ProductBatchModal = ({ product, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    branch_id: '',
    batch_type_id: '',
    instance_code: '',
    initial_quantity: '',
    grouped: true
  });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: branchesData } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      const res = await api.get('/branches');
      return res.data.branches || res.data || [];
    }
  });

  const { data: batchTypesData } = useQuery({
    queryKey: ['batchTypes'],
    queryFn: async () => {
      const res = await api.get('/batch-settings/types');
      return res.data.batch_types || res.data || [];
    }
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.branch_id) {
      setError('Please select a branch');
      return;
    }
    if (!formData.batch_type_id) {
      setError('Please select a batch type');
      return;
    }
    if (!formData.initial_quantity || parseFloat(formData.initial_quantity) <= 0) {
      setError('Please enter a valid quantity');
      return;
    }
    if (formData.grouped && !formData.instance_code) {
      setError('Instance code is required for grouped batches');
      return;
    }

    setIsSubmitting(true);

    try {
      await api.post(`/products/${product.id}/batches`, {
        branch_id: formData.branch_id,
        batch_type_id: formData.batch_type_id,
        instance_code: formData.grouped ? formData.instance_code : null,
        initial_quantity: parseFloat(formData.initial_quantity),
        grouped: formData.grouped
      });
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create batch');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-md rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h3 className="text-lg font-semibold text-gray-900">Add Batch for {product.name}</h3>
          <button onClick={onClose} className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>
          )}

          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Branch *</label>
              <select
                value={formData.branch_id}
                onChange={(e) => setFormData({ ...formData, branch_id: e.target.value })}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                <option value="">Select Branch</option>
                {(branchesData || []).map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Batch Type *</label>
              <select
                value={formData.batch_type_id}
                onChange={(e) => setFormData({ ...formData, batch_type_id: e.target.value })}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                <option value="">Select Batch Type</option>
                {(batchTypesData || []).map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-gray-700">Grouped Batch</label>
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  checked={formData.grouped}
                  onChange={(e) => setFormData({ ...formData, grouped: e.target.checked })}
                  className="peer sr-only"
                />
                <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-primary-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none"></div>
              </label>
            </div>

            {formData.grouped && (
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Instance Code *</label>
                <input
                  type="text"
                  value={formData.instance_code}
                  onChange={(e) => setFormData({ ...formData, instance_code: e.target.value })}
                  placeholder="e.g., COIL-001"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>
            )}

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Initial Quantity ({product.base_unit}) *
              </label>
              <input
                type="number"
                step="0.001"
                value={formData.initial_quantity}
                onChange={(e) => setFormData({ ...formData, initial_quantity: e.target.value })}
                placeholder="Enter quantity"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Creating...' : 'Create Batch'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Product Batch List Modal Component
const ProductBatchListModal = ({ product, onClose }) => {
  const { data, isLoading } = useQuery({
    queryKey: ['productBatches', product.id],
    queryFn: async () => {
      const res = await api.get(`/products/${product.id}/batches`);
      return res.data;
    }
  });

  const batches = data?.batches || [];
  const summary = data?.summary || { total_batches: 0, in_stock_batches: 0, total_stock: 0 };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Batches for {product.name}</h3>
            <p className="text-sm text-gray-500">
              {summary.total_batches} batches | {summary.in_stock_batches} in stock |{' '}
              {summary.total_stock.toLocaleString()} {product.base_unit} total
            </p>
          </div>
          <button onClick={onClose} className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary-600"></div>
            </div>
          ) : batches.length === 0 ? (
            <div className="py-8 text-center text-gray-500">No batches found for this product</div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">Instance Code</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">Branch</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">Type</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-gray-600">Initial Qty</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-gray-600">Remaining</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {batches.map((batch) => (
                  <tr key={batch.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">
                      {batch.instance_code || batch.batch_identifier || '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{batch.branch?.name || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{batch.batch_type?.name || '—'}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-gray-700">
                      {parseFloat(batch.initial_quantity).toLocaleString()}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-sm font-semibold text-gray-900">
                      {parseFloat(batch.remaining_quantity).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${
                          batch.status === 'in_stock'
                            ? 'bg-green-100 text-green-700'
                            : batch.status === 'depleted'
                            ? 'bg-gray-100 text-gray-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {batch.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="border-t border-gray-200 px-6 py-4">
          <button
            onClick={onClose}
            className="w-full rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default Products;
