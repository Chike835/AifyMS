import { useQuery } from '@tanstack/react-query';
import api from '../../utils/api';

const BatchTypeSelect = ({ productId, products, value, onChange, disabled, className = '' }) => {
  const product = products?.find(p => p.id === productId);

  // Fetch batch types based on product's category
  const { data: batchTypesData, isLoading } = useQuery({
    queryKey: ['categoryBatchTypes', product?.category_id, productId],
    queryFn: async () => {
      if (!product?.category_id) {
        // If no category, get global default batch type
        const response = await api.get('/settings/batches/types');
        const allTypes = response.data.batch_types || [];
        const defaultType = allTypes.find(bt => bt.is_default && bt.is_active);
        return defaultType ? { batch_types: [defaultType] } : { batch_types: [] };
      }
      // Get batch types assigned to category
      const response = await api.get(`/settings/batches/types/category/${product.category_id}`);
      return { batch_types: response.data.batch_types || [] };
    },
    enabled: !!productId && !!product,
  });

  const batchTypes = batchTypesData?.batch_types || [];

  return (
    <div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={className}
        disabled={disabled || isLoading}
      >
        <option value="">Auto-select (Default)</option>
        {batchTypes.filter(bt => bt.is_active).map(type => (
          <option key={type.id} value={type.id}>
            {type.name} {type.is_default && '(Default)'}
          </option>
        ))}
      </select>
      {!productId && (
        <p className="text-xs text-gray-500 mt-1">Select a product first</p>
      )}
      {productId && !isLoading && batchTypes.length === 0 && (
        <p className="text-xs text-yellow-600 mt-1">No batch types assigned to this product's category. Default will be used.</p>
      )}
    </div>
  );
};

export default BatchTypeSelect;


