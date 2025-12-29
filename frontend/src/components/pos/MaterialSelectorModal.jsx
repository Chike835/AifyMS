import { useState, useEffect } from 'react';
import { X, Check, Wand2 } from 'lucide-react';
import api from '../../utils/api';

// Generic material selector for recipe-based products
const MaterialSelectorModal = ({ isOpen, onClose, product, quantity, onConfirm, branchId }) => {
  const [recipe, setRecipe] = useState(null);
  const [availableCoils, setAvailableCoils] = useState([]);
  const [selectedCoils, setSelectedCoils] = useState([]);
  const [loading, setLoading] = useState(false);
  const [autoLoading, setAutoLoading] = useState(false);
  const [error, setError] = useState('');

  const requiredQuantity = recipe ? parseFloat(quantity) * parseFloat(recipe.conversion_factor) : 0;
  const selectedTotal = selectedCoils.reduce((sum, coil) => sum + parseFloat(coil.quantity_deducted || 0), 0);
  const isValid = selectedTotal >= requiredQuantity - 0.001;
  const rawProductUnit = recipe?.raw_product?.base_unit || 'KG';

  useEffect(() => {
    if (isOpen && product) {
      fetchRecipeAndCoils();
    } else {
      setRecipe(null);
      setAvailableCoils([]);
      setSelectedCoils([]);
      setError('');
    }
  }, [isOpen, product]);

  const fetchRecipeAndCoils = async () => {
    setLoading(true);
    setError('');
    try {
      const recipeResponse = await api.get(`/recipes/by-virtual/${product.id}`);
      const recipeData = recipeResponse.data.recipe;
      setRecipe(recipeData);

      const batchesResponse = await api.get(`/inventory/batches/available/${recipeData.raw_product_id}`, {
        params: branchId ? { branch_id: branchId } : undefined
      });
      setAvailableCoils(batchesResponse.data.batches || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load recipe or available materials');
    } finally {
      setLoading(false);
    }
  };

  const applySuggestions = (suggestions = []) => {
    setSelectedCoils(
      suggestions.map((s) => ({
        inventory_batch_id: s.inventory_batch_id,
        instance_code: s.instance_code,
        available_quantity: parseFloat(s.available_quantity || s.remaining_quantity || 0),
        quantity_deducted: parseFloat(s.quantity_deducted || 0),
        batch_identifier: s.batch_identifier || null,
      }))
    );
  };

  const handleAutoSelect = async () => {
    if (!product) return;
    setAutoLoading(true);
    setError('');
    try {
      const response = await api.post('/production/assign-material/proposal', {
        product_id: product.id,
        quantity,
        branch_id: branchId || null,
        recipe_id: recipe?.id || null, // Pass current recipe_id to ensure same recipe is used
      });
      const proposal = response.data?.proposal;
      if (!proposal?.suggestions?.length) {
        setError('No automatic proposal available for this quantity');
        return;
      }

      // Update recipe state with the proposal's recipe (should match if recipe_id was passed)
      if (proposal.recipe) {
        setRecipe({
          id: proposal.recipe.id,
          conversion_factor: proposal.recipe.conversion_factor,
          raw_product_id: proposal.recipe.raw_product_id,
          raw_product: {
            name: proposal.recipe.raw_product_name,
            base_unit: proposal.recipe.raw_product_base_unit,
          },
        });
      }

      applySuggestions(proposal.suggestions);
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || 'Failed to auto-select materials');
    } finally {
      setAutoLoading(false);
    }
  };

  const toggleCoilSelection = (coil) => {
    setSelectedCoils((prev) => {
      const existing = prev.find((c) => c.inventory_batch_id === coil.id);
      if (existing) {
        // Deselect: remove from selection
        return prev.filter((c) => c.inventory_batch_id !== coil.id);
      } else {
        // Select: calculate remaining required quantity
        const currentSelectedTotal = prev.reduce((sum, c) => sum + parseFloat(c.quantity_deducted || 0), 0);
        const remainingRequired = Math.max(0, requiredQuantity - currentSelectedTotal);
        
        // Autofill with minimum of available quantity and remaining required
        const availableQty = parseFloat(coil.remaining_quantity);
        const quantityToDeduct = Math.min(availableQty, remainingRequired);
        
        return [
          ...prev,
          {
            inventory_batch_id: coil.id,
            instance_code: coil.instance_code,
            available_quantity: availableQty,
            quantity_deducted: quantityToDeduct,
            batch_identifier: coil.batch_identifier || null,
          },
        ];
      }
    });
  };

  const updateQuantity = (coilId, quantityValue) => {
    setSelectedCoils((prev) => {
      // Calculate current total excluding the coil being edited
      const totalWithoutCurrent = prev
        .filter((c) => c.inventory_batch_id !== coilId)
        .reduce((sum, c) => sum + parseFloat(c.quantity_deducted || 0), 0);
      
      // Find the coil being edited
      const currentCoil = prev.find((c) => c.inventory_batch_id === coilId);
      if (!currentCoil) return prev;
      
      // Calculate maximum allowed: min(available_quantity, remaining_required)
      const remainingRequired = Math.max(0, requiredQuantity - totalWithoutCurrent);
      const maxAllowed = Math.min(currentCoil.available_quantity, remainingRequired);
      
      // Clamp the input value between 0 and maxAllowed
      const parsedValue = parseFloat(quantityValue) || 0;
      const clampedValue = Math.max(0, Math.min(parsedValue, maxAllowed));
      
      return prev.map((c) =>
        c.inventory_batch_id === coilId
          ? { ...c, quantity_deducted: clampedValue }
          : c
      );
    });
  };

  const handleConfirm = () => {
    if (!isValid) {
      const unit = recipe?.raw_product?.base_unit || 'KG';
      setError(`Selected quantity (${selectedTotal.toFixed(3)} ${unit}) is less than required (${requiredQuantity.toFixed(3)} ${unit})`);
      return;
    }
    // Include recipe_id to ensure backend uses the same recipe
    onConfirm({
      assignments: selectedCoils,
      recipe_id: recipe?.id || null
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Select Materials</h2>
            <p className="text-sm text-gray-600 mt-1">
              {product.name} - {quantity} {product.base_unit}
            </p>
            {recipe && (
              <p className="text-sm font-medium text-primary-600 mt-2">
                Required: {requiredQuantity.toFixed(3)} {rawProductUnit} (Raw Material: {recipe.raw_product?.name})
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
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading available materials...</p>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          ) : (
            <>
              {availableCoils.length === 0 ? (
                <div className="text-center py-12 text-gray-600">
                  No available materials found for this product
                </div>
              ) : (
                <div className="space-y-3">
                  {availableCoils.map((coil) => {
                    const isSelected = selectedCoils.some((c) => c.inventory_batch_id === coil.id);
                    const selectedCoil = selectedCoils.find((c) => c.inventory_batch_id === coil.id);
                    
                    // Calculate max allowed for this coil: min(available, remaining_required)
                    const totalWithoutCurrent = selectedCoils
                      .filter((c) => c.inventory_batch_id !== coil.id)
                      .reduce((sum, c) => sum + parseFloat(c.quantity_deducted || 0), 0);
                    const remainingRequired = Math.max(0, requiredQuantity - totalWithoutCurrent);
                    const maxAllowed = Math.min(parseFloat(coil.remaining_quantity), remainingRequired);

                    return (
                      <div
                        key={coil.id}
                        className={`border rounded-lg p-4 ${isSelected ? 'border-primary-500 bg-primary-50' : 'border-gray-200'}`}
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
                                Available: {parseFloat(coil.remaining_quantity).toFixed(3)} {coil.product?.base_unit}
                              </div>
                            </div>
                          </div>
                          {isSelected && (
                            <div className="flex items-center space-x-2">
                              <input
                                type="number"
                                min="0"
                                max={maxAllowed}
                                step="0.001"
                                value={selectedCoil?.quantity_deducted || 0}
                                onChange={(e) => updateQuantity(coil.id, e.target.value)}
                                className="w-32 px-3 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                              />
                              <span className="text-sm text-gray-600">{coil.product?.base_unit}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {selectedCoils.length > 0 && (
                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-gray-700">Selected Total:</span>
                    <span className={`text-lg font-bold ${isValid ? 'text-green-600' : 'text-red-600'}`}>
                      {selectedTotal.toFixed(3)} {rawProductUnit}
                    </span>
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-sm text-gray-600">Required:</span>
                    <span className="text-sm font-medium text-gray-900">
                      {requiredQuantity.toFixed(3)} {rawProductUnit}
                    </span>
                  </div>
                  {!isValid && (
                    <p className="text-sm text-red-600 mt-2">
                      Need {(requiredQuantity - selectedTotal).toFixed(3)} {rawProductUnit} more
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-4 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!isValid || selectedCoils.length === 0}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
          >
            <Check className="h-5 w-5" />
            <span>Confirm Selection</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default MaterialSelectorModal;



