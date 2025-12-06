import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';
import PaymentAccount from './PaymentAccount.js';
import User from './User.js';

const AccountTransaction = sequelize.define('AccountTransaction', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  account_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: PaymentAccount,
      key: 'id'
    }
  },
  transaction_type: {
    type: DataTypes.ENUM('deposit', 'withdrawal', 'transfer', 'payment_received', 'payment_made'),
    allowNull: false
  },
  amount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    validate: {
      min: 0.01
    }
  },
  reference_type: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  reference_id: {
    type: DataTypes.UUID,
    allowNull: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: User,
      key: 'id'
    }
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'account_transactions',
  timestamps: false,
  underscored: true,
  validate: {
    amountCheck() {
      if (this.amount <= 0) {
        throw new Error('amount must be greater than 0');
      }
    }
  }
});

export default AccountTransaction;




















