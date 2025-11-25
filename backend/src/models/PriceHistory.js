import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const PriceHistory = sequelize.define('PriceHistory', {
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
  old_sale_price: {
    type: DataTypes.DECIMAL(15, 2)
  },
  new_sale_price: {
    type: DataTypes.DECIMAL(15, 2)
  },
  old_cost_price: {
    type: DataTypes.DECIMAL(15, 2)
  },
  new_cost_price: {
    type: DataTypes.DECIMAL(15, 2)
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  reason: {
    type: DataTypes.TEXT
  }
}, {
  tableName: 'price_history',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false
});

export default PriceHistory;

