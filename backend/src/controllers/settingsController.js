import { BusinessSetting, Branch } from '../models/index.js';
import { Op } from 'sequelize';
import sequelize from '../config/db.js';
import { safeRollback } from '../utils/transactionUtils.js';

const parseSettingRecord = (setting) => {
  let value = setting.setting_value;
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

  return {
    key: setting.setting_key,
    value,
    type: setting.setting_type,
    category: setting.category
  };
};

const validateSettings = (settings) => {
  const errors = [];
  const criticalSettings = {
    currency: {
      required: true, type: 'string', validate: (val) => {
        // Basic ISO currency code validation (3 uppercase letters)
        return typeof val === 'string' && val.length === 3 && /^[A-Z]{3}$/.test(val);
      }
    },
    tax_rate: {
      required: true, type: 'number', validate: (val) => {
        const num = parseFloat(val);
        return !isNaN(num) && num >= 0 && num <= 100;
      }
    }
  };

  for (const [key, config] of Object.entries(criticalSettings)) {
    const value = settings[key];

    if (config.required && (value === null || value === undefined || value === '')) {
      errors.push(`${key} is required and cannot be null`);
      continue;
    }

    if (value !== null && value !== undefined && value !== '') {
      if (config.type === 'number' && isNaN(parseFloat(value))) {
        errors.push(`${key} must be a valid number`);
        continue;
      }

      if (config.validate && !config.validate(value)) {
        if (key === 'currency') {
          errors.push(`${key} must be a valid 3-letter ISO currency code (e.g., NGN, USD)`);
        } else if (key === 'tax_rate') {
          errors.push(`${key} must be a number between 0 and 100`);
        } else {
          errors.push(`${key} validation failed`);
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
};

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
      order: [['setting_key', 'ASC']]
    });

    // Transform array to object { key: { value, type, category } }
    const settingsObj = {};
    settings.forEach(setting => {
      const parsed = parseSettingRecord(setting);
      settingsObj[parsed.key] = {
        value: parsed.value,
        type: parsed.type,
        category: parsed.category
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
  const transaction = await sequelize.transaction();
  try {
    const { key } = req.params;
    const { value } = req.body;

    if (value === undefined) {
      await safeRollback(transaction);
      return res.status(400).json({ error: 'Value is required' });
    }

    let setting = await BusinessSetting.findOne({
      where: { setting_key: key },
      transaction
    });

    if (!setting) {
      // If setting doesn't exist, we can't create it here because we don't know the type/category
      // unless it's a known system setting or we allow creating arbitrary settings via API.
      // For now, assuming we only update existing settings or settings defined in seed.
      await safeRollback(transaction);
      return res.status(404).json({ error: 'Setting not found' });
    }

    // Validate critical settings before saving
    if (['currency', 'tax_rate'].includes(key)) {
      const validation = validateSettings({ [key]: value });
      if (!validation.valid) {
        await safeRollback(transaction);
        return res.status(400).json({
          error: 'Validation failed',
          errors: validation.errors
        });
      }
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
    await setting.save({ transaction });
    await transaction.commit();

    const parsed = parseSettingRecord(setting);

    res.json({
      message: 'Setting updated successfully',
      setting: {
        key: parsed.key,
        value: parsed.value,
        type: parsed.type,
        category: parsed.category
      }
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

/**
 * PUT /api/settings
 * Bulk update multiple settings
 */
export const bulkUpdateSettings = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const { settings } = req.body;

    if (!settings || typeof settings !== 'object') {
      await safeRollback(transaction);
      return res.status(400).json({ error: 'Settings object is required' });
    }

    const updates = [];
    const errors = [];

    // Validate critical settings before processing
    const criticalSettingsToValidate = {};
    for (const [key, value] of Object.entries(settings)) {
      if (['currency', 'tax_rate'].includes(key)) {
        criticalSettingsToValidate[key] = value;
      }
    }

    if (Object.keys(criticalSettingsToValidate).length > 0) {
      const validation = validateSettings(criticalSettingsToValidate);
      if (!validation.valid) {
        await safeRollback(transaction);
        return res.status(400).json({
          error: 'Validation failed',
          errors: validation.errors
        });
      }
    }

    for (const [key, value] of Object.entries(settings)) {
      try {
        const setting = await BusinessSetting.findOne({
          where: { setting_key: key },
          transaction
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
        await setting.save({ transaction });

        updates.push(key);
      } catch (error) {
        errors.push({ key, error: error.message });
      }
    }

    await transaction.commit();

    res.json({
      message: `${updates.length} setting(s) updated successfully`,
      updated: updates,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

/**
 * POST /api/settings/test-print
 * Test receipt printer connection
 */
export const testPrint = async (req, res, next) => {
  try {
    // Get receipt printer configuration from settings
    const printerSetting = await BusinessSetting.findOne({
      where: { setting_key: 'receipt_printer_connection' }
    });

    if (!printerSetting || !printerSetting.setting_value) {
      return res.status(400).json({
        error: 'Receipt printer not configured. Please set receipt_printer_connection in settings.'
      });
    }

    // Create a test receipt order data
    const testOrderData = {
      invoice_number: 'TEST-001',
      created_at: new Date(),
      customer: {
        name: 'Test Customer',
        address: 'Test Address'
      },
      branch: {
        name: 'Test Branch'
      },
      items: [
        {
          product: { name: 'Test Product' },
          quantity: 1,
          unit_price: 1000,
          subtotal: 1000
        }
      ],
      total_amount: 1000
    };

    // Generate test receipt HTML
    const { buildReceiptHTML } = await import('../services/pdfService.js');
    const receiptHTML = buildReceiptHTML(testOrderData, 58); // 58mm width

    // In a real implementation, you would send this to the printer
    // For now, we'll return the HTML for preview
    res.json({
      message: 'Test print generated successfully',
      printer_connection: printerSetting.setting_value,
      receipt_html: receiptHTML,
      note: 'In production, this would be sent directly to the configured printer'
    });
  } catch (error) {
    console.error('Test print error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate test print' });
  }
};


