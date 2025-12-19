import { useState } from 'react';
import { ShoppingBag, Trash2, Plus, Minus, User, X, Search, Pause, ChevronRight, Tag, Edit2, Check, Building2 } from 'lucide-react';

const CartSidebar = ({
    cart,
    onUpdateQuantity,
    onUpdatePrice,
    onRemoveItem,
    onClearCart,
    onCheckout,
    onHoldOrder,
    customers,
    selectedCustomer,
    onSelectCustomer,
    isProcessing,
    canEditPrice = false, // Permission prop
    currencySymbol = '₦',
    branches = [],
    selectedBranch,
    onSelectBranch,
    canSelectBranch = false,
    user
}) => {
    const [showCustomerSearch, setShowCustomerSearch] = useState(false);
    const [customerSearch, setCustomerSearch] = useState('');

    // State for Price Editing
    const [editingItemId, setEditingItemId] = useState(null);
    const [editingPrice, setEditingPrice] = useState('');

    const subtotal = cart.reduce((sum, item) => sum + item.subtotal, 0);
    const tax = 0;
    const discount = 0;
    const total = subtotal + tax - discount;

    // Check if any item has a discounted price (User Price < Original Price)
    const isDiscounted = cart.some(item =>
        item.original_price && item.unit_price < item.original_price
    );

    const filteredCustomers = customers?.filter(c =>
        c.name?.toLowerCase().includes(customerSearch.toLowerCase()) ||
        c.phone?.includes(customerSearch) ||
        c.email?.toLowerCase().includes(customerSearch.toLowerCase())
    ) || [];

    const selectedBranchName = branches.find(b => b.id === selectedBranch)?.name || user?.branch?.name || 'No Branch Selected';

    const startEditingPrice = (item) => {
        if (!canEditPrice) return;
        setEditingItemId(item.product_id);
        setEditingPrice(item.unit_price.toString());
    };

    const savePrice = (itemId) => {
        const newPrice = parseFloat(editingPrice);
        if (!isNaN(newPrice) && newPrice >= 0) {
            onUpdatePrice(itemId, newPrice);
        }
        setEditingItemId(null);
    };

    return (
        <div className="h-full flex flex-col bg-white border-l border-gray-100 shadow-2xl">
            {/* Header: User Profile / Customer Select */}
            <div className="p-5 border-b border-gray-100 bg-white z-10">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        <ShoppingBag className="h-6 w-6 text-primary-600" />
                        Current Sale
                    </h2>
                    <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-semibold">
                        {isDiscounted ? 'Discount Pending' : 'Standard Sale'}
                    </span>
                </div>

                {/* Customer Selector Card */}
                <div className="relative mb-4">
                    {showCustomerSearch ? (
                        <div className="absolute top-0 left-0 right-0 z-30 bg-white rounded-xl shadow-lg border border-gray-200 p-2">
                            <div className="flex items-center gap-2 border-b border-gray-100 pb-2 mb-2">
                                <Search className="h-4 w-4 text-gray-400" />
                                <input
                                    type="text"
                                    value={customerSearch}
                                    onChange={(e) => setCustomerSearch(e.target.value)}
                                    placeholder="Find customer..."
                                    className="flex-1 text-sm outline-none placeholder-gray-400"
                                    autoFocus
                                />
                                <button onClick={() => setShowCustomerSearch(false)} className="text-gray-400 hover:text-gray-600">
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                            <div className="max-h-48 overflow-y-auto">
                                <button
                                    onClick={() => {
                                        onSelectCustomer(null);
                                        setShowCustomerSearch(false);
                                    }}
                                    className="w-full text-left px-3 py-2 text-sm text-gray-500 hover:bg-gray-50 rounded-lg"
                                >
                                    Walk-in Customer
                                </button>
                                {filteredCustomers.slice(0, 5).map(c => (
                                    <button
                                        key={c.id}
                                        onClick={() => {
                                            onSelectCustomer(c);
                                            setShowCustomerSearch(false);
                                        }}
                                        className="w-full text-left px-3 py-2 hover:bg-gray-50 rounded-lg"
                                    >
                                        <div className="text-sm font-medium text-gray-900">{c.name}</div>
                                        <div className="text-xs text-gray-400">{c.phone}</div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <button
                            onClick={() => setShowCustomerSearch(true)}
                            className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors group"
                        >
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center">
                                    <User className="h-5 w-5" />
                                </div>
                                <div className="text-left">
                                    <p className="text-sm font-semibold text-gray-900">
                                        {selectedCustomer ? selectedCustomer.name : 'Walk-in Customer'}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        {selectedCustomer ? 'Registered Customer' : 'Add customer details'}
                                    </p>
                                </div>
                            </div>
                            <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-gray-600" />
                        </button>
                    )}
                </div>

                {/* Branch Selector */}
                <div className="pt-2 border-t border-gray-100">
                    <label className="text-xs font-semibold text-gray-500 mb-2 block uppercase tracking-wide">Branch</label>
                    {canSelectBranch ? (
                        <div className="relative">
                            <select
                                value={selectedBranch || ''}
                                onChange={(e) => onSelectBranch(e.target.value)}
                                className="block w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg appearance-none text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-shadow disabled:opacity-50"
                                disabled={isProcessing}
                            >
                                <option value="" disabled>Select Branch</option>
                                {branches.map(b => (
                                    <option key={b.id} value={b.id}>{b.name}</option>
                                ))}
                            </select>
                            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 rotate-90" />
                        </div>
                    ) : (
                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                            <div className="h-8 w-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                                <Building2 className="h-4 w-4" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-900">{selectedBranchName}</p>
                                <p className="text-xs text-gray-500">Assigned Branch</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Cart List - Receipt Style */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {cart.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-300 space-y-4 opacity-50">
                        <ShoppingBag className="h-16 w-16 stroke-1" />
                        <p className="font-medium text-lg">Bag is empty</p>
                    </div>
                ) : (
                    cart.map((item) => (
                        <div key={item.product_id} className="group flex flex-col gap-3 py-3 border-b border-gray-50 last:border-0 relative hover:bg-gray-50/50 -mx-4 px-4 transition-colors">
                            <div className="flex justify-between items-start">
                                <div className="flex-1 pr-4">
                                    <h4 className="font-medium text-gray-900 leading-snug">{item.product_name}</h4>
                                    <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                                        <Tag className="h-3 w-3" /> {item.product_sku}
                                    </p>
                                </div>
                                <div className="text-right flex flex-col items-end">
                                    <p className="font-semibold text-gray-900">{currencySymbol}{item.subtotal.toLocaleString()}</p>

                                    {/* Editable Unit Price */}
                                    {editingItemId === item.product_id ? (
                                        <div className="flex items-center gap-1 mt-1">
                                            <input
                                                type="number"
                                                value={editingPrice}
                                                onChange={(e) => setEditingPrice(e.target.value)}
                                                className="w-20 text-xs px-1 py-0.5 border border-primary-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
                                                autoFocus
                                                onBlur={() => savePrice(item.product_id)}
                                                onKeyDown={(e) => e.key === 'Enter' && savePrice(item.product_id)}
                                            />
                                            <button onClick={() => savePrice(item.product_id)} className="text-green-600">
                                                <Check className="h-3 w-3" />
                                            </button>
                                        </div>
                                    ) : (
                                        <div
                                            className={`text-xs mt-1 flex items-center gap-1 ${canEditPrice ? 'cursor-pointer hover:text-primary-600' : 'text-gray-500'}`}
                                            onClick={() => startEditingPrice(item)}
                                            title={canEditPrice ? "Click to edit price" : "Permission required to edit price"}
                                        >
                                            <span>{currencySymbol}{item.unit_price.toLocaleString()} ea</span>
                                            {canEditPrice && <Edit2 className="h-3 w-3 opacity-0 group-hover:opacity-50" />}
                                        </div>
                                    )}

                                    {/* Discount Indicator */}
                                    {item.original_price && item.unit_price < item.original_price && (
                                        <span className="text-[10px] text-amber-600 bg-amber-50 px-1 rounded mt-0.5">
                                            -{Math.round((1 - item.unit_price / item.original_price) * 100)}%
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Controls */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-lg p-0.5 shadow-sm">
                                    <button
                                        onClick={() => onUpdateQuantity(item.product_id, -1)}
                                        className="p-1.5 hover:bg-gray-100 rounded text-gray-600 transition-colors"
                                    >
                                        <Minus className="h-3.5 w-3.5" />
                                    </button>
                                    <span className="text-sm font-semibold min-w-[1.5rem] text-center">{item.quantity}</span>
                                    <button
                                        onClick={() => onUpdateQuantity(item.product_id, 1)}
                                        className="p-1.5 hover:bg-gray-100 rounded text-gray-600 transition-colors"
                                    >
                                        <Plus className="h-3.5 w-3.5" />
                                    </button>
                                </div>

                                <button
                                    onClick={() => onRemoveItem(item.product_id)}
                                    className="p-2 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </div>

                            {item.item_assignments && item.item_assignments.length > 0 && (
                                <div className="text-xs text-primary-600 bg-primary-50 px-2 py-1 rounded self-start">
                                    Include {item.item_assignments.length} coil assignments
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>

            {/* Footer: Calculation & Action */}
            <div className="bg-gray-50 p-5 space-y-4 border-t border-gray-100">
                <div className="space-y-2">
                    <div className="flex justify-between text-sm text-gray-500">
                        <span>Subtotal</span>
                        <span>{currencySymbol}{subtotal.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold text-gray-900 pt-2 border-t border-gray-200 border-dashed">
                        <span>Total</span>
                        <span>{currencySymbol}{total.toLocaleString()}</span>
                    </div>
                </div>

                <div className="grid grid-cols-4 gap-2">
                    <button
                        onClick={onClearCart}
                        disabled={cart.length === 0}
                        className="col-span-1 flex flex-col items-center justify-center p-2 rounded-xl bg-white text-gray-500 hover:text-red-500 hover:bg-red-50 border border-gray-200 text-xs font-medium transition-colors"
                    >
                        <Trash2 className="h-5 w-5 mb-1" />
                        Clear
                    </button>
                    <button
                        onClick={onHoldOrder}
                        disabled={cart.length === 0 || !selectedBranch}
                        className="col-span-1 flex flex-col items-center justify-center p-2 rounded-xl bg-white text-gray-500 hover:text-amber-600 hover:bg-amber-50 border border-gray-200 text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Pause className="h-5 w-5 mb-1" />
                        Hold
                    </button>
                    <button
                        onClick={onCheckout}
                        disabled={cart.length === 0 || isProcessing || !selectedBranch}
                        className="col-span-2 group relative overflow-hidden flex items-center justify-center gap-2 bg-gray-900 text-white rounded-xl font-bold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isProcessing ? (
                            <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                        ) : (
                            <>
                                <span className="relative z-10">Create Sale</span>
                                <div className="absolute inset-0 bg-primary-600 w-0 group-hover:w-full transition-all duration-300 ease-out z-0" />
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CartSidebar;
