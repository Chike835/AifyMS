import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import ProfitChart from '../../components/reports/ProfitChart';

const ProfitLossReport = ({ startDate, endDate, selectedBranch, formatCurrency }) => {
    const { hasPermission } = useAuth();

    const { data: profitLossData, isLoading: profitLossLoading } = useQuery({
        queryKey: ['profitLossReport', startDate, endDate, selectedBranch],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (startDate) params.append('start_date', startDate);
            if (endDate) params.append('end_date', endDate);
            if (selectedBranch) params.append('branch_id', selectedBranch);
            const response = await api.get(`/reports/profit-loss?${params.toString()}`);
            return response.data;
        },
        enabled: hasPermission('report_view_financial')
    });

    if (profitLossLoading) return <div className="text-center py-12">Loading profit & loss report...</div>;
    if (!profitLossData) return <div className="text-center py-12 text-gray-500">No data available</div>;

    const { revenue, cost_of_goods_sold, gross_profit, gross_margin, operating_expenses, net_profit, net_margin } = profitLossData;

    return (
        <div className="space-y-6">
            {/* Profit Distribution Chart */}
            <ProfitChart
                data={{
                    'Revenue': revenue || 0,
                    'COGS': cost_of_goods_sold || 0,
                    'Gross Profit': gross_profit || 0,
                    'Operating Expenses': operating_expenses || 0,
                    'Net Profit': net_profit || 0
                }}
                title="Profit & Loss Distribution"
            />

            <div className="bg-white rounded-lg shadow p-6">
                <div className="p-4 border-b mb-4">
                    <h3 className="text-lg font-semibold">Profit & Loss Statement</h3>
                </div>
                <div className="space-y-4">
                    <div className="flex justify-between items-center py-2 border-b">
                        <span className="text-gray-700 font-medium">Revenue</span>
                        <span className="text-lg font-bold text-primary-600">{formatCurrency(revenue)}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b">
                        <span className="text-gray-700">Cost of Goods Sold</span>
                        <span className="text-gray-900">{formatCurrency(cost_of_goods_sold)}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b-2 border-gray-300">
                        <span className="text-gray-700 font-medium">Gross Profit</span>
                        <span className="text-lg font-bold text-green-600">{formatCurrency(gross_profit)}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b">
                        <span className="text-gray-700">Gross Margin</span>
                        <span className="text-gray-900">{gross_margin?.toFixed(2)}%</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b">
                        <span className="text-gray-700">Operating Expenses</span>
                        <span className="text-gray-900">{formatCurrency(operating_expenses)}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b-2 border-gray-300">
                        <span className="text-gray-700 font-medium">Net Profit</span>
                        <span className={`text-lg font-bold ${net_profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatCurrency(net_profit)}
                        </span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                        <span className="text-gray-700">Net Margin</span>
                        <span className={`font-medium ${net_margin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {net_margin?.toFixed(2)}%
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProfitLossReport;
