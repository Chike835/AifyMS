import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const SalesItem = sequelize.define('SalesItem', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  order_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'sales_orders',
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
  inventory_batch_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'inventory_batches',
      key: 'id'
    }
  },
  quantity: {
    type: DataTypes.DECIMAL(15, 3),
    allowNull: false
  },
  unit_price: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false
  },
  subtotal: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'sales_items',
  timestamps: false,
  underscored: true,
  paranoid: true, // Enable soft deletes
  validate: {
    quantityCheck() {
      if (this.quantity <= 0) {
        throw new Error('quantity must be greater than 0');
      }
    },
    priceCheck() {
      if (this.unit_price < 0) {
        throw new Error('unit_price cannot be negative');
      }
      if (this.subtotal < 0) {
        throw new Error('subtotal cannot be negative');
      }
    }
  }
});

export default SalesItem;

