import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const Purchase = sequelize.define('Purchase', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  purchase_number: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true
  },
  supplier_id: {
    type: DataTypes.UUID,
    allowNull: true,
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
  payment_status: {
    type: DataTypes.ENUM('unpaid', 'partial', 'paid'),
    defaultValue: 'unpaid'
  },
  status: {
    type: DataTypes.ENUM('draft', 'confirmed', 'received', 'cancelled'),
    defaultValue: 'confirmed'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
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
  tableName: 'purchases',
  timestamps: false,
  underscored: true,
  hooks: {
    beforeUpdate: (instance) => {
      instance.updated_at = new Date();
    }
  }
});

export default Purchase;

