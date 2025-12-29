import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

const BalanceSheetReport = ({ asOfDate, selectedBranch, formatCurrency, formatDate }) => {
    const { hasPermission } = useAuth();

    const { data: balanceSheetData, isLoading: balanceSheetLoading } = useQuery({
        queryKey: ['balanceSheetReport', asOfDate, selectedBranch],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (asOfDate) params.append('as_of_date', asOfDate);
            if (selectedBranch) params.append('branch_id', selectedBranch);
            const response = await api.get(`/reports/balance-sheet?${params.toString()}`);
            return response.data;
        },
        enabled: hasPermission('report_view_financial')
    });

    if (balanceSheetLoading) return <div className="text-center py-12">Loading balance sheet...</div>;
    if (!balanceSheetData) return <div className="text-center py-12 text-gray-500">No data available</div>;

    const { assets, liabilities, equity, total_liabilities_and_equity } = balanceSheetData;

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
                <div className="mb-4">
                    <h3 className="text-lg font-semibold">Balance Sheet</h3>
                    <p className="text-sm text-gray-600">As of {formatDate(balanceSheetData.as_of_date)}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Assets */}
                    <div>
                        <h4 className="font-semibold text-gray-900 mb-3">ASSETS</h4>
                        <div className="space-y-2">
                            <div className="pl-4">
                                <div className="font-medium text-gray-700 mb-2">Current Assets</div>
                                <div className="pl-4 space-y-1 text-sm">
                                    <div className="flex justify-between">
                                        <span>Cash</span>
                                        <span>{formatCurrency(assets.current_assets.cash)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Bank</span>
                                        <span>{formatCurrency(assets.current_assets.bank)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Accounts Receivable</span>
                                        <span>{formatCurrency(assets.current_assets.accounts_receivable)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Inventory</span>
                                        <span>{formatCurrency(assets.current_assets.inventory)}</span>
                                    </div>
                                    <div className="flex justify-between font-semibold border-t pt-1 mt-1">
                                        <span>Total Current Assets</span>
                                        <span>{formatCurrency(assets.current_assets.total)}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="pl-4">
                                <div className="flex justify-between font-medium">
                                    <span>Fixed Assets</span>
                                    <span>{formatCurrency(assets.fixed_assets)}</span>
                                </div>
                            </div>
                            <div className="flex justify-between font-bold text-lg border-t pt-2 mt-2">
                                <span>Total Assets</span>
                                <span>{formatCurrency(assets.total)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Liabilities & Equity */}
                    <div>
                        <h4 className="font-semibold text-gray-900 mb-3">LIABILITIES & EQUITY</h4>
                        <div className="space-y-2">
                            <div className="pl-4">
                                <div className="font-medium text-gray-700 mb-2">Current Liabilities</div>
                                <div className="pl-4 space-y-1 text-sm">
                                    <div className="flex justify-between">
                                        <span>Accounts Payable</span>
                                        <span>{formatCurrency(liabilities.current_liabilities.accounts_payable)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Supplier Balances</span>
                                        <span>{formatCurrency(liabilities.current_liabilities.supplier_balances)}</span>
                                    </div>
                                    <div className="flex justify-between font-semibold border-t pt-1 mt-1">
                                        <span>Total Liabilities</span>
                                        <span>{formatCurrency(liabilities.total)}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="pl-4">
                                <div className="font-medium text-gray-700 mb-2">Equity</div>
                                <div className="pl-4 space-y-1 text-sm">
                                    <div className="flex justify-between">
                                        <span>Retained Earnings</span>
                                        <span>{formatCurrency(equity.retained_earnings)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Capital</span>
                                        <span>{formatCurrency(equity.capital)}</span>
                                    </div>
                                    <div className="flex justify-between font-semibold border-t pt-1 mt-1">
                                        <span>Total Equity</span>
                                        <span>{formatCurrency(equity.total)}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex justify-between font-bold text-lg border-t pt-2 mt-2">
                                <span>Total Liabilities & Equity</span>
                                <span>{formatCurrency(total_liabilities_and_equity)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BalanceSheetReport;
