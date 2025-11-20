import { Product, InventoryInstance, Branch, Customer } from '../models/index.js';
import { Op } from 'sequelize';

/**
 * Import products from CSV/JSON data
 * Expected columns: sku, name, type, base_unit, sale_price, cost_price, tax_rate, brand, category
 */
export const importProducts = async (data, errors = []) => {
  const results = {
    created: 0,
    updated: 0,
    skipped: 0,
    errors: []
  };

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const rowNum = i + 2; // +2 because row 1 is header, and arrays are 0-indexed

    try {
      // Validate required fields
      if (!row.sku || !row.name || !row.type || !row.base_unit || row.sale_price === undefined) {
        results.errors.push({
          row: rowNum,
          error: 'Missing required fields: sku, name, type, base_unit, sale_price'
        });
        results.skipped++;
        continue;
      }

      // Validate product type
      const validTypes = ['standard', 'compound', 'raw_tracked', 'manufactured_virtual'];
      if (!validTypes.includes(row.type)) {
        results.errors.push({
          row: rowNum,
          error: `Invalid product type: ${row.type}. Must be one of: ${validTypes.join(', ')}`
        });
        results.skipped++;
        continue;
      }

      // Parse numeric values
      const salePrice = parseFloat(row.sale_price);
      const costPrice = row.cost_price ? parseFloat(row.cost_price) : null;
      const taxRate = row.tax_rate ? parseFloat(row.tax_rate) : 0;

      if (isNaN(salePrice) || salePrice < 0) {
        results.errors.push({
          row: rowNum,
          error: 'Invalid sale_price. Must be a non-negative number'
        });
        results.skipped++;
        continue;
      }

      // Check if product exists
      const existingProduct = await Product.findOne({ where: { sku: row.sku } });

      const productData = {
        sku: row.sku.trim(),
        name: row.name.trim(),
        type: row.type,
        base_unit: row.base_unit.trim(),
        sale_price: salePrice,
        cost_price: costPrice,
        tax_rate: taxRate,
        brand: row.brand ? row.brand.trim() : null,
        category: row.category ? row.category.trim() : null
      };

      if (existingProduct) {
        // Update existing product
        await existingProduct.update(productData);
        results.updated++;
      } else {
        // Create new product
        await Product.create(productData);
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
 * Import inventory instances from CSV/JSON data
 * Expected columns: instance_code, product_sku, branch_code, initial_quantity
 */
export const importInventoryInstances = async (data, errors = []) => {
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

      // Check if instance already exists
      const existingInstance = await InventoryInstance.findOne({
        where: { instance_code: row.instance_code.trim() }
      });

      if (existingInstance) {
        results.errors.push({
          row: rowNum,
          error: `Instance code "${row.instance_code}" already exists`
        });
        results.skipped++;
        continue;
      }

      // Create inventory instance
      await InventoryInstance.create({
        product_id: product.id,
        branch_id: branch.id,
        instance_code: row.instance_code.trim(),
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
export const importCustomers = async (data, errors = []) => {
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

      // Check if customer exists (by name or email if provided)
      let existingCustomer = null;
      if (row.email) {
        existingCustomer = await Customer.findOne({
          where: { email: row.email.trim() }
        });
      }

      if (!existingCustomer) {
        existingCustomer = await Customer.findOne({
          where: { name: row.name.trim() }
        });
      }

      const customerData = {
        name: row.name.trim(),
        phone: row.phone ? row.phone.trim() : null,
        email: row.email ? row.email.trim() : null,
        address: row.address ? row.address.trim() : null,
        ledger_balance: row.ledger_balance ? parseFloat(row.ledger_balance) : 0
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

