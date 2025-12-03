import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { Package, Plus, ArrowRightLeft, Edit, Trash2, Search, Filter } from 'lucide-react';
import ListToolbar from '../components/common/ListToolbar';
import ExportModal from '../components/import/ExportModal';
import AttributeRenderer from '../components/AttributeRenderer';
import SlittingModal from '../components/SlittingModal';

const InventoryBatches = () => {
  const { hasPermission, user } = useAuth();
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showSlittingModal, setShowSlittingModal] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [batchTypeFilter, setBatchTypeFilter] = useState('all');
  const [limit, setLimit] = useState(25);
  const [visibleColumns, setVisibleColumns] = useState({
    identifier: true,
    type: true,
    product: true,
    branch: true,
    initial_qty: true,
    remaining: true,
    status: true,
    actions: true
  });
  const [formData, setFormData] = useState({
    product_id: '',
    branch_id: user?.branch_id || '',
    category_id: '',
    instance_code: '',
    batch_type_id: '',
    grouped: true,
    batch_identifier: '',
    initial_quantity: '',
    attribute_data: {}
  });

  // Fetch batch types
  const { data: batchTypes } = useQuery({
    queryKey: ['batchTypes'],
    queryFn: async () => {
      const response = await api.get('/settings/batches/types');
      return response.data.batch_types || [];
    },
  });

  // Fetch inventory batches
  const { data, isLoading } = useQuery({
    queryKey: ['inventoryBatches', statusFilter, batchTypeFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (batchTypeFilter !== 'all') params.append('batch_type_id', batchTypeFilter);
      const response = await api.get(`/inventory/batches?${params.toString()}`);
      return response.data.batches || [];
    },
  });

  // Fetch products (raw_tracked only)
  const { data: products } = useQuery({
    queryKey: ['products', 'raw_tracked'],
    queryFn: async () => {
      const response = await api.get('/products?type=raw_tracked');
      return response.data.products || [];
    },
  });

  // Fetch branches
  const { data: branches } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      const response = await api.get('/branches');
      return response.data.branches || [];
    },
  });

  const branchScope = user?.branch_id || null;

  // Fetch categories scoped by branch
  const { data: categories } = useQuery({
    queryKey: ['categories', branchScope || 'global'],
    queryFn: async () => {
      const response = await api.get('/categories', {
        params: {
          branch_id: branchScope || undefined,
          include_global: 'true'
        }
      });
      return response.data.categories || [];
    },
  });

  // Fetch batch types for selected category
  const { data: categoryBatchTypes } = useQuery({
    queryKey: ['categoryBatchTypes', formData.category_id],
    queryFn: async () => {
      if (!formData.category_id) return [];
      const response = await api.get(`/settings/batches/types/category/${formData.category_id}`);
      return response.data.batch_types || [];
    },
    enabled: !!formData.category_id,
  });

  // Fetch selected category details (for attribute schema)
  const { data: selectedCategory } = useQuery({
    queryKey: ['category', formData.category_id],
    queryFn: async () => {
      if (!formData.category_id) return null;
      const response = await api.get(`/categories/${formData.category_id}`);
      return response.data.category || null;
    },
    enabled: !!formData.category_id
  });

  // Fetch selected product details (for default attribute values)
  const { data: selectedProduct } = useQuery({
    queryKey: ['product', formData.product_id],
    queryFn: async () => {
      if (!formData.product_id) return null;
      const response = await api.get(`/products/${formData.product_id}`);
      return response.data.product || null;
    },
    enabled: !!formData.product_id
  });

  // Fetch manufacturing settings (for gauge_enabled_categories)
  const { data: manufacturingSettings } = useQuery({
    queryKey: ['manufacturingSettings', branchScope || 'global'],
    queryFn: async () => {
      const response = await api.get('/settings', {
        params: {
          category: 'manufacturing',
          branch_id: branchScope || undefined
        }
      });
      return response.data.settings || {};
    }
  });

  // Helper function to normalize category name
  const normalizeCategoryName = (name) => {
    return name?.toLowerCase().replace(/\s+/g, '_') || '';
  };

  // Check if selected product's category is enabled for gauge input
  const isGaugeEnabledForCategory = () => {
    if (!manufacturingSettings?.gauge_enabled_categories?.value) {
      return false;
    }
    const enabledCategories = manufacturingSettings.gauge_enabled_categories.value || [];
    if (!Array.isArray(enabledCategories)) {
      return false;
    }
    // Check product's category first, then fall back to selected category
    const categoryName = selectedProduct?.categoryRef?.name || selectedCategory?.name || '';
    if (!categoryName) {
      return false;
    }
    const normalizedName = normalizeCategoryName(categoryName);
    return enabledCategories.includes(normalizedName);
  };

  // Update attribute_data when product or category changes, with atomic gauge_mm cleanup
  useEffect(() => {
    setFormData(prev => {
      const currentCategoryName = selectedProduct?.categoryRef?.name || selectedCategory?.name || '';
      let updatedAttributeData = { ...prev.attribute_data };
      
      // Merge product defaults if available
      if (selectedProduct?.attribute_default_values) {
        updatedAttributeData = { ...selectedProduct.attribute_default_values, ...updatedAttributeData };
      }
      
      // Check if category is gauge-enabled and remove gauge_mm if not
      if (currentCategoryName) {
        const normalizedName = normalizeCategoryName(currentCategoryName);
        const enabledCategories = manufacturingSettings?.gauge_enabled_categories?.value || [];
        const isEnabled = Array.isArray(enabledCategories) && enabledCategories.includes(normalizedName);
        
        if (!isEnabled && updatedAttributeData.gauge_mm !== undefined) {
          const { gauge_mm, ...restAttributeData } = updatedAttributeData;
          updatedAttributeData = restAttributeData;
        }
      }
      
      // Only update if attribute_data actually changed (avoid unnecessary re-renders)
      if (JSON.stringify(prev.attribute_data) === JSON.stringify(updatedAttributeData)) {
        return prev;
      }
      
      return {
        ...prev,
        attribute_data: updatedAttributeData
      };
    });
  }, [formData.product_id, selectedProduct?.categoryRef?.name, selectedProduct?.attribute_default_values, selectedCategory?.name, selectedCategory?.attribute_schema, manufacturingSettings?.gauge_enabled_categories?.value]);

  // Create batch mutation
  const createMutation = useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/inventory/batches', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventoryBatches'] });
      setShowCreateModal(false);
      resetForm();
      alert('Batch created successfully!');
    },
    onError: (error) => {
      alert(error.response?.data?.error || 'Failed to create batch');
    },
  });

  // Update batch mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const response = await api.put(`/inventory/batches/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventoryBatches'] });
      setShowEditModal(false);
      setSelectedBatch(null);
      alert('Batch updated successfully!');
    },
    onError: (error) => {
      alert(error.response?.data?.error || 'Failed to update batch');
    },
  });

  // Delete batch mutation
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const response = await api.delete(`/inventory/batches/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventoryBatches'] });
      alert('Batch deleted successfully!');
    },
    onError: (error) => {
      alert(error.response?.data?.error || 'Failed to delete batch');
    },
  });

  // Transfer mutation
  const transferMutation = useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/inventory/stock-transfer', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventoryBatches'] });
      setShowTransferModal(false);
      setSelectedBatch(null);
      alert('Transfer completed successfully!');
    },
    onError: (error) => {
      alert(error.response?.data?.error || 'Failed to transfer batch');
    },
  });

  // Adjust mutation
  const adjustMutation = useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/inventory/stock-adjustment', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventoryBatches'] });
      setShowAdjustModal(false);
      setSelectedBatch(null);
      alert('Stock adjusted successfully!');
    },
    onError: (error) => {
      alert(error.response?.data?.error || 'Failed to adjust stock');
    },
  });

  const resetForm = () => {
    setFormData({
      product_id: '',
      branch_id: user?.branch_id || '',
      category_id: '',
      instance_code: '',
      batch_type_id: '',
      grouped: true,
      batch_identifier: '',
      initial_quantity: '',
      attribute_data: {}
    });
  };

  const handleCreateSubmit = (e) => {
    e.preventDefault();
    const payload = {
      ...formData,
      initial_quantity: parseFloat(formData.initial_quantity),
      batch_identifier: formData.grouped ? (formData.batch_identifier || formData.instance_code) : null,
      instance_code: formData.grouped ? formData.instance_code : null
    };
    createMutation.mutate(payload);
  };

  const handleEditSubmit = (e) => {
    e.preventDefault();
    const payload = {
      ...formData,
      batch_identifier: formData.grouped ? (formData.batch_identifier || formData.instance_code) : null,
      instance_code: formData.grouped ? formData.instance_code : null
    };
    updateMutation.mutate({ id: selectedBatch.id, data: payload });
  };

  const handleEdit = (batch) => {
    setSelectedBatch(batch);
    setFormData({
      product_id: batch.product_id,
      branch_id: batch.branch_id,
      category_id: batch.category_id || '',
      instance_code: batch.instance_code || '',
      batch_type_id: batch.batch_type_id || batch.batch_type?.id || '',
      grouped: batch.grouped,
      batch_identifier: batch.batch_identifier || '',
      initial_quantity: batch.initial_quantity,
      attribute_data: batch.attribute_data || {}
    });
    setShowEditModal(true);
  };

  const handleDelete = (batch) => {
    if (window.confirm(`Are you sure you want to delete batch ${batch.instance_code || batch.batch_identifier || batch.id}?`)) {
      deleteMutation.mutate(batch.id);
    }
  };

  const handleTransfer = (batch) => {
    setSelectedBatch(batch);
    setShowTransferModal(true);
  };

  const handleAdjust = (batch) => {
    setSelectedBatch(batch);
    setShowAdjustModal(true);
  };

  const handleSlitting = (batch) => {
    setSelectedBatch(batch);
    setShowSlittingModal(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const batches = data || [];
  
  // Filter batches by search term
  const filteredBatches = batches.filter(batch => {
    const matchesSearch = !searchTerm || 
      batch.instance_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      batch.batch_identifier?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      batch.product?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      batch.product?.sku?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Inventory Batches</h1>
          <p className="text-gray-600 mt-2">Manage inventory batches (Coils, Pallets, Cartons, Loose)</p>
        </div>
        {hasPermission('batch_create', 'stock_add_opening') && (
          <button
            onClick={() => {
              resetForm();
              setShowCreateModal(true);
            }}
            className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Plus className="h-5 w-5" />
            <span>Create Batch</span>
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
        searchPlaceholder="Search batches..."
      >
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="all">All Status</option>
          <option value="in_stock">In Stock</option>
          <option value="depleted">Depleted</option>
          <option value="scrapped">Scrapped</option>
        </select>
        <select
          value={batchTypeFilter}
          onChange={(e) => setBatchTypeFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="all">All Types</option>
          {batchTypes?.filter(bt => bt.is_active).map((type) => (
            <option key={type.id} value={type.id}>
              {type.name}
            </option>
          ))}
        </select>
      </ListToolbar>

      {/* Export Modal */}
      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        entity="inventory-batches"
        title="Export Inventory Batches"
      />

      {/* Batches Table */}
      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {visibleColumns.identifier && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Identifier
                </th>
              )}
              {visibleColumns.type && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
              )}
              {visibleColumns.product && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Product
                </th>
              )}
              {visibleColumns.branch && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Branch
                </th>
              )}
              {visibleColumns.initial_qty && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Initial Qty
                </th>
              )}
              {visibleColumns.remaining && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Remaining
                </th>
              )}
              {visibleColumns.status && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
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
            {filteredBatches.length === 0 ? (
              <tr>
                <td colSpan="8" className="px-6 py-8 text-center text-gray-500">
                  No batches found
                </td>
              </tr>
            ) : (
              filteredBatches.slice(0, limit === -1 ? undefined : limit).map((batch) => (
                <tr key={batch.id} className="hover:bg-gray-50">
                  {visibleColumns.identifier && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {batch.instance_code || batch.batch_identifier || 'N/A'}
                      </div>
                    </td>
                  )}
                  {visibleColumns.type && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                        {batch.batch_type?.name || 'N/A'}
                      </span>
                    </td>
                  )}
                  {visibleColumns.product && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{batch.product?.name}</div>
                      <div className="text-sm text-gray-500">{batch.product?.sku}</div>
                    </td>
                  )}
                  {visibleColumns.branch && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {batch.branch?.name}
                    </td>
                  )}
                  {visibleColumns.initial_qty && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {parseFloat(batch.initial_quantity).toFixed(3)} {batch.product?.base_unit}
                    </td>
                  )}
                  {visibleColumns.remaining && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {parseFloat(batch.remaining_quantity).toFixed(3)} {batch.product?.base_unit}
                    </td>
                  )}
                  {visibleColumns.status && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          batch.status === 'in_stock'
                            ? 'bg-green-100 text-green-800'
                            : batch.status === 'depleted'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {batch.status}
                      </span>
                    </td>
                  )}
                  {visibleColumns.actions && (
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        {hasPermission('stock_transfer_init') && (
                          <button
                            onClick={() => handleTransfer(batch)}
                            className="text-blue-600 hover:text-blue-900"
                            title="Transfer"
                          >
                            <ArrowRightLeft className="h-4 w-4" />
                          </button>
                        )}
                        {hasPermission('batch_create') && batch.batch_type?.name === 'Loose' && (
                          <button
                            onClick={() => handleSlitting(batch)}
                            className="text-green-600 hover:text-green-900"
                            title="Slitting (Convert to Coil)"
                          >
                            <Package className="h-4 w-4" />
                          </button>
                        )}
                        {hasPermission('batch_edit', 'stock_adjust') && (
                          <button
                            onClick={() => handleEdit(batch)}
                            className="text-orange-600 hover:text-orange-900"
                            title="Edit"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                        )}
                        {hasPermission('stock_adjust') && (
                          <button
                            onClick={() => handleAdjust(batch)}
                            className="text-purple-600 hover:text-purple-900"
                            title="Adjust"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                        )}
                        {hasPermission('batch_delete') && (
                          <button
                            onClick={() => handleDelete(batch)}
                            className="text-red-600 hover:text-red-900"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
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
      </div>

      {/* Create Batch Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Create Inventory Batch</h2>
            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Product *
                  </label>
                  <select
                    required
                    value={formData.product_id}
                    onChange={(e) => {
                      setFormData({ ...formData, product_id: e.target.value });
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Select Product</option>
                    {products?.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name} ({product.sku})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Branch *
                  </label>
                  <select
                    required
                    value={formData.branch_id}
                    onChange={(e) => setFormData({ ...formData, branch_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Select Branch</option>
                    {branches?.map((branch) => (
                      <option key={branch.id} value={branch.id}>
                        {branch.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  value={formData.category_id}
                  onChange={(e) => {
                    setFormData({ 
                      ...formData, 
                      category_id: e.target.value,
                      batch_type_id: '' // Reset batch type when category changes
                    });
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Select Category (Optional)</option>
                  {categories?.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Batch Type *
                  </label>
                  <select
                    required
                    value={formData.batch_type_id}
                    onChange={(e) => setFormData({ ...formData, batch_type_id: e.target.value })}
                    disabled={!formData.category_id && !batchTypes?.length}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    <option value="">
                      {formData.category_id 
                        ? (categoryBatchTypes?.length > 0 
                          ? 'Select Batch Type' 
                          : 'No batch types assigned to this category')
                        : 'Select Category first'}
                    </option>
                    {(categoryBatchTypes || batchTypes?.filter(bt => bt.is_active))?.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.name}
                      </option>
                    ))}
                  </select>
                  {formData.category_id && categoryBatchTypes?.length === 0 && (
                    <p className="text-xs text-red-600 mt-1">
                      No batch types assigned to this category. Assign them in Batch Settings.
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Grouped
                  </label>
                  <select
                    value={formData.grouped}
                    onChange={(e) => setFormData({ ...formData, grouped: e.target.value === 'true' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value={true}>Yes</option>
                    <option value={false}>No</option>
                  </select>
                </div>
              </div>
              {formData.grouped && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Instance Code *
                    </label>
                    <input
                      type="text"
                      required={formData.grouped}
                      value={formData.instance_code}
                      onChange={(e) => setFormData({ ...formData, instance_code: e.target.value })}
                      placeholder="e.g., COIL-001"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Batch Identifier
                    </label>
                    <input
                      type="text"
                      value={formData.batch_identifier}
                      onChange={(e) => setFormData({ ...formData, batch_identifier: e.target.value })}
                      placeholder="e.g., Pallet #504"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Initial Quantity *
                </label>
                <input
                  type="number"
                  required
                  step="0.001"
                  min="0"
                  value={formData.initial_quantity}
                  onChange={(e) => setFormData({ ...formData, initial_quantity: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              {/* Gauge Input - Only show if category is enabled for gauge input */}
              {isGaugeEnabledForCategory() && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Gauge (mm) *
                  </label>
                  <input
                    type="number"
                    required
                    step="0.01"
                    min="0.10"
                    max="1.00"
                    value={formData.attribute_data?.gauge_mm || ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      const numValue = value === '' ? '' : parseFloat(value);
                      setFormData(prev => ({
                        ...prev,
                        attribute_data: {
                          ...prev.attribute_data,
                          gauge_mm: value === '' ? undefined : (isNaN(numValue) ? value : Math.round(numValue * 100) / 100)
                        }
                      }));
                    }}
                    placeholder="0.10 - 1.00"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Enter a value between 0.10 and 1.00 mm (2 decimal places)</p>
                </div>
              )}

              {/* Dynamic Attributes Section for Create */}
              {selectedCategory?.attribute_schema && selectedCategory.attribute_schema.length > 0 && (() => {
                // Filter out gauge_mm from schema to prevent duplicate input (gauge is handled separately above)
                const filteredSchema = selectedCategory.attribute_schema.filter(attr => attr.name !== 'gauge_mm');
                
                if (filteredSchema.length === 0) return null;
                
                return (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <h4 className="text-sm font-semibold text-gray-900 mb-4">Batch Attributes</h4>
                    <AttributeRenderer
                      schema={filteredSchema}
                      values={formData.attribute_data || {}}
                      onChange={(newValues) => setFormData({ ...formData, attribute_data: newValues })}
                      defaultValues={selectedProduct?.attribute_default_values || {}}
                      className="grid grid-cols-2 gap-4"
                    />
                  </div>
                );
              })()}

              <div className="flex space-x-4 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    resetForm();
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {createMutation.isPending ? 'Creating...' : 'Create Batch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Batch Modal */}
      {showEditModal && selectedBatch && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Edit Inventory Batch</h2>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  value={formData.category_id}
                  onChange={(e) => {
                    setFormData({ 
                      ...formData, 
                      category_id: e.target.value,
                      batch_type_id: '' // Reset batch type when category changes
                    });
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Select Category (Optional)</option>
                  {categories?.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Batch Type *
                </label>
                <select
                  required
                  value={formData.batch_type_id}
                  onChange={(e) => setFormData({ ...formData, batch_type_id: e.target.value })}
                  disabled={!formData.category_id && !batchTypes?.length}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  <option value="">
                    {formData.category_id 
                      ? (categoryBatchTypes?.length > 0 
                        ? 'Select Batch Type' 
                        : 'No batch types assigned to this category')
                      : 'Select Category first'}
                  </option>
                  {(categoryBatchTypes || batchTypes?.filter(bt => bt.is_active))?.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Grouped
                </label>
                <select
                  value={formData.grouped}
                  onChange={(e) => setFormData({ ...formData, grouped: e.target.value === 'true' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value={true}>Yes</option>
                  <option value={false}>No</option>
                </select>
              </div>
              {formData.grouped && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Instance Code *
                    </label>
                    <input
                      type="text"
                      required={formData.grouped}
                      value={formData.instance_code}
                      onChange={(e) => setFormData({ ...formData, instance_code: e.target.value })}
                      placeholder="e.g., COIL-001"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Batch Identifier
                    </label>
                    <input
                      type="text"
                      value={formData.batch_identifier}
                      onChange={(e) => setFormData({ ...formData, batch_identifier: e.target.value })}
                      placeholder="e.g., Pallet #504"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>
              )}

              {/* Gauge Input - Only show if category is enabled for gauge input */}
              {isGaugeEnabledForCategory() && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Gauge (mm) *
                  </label>
                  <input
                    type="number"
                    required
                    step="0.01"
                    min="0.10"
                    max="1.00"
                    value={formData.attribute_data?.gauge_mm || ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      const numValue = value === '' ? '' : parseFloat(value);
                      setFormData(prev => ({
                        ...prev,
                        attribute_data: {
                          ...prev.attribute_data,
                          gauge_mm: value === '' ? undefined : (isNaN(numValue) ? value : Math.round(numValue * 100) / 100)
                        }
                      }));
                    }}
                    placeholder="0.10 - 1.00"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Enter a value between 0.10 and 1.00 mm (2 decimal places)</p>
                </div>
              )}

              {/* Dynamic Attributes Section for Edit */}
              {selectedCategory?.attribute_schema && selectedCategory.attribute_schema.length > 0 && (() => {
                // Filter out gauge_mm from schema to prevent duplicate input (gauge is handled separately above)
                const filteredSchema = selectedCategory.attribute_schema.filter(attr => attr.name !== 'gauge_mm');
                
                if (filteredSchema.length === 0) return null;
                
                return (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <h4 className="text-sm font-semibold text-gray-900 mb-4">Batch Attributes</h4>
                    <AttributeRenderer
                      schema={filteredSchema}
                      values={formData.attribute_data || {}}
                      onChange={(newValues) => setFormData({ ...formData, attribute_data: newValues })}
                      defaultValues={selectedProduct?.attribute_default_values || {}}
                      className="grid grid-cols-2 gap-4"
                    />
                  </div>
                );
              })()}
              <div className="flex space-x-4 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedBatch(null);
                    resetForm();
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {updateMutation.isPending ? 'Updating...' : 'Update Batch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transfer and Adjust Modals - These would use existing components or similar structure */}
      {showTransferModal && selectedBatch && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Transfer Batch</h2>
            <p className="text-gray-600 mb-4">Transfer functionality will be implemented with TransferModal component</p>
            <button
              onClick={() => {
                setShowTransferModal(false);
                setSelectedBatch(null);
              }}
              className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {showAdjustModal && selectedBatch && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Adjust Stock</h2>
            <p className="text-gray-600 mb-4">Adjust functionality will be implemented with AdjustModal component</p>
            <button
              onClick={() => {
                setShowAdjustModal(false);
                setSelectedBatch(null);
              }}
              className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Slitting Modal */}
      <SlittingModal
        isOpen={showSlittingModal}
        onClose={() => {
          setShowSlittingModal(false);
          setSelectedBatch(null);
        }}
        sourceBatch={selectedBatch}
      />
    </div>
  );
};

export default InventoryBatches;

