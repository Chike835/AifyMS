-- ============================================
-- Migration: Category Enhancements
-- Version: 007
-- Description: Add unit_type and attribute_schema to categories for new product workflow
-- ============================================

-- Add new columns to categories table
ALTER TABLE categories 
  ADD COLUMN unit_type VARCHAR(50),
  ADD COLUMN attribute_schema JSONB DEFAULT '[]'::jsonb;

-- Create index on attribute_schema for efficient queries
CREATE INDEX idx_categories_attribute_schema ON categories USING GIN(attribute_schema);

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON COLUMN categories.unit_type IS 'Default unit type for products in this category (e.g., "kg", "pieces", "meters")';
COMMENT ON COLUMN categories.attribute_schema IS 'JSONB array defining required/optional attributes for products in this category. Format: [{"name": "Gauge", "type": "string", "required": true}, {"name": "Color", "type": "string", "required": false}]';

-- ============================================
-- MIGRATION COMPLETE
-- ============================================



