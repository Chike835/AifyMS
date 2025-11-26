-- ============================================
-- Migration: Inventory Batch Refactor
-- Version: 006
-- Description: Rename inventory_instances to inventory_batches and add support for multiple material types
-- ============================================

-- Create new batch_type enum
CREATE TYPE batch_type AS ENUM ('coil', 'pallet', 'carton', 'loose');

-- Rename table
ALTER TABLE inventory_instances RENAME TO inventory_batches;

-- Add new columns
ALTER TABLE inventory_batches 
  ADD COLUMN batch_type batch_type DEFAULT 'coil',
  ADD COLUMN grouped BOOLEAN DEFAULT true,
  ADD COLUMN batch_identifier VARCHAR(100),
  ADD COLUMN category_id UUID REFERENCES categories(id),
  ADD COLUMN attribute_data JSONB DEFAULT '{}'::jsonb;

-- Make instance_code nullable for ungrouped batches
ALTER TABLE inventory_batches 
  ALTER COLUMN instance_code DROP NOT NULL;

-- Add constraint: if grouped=true, instance_code must be set; if grouped=false, batch_identifier can be used
ALTER TABLE inventory_batches 
  ADD CONSTRAINT check_grouped_instance_code 
  CHECK (
    (grouped = true AND instance_code IS NOT NULL) OR 
    (grouped = false)
  );

-- Update existing records to maintain compatibility
UPDATE inventory_batches 
SET grouped = true, 
    batch_type = 'coil',
    batch_identifier = instance_code
WHERE instance_code IS NOT NULL;

-- Create indexes
CREATE INDEX idx_inventory_batches_batch_type ON inventory_batches(batch_type);
CREATE INDEX idx_inventory_batches_grouped ON inventory_batches(grouped);
CREATE INDEX idx_inventory_batches_category_id ON inventory_batches(category_id);
CREATE INDEX idx_inventory_batches_attribute_data ON inventory_batches USING GIN(attribute_data);

-- Update foreign key references in other tables
-- Note: These will be handled by Sequelize associations, but we ensure referential integrity
ALTER TABLE item_assignments 
  RENAME COLUMN inventory_instance_id TO inventory_batch_id;

ALTER TABLE stock_transfers 
  RENAME COLUMN inventory_instance_id TO inventory_batch_id;

ALTER TABLE stock_adjustments 
  RENAME COLUMN inventory_instance_id TO inventory_batch_id;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE inventory_batches IS 'Tracks physical inventory batches (coils, pallets, cartons, or loose materials)';
COMMENT ON COLUMN inventory_batches.batch_type IS 'Type of batch: coil, pallet, carton, or loose';
COMMENT ON COLUMN inventory_batches.grouped IS 'True for tracked items (e.g., Pallet #504), false for loose materials';
COMMENT ON COLUMN inventory_batches.batch_identifier IS 'Human-readable identifier (e.g., "Pallet #504") when grouped=true';
COMMENT ON COLUMN inventory_batches.instance_code IS 'Unique code for grouped batches, nullable for loose materials';
COMMENT ON COLUMN inventory_batches.category_id IS 'Reference to product category';
COMMENT ON COLUMN inventory_batches.attribute_data IS 'JSONB field storing category-specific attributes (Gauge, Color, Supplier, etc.)';

-- ============================================
-- MIGRATION COMPLETE
-- ============================================


