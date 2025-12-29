import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import DateFilterDropdown from '../components/common/DateFilterDropdown';
import { ArrowLeft, Download, FileText, Building2 } from 'lucide-react';

const SupplierLedger = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, hasPermission } = useAuth();
  const [dateRange, setDateRange] = useState({ startDate: null, endDate: null });
  const [selectedBranch, setSelectedBranch] = useState(null);

  // Fetch supplier details
  const { data: supplierData } = useQuery({
    queryKey: ['supplier', id],
    queryFn: async () => {
      const response = await api.get(`/suppliers/${id}`);
      return response.data.supplier;
    },
    enabled: !!id
  });

  // Fetch branches for filter
  const { data: branchesData } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      const response = await api.get('/branches');
      return response.data.branches || [];
    }
  });

  // Fetch ledger entries
  const { data: ledgerData, isLoading } = useQuery({
    queryKey: ['supplierLedger', id, dateRange.startDate, dateRange.endDate, selectedBranch],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dateRange.startDate) params.append('start_date', dateRange.startDate);
      if (dateRange.endDate) params.append('end_date', dateRange.endDate);
      if (selectedBranch) params.append('branch_id', selectedBranch);
      const response = await api.get(`/ledger/supplier/${id}?${params.toString()}`);
      return response.data;
    },
    enabled: !!id
  });

  const handleDateChange = (range) => {
    setDateRange({
      startDate: range.startDate,
      endDate: range.endDate
    });
  };

  const handleBranchChange = (e) => {
    setSelectedBranch(e.target.value === 'all' ? null : e.target.value);
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

  const handleExportCSV = async () => {
    try {
      const params = new URLSearchParams();
      if (dateRange.startDate) params.append('start_date', dateRange.startDate);
      if (dateRange.endDate) params.append('end_date', dateRange.endDate);
      if (selectedBranch) params.append('branch_id', selectedBranch);
      params.append('format', 'csv');
      
      const response = await api.get(`/ledger/export/supplier/${id}?${params.toString()}`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `supplier_ledger_${id}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      alert('Error exporting CSV: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleDrillDown = (entry) => {
    if (entry.transaction_type === 'INVOICE' && entry.transaction_id) {
      navigate(`/purchases/${entry.transaction_id}`);
    } else if (entry.transaction_type === 'RETURN' && entry.transaction_id) {
      navigate(`/purchases/returns`);
    }
  };

  const supplier = supplierData || ledgerData?.supplier;
  const entries = ledgerData?.entries || [];
  const currentBalance = supplier?.ledger_balance || 0;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/suppliers')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Supplier Ledger</h1>
            {supplier && (
              <p className="text-gray-600 mt-1">
                {supplier.name} {supplier.phone && `• ${supplier.phone}`}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Download className="h-4 w-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Contact Info & Balance Card */}
      {supplier && (
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h2>
              <div className="space-y-2 text-sm">
                <p><span className="font-medium">Name:</span> {supplier.name}</p>
                {supplier.phone && <p><span className="font-medium">Phone:</span> {supplier.phone}</p>}
                {supplier.email && <p><span className="font-medium">Email:</span> {supplier.email}</p>}
                {supplier.address && <p><span className="font-medium">Address:</span> {supplier.address}</p>}
              </div>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Current Balance</h2>
              <div className={`text-4xl font-bold ${
                parseFloat(currentBalance) >= 0 ? 'text-red-600' : 'text-green-600'
              }`}>
                {formatCurrency(currentBalance)}
              </div>
              <p className="text-sm text-gray-500 mt-2">
                {parseFloat(currentBalance) >= 0 ? 'We owe supplier' : 'Supplier credit'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow border border-gray-200 p-4 mb-6">
        <div className="flex items-center space-x-4 flex-wrap gap-4">
          <div className="flex items-center space-x-2">
            <Building2 className="h-4 w-4 text-gray-400" />
            <select
              value={selectedBranch || 'all'}
              onChange={handleBranchChange}
              className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">All Branches</option>
              {branchesData?.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
          </div>
          <DateFilterDropdown
            onDateChange={handleDateChange}
            initialPreset="this-month"
            showTimeRange={false}
          />
        </div>
      </div>

      {/* Ledger Table */}
      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>No ledger entries found for the selected period</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Debit
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Credit
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Balance
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Branch
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {entries.map((entry) => (
                  <tr
                    key={entry.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => handleDrillDown(entry)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(entry.transaction_date)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div>
                        <div className="font-medium">{entry.description || entry.transaction_type}</div>
                        <div className="text-xs text-gray-500">{entry.transaction_type}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                      {parseFloat(entry.debit_amount) > 0 ? (
                        <span className="text-red-600 font-medium">
                          {formatCurrency(entry.debit_amount)}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                      {parseFloat(entry.credit_amount) > 0 ? (
                        <span className="text-green-600 font-medium">
                          {formatCurrency(entry.credit_amount)}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                      <span className={`font-bold ${
                        parseFloat(entry.running_balance) >= 0 ? 'text-red-600' : 'text-green-600'
                      }`}>
                        {formatCurrency(entry.running_balance)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {entry.branch?.name || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Summary */}
      {entries.length > 0 && (
        <div className="mt-6 bg-gray-50 rounded-lg p-4">
          <p className="text-sm text-gray-600">
            Total Entries: <span className="font-medium">{entries.length}</span>
          </p>
        </div>
      )}
    </div>
  );
};

export default SupplierLedger;




























