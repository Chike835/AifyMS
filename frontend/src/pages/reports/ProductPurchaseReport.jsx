import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

const ProductPurchaseReport = ({ startDate, endDate, selectedBranch, formatCurrency, formatDate }) => {
    const { hasPermission } = useAuth();

    const { data: productPurchaseData, isLoading: productPurchaseLoading } = useQuery({
        queryKey: ['productPurchaseReport', startDate, endDate, selectedBranch],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (startDate) params.append('start_date', startDate);
            if (endDate) params.append('end_date', endDate);
            if (selectedBranch) params.append('branch_id', selectedBranch);
            const response = await api.get(`/reports/product-purchase?${params.toString()}`);
            return response.data;
        },
        enabled: hasPermission('report_view_sales')
    });

    if (productPurchaseLoading) return <div className="text-center py-12">Loading product purchase report...</div>;
    if (!productPurchaseData) return <div className="text-center py-12 text-gray-500">No data available</div>;

    return (
        <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">Product Purchase Report</h2>
            {productPurchaseData.items && productPurchaseData.items.length > 0 ? (
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Purchase #</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Supplier</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Quantity</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Unit Cost</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Subtotal</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {productPurchaseData.items.slice(0, 200).map((item) => (
                                <tr key={item.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">{item.product?.name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">{item.purchase?.purchase_number}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">{item.purchase?.supplier?.name || 'Unknown'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right">{item.quantity?.toFixed(3)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right">{formatCurrency(item.unit_cost)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium">{formatCurrency(item.subtotal)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">{formatDate(item.created_at)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="text-center py-12 text-gray-500">No purchases found</div>
            )}
        </div>
    );
};

export default ProductPurchaseReport;
