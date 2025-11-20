import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const Wastage = sequelize.define('Wastage', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  inventory_instance_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'inventory_instances',
      key: 'id'
    }
  },
  quantity_wasted: {
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
  wastage_date: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'production_wastage',
  timestamps: false,
  underscored: true,
  validate: {
    quantityWastedCheck() {
      if (this.quantity_wasted <= 0) {
        throw new Error('quantity_wasted must be greater than 0');
      }
    }
  }
});

export default Wastage;

