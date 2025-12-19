import { useState, useEffect } from 'react';
import { X, CheckCircle, XCircle, Edit2, RotateCcw, AlertCircle } from 'lucide-react';

const DiscountApprovalDetail = ({
  sale,
  actionType,
  onClose,
  onApprove,
  onDecline,
  onUpdate,
  onRestore,
  isProcessing
}) => {
  const [editingItems, setEditingItems] = useState(false);
  const [items, setItems] = useState([]);
  const [declineReason, setDeclineReason] = useState('');

  useEffect(() => {
    if (sale?.items) {
      setItems(sale.items.map(item => ({
        ...item,
        original_price: parseFloat(item.product?.sale_price || 0)
      })));
    }
  }, [sale]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN'
    }).format(amount || 0);
  };

  const calculateDiscount = (item) => {
    const standardPrice = parseFloat(item.original_price || item.product?.sale_price || 0);
    const sellingPrice = parseFloat(item.unit_price || 0);
    if (sellingPrice < standardPrice) {
      return (standardPrice - sellingPrice) * parseFloat(item.quantity || 0);
    }
    return 0;
  };

  const calculateTotalDiscount = () => {
    return items.reduce((sum, item) => sum + calculateDiscount(item), 0);
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => {
      return sum + (parseFloat(item.unit_price || 0) * parseFloat(item.quantity || 0));
    }, 0);
  };

  const updateItemPrice = (index, newPrice) => {
    const updatedItems = [...items];
    updatedItems[index] = {
      ...updatedItems[index],
      unit_price: parseFloat(newPrice) || 0,
      subtotal: (parseFloat(newPrice) || 0) * parseFloat(updatedItems[index].quantity || 0)
    };
    setItems(updatedItems);
  };

  const updateItemQuantity = (index, newQuantity) => {
    const updatedItems = [...items];
    updatedItems[index] = {
      ...updatedItems[index],
      quantity: parseFloat(newQuantity) || 0,
      subtotal: parseFloat(updatedItems[index].unit_price || 0) * (parseFloat(newQuantity) || 0)
    };
    setItems(updatedItems);
  };

  const handleSave = () => {
    const itemsToSave = items.map(item => ({
      product_id: item.product_id,
      quantity: item.quantity,
      unit_price: item.unit_price,
      item_assignments: item.item_assignments || []
    }));

    if (actionType === 'edit') {
      onUpdate(sale.id, itemsToSave);
    } else if (actionType === 'restore') {
      onRestore(sale.id, itemsToSave);
    }
  };

  const canEdit = actionType === 'edit' || actionType === 'restore';
  const showEditControls = editingItems && canEdit;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Discount Approval Details</h2>
            <p className="text-sm text-gray-500 mt-1">Invoice: {sale?.invoice_number}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Sale Info */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className="text-xs font-medium text-gray-500">Customer</label>
              <p className="text-sm text-gray-900 mt-1">{sale?.customer?.name || 'Walk-in Customer'}</p>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">Branch</label>
              <p className="text-sm text-gray-900 mt-1">{sale?.branch?.name}</p>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">Created By</label>
              <p className="text-sm text-gray-900 mt-1">{sale?.creator?.full_name}</p>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">Date</label>
              <p className="text-sm text-gray-900 mt-1">
                {new Date(sale?.created_at).toLocaleString()}
              </p>
            </div>
            {sale?.discount_status === 'declined' && sale?.discount_declined_reason && (
              <div className="col-span-2">
                <label className="text-xs font-medium text-gray-500">Decline Reason</label>
                <p className="text-sm text-red-600 mt-1">{sale.discount_declined_reason}</p>
              </div>
            )}
          </div>

          {/* Items Table */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Items</h3>
              {canEdit && (
                <button
                  onClick={() => setEditingItems(!editingItems)}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg"
                >
                  <Edit2 className="h-4 w-4" />
                  {editingItems ? 'Cancel Edit' : 'Edit Prices'}
                </button>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Standard Price</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Selling Price</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Discount</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {items.map((item, index) => {
                    const discount = calculateDiscount(item);
                    const standardPrice = parseFloat(item.original_price || item.product?.sale_price || 0);
                    return (
                      <tr key={item.id || index}>
                        <td className="px-4 py-3">
                          <div className="text-sm font-medium text-gray-900">{item.product?.name}</div>
                          <div className="text-xs text-gray-500">{item.product?.sku}</div>
                        </td>
                        <td className="px-4 py-3">
                          {showEditControls ? (
                            <input
                              type="number"
                              step="0.001"
                              min="0.001"
                              value={item.quantity}
                              onChange={(e) => updateItemQuantity(index, e.target.value)}
                              className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                            />
                          ) : (
                            <span className="text-sm text-gray-900">{item.quantity}</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-gray-600">{formatCurrency(standardPrice)}</span>
                        </td>
                        <td className="px-4 py-3">
                          {showEditControls ? (
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={item.unit_price}
                              onChange={(e) => updateItemPrice(index, e.target.value)}
                              className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                            />
                          ) : (
                            <span className={`text-sm font-medium ${
                              item.unit_price < standardPrice ? 'text-amber-600' : 'text-gray-900'
                            }`}>
                              {formatCurrency(item.unit_price)}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-sm font-medium ${
                            discount > 0 ? 'text-amber-600' : 'text-gray-500'
                          }`}>
                            {discount > 0 ? `-${formatCurrency(discount)}` : '-'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm font-medium text-gray-900">
                            {formatCurrency(item.subtotal || (item.unit_price * item.quantity))}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totals */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">Subtotal:</span>
              <span className="text-sm font-medium text-gray-900">{formatCurrency(calculateTotal())}</span>
            </div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">Total Discount:</span>
              <span className="text-sm font-medium text-amber-600">{formatCurrency(calculateTotalDiscount())}</span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-gray-200">
              <span className="text-lg font-bold text-gray-900">Total:</span>
              <span className="text-lg font-bold text-gray-900">{formatCurrency(calculateTotal())}</span>
            </div>
          </div>

          {/* Decline Reason Input */}
          {actionType === 'decline' && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason for Decline (Optional)
              </label>
              <textarea
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                placeholder="Enter reason for declining this discount..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                rows="3"
              />
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            disabled={isProcessing}
          >
            Cancel
          </button>

          {actionType === 'edit' && editingItems && (
            <button
              onClick={handleSave}
              disabled={isProcessing}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {isProcessing ? 'Saving...' : 'Save Changes'}
            </button>
          )}

          {actionType === 'restore' && editingItems && (
            <button
              onClick={handleSave}
              disabled={isProcessing}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {isProcessing ? 'Restoring...' : 'Restore Sale'}
            </button>
          )}

          {actionType === 'approve' && (
            <button
              onClick={() => onApprove(sale.id)}
              disabled={isProcessing}
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
            >
              <CheckCircle className="h-4 w-4" />
              {isProcessing ? 'Approving...' : 'Approve Discount'}
            </button>
          )}

          {actionType === 'decline' && (
            <button
              onClick={() => onDecline(sale.id, declineReason)}
              disabled={isProcessing}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
            >
              <XCircle className="h-4 w-4" />
              {isProcessing ? 'Declining...' : 'Decline Discount'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default DiscountApprovalDetail;



