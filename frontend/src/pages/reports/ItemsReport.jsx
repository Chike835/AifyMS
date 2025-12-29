import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

const ItemsReport = ({ startDate, endDate, selectedBranch, formatCurrency, formatDate }) => {
    const { hasPermission } = useAuth();

    const { data: itemsData, isLoading: itemsLoading } = useQuery({
        queryKey: ['itemsReport', startDate, endDate, selectedBranch],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (startDate) params.append('start_date', startDate);
            if (endDate) params.append('end_date', endDate);
            if (selectedBranch) params.append('branch_id', selectedBranch);
            const response = await api.get(`/reports/items?${params.toString()}`);
            return response.data;
        },
        enabled: hasPermission('report_view_sales')
    });

    if (itemsLoading) return <div className="text-center py-12">Loading items report...</div>;
    if (!itemsData) return <div className="text-center py-12 text-gray-500">No data available</div>;

    return (
        <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">Items Report</h2>
            {itemsData.items && itemsData.items.length > 0 ? (
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoice</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Quantity</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Unit Price</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Subtotal</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {itemsData.items.slice(0, 200).map((item) => (
                                <tr key={item.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">{item.product?.name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">{item.order?.invoice_number}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">{item.order?.customer?.name || 'Walk-in'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right">{item.quantity?.toFixed(3)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right">{formatCurrency(item.unit_price)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium">{formatCurrency(item.subtotal)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">{formatDate(item.created_at)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="text-center py-12 text-gray-500">No items found</div>
            )}
        </div>
    );
};

export default ItemsReport;
