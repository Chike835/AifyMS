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
    const results = [];
    const stream = Readable.from(buffer.toString());

    stream
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', (error) => reject(error));
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
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }


    const { entity } = req.params;
    const validEntities = ['products', 'inventory', 'customers', 'suppliers'];

    if (!validEntities.includes(entity)) {
      return res.status(400).json({
        error: `Invalid entity. Must be one of: ${validEntities.join(', ')}`
      });
    }

    const fileType = getFileType(req.file);
    const data = fileType === 'excel'
      ? importService.parseExcel(req.file.buffer)
      : await parseCSV(req.file.buffer);

    if (data.length === 0) {
      return res.status(400).json({ error: 'CSV file is empty or invalid' });
    }

    let results;

    // Import based on entity type
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
      default:
        return res.status(400).json({ error: 'Invalid entity type' });
    }

    res.json({
      message: 'Import completed',
      results: {
        ...results,
        total: data.length
      }
    });
  } catch (error) {
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
    const validEntities = ['products', 'inventory', 'sales', 'customers'];

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

