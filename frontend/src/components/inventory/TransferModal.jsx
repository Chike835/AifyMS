import { useEffect, useState } from 'react';

const TransferModal = ({
  isOpen,
  instance,
  branches = [],
  onClose,
  onSubmit,
  isSubmitting
}) => {
  const [formState, setFormState] = useState({
    to_branch_id: '',
    notes: ''
  });

  useEffect(() => {
    if (isOpen) {
      setFormState({
        to_branch_id: '',
        notes: ''
      });
    }
  }, [isOpen, instance?.id]);

  if (!isOpen || !instance) {
    return null;
  }

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!formState.to_branch_id) return;
    onSubmit?.({
      instance_id: instance.id,
      to_branch_id: formState.to_branch_id,
      notes: formState.notes
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 px-4">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Transfer Instance</h2>
        <div className="mb-4 rounded-lg bg-gray-50 p-3 text-sm text-gray-600">
          <div>
            Instance: <span className="font-semibold">{instance.instance_code}</span>
          </div>
          <div>
            Product: <span className="font-semibold">{instance.product?.name}</span>
          </div>
          <div>
            Current Branch: <span className="font-semibold">{instance.branch?.name}</span>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Destination Branch *
            </label>
            <select
              required
              value={formState.to_branch_id}
              onChange={(event) =>
                setFormState((prev) => ({ ...prev, to_branch_id: event.target.value }))
              }
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
            >
              <option value="">Select Branch</option>
              {branches
                .filter((branch) => branch.id !== instance.branch_id)
                .map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name} ({branch.code})
                  </option>
                ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Notes</label>
            <textarea
              rows={3}
              value={formState.notes}
              onChange={(event) =>
                setFormState((prev) => ({ ...prev, notes: event.target.value }))
              }
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
              placeholder="Optional notes about this transfer"
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
              {isSubmitting ? 'Transferring...' : 'Transfer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TransferModal;


