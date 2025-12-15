import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const Payment = sequelize.define('Payment', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  customer_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'customers',
      key: 'id'
    }
  },
  supplier_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'suppliers',
      key: 'id'
    }
  },
  amount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false
  },
  method: {
    type: DataTypes.ENUM('cash', 'transfer', 'pos'),
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('pending_confirmation', 'confirmed', 'voided'),
    defaultValue: 'pending_confirmation'
  },
  payment_account_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'payment_accounts',
      key: 'id'
    }
  },
  created_by: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  confirmed_by: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  confirmed_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  reference_note: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'payments',
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

export default Payment;

