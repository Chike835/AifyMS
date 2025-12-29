import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

const SellPaymentReport = ({ startDate, endDate, selectedBranch, formatCurrency, formatDate }) => {
    const { hasPermission } = useAuth();

    const { data: sellPaymentData, isLoading: sellPaymentLoading } = useQuery({
        queryKey: ['sellPaymentReport', startDate, endDate, selectedBranch],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (startDate) params.append('start_date', startDate);
            if (endDate) params.append('end_date', endDate);
            if (selectedBranch) params.append('branch_id', selectedBranch);
            const response = await api.get(`/reports/sell-payment?${params.toString()}`);
            return response.data;
        },
        enabled: hasPermission('report_view_financial')
    });

    if (sellPaymentLoading) return <div className="text-center py-12">Loading sell payment report...</div>;
    if (!sellPaymentData) return <div className="text-center py-12 text-gray-500">No data available</div>;

    return (
        <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">Sell Payment Report</h2>
            <div className="mb-4 grid grid-cols-5 gap-4">
                <div>
                    <p className="text-sm text-gray-600">Total Sales</p>
                    <p className="text-lg font-semibold">{formatCurrency(sellPaymentData.summary?.total_sales)}</p>
                </div>
                <div>
                    <p className="text-sm text-gray-600">Paid</p>
                    <p className="text-lg font-semibold text-green-600">{formatCurrency(sellPaymentData.summary?.paid)}</p>
                </div>
                <div>
                    <p className="text-sm text-gray-600">Unpaid</p>
                    <p className="text-lg font-semibold text-red-600">{formatCurrency(sellPaymentData.summary?.unpaid)}</p>
                </div>
                <div>
                    <p className="text-sm text-gray-600">Partial</p>
                    <p className="text-lg font-semibold text-yellow-600">{formatCurrency(sellPaymentData.summary?.partial)}</p>
                </div>
                <div>
                    <p className="text-sm text-gray-600">Count</p>
                    <p className="text-lg font-semibold">{sellPaymentData.summary?.sales_count}</p>
                </div>
            </div>
            {sellPaymentData.sales && sellPaymentData.sales.length > 0 && (
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoice #</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {sellPaymentData.sales.slice(0, 100).map((sale) => (
                            <tr key={sale.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm">{sale.invoice_number}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm">{sale.customer?.name || 'Walk-in'}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-right">{formatCurrency(sale.total_amount)}</td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${sale.payment_status === 'paid' ? 'bg-green-100 text-green-800' :
                                        sale.payment_status === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                                            'bg-red-100 text-red-800'
                                        }`}>
                                        {sale.payment_status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm">{formatDate(sale.created_at)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
};

export default SellPaymentReport;
