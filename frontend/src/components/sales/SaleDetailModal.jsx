import React, { useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useReactToPrint } from 'react-to-print';
import api from '../../utils/api';
import { Printer, Download, X, CheckCircle, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const SaleDetailModal = ({ isOpen, onClose, saleId, onEdit }) => {
    const navigate = useNavigate();
    const componentRef = useRef();
    const { hasPermission } = useAuth();

    const { data: order, isLoading, error } = useQuery({
        queryKey: ['sale', saleId],
        queryFn: async () => {
            if (!saleId) return null;
            const response = await api.get(`/sales/${saleId}`);
            return response.data.order;
        },
        enabled: !!saleId && isOpen
    });

    const handlePrint = useReactToPrint({
        contentRef: componentRef,
    });

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-NG', {
            style: 'currency',
            currency: 'NGN'
        }).format(amount || 0);
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-NG', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getPaymentStatusColor = (status) => {
        switch (status) {
            case 'paid': return 'bg-green-100 text-green-800';
            case 'partial': return 'bg-yellow-100 text-yellow-800';
            case 'unpaid': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getProductionStatusColor = (status) => {
        switch (status) {
            case 'queue': return 'bg-orange-100 text-orange-800';
            case 'produced': return 'bg-blue-100 text-blue-800';
            case 'delivered': return 'bg-green-100 text-green-800';
            case 'na': return 'bg-gray-100 text-gray-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-7xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Modal Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                    <div className="flex items-center gap-4">
                        <h2 className="text-2xl font-bold text-gray-900">
                            {order?.invoice_number || 'Loading...'}
                        </h2>
                        {order && (
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPaymentStatusColor(order.payment_status)}`}>
                                {order.payment_status?.toUpperCase()}
                            </span>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500 hover:text-gray-700"
                    >
                        <X className="h-6 w-6" />
                    </button>
                </div>

                {/* Modal Content */}
                <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-64">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
                        </div>
                    ) : error ? (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
                            {error.response?.data?.error || 'Failed to load sale details'}
                        </div>
                    ) : order ? (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Main Invoice Content */}
                            <div className="lg:col-span-2 space-y-6">
                                {/* Actions Toolbar */}
                                <div className="flex items-center justify-between bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                        <Clock className="h-4 w-4" />
                                        <span>Full details view</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={handlePrint}
                                            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-700 hover:bg-gray-50 transition-colors"
                                        >
                                            <Printer className="h-4 w-4" />
                                            <span>Print</span>
                                        </button>
                                        <button
                                            onClick={() => window.open(`/api/print/invoice/${order.id}`, '_blank')}
                                            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                                        >
                                            <Download className="h-4 w-4" />
                                            <span>Download Invoice</span>
                                        </button>
                                    </div>
                                </div>

                                {/* Printable Area */}
                                <div ref={componentRef} className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 print:shadow-none print:border-none print:m-0">
                                    {/* Header for Print */}
                                    <div className="hidden print:block mb-8">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h1 className="text-2xl font-bold">{order.branch?.name}</h1>
                                                <p>{order.branch?.address}</p>
                                                <p>{order.branch?.phone}</p>
                                            </div>
                                            <div className="text-right">
                                                <h1 className="text-3xl font-bold text-gray-900">INVOICE</h1>
                                            </div>
                                        </div>
                                        <div className="mt-4 border-b border-gray-900"></div>
                                    </div>

                                    <div className="flex justify-between items-start mb-8">
                                        <div>
                                            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-1">Bill To</h3>
                                            <p className="text-lg font-bold text-gray-900">{order.customer?.name || 'Walk-in Customer'}</p>
                                            {order.customer?.phone && <p className="text-gray-600">{order.customer.phone}</p>}
                                            {order.customer?.email && <p className="text-gray-600">{order.customer.email}</p>}
                                            {order.customer?.address && <p className="text-gray-600 max-w-xs">{order.customer.address}</p>}
                                        </div>
                                        <div className="text-right">
                                            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-1">Invoice Details</h3>
                                            <p className="text-gray-900"><span className="font-medium">Number:</span> {order.invoice_number}</p>
                                            <p className="text-gray-900"><span className="font-medium">Date:</span> {new Date(order.created_at).toLocaleDateString()}</p>
                                            <p className="text-gray-900"><span className="font-medium">Branch:</span> {order.branch?.name}</p>
                                            {order.creator && (
                                                <p className="text-gray-500 text-sm mt-1">Generated by: {order.creator.full_name}</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Items Table */}
                                    <div className="overflow-x-auto mb-8">
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <thead>
                                                <tr>
                                                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider bg-gray-50">Item</th>
                                                    <th className="px-4 py-3 text-right text-xs font-bold text-gray-700 uppercase tracking-wider bg-gray-50">Qty</th>
                                                    <th className="px-4 py-3 text-right text-xs font-bold text-gray-700 uppercase tracking-wider bg-gray-50">Price</th>
                                                    <th className="px-4 py-3 text-right text-xs font-bold text-gray-700 uppercase tracking-wider bg-gray-50">Total</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-200">
                                                {order.items?.map((item) => (
                                                    <tr key={item.id}>
                                                        <td className="px-4 py-3">
                                                            <p className="font-medium text-gray-900">{item.product?.name}</p>
                                                            {item.product?.sku && <span className="text-xs text-gray-500">{item.product.sku}</span>}
                                                            {item.assignments?.length > 0 && (
                                                                <div className="text-xs text-gray-500 mt-1">
                                                                    Batch: {item.assignments.map(a => a.inventory_batch?.instance_code || a.inventory_batch?.batch_identifier).join(', ')}
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3 text-right text-gray-900">
                                                            {parseFloat(item.quantity)} {item.product?.base_unit}
                                                        </td>
                                                        <td className="px-4 py-3 text-right text-gray-900">
                                                            {formatCurrency(item.unit_price)}
                                                        </td>
                                                        <td className="px-4 py-3 text-right font-medium text-gray-900">
                                                            {formatCurrency(item.subtotal)}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Totals */}
                                    <div className="border-t border-gray-200 pt-6">
                                        <div className="flex justify-end">
                                            <div className="w-64 space-y-3">
                                                {order.total_discount > 0 && (
                                                    <div className="flex justify-between text-gray-600">
                                                        <span>Subtotal</span>
                                                        <span>{formatCurrency(parseFloat(order.total_amount) + parseFloat(order.total_discount))}</span>
                                                    </div>
                                                )}
                                                {order.total_discount > 0 && (
                                                    <div className="flex justify-between text-green-600">
                                                        <span>Discount</span>
                                                        <span>-{formatCurrency(order.total_discount)}</span>
                                                    </div>
                                                )}
                                                <div className="flex justify-between text-xl font-bold text-gray-900 pt-3 border-t border-gray-100">
                                                    <span>Total</span>
                                                    <span>{formatCurrency(order.total_amount)}</span>
                                                </div>
                                                <div className="pt-2 text-right">
                                                    <span className={`inline-block px-3 py-1 text-sm font-medium rounded-full ${getPaymentStatusColor(order.payment_status)}`}>
                                                        {order.payment_status === 'paid' ? 'PAID' : order.payment_status.toUpperCase()}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Footer Notes (Print Only) */}
                                    <div className="hidden print:block mt-12 pt-8 border-t border-gray-200 text-center text-sm text-gray-500">
                                        <p>Thank you for your business!</p>
                                        <p>This is a computer generated invoice.</p>
                                    </div>
                                </div>
                            </div>

                            {/* Sidebar Info */}
                            <div className="space-y-6">
                                {/* Status Card */}
                                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Status</h3>

                                    <div className="space-y-4">
                                        <div>
                                            <p className="text-sm text-gray-500 mb-1">Created</p>
                                            <p className="text-gray-900 font-medium">{formatDate(order.created_at)}</p>
                                        </div>

                                        <div className="pt-4 border-t border-gray-100">
                                            <p className="text-sm text-gray-500 mb-1">Production Status</p>
                                            <div className="flex items-center gap-2">
                                                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getProductionStatusColor(order.production_status)}`}>
                                                    {order.production_status === 'na' ? 'N/A' : order.production_status.toUpperCase()}
                                                </span>
                                            </div>
                                        </div>

                                        {order.discount_status && (
                                            <div className="pt-4 border-t border-gray-100">
                                                <p className="text-sm text-gray-500 mb-1">Discount Status</p>
                                                <div className="flex items-center gap-2">
                                                    {order.discount_status === 'approved' ? (
                                                        <span className="flex items-center gap-1 text-green-700 bg-green-50 px-2 py-1 rounded text-sm font-medium">
                                                            <CheckCircle className="h-3.5 w-3.5" /> Approved
                                                        </span>
                                                    ) : order.discount_status === 'pending' ? (
                                                        <span className="flex items-center gap-1 text-yellow-700 bg-yellow-50 px-2 py-1 rounded text-sm font-medium">
                                                            <Clock className="h-3.5 w-3.5" /> Pending Approval
                                                        </span>
                                                    ) : (
                                                        <span className="flex items-center gap-1 text-gray-600 bg-gray-50 px-2 py-1 rounded text-sm font-medium">
                                                            {order.discount_status}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {order.dispatcher_name && (
                                            <div className="pt-4 border-t border-gray-100">
                                                <p className="text-sm text-gray-500 mb-1">Dispatch Info</p>
                                                <p className="font-medium text-gray-900">{order.dispatcher_name}</p>
                                                {order.vehicle_plate && <p className="text-sm text-gray-600">{order.vehicle_plate}</p>}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Quick Actions */}
                                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
                                    <div className="space-y-2">
                                        {/* Actions handled by dropdown in list view, but could duplicate here if needed. 
                                            For now, keeping the Payment button if unpaid + permission. 
                                        */}
                                        {order.payment_status !== 'paid' && hasPermission('payment_create') && (
                                            <button
                                                onClick={() => navigate('/payments', { state: { saleId: order.id, customerId: order.customer_id } })}
                                                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                                            >
                                                Record Payment
                                            </button>
                                        )}
                                        {hasPermission('delivery_note_create') && (
                                            <button
                                                onClick={() => navigate('/delivery-notes', { state: { saleId: order.id } })}
                                                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                                            >
                                                Create Delivery Note
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    );
};

export default SaleDetailModal;
