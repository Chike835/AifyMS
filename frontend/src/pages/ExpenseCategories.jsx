import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { Tag, Plus, Edit, Trash2, ArrowLeft, X } from 'lucide-react';
import { Link } from 'react-router-dom';

const ExpenseCategories = () => {
  const { hasPermission, user } = useAuth();
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [formData, setFormData] = useState({ name: '', branch_id: '' });
  const [formError, setFormError] = useState('');

  // Fetch expense categories
  const { data: categories, isLoading, error } = useQuery({
    queryKey: ['expenseCategories'],
    queryFn: async () => {
      const response = await api.get('/expenses/categories');
      return response.data;
    }
  });

  // Fetch branches for Super Admin
  const { data: branchesData } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      const response = await api.get('/branches');
      return response.data.branches || [];
    },
    enabled: user?.role_name === 'Super Admin'
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/expenses/categories', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenseCategories'] });
      closeModal();
    },
    onError: (error) => {
      setFormError(error.response?.data?.error || 'Failed to create category');
    }
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const response = await api.put(`/expenses/categories/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenseCategories'] });
      closeModal();
    },
    onError: (error) => {
      setFormError(error.response?.data?.error || 'Failed to update category');
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const response = await api.delete(`/expenses/categories/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenseCategories'] });
    },
    onError: (error) => {
      alert(error.response?.data?.error || 'Failed to delete category');
    }
  });

  const openCreateModal = () => {
    setSelectedCategory(null);
    setFormData({ name: '', branch_id: '' });
    setFormError('');
    setShowModal(true);
  };

  const openEditModal = (category) => {
    setSelectedCategory(category);
    setFormData({
      name: category.name || '',
      branch_id: category.branch_id || ''
    });
    setFormError('');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedCategory(null);
    setFormData({ name: '', branch_id: '' });
    setFormError('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.name.trim()) {
      setFormError('Category name is required');
      return;
    }

    const submitData = { name: formData.name.trim() };
    if (formData.branch_id) {
      submitData.branch_id = formData.branch_id;
    }

    if (selectedCategory) {
      updateMutation.mutate({ id: selectedCategory.id, data: submitData });
    } else {
      createMutation.mutate(submitData);
    }
  };

  const handleDelete = (category) => {
    if (window.confirm(`Are you sure you want to delete "${category.name}"? This cannot be undone if there are associated expenses.`)) {
      deleteMutation.mutate(category.id);
    }
  };

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

  const branches = branchesData || [];

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <Link
            to="/expenses"
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-6 w-6" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Expense Categories</h1>
            <p className="text-gray-600 mt-2">Organize your expenses with categories</p>
          </div>
        </div>
        {hasPermission('expense_category_manage') && (
          <button
            onClick={openCreateModal}
            className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Plus className="h-5 w-5" />
            <span>Add Category</span>
          </button>
        )}
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories?.length === 0 ? (
          <div className="col-span-full bg-white rounded-lg shadow border border-gray-200 p-8 text-center">
            <Tag className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500 mb-4">No expense categories found</p>
            {hasPermission('expense_category_manage') && (
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
          categories.map((category) => (
            <div
              key={category.id}
              className="bg-white rounded-lg shadow border border-gray-200 p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Tag className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{category.name}</h3>
                    {category.branch && (
                      <p className="text-sm text-gray-500">{category.branch.name}</p>
                    )}
                  </div>
                </div>
                {hasPermission('expense_category_manage') && (
                  <div className="flex space-x-1">
                    <button
                      onClick={() => openEditModal(category)}
                      className="p-1 text-orange-600 hover:bg-orange-50 rounded"
                      title="Edit"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(category)}
                      className="p-1 text-red-600 hover:bg-red-50 rounded"
                      title="Delete"
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
              <div className="mt-3 pt-3 border-t border-gray-100">
                <p className="text-xs text-gray-400">
                  Created {new Date(category.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                {selectedCategory ? 'Edit Category' : 'Add Category'}
              </h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                <X className="h-6 w-6" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="e.g., Office Supplies, Transportation, Utilities"
                />
              </div>

              {/* Branch selector for Super Admin (only on create) */}
              {user?.role_name === 'Super Admin' && branches.length > 0 && !selectedCategory && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Branch
                  </label>
                  <select
                    value={formData.branch_id || ''}
                    onChange={(e) => setFormData({ ...formData, branch_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Select Branch</option>
                    {branches.map((branch) => (
                      <option key={branch.id} value={branch.id}>
                        {branch.name} ({branch.code})
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Categories are branch-specific. Select the branch this category belongs to.
                  </p>
                </div>
              )}

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
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? 'Saving...'
                    : selectedCategory
                    ? 'Update'
                    : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpenseCategories;

