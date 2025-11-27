-- ============================================
-- Migration: Sales Item Batch Link
-- Version: 008
-- Description: Add direct inventory_batch_id link to sales_items for anti-theft tracking
-- ============================================

-- Add inventory_batch_id to sales_items table
ALTER TABLE sales_items 
  ADD COLUMN inventory_batch_id UUID REFERENCES inventory_batches(id);

-- Create index for efficient lookups
CREATE INDEX idx_sales_items_inventory_batch_id ON sales_items(inventory_batch_id);

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON COLUMN sales_items.inventory_batch_id IS 'Direct link to inventory batch for anti-theft tracking. Required for raw_tracked products.';

-- ============================================
-- MIGRATION COMPLETE
-- ============================================



