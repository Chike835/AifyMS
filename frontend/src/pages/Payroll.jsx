import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import ListToolbar from '../components/common/ListToolbar';
import ExportModal from '../components/import/ExportModal';
import { Wallet, Plus, Edit, Trash2, X, Calendar, Users, Calculator } from 'lucide-react';

const MONTHS = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
];

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 10 }, (_, i) => currentYear - i);

const Payroll = () => {
  const { hasPermission, user } = useAuth();
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [filterMonth, setFilterMonth] = useState('');
  const [filterYear, setFilterYear] = useState(currentYear.toString());
  const [formData, setFormData] = useState({
    user_id: '',
    month: new Date().getMonth() + 1,
    year: currentYear,
    gross_pay: '',
    deductions: '',
    notes: ''
  });
  const [formError, setFormError] = useState('');
  const [showCalculateModal, setShowCalculateModal] = useState(false);
  const [calculateData, setCalculateData] = useState({
    month: new Date().getMonth() + 1,
    year: currentYear,
    user_id: ''
  });
  const [calculateError, setCalculateError] = useState('');

  // Pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);

  // Column visibility
  const [visibleColumns, setVisibleColumns] = useState({
    employee: true,
    period: true,
    branch: true,
    gross_pay: true,
    deductions: true,
    net_pay: true
  });

  // Export modal
  const [showExportModal, setShowExportModal] = useState(false);

  // Fetch payroll records
  const { data, isLoading, error } = useQuery({
    queryKey: ['payroll', filterMonth, filterYear, page, limit],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filterMonth) params.append('month', filterMonth);
      if (filterYear) params.append('year', filterYear);
      params.append('page', page);
      params.append('limit', limit === -1 ? 10000 : limit);
      const response = await api.get(`/payroll?${params.toString()}`);
      return response.data;
    }
  });

  // Fetch employees for dropdown
  const { data: employeesData } = useQuery({
    queryKey: ['payrollEmployees'],
    queryFn: async () => {
      const response = await api.get('/payroll/employees');
      return response.data;
    }
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/payroll', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll'] });
      closeModal();
    },
    onError: (error) => {
      setFormError(error.response?.data?.error || 'Failed to create payroll record');
    }
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const response = await api.put(`/payroll/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll'] });
      closeModal();
    },
    onError: (error) => {
      setFormError(error.response?.data?.error || 'Failed to update payroll record');
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const response = await api.delete(`/payroll/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll'] });
    },
    onError: (error) => {
      alert(error.response?.data?.error || 'Failed to delete payroll record');
    }
  });

  // Calculate payroll mutation
  const calculateMutation = useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/payroll/calculate', data);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['payroll'] });
      setShowCalculateModal(false);
      setCalculateData({ month: new Date().getMonth() + 1, year: currentYear, user_id: '' });
      setCalculateError('');
      
      // Show success message with details
      const successMsg = data.errors && data.errors.length > 0
        ? `Calculated for ${data.results.length} employee(s). ${data.errors.length} error(s) occurred.`
        : `Successfully calculated payroll for ${data.results.length} employee(s).`;
      alert(successMsg);
    },
    onError: (error) => {
      setCalculateError(error.response?.data?.error || 'Failed to calculate payroll');
    }
  });

  const openCreateModal = () => {
    setSelectedRecord(null);
    setFormData({
      user_id: '',
      month: new Date().getMonth() + 1,
      year: currentYear,
      gross_pay: '',
      deductions: '',
      notes: ''
    });
    setFormError('');
    setShowModal(true);
  };

  const openEditModal = (record) => {
    setSelectedRecord(record);
    setFormData({
      user_id: record.user_id || '',
      month: record.month || new Date().getMonth() + 1,
      year: record.year || currentYear,
      gross_pay: record.gross_pay || '',
      deductions: record.deductions || '',
      notes: record.notes || ''
    });
    setFormError('');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedRecord(null);
    setFormData({
      user_id: '',
      month: new Date().getMonth() + 1,
      year: currentYear,
      gross_pay: '',
      deductions: '',
      notes: ''
    });
    setFormError('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.user_id) {
      setFormError('Please select an employee');
      return;
    }
    if (!formData.gross_pay || parseFloat(formData.gross_pay) < 0) {
      setFormError('Gross pay must be 0 or greater');
      return;
    }

    const grossPay = parseFloat(formData.gross_pay) || 0;
    const deductions = parseFloat(formData.deductions) || 0;

    if (deductions > grossPay) {
      setFormError('Deductions cannot exceed gross pay');
      return;
    }

    const submitData = {
      ...formData,
      gross_pay: grossPay,
      deductions: deductions,
      month: parseInt(formData.month),
      year: parseInt(formData.year)
    };

    if (selectedRecord) {
      updateMutation.mutate({ id: selectedRecord.id, data: submitData });
    } else {
      createMutation.mutate(submitData);
    }
  };

  const handleDelete = (record) => {
    const monthName = MONTHS.find(m => m.value === record.month)?.label || record.month;
    if (window.confirm(`Are you sure you want to delete payroll for ${record.employee?.full_name} (${monthName} ${record.year})?`)) {
      deleteMutation.mutate(record.id);
    }
  };

  const clearFilters = () => {
    setFilterMonth('');
    setFilterYear(currentYear.toString());
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN'
    }).format(amount || 0);
  };

  const getMonthName = (monthNum) => {
    return MONTHS.find(m => m.value === monthNum)?.label || monthNum;
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
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
        {error.response?.data?.error || error.message || 'Failed to load payroll records'}
      </div>
    );
  }

  const payrollRecords = data?.payroll_records || [];
  const employees = employeesData || [];
  const totals = data?.totals || {};

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Payroll</h1>
          <p className="text-gray-600 mt-2">Manage employee payroll records</p>
        </div>
        {hasPermission('payroll_manage') && (
          <div className="flex items-center space-x-3">
            <button
              onClick={() => {
                setShowCalculateModal(true);
                setCalculateError('');
                setCalculateData({
                  month: new Date().getMonth() + 1,
                  year: currentYear,
                  user_id: ''
                });
              }}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Calculator className="h-5 w-5" />
              <span>Auto-Calculate</span>
            </button>
            <button
              onClick={openCreateModal}
              className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              <Plus className="h-5 w-5" />
              <span>Add Payroll</span>
            </button>
          </div>
        )}
      </div>

      {/* Summary Cards */}
      {data?.totals && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
            <p className="text-sm text-gray-500">Total Gross Pay</p>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(totals.gross_pay)}</p>
          </div>
          <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
            <p className="text-sm text-gray-500">Total Deductions</p>
            <p className="text-2xl font-bold text-orange-600">{formatCurrency(totals.deductions)}</p>
          </div>
          <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
            <p className="text-sm text-gray-500">Total Net Pay</p>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(totals.net_pay)}</p>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <ListToolbar
        limit={limit}
        onLimitChange={(newLimit) => {
          setLimit(newLimit);
          setPage(1);
        }}
        visibleColumns={visibleColumns}
        onColumnVisibilityChange={setVisibleColumns}
        onExport={() => setShowExportModal(true)}
        showSearch={false}
      >
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-gray-400" />
          <select
            value={filterMonth}
            onChange={(e) => { setFilterMonth(e.target.value); setPage(1); }}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">All Months</option>
            {MONTHS.map((month) => (
              <option key={month.value} value={month.value}>{month.label}</option>
            ))}
          </select>
          <select
            value={filterYear}
            onChange={(e) => { setFilterYear(e.target.value); setPage(1); }}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            {YEARS.map((year) => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
      </ListToolbar>

      {/* Payroll Table */}
      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Employee
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Period
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Branch
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Gross Pay
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Deductions
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Net Pay
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {payrollRecords.length === 0 ? (
              <tr>
                <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                  <Wallet className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No payroll records found</p>
                  {(filterMonth || filterYear) && (
                    <p className="text-sm mt-1">Try adjusting your filters</p>
                  )}
                </td>
              </tr>
            ) : (
              payrollRecords.map((record) => (
                <tr key={record.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center mr-3">
                        <Users className="h-4 w-4 text-primary-600" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {record.employee?.full_name || 'Unknown'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {record.employee?.email || ''}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {getMonthName(record.month)} {record.year}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {record.branch?.name || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                    {formatCurrency(record.gross_pay)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-orange-600">
                    {formatCurrency(record.deductions)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <span className="text-sm font-medium text-green-600">
                      {formatCurrency(record.net_pay)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-2">
                      {hasPermission('payroll_manage') && (
                        <>
                          <button
                            onClick={() => openEditModal(record)}
                            className="text-orange-600 hover:text-orange-900"
                            title="Edit"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(record)}
                            className="text-red-600 hover:text-red-900"
                            title="Delete"
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination Info */}
        {data?.total_count > 0 && (
          <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
            <span className="text-sm text-gray-500">
              Showing {payrollRecords.length} of {data.total_count} records
            </span>
            {data.total_pages > 1 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-600">
                  Page {page} of {data.total_pages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(data.total_pages, p + 1))}
                  disabled={page >= data.total_pages}
                  className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Export Modal */}
      {showExportModal && (
        <ExportModal
          isOpen={showExportModal}
          onClose={() => setShowExportModal(false)}
          entity="payroll"
          title="Export Payroll"
        />
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                {selectedRecord ? 'Edit Payroll' : 'Add Payroll'}
              </h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                <X className="h-6 w-6" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Employee *
                </label>
                <select
                  required
                  value={formData.user_id}
                  onChange={(e) => setFormData({ ...formData, user_id: e.target.value })}
                  disabled={!!selectedRecord}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-100"
                >
                  <option value="">Select Employee</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.full_name} {emp.branch ? `(${emp.branch.name})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Month *
                  </label>
                  <select
                    required
                    value={formData.month}
                    onChange={(e) => setFormData({ ...formData, month: parseInt(e.target.value) })}
                    disabled={!!selectedRecord}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-100"
                  >
                    {MONTHS.map((month) => (
                      <option key={month.value} value={month.value}>{month.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Year *
                  </label>
                  <select
                    required
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                    disabled={!!selectedRecord}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-100"
                  >
                    {YEARS.map((year) => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Gross Pay *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={formData.gross_pay}
                  onChange={(e) => setFormData({ ...formData, gross_pay: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Deductions
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.deductions}
                  onChange={(e) => setFormData({ ...formData, deductions: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="0.00"
                />
              </div>

              {/* Net Pay Preview */}
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-sm text-gray-600">Net Pay</p>
                <p className="text-xl font-bold text-green-600">
                  {formatCurrency((parseFloat(formData.gross_pay) || 0) - (parseFloat(formData.deductions) || 0))}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Optional notes..."
                />
              </div>

              <div className="flex space-x-4 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? 'Saving...'
                    : selectedRecord
                    ? 'Update'
                    : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Calculate Payroll Modal */}
      {showCalculateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                Auto-Calculate Payroll
              </h2>
              <button 
                onClick={() => {
                  setShowCalculateModal(false);
                  setCalculateError('');
                  setCalculateData({ month: new Date().getMonth() + 1, year: currentYear, user_id: '' });
                }} 
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {calculateError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {calculateError}
              </div>
            )}

            <form onSubmit={(e) => {
              e.preventDefault();
              setCalculateError('');
              
              const submitData = {
                month: parseInt(calculateData.month),
                year: parseInt(calculateData.year)
              };
              
              if (calculateData.user_id) {
                submitData.user_id = calculateData.user_id;
              }
              
              calculateMutation.mutate(submitData);
            }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Employee (Optional)
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  Leave empty to calculate for all employees
                </p>
                <select
                  value={calculateData.user_id}
                  onChange={(e) => setCalculateData({ ...calculateData, user_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">All Employees</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.full_name} {emp.branch ? `(${emp.branch.name})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Month *
                  </label>
                  <select
                    required
                    value={calculateData.month}
                    onChange={(e) => setCalculateData({ ...calculateData, month: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    {MONTHS.map((month) => (
                      <option key={month.value} value={month.value}>{month.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Year *
                  </label>
                  <select
                    required
                    value={calculateData.year}
                    onChange={(e) => setCalculateData({ ...calculateData, year: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    {YEARS.map((year) => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
                <p className="font-medium mb-1">How it works:</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>Base salary (currently defaults to 0)</li>
                  <li>+ Paid agent commissions for the selected month/year</li>
                  <li>= Gross pay (auto-updates existing records or creates new ones)</li>
                </ul>
              </div>

              <div className="flex space-x-4 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCalculateModal(false);
                    setCalculateError('');
                    setCalculateData({ month: new Date().getMonth() + 1, year: currentYear, user_id: '' });
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={calculateMutation.isPending}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {calculateMutation.isPending ? 'Calculating...' : 'Calculate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Payroll;

