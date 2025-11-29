import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { Ruler, Plus, Edit, Trash2, X, UploadCloud } from 'lucide-react';
import DataControlBar from '../components/settings/DataControlBar';
import ListToolbar from '../components/common/ListToolbar';
import ExportModal from '../components/import/ExportModal';
import ImportModal from '../components/import/ImportModal';

const Units = () => {
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    abbreviation: '',
    base_unit_id: '',
    conversion_factor: '1',
    is_base_unit: false,
    is_active: true
  });
  const [formError, setFormError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Pagination
  const [limit, setLimit] = useState(25);

  // Column visibility
  const [visibleColumns, setVisibleColumns] = useState({
    name: true,
    abbreviation: true,
    base_unit: true,
    conversion_factor: true,
    status: true
  });

  // Export modal
  const [showExportModal, setShowExportModal] = useState(false);
  // Import modal
  const [showImportModal, setShowImportModal] = useState(false);

  // Fetch units
  const { data, isLoading, error } = useQuery({
    queryKey: ['units'],
    queryFn: async () => {
      const response = await api.get('/units');
      return response.data.units || [];
    }
  });

  // Fetch base units for dropdown
  const { data: baseUnitsData } = useQuery({
    queryKey: ['baseUnits'],
    queryFn: async () => {
      const response = await api.get('/units?is_base_unit=true');
      return response.data.units || [];
    }
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/units', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['units'] });
      queryClient.invalidateQueries({ queryKey: ['baseUnits'] });
      closeModal();
    },
    onError: (error) => {
      setFormError(error.response?.data?.error || 'Failed to create unit');
    }
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const response = await api.put(`/units/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['units'] });
      queryClient.invalidateQueries({ queryKey: ['baseUnits'] });
      closeModal();
    },
    onError: (error) => {
      setFormError(error.response?.data?.error || 'Failed to update unit');
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const response = await api.delete(`/units/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['units'] });
    },
    onError: (error) => {
      alert(error.response?.data?.error || 'Failed to delete unit');
    }
  });

  const openCreateModal = () => {
    setSelectedUnit(null);
    setFormData({
      name: '',
      abbreviation: '',
      base_unit_id: '',
      conversion_factor: '1',
      is_base_unit: false,
      is_active: true
    });
    setFormError('');
    setShowModal(true);
  };

  const openEditModal = (unit) => {
    setSelectedUnit(unit);
    setFormData({
      name: unit.name || '',
      abbreviation: unit.abbreviation || '',
      base_unit_id: unit.base_unit_id || '',
      conversion_factor: unit.conversion_factor?.toString() || '1',
      is_base_unit: unit.is_base_unit || false,
      is_active: unit.is_active !== undefined ? unit.is_active : true
    });
    setFormError('');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedUnit(null);
    setFormData({
      name: '',
      abbreviation: '',
      base_unit_id: '',
      conversion_factor: '1',
      is_base_unit: false,
      is_active: true
    });
    setFormError('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.name.trim() || !formData.abbreviation.trim()) {
      setFormError('Name and abbreviation are required');
      return;
    }

    const submitData = {
      name: formData.name.trim(),
      abbreviation: formData.abbreviation.trim(),
      base_unit_id: formData.is_base_unit ? null : (formData.base_unit_id || null),
      conversion_factor: parseFloat(formData.conversion_factor) || 1,
      is_base_unit: formData.is_base_unit,
      is_active: formData.is_active
    };

    if (selectedUnit) {
      updateMutation.mutate({ id: selectedUnit.id, data: submitData });
    } else {
      createMutation.mutate(submitData);
    }
  };

  const handleDelete = (unit) => {
    if (window.confirm(`Are you sure you want to delete "${unit.name}"?`)) {
      deleteMutation.mutate(unit.id);
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
        {error.response?.data?.error || error.message || 'Failed to load units'}
      </div>
    );
  }

  const units = data || [];
  const baseUnits = baseUnitsData || [];

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Units</h1>
          <p className="mt-2 text-gray-600">Manage measurement units and conversions</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {hasPermission('product_add') && (
            <>
              <button
                onClick={openCreateModal}
                className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                <Plus className="h-5 w-5" />
                <span>Add Unit</span>
              </button>
              <button
                onClick={() => setShowImportModal(true)}
                className="flex items-center space-x-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <UploadCloud className="h-5 w-5" />
                <span>Import Units</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Toolbar */}
      <ListToolbar
        limit={limit}
        onLimitChange={setLimit}
        visibleColumns={visibleColumns}
        onColumnVisibilityChange={setVisibleColumns}
        onExport={() => setShowExportModal(true)}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search units..."
      />

      {/* Export Modal */}
      {showExportModal && (
        <ExportModal
          isOpen={showExportModal}
          onClose={() => setShowExportModal(false)}
          entity="units"
          title="Export Units"
        />
      )}

      {/* Import Modal */}
      {showImportModal && (
        <ImportModal
          isOpen={showImportModal}
          onClose={() => setShowImportModal(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['units'] });
            queryClient.invalidateQueries({ queryKey: ['baseUnits'] });
            setShowImportModal(false);
            alert('Units import completed successfully!');
          }}
          entity="units"
          title="Import Units"
        />
      )}

      {units.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-12 text-center">
          <Ruler className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No units yet</h3>
          <p className="text-gray-600 mb-4">Get started by creating your first unit.</p>
          {hasPermission('product_add') && (
            <button
              onClick={openCreateModal}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              <Plus className="h-5 w-5" />
              <span>Create your first unit</span>
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Abbreviation</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Base Unit</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Conversion Factor</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {units.map((unit) => (
                <tr key={unit.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{unit.name}</div>
                    {unit.is_base_unit && (
                      <span className="text-xs text-primary-600">(Base Unit)</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{unit.abbreviation}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {unit.base_unit ? unit.base_unit.name : '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{unit.conversion_factor}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      unit.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {unit.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {hasPermission('product_edit') && (
                      <button
                        onClick={() => openEditModal(unit)}
                        className="text-primary-600 hover:text-primary-900 mr-4"
                      >
                        <Edit className="h-5 w-5" />
                      </button>
                    )}
                    {hasPermission('product_delete') && (
                      <button
                        onClick={() => handleDelete(unit)}
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
              <h2 className="text-xl font-bold">{selectedUnit ? 'Edit Unit' : 'Add Unit'}</h2>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Abbreviation *</label>
                  <input
                    type="text"
                    value={formData.abbreviation}
                    onChange={(e) => setFormData({ ...formData, abbreviation: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.is_base_unit}
                      onChange={(e) => setFormData({ ...formData, is_base_unit: e.target.checked, base_unit_id: '' })}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm font-medium text-gray-700">Is Base Unit</span>
                  </label>
                </div>

                {!formData.is_base_unit && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Base Unit</label>
                      <select
                        value={formData.base_unit_id}
                        onChange={(e) => setFormData({ ...formData, base_unit_id: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      >
                        <option value="">Select Base Unit</option>
                        {baseUnits.map((unit) => (
                          <option key={unit.id} value={unit.id}>
                            {unit.name} ({unit.abbreviation})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Conversion Factor</label>
                      <input
                        type="number"
                        step="0.000001"
                        value={formData.conversion_factor}
                        onChange={(e) => setFormData({ ...formData, conversion_factor: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        required
                      />
                      <p className="mt-1 text-xs text-gray-500">How many of this unit equals 1 base unit</p>
                    </div>
                  </>
                )}

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
                  {selectedUnit ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Units;







