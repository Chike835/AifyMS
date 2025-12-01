import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { FileText, Calendar, Download, ArrowLeft } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';

const PaymentAccountReport = () => {
  const { accountId } = useParams();
  const { hasPermission } = useAuth();
  const [startDate, setStartDate] = useState(new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  // Payment Account Report
  const { data: reportData, isLoading } = useQuery({
    queryKey: ['paymentAccountReport', accountId, startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      const response = await api.get(`/payment-accounts/${accountId}/report?${params.toString()}`);
      return response.data;
    },
    enabled: !!accountId && hasPermission('payment_account_view')
  });

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN'
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('en-NG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!hasPermission('payment_account_view')) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
        You do not have permission to view this report.
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link
            to="/accounts/payment-accounts"
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-6 w-6" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Payment Account Report</h1>
            <p className="mt-2 text-gray-600">
              {reportData?.account?.name || 'Account Report'}
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="pl-10 w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="pl-10 w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Report Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      ) : reportData ? (
        <div className="space-y-6">
          {/* Summary Card */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Account Summary</h2>
              <button
                onClick={() => window.print()}
                className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                <Download className="h-5 w-5" />
                <span>Export</span>
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-600">Opening Balance</p>
                <p className="text-lg font-semibold text-gray-900">{formatCurrency(reportData.summary.opening_balance)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Current Balance</p>
                <p className="text-lg font-semibold text-gray-900">{formatCurrency(reportData.summary.current_balance)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Deposits</p>
                <p className="text-lg font-semibold text-green-600">{formatCurrency(reportData.summary.total_deposits)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Withdrawals</p>
                <p className="text-lg font-semibold text-red-600">{formatCurrency(reportData.summary.total_withdrawals)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Net Change</p>
                <p className={`text-lg font-semibold ${reportData.summary.net_change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(reportData.summary.net_change)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Transaction Count</p>
                <p className="text-lg font-semibold text-gray-900">{reportData.summary.transaction_count}</p>
              </div>
            </div>
          </div>

          {/* Transactions by Type */}
          {reportData.by_type && Object.keys(reportData.by_type).length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Transactions by Type</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(reportData.by_type).map(([type, data]) => (
                  <div key={type} className="border border-gray-200 rounded-lg p-4">
                    <p className="text-sm font-medium text-gray-700 capitalize">{type.replace('_', ' ')}</p>
                    <p className="text-2xl font-bold text-gray-900 mt-2">{formatCurrency(data.total)}</p>
                    <p className="text-xs text-gray-500 mt-1">{data.count} transaction{data.count !== 1 ? 's' : ''}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Transactions */}
          {reportData.transactions && reportData.transactions.length > 0 && (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">Recent Transactions</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {reportData.transactions.map((transaction) => (
                      <tr key={transaction.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(transaction.created_at)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800 capitalize">
                            {transaction.transaction_type.replace('_', ' ')}
                          </span>
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                          transaction.transaction_type === 'deposit' || transaction.transaction_type === 'payment_received'
                            ? 'text-green-600'
                            : 'text-red-600'
                        }`}>
                          {transaction.transaction_type === 'deposit' || transaction.transaction_type === 'payment_received' ? '+' : '-'}
                          {formatCurrency(Math.abs(transaction.amount))}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {transaction.user?.full_name || '—'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {transaction.notes || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-12 text-center">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No data available for the selected period</p>
        </div>
      )}
    </div>
  );
};

export default PaymentAccountReport;











