import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const ProductVariationAssignment = sequelize.define('ProductVariationAssignment', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    product_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'products',
            key: 'id'
        }
    },
    variation_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'product_variations',
            key: 'id'
        }
    },
    created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'product_variation_assignments',
    timestamps: false,
    underscored: true
});

export default ProductVariationAssignment;
