import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import DateFilterDropdown from '../components/common/DateFilterDropdown';
import {
  CreditCard,
  Package,
  TrendingUp,
  Users,
  Factory,
  AlertTriangle,
  ShoppingCart,
  DollarSign,
  ArrowRight,
  Clock,
  CheckCircle,
  Building2
} from 'lucide-react';
import { LineChart, Line, BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const Dashboard = () => {
  const { user, loading, hasPermission } = useAuth();
  const navigate = useNavigate();
  const [dateRange, setDateRange] = useState({ startDate: null, endDate: null, startDateTime: null, endDateTime: null });
  const [selectedBranch, setSelectedBranch] = useState(null);

  // Initialize branch filter - default to user's branch if not Super Admin
  // Must be before conditional returns to follow Rules of Hooks
  const defaultBranchId = user?.role_name !== 'Super Admin' ? user?.branch_id : null;
  const [branchId, setBranchId] = useState(selectedBranch || defaultBranchId);

  // Fetch branches for filter
  const { data: branchesData } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      const response = await api.get('/branches');
      return response.data.branches || [];
    }
  });

  // Show loading state while user data is being loaded
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  // Show message if user is not available
  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">User data not available. Please log in again.</p>
      </div>
    );
  }

  // Handle date range change
  const handleDateChange = (range) => {
    setDateRange(range);
  };

  // Handle branch change
  const handleBranchChange = (e) => {
    const branchValue = e.target.value === 'all' ? null : e.target.value;
    setBranchId(branchValue);
    setSelectedBranch(branchValue);
  };

  // Get date params for API calls
  const getDateParams = () => {
    if (dateRange.startDate && dateRange.endDate) {
      return {
        start_date: dateRange.startDate,
        end_date: dateRange.endDate
      };
    }
    // Default to last 30 days if no range selected
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    return {
      start_date: startDate.toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0]
    };
  };

  const dateParams = getDateParams();

  // Fetch dashboard stats with date range and branch
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboardStats', dateParams.start_date, dateParams.end_date, branchId],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('start_date', dateParams.start_date);
      params.append('end_date', dateParams.end_date);
      if (branchId) {
        params.append('branch_id', branchId);
      }
      const response = await api.get(`/dashboard/stats?${params.toString()}`);
      return response.data;
    }
  });

  // Fetch sales chart data with date range and branch
  const { data: chartData, isLoading: chartLoading } = useQuery({
    queryKey: ['dashboardSalesChart', dateParams.start_date, dateParams.end_date, branchId],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('start_date', dateParams.start_date);
      params.append('end_date', dateParams.end_date);
      if (branchId) {
        params.append('branch_id', branchId);
      }
      const response = await api.get(`/dashboard/sales-chart?${params.toString()}`);
      return response.data;
    }
  });

  // Fetch top products
  const { data: topProductsData, isLoading: productsLoading } = useQuery({
    queryKey: ['dashboardTopProducts'],
    queryFn: async () => {
      const response = await api.get('/dashboard/top-products?limit=5');
      return response.data;
    }
  });

  // Fetch top customers
  const { data: topCustomersData, isLoading: customersLoading } = useQuery({
    queryKey: ['dashboardTopCustomers'],
    queryFn: async () => {
      const response = await api.get('/dashboard/top-customers?limit=5');
      return response.data;
    }
  });

  // Fetch recent activity
  const { data: activityData, isLoading: activityLoading } = useQuery({
    queryKey: ['dashboardRecentActivity'],
    queryFn: async () => {
      const response = await api.get('/dashboard/recent-activity?limit=10');
      return response.data;
    }
  });

  // Fetch low stock alerts
  const { data: alertsData, isLoading: alertsLoading } = useQuery({
    queryKey: ['dashboardLowStockAlerts'],
    queryFn: async () => {
      const response = await api.get('/dashboard/alerts');
      return response.data;
    }
  });

  // Fetch pending actions
  const { data: pendingData, isLoading: pendingLoading } = useQuery({
    queryKey: ['dashboardPendingActions'],
    queryFn: async () => {
      const response = await api.get('/dashboard/pending-actions');
      return response.data;
    }
  });

  // Fetch expense data for revenue vs expenses chart with date range and branch
  const { data: expenseChartData, isLoading: expenseChartLoading } = useQuery({
    queryKey: ['dashboardExpenseChart', dateParams.start_date, dateParams.end_date, branchId],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('start_date', dateParams.start_date);
      params.append('end_date', dateParams.end_date);
      if (branchId) {
        params.append('branch_id', branchId);
      }

      const response = await api.get(`/reports/expenses?${params.toString()}`);
      return response.data;
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
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const stats = [
    {
      name: "Today's Sales",
      value: statsData ? formatCurrency(statsData.today_sales) : '—',
      icon: TrendingUp,
      color: 'bg-green-500',
      link: '/sales'
    },
    {
      name: 'Pending Payments',
      value: statsData?.pending_payments || 0,
      icon: CreditCard,
      color: 'bg-yellow-500',
      link: '/payments'
    },
    {
      name: 'In Queue',
      value: statsData?.items_in_queue || 0,
      icon: Factory,
      color: 'bg-blue-500',
      link: '/production-queue'
    },
    {
      name: 'Low Stock Alerts',
      value: statsData?.low_stock_count || 0,
      icon: AlertTriangle,
      color: 'bg-red-500',
      link: '/inventory'
    },
  ];

  // Prepare chart data
  const salesChartData = chartData?.daily_data?.map(day => ({
    date: new Date(day.date).toLocaleDateString('en-NG', { month: 'short', day: 'numeric' }),
    sales: parseFloat(day.amount || 0),
    count: day.count || 0
  })) || [];

  const topProductsChartData = topProductsData?.products?.map(item => ({
    name: item.product?.name || 'N/A',
    revenue: parseFloat(item.total_revenue || 0),
    quantity: parseFloat(item.total_quantity || 0)
  })) || [];

  // Prepare revenue vs expenses chart data
  const revenueVsExpensesData = [];
  if (chartData?.daily_data && expenseChartData?.daily_trend) {
    const salesMap = new Map(chartData.daily_data.map(d => [d.date, d.amount]));
    const expensesMap = new Map(expenseChartData.daily_trend.map(d => [d.date, d.amount]));
    const allDates = new Set([...salesMap.keys(), ...expensesMap.keys()]);

    // Build data with original date for sorting
    const unsortedData = Array.from(allDates).map(date => ({
      originalDate: new Date(date),
      date: date,
      revenue: parseFloat(salesMap.get(date) || 0),
      expenses: parseFloat(expensesMap.get(date) || 0)
    }));

    // Sort by original date before formatting
    unsortedData.sort((a, b) => a.originalDate - b.originalDate);

    // Format dates after sorting
    revenueVsExpensesData.push(...unsortedData.map(item => ({
      date: item.originalDate.toLocaleDateString('en-NG', { month: 'short', day: 'numeric' }),
      revenue: item.revenue,
      expenses: item.expenses
    })));
  }

  return (
    <div className="p-6">
      <div className="mb-8 flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome, {user?.full_name}
          </h1>
          <p className="text-gray-600 mt-2">
            {user?.role_name} {user?.branch?.name && `• ${user?.branch?.name}`}
          </p>
        </div>
        <div className="flex items-center space-x-4">
          {/* Branch Filter */}
          {(user?.role_name === 'Super Admin' || branchesData?.length > 1) && (
            <div className="flex items-center space-x-2">
              <Building2 className="h-4 w-4 text-gray-400" />
              <select
                value={branchId || 'all'}
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
          )}
          {/* Date Range Picker */}
          <DateFilterDropdown
            onDateChange={handleDateChange}
            initialPreset="this-month"
            showTimeRange={false}
          />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.name}
              className="bg-white rounded-lg shadow p-6 border border-gray-200 hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => stat.link && navigate(stat.link)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    {stat.name}
                  </p>
                  <p className="text-2xl font-bold text-gray-900 mt-2">
                    {stat.value}
                  </p>
                </div>
                <div className={`${stat.color} p-3 rounded-lg`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Sales Trend Chart */}
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Sales Trend</h2>
          </div>
          {chartLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : salesChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={salesChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis tickFormatter={(value) => `₦${(value / 1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(value) => formatCurrency(value)}
                  labelStyle={{ color: '#333' }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="sales"
                  stroke="#2563eb"
                  strokeWidth={2}
                  name="Sales"
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-12 text-gray-500">No sales data available</div>
          )}
        </div>

        {/* Top Products */}
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Top 5 Products</h2>
          {productsLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : topProductsChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topProductsChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="name"
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  interval={0}
                />
                <YAxis tickFormatter={(value) => `₦${(value / 1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(value) => formatCurrency(value)}
                  labelStyle={{ color: '#333' }}
                />
                <Legend />
                <Bar dataKey="revenue" fill="#2563eb" name="Revenue" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-12 text-gray-500">No product data available</div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Revenue vs Expenses Chart */}
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Revenue vs Expenses</h2>
          {expenseChartLoading || chartLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : revenueVsExpensesData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={revenueVsExpensesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis tickFormatter={(value) => `₦${(value / 1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(value) => formatCurrency(value)}
                  labelStyle={{ color: '#333' }}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stackId="1"
                  stroke="#2563eb"
                  fill="#2563eb"
                  fillOpacity={0.6}
                  name="Revenue"
                />
                <Area
                  type="monotone"
                  dataKey="expenses"
                  stackId="1"
                  stroke="#ef4444"
                  fill="#ef4444"
                  fillOpacity={0.6}
                  name="Expenses"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-12 text-gray-500">No data available</div>
          )}
        </div>

        {/* Top Customers */}
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Top 5 Customers</h2>
          {customersLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : topCustomersData?.customers?.length > 0 ? (
            <div className="space-y-3">
              {topCustomersData.customers.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{item.customer?.name || 'N/A'}</p>
                    <p className="text-sm text-gray-500">{item.order_count || 0} orders</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-primary-600">{formatCurrency(item.total_revenue)}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">No customer data available</div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Activity</h2>
          {activityLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : activityData?.activities?.length > 0 ? (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {activityData.activities.map((activity, idx) => (
                <div key={idx} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                  <div className={`p-2 rounded ${activity.type === 'sale' ? 'bg-green-100' :
                    activity.type === 'payment' ? 'bg-blue-100' :
                      'bg-purple-100'
                    }`}>
                    {activity.type === 'sale' ? (
                      <ShoppingCart className="h-4 w-4 text-green-600" />
                    ) : activity.type === 'payment' ? (
                      <DollarSign className="h-4 w-4 text-blue-600" />
                    ) : (
                      <Package className="h-4 w-4 text-purple-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{activity.description}</p>
                    <p className="text-xs text-gray-500">{formatDate(activity.date)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900">{formatCurrency(activity.amount)}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">No recent activity</div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Low Stock Alerts */}
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Low Stock Alerts</h2>
            {hasPermission('product_view') && (
              <button
                onClick={() => navigate('/inventory')}
                className="text-sm text-primary-600 hover:text-primary-700 flex items-center space-x-1"
              >
                <span>View All</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            )}
          </div>
          {alertsLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : alertsData?.low_stock_items?.length > 0 ? (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {alertsData.low_stock_items.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{item.product?.name || 'N/A'}</p>
                    <p className="text-sm text-gray-600">
                      {item.instance_code} • {item.remaining_quantity?.toFixed(2)} remaining
                    </p>
                    <p className="text-xs text-red-600 mt-1">
                      {item.percentage_remaining?.toFixed(1)}% remaining
                    </p>
                  </div>
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500" />
              <p>All stock levels are healthy</p>
            </div>
          )}
        </div>

        {/* Pending Actions */}
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Pending Actions</h2>
            {hasPermission('payment_confirm') && (
              <button
                onClick={() => navigate('/payments')}
                className="text-sm text-primary-600 hover:text-primary-700 flex items-center space-x-1"
              >
                <span>View All</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            )}
          </div>
          {pendingLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Unconfirmed Payments */}
              {pendingData?.unconfirmed_payments?.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-yellow-500" />
                    <span>Unconfirmed Payments ({pendingData.unconfirmed_payments.length})</span>
                  </h3>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {pendingData.unconfirmed_payments.slice(0, 5).map((payment, idx) => (
                      <div key={idx} className="p-2 bg-yellow-50 border border-yellow-200 rounded text-sm">
                        <p className="font-medium text-gray-900">{payment.customer}</p>
                        <p className="text-gray-600">{formatCurrency(payment.amount)} • {payment.method}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Production Queue */}
              {pendingData?.queue_items?.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center space-x-2">
                    <Factory className="h-4 w-4 text-blue-500" />
                    <span>Production Queue ({pendingData.queue_items.length})</span>
                  </h3>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {pendingData.queue_items.slice(0, 5).map((item, idx) => (
                      <div key={idx} className="p-2 bg-blue-50 border border-blue-200 rounded text-sm">
                        <p className="font-medium text-gray-900">{item.invoice_number}</p>
                        <p className="text-gray-600">{item.customer} • {formatCurrency(item.total_amount)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(!pendingData?.unconfirmed_payments?.length && !pendingData?.queue_items?.length) && (
                <div className="text-center py-12 text-gray-500">
                  <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500" />
                  <p>No pending actions</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {hasPermission('pos_access') && (
            <button
              onClick={() => window.open('/pos', '_blank')}
              className="p-4 border border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors text-left"
            >
              <h3 className="font-medium text-gray-900">Create Sale</h3>
              <p className="text-sm text-gray-600 mt-1">Start a new POS transaction</p>
            </button>
          )}
          {hasPermission('sale_view_all') && (
            <button
              onClick={() => navigate('/sales/add')}
              className="p-4 border border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors text-left"
            >
              <h3 className="font-medium text-gray-900">New Sale</h3>
              <p className="text-sm text-gray-600 mt-1">Create a new sales order</p>
            </button>
          )}
          {hasPermission('payment_confirm') && (
            <button
              onClick={() => navigate('/payments?status=pending_confirmation')}
              className="p-4 border border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors text-left"
            >
              <h3 className="font-medium text-gray-900">Review Payments</h3>
              <p className="text-sm text-gray-600 mt-1">
                {statsData?.pending_payments || 0} pending confirmation
              </p>
            </button>
          )}
          {hasPermission('product_view') && (
            <button
              onClick={() => navigate('/inventory')}
              className="p-4 border border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors text-left"
            >
              <h3 className="font-medium text-gray-900">Manage Inventory</h3>
              <p className="text-sm text-gray-600 mt-1">View and register stock</p>
            </button>
          )}
          {hasPermission('report_view_sales') && (
            <button
              onClick={() => navigate('/accounts/reports')}
              className="p-4 border border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors text-left"
            >
              <h3 className="font-medium text-gray-900">View Reports</h3>
              <p className="text-sm text-gray-600 mt-1">Access business reports</p>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
