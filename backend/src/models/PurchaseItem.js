import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const PurchaseItem = sequelize.define('PurchaseItem', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  purchase_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'purchases',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  product_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'products',
      key: 'id'
    }
  },
  quantity: {
    type: DataTypes.DECIMAL(15, 3),
    allowNull: false
  },
  unit_cost: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false
  },
  subtotal: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false
  },
  // Instance code of the created inventory batch (optional for any product type)
  instance_code: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  // Reference to the inventory batch created (if instance_code provided)
  inventory_batch_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'inventory_batches',
      key: 'id'
    }
  },
  // Purchase unit conversion fields
  purchase_unit_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'units',
      key: 'id'
    }
  },
  purchased_quantity: {
    type: DataTypes.DECIMAL(15, 3),
    allowNull: true
  },
  conversion_factor: {
    type: DataTypes.DECIMAL(15, 6),
    defaultValue: 1,
    allowNull: true
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'purchase_items',
  timestamps: false,
  underscored: true,
  validate: {
    quantityCheck() {
      if (this.quantity <= 0) {
        throw new Error('quantity must be greater than 0');
      }
    },
    costCheck() {
      if (this.unit_cost < 0) {
        throw new Error('unit_cost cannot be negative');
      }
      if (this.subtotal < 0) {
        throw new Error('subtotal cannot be negative');
      }
    }
  }
});

export default PurchaseItem;

