import { useCallback, useMemo, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, FileSpreadsheet, X, AlertCircle, Download } from 'lucide-react';
import api from '../../utils/api';
import { downloadEntityTemplate } from '../../utils/importTemplates';

const entityLabels = {
  products: 'Products',
  inventory: 'Inventory Instances',
  customers: 'Customers',
  payment_accounts: 'Payment Accounts',
  recipes: 'Recipes'
};

const ImportModal = ({ isOpen, onClose, entity, title = 'Import Data', onSuccess, targetEndpoint }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const acceptedMimeTypes = useMemo(
    () => ({
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
    }),
    []
  );

  const onDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles && acceptedFiles.length > 0) {
      setSelectedFile(acceptedFiles[0]);
      setError(null);
    }
  }, []);

  const {
    getRootProps,
    getInputProps,
    isDragActive,
    isDragReject
  } = useDropzone({
    onDrop,
    accept: acceptedMimeTypes,
    multiple: false
  });

  if (!isOpen) {
    return null;
  }

  const entityLabel = entityLabels[entity] || 'Records';

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!selectedFile) {
      setError('Please select a CSV or Excel file to import.');
      return;
    }

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      setIsSubmitting(true);
      setError(null);

      // Use targetEndpoint if provided, otherwise fall back to default pattern
      let endpoint = targetEndpoint || `/import/${entity}`;

      // Remove leading /api if present because api instance adds it via baseURL
      if (endpoint.startsWith('/api/')) {
        endpoint = endpoint.substring(4);
      }

      const response = await api.post(endpoint, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      // Validate response results
      const results = response.data?.results || response.data || {};
      const created = results.created || 0;
      const updated = results.updated || 0;
      const skipped = results.skipped || 0;
      const errors = results.errors || [];
      const totalSuccessful = created + updated;

      // If no records were created or updated, show error
      if (totalSuccessful === 0) {
        const errorMessage = errors.length > 0
          ? `Import failed: ${errors[0].error || 'No records were created or updated. Check your data format.'}`
          : 'Import failed: No records were created or updated. Please check your data format and try again.';
        setError(errorMessage);
        // Keep modal open so user can see the error
        return;
      }

      // If there were some successes but also errors, show warning but proceed
      if (errors.length > 0) {
        const errorSummary = errors.length === 1
          ? errors[0].error
          : `${errors.length} rows had errors. First error: ${errors[0].error}`;
        setError(`Import completed with warnings: ${errorSummary}`);
        // Still close modal and call onSuccess since some records were created
        setTimeout(() => {
          onSuccess?.(response.data);
          setSelectedFile(null);
          setError(null);
          onClose();
        }, 3000);
        return;
      }

      // Success - no errors
      onSuccess?.(response.data);
      setSelectedFile(null);
      setError(null);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to import file. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 px-4">
      <div className="w-full max-w-xl rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
            <p className="text-sm text-gray-500">
              {entity ? `Upload CSV or Excel file with ${entityLabel.toLowerCase()}.` : 'Upload CSV or Excel file to import data.'}
            </p>
          </div>
          <button
            onClick={() => {
              setSelectedFile(null);
              setError(null);
              onClose();
            }}
            className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-6">
          <div
            {...getRootProps()}
            className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-10 text-center transition ${
              isDragActive
                ? 'border-primary-500 bg-primary-50'
                : isDragReject
                ? 'border-red-400 bg-red-50'
                : 'border-gray-300 bg-gray-50 hover:border-primary-400 hover:bg-gray-100'
            }`}
          >
            <input {...getInputProps()} />
            <UploadCloud className="mb-4 h-10 w-10 text-primary-500" />
            <p className="text-base font-medium text-gray-900">
              {isDragActive ? 'Drop the file here...' : 'Drag & drop your file here'}
            </p>
            <p className="mt-2 text-sm text-gray-500">Or click to browse your files</p>
            <p className="mt-4 text-xs text-gray-500">Accepted: .csv, .xls, .xlsx</p>
          </div>

          {selectedFile && (
            <div className="flex items-center rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700">
              <FileSpreadsheet className="mr-3 h-5 w-5 text-primary-500" />
              <div className="flex-1">
                <p className="font-medium">{selectedFile.name}</p>
                <p className="text-xs text-gray-500">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedFile(null)}
                className="text-sm text-red-500 hover:text-red-600"
              >
                Remove
              </button>
            </div>
          )}

          {error && (
            <div className="flex items-start rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <AlertCircle className="mr-2 h-5 w-5 flex-shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <div className="flex items-center justify-between border-t border-gray-100 pt-4">
            {entity && (
              <button
                type="button"
                onClick={() => downloadEntityTemplate(entity)}
                className="flex items-center space-x-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <Download className="h-4 w-4" />
                <span>Download Template</span>
              </button>
            )}
            {!entity && <div></div>}
            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={() => {
                  setSelectedFile(null);
                  setError(null);
                  onClose();
                }}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? 'Importing...' : 'Start Import'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ImportModal;

