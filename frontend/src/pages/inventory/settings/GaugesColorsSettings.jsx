import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../../context/AuthContext';
import api from '../../../utils/api';
import { Settings, Plus, Edit, Trash2, X, Gauge, Palette, Check } from 'lucide-react';

const GaugesColorsSettings = () => {
  const { hasPermission, user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('gauges');
  const [showModal, setShowModal] = useState(false);
  const [editingValue, setEditingValue] = useState(null);
  // formData for colors/design: { name: '', category_ids: [] }
  const [formData, setFormData] = useState({ name: '', category_ids: [] });
  const branchScope = user?.branch_id || null;
  const canManageSettings = hasPermission('settings_manage');
  const manufacturingSettingsKey = ['manufacturingSettings', branchScope || 'global'];

  // Fetch manufacturing settings
  const { data: settingsData, isLoading: settingsLoading } = useQuery({
    queryKey: manufacturingSettingsKey,
    queryFn: async () => {
      const response = await api.get('/settings', {
        params: {
          category: 'manufacturing',
          branch_id: branchScope || undefined
        }
      });
      return response.data.settings || {};
    },
    enabled: canManageSettings
  });

  // Fetch categories - enabled for all tabs now as we need them for assignment
  const { data: categories, isLoading: categoriesLoading } = useQuery({
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
    enabled: canManageSettings
  });

  // Update setting mutation
  const updateSettingMutation = useMutation({
    mutationFn: async ({ key, value }) => {
      const response = await api.put(`/settings/${key}`, { value, branch_id: branchScope || null });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: manufacturingSettingsKey });
      if (activeTab !== 'gauges') {
        closeModal();
      }
    },
    onError: (error) => {
      alert(error.response?.data?.error || 'Failed to update setting');
    }
  });

  const getSettingValue = (key) => {
    return settingsData?.[key]?.value || [];
  };

  // --- Gauges Tab Logic ---

  // Get enabled categories for gauge setting
  const getEnabledCategoriesForGauges = () => {
    const enabledCategories = getSettingValue('gauge_enabled_categories') || [];
    return Array.isArray(enabledCategories) ? enabledCategories : [];
  };

  // Normalize category name to match setting format (lowercase, spaces to underscores)
  const normalizeCategoryName = (name) => {
    return name.toLowerCase().replace(/\s+/g, '_');
  };

  // Check if a category is enabled for gauge input
  const isCategoryEnabledForGauges = (categoryName) => {
    const normalizedName = normalizeCategoryName(categoryName);
    return getEnabledCategoriesForGauges().includes(normalizedName);
  };

  // Handle category toggle for gauge enabled categories
  const handleGaugeCategoryToggle = (categoryName) => {
    if (!hasPermission('settings_manage')) return;

    const normalizedName = normalizeCategoryName(categoryName);
    const enabledCategories = getEnabledCategoriesForGauges();
    const newEnabledCategories = enabledCategories.includes(normalizedName)
      ? enabledCategories.filter(cat => cat !== normalizedName)
      : [...enabledCategories, normalizedName];

    updateSettingMutation.mutate({
      key: 'gauge_enabled_categories',
      value: newEnabledCategories
    });
  };

  // --- Colors & Design Tab Logic ---

  const getSettingKey = () => {
    const keyMap = {
      'colors': 'manufacturing_colors',
      'design': 'manufacturing_design'
    };
    return keyMap[activeTab] || null;
  };

  const getTabLabel = () => {
    const labels = {
      'gauges': 'Gauges',
      'colors': 'Colors',
      'design': 'Design'
    };
    return labels[activeTab] || 'Gauges';
  };

  const openModal = (item = null, isEdit = false) => {
    setEditingValue(isEdit ? item : null);
    if (isEdit && item) {
      // item structure: { name: "Red", category_ids: ["id1", "id2"] }
      // Ensure category_ids is an array
      setFormData({
        name: item.name || '',
        category_ids: Array.isArray(item.category_ids) ? item.category_ids : []
      });
    } else {
      setFormData({ name: '', category_ids: [] });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setEditingValue(null);
    setFormData({ name: '', category_ids: [] });
    setShowModal(false);
  };

  const handleModalCategoryToggle = (categoryId) => {
    setFormData(prev => {
      const currentIds = prev.category_ids || [];
      const newIds = currentIds.includes(categoryId)
        ? currentIds.filter(id => id !== categoryId)
        : [...currentIds, categoryId];
      return { ...prev, category_ids: newIds };
    });
  };

  const handleAdd = () => {
    const { name, category_ids } = formData;
    if (!name.trim()) {
      alert('Please enter a name');
      return;
    }

    const currentValues = getSettingValue(getSettingKey());
    // New structure: Object with name and category_ids
    const newItem = { name: name.trim(), category_ids };

    // Check for duplicates
    if (currentValues.some(item => item.name.toLowerCase() === newItem.name.toLowerCase())) {
      alert('This name already exists');
      return;
    }

    const newValues = [...currentValues, newItem];

    updateSettingMutation.mutate({
      key: getSettingKey(),
      value: newValues
    });
  };

  const handleEdit = () => {
    const { name, category_ids } = formData;
    if (!name.trim()) {
      alert('Please enter a name');
      return;
    }

    const currentValues = getSettingValue(getSettingKey());
    // Find index by original object ref if possible, or by some ID? 
    // Since we don't have IDs, we have to rely on the index in the array or the original value.
    // simplistic approach: find index of editingValue
    const index = currentValues.findIndex(v => v === editingValue || (v.name === editingValue.name && JSON.stringify(v.category_ids) === JSON.stringify(editingValue.category_ids)));

    if (index === -1) return;

    // Check for duplicates (excluding self)
    if (currentValues.some((item, idx) => idx !== index && item.name.toLowerCase() === name.trim().toLowerCase())) {
      alert('This name already exists');
      return;
    }

    const newValues = [...currentValues];
    newValues[index] = { name: name.trim(), category_ids };

    updateSettingMutation.mutate({
      key: getSettingKey(),
      value: newValues
    });
  };

  const handleDelete = (item) => {
    if (!window.confirm(`Delete "${item.name}"?`)) return;

    const currentValues = getSettingValue(getSettingKey());
    const newValues = currentValues.filter(v => v !== item);

    updateSettingMutation.mutate({
      key: getSettingKey(),
      value: newValues
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingValue) {
      handleEdit();
    } else {
      handleAdd();
    }
  };

  // Helper to get category names for display
  const getCategoryNames = (ids) => {
    if (!ids || !categories) return [];
    return ids
      .map(id => categories.find(c => c.id === id)?.name)
      .filter(Boolean);
  };

  // Only compute currentValues for non-gauges tabs
  const currentValues = activeTab !== 'gauges' ? getSettingValue(getSettingKey()) : [];

  if (!canManageSettings) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-lg">
          You do not have permission to manage gauge settings.
        </div>
      </div>
    );
  }

  if (settingsLoading || categoriesLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Gauges & Colors Settings</h1>
        <p className="text-gray-600 mt-2">Manage product attributes for manufacturing</p>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('gauges')}
            className={`py-4 px-1 text-sm font-medium border-b-2 ${activeTab === 'gauges'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              }`}
          >
            <Gauge className="inline h-4 w-4 mr-2" />
            Gauges (mm)
          </button>
          <button
            onClick={() => setActiveTab('colors')}
            className={`py-4 px-1 text-sm font-medium border-b-2 ${activeTab === 'colors'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              }`}
          >
            <Palette className="inline h-4 w-4 mr-2" />
            Colors
          </button>
          <button
            onClick={() => setActiveTab('design')}
            className={`py-4 px-1 text-sm font-medium border-b-2 ${activeTab === 'design'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              }`}
          >
            <Settings className="inline h-4 w-4 mr-2" />
            Design
          </button>
        </nav>
      </div>

      {/* Content */}
      <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
        {activeTab === 'gauges' ? (
          <>
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Enable Gauge Input for Categories</h2>
              <p className="text-gray-600 text-sm">
                Enable gauge input for the following categories. Users can input any value between 0.10mm and 1.00mm for products in enabled categories.
              </p>
            </div>
            <div className="space-y-3">
              {categories && categories.length > 0 ? (
                categories.map((category) => {
                  const isEnabled = isCategoryEnabledForGauges(category.name);
                  return (
                    <label
                      key={category.id}
                      className={`flex items-center p-4 border rounded-lg cursor-pointer transition-colors ${isEnabled
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-200 hover:bg-gray-50'
                        } ${!hasPermission('settings_manage') ? 'cursor-not-allowed opacity-50' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={isEnabled}
                        onChange={() => handleGaugeCategoryToggle(category.name)}
                        disabled={!hasPermission('settings_manage') || updateSettingMutation.isPending}
                        className="h-5 w-5 text-primary-600 focus:ring-primary-500 border-gray-300 rounded cursor-pointer"
                      />
                      <span className={`ml-3 text-sm font-medium ${isEnabled ? 'text-primary-900' : 'text-gray-900'}`}>
                        {category.name}
                      </span>
                      {isEnabled && (
                        <Check className="ml-auto h-5 w-5 text-primary-600" />
                      )}
                    </label>
                  );
                })
              ) : (
                <p className="text-gray-500 text-center py-8">No categories found</p>
              )}
            </div>
            {updateSettingMutation.isPending && (
              <div className="mt-4 text-sm text-gray-600 flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600 mr-2"></div>
                Saving...
              </div>
            )}
          </>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">{getTabLabel()}</h2>
              {hasPermission('settings_manage') && (
                <button
                  onClick={() => openModal(null, false)}
                  className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  <Plus className="h-5 w-5" />
                  <span>Add {getTabLabel()}</span>
                </button>
              )}
            </div>

            <div className="space-y-2">
              {currentValues.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No {getTabLabel().toLowerCase()} found</p>
              ) : (
                currentValues.map((item, index) => {
                  const assignedNames = getCategoryNames(item.category_ids);
                  return (
                    <div
                      key={index}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 gap-4"
                    >
                      <div className="flex-1">
                        <span className="text-gray-900 font-medium">{item.name}</span>
                        <div className="mt-1 flex flex-wrap gap-2">
                          {assignedNames.length > 0 ? (
                            assignedNames.map((catName, i) => (
                              <span key={i} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                {catName}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-gray-500 italic">No categories assigned</span>
                          )}
                        </div>
                      </div>
                      {hasPermission('settings_manage') && (
                        <div className="flex space-x-2 self-start sm:self-center">
                          <button
                            onClick={() => openModal(item, true)}
                            className="text-blue-600 hover:text-blue-900"
                            title="Edit"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(item)}
                            className="text-red-600 hover:text-red-900"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}
      </div>

      {/* Add/Edit Modal - Only for non-gauges tabs */}
      {showModal && activeTab !== 'gauges' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                {editingValue ? 'Edit' : 'Add'} {getTabLabel()}
              </h2>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={`Enter ${getTabLabel().toLowerCase()} name`}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Assign to Categories
                </label>
                <div className="border border-gray-200 rounded-lg max-h-60 overflow-y-auto divide-y divide-gray-100">
                  {categories && categories.length > 0 ? (
                    categories.map((cat) => (
                      <label key={cat.id} className="flex items-center px-4 py-3 hover:bg-gray-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.category_ids.includes(cat.id)}
                          onChange={() => handleModalCategoryToggle(cat.id)}
                          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                        />
                        <span className="ml-3 text-sm text-gray-900">{cat.name}</span>
                      </label>
                    ))
                  ) : (
                    <div className="p-4 text-center text-gray-500 text-sm">No categories available</div>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Select categories where this {getTabLabel().toLowerCase()} should be available.
                </p>
              </div>

              <div className="flex space-x-4 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateSettingMutation.isPending}
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {updateSettingMutation.isPending ? 'Saving...' : editingValue ? 'Update' : 'Add'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default GaugesColorsSettings;
