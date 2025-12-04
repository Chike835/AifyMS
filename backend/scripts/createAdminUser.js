import { Role } from '../src/models/index.js';
import sequelize from '../src/config/db.js';

const createSuperAdminRole = async () => {
  try {
    console.log('🔍 Starting Super Admin Role Creation Script...\n');

    // 1. Check Database Connection
    try {
      await sequelize.authenticate();
      console.log('✅ Database connection successful.');
    } catch (error) {
      console.error('❌ Database connection failed:', error.message);
      process.exit(1);
    }

    // 2. Check if Super Admin role exists, create if missing
    console.log('\n🔍 Checking for Super Admin role...');
    let superAdminRole = await Role.findOne({ where: { name: 'Super Admin' } });
    
    if (!superAdminRole) {
      console.log('⚠️  Super Admin role not found. Creating it...');
      superAdminRole = await Role.create({
        name: 'Super Admin',
        description: 'Owner. Full access. Can manage all branches, confirm payments, view global P&L, and configure manufacturing recipes.'
      });
      console.log(`✅ Super Admin role created - ID: ${superAdminRole.id}`);
      console.log('   Note: Permissions should be assigned via database initialization script.');
    } else {
      console.log(`✅ Super Admin role already exists - ID: ${superAdminRole.id}`);
    }

  } catch (error) {
    console.error('\n❌ Error creating Super Admin role:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
};

createSuperAdminRole();

