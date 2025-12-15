import { useState } from 'react';
import { Upload, Download } from 'lucide-react';
import ImportModal from '../import/ImportModal';
import api from '../../utils/api';
import { downloadEntityTemplate } from '../../utils/importTemplates';

const DataControlBar = ({ importEndpoint, exportEndpoint, entityName, onImportSuccess }) => {
  const [showImportModal, setShowImportModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    try {
      setIsExporting(true);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/6aef7949-77a2-46a4-8fc4-df76651a5e4e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'DataControlBar.jsx:11',message:'handleExport entry',data:{exportEndpoint,entityName},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/6aef7949-77a2-46a4-8fc4-df76651a5e4e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'DataControlBar.jsx:14',message:'Before api.get call',data:{exportEndpoint,apiBaseURL:api.defaults.baseURL},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      
      // Remove leading /api if present because api instance adds it via baseURL
      let endpoint = exportEndpoint;
      if (endpoint.startsWith('/api/')) {
        endpoint = endpoint.substring(4);
      }
      
      const response = await api.get(endpoint, {
        responseType: 'blob'
      });
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/6aef7949-77a2-46a4-8fc4-df76651a5e4e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'DataControlBar.jsx:17',message:'After api.get call success',data:{status:response.status,url:response.config.url},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion

      // Verify we got a valid blob response
      if (!(response.data instanceof Blob)) {
        throw new Error('Invalid response format received from server');
      }

      // Create blob and download
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Extract filename from Content-Disposition header or use default
      // Axios normalizes headers to lowercase, but check both cases
      const contentDisposition = response.headers['content-disposition'] || response.headers['Content-Disposition'];
      let filename = `${entityName.toLowerCase()}_${new Date().toISOString().split('T')[0]}.csv`;
      if (contentDisposition) {
        // Match filename in Content-Disposition header (handles quoted and unquoted filenames)
        const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/i);
        if (filenameMatch && filenameMatch[1]) {
          // Remove quotes if present
          filename = filenameMatch[1].replace(/['"]/g, '');
        }
      }
      
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export error:', error);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/6aef7949-77a2-46a4-8fc4-df76651a5e4e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'DataControlBar.jsx:48',message:'Export error caught',data:{status:error.response?.status,url:error.config?.url,message:error.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      
      // Handle error response that might be a blob
      let errorMessage = 'Failed to export data. Please try again.';
      
      if (error.response) {
        // If error response is a blob, try to parse it as JSON error
        if (error.response.data instanceof Blob) {
          try {
            const text = await error.response.data.text();
            const errorData = JSON.parse(text);
            errorMessage = errorData.error || errorMessage;
          } catch (parseError) {
            // If parsing fails, use status code to determine error message
            if (error.response.status === 404) {
              errorMessage = 'Export endpoint not found. Please contact support.';
            } else if (error.response.status === 403) {
              errorMessage = 'You do not have permission to export this data.';
            } else if (error.response.status === 500) {
              errorMessage = 'Server error occurred. Please try again later.';
            } else {
              errorMessage = `Export failed (${error.response.status}). Please try again.`;
            }
          }
        } else if (error.response.data && typeof error.response.data === 'object') {
          // Regular JSON error response
          errorMessage = error.response.data.error || errorMessage;
        } else {
          // Use status code for error message
          if (error.response.status === 404) {
            errorMessage = 'Export endpoint not found. Please contact support.';
          } else if (error.response.status === 403) {
            errorMessage = 'You do not have permission to export this data.';
          } else if (error.response.status === 500) {
            errorMessage = 'Server error occurred. Please try again later.';
          } else {
            errorMessage = `Export failed (${error.response.status}). Please try again.`;
          }
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      alert(errorMessage);
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportSuccess = (data) => {
    const results = data?.results || data || {};
    const created = results.created || 0;
    const updated = results.updated || 0;
    
    // Only call onImportSuccess if records were actually created/updated
    if (created > 0 || updated > 0) {
      if (onImportSuccess) {
        onImportSuccess(data);
      }
    }
    setShowImportModal(false);
  };

  const handleDownloadTemplate = () => {
    // Extract entity name from entityName (e.g., "Brands" -> "brands")
    const entity = entityName.toLowerCase();
    downloadEntityTemplate(entity);
  };

  return (
    <>
      <div className="mb-4 flex items-center justify-end space-x-3">
        <button
          onClick={handleDownloadTemplate}
          className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <Download className="h-4 w-4" />
          <span>Download Template</span>
        </button>
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
          entity={entityName.toLowerCase()}
        />
      )}
    </>
  );
};

export default DataControlBar;

