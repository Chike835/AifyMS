import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';
import Branch from './Branch.js';

const Agent = sequelize.define('Agent', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING(200),
    allowNull: false
  },
  email: {
    type: DataTypes.STRING(200),
    allowNull: true,
    validate: {
      isEmail: true
    }
  },
  phone: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  commission_rate: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 0,
    allowNull: false,
    validate: {
      min: 0,
      max: 100
    }
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
  tableName: 'agents',
  timestamps: false,
  underscored: true
});

export default Agent;


