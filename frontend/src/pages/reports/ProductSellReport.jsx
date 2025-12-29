import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

const ProductSellReport = ({ startDate, endDate, selectedBranch, formatCurrency }) => {
    const { hasPermission } = useAuth();

    const { data: productSellData, isLoading: productSellLoading } = useQuery({
        queryKey: ['productSellReport', startDate, endDate, selectedBranch],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (startDate) params.append('start_date', startDate);
            if (endDate) params.append('end_date', endDate);
            if (selectedBranch) params.append('branch_id', selectedBranch);
            const response = await api.get(`/reports/product-sell?${params.toString()}`);
            return response.data;
        },
        enabled: hasPermission('report_view_sales')
    });

    if (productSellLoading) return <div className="text-center py-12">Loading product sell report...</div>;
    if (!productSellData) return <div className="text-center py-12 text-gray-500">No data available</div>;

    return (
        <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">Product Sell Report</h2>
            {productSellData.products && productSellData.products.length > 0 ? (
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Quantity Sold</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Revenue</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Avg Price</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Sales Count</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {productSellData.products.map((item, idx) => (
                            <tr key={idx}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm">{item.product?.name} ({item.product?.sku})</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-right">{item.total_quantity?.toFixed(3)} {item.product?.base_unit}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium">{formatCurrency(item.total_revenue)}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-right">{formatCurrency(item.avg_price)}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-right">{item.sale_count}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            ) : (
                <div className="text-center py-12 text-gray-500">No products found</div>
            )}
        </div>
    );
};

export default ProductSellReport;
