import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';
import Branch from './Branch.js';

const ReceiptPrinter = sequelize.define('ReceiptPrinter', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING(200),
    allowNull: false
  },
  printer_type: {
    type: DataTypes.ENUM('thermal', 'inkjet', 'laser', 'dot_matrix'),
    allowNull: false
  },
  connection_type: {
    type: DataTypes.ENUM('usb', 'network', 'bluetooth', 'serial'),
    allowNull: false
  },
  connection_string: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  paper_width_mm: {
    type: DataTypes.INTEGER,
    defaultValue: 80,
    allowNull: false
  },
  is_default: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false
  },
  branch_id: {
    type: DataTypes.UUID,
    references: {
      model: Branch,
      key: 'id'
    },
    allowNull: true
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'receipt_printers',
  timestamps: false,
  underscored: true
});

export default ReceiptPrinter;




















