import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const LedgerEntry = sequelize.define('LedgerEntry', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  contact_id: {
    type: DataTypes.UUID,
    allowNull: false
  },
  contact_type: {
    type: DataTypes.ENUM('customer', 'supplier'),
    allowNull: false
  },
  transaction_date: {
    type: DataTypes.DATE,
    allowNull: false
  },
  transaction_type: {
    type: DataTypes.ENUM('INVOICE', 'PAYMENT', 'RETURN', 'ADJUSTMENT', 'OPENING_BALANCE'),
    allowNull: false
  },
  transaction_id: {
    type: DataTypes.UUID,
    allowNull: true
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  debit_amount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 0
  },
  credit_amount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 0
  },
  running_balance: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false
  },
  branch_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'branches',
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
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'ledger_entries',
  timestamps: false,
  underscored: true,
  validate: {
    debitOrCredit() {
      if (parseFloat(this.debit_amount) > 0 && parseFloat(this.credit_amount) > 0) {
        throw new Error('Either debit_amount or credit_amount must be zero');
      }
      if (parseFloat(this.debit_amount) === 0 && parseFloat(this.credit_amount) === 0) {
        throw new Error('Either debit_amount or credit_amount must be greater than zero');
      }
    }
  }
});

export default LedgerEntry;

