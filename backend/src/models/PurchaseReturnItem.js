import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const PurchaseReturnItem = sequelize.define('PurchaseReturnItem', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  purchase_return_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'purchase_returns',
      key: 'id'
    }
  },
  purchase_item_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'purchase_items',
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
  unit_cost: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false
  },
  subtotal: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false
  },
  inventory_instance_id: {
    type: DataTypes.UUID,
    references: {
      model: 'inventory_instances',
      key: 'id'
    }
  }
}, {
  tableName: 'purchase_return_items',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false
});

export default PurchaseReturnItem;

