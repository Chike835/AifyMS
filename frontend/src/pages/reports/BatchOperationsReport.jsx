import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { Download } from 'lucide-react';

const BatchOperationsReport = ({ startDate, endDate, selectedBranch, onExportExcel }) => {
    const { hasPermission } = useAuth();

    const { data: batchOperationsData, isLoading: batchOperationsLoading } = useQuery({
        queryKey: ['batchOperationsReport', startDate, endDate, selectedBranch],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (startDate) params.append('start_date', startDate);
            if (endDate) params.append('end_date', endDate);
            if (selectedBranch) params.append('branch_id', selectedBranch);
            const response = await api.get(`/reports/batch-operations?${params.toString()}`);
            return response.data;
        },
        enabled: hasPermission('report_view_stock_value')
    });

    if (batchOperationsLoading) return <div className="text-center py-12">Loading batch operations...</div>;
    if (!batchOperationsData || !batchOperationsData.logs) return <div className="text-center py-12 text-gray-500">No data available</div>;

    const logs = batchOperationsData.logs;

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-lg shadow">
                <div className="p-4 border-b flex justify-between items-center">
                    <h3 className="text-lg font-semibold">Batch Operations History</h3>
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
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Date/Time</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">User</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Branch</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Action</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Description</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {logs.map((log) => (
                                <tr key={log.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 text-sm text-gray-900">
                                        {new Date(log.timestamp).toLocaleString('en-NG')}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-900">
                                        {log.user ? `${log.user.first_name} ${log.user.last_name}` : 'System'}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-900">{log.branch?.name || 'All Branches'}</td>
                                    <td className="px-4 py-3 text-sm">
                                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${log.action_type === 'CREATE' ? 'bg-green-100 text-green-800' :
                                            log.action_type === 'DELETE' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                                            }`}>
                                            {log.action_type}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-900">{log.description}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default BatchOperationsReport;
