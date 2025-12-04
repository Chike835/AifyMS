import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const InventoryBatch = sequelize.define('InventoryBatch', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  product_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'products',
      key: 'id'
    }
  },
  branch_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'branches',
      key: 'id'
    }
  },
  category_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'categories',
      key: 'id'
    }
  },
  instance_code: {
    type: DataTypes.STRING(100),
    allowNull: true,
    unique: true
  },
  batch_type_id: {
    type: DataTypes.UUID,
    allowNull: true, // Will be set to NOT NULL after migration
    references: {
      model: 'batch_types',
      key: 'id'
    }
  },
  grouped: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  batch_identifier: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  initial_quantity: {
    type: DataTypes.DECIMAL(15, 3),
    allowNull: false
  },
  remaining_quantity: {
    type: DataTypes.DECIMAL(15, 3),
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('in_stock', 'depleted', 'scrapped'),
    defaultValue: 'in_stock'
  },
  attribute_data: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {}
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  updated_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'inventory_batches',
  timestamps: false,
  underscored: true,
  hooks: {
    beforeUpdate: (instance) => {
      instance.updated_at = new Date();
    },
    beforeValidate: async (instance) => {
      // If grouped is true, ensure instance_code is set
      if (instance.grouped === true && !instance.instance_code) {
        throw new Error('instance_code is required when grouped is true');
      }
      // Generate batch_identifier if not provided and grouped is true
      if (instance.grouped === true && !instance.batch_identifier && instance.instance_code) {
        instance.batch_identifier = instance.instance_code;
      }
    },
    beforeSave: async (instance, options) => {
      // Validate attribute_data based on category attribute_schema
      if (instance.product_id && instance.attribute_data) {
        // Use sequelize.models to avoid circular dependency
        const Product = sequelize.models.Product;
        const Category = sequelize.models.Category;
        const BusinessSetting = sequelize.models.BusinessSetting;

        if (Product && Category) {
          const queryOptions = {
            include: [{
              model: Category,
              as: 'categoryRef',
              required: false
            }]
          };

          // Include transaction if provided to maintain transaction isolation
          if (options?.transaction) {
            queryOptions.transaction = options.transaction;
          }

          const product = await Product.findByPk(instance.product_id, queryOptions);

          if (product && product.categoryRef) {
            const category = product.categoryRef;
            const attributeSchema = category.attribute_schema;
            const attributeData = instance.attribute_data || {};

            // Validate based on dynamic attribute_schema if present
            if (attributeSchema && Array.isArray(attributeSchema) && attributeSchema.length > 0) {
              for (const schemaField of attributeSchema) {
                const fieldName = schemaField.name;
                const fieldType = schemaField.type;
                const fieldRequired = schemaField.required;
                const fieldOptions = schemaField.options;
                const fieldValue = attributeData[fieldName];

                // Check required fields
                if (fieldRequired && (fieldValue === undefined || fieldValue === null || fieldValue === '')) {
                  throw new Error(`Attribute "${fieldName}" is required for category "${category.name}"`);
                }

                // Validate field type if value is present
                if (fieldValue !== undefined && fieldValue !== null && fieldValue !== '') {
                  switch (fieldType) {
                    case 'text':
                    case 'select':
                      if (typeof fieldValue !== 'string') {
                        throw new Error(`Attribute "${fieldName}" must be a string for category "${category.name}"`);
                      }
                      // Validate select options
                      if (fieldType === 'select' && fieldOptions && Array.isArray(fieldOptions)) {
                        if (!fieldOptions.includes(fieldValue)) {
                          throw new Error(`Attribute "${fieldName}" must be one of: ${fieldOptions.join(', ')} for category "${category.name}"`);
                        }
                      }
                      break;

                    case 'number':
                      if (typeof fieldValue !== 'number') {
                        throw new Error(`Attribute "${fieldName}" must be a number for category "${category.name}"`);
                      }
                      // Apply min/max validation if specified in schema
                      if (schemaField.min !== undefined && fieldValue < schemaField.min) {
                        throw new Error(`Attribute "${fieldName}" must be at least ${schemaField.min} for category "${category.name}"`);
                      }
                      if (schemaField.max !== undefined && fieldValue > schemaField.max) {
                        throw new Error(`Attribute "${fieldName}" must be at most ${schemaField.max} for category "${category.name}"`);
                      }
                      break;

                    case 'boolean':
                      if (typeof fieldValue !== 'boolean') {
                        throw new Error(`Attribute "${fieldName}" must be a boolean for category "${category.name}"`);
                      }
                      break;

                    default:
                      // Unknown type, skip validation
                      break;
                  }
                }
              }
            }

            // Special handling for gauge_mm if enabled for this category
            const categoryName = category.name || '';
            const normalizeCategoryName = (name) => {
              return name.toLowerCase().replace(/\s+/g, '_');
            };

            // Fetch gauge_enabled_categories setting
            let gaugeEnabledCategories = [];
            if (BusinessSetting && categoryName) {
              const gaugeSetting = await BusinessSetting.findOne({
                where: { setting_key: 'gauge_enabled_categories' },
                ...(options?.transaction ? { transaction: options.transaction } : {})
              });

              if (gaugeSetting && gaugeSetting.setting_type === 'json') {
                try {
                  const parsedValue = typeof gaugeSetting.setting_value === 'string'
                    ? JSON.parse(gaugeSetting.setting_value)
                    : gaugeSetting.setting_value;
                  gaugeEnabledCategories = Array.isArray(parsedValue) ? parsedValue : [];
                } catch (e) {
                  // If parsing fails, default to empty array
                  gaugeEnabledCategories = [];
                }
              }
            }

            const normalizedCategoryName = normalizeCategoryName(categoryName);
            const isGaugeEnabled = gaugeEnabledCategories.includes(normalizedCategoryName);

            // Validate and normalize gauge_mm if category is enabled for gauge input
            if (isGaugeEnabled && attributeData.gauge_mm !== undefined && attributeData.gauge_mm !== null) {
              if (typeof attributeData.gauge_mm !== 'number') {
                throw new Error(`Gauge (gauge_mm) must be a number for category "${categoryName}"`);
              }

              // Fetch gauge min/max from business settings
              let gaugeMin = 0.10; // Default fallback
              let gaugeMax = 1.00; // Default fallback

              if (BusinessSetting) {
                const gaugeMinSetting = await BusinessSetting.findOne({
                  where: { setting_key: 'gauge_min_value' },
                  ...(options?.transaction ? { transaction: options.transaction } : {})
                });
                const gaugeMaxSetting = await BusinessSetting.findOne({
                  where: { setting_key: 'gauge_max_value' },
                  ...(options?.transaction ? { transaction: options.transaction } : {})
                });

                if (gaugeMinSetting && gaugeMinSetting.setting_value) {
                  gaugeMin = parseFloat(gaugeMinSetting.setting_value);
                }
                if (gaugeMaxSetting && gaugeMaxSetting.setting_value) {
                  gaugeMax = parseFloat(gaugeMaxSetting.setting_value);
                }
              }

              // Validate against configured range
              if (attributeData.gauge_mm < gaugeMin || attributeData.gauge_mm > gaugeMax) {
                throw new Error(`Gauge (gauge_mm) must be between ${gaugeMin} and ${gaugeMax} mm for category "${categoryName}"`);
              }
              // Round to 2 decimal places
              attributeData.gauge_mm = Math.round(attributeData.gauge_mm * 100) / 100;
            }
          }
        }
      }
    }
  },
  validate: {
    remainingQuantityCheck() {
      if (this.remaining_quantity < 0) {
        throw new Error('remaining_quantity cannot be negative');
      }
      if (this.remaining_quantity > this.initial_quantity) {
        throw new Error('remaining_quantity cannot exceed initial_quantity');
      }
    },
    groupedInstanceCodeCheck() {
      if (this.grouped === true && !this.instance_code) {
        throw new Error('instance_code is required when grouped is true');
      }
    }
  }
});

export default InventoryBatch;

