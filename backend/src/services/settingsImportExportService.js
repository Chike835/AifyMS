import { Op } from 'sequelize';
import XLSX from 'xlsx';
import csv from 'csv-parser';
import { Readable } from 'stream';

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
 * Parse Excel buffer into JSON rows
 */
const parseExcel = (buffer) => {
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
 * Parse CSV file from buffer
 */
const parseCSV = (buffer) => {
  return new Promise((resolve, reject) => {
    if (!buffer || buffer.length === 0) {
      return reject(new Error('CSV buffer is empty'));
    }

    const results = [];
    const csvString = Buffer.isBuffer(buffer) 
      ? buffer.toString('utf8') 
      : buffer;
    
    const stream = Readable.from(csvString);

    stream
      .pipe(csv({
        skipEmptyLines: true,
        skipLinesWithError: false
      }))
      .on('data', (data) => {
        if (data && Object.keys(data).length > 0) {
          results.push(data);
        }
      })
      .on('end', () => {
        resolve(results);
      })
      .on('error', (error) => {
        reject(new Error(`Failed to parse CSV: ${error.message}`));
      });
  });
};

/**
 * Get file type from buffer or filename
 */
const getFileType = (buffer, filename = '') => {
  const lowerFilename = filename.toLowerCase();
  
  if (lowerFilename.endsWith('.xlsx') || lowerFilename.endsWith('.xls')) {
    return 'excel';
  }
  
  // Try to detect Excel by magic bytes
  if (buffer && buffer.length > 0) {
    const header = buffer.slice(0, 8);
    // Excel files start with PK (ZIP format) or D0 CF 11 E0 (OLE format)
    if (header[0] === 0x50 && header[1] === 0x4B) {
      return 'excel';
    }
    if (header[0] === 0xD0 && header[1] === 0xCF && header[2] === 0x11 && header[3] === 0xE0) {
      return 'excel';
    }
  }
  
  return 'csv';
};

/**
 * Normalize CSV headers in rows
 */
const normalizeCSVHeaders = (rows) => {
  if (!rows || rows.length === 0) {
    return rows;
  }

  const firstRow = rows[0];
  if (!firstRow || typeof firstRow !== 'object') {
    return rows;
  }

  const headerMap = {};
  const rawHeaders = Object.keys(firstRow);

  rawHeaders.forEach(rawHeader => {
    const normalized = normalizeHeader(rawHeader);
    headerMap[rawHeader] = normalized;
  });

  const normalizedRows = rows.map(row => {
    const normalizedRow = {};
    Object.keys(row).forEach(rawKey => {
      const normalizedKey = headerMap[rawKey];
      if (normalizedKey) {
        normalizedRow[normalizedKey] = row[rawKey];
      }
    });
    return normalizedRow;
  });

  return normalizedRows;
};

/**
 * Convert array of objects to CSV string
 */
const arrayToCSV = (data, headers) => {
  if (!data || data.length === 0) {
    return headers.join(',') + '\n';
  }

  const csvRows = [headers.join(',')];

  for (const row of data) {
    const values = headers.map(header => {
      const value = row[header];
      if (value === null || value === undefined) {
        return '';
      }
      // Escape commas and quotes in values
      const stringValue = String(value).replace(/"/g, '""');
      return `"${stringValue}"`;
    });
    csvRows.push(values.join(','));
  }

  return csvRows.join('\n');
};

/**
 * Generic CSV/Excel import function for settings entities
 * @param {Object} model - Sequelize model
 * @param {Buffer} buffer - File buffer
 * @param {Array<string>} uniqueFields - Fields to check for duplicates
 * @param {Object} options - Additional options
 * @param {Array<string>} options.requiredFields - Required fields for validation
 * @param {Function} options.transformRow - Optional function to transform row before import
 * @param {Function} options.validateRow - Optional function to validate row
 * @param {boolean} options.updateOnDuplicate - Whether to update existing records (default: false)
 * @returns {Promise<Object>} - Results object with created, updated, skipped, errors
 */
export const importFromCsv = async (model, buffer, uniqueFields = [], options = {}) => {
  const {
    requiredFields = [],
    transformRow = null,
    validateRow = null,
    updateOnDuplicate = false
  } = options;

  const results = {
    created: 0,
    updated: 0,
    skipped: 0,
    errors: []
  };

  // Parse file
  let data;
  try {
    const fileType = getFileType(buffer);
    if (fileType === 'excel') {
      data = parseExcel(buffer);
    } else {
      data = await parseCSV(buffer);
    }

    // Normalize headers
    data = normalizeCSVHeaders(data);
  } catch (error) {
    throw new Error(`Failed to parse file: ${error.message}`);
  }

  if (!data || data.length === 0) {
    throw new Error('File is empty or contains no valid data');
  }

  // Process each row
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const rowNum = i + 2; // +2 because row 1 is header, and arrays are 0-indexed

    try {
      // Validate required fields
      const missingFields = requiredFields.filter(field => {
        const value = row[field];
        return value === undefined || value === null || 
               (typeof value === 'string' && value.trim() === '');
      });

      if (missingFields.length > 0) {
        results.errors.push({
          row: rowNum,
          error: `Missing required fields: ${missingFields.join(', ')}`
        });
        results.skipped++;
        continue;
      }

      // Apply custom validation if provided
      if (validateRow) {
        const validationError = validateRow(row, rowNum);
        if (validationError) {
          results.errors.push({
            row: rowNum,
            error: validationError
          });
          results.skipped++;
          continue;
        }
      }

      // Transform row if provided
      let processedRow = row;
      if (transformRow) {
        processedRow = await transformRow(row, rowNum);
        if (!processedRow) {
          results.errors.push({
            row: rowNum,
            error: 'Row transformation returned null/undefined'
          });
          results.skipped++;
          continue;
        }
      }

      // Check for duplicates
      if (uniqueFields.length > 0) {
        const whereClause = {};
        uniqueFields.forEach(field => {
          if (processedRow[field] !== undefined && processedRow[field] !== null) {
            const value = typeof processedRow[field] === 'string' 
              ? processedRow[field].trim() 
              : processedRow[field];
            if (value !== '') {
              whereClause[field] = value;
            }
          }
        });

        if (Object.keys(whereClause).length > 0) {
          const existing = await model.findOne({ where: whereClause });

          if (existing) {
            if (updateOnDuplicate) {
              // Update existing record
              await existing.update(processedRow);
              results.updated++;
            } else {
              // Skip duplicate
              results.errors.push({
                row: rowNum,
                error: `Duplicate found based on fields: ${uniqueFields.join(', ')}`
              });
              results.skipped++;
            }
            continue;
          }
        }
      }

      // Create new record
      await model.create(processedRow);
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
 * Generic CSV export function for settings entities
 * @param {Object} model - Sequelize model
 * @param {Array<string>} fields - Fields to export
 * @param {Object} filters - Optional filters for query
 * @param {Object} options - Additional options
 * @param {Function} options.transformRow - Optional function to transform row before export
 * @param {Array} options.include - Optional Sequelize includes for relationships
 * @returns {Promise<string>} - CSV string
 */
export const exportToCsv = async (model, fields = [], filters = {}, options = {}) => {
  const {
    transformRow = null,
    include = [],
    order = []
  } = options;

  const where = { ...filters };

  // Build query
  const queryOptions = {
    where,
    order: order.length > 0 ? order : [[fields[0] || 'id', 'ASC']]
  };

  if (include.length > 0) {
    queryOptions.include = include;
  }

  const records = await model.findAll(queryOptions);

  // Transform data
  const csvData = records.map(record => {
    let row = {};
    
    fields.forEach(field => {
      // Handle nested fields (e.g., 'parent.name')
      const fieldParts = field.split('.');
      let value = record;
      
      for (const part of fieldParts) {
        if (value && value[part] !== undefined) {
          value = value[part];
        } else {
          value = null;
          break;
        }
      }
      
      // Get the base field name (last part)
      const baseField = fieldParts[fieldParts.length - 1];
      row[baseField] = value;
    });

    // Apply custom transformation if provided
    if (transformRow) {
      row = transformRow(row, record);
    }

    return row;
  });

  return arrayToCSV(csvData, fields.map(f => f.split('.').pop()));
};

