import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const ProductVariationValue = sequelize.define('ProductVariationValue', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  variation_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'product_variations',
      key: 'id'
    }
  },
  value: {
    type: DataTypes.STRING(200),
    allowNull: false
  },
  display_order: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'product_variation_values',
  timestamps: false,
  underscored: true
});

export default ProductVariationValue;
























