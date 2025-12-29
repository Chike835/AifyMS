import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

const CashFlowReport = ({ startDate, endDate, selectedBranch, formatCurrency, formatDate }) => {
    const { hasPermission } = useAuth();

    const { data: cashFlowData, isLoading: cashFlowLoading } = useQuery({
        queryKey: ['cashFlowReport', startDate, endDate, selectedBranch],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (startDate) params.append('start_date', startDate);
            if (endDate) params.append('end_date', endDate);
            if (selectedBranch) params.append('branch_id', selectedBranch);
            const response = await api.get(`/reports/cash-flow?${params.toString()}`);
            return response.data;
        },
        enabled: hasPermission('report_view_financial')
    });

    if (cashFlowLoading) return <div className="text-center py-12">Loading cash flow statement...</div>;
    if (!cashFlowData) return <div className="text-center py-12 text-gray-500">No data available</div>;

    const { operating_activities, investing_activities, financing_activities, net_increase_in_cash } = cashFlowData;

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
                <div className="mb-4">
                    <h3 className="text-lg font-semibold">Cash Flow Statement</h3>
                    <p className="text-sm text-gray-600">
                        {formatDate(startDate)} to {formatDate(endDate)}
                    </p>
                </div>

                <div className="space-y-6">
                    {/* Operating Activities */}
                    <div>
                        <h4 className="font-semibold text-gray-900 mb-3">Operating Activities</h4>
                        <div className="pl-4 space-y-2">
                            <div className="flex justify-between">
                                <span>Cash from Sales</span>
                                <span>{formatCurrency(operating_activities?.cash_from_sales || 0)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Cash from Transfers</span>
                                <span>{formatCurrency(operating_activities?.cash_from_transfers || 0)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Cash Paid for Purchases</span>
                                <span className="text-red-600">({formatCurrency(Math.abs(operating_activities?.cash_paid_purchases || 0))})</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Cash Paid for Expenses</span>
                                <span className="text-red-600">({formatCurrency(Math.abs(operating_activities?.cash_paid_expenses || 0))})</span>
                            </div>
                            <div className="flex justify-between font-semibold border-t pt-2 mt-2">
                                <span>Net Cash from Operating</span>
                                <span>{formatCurrency(operating_activities?.net_cash_flow || 0)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Investing Activities */}
                    <div>
                        <h4 className="font-semibold text-gray-900 mb-3">Investing Activities</h4>
                        <div className="pl-4 space-y-2">
                            <div className="flex justify-between">
                                <span>Net Cash from Investing</span>
                                <span>{formatCurrency(investing_activities?.net_cash_flow || 0)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Financing Activities */}
                    <div>
                        <h4 className="font-semibold text-gray-900 mb-3">Financing Activities</h4>
                        <div className="pl-4 space-y-2">
                            <div className="flex justify-between">
                                <span>Net Cash from Financing</span>
                                <span>{formatCurrency(financing_activities?.net_cash_flow || 0)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Net Cash Flow */}
                    <div className="flex justify-between font-bold text-lg border-t-2 pt-4 mt-4">
                        <span>Net Increase (Decrease) in Cash</span>
                        <span>{formatCurrency(net_increase_in_cash || 0)}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CashFlowReport;
