import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { FolderTree, Plus, Edit, Trash2, X, UploadCloud } from 'lucide-react';
import DataControlBar from '../components/settings/DataControlBar';
import ListToolbar from '../components/common/ListToolbar';
import ExportModal from '../components/import/ExportModal';
import ImportModal from '../components/import/ImportModal';

const Categories = () => {
  const { hasPermission, user } = useAuth();
  const queryClient = useQueryClient();
  const isSuperAdmin = user?.role_name === 'Super Admin';
  const [showModal, setShowModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    parent_id: '',
    description: '',
    is_active: true
  });
  const [formError, setFormError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);

  // Column visibility
  const [visibleColumns, setVisibleColumns] = useState({
    name: true,
    parent: true,
    description: true,
    status: true
  });

  // Export modal
  const [showExportModal, setShowExportModal] = useState(false);
  // Import modal
  const [showImportModal, setShowImportModal] = useState(false);

  const { data: branchesData } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      const response = await api.get('/branches');
      return response.data.branches || [];
    },
    enabled: isSuperAdmin
  });
  const branches = branchesData || [];

  const canViewCategories = hasPermission('product_view');
  const categoryQueryKey = ['categories', 'global'];

  // Fetch categories
  const { data, isLoading, error } = useQuery({
    queryKey: categoryQueryKey,
    queryFn: async () => {
      const response = await api.get('/categories');
      return response.data.categories || [];
    },
    enabled: canViewCategories
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/categories', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: categoryQueryKey });
      closeModal();
    },
    onError: (error) => {
      setFormError(error.response?.data?.error || 'Failed to create category');
    }
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const response = await api.put(`/categories/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: categoryQueryKey });
      closeModal();
    },
    onError: (error) => {
      setFormError(error.response?.data?.error || 'Failed to update category');
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const response = await api.delete(`/categories/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: categoryQueryKey });
    },
    onError: (error) => {
      alert(error.response?.data?.error || 'Failed to delete category');
    }
  });

  const openCreateModal = () => {
    setSelectedCategory(null);
    setFormData({
      name: '',
      parent_id: '',
      description: '',
      is_active: true
    });
    setFormError('');
    setShowModal(true);
  };

  const openEditModal = (category) => {
    setSelectedCategory(category);
    setFormData({
      name: category.name || '',
      parent_id: category.parent_id || '',
      description: category.description || '',
      is_active: category.is_active !== undefined ? category.is_active : true
    });
    setFormError('');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedCategory(null);
    setFormData({
      name: '',
      parent_id: '',
      description: '',
      is_active: true
    });
    setFormError('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.name.trim()) {
      setFormError('Category name is required');
      return;
    }

    const submitData = {
      name: formData.name.trim(),
      parent_id: formData.parent_id || null,
      description: formData.description.trim() || null,
      is_active: formData.is_active
    };



    if (selectedCategory) {
      updateMutation.mutate({ id: selectedCategory.id, data: submitData });
    } else {
      createMutation.mutate(submitData);
    }
  };

  const handleDelete = (category) => {
    if (window.confirm(`Are you sure you want to delete "${category.name}"? This will also delete all subcategories.`)) {
      deleteMutation.mutate(category.id);
    }
  };

  if (!canViewCategories) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-lg">
          You do not have permission to view categories.
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>

    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
        {error.response?.data?.error || error.message || 'Failed to load categories'}
      </div>
    );
  }

  const categories = data || [];
  const rootCategories = categories.filter(cat => !cat.parent_id);
  const getCategoryPath = (category) => {
    if (!category.parent) return category.name;
    return `${getCategoryPath(category.parent)} > ${category.name}`;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Product Categories</h1>
          <p className="mt-2 text-gray-600">Manage hierarchical product categories</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {hasPermission('product_add') && (
            <>
              <button
                onClick={openCreateModal}
                className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                <Plus className="h-5 w-5" />
                <span>Add Category</span>
              </button>
              <button
                onClick={() => setShowImportModal(true)}
                className="flex items-center space-x-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <UploadCloud className="h-5 w-5" />
                <span>Import Categories</span>
              </button>
            </>
          )}
        </div>
      </div>



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
        searchPlaceholder="Search categories..."
      />

      {/* Export Modal */}
      {showExportModal && (
        <ExportModal
          isOpen={showExportModal}
          onClose={() => setShowExportModal(false)}
          entity="categories"
          title="Export Categories"
        />
      )}

      {/* Import Modal */}
      {showImportModal && (
        <ImportModal
          isOpen={showImportModal}
          onClose={() => setShowImportModal(false)}
          onSuccess={(data) => {
            const results = data?.results || data || {};
            const created = results.created || 0;
            const updated = results.updated || 0;
            const skipped = results.skipped || 0;
            const errors = results.errors || [];

            // Only refresh if records were actually created/updated
            if (created > 0 || updated > 0) {
              queryClient.invalidateQueries({ queryKey: categoryQueryKey });

              let message = `Import completed! ${created} created, ${updated} updated`;
              if (skipped > 0) {
                message += `, ${skipped} skipped`;
              }
              if (errors.length > 0) {
                message += `. ${errors.length} error(s) occurred.`;
              }
              alert(message);
            }
            setShowImportModal(false);
          }}
          entity="categories"
          title="Import Categories"
          targetEndpoint={`/api/categories/import`}
        />
      )}

      {categories.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-12 text-center">
          <FolderTree className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No categories yet</h3>
          <p className="text-gray-600 mb-4">Get started by creating your first category.</p>
          {hasPermission('product_add') && (
            <button
              onClick={openCreateModal}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              <Plus className="h-5 w-5" />
              <span>Create your first category</span>
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Parent</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {categories.map((category) => (
                <tr key={category.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{category.name}</div>
                    {category.children && category.children.length > 0 && (
                      <span className="text-xs text-gray-500">{category.children.length} subcategories</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {category.parent ? category.parent.name : 'Root'}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-500">{category.description || '-'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${category.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                      {category.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {hasPermission('product_edit') && (
                      <button
                        onClick={() => openEditModal(category)}
                        className="text-primary-600 hover:text-primary-900 mr-4"
                      >
                        <Edit className="h-5 w-5" />
                      </button>
                    )}
                    {hasPermission('product_delete') && (
                      <button
                        onClick={() => handleDelete(category)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">{selectedCategory ? 'Edit Category' : 'Add Category'}</h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                <X className="h-6 w-6" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    required
                  />
                </div>



                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Parent Category</label>
                  <select
                    value={formData.parent_id}
                    onChange={(e) => setFormData({ ...formData, parent_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="">None (Root Category)</option>
                    {categories
                      .filter(cat => (!selectedCategory || cat.id !== selectedCategory.id) && !cat.parent_id)
                      .map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm font-medium text-gray-700">Active</span>
                  </label>
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  {selectedCategory ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Categories;







