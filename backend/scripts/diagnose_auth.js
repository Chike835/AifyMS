import { User } from '../src/models/index.js';
import { hashPassword, comparePassword } from '../src/utils/passwordUtils.js';
import sequelize from '../src/config/db.js';

const diagnose = async () => {
    try {
        console.log('🔍 Starting Authentication Diagnosis...');

        // 1. Check Database Connection
        try {
            await sequelize.authenticate();
            console.log('✅ Database connection successful.');
        } catch (error) {
            console.error('❌ Database connection failed:', error.message);
            process.exit(1);
        }

        // 2. Fetch Admin User
        const email = 'admin@aify.com';
        console.log(`\n🔍 Looking up user: ${email}`);
        const user = await User.findOne({ where: { email } });

        if (!user) {
            console.error('❌ User not found!');
        } else {
            console.log('✅ User found.');
            console.log(`   ID: ${user.id}`);
            console.log(`   Active: ${user.is_active}`);
            console.log(`   Hash Length: ${user.password_hash ? user.password_hash.length : 'N/A'}`);
            console.log(`   Hash Prefix: ${user.password_hash ? user.password_hash.substring(0, 7) : 'N/A'}...`);

            if (!user.password_hash) {
                console.error('❌ Password hash is missing!');
            } else if (!user.password_hash.startsWith('$2')) {
                console.error('❌ Invalid hash format! Should start with $2a$ or $2b$');
            } else {
                console.log('✅ Hash format appears valid.');
            }
        }

        // 3. Test Bcrypt Functionality
        console.log('\n🔍 Testing Bcrypt Functionality...');
        const testPassword = 'TestPassword123!';
        try {
            const hash = await hashPassword(testPassword);
            console.log('✅ Hashing successful.');
            console.log(`   Test Hash: ${hash.substring(0, 10)}...`);

            const match = await comparePassword(testPassword, hash);
            if (match) {
                console.log('✅ Comparison successful (Match).');
            } else {
                console.error('❌ Comparison failed (Mismatch) - Critical Bcrypt Issue!');
            }

            const noMatch = await comparePassword('WrongPassword', hash);
            if (!noMatch) {
                console.log('✅ Comparison successful (No Match).');
            } else {
                console.error('❌ Comparison failed (False Positive) - Critical Bcrypt Issue!');
            }
        } catch (error) {
            console.error('❌ Bcrypt test failed:', error.message);
        }

    } catch (error) {
        console.error('❌ Unexpected error:', error);
    } finally {
        await sequelize.close();
        process.exit(0);
    }
};

diagnose();
