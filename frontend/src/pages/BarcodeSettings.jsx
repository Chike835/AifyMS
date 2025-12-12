import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { Barcode, Save, CheckCircle, AlertCircle } from 'lucide-react';

const BarcodeSettings = () => {
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    barcode_type: 'CODE128',
    barcode_width: '2',
    barcode_height: '100',
    barcode_show_text: true,
    barcode_text_position: 'bottom'
  });
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // Fetch barcode settings
  const { data, isLoading } = useQuery({
    queryKey: ['barcodeSettings'],
    queryFn: async () => {
      const response = await api.get('/settings?category=barcode');
      return response.data.settings || {};
    }
  });

  // Update form data when settings are loaded
  useEffect(() => {
    if (data) {
      setFormData({
        barcode_type: data.barcode_type?.value || 'CODE128',
        barcode_width: data.barcode_width?.value?.toString() || '2',
        barcode_height: data.barcode_height?.value?.toString() || '100',
        barcode_show_text: data.barcode_show_text?.value !== undefined ? data.barcode_show_text.value : true,
        barcode_text_position: data.barcode_text_position?.value || 'bottom'
      });
    }
  }, [data]);

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (settings) => {
      const response = await api.put('/settings', { settings });
      return response.data;
    },
    onSuccess: () => {
      setFormSuccess('Barcode settings saved successfully!');
      setFormError('');
      queryClient.invalidateQueries(['barcodeSettings']);
      setTimeout(() => setFormSuccess(''), 3000);
    },
    onError: (err) => {
      setFormError(err.response?.data?.error || 'Failed to save barcode settings');
      setTimeout(() => setFormError(''), 5000);
    }
  });

  const handleInputChange = (key, value) => {
    setFormData(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    const settings = {
      barcode_type: formData.barcode_type,
      barcode_width: parseFloat(formData.barcode_width),
      barcode_height: parseFloat(formData.barcode_height),
      barcode_show_text: formData.barcode_show_text,
      barcode_text_position: formData.barcode_text_position
    };

    updateSettingsMutation.mutate(settings);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!hasPermission('settings_manage')) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-lg">
          You do not have permission to manage barcode settings.
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Barcode Settings</h1>
        <p className="text-gray-600">Configure barcode generation and display options</p>
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

      <form onSubmit={handleSubmit}>
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
            <Barcode className="h-5 w-5" />
            <span>Barcode Configuration</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Barcode Type *
              </label>
              <select
                value={formData.barcode_type}
                onChange={(e) => handleInputChange('barcode_type', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
              >
                <option value="CODE128">CODE128</option>
                <option value="CODE39">CODE39</option>
                <option value="EAN13">EAN13</option>
                <option value="EAN8">EAN8</option>
                <option value="UPC">UPC</option>
                <option value="ITF14">ITF14</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Most common: CODE128 (supports alphanumeric)
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Width (mm)
              </label>
              <input
                type="number"
                step="0.1"
                min="0.5"
                max="10"
                value={formData.barcode_width}
                onChange={(e) => handleInputChange('barcode_width', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                Bar width in millimeters (0.5-10)
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Height (px)
              </label>
              <input
                type="number"
                step="1"
                min="20"
                max="200"
                value={formData.barcode_height}
                onChange={(e) => handleInputChange('barcode_height', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                Barcode height in pixels (20-200)
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Text Position
              </label>
              <select
                value={formData.barcode_text_position}
                onChange={(e) => handleInputChange('barcode_text_position', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="top">Top</option>
                <option value="bottom">Bottom</option>
                <option value="none">None (No text)</option>
              </select>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Display Options</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <label className="text-sm font-medium text-gray-900">
                  Show Text Below Barcode
                </label>
                <p className="text-xs text-gray-500 mt-1">
                  Display the barcode value as text
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.barcode_show_text}
                  onChange={(e) => handleInputChange('barcode_show_text', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              </label>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Barcode Preview</h2>
          <div className="border-2 border-gray-200 rounded-lg p-6 bg-white text-center">
            <div className="mb-4">
              <div className="inline-block bg-gray-100 p-4 rounded">
                <div className="text-xs text-gray-500 mb-2">Sample Barcode</div>
                <div className="bg-white p-4 border border-gray-300 rounded inline-block">
                  <div className="text-sm text-gray-600 font-mono">
                    {formData.barcode_type} - {formData.barcode_width}mm x {formData.barcode_height}px
                  </div>
                  {formData.barcode_show_text && (
                    <div className="text-xs text-gray-500 mt-2">
                      Text: {formData.barcode_text_position}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <p className="text-xs text-gray-500">
              Note: Actual barcode rendering requires a barcode library (e.g., JsBarcode, bwip-js)
            </p>
          </div>
        </div>

        <div className="flex justify-end space-x-3">
          <button
            type="submit"
            disabled={updateSettingsMutation.isLoading}
            className="flex items-center space-x-2 px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="h-5 w-5" />
            <span>{updateSettingsMutation.isLoading ? 'Saving...' : 'Save Settings'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default BarcodeSettings;


























