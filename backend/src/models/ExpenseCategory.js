import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const ExpenseCategory = sequelize.define('ExpenseCategory', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING(100),
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
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'expense_categories',
  timestamps: false,
  underscored: true,
  indexes: [
    {
      unique: true,
      fields: ['name', 'branch_id']
    }
  ]
});

export default ExpenseCategory;

