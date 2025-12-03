import { Product, InventoryBatch, Branch, Customer, Supplier, Category, Unit, Purchase, PurchaseItem } from '../models/index.js';
import { Op } from 'sequelize';
import XLSX from 'xlsx';
import sequelize from '../config/db.js';

/**
 * Normalize CSV headers to handle case sensitivity, BOM characters, and common aliases
 * @param {string} header - Raw header string from CSV
 * @returns {string} - Normalized header key
 */
const normalizeHeader = (header) => {
  if (!header || typeof header !== 'string') {
    return '';
  }

  // Strip BOM (Byte Order Mark) characters - common in UTF-8 files
  let normalized = header.replace(/^\uFEFF/, '').trim();

  // Convert to lowercase
  normalized = normalized.toLowerCase();

  // Remove extra whitespace and replace spaces/underscores with underscores
  normalized = normalized.replace(/\s+/g, '_').replace(/_+/g, '_');

  // Remove leading/trailing underscores
  normalized = normalized.replace(/^_+|_+$/g, '');

  return normalized;
};

/**
 * Header alias mapping for product imports
 * Maps common CSV header variations to expected field names
 */
const PRODUCT_HEADER_ALIASES = {
  'product_name': 'name',
  'productname': 'name',
  'item_name': 'name',
  'itemname': 'name',
  'product': 'name',
  'product_sku': 'sku',
  'productsku': 'sku',
  'item_sku': 'sku',
  'itemsku': 'sku',
  'code': 'sku',
  'product_code': 'sku',
  'productcode': 'sku',
  'sale_price': 'sale_price',
  'selling_price': 'sale_price',
  'sellingprice': 'sale_price',
  'price': 'sale_price',
  'unit_price': 'sale_price',
  'unitprice': 'sale_price',
  'retail_price': 'sale_price',
  'retailprice': 'sale_price',
  'cost_price': 'cost_price',
  'costprice': 'cost_price',
  'purchase_price': 'cost_price',
  'purchaseprice': 'cost_price',
  'buying_price': 'cost_price',
  'buyingprice': 'cost_price',
  'unit_purchase_price': 'cost_price',
  'unitpurchaseprice': 'cost_price',
  'base_unit': 'base_unit',
  'baseunit': 'base_unit',
  'unit': 'base_unit',
  'unit_of_measure': 'base_unit',
  'unitofmeasure': 'base_unit',
  'uom': 'base_unit',
  'product_type': 'type',
  'producttype': 'type',
  'type': 'type',
  'item_type': 'type',
  'itemtype': 'type',
  'tax_rate': 'tax_rate',
  'taxrate': 'tax_rate',
  'tax': 'tax_rate',
  'vat_rate': 'tax_rate',
  'vatrate': 'tax_rate',
  'brand': 'brand',
  'product_brand': 'brand',
  'productbrand': 'brand',
  'category': 'category',
  'product_category': 'category',
  'productcategory': 'category',
  'item_category': 'category',
  'itemcategory': 'category'
};

/**
 * Normalize an array of CSV row objects by normalizing their keys
 * handles file with title rows/metadata before the actual header
 * @param {Array<Object>} rows - Array of row objects with potentially mismatched headers
 * @param {Object} aliasMap - Optional alias mapping object (defaults to PRODUCT_HEADER_ALIASES)
 * @returns {Array<Object>} - Array of row objects with normalized keys
 */
export const normalizeCSVHeaders = (rows, aliasMap = PRODUCT_HEADER_ALIASES) => {
  if (!rows || rows.length === 0) {
    return rows;
  }

  // Helper to check if a set of keys looks like valid product headers
  const hasRequiredHeaders = (keys) => {
    const normalizedKeys = keys.map(k => {
      const n = normalizeHeader(String(k));
      return aliasMap[n] || n;
    });
    
    // Check for critical fields
    const hasSku = normalizedKeys.includes('sku');
    const hasName = normalizedKeys.includes('name');
    return hasSku || hasName; // Loose check: if we find SKU or Name, it's likely the header
  };

  let headerRowIndex = -1;
  let headers = [];

  // Check if the current object keys are already the headers
  const firstRowKeys = Object.keys(rows[0]);
  if (hasRequiredHeaders(firstRowKeys)) {
    headerRowIndex = -1; // Already correct
    headers = firstRowKeys;
    console.log('[HeaderNormalization] Found headers in the first row (default)');
  } else {
    // Scan first 20 rows for headers
    console.log('[HeaderNormalization] First row keys do not look like headers. Scanning content...');
    
    for (let i = 0; i < Math.min(rows.length, 20); i++) {
      const rowValues = Object.values(rows[i]);
      if (hasRequiredHeaders(rowValues)) {
        headerRowIndex = i;
        headers = rowValues;
        console.log(`[HeaderNormalization] Found headers in row ${i + 1}:`, headers);
        break;
      }
    }
  }

  // If we found headers in the body (headerRowIndex >= 0), we need to realign the data
  let processedRows = rows;
  
  if (headerRowIndex >= 0) {
    // Slice data starting after the header row
    const dataRows = rows.slice(headerRowIndex + 1);
    
    // Map rows to new objects using the found headers
    processedRows = dataRows.map(row => {
      const newRow = {};
      const values = Object.values(row);
      
      headers.forEach((header, index) => {
        if (index < values.length) {
          newRow[header] = values[index];
        }
      });
      
      return newRow;
    });
  }

  // Build mapping from raw headers to normalized headers
  const headerMap = {};
  const rawHeaders = headerRowIndex >= 0 ? headers : Object.keys(processedRows[0] || {});

  rawHeaders.forEach(rawHeader => {
    const normalized = normalizeHeader(String(rawHeader));
    const finalKey = aliasMap[normalized] || normalized;
    headerMap[rawHeader] = finalKey;
  });

  console.log('[HeaderNormalization] Final header mapping:', headerMap);

  // Apply mapping to all rows
  const normalizedRows = processedRows.map((row, index) => {
    const normalizedRow = {};
    
    Object.keys(row).forEach(rawKey => {
      const normalizedKey = headerMap[rawKey];
      if (normalizedKey) {
        normalizedRow[normalizedKey] = row[rawKey];
      }
    });

    // Log first row sample for debugging
    if (index === 0) {
      // console.log('[HeaderNormalization] First row sample (raw):', row);
      // console.log('[HeaderNormalization] First row sample (normalized):', normalizedRow);
    }

    return normalizedRow;
  });

  return normalizedRows;
};

/**
 * Helper to parse currency strings
 * Removes currency symbols, commas, and other non-numeric characters
 * @param {string|number} value 
 * @returns {number}
 */
const parseCurrency = (value) => {
  if (value === undefined || value === null || value === '') return NaN;
  if (typeof value === 'number') return value;
  
  // Remove all non-numeric characters except dot and minus
  // Also handles cases where currency symbol is at start or end
  const cleanValue = String(value).replace(/[^0-9.-]+/g, '');
  return parseFloat(cleanValue);
};

/**
 * Import products from CSV/JSON data
 * Expected columns: sku, name, type, base_unit, sale_price, cost_price, tax_rate, brand, category
 * Optimized with bulk operations to eliminate N+1 query problem
 */
export const importProducts = async (data, errors = []) => {
  console.log('[ImportProducts] Starting import with', data.length, 'rows');
  const results = {
    created: 0,
    updated: 0,
    skipped: 0,
    errors: []
  };

  const validTypes = ['standard', 'compound', 'raw_tracked', 'manufactured_virtual'];
  const validRows = [];
  const rowNumMap = new Map(); // Map to track row numbers for error reporting

  // PHASE 1: Validate all rows and collect valid data
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const rowNum = i + 2; // +2 because row 1 is header, and arrays are 0-indexed

    try {
      // Debug: Log available keys in row for troubleshooting
      if (i === 0) {
        console.log(`[ImportProducts] First row keys:`, Object.keys(row));
      }
      
      // Validate required fields with detailed error reporting
      // Only sku, name, and sale_price are strictly required
      // type and base_unit will use defaults if not provided
      const missingFields = [];
      if (!row.sku || (typeof row.sku === 'string' && row.sku.trim() === '')) {
        missingFields.push('sku');
      }
      if (!row.name || (typeof row.name === 'string' && row.name.trim() === '')) {
        missingFields.push('name');
      }
      if (row.sale_price === undefined || row.sale_price === null || row.sale_price === '') {
        missingFields.push('sale_price');
      }

      if (missingFields.length > 0) {
        results.errors.push({
          row: rowNum,
          error: `Missing required fields: ${missingFields.join(', ')}. Available keys: ${Object.keys(row).join(', ')}`
        });
        results.skipped++;
        continue;
      }

      // Apply defaults for optional fields
      const productType = (row.type && typeof row.type === 'string' && row.type.trim() !== '') 
        ? row.type.trim().toLowerCase() 
        : 'standard'; // Default to 'standard' if not provided
      
      const baseUnit = (row.base_unit && typeof row.base_unit === 'string' && row.base_unit.trim() !== '') 
        ? row.base_unit.trim() 
        : 'pc'; // Default to 'pc' (piece) if not provided

      // Validate product type
      if (!validTypes.includes(productType)) {
        results.errors.push({
          row: rowNum,
          error: `Invalid product type: ${productType}. Must be one of: ${validTypes.join(', ')}`
        });
        results.skipped++;
        continue;
      }

      // Parse numeric values with defensive checks
      const salePrice = parseCurrency(row.sale_price);
      const costPrice = (row.cost_price !== undefined && row.cost_price !== null && row.cost_price !== '') 
        ? parseCurrency(row.cost_price) 
        : null;
      const taxRate = (row.tax_rate !== undefined && row.tax_rate !== null && row.tax_rate !== '') 
        ? parseCurrency(row.tax_rate) 
        : 0;

      if (isNaN(salePrice) || salePrice < 0) {
        results.errors.push({
          row: rowNum,
          error: `Invalid sale_price: "${row.sale_price}". Must be a non-negative number`
        });
        results.skipped++;
        continue;
      }

      // Validate cost_price if provided
      if (costPrice !== null && (isNaN(costPrice) || costPrice < 0)) {
        results.errors.push({
          row: rowNum,
          error: `Invalid cost_price: "${row.cost_price}". Must be a non-negative number`
        });
        results.skipped++;
        continue;
      }

      // Validate tax_rate if provided
      if (isNaN(taxRate) || taxRate < 0 || taxRate > 100) {
        results.errors.push({
          row: rowNum,
          error: `Invalid tax_rate: "${row.tax_rate}". Must be a number between 0 and 100`
        });
        results.skipped++;
        continue;
      }

      // Store valid row data
      const productData = {
        sku: String(row.sku).trim(),
        name: String(row.name).trim(),
        type: productType,
        base_unit: baseUnit,
        sale_price: salePrice,
        cost_price: costPrice,
        tax_rate: taxRate,
        brand: (row.brand && String(row.brand).trim() !== '') ? String(row.brand).trim() : null,
        category: (row.category && String(row.category).trim() !== '') ? String(row.category).trim() : null
      };

      validRows.push(productData);
      rowNumMap.set(productData.sku, rowNum);
    } catch (error) {
      console.error(`[ImportProducts] Error validating row ${rowNum}:`, error.message);
      results.errors.push({
        row: rowNum,
        error: error.message || 'Unknown error'
      });
      results.skipped++;
    }
  }

  if (validRows.length === 0) {
    console.log('[ImportProducts] No valid rows to import');
    return results;
  }

  // PHASE 2: Batch fetch existing products (eliminate N+1 queries)
  const skus = validRows.map(row => row.sku);
  console.log(`[ImportProducts] Batch fetching ${skus.length} products by SKU`);
  const existingProducts = await Product.findAll({
    where: { sku: { [Op.in]: skus } }
  });

  // PHASE 3: Create in-memory Map for O(1) lookups
  const productMap = new Map(existingProducts.map(p => [p.sku, p]));

  // PHASE 4: Separate into creates and updates
  const toCreate = [];
  const toUpdate = [];

  for (const productData of validRows) {
    const existing = productMap.get(productData.sku);
    if (existing) {
      // Mark for update (we'll use bulkCreate with updateOnDuplicate)
      toUpdate.push(productData);
    } else {
      toCreate.push(productData);
    }
  }

  // PHASE 5: Bulk operations
  try {
    // Use bulkCreate with updateOnDuplicate for both creates and updates
    // This handles both new products and updates in a single operation
    const allProducts = [...toCreate, ...toUpdate];
    
    if (allProducts.length > 0) {
      console.log(`[ImportProducts] Bulk creating/updating ${allProducts.length} products`);
      await Product.bulkCreate(allProducts, {
        updateOnDuplicate: ['name', 'type', 'base_unit', 'sale_price', 'cost_price', 'tax_rate', 'brand', 'category'],
        validate: true
      });

      // Count results based on whether product existed
      results.created = toCreate.length;
      results.updated = toUpdate.length;
    }
  } catch (error) {
    console.error('[ImportProducts] Bulk operation error:', error);
    // Fallback: try individual operations for better error reporting
    console.log('[ImportProducts] Falling back to individual operations for error reporting');
    
    for (const productData of validRows) {
      const rowNum = rowNumMap.get(productData.sku);
      try {
        const existing = productMap.get(productData.sku);
        if (existing) {
          await existing.update(productData);
          results.updated++;
        } else {
          await Product.create(productData);
          results.created++;
        }
      } catch (individualError) {
        results.errors.push({
          row: rowNum,
          error: individualError.message || 'Unknown error'
        });
        results.skipped++;
      }
    }
  }

  console.log('[ImportProducts] Import completed:', results);
  return results;
};

/**
 * Import inventory instances from CSV/JSON data
 * Expected columns: instance_code, product_sku, branch_code, initial_quantity
 */
export const importInventoryBatches = async (data, errors = []) => {
  const results = {
    created: 0,
    skipped: 0,
    errors: []
  };

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const rowNum = i + 2;

    try {
      // Validate required fields
      if (!row.instance_code || !row.product_sku || !row.branch_code || row.initial_quantity === undefined) {
        results.errors.push({
          row: rowNum,
          error: 'Missing required fields: instance_code, product_sku, branch_code, initial_quantity'
        });
        results.skipped++;
        continue;
      }

      // Find product by SKU
      const product = await Product.findOne({ where: { sku: row.product_sku.trim() } });
      if (!product) {
        results.errors.push({
          row: rowNum,
          error: `Product with SKU "${row.product_sku}" not found`
        });
        results.skipped++;
        continue;
      }

      // Verify product is raw_tracked
      if (product.type !== 'raw_tracked') {
        results.errors.push({
          row: rowNum,
          error: `Product "${row.product_sku}" is not a raw_tracked product`
        });
        results.skipped++;
        continue;
      }

      // Find branch by code
      const branch = await Branch.findOne({ where: { code: row.branch_code.trim() } });
      if (!branch) {
        results.errors.push({
          row: rowNum,
          error: `Branch with code "${row.branch_code}" not found`
        });
        results.skipped++;
        continue;
      }

      // Parse quantity
      const initialQuantity = parseFloat(row.initial_quantity);
      if (isNaN(initialQuantity) || initialQuantity <= 0) {
        results.errors.push({
          row: rowNum,
          error: 'Invalid initial_quantity. Must be a positive number'
        });
        results.skipped++;
        continue;
      }

      // Check if batch already exists
      const existingBatch = await InventoryBatch.findOne({
        where: { instance_code: row.instance_code.trim() }
      });

      if (existingBatch) {
        results.errors.push({
          row: rowNum,
          error: `Instance code "${row.instance_code}" already exists`
        });
        results.skipped++;
        continue;
      }

      // Create inventory batch
      await InventoryBatch.create({
        product_id: product.id,
        branch_id: branch.id,
        instance_code: row.instance_code.trim(),
        batch_type: 'coil', // Default for imports
        grouped: true,
        batch_identifier: row.instance_code.trim(),
        initial_quantity: initialQuantity,
        remaining_quantity: initialQuantity,
        status: 'in_stock'
      });

      results.created++;
    } catch (error) {
      results.errors.push({
        row: rowNum,
        error: error.message || 'Unknown error'
      });
      results.skipped++;
    }
  }

  return results;
};

/**
 * Import customers from CSV/JSON data
 * Expected columns: name, phone, email, address
 */
export const importCustomers = async (data, user, errors = []) => {
  const results = {
    created: 0,
    updated: 0,
    skipped: 0,
    errors: []
  };

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const rowNum = i + 2;

    try {
      // Validate required fields
      if (!row.name) {
        results.errors.push({
          row: rowNum,
          error: 'Missing required field: name'
        });
        results.skipped++;
        continue;
      }

      // Determine branch_id
      const branchId = user?.branch_id || null;

      // Check if customer exists (by name or email if provided)
      let existingCustomer = null;
      if (row.email) {
        existingCustomer = await Customer.findOne({
          where: { 
            email: row.email.trim(),
            branch_id: branchId
          }
        });
      }

      if (!existingCustomer) {
        existingCustomer = await Customer.findOne({
          where: { 
            name: row.name.trim(),
            branch_id: branchId
          }
        });
      }

      const customerData = {
        name: row.name.trim(),
        phone: row.phone ? row.phone.trim() : null,
        email: row.email ? row.email.trim() : null,
        address: row.address ? row.address.trim() : null,
        ledger_balance: row.ledger_balance ? parseFloat(row.ledger_balance) : 0,
        branch_id: branchId
      };

      if (existingCustomer) {
        await existingCustomer.update(customerData);
        results.updated++;
      } else {
        await Customer.create(customerData);
        results.created++;
      }
    } catch (error) {
      results.errors.push({
        row: rowNum,
        error: error.message || 'Unknown error'
      });
      results.skipped++;
    }
  }

  return results;
};

/**
 * Import suppliers from CSV/JSON data
 * Expected columns: name, phone, email, address
 */
export const importSuppliers = async (data, user, errors = []) => {
  const results = {
    created: 0,
    updated: 0,
    skipped: 0,
    errors: []
  };

  // Determine branch_id
  const branchId = user?.branch_id || null;

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const rowNum = i + 2;

    try {
      // Validate required fields
      if (!row.name) {
        results.errors.push({
          row: rowNum,
          error: 'Missing required field: name'
        });
        results.skipped++;
        continue;
      }

      // Check if supplier exists (by name or email if provided)
      let existingSupplier = null;
      if (row.email) {
        existingSupplier = await Supplier.findOne({
          where: { 
            email: row.email.trim(),
            branch_id: branchId
          }
        });
      }

      if (!existingSupplier) {
        existingSupplier = await Supplier.findOne({
          where: { 
            name: row.name.trim(),
            branch_id: branchId
          }
        });
      }

      const supplierData = {
        name: row.name.trim(),
        phone: row.phone ? row.phone.trim() : null,
        email: row.email ? row.email.trim() : null,
        address: row.address ? row.address.trim() : null,
        branch_id: branchId
      };

      if (existingSupplier) {
        await existingSupplier.update(supplierData);
        results.updated++;
      } else {
        await Supplier.create(supplierData);
        results.created++;
      }
    } catch (error) {
      results.errors.push({
        row: rowNum,
        error: error.message || 'Unknown error'
      });
      results.skipped++;
    }
  }

  return results;
};

/**
 * Import categories from CSV/JSON data
 * Expected columns: name, parent_name, description, is_active
 */
export const importCategories = async (data, user, errors = []) => {
  const results = {
    created: 0,
    updated: 0,
    skipped: 0,
    errors: []
  };

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const rowNum = i + 2;

    try {
      // Validate required fields
      if (!row.name) {
        results.errors.push({
          row: rowNum,
          error: 'Missing required field: name'
        });
        results.skipped++;
        continue;
      }

      // Find parent category if parent_name is provided
      let parentId = null;
      if (row.parent_name) {
        const parentCategory = await Category.findOne({
          where: { name: row.parent_name.trim() }
        });
        if (parentCategory) {
          parentId = parentCategory.id;
        } else {
          results.errors.push({
            row: rowNum,
            error: `Parent category "${row.parent_name}" not found`
          });
          results.skipped++;
          continue;
        }
      }

      // Check if category exists (by name and parent_id)
      const existingCategory = await Category.findOne({
        where: {
          name: row.name.trim(),
          parent_id: parentId
        }
      });

      const categoryData = {
        name: row.name.trim(),
        parent_id: parentId,
        description: row.description ? row.description.trim() : null,
        is_active: row.is_active !== undefined 
          ? (String(row.is_active).toLowerCase() === 'true' || row.is_active === '1' || row.is_active === 1)
          : true
      };

      if (existingCategory) {
        await existingCategory.update(categoryData);
        results.updated++;
      } else {
        await Category.create(categoryData);
        results.created++;
      }
    } catch (error) {
      results.errors.push({
        row: rowNum,
        error: error.message || 'Unknown error'
      });
      results.skipped++;
    }
  }

  return results;
};

/**
 * Import units from CSV/JSON data
 * Expected columns: name, abbreviation, base_unit_name, conversion_factor, is_base_unit, is_active
 */
export const importUnits = async (data, user, errors = []) => {
  const results = {
    created: 0,
    updated: 0,
    skipped: 0,
    errors: []
  };

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const rowNum = i + 2;

    try {
      // Validate required fields
      if (!row.name || !row.abbreviation) {
        results.errors.push({
          row: rowNum,
          error: 'Missing required fields: name, abbreviation'
        });
        results.skipped++;
        continue;
      }

      // Find base unit if base_unit_name is provided
      let baseUnitId = null;
      if (row.base_unit_name) {
        const baseUnit = await Unit.findOne({
          where: { name: row.base_unit_name.trim() }
        });
        if (baseUnit) {
          baseUnitId = baseUnit.id;
        } else {
          results.errors.push({
            row: rowNum,
            error: `Base unit "${row.base_unit_name}" not found`
          });
          results.skipped++;
          continue;
        }
      }

      // Parse conversion_factor
      const conversionFactor = row.conversion_factor !== undefined && row.conversion_factor !== ''
        ? parseFloat(row.conversion_factor)
        : 1;

      if (isNaN(conversionFactor) || conversionFactor <= 0) {
        results.errors.push({
          row: rowNum,
          error: 'Invalid conversion_factor. Must be a positive number'
        });
        results.skipped++;
        continue;
      }

      // Parse is_base_unit
      const isBaseUnit = row.is_base_unit !== undefined
        ? (String(row.is_base_unit).toLowerCase() === 'true' || row.is_base_unit === '1' || row.is_base_unit === 1)
        : false;

      // Parse is_active
      const isActive = row.is_active !== undefined
        ? (String(row.is_active).toLowerCase() === 'true' || row.is_active === '1' || row.is_active === 1)
        : true;

      // Check if unit exists (by name or abbreviation)
      const existingUnit = await Unit.findOne({
        where: {
          [Op.or]: [
            { name: row.name.trim() },
            { abbreviation: row.abbreviation.trim() }
          ]
        }
      });

      const unitData = {
        name: row.name.trim(),
        abbreviation: row.abbreviation.trim(),
        base_unit_id: baseUnitId,
        conversion_factor: conversionFactor,
        is_base_unit: isBaseUnit,
        is_active: isActive
      };

      if (existingUnit) {
        await existingUnit.update(unitData);
        results.updated++;
      } else {
        await Unit.create(unitData);
        results.created++;
      }
    } catch (error) {
      results.errors.push({
        row: rowNum,
        error: error.message || 'Unknown error'
      });
      results.skipped++;
    }
  }

  return results;
};

/**
 * Parse Excel buffer into JSON rows
 */
export const parseExcel = (buffer) => {
  if (!buffer || buffer.length === 0) {
    throw new Error('Uploaded file is empty');
  }

  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
    throw new Error('Excel file is invalid or has no sheets');
  }

  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, {
    defval: '',
    blankrows: false
  });

  return rows;
};

/**
 * Import purchases from CSV/JSON data (flattened format: one row per purchase item)
 * Expected columns: purchase_number, supplier_name, branch_code, total_amount, payment_status, status, notes, created_at,
 *                   product_sku, quantity, unit_cost, subtotal, instance_code, purchase_unit, purchased_quantity, conversion_factor
 */
export const importPurchases = async (data, user, errors = []) => {
  const results = {
    created: 0,
    updated: 0,
    skipped: 0,
    errors: []
  };

  // Group rows by purchase_number
  const purchaseMap = new Map();
  
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const rowNum = i + 2;

    try {
      // Validate required fields
      if (!row.purchase_number || !row.product_sku || row.quantity === undefined || row.unit_cost === undefined) {
        results.errors.push({
          row: rowNum,
          error: 'Missing required fields: purchase_number, product_sku, quantity, unit_cost'
        });
        results.skipped++;
        continue;
      }

      const purchaseNumber = row.purchase_number.trim();
      
      if (!purchaseMap.has(purchaseNumber)) {
        purchaseMap.set(purchaseNumber, {
          purchaseData: {
            purchase_number: purchaseNumber,
            supplier_name: row.supplier_name?.trim() || '',
            branch_code: row.branch_code?.trim() || '',
            total_amount: parseFloat(row.total_amount || 0),
            payment_status: row.payment_status?.trim() || 'unpaid',
            status: row.status?.trim() || 'confirmed',
            notes: row.notes?.trim() || '',
            created_at: row.created_at ? new Date(row.created_at) : new Date()
          },
          items: []
        });
      }

      purchaseMap.get(purchaseNumber).items.push({
        product_sku: row.product_sku.trim(),
        quantity: parseFloat(row.quantity),
        unit_cost: parseFloat(row.unit_cost),
        subtotal: parseFloat(row.subtotal || row.quantity * row.unit_cost),
        instance_code: row.instance_code?.trim() || null,
        purchase_unit: row.purchase_unit?.trim() || null,
        purchased_quantity: row.purchased_quantity ? parseFloat(row.purchased_quantity) : null,
        conversion_factor: row.conversion_factor ? parseFloat(row.conversion_factor) : 1
      });
    } catch (error) {
      results.errors.push({
        row: rowNum,
        error: error.message || 'Unknown error'
      });
      results.skipped++;
    }
  }

  // Process each purchase
  for (const [purchaseNumber, purchaseInfo] of purchaseMap.entries()) {
    const transaction = await sequelize.transaction();
    
    try {
      // Find or create branch
      let branch = null;
      if (purchaseInfo.purchaseData.branch_code) {
        branch = await Branch.findOne({
          where: { code: purchaseInfo.purchaseData.branch_code },
          transaction
        });
      }
      
      // Use user's branch if branch_code not found
      const branchId = branch?.id || user?.branch_id;
      if (!branchId) {
        await transaction.rollback();
        results.errors.push({
          row: `Purchase ${purchaseNumber}`,
          error: 'Branch not found and user has no branch assigned'
        });
        results.skipped++;
        continue;
      }

      // Find supplier if provided
      let supplierId = null;
      if (purchaseInfo.purchaseData.supplier_name) {
        const supplier = await Supplier.findOne({
          where: { 
            name: purchaseInfo.purchaseData.supplier_name,
            branch_id: branchId
          },
          transaction
        });
        supplierId = supplier?.id || null;
      }

      // Check if purchase already exists
      let purchase = await Purchase.findOne({
        where: { purchase_number: purchaseNumber },
        transaction
      });

      if (purchase) {
        // Update existing purchase
        await purchase.update({
          supplier_id: supplierId,
          branch_id: branchId,
          total_amount: purchaseInfo.purchaseData.total_amount,
          payment_status: purchaseInfo.purchaseData.payment_status,
          status: purchaseInfo.purchaseData.status,
          notes: purchaseInfo.purchaseData.notes
        }, { transaction });

        // Delete existing items and recreate
        await PurchaseItem.destroy({
          where: { purchase_id: purchase.id },
          transaction
        });
        results.updated++;
      } else {
        // Create new purchase
        purchase = await Purchase.create({
          purchase_number: purchaseNumber,
          supplier_id: supplierId,
          branch_id: branchId,
          user_id: user?.id || null,
          total_amount: purchaseInfo.purchaseData.total_amount,
          payment_status: purchaseInfo.purchaseData.payment_status,
          status: purchaseInfo.purchaseData.status,
          notes: purchaseInfo.purchaseData.notes,
          created_at: purchaseInfo.purchaseData.created_at
        }, { transaction });
        results.created++;
      }

      // Create purchase items
      for (const itemData of purchaseInfo.items) {
        // Find product by SKU
        const product = await Product.findOne({
          where: { sku: itemData.product_sku },
          transaction
        });

        if (!product) {
          await transaction.rollback();
          results.errors.push({
            row: `Purchase ${purchaseNumber}`,
            error: `Product with SKU "${itemData.product_sku}" not found`
          });
          results.skipped++;
          continue;
        }

        // Find purchase unit if provided
        let purchaseUnitId = null;
        if (itemData.purchase_unit) {
          const unit = await Unit.findOne({
            where: { name: itemData.purchase_unit },
            transaction
          });
          purchaseUnitId = unit?.id || null;
        }

        await PurchaseItem.create({
          purchase_id: purchase.id,
          product_id: product.id,
          quantity: itemData.quantity,
          unit_cost: itemData.unit_cost,
          subtotal: itemData.subtotal,
          instance_code: itemData.instance_code,
          purchase_unit_id: purchaseUnitId,
          purchased_quantity: itemData.purchased_quantity,
          conversion_factor: itemData.conversion_factor
        }, { transaction });
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      results.errors.push({
        row: `Purchase ${purchaseNumber}`,
        error: error.message || 'Unknown error'
      });
      results.skipped++;
    }
  }

  return results;
};

