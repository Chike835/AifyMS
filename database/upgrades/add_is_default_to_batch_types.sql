-- Upgrade script: Add is_default column to batch_types table
-- Run this on existing databases to add the new default batch type feature

-- Add the is_default column if it doesn't exist
ALTER TABLE batch_types ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT false;

-- Create index for the new column
CREATE INDEX IF NOT EXISTS idx_batch_types_is_default ON batch_types(is_default);

-- Set "Loose" as the default batch type if it exists (and no other default is set)
UPDATE batch_types 
SET is_default = true 
WHERE name = 'Loose' 
  AND NOT EXISTS (SELECT 1 FROM batch_types WHERE is_default = true);

-- If no batch type is set as default after the above, set the first active one
UPDATE batch_types 
SET is_default = true 
WHERE id = (
  SELECT id FROM batch_types 
  WHERE is_active = true 
  ORDER BY name ASC 
  LIMIT 1
)
AND NOT EXISTS (SELECT 1 FROM batch_types WHERE is_default = true);

-- Verify
SELECT id, name, is_default, is_active FROM batch_types ORDER BY is_default DESC, name ASC;
