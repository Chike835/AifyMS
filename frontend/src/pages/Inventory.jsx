import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { Package, Plus, ArrowRightLeft, Edit, UploadCloud } from 'lucide-react';
import TransferModal from '../components/inventory/TransferModal';
import AdjustModal from '../components/inventory/AdjustModal';
import ImportModal from '../components/import/ImportModal';
import ListToolbar from '../components/common/ListToolbar';
import ExportModal from '../components/import/ExportModal';

import { sortData } from '../utils/sortUtils';
import SortIndicator from '../components/common/SortIndicator';

const Inventory = () => {
  const { hasPermission, user } = useAuth();
  const queryClient = useQueryClient();
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [selectedInstance, setSelectedInstance] = useState(null);
  const [formData, setFormData] = useState({
    product_id: '',
    branch_id: user?.branch_id || '',
    instance_code: '',
    initial_quantity: '',
  });

  // Sorting
  const [sortField, setSortField] = useState('instance_code');
  const [sortDirection, setSortDirection] = useState('asc');

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Toolbar states
  const [limit, setLimit] = useState(25);
  const [searchTerm, setSearchTerm] = useState('');
  const [visibleColumns, setVisibleColumns] = useState({
    instance_code: true,
    product: true,
    branch: true,
    initial_quantity: true,
    remaining: true,
    status: true,
    actions: true
  });

  // Fetch inventory instances
  const { data, isLoading } = useQuery({
    queryKey: ['inventoryInstances'],
    queryFn: async () => {
      const response = await api.get('/inventory/instances');
      return response.data.instances || [];
    },
  });

  // Fetch products (raw_tracked only)
  const { data: products } = useQuery({
    queryKey: ['products', 'all_inventory'],
    queryFn: async () => {
      const response = await api.get('/products');
      return response.data.products || [];
    },
  });

  // Fetch branches
  const { data: branches } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      const response = await api.get('/branches');
      return response.data.branches || [];
    },
  });

  // Transfer mutation
  const transferMutation = useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/inventory/transfer', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventoryInstances'] });
      setShowTransferModal(false);
      setSelectedInstance(null);
      alert('Transfer completed successfully!');
    },
    onError: (error) => {
      alert(error.response?.data?.error || 'Failed to transfer instance');
    },
  });

  // Adjust mutation
  const adjustMutation = useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/inventory/adjust', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventoryInstances'] });
      setShowAdjustModal(false);
      setSelectedInstance(null);
      alert('Stock adjusted successfully!');
    },
    onError: (error) => {
      alert(error.response?.data?.error || 'Failed to adjust stock');
    },
  });

  // Register new coil mutation
  const registerMutation = useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/inventory/instances', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventoryInstances'] });
      setShowRegisterModal(false);
      setFormData({
        product_id: '',
        branch_id: '',
        instance_code: '',
        initial_quantity: '',
      });
      alert('Coil registered successfully!');
    },
    onError: (error) => {
      alert(error.response?.data?.error || 'Failed to register coil');
    },
  });

  const instances = data || [];

  // Filter and paginate instances
  const filteredInstances = useMemo(() => {
    let result = instances;
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      result = instances.filter(instance =>
        instance.instance_code?.toLowerCase().includes(search) ||
        instance.product?.name?.toLowerCase().includes(search) ||
        instance.product?.sku?.toLowerCase().includes(search) ||
        instance.branch?.name?.toLowerCase().includes(search)
      );
    }
    return sortData(result, sortField, sortDirection);
  }, [instances, searchTerm, sortField, sortDirection]);

  const paginatedInstances = useMemo(() => {
    if (limit === -1) return filteredInstances;
    return filteredInstances.slice(0, limit);
  }, [filteredInstances, limit]);

  const handleSubmit = (e) => {
    e.preventDefault();
    registerMutation.mutate({
      ...formData,
      initial_quantity: parseFloat(formData.initial_quantity),
    });
  };



  const handlePrint = () => {
    window.print();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Inventory Management</h1>
          <p className="text-gray-600 mt-2">Manage coils and stock instances</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {hasPermission('stock_add_opening') && (
            <>
              <button
                onClick={() => setShowRegisterModal(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                <Plus className="h-5 w-5" />
                <span>Register</span>
              </button>
              <button
                onClick={() => setShowImportModal(true)}
                className="flex items-center space-x-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <UploadCloud className="h-5 w-5" />
                <span>Import Inventory</span>
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
        onPrint={handlePrint}
        onExport={() => setShowExportModal(true)}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search by code, product, SKU, or branch..."
      />

      {/* Export Modal */}
      {showExportModal && (
        <ExportModal
          isOpen={showExportModal}
          onClose={() => setShowExportModal(false)}
          entity="inventory"
          title="Export Inventory"
        />
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {visibleColumns.instance_code && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <button onClick={() => handleSort('instance_code')} className="flex items-center gap-1">
                      Instance Code
                      <SortIndicator field="instance_code" sortField={sortField} sortDirection={sortDirection} />
                    </button>
                  </th>
                )}
                {visibleColumns.product && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <button onClick={() => handleSort('product.name')} className="flex items-center gap-1">
                      Product
                      <SortIndicator field="product.name" sortField={sortField} sortDirection={sortDirection} />
                    </button>
                  </th>
                )}
                {visibleColumns.branch && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <button onClick={() => handleSort('branch.name')} className="flex items-center gap-1">
                      Branch
                      <SortIndicator field="branch.name" sortField={sortField} sortDirection={sortDirection} />
                    </button>
                  </th>
                )}
                {visibleColumns.initial_quantity && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <button onClick={() => handleSort('initial_quantity')} className="flex items-center gap-1">
                      Initial Quantity
                      <SortIndicator field="initial_quantity" sortField={sortField} sortDirection={sortDirection} />
                    </button>
                  </th>
                )}
                {visibleColumns.remaining && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <button onClick={() => handleSort('remaining_quantity')} className="flex items-center gap-1">
                      Remaining
                      <SortIndicator field="remaining_quantity" sortField={sortField} sortDirection={sortDirection} />
                    </button>
                  </th>
                )}
                {visibleColumns.status && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <button onClick={() => handleSort('status')} className="flex items-center gap-1">
                      Status
                      <SortIndicator field="status" sortField={sortField} sortDirection={sortDirection} />
                    </button>
                  </th>
                )}
                {visibleColumns.actions && (
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedInstances.length === 0 ? (
                <tr>
                  <td colSpan={Object.values(visibleColumns).filter(v => v).length} className="px-6 py-12 text-center text-gray-500">
                    <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No inventory instances found</p>
                    {searchTerm && (
                      <p className="text-sm mt-1">Try adjusting your search</p>
                    )}
                  </td>
                </tr>
              ) : (
                paginatedInstances.map((instance) => (
                  <tr key={instance.id} className="hover:bg-gray-50">
                    {visibleColumns.instance_code && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {instance.instance_code}
                        </div>
                      </td>
                    )}
                    {visibleColumns.product && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{instance.product?.name}</div>
                        <div className="text-sm text-gray-500">{instance.product?.sku}</div>
                      </td>
                    )}
                    {visibleColumns.branch && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {instance.branch?.name}
                      </td>
                    )}
                    {visibleColumns.initial_quantity && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {parseFloat(instance.initial_quantity).toFixed(3)} {instance.product?.base_unit}
                      </td>
                    )}
                    {visibleColumns.remaining && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {parseFloat(instance.remaining_quantity).toFixed(3)} {instance.product?.base_unit}
                      </td>
                    )}
                    {visibleColumns.status && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${instance.status === 'in_stock'
                            ? 'bg-green-100 text-green-800'
                            : instance.status === 'depleted'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-gray-100 text-gray-800'
                            }`}
                        >
                          {instance.status}
                        </span>
                      </td>
                    )}
                    {visibleColumns.actions && (
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          {hasPermission('stock_transfer_init') && (
                            <button
                              onClick={() => {
                                setSelectedInstance(instance);
                                setShowTransferModal(true);
                              }}
                              className="text-blue-600 hover:text-blue-900"
                              title="Transfer"
                            >
                              <ArrowRightLeft className="h-4 w-4" />
                            </button>
                          )}
                          {hasPermission('stock_adjust') && (
                            <button
                              onClick={() => {
                                setSelectedInstance(instance);
                                setShowAdjustModal(true);
                              }}
                              className="text-orange-600 hover:text-orange-900"
                              title="Adjust"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Register Coil Modal */}
      {showRegisterModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Register New Coil</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Product *
                </label>
                <select
                  required
                  value={formData.product_id}
                  onChange={(e) => setFormData({ ...formData, product_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Select Product</option>
                  {products?.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name} ({product.sku})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Instance Code *
                </label>
                <input
                  type="text"
                  required
                  value={formData.instance_code}
                  onChange={(e) => setFormData({ ...formData, instance_code: e.target.value })}
                  placeholder="e.g., COIL-001"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Initial Quantity *
                </label>
                <input
                  type="number"
                  required
                  step="0.001"
                  min="0"
                  value={formData.initial_quantity}
                  onChange={(e) => setFormData({ ...formData, initial_quantity: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div className="flex space-x-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowRegisterModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={registerMutation.isPending}
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {registerMutation.isPending ? 'Registering...' : 'Register'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <TransferModal
        isOpen={showTransferModal}
        instance={selectedInstance}
        branches={branches || []}
        isSubmitting={transferMutation.isPending}
        onClose={() => {
          setShowTransferModal(false);
          setSelectedInstance(null);
        }}
        onSubmit={(payload) => transferMutation.mutate(payload)}
      />

      <AdjustModal
        isOpen={showAdjustModal}
        instance={selectedInstance}
        isSubmitting={adjustMutation.isPending}
        onClose={() => {
          setShowAdjustModal(false);
          setSelectedInstance(null);
        }}
        onSubmit={(payload) => adjustMutation.mutate(payload)}
      />

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
            queryClient.invalidateQueries({ queryKey: ['inventoryInstances'] });

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
        entity="inventory"
        title="Import Inventory Instances"
        targetEndpoint="/api/import/inventory"
      />
    </div>
  );
};

export default Inventory;

