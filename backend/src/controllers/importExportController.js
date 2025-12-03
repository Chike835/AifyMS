import multer from 'multer';
import csv from 'csv-parser';
import { Readable } from 'stream';
import * as importService from '../services/importService.js';
import * as exportService from '../services/exportService.js';

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
    if (allowedMimes.includes(file.mimetype) || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only CSV files are supported.'));
    }
  }
});

// Middleware for single file upload with error handling
export const uploadMiddleware = (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message || 'File upload error' });
    }
    next();
  });
};

/**
 * Parse CSV file from buffer
 */
const parseCSV = (buffer) => {
  return new Promise((resolve, reject) => {
    if (!buffer || buffer.length === 0) {
      return reject(new Error('CSV buffer is empty'));
    }

    const results = [];
    // Create readable stream directly from buffer
    // Using Readable.from() with a string iterates character-by-character, breaking CSV parsing
    // Instead, create a stream from the buffer array to preserve line structure
    const stream = Buffer.isBuffer(buffer)
      ? Readable.from([buffer])
      : Readable.from([Buffer.from(buffer, 'utf8')]);

    stream
      .pipe(csv({
        skipEmptyLines: true,
        skipLinesWithError: false
      }))
      .on('data', (data) => {
        // Only push non-empty rows
        if (data && Object.keys(data).length > 0) {
          results.push(data);
        }
      })
      .on('end', () => {
        console.log(`[CSV Parse] Successfully parsed ${results.length} rows`);
        resolve(results);
      })
      .on('error', (error) => {
        console.error('[CSV Parse Error]', error);
        reject(new Error(`Failed to parse CSV: ${error.message}`));
      });
  });
};

const getFileType = (file) => {
  const mimetype = file.mimetype?.toLowerCase();
  const filename = file.originalname?.toLowerCase() || '';

  const excelMimes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel'
  ];

  if (excelMimes.includes(mimetype) || filename.endsWith('.xlsx') || filename.endsWith('.xls')) {
    return 'excel';
  }

  return 'csv';
};

/**
 * POST /api/import/:entity
 * Import data from CSV file
 */
export const importData = async (req, res, next) => {
  try {
    // CRITICAL: Validate entity FIRST (fail fast - before any file processing)
    const { entity } = req.params;
    const validEntities = ['products', 'inventory', 'customers', 'suppliers', 'categories', 'units', 'purchases'];

    if (!entity || !validEntities.includes(entity)) {
      console.error('[Import] Invalid entity:', entity);
      return res.status(400).json({
        error: `Invalid entity "${entity}". Must be one of: ${validEntities.join(', ')}`
      });
    }

    console.log('[Import] Request received:', {
      entity: req.params.entity,
      hasFile: !!req.file,
      fileSize: req.file?.size,
      fileName: req.file?.originalname,
      fileMimeType: req.file?.mimetype
    });

    if (!req.file) {
      console.error('[Import] No file uploaded');
      return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log('[Import] Parsing file...');
    const fileType = getFileType(req.file);
    console.log('[Import] File type detected:', fileType);

    let data;
    try {
      if (fileType === 'excel') {
        data = importService.parseExcel(req.file.buffer);
      } else {
        data = await parseCSV(req.file.buffer);
      }
      console.log('[Import] Parsed rows:', data.length);
      
      // Debug: Log raw headers from first row
      if (data && data.length > 0) {
        console.log('[Import] Raw headers from first row:', Object.keys(data[0]));
        console.log('[Import] First row sample (raw):', data[0]);
      }
    } catch (parseError) {
      console.error('[Import] Parse error:', parseError);
      return res.status(400).json({ 
        error: `Failed to parse file: ${parseError.message}` 
      });
    }

    if (!data || data.length === 0) {
      console.error('[Import] No data parsed from file');
      return res.status(400).json({ error: 'CSV file is empty or invalid' });
    }

    // Normalize headers for product imports
    if (entity === 'products') {
      console.log('[Import] Normalizing headers for products...');
      data = importService.normalizeCSVHeaders(data);
      console.log('[Import] Headers normalized. First row sample (normalized):', data[0]);
    }

    console.log('[Import] Starting import for entity:', entity);
    let results;

    // Import based on entity type
    try {
      switch (entity) {
        case 'products':
          results = await importService.importProducts(data);
          break;
        case 'inventory':
          results = await importService.importInventoryBatches(data);
          break;
        case 'customers':
          results = await importService.importCustomers(data, req.user);
          break;
        case 'suppliers':
          results = await importService.importSuppliers(data, req.user);
          break;
        case 'categories':
          results = await importService.importCategories(data, req.user);
          break;
        case 'units':
          results = await importService.importUnits(data, req.user);
          break;
        case 'purchases':
          results = await importService.importPurchases(data, req.user);
          break;
        default:
          return res.status(400).json({ error: 'Invalid entity type' });
      }

      console.log('[Import] Import completed:', results);
    } catch (importError) {
      console.error('[Import] Import error:', importError);
      throw importError;
    }

    res.json({
      message: 'Import completed',
      results: {
        ...results,
        total: data.length
      }
    });
  } catch (error) {
    console.error('[Import] Unhandled error:', error);
    next(error);
  }
};

/**
 * GET /api/export/:entity
 * Export data to CSV
 */
export const exportData = async (req, res, next) => {
  try {
    const { entity } = req.params;
    const validEntities = ['products', 'inventory', 'sales', 'customers', 'purchases'];

    if (!validEntities.includes(entity)) {
      return res.status(400).json({
        error: `Invalid entity. Must be one of: ${validEntities.join(', ')}`
      });
    }

    // Get filters from query params
    const filters = {
      branch_id: req.query.branch_id,
      product_id: req.query.product_id,
      customer_id: req.query.customer_id,
      type: req.query.type,
      status: req.query.status,
      start_date: req.query.start_date,
      end_date: req.query.end_date
    };

    // Remove undefined filters
    Object.keys(filters).forEach(key => filters[key] === undefined && delete filters[key]);

    let csvContent;
    let filename;

    // Export based on entity type
    switch (entity) {
      case 'products':
        csvContent = await exportService.exportProducts(filters);
        filename = `products_${new Date().toISOString().split('T')[0]}.csv`;
        break;
      case 'inventory':
        csvContent = await exportService.exportInventoryBatches(filters);
        filename = `inventory_${new Date().toISOString().split('T')[0]}.csv`;
        break;
      case 'sales':
        csvContent = await exportService.exportSalesOrders(filters);
        filename = `sales_orders_${new Date().toISOString().split('T')[0]}.csv`;
        break;
      case 'customers':
        csvContent = await exportService.exportCustomers();
        filename = `customers_${new Date().toISOString().split('T')[0]}.csv`;
        break;
      case 'purchases':
        csvContent = await exportService.exportPurchases(filters);
        filename = `purchases_${new Date().toISOString().split('T')[0]}.csv`;
        break;
      default:
        return res.status(400).json({ error: 'Invalid entity type' });
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csvContent);
  } catch (error) {
    next(error);
  }
};

