import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { FileText, Plus, Edit, Trash2, X, CheckCircle, AlertCircle, Star, Eye } from 'lucide-react';

const DeliveryNotes = () => {
  const { hasPermission, user } = useAuth();
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    template_content: '',
    is_default: false,
    branch_id: user?.branch_id || ''
  });
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // Default template content
  const defaultTemplate = `DELIVERY NOTE

Order Number: {{invoice_number}}
Date: {{date}}
Customer: {{customer_name}}
Address: {{customer_address}}

Items:
{{#items}}
- {{product_name}} x {{quantity}} @ {{unit_price}}
{{/items}}

Total: {{total_amount}}
Delivery Address: {{delivery_address}}
Notes: {{notes}}

Thank you for your business!`;

  // Fetch templates
  const { data, isLoading, error } = useQuery({
    queryKey: ['deliveryNoteTemplates'],
    queryFn: async () => {
      const response = await api.get('/delivery-notes/templates');
      return response.data.templates || [];
    }
  });

  // Fetch branches (for Super Admin)
  const { data: branchesData } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      const response = await api.get('/branches');
      return response.data.branches || [];
    },
    enabled: user?.role_name === 'Super Admin'
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (templateData) => {
      const response = await api.post('/delivery-notes/templates', templateData);
      return response.data;
    },
    onSuccess: () => {
      setFormSuccess('Template created successfully!');
      setFormError('');
      setShowCreateModal(false);
      setFormData({
        name: '',
        template_content: defaultTemplate,
        is_default: false,
        branch_id: user?.branch_id || ''
      });
      queryClient.invalidateQueries(['deliveryNoteTemplates']);
      setTimeout(() => setFormSuccess(''), 3000);
    },
    onError: (err) => {
      setFormError(err.response?.data?.error || 'Failed to create template');
      setTimeout(() => setFormError(''), 5000);
    }
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data: templateData }) => {
      const response = await api.put(`/delivery-notes/templates/${id}`, templateData);
      return response.data;
    },
    onSuccess: () => {
      setFormSuccess('Template updated successfully!');
      setFormError('');
      setShowEditModal(false);
      setSelectedTemplate(null);
      queryClient.invalidateQueries(['deliveryNoteTemplates']);
      setTimeout(() => setFormSuccess(''), 3000);
    },
    onError: (err) => {
      setFormError(err.response?.data?.error || 'Failed to update template');
      setTimeout(() => setFormError(''), 5000);
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const response = await api.delete(`/delivery-notes/templates/${id}`);
      return response.data;
    },
    onSuccess: () => {
      setFormSuccess('Template deleted successfully!');
      setFormError('');
      queryClient.invalidateQueries(['deliveryNoteTemplates']);
      setTimeout(() => setFormSuccess(''), 3000);
    },
    onError: (err) => {
      setFormError(err.response?.data?.error || 'Failed to delete template');
      setTimeout(() => setFormError(''), 5000);
    }
  });

  const handleCreate = (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.name || !formData.template_content) {
      setFormError('Name and template content are required');
      return;
    }

    createMutation.mutate({
      name: formData.name.trim(),
      template_content: formData.template_content.trim(),
      is_default: formData.is_default,
      branch_id: formData.branch_id || null
    });
  };

  const handleEdit = (template) => {
    setSelectedTemplate(template);
    setFormData({
      name: template.name,
      template_content: template.template_content,
      is_default: template.is_default,
      branch_id: template.branch_id || ''
    });
    setShowEditModal(true);
    setFormError('');
  };

  const handleUpdate = (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.name || !formData.template_content) {
      setFormError('Name and template content are required');
      return;
    }

    updateMutation.mutate({
      id: selectedTemplate.id,
      data: {
        name: formData.name.trim(),
        template_content: formData.template_content.trim(),
        is_default: formData.is_default,
        branch_id: formData.branch_id || null
      }
    });
  };

  const handleDelete = (template) => {
    if (window.confirm(`Are you sure you want to delete template "${template.name}"?`)) {
      deleteMutation.mutate(template.id);
    }
  };

  const handlePreview = (template) => {
    setSelectedTemplate(template);
    setShowPreviewModal(true);
  };

  // Simple template variable replacement for preview
  const previewContent = selectedTemplate?.template_content
    ?.replace(/\{\{invoice_number\}\}/g, 'INV-2024-001')
    ?.replace(/\{\{date\}\}/g, new Date().toLocaleDateString())
    ?.replace(/\{\{customer_name\}\}/g, 'John Doe')
    ?.replace(/\{\{customer_address\}\}/g, '123 Main Street, Lagos')
    ?.replace(/\{\{total_amount\}\}/g, '₦50,000.00')
    ?.replace(/\{\{delivery_address\}\}/g, '456 Delivery Road, Lagos')
    ?.replace(/\{\{notes\}\}/g, 'Handle with care')
    ?.replace(/\{\{#items\}\}/g, '')
    ?.replace(/\{\{\/items\}\}/g, '')
    ?.replace(/\{\{product_name\}\}/g, 'Product A')
    ?.replace(/\{\{quantity\}\}/g, '10')
    ?.replace(/\{\{unit_price\}\}/g, '₦5,000.00') || '';

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-lg">
          Error loading templates: {error.message}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Delivery Note Templates</h1>
          <p className="text-gray-600">Create and manage custom delivery note templates</p>
        </div>
        {hasPermission('sale_edit_price') && (
          <button
            onClick={() => {
              setShowCreateModal(true);
              setFormData({
                name: '',
                template_content: defaultTemplate,
                is_default: false,
                branch_id: user?.branch_id || ''
              });
              setFormError('');
            }}
            className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            <Plus className="h-5 w-5" />
            <span>Add Template</span>
          </button>
        )}
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

      {/* Templates Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Branch
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Default
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Preview
              </th>
              {hasPermission('sale_edit_price') && (
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data?.map((template) => (
              <tr key={template.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{template.name}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{template.branch?.name || 'All Branches'}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {template.is_default ? (
                    <Star className="h-5 w-5 text-yellow-500 fill-current" />
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <button
                    onClick={() => handlePreview(template)}
                    className="text-blue-600 hover:text-blue-900 text-sm"
                  >
                    <Eye className="h-5 w-5" />
                  </button>
                </td>
                {hasPermission('sale_edit_price') && (
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => handleEdit(template)}
                        className="text-primary-600 hover:text-primary-900"
                      >
                        <Edit className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(template)}
                        className="text-red-600 hover:text-red-900"
                        disabled={template.is_default}
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {data?.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No templates found
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {(showCreateModal || showEditModal) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">
                {showCreateModal ? 'Add Template' : 'Edit Template'}
              </h2>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setShowEditModal(false);
                  setSelectedTemplate(null);
                  setFormError('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <form onSubmit={showCreateModal ? handleCreate : handleUpdate}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Template Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Template Content *
                  </label>
                  <textarea
                    value={formData.template_content}
                    onChange={(e) => setFormData({ ...formData, template_content: e.target.value })}
                    rows="15"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 font-mono text-sm focus:ring-2 focus:ring-primary-500"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Available variables: {'{{invoice_number}}'}, {'{{date}}'}, {'{{customer_name}}'}, {'{{customer_address}}'}, {'{{total_amount}}'}, {'{{delivery_address}}'}, {'{{notes}}'}, {'{{#items}}...{{/items}}'}, {'{{product_name}}'}, {'{{quantity}}'}, {'{{unit_price}}'}
                  </p>
                </div>
                {user?.role_name === 'Super Admin' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Branch
                    </label>
                    <select
                      value={formData.branch_id}
                      onChange={(e) => setFormData({ ...formData, branch_id: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="">All Branches</option>
                      {branchesData?.map((branch) => (
                        <option key={branch.id} value={branch.id}>
                          {branch.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="is_default"
                    checked={formData.is_default}
                    onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <label htmlFor="is_default" className="text-sm text-gray-700">
                    Set as Default Template
                  </label>
                </div>
              </div>
              <div className="mt-6 flex space-x-3">
                <button
                  type="submit"
                  className="flex-1 bg-primary-600 text-white py-2 rounded-lg hover:bg-primary-700"
                >
                  {showCreateModal ? 'Create Template' : 'Update Template'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setShowEditModal(false);
                    setSelectedTemplate(null);
                    setFormError('');
                  }}
                  className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {showPreviewModal && selectedTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Template Preview: {selectedTemplate.name}</h2>
              <button
                onClick={() => {
                  setShowPreviewModal(false);
                  setSelectedTemplate(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <pre className="whitespace-pre-wrap text-sm font-mono text-gray-900">
                {previewContent}
              </pre>
            </div>
            <div className="mt-4">
              <button
                onClick={() => {
                  setShowPreviewModal(false);
                  setSelectedTemplate(null);
                }}
                className="w-full bg-gray-200 text-gray-800 py-2 rounded-lg hover:bg-gray-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeliveryNotes;






