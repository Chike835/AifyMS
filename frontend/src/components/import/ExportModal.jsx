import { useState } from 'react';
import { Download, Filter, X, AlertCircle, FileText, FileSpreadsheet, File } from 'lucide-react';
import api from '../../utils/api';

const defaultFilters = {
  branch_id: '',
  product_id: '',
  customer_id: '',
  type: '',
  status: '',
  start_date: '',
  end_date: ''
};

const exportFormats = [
  { id: 'csv', label: 'CSV', icon: FileText, extension: '.csv', mimeType: 'text/csv' },
  { id: 'xlsx', label: 'Excel', icon: FileSpreadsheet, extension: '.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
  { id: 'pdf', label: 'PDF', icon: File, extension: '.pdf', mimeType: 'application/pdf' }
];

const ExportModal = ({
  isOpen,
  onClose,
  entity,
  title = 'Export Data',
  initialFilters = {}
}) => {
  const [filters, setFilters] = useState({ ...defaultFilters, ...initialFilters });
  const [selectedFormat, setSelectedFormat] = useState('csv');
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) {
    return null;
  }

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFilters((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const cleanFilters = () => {
    const result = {};
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && String(value).trim() !== '') {
        result[key] = value;
      }
    });
    return result;
  };

  const parseFilename = (disposition, fallback) => {
    if (!disposition) return fallback;
    const match = disposition.match(/filename=\"?([^\";]+)\"?/i);
    return match?.[1] || fallback;
  };

  const handleExport = async (event) => {
    event.preventDefault();
    try {
      setIsExporting(true);
      setError(null);

      const formatConfig = exportFormats.find(f => f.id === selectedFormat);
      const cleanedFilters = cleanFilters();

      const response = await api.get(`/export/${entity}`, {
        params: { ...cleanedFilters, format: selectedFormat },
        responseType: 'blob'
      });

      const suggestedName = `${entity}_export_${new Date().toISOString().split('T')[0]}${formatConfig.extension}`;
      const filename = parseFilename(response.headers['content-disposition'], suggestedName);

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);

      onClose();
    } catch (err) {
      const errorMessage = err.response?.data?.error || 'Failed to export data. Please try again.';
      // Handle blob error response
      if (err.response?.data instanceof Blob) {
        try {
          const text = await err.response.data.text();
          const json = JSON.parse(text);
          setError(json.error || errorMessage);
        } catch {
          setError(errorMessage);
        }
      } else {
        setError(errorMessage);
      }
    } finally {
      setIsExporting(false);
    }
  };

  const resetFilters = () => {
    setFilters({ ...defaultFilters });
    setError(null);
  };

  const selectedFormatConfig = exportFormats.find(f => f.id === selectedFormat);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 px-4">
      <div className="w-full max-w-2xl rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
            <p className="text-sm text-gray-500">
              Select format and configure optional filters before exporting.
            </p>
          </div>
          <button
            onClick={() => {
              resetFilters();
              onClose();
            }}
            className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleExport} className="px-6 py-5 space-y-5">
          {/* Format Selection */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Export Format</label>
            <div className="grid grid-cols-3 gap-3">
              {exportFormats.map((format) => {
                const Icon = format.icon;
                const isSelected = selectedFormat === format.id;
                return (
                  <button
                    key={format.id}
                    type="button"
                    onClick={() => setSelectedFormat(format.id)}
                    className={`flex flex-col items-center justify-center rounded-lg border-2 px-4 py-4 transition-all ${
                      isSelected
                        ? 'border-primary-500 bg-primary-50 text-primary-700'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className={`h-8 w-8 mb-2 ${isSelected ? 'text-primary-600' : 'text-gray-400'}`} />
                    <span className="text-sm font-medium">{format.label}</span>
                    <span className="text-xs text-gray-400">{format.extension}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Filters */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Filters (Optional)</label>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Branch ID</label>
                <input
                  type="text"
                  name="branch_id"
                  value={filters.branch_id}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
                  placeholder="e.g. 1"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Product ID</label>
                <input
                  type="text"
                  name="product_id"
                  value={filters.product_id}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
                  placeholder="e.g. 5"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Customer ID</label>
                <input
                  type="text"
                  name="customer_id"
                  value={filters.customer_id}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
                  placeholder="e.g. 12"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Type</label>
                <input
                  type="text"
                  name="type"
                  value={filters.type}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
                  placeholder="e.g. raw_tracked"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Status</label>
                <input
                  type="text"
                  name="status"
                  value={filters.status}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
                  placeholder="e.g. produced"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Start Date</label>
                <input
                  type="date"
                  name="start_date"
                  value={filters.start_date}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">End Date</label>
                <input
                  type="date"
                  name="end_date"
                  value={filters.end_date}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="flex items-start rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <AlertCircle className="mr-2 h-5 w-5 flex-shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <div className="flex items-center justify-between border-t border-gray-100 pt-4">
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              <Filter className="mr-2 h-4 w-4" />
              Reset Filters
            </button>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  resetFilters();
                  onClose();
                }}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isExporting}
                className="inline-flex items-center rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Download className="mr-2 h-4 w-4" />
                {isExporting ? 'Generating...' : `Export ${selectedFormatConfig?.label || 'Data'}`}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ExportModal;
