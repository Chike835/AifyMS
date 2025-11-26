import { useState, useEffect } from 'react';
import { X, Check } from 'lucide-react';
import api from '../../utils/api';

const CoilSelectorModal = ({ isOpen, onClose, product, quantity, onConfirm }) => {
  const [recipe, setRecipe] = useState(null);
  const [availableCoils, setAvailableCoils] = useState([]);
  const [selectedCoils, setSelectedCoils] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const requiredKg = recipe ? parseFloat(quantity) * parseFloat(recipe.conversion_factor) : 0;
  const selectedTotal = selectedCoils.reduce((sum, coil) => sum + parseFloat(coil.quantity_deducted || 0), 0);
  const isValid = selectedTotal >= requiredKg - 0.001; // Allow small floating point differences

  useEffect(() => {
    if (isOpen && product) {
      fetchRecipeAndCoils();
    } else {
      // Reset state when modal closes
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
      // Fetch recipe for the virtual product
      const recipeResponse = await api.get(`/recipes/by-virtual/${product.id}`);
      const recipeData = recipeResponse.data.recipe;
      setRecipe(recipeData);

      // Fetch available coils for the raw product
      const batchesResponse = await api.get(`/inventory/batches/available/${recipeData.raw_product_id}`);
      setAvailableCoils(batchesResponse.data.batches || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load recipe or available coils');
    } finally {
      setLoading(false);
    }
  };

  const toggleCoilSelection = (coil) => {
    setSelectedCoils((prev) => {
      const existing = prev.find((c) => c.inventory_batch_id === coil.id);
      if (existing) {
        return prev.filter((c) => c.inventory_batch_id !== coil.id);
      } else {
        // Add coil with max available quantity
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

  const handleConfirm = () => {
    if (!isValid) {
      setError(`Selected quantity (${selectedTotal.toFixed(3)} KG) is less than required (${requiredKg.toFixed(3)} KG)`);
      return;
    }
    onConfirm(selectedCoils);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Select Coils</h2>
            <p className="text-sm text-gray-600 mt-1">
              {product.name} - {quantity} {product.base_unit}
            </p>
            {recipe && (
              <p className="text-sm font-medium text-primary-600 mt-2">
                Required: {requiredKg.toFixed(3)} KG (Raw Material: {recipe.raw_product?.name})
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading available coils...</p>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          ) : (
            <>
              {availableCoils.length === 0 ? (
                <div className="text-center py-12 text-gray-600">
                  No available coils found for this product
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
                                Available: {parseFloat(coil.remaining_quantity).toFixed(3)} {coil.product?.base_unit}
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
                      {selectedTotal.toFixed(3)} KG
                    </span>
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-sm text-gray-600">Required:</span>
                    <span className="text-sm font-medium text-gray-900">
                      {requiredKg.toFixed(3)} KG
                    </span>
                  </div>
                  {!isValid && (
                    <p className="text-sm text-red-600 mt-2">
                      Need {((requiredKg - selectedTotal).toFixed(3))} KG more
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

export default CoilSelectorModal;

