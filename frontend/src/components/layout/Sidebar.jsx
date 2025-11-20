import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  CreditCard,
  Users,
  Settings,
  Factory,
  Truck,
  LogOut,
} from 'lucide-react';

const Sidebar = () => {
  const { user, hasPermission, logout } = useAuth();
  const location = useLocation();

  const menuItems = [
    {
      name: 'Dashboard',
      path: '/',
      icon: LayoutDashboard,
      permission: null, // Always visible
    },
    {
      name: 'POS',
      path: '/pos',
      icon: ShoppingCart,
      permission: 'pos_access',
    },
    {
      name: 'Inventory',
      path: '/inventory',
      icon: Package,
      permission: 'product_view',
    },
    {
      name: 'Payments',
      path: '/payments',
      icon: CreditCard,
      permission: 'payment_view',
    },
    {
      name: 'Users',
      path: '/users',
      icon: Users,
      permission: 'user_view',
    },
    {
      name: 'Settings',
      path: '/settings',
      icon: Settings,
      permission: 'product_add',
    },
    {
      name: 'Production Queue',
      path: '/production-queue',
      icon: Factory,
      permission: 'production_view_queue',
    },
    {
      name: 'Shipments',
      path: '/shipments',
      icon: Truck,
      permission: 'production_view_queue',
    },
  ];

  const visibleItems = menuItems.filter(
    (item) => !item.permission || hasPermission(item.permission)
  );

  return (
    <div className="w-64 bg-gray-900 text-white min-h-screen flex flex-col">
      <div className="p-6 border-b border-gray-800">
        <h1 className="text-xl font-bold">Aify ERP</h1>
        <p className="text-sm text-gray-400 mt-1">v2.0.0</p>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                isActive
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800'
              }`}
            >
              <Icon className="h-5 w-5" />
              <span>{item.name}</span>
            </Link>
          );
        })}
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

