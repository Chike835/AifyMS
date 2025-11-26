import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const StockAdjustment = sequelize.define('StockAdjustment', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  inventory_batch_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'inventory_batches',
      key: 'id'
    }
  },
  old_quantity: {
    type: DataTypes.DECIMAL(15, 3),
    allowNull: false
  },
  new_quantity: {
    type: DataTypes.DECIMAL(15, 3),
    allowNull: false
  },
  reason: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  adjustment_date: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'stock_adjustments',
  timestamps: false,
  underscored: true,
  validate: {
    newQuantityCheck() {
      if (this.new_quantity < 0) {
        throw new Error('new_quantity cannot be negative');
      }
    }
  }
});

export default StockAdjustment;

