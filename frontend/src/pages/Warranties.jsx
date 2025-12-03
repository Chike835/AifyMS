import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { Shield, Plus, Edit, Trash2, X } from 'lucide-react';
import DataControlBar from '../components/settings/DataControlBar';
import ListToolbar from '../components/common/ListToolbar';
import ExportModal from '../components/import/ExportModal';

const Warranties = () => {
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [selectedWarranty, setSelectedWarranty] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [limit, setLimit] = useState(25);
  const [visibleColumns, setVisibleColumns] = useState({
    name: true,
    duration: true,
    description: true,
    status: true,
    actions: true
  });
  const [formData, setFormData] = useState({
    name: '',
    duration_months: '',
    description: '',
    is_active: true
  });
  const [formError, setFormError] = useState('');

  // Fetch warranties
  const { data, isLoading, error } = useQuery({
    queryKey: ['warranties'],
    queryFn: async () => {
      const response = await api.get('/warranties');
      return response.data.warranties || [];
    }
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/warranties', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warranties'] });
      closeModal();
    },
    onError: (error) => {
      setFormError(error.response?.data?.error || 'Failed to create warranty');
    }
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const response = await api.put(`/warranties/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warranties'] });
      closeModal();
    },
    onError: (error) => {
      setFormError(error.response?.data?.error || 'Failed to update warranty');
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const response = await api.delete(`/warranties/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warranties'] });
    },
    onError: (error) => {
      alert(error.response?.data?.error || 'Failed to delete warranty');
    }
  });

  const openCreateModal = () => {
    setSelectedWarranty(null);
    setFormData({ name: '', duration_months: '', description: '', is_active: true });
    setFormError('');
    setShowModal(true);
  };

  const openEditModal = (warranty) => {
    setSelectedWarranty(warranty);
    setFormData({
      name: warranty.name || '',
      duration_months: warranty.duration_months?.toString() || '',
      description: warranty.description || '',
      is_active: warranty.is_active !== undefined ? warranty.is_active : true
    });
    setFormError('');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedWarranty(null);
    setFormData({ name: '', duration_months: '', description: '', is_active: true });
    setFormError('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.name.trim() || !formData.duration_months) {
      setFormError('Name and duration are required');
      return;
    }

    const duration = parseInt(formData.duration_months);
    if (isNaN(duration) || duration < 0) {
      setFormError('Duration must be a positive number');
      return;
    }

    const submitData = {
      name: formData.name.trim(),
      duration_months: duration,
      description: formData.description.trim() || null,
      is_active: formData.is_active
    };

    if (selectedWarranty) {
      updateMutation.mutate({ id: selectedWarranty.id, data: submitData });
    } else {
      createMutation.mutate(submitData);
    }
  };

  const handleDelete = (warranty) => {
    if (window.confirm(`Are you sure you want to delete "${warranty.name}"?`)) {
      deleteMutation.mutate(warranty.id);
    }
  };

  const formatDuration = (months) => {
    if (months < 12) return `${months} month${months !== 1 ? 's' : ''}`;
    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;
    if (remainingMonths === 0) return `${years} year${years !== 1 ? 's' : ''}`;
    return `${years} year${years !== 1 ? 's' : ''} ${remainingMonths} month${remainingMonths !== 1 ? 's' : ''}`;
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
        {error.response?.data?.error || error.message || 'Failed to load warranties'}
      </div>
    );
  }

  const warranties = data || [];

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Warranties</h1>
          <p className="mt-2 text-gray-600">Manage product warranty terms</p>
        </div>
        {hasPermission('product_add') && (
          <button
            onClick={openCreateModal}
            className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Plus className="h-5 w-5" />
            <span>Add Warranty</span>
          </button>
        )}
      </div>

      <DataControlBar
        importEndpoint="/api/warranties/import"
        exportEndpoint="/api/warranties/export"
        entityName="warranties"
        onImportSuccess={(data) => {
          const results = data?.results || data || {};
          const created = results.created || 0;
          const updated = results.updated || 0;
          const skipped = results.skipped || 0;
          const errors = results.errors || [];
          
          if (created > 0 || updated > 0) {
            queryClient.invalidateQueries({ queryKey: ['warranties'] });
            
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
        searchPlaceholder="Search warranties..."
      />

      {/* Export Modal */}
      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        entity="warranties"
        title="Export Warranties"
      />

      {warranties.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-12 text-center">
          <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No warranties yet</h3>
          <p className="text-gray-600 mb-4">Get started by creating your first warranty.</p>
          {hasPermission('product_add') && (
            <button
              onClick={openCreateModal}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              <Plus className="h-5 w-5" />
              <span>Create your first warranty</span>
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {visibleColumns.name && <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>}
                {visibleColumns.duration && <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>}
                {visibleColumns.description && <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>}
                {visibleColumns.status && <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>}
                {visibleColumns.actions && <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {warranties
                .filter(warranty => {
                  if (!searchTerm) return true;
                  const search = searchTerm.toLowerCase();
                  return warranty.name?.toLowerCase().includes(search) ||
                         warranty.description?.toLowerCase().includes(search);
                })
                .slice(0, limit === -1 ? undefined : limit)
                .map((warranty) => (
                <tr key={warranty.id} className="hover:bg-gray-50">
                  {visibleColumns.name && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{warranty.name}</div>
                    </td>
                  )}
                  {visibleColumns.duration && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{formatDuration(warranty.duration_months)}</div>
                    </td>
                  )}
                  {visibleColumns.description && (
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-500">{warranty.description || '-'}</div>
                    </td>
                  )}
                  {visibleColumns.status && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        warranty.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {warranty.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  )}
                  {visibleColumns.actions && (
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {hasPermission('product_edit') && (
                        <button
                          onClick={() => openEditModal(warranty)}
                          className="text-primary-600 hover:text-primary-900 mr-4"
                        >
                          <Edit className="h-5 w-5" />
                        </button>
                      )}
                      {hasPermission('product_delete') && (
                        <button
                          onClick={() => handleDelete(warranty)}
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
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">{selectedWarranty ? 'Edit Warranty' : 'Add Warranty'}</h2>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Duration (Months) *</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.duration_months}
                    onChange={(e) => setFormData({ ...formData, duration_months: e.target.value })}
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
                  {selectedWarranty ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Warranties;







