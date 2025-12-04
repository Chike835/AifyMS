import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const ProductStockSummary = sequelize.define('ProductStockSummary', {
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
        },
        onDelete: 'CASCADE'
    },
    branch_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'branches',
            key: 'id'
        },
        onDelete: 'CASCADE'
    },
    total_stock: {
        type: DataTypes.DECIMAL(15, 3),
        allowNull: false,
        defaultValue: 0
    },
    last_updated: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'product_stock_summaries',
    timestamps: false,
    indexes: [
        {
            unique: true,
            fields: ['product_id', 'branch_id']
        },
        {
            fields: ['product_id']
        },
        {
            fields: ['branch_id']
        },
        {
            fields: ['last_updated']
        }
    ]
});

export default ProductStockSummary;
