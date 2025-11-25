import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { Building2, Save, Upload, X, CheckCircle, AlertCircle } from 'lucide-react';

const BusinessSettings = () => {
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    business_name: '',
    business_address: '',
    business_phone: '',
    business_email: '',
    business_logo: '',
    currency_symbol: '₦',
    currency_code: 'NGN',
    date_format: 'DD/MM/YYYY',
    time_format: '24h',
    fiscal_year_start: '01-01'
  });
  const [logoPreview, setLogoPreview] = useState('');
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // Fetch settings
  const { data, isLoading } = useQuery({
    queryKey: ['businessSettings'],
    queryFn: async () => {
      const response = await api.get('/settings?category=general');
      return response.data.settings || {};
    }
  });

  // Fetch financial settings
  const { data: financialData } = useQuery({
    queryKey: ['financialSettings'],
    queryFn: async () => {
      const response = await api.get('/settings?category=financial');
      return response.data.settings || {};
    }
  });

  // Update form data when settings are loaded
  useEffect(() => {
    if (data) {
      setFormData(prev => ({
        ...prev,
        business_name: data.business_name?.value || '',
        business_address: data.business_address?.value || '',
        business_phone: data.business_phone?.value || '',
        business_email: data.business_email?.value || '',
        business_logo: data.business_logo?.value || '',
        currency_symbol: data.currency_symbol?.value || '₦',
        currency_code: data.currency_code?.value || 'NGN',
        date_format: data.date_format?.value || 'DD/MM/YYYY',
        time_format: data.time_format?.value || '24h'
      }));
      if (data.business_logo?.value) {
        setLogoPreview(data.business_logo.value);
      }
    }
  }, [data]);

  useEffect(() => {
    if (financialData?.fiscal_year_start) {
      setFormData(prev => ({
        ...prev,
        fiscal_year_start: financialData.fiscal_year_start.value || '01-01'
      }));
    }
  }, [financialData]);

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (settings) => {
      const response = await api.put('/settings', { settings });
      return response.data;
    },
    onSuccess: () => {
      setFormSuccess('Settings saved successfully!');
      setFormError('');
      queryClient.invalidateQueries(['businessSettings']);
      queryClient.invalidateQueries(['financialSettings']);
      setTimeout(() => setFormSuccess(''), 3000);
    },
    onError: (err) => {
      setFormError(err.response?.data?.error || 'Failed to save settings');
      setTimeout(() => setFormError(''), 5000);
    }
  });

  const handleInputChange = (key, value) => {
    setFormData(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      // In a real implementation, upload to server and get URL
      // For now, create a data URL for preview
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result;
        setLogoPreview(dataUrl);
        setFormData(prev => ({
          ...prev,
          business_logo: dataUrl
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveLogo = () => {
    setLogoPreview('');
    setFormData(prev => ({
      ...prev,
      business_logo: ''
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    const settings = {
      business_name: formData.business_name.trim(),
      business_address: formData.business_address.trim(),
      business_phone: formData.business_phone.trim(),
      business_email: formData.business_email.trim(),
      business_logo: formData.business_logo,
      currency_symbol: formData.currency_symbol.trim(),
      currency_code: formData.currency_code.trim(),
      date_format: formData.date_format,
      time_format: formData.time_format,
      fiscal_year_start: formData.fiscal_year_start
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
          You do not have permission to manage business settings.
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Business Settings</h1>
        <p className="text-gray-600">Configure core business information and preferences</p>
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
            <Building2 className="h-5 w-5" />
            <span>Business Information</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Business Name *
              </label>
              <input
                type="text"
                value={formData.business_name}
                onChange={(e) => handleInputChange('business_name', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Business Phone
              </label>
              <input
                type="tel"
                value={formData.business_phone}
                onChange={(e) => handleInputChange('business_phone', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Business Address
              </label>
              <textarea
                value={formData.business_address}
                onChange={(e) => handleInputChange('business_address', e.target.value)}
                rows="3"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Business Email
              </label>
              <input
                type="email"
                value={formData.business_email}
                onChange={(e) => handleInputChange('business_email', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Business Logo
              </label>
              <div className="flex items-center space-x-4">
                {logoPreview && (
                  <div className="relative">
                    <img
                      src={logoPreview}
                      alt="Logo preview"
                      className="h-20 w-20 object-contain border border-gray-300 rounded"
                    />
                    <button
                      type="button"
                      onClick={handleRemoveLogo}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
                <label className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                  <Upload className="h-5 w-5 text-gray-600" />
                  <span className="text-sm text-gray-700">
                    {logoPreview ? 'Change Logo' : 'Upload Logo'}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                </label>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Recommended: 200x200px, PNG or JPG format
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Currency & Format</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Currency Symbol
              </label>
              <input
                type="text"
                value={formData.currency_symbol}
                onChange={(e) => handleInputChange('currency_symbol', e.target.value)}
                maxLength="5"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Currency Code
              </label>
              <input
                type="text"
                value={formData.currency_code}
                onChange={(e) => handleInputChange('currency_code', e.target.value.toUpperCase())}
                maxLength="3"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date Format
              </label>
              <select
                value={formData.date_format}
                onChange={(e) => handleInputChange('date_format', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                <option value="DD-MM-YYYY">DD-MM-YYYY</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Time Format
              </label>
              <select
                value={formData.time_format}
                onChange={(e) => handleInputChange('time_format', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="24h">24 Hour (HH:mm)</option>
                <option value="12h">12 Hour (hh:mm AM/PM)</option>
              </select>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Financial Settings</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fiscal Year Start
              </label>
              <input
                type="text"
                value={formData.fiscal_year_start}
                onChange={(e) => handleInputChange('fiscal_year_start', e.target.value)}
                placeholder="MM-DD (e.g., 01-01)"
                pattern="\d{2}-\d{2}"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                Format: MM-DD (e.g., 01-01 for January 1st)
              </p>
            </div>
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

export default BusinessSettings;


