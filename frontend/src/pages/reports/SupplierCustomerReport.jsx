import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

const SupplierCustomerReport = ({ startDate, endDate, selectedBranch, formatCurrency }) => {
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
        enabled: hasPermission('report_view_sales')
    });

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold mb-4">Customer Summary</h2>
                {customerLoading ? (
                    <div className="text-center py-12">Loading...</div>
                ) : customerData ? (
                    <div>
                        <p className="text-sm text-gray-600 mb-4">Total Outstanding: {formatCurrency(customerData.outstanding?.total)}</p>
                        {customerData.top_customers && customerData.top_customers.length > 0 && (
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Revenue</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Orders</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {customerData.top_customers.slice(0, 10).map((item, idx) => (
                                        <tr key={idx}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm">{item.customer?.name}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-right">{formatCurrency(item.total_revenue)}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-right">{item.order_count}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                ) : (
                    <div className="text-center py-12 text-gray-500">No data available</div>
                )}
            </div>
            <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold mb-4">Supplier Summary</h2>
                {purchaseLoading ? (
                    <div className="text-center py-12">Loading...</div>
                ) : purchaseData ? (
                    <div>
                        {purchaseData.top_suppliers && purchaseData.top_suppliers.length > 0 && (
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Supplier</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Purchases</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Orders</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {purchaseData.top_suppliers.slice(0, 10).map((item, idx) => (
                                        <tr key={idx}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm">{item.supplier?.name}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-right">{formatCurrency(item.total_amount)}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-right">{item.order_count}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                ) : (
                    <div className="text-center py-12 text-gray-500">No data available</div>
                )}
            </div>
        </div>
    );
};

export default SupplierCustomerReport;
