import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

const InventoryReport = ({ selectedBranch, formatCurrency }) => {
    const { hasPermission } = useAuth();

    const { data: inventoryData, isLoading: inventoryLoading } = useQuery({
        queryKey: ['inventoryReport', selectedBranch],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (selectedBranch) params.append('branch_id', selectedBranch);
            const response = await api.get(`/reports/inventory?${params.toString()}`);
            return response.data;
        },
        enabled: hasPermission('report_view_stock_value')
    });

    if (inventoryLoading) return <div className="text-center py-12">Loading inventory report...</div>;
    if (!inventoryData) return <div className="text-center py-12 text-gray-500">No data available</div>;

    const { summary, by_product } = inventoryData;

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-lg shadow">
                    <div className="text-sm text-gray-600">Total Cost Value</div>
                    <div className="text-2xl font-bold text-primary-600">{formatCurrency(summary?.total_cost_value)}</div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow">
                    <div className="text-sm text-gray-600">Total Sale Value</div>
                    <div className="text-2xl font-bold text-green-600">{formatCurrency(summary?.total_sale_value)}</div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow">
                    <div className="text-sm text-gray-600">Potential Profit</div>
                    <div className="text-2xl font-bold text-blue-600">{formatCurrency(summary?.potential_profit)}</div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow">
                    <div className="text-sm text-gray-600">Total Instances</div>
                    <div className="text-2xl font-bold">{summary?.total_instances || 0}</div>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow">
                <div className="p-4 border-b flex justify-between items-center">
                    <h3 className="text-lg font-semibold">Inventory by Product</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Product</th>
                                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Quantity</th>
                                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Cost Value</th>
                                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Sale Value</th>
                                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Instances</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {by_product?.slice(0, 20).map((item, idx) => (
                                <tr key={idx} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 text-sm">{item.product?.name || 'N/A'}</td>
                                    <td className="px-4 py-3 text-sm text-right">{item.total_quantity?.toFixed(2) || 0}</td>
                                    <td className="px-4 py-3 text-sm text-right">{formatCurrency(item.cost_value)}</td>
                                    <td className="px-4 py-3 text-sm text-right">{formatCurrency(item.sale_value)}</td>
                                    <td className="px-4 py-3 text-sm text-right">{item.instance_count || 0}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default InventoryReport;
