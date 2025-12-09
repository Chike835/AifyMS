-- Fix missing manufacturing settings
-- Run this script in your database to add the missing settings.

INSERT INTO business_settings (setting_key, setting_value, setting_type, category) VALUES
    ('manufacturing_colors', '[{"name":"Charcoal","category_ids":[]},{"name":"Terracotta","category_ids":[]},{"name":"Blue","category_ids":[]},{"name":"Green","category_ids":[]},{"name":"Red","category_ids":[]},{"name":"Brown","category_ids":[]},{"name":"Grey","category_ids":[]},{"name":"White","category_ids":[]},{"name":"Natural","category_ids":[]}]', 'json', 'manufacturing'),
    ('manufacturing_design', '[{"name":"Shingle","category_ids":[]},{"name":"Tile","category_ids":[]},{"name":"Slate","category_ids":[]},{"name":"Roman","category_ids":[]}]', 'json', 'manufacturing')
ON CONFLICT (setting_key) DO UPDATE SET
    setting_value = EXCLUDED.setting_value,
    setting_type = EXCLUDED.setting_type,
    category = EXCLUDED.category;
