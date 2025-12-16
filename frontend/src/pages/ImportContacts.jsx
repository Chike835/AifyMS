import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { Upload, Download, FileText, CheckCircle, AlertCircle, X } from 'lucide-react';

const ImportContacts = () => {
  const { hasPermission } = useAuth();
  const [contactType, setContactType] = useState('customers');
  const [selectedFile, setSelectedFile] = useState(null);
  const [importResults, setImportResults] = useState(null);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // Import mutation
  const importMutation = useMutation({
    mutationFn: async ({ type, file }) => {
      const formData = new FormData();
      formData.append('file', file);

      const response = await api.post(`/import/${type}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      return response.data;
    },
    onSuccess: (data) => {
      setImportResults(data.results);
      setFormSuccess(`Import completed! ${data.results.created} created, ${data.results.updated} updated, ${data.results.skipped} skipped.`);
      setFormError('');
      setSelectedFile(null);
      setTimeout(() => setFormSuccess(''), 5000);
    },
    onError: (err) => {
      setFormError(err.response?.data?.error || 'Failed to import contacts');
      setImportResults(null);
      setTimeout(() => setFormError(''), 5000);
    }
  });

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      const validTypes = [
        'text/csv',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      ];
      const validExtensions = ['.csv', '.xlsx', '.xls'];
      
      const isValidType = validTypes.includes(file.type) || 
        validExtensions.some(ext => file.name.toLowerCase().endsWith(ext));

      if (!isValidType) {
        setFormError('Invalid file type. Please upload a CSV or Excel file.');
        setSelectedFile(null);
        return;
      }

      // Validate file size (10MB)
      if (file.size > 10 * 1024 * 1024) {
        setFormError('File size exceeds 10MB limit.');
        setSelectedFile(null);
        return;
      }

      setSelectedFile(file);
      setFormError('');
      setImportResults(null);
    }
  };

  const handleImport = () => {
    if (!selectedFile) {
      setFormError('Please select a file to import');
      return;
    }

    setFormError('');
    setFormSuccess('');
    importMutation.mutate({
      type: contactType,
      file: selectedFile
    });
  };

  const downloadTemplate = () => {
    // Create CSV template
    const headers = contactType === 'customers' 
      ? ['name', 'phone', 'email', 'address', 'ledger_balance']
      : ['name', 'phone', 'email', 'address'];
    
    const csvContent = headers.join(',') + '\n' +
      (contactType === 'customers'
        ? 'John Doe,+2348012345678,john@example.com,123 Main St,0'
        : 'ABC Suppliers,+2348012345678,supplier@example.com,456 Business Ave') + '\n';

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${contactType}_template.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  if (!hasPermission('data_import')) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-lg">
          You do not have permission to import contacts.
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Import Contacts</h1>
        <p className="text-gray-600">Import customers or suppliers from CSV or Excel files</p>
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

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Import Settings</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Contact Type
            </label>
            <div className="flex space-x-4">
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  value="customers"
                  checked={contactType === 'customers'}
                  onChange={(e) => {
                    setContactType(e.target.value);
                    setSelectedFile(null);
                    setImportResults(null);
                  }}
                  className="text-primary-600 focus:ring-primary-500"
                />
                <span>Customers</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  value="suppliers"
                  checked={contactType === 'suppliers'}
                  onChange={(e) => {
                    setContactType(e.target.value);
                    setSelectedFile(null);
                    setImportResults(null);
                  }}
                  className="text-primary-600 focus:ring-primary-500"
                />
                <span>Suppliers</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              File Upload
            </label>
            <div className="flex items-center space-x-4">
              <label className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                <Upload className="h-5 w-5 text-gray-600" />
                <span className="text-sm text-gray-700">
                  {selectedFile ? selectedFile.name : 'Choose File'}
                </span>
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </label>
              {selectedFile && (
                <button
                  onClick={() => {
                    setSelectedFile(null);
                    setImportResults(null);
                  }}
                  className="text-red-600 hover:text-red-800"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Supported formats: CSV, Excel (.xlsx, .xls). Max size: 10MB
            </p>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
            <button
              onClick={downloadTemplate}
              className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <Download className="h-5 w-5" />
              <span>Download Template</span>
            </button>
            <button
              onClick={handleImport}
              disabled={!selectedFile || importMutation.isLoading}
              className="flex items-center space-x-2 px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Upload className="h-5 w-5" />
              <span>{importMutation.isLoading ? 'Importing...' : 'Import Contacts'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* File Format Guide */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">File Format Guide</h2>
        <div className="space-y-4">
          <div>
            <h3 className="font-medium text-gray-900 mb-2">
              {contactType === 'customers' ? 'Customer' : 'Supplier'} CSV Format
            </h3>
            <div className="bg-gray-50 rounded-lg p-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-300">
                    {contactType === 'customers' ? (
                      <>
                        <th className="text-left py-2 px-3">name</th>
                        <th className="text-left py-2 px-3">phone</th>
                        <th className="text-left py-2 px-3">email</th>
                        <th className="text-left py-2 px-3">address</th>
                        <th className="text-left py-2 px-3">ledger_balance</th>
                      </>
                    ) : (
                      <>
                        <th className="text-left py-2 px-3">name</th>
                        <th className="text-left py-2 px-3">phone</th>
                        <th className="text-left py-2 px-3">email</th>
                        <th className="text-left py-2 px-3">address</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    {contactType === 'customers' ? (
                      <>
                        <td className="py-2 px-3">John Doe</td>
                        <td className="py-2 px-3">+2348012345678</td>
                        <td className="py-2 px-3">john@example.com</td>
                        <td className="py-2 px-3">123 Main Street</td>
                        <td className="py-2 px-3">0</td>
                      </>
                    ) : (
                      <>
                        <td className="py-2 px-3">ABC Suppliers</td>
                        <td className="py-2 px-3">+2348012345678</td>
                        <td className="py-2 px-3">supplier@example.com</td>
                        <td className="py-2 px-3">456 Business Ave</td>
                      </>
                    )}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <div className="text-sm text-gray-600 space-y-1">
            <p><strong>Required fields:</strong> name</p>
            <p><strong>Optional fields:</strong> phone, email, address{contactType === 'customers' && ', ledger_balance'}</p>
            <p><strong>Note:</strong> Existing contacts with the same name or email will be updated instead of created.</p>
          </div>
        </div>
      </div>

      {/* Import Results */}
      {importResults && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Import Results</h2>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="bg-green-50 rounded-lg p-4">
              <div className="text-sm text-gray-600">Created</div>
              <div className="text-2xl font-bold text-green-600">{importResults.created || 0}</div>
            </div>
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="text-sm text-gray-600">Updated</div>
              <div className="text-2xl font-bold text-blue-600">{importResults.updated || 0}</div>
            </div>
            <div className="bg-yellow-50 rounded-lg p-4">
              <div className="text-sm text-gray-600">Skipped</div>
              <div className="text-2xl font-bold text-yellow-600">{importResults.skipped || 0}</div>
            </div>
          </div>
          {importResults.errors && importResults.errors.length > 0 && (
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Errors ({importResults.errors.length})</h3>
              <div className="bg-red-50 rounded-lg p-4 max-h-60 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-red-200">
                      <th className="text-left py-2 px-3">Row</th>
                      <th className="text-left py-2 px-3">Error</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importResults.errors.map((error, idx) => (
                      <tr key={idx} className="border-b border-red-100">
                        <td className="py-2 px-3">{error.row}</td>
                        <td className="py-2 px-3 text-red-800">{error.error}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ImportContacts;






























