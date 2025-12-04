import { User } from '../src/models/index.js';
import sequelize from '../src/config/db.js';

const listUsers = async () => {
    try {
        console.log('🔍 Listing all users in the database...');

        try {
            await sequelize.authenticate();
            console.log('✅ Database connection successful.');
        } catch (error) {
            console.error('❌ Database connection failed:', error.message);
            process.exit(1);
        }

        const users = await User.findAll({
            attributes: ['id', 'email', 'full_name', 'role_id', 'is_active']
        });

        if (users.length === 0) {
            console.log('❌ No users found in the database. The database might be empty.');
        } else {
            console.log(`✅ Found ${users.length} user(s):`);
            users.forEach(user => {
                console.log(`   - Email: ${user.email}, Name: ${user.full_name}, Active: ${user.is_active}`);
            });
        }

    } catch (error) {
        console.error('❌ Unexpected error:', error);
    } finally {
        await sequelize.close();
        process.exit(0);
    }
};

listUsers();
