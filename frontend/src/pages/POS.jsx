import { useState, useMemo, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import CoilSelectorModal from '../components/pos/CoilSelectorModal';
import ProductGrid from '../components/pos/ProductGrid';
import CategoryTabs from '../components/pos/CategoryTabs';
import CartSidebar from '../components/pos/CartSidebar';
import { Search, Maximize2, Minimize2, Minimize, LogOut, LayoutGrid } from 'lucide-react';

const POS = () => {
  const navigate = useNavigate();
  const { user, hasPermission } = useAuth();

  // UI State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Cart State
  const [cart, setCart] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  // Coil Modal State
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedQuantity, setSelectedQuantity] = useState(1);
  const [showCoilModal, setShowCoilModal] = useState(false);

  // Permissions (Mock permission if hasPermission is not yet available, checking AuthContext later)
  // Assuming hasPermission might be undefined if user not fully loaded, safe check
  const canEditPrice = hasPermission ? hasPermission('sale_edit_price') : true;

  // Branch State
  const [selectedBranch, setSelectedBranch] = useState(null);

  // Determine if user can select branch
  const canSelectBranch = useMemo(() => {
    if (!user) return false;
    return user.role_name === 'Super Admin' || (hasPermission && hasPermission('branch_access_all'));
  }, [user, hasPermission]);


  // Sync fullscreen state with browser
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Set default branch
  useEffect(() => {
    if (user?.branch_id && !selectedBranch) {
      setSelectedBranch(user.branch_id);
    }
  }, [user]);

  // Fetch branches
  const { data: branchesData } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      const response = await api.get('/branches');
      return response.data.branches || [];
    },
    enabled: !!user
  });

  // Fetch products
  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ['products', 'pos'],
    queryFn: async () => {
      const response = await api.get('/products', {
        params: {
          status: 'active',
          not_for_selling: 'false',
          limit: 500
        }
      });
      return response.data;
    }
  });

  // Fetch categories
  const { data: categoriesData } = useQuery({
    queryKey: ['categories', 'pos'],
    queryFn: async () => {
      const response = await api.get('/categories', {
        params: { include_global: 'true' }
      });
      return response.data.categories || [];
    }
  });

  // Fetch customers
  const { data: customersData } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const response = await api.get('/customers');
      return response.data.customers || [];
    }
  });

  // Fetch recipes
  const { data: recipesData } = useQuery({
    queryKey: ['recipes'],
    queryFn: async () => {
      const response = await api.get('/recipes');
      return response.data.recipes || [];
    }
  });

  // Mutations
  const createSaleMutation = useMutation({
    mutationFn: async (saleData) => {
      if (!selectedBranch) throw new Error('Please select a branch');
      const response = await api.post('/sales', { ...saleData, branch_id: selectedBranch });
      return response.data;
    },
    onSuccess: (data) => {
      setCart([]);
      setSelectedCustomer(null);

      // If sale is pending approval (from backend which we will implement)
      if (data.sale?.discount_status === 'pending') {
        alert('Sale created! Discount approval requested.');
      } else {
        alert('Sale created successfully!');
      }
    },
    onError: (error) => {
      alert(error.response?.data?.error || error.message || 'Failed to create sale');
    },
  });

  const holdOrderMutation = useMutation({
    mutationFn: async (saleData) => {
      if (!selectedBranch) throw new Error('Please select a branch');
      const response = await api.post('/sales', { ...saleData, order_type: 'draft', branch_id: selectedBranch });
      return response.data;
    },
    onSuccess: () => {
      setCart([]);
      setSelectedCustomer(null);
      alert('Order saved as draft!');
    },
    onError: (error) => {
      alert(error.response?.data?.error || error.message || 'Failed to hold order');
    },
  });

  const products = productsData?.products || [];
  const categories = categoriesData || [];
  const customers = customersData || [];
  const recipes = recipesData || [];
  const branches = branchesData || [];

  // Logic for filtering, cart, etc. (Same as before)
  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      if (product.is_variant_child) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          product.name?.toLowerCase().includes(query) ||
          product.sku?.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }
      if (selectedCategory && product.category_id !== selectedCategory) {
        return false;
      }
      return true;
    });
  }, [products, searchQuery, selectedCategory]);

  const hasRecipe = (productId) => recipes.some(r => r.virtual_product_id === productId);

  const addToCart = (product, quantity = 1) => {
    if (hasRecipe(product.id)) {
      setSelectedProduct(product);
      setSelectedQuantity(quantity);
      setShowCoilModal(true);
    } else {
      const existingItem = cart.find((item) => item.product_id === product.id);
      if (existingItem) {
        setCart(
          cart.map((item) =>
            item.product_id === product.id
              ? { ...item, quantity: item.quantity + quantity, subtotal: item.unit_price * (item.quantity + quantity) }
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
            unit_price: parseFloat(product.sale_price) || 0,
            original_price: parseFloat(product.sale_price) || 0, // Track original for discount detection
            subtotal: (parseFloat(product.sale_price) || 0) * quantity,
          },
        ]);
      }
    }
  };

  const handleCoilSelection = (assignments) => {
    if (!selectedProduct) return;
    setCart([
      ...cart,
      {
        product_id: selectedProduct.id,
        product_name: selectedProduct.name,
        product_sku: selectedProduct.sku,
        quantity: selectedQuantity,
        unit_price: parseFloat(selectedProduct.sale_price) || 0,
        original_price: parseFloat(selectedProduct.sale_price) || 0,
        subtotal: (parseFloat(selectedProduct.sale_price) || 0) * selectedQuantity,
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

  const updateCartPrice = (productId, newPrice) => {
    setCart(
      cart.map((item) => {
        if (item.product_id === productId) {
          const price = parseFloat(newPrice) || 0;
          return {
            ...item,
            unit_price: price,
            subtotal: price * item.quantity,
          };
        }
        return item;
      })
    );
  };

  const removeFromCart = (productId) => setCart(cart.filter((item) => item.product_id !== productId));
  const clearCart = () => { if (cart.length > 0 && window.confirm('Clear all items from cart?')) setCart([]); };

  const handleCheckout = () => {
    if (cart.length === 0) return;
    if (!selectedBranch) {
      alert('Please select a branch before creating a sale');
      return;
    }
    const items = cart.map((item) => ({
      product_id: item.product_id,
      quantity: item.quantity,
      unit_price: item.unit_price,
      item_assignments: item.item_assignments || [],
    }));
    createSaleMutation.mutate({ customer_id: selectedCustomer?.id || null, items, payment_status: 'unpaid' });
  };

  const handleHoldOrder = () => {
    if (cart.length === 0) return;
    if (!selectedBranch) {
      alert('Please select a branch before holding the order');
      return;
    }
    const items = cart.map((item) => ({
      product_id: item.product_id,
      quantity: item.quantity,
      unit_price: item.unit_price,
      item_assignments: item.item_assignments || [],
    }));
    holdOrderMutation.mutate({ customer_id: selectedCustomer?.id || null, items, payment_status: 'unpaid' });
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((e) => {
        console.error(`Error attempting to enable fullscreen mode: ${e.message} (${e.name})`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  const exitPOS = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    }
    navigate('/');
  };

  return (
    <div className={`flex h-[calc(100vh-80px)] bg-gray-50/50 -m-6 ${isFullscreen ? 'fixed inset-0 z-50 h-screen m-0' : ''}`}>
      {/* Left Area: Product Browser */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Modern Header */}
        <header className="px-6 py-4 flex items-center justify-between bg-white/80 backdrop-blur-md sticky top-0 z-10 border-b border-gray-100">
          <div className="flex items-center gap-4 flex-1">
            {/* Exit Button */}
            <button
              onClick={exitPOS}
              className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all flex items-center gap-2"
              title="Exit POS"
            >
              <LogOut className="h-5 w-5" />
              <span className="font-medium text-sm hidden sm:inline">Exit</span>
            </button>

            <div className="relative flex-1 max-w-lg group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
              </div>
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full pl-10 pr-3 py-2.5 border-none bg-gray-100 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-0 focus:bg-white focus:shadow-md rounded-xl transition-all duration-300 sm:text-sm"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex bg-gray-100 p-1 rounded-lg">
              <button title="Grid View" className="p-2 bg-white rounded-md shadow-sm text-gray-900">
                <LayoutGrid className="h-4 w-4 text-gray-700" />
              </button>
            </div>

            <button
              onClick={toggleFullscreen}
              className="p-2.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-all"
              title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
            >
              {isFullscreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
            </button>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 scroll-smooth">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 tracking-tight">Catalog</h2>
            <CategoryTabs
              categories={categories.filter(c => !c.parent_id)}
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
            />
          </div>

          <ProductGrid
            products={filteredProducts}
            onAddToCart={addToCart}
            isLoading={productsLoading}
          />
        </div>
      </div>

      {/* Right Area: Cart Sidebar */}
      <div className="w-[420px] flex-shrink-0 z-20">
        <CartSidebar
          cart={cart}
          onUpdateQuantity={updateCartQuantity}
          onUpdatePrice={updateCartPrice}
          onRemoveItem={removeFromCart}
          onClearCart={clearCart}
          onCheckout={handleCheckout}
          onHoldOrder={handleHoldOrder}
          customers={customers}
          selectedCustomer={selectedCustomer}
          onSelectCustomer={setSelectedCustomer}
          isProcessing={createSaleMutation.isPending || holdOrderMutation.isPending}
          canEditPrice={canEditPrice}
          branches={branches}
          selectedBranch={selectedBranch}
          onSelectBranch={setSelectedBranch}
          canSelectBranch={canSelectBranch}
          user={user}
        />
      </div>

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
