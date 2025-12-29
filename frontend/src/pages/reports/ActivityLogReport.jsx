import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../utils/api';
import DateFilterDropdown from '../../components/common/DateFilterDropdown';
import { useAuth } from '../../context/AuthContext';
import { FileText } from 'lucide-react';

const ActivityLogReport = ({ startDate, endDate, setStartDate, setEndDate, selectedBranch, branchesData }) => {
    const { hasPermission } = useAuth();
    const [activityLogActionType, setActivityLogActionType] = useState('');
    const [activityLogModule, setActivityLogModule] = useState('');

    const { data: activityLogData, isLoading: activityLogLoading } = useQuery({
        queryKey: ['activityLogReport', startDate, endDate, selectedBranch, activityLogActionType, activityLogModule],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (startDate) params.append('start_date', startDate);
            if (endDate) params.append('end_date', endDate);
            if (selectedBranch) params.append('branch_id', selectedBranch);
            if (activityLogActionType) params.append('action_type', activityLogActionType);
            if (activityLogModule) params.append('module', activityLogModule);
            const response = await api.get(`/reports/activity-log?${params.toString()}`);
            return response.data;
        },
        enabled: hasPermission('report_view_sales')
    });

    if (activityLogLoading) return <div className="text-center py-12">Loading activity log...</div>;
    if (!activityLogData) return <div className="text-center py-12 text-gray-500">No data available</div>;

    const formatDateTime = (dateString) => {
        if (!dateString) return '—';
        return new Date(dateString).toLocaleString('en-NG', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    };

    const actionTypes = ['LOGIN', 'CREATE', 'UPDATE', 'DELETE', 'PRINT', 'CONFIRM', 'VOID'];
    const modules = ['auth', 'sales', 'purchases', 'payments', 'customers', 'suppliers', 'inventory', 'products', 'users', 'settings'];

    return (
        <div className="space-y-6">
            {/* Filters */}
            <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
                        <DateFilterDropdown
                            onDateChange={(range) => {
                                if (range.startDate) setStartDate(range.startDate);
                                if (range.endDate) setEndDate(range.endDate);
                            }}
                            initialPreset="this-month"
                            showTimeRange={false}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Branch</label>
                        <select
                            value={selectedBranch}
                            onChange={(e) => { }}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                            disabled
                        >
                            <option value="">All Branches</option>
                            {branchesData?.map((branch) => (
                                <option key={branch.id} value={branch.id}>
                                    {branch.name}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Action Type</label>
                        <select
                            value={activityLogActionType}
                            onChange={(e) => setActivityLogActionType(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                        >
                            <option value="">All Actions</option>
                            {actionTypes.map((type) => (
                                <option key={type} value={type}>
                                    {type}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Module</label>
                        <select
                            value={activityLogModule}
                            onChange={(e) => setActivityLogModule(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                        >
                            <option value="">All Modules</option>
                            {modules.map((module) => (
                                <option key={module} value={module}>
                                    {module.charAt(0).toUpperCase() + module.slice(1)}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Activity Log Table */}
            <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
                <div className="p-6 border-b border-gray-200">
                    <h2 className="text-xl font-bold text-gray-900">Activity Log</h2>
                    <p className="text-sm text-gray-600 mt-1">Total Activities: {activityLogData.total_count || 0}</p>
                </div>
                {activityLogData.activities && activityLogData.activities.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Timestamp
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        User
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Action
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Module
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Description
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        IP Address
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Branch
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {activityLogData.activities.map((activity) => (
                                    <tr key={activity.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {formatDateTime(activity.timestamp)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {activity.user?.full_name || '—'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${activity.action_type === 'LOGIN' ? 'bg-blue-100 text-blue-800' :
                                                activity.action_type === 'CREATE' ? 'bg-green-100 text-green-800' :
                                                    activity.action_type === 'UPDATE' ? 'bg-yellow-100 text-yellow-800' :
                                                        activity.action_type === 'DELETE' ? 'bg-red-100 text-red-800' :
                                                            activity.action_type === 'CONFIRM' ? 'bg-purple-100 text-purple-800' :
                                                                'bg-gray-100 text-gray-800'
                                                }`}>
                                                {activity.action_type}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {activity.module}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-900">
                                            {activity.description || '—'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {activity.ip_address || '—'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {activity.branch?.name || '—'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="text-center py-12 text-gray-500">
                        <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                        <p>No activities found for the selected filters</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ActivityLogReport;
