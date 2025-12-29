import { useState, useEffect } from 'react';
import { X, Check, ChevronLeft, ChevronRight, Package, AlertCircle, Wand2 } from 'lucide-react';
import api from '../../utils/api';

/**
 * ManufacturedItemSelector - A wizard-style modal to collect coil/raw material assignments
 * for manufactured_virtual items before converting a draft/quotation to invoice.
 * 
 * Props:
 * - isOpen: boolean - whether the modal is visible
 * - items: array - order items (with product info) that may contain manufactured products
 * - onConfirm: function(itemAssignments) - called with the collected assignments
 * - onCancel: function - called when user cancels
 */
const ManufacturedItemSelector = ({ isOpen, items, onConfirm, onCancel, branchId }) => {
  // Filter items to only those that need coil selection
  const [manufacturedItems, setManufacturedItems] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [assignments, setAssignments] = useState({}); // { item_id: [...coils] }
  
  // Per-item state
  const [recipe, setRecipe] = useState(null);
  const [availableCoils, setAvailableCoils] = useState([]);
  const [selectedCoils, setSelectedCoils] = useState([]);
  const [loading, setLoading] = useState(false);
  const [autoLoading, setAutoLoading] = useState(false);
  const [error, setError] = useState('');

  // Initialize items with recipes when modal opens
  useEffect(() => {
    if (isOpen && items) {
      const checkRecipes = async () => {
        const itemsWithRecipes = [];
        for (const item of items) {
          if (item.product?.id) {
            try {
              const response = await api.get(`/recipes/by-virtual/${item.product.id}`);
              if (response.data.recipe) {
                itemsWithRecipes.push(item);
              }
            } catch (error) {
              // No recipe found, skip this item
            }
          }
        }
        setManufacturedItems(itemsWithRecipes);
        if (itemsWithRecipes.length === 0) {
          onConfirm({});
        }
      };
      checkRecipes();
      setCurrentIndex(0);
      setAssignments({});
      setSelectedCoils([]);
    }
  }, [isOpen, items]);

  // Fetch recipe and coils when current item changes
  useEffect(() => {
    if (isOpen && manufacturedItems.length > 0 && currentIndex < manufacturedItems.length) {
      const currentItem = manufacturedItems[currentIndex];
      fetchRecipeAndCoils(currentItem);
      // Restore previously selected coils if returning to this item
      if (assignments[currentItem.id]) {
        setSelectedCoils(assignments[currentItem.id]);
      } else {
        setSelectedCoils([]);
      }
    }
  }, [isOpen, currentIndex, manufacturedItems]);

  const fetchRecipeAndCoils = async (item) => {
    setLoading(true);
    setError('');
    setRecipe(null);
    setAvailableCoils([]);
    
    try {
      // Fetch recipe for the virtual product
      const recipeResponse = await api.get(`/recipes/by-virtual/${item.product.id}`);
      const recipeData = recipeResponse.data.recipe;
      setRecipe(recipeData);

      // Fetch available coils for the raw product
      const batchesResponse = await api.get(`/inventory/batches/available/${recipeData.raw_product_id}`, {
        params: branchId ? { branch_id: branchId } : undefined
      });
      setAvailableCoils(batchesResponse.data.batches || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load recipe or available coils');
    } finally {
      setLoading(false);
    }
  };

  const currentItem = manufacturedItems[currentIndex];
  const requiredQuantity = recipe && currentItem 
    ? parseFloat(currentItem.quantity) * parseFloat(recipe.conversion_factor) 
    : 0;
  const selectedTotal = selectedCoils.reduce((sum, coil) => sum + parseFloat(coil.quantity_deducted || 0), 0);
  const isCurrentValid = selectedTotal >= requiredQuantity - 0.001;
  const rawProductUnit = recipe?.raw_product?.base_unit || 'KG';

  const toggleCoilSelection = (coil) => {
    setSelectedCoils((prev) => {
      const existing = prev.find((c) => c.inventory_batch_id === coil.id);
      if (existing) {
        return prev.filter((c) => c.inventory_batch_id !== coil.id);
      } else {
        return [
          ...prev,
          {
            inventory_batch_id: coil.id,
            instance_code: coil.instance_code,
            available_quantity: parseFloat(coil.remaining_quantity),
            quantity_deducted: parseFloat(coil.remaining_quantity),
          },
        ];
      }
    });
  };

  const updateQuantity = (coilId, quantity) => {
    setSelectedCoils((prev) =>
      prev.map((c) =>
        c.inventory_batch_id === coilId
          ? { ...c, quantity_deducted: Math.max(0, Math.min(parseFloat(quantity), c.available_quantity)) }
          : c
      )
    );
  };

  const handleNext = () => {
    if (!isCurrentValid) {
      const unit = recipe?.raw_product?.base_unit || 'KG';
      setError(`Selected quantity (${selectedTotal.toFixed(3)} ${unit}) is less than required (${requiredQuantity.toFixed(3)} ${unit})`);
      return;
    }
    
    // Save current selection
    const newAssignments = {
      ...assignments,
      [currentItem.id]: selectedCoils
    };
    setAssignments(newAssignments);
    setError('');

    if (currentIndex < manufacturedItems.length - 1) {
      // Move to next item
      setCurrentIndex(currentIndex + 1);
    } else {
      // All items done, confirm with all assignments
      onConfirm(newAssignments);
    }
  };

  const handleBack = () => {
    if (currentIndex > 0) {
      // Save current selection before going back
      setAssignments({
        ...assignments,
        [currentItem.id]: selectedCoils
      });
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleAutoSelect = async () => {
    if (!currentItem) return;
    setAutoLoading(true);
    setError('');
    try {
      const response = await api.post('/production/assign-material/proposal', {
        product_id: currentItem.product.id,
        quantity: currentItem.quantity,
        branch_id: branchId || currentItem.branch_id || currentItem.order?.branch_id || null
      });

      const proposal = response.data?.proposal;
      if (!proposal?.suggestions?.length) {
        setError('No automatic proposal available for this item');
        return;
      }

      // Ensure recipe is available for calculations
      if (!recipe && proposal.recipe) {
        setRecipe({
          id: proposal.recipe.id,
          conversion_factor: proposal.recipe.conversion_factor,
          raw_product_id: proposal.recipe.raw_product_id,
          raw_product: { 
            name: proposal.recipe.raw_product_name,
            base_unit: proposal.recipe.raw_product_base_unit
          }
        });
      }

      setSelectedCoils(
        proposal.suggestions.map((s) => ({
          inventory_batch_id: s.inventory_batch_id,
          instance_code: s.instance_code,
          available_quantity: parseFloat(s.available_quantity || s.remaining_quantity || 0),
          quantity_deducted: parseFloat(s.quantity_deducted || 0),
          batch_identifier: s.batch_identifier || null
        }))
      );
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || 'Failed to auto-select materials');
    } finally {
      setAutoLoading(false);
    }
  };

  if (!isOpen || manufacturedItems.length === 0) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Select Raw Materials</h2>
            <p className="text-sm text-gray-600 mt-1">
              Step {currentIndex + 1} of {manufacturedItems.length}: {currentItem?.product?.name}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Quantity: {parseFloat(currentItem?.quantity || 0).toFixed(3)} {currentItem?.product?.base_unit}
            </p>
            {recipe && (
              <p className="text-sm font-medium text-primary-600 mt-2">
                Required: {requiredQuantity.toFixed(3)} {rawProductUnit} of {recipe.raw_product?.name || 'raw material'}
              </p>
            )}
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={handleAutoSelect}
              disabled={autoLoading}
              className="px-3 py-2 border border-primary-200 text-primary-700 bg-primary-50 rounded-lg hover:bg-primary-100 disabled:opacity-50 flex items-center space-x-2 transition-colors"
              title="Auto-select batches based on recipe (no stock deducted until you confirm)"
            >
              <Wand2 className="h-4 w-4" />
              <span>{autoLoading ? 'Proposing...' : 'Auto-select from recipe'}</span>
            </button>
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="px-6 py-2 bg-gray-50 border-b">
          <div className="flex items-center space-x-2">
            {manufacturedItems.map((_, idx) => (
              <div
                key={idx}
                className={`h-2 flex-1 rounded-full ${
                  idx < currentIndex
                    ? 'bg-green-500'
                    : idx === currentIndex
                    ? 'bg-primary-500'
                    : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading available materials...</p>
            </div>
          ) : error && !availableCoils.length ? (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded flex items-start space-x-2">
              <AlertCircle className="h-5 w-5 mt-0.5" />
              <span>{error}</span>
            </div>
          ) : (
            <>
              {availableCoils.length === 0 ? (
                <div className="text-center py-12 text-gray-600">
                  <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No available coils found for this product</p>
                  <p className="text-sm mt-1">Please ensure raw materials are in stock</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {availableCoils.map((coil) => {
                    const isSelected = selectedCoils.some((c) => c.inventory_batch_id === coil.id);
                    const selectedCoil = selectedCoils.find((c) => c.inventory_batch_id === coil.id);

                    return (
                      <div
                        key={coil.id}
                        className={`border rounded-lg p-4 ${
                          isSelected ? 'border-primary-500 bg-primary-50' : 'border-gray-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleCoilSelection(coil)}
                              className="h-5 w-5 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
                            />
                            <div>
                              <div className="font-medium text-gray-900">
                                {coil.instance_code}
                              </div>
                              <div className="text-sm text-gray-600">
                                Available: {parseFloat(coil.remaining_quantity).toFixed(3)} {coil.product?.base_unit || 'KG'}
                              </div>
                            </div>
                          </div>
                          {isSelected && (
                            <div className="flex items-center space-x-2">
                              <input
                                type="number"
                                min="0"
                                max={coil.remaining_quantity}
                                step="0.001"
                                value={selectedCoil?.quantity_deducted || 0}
                                onChange={(e) => updateQuantity(coil.id, e.target.value)}
                                className="w-32 px-3 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                              />
                              <span className="text-sm text-gray-600">{coil.product?.base_unit || 'KG'}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Selection Summary */}
              {selectedCoils.length > 0 && (
                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-gray-700">Selected Total:</span>
                    <span className={`text-lg font-bold ${isCurrentValid ? 'text-green-600' : 'text-red-600'}`}>
                      {selectedTotal.toFixed(3)} {rawProductUnit}
                    </span>
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-sm text-gray-600">Required:</span>
                    <span className="text-sm font-medium text-gray-900">
                      {requiredQuantity.toFixed(3)} {rawProductUnit}
                    </span>
                  </div>
                  {!isCurrentValid && (
                    <p className="text-sm text-red-600 mt-2">
                      Need {(requiredQuantity - selectedTotal).toFixed(3)} {rawProductUnit} more
                    </p>
                  )}
                </div>
              )}

              {/* Error display */}
              {error && availableCoils.length > 0 && (
                <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                  {error}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <div>
            {currentIndex > 0 && (
              <button
                onClick={handleBack}
                className="flex items-center space-x-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
                <span>Back</span>
              </button>
            )}
          </div>
          <div className="flex space-x-4">
            <button
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleNext}
              disabled={!isCurrentValid || selectedCoils.length === 0}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
            >
              {currentIndex < manufacturedItems.length - 1 ? (
                <>
                  <span>Next</span>
                  <ChevronRight className="h-4 w-4" />
                </>
              ) : (
                <>
                  <Check className="h-5 w-5" />
                  <span>Confirm & Convert</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManufacturedItemSelector;

