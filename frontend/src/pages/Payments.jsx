import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { Check, Clock, Plus, DollarSign, Search, X } from 'lucide-react';

const Payments = () => {
  const { hasPermission, user } = useAuth();
  const queryClient = useQueryClient();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('form'); // 'form', 'recent', 'pending'
  const [paymentType, setPaymentType] = useState('customer'); // 'customer', 'supplier'

  // Reset payment type to customer if user doesn't have supplier_payment permission
  useEffect(() => {
    if (paymentType === 'supplier' && !hasPermission('supplier_payment')) {
      setPaymentType('customer');
      setFormData(prev => ({ ...prev, supplier_id: '', customer_id: '' }));
    }
  }, [paymentType, hasPermission]);
  const [formData, setFormData] = useState({
    customer_id: '',
    supplier_id: '',
    amount: '',
    method: 'cash',
    reference_note: '',
    payment_account_id: ''
  });
  const [formError, setFormError] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [supplierSearch, setSupplierSearch] = useState('');
  const [pendingAccountSelections, setPendingAccountSelections] = useState({});

  const { data: customersData } = useQuery({
    queryKey: ['customers', customerSearch],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (customerSearch) params.append('search', customerSearch);
      const response = await api.get(`/customers?${params.toString()}`);
      return response.data.customers || [];
    },
    enabled: paymentType === 'customer'
  });

  // Fetch suppliers for payment form
  const { data: suppliersData } = useQuery({
    queryKey: ['suppliers', supplierSearch],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (supplierSearch) params.append('search', supplierSearch);
      const response = await api.get(`/suppliers?${params.toString()}`);
      return response.data.suppliers || [];
    },
    enabled: paymentType === 'supplier'
  });

  // Fetch recent payments
  const { data: recentPaymentsData, isLoading: recentLoading } = useQuery({
    queryKey: ['recentPayments'],
    queryFn: async () => {
      const response = await api.get('/payments/recent');
      return response.data.payments || [];
    },
    enabled: hasPermission('payment_view'),
  });

  // Fetch pending payments
  const { data: pendingPaymentsData, isLoading: pendingLoading } = useQuery({
    queryKey: ['pendingPayments'],
    queryFn: async () => {
      const response = await api.get('/payments/pending');
      return response.data.payments || [];
    },
    enabled: hasPermission('payment_confirm'),
  });

  const { data: paymentAccountsData, isLoading: accountsLoading } = useQuery({
    queryKey: ['paymentAccounts'],
    queryFn: async () => {
      const response = await api.get('/payment-accounts');
      return response.data.accounts || [];
    },
    enabled: hasPermission('payment_receive') || hasPermission('payment_confirm')
  });

  const paymentAccounts = paymentAccountsData || [];
  const noAccountsAvailable = !accountsLoading && paymentAccounts.length === 0;
  // Create payment mutation
  const createPaymentMutation = useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/payments', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recentPayments'] });
      queryClient.invalidateQueries({ queryKey: ['pendingPayments'] });
      setFormData({
        customer_id: '',
        supplier_id: '',
        amount: '',
        method: 'cash',
        reference_note: '',
        payment_account_id: paymentAccounts[0]?.id || ''
      });
      setCustomerSearch('');
      setSupplierSearch('');
      setFormError('');
      alert('Payment logged successfully! Awaiting confirmation.');
      setActiveTab('recent');
    },
    onError: (error) => {
      setFormError(error.response?.data?.error || 'Failed to create payment');
    },
  });

  // Confirm payment mutation
  const confirmPaymentMutation = useMutation({
    mutationFn: async ({ paymentId, payment_account_id }) => {
      const response = await api.put(`/payments/${paymentId}/confirm`, { payment_account_id });
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['pendingPayments'] });
      queryClient.invalidateQueries({ queryKey: ['recentPayments'] });
      setPendingAccountSelections((prev) => {
        const next = { ...prev };
        delete next[variables.paymentId];
        return next;
      });
      alert('Payment confirmed successfully!');
    },
    onError: (error) => {
      alert(error.response?.data?.error || 'Failed to confirm payment');
    },

  });

  // Decline payment mutation
  const declinePaymentMutation = useMutation({
    mutationFn: async (paymentId) => {
      const response = await api.put(`/payments/${paymentId}/decline`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingPayments'] });
      queryClient.invalidateQueries({ queryKey: ['recentPayments'] }); // It might show up as voided if we list all
      alert('Payment declined successfully!');
    },
    onError: (error) => {
      alert(error.response?.data?.error || 'Failed to decline payment');
    },
  });

  const isCreateDisabled = createPaymentMutation.isPending || noAccountsAvailable;
  const recentPayments = recentPaymentsData || [];
  const pendingPayments = pendingPaymentsData || [];

  // Check for status query param
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const statusParam = params.get('status');
    if (statusParam === 'pending_confirmation' && hasPermission('payment_confirm')) {
      setActiveTab('pending');
    }
  }, [location.search, hasPermission]);

  useEffect(() => {
    if (paymentAccounts.length === 0) {
      return;
    }
    setFormData((prev) => {
      if (prev.payment_account_id) {
        return prev;
      }
      return { ...prev, payment_account_id: paymentAccounts[0].id };
    });
  }, [paymentAccounts]);

  useEffect(() => {
    setPendingAccountSelections((prev) => {
      const next = { ...prev };
      let changed = false;
      const pendingIds = new Set(pendingPayments.map((payment) => payment.id));
      Object.keys(next).forEach((id) => {
        if (!pendingIds.has(id)) {
          delete next[id];
          changed = true;
        }
      });
      pendingPayments.forEach((payment) => {
        if (payment.payment_account?.id && next[payment.id] !== payment.payment_account.id) {
          next[payment.id] = payment.payment_account.id;
          changed = true;
        } else if (!payment.payment_account?.id && !next[payment.id] && paymentAccounts.length > 0) {
          next[payment.id] = paymentAccounts[0].id;
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [pendingPayments, paymentAccounts]);



  const handleSubmit = (e) => {
    e.preventDefault();
    setFormError('');

    if (paymentType === 'customer' && !formData.customer_id) {
      setFormError('Please select a customer');
      return;
    }

    if (paymentType === 'supplier' && !formData.supplier_id) {
      setFormError('Please select a supplier');
      return;
    }

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      setFormError('Amount must be greater than 0');
      return;
    }

    if (!formData.payment_account_id) {
      setFormError('Please select a payment account');
      return;
    }

    const payload = {
      amount: parseFloat(formData.amount),
      method: formData.method,
      reference_note: formData.reference_note || null,
      payment_account_id: formData.payment_account_id
    };

    if (paymentType === 'customer') {
      payload.customer_id = formData.customer_id;
    } else {
      payload.supplier_id = formData.supplier_id;
    }

    createPaymentMutation.mutate(payload);
  };

  const handleConfirm = (payment) => {
    const resolvedAccountId = payment.payment_account?.id || pendingAccountSelections[payment.id];
    if (!resolvedAccountId) {
      alert('Please select a payment account before confirming this payment.');
      return;
    }
    if (window.confirm('Are you sure you want to confirm this payment?')) {
      confirmPaymentMutation.mutate({
        paymentId: payment.id,
        payment_account_id: resolvedAccountId
      });
    }
  };

  const handleDecline = (payment) => {
    if (window.confirm('Are you sure you want to DECLINE this payment? This action cannot be undone.')) {
      declinePaymentMutation.mutate(payment.id);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN'
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-NG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handlePendingAccountChange = (paymentId, accountId) => {
    setPendingAccountSelections((prev) => ({
      ...prev,
      [paymentId]: accountId
    }));
  };

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Payment Portal</h1>
        <p className="text-gray-600 mt-2">Log payments and manage payment approvals</p>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="flex space-x-8">
          {hasPermission('payment_receive') && (
            <button
              onClick={() => setActiveTab('form')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'form'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              <Plus className="h-4 w-4 inline mr-2" />
              Add Payment
            </button>
          )}
          {hasPermission('payment_view') && (
            <button
              onClick={() => setActiveTab('recent')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'recent'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              <DollarSign className="h-4 w-4 inline mr-2" />
              Recent Payments
            </button>
          )}
          {hasPermission('payment_confirm') && (
            <button
              onClick={() => setActiveTab('pending')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'pending'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              <Clock className="h-4 w-4 inline mr-2" />
              Pending Approval ({pendingPayments.length})
            </button>
          )}
        </nav>
      </div>

      {/* Payment Form Tab */}
      {activeTab === 'form' && hasPermission('payment_receive') && (
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Add Payment</h2>
          {accountsLoading && (
            <div className="mb-4 text-sm text-gray-500">Loading payment accounts...</div>
          )}
          {noAccountsAvailable && (
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-800 text-sm">
              No payment accounts found. Please create a payment account before logging payments.
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Payment Type Toggle */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Payment Type</label>
              <div className="flex space-x-4">
                <button
                  type="button"
                  onClick={() => {
                    setPaymentType('customer');
                    setFormData({ ...formData, supplier_id: '' });
                  }}
                  className={`flex-1 py-2 px-4 rounded-lg border text-sm font-medium transition-colors ${paymentType === 'customer'
                      ? 'bg-primary-50 border-primary-500 text-primary-700'
                      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                >
                  Customer Payment (Income)
                </button>
                {hasPermission('supplier_payment') && (
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentType('supplier');
                      setFormData({ ...formData, customer_id: '' });
                    }}
                    className={`flex-1 py-2 px-4 rounded-lg border text-sm font-medium transition-colors ${paymentType === 'supplier'
                        ? 'bg-primary-50 border-primary-500 text-primary-700'
                        : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                  >
                    Supplier Payment (Expense)
                  </button>
                )}
              </div>
              {!hasPermission('supplier_payment') && (
                <p className="text-xs text-gray-500 mt-2">
                  Supplier payments require the "supplier_payment" permission. Contact your administrator to enable this feature.
                </p>
              )}
            </div>

            {/* Customer/Supplier Selection */}
            {paymentType === 'customer' ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Customer <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search customer by name or phone..."
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                {customerSearch && customersData && (
                  <div className="mt-2 border border-gray-200 rounded-lg max-h-48 overflow-y-auto">
                    {customersData.length === 0 ? (
                      <div className="p-3 text-sm text-gray-500">No customers found</div>
                    ) : (
                      customersData.map((customer) => (
                        <button
                          key={customer.id}
                          type="button"
                          onClick={() => {
                            setFormData({ ...formData, customer_id: customer.id });
                            setCustomerSearch(customer.name);
                          }}
                          className={`w-full text-left px-4 py-2 hover:bg-gray-50 ${formData.customer_id === customer.id ? 'bg-primary-50' : ''
                            }`}
                        >
                          <div className="font-medium text-gray-900">{customer.name}</div>
                          {customer.phone && (
                            <div className="text-sm text-gray-500">{customer.phone}</div>
                          )}
                        </button>
                      ))
                    )}
                  </div>
                )}
                {formData.customer_id && (
                  <div className="mt-2 text-sm text-gray-600">
                    Selected: {customersData?.find(c => c.id === formData.customer_id)?.name}
                  </div>
                )}
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Supplier <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search supplier by name or phone..."
                    value={supplierSearch}
                    onChange={(e) => setSupplierSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                {supplierSearch && suppliersData && (
                  <div className="mt-2 border border-gray-200 rounded-lg max-h-48 overflow-y-auto">
                    {suppliersData.length === 0 ? (
                      <div className="p-3 text-sm text-gray-500">No suppliers found</div>
                    ) : (
                      suppliersData.map((supplier) => (
                        <button
                          key={supplier.id}
                          type="button"
                          onClick={() => {
                            setFormData({ ...formData, supplier_id: supplier.id });
                            setSupplierSearch(supplier.name);
                          }}
                          className={`w-full text-left px-4 py-2 hover:bg-gray-50 ${formData.supplier_id === supplier.id ? 'bg-primary-50' : ''
                            }`}
                        >
                          <div className="font-medium text-gray-900">{supplier.name}</div>
                          {supplier.phone && (
                            <div className="text-sm text-gray-500">{supplier.phone}</div>
                          )}
                        </button>
                      ))
                    )}
                  </div>
                )}
                {formData.supplier_id && (
                  <div className="mt-2 text-sm text-gray-600">
                    Selected: {suppliersData?.find(s => s.id === formData.supplier_id)?.name}
                  </div>
                )}
              </div>
            )}

            {/* Amount */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Amount <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="0.00"
                required
              />
            </div>

            {/* Payment Method */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Method <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.method}
                onChange={(e) => setFormData({ ...formData, method: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
              >
                <option value="cash">Cash</option>
                <option value="transfer">Transfer</option>
                <option value="pos">POS</option>
              </select>
            </div>

            {/* Payment Account */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Account <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.payment_account_id}
                onChange={(e) => setFormData({ ...formData, payment_account_id: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                disabled={noAccountsAvailable || accountsLoading}
              >
                {paymentAccounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name} ({account.account_type})
                  </option>
                ))}
              </select>
            </div>

            {/* Reference Note */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reference Note (Optional)
              </label>
              <textarea
                value={formData.reference_note}
                onChange={(e) => setFormData({ ...formData, reference_note: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Add any reference or notes..."
              />
            </div>

            {/* Error Message */}
            {formError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {formError}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isCreateDisabled}
              className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {createPaymentMutation.isPending ? 'Logging Payment...' : 'Log Payment'}
            </button>
          </form>
        </div>
      )}

      {/* Recent Payments Tab */}
      {activeTab === 'recent' && hasPermission('payment_view') && (
        <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Recent Payments</h2>
            <p className="text-sm text-gray-600 mt-1">Last 50 payments</p>
          </div>
          {recentLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : recentPayments.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <DollarSign className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No recent payments</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Method
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Account
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created By
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Confirmed By
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {recentPayments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {payment.customer?.name || payment.supplier?.name || 'N/A'}
                        </div>
                        {(payment.customer?.phone || payment.supplier?.phone) && (
                          <div className="text-sm text-gray-500">{payment.customer?.phone || payment.supplier?.phone}</div>
                        )}
                        <span className={`text-xs ml-2 px-1 rounded ${payment.customer ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'}`}>
                          {payment.customer ? 'Customer' : 'Supplier'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {formatCurrency(payment.amount)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                          {payment.method.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {payment.payment_account?.name || '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${payment.status === 'confirmed'
                          ? 'bg-green-100 text-green-800'
                          : payment.status === 'voided'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                          }`}>
                          {payment.status === 'pending_confirmation' ? 'Pending' : payment.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {payment.creator?.full_name || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {payment.confirmer?.full_name || '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(payment.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Pending Payments Tab */}
      {activeTab === 'pending' && hasPermission('payment_confirm') && (
        <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Pending Payments Approval</h2>
            <p className="text-sm text-gray-600 mt-1">Review and confirm pending payments</p>
          </div>
          {pendingLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : pendingPayments.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Clock className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No pending payments</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Method
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Account
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created By
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Reference
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {pendingPayments.map((payment) => {
                    const resolvedAccountId = payment.payment_account?.id || pendingAccountSelections[payment.id];
                    const confirmDisabled = confirmPaymentMutation.isPending || !resolvedAccountId || paymentAccounts.length === 0;
                    const declineDisabled = declinePaymentMutation.isPending;
                    return (
                      <tr key={payment.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {payment.customer?.name || payment.supplier?.name || 'N/A'}
                          </div>
                          {(payment.customer?.phone || payment.supplier?.phone) && (
                            <div className="text-sm text-gray-500">{payment.customer?.phone || payment.supplier?.phone}</div>
                          )}
                          <span className={`text-xs ml-2 px-1 rounded ${payment.customer ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'}`}>
                            {payment.customer ? 'Customer' : 'Supplier'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {formatCurrency(payment.amount)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                            {payment.method.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {payment.payment_account ? (
                            <span className="text-sm text-gray-900">{payment.payment_account.name}</span>
                          ) : paymentAccounts.length > 0 ? (
                            <select
                              value={pendingAccountSelections[payment.id] || ''}
                              onChange={(e) => handlePendingAccountChange(payment.id, e.target.value)}
                              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                            >
                              {paymentAccounts.map((account) => (
                                <option key={account.id} value={account.id}>
                                  {account.name}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span className="text-sm text-red-600">No accounts</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {payment.creator?.full_name || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(payment.created_at)}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {payment.reference_note || '—'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => handleConfirm(payment)}
                            disabled={confirmDisabled}
                            className="inline-flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            <Check className="h-4 w-4" />
                            <span>Confirm</span>
                          </button>
                          <button
                            onClick={() => handleDecline(payment)}
                            disabled={declineDisabled}
                            className="inline-flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            <X className="h-4 w-4" />
                            <span>Decline</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Payments;

