import { Link, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  ShoppingCart,
  ClipboardList,
  FileEdit,
  FileText,
  RotateCcw,
  Package,
  Boxes,
  DollarSign,
  CreditCard,
  Users,
  UserCheck,
  Building2,
  ShoppingBag,
  Receipt,
  Wallet,
  Shield,
  Settings,
  Factory,
  Truck,
  LogOut,
  BarChart3,
  UserPlus,
  Upload,
  Percent,
  FileCheck,
  Printer,
  MapPin,
  ChevronDown,
  ChevronRight,
  Plus,
  List,
  Home,
} from 'lucide-react';

const Sidebar = () => {
  const { user, hasPermission, logout } = useAuth();
  const location = useLocation();
  const [expandedGroups, setExpandedGroups] = useState({});

  const toggleGroup = (groupKey) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupKey]: !prev[groupKey],
    }));
  };

  const isPathActive = (path) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  const menuStructure = [
    {
      type: 'item',
      name: 'Dashboard',
      path: '/',
      icon: LayoutDashboard,
      permission: null,
    },
    {
      type: 'group',
      name: 'User Management',
      icon: Users,
      permission: 'user_view',
      items: [
        { name: 'Users', path: '/users', icon: Users, permission: 'user_view' },
        { name: 'Roles & Permissions', path: '/roles', icon: Shield, permission: 'role_manage' },
        { name: 'Sales Commission Agents', path: '/agents', icon: UserPlus, permission: 'agent_view' },
      ],
    },
    {
      type: 'group',
      name: 'Contacts',
      icon: UserCheck,
      permission: 'payment_view',
      items: [
        { name: 'Customers', path: '/customers', icon: UserCheck, permission: 'payment_view' },
        { name: 'Suppliers', path: '/suppliers', icon: Building2, permission: 'product_view' },
        { name: 'Import Contacts', path: '/import-contacts', icon: Upload, permission: 'data_import' },
      ],
    },
    {
      type: 'group',
      name: 'Inventory',
      icon: Package,
      permission: 'product_view',
      items: [
        {
          type: 'subgroup',
          name: 'Products',
          items: [
            { name: 'List', path: '/products', icon: List, permission: 'product_view' },
            { name: 'Add Product', path: '/products', icon: Plus, permission: 'product_add', action: 'add' },
            { name: 'Update Price', path: '/products/update-price', icon: DollarSign, permission: 'product_edit' },
            { name: 'Print Labels', path: '/inventory/print-labels', icon: Printer, permission: 'stock_add_opening' },
            { name: 'Import Products', path: '/inventory/import', icon: Upload, permission: 'data_import' },
            { name: 'Stock Transfer', path: '/inventory/stock-transfer', icon: Truck, permission: 'stock_transfer_init' },
            { name: 'Stock Adjustment', path: '/inventory/stock-adjustment', icon: RotateCcw, permission: 'stock_adjust' },
          ],
        },
        {
          type: 'subgroup',
          name: 'Inventory Settings',
          items: [
            { name: 'Variations', path: '/inventory/settings/variations', icon: Settings, permission: 'product_view' },
            { name: 'Units', path: '/inventory/settings/units', icon: Settings, permission: 'product_view' },
            { name: 'Categories', path: '/inventory/settings/categories', icon: Settings, permission: 'product_view' },
            { name: 'Brands', path: '/settings', icon: Settings, permission: 'product_view', action: 'brands' },
            { name: 'Warranties', path: '/inventory/settings/warranties', icon: Settings, permission: 'product_view' },
          ],
        },
      ],
    },
    {
      type: 'group',
      name: 'Manufacturing',
      icon: Factory,
      permission: 'production_view_queue',
      items: [
        { name: 'Check Status', path: '/manufacturing/status', icon: Factory, permission: 'production_view_queue' },
        { name: 'Recipes', path: '/manufacturing/recipes', icon: FileText, permission: 'recipe_manage' },
        { name: 'Production List', path: '/production-queue', icon: List, permission: 'production_view_queue' },
      ],
    },
    {
      type: 'group',
      name: 'Purchases',
      icon: ShoppingBag,
      permission: 'stock_add_opening',
      items: [
        { name: 'List', path: '/purchases', icon: List, permission: 'stock_add_opening' },
        { name: 'Add', path: '/purchases/add', icon: Plus, permission: 'stock_add_opening' },
        { name: 'Purchase Returns', path: '/purchases/returns', icon: RotateCcw, permission: 'purchase_return_view' },
      ],
    },
    {
      type: 'group',
      name: 'Sales',
      icon: ClipboardList,
      permission: 'sale_view_all',
      items: [
        { name: 'List Sales', path: '/sales', icon: List, permission: 'sale_view_all' },
        { name: 'Add Sale', path: '/sales/add', icon: Plus, permission: 'sale_view_all' },
        { name: 'List POS', path: '/sales/pos-list', icon: ShoppingCart, permission: 'sale_view_all' },
        { name: 'POS Interface', path: '/pos', icon: ShoppingCart, permission: 'pos_access' },
        { name: 'Add Draft', path: '/sales/drafts', icon: FileEdit, permission: 'draft_manage', action: 'add' },
        { name: 'List Drafts', path: '/sales/drafts', icon: List, permission: 'draft_manage' },
        { name: 'Add Quotation', path: '/sales/quotations', icon: FileText, permission: 'quote_manage', action: 'add' },
        { name: 'List Quotations', path: '/sales/quotations', icon: List, permission: 'quote_manage' },
        { name: 'List Sell Return', path: '/sales/returns', icon: RotateCcw, permission: 'sale_return_view' },
        { name: 'Shipments', path: '/shipments', icon: Truck, permission: 'production_view_queue' },
        { name: 'Discounts', path: '/discounts', icon: Percent, permission: 'discount_view' },
        { name: 'Custom Delivery Note', path: '/delivery-notes', icon: FileCheck, permission: 'sale_view_all' },
      ],
    },
    {
      type: 'group',
      name: 'Expenses',
      icon: Receipt,
      permission: 'expense_view',
      items: [
        { name: 'List', path: '/expenses', icon: List, permission: 'expense_view' },
        { name: 'Add', path: '/expenses/add', icon: Plus, permission: 'expense_view' },
        { name: 'Expense Categories', path: '/expenses/categories', icon: Settings, permission: 'expense_view' },
      ],
    },
    {
      type: 'group',
      name: 'Payroll',
      icon: Wallet,
      permission: 'payroll_view',
      items: [
        { name: 'List', path: '/payroll', icon: List, permission: 'payroll_view' },
        { name: 'Add', path: '/payroll', icon: Plus, permission: 'payroll_view', action: 'add' },
      ],
    },
    {
      type: 'group',
      name: 'Accounts',
      icon: BarChart3,
      permission: 'report_view_sales',
      items: [
        {
          type: 'subgroup',
          name: 'Reports',
          items: [
            { name: 'Profit/Loss', path: '/accounts/reports', icon: BarChart3, permission: 'report_view_financial', action: 'profit-loss' },
            { name: 'Purchase & Sale', path: '/accounts/reports', icon: BarChart3, permission: 'report_view_sales', action: 'purchase-sale' },
            { name: 'Tax Report', path: '/accounts/reports', icon: BarChart3, permission: 'report_view_financial', action: 'tax' },
            { name: 'Supplier & Customer', path: '/accounts/reports', icon: BarChart3, permission: 'report_view_sales', action: 'supplier-customer' },
            { name: 'Customer Groups', path: '/accounts/reports', icon: BarChart3, permission: 'report_view_sales', action: 'customer-groups' },
            { name: 'Stock Report', path: '/accounts/reports', icon: BarChart3, permission: 'report_view_stock_value', action: 'stock' },
            { name: 'Stock Adjustment Report', path: '/accounts/reports', icon: BarChart3, permission: 'report_view_stock_value', action: 'stock-adjustment' },
            { name: 'Trending Products', path: '/accounts/reports', icon: BarChart3, permission: 'report_view_sales', action: 'trending-products' },
            { name: 'Items Report', path: '/accounts/reports', icon: BarChart3, permission: 'report_view_sales', action: 'items' },
            { name: 'Product Purchase', path: '/accounts/reports', icon: BarChart3, permission: 'report_view_sales', action: 'product-purchase' },
            { name: 'Product Sell', path: '/accounts/reports', icon: BarChart3, permission: 'report_view_sales', action: 'product-sell' },
            { name: 'Purchase Payment', path: '/accounts/reports', icon: BarChart3, permission: 'report_view_financial', action: 'purchase-payment' },
            { name: 'Sell Payment', path: '/accounts/reports', icon: BarChart3, permission: 'report_view_financial', action: 'sell-payment' },
            { name: 'Expense Report', path: '/accounts/reports', icon: BarChart3, permission: 'report_view_financial', action: 'expenses' },
            { name: 'Register Report', path: '/accounts/reports', icon: BarChart3, permission: 'report_view_register', action: 'register' },
            { name: 'Sales Representative', path: '/accounts/reports', icon: BarChart3, permission: 'report_view_sales', action: 'sales-representative' },
            { name: 'Activity Log', path: '/accounts/reports', icon: BarChart3, permission: 'report_view_sales', action: 'activity-log' },
          ],
        },
        {
          type: 'subgroup',
          name: 'Payment Accounts',
          items: [
            { name: 'List Accounts', path: '/accounts/payment-accounts', icon: List, permission: 'payment_account_view' },
            { name: 'Balance Sheet', path: '/accounts/payment-accounts/balance-sheet', icon: BarChart3, permission: 'report_view_financial' },
            { name: 'Trial Balance', path: '/accounts/payment-accounts/trial-balance', icon: BarChart3, permission: 'report_view_financial' },
            { name: 'Cash Flow', path: '/accounts/payment-accounts/cash-flow', icon: BarChart3, permission: 'report_view_financial' },
            { name: 'Payment Account Report', path: '/accounts/payment-accounts/report', icon: BarChart3, permission: 'payment_account_view' },
          ],
        },
      ],
    },
    {
      type: 'group',
      name: 'Settings',
      icon: Settings,
      permission: 'product_add',
      items: [
        { name: 'Business Settings', path: '/settings/business', icon: Settings, permission: 'settings_manage' },
        { name: 'Business Locations', path: '/settings/locations', icon: MapPin, permission: 'settings_manage' },
        { name: 'Invoice Settings', path: '/settings/invoice', icon: FileText, permission: 'settings_manage' },
        { name: 'Barcode Settings', path: '/settings/barcode', icon: Printer, permission: 'settings_manage' },
        { name: 'Receipt Printers', path: '/settings/receipt-printers', icon: Printer, permission: 'settings_manage' },
        { name: 'Tax Rates', path: '/settings/tax', icon: DollarSign, permission: 'settings_manage' },
      ],
    },
  ];

  const hasVisibleItems = (group) => {
    if (group.type === 'item') {
      return !group.permission || hasPermission(group.permission);
    }
    if (group.items) {
      return group.items.some((item) => {
        if (item.type === 'subgroup') {
          return item.items.some((subItem) => !subItem.permission || hasPermission(subItem.permission));
        }
        return !item.permission || hasPermission(item.permission);
      });
    }
    return !group.permission || hasPermission(group.permission);
  };

  const renderMenuItem = (item, level = 0) => {
    if (item.type === 'group') {
      if (!hasVisibleItems(item)) return null;

      const groupKey = item.name;
      const isExpanded = expandedGroups[groupKey];
      const hasActiveChild = item.items.some((child) => {
        if (child.type === 'subgroup') {
          return child.items.some((subChild) => isPathActive(subChild.path));
        }
        return isPathActive(child.path);
      });

      return (
        <div key={groupKey} className="space-y-1">
          <button
            onClick={() => toggleGroup(groupKey)}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors ${
              hasActiveChild
                ? 'bg-primary-600 text-white'
                : 'text-gray-300 hover:bg-gray-800'
            }`}
          >
            <div className="flex items-center space-x-3">
              <item.icon className="h-5 w-5" />
              <span>{item.name}</span>
            </div>
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
          {isExpanded && (
            <div className="ml-4 space-y-1 border-l border-gray-700 pl-2">
              {item.items.map((child) => renderMenuItem(child, level + 1))}
            </div>
          )}
        </div>
      );
    }

    if (item.type === 'subgroup') {
      const subgroupKey = `${item.name}-subgroup`;
      const isExpanded = expandedGroups[subgroupKey];
      const hasActiveChild = item.items.some((subChild) => isPathActive(subChild.path));

      if (!hasVisibleItems(item)) return null;

      return (
        <div key={subgroupKey} className="space-y-1">
          <button
            onClick={() => toggleGroup(subgroupKey)}
            className={`w-full flex items-center justify-between px-4 py-2 rounded-lg transition-colors text-sm ${
              hasActiveChild
                ? 'bg-primary-600 text-white'
                : 'text-gray-400 hover:bg-gray-800'
            }`}
          >
            <span>{item.name}</span>
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
          {isExpanded && (
            <div className="ml-4 space-y-1">
              {item.items.map((subItem) => renderMenuItem(subItem, level + 2))}
            </div>
          )}
        </div>
      );
    }

    // Regular menu item
    if (item.permission && !hasPermission(item.permission)) return null;

    const isActive = isPathActive(item.path);
    const Icon = item.icon || List;

    return (
      <Link
        key={item.path}
        to={item.path}
        state={item.action ? { action: item.action } : undefined}
        className={`flex items-center space-x-3 px-4 py-2 rounded-lg transition-colors text-sm ${
          isActive
            ? 'bg-primary-600 text-white'
            : 'text-gray-300 hover:bg-gray-800'
        }`}
      >
        <Icon className="h-4 w-4" />
        <span>{item.name}</span>
      </Link>
    );
  };

  return (
    <div className="w-64 bg-gray-900 text-white min-h-screen flex flex-col">
      <div className="p-6 border-b border-gray-800">
        <h1 className="text-xl font-bold">Aify ERP</h1>
        <p className="text-sm text-gray-400 mt-1">v2.0.0</p>
      </div>

      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {menuStructure.map((item) => renderMenuItem(item))}
      </nav>

      <div className="p-4 border-t border-gray-800">
        <div className="px-4 py-2 text-sm text-gray-400">
          <div className="font-medium text-white">{user?.full_name}</div>
          <div className="text-xs mt-1">{user?.role_name}</div>
          {user?.branch && (
            <div className="text-xs mt-1">{user.branch.name}</div>
          )}
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-gray-300 hover:bg-gray-800 transition-colors"
        >
          <LogOut className="h-5 w-5" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;

