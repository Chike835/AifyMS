import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

const RegisterReport = ({ startDate, endDate, selectedBranch, formatCurrency, formatDate }) => {
    const { hasPermission } = useAuth();

    const { data: registerData, isLoading: registerLoading } = useQuery({
        queryKey: ['registerReport', startDate, endDate, selectedBranch],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (startDate) params.append('start_date', startDate);
            if (endDate) params.append('end_date', endDate);
            const response = await api.get(`/reports/register?${params.toString()}`);
            return response.data;
        },
        enabled: hasPermission('report_view_register')
    });

    if (registerLoading) return <div className="text-center py-12">Loading register report...</div>;
    if (!registerData) return <div className="text-center py-12 text-gray-500">No data available</div>;

    return (
        <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">Register Report</h2>
            {registerData.daily_totals && registerData.daily_totals.length > 0 && (
                <table className="min-w-full divide-y divide-gray-200 mb-6">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Amount</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Transactions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {registerData.daily_totals.map((day, idx) => (
                            <tr key={idx}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm">{formatDate(day.date)}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium">{formatCurrency(day.total_amount)}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-right">{day.transaction_count}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
            {registerData.by_method && registerData.by_method.length > 0 && (
                <div>
                    <h3 className="text-lg font-semibold mb-2">By Payment Method</h3>
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Method</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Count</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {registerData.by_method.map((item, idx) => (
                                <tr key={idx}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">{formatDate(item.date)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm capitalize">{item.method}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium">{formatCurrency(item.total_amount)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right">{item.transaction_count}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default RegisterReport;
