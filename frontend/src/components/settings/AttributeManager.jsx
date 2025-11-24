import { useState } from 'react';
import { Plus, Edit2, Trash2 } from 'lucide-react';

const AttributeManager = ({
  items = [],
  singularLabel,
  pluralLabel,
  type,
  createMutation,
  updateMutation,
  deleteMutation
}) => {
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({ name: '' });

  const openModal = (item = null) => {
    setEditingItem(item);
    setFormData({ name: item?.name || '' });
    setShowModal(true);
  };

  const closeModal = () => {
    setEditingItem(null);
    setFormData({ name: '' });
    setShowModal(false);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!formData.name.trim()) return;

    const onSuccess = () => {
      closeModal();
    };

    if (editingItem) {
      updateMutation.mutate(
        { type, id: editingItem.id, data: { name: formData.name.trim() } },
        { onSuccess }
      );
    } else {
      createMutation.mutate(
        { type, data: { name: formData.name.trim() } },
        { onSuccess }
      );
    }
  };

  const handleDelete = (item) => {
    if (!item) return;
    if (!window.confirm(`Delete ${singularLabel.toLowerCase()} "${item.name}"?`)) return;
    deleteMutation.mutate({ type, id: item.id });
  };

  const actionPending =
    createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-xl font-semibold text-gray-900">{pluralLabel}</h3>
        <button
          onClick={() => openModal()}
          className="inline-flex items-center rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-primary-700"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add {singularLabel}
        </button>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Name
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {items.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm font-medium text-gray-900">{item.name}</td>
                <td className="px-6 py-4 text-right text-sm font-medium">
                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={() => openModal(item)}
                      className="text-primary-600 hover:text-primary-900"
                      title={`Edit ${singularLabel}`}
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(item)}
                      className="text-red-600 hover:text-red-900"
                      title={`Delete ${singularLabel}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={2} className="px-6 py-8 text-center text-sm text-gray-500">
                  No {pluralLabel.toLowerCase()} found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 px-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h4 className="text-xl font-semibold text-gray-900">
              {editingItem ? 'Edit' : 'Add'} {singularLabel}
            </h4>
            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(event) => setFormData({ name: event.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
                  placeholder={`Enter ${singularLabel.toLowerCase()} name`}
                />
              </div>
              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionPending}
                  className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {actionPending ? 'Saving...' : editingItem ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttributeManager;

