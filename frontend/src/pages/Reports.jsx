import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  TrendingUp, ShoppingBag, Package, DollarSign, Users,
  BarChart3, FileText, Printer, FileDown, Download, Building2, Activity, Calendar
} from 'lucide-react';
import api from '../utils/api';
import DateFilterDropdown from '../components/common/DateFilterDropdown';
import { useAuth } from '../context/AuthContext';
import { printReport, exportToPDF, exportToExcel, generateFilename } from '../utils/exportUtils';

// Import Report Components
import SalesReport from './reports/SalesReport';
import PurchaseReport from './reports/PurchaseReport';
import InventoryReport from './reports/InventoryReport';
import ExpenseReport from './reports/ExpenseReport';
import CustomerReport from './reports/CustomerReport';
import PaymentReport from './reports/PaymentReport';
import ProfitLossReport from './reports/ProfitLossReport';
import BalanceSheetReport from './reports/BalanceSheetReport';
import TrialBalanceReport from './reports/TrialBalanceReport';
import CashFlowReport from './reports/CashFlowReport';
import TaxReport from './reports/TaxReport';
import SupplierCustomerReport from './reports/SupplierCustomerReport';
import CustomerGroupsReport from './reports/CustomerGroupsReport';
import StockAdjustmentReport from './reports/StockAdjustmentReport';
import TrendingProductsReport from './reports/TrendingProductsReport';
import ItemsReport from './reports/ItemsReport';
import ProductPurchaseReport from './reports/ProductPurchaseReport';
import ProductSellReport from './reports/ProductSellReport';
import PurchasePaymentReport from './reports/PurchasePaymentReport';
import SellPaymentReport from './reports/SellPaymentReport';
import RegisterReport from './reports/RegisterReport';
import SalesRepresentativeReport from './reports/SalesRepresentativeReport';
import ActivityLogReport from './reports/ActivityLogReport';
import BatchOperationsReport from './reports/BatchOperationsReport';

const Reports = () => {
  const { user, hasPermission } = useAuth();
  const [activeTab, setActiveTab] = useState('sales');
  const [startDate, setStartDate] = useState(new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedBranch, setSelectedBranch] = useState(user?.branch_id || '');

  const handleDateChange = (dateRange) => {
    if (dateRange.startDate) setStartDate(dateRange.startDate);
    if (dateRange.endDate) setEndDate(dateRange.endDate);
  };

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

  // Fetch branches for Super Admin
  const { data: branchesData } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      const response = await api.get('/branches');
      return response.data.branches || [];
    },
    enabled: user?.role_name === 'Super Admin'
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

  const renderActiveTab = () => {
    const commonProps = {
      startDate,
      endDate,
      selectedBranch,
      formatCurrency,
      formatDate
    };

    switch (activeTab) {
      case 'sales':
        return <SalesReport {...commonProps} />;
      case 'purchases':
        return <PurchaseReport {...commonProps} />;
      case 'inventory':
        return <InventoryReport {...commonProps} />;
      case 'expenses':
        return <ExpenseReport {...commonProps} />;
      case 'customers':
        return <CustomerReport {...commonProps} />;
      case 'payments':
        return <PaymentReport {...commonProps} />;
      case 'profit-loss':
        return <ProfitLossReport {...commonProps} />;
      case 'balance-sheet':
        return <BalanceSheetReport {...commonProps} asOfDate={asOfDate} />;
      case 'trial-balance':
        return <TrialBalanceReport {...commonProps} asOfDate={asOfDate} />;
      case 'cash-flow':
        return <CashFlowReport {...commonProps} />;
      case 'tax':
        return <TaxReport {...commonProps} />;
      case 'supplier-customer':
        return <SupplierCustomerReport {...commonProps} />;
      case 'customer-groups':
        return <CustomerGroupsReport {...commonProps} />;
      case 'stock-adjustment':
        return <StockAdjustmentReport {...commonProps} />;
      case 'trending-products':
        return <TrendingProductsReport {...commonProps} />;
      case 'items':
        return <ItemsReport {...commonProps} />;
      case 'product-purchase':
        return <ProductPurchaseReport {...commonProps} />;
      case 'product-sell':
        return <ProductSellReport {...commonProps} />;
      case 'purchase-payment':
        return <PurchasePaymentReport {...commonProps} />;
      case 'sell-payment':
        return <SellPaymentReport {...commonProps} />;
      case 'register':
        return <RegisterReport {...commonProps} />;
      case 'sales-representative':
        return <SalesRepresentativeReport {...commonProps} />;
      case 'activity-log':
        // ActivityLogReport handles its own filters if needed, or we pass state setters too
        return (
          <ActivityLogReport
            {...commonProps}
            setStartDate={setStartDate}
            setEndDate={setEndDate}
            branchesData={branchesData}
          />
        );
      case 'batch-operations':
        return <BatchOperationsReport {...commonProps} onExportExcel={handleExportExcel} />;
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

        {/* Branch Selection for Super Admin */}
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
