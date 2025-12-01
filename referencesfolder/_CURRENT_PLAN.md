# Execution Plan: Refactor Product List & Add Product Pages

## Phase 1: Database Schema Updates (init.sql)
- [x] Add `barcode_type`, `alert_quantity`, `reorder_quantity` columns to products table
- [x] Create `product_business_locations` junction table for product-branch relationship

## Phase 2: Backend Model Updates
- [x] Update `backend/src/models/Product.js` to include new fields (barcode_type, alert_quantity, reorder_quantity)
- [x] Create `backend/src/models/ProductBusinessLocation.js` for junction table
- [x] Add Product-Branch association in `backend/src/models/index.js`

## Phase 3: Backend Controller & Routes Updates
- [x] Update `backend/src/controllers/productController.js` to support advanced filters (category, unit, tax, brand, business_location, status)
- [x] Add computed stock field in getProducts response
- [x] Add `GET /api/products/:id/batches` endpoint for listing product batches
- [x] Add `POST /api/products/:id/batches` endpoint for adding batch to product
- [x] Add `PUT /api/products/:id` endpoint for updating products
- [x] Add `DELETE /api/products/:id` endpoint for deleting products
- [x] Update `backend/src/routes/productRoutes.js` with new routes

## Phase 4: Frontend - Products List Page Refactor
- [x] Completely refactor `frontend/src/pages/Products.jsx` with:
  - Filter bar with dropdowns (Product Type, Category, Unit, Tax, Brand, Business Location, Status)
  - New table columns: Checkbox, Image, Product (Name+SKU), Business Location, Unit Price, Selling Price, Current Stock, Product Type, Category, Brand, Tax, Action
  - Action dropdown with: Labels, View, Edit, Delete, Add Batch, List Batch
  - Footer row with totals
  - Pagination controls
  - Export buttons (CSV, Excel, Print, PDF)
  - Column visibility toggle

## Phase 5: Frontend - Add Product Page Refinement
- [x] Added Reorder Quantity field to `frontend/src/pages/AddProduct.jsx`

## Phase 6: Frontend - New Modals/Components
- [x] Created `ProductViewModal` for viewing product details (inline in Products.jsx)
- [x] Created `ProductBatchModal` for adding batch to a product (inline in Products.jsx)
- [x] Created `ProductBatchListModal` for listing batches of a product (inline in Products.jsx)

---
## Status: COMPLETED ✅
