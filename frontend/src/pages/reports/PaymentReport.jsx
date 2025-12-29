import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

const PaymentReport = ({ startDate, endDate, selectedBranch, formatCurrency }) => {
    const { hasPermission } = useAuth();

    // Note: Payment Report API does not seem to support branch_id in original code, but logic suggests it might be useful.
    // Original code: const { data: paymentData... } = useQuery... api.get(`/reports/payments?${params.toString()}`);
    // and params include startDate, endDate. No branch_id in original params logic for this report.
    // I will check original code. 
    // Original: if (startDate) params.append('start_date', startDate); if (endDate)...
    // No branch_id.

    const { data: paymentData, isLoading: paymentLoading } = useQuery({
        queryKey: ['paymentReport', startDate, endDate], // No branch in key
        queryFn: async () => {
            const params = new URLSearchParams();
            if (startDate) params.append('start_date', startDate);
            if (endDate) params.append('end_date', endDate);
            const response = await api.get(`/reports/payments?${params.toString()}`);
            return response.data;
        },
        enabled: hasPermission('report_view_financial')
    });

    if (paymentLoading) return <div className="text-center py-12">Loading payment report...</div>;
    if (!paymentData) return <div className="text-center py-12 text-gray-500">No data available</div>;

    const { summary, by_method } = paymentData;

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-lg shadow">
                    <div className="text-sm text-gray-600">Confirmed</div>
                    <div className="text-2xl font-bold text-green-600">{formatCurrency(summary?.confirmed)}</div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow">
                    <div className="text-sm text-gray-600">Pending</div>
                    <div className="text-2xl font-bold text-yellow-600">{formatCurrency(summary?.pending)}</div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow">
                    <div className="text-sm text-gray-600">Total</div>
                    <div className="text-2xl font-bold text-primary-600">{formatCurrency(summary?.total)}</div>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow">
                <div className="p-4 border-b flex justify-between items-center">
                    <h3 className="text-lg font-semibold">Payments by Method</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Method</th>
                                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Total Amount</th>
                                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Count</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {by_method?.map((item, idx) => (
                                <tr key={idx} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 text-sm capitalize">{item.method || 'N/A'}</td>
                                    <td className="px-4 py-3 text-sm text-right font-medium">{formatCurrency(item.total_amount)}</td>
                                    <td className="px-4 py-3 text-sm text-right">{item.count || 0}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default PaymentReport;
