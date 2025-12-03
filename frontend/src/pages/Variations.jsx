import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { Settings, Plus, Edit, Trash2, X } from 'lucide-react';
import DataControlBar from '../components/settings/DataControlBar';
import ListToolbar from '../components/common/ListToolbar';
import ExportModal from '../components/import/ExportModal';

const Variations = () => {
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [selectedVariation, setSelectedVariation] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [limit, setLimit] = useState(25);
  const [visibleColumns, setVisibleColumns] = useState({
    name: true,
    description: true,
    values: true,
    status: true,
    actions: true
  });
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    is_active: true,
    values: []
  });
  const [formError, setFormError] = useState('');
  const [newValue, setNewValue] = useState('');

  // Fetch variations
  const { data, isLoading, error } = useQuery({
    queryKey: ['variations'],
    queryFn: async () => {
      const response = await api.get('/variations');
      return response.data.variations || [];
    }
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/variations', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['variations'] });
      closeModal();
    },
    onError: (error) => {
      setFormError(error.response?.data?.error || 'Failed to create variation');
    }
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const response = await api.put(`/variations/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['variations'] });
      closeModal();
    },
    onError: (error) => {
      setFormError(error.response?.data?.error || 'Failed to update variation');
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const response = await api.delete(`/variations/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['variations'] });
    },
    onError: (error) => {
      alert(error.response?.data?.error || 'Failed to delete variation');
    }
  });

  const openCreateModal = () => {
    setSelectedVariation(null);
    setFormData({ name: '', description: '', is_active: true, values: [] });
    setNewValue('');
    setFormError('');
    setShowModal(true);
  };

  const openEditModal = (variation) => {
    setSelectedVariation(variation);
    setFormData({
      name: variation.name || '',
      description: variation.description || '',
      is_active: variation.is_active !== undefined ? variation.is_active : true,
      values: variation.values ? variation.values.map(v => ({ value: v.value, display_order: v.display_order })) : []
    });
    setNewValue('');
    setFormError('');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedVariation(null);
    setFormData({ name: '', description: '', is_active: true, values: [] });
    setNewValue('');
    setFormError('');
  };

  const addValue = () => {
    if (newValue.trim()) {
      setFormData({
        ...formData,
        values: [...formData.values, { value: newValue.trim(), display_order: formData.values.length }]
      });
      setNewValue('');
    }
  };

  const removeValue = (index) => {
    setFormData({
      ...formData,
      values: formData.values.filter((_, i) => i !== index)
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.name.trim()) {
      setFormError('Variation name is required');
      return;
    }

    const submitData = {
      name: formData.name.trim(),
      description: formData.description.trim() || null,
      is_active: formData.is_active,
      values: formData.values.map((v, index) => ({
        value: v.value,
        display_order: v.display_order !== undefined ? v.display_order : index
      }))
    };

    if (selectedVariation) {
      updateMutation.mutate({ id: selectedVariation.id, data: submitData });
    } else {
      createMutation.mutate(submitData);
    }
  };

  const handleDelete = (variation) => {
    if (window.confirm(`Are you sure you want to delete "${variation.name}"? This will also delete all its values.`)) {
      deleteMutation.mutate(variation.id);
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
        {error.response?.data?.error || error.message || 'Failed to load variations'}
      </div>
    );
  }

  const variations = data || [];

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Product Variations</h1>
          <p className="mt-2 text-gray-600">Manage product variations and their values</p>
        </div>
        {hasPermission('product_add') && (
          <button
            onClick={openCreateModal}
            className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Plus className="h-5 w-5" />
            <span>Add Variation</span>
          </button>
        )}
      </div>

      <DataControlBar
        importEndpoint="/api/variations/import"
        exportEndpoint="/api/variations/export"
        entityName="variations"
        onImportSuccess={(data) => {
          const results = data?.results || data || {};
          const created = results.created || 0;
          const updated = results.updated || 0;
          const skipped = results.skipped || 0;
          const errors = results.errors || [];
          
          if (created > 0 || updated > 0) {
            queryClient.invalidateQueries({ queryKey: ['variations'] });
            
            let message = `Import completed! ${created} created, ${updated} updated`;
            if (skipped > 0) {
              message += `, ${skipped} skipped`;
            }
            if (errors.length > 0) {
              message += `. ${errors.length} error(s) occurred.`;
            }
            alert(message);
          }
        }}
      />

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
        searchPlaceholder="Search variations..."
      />

      {/* Export Modal */}
      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        entity="variations"
        title="Export Variations"
      />

      {variations.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-12 text-center">
          <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No variations yet</h3>
          <p className="text-gray-600 mb-4">Get started by creating your first product variation.</p>
          {hasPermission('product_add') && (
            <button
              onClick={openCreateModal}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              <Plus className="h-5 w-5" />
              <span>Create your first variation</span>
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {visibleColumns.name && <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>}
                {visibleColumns.description && <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>}
                {visibleColumns.values && <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Values</th>}
                {visibleColumns.status && <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>}
                {visibleColumns.actions && <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {variations
                .filter(variation => {
                  if (!searchTerm) return true;
                  const search = searchTerm.toLowerCase();
                  return variation.name?.toLowerCase().includes(search) ||
                         variation.description?.toLowerCase().includes(search);
                })
                .slice(0, limit === -1 ? undefined : limit)
                .map((variation) => (
                <tr key={variation.id} className="hover:bg-gray-50">
                  {visibleColumns.name && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{variation.name}</div>
                    </td>
                  )}
                  {visibleColumns.description && (
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-500">{variation.description || '-'}</div>
                    </td>
                  )}
                  {visibleColumns.values && (
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {variation.values && variation.values.length > 0 ? (
                          variation.values.map((val, idx) => (
                            <span key={idx} className="inline-flex items-center px-2 py-1 rounded text-xs bg-gray-100 text-gray-800">
                              {val.value}
                            </span>
                          ))
                        ) : (
                          <span className="text-sm text-gray-400">No values</span>
                        )}
                      </div>
                    </td>
                  )}
                  {visibleColumns.status && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        variation.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {variation.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  )}
                  {visibleColumns.actions && (
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {hasPermission('product_edit') && (
                        <button
                          onClick={() => openEditModal(variation)}
                          className="text-primary-600 hover:text-primary-900 mr-4"
                        >
                          <Edit className="h-5 w-5" />
                        </button>
                      )}
                      {hasPermission('product_delete') && (
                        <button
                          onClick={() => handleDelete(variation)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">{selectedVariation ? 'Edit Variation' : 'Add Variation'}</h2>
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

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Values</label>
                  <div className="flex space-x-2 mb-2">
                    <input
                      type="text"
                      value={newValue}
                      onChange={(e) => setNewValue(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addValue();
                        }
                      }}
                      placeholder="Enter value and press Enter"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                    <button
                      type="button"
                      onClick={addValue}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      Add
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.values.map((val, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-3 py-1 rounded bg-primary-100 text-primary-800"
                      >
                        {val.value}
                        <button
                          type="button"
                          onClick={() => removeValue(index)}
                          className="ml-2 text-primary-600 hover:text-primary-800"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </span>
                    ))}
                  </div>
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
                  {selectedVariation ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Variations;







