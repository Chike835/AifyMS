import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const Unit = sequelize.define('Unit', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true
  },
  abbreviation: {
    type: DataTypes.STRING(10),
    allowNull: false,
    unique: true
  },
  base_unit_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'units',
      key: 'id'
    }
  },
  conversion_factor: {
    type: DataTypes.DECIMAL(15, 6),
    defaultValue: 1
  },
  is_base_unit: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'units',
  timestamps: false,
  underscored: true
});

export default Unit;









