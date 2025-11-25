import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const SalesReturnItem = sequelize.define('SalesReturnItem', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  sales_return_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'sales_returns',
      key: 'id'
    }
  },
  sales_item_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'sales_items',
      key: 'id'
    }
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
    allowNull: false,
    validate: {
      min: 0.001
    }
  },
  unit_price: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false
  },
  subtotal: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false
  }
}, {
  tableName: 'sales_return_items',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false
});

export default SalesReturnItem;

