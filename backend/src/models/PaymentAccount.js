import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';
import Branch from './Branch.js';

const PaymentAccount = sequelize.define('PaymentAccount', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING(200),
    allowNull: false
  },
  account_type: {
    type: DataTypes.ENUM('cash', 'bank', 'mobile_money', 'pos_terminal'),
    allowNull: false
  },
  account_number: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  bank_name: {
    type: DataTypes.STRING(200),
    allowNull: true
  },
  opening_balance: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0,
    allowNull: false
  },
  current_balance: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0,
    allowNull: false
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false
  },
  branch_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: Branch,
      key: 'id'
    }
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
  tableName: 'payment_accounts',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  underscored: true
});

export default PaymentAccount;





























