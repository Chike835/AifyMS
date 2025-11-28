import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { Printer, Plus, Edit, Trash2, X, CheckCircle, AlertCircle, Star } from 'lucide-react';

const ReceiptPrinters = () => {
  const { hasPermission, user } = useAuth();
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedPrinter, setSelectedPrinter] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    printer_type: 'thermal',
    connection_type: 'usb',
    connection_string: '',
    paper_width_mm: '80',
    is_default: false,
    is_active: true,
    branch_id: user?.branch_id || ''
  });
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // Fetch printers
  const { data, isLoading, error } = useQuery({
    queryKey: ['receiptPrinters'],
    queryFn: async () => {
      const response = await api.get('/receipt-printers');
      return response.data.printers || [];
    }
  });

  // Fetch branches (for Super Admin)
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
    mutationFn: async (printerData) => {
      const response = await api.post('/receipt-printers', printerData);
      return response.data;
    },
    onSuccess: () => {
      setFormSuccess('Printer created successfully!');
      setFormError('');
      setShowCreateModal(false);
      setFormData({
        name: '',
        printer_type: 'thermal',
        connection_type: 'usb',
        connection_string: '',
        paper_width_mm: '80',
        is_default: false,
        is_active: true,
        branch_id: user?.branch_id || ''
      });
      queryClient.invalidateQueries(['receiptPrinters']);
      setTimeout(() => setFormSuccess(''), 3000);
    },
    onError: (err) => {
      setFormError(err.response?.data?.error || 'Failed to create printer');
      setTimeout(() => setFormError(''), 5000);
    }
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data: printerData }) => {
      const response = await api.put(`/receipt-printers/${id}`, printerData);
      return response.data;
    },
    onSuccess: () => {
      setFormSuccess('Printer updated successfully!');
      setFormError('');
      setShowEditModal(false);
      setSelectedPrinter(null);
      queryClient.invalidateQueries(['receiptPrinters']);
      setTimeout(() => setFormSuccess(''), 3000);
    },
    onError: (err) => {
      setFormError(err.response?.data?.error || 'Failed to update printer');
      setTimeout(() => setFormError(''), 5000);
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const response = await api.delete(`/receipt-printers/${id}`);
      return response.data;
    },
    onSuccess: () => {
      setFormSuccess('Printer deleted successfully!');
      setFormError('');
      queryClient.invalidateQueries(['receiptPrinters']);
      setTimeout(() => setFormSuccess(''), 3000);
    },
    onError: (err) => {
      setFormError(err.response?.data?.error || 'Failed to delete printer');
      setTimeout(() => setFormError(''), 5000);
    }
  });

  const handleCreate = (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.name) {
      setFormError('Name is required');
      return;
    }

    createMutation.mutate({
      name: formData.name.trim(),
      printer_type: formData.printer_type,
      connection_type: formData.connection_type,
      connection_string: formData.connection_string.trim() || null,
      paper_width_mm: parseInt(formData.paper_width_mm) || 80,
      is_default: formData.is_default,
      is_active: formData.is_active,
      branch_id: formData.branch_id || null
    });
  };

  const handleEdit = (printer) => {
    setSelectedPrinter(printer);
    setFormData({
      name: printer.name,
      printer_type: printer.printer_type,
      connection_type: printer.connection_type,
      connection_string: printer.connection_string || '',
      paper_width_mm: printer.paper_width_mm.toString(),
      is_default: printer.is_default,
      is_active: printer.is_active,
      branch_id: printer.branch_id || ''
    });
    setShowEditModal(true);
    setFormError('');
  };

  const handleUpdate = (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.name) {
      setFormError('Name is required');
      return;
    }

    updateMutation.mutate({
      id: selectedPrinter.id,
      data: {
        name: formData.name.trim(),
        printer_type: formData.printer_type,
        connection_type: formData.connection_type,
        connection_string: formData.connection_string.trim() || null,
        paper_width_mm: parseInt(formData.paper_width_mm) || 80,
        is_default: formData.is_default,
        is_active: formData.is_active,
        branch_id: formData.branch_id || null
      }
    });
  };

  const handleDelete = (printer) => {
    if (window.confirm(`Are you sure you want to delete printer "${printer.name}"?`)) {
      deleteMutation.mutate(printer.id);
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
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-lg">
          Error loading printers: {error.message}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Receipt Printers</h1>
          <p className="text-gray-600">Manage receipt printer configurations</p>
        </div>
        {hasPermission('sale_edit_price') && (
          <button
            onClick={() => {
              setShowCreateModal(true);
              setFormData({
                name: '',
                printer_type: 'thermal',
                connection_type: 'usb',
                connection_string: '',
                paper_width_mm: '80',
                is_default: false,
                is_active: true,
                branch_id: user?.branch_id || ''
              });
              setFormError('');
            }}
            className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            <Plus className="h-5 w-5" />
            <span>Add Printer</span>
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

      {/* Printers Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Connection
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Paper Width
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Branch
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Default
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              {hasPermission('sale_edit_price') && (
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data?.map((printer) => (
              <tr key={printer.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{printer.name}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                    {printer.printer_type}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{printer.connection_type}</div>
                  {printer.connection_string && (
                    <div className="text-xs text-gray-500">{printer.connection_string}</div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{printer.paper_width_mm}mm</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{printer.branch?.name || 'All Branches'}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {printer.is_default ? (
                    <Star className="h-5 w-5 text-yellow-500 fill-current" />
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    printer.is_active
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {printer.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                {hasPermission('sale_edit_price') && (
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => handleEdit(printer)}
                        className="text-primary-600 hover:text-primary-900"
                      >
                        <Edit className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(printer)}
                        className="text-red-600 hover:text-red-900"
                        disabled={printer.is_default}
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
            No printers found
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {(showCreateModal || showEditModal) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">
                {showCreateModal ? 'Add Printer' : 'Edit Printer'}
              </h2>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setShowEditModal(false);
                  setSelectedPrinter(null);
                  setFormError('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <form onSubmit={showCreateModal ? handleCreate : handleUpdate}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Printer Name *
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
                    Printer Type *
                  </label>
                  <select
                    value={formData.printer_type}
                    onChange={(e) => setFormData({ ...formData, printer_type: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500"
                    required
                  >
                    <option value="thermal">Thermal</option>
                    <option value="inkjet">Inkjet</option>
                    <option value="laser">Laser</option>
                    <option value="dot_matrix">Dot Matrix</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Connection Type *
                  </label>
                  <select
                    value={formData.connection_type}
                    onChange={(e) => setFormData({ ...formData, connection_type: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500"
                    required
                  >
                    <option value="usb">USB</option>
                    <option value="network">Network</option>
                    <option value="bluetooth">Bluetooth</option>
                    <option value="serial">Serial</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Connection String
                  </label>
                  <input
                    type="text"
                    value={formData.connection_string}
                    onChange={(e) => setFormData({ ...formData, connection_string: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500"
                    placeholder="e.g., IP address, COM port, device path"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Required for network/serial connections
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Paper Width (mm)
                  </label>
                  <input
                    type="number"
                    min="58"
                    max="110"
                    value={formData.paper_width_mm}
                    onChange={(e) => setFormData({ ...formData, paper_width_mm: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Common: 58mm, 80mm, 110mm
                  </p>
                </div>
                {user?.role_name === 'Super Admin' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Branch
                    </label>
                    <select
                      value={formData.branch_id}
                      onChange={(e) => setFormData({ ...formData, branch_id: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="">All Branches</option>
                      {branchesData?.map((branch) => (
                        <option key={branch.id} value={branch.id}>
                          {branch.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="is_default"
                    checked={formData.is_default}
                    onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <label htmlFor="is_default" className="text-sm text-gray-700">
                    Set as Default Printer
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
                  {showCreateModal ? 'Create Printer' : 'Update Printer'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setShowEditModal(false);
                    setSelectedPrinter(null);
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

export default ReceiptPrinters;










