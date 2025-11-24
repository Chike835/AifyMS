import { useEffect, useState } from 'react';

const AdjustModal = ({
  isOpen,
  instance,
  onClose,
  onSubmit,
  isSubmitting
}) => {
  const [formState, setFormState] = useState({
    new_quantity: '',
    reason: ''
  });

  useEffect(() => {
    if (isOpen && instance) {
      setFormState({
        new_quantity: instance.remaining_quantity ?? '',
        reason: ''
      });
    }
  }, [isOpen, instance?.id, instance?.remaining_quantity]);

  if (!isOpen || !instance) {
    return null;
  }

  const handleSubmit = (event) => {
    event.preventDefault();
    if (formState.new_quantity === '' || Number(formState.new_quantity) < 0) {
      return;
    }
    if (!formState.reason.trim()) {
      return;
    }

    onSubmit?.({
      instance_id: instance.id,
      new_quantity: parseFloat(formState.new_quantity),
      reason: formState.reason.trim()
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 px-4">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Adjust Stock</h2>
        <div className="mb-4 rounded-lg bg-gray-50 p-3 text-sm text-gray-600">
          <div>
            Instance: <span className="font-semibold">{instance.instance_code}</span>
          </div>
          <div>
            Product: <span className="font-semibold">{instance.product?.name}</span>
          </div>
          <div>
            Current Quantity:{' '}
            <span className="font-semibold">
              {parseFloat(instance.remaining_quantity).toFixed(3)} {instance.product?.base_unit}
            </span>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">New Quantity *</label>
            <input
              type="number"
              min="0"
              step="0.001"
              required
              value={formState.new_quantity}
              onChange={(event) =>
                setFormState((prev) => ({ ...prev, new_quantity: event.target.value }))
              }
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Reason *</label>
            <textarea
              rows={3}
              required
              value={formState.reason}
              onChange={(event) =>
                setFormState((prev) => ({ ...prev, reason: event.target.value }))
              }
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
              placeholder="Explain why this adjustment is needed"
            />
          </div>
          <div className="flex items-center justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? 'Saving...' : 'Adjust Stock'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdjustModal;


