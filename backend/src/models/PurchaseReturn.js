import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const PurchaseReturn = sequelize.define('PurchaseReturn', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  return_number: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true
  },
  purchase_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'purchases',
      key: 'id'
    }
  },
  supplier_id: {
    type: DataTypes.UUID,
    references: {
      model: 'suppliers',
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
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  total_amount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 0
  },
  reason: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  status: {
    type: DataTypes.STRING(20),
    defaultValue: 'pending',
    validate: {
      isIn: [['pending', 'approved', 'completed', 'cancelled']]
    }
  },
  approved_by: {
    type: DataTypes.UUID,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  approved_at: {
    type: DataTypes.DATE
  }
}, {
  tableName: 'purchase_returns',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

export default PurchaseReturn;

