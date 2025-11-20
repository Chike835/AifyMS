-- Migration 001: High Priority Features Schema
-- Adds product attributes, inventory operations, and manufacturing enhancements

-- ============================================
-- PRODUCT ATTRIBUTES TABLES
-- ============================================

-- Product Attributes: Brands
CREATE TABLE IF NOT EXISTS product_attributes_brands (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Product Attributes: Colors
CREATE TABLE IF NOT EXISTS product_attributes_colors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Product Attributes: Gauges
CREATE TABLE IF NOT EXISTS product_attributes_gauges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- INVENTORY OPERATIONS TABLES
-- ============================================

-- Stock Transfers (tracking inventory movement between branches)
CREATE TABLE IF NOT EXISTS stock_transfers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    inventory_instance_id UUID NOT NULL REFERENCES inventory_instances(id),
    from_branch_id UUID NOT NULL REFERENCES branches(id),
    to_branch_id UUID NOT NULL REFERENCES branches(id),
    user_id UUID NOT NULL REFERENCES users(id),
    transfer_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    CHECK (from_branch_id != to_branch_id)
);

-- Stock Adjustments (tracking quantity corrections with reasons)
CREATE TABLE IF NOT EXISTS stock_adjustments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    inventory_instance_id UUID NOT NULL REFERENCES inventory_instances(id),
    old_quantity DECIMAL(15, 3) NOT NULL,
    new_quantity DECIMAL(15, 3) NOT NULL,
    reason TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id),
    adjustment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CHECK (new_quantity >= 0)
);

-- Production Wastage (tracking manufacturing losses)
CREATE TABLE IF NOT EXISTS production_wastage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    inventory_instance_id UUID NOT NULL REFERENCES inventory_instances(id),
    quantity_wasted DECIMAL(15, 3) NOT NULL,
    reason TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id),
    wastage_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CHECK (quantity_wasted > 0)
);

-- ============================================
-- UPDATE EXISTING TABLES
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

CREATE INDEX IF NOT EXISTS idx_products_brand_id ON products(brand_id);
CREATE INDEX IF NOT EXISTS idx_products_color_id ON products(color_id);
CREATE INDEX IF NOT EXISTS idx_products_gauge_id ON products(gauge_id);
CREATE INDEX IF NOT EXISTS idx_stock_transfers_instance_id ON stock_transfers(inventory_instance_id);
CREATE INDEX IF NOT EXISTS idx_stock_transfers_from_branch ON stock_transfers(from_branch_id);
CREATE INDEX IF NOT EXISTS idx_stock_transfers_to_branch ON stock_transfers(to_branch_id);
CREATE INDEX IF NOT EXISTS idx_stock_adjustments_instance_id ON stock_adjustments(inventory_instance_id);
CREATE INDEX IF NOT EXISTS idx_production_wastage_instance_id ON production_wastage(inventory_instance_id);
CREATE INDEX IF NOT EXISTS idx_sales_orders_production_status ON sales_orders(production_status);

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE product_attributes_brands IS 'Product brand attributes (e.g., "Brand A", "Brand B")';
COMMENT ON TABLE product_attributes_colors IS 'Product color attributes (e.g., "Red", "Blue", "Green")';
COMMENT ON TABLE product_attributes_gauges IS 'Product gauge attributes (e.g., "0.45mm", "0.55mm")';
COMMENT ON TABLE stock_transfers IS 'Tracks inventory instance transfers between branches';
COMMENT ON TABLE stock_adjustments IS 'Tracks quantity adjustments with reason logging';
COMMENT ON TABLE production_wastage IS 'Tracks manufacturing wastage/losses';
COMMENT ON COLUMN recipes.wastage_margin IS 'Percentage of wastage expected in manufacturing (0-100)';

