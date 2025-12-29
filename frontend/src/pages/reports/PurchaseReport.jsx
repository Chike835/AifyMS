import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

const PurchaseReport = ({ startDate, endDate, selectedBranch, formatCurrency }) => {
    const { hasPermission } = useAuth();

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
        enabled: hasPermission('report_view_sales') // Using 'report_view_sales' as in original file, likely meant for general report view or similar
    });

    if (purchaseLoading) return <div className="text-center py-12">Loading purchase report...</div>;
    if (!purchaseData) return <div className="text-center py-12 text-gray-500">No data available</div>;

    const { summary, top_suppliers } = purchaseData;

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

export default PurchaseReport;
