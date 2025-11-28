import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { Percent, Plus, Edit, Trash2, X, CheckCircle, AlertCircle, Calendar } from 'lucide-react';

const Discounts = () => {
  const { hasPermission, user } = useAuth();
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedDiscount, setSelectedDiscount] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    discount_type: 'percentage',
    value: '',
    min_purchase_amount: '0',
    max_discount_amount: '',
    valid_from: '',
    valid_until: '',
    is_active: true,
    branch_id: user?.branch_id || ''
  });
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // Fetch discounts
  const { data, isLoading, error } = useQuery({
    queryKey: ['discounts'],
    queryFn: async () => {
      const response = await api.get('/discounts');
      return response.data.discounts || [];
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
    mutationFn: async (discountData) => {
      const response = await api.post('/discounts', discountData);
      return response.data;
    },
    onSuccess: () => {
      setFormSuccess('Discount created successfully!');
      setFormError('');
      setShowCreateModal(false);
      setFormData({
        name: '',
        discount_type: 'percentage',
        value: '',
        min_purchase_amount: '0',
        max_discount_amount: '',
        valid_from: '',
        valid_until: '',
        is_active: true,
        branch_id: user?.branch_id || ''
      });
      queryClient.invalidateQueries(['discounts']);
      setTimeout(() => setFormSuccess(''), 3000);
    },
    onError: (err) => {
      setFormError(err.response?.data?.error || 'Failed to create discount');
      setTimeout(() => setFormError(''), 5000);
    }
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data: discountData }) => {
      const response = await api.put(`/discounts/${id}`, discountData);
      return response.data;
    },
    onSuccess: () => {
      setFormSuccess('Discount updated successfully!');
      setFormError('');
      setShowEditModal(false);
      setSelectedDiscount(null);
      queryClient.invalidateQueries(['discounts']);
      setTimeout(() => setFormSuccess(''), 3000);
    },
    onError: (err) => {
      setFormError(err.response?.data?.error || 'Failed to update discount');
      setTimeout(() => setFormError(''), 5000);
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const response = await api.delete(`/discounts/${id}`);
      return response.data;
    },
    onSuccess: () => {
      setFormSuccess('Discount deleted successfully!');
      setFormError('');
      queryClient.invalidateQueries(['discounts']);
      setTimeout(() => setFormSuccess(''), 3000);
    },
    onError: (err) => {
      setFormError(err.response?.data?.error || 'Failed to delete discount');
      setTimeout(() => setFormError(''), 5000);
    }
  });

  const handleCreate = (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.name || formData.value === '') {
      setFormError('Name and value are required');
      return;
    }

    const value = parseFloat(formData.value);
    if (isNaN(value) || value < 0) {
      setFormError('Value must be a positive number');
      return;
    }

    if (formData.discount_type === 'percentage' && value > 100) {
      setFormError('Percentage value cannot exceed 100');
      return;
    }

    createMutation.mutate({
      name: formData.name.trim(),
      discount_type: formData.discount_type,
      value: value,
      min_purchase_amount: parseFloat(formData.min_purchase_amount) || 0,
      max_discount_amount: formData.max_discount_amount ? parseFloat(formData.max_discount_amount) : null,
      valid_from: formData.valid_from || null,
      valid_until: formData.valid_until || null,
      is_active: formData.is_active,
      branch_id: formData.branch_id || null
    });
  };

  const handleEdit = (discount) => {
    setSelectedDiscount(discount);
    setFormData({
      name: discount.name,
      discount_type: discount.discount_type,
      value: discount.value.toString(),
      min_purchase_amount: discount.min_purchase_amount.toString(),
      max_discount_amount: discount.max_discount_amount ? discount.max_discount_amount.toString() : '',
      valid_from: discount.valid_from || '',
      valid_until: discount.valid_until || '',
      is_active: discount.is_active,
      branch_id: discount.branch_id || ''
    });
    setShowEditModal(true);
    setFormError('');
  };

  const handleUpdate = (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.name || formData.value === '') {
      setFormError('Name and value are required');
      return;
    }

    const value = parseFloat(formData.value);
    if (isNaN(value) || value < 0) {
      setFormError('Value must be a positive number');
      return;
    }

    if (formData.discount_type === 'percentage' && value > 100) {
      setFormError('Percentage value cannot exceed 100');
      return;
    }

    updateMutation.mutate({
      id: selectedDiscount.id,
      data: {
        name: formData.name.trim(),
        discount_type: formData.discount_type,
        value: value,
        min_purchase_amount: parseFloat(formData.min_purchase_amount) || 0,
        max_discount_amount: formData.max_discount_amount ? parseFloat(formData.max_discount_amount) : null,
        valid_from: formData.valid_from || null,
        valid_until: formData.valid_until || null,
        is_active: formData.is_active,
        branch_id: formData.branch_id || null
      }
    });
  };

  const handleDelete = (discount) => {
    if (window.confirm(`Are you sure you want to delete discount "${discount.name}"?`)) {
      deleteMutation.mutate(discount.id);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN'
    }).format(amount || 0);
  };

  const calculateDiscount = (discount, orderAmount) => {
    if (orderAmount < discount.min_purchase_amount) return 0;
    
    let discountAmount = 0;
    if (discount.discount_type === 'percentage') {
      discountAmount = (orderAmount * parseFloat(discount.value)) / 100;
      if (discount.max_discount_amount) {
        discountAmount = Math.min(discountAmount, parseFloat(discount.max_discount_amount));
      }
    } else {
      discountAmount = parseFloat(discount.value);
    }
    
    return discountAmount;
  };

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
          Error loading discounts: {error.message}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Discounts Management</h1>
          <p className="text-gray-600">Create and manage discount rules</p>
        </div>
        {hasPermission('discount_manage') && (
          <button
            onClick={() => {
              setShowCreateModal(true);
              setFormData({
                name: '',
                discount_type: 'percentage',
                value: '',
                min_purchase_amount: '0',
                max_discount_amount: '',
                valid_from: '',
                valid_until: '',
                is_active: true,
                branch_id: user?.branch_id || ''
              });
              setFormError('');
            }}
            className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            <Plus className="h-5 w-5" />
            <span>Add Discount</span>
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

      {/* Discounts Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Value
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Min Purchase
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Valid Period
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              {hasPermission('discount_manage') && (
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data?.map((discount) => {
              const today = new Date().toISOString().split('T')[0];
              const isExpired = discount.valid_until && discount.valid_until < today;
              const notStarted = discount.valid_from && discount.valid_from > today;
              
              return (
                <tr key={discount.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{discount.name}</div>
                    <div className="text-xs text-gray-500">{discount.branch?.name || 'All Branches'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                      {discount.discount_type === 'percentage' ? 'Percentage' : 'Fixed'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {discount.discount_type === 'percentage' 
                        ? `${discount.value}%`
                        : formatCurrency(discount.value)
                      }
                    </div>
                    {discount.max_discount_amount && discount.discount_type === 'percentage' && (
                      <div className="text-xs text-gray-500">
                        Max: {formatCurrency(discount.max_discount_amount)}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {formatCurrency(discount.min_purchase_amount)}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">
                      {discount.valid_from || discount.valid_until ? (
                        <>
                          {discount.valid_from ? new Date(discount.valid_from).toLocaleDateString() : '—'} to{' '}
                          {discount.valid_until ? new Date(discount.valid_until).toLocaleDateString() : '—'}
                        </>
                      ) : (
                        'Always valid'
                      )}
                    </div>
                    {isExpired && (
                      <div className="text-xs text-red-600">Expired</div>
                    )}
                    {notStarted && (
                      <div className="text-xs text-yellow-600">Not started</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      discount.is_active && !isExpired && !notStarted
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {discount.is_active && !isExpired && !notStarted ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  {hasPermission('discount_manage') && (
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => handleEdit(discount)}
                          className="text-primary-600 hover:text-primary-900"
                        >
                          <Edit className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(discount)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
        {data?.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No discounts found
          </div>
        )}
      </div>

      {/* Create/Edit Modal - Similar structure to other modals */}
      {(showCreateModal || showEditModal) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">
                {showCreateModal ? 'Add Discount' : 'Edit Discount'}
              </h2>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setShowEditModal(false);
                  setSelectedDiscount(null);
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
                    Name *
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
                    Discount Type *
                  </label>
                  <select
                    value={formData.discount_type}
                    onChange={(e) => setFormData({ ...formData, discount_type: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500"
                    required
                  >
                    <option value="percentage">Percentage</option>
                    <option value="fixed">Fixed Amount</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Value *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max={formData.discount_type === 'percentage' ? '100' : undefined}
                    value={formData.value}
                    onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500"
                    required
                    placeholder={formData.discount_type === 'percentage' ? 'e.g., 10' : 'e.g., 500'}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {formData.discount_type === 'percentage' 
                      ? 'Percentage (0-100)'
                      : 'Fixed amount in NGN'
                    }
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Minimum Purchase Amount
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.min_purchase_amount}
                    onChange={(e) => setFormData({ ...formData, min_purchase_amount: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                {formData.discount_type === 'percentage' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Maximum Discount Amount (Optional)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.max_discount_amount}
                      onChange={(e) => setFormData({ ...formData, max_discount_amount: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Valid From
                    </label>
                    <input
                      type="date"
                      value={formData.valid_from}
                      onChange={(e) => setFormData({ ...formData, valid_from: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Valid Until
                    </label>
                    <input
                      type="date"
                      value={formData.valid_until}
                      onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
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
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <label htmlFor="is_active" className="text-sm text-gray-700">
                    Active
                  </label>
                </div>
              </div>
              <div className="mt-6 flex space-x-3">
                <button
                  type="submit"
                  className="flex-1 bg-primary-600 text-white py-2 rounded-lg hover:bg-primary-700"
                >
                  {showCreateModal ? 'Create Discount' : 'Update Discount'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setShowEditModal(false);
                    setSelectedDiscount(null);
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
    </div>
  );
};

export default Discounts;










