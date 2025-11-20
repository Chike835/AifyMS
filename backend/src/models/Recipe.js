import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const Recipe = sequelize.define('Recipe', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING(200),
    allowNull: false
  },
  virtual_product_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'products',
      key: 'id'
    }
  },
  raw_product_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'products',
      key: 'id'
    }
  },
  conversion_factor: {
    type: DataTypes.DECIMAL(15, 4),
    allowNull: false
  },
  wastage_margin: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 0,
    allowNull: false
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
  tableName: 'recipes',
  timestamps: false,
  underscored: true,
  hooks: {
    beforeUpdate: (recipe) => {
      recipe.updated_at = new Date();
    }
  },
  validate: {
    conversionFactorCheck() {
      if (this.conversion_factor <= 0) {
        throw new Error('conversion_factor must be greater than 0');
      }
    }
  }
});

export default Recipe;

