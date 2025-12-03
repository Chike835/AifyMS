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
CREATE TYPE production_status AS ENUM ('queue', 'processing', 'produced', 'delivered', 'na');
CREATE TYPE instance_status AS ENUM ('in_stock', 'depleted', 'scrapped');
CREATE TYPE contact_type AS ENUM ('customer', 'supplier');
CREATE TYPE transaction_type AS ENUM ('INVOICE', 'PAYMENT', 'RETURN', 'ADJUSTMENT', 'OPENING_BALANCE', 'ADVANCE_PAYMENT', 'REFUND', 'REFUND_FEE');
CREATE TYPE action_type AS ENUM ('LOGIN', 'CREATE', 'UPDATE', 'DELETE', 'PRINT', 'CONFIRM', 'VOID');

-- ============================================
-- ALTER ENUMS FOR EXISTING DATABASES
-- ============================================
-- For existing databases, run these ALTER statements to add new enum values
-- Note: These will fail silently if the values already exist in newer PostgreSQL versions
-- Uncomment and run these if you're upgrading an existing database:
-- DO $$ BEGIN
--   ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS 'ADVANCE_PAYMENT';
--   ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS 'REFUND';
--   ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS 'REFUND_FEE';
-- EXCEPTION WHEN duplicate_object THEN null;
-- END $$;

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
    label_template TEXT,
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
    base_salary DECIMAL(15, 2) DEFAULT 0,
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

-- Product Variations table
CREATE TABLE product_variations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Product Variation Values table
CREATE TABLE product_variation_values (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    variation_id UUID NOT NULL REFERENCES product_variations(id) ON DELETE CASCADE,
    value VARCHAR(200) NOT NULL,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_variation_values_variation_id ON product_variation_values(variation_id);

-- Units table
CREATE TABLE units (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) NOT NULL UNIQUE,
    abbreviation VARCHAR(10) NOT NULL UNIQUE,
    base_unit_id UUID REFERENCES units(id),
    conversion_factor DECIMAL(15, 6) DEFAULT 1,
    is_base_unit BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_units_base_unit_id ON units(base_unit_id);

-- Categories table
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    parent_id UUID REFERENCES categories(id),
    description TEXT,
    unit_type VARCHAR(50),
    attribute_schema JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_categories_parent_id ON categories(parent_id);
CREATE INDEX idx_categories_attribute_schema ON categories USING GIN(attribute_schema);

-- Warranties table
CREATE TABLE warranties (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    duration_months INTEGER NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add warranty_id to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS warranty_id UUID REFERENCES warranties(id);
CREATE INDEX idx_products_warranty_id ON products(warranty_id);

-- Batch Types table (Dynamic batch type configuration)
CREATE TABLE batch_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true
);
CREATE INDEX idx_batch_types_name ON batch_types(name);
CREATE INDEX idx_batch_types_active ON batch_types(is_active);

-- Category-Batch Types junction table (Many-to-Many relationship)
CREATE TABLE category_batch_types (
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    batch_type_id UUID NOT NULL REFERENCES batch_types(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (category_id, batch_type_id)
);
CREATE INDEX idx_category_batch_types_category ON category_batch_types(category_id);
CREATE INDEX idx_category_batch_types_batch_type ON category_batch_types(batch_type_id);

-- Inventory Batches table (Tracks physical coils/pallets/cartons/loose materials)
CREATE TABLE inventory_batches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id),
    branch_id UUID NOT NULL REFERENCES branches(id),
    category_id UUID REFERENCES categories(id),
    instance_code VARCHAR(100) UNIQUE,
    batch_type_id UUID NOT NULL REFERENCES batch_types(id),
    grouped BOOLEAN NOT NULL DEFAULT true,
    batch_identifier VARCHAR(100),
    initial_quantity DECIMAL(15, 3) NOT NULL,
    remaining_quantity DECIMAL(15, 3) NOT NULL,
    status instance_status DEFAULT 'in_stock',
    attribute_data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CHECK (remaining_quantity >= 0),
    CHECK (remaining_quantity <= initial_quantity),
    CHECK (
        (grouped = true AND instance_code IS NOT NULL) OR 
        (grouped = false)
    )
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

-- Agents table (Sales Commission Agents)
CREATE TABLE agents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    email VARCHAR(200),
    phone VARCHAR(50),
    commission_rate DECIMAL(5, 2) DEFAULT 0 CHECK (commission_rate >= 0 AND commission_rate <= 100),
    is_active BOOLEAN DEFAULT true,
    branch_id UUID REFERENCES branches(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_agents_branch_id ON agents(branch_id);
CREATE INDEX idx_agents_active ON agents(is_active);

-- Sales Orders table
CREATE TABLE sales_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_number VARCHAR(100) NOT NULL UNIQUE,
    customer_id UUID REFERENCES customers(id),
    branch_id UUID NOT NULL REFERENCES branches(id),
    user_id UUID NOT NULL REFERENCES users(id),
    agent_id UUID REFERENCES agents(id),
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
    inventory_batch_id UUID REFERENCES inventory_batches(id),
    quantity DECIMAL(15, 3) NOT NULL,
    unit_price DECIMAL(15, 2) NOT NULL,
    subtotal DECIMAL(15, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CHECK (quantity > 0),
    CHECK (unit_price >= 0),
    CHECK (subtotal >= 0)
);

-- Item Assignments table (Links a sale item to the specific batch used)
CREATE TABLE item_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sales_item_id UUID NOT NULL REFERENCES sales_items(id) ON DELETE CASCADE,
    inventory_batch_id UUID NOT NULL REFERENCES inventory_batches(id),
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
    inventory_batch_id UUID REFERENCES inventory_batches(id),
    purchase_unit_id UUID REFERENCES units(id),
    purchased_quantity DECIMAL(15, 3),
    conversion_factor DECIMAL(15, 6) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CHECK (quantity > 0),
    CHECK (unit_cost >= 0),
    CHECK (subtotal >= 0)
);
CREATE INDEX idx_purchase_items_purchase_unit_id ON purchase_items(purchase_unit_id);

-- Stock Transfers table (tracking inventory movement between branches)
CREATE TABLE stock_transfers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    inventory_batch_id UUID NOT NULL REFERENCES inventory_batches(id),
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
    inventory_batch_id UUID NOT NULL REFERENCES inventory_batches(id),
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
    inventory_batch_id UUID NOT NULL REFERENCES inventory_batches(id),
    quantity_wasted DECIMAL(15, 3) NOT NULL,
    reason TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id),
    wastage_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CHECK (quantity_wasted > 0)
);

-- Expense Categories table (branch-scoped)
CREATE TABLE expense_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    branch_id UUID NOT NULL REFERENCES branches(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(name, branch_id)
);

-- Expenses table (branch-scoped, linked to category and user)
CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID NOT NULL REFERENCES expense_categories(id),
    branch_id UUID NOT NULL REFERENCES branches(id),
    user_id UUID NOT NULL REFERENCES users(id),
    amount DECIMAL(15, 2) NOT NULL,
    description TEXT,
    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CHECK (amount > 0)
);

-- Payroll Records table (branch-scoped, linked to user/employee)
CREATE TABLE payroll_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    branch_id UUID NOT NULL REFERENCES branches(id),
    month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
    year INTEGER NOT NULL CHECK (year >= 2000),
    gross_pay DECIMAL(15, 2) NOT NULL DEFAULT 0,
    deductions DECIMAL(15, 2) NOT NULL DEFAULT 0,
    net_pay DECIMAL(15, 2) NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, month, year),
    CHECK (gross_pay >= 0),
    CHECK (deductions >= 0),
    CHECK (net_pay >= 0)
);

-- Payment Accounts table (bank accounts, cash registers, mobile money, POS terminals)
CREATE TABLE payment_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    account_type VARCHAR(50) NOT NULL CHECK (account_type IN ('cash', 'bank', 'mobile_money', 'pos_terminal')),
    account_number VARCHAR(100),
    bank_name VARCHAR(200),
    opening_balance DECIMAL(15, 2) DEFAULT 0,
    current_balance DECIMAL(15, 2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    branch_id UUID REFERENCES branches(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_payment_accounts_branch_id ON payment_accounts(branch_id);
CREATE INDEX idx_payment_accounts_type ON payment_accounts(account_type);

-- Account Transactions table (tracks all movements in payment accounts)
CREATE TABLE account_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID NOT NULL REFERENCES payment_accounts(id),
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('deposit', 'withdrawal', 'transfer', 'payment_received', 'payment_made')),
    amount DECIMAL(15, 2) NOT NULL,
    reference_type VARCHAR(50),
    reference_id UUID,
    notes TEXT,
    user_id UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CHECK (amount > 0)
);
CREATE INDEX idx_account_transactions_account_id ON account_transactions(account_id);
CREATE INDEX idx_account_transactions_type ON account_transactions(transaction_type);
CREATE INDEX idx_account_transactions_reference ON account_transactions(reference_type, reference_id);

-- Agent Commissions table
CREATE TABLE agent_commissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL REFERENCES agents(id),
    sales_order_id UUID NOT NULL REFERENCES sales_orders(id),
    commission_amount DECIMAL(15, 2) NOT NULL,
    commission_rate DECIMAL(5, 2) NOT NULL,
    order_amount DECIMAL(15, 2) NOT NULL,
    payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'cancelled')),
    paid_at TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_agent_commissions_agent_id ON agent_commissions(agent_id);
CREATE INDEX idx_agent_commissions_order_id ON agent_commissions(sales_order_id);
CREATE INDEX idx_agent_commissions_payment_status ON agent_commissions(payment_status);

-- Discounts table
CREATE TABLE discounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
    value DECIMAL(15, 2) NOT NULL,
    min_purchase_amount DECIMAL(15, 2) DEFAULT 0,
    max_discount_amount DECIMAL(15, 2),
    valid_from DATE,
    valid_until DATE,
    is_active BOOLEAN DEFAULT true,
    branch_id UUID REFERENCES branches(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_discounts_branch_id ON discounts(branch_id);
CREATE INDEX idx_discounts_active ON discounts(is_active);
CREATE INDEX idx_discounts_valid_dates ON discounts(valid_from, valid_until);

-- Delivery Note Templates table
CREATE TABLE delivery_note_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    template_content TEXT NOT NULL,
    is_default BOOLEAN DEFAULT false,
    branch_id UUID REFERENCES branches(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_delivery_note_templates_branch_id ON delivery_note_templates(branch_id);
CREATE INDEX idx_delivery_note_templates_default ON delivery_note_templates(is_default);

-- Receipt Printers table
CREATE TABLE receipt_printers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    printer_type VARCHAR(50) NOT NULL CHECK (printer_type IN ('thermal', 'inkjet', 'laser', 'dot_matrix')),
    connection_type VARCHAR(50) NOT NULL CHECK (connection_type IN ('usb', 'network', 'bluetooth', 'serial')),
    connection_string VARCHAR(500),
    paper_width_mm INT DEFAULT 80,
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    branch_id UUID REFERENCES branches(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_receipt_printers_branch_id ON receipt_printers(branch_id);
CREATE INDEX idx_receipt_printers_active ON receipt_printers(is_active);

-- Tax Rates table
CREATE TABLE tax_rates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    rate DECIMAL(5, 2) NOT NULL CHECK (rate >= 0 AND rate <= 100),
    is_compound BOOLEAN DEFAULT false,
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_tax_rates_active ON tax_rates(is_active);

-- Ledger Entries table (Financial ledger for customers and suppliers)
CREATE TABLE ledger_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contact_id UUID NOT NULL,
    contact_type contact_type NOT NULL,
    transaction_date TIMESTAMP NOT NULL,
    transaction_type transaction_type NOT NULL,
    transaction_id UUID,
    description TEXT,
    debit_amount DECIMAL(15, 2) DEFAULT 0,
    credit_amount DECIMAL(15, 2) DEFAULT 0,
    running_balance DECIMAL(15, 2) NOT NULL,
    branch_id UUID NOT NULL REFERENCES branches(id),
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CHECK (debit_amount >= 0),
    CHECK (credit_amount >= 0),
    CHECK (debit_amount = 0 OR credit_amount = 0)
);
CREATE INDEX idx_ledger_entries_contact_id ON ledger_entries(contact_id);
CREATE INDEX idx_ledger_entries_transaction_date ON ledger_entries(transaction_date);
CREATE INDEX idx_ledger_entries_branch_id ON ledger_entries(branch_id);
CREATE INDEX idx_ledger_entries_transaction_type ON ledger_entries(transaction_type);
CREATE INDEX idx_ledger_entries_contact_type ON ledger_entries(contact_type);

-- Activity Logs table (System activity tracking)
CREATE TABLE activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    action_type action_type NOT NULL,
    module VARCHAR(100) NOT NULL,
    description TEXT,
    ip_address VARCHAR(45),
    branch_id UUID REFERENCES branches(id),
    reference_type VARCHAR(50),
    reference_id UUID,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_action_type ON activity_logs(action_type);
CREATE INDEX idx_activity_logs_module ON activity_logs(module);
CREATE INDEX idx_activity_logs_timestamp ON activity_logs(timestamp);
CREATE INDEX idx_activity_logs_branch_id ON activity_logs(branch_id);
CREATE INDEX idx_activity_logs_reference ON activity_logs(reference_type, reference_id);

-- Product Attributes: Brands
CREATE TABLE product_attributes_brands (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Business Settings table
CREATE TABLE business_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    setting_key VARCHAR(100) NOT NULL UNIQUE,
    setting_value TEXT,
    setting_type VARCHAR(20) DEFAULT 'string' CHECK (setting_type IN ('string', 'number', 'boolean', 'json')),
    category VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_business_settings_category ON business_settings(category);
CREATE INDEX idx_business_settings_key ON business_settings(setting_key);

-- ============================================
-- ALTER EXISTING TABLES
-- ============================================

-- Add foreign keys to products table for attributes
ALTER TABLE products 
    ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES product_attributes_brands(id),
    ADD COLUMN IF NOT EXISTS tax_rate_id UUID REFERENCES tax_rates(id);

-- Add new product fields for Add Product form
ALTER TABLE products
    ADD COLUMN IF NOT EXISTS unit_id UUID REFERENCES units(id),
    ADD COLUMN IF NOT EXISTS cost_price_inc_tax DECIMAL(15, 2),
    ADD COLUMN IF NOT EXISTS is_taxable BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS selling_price_tax_type VARCHAR(20) DEFAULT 'exclusive' CHECK (selling_price_tax_type IN ('inclusive', 'exclusive')),
    ADD COLUMN IF NOT EXISTS profit_margin DECIMAL(5, 2) DEFAULT 25.00,
    ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES categories(id),
    ADD COLUMN IF NOT EXISTS sub_category_id UUID REFERENCES categories(id),
    ADD COLUMN IF NOT EXISTS weight DECIMAL(10, 4),
    ADD COLUMN IF NOT EXISTS manage_stock BOOLEAN DEFAULT true,
    ADD COLUMN IF NOT EXISTS not_for_selling BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS image_url VARCHAR(500),
    ADD COLUMN IF NOT EXISTS barcode_type VARCHAR(50) DEFAULT 'CODE128',
    ADD COLUMN IF NOT EXISTS alert_quantity DECIMAL(15, 3) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS reorder_quantity DECIMAL(15, 3) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS woocommerce_enabled BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
    ADD COLUMN IF NOT EXISTS attribute_default_values JSONB DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_products_unit_id ON products(unit_id);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_sub_category_id ON products(sub_category_id);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_not_for_selling ON products(not_for_selling);
CREATE INDEX IF NOT EXISTS idx_products_attribute_default_values ON products USING GIN(attribute_default_values);

-- Product Business Locations junction table (Many-to-Many relationship)
CREATE TABLE IF NOT EXISTS product_business_locations (
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (product_id, branch_id)
);
CREATE INDEX IF NOT EXISTS idx_product_business_locations_product ON product_business_locations(product_id);
CREATE INDEX IF NOT EXISTS idx_product_business_locations_branch ON product_business_locations(branch_id);

-- Add dispatcher fields to sales_orders table
ALTER TABLE sales_orders
    ADD COLUMN IF NOT EXISTS dispatcher_name VARCHAR(200),
    ADD COLUMN IF NOT EXISTS vehicle_plate VARCHAR(50),
    ADD COLUMN IF NOT EXISTS delivery_signature TEXT,
    ADD COLUMN IF NOT EXISTS subtotal DECIMAL(15, 2),
    ADD COLUMN IF NOT EXISTS total_tax DECIMAL(15, 2);

-- Add order_type and quotation fields to sales_orders table
ALTER TABLE sales_orders
    ADD COLUMN IF NOT EXISTS order_type VARCHAR(20) DEFAULT 'invoice' CHECK (order_type IN ('draft', 'quotation', 'invoice')),
    ADD COLUMN IF NOT EXISTS valid_until DATE,
    ADD COLUMN IF NOT EXISTS quotation_notes TEXT;

-- Add wastage margin to recipes table
ALTER TABLE recipes
    ADD COLUMN IF NOT EXISTS wastage_margin DECIMAL(5, 2) DEFAULT 0 CHECK (wastage_margin >= 0 AND wastage_margin <= 100);

-- ============================================
-- PHASE 2: RETURNS TABLES
-- ============================================

-- Sales Returns table
CREATE TABLE IF NOT EXISTS sales_returns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    return_number VARCHAR(100) NOT NULL UNIQUE,
    sales_order_id UUID NOT NULL REFERENCES sales_orders(id),
    customer_id UUID REFERENCES customers(id),
    branch_id UUID NOT NULL REFERENCES branches(id),
    user_id UUID NOT NULL REFERENCES users(id),
    total_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
    reason TEXT NOT NULL,
    refund_method VARCHAR(20) CHECK (refund_method IN ('cash', 'credit', 'replacement')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'completed', 'cancelled')),
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sales Return Items table
CREATE TABLE IF NOT EXISTS sales_return_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sales_return_id UUID NOT NULL REFERENCES sales_returns(id) ON DELETE CASCADE,
    sales_item_id UUID NOT NULL REFERENCES sales_items(id),
    product_id UUID NOT NULL REFERENCES products(id),
    quantity DECIMAL(15, 3) NOT NULL,
    unit_price DECIMAL(15, 2) NOT NULL,
    subtotal DECIMAL(15, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CHECK (quantity > 0)
);

-- Purchase Returns table
CREATE TABLE IF NOT EXISTS purchase_returns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    return_number VARCHAR(100) NOT NULL UNIQUE,
    purchase_id UUID NOT NULL REFERENCES purchases(id),
    supplier_id UUID REFERENCES suppliers(id),
    branch_id UUID NOT NULL REFERENCES branches(id),
    user_id UUID NOT NULL REFERENCES users(id),
    total_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
    reason TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'completed', 'cancelled')),
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Purchase Return Items table
CREATE TABLE IF NOT EXISTS purchase_return_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    purchase_return_id UUID NOT NULL REFERENCES purchase_returns(id) ON DELETE CASCADE,
    purchase_item_id UUID NOT NULL REFERENCES purchase_items(id),
    product_id UUID NOT NULL REFERENCES products(id),
    quantity DECIMAL(15, 3) NOT NULL,
    unit_cost DECIMAL(15, 2) NOT NULL,
    subtotal DECIMAL(15, 2) NOT NULL,
    inventory_batch_id UUID REFERENCES inventory_batches(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CHECK (quantity > 0)
);

-- Price History table
CREATE TABLE IF NOT EXISTS price_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id),
    old_sale_price DECIMAL(15, 2),
    new_sale_price DECIMAL(15, 2),
    old_cost_price DECIMAL(15, 2),
    new_cost_price DECIMAL(15, 2),
    user_id UUID NOT NULL REFERENCES users(id),
    reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for new tables
CREATE INDEX IF NOT EXISTS idx_sales_returns_order_id ON sales_returns(sales_order_id);
CREATE INDEX IF NOT EXISTS idx_sales_returns_branch_id ON sales_returns(branch_id);
CREATE INDEX IF NOT EXISTS idx_sales_returns_status ON sales_returns(status);
CREATE INDEX IF NOT EXISTS idx_sales_return_items_return_id ON sales_return_items(sales_return_id);
CREATE INDEX IF NOT EXISTS idx_purchase_returns_purchase_id ON purchase_returns(purchase_id);
CREATE INDEX IF NOT EXISTS idx_purchase_returns_branch_id ON purchase_returns(branch_id);
CREATE INDEX IF NOT EXISTS idx_purchase_returns_status ON purchase_returns(status);
CREATE INDEX IF NOT EXISTS idx_purchase_return_items_return_id ON purchase_return_items(purchase_return_id);
CREATE INDEX IF NOT EXISTS idx_price_history_product_id ON price_history(product_id);

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
CREATE INDEX idx_inventory_batches_product_id ON inventory_batches(product_id);
CREATE INDEX idx_inventory_batches_branch_id ON inventory_batches(branch_id);
CREATE INDEX idx_inventory_batches_status ON inventory_batches(status);
CREATE INDEX idx_inventory_batches_category_id ON inventory_batches(category_id);
CREATE INDEX idx_inventory_batches_batch_type_id ON inventory_batches(batch_type_id);
CREATE INDEX idx_inventory_batches_grouped ON inventory_batches(grouped);
CREATE INDEX idx_inventory_batches_attribute_data ON inventory_batches USING GIN(attribute_data);
CREATE INDEX idx_sales_items_inventory_batch_id ON sales_items(inventory_batch_id);
CREATE INDEX idx_sales_orders_branch_id ON sales_orders(branch_id);
CREATE INDEX idx_sales_orders_customer_id ON sales_orders(customer_id);
CREATE INDEX idx_sales_orders_invoice_number ON sales_orders(invoice_number);
CREATE INDEX idx_sales_items_order_id ON sales_items(order_id);
CREATE INDEX idx_item_assignments_sales_item_id ON item_assignments(sales_item_id);
CREATE INDEX idx_item_assignments_inventory_batch_id ON item_assignments(inventory_batch_id);
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
CREATE INDEX idx_stock_transfers_batch_id ON stock_transfers(inventory_batch_id);
CREATE INDEX idx_stock_transfers_from_branch ON stock_transfers(from_branch_id);
CREATE INDEX idx_stock_transfers_to_branch ON stock_transfers(to_branch_id);
CREATE INDEX idx_stock_adjustments_batch_id ON stock_adjustments(inventory_batch_id);
CREATE INDEX idx_production_wastage_batch_id ON production_wastage(inventory_batch_id);
CREATE INDEX idx_sales_orders_production_status ON sales_orders(production_status);
CREATE INDEX idx_expense_categories_branch_id ON expense_categories(branch_id);
CREATE INDEX idx_expense_categories_name ON expense_categories(name);
CREATE INDEX idx_expenses_branch_id ON expenses(branch_id);
CREATE INDEX idx_expenses_category_id ON expenses(category_id);
CREATE INDEX idx_expenses_user_id ON expenses(user_id);
CREATE INDEX idx_expenses_expense_date ON expenses(expense_date);
CREATE INDEX idx_payroll_records_branch_id ON payroll_records(branch_id);
CREATE INDEX idx_payroll_records_user_id ON payroll_records(user_id);
CREATE INDEX idx_payroll_records_month_year ON payroll_records(month, year);

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
-- SEED DATA: PERMISSIONS (39 permissions)
-- ============================================

-- User Management Permissions (6)
INSERT INTO permissions (slug, group_name) VALUES
    ('user_view', 'user_management'),
    ('user_view_global', 'user_management'),
    ('user_add', 'user_management'),
    ('user_edit', 'user_management'),
    ('user_delete', 'user_management'),
    ('role_manage', 'user_management');

-- Inventory Permissions (13)
INSERT INTO permissions (slug, group_name) VALUES
    ('product_view', 'inventory'),
    ('product_add', 'inventory'),
    ('product_edit', 'inventory'),
    ('product_delete', 'inventory'),
    ('product_view_cost', 'inventory'),
    ('stock_add_opening', 'inventory'),
    ('stock_adjust', 'inventory'),
    ('stock_transfer_init', 'inventory'),
    ('stock_transfer_approve', 'inventory'),
    ('batch_view', 'inventory'),
    ('batch_create', 'inventory'),
    ('batch_edit', 'inventory'),
    ('batch_delete', 'inventory');

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

-- Contacts Permissions (2)
INSERT INTO permissions (slug, group_name) VALUES
    ('customer_view', 'contacts'),
    ('supplier_view', 'contacts');

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

-- Expenses Permissions (3)
INSERT INTO permissions (slug, group_name) VALUES
    ('expense_view', 'expenses'),
    ('expense_manage', 'expenses'),
    ('expense_category_manage', 'expenses');

-- Payroll Permissions (2)
INSERT INTO permissions (slug, group_name) VALUES
    ('payroll_view', 'payroll'),
    ('payroll_manage', 'payroll');

-- Sales Returns Permissions (3)
INSERT INTO permissions (slug, group_name) VALUES
    ('sale_return_view', 'sales_pos'),
    ('sale_return_create', 'sales_pos'),
    ('sale_return_approve', 'sales_pos');

-- Purchase Returns Permissions (3)
INSERT INTO permissions (slug, group_name) VALUES
    ('purchase_return_view', 'purchases'),
    ('purchase_return_create', 'purchases'),
    ('purchase_return_approve', 'purchases');

-- Settings Permissions (1)
INSERT INTO permissions (slug, group_name) VALUES
    ('settings_manage', 'settings');

-- Payment Account Permissions (2)
INSERT INTO permissions (slug, group_name) VALUES
    ('payment_account_view', 'payments'),
    ('payment_account_manage', 'payments');

-- Discount Permissions (2)
INSERT INTO permissions (slug, group_name) VALUES
    ('discount_view', 'sales_pos'),
    ('discount_manage', 'sales_pos');

-- Agent Permissions (6) - Note: agent_view was already added above, so we use INSERT ... ON CONFLICT
INSERT INTO permissions (slug, group_name) VALUES
    ('agent_view', 'user_management'),
    ('agent_add', 'user_management'),
    ('agent_edit', 'user_management'),
    ('agent_delete', 'user_management'),
    ('agent_commission_view', 'user_management'),
    ('agent_commission_manage', 'user_management')
ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- SEED DATA: ROLE-PERMISSION MAPPINGS
-- ============================================

-- Super Admin: All permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'Super Admin';

-- Branch Manager: Most permissions except global user view, role management, and payroll management
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'Branch Manager'
  AND p.slug NOT IN ('user_view_global', 'role_manage', 'payroll_manage');

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
    'batch_view', 'batch_create', 'batch_edit', 'batch_delete',
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
-- SEED DATA: BUSINESS SETTINGS
-- ============================================

INSERT INTO business_settings (setting_key, setting_value, setting_type, category) VALUES
    ('business_name', 'Aify Global', 'string', 'general'),
    ('business_address', '', 'string', 'general'),
    ('business_phone', '', 'string', 'general'),
    ('business_email', '', 'string', 'general'),
    ('business_logo', '', 'string', 'general'),
    ('currency_symbol', '₦', 'string', 'general'),
    ('currency_code', 'NGN', 'string', 'general'),
    ('date_format', 'DD/MM/YYYY', 'string', 'general'),
    ('time_format', '24h', 'string', 'general'),
    ('fiscal_year_start', '01-01', 'string', 'financial'),
    ('invoice_prefix', 'INV', 'string', 'invoice'),
    ('invoice_footer', 'Thank you for your business!', 'string', 'invoice'),
    ('invoice_terms', 'Payment due within 30 days', 'string', 'invoice'),
    ('invoice_show_tax', 'true', 'boolean', 'invoice'),
    ('invoice_show_discount', 'true', 'boolean', 'invoice'),
    ('barcode_type', 'CODE128', 'string', 'barcode'),
    ('barcode_width', '2', 'number', 'barcode'),
    ('barcode_height', '100', 'number', 'barcode'),
    ('barcode_show_text', 'true', 'boolean', 'barcode'),
    ('barcode_text_position', 'bottom', 'string', 'barcode'),
    ('manufacturing_gauges', '["0.1", "0.2", "0.3", "0.4", "0.5", "0.6", "0.7", "0.8", "0.9", "1.0"]', 'json', 'manufacturing'),
    ('gauge_enabled_categories', '["aluminium", "stone_tile"]', 'json', 'manufacturing'),
    ('manufacturing_aluminium_colors', '["Charcoal", "Terracotta", "Blue", "Green", "Red", "Brown", "Grey", "White"]', 'json', 'manufacturing'),
    ('manufacturing_stone_tile_colors', '["Natural", "Grey", "Brown", "Charcoal", "Terracotta"]', 'json', 'manufacturing'),
    ('manufacturing_stone_tile_design', '["Shingle", "Tile", "Slate", "Roman"]', 'json', 'manufacturing');

-- ============================================
-- SEED DATA: BATCH TYPES
-- ============================================

INSERT INTO batch_types (id, name, description) VALUES
    (uuid_generate_v4(), 'Coil', 'Rolled materials (e.g., Aluminium coils)'),
    (uuid_generate_v4(), 'Pallet', 'Stacked materials on pallets'),
    (uuid_generate_v4(), 'Carton', 'Boxed materials'),
    (uuid_generate_v4(), 'Loose', 'Untracked bulk materials')
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- SEED DATA: TAX RATES
-- ============================================

INSERT INTO tax_rates (name, rate, is_default) VALUES
    ('VAT', 7.5, true),
    ('No Tax', 0, false);

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

COMMENT ON TABLE inventory_batches IS 'Tracks physical inventory batches (coils, pallets, cartons, or loose materials)';
COMMENT ON TABLE item_assignments IS 'Links a sale item to the specific batch used, enabling granular inventory tracking';
COMMENT ON TABLE recipes IS 'Conversion rules for Manufacturing (e.g., 1 Meter Longspan = 0.8 KG Coil)';
COMMENT ON TABLE batch_types IS 'Dynamic batch type configuration (replaces hardcoded enum)';
COMMENT ON TABLE category_batch_types IS 'Junction table linking categories to allowed batch types (Many-to-Many)';
COMMENT ON COLUMN inventory_batches.batch_type_id IS 'Reference to batch_types table (replaces enum)';
COMMENT ON COLUMN inventory_batches.grouped IS 'True for tracked items (e.g., Pallet #504), false for loose materials';
COMMENT ON COLUMN inventory_batches.batch_identifier IS 'Human-readable identifier (e.g., "Pallet #504") when grouped=true';
COMMENT ON COLUMN inventory_batches.instance_code IS 'Unique code for grouped batches, nullable for loose materials';
COMMENT ON COLUMN inventory_batches.category_id IS 'Reference to product category';
COMMENT ON COLUMN inventory_batches.attribute_data IS 'JSONB field storing category-specific attributes (Gauge, Color, Supplier, etc.)';
COMMENT ON COLUMN inventory_batches.remaining_quantity IS 'Current available quantity for this specific batch';
COMMENT ON COLUMN categories.unit_type IS 'Default unit type for products in this category';
COMMENT ON COLUMN categories.attribute_schema IS 'JSONB array defining required/optional attributes for products in this category';
COMMENT ON COLUMN item_assignments.quantity_deducted IS 'Amount of raw material deducted from the specific inventory batch';
COMMENT ON TABLE expense_categories IS 'Branch-scoped expense categories for organizing business expenses';
COMMENT ON TABLE expenses IS 'Individual expense records tied to branches, categories, and users';
COMMENT ON TABLE payroll_records IS 'Monthly payroll records for employees, scoped by branch';
COMMENT ON COLUMN payroll_records.net_pay IS 'Calculated as gross_pay - deductions';
COMMENT ON TABLE ledger_entries IS 'Financial ledger entries tracking all transactions for customers and suppliers with running balances';
COMMENT ON COLUMN ledger_entries.contact_type IS 'Type of contact: customer or supplier';
COMMENT ON COLUMN ledger_entries.transaction_type IS 'Type of transaction: INVOICE, PAYMENT, RETURN, ADJUSTMENT, or OPENING_BALANCE';
COMMENT ON COLUMN ledger_entries.running_balance IS 'Calculated running balance after this transaction';
COMMENT ON TABLE activity_logs IS 'System activity log tracking user actions across all modules';
COMMENT ON COLUMN activity_logs.action_type IS 'Type of action: LOGIN, CREATE, UPDATE, DELETE, PRINT, CONFIRM, or VOID';
COMMENT ON COLUMN activity_logs.module IS 'Module where action occurred (e.g., sales, purchases, payments)';

-- ============================================
-- INITIALIZATION COMPLETE
-- ============================================

