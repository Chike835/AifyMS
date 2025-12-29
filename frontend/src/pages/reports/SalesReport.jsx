import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../utils/api';
import RevenueChart from '../../components/reports/RevenueChart';
import { useAuth } from '../../context/AuthContext';

const SalesReport = ({ startDate, endDate, selectedBranch, formatCurrency }) => {
    const { hasPermission } = useAuth();

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
        enabled: hasPermission('report_view_sales')
    });

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

export default SalesReport;
