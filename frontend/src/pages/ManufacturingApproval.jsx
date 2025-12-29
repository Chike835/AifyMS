import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import ListToolbar from '../components/common/ListToolbar';
import { Factory, CheckCircle, XCircle, AlertCircle, Eye, ChevronDown, ChevronUp } from 'lucide-react';

const ManufacturingApproval = () => {
    const { hasPermission } = useAuth();
    const queryClient = useQueryClient();
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [limit, setLimit] = useState(25);
    const [expandedOrders, setExpandedOrders] = useState(new Set());

    // Fetch approvals
    const { data, isLoading } = useQuery({
        queryKey: ['manufacturingApprovals'],
        queryFn: async () => {
            const response = await api.get('/sales/manufacturing-approvals');
            return response.data.orders || [];
        },
    });

    // Approve mutation
    const approveMutation = useMutation({
        mutationFn: async (orderId) => {
            const response = await api.put(`/sales/${orderId}/approve-manufacturing`);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['manufacturingApprovals'] });
            queryClient.invalidateQueries({ queryKey: ['productionQueue'] });
            alert('Sale approved for production!');
        },
        onError: (error) => {
            alert(error.response?.data?.error || 'Failed to approve sale');
        },
    });

    // Reject mutation
    const rejectMutation = useMutation({
        mutationFn: async ({ orderId, reason }) => {
            const response = await api.put(`/sales/${orderId}/reject-manufacturing`, { reason });
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['manufacturingApprovals'] });
            setShowRejectModal(false);
            setSelectedOrder(null);
            setRejectionReason('');
            alert('Sale rejected.');
        },
        onError: (error) => {
            alert(error.response?.data?.error || 'Failed to reject sale');
        },
    });

    const handleApprove = (order) => {
        if (window.confirm(`Approve sale ${order.invoice_number} for production?`)) {
            approveMutation.mutate(order.id);
        }
    };

    const handleRejectClick = (order) => {
        setSelectedOrder(order);
        setRejectionReason('');
        setShowRejectModal(true);
    };

    const handleRejectSubmit = (e) => {
        e.preventDefault();
        if (!rejectionReason.trim()) {
            alert('Rejection reason is required');
            return;
        }
        rejectMutation.mutate({
            orderId: selectedOrder.id,
            reason: rejectionReason.trim(),
        });
    };

    const toggleExpand = (orderId) => {
        const newExpanded = new Set(expandedOrders);
        if (newExpanded.has(orderId)) {
            newExpanded.delete(orderId);
        } else {
            newExpanded.add(orderId);
        }
        setExpandedOrders(newExpanded);
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    const orders = data || [];
    const filteredOrders = orders.filter(order =>
        order.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.customer?.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Manufacturing Approvals</h1>
                    <p className="text-sm text-gray-500">Review sales and batch assignments before production</p>
                </div>
            </div>

            <ListToolbar
                limit={limit}
                onLimitChange={setLimit}
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                searchPlaceholder="Search approvals..."
                showColumnVisibility={false}
                showExport={false}
            />

            {filteredOrders.length === 0 ? (
                <div className="bg-white rounded-lg shadow border border-gray-200 p-12 text-center">
                    <Factory className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 text-lg">No pending manufacturing approvals</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredOrders.map((order) => {
                        const isExpanded = expandedOrders.has(order.id);
                        return (
                            <div key={order.id} className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
                                <div className="p-6">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center space-x-4 mb-4">
                                                <h3 className="text-lg font-semibold text-gray-900">
                                                    {order.invoice_number}
                                                </h3>
                                                <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                                                    Pending Approval
                                                </span>
                                            </div>
                                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-gray-600 mb-4">
                                                <div>
                                                    <span className="font-medium">Customer:</span>{' '}
                                                    {order.customer?.name || 'Walk-in'}
                                                </div>
                                                <div>
                                                    <span className="font-medium">Branch:</span> {order.branch?.name}
                                                </div>
                                                <div>
                                                    <span className="font-medium">Total:</span> ₦
                                                    {parseFloat(order.total_amount).toLocaleString()}
                                                </div>
                                                <div>
                                                    <span className="font-medium">Date:</span>{' '}
                                                    {new Date(order.created_at).toLocaleDateString()}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <button
                                                onClick={() => toggleExpand(order.id)}
                                                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                                                title={isExpanded ? "Collapse" : "Expand Details"}
                                            >
                                                {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                                            </button>
                                            {hasPermission('production_update_status') && (
                                                <>
                                                    <button
                                                        onClick={() => handleRejectClick(order)}
                                                        className="flex items-center space-x-1 px-3 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
                                                    >
                                                        <XCircle className="h-4 w-4" />
                                                        <span>Reject</span>
                                                    </button>
                                                    <button
                                                        onClick={() => handleApprove(order)}
                                                        className="flex items-center space-x-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                                                    >
                                                        <CheckCircle className="h-4 w-4" />
                                                        <span>Approve</span>
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {isExpanded && (
                                        <div className="mt-4 pt-4 border-t border-gray-100">
                                            <h4 className="text-sm font-medium text-gray-900 mb-3">Item Details & Batch Assignments</h4>
                                            <div className="overflow-x-auto">
                                                <table className="min-w-full divide-y divide-gray-200">
                                                    <thead className="bg-gray-50">
                                                        <tr>
                                                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                                                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Qty</th>
                                                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                                                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Assignments</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="bg-white divide-y divide-gray-200">
                                                        {order.items?.map((item) => (
                                                            <tr key={item.id}>
                                                                <td className="px-3 py-2 text-sm text-gray-900">{item.product?.name}</td>
                                                                <td className="px-3 py-2 text-sm text-gray-500">{parseFloat(item.quantity)} {item.product?.base_unit}</td>
                                                                <td className="px-3 py-2 text-sm text-gray-500">₦{parseFloat(item.unit_price).toLocaleString()}</td>
                                                                <td className="px-3 py-2 text-sm text-gray-500">
                                                                    {item.assignments?.length > 0 ? (
                                                                        <ul className="list-disc list-inside text-xs">
                                                                            {item.assignments.map((assign, idx) => (
                                                                                <li key={idx}>
                                                                                    {assign.inventory_batch?.instance_code || assign.inventory_batch?.batch_identifier}: {parseFloat(assign.quantity_deducted)}
                                                                                </li>
                                                                            ))}
                                                                        </ul>
                                                                    ) : (
                                                                        <span className="text-gray-400 italic">Auto/FIFO</span>
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {/* Reject Modal */}
            {showRejectModal && selectedOrder && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
                        <h2 className="text-2xl font-bold text-gray-900 mb-6">Reject Sale</h2>
                        <div className="mb-4 p-3 bg-red-50 rounded-lg border border-red-100 flex items-start space-x-2">
                            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                            <div className="text-sm text-red-700">
                                You are about to reject sale <span className="font-medium">{selectedOrder.invoice_number}</span>.
                                This action cannot be undone.
                            </div>
                        </div>
                        <form onSubmit={handleRejectSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Rejection Reason *
                                </label>
                                <textarea
                                    required
                                    value={rejectionReason}
                                    onChange={(e) => setRejectionReason(e.target.value)}
                                    rows={3}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    placeholder="Enter reason for rejection..."
                                />
                            </div>
                            <div className="flex space-x-4 pt-4">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowRejectModal(false);
                                        setSelectedOrder(null);
                                        setRejectionReason('');
                                    }}
                                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={rejectMutation.isPending}
                                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    {rejectMutation.isPending ? 'Rejecting...' : 'Confirm Rejection'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ManufacturingApproval;
