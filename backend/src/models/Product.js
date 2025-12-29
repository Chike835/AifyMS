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
    type: DataTypes.ENUM('standard', 'compound', 'raw_tracked', 'manufactured_virtual', 'variable'),
    allowNull: false
  },
  base_unit: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  unit_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'units',
      key: 'id'
    }
  },
  sale_price: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false
  },
  cost_price: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true
  },
  cost_price_inc_tax: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true
  },
  tax_rate: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 0
  },
  tax_rate_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'tax_rates',
      key: 'id'
    }
  },
  is_taxable: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  selling_price_tax_type: {
    type: DataTypes.ENUM('inclusive', 'exclusive'),
    defaultValue: 'exclusive'
  },
  profit_margin: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 25.00
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
  category: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  category_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'categories',
      key: 'id'
    }
  },
  sub_category_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'categories',
      key: 'id'
    }
  },
  weight: {
    type: DataTypes.DECIMAL(10, 4),
    allowNull: true
  },
  manage_stock: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  not_for_selling: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  image_url: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  barcode_type: {
    type: DataTypes.STRING(50),
    defaultValue: 'CODE128'
  },
  alert_quantity: {
    type: DataTypes.DECIMAL(15, 3),
    defaultValue: 0
  },
  reorder_quantity: {
    type: DataTypes.DECIMAL(15, 3),
    defaultValue: 0
  },
  woocommerce_enabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  attribute_default_values: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {}
  },
  is_variant_child: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  warranty_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'warranties',
      key: 'id'
    }
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

