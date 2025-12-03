import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../../context/AuthContext';
import api from '../../../utils/api';
import { Settings, Plus, Edit, Trash2, X, Gauge, Palette } from 'lucide-react';

const GaugesColorsSettings = () => {
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('gauges');
  const [showModal, setShowModal] = useState(false);
  const [editingValue, setEditingValue] = useState(null);
  const [formData, setFormData] = useState({ value: '' });

  // Fetch manufacturing settings
  const { data: settingsData, isLoading } = useQuery({
    queryKey: ['manufacturingSettings'],
    queryFn: async () => {
      const response = await api.get('/settings?category=manufacturing');
      return response.data.settings || {};
    }
  });

  // Update setting mutation
  const updateSettingMutation = useMutation({
    mutationFn: async ({ key, value }) => {
      const response = await api.put(`/settings/${key}`, { value });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manufacturingSettings'] });
      closeModal();
    },
    onError: (error) => {
      alert(error.response?.data?.error || 'Failed to update setting');
    }
  });

  const getSettingValue = (key) => {
    return settingsData?.[key]?.value || [];
  };

  const openModal = (value = null, isEdit = false) => {
    setEditingValue(isEdit ? value : null);
    setFormData({ value: isEdit ? value : '' });
    setShowModal(true);
  };

  const closeModal = () => {
    setEditingValue(null);
    setFormData({ value: '' });
    setShowModal(false);
  };

  const handleAdd = (valueToAdd = null) => {
    const value = valueToAdd || formData.value;
    if (!value.trim()) {
      alert('Please enter a value');
      return;
    }

    const currentValues = getSettingValue(getSettingKey());
    const newValues = [...currentValues, value.trim()];
    
    updateSettingMutation.mutate({
      key: getSettingKey(),
      value: newValues
    });
  };

  const handleEdit = (valueToEdit = null) => {
    const value = valueToEdit || formData.value;
    if (!value.trim()) {
      alert('Please enter a value');
      return;
    }

    const currentValues = getSettingValue(getSettingKey());
    const index = currentValues.indexOf(editingValue);
    if (index === -1) return;

    const newValues = [...currentValues];
    newValues[index] = value.trim();
    
    updateSettingMutation.mutate({
      key: getSettingKey(),
      value: newValues
    });
  };

  const handleDelete = (value) => {
    if (!window.confirm(`Delete "${value}"?`)) return;

    const currentValues = getSettingValue(getSettingKey());
    const newValues = currentValues.filter(v => v !== value);
    
    updateSettingMutation.mutate({
      key: getSettingKey(),
      value: newValues
    });
  };

  const getSettingKey = () => {
    const keyMap = {
      'gauges': 'manufacturing_gauges',
      'aluminium_colors': 'manufacturing_aluminium_colors',
      'stone_tile_colors': 'manufacturing_stone_tile_colors',
      'stone_tile_design': 'manufacturing_stone_tile_design'
    };
    return keyMap[activeTab] || 'manufacturing_gauges';
  };

  const getTabLabel = () => {
    const labels = {
      'gauges': 'Gauges',
      'aluminium_colors': 'Aluminium Colors',
      'stone_tile_colors': 'Stone Tile Colors',
      'stone_tile_design': 'Stone Tile Design'
    };
    return labels[activeTab] || 'Gauges';
  };

  const validateGauge = (value) => {
    const num = parseFloat(value);
    if (isNaN(num)) return false;
    return num >= 0.1 && num <= 1.0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (activeTab === 'gauges') {
      if (!validateGauge(formData.value)) {
        alert('Gauge must be a number between 0.1 and 1.0 mm');
        return;
      }
      // Format as string with .1 precision - use setFormData to update state immutably
      const formattedValue = parseFloat(formData.value).toFixed(1);
      setFormData({ value: formattedValue });
      
      // Use the formatted value directly for the add/edit operations
      if (editingValue) {
        handleEdit(formattedValue);
      } else {
        handleAdd(formattedValue);
      }
      return;
    }

    if (editingValue) {
      handleEdit();
    } else {
      handleAdd();
    }
  };

  const currentValues = getSettingValue(getSettingKey());

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Gauges & Colors Settings</h1>
        <p className="text-gray-600 mt-2">Manage product attributes for manufacturing</p>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('gauges')}
            className={`py-4 px-1 text-sm font-medium border-b-2 ${
              activeTab === 'gauges'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
            }`}
          >
            <Gauge className="inline h-4 w-4 mr-2" />
            Gauges (mm)
          </button>
          <button
            onClick={() => setActiveTab('aluminium_colors')}
            className={`py-4 px-1 text-sm font-medium border-b-2 ${
              activeTab === 'aluminium_colors'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
            }`}
          >
            <Palette className="inline h-4 w-4 mr-2" />
            Aluminium Colors
          </button>
          <button
            onClick={() => setActiveTab('stone_tile_colors')}
            className={`py-4 px-1 text-sm font-medium border-b-2 ${
              activeTab === 'stone_tile_colors'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
            }`}
          >
            <Palette className="inline h-4 w-4 mr-2" />
            Stone Tile Colors
          </button>
          <button
            onClick={() => setActiveTab('stone_tile_design')}
            className={`py-4 px-1 text-sm font-medium border-b-2 ${
              activeTab === 'stone_tile_design'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
            }`}
          >
            <Settings className="inline h-4 w-4 mr-2" />
            Stone Tile Design
          </button>
        </nav>
      </div>

      {/* Content */}
      <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">{getTabLabel()}</h2>
          {hasPermission('settings_manage') && (
            <button
              onClick={() => openModal(null, false)}
              className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              <Plus className="h-5 w-5" />
              <span>Add {getTabLabel().slice(0, -1)}</span>
            </button>
          )}
        </div>

        <div className="space-y-2">
          {currentValues.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No {getTabLabel().toLowerCase()} found</p>
          ) : (
            currentValues.map((value, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                <span className="text-gray-900">
                  {activeTab === 'gauges' ? `${value} mm` : value}
                </span>
                {hasPermission('settings_manage') && (
                  <div className="flex space-x-2">
                    <button
                      onClick={() => openModal(value, true)}
                      className="text-blue-600 hover:text-blue-900"
                      title="Edit"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(value)}
                      className="text-red-600 hover:text-red-900"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                {editingValue ? 'Edit' : 'Add'} {getTabLabel().slice(0, -1)}
              </h2>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {activeTab === 'gauges' ? 'Gauge (mm) *' : 'Value *'}
                </label>
                <input
                  type={activeTab === 'gauges' ? 'number' : 'text'}
                  step={activeTab === 'gauges' ? '0.1' : undefined}
                  min={activeTab === 'gauges' ? '0.1' : undefined}
                  max={activeTab === 'gauges' ? '1.0' : undefined}
                  required
                  value={formData.value}
                  onChange={(e) => setFormData({ value: e.target.value })}
                  placeholder={activeTab === 'gauges' ? '0.1 - 1.0' : `Enter ${getTabLabel().slice(0, -1).toLowerCase()}`}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                {activeTab === 'gauges' && (
                  <p className="text-xs text-gray-500 mt-1">Enter a value between 0.1 and 1.0 mm</p>
                )}
              </div>
              <div className="flex space-x-4 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateSettingMutation.isPending}
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {updateSettingMutation.isPending ? 'Saving...' : editingValue ? 'Update' : 'Add'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default GaugesColorsSettings;




