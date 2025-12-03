import { BusinessSetting, Branch } from '../models/index.js';
import { Op } from 'sequelize';
import sequelize from '../config/db.js';

const isSuperAdmin = (req) => req.user?.role_name === 'Super Admin';

const shouldIncludeGlobalSettings = (value) => value !== 'false';

const buildSettingsWhere = (req) => {
  const { category } = req.query;
  const includeGlobal = shouldIncludeGlobalSettings(req.query?.include_global ?? 'true');
  const requestedBranchId = req.query?.branch_id;
  const targetBranchId = isSuperAdmin(req)
    ? (requestedBranchId && requestedBranchId !== 'null' ? requestedBranchId : null)
    : (req.user?.branch_id || null);

  const where = {};
  if (category) {
    where.category = category;
  }

  if (targetBranchId) {
    where[Op.or] = includeGlobal
      ? [{ branch_id: targetBranchId }, { branch_id: null }]
      : [{ branch_id: targetBranchId }];
  } else if (!isSuperAdmin(req) || !includeGlobal) {
    where.branch_id = null;
  } else {
    where.branch_id = null;
  }

  return { where, targetBranchId };
};

const resolveSettingBranchTarget = async (req, requestedBranchId) => {
  if (isSuperAdmin(req)) {
    if (!requestedBranchId || requestedBranchId === 'null') {
      return { branchId: null };
    }
    const branch = await Branch.findByPk(requestedBranchId);
    if (!branch) {
      return { error: 'Branch not found' };
    }
    return { branchId: requestedBranchId };
  }

  if (!req.user?.branch_id) {
    return { error: 'Branch ID is required for this user' };
  }

  if (requestedBranchId && requestedBranchId !== req.user.branch_id) {
    return { error: 'You cannot modify settings for another branch' };
  }

  return { branchId: req.user.branch_id };
};

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
    category: setting.category,
    branch_id: setting.branch_id
  };
};

const fetchSettingWithFallback = async (key, branchId) => {
  if (branchId) {
    const branchSetting = await BusinessSetting.findOne({
      where: { setting_key: key, branch_id: branchId }
    });
    if (branchSetting) {
      return branchSetting;
    }
  }

  return BusinessSetting.findOne({
    where: { setting_key: key, branch_id: null }
  });
};

/**
 * Validate critical settings
 * @param {object} settings - Object with setting keys and values
 * @returns {object} - { valid: boolean, errors: array }
 */
const validateSettings = (settings) => {
  const errors = [];
  const criticalSettings = {
    currency: { required: true, type: 'string', validate: (val) => {
      // Basic ISO currency code validation (3 uppercase letters)
      return typeof val === 'string' && val.length === 3 && /^[A-Z]{3}$/.test(val);
    }},
    tax_rate: { required: true, type: 'number', validate: (val) => {
      const num = parseFloat(val);
      return !isNaN(num) && num >= 0 && num <= 100;
    }}
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
    const { where, targetBranchId } = buildSettingsWhere(req);

    const settings = await BusinessSetting.findAll({
      where,
      order: [['setting_key', 'ASC'], ['branch_id', 'ASC']]
    });

    const settingsObj = {};
    settings.forEach(setting => {
      const parsed = parseSettingRecord(setting);
      const existing = settingsObj[parsed.key];
      const shouldOverride = parsed.branch_id && targetBranchId
        ? parsed.branch_id === targetBranchId
        : !existing;

      if (!existing || shouldOverride) {
        settingsObj[parsed.key] = {
          value: parsed.value,
          type: parsed.type,
          category: parsed.category,
          branch_id: parsed.branch_id
        };
      }
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
    const { value, branch_id } = req.body;

    if (value === undefined) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Value is required' });
    }

    const { branchId: targetBranchId, error: branchError } = await resolveSettingBranchTarget(req, branch_id);
    if (branchError) {
      await transaction.rollback();
      return res.status(400).json({ error: branchError });
    }

    let setting = await BusinessSetting.findOne({
      where: { setting_key: key, branch_id: targetBranchId || null },
      transaction
    });

    if (!setting && targetBranchId) {
      const globalSetting = await BusinessSetting.findOne({
        where: { setting_key: key, branch_id: null },
        transaction
      });

      if (!globalSetting) {
        await transaction.rollback();
        return res.status(404).json({ error: 'Setting not found' });
      }

      setting = await BusinessSetting.create({
        setting_key: key,
        setting_type: globalSetting.setting_type,
        category: globalSetting.category,
        branch_id: targetBranchId,
        setting_value: globalSetting.setting_value
      }, { transaction });
    }

    if (!setting) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Setting not found' });
    }

    // Validate critical settings before saving
    if (['currency', 'tax_rate'].includes(key)) {
      const validation = validateSettings({ [key]: value });
      if (!validation.valid) {
        await transaction.rollback();
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
        category: parsed.category,
        branch_id: parsed.branch_id
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
    const { settings, branch_id } = req.body;

    if (!settings || typeof settings !== 'object') {
      await transaction.rollback();
      return res.status(400).json({ error: 'Settings object is required' });
    }

    const { branchId: targetBranchId, error: branchError } = await resolveSettingBranchTarget(req, branch_id);
    if (branchError) {
      await transaction.rollback();
      return res.status(400).json({ error: branchError });
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
        await transaction.rollback();
        return res.status(400).json({ 
          error: 'Validation failed', 
          errors: validation.errors 
        });
      }
    }

    for (const [key, value] of Object.entries(settings)) {
      try {
        let setting = await BusinessSetting.findOne({
          where: { setting_key: key, branch_id: targetBranchId || null },
          transaction
        });

        if (!setting && targetBranchId) {
          const globalSetting = await BusinessSetting.findOne({
            where: { setting_key: key, branch_id: null },
            transaction
          });
          if (!globalSetting) {
            errors.push({ key, error: 'Setting not found' });
            continue;
          }
          setting = await BusinessSetting.create({
            setting_key: key,
            setting_type: globalSetting.setting_type,
            category: globalSetting.category,
            branch_id: targetBranchId,
            setting_value: globalSetting.setting_value
          }, { transaction });
        }

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
    const branchScopeId = req.query?.branch_id && req.query.branch_id !== 'null'
      ? req.query.branch_id
      : (req.user?.branch_id || null);
    const printerSetting = await fetchSettingWithFallback('receipt_printer_connection', branchScopeId);

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
      branch_id: printerSetting.branch_id,
      receipt_html: receiptHTML,
      note: 'In production, this would be sent directly to the configured printer'
    });
  } catch (error) {
    console.error('Test print error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate test print' });
  }
};


