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
      // Validate attribute_data based on product type
      if (instance.product_id && instance.attribute_data) {
        // Use sequelize.models to avoid circular dependency
        const Product = sequelize.models.Product;
        const Category = sequelize.models.Category;
        
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

          if (product) {
            const categoryName = product.categoryRef?.name?.toLowerCase() || '';
            const attributeData = instance.attribute_data || {};

            // Validate based on product category/material type
            if (categoryName.includes('aluminium') || categoryName.includes('aluminum')) {
              // Aluminium type validation
              if (!attributeData.weight_kg || typeof attributeData.weight_kg !== 'number' || attributeData.weight_kg <= 0) {
                throw new Error('Aluminium batch must have valid weight_kg (positive number)');
              }
              if (!attributeData.gauge_mm || typeof attributeData.gauge_mm !== 'number') {
                throw new Error('Aluminium batch must have gauge_mm');
              }
              if (attributeData.gauge_mm < 0.1 || attributeData.gauge_mm > 1.0) {
                throw new Error('Aluminium gauge_mm must be between 0.1 and 1.0 mm');
              }
              if (!attributeData.embossment || typeof attributeData.embossment !== 'string') {
                throw new Error('Aluminium batch must have embossment');
              }
              if (!attributeData.color_code || typeof attributeData.color_code !== 'string') {
                throw new Error('Aluminium batch must have color_code');
              }
              if (!attributeData.coil_number || typeof attributeData.coil_number !== 'string') {
                throw new Error('Aluminium batch must have coil_number');
              }
            } else if (categoryName.includes('stone') || categoryName.includes('tile')) {
              // Stone Tiles type validation
              if (!attributeData.design_pattern || typeof attributeData.design_pattern !== 'string') {
                throw new Error('Stone Tiles batch must have design_pattern (e.g., Shingle)');
              }
              if (!attributeData.pcs_per_pallet || typeof attributeData.pcs_per_pallet !== 'number' || attributeData.pcs_per_pallet <= 0) {
                throw new Error('Stone Tiles batch must have valid pcs_per_pallet (positive number)');
              }
              if (!attributeData.sqm_coverage || typeof attributeData.sqm_coverage !== 'number' || attributeData.sqm_coverage <= 0) {
                throw new Error('Stone Tiles batch must have valid sqm_coverage (positive number)');
              }
              if (!attributeData.pallet_number || typeof attributeData.pallet_number !== 'string') {
                throw new Error('Stone Tiles batch must have pallet_number');
              }
            } else if (categoryName.includes('accessor')) {
              // Accessories type validation
              if (!attributeData.packet_size && !attributeData.pcs_count) {
                throw new Error('Accessories batch must have either packet_size or pcs_count');
              }
              if (attributeData.packet_size && (typeof attributeData.packet_size !== 'number' || attributeData.packet_size <= 0)) {
                throw new Error('Accessories packet_size must be a positive number if provided');
              }
              if (attributeData.pcs_count && (typeof attributeData.pcs_count !== 'number' || attributeData.pcs_count <= 0)) {
                throw new Error('Accessories pcs_count must be a positive number if provided');
              }
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

