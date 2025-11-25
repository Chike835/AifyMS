import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';
import Branch from './Branch.js';

const Discount = sequelize.define('Discount', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING(200),
    allowNull: false
  },
  discount_type: {
    type: DataTypes.ENUM('percentage', 'fixed'),
    allowNull: false
  },
  value: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    validate: {
      min: 0
    }
  },
  min_purchase_amount: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0,
    allowNull: false
  },
  max_discount_amount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true
  },
  valid_from: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  valid_until: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false
  },
  branch_id: {
    type: DataTypes.UUID,
    references: {
      model: Branch,
      key: 'id'
    },
    allowNull: true
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'discounts',
  timestamps: false,
  underscored: true
});

export default Discount;






