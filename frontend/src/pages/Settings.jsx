import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../utils/api';
import BrandForm from '../components/settings/BrandForm';
import DataControlBar from '../components/settings/DataControlBar';

const tabs = [
  { id: 'brands', label: 'Brands', component: BrandForm, dataKey: 'brands' }
];

const Settings = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('brands');

  const { data, isLoading } = useQuery({
    queryKey: ['attributes'],
    queryFn: async () => {
      const response = await api.get('/attributes');
      return response.data;
    }
  });

  const invalidateAttributes = () => {
    queryClient.invalidateQueries({ queryKey: ['attributes'] });
  };

  const createMutation = useMutation({
    mutationFn: async ({ type, data: payload }) => {
      const response = await api.post(`/attributes/${type}`, payload);
      return response.data;
    },
    onSuccess: invalidateAttributes
  });

  const updateMutation = useMutation({
    mutationFn: async ({ type, id, data: payload }) => {
      const response = await api.put(`/attributes/${type}/${id}`, payload);
      return response.data;
    },
    onSuccess: invalidateAttributes
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ type, id }) => {
      const response = await api.delete(`/attributes/${type}/${id}`);
      return response.data;
    },
    onSuccess: invalidateAttributes
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const currentTab = tabs.find((tab) => tab.id === activeTab) || tabs[0];
  const ActiveComponent = currentTab.component;
  const items = data?.[currentTab.dataKey] || [];

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="mt-2 text-gray-600">Manage product attributes</p>
        </div>
      </div>

      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-4 px-1 text-sm font-medium border-b-2 ${
                activeTab === tab.id
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'brands' && (
        <DataControlBar
          importEndpoint="/api/attributes/brands/import"
          exportEndpoint="/api/attributes/brands/export"
          entityName="Brands"
          onImportSuccess={() => queryClient.invalidateQueries({ queryKey: ['attributes'] })}
        />
      )}

      <ActiveComponent
        items={items}
        createMutation={createMutation}
        updateMutation={updateMutation}
        deleteMutation={deleteMutation}
      />
    </div>
  );
};

export default Settings;


