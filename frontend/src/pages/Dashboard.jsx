import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { CreditCard, Package, TrendingUp, Users } from 'lucide-react';

const Dashboard = () => {
  const { user } = useAuth();

  // Fetch pending payments count
  const { data: pendingPayments } = useQuery({
    queryKey: ['pendingPayments'],
    queryFn: async () => {
      const response = await api.get('/payments/pending');
      return response.data.payments || [];
    },
    enabled: user?.permissions?.includes('payment_confirm'),
  });

  const stats = [
    {
      name: 'Pending Payments',
      value: pendingPayments?.length || 0,
      icon: CreditCard,
      color: 'bg-yellow-500',
    },
    {
      name: 'Total Products',
      value: '—',
      icon: Package,
      color: 'bg-blue-500',
    },
    {
      name: 'Sales Today',
      value: '—',
      icon: TrendingUp,
      color: 'bg-green-500',
    },
    {
      name: 'Active Users',
      value: '—',
      icon: Users,
      color: 'bg-purple-500',
    },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome, {user?.full_name}
        </h1>
        <p className="text-gray-600 mt-2">
          {user?.role_name} {user?.branch && `• ${user.branch.name}`}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.name}
              className="bg-white rounded-lg shadow p-6 border border-gray-200"
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

      <div className="mt-8 bg-white rounded-lg shadow p-6 border border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {user?.permissions?.includes('pos_access') && (
            <a
              href="/pos"
              className="p-4 border border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors"
            >
              <h3 className="font-medium text-gray-900">Create Sale</h3>
              <p className="text-sm text-gray-600 mt-1">Start a new POS transaction</p>
            </a>
          )}
          {user?.permissions?.includes('payment_confirm') && (
            <a
              href="/payments"
              className="p-4 border border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors"
            >
              <h3 className="font-medium text-gray-900">Review Payments</h3>
              <p className="text-sm text-gray-600 mt-1">
                {pendingPayments?.length || 0} pending confirmation
              </p>
            </a>
          )}
          {user?.permissions?.includes('product_view') && (
            <a
              href="/inventory"
              className="p-4 border border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors"
            >
              <h3 className="font-medium text-gray-900">Manage Inventory</h3>
              <p className="text-sm text-gray-600 mt-1">View and register stock</p>
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

