import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';
import Agent from './Agent.js';
import SalesOrder from './SalesOrder.js';

const AgentCommission = sequelize.define('AgentCommission', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  agent_id: {
    type: DataTypes.UUID,
    references: {
      model: Agent,
      key: 'id'
    },
    allowNull: false
  },
  sales_order_id: {
    type: DataTypes.UUID,
    references: {
      model: SalesOrder,
      key: 'id'
    },
    allowNull: false
  },
  commission_amount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    validate: {
      min: 0
    }
  },
  commission_rate: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
    validate: {
      min: 0,
      max: 100
    }
  },
  order_amount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false
  },
  payment_status: {
    type: DataTypes.ENUM('pending', 'paid', 'cancelled'),
    defaultValue: 'pending',
    allowNull: false
  },
  paid_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'agent_commissions',
  timestamps: false,
  underscored: true
});

export default AgentCommission;
































