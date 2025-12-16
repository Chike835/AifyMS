import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import CoilSelectorModal from '../components/pos/CoilSelectorModal';
import { Search, Plus, Minus, Trash2, ShoppingCart } from 'lucide-react';

const POS = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedQuantity, setSelectedQuantity] = useState(1);
  const [showCoilModal, setShowCoilModal] = useState(false);
  const navigate = useNavigate();

  // Search products
  const { data: searchResults } = useQuery({
    queryKey: ['products', searchQuery],
    queryFn: async () => {
      if (!searchQuery.trim()) return { products: [] };
      const response = await api.get(`/products?search=${encodeURIComponent(searchQuery)}`);
      return response.data;
    },
    enabled: searchQuery.length > 0,
  });

  // Fetch recipes
  const { data: recipesData } = useQuery({
    queryKey: ['recipes'],
    queryFn: async () => {
      const response = await api.get('/recipes');
      return response.data.recipes || [];
    }
  });

  const recipes = recipesData || [];

  // Create sale mutation
  const createSaleMutation = useMutation({
    mutationFn: async (saleData) => {
      const response = await api.post('/sales', saleData);
      return response.data;
    },
    onSuccess: () => {
      setCart([]);
      alert('Sale created successfully!');
      navigate('/');
    },
    onError: (error) => {
      alert(error.response?.data?.error || 'Failed to create sale');
    },
  });

  const addToCart = (product, quantity = 1) => {
    // Check if product has a recipe
    const hasRecipe = recipes.some(r => r.virtual_product_id === product.id);
    if (hasRecipe) {
      // Open coil selector modal
      setSelectedProduct(product);
      setSelectedQuantity(quantity);
      setShowCoilModal(true);
    } else {
      // Add directly to cart
      const existingItem = cart.find((item) => item.product_id === product.id);
      if (existingItem) {
        setCart(
          cart.map((item) =>
            item.product_id === product.id
              ? { ...item, quantity: item.quantity + quantity }
              : item
          )
        );
      } else {
        setCart([
          ...cart,
          {
            product_id: product.id,
            product_name: product.name,
            product_sku: product.sku,
            quantity: quantity,
            unit_price: product.sale_price,
            subtotal: product.sale_price * quantity,
          },
        ]);
      }
    }
  };

  const handleCoilSelection = (assignments) => {
    // Add product to cart with assignments
    setCart([
      ...cart,
      {
        product_id: selectedProduct.id,
        product_name: selectedProduct.name,
        product_sku: selectedProduct.sku,
        quantity: selectedQuantity,
        unit_price: selectedProduct.sale_price,
        subtotal: selectedProduct.sale_price * selectedQuantity,
        item_assignments: assignments,
      },
    ]);
    setShowCoilModal(false);
    setSelectedProduct(null);
  };

  const updateCartQuantity = (productId, delta) => {
    setCart(
      cart.map((item) => {
        if (item.product_id === productId) {
          const newQuantity = Math.max(1, item.quantity + delta);
          return {
            ...item,
            quantity: newQuantity,
            subtotal: item.unit_price * newQuantity,
          };
        }
        return item;
      })
    );
  };

  const removeFromCart = (productId) => {
    setCart(cart.filter((item) => item.product_id !== productId));
  };

  const totalAmount = cart.reduce((sum, item) => sum + item.subtotal, 0);

  const handleCheckout = () => {
    if (cart.length === 0) {
      alert('Cart is empty');
      return;
    }

    const items = cart.map((item) => ({
      product_id: item.product_id,
      quantity: item.quantity,
      unit_price: item.unit_price,
      item_assignments: item.item_assignments || [],
    }));

    createSaleMutation.mutate({
      items,
      payment_status: 'unpaid',
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Point of Sale</h1>
        <div className="text-sm text-gray-600">
          {cart.length} item{cart.length !== 1 ? 's' : ''} in cart
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Product Search - Left Column */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow border border-gray-200 p-6">
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Search products by name or SKU..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {searchQuery && (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {searchResults?.products?.length > 0 ? (
                searchResults.products.map((product) => (
                  <div
                    key={product.id}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-primary-500 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{product.name}</div>
                      <div className="text-sm text-gray-600">SKU: {product.sku}</div>
                      <div className="text-sm text-gray-600">
                        {product.type} • ₦{parseFloat(product.sale_price).toLocaleString()}
                      </div>
                    </div>
                    <button
                      onClick={() => addToCart(product, 1)}
                      className="ml-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center space-x-2"
                    >
                      <Plus className="h-5 w-5" />
                      <span>Add</span>
                    </button>
                  </div>
                ))
              ) : searchQuery ? (
                <div className="text-center py-8 text-gray-600">No products found</div>
              ) : null}
            </div>
          )}

          {!searchQuery && (
            <div className="text-center py-12 text-gray-500">
              <Search className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>Start typing to search for products</p>
            </div>
          )}
        </div>

        {/* Cart - Right Column */}
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <div className="flex items-center space-x-2 mb-6">
            <ShoppingCart className="h-6 w-6 text-gray-700" />
            <h2 className="text-xl font-bold text-gray-900">Cart</h2>
          </div>

          {cart.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <ShoppingCart className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>Cart is empty</p>
            </div>
          ) : (
            <>
              <div className="space-y-3 mb-6 max-h-96 overflow-y-auto">
                {cart.map((item) => (
                  <div
                    key={item.product_id}
                    className="border border-gray-200 rounded-lg p-4"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{item.product_name}</div>
                        <div className="text-sm text-gray-600">SKU: {item.product_sku}</div>
                        {item.item_assignments && item.item_assignments.length > 0 && (
                          <div className="text-xs text-primary-600 mt-1">
                            {item.item_assignments.length} coil(s) assigned
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => removeFromCart(item.product_id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => updateCartQuantity(item.product_id, -1)}
                          className="p-1 border border-gray-300 rounded hover:bg-gray-100"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="w-12 text-center font-medium">{item.quantity}</span>
                        <button
                          onClick={() => updateCartQuantity(item.product_id, 1)}
                          className="p-1 border border-gray-300 rounded hover:bg-gray-100"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-gray-900">
                          ₦{item.subtotal.toLocaleString()}
                        </div>
                        <div className="text-sm text-gray-600">
                          ₦{item.unit_price.toLocaleString()} each
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-gray-200 pt-4 space-y-4">
                <div className="flex justify-between items-center text-lg font-bold">
                  <span>Total:</span>
                  <span>₦{totalAmount.toLocaleString()}</span>
                </div>
                <button
                  onClick={handleCheckout}
                  disabled={createSaleMutation.isPending}
                  className="w-full py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  {createSaleMutation.isPending ? 'Processing...' : 'Complete Sale'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Coil Selector Modal */}
      <CoilSelectorModal
        isOpen={showCoilModal}
        onClose={() => {
          setShowCoilModal(false);
          setSelectedProduct(null);
        }}
        product={selectedProduct}
        quantity={selectedQuantity}
        onConfirm={handleCoilSelection}
      />
    </div>
  );
};

export default POS;

