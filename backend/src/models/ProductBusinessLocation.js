import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const ProductBusinessLocation = sequelize.define('ProductBusinessLocation', {
  product_id: {
    type: DataTypes.UUID,
    primaryKey: true,
    references: {
      model: 'products',
      key: 'id'
    }
  },
  branch_id: {
    type: DataTypes.UUID,
    primaryKey: true,
    references: {
      model: 'branches',
      key: 'id'
    }
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'product_business_locations',
  timestamps: false,
  underscored: true
});

export default ProductBusinessLocation;







