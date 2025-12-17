import { useState, useMemo, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { Package, Plus, ArrowRightLeft, Edit, UploadCloud, X, Trash2 } from 'lucide-react';
import TransferModal from '../components/inventory/TransferModal';
import AdjustModal from '../components/inventory/AdjustModal';
import ImportModal from '../components/import/ImportModal';
import ListToolbar from '../components/common/ListToolbar';
import ExportModal from '../components/import/ExportModal';
import SearchableSelect from '../components/common/SearchableSelect';
import BatchTypeSelect from '../components/inventory/BatchTypeSelect';

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
  const [batches, setBatches] = useState([
    {
      product_id: '',
      branch_id: user?.branch_id || '',
      batch_type_id: '',
      instance_code: '',
      initial_quantity: '',
      grouped: true
    }
  ]);
  const fetchingCodes = useRef(new Set()); // Track which batches are currently fetching codes

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

  // Fetch all products - include variant children, exclude parent variable products
  const { data: products } = useQuery({
    queryKey: ['products', 'all_inventory', 'with_variants'],
    queryFn: async () => {
      // Get all products including variant children (backend filters to exclude parent variable products)
      const response = await api.get('/products', { params: { include_variants: 'true' } });
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
    mutationFn: async (batchesToCreate) => {
      const results = [];
      for (const batch of batchesToCreate) {
        try {
          const response = await api.post('/inventory/instances', batch);
          results.push({ success: true, batch: response.data.batch });
        } catch (err) {
          results.push({
            success: false,
            error: err.response?.data?.error || 'Failed to create batch',
            instance_code: batch.instance_code
          });
        }
      }
      return results;
    },
    onSuccess: (results) => {
      queryClient.invalidateQueries({ queryKey: ['inventoryInstances'] });
      const successCount = results.filter(r => r.success).length;
      const failCount = results.filter(r => !r.success).length;

      if (failCount > 0) {
        const errors = results.filter(r => !r.success).map(r => `${r.instance_code || 'Batch'}: ${r.error}`).join(', ');
        alert(`Created ${successCount} batch(es), but ${failCount} failed: ${errors}`);
      } else {
        alert(`Successfully registered ${successCount} batch(es)!`);
      }

      setShowRegisterModal(false);
      setBatches([{
        product_id: '',
        branch_id: user?.branch_id || '',
        batch_type_id: '',
        instance_code: '',
        initial_quantity: '',
        grouped: true
      }]);
    },
    onError: (error) => {
      alert(error.response?.data?.error || 'Failed to register batches');
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

  // Auto-fill instance codes for batches that need them
  useEffect(() => {
    if (!showRegisterModal) {
      fetchingCodes.current.clear(); // Clear fetching state when modal closes
      return;
    }

    batches.forEach((batch, index) => {
      // Only fetch if: grouped is true, has product, branch, and batch_type, but no instance_code
      // And not already fetching for this batch
      const fetchKey = `${index}-${batch.product_id}-${batch.branch_id}-${batch.batch_type_id}`;
      if (
        batch.grouped &&
        batch.product_id &&
        batch.branch_id &&
        batch.batch_type_id &&
        !batch.instance_code &&
        !fetchingCodes.current.has(fetchKey)
      ) {
        fetchingCodes.current.add(fetchKey);
        fetchSuggestedCode(index, batch.product_id, batch.branch_id, batch.batch_type_id).finally(() => {
          fetchingCodes.current.delete(fetchKey);
        });
      }
    });
  }, [batches, showRegisterModal]); // Re-run when batches change or modal opens

  const fetchSuggestedCode = async (index, productId, branchId, batchTypeId) => {
    if (!productId || !branchId || !batchTypeId) {
      return Promise.resolve();
    }

    try {
      const response = await api.get('/inventory/batches/suggest-code', {
        params: { 
          product_id: productId, 
          branch_id: branchId,
          batch_type_id: batchTypeId
        }
      });

      const suggestedCode = response.data.suggested_code;

      setBatches(prevBatches => {
        const newBatches = [...prevBatches];

        // Safety check: ensure batch exists and still has matching product/branch/batch_type
        if (!newBatches[index] ||
          newBatches[index].product_id !== productId ||
          newBatches[index].branch_id !== branchId ||
          newBatches[index].batch_type_id !== batchTypeId) {
          return prevBatches;
        }

        // Check for duplicates in other batches to handle local increments
        let finalCode = suggestedCode;
        const checkConflict = (code) => newBatches.some((b, i) => i !== index && b.instance_code === code);

        if (checkConflict(finalCode)) {
          // Parse the format: SKU-{BATCH_TYPE}-XXX where XXX is the sequence number
          // Match pattern: anything ending with - followed by digits
          const match = finalCode.match(/^(.+-)(\d+)$/);
          if (match) {
            const prefix = match[1]; // Everything up to and including the last "-"
            let num = parseInt(match[2], 10);
            const originalPadding = match[2].length; // Preserve original padding length

            while (checkConflict(finalCode)) {
              num++;
              // Use original padding length, minimum 3 digits
              const padding = Math.max(originalPadding, 3);
              finalCode = `${prefix}${String(num).padStart(padding, '0')}`;
            }
          }
        }

        newBatches[index].instance_code = finalCode;
        return newBatches;
      });
    } catch (error) {
      console.error("Error fetching instance code:", error);
    }
  };

  const updateBatch = (index, field, value) => {
    const newBatches = [...batches];
    newBatches[index][field] = value;
    // If product changes, clear batch_type_id since batch types are product-specific
    if (field === 'product_id') {
      newBatches[index].batch_type_id = '';
      newBatches[index].instance_code = ''; // Clear instance code when product changes
    }
    // If batch_type changes, clear instance_code to regenerate with new batch type
    if (field === 'batch_type_id') {
      newBatches[index].instance_code = '';
    }
    setBatches(newBatches);

    // Trigger suggestion if product, branch, or batch_type changed for a grouped batch
    const batchToCheck = newBatches[index]; // Use the updated batch object
    // Note: 'grouped' in batchToCheck might be the OLD value if we don't update it carefully, 
    // but we updated newBatches[index][field] = value above, so it is current.

    if (batchToCheck.grouped) {
      if (field === 'product_id' || field === 'branch_id' || field === 'batch_type_id' || (field === 'grouped' && value === true)) {
        const prod = batchToCheck.product_id;
        const branch = batchToCheck.branch_id;
        const batchType = batchToCheck.batch_type_id;

        // If triggered by grouped toggle, only fetch if code is empty
        if (field === 'grouped' && batchToCheck.instance_code) {
          return;
        }

        // Only fetch if all three are set (product, branch, and batch_type)
        if (prod && branch && batchType) {
          fetchSuggestedCode(index, prod, branch, batchType);
        }
      }
    }
  };

  const addBatch = () => {
    const newBatch = {
      product_id: batches[0]?.product_id || '', // Use same product for new batch
      branch_id: user?.branch_id || '',
      batch_type_id: '',
      instance_code: '',
      initial_quantity: '',
      grouped: true
    };

    setBatches(prev => [...prev, newBatch]);
  };


  const removeBatch = (index) => {
    if (batches.length > 1) {
      setBatches(batches.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Validate all batches
    const invalidBatches = batches.filter(b => {
      if (!b.product_id || !b.branch_id || !b.initial_quantity) return true;
      if (b.grouped && !b.instance_code?.trim()) return true;
      return false;
    });

    if (invalidBatches.length > 0) {
      alert('Please ensure all batches have product, branch, and quantity. Grouped batches also require an instance code.');
      return;
    }

    // Prepare batches for submission
    const batchesToCreate = batches.map(batch => ({
      product_id: batch.product_id,
      branch_id: batch.branch_id,
      batch_type_id: batch.batch_type_id || undefined, // Optional, backend will use default
      instance_code: batch.grouped ? batch.instance_code : undefined,
      initial_quantity: parseFloat(batch.initial_quantity),
      grouped: batch.grouped
    }));

    registerMutation.mutate(batchesToCreate);
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">Register New Batches</h2>
              <button
                type="button"
                onClick={() => setShowRegisterModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="space-y-4">
                {batches.map((batch, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="font-medium text-gray-900">Batch {index + 1}</h4>
                      {batches.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeBatch(index)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Product *
                        </label>
                        <SearchableSelect
                          required
                          options={products || []}
                          value={batch.product_id}
                          onChange={(value) => updateBatch(index, 'product_id', value)}
                          placeholder="Search and select product..."
                          getOptionLabel={(product) => `${product.name} (${product.sku})${product.type ? ` - ${product.type}` : ''}`}
                          getOptionValue={(product) => product.id}
                          searchFields={['name', 'sku', 'type']}
                          className="w-full"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Branch *
                        </label>
                        <select
                          required
                          value={batch.branch_id}
                          onChange={(e) => updateBatch(index, 'branch_id', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                        >
                          <option value="">Select Branch</option>
                          {(branches || []).map(branch => (
                            <option key={branch.id} value={branch.id}>
                              {branch.name} ({branch.code})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Batch Type
                        </label>
                        <BatchTypeSelect
                          productId={batch.product_id}
                          products={products}
                          value={batch.batch_type_id}
                          onChange={(value) => updateBatch(index, 'batch_type_id', value)}
                          disabled={!batch.product_id}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                        />
                      </div>
                      <div>
                        <label className="flex items-center space-x-2 mb-1">
                          <input
                            type="checkbox"
                            checked={batch.grouped}
                            onChange={(e) => updateBatch(index, 'grouped', e.target.checked)}
                            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                          />
                          <span className="text-sm font-medium text-gray-700">Grouped Batch</span>
                        </label>
                        {batch.grouped && (
                          <input
                            type="text"
                            required={batch.grouped}
                            placeholder="Instance Code (e.g., COIL-001)"
                            value={batch.instance_code}
                            onChange={(e) => updateBatch(index, 'instance_code', e.target.value)}
                            className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                          />
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Initial Quantity *
                        </label>
                        <input
                          type="number"
                          required
                          step="0.001"
                          min="0.001"
                          value={batch.initial_quantity}
                          onChange={(e) => updateBatch(index, 'initial_quantity', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={addBatch}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>Add Another Batch</span>
              </button>
              <div className="flex space-x-4 pt-4 border-t border-gray-200">
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
                  {registerMutation.isPending ? 'Registering...' : `Register ${batches.length} Batch${batches.length > 1 ? 'es' : ''}`}
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

