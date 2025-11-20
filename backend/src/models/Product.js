import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const Product = sequelize.define('Product', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  sku: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true
  },
  name: {
    type: DataTypes.STRING(200),
    allowNull: false
  },
  type: {
    type: DataTypes.ENUM('standard', 'compound', 'raw_tracked', 'manufactured_virtual'),
    allowNull: false
  },
  base_unit: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  sale_price: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false
  },
  cost_price: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true
  },
  tax_rate: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 0
  },
  brand: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  brand_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'product_attributes_brands',
      key: 'id'
    }
  },
  color_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'product_attributes_colors',
      key: 'id'
    }
  },
  gauge_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'product_attributes_gauges',
      key: 'id'
    }
  },
  category: {
    type: DataTypes.STRING(100),
    allowNull: true
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
  tableName: 'products',
  timestamps: false,
  underscored: true,
  hooks: {
    beforeUpdate: (product) => {
      product.updated_at = new Date();
    }
  }
});

export default Product;

