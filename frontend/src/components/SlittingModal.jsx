import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../utils/api';
import { X, Scissors } from 'lucide-react';
import AttributeRenderer from './AttributeRenderer';

/**
 * SlittingModal - Modal for converting Loose material into Coils
 * @param {Object} props
 * @param {Boolean} props.isOpen - Whether modal is open
 * @param {Function} props.onClose - Callback to close modal
 * @param {Object} props.sourceBatch - Source batch (Loose type) to convert from
 */
const SlittingModal = ({ isOpen, onClose, sourceBatch }) => {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    new_instance_code: '',
    weight: '',
    attribute_data: {}
  });
  const [errors, setErrors] = useState({});

  // Fetch category details for attribute schema
  const categoryId = sourceBatch?.category_id;

  // Convert mutation
  const convertMutation = useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/inventory/convert-batch', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventoryBatches'] });
      onClose();
      alert('Slitting completed successfully! New coil created.');
      resetForm();
    },
    onError: (error) => {
      setErrors({ submit: error.response?.data?.error || 'Failed to convert batch' });
    }
  });

  const resetForm = () => {
    setFormData({
      new_instance_code: '',
      weight: '',
      attribute_data: {}
    });
    setErrors({});
  };

  useEffect(() => {
    if (isOpen && sourceBatch) {
      // Prefill attribute_data from source batch
      setFormData(prev => ({
        ...prev,
        attribute_data: sourceBatch.attribute_data || {}
      }));
    } else if (!isOpen) {
      resetForm();
    }
  }, [isOpen, sourceBatch]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrors({});

    // Validation
    if (!formData.new_instance_code.trim()) {
      setErrors({ new_instance_code: 'Instance code is required' });
      return;
    }

    if (!formData.weight || parseFloat(formData.weight) <= 0) {
      setErrors({ weight: 'Weight must be greater than 0' });
      return;
    }

    const weight = parseFloat(formData.weight);
    const available = parseFloat(sourceBatch?.remaining_quantity || 0);

    if (weight > available) {
      setErrors({ weight: `Weight cannot exceed available quantity: ${available}` });
      return;
    }

    convertMutation.mutate({
      source_batch_id: sourceBatch.id,
      new_instance_code: formData.new_instance_code.trim(),
      weight: weight,
      attribute_data: formData.attribute_data
    });
  };

  if (!isOpen || !sourceBatch) return null;

  const available = parseFloat(sourceBatch.remaining_quantity || 0);
  const batchType = sourceBatch.batch_type?.name || 'Unknown';
  const canSlit = batchType === 'Loose';

  // Show error message if slitting is not enabled for this batch type
  if (!canSlit) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Slitting Not Available</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="mb-6">
            <p className="text-gray-700 mb-4">
              Slitting is not available for batch type <strong>"{batchType}"</strong>.
            </p>
            <p className="text-sm text-gray-600">
              Only "Loose" type batches can be converted to Coils through slitting. Please check your batch type configuration in Settings.
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <Scissors className="h-6 w-6 text-primary-600" />
            <h2 className="text-2xl font-bold text-gray-900">Slitting: Convert to Coil</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Source Batch Info */}
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">Source Batch (Loose)</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-blue-700">Product:</span>
              <span className="ml-2 text-blue-900">{sourceBatch.product?.name || 'N/A'}</span>
            </div>
            <div>
              <span className="text-blue-700">Available:</span>
              <span className="ml-2 text-blue-900 font-semibold">
                {available.toFixed(3)} {sourceBatch.product?.base_unit || ''}
              </span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* New Instance Code */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              New Coil Instance Code *
            </label>
            <input
              type="text"
              required
              value={formData.new_instance_code}
              onChange={(e) => setFormData({ ...formData, new_instance_code: e.target.value })}
              placeholder="e.g., COIL-001"
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm ${errors.new_instance_code ? 'border-red-300' : 'border-gray-300'
                }`}
            />
            {errors.new_instance_code && (
              <p className="text-xs text-red-600 mt-1">{errors.new_instance_code}</p>
            )}
          </div>

          {/* Weight */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Weight to Convert * ({sourceBatch.product?.base_unit || ''})
            </label>
            <input
              type="number"
              required
              step="0.001"
              min="0.001"
              max={available}
              value={formData.weight}
              onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
              placeholder={`Max: ${available.toFixed(3)}`}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm ${errors.weight ? 'border-red-300' : 'border-gray-300'
                }`}
            />
            {errors.weight && (
              <p className="text-xs text-red-600 mt-1">{errors.weight}</p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              Available: {available.toFixed(3)} {sourceBatch.product?.base_unit || ''}
            </p>
          </div>

          {/* Dynamic Attributes - if category has schema */}
          {sourceBatch.category?.attribute_schema && sourceBatch.category.attribute_schema.length > 0 && (
            <div className="pt-4 border-t border-gray-200">
              <h4 className="text-sm font-semibold text-gray-900 mb-4">Coil Attributes</h4>
              <AttributeRenderer
                schema={sourceBatch.category.attribute_schema}
                values={formData.attribute_data}
                onChange={(newValues) => setFormData({ ...formData, attribute_data: newValues })}
                defaultValues={sourceBatch.attribute_data || {}}
                className="grid grid-cols-2 gap-4"
              />
            </div>
          )}

          {/* Error Message */}
          {errors.submit && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {errors.submit}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={convertMutation.isPending}
              className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
            >
              {convertMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Converting...</span>
                </>
              ) : (
                <>
                  <Scissors className="h-4 w-4" />
                  <span>Convert to Coil</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SlittingModal;

