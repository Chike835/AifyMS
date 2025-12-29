import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

const PurchasePaymentReport = ({ startDate, endDate, selectedBranch, formatCurrency, formatDate }) => {
    const { hasPermission } = useAuth();

    const { data: purchasePaymentData, isLoading: purchasePaymentLoading } = useQuery({
        queryKey: ['purchasePaymentReport', startDate, endDate, selectedBranch],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (startDate) params.append('start_date', startDate);
            if (endDate) params.append('end_date', endDate);
            if (selectedBranch) params.append('branch_id', selectedBranch);
            const response = await api.get(`/reports/purchase-payment?${params.toString()}`);
            return response.data;
        },
        enabled: hasPermission('report_view_financial')
    });

    if (purchasePaymentLoading) return <div className="text-center py-12">Loading purchase payment report...</div>;
    if (!purchasePaymentData) return <div className="text-center py-12 text-gray-500">No data available</div>;

    return (
        <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">Purchase Payment Report</h2>
            <div className="mb-4 grid grid-cols-4 gap-4">
                <div>
                    <p className="text-sm text-gray-600">Total Purchases</p>
                    <p className="text-lg font-semibold">{formatCurrency(purchasePaymentData.summary?.total_purchases)}</p>
                </div>
                <div>
                    <p className="text-sm text-gray-600">Paid</p>
                    <p className="text-lg font-semibold text-green-600">{formatCurrency(purchasePaymentData.summary?.paid)}</p>
                </div>
                <div>
                    <p className="text-sm text-gray-600">Unpaid</p>
                    <p className="text-lg font-semibold text-red-600">{formatCurrency(purchasePaymentData.summary?.unpaid)}</p>
                </div>
                <div>
                    <p className="text-sm text-gray-600">Count</p>
                    <p className="text-lg font-semibold">{purchasePaymentData.summary?.purchase_count}</p>
                </div>
            </div>
            {purchasePaymentData.purchases && purchasePaymentData.purchases.length > 0 && (
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Purchase #</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Supplier</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {purchasePaymentData.purchases.slice(0, 100).map((purchase) => (
                            <tr key={purchase.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm">{purchase.purchase_number}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm">{purchase.supplier?.name || 'Unknown'}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-right">{formatCurrency(purchase.total_amount)}</td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${purchase.payment_status === 'paid' ? 'bg-green-100 text-green-800' :
                                        purchase.payment_status === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                                            'bg-red-100 text-red-800'
                                        }`}>
                                        {purchase.payment_status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm">{formatDate(purchase.created_at)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
};

export default PurchasePaymentReport;
