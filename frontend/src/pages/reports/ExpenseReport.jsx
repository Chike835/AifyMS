import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import ExpenseChart from '../../components/reports/ExpenseChart';
import { Download } from 'lucide-react';

const ExpenseReport = ({ startDate, endDate, selectedBranch, formatCurrency, onExportExcel }) => {
    const { hasPermission } = useAuth();

    const { data: expenseData, isLoading: expenseLoading } = useQuery({
        queryKey: ['expenseReport', startDate, endDate, selectedBranch],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (startDate) params.append('start_date', startDate);
            if (endDate) params.append('end_date', endDate);
            if (selectedBranch) params.append('branch_id', selectedBranch);
            const response = await api.get(`/reports/expenses?${params.toString()}`);
            return response.data;
        },
        enabled: hasPermission('report_view_financial')
    });

    if (expenseLoading) return <div className="text-center py-12">Loading expense report...</div>;
    if (!expenseData) return <div className="text-center py-12 text-gray-500">No data available</div>;

    const { summary, by_category } = expenseData;

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-lg shadow">
                    <div className="text-sm text-gray-600">Total Expenses</div>
                    <div className="text-2xl font-bold text-red-600">{formatCurrency(summary?.total_expenses)}</div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow">
                    <div className="text-sm text-gray-600">Expense Count</div>
                    <div className="text-2xl font-bold">{summary?.expense_count || 0}</div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow">
                    <div className="text-sm text-gray-600">Average Expense</div>
                    <div className="text-2xl font-bold">{formatCurrency(summary?.average_expense)}</div>
                </div>
            </div>

            {/* Expenses by Category Chart */}
            {by_category && by_category.length > 0 && (
                <div className="mb-6">
                    <ExpenseChart
                        data={by_category}
                        title="Expenses by Category"
                    />
                </div>
            )}

            <div className="bg-white rounded-lg shadow">
                <div className="p-4 border-b flex justify-between items-center">
                    <h3 className="text-lg font-semibold">Expenses by Category</h3>
                    <button
                        onClick={onExportExcel}
                        className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700"
                    >
                        <Download className="h-4 w-4" />
                        <span>Export Excel</span>
                    </button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Category</th>
                                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Total Amount</th>
                                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Count</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {by_category?.map((item, idx) => (
                                <tr key={idx} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 text-sm">{item.category?.name || 'N/A'}</td>
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

export default ExpenseReport;
