import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const Expense = sequelize.define('Expense', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  category_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'expense_categories',
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
  amount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    validate: {
      min: 0.01
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  expense_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'expenses',
  timestamps: false,
  underscored: true
});

export default Expense;

