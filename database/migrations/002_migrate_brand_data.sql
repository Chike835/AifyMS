-- Migration 002: Data Migration - Migrate existing brand data to product_attributes_brands
-- This script extracts unique brands from products.brand and creates brand records

-- Step 1: Insert unique brands from products.brand into product_attributes_brands
INSERT INTO product_attributes_brands (name)
SELECT DISTINCT brand
FROM products
WHERE brand IS NOT NULL 
  AND brand != ''
  AND brand NOT IN (SELECT name FROM product_attributes_brands)
ON CONFLICT (name) DO NOTHING;

-- Step 2: Update products.brand_id based on matching brand names
UPDATE products p
SET brand_id = (
    SELECT id 
    FROM product_attributes_brands b 
    WHERE b.name = p.brand
)
WHERE p.brand IS NOT NULL 
  AND p.brand != ''
  AND p.brand_id IS NULL;

-- Note: The old 'brand' column is kept for backward compatibility
-- You can drop it later after verifying all data is migrated:
-- ALTER TABLE products DROP COLUMN brand;

