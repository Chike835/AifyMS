import { BusinessSetting } from '../models/index.js';

/**
 * GET /api/settings
 * Get all settings or by category
 */
export const getSettings = async (req, res, next) => {
  try {
    const { category } = req.query;
    const where = {};

    if (category) {
      where.category = category;
    }

    const settings = await BusinessSetting.findAll({
      where,
      order: [['category', 'ASC'], ['setting_key', 'ASC']]
    });

    // Convert to key-value object for easier frontend consumption
    const settingsObj = {};
    settings.forEach(setting => {
      let value = setting.setting_value;
      
      // Parse value based on type
      if (setting.setting_type === 'number') {
        value = value ? parseFloat(value) : null;
      } else if (setting.setting_type === 'boolean') {
        value = value === 'true' || value === true;
      } else if (setting.setting_type === 'json') {
        try {
          value = value ? JSON.parse(value) : null;
        } catch (e) {
          value = null;
        }
      }

      settingsObj[setting.setting_key] = {
        value,
        type: setting.setting_type,
        category: setting.category
      };
    });

    res.json({ settings: settingsObj });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/settings/:key
 * Update single setting
 */
export const updateSetting = async (req, res, next) => {
  try {
    const { key } = req.params;
    const { value } = req.body;

    if (value === undefined) {
      return res.status(400).json({ error: 'Value is required' });
    }

    const setting = await BusinessSetting.findOne({
      where: { setting_key: key }
    });

    if (!setting) {
      return res.status(404).json({ error: 'Setting not found' });
    }

    // Convert value to string based on type
    let stringValue = value;
    if (setting.setting_type === 'number') {
      stringValue = value.toString();
    } else if (setting.setting_type === 'boolean') {
      stringValue = value ? 'true' : 'false';
    } else if (setting.setting_type === 'json') {
      stringValue = JSON.stringify(value);
    }

    setting.setting_value = stringValue;
    await setting.save();

    // Parse value for response
    let parsedValue = stringValue;
    if (setting.setting_type === 'number') {
      parsedValue = parseFloat(stringValue);
    } else if (setting.setting_type === 'boolean') {
      parsedValue = stringValue === 'true';
    } else if (setting.setting_type === 'json') {
      try {
        parsedValue = JSON.parse(stringValue);
      } catch (e) {
        parsedValue = null;
      }
    }

    res.json({
      message: 'Setting updated successfully',
      setting: {
        key: setting.setting_key,
        value: parsedValue,
        type: setting.setting_type,
        category: setting.category
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/settings
 * Bulk update multiple settings
 */
export const bulkUpdateSettings = async (req, res, next) => {
  try {
    const { settings } = req.body;

    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({ error: 'Settings object is required' });
    }

    const updates = [];
    const errors = [];

    for (const [key, value] of Object.entries(settings)) {
      try {
        const setting = await BusinessSetting.findOne({
          where: { setting_key: key }
        });

        if (!setting) {
          errors.push({ key, error: 'Setting not found' });
          continue;
        }

        // Convert value to string based on type
        let stringValue = value;
        if (setting.setting_type === 'number') {
          stringValue = value.toString();
        } else if (setting.setting_type === 'boolean') {
          stringValue = value ? 'true' : 'false';
        } else if (setting.setting_type === 'json') {
          stringValue = JSON.stringify(value);
        }

        setting.setting_value = stringValue;
        await setting.save();

        updates.push(key);
      } catch (error) {
        errors.push({ key, error: error.message });
      }
    }

    res.json({
      message: `${updates.length} setting(s) updated successfully`,
      updated: updates,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    next(error);
  }
};


