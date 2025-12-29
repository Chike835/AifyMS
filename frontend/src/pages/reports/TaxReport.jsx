import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

const TaxReport = ({ startDate, endDate, selectedBranch, formatCurrency }) => {
    const { hasPermission } = useAuth();

    const { data: taxData, isLoading: taxLoading } = useQuery({
        queryKey: ['taxReport', startDate, endDate, selectedBranch],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (startDate) params.append('start_date', startDate);
            if (endDate) params.append('end_date', endDate);
            if (selectedBranch) params.append('branch_id', selectedBranch);
            const response = await api.get(`/reports/tax?${params.toString()}`);
            return response.data;
        },
        enabled: hasPermission('report_view_financial')
    });

    if (taxLoading) return <div className="text-center py-12">Loading tax report...</div>;
    if (!taxData) return <div className="text-center py-12 text-gray-500">No data available</div>;

    return (
        <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">Tax Report</h2>
            <div className="mb-4">
                <p className="text-sm text-gray-600">Total Sales: {formatCurrency(taxData.summary?.total_sales)}</p>
                <p className="text-sm text-gray-600">Total Tax: {formatCurrency(taxData.summary?.total_tax)}</p>
                <p className="text-sm text-gray-600">Tax Percentage: {taxData.summary?.tax_percentage?.toFixed(2)}%</p>
            </div>
            {taxData.by_branch && taxData.by_branch.length > 0 && (
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Branch</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Sales</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Tax</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Count</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {taxData.by_branch.map((item, idx) => (
                            <tr key={idx}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm">{item.branch}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-right">{formatCurrency(item.sales)}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-right">{formatCurrency(item.tax)}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-right">{item.count}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
};

export default TaxReport;
