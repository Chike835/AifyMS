import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const Permission = sequelize.define('Permission', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  slug: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true
  },
  group_name: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'permissions',
  timestamps: false,
  underscored: true
});

export default Permission;

