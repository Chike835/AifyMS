import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { FileText, Save, CheckCircle, AlertCircle } from 'lucide-react';

const InvoiceSettings = () => {
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    invoice_prefix: 'INV',
    invoice_footer: 'Thank you for your business!',
    invoice_terms: 'Payment due within 30 days',
    invoice_show_tax: true,
    invoice_show_discount: true
  });
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // Fetch invoice settings
  const { data, isLoading } = useQuery({
    queryKey: ['invoiceSettings'],
    queryFn: async () => {
      const response = await api.get('/settings?category=invoice');
      return response.data.settings || {};
    }
  });

  // Update form data when settings are loaded
  useEffect(() => {
    if (data) {
      setFormData({
        invoice_prefix: data.invoice_prefix?.value || 'INV',
        invoice_footer: data.invoice_footer?.value || 'Thank you for your business!',
        invoice_terms: data.invoice_terms?.value || 'Payment due within 30 days',
        invoice_show_tax: data.invoice_show_tax?.value !== undefined ? data.invoice_show_tax.value : true,
        invoice_show_discount: data.invoice_show_discount?.value !== undefined ? data.invoice_show_discount.value : true
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
      setFormSuccess('Invoice settings saved successfully!');
      setFormError('');
      queryClient.invalidateQueries(['invoiceSettings']);
      setTimeout(() => setFormSuccess(''), 3000);
    },
    onError: (err) => {
      setFormError(err.response?.data?.error || 'Failed to save invoice settings');
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
      invoice_prefix: formData.invoice_prefix.trim(),
      invoice_footer: formData.invoice_footer.trim(),
      invoice_terms: formData.invoice_terms.trim(),
      invoice_show_tax: formData.invoice_show_tax,
      invoice_show_discount: formData.invoice_show_discount
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
          You do not have permission to manage invoice settings.
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Invoice Settings</h1>
        <p className="text-gray-600">Configure invoice numbering, templates, and default terms</p>
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
            <FileText className="h-5 w-5" />
            <span>Invoice Configuration</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Invoice Prefix *
              </label>
              <input
                type="text"
                value={formData.invoice_prefix}
                onChange={(e) => handleInputChange('invoice_prefix', e.target.value.toUpperCase())}
                maxLength="10"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Prefix for invoice numbers (e.g., INV-001, INV-002)
              </p>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Default Terms and Conditions
              </label>
              <textarea
                value={formData.invoice_terms}
                onChange={(e) => handleInputChange('invoice_terms', e.target.value)}
                rows="4"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Enter default terms and conditions..."
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Footer Text
              </label>
              <textarea
                value={formData.invoice_footer}
                onChange={(e) => handleInputChange('invoice_footer', e.target.value)}
                rows="2"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Enter footer text..."
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Display Options</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <label className="text-sm font-medium text-gray-900">
                  Show Tax on Invoice
                </label>
                <p className="text-xs text-gray-500 mt-1">
                  Display tax information on invoices
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.invoice_show_tax}
                  onChange={(e) => handleInputChange('invoice_show_tax', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              </label>
            </div>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <label className="text-sm font-medium text-gray-900">
                  Show Discount on Invoice
                </label>
                <p className="text-xs text-gray-500 mt-1">
                  Display discount information on invoices
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.invoice_show_discount}
                  onChange={(e) => handleInputChange('invoice_show_discount', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              </label>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Invoice Template Preview</h2>
          <div className="border-2 border-gray-200 rounded-lg p-6 bg-white">
            <div className="text-center mb-6">
              <h3 className="text-xl font-bold text-gray-900">INVOICE</h3>
              <p className="text-sm text-gray-600 mt-1">
                {formData.invoice_prefix}-001
              </p>
            </div>
            <div className="space-y-4">
              <div className="border-b border-gray-200 pb-4">
                <p className="text-sm text-gray-600">Customer: Sample Customer</p>
                <p className="text-sm text-gray-600">Date: {new Date().toLocaleDateString('en-NG')}</p>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Item 1</span>
                  <span>₦1,000.00</span>
                </div>
                {formData.invoice_show_discount && (
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Discount</span>
                    <span>-₦100.00</span>
                  </div>
                )}
                {formData.invoice_show_tax && (
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Tax (7.5%)</span>
                    <span>₦67.50</span>
                  </div>
                )}
                <div className="flex justify-between font-bold border-t border-gray-200 pt-2">
                  <span>Total</span>
                  <span>₦967.50</span>
                </div>
              </div>
              {formData.invoice_terms && (
                <div className="mt-6 pt-4 border-t border-gray-200">
                  <p className="text-xs text-gray-600 font-medium mb-1">Terms & Conditions:</p>
                  <p className="text-xs text-gray-600">{formData.invoice_terms}</p>
                </div>
              )}
              {formData.invoice_footer && (
                <div className="mt-4 text-center">
                  <p className="text-xs text-gray-500">{formData.invoice_footer}</p>
                </div>
              )}
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

export default InvoiceSettings;




















