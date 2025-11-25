import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { Printer, Search, CheckSquare, Square, X, CheckCircle, AlertCircle } from 'lucide-react';
import LabelPreview from '../components/inventory/LabelPreview';

const PrintLabels = () => {
  const { hasPermission, user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInstances, setSelectedInstances] = useState(new Set());
  const [generatedLabels, setGeneratedLabels] = useState(null);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // Fetch inventory instances
  const { data, isLoading } = useQuery({
    queryKey: ['inventoryInstances'],
    queryFn: async () => {
      const response = await api.get('/inventory/instances');
      return response.data.instances || [];
    },
  });

  // Generate labels mutation
  const generateLabelsMutation = useMutation({
    mutationFn: async (instanceIds) => {
      const response = await api.post('/inventory/instances/labels', {
        instance_ids: instanceIds,
        format: 'barcode',
        size: 'medium'
      });
      return response.data;
    },
    onSuccess: (data) => {
      setGeneratedLabels(data.labels);
      setFormSuccess(`${data.count} label(s) generated successfully!`);
      setFormError('');
      setTimeout(() => setFormSuccess(''), 3000);
    },
    onError: (err) => {
      setFormError(err.response?.data?.error || 'Failed to generate labels');
      setTimeout(() => setFormError(''), 5000);
    }
  });

  const filteredInstances = data?.filter(instance => {
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return (
        instance.instance_code?.toLowerCase().includes(searchLower) ||
        instance.product?.name?.toLowerCase().includes(searchLower) ||
        instance.product?.sku?.toLowerCase().includes(searchLower)
      );
    }
    return true;
  }) || [];

  const toggleSelect = (instanceId) => {
    const newSelected = new Set(selectedInstances);
    if (newSelected.has(instanceId)) {
      newSelected.delete(instanceId);
    } else {
      newSelected.add(instanceId);
    }
    setSelectedInstances(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedInstances.size === filteredInstances.length) {
      setSelectedInstances(new Set());
    } else {
      setSelectedInstances(new Set(filteredInstances.map(inst => inst.id)));
    }
  };

  const handleGenerateLabels = () => {
    if (selectedInstances.size === 0) {
      setFormError('Please select at least one instance');
      setTimeout(() => setFormError(''), 3000);
      return;
    }

    generateLabelsMutation.mutate(Array.from(selectedInstances));
  };

  const handlePrint = () => {
    window.print();
  };

  const formatQuantity = (qty) => {
    return parseFloat(qty).toFixed(3);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!hasPermission('stock_add_opening')) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-lg">
          You do not have permission to print labels.
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Print Labels</h1>
        <p className="text-gray-600">Select inventory instances and generate printable labels</p>
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

      {!generatedLabels ? (
        <>
          {/* Search and Selection */}
          <div className="bg-white rounded-lg shadow p-4 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex-1 max-w-md">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by instance code, product name, or SKU..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <button
                  onClick={toggleSelectAll}
                  className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  {selectedInstances.size === filteredInstances.length ? (
                    <CheckSquare className="h-5 w-5" />
                  ) : (
                    <Square className="h-5 w-5" />
                  )}
                  <span>Select All ({selectedInstances.size}/{filteredInstances.length})</span>
                </button>
                <button
                  onClick={handleGenerateLabels}
                  disabled={selectedInstances.size === 0 || generateLabelsMutation.isLoading}
                  className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Printer className="h-5 w-5" />
                  <span>
                    {generateLabelsMutation.isLoading 
                      ? 'Generating...' 
                      : `Generate Labels (${selectedInstances.size})`
                    }
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Instances List */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                    <input
                      type="checkbox"
                      checked={selectedInstances.size === filteredInstances.length && filteredInstances.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Instance Code
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Product
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quantity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Branch
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredInstances.map((instance) => (
                  <tr key={instance.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedInstances.has(instance.id)}
                        onChange={() => toggleSelect(instance.id)}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{instance.instance_code}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{instance.product?.name || 'N/A'}</div>
                      <div className="text-xs text-gray-500">{instance.product?.sku || ''}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{formatQuantity(instance.remaining_quantity)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{instance.branch?.name || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        instance.status === 'in_stock' 
                          ? 'bg-green-100 text-green-800'
                          : instance.status === 'reserved'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {instance.status?.replace('_', ' ').toUpperCase() || 'N/A'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredInstances.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                {searchTerm ? 'No instances found matching your search' : 'No inventory instances found'}
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          {/* Label Preview */}
          <div className="mb-4">
            <button
              onClick={() => {
                setGeneratedLabels(null);
                setSelectedInstances(new Set());
              }}
              className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <X className="h-5 w-5" />
              <span>Back to Selection</span>
            </button>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <LabelPreview labels={generatedLabels} onPrint={handlePrint} />
          </div>
        </>
      )}

      {/* Print Styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-area, .print-area * {
            visibility: visible;
          }
          .print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
};

export default PrintLabels;






