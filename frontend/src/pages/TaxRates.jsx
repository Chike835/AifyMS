import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import ListToolbar from '../components/common/ListToolbar';
import ExportModal from '../components/import/ExportModal';
import { Percent, Plus, Edit, Trash2, X, CheckCircle, AlertCircle, Star } from 'lucide-react';

const TaxRates = () => {
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedTaxRate, setSelectedTaxRate] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    rate: '',
    is_compound: false,
    is_default: false,
    is_active: true
  });
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Pagination
  const [limit, setLimit] = useState(25);

  // Column visibility
  const [visibleColumns, setVisibleColumns] = useState({
    name: true,
    rate: true,
    compound: true,
    default: true,
    status: true
  });

  // Export modal
  const [showExportModal, setShowExportModal] = useState(false);

  // Fetch tax rates
  const { data, isLoading, error } = useQuery({
    queryKey: ['taxRates'],
    queryFn: async () => {
      const response = await api.get('/tax-rates');
      return response.data.tax_rates || [];
    }
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (taxRateData) => {
      const response = await api.post('/tax-rates', taxRateData);
      return response.data;
    },
    onSuccess: () => {
      setFormSuccess('Tax rate created successfully!');
      setFormError('');
      setShowCreateModal(false);
      setFormData({
        name: '',
        rate: '',
        is_compound: false,
        is_default: false,
        is_active: true
      });
      queryClient.invalidateQueries(['taxRates']);
      setTimeout(() => setFormSuccess(''), 3000);
    },
    onError: (err) => {
      setFormError(err.response?.data?.error || 'Failed to create tax rate');
      setTimeout(() => setFormError(''), 5000);
    }
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data: taxRateData }) => {
      const response = await api.put(`/tax-rates/${id}`, taxRateData);
      return response.data;
    },
    onSuccess: () => {
      setFormSuccess('Tax rate updated successfully!');
      setFormError('');
      setShowEditModal(false);
      setSelectedTaxRate(null);
      queryClient.invalidateQueries(['taxRates']);
      setTimeout(() => setFormSuccess(''), 3000);
    },
    onError: (err) => {
      setFormError(err.response?.data?.error || 'Failed to update tax rate');
      setTimeout(() => setFormError(''), 5000);
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const response = await api.delete(`/tax-rates/${id}`);
      return response.data;
    },
    onSuccess: () => {
      setFormSuccess('Tax rate deleted successfully!');
      setFormError('');
      queryClient.invalidateQueries(['taxRates']);
      setTimeout(() => setFormSuccess(''), 3000);
    },
    onError: (err) => {
      setFormError(err.response?.data?.error || 'Failed to delete tax rate');
      setTimeout(() => setFormError(''), 5000);
    }
  });

  const handleCreate = (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.name || formData.rate === '') {
      setFormError('Name and rate are required');
      return;
    }

    const rate = parseFloat(formData.rate);
    if (isNaN(rate) || rate < 0 || rate > 100) {
      setFormError('Rate must be between 0 and 100');
      return;
    }

    createMutation.mutate({
      name: formData.name.trim(),
      rate: rate,
      is_compound: formData.is_compound,
      is_default: formData.is_default,
      is_active: formData.is_active
    });
  };

  const handleEdit = (taxRate) => {
    setSelectedTaxRate(taxRate);
    setFormData({
      name: taxRate.name,
      rate: taxRate.rate.toString(),
      is_compound: taxRate.is_compound,
      is_default: taxRate.is_default,
      is_active: taxRate.is_active
    });
    setShowEditModal(true);
    setFormError('');
  };

  const handleUpdate = (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.name || formData.rate === '') {
      setFormError('Name and rate are required');
      return;
    }

    const rate = parseFloat(formData.rate);
    if (isNaN(rate) || rate < 0 || rate > 100) {
      setFormError('Rate must be between 0 and 100');
      return;
    }

    updateMutation.mutate({
      id: selectedTaxRate.id,
      data: {
        name: formData.name.trim(),
        rate: rate,
        is_compound: formData.is_compound,
        is_default: formData.is_default,
        is_active: formData.is_active
      }
    });
  };

  const handleDelete = (taxRate) => {
    if (window.confirm(`Are you sure you want to delete "${taxRate.name}"?`)) {
      deleteMutation.mutate(taxRate.id);
    }
  };

  const handleSetDefault = (taxRate) => {
    if (taxRate.is_default) return;

    updateMutation.mutate({
      id: taxRate.id,
      data: {
        ...taxRate,
        is_default: true
      }
    });
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
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-lg">
          Error loading tax rates: {error.message}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Tax Rates</h1>
          <p className="text-gray-600">Manage tax rates and tax groups</p>
        </div>
        {hasPermission('settings_manage') && (
          <button
            onClick={() => {
              setShowCreateModal(true);
              setFormData({
                name: '',
                rate: '',
                is_compound: false,
                is_default: false,
                is_active: true
              });
              setFormError('');
            }}
            className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            <Plus className="h-5 w-5" />
            <span>Add Tax Rate</span>
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

      {/* Toolbar */}
      <ListToolbar
        limit={limit}
        onLimitChange={setLimit}
        visibleColumns={visibleColumns}
        onColumnVisibilityChange={setVisibleColumns}
        onExport={() => setShowExportModal(true)}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search tax rates..."
      />

      {/* Export Modal */}
      {showExportModal && (
        <ExportModal
          isOpen={showExportModal}
          onClose={() => setShowExportModal(false)}
          entity="tax-rates"
          title="Export Tax Rates"
        />
      )}

      {/* Tax Rates Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Rate
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Compound
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Default
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              {hasPermission('settings_manage') && (
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data?.map((taxRate) => (
              <tr key={taxRate.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{taxRate.name}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{taxRate.rate}%</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    taxRate.is_compound
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {taxRate.is_compound ? 'Yes' : 'No'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {taxRate.is_default ? (
                    <Star className="h-5 w-5 text-yellow-500 fill-current" />
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    taxRate.is_active
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {taxRate.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                {hasPermission('settings_manage') && (
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-2">
                      {!taxRate.is_default && (
                        <button
                          onClick={() => handleSetDefault(taxRate)}
                          className="text-yellow-600 hover:text-yellow-900"
                          title="Set as default"
                        >
                          <Star className="h-5 w-5" />
                        </button>
                      )}
                      <button
                        onClick={() => handleEdit(taxRate)}
                        className="text-primary-600 hover:text-primary-900"
                      >
                        <Edit className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(taxRate)}
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
            No tax rates found
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Add Tax Rate</h2>
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
                    Name *
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
                    Rate (%) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={formData.rate}
                    onChange={(e) => setFormData({ ...formData, rate: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500"
                    required
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="is_compound"
                    checked={formData.is_compound}
                    onChange={(e) => setFormData({ ...formData, is_compound: e.target.checked })}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <label htmlFor="is_compound" className="text-sm text-gray-700">
                    Compound Tax
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="is_default"
                    checked={formData.is_default}
                    onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <label htmlFor="is_default" className="text-sm text-gray-700">
                    Set as Default
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <label htmlFor="is_active" className="text-sm text-gray-700">
                    Active
                  </label>
                </div>
              </div>
              <div className="mt-6 flex space-x-3">
                <button
                  type="submit"
                  className="flex-1 bg-primary-600 text-white py-2 rounded-lg hover:bg-primary-700"
                >
                  Create
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
      {showEditModal && selectedTaxRate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Edit Tax Rate</h2>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedTaxRate(null);
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
                    Name *
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
                    Rate (%) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={formData.rate}
                    onChange={(e) => setFormData({ ...formData, rate: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500"
                    required
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="edit_is_compound"
                    checked={formData.is_compound}
                    onChange={(e) => setFormData({ ...formData, is_compound: e.target.checked })}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <label htmlFor="edit_is_compound" className="text-sm text-gray-700">
                    Compound Tax
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="edit_is_default"
                    checked={formData.is_default}
                    onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <label htmlFor="edit_is_default" className="text-sm text-gray-700">
                    Set as Default
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="edit_is_active"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <label htmlFor="edit_is_active" className="text-sm text-gray-700">
                    Active
                  </label>
                </div>
              </div>
              <div className="mt-6 flex space-x-3">
                <button
                  type="submit"
                  className="flex-1 bg-primary-600 text-white py-2 rounded-lg hover:bg-primary-700"
                >
                  Update
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedTaxRate(null);
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
    </div>
  );
};

export default TaxRates;










