import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

const SalesRepresentativeReport = ({ startDate, endDate, selectedBranch, formatCurrency }) => {
    const { hasPermission } = useAuth();

    const { data: salesRepresentativeData, isLoading: salesRepresentativeLoading } = useQuery({
        queryKey: ['salesRepresentativeReport', startDate, endDate, selectedBranch],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (startDate) params.append('start_date', startDate);
            if (endDate) params.append('end_date', endDate);
            if (selectedBranch) params.append('branch_id', selectedBranch);
            const response = await api.get(`/reports/sales-representative?${params.toString()}`);
            return response.data;
        },
        enabled: hasPermission('report_view_sales')
    });

    if (salesRepresentativeLoading) return <div className="text-center py-12">Loading sales representative report...</div>;
    if (!salesRepresentativeData) return <div className="text-center py-12 text-gray-500">No data available</div>;

    return (
        <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">Sales Representative Report</h2>
            <div className="mb-4 grid grid-cols-3 gap-4">
                <div>
                    <p className="text-sm text-gray-600">Total Sales</p>
                    <p className="text-lg font-semibold">{formatCurrency(salesRepresentativeData.summary?.total_sales)}</p>
                </div>
                <div>
                    <p className="text-sm text-gray-600">Total Commission</p>
                    <p className="text-lg font-semibold text-green-600">{formatCurrency(salesRepresentativeData.summary?.total_commission)}</p>
                </div>
                <div>
                    <p className="text-sm text-gray-600">Agents</p>
                    <p className="text-lg font-semibold">{salesRepresentativeData.summary?.agent_count}</p>
                </div>
            </div>
            {salesRepresentativeData.by_agent && salesRepresentativeData.by_agent.length > 0 && (
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Agent</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Sales</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Commission</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Sales Count</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {salesRepresentativeData.by_agent.map((agent, idx) => (
                            <tr key={idx}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm">{agent.agent?.name}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium">{formatCurrency(agent.total_sales)}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-green-600">{formatCurrency(agent.total_commission)}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-right">{agent.sales_count}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
};

export default SalesRepresentativeReport;
