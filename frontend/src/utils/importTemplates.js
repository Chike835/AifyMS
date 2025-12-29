/**
 * Import template generators for all entities
 * Each function returns a CSV string with headers and a sample row
 */

/**
 * Generate CSV template for units
 * Backend expects: name, abbreviation (required), conversion_factor, is_base_unit, is_active, base_unit_id
 * Headers can be: Name/name, Short name/short_name/abbreviation, conversion_factor, is_base_unit, is_active, base_unit_id
 */
export const generateUnitsTemplate = () => {
  const headers = ['name', 'abbreviation', 'conversion_factor', 'is_base_unit', 'is_active', 'base_unit_id'];
  const sampleRow = ['KILOGRAM(S)', 'KG', '1', 'true', 'true', ''];
  return [headers.join(','), sampleRow.join(',')].join('\n');
};

/**
 * Generate CSV template for categories
 * Backend expects: name (required), description, is_active, parent_id
 * Headers can be: name/category/category_name, description, is_active/active/status, parent_id/parent_name/parent_category
 */
export const generateCategoriesTemplate = () => {
  const headers = ['name', 'description', 'is_active', 'parent_id'];
  const sampleRow = ['ELECTRONICS', 'Electronic products category', 'true', ''];
  return [headers.join(','), sampleRow.join(',')].join('\n');
};

/**
 * Generate CSV template for products
 */
export const generateProductsTemplate = () => {
  const headers = ['sku', 'name', 'type', 'base_unit', 'sale_price', 'cost_price', 'tax_rate', 'brand', 'category'];
  const sampleRow = ['PROD-001', 'Example Product', 'standard', 'piece', '1000.00', '600.00', '7.5', 'Example Brand', 'Electronics'];
  return [headers.join(','), sampleRow.join(',')].join('\n');
};

/**
 * Generate CSV template for inventory
 */
export const generateInventoryTemplate = () => {
  const headers = ['instance_code', 'product_sku', 'branch_code', 'initial_quantity'];
  const sampleRow = ['COIL-001', 'PROD-001', 'MAIN', '100.000'];
  return [headers.join(','), sampleRow.join(',')].join('\n');
};

/**
 * Generate CSV template for brands
 * Backend expects: name (required)
 * Headers can be: name/brand/brand_name/brands
 */
export const generateBrandsTemplate = () => {
  const headers = ['name'];
  const sampleRow = ['Example Brand'];
  return [headers.join(','), sampleRow.join(',')].join('\n');
};

/**
 * Generate CSV template for variations
 * Backend expects: name (required), description, values (comma/pipe/semicolon separated), is_active
 * Headers can be: name/variation/variation_name/variations, description, values/variation_values/options, is_active/active/status
 */
export const generateVariationsTemplate = () => {
  const headers = ['name', 'description', 'values', 'is_active'];
  const sampleRow = ['Color', 'Product color variation', 'Red, Blue, Green, Yellow', 'true'];
  return [headers.join(','), sampleRow.join(',')].join('\n');
};

/**
 * Generate CSV template for warranties
 * Backend expects: name (required), duration_months (required), description, is_active
 */
export const generateWarrantiesTemplate = () => {
  const headers = ['name', 'duration_months', 'description', 'is_active'];
  const sampleRow = ['Standard Warranty', '12', 'One year standard warranty', 'true'];
  return [headers.join(','), sampleRow.join(',')].join('\n');
};

/**
 * Generate CSV template for customers
 */
export const generateCustomersTemplate = () => {
  const headers = ['name', 'phone', 'email', 'address', 'ledger_balance'];
  const sampleRow = ['John Doe', '+1234567890', 'john@example.com', '123 Main St', '0.00'];
  return [headers.join(','), sampleRow.join(',')].join('\n');
};

/**
 * Generate CSV template for suppliers
 */
export const generateSuppliersTemplate = () => {
  const headers = ['name', 'phone', 'email', 'address'];
  const sampleRow = ['Supplier Co', '+1234567890', 'supplier@example.com', '456 Business Ave'];
  return [headers.join(','), sampleRow.join(',')].join('\n');
};

/**
 * Generate CSV template for payment accounts
 */
export const generatePaymentAccountsTemplate = () => {
  const headers = ['name', 'account_type', 'account_number', 'bank_name', 'opening_balance', 'branch_name', 'is_active'];
  const sampleRow = ['Main Cash Register', 'cash', '', '', '0.00', '', 'true'];
  return [headers.join(','), sampleRow.join(',')].join('\n');
};

/**
 * Generate CSV template for recipes
 */
export const generateRecipesTemplate = () => {
  const headers = ['name', 'virtual_product_sku', 'raw_product_sku', 'conversion_factor', 'wastage_margin'];
  const sampleRow = ['Longspan to Coil', 'LONGSPAN-001', 'COIL-001', '0.8', '5'];
  return [headers.join(','), sampleRow.join(',')].join('\n');
};

/**
 * Download template as CSV file
 */
export const downloadTemplate = (csvContent, filename) => {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

/**
 * Get template generator function by entity name
 */
export const getTemplateGenerator = (entity) => {
  const generators = {
    units: generateUnitsTemplate,
    categories: generateCategoriesTemplate,
    products: generateProductsTemplate,
    inventory: generateInventoryTemplate,
    brands: generateBrandsTemplate,
    variations: generateVariationsTemplate,
    warranties: generateWarrantiesTemplate,
    customers: generateCustomersTemplate,
    suppliers: generateSuppliersTemplate,
    payment_accounts: generatePaymentAccountsTemplate,
    recipes: generateRecipesTemplate
  };

  return generators[entity] || null;
};

/**
 * Download template for a specific entity
 */
export const downloadEntityTemplate = (entity) => {
  const generator = getTemplateGenerator(entity);
  if (!generator) {
    console.error(`No template generator found for entity: ${entity}`);
    return;
  }

  const csvContent = generator();
  const filename = `${entity}_template.csv`;
  downloadTemplate(csvContent, filename);
};

