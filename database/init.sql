-- Aify Global ERP v2.0 - Database Initialization Script
-- PostgreSQL 15+ Required

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- ENUMS
-- ============================================

CREATE TYPE product_type AS ENUM ('standard', 'compound', 'raw_tracked', 'manufactured_virtual');
CREATE TYPE payment_method AS ENUM ('cash', 'transfer', 'pos');
CREATE TYPE payment_status AS ENUM ('pending_confirmation', 'confirmed', 'voided');
CREATE TYPE production_status AS ENUM ('queue', 'produced', 'delivered', 'na');
CREATE TYPE instance_status AS ENUM ('in_stock', 'depleted', 'scrapped');

-- ============================================
-- TABLES
-- ============================================

-- Roles table
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Permissions table
CREATE TABLE permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug VARCHAR(100) NOT NULL UNIQUE,
    group_name VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Role-Permissions junction table
CREATE TABLE role_permissions (
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

-- Branches table
CREATE TABLE branches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    code VARCHAR(10) NOT NULL UNIQUE,
    address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(200) NOT NULL,
    role_id UUID NOT NULL REFERENCES roles(id),
    branch_id UUID REFERENCES branches(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Customers table
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(255),
    address TEXT,
    ledger_balance DECIMAL(15, 2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Suppliers table
CREATE TABLE suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(255),
    address TEXT,
    ledger_balance DECIMAL(15, 2) DEFAULT 0,
    branch_id UUID REFERENCES branches(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Products table
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sku VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(200) NOT NULL,
    type product_type NOT NULL,
    base_unit VARCHAR(50) NOT NULL,
    sale_price DECIMAL(15, 2) NOT NULL,
    cost_price DECIMAL(15, 2),
    tax_rate DECIMAL(5, 2) DEFAULT 0,
    brand VARCHAR(100),
    category VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Inventory Instances table (Tracks physical coils/pallets individually)
CREATE TABLE inventory_instances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id),
    branch_id UUID NOT NULL REFERENCES branches(id),
    instance_code VARCHAR(100) NOT NULL UNIQUE,
    initial_quantity DECIMAL(15, 3) NOT NULL,
    remaining_quantity DECIMAL(15, 3) NOT NULL,
    status instance_status DEFAULT 'in_stock',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CHECK (remaining_quantity >= 0),
    CHECK (remaining_quantity <= initial_quantity)
);

-- Recipes table (Conversion rules for Manufacturing)
CREATE TABLE recipes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    virtual_product_id UUID NOT NULL REFERENCES products(id),
    raw_product_id UUID NOT NULL REFERENCES products(id),
    conversion_factor DECIMAL(15, 4) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CHECK (conversion_factor > 0)
);

-- Sales Orders table
CREATE TABLE sales_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_number VARCHAR(100) NOT NULL UNIQUE,
    customer_id UUID REFERENCES customers(id),
    branch_id UUID NOT NULL REFERENCES branches(id),
    user_id UUID NOT NULL REFERENCES users(id),
    total_amount DECIMAL(15, 2) NOT NULL,
    payment_status VARCHAR(20) DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'partial', 'paid')),
    production_status production_status DEFAULT 'na',
    is_legacy BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sales Items table
CREATE TABLE sales_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES sales_orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    quantity DECIMAL(15, 3) NOT NULL,
    unit_price DECIMAL(15, 2) NOT NULL,
    subtotal DECIMAL(15, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CHECK (quantity > 0),
    CHECK (unit_price >= 0),
    CHECK (subtotal >= 0)
);

-- Item Assignments table (Links a sale item to the specific coil used)
CREATE TABLE item_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sales_item_id UUID NOT NULL REFERENCES sales_items(id) ON DELETE CASCADE,
    inventory_instance_id UUID NOT NULL REFERENCES inventory_instances(id),
    quantity_deducted DECIMAL(15, 3) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CHECK (quantity_deducted > 0)
);

-- Payments table
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES customers(id),
    amount DECIMAL(15, 2) NOT NULL,
    method payment_method NOT NULL,
    status payment_status DEFAULT 'pending_confirmation',
    created_by UUID NOT NULL REFERENCES users(id),
    confirmed_by UUID REFERENCES users(id),
    confirmed_at TIMESTAMP,
    reference_note TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CHECK (amount > 0)
);

-- Purchases table (purchase orders from suppliers)
CREATE TABLE purchases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    purchase_number VARCHAR(100) NOT NULL UNIQUE,
    supplier_id UUID REFERENCES suppliers(id),
    branch_id UUID NOT NULL REFERENCES branches(id),
    user_id UUID NOT NULL REFERENCES users(id),
    total_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
    payment_status VARCHAR(20) DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'partial', 'paid')),
    status VARCHAR(20) DEFAULT 'confirmed' CHECK (status IN ('draft', 'confirmed', 'received', 'cancelled')),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Purchase Items table
CREATE TABLE purchase_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    purchase_id UUID NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    quantity DECIMAL(15, 3) NOT NULL,
    unit_cost DECIMAL(15, 2) NOT NULL,
    subtotal DECIMAL(15, 2) NOT NULL,
    instance_code VARCHAR(100),
    inventory_instance_id UUID REFERENCES inventory_instances(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CHECK (quantity > 0),
    CHECK (unit_cost >= 0),
    CHECK (subtotal >= 0)
);

-- Stock Transfers table (tracking inventory movement between branches)
CREATE TABLE stock_transfers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    inventory_instance_id UUID NOT NULL REFERENCES inventory_instances(id),
    from_branch_id UUID NOT NULL REFERENCES branches(id),
    to_branch_id UUID NOT NULL REFERENCES branches(id),
    user_id UUID NOT NULL REFERENCES users(id),
    transfer_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    CHECK (from_branch_id != to_branch_id)
);

-- Stock Adjustments table (tracking quantity corrections with reasons)
CREATE TABLE stock_adjustments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    inventory_instance_id UUID NOT NULL REFERENCES inventory_instances(id),
    old_quantity DECIMAL(15, 3) NOT NULL,
    new_quantity DECIMAL(15, 3) NOT NULL,
    reason TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id),
    adjustment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CHECK (new_quantity >= 0)
);

-- Production Wastage table (tracking manufacturing losses)
CREATE TABLE production_wastage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    inventory_instance_id UUID NOT NULL REFERENCES inventory_instances(id),
    quantity_wasted DECIMAL(15, 3) NOT NULL,
    reason TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id),
    wastage_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CHECK (quantity_wasted > 0)
);

-- Product Attributes: Brands
CREATE TABLE product_attributes_brands (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Product Attributes: Colors
CREATE TABLE product_attributes_colors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Product Attributes: Gauges
CREATE TABLE product_attributes_gauges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- ALTER EXISTING TABLES
-- ============================================

-- Add foreign keys to products table for attributes
ALTER TABLE products 
    ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES product_attributes_brands(id),
    ADD COLUMN IF NOT EXISTS color_id UUID REFERENCES product_attributes_colors(id),
    ADD COLUMN IF NOT EXISTS gauge_id UUID REFERENCES product_attributes_gauges(id);

-- Add dispatcher fields to sales_orders table
ALTER TABLE sales_orders
    ADD COLUMN IF NOT EXISTS dispatcher_name VARCHAR(200),
    ADD COLUMN IF NOT EXISTS vehicle_plate VARCHAR(50),
    ADD COLUMN IF NOT EXISTS delivery_signature TEXT,
    ADD COLUMN IF NOT EXISTS subtotal DECIMAL(15, 2),
    ADD COLUMN IF NOT EXISTS total_tax DECIMAL(15, 2);

-- Add wastage margin to recipes table
ALTER TABLE recipes
    ADD COLUMN IF NOT EXISTS wastage_margin DECIMAL(5, 2) DEFAULT 0 CHECK (wastage_margin >= 0 AND wastage_margin <= 100);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role_id ON users(role_id);
CREATE INDEX idx_users_branch_id ON users(branch_id);
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_type ON products(type);
CREATE INDEX idx_suppliers_branch_id ON suppliers(branch_id);
CREATE INDEX idx_suppliers_name ON suppliers(name);
CREATE INDEX idx_inventory_instances_product_id ON inventory_instances(product_id);
CREATE INDEX idx_inventory_instances_branch_id ON inventory_instances(branch_id);
CREATE INDEX idx_inventory_instances_status ON inventory_instances(status);
CREATE INDEX idx_sales_orders_branch_id ON sales_orders(branch_id);
CREATE INDEX idx_sales_orders_customer_id ON sales_orders(customer_id);
CREATE INDEX idx_sales_orders_invoice_number ON sales_orders(invoice_number);
CREATE INDEX idx_sales_items_order_id ON sales_items(order_id);
CREATE INDEX idx_item_assignments_sales_item_id ON item_assignments(sales_item_id);
CREATE INDEX idx_item_assignments_inventory_instance_id ON item_assignments(inventory_instance_id);
CREATE INDEX idx_payments_customer_id ON payments(customer_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_created_by ON payments(created_by);
CREATE INDEX idx_purchases_branch_id ON purchases(branch_id);
CREATE INDEX idx_purchases_supplier_id ON purchases(supplier_id);
CREATE INDEX idx_purchases_user_id ON purchases(user_id);
CREATE INDEX idx_purchases_status ON purchases(status);
CREATE INDEX idx_purchases_purchase_number ON purchases(purchase_number);
CREATE INDEX idx_purchase_items_purchase_id ON purchase_items(purchase_id);
CREATE INDEX idx_purchase_items_product_id ON purchase_items(product_id);
CREATE INDEX idx_products_brand_id ON products(brand_id);
CREATE INDEX idx_products_color_id ON products(color_id);
CREATE INDEX idx_products_gauge_id ON products(gauge_id);
CREATE INDEX idx_stock_transfers_instance_id ON stock_transfers(inventory_instance_id);
CREATE INDEX idx_stock_transfers_from_branch ON stock_transfers(from_branch_id);
CREATE INDEX idx_stock_transfers_to_branch ON stock_transfers(to_branch_id);
CREATE INDEX idx_stock_adjustments_instance_id ON stock_adjustments(inventory_instance_id);
CREATE INDEX idx_production_wastage_instance_id ON production_wastage(inventory_instance_id);
CREATE INDEX idx_sales_orders_production_status ON sales_orders(production_status);

-- ============================================
-- SEED DATA: ROLES
-- ============================================

INSERT INTO roles (id, name, description) VALUES
    (uuid_generate_v4(), 'Super Admin', 'Owner. Full access. Can manage all branches, confirm payments, view global P&L, and configure manufacturing recipes.'),
    (uuid_generate_v4(), 'Branch Manager', 'Oversees specific branch operations, approves stock transfers, confirms payments.'),
    (uuid_generate_v4(), 'Sales Representative', 'Creates quotes and invoices. Cannot receive payments or see cost prices.'),
    (uuid_generate_v4(), 'Cashier', 'Logs payments into the system. Cannot confirm payments or edit prices.'),
    (uuid_generate_v4(), 'Inventory Manager', 'Manages physical stock, registers new coils/pallets, handles wastage.'),
    (uuid_generate_v4(), 'Production Worker', 'View-only access to Production Queue. Updates status to ''Produced''.');

-- ============================================
-- SEED DATA: PERMISSIONS (37 permissions)
-- ============================================

-- User Management Permissions (6)
INSERT INTO permissions (slug, group_name) VALUES
    ('user_view', 'user_management'),
    ('user_view_global', 'user_management'),
    ('user_add', 'user_management'),
    ('user_edit', 'user_management'),
    ('user_delete', 'user_management'),
    ('role_manage', 'user_management');

-- Inventory Permissions (9)
INSERT INTO permissions (slug, group_name) VALUES
    ('product_view', 'inventory'),
    ('product_add', 'inventory'),
    ('product_edit', 'inventory'),
    ('product_delete', 'inventory'),
    ('product_view_cost', 'inventory'),
    ('stock_add_opening', 'inventory'),
    ('stock_adjust', 'inventory'),
    ('stock_transfer_init', 'inventory'),
    ('stock_transfer_approve', 'inventory');

-- Sales & POS Permissions (8)
INSERT INTO permissions (slug, group_name) VALUES
    ('pos_access', 'sales_pos'),
    ('sale_view_own', 'sales_pos'),
    ('sale_view_all', 'sales_pos'),
    ('sale_edit_price', 'sales_pos'),
    ('sale_discount', 'sales_pos'),
    ('sale_credit', 'sales_pos'),
    ('quote_manage', 'sales_pos'),
    ('draft_manage', 'sales_pos');

-- Payments Permissions (5)
INSERT INTO permissions (slug, group_name) VALUES
    ('payment_view', 'payments'),
    ('payment_receive', 'payments'),
    ('payment_confirm', 'payments'),
    ('payment_delete_unconfirmed', 'payments'),
    ('payment_void_confirmed', 'payments');

-- Manufacturing Permissions (4)
INSERT INTO permissions (slug, group_name) VALUES
    ('recipe_view', 'manufacturing'),
    ('recipe_manage', 'manufacturing'),
    ('production_view_queue', 'manufacturing'),
    ('production_update_status', 'manufacturing');

-- Data Management Permissions (3)
INSERT INTO permissions (slug, group_name) VALUES
    ('data_import', 'data_management'),
    ('data_export_operational', 'data_management'),
    ('data_export_financial', 'data_management');

-- Reports Permissions (4)
INSERT INTO permissions (slug, group_name) VALUES
    ('report_view_register', 'reports'),
    ('report_view_stock_value', 'reports'),
    ('report_view_financial', 'reports'),
    ('report_view_sales', 'reports');

-- ============================================
-- SEED DATA: ROLE-PERMISSION MAPPINGS
-- ============================================

-- Super Admin: All permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'Super Admin';

-- Branch Manager: Most permissions except global user view and role management
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'Branch Manager'
  AND p.slug NOT IN ('user_view_global', 'role_manage');

-- Sales Representative: Sales and view permissions only
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'Sales Representative'
  AND p.slug IN (
    'pos_access', 'sale_view_own', 'sale_view_all', 'sale_edit_price',
    'sale_discount', 'sale_credit', 'quote_manage', 'draft_manage',
    'product_view', 'recipe_view', 'production_view_queue',
    'payment_view', 'report_view_sales'
  );

-- Cashier: Payment receive and view permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'Cashier'
  AND p.slug IN (
    'payment_view', 'payment_receive', 'payment_delete_unconfirmed',
    'sale_view_own', 'product_view', 'customer_view'
  );

-- Inventory Manager: Inventory and product management
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'Inventory Manager'
  AND p.slug IN (
    'product_view', 'product_add', 'product_edit', 'product_delete',
    'product_view_cost', 'stock_add_opening', 'stock_adjust',
    'stock_transfer_init', 'stock_transfer_approve',
    'recipe_view', 'report_view_stock_value'
  );

-- Production Worker: View queue and update status
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'Production Worker'
  AND p.slug IN (
    'production_view_queue', 'production_update_status',
    'product_view', 'recipe_view'
  );

-- ============================================
-- SEED DATA: BRANCHES
-- ============================================

INSERT INTO branches (id, name, code, address) VALUES
    (uuid_generate_v4(), 'Lagos Branch', 'LAG', 'Lagos, Nigeria'),
    (uuid_generate_v4(), 'Abuja Branch', 'ABJ', 'Abuja, Nigeria'),
    (uuid_generate_v4(), 'Port Harcourt Branch', 'PHC', 'Port Harcourt, Nigeria'),
    (uuid_generate_v4(), 'Kano Branch', 'KAN', 'Kano, Nigeria');

-- ============================================
-- SEED DATA: SUPER ADMIN USER
-- ============================================
-- Password: Admin@123 (bcrypt hash)
-- Note: This is a placeholder hash. In production, use bcrypt to generate the actual hash.
-- For now, we'll use a known bcrypt hash for 'Admin@123' (cost factor 10)

INSERT INTO users (id, email, password_hash, full_name, role_id, branch_id, is_active)
SELECT 
    uuid_generate_v4(),
    'admin@aify.com',
    '$2b$10$06Ua46dXi6qKmppVbtIEH.sCj8YsKXT7yCrMJmlBptjtJ7ru6eTLi', -- bcrypt hash for 'Admin@123'
    'Super Administrator',
    r.id,
    NULL, -- Super Admin has no branch restriction
    true
FROM roles r
WHERE r.name = 'Super Admin';

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE inventory_instances IS 'Tracks physical coils/pallets individually with unique instance codes';
COMMENT ON TABLE item_assignments IS 'Links a sale item to the specific coil used, enabling granular inventory tracking';
COMMENT ON TABLE recipes IS 'Conversion rules for Manufacturing (e.g., 1 Meter Longspan = 0.8 KG Coil)';
COMMENT ON COLUMN inventory_instances.instance_code IS 'Unique identifier for physical coil/pallet (e.g., COIL-001)';
COMMENT ON COLUMN inventory_instances.remaining_quantity IS 'Current available quantity for this specific instance';
COMMENT ON COLUMN item_assignments.quantity_deducted IS 'Amount of raw material deducted from the specific inventory instance';

-- ============================================
-- INITIALIZATION COMPLETE
-- ============================================

