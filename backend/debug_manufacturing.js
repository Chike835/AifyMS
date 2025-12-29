const { Sequelize, DataTypes } = require('sequelize');
const config = require('./src/config/config.js')['development'];

const sequelize = new Sequelize(config.database, config.username, config.password, {
    host: config.host,
    dialect: config.dialect,
    logging: false
});

const SalesOrder = sequelize.define('SalesOrder', {
    id: { type: DataTypes.UUID, primaryKey: true },
    production_status: DataTypes.STRING,
    invoice_number: DataTypes.STRING
}, { tableName: 'sales_orders', timestamps: false });

const SalesItem = sequelize.define('SalesItem', {
    id: { type: DataTypes.UUID, primaryKey: true },
    order_id: DataTypes.UUID,
    product_id: DataTypes.UUID
}, { tableName: 'sales_items', timestamps: false });

const Product = sequelize.define('Product', {
    id: { type: DataTypes.UUID, primaryKey: true },
    name: DataTypes.STRING,
    type: DataTypes.STRING,
    is_manufactured_virtual: DataTypes.BOOLEAN
}, { tableName: 'products', timestamps: false });

SalesItem.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

async function checkOrder(id) {
    try {
        const order = await SalesOrder.findByPk(id);
        if (!order) {
            console.log('Order not found');
            return;
        }
        console.log(`Order ${order.invoice_number} (ID: ${order.id})`);
        console.log(`Production Status: ${order.production_status}`);

        const items = await SalesItem.findAll({
            where: { order_id: id },
            include: [{ model: Product, as: 'product' }]
        });

        console.log(`Items count: ${items.length}`);
        items.forEach((item, index) => {
            const p = item.product;
            console.log(`Item ${index + 1}: ${p ? p.name : 'Unknown Product'}`);
            if (p) {
                console.log(`  Type: '${p.type}'`);
                console.log(`  Is Manufactured Virtual: ${p.is_manufactured_virtual}`);
                const isMan = (p.type === 'manufactured' || p.type === 'manufactured_virtual' || p.is_manufactured_virtual);
                console.log(`  Matches Logic? ${isMan}`);
            }
        });

    } catch (err) {
        console.error(err);
    } finally {
        await sequelize.close();
    }
}

checkOrder('0f2bb7a6-f45f-45fe-a00f-174704ce187e');
