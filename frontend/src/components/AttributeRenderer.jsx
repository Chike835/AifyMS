import { useState, useEffect } from 'react';

/**
 * AttributeRenderer - Renders dynamic form inputs based on attribute schema
 * @param {Object} props
 * @param {Array} props.schema - Array of attribute definitions from category
 * @param {Object} props.values - Current attribute values
 * @param {Function} props.onChange - Callback when values change
 * @param {Object} props.defaultValues - Default values to prefill (e.g., from product)
 * @param {String} props.className - Additional CSS classes
 */
const AttributeRenderer = ({ 
  schema = [], 
  values = {}, 
  onChange, 
  defaultValues = {},
  className = '' 
}) => {
  const [localValues, setLocalValues] = useState({ ...defaultValues, ...values });

  useEffect(() => {
    // Merge default values with provided values
    setLocalValues({ ...defaultValues, ...values });
  }, [defaultValues, values]);

  const handleChange = (name, value) => {
    const newValues = { ...localValues, [name]: value };
    setLocalValues(newValues);
    if (onChange) {
      onChange(newValues);
    }
  };

  if (!schema || schema.length === 0) {
    return null;
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {schema.map((attr) => {
        const value = localValues[attr.name] || '';
        const isRequired = attr.required === true;

        if (attr.type === 'select' && attr.options) {
          return (
            <div key={attr.name}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {attr.label || attr.name}
                {isRequired && <span className="text-red-500 ml-1">*</span>}
              </label>
              <select
                value={value}
                onChange={(e) => handleChange(attr.name, e.target.value)}
                required={isRequired}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
              >
                <option value="">Select {attr.label || attr.name}</option>
                {attr.options.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              {attr.description && (
                <p className="text-xs text-gray-500 mt-1">{attr.description}</p>
              )}
            </div>
          );
        }

        // Default to text input
        return (
          <div key={attr.name}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {attr.label || attr.name}
              {isRequired && <span className="text-red-500 ml-1">*</span>}
            </label>
            <input
              type={attr.type === 'number' ? 'number' : 'text'}
              step={attr.type === 'number' ? attr.step || '0.01' : undefined}
              min={attr.type === 'number' ? attr.min : undefined}
              max={attr.type === 'number' ? attr.max : undefined}
              value={value}
              onChange={(e) => handleChange(attr.name, e.target.value)}
              placeholder={attr.placeholder || `Enter ${attr.label || attr.name}`}
              required={isRequired}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
            />
            {attr.description && (
              <p className="text-xs text-gray-500 mt-1">{attr.description}</p>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default AttributeRenderer;

