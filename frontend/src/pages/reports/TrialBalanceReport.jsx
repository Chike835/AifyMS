import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

const TrialBalanceReport = ({ asOfDate, selectedBranch, formatCurrency, formatDate }) => {
    const { hasPermission } = useAuth();

    const { data: trialBalanceData, isLoading: trialBalanceLoading } = useQuery({
        queryKey: ['trialBalanceReport', asOfDate, selectedBranch],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (asOfDate) params.append('as_of_date', asOfDate);
            if (selectedBranch) params.append('branch_id', selectedBranch);
            const response = await api.get(`/reports/trial-balance?${params.toString()}`);
            return response.data;
        },
        enabled: hasPermission('report_view_financial')
    });

    if (trialBalanceLoading) return <div className="text-center py-12">Loading trial balance...</div>;
    if (!trialBalanceData) return <div className="text-center py-12 text-gray-500">No data available</div>;

    const { debits, credits, total_debits, total_credits, difference } = trialBalanceData;

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
                <div className="mb-4">
                    <h3 className="text-lg font-semibold">Trial Balance</h3>
                    <p className="text-sm text-gray-600">As of {formatDate(trialBalanceData.as_of_date)}</p>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Account</th>
                                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Debit</th>
                                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Credit</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {debits.map((item, idx) => (
                                <tr key={`debit-${idx}`} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 text-sm">{item.account}</td>
                                    <td className="px-4 py-3 text-sm text-right font-medium">{formatCurrency(item.amount)}</td>
                                    <td className="px-4 py-3 text-sm text-right">—</td>
                                </tr>
                            ))}
                            {credits.map((item, idx) => (
                                <tr key={`credit-${idx}`} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 text-sm">{item.account}</td>
                                    <td className="px-4 py-3 text-sm text-right">—</td>
                                    <td className="px-4 py-3 text-sm text-right font-medium">{formatCurrency(item.amount)}</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot className="bg-gray-50">
                            <tr className="font-semibold">
                                <td className="px-4 py-3 text-sm">Total</td>
                                <td className="px-4 py-3 text-sm text-right">{formatCurrency(total_debits)}</td>
                                <td className="px-4 py-3 text-sm text-right">{formatCurrency(total_credits)}</td>
                            </tr>
                            {Math.abs(difference) > 0.01 && (
                                <tr className="bg-yellow-50">
                                    <td className="px-4 py-3 text-sm font-medium text-yellow-800">Difference</td>
                                    <td colSpan="2" className="px-4 py-3 text-sm text-right font-medium text-yellow-800">
                                        {formatCurrency(difference)}
                                    </td>
                                </tr>
                            )}
                        </tfoot>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default TrialBalanceReport;
