import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

const StockAdjustmentReport = ({ startDate, endDate, selectedBranch, formatDate }) => {
    const { hasPermission } = useAuth();

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
        enabled: hasPermission('report_view_stock_value')
    });

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

export default StockAdjustmentReport;
