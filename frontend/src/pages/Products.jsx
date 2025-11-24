import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import ImportModal from '../components/import/ImportModal';
import ExportModal from '../components/import/ExportModal';
import { RefreshCcw, UploadCloud, Download, Package } from 'lucide-react';

const productTypeLabels = {
  standard: 'Standard',
  compound: 'Compound',
  raw_tracked: 'Raw (Tracked)',
  manufactured_virtual: 'Manufactured'
};

const Products = () => {
  const queryClient = useQueryClient();
  const { hasPermission } = useAuth();
  const [activeTypeFilter, setActiveTypeFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['products', activeTypeFilter, searchTerm],
    queryFn: async () => {
      const params = {};
      if (activeTypeFilter !== 'all') {
        params.type = activeTypeFilter;
      }
      if (searchTerm.trim()) {
        params.search = searchTerm.trim();
      }

      const response = await api.get('/products', { params });
      return response.data.products || [];
    }
  });

  const products = data || [];

  const filteredProducts = products;

  const canImport = hasPermission('product_add');
  const canExport = hasPermission('product_view');

  const handleImportSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['products'] });
  };

  const handleRefresh = async () => {
    await refetch();
  };

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Products</h1>
          <p className="mt-2 text-gray-600">Manage available products and attribute mappings.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {canImport && (
            <button
              onClick={() => setShowImportModal(true)}
              className="inline-flex items-center rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-primary-700"
            >
              <UploadCloud className="mr-2 h-4 w-4" />
              Import Products
            </button>
          )}
          {canExport && (
            <button
              onClick={() => setShowExportModal(true)}
              className="inline-flex items-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
            >
              <Download className="mr-2 h-4 w-4" />
              Export Products
            </button>
          )}
          <button
            onClick={handleRefresh}
            className="inline-flex items-center rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
          >
            <RefreshCcw className={`mr-2 h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'all', label: 'All' },
            { id: 'standard', label: 'Standard' },
            { id: 'compound', label: 'Compound' },
            { id: 'raw_tracked', label: 'Raw Tracked' },
            { id: 'manufactured_virtual', label: 'Manufactured' }
          ].map((type) => (
            <button
              key={type.id}
              onClick={() => setActiveTypeFilter(type.id)}
              className={`rounded-full px-4 py-2 text-sm font-medium ${
                activeTypeFilter === type.id
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>
        <div className="w-full md:w-72">
          <input
            type="text"
            placeholder="Search by name or SKU..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-primary-600"></div>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white px-6 py-12 text-center">
          <Package className="mx-auto mb-4 h-12 w-12 text-gray-400" />
          <p className="text-lg font-medium text-gray-700">No products found</p>
          <p className="mt-1 text-sm text-gray-500">Try adjusting your filters or importing products.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  SKU
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Brand / Color / Gauge
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Unit
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                  Sale Price
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                  Cost Price
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {filteredProducts.map((product) => (
                <tr key={product.id} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                    {product.sku}
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium text-gray-900">{product.name}</p>
                    {product.category && <p className="text-xs text-gray-500">{product.category}</p>}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-700">
                    {productTypeLabels[product.type] || product.type}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    <div>{product.brandAttribute?.name || product.brand || '—'}</div>
                    <div className="text-xs text-gray-500">
                      {product.colorAttribute?.name || 'No color'} • {product.gaugeAttribute?.name || 'No gauge'}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-700">
                    {product.base_unit}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-semibold text-gray-900">
                    ₦{parseFloat(product.sale_price).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-gray-700">
                    {product.cost_price !== undefined && product.cost_price !== null
                      ? `₦${parseFloat(product.cost_price).toLocaleString(undefined, {
                          minimumFractionDigits: 2
                        })}`
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showImportModal && (
        <ImportModal
          isOpen={showImportModal}
          onClose={() => setShowImportModal(false)}
          onSuccess={handleImportSuccess}
          entity="products"
          title="Import Products"
        />
      )}

      {showExportModal && (
        <ExportModal
          isOpen={showExportModal}
          onClose={() => setShowExportModal(false)}
          entity="products"
          title="Export Products"
        />
      )}
    </div>
  );
};

export default Products;

