import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const CategoryBatchType = sequelize.define('CategoryBatchType', {
  category_id: {
    type: DataTypes.UUID,
    primaryKey: true,
    references: {
      model: 'categories',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  batch_type_id: {
    type: DataTypes.UUID,
    primaryKey: true,
    references: {
      model: 'batch_types',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'category_batch_types',
  timestamps: false,
  underscored: true
});

export default CategoryBatchType;



