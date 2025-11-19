import Role from './Role.js';
import Permission from './Permission.js';
import Branch from './Branch.js';
import User from './User.js';
import Customer from './Customer.js';
import Product from './Product.js';
import InventoryInstance from './InventoryInstance.js';
import Recipe from './Recipe.js';
import SalesOrder from './SalesOrder.js';
import SalesItem from './SalesItem.js';
import ItemAssignment from './ItemAssignment.js';
import Payment from './Payment.js';

// Define all associations
export const associateModels = () => {
  // Role - Permission (Many-to-Many through role_permissions)
  Role.belongsToMany(Permission, {
    through: 'role_permissions',
    foreignKey: 'role_id',
    otherKey: 'permission_id',
    as: 'permissions'
  });

  Permission.belongsToMany(Role, {
    through: 'role_permissions',
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
};

// Export all models
export {
  Role,
  Permission,
  Branch,
  User,
  Customer,
  Product,
  InventoryInstance,
  Recipe,
  SalesOrder,
  SalesItem,
  ItemAssignment,
  Payment
};

