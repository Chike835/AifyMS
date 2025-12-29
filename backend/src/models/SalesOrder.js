import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const SalesOrder = sequelize.define('SalesOrder', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  invoice_number: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true
  },
  customer_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'customers',
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
  total_amount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false
  },
  payment_status: {
    type: DataTypes.ENUM('unpaid', 'partial', 'paid'),
    defaultValue: 'unpaid'
  },
  production_status: {
    type: DataTypes.ENUM('queue', 'produced', 'delivered', 'na'),
    defaultValue: 'na'
  },
  is_legacy: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  dispatcher_name: {
    type: DataTypes.STRING(200),
    allowNull: true
  },
  vehicle_plate: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  delivery_signature: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  subtotal: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true
  },
  total_tax: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true
  },
  agent_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'agents',
      key: 'id'
    }
  },
  order_type: {
    type: DataTypes.STRING(20),
    defaultValue: 'invoice',
    validate: {
      isIn: [['draft', 'quotation', 'invoice']]
    }
  },
  valid_until: {
    type: DataTypes.DATE,
    allowNull: true
  },
  quotation_notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  discount_status: {
    type: DataTypes.ENUM('pending', 'approved', 'declined'),
    allowNull: true
  },
  discount_approved_by: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  discount_approved_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  discount_declined_reason: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  total_discount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true,
    defaultValue: 0
  }
}, {
  tableName: 'sales_orders',
  timestamps: false,
  underscored: true,
  paranoid: true // Enable soft deletes
});

export default SalesOrder;

