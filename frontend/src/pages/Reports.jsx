import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import DateFilterDropdown from '../components/common/DateFilterDropdown';
import RevenueChart from '../components/reports/RevenueChart';
import ExpenseChart from '../components/reports/ExpenseChart';
import ProfitChart from '../components/reports/ProfitChart';
import { printReport, exportToPDF, exportToExcel, generateFilename } from '../utils/exportUtils';
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
  Building2,
  Printer,
  FileDown,
  Activity
} from 'lucide-react';

const Reports = () => {
  const { user, hasPermission } = useAuth();
  const [activeTab, setActiveTab] = useState('sales');
  const [startDate, setStartDate] = useState(new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedBranch, setSelectedBranch] = useState('');

  const handleDateChange = (dateRange) => {
    if (dateRange.startDate) setStartDate(dateRange.startDate);
    if (dateRange.endDate) setEndDate(dateRange.endDate);
  };

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

  // Stock Adjustment Report
  const { data: stockAdjustmentData, isLoading: stockAdjustmentLoading } = useQuery({
    queryKey: ['stockAdjustmentReport', startDate, endDate, selectedBranch],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      if (selectedBranch) params.append('branch_id', selectedBranch);
      const response = await api.get(`/reports/stock-adjustment?${params.toString()}`);
      return response.data;
    },
    enabled: activeTab === 'stock-adjustment' && hasPermission('report_view_stock_value')
  });

  // Trending Products Report
  const { data: trendingProductsData, isLoading: trendingProductsLoading } = useQuery({
    queryKey: ['trendingProductsReport', startDate, endDate, selectedBranch],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      if (selectedBranch) params.append('branch_id', selectedBranch);
      const response = await api.get(`/reports/trending-products?${params.toString()}`);
      return response.data;
    },
    enabled: activeTab === 'trending-products' && hasPermission('report_view_sales')
  });

  // Items Report
  const { data: itemsData, isLoading: itemsLoading } = useQuery({
    queryKey: ['itemsReport', startDate, endDate, selectedBranch],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      if (selectedBranch) params.append('branch_id', selectedBranch);
      const response = await api.get(`/reports/items?${params.toString()}`);
      return response.data;
    },
    enabled: activeTab === 'items' && hasPermission('report_view_sales')
  });

  // Product Purchase Report
  const { data: productPurchaseData, isLoading: productPurchaseLoading } = useQuery({
    queryKey: ['productPurchaseReport', startDate, endDate, selectedBranch],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      if (selectedBranch) params.append('branch_id', selectedBranch);
      const response = await api.get(`/reports/product-purchase?${params.toString()}`);
      return response.data;
    },
    enabled: activeTab === 'product-purchase' && hasPermission('report_view_sales')
  });

  // Product Sell Report
  const { data: productSellData, isLoading: productSellLoading } = useQuery({
    queryKey: ['productSellReport', startDate, endDate, selectedBranch],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      if (selectedBranch) params.append('branch_id', selectedBranch);
      const response = await api.get(`/reports/product-sell?${params.toString()}`);
      return response.data;
    },
    enabled: activeTab === 'product-sell' && hasPermission('report_view_sales')
  });

  // Purchase Payment Report
  const { data: purchasePaymentData, isLoading: purchasePaymentLoading } = useQuery({
    queryKey: ['purchasePaymentReport', startDate, endDate, selectedBranch],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      if (selectedBranch) params.append('branch_id', selectedBranch);
      const response = await api.get(`/reports/purchase-payment?${params.toString()}`);
      return response.data;
    },
    enabled: activeTab === 'purchase-payment' && hasPermission('report_view_financial')
  });

  // Sell Payment Report
  const { data: sellPaymentData, isLoading: sellPaymentLoading } = useQuery({
    queryKey: ['sellPaymentReport', startDate, endDate, selectedBranch],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      if (selectedBranch) params.append('branch_id', selectedBranch);
      const response = await api.get(`/reports/sell-payment?${params.toString()}`);
      return response.data;
    },
    enabled: activeTab === 'sell-payment' && hasPermission('report_view_financial')
  });

  // Tax Report
  const { data: taxData, isLoading: taxLoading } = useQuery({
    queryKey: ['taxReport', startDate, endDate, selectedBranch],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      if (selectedBranch) params.append('branch_id', selectedBranch);
      const response = await api.get(`/reports/tax?${params.toString()}`);
      return response.data;
    },
    enabled: activeTab === 'tax' && hasPermission('report_view_financial')
  });

  // Sales Representative Report
  const { data: salesRepresentativeData, isLoading: salesRepresentativeLoading } = useQuery({
    queryKey: ['salesRepresentativeReport', startDate, endDate, selectedBranch],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      if (selectedBranch) params.append('branch_id', selectedBranch);
      const response = await api.get(`/reports/sales-representative?${params.toString()}`);
      return response.data;
    },
    enabled: activeTab === 'sales-representative' && hasPermission('report_view_sales')
  });

  // Customer Groups Report
  const { data: customerGroupsData, isLoading: customerGroupsLoading } = useQuery({
    queryKey: ['customerGroupsReport', startDate, endDate, selectedBranch],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      if (selectedBranch) params.append('branch_id', selectedBranch);
      const response = await api.get(`/reports/customer-groups?${params.toString()}`);
      return response.data;
    },
    enabled: activeTab === 'customer-groups' && hasPermission('report_view_sales')
  });

  // Register Report
  const { data: registerData, isLoading: registerLoading } = useQuery({
    queryKey: ['registerReport', startDate, endDate, selectedBranch],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      const response = await api.get(`/reports/register?${params.toString()}`);
      return response.data;
    },
    enabled: activeTab === 'register' && hasPermission('report_view_register')
  });

  // Activity Log filters
  const [activityLogActionType, setActivityLogActionType] = useState('');
  const [activityLogModule, setActivityLogModule] = useState('');

  // Activity Log Report
  const { data: activityLogData, isLoading: activityLogLoading } = useQuery({
    queryKey: ['activityLogReport', startDate, endDate, selectedBranch, activityLogActionType, activityLogModule],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      if (selectedBranch) params.append('branch_id', selectedBranch);
      if (activityLogActionType) params.append('action_type', activityLogActionType);
      if (activityLogModule) params.append('module', activityLogModule);
      const response = await api.get(`/reports/activity-log?${params.toString()}`);
      return response.data;
    },
    enabled: activeTab === 'activity-log' && hasPermission('report_view_sales')
  });

  // Batch Operations Report
  const { data: batchOperationsData, isLoading: batchOperationsLoading } = useQuery({
    queryKey: ['batchOperationsReport', startDate, endDate, selectedBranch],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      if (selectedBranch) params.append('branch_id', selectedBranch);
      const response = await api.get(`/reports/batch-operations?${params.toString()}`);
      return response.data;
    },
    enabled: activeTab === 'batch-operations' && hasPermission('report_view_stock_value')
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
    { id: 'cash-flow', name: 'Cash Flow', icon: FileText, permission: 'report_view_financial' },
    { id: 'tax', name: 'Tax Report', icon: FileText, permission: 'report_view_financial' },
    { id: 'supplier-customer', name: 'Supplier & Customer', icon: Users, permission: 'report_view_sales' },
    { id: 'customer-groups', name: 'Customer Groups', icon: Users, permission: 'report_view_sales' },
    { id: 'stock-adjustment', name: 'Stock Adjustment', icon: Package, permission: 'report_view_stock_value' },
    { id: 'trending-products', name: 'Trending Products', icon: TrendingUp, permission: 'report_view_sales' },
    { id: 'items', name: 'Items Report', icon: Package, permission: 'report_view_sales' },
    { id: 'product-purchase', name: 'Product Purchase', icon: ShoppingBag, permission: 'report_view_sales' },
    { id: 'product-sell', name: 'Product Sell', icon: TrendingUp, permission: 'report_view_sales' },
    { id: 'purchase-payment', name: 'Purchase Payment', icon: DollarSign, permission: 'report_view_financial' },
    { id: 'sell-payment', name: 'Sell Payment', icon: DollarSign, permission: 'report_view_financial' },
    { id: 'register', name: 'Register Report', icon: FileText, permission: 'report_view_register' },
    { id: 'sales-representative', name: 'Sales Representative', icon: Users, permission: 'report_view_sales' },
    { id: 'activity-log', name: 'Activity Log', icon: FileText, permission: 'report_view_sales' },
    { id: 'batch-operations', name: 'Batch Operations', icon: Activity, permission: 'report_view_stock_value' }
  ];

  const visibleTabs = tabs.filter(tab => !tab.permission || hasPermission(tab.permission));

  const handlePrint = () => {
    printReport();
  };

  const handleExportPDF = () => {
    const filename = generateFilename(`${activeTab}-report`, startDate, endDate, 'pdf');
    exportToPDF('report-content', filename);
  };

  const handleExportExcel = () => {
    // Get current report data and convert to array
    const reportElement = document.getElementById('report-content');
    if (!reportElement) {
      alert('Report content not found.');
      return;
    }

    // Try to extract table data
    const tables = reportElement.querySelectorAll('table');
    if (tables.length > 0) {
      const table = tables[0];
      const rows = Array.from(table.querySelectorAll('tr'));
      const data = rows.map(row => {
        const cells = Array.from(row.querySelectorAll('th, td'));
        const rowData = {};
        cells.forEach((cell, index) => {
          rowData[`Column${index + 1}`] = cell.textContent.trim();
        });
        return rowData;
      });

      const filename = generateFilename(`${activeTab}-report`, startDate, endDate, 'csv');
      exportToExcel(data, filename);
    } else {
      alert('No table data found to export.');
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

        {/* Daily Trend Chart */}
        {daily_trend && daily_trend.length > 0 && (
          <div className="mt-6">
            <RevenueChart
              data={daily_trend.map(day => ({ date: day.date, amount: day.amount }))}
              title="Daily Sales Trend"
            />
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

        {/* Expenses by Category Chart */}
        {by_category && by_category.length > 0 && (
          <div className="mb-6">
            <ExpenseChart
              data={by_category}
              title="Expenses by Category"
            />
          </div>
        )}

        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b flex justify-between items-center">
            <h3 className="text-lg font-semibold">Expenses by Category</h3>
            <button
              onClick={() => handleExportExcel()}
              className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700"
            >
              <Download className="h-4 w-4" />
              <span>Export Excel</span>
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
        {/* Profit Distribution Chart */}
        <ProfitChart
          data={{
            'Revenue': revenue || 0,
            'COGS': cost_of_goods_sold || 0,
            'Gross Profit': gross_profit || 0,
            'Operating Expenses': operating_expenses || 0,
            'Net Profit': net_profit || 0
          }}
          title="Profit & Loss Distribution"
        />

        <div className="bg-white rounded-lg shadow p-6">
          <div className="p-4 border-b mb-4">
            <h3 className="text-lg font-semibold">Profit & Loss Statement</h3>
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

  // Render functions for new report types
  const renderTaxReport = () => {
    if (taxLoading) return <div className="text-center py-12">Loading tax report...</div>;
    if (!taxData) return <div className="text-center py-12 text-gray-500">No data available</div>;
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">Tax Report</h2>
        <div className="mb-4">
          <p className="text-sm text-gray-600">Total Sales: {formatCurrency(taxData.summary?.total_sales)}</p>
          <p className="text-sm text-gray-600">Total Tax: {formatCurrency(taxData.summary?.total_tax)}</p>
          <p className="text-sm text-gray-600">Tax Percentage: {taxData.summary?.tax_percentage?.toFixed(2)}%</p>
        </div>
        {taxData.by_branch && taxData.by_branch.length > 0 && (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Branch</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Sales</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Tax</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Count</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {taxData.by_branch.map((item, idx) => (
                <tr key={idx}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">{item.branch}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right">{formatCurrency(item.sales)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right">{formatCurrency(item.tax)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right">{item.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    );
  };

  const renderSupplierCustomerReport = () => {
    // Use existing customer and purchase reports
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">Customer Summary</h2>
          {customerLoading ? (
            <div className="text-center py-12">Loading...</div>
          ) : customerData ? (
            <div>
              <p className="text-sm text-gray-600 mb-4">Total Outstanding: {formatCurrency(customerData.outstanding?.total)}</p>
              {customerData.top_customers && customerData.top_customers.length > 0 && (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Revenue</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Orders</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {customerData.top_customers.slice(0, 10).map((item, idx) => (
                      <tr key={idx}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">{item.customer?.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right">{formatCurrency(item.total_revenue)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right">{item.order_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">No data available</div>
          )}
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">Supplier Summary</h2>
          {purchaseLoading ? (
            <div className="text-center py-12">Loading...</div>
          ) : purchaseData ? (
            <div>
              {purchaseData.top_suppliers && purchaseData.top_suppliers.length > 0 && (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Supplier</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Purchases</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Orders</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {purchaseData.top_suppliers.slice(0, 10).map((item, idx) => (
                      <tr key={idx}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">{item.supplier?.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right">{formatCurrency(item.total_amount)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right">{item.order_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">No data available</div>
          )}
        </div>
      </div>
    );
  };

  const renderCustomerGroupsReport = () => {
    if (customerGroupsLoading) return <div className="text-center py-12">Loading customer groups...</div>;
    if (!customerGroupsData) return <div className="text-center py-12 text-gray-500">No data available</div>;
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">Customer Groups Report</h2>
        {customerGroupsData.groups && customerGroupsData.groups.map((group, idx) => (
          <div key={idx} className="mb-6 border-b border-gray-200 pb-4">
            <h3 className="text-lg font-semibold mb-2">{group.group_name}</h3>
            <p className="text-sm text-gray-600 mb-2">Customers: {group.customer_count} | Total Revenue: {formatCurrency(group.total_revenue)}</p>
            {group.customers && group.customers.length > 0 && (
              <table className="min-w-full divide-y divide-gray-200 mt-4">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Revenue</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Orders</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {group.customers.slice(0, 10).map((customer, cIdx) => (
                    <tr key={cIdx}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">{customer.customer?.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right">{formatCurrency(customer.total_revenue)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right">{customer.order_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderStockAdjustmentReport = () => {
    if (stockAdjustmentLoading) return <div className="text-center py-12">Loading stock adjustment report...</div>;
    if (!stockAdjustmentData) return <div className="text-center py-12 text-gray-500">No data available</div>;
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">Stock Adjustment Report</h2>
        <div className="mb-4 grid grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-gray-600">Total Adjustments</p>
            <p className="text-lg font-semibold">{stockAdjustmentData.summary?.total_adjustments}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Total Increase</p>
            <p className="text-lg font-semibold text-green-600">{stockAdjustmentData.summary?.total_increase?.toFixed(3)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Total Decrease</p>
            <p className="text-lg font-semibold text-red-600">{stockAdjustmentData.summary?.total_decrease?.toFixed(3)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Net Change</p>
            <p className={`text-lg font-semibold ${stockAdjustmentData.summary?.net_change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {stockAdjustmentData.summary?.net_change?.toFixed(3)}
            </p>
          </div>
        </div>
        {stockAdjustmentData.adjustments && stockAdjustmentData.adjustments.length > 0 && (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Instance</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Old Qty</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">New Qty</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Change</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {stockAdjustmentData.adjustments.slice(0, 100).map((adj) => (
                <tr key={adj.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">{adj.product?.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">{adj.instance_code}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right">{adj.old_quantity?.toFixed(3)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right">{adj.new_quantity?.toFixed(3)}</td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm text-right ${adj.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {adj.change >= 0 ? '+' : ''}{adj.change?.toFixed(3)}
                  </td>
                  <td className="px-6 py-4 text-sm">{adj.reason}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">{adj.user?.full_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">{formatDate(adj.adjustment_date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    );
  };

  const renderTrendingProductsReport = () => {
    if (trendingProductsLoading) return <div className="text-center py-12">Loading trending products...</div>;
    if (!trendingProductsData) return <div className="text-center py-12 text-gray-500">No data available</div>;
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">Trending Products</h2>
        {trendingProductsData.products && trendingProductsData.products.length > 0 ? (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Quantity Sold</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Revenue</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Orders</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {trendingProductsData.products.map((item, idx) => (
                <tr key={idx}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">{item.product?.name} ({item.product?.sku})</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right">{item.total_quantity?.toFixed(3)} {item.product?.base_unit}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium">{formatCurrency(item.total_revenue)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right">{item.order_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="text-center py-12 text-gray-500">No products found</div>
        )}
      </div>
    );
  };

  const renderItemsReport = () => {
    if (itemsLoading) return <div className="text-center py-12">Loading items report...</div>;
    if (!itemsData) return <div className="text-center py-12 text-gray-500">No data available</div>;
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">Items Report</h2>
        {itemsData.items && itemsData.items.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoice</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Quantity</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Unit Price</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Subtotal</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {itemsData.items.slice(0, 200).map((item) => (
                  <tr key={item.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">{item.product?.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">{item.order?.invoice_number}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">{item.order?.customer?.name || 'Walk-in'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right">{item.quantity?.toFixed(3)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right">{formatCurrency(item.unit_price)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium">{formatCurrency(item.subtotal)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">{formatDate(item.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">No items found</div>
        )}
      </div>
    );
  };

  const renderProductPurchaseReport = () => {
    if (productPurchaseLoading) return <div className="text-center py-12">Loading product purchase report...</div>;
    if (!productPurchaseData) return <div className="text-center py-12 text-gray-500">No data available</div>;
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">Product Purchase Report</h2>
        {productPurchaseData.items && productPurchaseData.items.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Purchase #</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Supplier</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Quantity</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Unit Cost</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Subtotal</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {productPurchaseData.items.slice(0, 200).map((item) => (
                  <tr key={item.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">{item.product?.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">{item.purchase?.purchase_number}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">{item.purchase?.supplier?.name || 'Unknown'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right">{item.quantity?.toFixed(3)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right">{formatCurrency(item.unit_cost)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium">{formatCurrency(item.subtotal)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">{formatDate(item.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">No purchases found</div>
        )}
      </div>
    );
  };

  const renderProductSellReport = () => {
    if (productSellLoading) return <div className="text-center py-12">Loading product sell report...</div>;
    if (!productSellData) return <div className="text-center py-12 text-gray-500">No data available</div>;
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">Product Sell Report</h2>
        {productSellData.products && productSellData.products.length > 0 ? (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Quantity Sold</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Revenue</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Avg Price</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Sales Count</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {productSellData.products.map((item, idx) => (
                <tr key={idx}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">{item.product?.name} ({item.product?.sku})</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right">{item.total_quantity?.toFixed(3)} {item.product?.base_unit}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium">{formatCurrency(item.total_revenue)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right">{formatCurrency(item.avg_price)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right">{item.sale_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="text-center py-12 text-gray-500">No products found</div>
        )}
      </div>
    );
  };

  const renderPurchasePaymentReport = () => {
    if (purchasePaymentLoading) return <div className="text-center py-12">Loading purchase payment report...</div>;
    if (!purchasePaymentData) return <div className="text-center py-12 text-gray-500">No data available</div>;
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">Purchase Payment Report</h2>
        <div className="mb-4 grid grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-gray-600">Total Purchases</p>
            <p className="text-lg font-semibold">{formatCurrency(purchasePaymentData.summary?.total_purchases)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Paid</p>
            <p className="text-lg font-semibold text-green-600">{formatCurrency(purchasePaymentData.summary?.paid)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Unpaid</p>
            <p className="text-lg font-semibold text-red-600">{formatCurrency(purchasePaymentData.summary?.unpaid)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Count</p>
            <p className="text-lg font-semibold">{purchasePaymentData.summary?.purchase_count}</p>
          </div>
        </div>
        {purchasePaymentData.purchases && purchasePaymentData.purchases.length > 0 && (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Purchase #</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Supplier</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {purchasePaymentData.purchases.slice(0, 100).map((purchase) => (
                <tr key={purchase.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">{purchase.purchase_number}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">{purchase.supplier?.name || 'Unknown'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right">{formatCurrency(purchase.total_amount)}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${purchase.payment_status === 'paid' ? 'bg-green-100 text-green-800' :
                        purchase.payment_status === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                      }`}>
                      {purchase.payment_status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">{formatDate(purchase.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    );
  };

  const renderSellPaymentReport = () => {
    if (sellPaymentLoading) return <div className="text-center py-12">Loading sell payment report...</div>;
    if (!sellPaymentData) return <div className="text-center py-12 text-gray-500">No data available</div>;
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">Sell Payment Report</h2>
        <div className="mb-4 grid grid-cols-5 gap-4">
          <div>
            <p className="text-sm text-gray-600">Total Sales</p>
            <p className="text-lg font-semibold">{formatCurrency(sellPaymentData.summary?.total_sales)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Paid</p>
            <p className="text-lg font-semibold text-green-600">{formatCurrency(sellPaymentData.summary?.paid)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Unpaid</p>
            <p className="text-lg font-semibold text-red-600">{formatCurrency(sellPaymentData.summary?.unpaid)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Partial</p>
            <p className="text-lg font-semibold text-yellow-600">{formatCurrency(sellPaymentData.summary?.partial)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Count</p>
            <p className="text-lg font-semibold">{sellPaymentData.summary?.sales_count}</p>
          </div>
        </div>
        {sellPaymentData.sales && sellPaymentData.sales.length > 0 && (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoice #</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sellPaymentData.sales.slice(0, 100).map((sale) => (
                <tr key={sale.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">{sale.invoice_number}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">{sale.customer?.name || 'Walk-in'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right">{formatCurrency(sale.total_amount)}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${sale.payment_status === 'paid' ? 'bg-green-100 text-green-800' :
                        sale.payment_status === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                      }`}>
                      {sale.payment_status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">{formatDate(sale.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    );
  };

  const renderRegisterReport = () => {
    if (registerLoading) return <div className="text-center py-12">Loading register report...</div>;
    if (!registerData) return <div className="text-center py-12 text-gray-500">No data available</div>;
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">Register Report</h2>
        {registerData.daily_totals && registerData.daily_totals.length > 0 && (
          <table className="min-w-full divide-y divide-gray-200 mb-6">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Amount</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Transactions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {registerData.daily_totals.map((day, idx) => (
                <tr key={idx}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">{formatDate(day.date)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium">{formatCurrency(day.total_amount)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right">{day.transaction_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {registerData.by_method && registerData.by_method.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-2">By Payment Method</h3>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Method</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Count</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {registerData.by_method.map((item, idx) => (
                  <tr key={idx}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">{formatDate(item.date)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm capitalize">{item.method}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium">{formatCurrency(item.total_amount)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right">{item.transaction_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  const renderSalesRepresentativeReport = () => {
    if (salesRepresentativeLoading) return <div className="text-center py-12">Loading sales representative report...</div>;
    if (!salesRepresentativeData) return <div className="text-center py-12 text-gray-500">No data available</div>;
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">Sales Representative Report</h2>
        <div className="mb-4 grid grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-gray-600">Total Sales</p>
            <p className="text-lg font-semibold">{formatCurrency(salesRepresentativeData.summary?.total_sales)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Total Commission</p>
            <p className="text-lg font-semibold text-green-600">{formatCurrency(salesRepresentativeData.summary?.total_commission)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Agents</p>
            <p className="text-lg font-semibold">{salesRepresentativeData.summary?.agent_count}</p>
          </div>
        </div>
        {salesRepresentativeData.by_agent && salesRepresentativeData.by_agent.length > 0 && (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Agent</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Sales</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Commission</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Sales Count</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {salesRepresentativeData.by_agent.map((agent, idx) => (
                <tr key={idx}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">{agent.agent?.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium">{formatCurrency(agent.total_sales)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-green-600">{formatCurrency(agent.total_commission)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right">{agent.sales_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    );
  };

  const renderActivityLogReport = () => {
    if (activityLogLoading) return <div className="text-center py-12">Loading activity log...</div>;
    if (!activityLogData) return <div className="text-center py-12 text-gray-500">No data available</div>;

    const formatDateTime = (dateString) => {
      if (!dateString) return '—';
      return new Date(dateString).toLocaleString('en-NG', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    };

    const actionTypes = ['LOGIN', 'CREATE', 'UPDATE', 'DELETE', 'PRINT', 'CONFIRM', 'VOID'];
    const modules = ['auth', 'sales', 'purchases', 'payments', 'customers', 'suppliers', 'inventory', 'products', 'users', 'settings'];

    return (
      <div className="space-y-6">
        {/* Filters */}
        <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
              <DateFilterDropdown
                onDateChange={(range) => {
                  if (range.startDate) setStartDate(range.startDate);
                  if (range.endDate) setEndDate(range.endDate);
                }}
                initialPreset="this-month"
                showTimeRange={false}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Branch</label>
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">All Branches</option>
                {branchesData?.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Action Type</label>
              <select
                value={activityLogActionType}
                onChange={(e) => setActivityLogActionType(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">All Actions</option>
                {actionTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Module</label>
              <select
                value={activityLogModule}
                onChange={(e) => setActivityLogModule(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">All Modules</option>
                {modules.map((module) => (
                  <option key={module} value={module}>
                    {module.charAt(0).toUpperCase() + module.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Activity Log Table */}
        <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">Activity Log</h2>
            <p className="text-sm text-gray-600 mt-1">Total Activities: {activityLogData.total_count || 0}</p>
          </div>
          {activityLogData.activities && activityLogData.activities.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Timestamp
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Action
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Module
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      IP Address
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Branch
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {activityLogData.activities.map((activity) => (
                    <tr key={activity.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDateTime(activity.timestamp)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {activity.user?.full_name || '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${activity.action_type === 'LOGIN' ? 'bg-blue-100 text-blue-800' :
                            activity.action_type === 'CREATE' ? 'bg-green-100 text-green-800' :
                              activity.action_type === 'UPDATE' ? 'bg-yellow-100 text-yellow-800' :
                                activity.action_type === 'DELETE' ? 'bg-red-100 text-red-800' :
                                  activity.action_type === 'CONFIRM' ? 'bg-purple-100 text-purple-800' :
                                    'bg-gray-100 text-gray-800'
                          }`}>
                          {activity.action_type}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {activity.module}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {activity.description || '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {activity.ip_address || '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {activity.branch?.name || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No activities found for the selected filters</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderBatchOperationsReport = () => {
    if (batchOperationsLoading) return <div className="text-center py-12">Loading batch operations...</div>;
    if (!batchOperationsData || !batchOperationsData.logs) return <div className="text-center py-12 text-gray-500">No data available</div>;

    const logs = batchOperationsData.logs;

    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b flex justify-between items-center">
            <h3 className="text-lg font-semibold">Batch Operations History</h3>
            <button
              onClick={() => handleExportExcel()}
              className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700"
            >
              <Download className="h-4 w-4" />
              <span>Export Excel</span>
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Date/Time</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">User</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Branch</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Action</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {new Date(log.timestamp).toLocaleString('en-NG')}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {log.user ? `${log.user.first_name} ${log.user.last_name}` : 'System'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">{log.branch?.name || 'All Branches'}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${log.action_type === 'CREATE' ? 'bg-green-100 text-green-800' :
                          log.action_type === 'DELETE' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                        {log.action_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">{log.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
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
      case 'tax':
        return renderTaxReport();
      case 'supplier-customer':
        return renderSupplierCustomerReport();
      case 'customer-groups':
        return renderCustomerGroupsReport();
      case 'stock-adjustment':
        return renderStockAdjustmentReport();
      case 'trending-products':
        return renderTrendingProductsReport();
      case 'items':
        return renderItemsReport();
      case 'product-purchase':
        return renderProductPurchaseReport();
      case 'product-sell':
        return renderProductSellReport();
      case 'purchase-payment':
        return renderPurchasePaymentReport();
      case 'sell-payment':
        return renderSellPaymentReport();
      case 'register':
        return renderRegisterReport();
      case 'sales-representative':
        return renderSalesRepresentativeReport();
      case 'activity-log':
        return renderActivityLogReport();
      case 'batch-operations':
        return renderBatchOperationsReport();
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

      {/* Filters and Export Actions */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-wrap items-end gap-4 mb-4">
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
              <DateFilterDropdown
                onDateChange={handleDateChange}
                initialPreset="this-month"
              />
            </div>
          )}

          {/* Export Buttons */}
          <div className="flex items-center space-x-2 ml-auto">
            <button
              onClick={handlePrint}
              className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors no-print"
              title="Print Report"
            >
              <Printer className="h-4 w-4" />
              <span className="hidden sm:inline">Print</span>
            </button>
            <button
              onClick={handleExportPDF}
              className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors no-print"
              title="Export to PDF"
            >
              <FileDown className="h-4 w-4" />
              <span className="hidden sm:inline">PDF</span>
            </button>
            <button
              onClick={handleExportExcel}
              className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors no-print"
              title="Export to Excel"
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Excel</span>
            </button>
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

      {/* Tabs - Responsive Navigation */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="border-b border-gray-200">
          {/* Mobile: Dropdown */}
          <div className="md:hidden p-4">
            <select
              value={activeTab}
              onChange={(e) => setActiveTab(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {visibleTabs.map(tab => (
                <option key={tab.id} value={tab.id}>{tab.name}</option>
              ))}
            </select>
          </div>

          {/* Desktop: Scrollable tabs */}
          <nav
            className="hidden md:flex space-x-8 px-6 overflow-x-auto"
            style={{ scrollbarWidth: 'thin', WebkitOverflowScrolling: 'touch' }}
            aria-label="Tabs"
          >
            {visibleTabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-shrink-0 ${activeTab === tab.id
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    } flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap`}
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
      <div id="report-content">{renderActiveTab()}</div>
    </div>
  );
};

export default Reports;


