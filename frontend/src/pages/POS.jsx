import { useState, useMemo, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import MaterialSelectorModal from '../components/pos/MaterialSelectorModal';
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
    queryKey: ['products', 'pos', selectedBranch],
    queryFn: async () => {
      const response = await api.get('/products', {
        params: {
          status: 'active',
          not_for_selling: 'false',
          include_variants: 'true',
          limit: 500,
          branch_id: selectedBranch || undefined
        }
      });
      return response.data;
    },
    // Allow loading when no branch yet; backend will default or error handled in UI
    enabled: true
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
      alert('Sale created successfully!');
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
    const filtered = products.filter(product => {
      // Exclude parent variable products - we want to show variants instead
      if (product.type === 'variable' && !product.is_variant_child) return false;
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
    
    // Sort by stock: products with stock > 0 appear first
    return filtered.sort((a, b) => {
      const stockA = parseFloat(a.current_stock) || 0;
      const stockB = parseFloat(b.current_stock) || 0;
      if (stockA > 0 && stockB <= 0) return -1;
      if (stockA <= 0 && stockB > 0) return 1;
      return 0; // Maintain relative order for products with same stock status
    });
  }, [products, searchQuery, selectedCategory]);

  const hasRecipe = (productId) => recipes.some(r => r.virtual_product_id === productId);

  /**
   * Validate item assignments for manufactured products before checkout
   * Ensures assignments exist and are properly structured
   * Note: Full validation (checking batch product_ids match recipe raw_product_ids) 
   * is done on the backend due to requiring batch details
   * @param {Array} cartItems - Cart items to validate
   * @returns {{valid: boolean, error?: string}} Validation result
   */
  const validateItemAssignments = (cartItems) => {
    for (const item of cartItems) {
      if (item.requires_material_assignment) {
        // Check that assignments exist
        if (!item.item_assignments || !Array.isArray(item.item_assignments) || item.item_assignments.length === 0) {
          return {
            valid: false,
            error: `Missing material assignments for "${item.product_name}". Please assign materials before checkout.`
          };
        }

        // Validate assignment structure
        for (const assignment of item.item_assignments) {
          if (!assignment.inventory_batch_id || assignment.quantity_deducted === undefined || assignment.quantity_deducted === null) {
            return {
              valid: false,
              error: `Invalid assignment structure for "${item.product_name}". Each assignment must have inventory_batch_id and quantity_deducted.`
            };
          }

          const qty = parseFloat(assignment.quantity_deducted);
          if (isNaN(qty) || qty <= 0) {
            return {
              valid: false,
              error: `Invalid quantity in assignment for "${item.product_name}". Quantity must be greater than 0.`
            };
          }
        }

        // Check if recipe exists (should always exist if requires_material_assignment is true)
        const recipe = recipes.find(r => r.virtual_product_id === item.product_id);
        if (!recipe) {
          console.warn(`Recipe not found for product ${item.product_id} (${item.product_name}) that requires material assignment`);
          // Don't block checkout, but log warning - backend will validate
        }
      }
    }

    return { valid: true };
  };

  const addToCart = (product, quantity = 1) => {
    const requiresMaterialAssignment = hasRecipe(product.id);
    const existingItem = cart.find((item) => item.product_id === product.id);
    const unitPrice = parseFloat(product.sale_price) || 0;

    if (existingItem) {
      setCart(
        cart.map((item) => {
          if (item.product_id !== product.id) return item;
          const newQuantity = (parseFloat(item.quantity) || 0) + (parseFloat(quantity) || 0);

          // If quantity changes for recipe-based products, clear any existing assignments (they're now stale)
          const shouldClearAssignments = requiresMaterialAssignment && item.item_assignments && item.item_assignments.length > 0;

          return {
            ...item,
            quantity: newQuantity,
            subtotal: item.unit_price * newQuantity,
            requires_material_assignment: requiresMaterialAssignment,
            base_unit: product.base_unit || item.base_unit,
            item_assignments: shouldClearAssignments ? [] : (item.item_assignments || []),
            recipe_id: shouldClearAssignments ? null : (item.recipe_id || null) // Clear recipe_id when assignments are cleared
          };
        })
      );
      return;
    }

    setCart([
      ...cart,
      {
        product_id: product.id,
        product_name: product.name,
        product_sku: product.sku,
        base_unit: product.base_unit,
        quantity: quantity,
        unit_price: unitPrice,
        original_price: unitPrice, // Track original for discount detection
        subtotal: unitPrice * quantity,
        requires_material_assignment: requiresMaterialAssignment,
        item_assignments: [],
      },
    ]);
  };

  const handleCoilSelection = (selectionData) => {
    if (!selectedProduct) return;
    
    // Handle both new format { assignments, recipe_id } and legacy array format
    const assignments = selectionData?.assignments || (Array.isArray(selectionData) ? selectionData : []);
    const recipe_id = selectionData?.recipe_id || null;
    
    setCart(
      cart.map((item) => {
        if (item.product_id !== selectedProduct.id) return item;
        return {
          ...item,
          item_assignments: assignments,
          recipe_id: recipe_id, // Store recipe_id to ensure backend uses the same recipe
        };
      })
    );
    setShowCoilModal(false);
    setSelectedProduct(null);
  };

  const handleAssignMaterial = (productId) => {
    const cartItem = cart.find((i) => i.product_id === productId);
    if (!cartItem) return;

    const productDetails =
      products.find((p) => p.id === productId) || {
        id: cartItem.product_id,
        name: cartItem.product_name,
        sku: cartItem.product_sku,
        base_unit: cartItem.base_unit,
        sale_price: cartItem.unit_price
      };

    setSelectedProduct(productDetails);
    setSelectedQuantity(cartItem.quantity);
    setShowCoilModal(true);
  };

  const updateCartQuantity = (productId, delta) => {
    setCart(
      cart.map((item) => {
        if (item.product_id === productId) {
          const newQuantity = Math.max(1, item.quantity + delta);
          const shouldClearAssignments = item.requires_material_assignment && item.item_assignments && item.item_assignments.length > 0;
          return {
            ...item,
            quantity: newQuantity,
            subtotal: item.unit_price * newQuantity,
            item_assignments: shouldClearAssignments ? [] : (item.item_assignments || [])
          };
        }
        return item;
      })
    );
  };

  const setCartQuantity = (productId, quantity) => {
    const parsedQuantity = parseFloat(quantity);
    if (isNaN(parsedQuantity) || parsedQuantity <= 0) {
      return; // Invalid quantity, don't update
    }
    setCart(
      cart.map((item) => {
        if (item.product_id === productId) {
          const shouldClearAssignments = item.requires_material_assignment && item.item_assignments && item.item_assignments.length > 0;
          return {
            ...item,
            quantity: parsedQuantity,
            subtotal: item.unit_price * parsedQuantity,
            item_assignments: shouldClearAssignments ? [] : (item.item_assignments || [])
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

    // Validate item assignments before checkout
    const validation = validateItemAssignments(cart);
    if (!validation.valid) {
      alert(validation.error);
      return;
    }

    const items = cart.map((item) => ({
      product_id: item.product_id,
      quantity: item.quantity,
      unit_price: item.unit_price,
      item_assignments: item.item_assignments || [],
      recipe_id: item.recipe_id || null, // Pass recipe_id to ensure backend uses the same recipe
    }));
    createSaleMutation.mutate({ customer_id: selectedCustomer?.id || null, items, payment_status: 'unpaid' });
  };

  const handleHoldOrder = () => {
    if (cart.length === 0) return;
    if (!selectedBranch) {
      alert('Please select a branch before holding the order');
      return;
    }

    // Validate item assignments before holding order
    const validation = validateItemAssignments(cart);
    if (!validation.valid) {
      alert(validation.error);
      return;
    }

    const items = cart.map((item) => ({
      product_id: item.product_id,
      quantity: item.quantity,
      unit_price: item.unit_price,
      item_assignments: item.item_assignments || [],
      recipe_id: item.recipe_id || null, // Pass recipe_id to ensure backend uses the same recipe
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
    // If opened in a new window/tab, close it; otherwise navigate home
    if (window.opener || window.history.length <= 1) {
      // Opened in new window/tab - close it
      window.close();
    } else {
      // Opened in same window - navigate home
      navigate('/');
    }
  };

  return (
    <div className={`flex h-screen bg-gray-50/50 ${isFullscreen ? 'fixed inset-0 z-50' : ''}`}>
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
          onSetQuantity={setCartQuantity}
          onUpdatePrice={updateCartPrice}
          onRemoveItem={removeFromCart}
          onClearCart={clearCart}
          onCheckout={handleCheckout}
          onHoldOrder={handleHoldOrder}
          onAssignMaterial={handleAssignMaterial}
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

      <MaterialSelectorModal
        isOpen={showCoilModal}
        onClose={() => {
          setShowCoilModal(false);
          setSelectedProduct(null);
        }}
        product={selectedProduct}
        quantity={selectedQuantity}
        onConfirm={handleCoilSelection}
        branchId={selectedBranch}
      />
    </div>
  );
};

export default POS;
