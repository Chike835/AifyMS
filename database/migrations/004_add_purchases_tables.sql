-- Migration: Add Purchases tables
-- Version: 004
-- Date: 2025-11-24
-- Description: Creates purchases and purchase_items tables for purchase order management
--              with inventory instance integration for raw_tracked products

-- Create purchase status enum
DO $$ BEGIN
    CREATE TYPE purchase_status AS ENUM ('draft', 'confirmed', 'received', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create purchases table
CREATE TABLE IF NOT EXISTS purchases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    purchase_number VARCHAR(100) NOT NULL UNIQUE,
    supplier_id UUID REFERENCES suppliers(id),
    branch_id UUID NOT NULL REFERENCES branches(id),
    user_id UUID NOT NULL REFERENCES users(id),
    total_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
    payment_status VARCHAR(20) DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'partial', 'paid')),
    status purchase_status DEFAULT 'confirmed',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create purchase_items table
CREATE TABLE IF NOT EXISTS purchase_items (
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

-- Create indexes for purchases table
CREATE INDEX IF NOT EXISTS idx_purchases_branch_id ON purchases(branch_id);
CREATE INDEX IF NOT EXISTS idx_purchases_supplier_id ON purchases(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchases_user_id ON purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_purchases_status ON purchases(status);
CREATE INDEX IF NOT EXISTS idx_purchases_purchase_number ON purchases(purchase_number);
CREATE INDEX IF NOT EXISTS idx_purchases_created_at ON purchases(created_at);

-- Create indexes for purchase_items table
CREATE INDEX IF NOT EXISTS idx_purchase_items_purchase_id ON purchase_items(purchase_id);
CREATE INDEX IF NOT EXISTS idx_purchase_items_product_id ON purchase_items(product_id);
CREATE INDEX IF NOT EXISTS idx_purchase_items_inventory_instance_id ON purchase_items(inventory_instance_id);

-- Add comments
COMMENT ON TABLE purchases IS 'Purchase orders from suppliers with branch and user tracking';
COMMENT ON TABLE purchase_items IS 'Line items for purchase orders with optional inventory instance reference';
COMMENT ON COLUMN purchases.purchase_number IS 'Unique purchase order number (format: PO-YYYYMMDD-XXXX)';
COMMENT ON COLUMN purchase_items.instance_code IS 'Instance code for raw_tracked products (coil/pallet number)';
COMMENT ON COLUMN purchase_items.inventory_instance_id IS 'Reference to automatically created inventory instance for raw_tracked products';

