
import sequelize from './src/config/db.js';
import { ProductVariant } from './src/models/index.js';

const runMigration = async () => {
    try {
        console.log('Starting migration...');

        // 1. Add column if not exists
        try {
            await sequelize.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS is_variant_child BOOLEAN DEFAULT FALSE;`);
            console.log('Column is_variant_child added (or already exists).');
        } catch (e) {
            console.error('Error adding column:', e.message);
        }

        // 2. Add Index
        try {
            await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_products_is_variant_child ON products(is_variant_child);`);
            console.log('Index created.');
        } catch (e) {
            console.error('Error creating index:', e.message);
        }

        // 3. Backfill Data
        console.log('Backfilling data...');
        // Find all child product IDs from ProductVariant table
        // We can do this with a raw update for speed/efficiency
        // "UPDATE products SET is_variant_child = true WHERE id IN (SELECT product_id FROM product_variants)"

        const [results, metadata] = await sequelize.query(`
            UPDATE products 
            SET is_variant_child = true 
            WHERE id IN (SELECT product_id FROM product_variants);
        `);

        console.log(`Backfill complete. Updated rows: ${metadata?.rowCount || results?.rowCount || 'unknown'}`);
        console.log('Migration finished successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
};

runMigration();
