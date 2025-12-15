import sequelize from '../src/config/db.js';

const migrate = async () => {
    try {
        await sequelize.authenticate();
        console.log('Connected to DB');

        // Add supplier_id
        try {
            await sequelize.query('ALTER TABLE payments ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES suppliers(id);');
            console.log('Added supplier_id column');
        } catch (e) {
            console.log('supplier_id column might already exist or error:', e.message);
        }

        // Make customer_id nullable
        try {
            await sequelize.query('ALTER TABLE payments ALTER COLUMN customer_id DROP NOT NULL;');
            console.log('Made customer_id nullable');
        } catch (e) {
            console.log('Error making customer_id nullable:', e.message);
        }

        console.log('Migration done');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

migrate();
