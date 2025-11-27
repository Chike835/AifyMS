import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { Users, Plus, Edit, Trash2, X, DollarSign, CheckCircle, AlertCircle, Eye } from 'lucide-react';

const Agents = () => {
  const { hasPermission, user } = useAuth();
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    commission_rate: '',
    is_active: true,
    branch_id: user?.branch_id || ''
  });
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // Fetch agents
  const { data, isLoading, error } = useQuery({
    queryKey: ['agents'],
    queryFn: async () => {
      const response = await api.get('/agents');
      return response.data.agents || [];
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

  // Fetch agent details
  const { data: agentDetails } = useQuery({
    queryKey: ['agentDetails', selectedAgent?.id],
    queryFn: async () => {
      if (!selectedAgent?.id) return null;
      const response = await api.get(`/agents/${selectedAgent.id}`);
      return response.data;
    },
    enabled: !!selectedAgent?.id && showDetailModal
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (agentData) => {
      const response = await api.post('/agents', agentData);
      return response.data;
    },
    onSuccess: () => {
      setFormSuccess('Agent created successfully!');
      setFormError('');
      setShowCreateModal(false);
      setFormData({
        name: '',
        email: '',
        phone: '',
        commission_rate: '',
        is_active: true,
        branch_id: user?.branch_id || ''
      });
      queryClient.invalidateQueries(['agents']);
      setTimeout(() => setFormSuccess(''), 3000);
    },
    onError: (err) => {
      setFormError(err.response?.data?.error || 'Failed to create agent');
      setTimeout(() => setFormError(''), 5000);
    }
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data: agentData }) => {
      const response = await api.put(`/agents/${id}`, agentData);
      return response.data;
    },
    onSuccess: () => {
      setFormSuccess('Agent updated successfully!');
      setFormError('');
      setShowEditModal(false);
      setSelectedAgent(null);
      queryClient.invalidateQueries(['agents']);
      queryClient.invalidateQueries(['agentDetails', selectedAgent?.id]);
      setTimeout(() => setFormSuccess(''), 3000);
    },
    onError: (err) => {
      setFormError(err.response?.data?.error || 'Failed to update agent');
      setTimeout(() => setFormError(''), 5000);
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const response = await api.delete(`/agents/${id}`);
      return response.data;
    },
    onSuccess: () => {
      setFormSuccess('Agent deleted successfully!');
      setFormError('');
      queryClient.invalidateQueries(['agents']);
      setTimeout(() => setFormSuccess(''), 3000);
    },
    onError: (err) => {
      setFormError(err.response?.data?.error || 'Failed to delete agent');
      setTimeout(() => setFormError(''), 5000);
    }
  });

  // Mark commission paid mutation
  const markPaidMutation = useMutation({
    mutationFn: async ({ commissionId, notes }) => {
      const response = await api.put(`/agents/commissions/${commissionId}/pay`, { notes });
      return response.data;
    },
    onSuccess: () => {
      setFormSuccess('Commission marked as paid!');
      setFormError('');
      queryClient.invalidateQueries(['agentDetails', selectedAgent?.id]);
      setTimeout(() => setFormSuccess(''), 3000);
    },
    onError: (err) => {
      setFormError(err.response?.data?.error || 'Failed to mark commission as paid');
      setTimeout(() => setFormError(''), 5000);
    }
  });

  const handleCreate = (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.name) {
      setFormError('Name is required');
      return;
    }

    const commissionRate = parseFloat(formData.commission_rate) || 0;
    if (commissionRate < 0 || commissionRate > 100) {
      setFormError('Commission rate must be between 0 and 100');
      return;
    }

    createMutation.mutate({
      name: formData.name.trim(),
      email: formData.email.trim() || null,
      phone: formData.phone.trim() || null,
      commission_rate: commissionRate,
      is_active: formData.is_active,
      branch_id: formData.branch_id || null
    });
  };

  const handleEdit = (agent) => {
    setSelectedAgent(agent);
    setFormData({
      name: agent.name,
      email: agent.email || '',
      phone: agent.phone || '',
      commission_rate: agent.commission_rate.toString(),
      is_active: agent.is_active,
      branch_id: agent.branch_id || ''
    });
    setShowEditModal(true);
    setFormError('');
  };

  const handleUpdate = (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.name) {
      setFormError('Name is required');
      return;
    }

    const commissionRate = parseFloat(formData.commission_rate) || 0;
    if (commissionRate < 0 || commissionRate > 100) {
      setFormError('Commission rate must be between 0 and 100');
      return;
    }

    updateMutation.mutate({
      id: selectedAgent.id,
      data: {
        name: formData.name.trim(),
        email: formData.email.trim() || null,
        phone: formData.phone.trim() || null,
        commission_rate: commissionRate,
        is_active: formData.is_active,
        branch_id: formData.branch_id || null
      }
    });
  };

  const handleDelete = (agent) => {
    if (window.confirm(`Are you sure you want to delete agent "${agent.name}"?`)) {
      deleteMutation.mutate(agent.id);
    }
  };

  const handleMarkPaid = (commission) => {
    if (window.confirm(`Mark commission of ₦${parseFloat(commission.commission_amount).toFixed(2)} as paid?`)) {
      markPaidMutation.mutate({
        commissionId: commission.id,
        notes: `Paid on ${new Date().toLocaleDateString()}`
      });
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN'
    }).format(amount || 0);
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
          Error loading agents: {error.message}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Sales Commission Agents</h1>
          <p className="text-gray-600">Manage sales agents and their commissions</p>
        </div>
        {hasPermission('agent_manage') && (
          <button
            onClick={() => {
              setShowCreateModal(true);
              setFormData({
                name: '',
                email: '',
                phone: '',
                commission_rate: '',
                is_active: true,
                branch_id: user?.branch_id || ''
              });
              setFormError('');
            }}
            className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            <Plus className="h-5 w-5" />
            <span>Add Agent</span>
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

      {/* Agents Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Contact
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Commission Rate
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Branch
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              {hasPermission('agent_manage') && (
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data?.map((agent) => (
              <tr key={agent.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{agent.name}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-900">{agent.email || '—'}</div>
                  <div className="text-xs text-gray-500">{agent.phone || '—'}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{agent.commission_rate}%</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{agent.branch?.name || 'All Branches'}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    agent.is_active
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {agent.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                {hasPermission('agent_manage') && (
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => {
                          setSelectedAgent(agent);
                          setShowDetailModal(true);
                        }}
                        className="text-blue-600 hover:text-blue-900"
                        title="View details"
                      >
                        <Eye className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleEdit(agent)}
                        className="text-primary-600 hover:text-primary-900"
                      >
                        <Edit className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(agent)}
                        className="text-red-600 hover:text-red-900"
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
            No agents found
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Add Agent</h2>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setFormError('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <form onSubmit={handleCreate}>
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
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Commission Rate (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={formData.commission_rate}
                    onChange={(e) => setFormData({ ...formData, commission_rate: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500"
                  />
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
                  Create Agent
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
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

      {/* Edit Modal - Similar structure to Create Modal */}
      {showEditModal && selectedAgent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Edit Agent</h2>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedAgent(null);
                  setFormError('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <form onSubmit={handleUpdate}>
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
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Commission Rate (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={formData.commission_rate}
                    onChange={(e) => setFormData({ ...formData, commission_rate: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500"
                  />
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
                    id="edit_is_active"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <label htmlFor="edit_is_active" className="text-sm text-gray-700">
                    Active
                  </label>
                </div>
              </div>
              <div className="mt-6 flex space-x-3">
                <button
                  type="submit"
                  className="flex-1 bg-primary-600 text-white py-2 rounded-lg hover:bg-primary-700"
                >
                  Update Agent
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedAgent(null);
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

      {/* Detail Modal */}
      {showDetailModal && selectedAgent && agentDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Agent Details: {agentDetails.agent.name}</h2>
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedAgent(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm text-gray-600">Total Commissions</div>
                <div className="text-2xl font-bold text-primary-600">
                  {formatCurrency(agentDetails.summary?.total_commissions || 0)}
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm text-gray-600">Pending</div>
                <div className="text-2xl font-bold text-yellow-600">
                  {formatCurrency(agentDetails.summary?.pending_commissions || 0)}
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm text-gray-600">Paid</div>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(agentDetails.summary?.paid_commissions || 0)}
                </div>
              </div>
            </div>

            {/* Commissions Table */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Commission History</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700">Order</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700">Date</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-700">Order Amount</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-700">Commission</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700">Status</th>
                      {hasPermission('agent_manage') && (
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-700">Actions</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {agentDetails.commissions?.map((commission) => (
                      <tr key={commission.id}>
                        <td className="px-4 py-3 text-sm">{commission.sales_order?.invoice_number || 'N/A'}</td>
                        <td className="px-4 py-3 text-sm">
                          {new Date(commission.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-sm text-right">
                          {formatCurrency(commission.order_amount)}
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-medium text-primary-600">
                          {formatCurrency(commission.commission_amount)}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            commission.payment_status === 'paid'
                              ? 'bg-green-100 text-green-800'
                              : commission.payment_status === 'cancelled'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {commission.payment_status?.toUpperCase()}
                          </span>
                        </td>
                        {hasPermission('agent_manage') && commission.payment_status === 'pending' && (
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => handleMarkPaid(commission)}
                              className="text-green-600 hover:text-green-900 text-sm"
                            >
                              Mark Paid
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {agentDetails.commissions?.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No commissions found
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Agents;









