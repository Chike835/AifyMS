# Fix Import Mapping - Header Normalization

## Problem Analysis
The CSV import is failing with "Missing required fields" errors because the CSV headers don't match the expected field names. The `csv-parser` library reads headers exactly as they appear in the file, which may have:
- Different cases (e.g., "SKU" vs "sku")
- Spaces (e.g., "Product Name" vs "name")
- BOM characters (invisible UTF-8 BOM at the start)
- Different naming conventions (e.g., "Price" vs "sale_price")

## Solution
Implement header normalization that:
1. Strips BOM characters from the first column header
2. Converts all headers to lowercase
3. Trims whitespace
4. Maps common aliases to expected field names
5. Normalizes data rows to use the normalized keys

## Implementation Plan

- [x] Create `normalizeHeaders` utility function in `importService.js`
- [x] Add header alias mapping for product fields
- [x] Apply normalization in `parseCSV` function in `importExportController.js`
- [x] Add debug logging to inspect raw headers and normalized headers
- [x] Update `importProducts` to handle normalized data
- [ ] Test with various CSV header formats

## Implementation Details

### 1. Header Normalization Function (`normalizeHeader`)
Located in `backend/src/services/importService.js`:

- **BOM Stripping**: Removes UTF-8 Byte Order Mark (`\uFEFF`) from header strings
- **Case Normalization**: Converts all headers to lowercase
- **Whitespace Handling**: Trims whitespace and normalizes spaces/underscores to single underscores
- **Edge Cases**: Handles null/undefined headers gracefully

### 2. Header Alias Mapping (`PRODUCT_HEADER_ALIASES`)
Comprehensive mapping of common CSV header variations to expected field names:

- **Name variations**: `product_name`, `productname`, `item_name`, `itemname`, `product` → `name`
- **SKU variations**: `product_sku`, `productsku`, `item_sku`, `itemsku`, `code`, `product_code` → `sku`
- **Price variations**: `sale_price`, `selling_price`, `price`, `unit_price`, `retail_price` → `sale_price`
- **Cost variations**: `cost_price`, `costprice`, `purchase_price`, `buying_price` → `cost_price`
- **Unit variations**: `base_unit`, `baseunit`, `unit`, `unit_of_measure`, `uom` → `base_unit`
- **Type variations**: `product_type`, `producttype`, `type`, `item_type` → `type`
- **Tax variations**: `tax_rate`, `taxrate`, `tax`, `vat_rate` → `tax_rate`
- **Brand/Category**: Direct mappings with common variations

### 3. CSV Header Normalization (`normalizeCSVHeaders`)
Exported function that:
- Inspects the first row to build a header mapping
- Applies normalization and alias mapping to all headers
- Transforms all data rows to use normalized keys
- Includes comprehensive debug logging

### 4. Integration in Import Controller
Updated `backend/src/controllers/importExportController.js`:
- Applies header normalization **after** CSV parsing but **before** passing to import functions
- Only normalizes headers for `products` entity (can be extended for others)
- Logs raw headers, normalized headers, and first row samples for debugging

### 5. Enhanced Validation in `importProducts`
Improved error handling:
- **Detailed missing field reporting**: Lists exactly which fields are missing
- **Available keys logging**: Shows what keys were found in the row for troubleshooting
- **Defensive parsing**: Handles empty strings, null, and undefined values
- **Better error messages**: Includes actual values that failed validation

## How It Works

### Example Transformation

**Input CSV Headers:**
```
Product Name,SKU,Price,Unit,Type
```

**After Normalization:**
```
name,sku,sale_price,base_unit,type
```

**Process:**
1. `Product Name` → `product_name` (lowercase, space to underscore) → `name` (alias mapping)
2. `SKU` → `sku` (lowercase)
3. `Price` → `price` (lowercase) → `sale_price` (alias mapping)
4. `Unit` → `unit` (lowercase) → `base_unit` (alias mapping)
5. `Type` → `type` (lowercase)

### BOM Character Handling

If a CSV file starts with a BOM character (common in Excel exports):
```
﻿SKU,Name,Price
```

The normalization function strips the BOM:
- `﻿SKU` → `sku` (BOM removed, then normalized)

## Verification

The implementation handles:
- ✅ Case-insensitive headers (`SKU`, `sku`, `Sku`)
- ✅ Headers with spaces (`Product Name`, `Sale Price`)
- ✅ Headers with underscores (`product_name`, `sale_price`)
- ✅ BOM characters in UTF-8 files
- ✅ Common header aliases (`Price` → `sale_price`, `Unit` → `base_unit`)
- ✅ Empty/null values in optional fields
- ✅ Detailed error messages for missing required fields

## Debug Logging

The implementation includes comprehensive logging:
- `[HeaderNormalization] Raw headers detected:` - Shows original CSV headers
- `[HeaderNormalization] Header mapping:` - Shows the mapping from raw to normalized
- `[HeaderNormalization] First row sample (raw):` - Shows first data row before normalization
- `[HeaderNormalization] First row sample (normalized):` - Shows first data row after normalization
- `[ImportProducts] First row keys:` - Shows available keys in the first row
- `[ImportProducts] Processing row X:` - Shows field values being processed

## Testing Recommendations

1. **Test with various header formats:**
   - Uppercase: `SKU, NAME, PRICE`
   - Mixed case: `Product Name, SKU, Sale Price`
   - With spaces: `Product Name, Sale Price`
   - With underscores: `product_name, sale_price`
   - With BOM: Files exported from Excel

2. **Test with alias variations:**
   - `Price` should map to `sale_price`
   - `Unit` should map to `base_unit`
   - `Product Name` should map to `name`

3. **Verify error messages:**
   - Missing fields should list exactly which fields are missing
   - Error messages should include available keys for troubleshooting

