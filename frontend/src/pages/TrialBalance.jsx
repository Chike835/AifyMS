import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { FileText, Calendar, Building2, Download } from 'lucide-react';

const TrialBalance = () => {
  const { user, hasPermission } = useAuth();
  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedBranch, setSelectedBranch] = useState('');

  // Fetch branches for Super Admin
  const { data: branchesData } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      const response = await api.get('/branches');
      return response.data.branches || [];
    },
    enabled: user?.role_name === 'Super Admin'
  });

  // Trial Balance Report
  const { data: trialBalanceData, isLoading } = useQuery({
    queryKey: ['trialBalanceReport', asOfDate, selectedBranch],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (asOfDate) params.append('as_of_date', asOfDate);
      if (selectedBranch) params.append('branch_id', selectedBranch);
      const response = await api.get(`/reports/trial-balance?${params.toString()}`);
      return response.data;
    },
    enabled: hasPermission('report_view_financial')
  });

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN'
    }).format(amount || 0);
  };

  if (!hasPermission('report_view_financial')) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
        You do not have permission to view this report.
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Trial Balance</h1>
          <p className="mt-2 text-gray-600">Summary of all account balances</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">As Of Date</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="date"
                value={asOfDate}
                onChange={(e) => setAsOfDate(e.target.value)}
                className="pl-10 w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>
          {user?.role_name === 'Super Admin' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <select
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value)}
                  className="pl-10 w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="">All Branches</option>
                  {branchesData?.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Report Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      ) : trialBalanceData ? (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Trial Balance</h2>
                <p className="text-sm text-gray-600 mt-1">
                  As of {new Date(asOfDate).toLocaleDateString('en-NG', { year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </div>
              <button
                onClick={() => window.print()}
                className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                <Download className="h-5 w-5" />
                <span>Export</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Account</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Debit</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Credit</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {trialBalanceData.debits?.map((item, idx) => (
                  <tr key={`debit-${idx}`} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.account}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900">{formatCurrency(item.amount)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500">—</td>
                  </tr>
                ))}
                {trialBalanceData.credits?.map((item, idx) => (
                  <tr key={`credit-${idx}`} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.account}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500">—</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900">{formatCurrency(item.amount)}</td>
                  </tr>
                ))}
                <tr className="bg-gray-50 font-bold">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Total</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">{formatCurrency(trialBalanceData.total_debits)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">{formatCurrency(trialBalanceData.total_credits)}</td>
                </tr>
              </tbody>
            </table>
          </div>
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

export default TrialBalance;































