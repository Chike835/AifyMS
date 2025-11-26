import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const ProductVariation = sequelize.define('ProductVariation', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING(200),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  updated_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'product_variations',
  timestamps: false,
  underscored: true,
  hooks: {
    beforeUpdate: (variation) => {
      variation.updated_at = new Date();
    }
  }
});

export default ProductVariation;







