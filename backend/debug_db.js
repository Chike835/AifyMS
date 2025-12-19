
import sequelize from './src/config/db.js';

async function checkTable() {
    try {
        await sequelize.authenticate();
        console.log('Connection has been established successfully.');

        const tableInfo = await sequelize.getQueryInterface().describeTable('users');
        console.log('Columns in users table:', Object.keys(tableInfo));

        const notificationTableInfo = await sequelize.getQueryInterface().describeTable('notifications');
        console.log('Columns in notifications table:', Object.keys(notificationTableInfo));

    } catch (error) {
        console.error('Unable to connect to the database:', error);
    } finally {
        await sequelize.close();
    }
}

checkTable();
