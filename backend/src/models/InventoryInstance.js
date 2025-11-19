import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const InventoryInstance = sequelize.define('InventoryInstance', {
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
  instance_code: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true
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
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  updated_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'inventory_instances',
  timestamps: false,
  underscored: true,
  hooks: {
    beforeUpdate: (instance) => {
      instance.updated_at = new Date();
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
    }
  }
});

export default InventoryInstance;

