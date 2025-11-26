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
    beforeValidate: (instance) => {
      // If grouped is true, ensure instance_code is set
      if (instance.grouped === true && !instance.instance_code) {
        throw new Error('instance_code is required when grouped is true');
      }
      // Generate batch_identifier if not provided and grouped is true
      if (instance.grouped === true && !instance.batch_identifier && instance.instance_code) {
        instance.batch_identifier = instance.instance_code;
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

