import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { BookOpen, Plus, Edit, Trash2, X, Calculator, CheckCircle, AlertCircle } from 'lucide-react';
import ListToolbar from '../components/common/ListToolbar';
import ExportModal from '../components/import/ExportModal';

import { sortData } from '../utils/sortUtils';
import SortIndicator from '../components/common/SortIndicator';

const Recipes = () => {
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCalculationModal, setShowCalculationModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [calculationQuantity, setCalculationQuantity] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [limit, setLimit] = useState(25);
  const [visibleColumns, setVisibleColumns] = useState({
    recipe_name: true,
    virtual_product: true,
    raw_product: true,
    conversion_factor: true,
    wastage_margin: true,
    actions: true
  });
  const [formData, setFormData] = useState({
    name: '',
    virtual_product_id: '',
    raw_product_id: '',
    conversion_factor: '',
    wastage_margin: '0'
  });
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // Sorting
  const [sortField, setSortField] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc');

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Fetch recipes
  const { data, isLoading, error } = useQuery({
    queryKey: ['recipes'],
    queryFn: async () => {
      const response = await api.get('/recipes');
      return response.data.recipes || [];
    }
  });

  // Fetch virtual products (manufactured_virtual)
  const { data: virtualProductsData } = useQuery({
    queryKey: ['virtualProducts'],
    queryFn: async () => {
      const response = await api.get('/products?type=manufactured_virtual');
      return response.data.products || [];
    }
  });

  // Fetch raw products (raw_tracked)
  const { data: rawProductsData } = useQuery({
    queryKey: ['rawProducts'],
    queryFn: async () => {
      const response = await api.get('/products?type=raw_tracked');
      return response.data.products || [];
    }
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (recipeData) => {
      const response = await api.post('/recipes', recipeData);
      return response.data;
    },
    onSuccess: () => {
      setFormSuccess('Recipe created successfully!');
      setFormError('');
      setShowCreateModal(false);
      setFormData({
        name: '',
        virtual_product_id: '',
        raw_product_id: '',
        conversion_factor: '',
        wastage_margin: '0'
      });
      queryClient.invalidateQueries(['recipes']);
      setTimeout(() => setFormSuccess(''), 3000);
    },
    onError: (err) => {
      setFormError(err.response?.data?.error || 'Failed to create recipe');
      setTimeout(() => setFormError(''), 5000);
    }
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data: recipeData }) => {
      const response = await api.put(`/recipes/${id}`, recipeData);
      return response.data;
    },
    onSuccess: () => {
      setFormSuccess('Recipe updated successfully!');
      setFormError('');
      setShowEditModal(false);
      setSelectedRecipe(null);
      queryClient.invalidateQueries(['recipes']);
      setTimeout(() => setFormSuccess(''), 3000);
    },
    onError: (err) => {
      setFormError(err.response?.data?.error || 'Failed to update recipe');
      setTimeout(() => setFormError(''), 5000);
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const response = await api.delete(`/recipes/${id}`);
      return response.data;
    },
    onSuccess: () => {
      setFormSuccess('Recipe deleted successfully!');
      setFormError('');
      queryClient.invalidateQueries(['recipes']);
      setTimeout(() => setFormSuccess(''), 3000);
    },
    onError: (err) => {
      setFormError(err.response?.data?.error || 'Failed to delete recipe');
      setTimeout(() => setFormError(''), 5000);
    }
  });

  const handleCreate = (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.name || !formData.virtual_product_id || !formData.raw_product_id || !formData.conversion_factor) {
      setFormError('All fields are required');
      return;
    }

    const conversionFactor = parseFloat(formData.conversion_factor);
    if (isNaN(conversionFactor) || conversionFactor <= 0) {
      setFormError('Conversion factor must be greater than 0');
      return;
    }

    const wastageMargin = parseFloat(formData.wastage_margin) || 0;
    if (wastageMargin < 0 || wastageMargin > 100) {
      setFormError('Wastage margin must be between 0 and 100');
      return;
    }

    createMutation.mutate({
      name: formData.name.trim(),
      virtual_product_id: formData.virtual_product_id,
      raw_product_id: formData.raw_product_id,
      conversion_factor: conversionFactor,
      wastage_margin: wastageMargin
    });
  };

  const handleEdit = (recipe) => {
    setSelectedRecipe(recipe);
    setFormData({
      name: recipe.name,
      virtual_product_id: recipe.virtual_product_id,
      raw_product_id: recipe.raw_product_id,
      conversion_factor: recipe.conversion_factor.toString(),
      wastage_margin: (recipe.wastage_margin || 0).toString()
    });
    setShowEditModal(true);
    setFormError('');
  };

  const handleUpdate = (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.name || !formData.virtual_product_id || !formData.raw_product_id || !formData.conversion_factor) {
      setFormError('All fields are required');
      return;
    }

    const conversionFactor = parseFloat(formData.conversion_factor);
    if (isNaN(conversionFactor) || conversionFactor <= 0) {
      setFormError('Conversion factor must be greater than 0');
      return;
    }

    const wastageMargin = parseFloat(formData.wastage_margin) || 0;
    if (wastageMargin < 0 || wastageMargin > 100) {
      setFormError('Wastage margin must be between 0 and 100');
      return;
    }

    updateMutation.mutate({
      id: selectedRecipe.id,
      data: {
        name: formData.name.trim(),
        virtual_product_id: formData.virtual_product_id,
        raw_product_id: formData.raw_product_id,
        conversion_factor: conversionFactor,
        wastage_margin: wastageMargin
      }
    });
  };

  const handleDelete = (recipe) => {
    if (window.confirm(`Are you sure you want to delete recipe "${recipe.name}"?`)) {
      deleteMutation.mutate(recipe.id);
    }
  };

  const handleShowCalculation = (recipe) => {
    setSelectedRecipe(recipe);
    setCalculationQuantity('');
    setShowCalculationModal(true);
  };

  const calculateRawMaterial = () => {
    if (!calculationQuantity || !selectedRecipe) return null;
    const qty = parseFloat(calculationQuantity);
    if (isNaN(qty) || qty <= 0) return null;

    const conversionFactor = parseFloat(selectedRecipe.conversion_factor);
    const wastageMargin = parseFloat(selectedRecipe.wastage_margin || 0);

    const baseRequired = qty * conversionFactor;
    const wastage = (baseRequired * wastageMargin) / 100;
    const totalRequired = baseRequired + wastage;

    return {
      quantity: qty,
      baseRequired,
      wastage,
      totalRequired
    };
  };

  const calculation = calculateRawMaterial();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-lg">
          Error loading recipes: {error.message}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Recipes Management</h1>
          <p className="text-gray-600">Manage manufacturing recipes and conversion factors</p>
        </div>
        {hasPermission('recipe_manage') && (
          <button
            onClick={() => {
              setShowCreateModal(true);
              setFormData({
                name: '',
                virtual_product_id: '',
                raw_product_id: '',
                conversion_factor: '',
                wastage_margin: '0'
              });
              setFormError('');
            }}
            className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            <Plus className="h-5 w-5" />
            <span>Add Recipe</span>
          </button>
        )}
      </div>

      {/* Success/Error Messages */}
      {formSuccess && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 text-green-800 rounded-lg flex items-center space-x-2">
          <CheckCircle className="h-5 w-5" />
          <span>{formSuccess}</span>
        </div>
      )}
      {formError && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-800 rounded-lg flex items-center space-x-2">
          <AlertCircle className="h-5 w-5" />
          <span>{formError}</span>
        </div>
      )}

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
        searchPlaceholder="Search recipes..."
      />

      {/* Export Modal */}
      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        entity="recipes"
        title="Export Recipes"
      />

      {/* Recipes Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              {visibleColumns.recipe_name && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button onClick={() => handleSort('name')} className="flex items-center gap-1">
                    Recipe Name
                    <SortIndicator field="name" sortField={sortField} sortDirection={sortDirection} />
                  </button>
                </th>
              )}
              {visibleColumns.virtual_product && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button onClick={() => handleSort('virtual_product.name')} className="flex items-center gap-1">
                    Virtual Product
                    <SortIndicator field="virtual_product.name" sortField={sortField} sortDirection={sortDirection} />
                  </button>
                </th>
              )}
              {visibleColumns.raw_product && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button onClick={() => handleSort('raw_product.name')} className="flex items-center gap-1">
                    Raw Product
                    <SortIndicator field="raw_product.name" sortField={sortField} sortDirection={sortDirection} />
                  </button>
                </th>
              )}
              {visibleColumns.conversion_factor && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button onClick={() => handleSort('conversion_factor')} className="flex items-center gap-1">
                    Conversion Factor
                    <SortIndicator field="conversion_factor" sortField={sortField} sortDirection={sortDirection} />
                  </button>
                </th>
              )}
              {visibleColumns.wastage_margin && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button onClick={() => handleSort('wastage_margin')} className="flex items-center gap-1">
                    Wastage Margin
                    <SortIndicator field="wastage_margin" sortField={sortField} sortDirection={sortDirection} />
                  </button>
                </th>
              )}
              {visibleColumns.actions && hasPermission('recipe_manage') && (
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {(data || [])
              .filter(recipe => {
                if (!searchTerm) return true;
                const search = searchTerm.toLowerCase();
                return recipe.name?.toLowerCase().includes(search) ||
                  recipe.virtual_product?.name?.toLowerCase().includes(search) ||
                  recipe.raw_product?.name?.toLowerCase().includes(search);
              })
              .slice(0, limit === -1 ? undefined : limit)
              .map((recipe) => (
                <tr key={recipe.id} className="hover:bg-gray-50">
                  {visibleColumns.recipe_name && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{recipe.name}</div>
                    </td>
                  )}
                  {visibleColumns.virtual_product && (
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{recipe.virtual_product?.name || 'N/A'}</div>
                      <div className="text-xs text-gray-500">{recipe.virtual_product?.sku || ''}</div>
                    </td>
                  )}
                  {visibleColumns.raw_product && (
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{recipe.raw_product?.name || 'N/A'}</div>
                      <div className="text-xs text-gray-500">{recipe.raw_product?.sku || ''}</div>
                    </td>
                  )}
                  {visibleColumns.conversion_factor && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        1 {recipe.virtual_product?.base_unit || 'unit'} = {recipe.conversion_factor} {recipe.raw_product?.base_unit || 'unit'}
                      </div>
                    </td>
                  )}
                  {visibleColumns.wastage_margin && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{recipe.wastage_margin || 0}%</div>
                    </td>
                  )}
                  {visibleColumns.actions && hasPermission('recipe_manage') && (
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => handleShowCalculation(recipe)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Calculate raw material"
                        >
                          <Calculator className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleEdit(recipe)}
                          className="text-primary-600 hover:text-primary-900"
                        >
                          <Edit className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(recipe)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
          </tbody>
        </table>
        {data?.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No recipes found
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Add Recipe</h2>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setFormError('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Recipe Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500"
                    required
                    placeholder="e.g., Longspan to Coil"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Virtual Product (Manufactured) *
                  </label>
                  <select
                    value={formData.virtual_product_id}
                    onChange={(e) => setFormData({ ...formData, virtual_product_id: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500"
                    required
                  >
                    <option value="">Select Virtual Product</option>
                    {virtualProductsData?.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name} ({product.sku})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Raw Product (Tracked) *
                  </label>
                  <select
                    value={formData.raw_product_id}
                    onChange={(e) => setFormData({ ...formData, raw_product_id: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500"
                    required
                  >
                    <option value="">Select Raw Product</option>
                    {rawProductsData?.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name} ({product.sku})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Conversion Factor *
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    value={formData.conversion_factor}
                    onChange={(e) => setFormData({ ...formData, conversion_factor: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500"
                    required
                    placeholder="e.g., 0.8 (1 Meter = 0.8 KG)"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    How many units of raw product per unit of virtual product
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Wastage Margin (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={formData.wastage_margin}
                    onChange={(e) => setFormData({ ...formData, wastage_margin: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Additional percentage to account for wastage (0-100)
                  </p>
                </div>
              </div>
              <div className="mt-6 flex space-x-3">
                <button
                  type="submit"
                  className="flex-1 bg-primary-600 text-white py-2 rounded-lg hover:bg-primary-700"
                >
                  Create Recipe
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setFormError('');
                  }}
                  className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedRecipe && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Edit Recipe</h2>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedRecipe(null);
                  setFormError('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <form onSubmit={handleUpdate}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Recipe Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Virtual Product (Manufactured) *
                  </label>
                  <select
                    value={formData.virtual_product_id}
                    onChange={(e) => setFormData({ ...formData, virtual_product_id: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500"
                    required
                  >
                    <option value="">Select Virtual Product</option>
                    {virtualProductsData?.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name} ({product.sku})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Raw Product (Tracked) *
                  </label>
                  <select
                    value={formData.raw_product_id}
                    onChange={(e) => setFormData({ ...formData, raw_product_id: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500"
                    required
                  >
                    <option value="">Select Raw Product</option>
                    {rawProductsData?.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name} ({product.sku})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Conversion Factor *
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    value={formData.conversion_factor}
                    onChange={(e) => setFormData({ ...formData, conversion_factor: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Wastage Margin (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={formData.wastage_margin}
                    onChange={(e) => setFormData({ ...formData, wastage_margin: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
              <div className="mt-6 flex space-x-3">
                <button
                  type="submit"
                  className="flex-1 bg-primary-600 text-white py-2 rounded-lg hover:bg-primary-700"
                >
                  Update Recipe
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedRecipe(null);
                    setFormError('');
                  }}
                  className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Calculation Modal */}
      {showCalculationModal && selectedRecipe && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Calculate Raw Material</h2>
              <button
                onClick={() => {
                  setShowCalculationModal(false);
                  setSelectedRecipe(null);
                  setCalculationQuantity('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quantity of {selectedRecipe.virtual_product?.name || 'Virtual Product'}
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={calculationQuantity}
                  onChange={(e) => setCalculationQuantity(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500"
                  placeholder="Enter quantity"
                />
              </div>
              {calculation && (
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">{calculation.quantity}</span> {selectedRecipe.virtual_product?.base_unit || 'units'} of {selectedRecipe.virtual_product?.name} will require:
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Base requirement:</span>
                      <span className="font-medium">{calculation.baseRequired.toFixed(3)} {selectedRecipe.raw_product?.base_unit || 'units'}</span>
                    </div>
                    {selectedRecipe.wastage_margin > 0 && (
                      <div className="flex justify-between text-gray-600">
                        <span>Wastage ({selectedRecipe.wastage_margin}%):</span>
                        <span>+{calculation.wastage.toFixed(3)} {selectedRecipe.raw_product?.base_unit || 'units'}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-primary-600 border-t border-gray-300 pt-2 mt-2">
                      <span>Total Required:</span>
                      <span>{calculation.totalRequired.toFixed(3)} {selectedRecipe.raw_product?.base_unit || 'units'}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="mt-6">
              <button
                onClick={() => {
                  setShowCalculationModal(false);
                  setSelectedRecipe(null);
                  setCalculationQuantity('');
                }}
                className="w-full bg-gray-200 text-gray-800 py-2 rounded-lg hover:bg-gray-300"
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

export default Recipes;










