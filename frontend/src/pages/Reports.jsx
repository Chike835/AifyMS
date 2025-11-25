import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { 
  BarChart3, 
  TrendingUp, 
  DollarSign, 
  Package, 
  Users, 
  ShoppingBag,
  FileText,
  Download,
  Calendar,
  Building2
} from 'lucide-react';

const Reports = () => {
  const { user, hasPermission } = useAuth();
  const [activeTab, setActiveTab] = useState('sales');
  const [startDate, setStartDate] = useState(new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
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

  // Sales Summary Report
  const { data: salesData, isLoading: salesLoading } = useQuery({
    queryKey: ['salesReport', startDate, endDate, selectedBranch],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      if (selectedBranch) params.append('branch_id', selectedBranch);
      const response = await api.get(`/reports/sales?${params.toString()}`);
      return response.data;
    },
    enabled: activeTab === 'sales' && hasPermission('report_view_sales')
  });

  // Purchase Summary Report
  const { data: purchaseData, isLoading: purchaseLoading } = useQuery({
    queryKey: ['purchaseReport', startDate, endDate, selectedBranch],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      if (selectedBranch) params.append('branch_id', selectedBranch);
      const response = await api.get(`/reports/purchases?${params.toString()}`);
      return response.data;
    },
    enabled: activeTab === 'purchases' && hasPermission('report_view_sales')
  });

  // Inventory Value Report
  const { data: inventoryData, isLoading: inventoryLoading } = useQuery({
    queryKey: ['inventoryReport', selectedBranch],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedBranch) params.append('branch_id', selectedBranch);
      const response = await api.get(`/reports/inventory?${params.toString()}`);
      return response.data;
    },
    enabled: activeTab === 'inventory' && hasPermission('report_view_stock_value')
  });

  // Expense Summary Report
  const { data: expenseData, isLoading: expenseLoading } = useQuery({
    queryKey: ['expenseReport', startDate, endDate, selectedBranch],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      if (selectedBranch) params.append('branch_id', selectedBranch);
      const response = await api.get(`/reports/expenses?${params.toString()}`);
      return response.data;
    },
    enabled: activeTab === 'expenses' && hasPermission('report_view_financial')
  });

  // Customer Summary Report
  const { data: customerData, isLoading: customerLoading } = useQuery({
    queryKey: ['customerReport', startDate, endDate, selectedBranch],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      if (selectedBranch) params.append('branch_id', selectedBranch);
      const response = await api.get(`/reports/customers?${params.toString()}`);
      return response.data;
    },
    enabled: activeTab === 'customers' && hasPermission('report_view_sales')
  });

  // Payment Summary Report
  const { data: paymentData, isLoading: paymentLoading } = useQuery({
    queryKey: ['paymentReport', startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      const response = await api.get(`/reports/payments?${params.toString()}`);
      return response.data;
    },
    enabled: activeTab === 'payments' && hasPermission('report_view_financial')
  });

  // Profit & Loss Report
  const { data: profitLossData, isLoading: profitLossLoading } = useQuery({
    queryKey: ['profitLossReport', startDate, endDate, selectedBranch],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      if (selectedBranch) params.append('branch_id', selectedBranch);
      const response = await api.get(`/reports/profit-loss?${params.toString()}`);
      return response.data;
    },
    enabled: activeTab === 'profit-loss' && hasPermission('report_view_financial')
  });

  // Balance Sheet Report
  const { data: balanceSheetData, isLoading: balanceSheetLoading } = useQuery({
    queryKey: ['balanceSheetReport', asOfDate, selectedBranch],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (asOfDate) params.append('as_of_date', asOfDate);
      if (selectedBranch) params.append('branch_id', selectedBranch);
      const response = await api.get(`/reports/balance-sheet?${params.toString()}`);
      return response.data;
    },
    enabled: activeTab === 'balance-sheet' && hasPermission('report_view_financial')
  });

  // Trial Balance Report
  const { data: trialBalanceData, isLoading: trialBalanceLoading } = useQuery({
    queryKey: ['trialBalanceReport', asOfDate, selectedBranch],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (asOfDate) params.append('as_of_date', asOfDate);
      if (selectedBranch) params.append('branch_id', selectedBranch);
      const response = await api.get(`/reports/trial-balance?${params.toString()}`);
      return response.data;
    },
    enabled: activeTab === 'trial-balance' && hasPermission('report_view_financial')
  });

  // Cash Flow Report
  const { data: cashFlowData, isLoading: cashFlowLoading } = useQuery({
    queryKey: ['cashFlowReport', startDate, endDate, selectedBranch],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      if (selectedBranch) params.append('branch_id', selectedBranch);
      const response = await api.get(`/reports/cash-flow?${params.toString()}`);
      return response.data;
    },
    enabled: activeTab === 'cash-flow' && hasPermission('report_view_financial')
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
      day: 'numeric'
    });
  };

  const tabs = [
    { id: 'sales', name: 'Sales', icon: TrendingUp, permission: 'report_view_sales' },
    { id: 'purchases', name: 'Purchases', icon: ShoppingBag, permission: 'report_view_sales' },
    { id: 'inventory', name: 'Inventory', icon: Package, permission: 'report_view_stock_value' },
    { id: 'expenses', name: 'Expenses', icon: DollarSign, permission: 'report_view_financial' },
    { id: 'customers', name: 'Customers', icon: Users, permission: 'report_view_sales' },
    { id: 'payments', name: 'Payments', icon: DollarSign, permission: 'report_view_financial' },
    { id: 'profit-loss', name: 'Profit & Loss', icon: BarChart3, permission: 'report_view_financial' },
    { id: 'balance-sheet', name: 'Balance Sheet', icon: FileText, permission: 'report_view_financial' },
    { id: 'trial-balance', name: 'Trial Balance', icon: FileText, permission: 'report_view_financial' },
    { id: 'cash-flow', name: 'Cash Flow', icon: FileText, permission: 'report_view_financial' }
  ];

  const visibleTabs = tabs.filter(tab => !tab.permission || hasPermission(tab.permission));

  const handleExport = async (type) => {
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      if (selectedBranch) params.append('branch_id', selectedBranch);
      
      // In a real implementation, this would generate and download a PDF/Excel file
      // For now, we'll just show an alert
      alert(`Export ${type} report functionality will be implemented with PDF/Excel generation service.`);
    } catch (error) {
      console.error('Export error:', error);
    }
  };

  const renderSalesReport = () => {
    if (salesLoading) return <div className="text-center py-12">Loading sales report...</div>;
    if (!salesData) return <div className="text-center py-12 text-gray-500">No data available</div>;

    const { summary, top_products, daily_trend } = salesData;

    return (
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600">Total Sales</div>
            <div className="text-2xl font-bold text-primary-600">{formatCurrency(summary?.total_sales)}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600">Sales Count</div>
            <div className="text-2xl font-bold">{summary?.sales_count || 0}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600">Paid</div>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(summary?.paid)}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600">Unpaid</div>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(summary?.unpaid)}</div>
          </div>
        </div>

        {/* Top Products */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b flex justify-between items-center">
            <h3 className="text-lg font-semibold">Top Selling Products</h3>
            <button
              onClick={() => handleExport('sales')}
              className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700"
            >
              <Download className="h-4 w-4" />
              <span>Export</span>
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Product</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Quantity</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {top_products?.slice(0, 10).map((item, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">{item.product?.name || 'N/A'}</td>
                    <td className="px-4 py-3 text-sm text-right">{item.total_quantity?.toFixed(2) || 0}</td>
                    <td className="px-4 py-3 text-sm text-right font-medium">{formatCurrency(item.total_revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Daily Trend */}
        {daily_trend && daily_trend.length > 0 && (
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-lg font-semibold mb-4">Daily Sales Trend</h3>
            <div className="space-y-2">
              {daily_trend.map((day, idx) => (
                <div key={idx} className="flex items-center space-x-4">
                  <div className="w-24 text-sm text-gray-600">{formatDate(day.date)}</div>
                  <div className="flex-1 bg-gray-200 rounded-full h-6 relative">
                    <div
                      className="bg-primary-600 h-6 rounded-full flex items-center justify-end pr-2"
                      style={{ width: `${Math.min((day.amount / summary?.total_sales) * 100, 100)}%` }}
                    >
                      <span className="text-xs text-white font-medium">{formatCurrency(day.amount)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderPurchaseReport = () => {
    if (purchaseLoading) return <div className="text-center py-12">Loading purchase report...</div>;
    if (!purchaseData) return <div className="text-center py-12 text-gray-500">No data available</div>;

    const { summary, top_suppliers, by_status } = purchaseData;

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600">Total Purchases</div>
            <div className="text-2xl font-bold text-primary-600">{formatCurrency(summary?.total_purchases)}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600">Purchase Count</div>
            <div className="text-2xl font-bold">{summary?.purchase_count || 0}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600">Avg Order Value</div>
            <div className="text-2xl font-bold">{formatCurrency(summary?.average_order_value)}</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b flex justify-between items-center">
            <h3 className="text-lg font-semibold">Top Suppliers</h3>
            <button
              onClick={() => handleExport('purchases')}
              className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700"
            >
              <Download className="h-4 w-4" />
              <span>Export</span>
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Supplier</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Total Amount</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Order Count</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {top_suppliers?.slice(0, 10).map((item, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">{item.supplier?.name || 'N/A'}</td>
                    <td className="px-4 py-3 text-sm text-right font-medium">{formatCurrency(item.total_amount)}</td>
                    <td className="px-4 py-3 text-sm text-right">{item.order_count || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderInventoryReport = () => {
    if (inventoryLoading) return <div className="text-center py-12">Loading inventory report...</div>;
    if (!inventoryData) return <div className="text-center py-12 text-gray-500">No data available</div>;

    const { summary, by_product } = inventoryData;

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600">Total Cost Value</div>
            <div className="text-2xl font-bold text-primary-600">{formatCurrency(summary?.total_cost_value)}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600">Total Sale Value</div>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(summary?.total_sale_value)}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600">Potential Profit</div>
            <div className="text-2xl font-bold text-blue-600">{formatCurrency(summary?.potential_profit)}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600">Total Instances</div>
            <div className="text-2xl font-bold">{summary?.total_instances || 0}</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b flex justify-between items-center">
            <h3 className="text-lg font-semibold">Inventory by Product</h3>
            <button
              onClick={() => handleExport('inventory')}
              className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700"
            >
              <Download className="h-4 w-4" />
              <span>Export</span>
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Product</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Quantity</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Cost Value</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Sale Value</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Instances</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {by_product?.slice(0, 20).map((item, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">{item.product?.name || 'N/A'}</td>
                    <td className="px-4 py-3 text-sm text-right">{item.total_quantity?.toFixed(2) || 0}</td>
                    <td className="px-4 py-3 text-sm text-right">{formatCurrency(item.cost_value)}</td>
                    <td className="px-4 py-3 text-sm text-right">{formatCurrency(item.sale_value)}</td>
                    <td className="px-4 py-3 text-sm text-right">{item.instance_count || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderExpenseReport = () => {
    if (expenseLoading) return <div className="text-center py-12">Loading expense report...</div>;
    if (!expenseData) return <div className="text-center py-12 text-gray-500">No data available</div>;

    const { summary, by_category, daily_trend } = expenseData;

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600">Total Expenses</div>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(summary?.total_expenses)}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600">Expense Count</div>
            <div className="text-2xl font-bold">{summary?.expense_count || 0}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600">Average Expense</div>
            <div className="text-2xl font-bold">{formatCurrency(summary?.average_expense)}</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b flex justify-between items-center">
            <h3 className="text-lg font-semibold">Expenses by Category</h3>
            <button
              onClick={() => handleExport('expenses')}
              className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700"
            >
              <Download className="h-4 w-4" />
              <span>Export</span>
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Category</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Total Amount</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Count</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {by_category?.map((item, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">{item.category?.name || 'N/A'}</td>
                    <td className="px-4 py-3 text-sm text-right font-medium">{formatCurrency(item.total_amount)}</td>
                    <td className="px-4 py-3 text-sm text-right">{item.count || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderCustomerReport = () => {
    if (customerLoading) return <div className="text-center py-12">Loading customer report...</div>;
    if (!customerData) return <div className="text-center py-12 text-gray-500">No data available</div>;

    const { top_customers, outstanding } = customerData;

    return (
      <div className="space-y-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600 mb-2">Total Outstanding Balance</div>
          <div className="text-3xl font-bold text-red-600">{formatCurrency(outstanding?.total)}</div>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b flex justify-between items-center">
            <h3 className="text-lg font-semibold">Top Customers</h3>
            <button
              onClick={() => handleExport('customers')}
              className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700"
            >
              <Download className="h-4 w-4" />
              <span>Export</span>
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Customer</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Phone</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Total Revenue</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Order Count</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {top_customers?.slice(0, 20).map((item, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">{item.customer?.name || 'N/A'}</td>
                    <td className="px-4 py-3 text-sm">{item.customer?.phone || '—'}</td>
                    <td className="px-4 py-3 text-sm text-right font-medium">{formatCurrency(item.total_revenue)}</td>
                    <td className="px-4 py-3 text-sm text-right">{item.order_count || 0}</td>
                    <td className="px-4 py-3 text-sm text-right">{formatCurrency(item.customer?.ledger_balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderPaymentReport = () => {
    if (paymentLoading) return <div className="text-center py-12">Loading payment report...</div>;
    if (!paymentData) return <div className="text-center py-12 text-gray-500">No data available</div>;

    const { summary, by_method, daily_trend } = paymentData;

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600">Confirmed</div>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(summary?.confirmed)}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600">Pending</div>
            <div className="text-2xl font-bold text-yellow-600">{formatCurrency(summary?.pending)}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600">Total</div>
            <div className="text-2xl font-bold text-primary-600">{formatCurrency(summary?.total)}</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b flex justify-between items-center">
            <h3 className="text-lg font-semibold">Payments by Method</h3>
            <button
              onClick={() => handleExport('payments')}
              className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700"
            >
              <Download className="h-4 w-4" />
              <span>Export</span>
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Method</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Total Amount</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Count</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {by_method?.map((item, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm capitalize">{item.method || 'N/A'}</td>
                    <td className="px-4 py-3 text-sm text-right font-medium">{formatCurrency(item.total_amount)}</td>
                    <td className="px-4 py-3 text-sm text-right">{item.count || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderProfitLossReport = () => {
    if (profitLossLoading) return <div className="text-center py-12">Loading profit & loss report...</div>;
    if (!profitLossData) return <div className="text-center py-12 text-gray-500">No data available</div>;

    const { revenue, cost_of_goods_sold, gross_profit, gross_margin, operating_expenses, net_profit, net_margin } = profitLossData;

    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="p-4 border-b flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Profit & Loss Statement</h3>
            <button
              onClick={() => handleExport('profit-loss')}
              className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700"
            >
              <Download className="h-4 w-4" />
              <span>Export</span>
            </button>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-gray-700 font-medium">Revenue</span>
              <span className="text-lg font-bold text-primary-600">{formatCurrency(revenue)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-gray-700">Cost of Goods Sold</span>
              <span className="text-gray-900">{formatCurrency(cost_of_goods_sold)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b-2 border-gray-300">
              <span className="text-gray-700 font-medium">Gross Profit</span>
              <span className="text-lg font-bold text-green-600">{formatCurrency(gross_profit)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-gray-700">Gross Margin</span>
              <span className="text-gray-900">{gross_margin?.toFixed(2)}%</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-gray-700">Operating Expenses</span>
              <span className="text-gray-900">{formatCurrency(operating_expenses)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b-2 border-gray-300">
              <span className="text-gray-700 font-medium">Net Profit</span>
              <span className={`text-lg font-bold ${net_profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(net_profit)}
              </span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-700">Net Margin</span>
              <span className={`font-medium ${net_margin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {net_margin?.toFixed(2)}%
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderBalanceSheet = () => {
    if (balanceSheetLoading) return <div className="text-center py-12">Loading balance sheet...</div>;
    if (!balanceSheetData) return <div className="text-center py-12 text-gray-500">No data available</div>;

    const { assets, liabilities, equity, total_liabilities_and_equity } = balanceSheetData;

    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold">Balance Sheet</h3>
            <p className="text-sm text-gray-600">As of {formatDate(balanceSheetData.as_of_date)}</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Assets */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">ASSETS</h4>
              <div className="space-y-2">
                <div className="pl-4">
                  <div className="font-medium text-gray-700 mb-2">Current Assets</div>
                  <div className="pl-4 space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Cash</span>
                      <span>{formatCurrency(assets.current_assets.cash)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Bank</span>
                      <span>{formatCurrency(assets.current_assets.bank)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Accounts Receivable</span>
                      <span>{formatCurrency(assets.current_assets.accounts_receivable)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Inventory</span>
                      <span>{formatCurrency(assets.current_assets.inventory)}</span>
                    </div>
                    <div className="flex justify-between font-semibold border-t pt-1 mt-1">
                      <span>Total Current Assets</span>
                      <span>{formatCurrency(assets.current_assets.total)}</span>
                    </div>
                  </div>
                </div>
                <div className="pl-4">
                  <div className="flex justify-between font-medium">
                    <span>Fixed Assets</span>
                    <span>{formatCurrency(assets.fixed_assets)}</span>
                  </div>
                </div>
                <div className="flex justify-between font-bold text-lg border-t pt-2 mt-2">
                  <span>Total Assets</span>
                  <span>{formatCurrency(assets.total)}</span>
                </div>
              </div>
            </div>

            {/* Liabilities & Equity */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">LIABILITIES & EQUITY</h4>
              <div className="space-y-2">
                <div className="pl-4">
                  <div className="font-medium text-gray-700 mb-2">Current Liabilities</div>
                  <div className="pl-4 space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Accounts Payable</span>
                      <span>{formatCurrency(liabilities.current_liabilities.accounts_payable)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Supplier Balances</span>
                      <span>{formatCurrency(liabilities.current_liabilities.supplier_balances)}</span>
                    </div>
                    <div className="flex justify-between font-semibold border-t pt-1 mt-1">
                      <span>Total Liabilities</span>
                      <span>{formatCurrency(liabilities.total)}</span>
                    </div>
                  </div>
                </div>
                <div className="pl-4">
                  <div className="font-medium text-gray-700 mb-2">Equity</div>
                  <div className="pl-4 space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Retained Earnings</span>
                      <span>{formatCurrency(equity.retained_earnings)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Capital</span>
                      <span>{formatCurrency(equity.capital)}</span>
                    </div>
                    <div className="flex justify-between font-semibold border-t pt-1 mt-1">
                      <span>Total Equity</span>
                      <span>{formatCurrency(equity.total)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex justify-between font-bold text-lg border-t pt-2 mt-2">
                  <span>Total Liabilities & Equity</span>
                  <span>{formatCurrency(total_liabilities_and_equity)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderTrialBalance = () => {
    if (trialBalanceLoading) return <div className="text-center py-12">Loading trial balance...</div>;
    if (!trialBalanceData) return <div className="text-center py-12 text-gray-500">No data available</div>;

    const { debits, credits, total_debits, total_credits, difference } = trialBalanceData;

    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold">Trial Balance</h3>
            <p className="text-sm text-gray-600">As of {formatDate(trialBalanceData.as_of_date)}</p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Account</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Debit</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Credit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {debits.map((item, idx) => (
                  <tr key={`debit-${idx}`} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">{item.account}</td>
                    <td className="px-4 py-3 text-sm text-right font-medium">{formatCurrency(item.amount)}</td>
                    <td className="px-4 py-3 text-sm text-right">—</td>
                  </tr>
                ))}
                {credits.map((item, idx) => (
                  <tr key={`credit-${idx}`} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">{item.account}</td>
                    <td className="px-4 py-3 text-sm text-right">—</td>
                    <td className="px-4 py-3 text-sm text-right font-medium">{formatCurrency(item.amount)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50">
                <tr className="font-semibold">
                  <td className="px-4 py-3 text-sm">Total</td>
                  <td className="px-4 py-3 text-sm text-right">{formatCurrency(total_debits)}</td>
                  <td className="px-4 py-3 text-sm text-right">{formatCurrency(total_credits)}</td>
                </tr>
                {Math.abs(difference) > 0.01 && (
                  <tr className="bg-yellow-50">
                    <td className="px-4 py-3 text-sm font-medium text-yellow-800">Difference</td>
                    <td colSpan="2" className="px-4 py-3 text-sm text-right font-medium text-yellow-800">
                      {formatCurrency(difference)}
                    </td>
                  </tr>
                )}
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderCashFlow = () => {
    if (cashFlowLoading) return <div className="text-center py-12">Loading cash flow statement...</div>;
    if (!cashFlowData) return <div className="text-center py-12 text-gray-500">No data available</div>;

    const { operating_activities, investing_activities, financing_activities, net_increase_in_cash } = cashFlowData;

    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold">Cash Flow Statement</h3>
            <p className="text-sm text-gray-600">
              {formatDate(startDate)} to {formatDate(endDate)}
            </p>
          </div>
          
          <div className="space-y-6">
            {/* Operating Activities */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">Operating Activities</h4>
              <div className="pl-4 space-y-2">
                <div className="flex justify-between">
                  <span>Cash from Sales</span>
                  <span>{formatCurrency(operating_activities?.cash_from_sales || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Cash from Transfers</span>
                  <span>{formatCurrency(operating_activities?.cash_from_transfers || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Cash Paid for Purchases</span>
                  <span className="text-red-600">({formatCurrency(Math.abs(operating_activities?.cash_paid_purchases || 0))})</span>
                </div>
                <div className="flex justify-between">
                  <span>Cash Paid for Expenses</span>
                  <span className="text-red-600">({formatCurrency(Math.abs(operating_activities?.cash_paid_expenses || 0))})</span>
                </div>
                <div className="flex justify-between font-semibold border-t pt-2 mt-2">
                  <span>Net Cash from Operating</span>
                  <span>{formatCurrency(operating_activities?.net_cash_flow || 0)}</span>
                </div>
              </div>
            </div>

            {/* Investing Activities */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">Investing Activities</h4>
              <div className="pl-4 space-y-2">
                <div className="flex justify-between">
                  <span>Net Cash from Investing</span>
                  <span>{formatCurrency(investing_activities?.net_cash_flow || 0)}</span>
                </div>
              </div>
            </div>

            {/* Financing Activities */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">Financing Activities</h4>
              <div className="pl-4 space-y-2">
                <div className="flex justify-between">
                  <span>Net Cash from Financing</span>
                  <span>{formatCurrency(financing_activities?.net_cash_flow || 0)}</span>
                </div>
              </div>
            </div>

            {/* Net Cash Flow */}
            <div className="flex justify-between font-bold text-lg border-t-2 pt-4 mt-4">
              <span>Net Increase (Decrease) in Cash</span>
              <span>{formatCurrency(net_increase_in_cash || 0)}</span>
                </div>
          </div>
        </div>
      </div>
    );
  };

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'sales':
        return renderSalesReport();
      case 'purchases':
        return renderPurchaseReport();
      case 'inventory':
        return renderInventoryReport();
      case 'expenses':
        return renderExpenseReport();
      case 'customers':
        return renderCustomerReport();
      case 'payments':
        return renderPaymentReport();
      case 'profit-loss':
        return renderProfitLossReport();
      case 'balance-sheet':
        return renderBalanceSheet();
      case 'trial-balance':
        return renderTrialBalance();
      case 'cash-flow':
        return renderCashFlow();
      default:
        return <div className="text-center py-12 text-gray-500">Select a report type</div>;
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Reports</h1>
        <p className="text-gray-600">View and analyze your business data</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {(activeTab === 'balance-sheet' || activeTab === 'trial-balance') ? (
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
          ) : (
            <>
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
            </>
          )}
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

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            {visibleTabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`${
                    activeTab === tab.id
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
                >
                  <Icon className="h-5 w-5" />
                  <span>{tab.name}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Report Content */}
      <div>{renderActiveTab()}</div>
    </div>
  );
};

export default Reports;


