# AifyMS ERP - Remaining Build Execution Plan

**Generated:** 2025-11-24  
**Version:** 1.0.0  
**Status:** ACTIVE  
**Total Remaining Features:** 46  

---

## Table of Contents

1. [User Management Module](#module-user-management)
2. [Contacts Module](#module-contacts)
3. [Inventory Module](#module-inventory)
4. [Manufacturing Module](#module-manufacturing)
5. [Purchases Module](#module-purchases)
6. [Sales Module](#module-sales)
7. [Payroll Module](#module-payroll)
8. [Accounts & Reports Module](#module-accounts--reports)
9. [Settings Module](#module-settings)
10. [Dashboard Module](#module-dashboard)
11. [Print & Documents Module](#module-print--documents)
12. [API Enhancements](#module-api-enhancements)

---

## Module: User Management

### Feature: Sales Commission Agents Functionality

**Description:** Implement sales commission agent tracking with commission calculation tied to sales.

- [ ] **Database**: Add `agents` table to `database/init.sql`:
  ```sql
  CREATE TABLE agents (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID REFERENCES users(id),
      name VARCHAR(200) NOT NULL,
      phone VARCHAR(20),
      email VARCHAR(255),
      commission_rate DECIMAL(5, 2) NOT NULL DEFAULT 0 CHECK (commission_rate >= 0 AND commission_rate <= 100),
      is_active BOOLEAN DEFAULT true,
      branch_id UUID REFERENCES branches(id),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX idx_agents_branch_id ON agents(branch_id);
  CREATE INDEX idx_agents_user_id ON agents(user_id);
  ```
- [ ] **Database**: Add `agent_id` column to `sales_orders` table:
  ```sql
  ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS agent_id UUID REFERENCES agents(id);
  CREATE INDEX idx_sales_orders_agent_id ON sales_orders(agent_id);
  ```
- [ ] **Database**: Create `agent_commissions` table:
  ```sql
  CREATE TABLE agent_commissions (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      agent_id UUID NOT NULL REFERENCES agents(id),
      sales_order_id UUID NOT NULL REFERENCES sales_orders(id),
      commission_rate DECIMAL(5, 2) NOT NULL,
      commission_amount DECIMAL(15, 2) NOT NULL,
      status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
      paid_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX idx_agent_commissions_agent_id ON agent_commissions(agent_id);
  CREATE INDEX idx_agent_commissions_status ON agent_commissions(status);
  ```
- [ ] **Database**: Add permission slugs to seed data:
  ```sql
  INSERT INTO permissions (slug, group_name) VALUES
      ('agent_view', 'user_management'),
      ('agent_add', 'user_management'),
      ('agent_edit', 'user_management'),
      ('agent_delete', 'user_management'),
      ('agent_commission_view', 'user_management'),
      ('agent_commission_manage', 'user_management');
  ```
- [ ] **Backend Model**: Create `backend/src/models/Agent.js` with fields: `id`, `user_id`, `name`, `phone`, `email`, `commission_rate`, `is_active`, `branch_id`. Define associations: `belongsTo User`, `belongsTo Branch`, `hasMany AgentCommission`.
- [ ] **Backend Model**: Create `backend/src/models/AgentCommission.js` with fields: `id`, `agent_id`, `sales_order_id`, `commission_rate`, `commission_amount`, `status`, `paid_at`. Define associations: `belongsTo Agent`, `belongsTo SalesOrder`.
- [ ] **Backend Model**: Update `backend/src/models/index.js` to import and associate `Agent` and `AgentCommission` models.
- [ ] **Backend Model**: Update `backend/src/models/SalesOrder.js` to add `belongsTo Agent` association.
- [ ] **Backend Controller**: Create `backend/src/controllers/agentController.js` with methods:
  - `getAgents()` - List agents (branch-filtered)
  - `getAgentById()` - Get single agent with commissions summary
  - `createAgent()` - Create new agent
  - `updateAgent()` - Update agent details
  - `deleteAgent()` - Soft delete (set is_active = false)
  - `getAgentCommissions()` - Get commission records for agent
  - `markCommissionPaid()` - Update commission status to 'paid'
- [ ] **Backend Route**: Create `backend/src/routes/agentRoutes.js`:
  - `GET /api/agents` → `getAgents` with `requirePermission('agent_view')`
  - `GET /api/agents/:id` → `getAgentById` with `requirePermission('agent_view')`
  - `POST /api/agents` → `createAgent` with `requirePermission('agent_add')`
  - `PUT /api/agents/:id` → `updateAgent` with `requirePermission('agent_edit')`
  - `DELETE /api/agents/:id` → `deleteAgent` with `requirePermission('agent_delete')`
  - `GET /api/agents/:id/commissions` → `getAgentCommissions` with `requirePermission('agent_commission_view')`
  - `PUT /api/agents/commissions/:id/pay` → `markCommissionPaid` with `requirePermission('agent_commission_manage')`
- [ ] **Backend Route**: Update `backend/src/routes/index.js` to register `agentRoutes` at `/api/agents`.
- [ ] **Backend Controller**: Update `backend/src/controllers/salesController.js` `createSale()` to:
  - Accept optional `agent_id` in request body
  - Auto-calculate commission based on `agent.commission_rate * total_amount`
  - Create `AgentCommission` record when agent is assigned
- [ ] **Frontend Page**: Create `frontend/src/pages/Agents.jsx` with:
  - Agent list table with columns: Name, Phone, Email, Commission Rate, Status, Actions
  - Add Agent modal/form
  - Edit Agent modal/form
  - View Agent detail modal with commission history
  - Pay Commission button for pending commissions
- [ ] **Frontend Sidebar**: Update `frontend/src/components/layout/Sidebar.jsx` to add:
  ```javascript
  { name: 'Agents', path: '/agents', icon: UserPlus, permission: 'agent_view' }
  ```
- [ ] **Frontend Route**: Update `frontend/src/App.jsx` to add route `/agents` → `<Agents />`.

---

## Module: Contacts

### Feature: Contact Import Functionality (CSV/Excel)

**Description:** Import customers and suppliers from CSV/Excel files.

- [ ] **Backend Controller**: Update `backend/src/controllers/importExportController.js` to add:
  - `importCustomers()` - Parse CSV/Excel and bulk insert customers
  - `importSuppliers()` - Parse CSV/Excel and bulk insert suppliers (with branch assignment)
  - Validation: Check for duplicate phone/email, required fields
  - Error handling: Return row-by-row error report
- [ ] **Backend Route**: Update `backend/src/routes/importExportRoutes.js` to add:
  - `POST /api/import/customers` → `importCustomers` with `requirePermission('data_import')`
  - `POST /api/import/suppliers` → `importSuppliers` with `requirePermission('data_import')`
  - `GET /api/export/customers` → `exportCustomers` with `requirePermission('data_export_operational')`
  - `GET /api/export/suppliers` → `exportSuppliers` with `requirePermission('data_export_operational')`
- [ ] **Frontend Page**: Create `frontend/src/pages/ImportContacts.jsx` with:
  - Tab interface: "Import Customers" | "Import Suppliers"
  - File upload dropzone (CSV, XLSX)
  - Column mapping interface (map file columns to system fields)
  - Preview table showing first 10 rows
  - Import button with progress indicator
  - Result summary: X imported, Y failed with error details
  - Download sample CSV template button
- [ ] **Frontend Sidebar**: Update `frontend/src/components/layout/Sidebar.jsx` to add:
  ```javascript
  { name: 'Import Contacts', path: '/import-contacts', icon: Upload, permission: 'data_import' }
  ```
- [ ] **Frontend Route**: Update `frontend/src/App.jsx` to add route `/import-contacts` → `<ImportContacts />`.

---

## Module: Inventory

### Feature: Print Labels for Inventory Instances

**Description:** Generate and print barcode/QR code labels for coils/pallets.

- [ ] **Database**: Add `label_template` column to `branches` table:
  ```sql
  ALTER TABLE branches ADD COLUMN IF NOT EXISTS label_template TEXT;
  ```
- [ ] **Backend Controller**: Update `backend/src/controllers/inventoryController.js` to add:
  - `generateLabels()` - Accept array of instance IDs, return label data with barcodes
  - `getLabelTemplate()` - Get branch-specific label template
- [ ] **Backend Route**: Update `backend/src/routes/inventoryRoutes.js` to add:
  - `POST /api/inventory/instances/labels` → `generateLabels` with `requirePermission('stock_add_opening')`
- [ ] **Frontend Page**: Create `frontend/src/pages/PrintLabels.jsx` with:
  - Search/filter inventory instances
  - Multi-select instances for batch printing
  - Label preview panel
  - Print button (opens browser print dialog)
  - Label format options: Barcode, QR Code, Combined
  - Label size selector: Small (2x1"), Medium (3x2"), Large (4x3")
- [ ] **Frontend Component**: Create `frontend/src/components/inventory/LabelPreview.jsx` with barcode/QR rendering using `react-barcode` or `qrcode.react`.
- [ ] **Frontend Sidebar**: Already covered under Inventory menu - add sub-route.
- [ ] **Frontend Route**: Update `frontend/src/App.jsx` to add route `/inventory/print-labels` → `<PrintLabels />`.

### Feature: Update Price Functionality

**Description:** Bulk update product prices with history tracking.

- [ ] **Database**: Create `price_history` table:
  ```sql
  CREATE TABLE price_history (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      product_id UUID NOT NULL REFERENCES products(id),
      old_sale_price DECIMAL(15, 2),
      new_sale_price DECIMAL(15, 2),
      old_cost_price DECIMAL(15, 2),
      new_cost_price DECIMAL(15, 2),
      user_id UUID NOT NULL REFERENCES users(id),
      reason TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX idx_price_history_product_id ON price_history(product_id);
  ```
- [ ] **Backend Model**: Create `backend/src/models/PriceHistory.js` with fields: `id`, `product_id`, `old_sale_price`, `new_sale_price`, `old_cost_price`, `new_cost_price`, `user_id`, `reason`. Define associations: `belongsTo Product`, `belongsTo User`.
- [ ] **Backend Model**: Update `backend/src/models/index.js` to import and associate `PriceHistory`.
- [ ] **Backend Controller**: Update `backend/src/controllers/productController.js` to add:
  - `updatePrice()` - Update single product price with history logging
  - `bulkUpdatePrices()` - Bulk update multiple product prices
  - `getPriceHistory()` - Get price change history for a product
- [ ] **Backend Route**: Update `backend/src/routes/productRoutes.js` to add:
  - `PUT /api/products/:id/price` → `updatePrice` with `requirePermission('product_edit')`
  - `PUT /api/products/bulk-price` → `bulkUpdatePrices` with `requirePermission('product_edit')`
  - `GET /api/products/:id/price-history` → `getPriceHistory` with `requirePermission('product_view')`
- [ ] **Frontend Page**: Create `frontend/src/pages/UpdatePrice.jsx` with:
  - Product search/filter
  - Editable price columns (Sale Price, Cost Price)
  - Percentage adjustment option (+/- X%)
  - Preview changes before save
  - Save with reason input
  - Price history view modal
- [ ] **Frontend Route**: Update `frontend/src/App.jsx` to add route `/inventory/update-price` → `<UpdatePrice />`.

---

## Module: Manufacturing

### Feature: Production Status Page

**Description:** Dedicated page for viewing and managing production status across all orders.

- [ ] **Frontend Page**: Create `frontend/src/pages/ManufacturingStatus.jsx` with:
  - Kanban-style board with columns: Queue | In Production | Produced | Delivered
  - Drag-and-drop status update (optional enhancement)
  - Filter by: Date Range, Branch, Customer, Product
  - Order cards showing: Invoice #, Customer, Products, Quantities
  - Click to expand full order details
  - Quick action buttons: Mark Produced, Mark Delivered
  - Statistics bar: Total in Queue, Today's Production, Pending Delivery
- [ ] **Frontend Route**: Update `frontend/src/App.jsx` to add route `/manufacturing/status` → `<ManufacturingStatus />`.
- [ ] **Frontend Sidebar**: Update `frontend/src/components/layout/Sidebar.jsx` to add:
  ```javascript
  { name: 'Manufacturing', path: '/manufacturing/status', icon: Factory, permission: 'production_view_queue' }
  ```

### Feature: Recipes Management Page

**Description:** Full CRUD interface for managing manufacturing recipes.

- [ ] **Frontend Page**: Create `frontend/src/pages/Recipes.jsx` with:
  - Recipe list table: Name, Virtual Product, Raw Product, Conversion Factor, Wastage Margin, Actions
  - Add Recipe modal with form:
    - Recipe Name (text)
    - Virtual Product (dropdown - filter type='manufactured_virtual')
    - Raw Product (dropdown - filter type='raw_tracked')
    - Conversion Factor (number, e.g., "1 Meter = 0.8 KG")
    - Wastage Margin % (number)
  - Edit Recipe modal
  - Delete Recipe with confirmation
  - Calculation preview: "100 Meters will require 80 KG of raw material + 2% wastage = 81.6 KG"
- [ ] **Frontend Route**: Update `frontend/src/App.jsx` to add route `/manufacturing/recipes` → `<Recipes />`.
- [ ] **Frontend Sidebar**: Update existing Manufacturing menu or add sub-nav:
  ```javascript
  { name: 'Recipes', path: '/manufacturing/recipes', icon: FileText, permission: 'recipe_manage' }
  ```

---

## Module: Purchases

### Feature: Purchase Returns Processing

**Description:** Process returns to suppliers with inventory reversal.

- [ ] **Database**: Create `purchase_returns` table:
  ```sql
  CREATE TABLE purchase_returns (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      return_number VARCHAR(100) NOT NULL UNIQUE,
      purchase_id UUID NOT NULL REFERENCES purchases(id),
      supplier_id UUID REFERENCES suppliers(id),
      branch_id UUID NOT NULL REFERENCES branches(id),
      user_id UUID NOT NULL REFERENCES users(id),
      total_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
      reason TEXT NOT NULL,
      status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'completed', 'cancelled')),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX idx_purchase_returns_purchase_id ON purchase_returns(purchase_id);
  CREATE INDEX idx_purchase_returns_branch_id ON purchase_returns(branch_id);
  ```
- [ ] **Database**: Create `purchase_return_items` table:
  ```sql
  CREATE TABLE purchase_return_items (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      purchase_return_id UUID NOT NULL REFERENCES purchase_returns(id) ON DELETE CASCADE,
      purchase_item_id UUID NOT NULL REFERENCES purchase_items(id),
      product_id UUID NOT NULL REFERENCES products(id),
      quantity DECIMAL(15, 3) NOT NULL,
      unit_cost DECIMAL(15, 2) NOT NULL,
      subtotal DECIMAL(15, 2) NOT NULL,
      inventory_instance_id UUID REFERENCES inventory_instances(id),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
  ```
- [ ] **Database**: Add permission slugs:
  ```sql
  INSERT INTO permissions (slug, group_name) VALUES
      ('purchase_return_view', 'purchases'),
      ('purchase_return_create', 'purchases'),
      ('purchase_return_approve', 'purchases');
  ```
- [ ] **Backend Model**: Create `backend/src/models/PurchaseReturn.js` with associations to Purchase, Supplier, Branch, User.
- [ ] **Backend Model**: Create `backend/src/models/PurchaseReturnItem.js` with associations.
- [ ] **Backend Model**: Update `backend/src/models/index.js` to import and associate new models.
- [ ] **Backend Controller**: Create `backend/src/controllers/purchaseReturnController.js` with methods:
  - `getPurchaseReturns()` - List returns (branch-filtered)
  - `getPurchaseReturnById()` - Get single return with items
  - `createPurchaseReturn()` - Create return from purchase
  - `approvePurchaseReturn()` - Approve and reverse inventory
  - `cancelPurchaseReturn()` - Cancel pending return
- [ ] **Backend Route**: Create `backend/src/routes/purchaseReturnRoutes.js`:
  - `GET /api/purchases/returns` → `getPurchaseReturns` with `requirePermission('purchase_return_view')`
  - `GET /api/purchases/returns/:id` → `getPurchaseReturnById` with `requirePermission('purchase_return_view')`
  - `POST /api/purchases/returns` → `createPurchaseReturn` with `requirePermission('purchase_return_create')`
  - `PUT /api/purchases/returns/:id/approve` → `approvePurchaseReturn` with `requirePermission('purchase_return_approve')`
  - `PUT /api/purchases/returns/:id/cancel` → `cancelPurchaseReturn` with `requirePermission('purchase_return_create')`
- [ ] **Backend Route**: Update `backend/src/routes/index.js` to mount return routes under purchases.
- [ ] **Frontend Page**: Create `frontend/src/pages/PurchaseReturns.jsx` with:
  - Returns list table: Return #, Purchase #, Supplier, Amount, Status, Date, Actions
  - Create Return modal (select purchase, select items to return, enter reason)
  - View Return details modal
  - Approve/Cancel buttons for pending returns
  - Filter by: Status, Date Range, Supplier
- [ ] **Frontend Route**: Update `frontend/src/App.jsx` to add route `/purchases/returns` → `<PurchaseReturns />`.

---

## Module: Sales

### Feature: Sales List Page

**Description:** Comprehensive sales order listing with filters and actions.

- [ ] **Frontend Page**: Create `frontend/src/pages/Sales.jsx` with:
  - Sales list table: Invoice #, Date, Customer, Branch, Total, Payment Status, Production Status, Actions
  - Filters: Date Range, Branch, Customer, Payment Status, Production Status
  - Search by invoice number
  - View order details modal
  - Quick actions: Print Invoice, View Receipt
  - Export to CSV/Excel button
  - Pagination with configurable page size
- [ ] **Frontend Route**: Update `frontend/src/App.jsx` to add route `/sales` → `<Sales />`.
- [ ] **Frontend Sidebar**: Update `frontend/src/components/layout/Sidebar.jsx` to add:
  ```javascript
  { name: 'Sales', path: '/sales', icon: ClipboardList, permission: 'sale_view_all' }
  ```

### Feature: Add Sale Page

**Description:** Non-POS interface for creating sales orders.

- [ ] **Frontend Page**: Create `frontend/src/pages/AddSale.jsx` with:
  - Customer selection (search/create new)
  - Agent selection (optional)
  - Product selection with quantity and price editing
  - Discount application (line-level and order-level)
  - Tax calculation display
  - Coil selection modal for manufactured_virtual products
  - Order summary panel
  - Save as Draft / Save as Quotation / Create Invoice buttons
  - Payment status selection
- [ ] **Frontend Route**: Update `frontend/src/App.jsx` to add route `/sales/add` → `<AddSale />`.

### Feature: POS List Page

**Description:** List of all POS transactions.

- [ ] **Frontend Page**: Create `frontend/src/pages/POSList.jsx` with:
  - Transaction list: Invoice #, Time, Cashier, Items Count, Total, Payment Method
  - Today's transactions by default
  - Date filter
  - Daily summary: Total Sales, Cash Sales, Transfer Sales, POS Sales
  - Receipt reprint option
- [ ] **Frontend Route**: Update `frontend/src/App.jsx` to add route `/sales/pos-list` → `<POSList />`.

### Feature: Drafts Management

**Description:** Save and manage draft sales orders.

- [ ] **Database**: Add `order_type` column to `sales_orders`:
  ```sql
  ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS order_type VARCHAR(20) DEFAULT 'invoice' CHECK (order_type IN ('draft', 'quotation', 'invoice'));
  ```
- [ ] **Backend Controller**: Update `backend/src/controllers/salesController.js` to add:
  - `getDrafts()` - List draft orders
  - `saveDraft()` - Create/update draft
  - `convertDraftToInvoice()` - Convert draft to invoice
  - `deleteDraft()` - Delete draft order
- [ ] **Backend Route**: Update `backend/src/routes/salesRoutes.js` to add:
  - `GET /api/sales/drafts` → `getDrafts` with `requirePermission('draft_manage')`
  - `POST /api/sales/drafts` → `saveDraft` with `requirePermission('draft_manage')`
  - `PUT /api/sales/drafts/:id` → `saveDraft` with `requirePermission('draft_manage')`
  - `POST /api/sales/drafts/:id/convert` → `convertDraftToInvoice` with `requirePermission('draft_manage')`
  - `DELETE /api/sales/drafts/:id` → `deleteDraft` with `requirePermission('draft_manage')`
- [ ] **Frontend Page**: Create `frontend/src/pages/Drafts.jsx` with:
  - Draft list table: Draft #, Customer, Items, Total, Created Date, Last Modified, Actions
  - Edit draft button → Opens AddSale with draft data
  - Convert to Invoice button
  - Delete draft button
- [ ] **Frontend Route**: Update `frontend/src/App.jsx` to add route `/sales/drafts` → `<Drafts />`.

### Feature: Quotations Management

**Description:** Create and manage sales quotations.

- [ ] **Database**: Add quotation-specific columns to `sales_orders`:
  ```sql
  ALTER TABLE sales_orders 
      ADD COLUMN IF NOT EXISTS valid_until DATE,
      ADD COLUMN IF NOT EXISTS quotation_notes TEXT;
  ```
- [ ] **Backend Controller**: Update `backend/src/controllers/salesController.js` to add:
  - `getQuotations()` - List quotations
  - `createQuotation()` - Create quotation
  - `convertQuotationToInvoice()` - Convert quotation to invoice
  - `expireQuotations()` - Background job to mark expired quotations
- [ ] **Backend Route**: Update `backend/src/routes/salesRoutes.js` to add:
  - `GET /api/sales/quotations` → `getQuotations` with `requirePermission('quote_manage')`
  - `POST /api/sales/quotations` → `createQuotation` with `requirePermission('quote_manage')`
  - `POST /api/sales/quotations/:id/convert` → `convertQuotationToInvoice` with `requirePermission('quote_manage')`
- [ ] **Frontend Page**: Create `frontend/src/pages/Quotations.jsx` with:
  - Quotation list: Quote #, Customer, Total, Valid Until, Status (Active/Expired), Actions
  - Create quotation (similar to AddSale)
  - Print quotation PDF
  - Convert to Invoice button
  - Filter by: Status, Date Range, Customer
- [ ] **Frontend Route**: Update `frontend/src/App.jsx` to add route `/sales/quotations` → `<Quotations />`.

### Feature: Sales Returns Page

**Description:** Process customer returns and refunds.

- [ ] **Database**: Create `sales_returns` table:
  ```sql
  CREATE TABLE sales_returns (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      return_number VARCHAR(100) NOT NULL UNIQUE,
      sales_order_id UUID NOT NULL REFERENCES sales_orders(id),
      customer_id UUID REFERENCES customers(id),
      branch_id UUID NOT NULL REFERENCES branches(id),
      user_id UUID NOT NULL REFERENCES users(id),
      total_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
      reason TEXT NOT NULL,
      refund_method VARCHAR(20) CHECK (refund_method IN ('cash', 'credit', 'replacement')),
      status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'completed', 'cancelled')),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
  ```
- [ ] **Database**: Create `sales_return_items` table:
  ```sql
  CREATE TABLE sales_return_items (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      sales_return_id UUID NOT NULL REFERENCES sales_returns(id) ON DELETE CASCADE,
      sales_item_id UUID NOT NULL REFERENCES sales_items(id),
      product_id UUID NOT NULL REFERENCES products(id),
      quantity DECIMAL(15, 3) NOT NULL,
      unit_price DECIMAL(15, 2) NOT NULL,
      subtotal DECIMAL(15, 2) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
  ```
- [ ] **Database**: Add permission slugs:
  ```sql
  INSERT INTO permissions (slug, group_name) VALUES
      ('sale_return_view', 'sales_pos'),
      ('sale_return_create', 'sales_pos'),
      ('sale_return_approve', 'sales_pos');
  ```
- [ ] **Backend Model**: Create `backend/src/models/SalesReturn.js` with associations.
- [ ] **Backend Model**: Create `backend/src/models/SalesReturnItem.js` with associations.
- [ ] **Backend Model**: Update `backend/src/models/index.js` to import and associate new models.
- [ ] **Backend Controller**: Create `backend/src/controllers/salesReturnController.js` with methods:
  - `getSalesReturns()` - List returns
  - `getSalesReturnById()` - Get return details
  - `createSalesReturn()` - Create return from sales order
  - `approveSalesReturn()` - Approve and process refund/credit
  - `cancelSalesReturn()` - Cancel pending return
- [ ] **Backend Route**: Create `backend/src/routes/salesReturnRoutes.js` and register in index.
- [ ] **Frontend Page**: Create `frontend/src/pages/SalesReturns.jsx` with:
  - Returns list table
  - Create Return modal (select order, select items, enter reason, select refund method)
  - Approve/Cancel actions
  - Filter by status, date, customer
- [ ] **Frontend Route**: Update `frontend/src/App.jsx` to add route `/sales/returns` → `<SalesReturns />`.

### Feature: Discounts Management

**Description:** Manage discount rules and promotions.

- [ ] **Database**: Create `discounts` table:
  ```sql
  CREATE TABLE discounts (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      name VARCHAR(200) NOT NULL,
      code VARCHAR(50) UNIQUE,
      type VARCHAR(20) NOT NULL CHECK (type IN ('percentage', 'fixed')),
      value DECIMAL(15, 2) NOT NULL,
      min_order_amount DECIMAL(15, 2),
      max_discount_amount DECIMAL(15, 2),
      valid_from DATE,
      valid_until DATE,
      usage_limit INTEGER,
      usage_count INTEGER DEFAULT 0,
      is_active BOOLEAN DEFAULT true,
      applies_to VARCHAR(20) DEFAULT 'all' CHECK (applies_to IN ('all', 'products', 'categories')),
      branch_id UUID REFERENCES branches(id),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
  ```
- [ ] **Database**: Create `discount_products` junction table for product-specific discounts.
- [ ] **Database**: Add permission slugs:
  ```sql
  INSERT INTO permissions (slug, group_name) VALUES
      ('discount_view', 'sales_pos'),
      ('discount_manage', 'sales_pos');
  ```
- [ ] **Backend Model**: Create `backend/src/models/Discount.js` with associations.
- [ ] **Backend Model**: Update `backend/src/models/index.js`.
- [ ] **Backend Controller**: Create `backend/src/controllers/discountController.js` with CRUD methods plus `validateDiscount()` for checking code validity.
- [ ] **Backend Route**: Create `backend/src/routes/discountRoutes.js` and register.
- [ ] **Frontend Page**: Create `frontend/src/pages/Discounts.jsx` with:
  - Discount list: Name, Code, Type, Value, Valid Period, Usage, Status, Actions
  - Create/Edit discount modal
  - Activate/Deactivate toggle
  - Usage statistics
- [ ] **Frontend Route**: Update `frontend/src/App.jsx` to add route `/sales/discounts` → `<Discounts />`.

### Feature: Custom Delivery Notes

**Description:** Generate and print custom delivery notes for orders.

- [ ] **Database**: Create `delivery_note_templates` table:
  ```sql
  CREATE TABLE delivery_note_templates (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      name VARCHAR(200) NOT NULL,
      template_html TEXT NOT NULL,
      is_default BOOLEAN DEFAULT false,
      branch_id UUID REFERENCES branches(id),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
  ```
- [ ] **Backend Controller**: Create `backend/src/controllers/deliveryNoteController.js` with:
  - `getTemplates()` - List templates
  - `createTemplate()` - Create new template
  - `updateTemplate()` - Update template
  - `generateDeliveryNote()` - Generate PDF from order + template
- [ ] **Backend Route**: Create `backend/src/routes/deliveryNoteRoutes.js` and register.
- [ ] **Frontend Page**: Create `frontend/src/pages/DeliveryNotes.jsx` with:
  - Template list and management
  - Template editor with placeholders: {{customer_name}}, {{invoice_number}}, {{items}}, etc.
  - Preview functionality
  - Generate from Order: Select order → Select template → Generate PDF
- [ ] **Frontend Route**: Update `frontend/src/App.jsx` to add route `/sales/delivery-notes` → `<DeliveryNotes />`.

---

## Module: Payroll

### Feature: Salary Calculations and Commissions

**Description:** Calculate employee salaries with commission integration.

- [ ] **Database**: Add salary-related columns to `users`:
  ```sql
  ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS base_salary DECIMAL(15, 2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS salary_type VARCHAR(20) DEFAULT 'monthly' CHECK (salary_type IN ('monthly', 'hourly', 'commission_only'));
  ```
- [ ] **Database**: Update `payroll_records` table:
  ```sql
  ALTER TABLE payroll_records 
      ADD COLUMN IF NOT EXISTS base_salary DECIMAL(15, 2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS overtime_hours DECIMAL(5, 2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS overtime_pay DECIMAL(15, 2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS commission_total DECIMAL(15, 2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS bonus DECIMAL(15, 2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS tax_deduction DECIMAL(15, 2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS other_deductions DECIMAL(15, 2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'paid'));
  ```
- [ ] **Backend Controller**: Update `backend/src/controllers/payrollController.js` to add:
  - `calculatePayroll()` - Auto-calculate payroll for month (base salary + commissions)
  - `approvePayroll()` - Approve payroll record
  - `markPayrollPaid()` - Mark as paid
  - `getPayrollSummary()` - Branch-level payroll summary
- [ ] **Backend Route**: Update `backend/src/routes/payrollRoutes.js` to add:
  - `POST /api/payroll/calculate` → `calculatePayroll` with `requirePermission('payroll_manage')`
  - `PUT /api/payroll/:id/approve` → `approvePayroll` with `requirePermission('payroll_manage')`
  - `PUT /api/payroll/:id/pay` → `markPayrollPaid` with `requirePermission('payroll_manage')`
  - `GET /api/payroll/summary` → `getPayrollSummary` with `requirePermission('payroll_view')`
- [ ] **Frontend Page**: Update `frontend/src/pages/Payroll.jsx` to add:
  - Calculate Payroll button (select month/year, auto-calculate for all employees)
  - Payroll breakdown: Base Salary, Overtime, Commissions, Bonus, Deductions, Net Pay
  - Approve and Pay workflow buttons
  - Export payroll to CSV/PDF
  - Employee salary configuration link

---

## Module: Accounts & Reports

### Feature: Comprehensive Reporting System

**Description:** Full reporting dashboard with P&L, stock, sales, and customer reports.

- [ ] **Backend Controller**: Create `backend/src/controllers/reportController.js` with methods:
  - `getProfitLossReport()` - P&L statement (Revenue - COGS - Expenses)
  - `getSalesByPeriod()` - Sales summary by day/week/month
  - `getSalesByProduct()` - Top selling products
  - `getSalesByCustomer()` - Customer purchase history
  - `getSalesByAgent()` - Agent performance
  - `getStockValueReport()` - Current stock valuation
  - `getStockMovementReport()` - Stock in/out history
  - `getTaxReport()` - Tax collected summary
  - `getExpenseReport()` - Expenses by category
  - `getSupplierReport()` - Purchases by supplier
  - `getCustomerLedgerReport()` - Customer balance aging
- [ ] **Backend Route**: Create `backend/src/routes/reportRoutes.js`:
  - `GET /api/reports/profit-loss` with `requirePermission('report_view_financial')`
  - `GET /api/reports/sales` with `requirePermission('report_view_sales')`
  - `GET /api/reports/stock` with `requirePermission('report_view_stock_value')`
  - `GET /api/reports/tax` with `requirePermission('report_view_financial')`
  - `GET /api/reports/expenses` with `requirePermission('report_view_financial')`
  - `GET /api/reports/customers` with `requirePermission('report_view_sales')`
  - `GET /api/reports/suppliers` with `requirePermission('report_view_financial')`
- [ ] **Backend Route**: Update `backend/src/routes/index.js` to register `reportRoutes` at `/api/reports`.
- [ ] **Frontend Page**: Create `frontend/src/pages/Reports.jsx` with:
  - Report type selector (tabs or dropdown)
  - Date range filter
  - Branch filter (Super Admin)
  - Interactive charts using `recharts`:
    - Line chart for sales trends
    - Bar chart for product performance
    - Pie chart for expense breakdown
  - Data tables with sorting and filtering
  - Export buttons: PDF, Excel, CSV
- [ ] **Frontend Route**: Update `frontend/src/App.jsx` to add route `/accounts/reports` → `<Reports />`.
- [ ] **Frontend Sidebar**: Update `frontend/src/components/layout/Sidebar.jsx` to add:
  ```javascript
  { name: 'Reports', path: '/accounts/reports', icon: BarChart3, permission: 'report_view_sales' }
  ```

### Feature: Payment Accounts Management

**Description:** Manage bank accounts and payment method configurations.

- [ ] **Database**: Create `payment_accounts` table:
  ```sql
  CREATE TABLE payment_accounts (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      name VARCHAR(200) NOT NULL,
      account_type VARCHAR(50) NOT NULL CHECK (account_type IN ('cash', 'bank', 'mobile_money', 'pos_terminal')),
      account_number VARCHAR(100),
      bank_name VARCHAR(200),
      opening_balance DECIMAL(15, 2) DEFAULT 0,
      current_balance DECIMAL(15, 2) DEFAULT 0,
      is_active BOOLEAN DEFAULT true,
      branch_id UUID REFERENCES branches(id),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
  ```
- [ ] **Database**: Create `account_transactions` table:
  ```sql
  CREATE TABLE account_transactions (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      account_id UUID NOT NULL REFERENCES payment_accounts(id),
      transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('deposit', 'withdrawal', 'transfer', 'payment_received', 'payment_made')),
      amount DECIMAL(15, 2) NOT NULL,
      reference_type VARCHAR(50),
      reference_id UUID,
      notes TEXT,
      user_id UUID NOT NULL REFERENCES users(id),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
  ```
- [ ] **Database**: Add permission slugs:
  ```sql
  INSERT INTO permissions (slug, group_name) VALUES
      ('payment_account_view', 'payments'),
      ('payment_account_manage', 'payments');
  ```
- [ ] **Backend Model**: Create `backend/src/models/PaymentAccount.js` with associations.
- [ ] **Backend Model**: Create `backend/src/models/AccountTransaction.js` with associations.
- [ ] **Backend Model**: Update `backend/src/models/index.js`.
- [ ] **Backend Controller**: Create `backend/src/controllers/paymentAccountController.js` with:
  - `getPaymentAccounts()` - List accounts
  - `createPaymentAccount()` - Create new account
  - `updatePaymentAccount()` - Update account details
  - `getAccountTransactions()` - Get transaction history
  - `recordDeposit()` - Record manual deposit
  - `recordWithdrawal()` - Record manual withdrawal
  - `transferBetweenAccounts()` - Internal transfer
- [ ] **Backend Route**: Create `backend/src/routes/paymentAccountRoutes.js` and register.
- [ ] **Frontend Page**: Create `frontend/src/pages/PaymentAccounts.jsx` with:
  - Account list: Name, Type, Bank, Account #, Balance, Status, Actions
  - Create/Edit account modal
  - Account detail view with transaction history
  - Record Deposit/Withdrawal modals
  - Transfer between accounts modal
  - Balance reconciliation
- [ ] **Frontend Route**: Update `frontend/src/App.jsx` to add route `/accounts/payment-accounts` → `<PaymentAccounts />`.
- [ ] **Frontend Sidebar**: Update sidebar to add:
  ```javascript
  { name: 'Payment Accounts', path: '/accounts/payment-accounts', icon: Wallet, permission: 'payment_account_view' }
  ```

### Feature: Financial Statements

**Description:** Generate Balance Sheet, Trial Balance, and Cash Flow statements.

- [ ] **Backend Controller**: Update `backend/src/controllers/reportController.js` to add:
  - `getBalanceSheet()` - Assets, Liabilities, Equity
  - `getTrialBalance()` - Debit/Credit summary
  - `getCashFlowStatement()` - Operating, Investing, Financing activities
- [ ] **Backend Route**: Update `backend/src/routes/reportRoutes.js` to add:
  - `GET /api/reports/balance-sheet` with `requirePermission('report_view_financial')`
  - `GET /api/reports/trial-balance` with `requirePermission('report_view_financial')`
  - `GET /api/reports/cash-flow` with `requirePermission('report_view_financial')`
- [ ] **Frontend Page**: Update `frontend/src/pages/Reports.jsx` to add Financial Statements tab with:
  - Balance Sheet view
  - Trial Balance view
  - Cash Flow Statement view
  - Period selection
  - Export to PDF

---

## Module: Settings

### Feature: Business Settings Management

**Description:** Configure core business information.

- [ ] **Database**: Create `business_settings` table:
  ```sql
  CREATE TABLE business_settings (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      setting_key VARCHAR(100) NOT NULL UNIQUE,
      setting_value TEXT,
      setting_type VARCHAR(20) DEFAULT 'string' CHECK (setting_type IN ('string', 'number', 'boolean', 'json')),
      category VARCHAR(50) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
  
  -- Seed default settings
  INSERT INTO business_settings (setting_key, setting_value, setting_type, category) VALUES
      ('business_name', 'Aify Global', 'string', 'general'),
      ('business_address', '', 'string', 'general'),
      ('business_phone', '', 'string', 'general'),
      ('business_email', '', 'string', 'general'),
      ('business_logo', '', 'string', 'general'),
      ('currency_symbol', '₦', 'string', 'general'),
      ('currency_code', 'NGN', 'string', 'general'),
      ('date_format', 'DD/MM/YYYY', 'string', 'general'),
      ('time_format', '24h', 'string', 'general'),
      ('fiscal_year_start', '01-01', 'string', 'financial');
  ```
- [ ] **Database**: Add permission slug:
  ```sql
  INSERT INTO permissions (slug, group_name) VALUES
      ('settings_manage', 'settings');
  ```
- [ ] **Backend Model**: Create `backend/src/models/BusinessSetting.js`.
- [ ] **Backend Model**: Update `backend/src/models/index.js`.
- [ ] **Backend Controller**: Create `backend/src/controllers/settingsController.js` with:
  - `getSettings()` - Get all settings or by category
  - `updateSetting()` - Update single setting
  - `bulkUpdateSettings()` - Update multiple settings
- [ ] **Backend Route**: Create `backend/src/routes/settingsRoutes.js`:
  - `GET /api/settings` with `authenticate`
  - `PUT /api/settings/:key` with `requirePermission('settings_manage')`
  - `PUT /api/settings` with `requirePermission('settings_manage')`
- [ ] **Backend Route**: Update `backend/src/routes/index.js` to register settings routes.
- [ ] **Frontend Page**: Create `frontend/src/pages/BusinessSettings.jsx` with:
  - Business name, address, phone, email fields
  - Logo upload
  - Currency configuration
  - Date/Time format preferences
  - Fiscal year configuration
  - Save button
- [ ] **Frontend Route**: Update `frontend/src/App.jsx` to add route `/settings/business` → `<BusinessSettings />`.

### Feature: Business Locations Page

**Description:** Manage branch locations.

- [ ] **Backend Controller**: Update `backend/src/controllers/branchController.js` to add:
  - `updateBranch()` - Update branch details
  - `deleteBranch()` - Soft delete branch
- [ ] **Frontend Page**: Create `frontend/src/pages/BusinessLocations.jsx` with:
  - Branch list: Name, Code, Address, User Count, Actions
  - Add Branch modal
  - Edit Branch modal
  - View branch details with assigned users
- [ ] **Frontend Route**: Update `frontend/src/App.jsx` to add route `/settings/locations` → `<BusinessLocations />`.

### Feature: Invoice Settings Page

**Description:** Configure invoice numbering, templates, and default terms.

- [ ] **Database**: Add invoice settings to `business_settings`:
  ```sql
  INSERT INTO business_settings (setting_key, setting_value, setting_type, category) VALUES
      ('invoice_prefix', 'INV', 'string', 'invoice'),
      ('invoice_footer', 'Thank you for your business!', 'string', 'invoice'),
      ('invoice_terms', 'Payment due within 30 days', 'string', 'invoice'),
      ('invoice_show_tax', 'true', 'boolean', 'invoice'),
      ('invoice_show_discount', 'true', 'boolean', 'invoice');
  ```
- [ ] **Frontend Page**: Create `frontend/src/pages/InvoiceSettings.jsx` with:
  - Invoice prefix configuration
  - Default terms and conditions text area
  - Footer text
  - Show/hide tax toggle
  - Show/hide discount toggle
  - Invoice template preview
- [ ] **Frontend Route**: Update `frontend/src/App.jsx` to add route `/settings/invoice` → `<InvoiceSettings />`.

### Feature: Barcode Settings Page

**Description:** Configure barcode generation preferences.

- [ ] **Database**: Add barcode settings to `business_settings`:
  ```sql
  INSERT INTO business_settings (setting_key, setting_value, setting_type, category) VALUES
      ('barcode_format', 'CODE128', 'string', 'barcode'),
      ('barcode_width', '2', 'number', 'barcode'),
      ('barcode_height', '50', 'number', 'barcode'),
      ('barcode_show_text', 'true', 'boolean', 'barcode'),
      ('label_width_mm', '50', 'number', 'barcode'),
      ('label_height_mm', '25', 'number', 'barcode');
  ```
- [ ] **Frontend Page**: Create `frontend/src/pages/BarcodeSettings.jsx` with:
  - Barcode format selector: CODE128, CODE39, EAN13, QR
  - Barcode dimensions (width, height)
  - Show text below barcode toggle
  - Label size configuration
  - Preview barcode with sample SKU
- [ ] **Frontend Route**: Update `frontend/src/App.jsx` to add route `/settings/barcode` → `<BarcodeSettings />`.

### Feature: Receipt Printers Page

**Description:** Configure receipt printer connections.

- [ ] **Database**: Create `receipt_printers` table:
  ```sql
  CREATE TABLE receipt_printers (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      name VARCHAR(200) NOT NULL,
      printer_type VARCHAR(50) NOT NULL CHECK (printer_type IN ('thermal', 'standard', 'network')),
      connection_type VARCHAR(50) NOT NULL CHECK (connection_type IN ('usb', 'network', 'bluetooth')),
      ip_address VARCHAR(50),
      port INTEGER,
      paper_width INTEGER DEFAULT 80,
      is_default BOOLEAN DEFAULT false,
      branch_id UUID REFERENCES branches(id),
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
  ```
- [ ] **Backend Model**: Create `backend/src/models/ReceiptPrinter.js`.
- [ ] **Backend Model**: Update `backend/src/models/index.js`.
- [ ] **Backend Controller**: Create `backend/src/controllers/printerController.js` with CRUD methods.
- [ ] **Backend Route**: Create `backend/src/routes/printerRoutes.js` and register.
- [ ] **Frontend Page**: Create `frontend/src/pages/ReceiptPrinters.jsx` with:
  - Printer list: Name, Type, Connection, IP/Port, Paper Width, Default, Status, Actions
  - Add/Edit printer modal
  - Test print button
  - Set as default button
- [ ] **Frontend Route**: Update `frontend/src/App.jsx` to add route `/settings/printers` → `<ReceiptPrinters />`.

### Feature: Tax Rates Page

**Description:** Manage tax rates and tax groups.

- [ ] **Database**: Create `tax_rates` table:
  ```sql
  CREATE TABLE tax_rates (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      name VARCHAR(100) NOT NULL,
      rate DECIMAL(5, 2) NOT NULL CHECK (rate >= 0 AND rate <= 100),
      is_compound BOOLEAN DEFAULT false,
      is_default BOOLEAN DEFAULT false,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
  
  -- Seed default tax rates
  INSERT INTO tax_rates (name, rate, is_default) VALUES
      ('VAT', 7.5, true),
      ('No Tax', 0, false);
  ```
- [ ] **Database**: Add `tax_rate_id` to products:
  ```sql
  ALTER TABLE products ADD COLUMN IF NOT EXISTS tax_rate_id UUID REFERENCES tax_rates(id);
  ```
- [ ] **Backend Model**: Create `backend/src/models/TaxRate.js`.
- [ ] **Backend Model**: Update `backend/src/models/index.js`.
- [ ] **Backend Controller**: Create `backend/src/controllers/taxController.js` with CRUD methods.
- [ ] **Backend Route**: Create `backend/src/routes/taxRoutes.js` and register.
- [ ] **Frontend Page**: Create `frontend/src/pages/TaxRates.jsx` with:
  - Tax rate list: Name, Rate %, Compound, Default, Status, Actions
  - Add/Edit tax rate modal
  - Set as default button
  - Activate/Deactivate toggle
- [ ] **Frontend Route**: Update `frontend/src/App.jsx` to add route `/settings/tax` → `<TaxRates />`.

---

## Module: Dashboard

### Feature: Advanced Dashboard Graphs

**Description:** Rich dashboard with sales, inventory, and financial metrics visualization.

- [ ] **Backend Controller**: Create `backend/src/controllers/dashboardController.js` with:
  - `getDashboardStats()` - Summary statistics (today's sales, pending payments, low stock alerts, production queue count)
  - `getSalesChart()` - Sales data for chart (last 7/30/90 days)
  - `getTopProducts()` - Best selling products
  - `getTopCustomers()` - Highest spending customers
  - `getRecentActivity()` - Recent sales, payments, purchases
  - `getLowStockAlerts()` - Products/instances below threshold
  - `getPendingActions()` - Items requiring attention
- [ ] **Backend Route**: Create `backend/src/routes/dashboardRoutes.js`:
  - `GET /api/dashboard/stats` with `authenticate`
  - `GET /api/dashboard/sales-chart` with `authenticate`
  - `GET /api/dashboard/top-products` with `authenticate`
  - `GET /api/dashboard/recent-activity` with `authenticate`
  - `GET /api/dashboard/alerts` with `authenticate`
- [ ] **Backend Route**: Update `backend/src/routes/index.js` to register dashboard routes.
- [ ] **Frontend Page**: Update `frontend/src/pages/Dashboard.jsx` to include:
  - KPI Cards: Today's Sales, Pending Payments, Items in Production, Low Stock Count
  - Sales Trend Chart (Line chart - last 7/30 days toggle)
  - Top 5 Products (Bar chart)
  - Top 5 Customers (Bar chart)
  - Recent Activity Feed (last 10 transactions)
  - Low Stock Alerts panel
  - Pending Actions panel (unconfirmed payments, queue items)
  - Quick action buttons: New Sale, New Payment, View Reports
  - Date range selector for charts

---

## Module: Print & Documents

### Feature: Document Printing System

**Description:** PDF generation for invoices, labels, reports, and receipts.

- [ ] **Backend Service**: Create `backend/src/services/pdfService.js` using `puppeteer` or `pdfkit`:
  - `generateInvoicePDF()` - Generate invoice PDF from sales order
  - `generateQuotationPDF()` - Generate quotation PDF
  - `generateReceiptPDF()` - Generate receipt (smaller format)
  - `generateDeliveryNotePDF()` - Generate delivery note
  - `generateLabelPDF()` - Generate barcode labels
  - `generateReportPDF()` - Generate report PDF from data
- [ ] **Backend Controller**: Create `backend/src/controllers/printController.js` with:
  - `printInvoice()` - Return invoice PDF
  - `printQuotation()` - Return quotation PDF
  - `printReceipt()` - Return receipt PDF
  - `printDeliveryNote()` - Return delivery note PDF
  - `printLabels()` - Return label sheet PDF
  - `printReport()` - Return report PDF
- [ ] **Backend Route**: Create `backend/src/routes/printRoutes.js`:
  - `GET /api/print/invoice/:id` → PDF response
  - `GET /api/print/quotation/:id` → PDF response
  - `GET /api/print/receipt/:id` → PDF response
  - `GET /api/print/delivery-note/:id` → PDF response
  - `POST /api/print/labels` → PDF response (array of instance IDs)
  - `POST /api/print/report` → PDF response (report type + params)
- [ ] **Backend Route**: Update `backend/src/routes/index.js` to register print routes.
- [ ] **Frontend Utility**: Create `frontend/src/utils/print.js` with helper functions:
  - `openPrintPreview(url)` - Open PDF in new tab for printing
  - `downloadPDF(url, filename)` - Download PDF file
- [ ] **Frontend Components**: Add Print buttons throughout the app:
  - Sales list → Print Invoice
  - Quotations list → Print Quotation
  - POS → Print Receipt
  - Reports → Export to PDF
  - Inventory → Print Labels

---

## Module: API Enhancements

### Feature: Complete API Endpoints

**Description:** Ensure all API endpoints are fully implemented per specification.

- [ ] **Backend Route**: Audit and complete missing endpoints in `salesRoutes.js`:
  - `DELETE /api/sales/:id` - Cancel/void sales order
  - `PUT /api/sales/:id` - Update sales order (if draft)
- [ ] **Backend Route**: Audit and complete missing endpoints in `customerRoutes.js`:
  - `GET /api/customers/:id/orders` - Get customer order history
  - `GET /api/customers/:id/balance` - Get customer balance summary
- [ ] **Backend Route**: Audit and complete missing endpoints in `supplierRoutes.js`:
  - `GET /api/suppliers/:id/purchases` - Get supplier purchase history
  - `GET /api/suppliers/:id/balance` - Get supplier balance summary
- [ ] **Backend Route**: Audit and complete missing endpoints in `inventoryRoutes.js`:
  - `GET /api/inventory/low-stock` - Get items below threshold
  - `GET /api/inventory/instances/:id/history` - Get instance movement history
- [ ] **Backend Route**: Audit and complete missing endpoints in `productRoutes.js`:
  - `GET /api/products/:id/stock` - Get product stock across branches
  - `GET /api/products/:id/sales` - Get product sales history
- [ ] **Backend Route**: Ensure all routes have proper:
  - Authentication middleware
  - Permission middleware
  - Input validation
  - Error handling
  - Response formatting consistency

---

## Sidebar Navigation Updates Summary

After implementing all features, update `frontend/src/components/layout/Sidebar.jsx` with the complete menu structure:

```javascript
const menuItems = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard, permission: null },
  { name: 'POS', path: '/pos', icon: ShoppingCart, permission: 'pos_access' },
  
  // Sales Section
  { name: 'Sales', path: '/sales', icon: ClipboardList, permission: 'sale_view_all' },
  { name: 'Drafts', path: '/sales/drafts', icon: FileEdit, permission: 'draft_manage' },
  { name: 'Quotations', path: '/sales/quotations', icon: FileText, permission: 'quote_manage' },
  { name: 'Sales Returns', path: '/sales/returns', icon: RotateCcw, permission: 'sale_return_view' },
  { name: 'Discounts', path: '/sales/discounts', icon: Percent, permission: 'discount_view' },
  
  // Inventory Section
  { name: 'Inventory', path: '/inventory', icon: Package, permission: 'product_view' },
  { name: 'Products', path: '/products', icon: Boxes, permission: 'product_view' },
  { name: 'Print Labels', path: '/inventory/print-labels', icon: Printer, permission: 'stock_add_opening' },
  
  // Purchases Section
  { name: 'Purchases', path: '/purchases', icon: ShoppingBag, permission: 'stock_add_opening' },
  { name: 'Purchase Returns', path: '/purchases/returns', icon: RotateCcw, permission: 'purchase_return_view' },
  
  // Manufacturing Section
  { name: 'Manufacturing', path: '/manufacturing/status', icon: Factory, permission: 'production_view_queue' },
  { name: 'Recipes', path: '/manufacturing/recipes', icon: Book, permission: 'recipe_manage' },
  { name: 'Shipments', path: '/shipments', icon: Truck, permission: 'production_view_queue' },
  
  // Payments & Accounts
  { name: 'Payments', path: '/payments', icon: CreditCard, permission: 'payment_view' },
  { name: 'Payment Accounts', path: '/accounts/payment-accounts', icon: Wallet, permission: 'payment_account_view' },
  
  // Expenses & Payroll
  { name: 'Expenses', path: '/expenses', icon: Receipt, permission: 'expense_view' },
  { name: 'Payroll', path: '/payroll', icon: Banknote, permission: 'payroll_view' },
  
  // Contacts
  { name: 'Customers', path: '/customers', icon: UserCheck, permission: 'payment_view' },
  { name: 'Suppliers', path: '/suppliers', icon: Building2, permission: 'product_view' },
  { name: 'Agents', path: '/agents', icon: UserPlus, permission: 'agent_view' },
  { name: 'Import Contacts', path: '/import-contacts', icon: Upload, permission: 'data_import' },
  
  // Reports
  { name: 'Reports', path: '/accounts/reports', icon: BarChart3, permission: 'report_view_sales' },
  
  // Administration
  { name: 'Users', path: '/users', icon: Users, permission: 'user_view' },
  { name: 'Roles', path: '/roles', icon: Shield, permission: 'role_manage' },
  
  // Settings
  { name: 'Settings', path: '/settings', icon: Settings, permission: 'product_add' },
];
```

---

## App.jsx Route Updates Summary

After implementing all features, ensure `frontend/src/App.jsx` includes all routes:

```javascript
// Sales Routes
<Route path="/sales" element={<ProtectedRoute><Layout><Sales /></Layout></ProtectedRoute>} />
<Route path="/sales/add" element={<ProtectedRoute><Layout><AddSale /></Layout></ProtectedRoute>} />
<Route path="/sales/pos-list" element={<ProtectedRoute><Layout><POSList /></Layout></ProtectedRoute>} />
<Route path="/sales/drafts" element={<ProtectedRoute><Layout><Drafts /></Layout></ProtectedRoute>} />
<Route path="/sales/quotations" element={<ProtectedRoute><Layout><Quotations /></Layout></ProtectedRoute>} />
<Route path="/sales/returns" element={<ProtectedRoute><Layout><SalesReturns /></Layout></ProtectedRoute>} />
<Route path="/sales/discounts" element={<ProtectedRoute><Layout><Discounts /></Layout></ProtectedRoute>} />
<Route path="/sales/delivery-notes" element={<ProtectedRoute><Layout><DeliveryNotes /></Layout></ProtectedRoute>} />

// Inventory Routes
<Route path="/inventory/print-labels" element={<ProtectedRoute><Layout><PrintLabels /></Layout></ProtectedRoute>} />
<Route path="/inventory/update-price" element={<ProtectedRoute><Layout><UpdatePrice /></Layout></ProtectedRoute>} />

// Purchases Routes
<Route path="/purchases/returns" element={<ProtectedRoute><Layout><PurchaseReturns /></Layout></ProtectedRoute>} />

// Manufacturing Routes
<Route path="/manufacturing/status" element={<ProtectedRoute><Layout><ManufacturingStatus /></Layout></ProtectedRoute>} />
<Route path="/manufacturing/recipes" element={<ProtectedRoute><Layout><Recipes /></Layout></ProtectedRoute>} />

// Accounts Routes
<Route path="/accounts/reports" element={<ProtectedRoute><Layout><Reports /></Layout></ProtectedRoute>} />
<Route path="/accounts/payment-accounts" element={<ProtectedRoute><Layout><PaymentAccounts /></Layout></ProtectedRoute>} />

// Settings Routes
<Route path="/settings/business" element={<ProtectedRoute><Layout><BusinessSettings /></Layout></ProtectedRoute>} />
<Route path="/settings/locations" element={<ProtectedRoute><Layout><BusinessLocations /></Layout></ProtectedRoute>} />
<Route path="/settings/invoice" element={<ProtectedRoute><Layout><InvoiceSettings /></Layout></ProtectedRoute>} />
<Route path="/settings/barcode" element={<ProtectedRoute><Layout><BarcodeSettings /></Layout></ProtectedRoute>} />
<Route path="/settings/printers" element={<ProtectedRoute><Layout><ReceiptPrinters /></Layout></ProtectedRoute>} />
<Route path="/settings/tax" element={<ProtectedRoute><Layout><TaxRates /></Layout></ProtectedRoute>} />

// User Management Routes
<Route path="/agents" element={<ProtectedRoute><Layout><Agents /></Layout></ProtectedRoute>} />

// Contacts Routes
<Route path="/import-contacts" element={<ProtectedRoute><Layout><ImportContacts /></Layout></ProtectedRoute>} />
```

---

## Permission Seed Data Summary

Add all new permission slugs to `database/init.sql`:

```sql
-- Agent Permissions
INSERT INTO permissions (slug, group_name) VALUES
    ('agent_view', 'user_management'),
    ('agent_add', 'user_management'),
    ('agent_edit', 'user_management'),
    ('agent_delete', 'user_management'),
    ('agent_commission_view', 'user_management'),
    ('agent_commission_manage', 'user_management');

-- Sales Returns Permissions
INSERT INTO permissions (slug, group_name) VALUES
    ('sale_return_view', 'sales_pos'),
    ('sale_return_create', 'sales_pos'),
    ('sale_return_approve', 'sales_pos');

-- Purchase Returns Permissions
INSERT INTO permissions (slug, group_name) VALUES
    ('purchase_return_view', 'purchases'),
    ('purchase_return_create', 'purchases'),
    ('purchase_return_approve', 'purchases');

-- Discount Permissions
INSERT INTO permissions (slug, group_name) VALUES
    ('discount_view', 'sales_pos'),
    ('discount_manage', 'sales_pos');

-- Payment Account Permissions
INSERT INTO permissions (slug, group_name) VALUES
    ('payment_account_view', 'payments'),
    ('payment_account_manage', 'payments');

-- Settings Permissions
INSERT INTO permissions (slug, group_name) VALUES
    ('settings_manage', 'settings');
```

---

## Execution Priority Order

### Phase 1: Core Sales Enhancement (High Priority)
1. Sales List Page
2. Add Sale Page  
3. Drafts Management
4. Quotations Management

### Phase 2: Returns & Adjustments (High Priority)
5. Sales Returns
6. Purchase Returns
7. Update Price Functionality

### Phase 3: Reporting & Accounts (Medium Priority)
8. Comprehensive Reporting System
9. Payment Accounts Management
10. Advanced Dashboard Graphs

### Phase 4: Settings & Configuration (Medium Priority)
11. Business Settings Management
12. Tax Rates Page
13. Invoice Settings Page

### Phase 5: Manufacturing & Inventory (Medium Priority)
14. Production Status Page
15. Recipes Management Page
16. Print Labels

### Phase 6: User Management & Contacts (Lower Priority)
17. Sales Commission Agents
18. Contact Import Functionality

### Phase 7: Advanced Features (Lower Priority)
19. Discounts Management
20. Custom Delivery Notes
21. Document Printing System
22. Barcode Settings
23. Receipt Printers

### Phase 8: API Completion & Polish
24. Complete API Endpoints
25. Financial Statements
26. Salary Calculations

---

## Notes

1. **Database Changes**: All schema changes should be added to `database/init.sql`. For existing databases, create migration files in `database/migrations/`.

2. **Model Associations**: Always update `backend/src/models/index.js` when adding new models.

3. **Permission Pattern**: 
   - Backend: `requirePermission('permission_slug')` middleware
   - Frontend: `hasPermission('permission_slug')` from AuthContext

4. **Branch Filtering**: Apply `req.user.branch_id` filter to all queries except for Super Admin.

5. **Error Handling**: All controllers must use try/catch and call `next(error)` for proper error handling.

6. **Testing**: After each feature, test via browser or Postman to confirm functionality before marking as complete.

---

*This plan was generated based on analysis of FeaturesStatus.md, cursor-context.md, and init.sql on 2025-11-24.*

