import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const ItemAssignment = sequelize.define('ItemAssignment', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  sales_item_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'sales_items',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  inventory_instance_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'inventory_instances',
      key: 'id'
    }
  },
  quantity_deducted: {
    type: DataTypes.DECIMAL(15, 3),
    allowNull: false
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'item_assignments',
  timestamps: false,
  underscored: true,
  validate: {
    quantityDeductedCheck() {
      if (this.quantity_deducted <= 0) {
        throw new Error('quantity_deducted must be greater than 0');
      }
    }
  }
});

export default ItemAssignment;

