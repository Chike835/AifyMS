import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const ProductVariant = sequelize.define('ProductVariant', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    parent_product_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'products',
            key: 'id'
        }
    },
    product_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'products',
            key: 'id'
        }
    },
    variation_combination: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {}
    },
    sku_suffix: {
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
    tableName: 'product_variants',
    timestamps: false,
    underscored: true,
    hooks: {
        beforeUpdate: (record) => {
            record.updated_at = new Date();
        }
    }
});

export default ProductVariant;
