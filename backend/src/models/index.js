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
import InventoryBatch from './InventoryBatch.js';
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
import ExpenseCategory from './ExpenseCategory.js';
import Expense from './Expense.js';
import PayrollRecord from './PayrollRecord.js';
import SalesReturn from './SalesReturn.js';
import SalesReturnItem from './SalesReturnItem.js';
import PurchaseReturn from './PurchaseReturn.js';
import PurchaseReturnItem from './PurchaseReturnItem.js';
import PriceHistory from './PriceHistory.js';
import PaymentAccount from './PaymentAccount.js';
import AccountTransaction from './AccountTransaction.js';
import BusinessSetting from './BusinessSetting.js';
import TaxRate from './TaxRate.js';
import Agent from './Agent.js';
import AgentCommission from './AgentCommission.js';
import Discount from './Discount.js';
import DeliveryNoteTemplate from './DeliveryNoteTemplate.js';
import ReceiptPrinter from './ReceiptPrinter.js';
import ProductVariation from './ProductVariation.js';
import ProductVariationValue from './ProductVariationValue.js';
import Unit from './Unit.js';
import Category from './Category.js';
import Warranty from './Warranty.js';
import BatchType from './BatchType.js';
import CategoryBatchType from './CategoryBatchType.js';
import LedgerEntry from './LedgerEntry.js';
import ActivityLog from './ActivityLog.js';

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

  // Branch - InventoryBatch (One-to-Many)
  Branch.hasMany(InventoryBatch, {
    foreignKey: 'branch_id',
    as: 'inventory_batches'
  });
  InventoryBatch.belongsTo(Branch, {
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

  // Product - InventoryBatch (One-to-Many: Raw Material)
  Product.hasMany(InventoryBatch, {
    foreignKey: 'product_id',
    as: 'inventory_batches'
  });
  InventoryBatch.belongsTo(Product, {
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

  // InventoryBatch - ItemAssignment (One-to-Many)
  InventoryBatch.hasMany(ItemAssignment, {
    foreignKey: 'inventory_batch_id',
    as: 'assignments'
  });
  ItemAssignment.belongsTo(InventoryBatch, {
    foreignKey: 'inventory_batch_id',
    as: 'inventory_batch'
  });

  // SalesItem - InventoryBatch (Many-to-One: Direct link for anti-theft)
  SalesItem.belongsTo(InventoryBatch, {
    foreignKey: 'inventory_batch_id',
    as: 'inventory_batch'
  });
  InventoryBatch.hasMany(SalesItem, {
    foreignKey: 'inventory_batch_id',
    as: 'sales_items'
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

  // InventoryBatch - StockTransfer (One-to-Many)
  InventoryBatch.hasMany(StockTransfer, {
    foreignKey: 'inventory_batch_id',
    as: 'transfers'
  });
  StockTransfer.belongsTo(InventoryBatch, {
    foreignKey: 'inventory_batch_id',
    as: 'inventory_batch'
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

  // InventoryBatch - StockAdjustment (One-to-Many)
  InventoryBatch.hasMany(StockAdjustment, {
    foreignKey: 'inventory_batch_id',
    as: 'adjustments'
  });
  StockAdjustment.belongsTo(InventoryBatch, {
    foreignKey: 'inventory_batch_id',
    as: 'inventory_batch'
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

  // InventoryBatch - Wastage (One-to-Many)
  InventoryBatch.hasMany(Wastage, {
    foreignKey: 'inventory_batch_id',
    as: 'wastage_records'
  });
  Wastage.belongsTo(InventoryBatch, {
    foreignKey: 'inventory_batch_id',
    as: 'inventory_batch'
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

  // PurchaseItem - InventoryBatch (Many-to-One)
  PurchaseItem.belongsTo(InventoryBatch, {
    foreignKey: 'inventory_batch_id',
    as: 'inventory_batch'
  });
  InventoryBatch.hasMany(PurchaseItem, {
    foreignKey: 'inventory_batch_id',
    as: 'purchase_items'
  });

  // ExpenseCategory - Branch (Many-to-One)
  ExpenseCategory.belongsTo(Branch, {
    foreignKey: 'branch_id',
    as: 'branch'
  });
  Branch.hasMany(ExpenseCategory, {
    foreignKey: 'branch_id',
    as: 'expense_categories'
  });

  // Expense - ExpenseCategory (Many-to-One)
  Expense.belongsTo(ExpenseCategory, {
    foreignKey: 'category_id',
    as: 'category'
  });
  ExpenseCategory.hasMany(Expense, {
    foreignKey: 'category_id',
    as: 'expenses'
  });

  // Expense - Branch (Many-to-One)
  Expense.belongsTo(Branch, {
    foreignKey: 'branch_id',
    as: 'branch'
  });
  Branch.hasMany(Expense, {
    foreignKey: 'branch_id',
    as: 'expenses'
  });

  // Expense - User (Many-to-One: Creator)
  Expense.belongsTo(User, {
    foreignKey: 'user_id',
    as: 'creator'
  });
  User.hasMany(Expense, {
    foreignKey: 'user_id',
    as: 'expenses'
  });

  // PayrollRecord - Branch (Many-to-One)
  PayrollRecord.belongsTo(Branch, {
    foreignKey: 'branch_id',
    as: 'branch'
  });
  Branch.hasMany(PayrollRecord, {
    foreignKey: 'branch_id',
    as: 'payroll_records'
  });

  // PayrollRecord - User (Many-to-One: Employee)
  PayrollRecord.belongsTo(User, {
    foreignKey: 'user_id',
    as: 'employee'
  });
  User.hasMany(PayrollRecord, {
    foreignKey: 'user_id',
    as: 'payroll_records'
  });

  // SalesReturn - SalesOrder (Many-to-One)
  SalesReturn.belongsTo(SalesOrder, {
    foreignKey: 'sales_order_id',
    as: 'sales_order'
  });
  SalesOrder.hasMany(SalesReturn, {
    foreignKey: 'sales_order_id',
    as: 'returns'
  });

  // SalesReturn - Customer (Many-to-One)
  SalesReturn.belongsTo(Customer, {
    foreignKey: 'customer_id',
    as: 'customer'
  });
  Customer.hasMany(SalesReturn, {
    foreignKey: 'customer_id',
    as: 'sales_returns'
  });

  // SalesReturn - Branch (Many-to-One)
  SalesReturn.belongsTo(Branch, {
    foreignKey: 'branch_id',
    as: 'branch'
  });
  Branch.hasMany(SalesReturn, {
    foreignKey: 'branch_id',
    as: 'sales_returns'
  });

  // SalesReturn - User (Many-to-One: Creator)
  SalesReturn.belongsTo(User, {
    foreignKey: 'user_id',
    as: 'creator'
  });
  User.hasMany(SalesReturn, {
    foreignKey: 'user_id',
    as: 'sales_returns_created'
  });

  // SalesReturn - User (Many-to-One: Approver)
  SalesReturn.belongsTo(User, {
    foreignKey: 'approved_by',
    as: 'approver'
  });

  // SalesReturn - SalesReturnItem (One-to-Many)
  SalesReturn.hasMany(SalesReturnItem, {
    foreignKey: 'sales_return_id',
    as: 'items',
    onDelete: 'CASCADE'
  });
  SalesReturnItem.belongsTo(SalesReturn, {
    foreignKey: 'sales_return_id',
    as: 'sales_return'
  });

  // SalesReturnItem - SalesItem (Many-to-One)
  SalesReturnItem.belongsTo(SalesItem, {
    foreignKey: 'sales_item_id',
    as: 'original_item'
  });

  // SalesReturnItem - Product (Many-to-One)
  SalesReturnItem.belongsTo(Product, {
    foreignKey: 'product_id',
    as: 'product'
  });

  // PurchaseReturn - Purchase (Many-to-One)
  PurchaseReturn.belongsTo(Purchase, {
    foreignKey: 'purchase_id',
    as: 'purchase'
  });
  Purchase.hasMany(PurchaseReturn, {
    foreignKey: 'purchase_id',
    as: 'returns'
  });

  // PurchaseReturn - Supplier (Many-to-One)
  PurchaseReturn.belongsTo(Supplier, {
    foreignKey: 'supplier_id',
    as: 'supplier'
  });
  Supplier.hasMany(PurchaseReturn, {
    foreignKey: 'supplier_id',
    as: 'purchase_returns'
  });

  // PurchaseReturn - Branch (Many-to-One)
  PurchaseReturn.belongsTo(Branch, {
    foreignKey: 'branch_id',
    as: 'branch'
  });
  Branch.hasMany(PurchaseReturn, {
    foreignKey: 'branch_id',
    as: 'purchase_returns'
  });

  // PurchaseReturn - User (Many-to-One: Creator)
  PurchaseReturn.belongsTo(User, {
    foreignKey: 'user_id',
    as: 'creator'
  });
  User.hasMany(PurchaseReturn, {
    foreignKey: 'user_id',
    as: 'purchase_returns_created'
  });

  // PurchaseReturn - User (Many-to-One: Approver)
  PurchaseReturn.belongsTo(User, {
    foreignKey: 'approved_by',
    as: 'approver'
  });

  // PurchaseReturn - PurchaseReturnItem (One-to-Many)
  PurchaseReturn.hasMany(PurchaseReturnItem, {
    foreignKey: 'purchase_return_id',
    as: 'items',
    onDelete: 'CASCADE'
  });
  PurchaseReturnItem.belongsTo(PurchaseReturn, {
    foreignKey: 'purchase_return_id',
    as: 'purchase_return'
  });

  // PurchaseReturnItem - PurchaseItem (Many-to-One)
  PurchaseReturnItem.belongsTo(PurchaseItem, {
    foreignKey: 'purchase_item_id',
    as: 'original_item'
  });

  // PurchaseReturnItem - Product (Many-to-One)
  PurchaseReturnItem.belongsTo(Product, {
    foreignKey: 'product_id',
    as: 'product'
  });

  // PurchaseReturnItem - InventoryBatch (Many-to-One)
  PurchaseReturnItem.belongsTo(InventoryBatch, {
    foreignKey: 'inventory_batch_id',
    as: 'inventory_batch'
  });

  // PriceHistory - Product (Many-to-One)
  PriceHistory.belongsTo(Product, {
    foreignKey: 'product_id',
    as: 'product'
  });
  Product.hasMany(PriceHistory, {
    foreignKey: 'product_id',
    as: 'price_history'
  });

  // PriceHistory - User (Many-to-One)
  PriceHistory.belongsTo(User, {
    foreignKey: 'user_id',
    as: 'user'
  });

  // PaymentAccount - Branch (Many-to-One)
  PaymentAccount.belongsTo(Branch, {
    foreignKey: 'branch_id',
    as: 'branch'
  });
  Branch.hasMany(PaymentAccount, {
    foreignKey: 'branch_id',
    as: 'payment_accounts'
  });

  // PaymentAccount - AccountTransaction (One-to-Many)
  PaymentAccount.hasMany(AccountTransaction, {
    foreignKey: 'account_id',
    as: 'transactions'
  });
  AccountTransaction.belongsTo(PaymentAccount, {
    foreignKey: 'account_id',
    as: 'account'
  });

  // AccountTransaction - User (Many-to-One)
  AccountTransaction.belongsTo(User, {
    foreignKey: 'user_id',
    as: 'user'
  });
  User.hasMany(AccountTransaction, {
    foreignKey: 'user_id',
    as: 'account_transactions'
  });

  // Agent - Branch (Many-to-One)
  Agent.belongsTo(Branch, {
    foreignKey: 'branch_id',
    as: 'branch'
  });
  Branch.hasMany(Agent, {
    foreignKey: 'branch_id',
    as: 'agents'
  });

  // Agent - AgentCommission (One-to-Many)
  Agent.hasMany(AgentCommission, {
    foreignKey: 'agent_id',
    as: 'commissions'
  });
  AgentCommission.belongsTo(Agent, {
    foreignKey: 'agent_id',
    as: 'agent'
  });

  // SalesOrder - Agent (Many-to-One)
  SalesOrder.belongsTo(Agent, {
    foreignKey: 'agent_id',
    as: 'agent'
  });
  Agent.hasMany(SalesOrder, {
    foreignKey: 'agent_id',
    as: 'sales_orders'
  });

  // SalesOrder - AgentCommission (One-to-Many)
  SalesOrder.hasMany(AgentCommission, {
    foreignKey: 'sales_order_id',
    as: 'agent_commissions'
  });
  AgentCommission.belongsTo(SalesOrder, {
    foreignKey: 'sales_order_id',
    as: 'sales_order'
  });

  // Discount - Branch (Many-to-One)
  Discount.belongsTo(Branch, {
    foreignKey: 'branch_id',
    as: 'branch'
  });
  Branch.hasMany(Discount, {
    foreignKey: 'branch_id',
    as: 'discounts'
  });

  // DeliveryNoteTemplate - Branch (Many-to-One)
  DeliveryNoteTemplate.belongsTo(Branch, {
    foreignKey: 'branch_id',
    as: 'branch'
  });
  Branch.hasMany(DeliveryNoteTemplate, {
    foreignKey: 'branch_id',
    as: 'delivery_note_templates'
  });

  // ReceiptPrinter - Branch (Many-to-One)
  ReceiptPrinter.belongsTo(Branch, {
    foreignKey: 'branch_id',
    as: 'branch'
  });
  Branch.hasMany(ReceiptPrinter, {
    foreignKey: 'branch_id',
    as: 'receipt_printers'
  });

  // ProductVariation - ProductVariationValue (One-to-Many)
  ProductVariation.hasMany(ProductVariationValue, {
    foreignKey: 'variation_id',
    as: 'values',
    onDelete: 'CASCADE'
  });
  ProductVariationValue.belongsTo(ProductVariation, {
    foreignKey: 'variation_id',
    as: 'variation'
  });

  // Unit - Unit (Self-referential: Base Unit)
  Unit.belongsTo(Unit, {
    foreignKey: 'base_unit_id',
    as: 'base_unit'
  });
  Unit.hasMany(Unit, {
    foreignKey: 'base_unit_id',
    as: 'derived_units'
  });

  // Category - Category (Self-referential: Parent Category)
  Category.belongsTo(Category, {
    foreignKey: 'parent_id',
    as: 'parent'
  });
  Category.hasMany(Category, {
    foreignKey: 'parent_id',
    as: 'children'
  });

  // Category - InventoryBatch (One-to-Many)
  Category.hasMany(InventoryBatch, {
    foreignKey: 'category_id',
    as: 'inventory_batches'
  });
  InventoryBatch.belongsTo(Category, {
    foreignKey: 'category_id',
    as: 'category'
  });

  // BatchType - InventoryBatch (One-to-Many)
  BatchType.hasMany(InventoryBatch, {
    foreignKey: 'batch_type_id',
    as: 'inventory_batches'
  });
  InventoryBatch.belongsTo(BatchType, {
    foreignKey: 'batch_type_id',
    as: 'batch_type'
  });

  // Category - BatchType (Many-to-Many through category_batch_types)
  Category.belongsToMany(BatchType, {
    through: CategoryBatchType,
    foreignKey: 'category_id',
    otherKey: 'batch_type_id',
    as: 'batch_types'
  });
  BatchType.belongsToMany(Category, {
    through: CategoryBatchType,
    foreignKey: 'batch_type_id',
    otherKey: 'category_id',
    as: 'categories'
  });

  // User - BatchType (One-to-Many: Creator)
  User.hasMany(BatchType, {
    foreignKey: 'created_by',
    as: 'batch_types_created'
  });
  BatchType.belongsTo(User, {
    foreignKey: 'created_by',
    as: 'creator'
  });

  // Warranty - Product (One-to-Many)
  Warranty.hasMany(Product, {
    foreignKey: 'warranty_id',
    as: 'products'
  });
  Product.belongsTo(Warranty, {
    foreignKey: 'warranty_id',
    as: 'warranty'
  });

  // LedgerEntry - Customer (Many-to-One, polymorphic via contact_id)
  LedgerEntry.belongsTo(Customer, {
    foreignKey: 'contact_id',
    constraints: false,
    scope: {
      contact_type: 'customer'
    },
    as: 'customer'
  });

  // LedgerEntry - Supplier (Many-to-One, polymorphic via contact_id)
  LedgerEntry.belongsTo(Supplier, {
    foreignKey: 'contact_id',
    constraints: false,
    scope: {
      contact_type: 'supplier'
    },
    as: 'supplier'
  });

  // LedgerEntry - Branch (Many-to-One)
  LedgerEntry.belongsTo(Branch, {
    foreignKey: 'branch_id',
    as: 'branch'
  });
  Branch.hasMany(LedgerEntry, {
    foreignKey: 'branch_id',
    as: 'ledger_entries'
  });

  // LedgerEntry - User (Many-to-One: Creator)
  LedgerEntry.belongsTo(User, {
    foreignKey: 'created_by',
    as: 'creator'
  });
  User.hasMany(LedgerEntry, {
    foreignKey: 'created_by',
    as: 'ledger_entries_created'
  });

  // Customer - LedgerEntry (One-to-Many)
  Customer.hasMany(LedgerEntry, {
    foreignKey: 'contact_id',
    constraints: false,
    scope: {
      contact_type: 'customer'
    },
    as: 'ledger_entries'
  });

  // Supplier - LedgerEntry (One-to-Many)
  Supplier.hasMany(LedgerEntry, {
    foreignKey: 'contact_id',
    constraints: false,
    scope: {
      contact_type: 'supplier'
    },
    as: 'ledger_entries'
  });

  // ActivityLog - User (Many-to-One)
  ActivityLog.belongsTo(User, {
    foreignKey: 'user_id',
    as: 'user'
  });
  User.hasMany(ActivityLog, {
    foreignKey: 'user_id',
    as: 'activity_logs'
  });

  // ActivityLog - Branch (Many-to-One)
  ActivityLog.belongsTo(Branch, {
    foreignKey: 'branch_id',
    as: 'branch'
  });
  Branch.hasMany(ActivityLog, {
    foreignKey: 'branch_id',
    as: 'activity_logs'
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
  InventoryBatch,
  StockTransfer,
  StockAdjustment,
  Wastage,
  Recipe,
  SalesOrder,
  SalesItem,
  ItemAssignment,
  Payment,
  Purchase,
  PurchaseItem,
  ExpenseCategory,
  Expense,
  PayrollRecord,
  SalesReturn,
  SalesReturnItem,
  PurchaseReturn,
  PurchaseReturnItem,
  PriceHistory,
  PaymentAccount,
  AccountTransaction,
  BusinessSetting,
  TaxRate,
  Agent,
  AgentCommission,
  Discount,
  DeliveryNoteTemplate,
  ReceiptPrinter,
  ProductVariation,
  ProductVariationValue,
  Unit,
  Category,
  Warranty,
  BatchType,
  CategoryBatchType,
  LedgerEntry,
  ActivityLog
};

