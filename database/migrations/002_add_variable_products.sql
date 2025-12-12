-- Migration: Add Variable Product Support
-- Created: 2025-12-09

-- 1. Update product_type ENUM
-- Note: We use a safe approach for adding enum values
DO $$ 
BEGIN 
  ALTER TYPE product_type ADD VALUE IF NOT EXISTS 'variable';
EXCEPTION 
  WHEN duplicate_object THEN null;
END $$;

-- 2. Create product_variation_assignments table
CREATE TABLE IF NOT EXISTS product_variation_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    variation_id UUID NOT NULL REFERENCES product_variations(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(product_id, variation_id)
);

CREATE INDEX IF NOT EXISTS idx_product_variation_assignments_product ON product_variation_assignments(product_id);
CREATE INDEX IF NOT EXISTS idx_product_variation_assignments_variation ON product_variation_assignments(variation_id);

-- 3. Create product_variants table
CREATE TABLE IF NOT EXISTS product_variants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parent_product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    variation_combination JSONB NOT NULL DEFAULT '{}'::jsonb,
    sku_suffix VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(parent_product_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_product_variants_parent ON product_variants(parent_product_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_child ON product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_combination ON product_variants USING GIN(variation_combination);

-- 4. Add parent_product_id to products table (optional, but good for quick lookups if direct link needed, 
-- though we are using product_variants table strictly. Let's stick to the join table as per plan).
