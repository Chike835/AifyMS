import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { 
  Wallet, 
  Plus, 
  Eye, 
  ArrowDownCircle, 
  ArrowUpCircle, 
  ArrowLeftRight,
  X,
  Search,
  Building2
} from 'lucide-react';

const PaymentAccounts = () => {
  const { user, hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawalModal, setShowWithdrawalModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // Form states
  const [accountForm, setAccountForm] = useState({
    name: '',
    account_type: 'cash',
    account_number: '',
    bank_name: '',
    opening_balance: '',
    branch_id: ''
  });
  const [depositForm, setDepositForm] = useState({ amount: '', notes: '' });
  const [withdrawalForm, setWithdrawalForm] = useState({ amount: '', notes: '' });
  const [transferForm, setTransferForm] = useState({ 
    from_account_id: '', 
    to_account_id: '', 
    amount: '', 
    notes: '' 
  });

  // Fetch accounts
  const { data, isLoading, error } = useQuery({
    queryKey: ['paymentAccounts'],
    queryFn: async () => {
      const response = await api.get('/payment-accounts');
      return response.data.accounts || [];
    }
  });

  // Fetch branches for Super Admin
  const { data: branchesData } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      const response = await api.get('/branches');
      return response.data.branches || [];
    },
    enabled: user?.role_name === 'Super Admin'
  });

  // Fetch account details
  const { data: accountDetails } = useQuery({
    queryKey: ['paymentAccount', selectedAccount?.id],
    queryFn: async () => {
      if (!selectedAccount?.id) return null;
      const response = await api.get(`/payment-accounts/${selectedAccount.id}`);
      return response.data;
    },
    enabled: !!selectedAccount?.id && showDetailModal
  });

  // Fetch account transactions
  const { data: transactionsData } = useQuery({
    queryKey: ['accountTransactions', selectedAccount?.id],
    queryFn: async () => {
      if (!selectedAccount?.id) return null;
      const response = await api.get(`/payment-accounts/${selectedAccount.id}/transactions?limit=50`);
      return response.data;
    },
    enabled: !!selectedAccount?.id && showDetailModal
  });

  // Create account mutation
  const createAccountMutation = useMutation({
    mutationFn: async (accountData) => {
      const response = await api.post('/payment-accounts', accountData);
      return response.data;
    },
    onSuccess: () => {
      setFormSuccess('Payment account created successfully!');
      setFormError('');
      setShowCreateModal(false);
      setAccountForm({
        name: '',
        account_type: 'cash',
        account_number: '',
        bank_name: '',
        opening_balance: '',
        branch_id: ''
      });
      queryClient.invalidateQueries(['paymentAccounts']);
      setTimeout(() => setFormSuccess(''), 3000);
    },
    onError: (err) => {
      setFormError(err.response?.data?.error || 'Failed to create payment account');
      setTimeout(() => setFormError(''), 5000);
    }
  });

  // Deposit mutation
  const depositMutation = useMutation({
    mutationFn: async ({ accountId, amount, notes }) => {
      const response = await api.post(`/payment-accounts/${accountId}/deposit`, { amount, notes });
      return response.data;
    },
    onSuccess: () => {
      setFormSuccess('Deposit recorded successfully!');
      setFormError('');
      setShowDepositModal(false);
      setDepositForm({ amount: '', notes: '' });
      queryClient.invalidateQueries(['paymentAccounts']);
      queryClient.invalidateQueries(['paymentAccount', selectedAccount?.id]);
      queryClient.invalidateQueries(['accountTransactions', selectedAccount?.id]);
      setTimeout(() => setFormSuccess(''), 3000);
    },
    onError: (err) => {
      setFormError(err.response?.data?.error || 'Failed to record deposit');
      setTimeout(() => setFormError(''), 5000);
    }
  });

  // Withdrawal mutation
  const withdrawalMutation = useMutation({
    mutationFn: async ({ accountId, amount, notes }) => {
      const response = await api.post(`/payment-accounts/${accountId}/withdrawal`, { amount, notes });
      return response.data;
    },
    onSuccess: () => {
      setFormSuccess('Withdrawal recorded successfully!');
      setFormError('');
      setShowWithdrawalModal(false);
      setWithdrawalForm({ amount: '', notes: '' });
      queryClient.invalidateQueries(['paymentAccounts']);
      queryClient.invalidateQueries(['paymentAccount', selectedAccount?.id]);
      queryClient.invalidateQueries(['accountTransactions', selectedAccount?.id]);
      setTimeout(() => setFormSuccess(''), 3000);
    },
    onError: (err) => {
      setFormError(err.response?.data?.error || 'Failed to record withdrawal');
      setTimeout(() => setFormError(''), 5000);
    }
  });

  // Transfer mutation
  const transferMutation = useMutation({
    mutationFn: async (transferData) => {
      const response = await api.post('/payment-accounts/transfer', transferData);
      return response.data;
    },
    onSuccess: () => {
      setFormSuccess('Transfer completed successfully!');
      setFormError('');
      setShowTransferModal(false);
      setTransferForm({ from_account_id: '', to_account_id: '', amount: '', notes: '' });
      queryClient.invalidateQueries(['paymentAccounts']);
      setTimeout(() => setFormSuccess(''), 3000);
    },
    onError: (err) => {
      setFormError(err.response?.data?.error || 'Failed to complete transfer');
      setTimeout(() => setFormError(''), 5000);
    }
  });

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

  const getAccountTypeLabel = (type) => {
    const labels = {
      cash: 'Cash',
      bank: 'Bank Account',
      mobile_money: 'Mobile Money',
      pos_terminal: 'POS Terminal'
    };
    return labels[type] || type;
  };

  const getTransactionTypeLabel = (type) => {
    const labels = {
      deposit: 'Deposit',
      withdrawal: 'Withdrawal',
      transfer: 'Transfer',
      payment_received: 'Payment Received',
      payment_made: 'Payment Made'
    };
    return labels[type] || type;
  };

  const filteredAccounts = data?.filter(account => 
    account.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    account.account_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    account.bank_name?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const handleCreateAccount = (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!accountForm.name || !accountForm.account_type) {
      setFormError('Name and account type are required');
      return;
    }

    const accountData = {
      name: accountForm.name.trim(),
      account_type: accountForm.account_type,
      account_number: accountForm.account_number.trim() || null,
      bank_name: accountForm.bank_name.trim() || null,
      opening_balance: parseFloat(accountForm.opening_balance) || 0,
      branch_id: accountForm.branch_id || null
    };

    createAccountMutation.mutate(accountData);
  };

  const handleDeposit = (e) => {
    e.preventDefault();
    setFormError('');

    if (!depositForm.amount || parseFloat(depositForm.amount) <= 0) {
      setFormError('Amount must be greater than 0');
      return;
    }

    depositMutation.mutate({
      accountId: selectedAccount.id,
      amount: parseFloat(depositForm.amount),
      notes: depositForm.notes.trim() || null
    });
  };

  const handleWithdrawal = (e) => {
    e.preventDefault();
    setFormError('');

    if (!withdrawalForm.amount || parseFloat(withdrawalForm.amount) <= 0) {
      setFormError('Amount must be greater than 0');
      return;
    }

    withdrawalMutation.mutate({
      accountId: selectedAccount.id,
      amount: parseFloat(withdrawalForm.amount),
      notes: withdrawalForm.notes.trim() || null
    });
  };

  const handleTransfer = (e) => {
    e.preventDefault();
    setFormError('');

    if (!transferForm.from_account_id || !transferForm.to_account_id || !transferForm.amount) {
      setFormError('All fields are required');
      return;
    }

    if (transferForm.from_account_id === transferForm.to_account_id) {
      setFormError('Cannot transfer to the same account');
      return;
    }

    if (parseFloat(transferForm.amount) <= 0) {
      setFormError('Amount must be greater than 0');
      return;
    }

    transferMutation.mutate({
      from_account_id: transferForm.from_account_id,
      to_account_id: transferForm.to_account_id,
      amount: parseFloat(transferForm.amount),
      notes: transferForm.notes.trim() || null
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Accounts</h1>
          <p className="text-gray-600">Manage bank accounts, cash registers, and payment methods</p>
        </div>
        {hasPermission('payment_account_manage') && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            <Plus className="h-5 w-5" />
            <span>Add Account</span>
          </button>
        )}
      </div>

      {/* Success/Error Messages */}
      {formSuccess && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 text-green-800 rounded-lg">
          {formSuccess}
        </div>
      )}
      {formError && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-800 rounded-lg">
          {formError}
        </div>
      )}

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search accounts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Accounts List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {filteredAccounts.map((account) => (
          <div
            key={account.id}
            className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => {
              setSelectedAccount(account);
              setShowDetailModal(true);
            }}
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{account.name}</h3>
                <p className="text-sm text-gray-500">{getAccountTypeLabel(account.account_type)}</p>
              </div>
              <div className={`px-2 py-1 rounded text-xs font-medium ${
                account.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
              }`}>
                {account.is_active ? 'Active' : 'Inactive'}
              </div>
            </div>
            <div className="space-y-2">
              {account.bank_name && (
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Bank:</span> {account.bank_name}
                </p>
              )}
              {account.account_number && (
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Account #:</span> {account.account_number}
                </p>
              )}
              {account.branch && (
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Branch:</span> {account.branch.name}
                </p>
              )}
              <div className="pt-2 border-t border-gray-200">
                <p className="text-2xl font-bold text-primary-600">
                  {formatCurrency(account.current_balance)}
                </p>
                <p className="text-xs text-gray-500">Current Balance</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredAccounts.length === 0 && (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <Wallet className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p className="text-gray-600">No payment accounts found</p>
        </div>
      )}

      {/* Create Account Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Create Payment Account</h2>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setAccountForm({
                    name: '',
                    account_type: 'cash',
                    account_number: '',
                    bank_name: '',
                    opening_balance: '',
                    branch_id: ''
                  });
                  setFormError('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <form onSubmit={handleCreateAccount}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Account Name *
                  </label>
                  <input
                    type="text"
                    value={accountForm.name}
                    onChange={(e) => setAccountForm({ ...accountForm, name: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Account Type *
                  </label>
                  <select
                    value={accountForm.account_type}
                    onChange={(e) => setAccountForm({ ...accountForm, account_type: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500"
                    required
                  >
                    <option value="cash">Cash</option>
                    <option value="bank">Bank Account</option>
                    <option value="mobile_money">Mobile Money</option>
                    <option value="pos_terminal">POS Terminal</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Account Number
                  </label>
                  <input
                    type="text"
                    value={accountForm.account_number}
                    onChange={(e) => setAccountForm({ ...accountForm, account_number: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bank Name
                  </label>
                  <input
                    type="text"
                    value={accountForm.bank_name}
                    onChange={(e) => setAccountForm({ ...accountForm, bank_name: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Opening Balance
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={accountForm.opening_balance}
                    onChange={(e) => setAccountForm({ ...accountForm, opening_balance: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                {user?.role_name === 'Super Admin' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Branch
                    </label>
                    <select
                      value={accountForm.branch_id}
                      onChange={(e) => setAccountForm({ ...accountForm, branch_id: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="">Select Branch</option>
                      {branchesData?.map((branch) => (
                        <option key={branch.id} value={branch.id}>
                          {branch.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              <div className="mt-6 flex space-x-3">
                <button
                  type="submit"
                  className="flex-1 bg-primary-600 text-white py-2 rounded-lg hover:bg-primary-700"
                >
                  Create Account
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setAccountForm({
                      name: '',
                      account_type: 'cash',
                      account_number: '',
                      bank_name: '',
                      opening_balance: '',
                      branch_id: ''
                    });
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

      {/* Account Detail Modal */}
      {showDetailModal && selectedAccount && accountDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Account Details</h2>
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedAccount(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <p className="text-sm text-gray-500">Account Name</p>
                <p className="text-lg font-semibold">{accountDetails.account.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Account Type</p>
                <p className="text-lg font-semibold">{getAccountTypeLabel(accountDetails.account.account_type)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Current Balance</p>
                <p className="text-2xl font-bold text-primary-600">
                  {formatCurrency(accountDetails.account.current_balance)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Status</p>
                <span className={`inline-block px-3 py-1 rounded text-sm font-medium ${
                  accountDetails.account.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {accountDetails.account.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>

            {hasPermission('payment_account_manage') && (
              <div className="flex space-x-3 mb-6">
                <button
                  onClick={() => setShowDepositModal(true)}
                  className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  <ArrowDownCircle className="h-5 w-5" />
                  <span>Deposit</span>
                </button>
                <button
                  onClick={() => setShowWithdrawalModal(true)}
                  className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  <ArrowUpCircle className="h-5 w-5" />
                  <span>Withdraw</span>
                </button>
                <button
                  onClick={() => setShowTransferModal(true)}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <ArrowLeftRight className="h-5 w-5" />
                  <span>Transfer</span>
                </button>
              </div>
            )}

            <div>
              <h3 className="text-lg font-semibold mb-4">Transaction History</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Date</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Type</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Amount</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">User</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {transactionsData?.transactions?.map((transaction) => (
                      <tr key={transaction.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm">{formatDate(transaction.created_at)}</td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            transaction.transaction_type === 'deposit' || transaction.transaction_type === 'payment_received'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {getTransactionTypeLabel(transaction.transaction_type)}
                          </span>
                        </td>
                        <td className={`px-4 py-3 text-sm text-right font-medium ${
                          transaction.transaction_type === 'deposit' || transaction.transaction_type === 'payment_received'
                            ? 'text-green-600'
                            : 'text-red-600'
                        }`}>
                          {transaction.transaction_type === 'deposit' || transaction.transaction_type === 'payment_received' ? '+' : '-'}
                          {formatCurrency(transaction.amount)}
                        </td>
                        <td className="px-4 py-3 text-sm">{transaction.user?.full_name || 'N/A'}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">{transaction.notes || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Deposit Modal */}
      {showDepositModal && selectedAccount && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Record Deposit</h2>
              <button
                onClick={() => {
                  setShowDepositModal(false);
                  setDepositForm({ amount: '', notes: '' });
                  setFormError('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <form onSubmit={handleDeposit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Amount *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={depositForm.amount}
                    onChange={(e) => setDepositForm({ ...depositForm, amount: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    value={depositForm.notes}
                    onChange={(e) => setDepositForm({ ...depositForm, notes: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500"
                    rows="3"
                  />
                </div>
              </div>
              <div className="mt-6 flex space-x-3">
                <button
                  type="submit"
                  className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700"
                >
                  Record Deposit
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowDepositModal(false);
                    setDepositForm({ amount: '', notes: '' });
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

      {/* Withdrawal Modal */}
      {showWithdrawalModal && selectedAccount && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Record Withdrawal</h2>
              <button
                onClick={() => {
                  setShowWithdrawalModal(false);
                  setWithdrawalForm({ amount: '', notes: '' });
                  setFormError('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <form onSubmit={handleWithdrawal}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Amount *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={withdrawalForm.amount}
                    onChange={(e) => setWithdrawalForm({ ...withdrawalForm, amount: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Available: {formatCurrency(selectedAccount.current_balance)}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    value={withdrawalForm.notes}
                    onChange={(e) => setWithdrawalForm({ ...withdrawalForm, notes: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500"
                    rows="3"
                  />
                </div>
              </div>
              <div className="mt-6 flex space-x-3">
                <button
                  type="submit"
                  className="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700"
                >
                  Record Withdrawal
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowWithdrawalModal(false);
                    setWithdrawalForm({ amount: '', notes: '' });
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

      {/* Transfer Modal */}
      {showTransferModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Transfer Between Accounts</h2>
              <button
                onClick={() => {
                  setShowTransferModal(false);
                  setTransferForm({ from_account_id: '', to_account_id: '', amount: '', notes: '' });
                  setFormError('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <form onSubmit={handleTransfer}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    From Account *
                  </label>
                  <select
                    value={transferForm.from_account_id}
                    onChange={(e) => setTransferForm({ ...transferForm, from_account_id: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500"
                    required
                  >
                    <option value="">Select Account</option>
                    {data?.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name} - {formatCurrency(account.current_balance)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    To Account *
                  </label>
                  <select
                    value={transferForm.to_account_id}
                    onChange={(e) => setTransferForm({ ...transferForm, to_account_id: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500"
                    required
                  >
                    <option value="">Select Account</option>
                    {data?.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name} - {formatCurrency(account.current_balance)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Amount *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={transferForm.amount}
                    onChange={(e) => setTransferForm({ ...transferForm, amount: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    value={transferForm.notes}
                    onChange={(e) => setTransferForm({ ...transferForm, notes: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500"
                    rows="3"
                  />
                </div>
              </div>
              <div className="mt-6 flex space-x-3">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
                >
                  Transfer
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowTransferModal(false);
                    setTransferForm({ from_account_id: '', to_account_id: '', amount: '', notes: '' });
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

export default PaymentAccounts;

