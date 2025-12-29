import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import DateFilterDropdown from '../components/common/DateFilterDropdown';
import { ArrowLeft, Download, FileText, Building2, MoreVertical, Trash2 } from 'lucide-react';
import SaleDetailModal from '../components/sales/SaleDetailModal';
import SaleActionDropdown from '../components/sales/SaleActionDropdown';

const CustomerLedger = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const [dateRange, setDateRange] = useState({ startDate: null, endDate: null });
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [selectedSaleId, setSelectedSaleId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Fetch customer details
  const { data: customerData } = useQuery({
    queryKey: ['customer', id],
    queryFn: async () => {
      const response = await api.get(`/customers/${id}`);
      return response.data.customer;
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
  const { data: ledgerData, isLoading, refetch } = useQuery({
    queryKey: ['customerLedger', id, dateRange.startDate, dateRange.endDate, selectedBranch],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dateRange.startDate) params.append('start_date', dateRange.startDate);
      if (dateRange.endDate) params.append('end_date', dateRange.endDate);
      if (selectedBranch) params.append('branch_id', selectedBranch);
      const response = await api.get(`/ledger/customer/${id}?${params.toString()}`);
      return response.data;
    },
    enabled: !!id
  });

  // Fetch ledger summary
  const { data: summaryData } = useQuery({
    queryKey: ['customerLedgerSummary', id],
    queryFn: async () => {
      const response = await api.get(`/ledger/customer/${id}/summary`);
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

  const getPaymentStatusColor = (status) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'partial': return 'bg-yellow-100 text-yellow-800';
      case 'unpaid': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getProductionStatusColor = (status) => {
    switch (status) {
      case 'queue': return 'bg-orange-100 text-orange-800';
      case 'produced': return 'bg-blue-100 text-blue-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'na': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatProductionStatus = (status) => {
    if (status === 'na') return 'N/A';
    return status;
  };

  const handleExportCSV = async () => {
    try {
      const params = new URLSearchParams();
      if (dateRange.startDate) params.append('start_date', dateRange.startDate);
      if (dateRange.endDate) params.append('end_date', dateRange.endDate);
      if (selectedBranch) params.append('branch_id', selectedBranch);
      params.append('format', 'csv');

      const response = await api.get(`/ledger/export/customer/${id}?${params.toString()}`, {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `customer_ledger_${id}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      alert('Error exporting CSV: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleDrillDown = (entry) => {
    if ((entry.transaction_type === 'INVOICE' || entry.transaction_type === 'PENDING_APPROVAL') && entry.transaction_id) {
      setSelectedSaleId(entry.transaction_id);
      setIsModalOpen(true);
    } else if (entry.transaction_type === 'PAYMENT' && entry.transaction_id) {
      navigate(`/payments`);
    } else if (entry.transaction_type === 'SALE_RETURN' && entry.transaction_id) {
      // Handle return view if needed, or just show sale detail if ID matches
      // For now, assuming standard flow
    }
  };

  const handleDeleteSale = async (saleId) => {
    if (window.confirm('Are you sure you want to delete this sale? This action cannot be undone.')) {
      try {
        await api.delete(`/sales/${saleId}`);
        queryClient.invalidateQueries(['customerLedger', id]);
        queryClient.invalidateQueries(['sales']);
        refetch();
        alert('Sale deleted successfully');
      } catch (error) {
        alert('Failed to delete sale: ' + (error.response?.data?.error || error.message));
      }
    }
  };

  const handleApproveSale = async (saleId) => {
    if (window.confirm('Are you sure you want to approve this sale for production?')) {
      try {
        await api.put(`/sales/${saleId}/approve-manufacturing`);
        queryClient.invalidateQueries(['customerLedger', id]);
        queryClient.invalidateQueries(['sales']);
        queryClient.invalidateQueries(['sale', saleId]);
        refetch();
        alert('Sale approved for production successfully');
      } catch (error) {
        alert('Failed to approve sale: ' + (error.response?.data?.error || error.message));
      }
    }
  };

  const handleDeletePayment = async (paymentId) => {
    if (window.confirm('Are you sure you want to delete this payment? This action cannot be undone and will refresh sales order payment statuses.')) {
      try {
        await api.delete(`/payments/${paymentId}`);
        queryClient.invalidateQueries(['customerLedger', id]);
        queryClient.invalidateQueries(['customerLedgerSummary', id]);
        queryClient.invalidateQueries(['sales']);
        refetch();
        alert('Payment deleted successfully');
      } catch (error) {
        alert('Failed to delete payment: ' + (error.response?.data?.error || error.message));
      }
    }
  };

  const customer = customerData || ledgerData?.customer;
  const entries = ledgerData?.entries || [];
  const currentBalance = customer?.ledger_balance || 0;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/customers')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Customer Ledger</h1>
            {customer && (
              <p className="text-gray-600 mt-1">
                {customer.name} {customer.phone && `• ${customer.phone}`}
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
      {customer && (
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h2>
              <div className="space-y-2 text-sm">
                <p><span className="font-medium">Name:</span> {customer.name}</p>
                {customer.phone && <p><span className="font-medium">Phone:</span> {customer.phone}</p>}
                {customer.email && <p><span className="font-medium">Email:</span> {customer.email}</p>}
                {customer.address && <p><span className="font-medium">Address:</span> {customer.address}</p>}
              </div>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Current Balance</h2>
              <div className={`text-4xl font-bold ${parseFloat(currentBalance) >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                {formatCurrency(currentBalance)}
              </div>
              <p className="text-sm text-gray-500 mt-2">
                {parseFloat(currentBalance) >= 0 ? 'Customer owes' : 'Customer credit'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      {summaryData && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
            <p className="text-sm text-gray-500 mb-1">Opening Balance</p>
            <p className="text-xl md:text-2xl font-bold text-gray-900 break-words overflow-hidden">
              {formatCurrency(summaryData.opening_balance || 0)}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
            <p className="text-sm text-gray-500 mb-1">Total Invoiced</p>
            <p className="text-xl md:text-2xl font-bold text-red-600 break-words overflow-hidden">
              {formatCurrency(summaryData.total_invoiced || 0)}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
            <p className="text-sm text-gray-500 mb-1">Total Paid</p>
            <p className="text-xl md:text-2xl font-bold text-green-600 break-words overflow-hidden">
              {formatCurrency(summaryData.total_paid || 0)}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
            <p className="text-sm text-gray-500 mb-1">Advance Balance</p>
            <p className="text-xl md:text-2xl font-bold text-blue-600 break-words overflow-hidden">
              {formatCurrency(summaryData.advance_balance || 0)}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
            <p className="text-sm text-gray-500 mb-1">Balance Due</p>
            <p className="text-xl md:text-2xl font-bold text-orange-600 break-words overflow-hidden">
              {formatCurrency(summaryData.balance_due || 0)}
            </p>
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
      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-visible">
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
          <div className="overflow-visible">
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
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
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
                        <div className="font-medium">
                          {entry.description || entry.transaction_type}
                          {entry.is_pending && (
                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                              Pending Approval
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500">{entry.transaction_type}</div>
                        {/* Status badges for INVOICE entries */}
                        {entry.transaction_type === 'INVOICE' && (entry.payment_status || entry.production_status) && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {entry.payment_status && (
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getPaymentStatusColor(entry.payment_status)}`}>
                                {entry.payment_status}
                              </span>
                            )}
                            {entry.production_status && (
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getProductionStatusColor(entry.production_status)}`}>
                                {formatProductionStatus(entry.production_status)}
                              </span>
                            )}
                          </div>
                        )}
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
                      <span className={`font-bold ${parseFloat(entry.running_balance) >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                        {formatCurrency(entry.running_balance)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {entry.branch?.name || '—'}
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-medium" onClick={(e) => e.stopPropagation()}>
                      {(entry.transaction_type === 'INVOICE' || entry.transaction_type === 'PENDING_APPROVAL') && entry.transaction_id && (
                        <SaleActionDropdown
                          sale={{
                            id: entry.transaction_id,
                            invoice_number: entry.description?.split(' ')[0] || entry.transaction_id,
                            payment_status: entry.is_pending ? 'pending' : 'unpaid',
                            production_status: 'na',
                            customer_id: id,
                            order_type: 'invoice'
                          }}
                          onView={() => {
                            setSelectedSaleId(entry.transaction_id);
                            setIsModalOpen(true);
                          }}
                          onDelete={() => handleDeleteSale(entry.transaction_id)}
                          onApproveSale={() => handleApproveSale(entry.transaction_id)}
                        />
                      )}
                      {entry.transaction_type === 'PAYMENT' && entry.transaction_id && (
                        <PaymentActionDropdown
                          paymentId={entry.transaction_id}
                          onDelete={() => handleDeletePayment(entry.transaction_id)}
                        />
                      )}
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

      {/* Sale Detail Modal */}
      <SaleDetailModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedSaleId(null);
        }}
        saleId={selectedSaleId}
      />
    </div>
  );
};

// Payment Action Dropdown Component
const PaymentActionDropdown = ({ paymentId, onDelete }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const { hasPermission } = useAuth();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleAction = (action) => {
    setIsOpen(false);
    action();
  };

  if (!hasPermission('payment_delete')) {
    return null;
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="p-1.5 hover:bg-gray-100 rounded-full text-gray-500 hover:text-gray-700 transition-colors"
      >
        <MoreVertical className="h-4 w-4" />
      </button>

      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-50 text-sm"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => handleAction(onDelete)}
            className="w-full text-left px-4 py-2 hover:bg-red-50 flex items-center gap-2 text-red-600"
          >
            <Trash2 className="h-4 w-4" /> Delete Payment
          </button>
        </div>
      )}
    </div>
  );
};

export default CustomerLedger;
