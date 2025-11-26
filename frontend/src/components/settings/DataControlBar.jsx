import { useState } from 'react';
import { Upload, Download } from 'lucide-react';
import ImportModal from '../import/ImportModal';
import api from '../../utils/api';

const DataControlBar = ({ importEndpoint, exportEndpoint, entityName, onImportSuccess }) => {
  const [showImportModal, setShowImportModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    try {
      setIsExporting(true);
      const response = await api.get(exportEndpoint, {
        responseType: 'blob'
      });

      // Create blob and download
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Extract filename from Content-Disposition header or use default
      const contentDisposition = response.headers['content-disposition'];
      let filename = `${entityName.toLowerCase()}_${new Date().toISOString().split('T')[0]}.csv`;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?(.+)"?/i);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }
      
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export error:', error);
      alert(error.response?.data?.error || 'Failed to export data');
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportSuccess = (data) => {
    if (onImportSuccess) {
      onImportSuccess(data);
    }
    setShowImportModal(false);
  };

  return (
    <>
      <div className="mb-4 flex items-center justify-end space-x-3">
        <button
          onClick={() => setShowImportModal(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <Upload className="h-4 w-4" />
          <span>Import</span>
        </button>
        <button
          onClick={handleExport}
          disabled={isExporting}
          className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download className="h-4 w-4" />
          <span>{isExporting ? 'Exporting...' : 'Export'}</span>
        </button>
      </div>

      {showImportModal && (
        <ImportModal
          isOpen={showImportModal}
          onClose={() => setShowImportModal(false)}
          targetEndpoint={importEndpoint}
          title={`Import ${entityName}`}
          onSuccess={handleImportSuccess}
        />
      )}
    </>
  );
};

export default DataControlBar;

