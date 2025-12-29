import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

const CustomerGroupsReport = ({ startDate, endDate, selectedBranch, formatCurrency }) => {
    const { hasPermission } = useAuth();

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
        enabled: hasPermission('report_view_sales')
    });

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

export default CustomerGroupsReport;
