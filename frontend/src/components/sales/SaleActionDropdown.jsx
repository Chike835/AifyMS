import React, { useState, useRef, useEffect } from 'react';
import { MoreVertical, Eye, Edit2, Trash2, FileText, Printer, DollarSign, CheckCircle, Percent, RotateCcw, Truck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const SaleActionDropdown = ({
    sale,
    onView,
    onDelete,
    onApproveSale,
    onApproveDiscount
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);
    const { hasPermission } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleAction = (action) => {
        setIsOpen(false);
        action();
    };

    // Helper to check conditions
    const canAddPayment = () => {
        // Must have permission
        if (!hasPermission('payment_create')) return false;
        // Must be unpaid or partial
        if (sale.payment_status === 'paid') return false;
        // Logic for customer balance check would be ideally done in parent or passed down, 
        // but simple status check is a good start. 
        return true;
    };

    const canApproveDiscount = () => {
        return hasPermission('sale_discount_approve') && sale.discount_status === 'pending';
    };

    const canEdit = hasPermission('sale_edit') || hasPermission('sale_edit_price');

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(!isOpen);
                }}
                className="p-1.5 hover:bg-gray-100 rounded-full text-gray-500 hover:text-gray-700 transition-colors"
            >
                <MoreVertical className="h-4 w-4" />
            </button>

            {isOpen && (
                <div
                    className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-50 text-sm"
                    onClick={(e) => e.stopPropagation()} // Prevent row click
                >
                    {/* View */}
                    <button
                        onClick={() => handleAction(onView)}
                        className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2 text-gray-700"
                    >
                        <Eye className="h-4 w-4" /> View Details
                    </button>

                    {/* Edit - Only show for drafts or if sale is not finalized */}
                    {canEdit && (sale.order_type === 'draft' || sale.payment_status === 'unpaid') && (
                        <button
                            onClick={() => handleAction(() => {
                                // For drafts, navigate to edit. For unpaid invoices, could navigate to edit or show message
                                if (sale.order_type === 'draft') {
                                    navigate(`/sales/add`, { state: { draftId: sale.id } });
                                } else {
                                    // For unpaid invoices, we might want to show a message or navigate
                                    // For now, just show a message that editing is limited
                                    alert('Editing paid or partially paid invoices is restricted. Please create a return or adjustment if needed.');
                                }
                            })}
                            className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2 text-gray-700"
                        >
                            <Edit2 className="h-4 w-4" /> Edit Sale
                        </button>
                    )}

                    {/* Add Payment */}
                    {canAddPayment() && (
                        <button
                            onClick={() => handleAction(() => navigate('/payments', { state: { saleId: sale.id, customerId: sale.customer_id } }))}
                            className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2 text-green-600"
                        >
                            <DollarSign className="h-4 w-4" /> Add Payment
                        </button>
                    )}

                    {/* Delivery Note */}
                    {hasPermission('delivery_note_create') && (
                        <button
                            onClick={() => handleAction(() => navigate('/delivery-notes', { state: { saleId: sale.id } }))}
                            className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2 text-gray-700"
                        >
                            <Truck className="h-4 w-4" /> Delivery Note
                        </button>
                    )}

                    <div className="border-t border-gray-100 my-1"></div>

                    {/* Print Invoice */}
                    <button
                        onClick={() => handleAction(() => window.open(`/api/print/invoice/${sale.id}`, '_blank'))}
                        className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2 text-gray-700"
                    >
                        <Printer className="h-4 w-4" /> Print Invoice
                    </button>

                    {/* Approve Discount */}
                    {canApproveDiscount() && (
                        <button
                            onClick={() => handleAction(onApproveDiscount)}
                            className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2 text-orange-600"
                        >
                            <Percent className="h-4 w-4" /> Approve Discount
                        </button>
                    )}

                    {/* Approve Sale (Manufacturing) */}
                    {onApproveSale && hasPermission('production_update_status') && sale.production_status === 'na' && (
                        <button
                            onClick={() => handleAction(onApproveSale)}
                            className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2 text-blue-600"
                        >
                            <CheckCircle className="h-4 w-4" /> Approve Sale
                        </button>
                    )}

                    {/* Sale Return */}
                    {hasPermission('sale_return_create') && (
                        <button
                            onClick={() => handleAction(() => navigate('/sales/returns', { state: { saleId: sale.id, invoiceNumber: sale.invoice_number } }))}
                            className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2 text-gray-700"
                        >
                            <RotateCcw className="h-4 w-4" /> Sale Return
                        </button>
                    )}

                    <div className="border-t border-gray-100 my-1"></div>

                    {/* Delete */}
                    {hasPermission('sale_delete') && (
                        <button
                            onClick={() => handleAction(onDelete)}
                            className="w-full text-left px-4 py-2 hover:bg-red-50 flex items-center gap-2 text-red-600"
                        >
                            <Trash2 className="h-4 w-4" /> Delete Sale
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

export default SaleActionDropdown;
