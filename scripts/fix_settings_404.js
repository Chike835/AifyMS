import { BusinessSetting } from '../backend/src/models/index.js';
import sequelize from '../backend/src/config/db.js';

const seedSettings = async () => {
    try {
        await sequelize.authenticate();
        console.log('Database connection established successfully.');

        const colors = [
            "Charcoal", "Terracotta", "Blue", "Green", "Red", "Brown", "Grey", "White", "Natural"
        ];

        const designs = [
            "Shingle", "Tile", "Slate", "Roman"
        ];

        // Transform to new object structure
        const colorObjects = colors.map(name => ({ name, category_ids: [] }));
        const designObjects = designs.map(name => ({ name, category_ids: [] }));

        const settingsToSeed = [
            {
                key: 'manufacturing_colors',
                value: JSON.stringify(colorObjects),
                type: 'json',
                category: 'manufacturing'
            },
            {
                key: 'manufacturing_design',
                value: JSON.stringify(designObjects),
                type: 'json',
                category: 'manufacturing'
            }
        ];

        for (const setting of settingsToSeed) {
            const [record, created] = await BusinessSetting.findOrCreate({
                where: { setting_key: setting.key },
                defaults: {
                    setting_value: setting.value,
                    setting_type: setting.type,
                    category: setting.category
                }
            });

            if (created) {
                console.log(`Created setting: ${setting.key}`);
            } else {
                console.log(`Setting already exists: ${setting.key}, updating...`);
                record.setting_value = setting.value;
                record.setting_type = setting.type;
                record.category = setting.category;
                await record.save();
                console.log(`Updated setting: ${setting.key}`);
            }
        }

        console.log('Seeding completed successfully.');
    } catch (error) {
        console.error('Unable to connect to the database:', error);
    } finally {
        await sequelize.close();
    }
};

seedSettings();
