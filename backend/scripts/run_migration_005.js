import sequelize from '../src/config/db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const runMigration = async () => {
    try {
        console.log('Starting migration 005: Add is_variant_child column...');
        
        // Read the migration SQL file
        const migrationPath = path.join(__dirname, '../database/migrations/005_add_is_variant_child.sql');
        const sql = fs.readFileSync(migrationPath, 'utf8');
        
        // Execute the migration
        await sequelize.query(sql);
        
        console.log('✅ Migration 005 completed successfully');
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration 005 failed:', error.message);
        console.error(error);
        process.exit(1);
    }
};

runMigration();

