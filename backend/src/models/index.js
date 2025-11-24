import Role from './Role.js';
import Permission from './Permission.js';
import Branch from './Branch.js';
import User from './User.js';
import Customer from './Customer.js';
import Supplier from './Supplier.js';
import Product from './Product.js';
import ProductBrand from './ProductBrand.js';
import ProductColor from './ProductColor.js';
import ProductGauge from './ProductGauge.js';
import InventoryInstance from './InventoryInstance.js';
import StockTransfer from './StockTransfer.js';
import StockAdjustment from './StockAdjustment.js';
import Wastage from './Wastage.js';
import Recipe from './Recipe.js';
import SalesOrder from './SalesOrder.js';
import SalesItem from './SalesItem.js';
import ItemAssignment from './ItemAssignment.js';
import Payment from './Payment.js';
import Purchase from './Purchase.js';
import PurchaseItem from './PurchaseItem.js';

// Define all associations
export const associateModels = () => {
  // Role - Permission (Many-to-Many through role_permissions)
  Role.belongsToMany(Permission, {
    through: 'role_permissions',
    timestamps: false,
    foreignKey: 'role_id',
    otherKey: 'permission_id',
    as: 'permissions'
  });

  Permission.belongsToMany(Role, {
    through: 'role_permissions',
    timestamps: false,
    foreignKey: 'permission_id',
    otherKey: 'role_id',
    as: 'roles'
  });

  // User - Role (Many-to-One)
  User.belongsTo(Role, {
    foreignKey: 'role_id',
    as: 'role'
  });
  Role.hasMany(User, {
    foreignKey: 'role_id',
    as: 'users'
  });

  // User - Branch (Many-to-One)
  User.belongsTo(Branch, {
    foreignKey: 'branch_id',
    as: 'branch'
  });
  Branch.hasMany(User, {
    foreignKey: 'branch_id',
    as: 'users'
  });

  // User - SalesOrder (One-to-Many: Creator)
  User.hasMany(SalesOrder, {
    foreignKey: 'user_id',
    as: 'created_orders'
  });
  SalesOrder.belongsTo(User, {
    foreignKey: 'user_id',
    as: 'creator'
  });

  // User - Payment (One-to-Many: Created By)
  User.hasMany(Payment, {
    foreignKey: 'created_by',
    as: 'payments_created'
  });
  Payment.belongsTo(User, {
    foreignKey: 'created_by',
    as: 'creator'
  });

  // User - Payment (One-to-Many: Confirmed By)
  User.hasMany(Payment, {
    foreignKey: 'confirmed_by',
    as: 'payments_confirmed'
  });
  Payment.belongsTo(User, {
    foreignKey: 'confirmed_by',
    as: 'confirmer'
  });

  // Branch - SalesOrder (One-to-Many)
  Branch.hasMany(SalesOrder, {
    foreignKey: 'branch_id',
    as: 'sales_orders'
  });
  SalesOrder.belongsTo(Branch, {
    foreignKey: 'branch_id',
    as: 'branch'
  });

  // Branch - InventoryInstance (One-to-Many)
  Branch.hasMany(InventoryInstance, {
    foreignKey: 'branch_id',
    as: 'inventory_instances'
  });
  InventoryInstance.belongsTo(Branch, {
    foreignKey: 'branch_id',
    as: 'branch'
  });

  // Customer - SalesOrder (One-to-Many)
  Customer.hasMany(SalesOrder, {
    foreignKey: 'customer_id',
    as: 'sales_orders'
  });
  SalesOrder.belongsTo(Customer, {
    foreignKey: 'customer_id',
    as: 'customer'
  });

  // Customer - Payment (One-to-Many)
  Customer.hasMany(Payment, {
    foreignKey: 'customer_id',
    as: 'payments'
  });
  Payment.belongsTo(Customer, {
    foreignKey: 'customer_id',
    as: 'customer'
  });

  // Product - InventoryInstance (One-to-Many: Raw Material)
  Product.hasMany(InventoryInstance, {
    foreignKey: 'product_id',
    as: 'inventory_instances'
  });
  InventoryInstance.belongsTo(Product, {
    foreignKey: 'product_id',
    as: 'product'
  });

  // Product - Recipe (One-to-Many: Virtual Product)
  Product.hasMany(Recipe, {
    foreignKey: 'virtual_product_id',
    as: 'recipes_as_virtual'
  });
  Recipe.belongsTo(Product, {
    foreignKey: 'virtual_product_id',
    as: 'virtual_product'
  });

  // Product - Recipe (One-to-Many: Raw Product)
  Product.hasMany(Recipe, {
    foreignKey: 'raw_product_id',
    as: 'recipes_as_raw'
  });
  Recipe.belongsTo(Product, {
    foreignKey: 'raw_product_id',
    as: 'raw_product'
  });

  // Product - SalesItem (One-to-Many)
  Product.hasMany(SalesItem, {
    foreignKey: 'product_id',
    as: 'sales_items'
  });
  SalesItem.belongsTo(Product, {
    foreignKey: 'product_id',
    as: 'product'
  });

  // SalesOrder - SalesItem (One-to-Many)
  SalesOrder.hasMany(SalesItem, {
    foreignKey: 'order_id',
    as: 'items',
    onDelete: 'CASCADE'
  });
  SalesItem.belongsTo(SalesOrder, {
    foreignKey: 'order_id',
    as: 'order'
  });

  // SalesItem - ItemAssignment (One-to-Many)
  SalesItem.hasMany(ItemAssignment, {
    foreignKey: 'sales_item_id',
    as: 'assignments',
    onDelete: 'CASCADE'
  });
  ItemAssignment.belongsTo(SalesItem, {
    foreignKey: 'sales_item_id',
    as: 'sales_item'
  });

  // InventoryInstance - ItemAssignment (One-to-Many)
  InventoryInstance.hasMany(ItemAssignment, {
    foreignKey: 'inventory_instance_id',
    as: 'assignments'
  });
  ItemAssignment.belongsTo(InventoryInstance, {
    foreignKey: 'inventory_instance_id',
    as: 'inventory_instance'
  });

  // Product - ProductBrand (Many-to-One)
  Product.belongsTo(ProductBrand, {
    foreignKey: 'brand_id',
    as: 'brandAttribute'
  });
  ProductBrand.hasMany(Product, {
    foreignKey: 'brand_id',
    as: 'products'
  });

  // Product - ProductColor (Many-to-One)
  Product.belongsTo(ProductColor, {
    foreignKey: 'color_id',
    as: 'colorAttribute'
  });
  ProductColor.hasMany(Product, {
    foreignKey: 'color_id',
    as: 'products'
  });

  // Product - ProductGauge (Many-to-One)
  Product.belongsTo(ProductGauge, {
    foreignKey: 'gauge_id',
    as: 'gaugeAttribute'
  });
  ProductGauge.hasMany(Product, {
    foreignKey: 'gauge_id',
    as: 'products'
  });

  // InventoryInstance - StockTransfer (One-to-Many)
  InventoryInstance.hasMany(StockTransfer, {
    foreignKey: 'inventory_instance_id',
    as: 'transfers'
  });
  StockTransfer.belongsTo(InventoryInstance, {
    foreignKey: 'inventory_instance_id',
    as: 'inventory_instance'
  });

  // Branch - StockTransfer (One-to-Many: From)
  Branch.hasMany(StockTransfer, {
    foreignKey: 'from_branch_id',
    as: 'transfers_from'
  });
  StockTransfer.belongsTo(Branch, {
    foreignKey: 'from_branch_id',
    as: 'from_branch'
  });

  // Branch - StockTransfer (One-to-Many: To)
  Branch.hasMany(StockTransfer, {
    foreignKey: 'to_branch_id',
    as: 'transfers_to'
  });
  StockTransfer.belongsTo(Branch, {
    foreignKey: 'to_branch_id',
    as: 'to_branch'
  });

  // User - StockTransfer (One-to-Many)
  User.hasMany(StockTransfer, {
    foreignKey: 'user_id',
    as: 'stock_transfers'
  });
  StockTransfer.belongsTo(User, {
    foreignKey: 'user_id',
    as: 'user'
  });

  // InventoryInstance - StockAdjustment (One-to-Many)
  InventoryInstance.hasMany(StockAdjustment, {
    foreignKey: 'inventory_instance_id',
    as: 'adjustments'
  });
  StockAdjustment.belongsTo(InventoryInstance, {
    foreignKey: 'inventory_instance_id',
    as: 'inventory_instance'
  });

  // User - StockAdjustment (One-to-Many)
  User.hasMany(StockAdjustment, {
    foreignKey: 'user_id',
    as: 'stock_adjustments'
  });
  StockAdjustment.belongsTo(User, {
    foreignKey: 'user_id',
    as: 'user'
  });

  // InventoryInstance - Wastage (One-to-Many)
  InventoryInstance.hasMany(Wastage, {
    foreignKey: 'inventory_instance_id',
    as: 'wastage_records'
  });
  Wastage.belongsTo(InventoryInstance, {
    foreignKey: 'inventory_instance_id',
    as: 'inventory_instance'
  });

  // User - Wastage (One-to-Many)
  User.hasMany(Wastage, {
    foreignKey: 'user_id',
    as: 'wastage_records'
  });
  Wastage.belongsTo(User, {
    foreignKey: 'user_id',
    as: 'user'
  });

  // Supplier - Branch (Many-to-One)
  Supplier.belongsTo(Branch, {
    foreignKey: 'branch_id',
    as: 'branch'
  });
  Branch.hasMany(Supplier, {
    foreignKey: 'branch_id',
    as: 'suppliers'
  });

  // Purchase - Supplier (Many-to-One)
  Purchase.belongsTo(Supplier, {
    foreignKey: 'supplier_id',
    as: 'supplier'
  });
  Supplier.hasMany(Purchase, {
    foreignKey: 'supplier_id',
    as: 'purchases'
  });

  // Purchase - Branch (Many-to-One)
  Purchase.belongsTo(Branch, {
    foreignKey: 'branch_id',
    as: 'branch'
  });
  Branch.hasMany(Purchase, {
    foreignKey: 'branch_id',
    as: 'purchases'
  });

  // Purchase - User (Many-to-One: Creator)
  Purchase.belongsTo(User, {
    foreignKey: 'user_id',
    as: 'creator'
  });
  User.hasMany(Purchase, {
    foreignKey: 'user_id',
    as: 'purchases'
  });

  // Purchase - PurchaseItem (One-to-Many)
  Purchase.hasMany(PurchaseItem, {
    foreignKey: 'purchase_id',
    as: 'items',
    onDelete: 'CASCADE'
  });
  PurchaseItem.belongsTo(Purchase, {
    foreignKey: 'purchase_id',
    as: 'purchase'
  });

  // PurchaseItem - Product (Many-to-One)
  PurchaseItem.belongsTo(Product, {
    foreignKey: 'product_id',
    as: 'product'
  });
  Product.hasMany(PurchaseItem, {
    foreignKey: 'product_id',
    as: 'purchase_items'
  });

  // PurchaseItem - InventoryInstance (Many-to-One)
  PurchaseItem.belongsTo(InventoryInstance, {
    foreignKey: 'inventory_instance_id',
    as: 'inventory_instance'
  });
  InventoryInstance.hasMany(PurchaseItem, {
    foreignKey: 'inventory_instance_id',
    as: 'purchase_items'
  });
};

// Export all models
export {
  Role,
  Permission,
  Branch,
  User,
  Customer,
  Supplier,
  Product,
  ProductBrand,
  ProductColor,
  ProductGauge,
  InventoryInstance,
  StockTransfer,
  StockAdjustment,
  Wastage,
  Recipe,
  SalesOrder,
  SalesItem,
  ItemAssignment,
  Payment,
  Purchase,
  PurchaseItem
};

