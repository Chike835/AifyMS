import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

const CustomerReport = ({ startDate, endDate, selectedBranch, formatCurrency }) => {
    const { hasPermission } = useAuth();

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
        enabled: hasPermission('report_view_sales')
    });

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

export default CustomerReport;
