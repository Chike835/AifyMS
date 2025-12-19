import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../../context/AuthContext';
import api from '../../../utils/api';
import { Package, Plus, Edit, Trash2, X, Check, Search, Star } from 'lucide-react';

const BatchSettings = () => {
  const { hasPermission, user } = useAuth();
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedType, setSelectedType] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    can_slit: false
  });

  const canManageSettings = hasPermission('settings_manage');

  // Fetch all batch types
  const { data: batchTypesData, isLoading: typesLoading } = useQuery({
    queryKey: ['batchTypes'],
    queryFn: async () => {
      const response = await api.get('/settings/batches/types');
      return response.data.batch_types || [];
    },
    enabled: canManageSettings
  });

  // Fetch all categories
  const categoryBranchScope = user?.branch_id || null;
  const assignmentQueryKey = ['categoryBatchAssignments', categoryBranchScope || 'global'];
  const { data: categoriesData, isLoading: categoriesLoading } = useQuery({
    queryKey: ['categories', categoryBranchScope || 'global'],
    queryFn: async () => {
      const response = await api.get('/categories', {
        params: {
          branch_id: categoryBranchScope || undefined,
          include_global: 'true'
        }
      });
      return response.data.categories || [];
    },
    enabled: canManageSettings
  });

  // Fetch category-batch type assignments
  const { data: assignmentsData, isLoading: assignmentsLoading } = useQuery({
    queryKey: assignmentQueryKey,
    queryFn: async () => {
      const response = await api.get('/settings/batches/assignments', {
        params: {
          branch_id: categoryBranchScope || undefined
        }
      });
      return response.data.assignments || [];
    },
    enabled: canManageSettings
  });

  // Create batch type mutation
  const createMutation = useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/settings/batches/types', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batchTypes'] });
      setShowCreateModal(false);
      resetForm();
      alert('Batch type created successfully!');
    },
    onError: (error) => {
      alert(error.response?.data?.error || 'Failed to create batch type');
    },
  });

  // Update batch type mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const response = await api.put(`/settings/batches/types/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batchTypes'] });
      setShowEditModal(false);
      setSelectedType(null);
      resetForm();
      alert('Batch type updated successfully!');
    },
    onError: (error) => {
      alert(error.response?.data?.error || 'Failed to update batch type');
    },
  });

  // Delete batch type mutation
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const response = await api.delete(`/settings/batches/types/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batchTypes'] });
      queryClient.invalidateQueries({ queryKey: assignmentQueryKey });
      alert('Batch type deleted successfully!');
    },
    onError: (error) => {
      alert(error.response?.data?.error || 'Failed to delete batch type');
    },
  });

  // Set default batch type mutation
  const setDefaultMutation = useMutation({
    mutationFn: async (id) => {
      const response = await api.put(`/settings/batches/types/${id}/set-default`);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['batchTypes'] });
      alert(data.message || 'Default batch type updated!');
    },
    onError: (error) => {
      alert(error.response?.data?.error || 'Failed to set default batch type');
    },
  });

  // Assign batch type to category mutation
  const assignMutation = useMutation({
    mutationFn: async ({ category_id, batch_type_id }) => {
      const response = await api.post('/settings/batches/assignments', {
        category_id,
        batch_type_id
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assignmentQueryKey });
      alert('Batch type assigned to category successfully!');
    },
    onError: (error) => {
      alert(error.response?.data?.error || 'Failed to assign batch type');
    },
  });

  // Remove batch type from category mutation
  const removeAssignmentMutation = useMutation({
    mutationFn: async ({ category_id, batch_type_id }) => {
      const response = await api.delete(
        `/settings/batches/assignments?category_id=${category_id}&batch_type_id=${batch_type_id}`
      );
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: assignmentQueryKey });
      alert(data?.message || 'Batch type removed from category successfully!');
    },
    onError: (error) => {
      alert(error.response?.data?.error || 'Failed to remove assignment');
    },
  });

  const resetForm = () => {
    setFormData({ name: '', description: '', can_slit: false });
  };

  const handleCreateSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const handleEdit = (type) => {
    setSelectedType(type);
    setFormData({
      name: type.name,
      description: type.description || '',
      can_slit: type.can_slit || false
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = (e) => {
    e.preventDefault();
    updateMutation.mutate({ id: selectedType.id, data: formData });
  };

  const handleDelete = (type) => {
    if (window.confirm(`Are you sure you want to delete batch type "${type.name}"?`)) {
      deleteMutation.mutate(type.id);
    }
  };

  const handleToggleAssignment = (categoryId, batchTypeId, isCurrentlyAssigned) => {
    if (isCurrentlyAssigned) {
      if (window.confirm('Remove this batch type from the category? Existing inventory batches will remain unchanged, but new batches cannot use this combination.')) {
        removeAssignmentMutation.mutate({ category_id: categoryId, batch_type_id: batchTypeId });
      }
    } else {
      assignMutation.mutate({ category_id: categoryId, batch_type_id: batchTypeId });
    }
  };

  const isAssigned = (categoryId, batchTypeId) => {
    if (!assignmentsData || assignmentsData.length === 0) {
      return false;
    }
    const assignment = assignmentsData.find(a => a.category?.id === categoryId);
    if (!assignment || !assignment.batch_types) {
      return false;
    }
    return assignment.batch_types.some(bt => bt.id === batchTypeId);
  };

  const batchTypes = batchTypesData || [];
  const categories = categoriesData || [];
  const assignments = assignmentsData || [];

  // Filter categories by search term
  const filteredCategories = categories.filter(cat =>
    !searchTerm || cat.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!canManageSettings) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-lg">
          You do not have permission to manage batch settings.
        </div>
      </div>
    );
  }

  if (typesLoading || categoriesLoading || assignmentsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  // System Requirement Checks
  const coilType = batchTypes.find(bt => bt.name === 'Coil');
  const looseType = batchTypes.find(bt => bt.name === 'Loose');
  const missingTypes = [];
  if (!coilType) missingTypes.push('Coil');
  if (!looseType) missingTypes.push('Loose');

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Batch Configuration</h1>
          <p className="text-gray-600 mt-2">Manage batch types and assign them to categories</p>
        </div>
        {hasPermission('settings_manage') && (
          <button
            onClick={() => {
              resetForm();
              setShowCreateModal(true);
            }}
            className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Plus className="h-5 w-5" />
            <span>Create Batch Type</span>
          </button>
        )}
      </div>

      {/* System Warning */}
      {missingTypes.length > 0 && (
        <div className="mb-6 bg-yellow-50 border border-yellow-200 p-4 rounded-lg flex items-start space-x-3">
          <Star className="h-5 w-5 text-yellow-500 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-yellow-800">Missing System Batch Types</h3>
            <p className="text-sm text-yellow-700 mt-1">
              The following reserved batch types are required for advanced inventory operations (e.g., Slitting):
              <span className="font-bold"> {missingTypes.join(', ')}</span>.
              Please create them exactly as named to enable these features.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Batch Types List */}
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Batch Types</h2>
          <div className="space-y-3">
            {batchTypes.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No batch types found</p>
            ) : (
              batchTypes.map((type) => (
                <div
                  key={type.id}
                  className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-gray-900">{type.name}</span>
                      {type.is_default && (
                        <span className="px-2 py-0.5 text-xs rounded-full bg-yellow-100 text-yellow-800 flex items-center space-x-1">
                          <Star className="h-3 w-3 fill-yellow-500" />
                          <span>Default</span>
                        </span>
                      )}
                    </div>
                    {type.description && (
                      <div className="text-sm text-gray-500 mt-1">{type.description}</div>
                    )}
                    <div className="flex items-center space-x-2 mt-1">
                      <span
                        className={`px-2 py-0.5 text-xs rounded-full ${type.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                          }`}
                      >
                        {type.is_active ? 'Active' : 'Inactive'}
                      </span>
                      {type.can_slit && (
                        <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-800 flex items-center space-x-1">
                          <Package className="h-3 w-3" />
                          <span>Slitting Enabled</span>
                        </span>
                      )}
                    </div>
                  </div>
                  {hasPermission('settings_manage') && (
                    <div className="flex space-x-2 ml-4">
                      {!type.is_default && type.is_active && (
                        <button
                          onClick={() => setDefaultMutation.mutate(type.id)}
                          disabled={setDefaultMutation.isPending}
                          className="text-yellow-600 hover:text-yellow-900 disabled:opacity-50"
                          title="Make Default"
                        >
                          <Star className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleEdit(type)}
                        className="text-blue-600 hover:text-blue-900"
                        title="Edit"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(type)}
                        className="text-red-600 hover:text-red-900"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Category-Batch Type Assignment Matrix */}
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Category Assignments</h2>

          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search categories..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* Assignment Matrix */}
          <div className="space-y-4 max-h-[600px] overflow-y-auto">
            {filteredCategories.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No categories found</p>
            ) : (
              filteredCategories.map((category) => (
                <div key={category.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="font-medium text-gray-900 mb-3">{category.name}</div>
                  <div className="grid grid-cols-2 gap-2">
                    {batchTypes.filter(bt => bt.is_active).map((batchType) => {
                      const assigned = isAssigned(category.id, batchType.id);
                      const isDefault = batchType.is_default;
                      // Pre-select if it's the default batch type (visual only if not assigned)
                      const shouldBeChecked = assigned || isDefault;
                      return (
                        <label
                          key={batchType.id}
                          className={`flex items-center space-x-2 p-2 rounded cursor-pointer transition-colors ${shouldBeChecked
                            ? 'bg-blue-50 border-2 border-blue-300'
                            : 'bg-gray-50 border border-gray-200 hover:bg-gray-100'
                            }`}
                        >
                          <input
                            type="checkbox"
                            checked={shouldBeChecked}
                            onChange={() => {
                              // If default but not assigned, assign it; if assigned, remove it
                              if (assigned) {
                                handleToggleAssignment(category.id, batchType.id, true);
                              } else {
                                // Not assigned - assign it (even if it's default, we need to create the assignment)
                                handleToggleAssignment(category.id, batchType.id, false);
                              }
                            }}
                            disabled={!hasPermission('settings_manage')}
                            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 w-4 h-4"
                          />
                          {shouldBeChecked && (
                            <Check className="h-4 w-4 text-blue-600" />
                          )}
                          <span className={`text-sm ${shouldBeChecked ? 'font-medium text-gray-900' : 'text-gray-700'}`}>
                            {batchType.name}
                            {isDefault && (
                              <span className="ml-1 text-xs text-yellow-600">(Default)</span>
                            )}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Create Batch Type Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Create Batch Type</h2>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  resetForm();
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Carton"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Optional description"
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.can_slit || false}
                    onChange={(e) => setFormData({ ...formData, can_slit: e.target.checked })}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 w-4 h-4"
                  />
                  <span className="text-sm font-medium text-gray-700">Allow Slitting</span>
                </label>
                <p className="text-xs text-gray-500 mt-1 ml-6">Enable slitting feature for batches of this type</p>
              </div>
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
                  {createMutation.isPending ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Batch Type Modal */}
      {showEditModal && selectedType && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Edit Batch Type</h2>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedType(null);
                  resetForm();
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.can_slit || false}
                    onChange={(e) => setFormData({ ...formData, can_slit: e.target.checked })}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 w-4 h-4"
                  />
                  <span className="text-sm font-medium text-gray-700">Allow Slitting</span>
                </label>
                <p className="text-xs text-gray-500 mt-1 ml-6">Enable slitting feature for batches of this type</p>
              </div>
              <div className="flex space-x-4 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedType(null);
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
                  {updateMutation.isPending ? 'Updating...' : 'Update'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BatchSettings;


