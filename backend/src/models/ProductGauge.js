import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const ProductGauge = sequelize.define('ProductGauge', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'product_attributes_gauges',
  timestamps: false,
  underscored: true
});

export default ProductGauge;

