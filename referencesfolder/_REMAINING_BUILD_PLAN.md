# AifyMS ERP - Remaining Build Plan

> [!CAUTION]
> **DEPRECATED DOCUMENT**
> This build plan is outdated as of Dec 2025. Many features listed here (e.g., Payroll, Agents, Reports) have been fully implemented.
> Please refer to `PROJECT_SUMMARY.md` and the actual codebase for the current project status.
> This file is kept for historical reference only.

**Status**: Generated (Legacy)
**Date**: 2025-11-25
**Source**: FeaturesStatus.md (Truth Source) & init.sql (Schema)

---

## Module: User Management

### Feature: Sales commission agents functionality
- [ ] **Database**: Verify `agents` table exists in `database/init.sql`. Add `agent_manage` permission slug to seed data if missing.
- [ ] **Backend Model**: Create `backend/src/models/Agent.js` (define associations with `Branch`, `SalesOrder`). Update `backend/src/models/index.js`.
- [ ] **Backend Controller**: Create `backend/src/controllers/agentController.js`. Implement `createAgent`, `getAgents` (with filtering), `updateAgent`, `deleteAgent`.
- [ ] **Backend Route**: Create `backend/src/routes/agentRoutes.js`. Register in `backend/src/routes/index.js`. Apply `requirePermission('agent_manage')`.
- [ ] **Frontend API**: Update `frontend/src/utils/api.js` or create `frontend/src/services/agentService.js`.
- [ ] **Frontend Page**: Create `frontend/src/pages/Agents.jsx` (List view with Add/Edit modal).
- [ ] **Frontend Sidebar**: Add route `/agents` to `frontend/src/components/layout/Sidebar.jsx` wrapped in `agent_manage` permission check.

### Feature: Agents management page (/agents)
- [ ] **Frontend Page**: Implement `frontend/src/pages/Agents.jsx` with data table, search, and actions.
- [ ] **Frontend Sidebar**: Ensure `/agents` is accessible via Sidebar.

---

## Module: Contacts Management

### Feature: Contact import functionality (CSV/Excel)
- [ ] **Backend Controller**: Create `backend/src/controllers/importExportController.js` (if not exists) or update. Implement `importContacts` method using `csv-parser` or `xlsx`.
- [ ] **Backend Route**: Add `POST /api/contacts/import` to `backend/src/routes/contactRoutes.js` (or `importExportRoutes.js`).
- [ ] **Frontend Page**: Create `frontend/src/pages/ImportContacts.jsx`. Implement file upload and mapping interface.
- [ ] **Frontend Sidebar**: Add route `/import-contacts` to `frontend/src/components/layout/Sidebar.jsx`.

### Feature: Import contacts page (/import-contacts)
- [ ] **Frontend Page**: Implement UI for uploading CSV/Excel and mapping columns to `customers`/`suppliers` fields.

---

## Module: Inventory Management

### Feature: Print labels for inventory instances
- [ ] **Database**: Verify `delivery_note_templates` or create `label_templates` table if needed (currently `branches` has `label_template`).
- [ ] **Backend Controller**: Create `backend/src/controllers/printController.js`. Implement `generateLabelPDF` using `pdfkit` or similar.
- [ ] **Backend Route**: Create `backend/src/routes/printRoutes.js`. Add `POST /api/print/labels`.
- [ ] **Frontend Page**: Create `frontend/src/pages/PrintLabels.jsx`.
- [ ] **Frontend Sidebar**: Add route `/inventory/print-labels` to `frontend/src/components/layout/Sidebar.jsx`.

### Feature: Update price functionality (/inventory/update-price)
- [ ] **Database**: Verify `price_history` table exists in `init.sql`.
- [ ] **Backend Controller**: Update `backend/src/controllers/productController.js`. Implement `bulkUpdatePrices`. Log to `price_history`.
- [ ] **Backend Route**: Add `POST /api/products/update-prices` to `backend/src/routes/productRoutes.js`.
- [ ] **Frontend Page**: Create `frontend/src/pages/UpdatePrice.jsx`. Implement bulk edit grid.
- [ ] **Frontend Sidebar**: Add route `/inventory/update-price` to `frontend/src/components/layout/Sidebar.jsx`.

### Feature: Print labels interface (/inventory/print-labels)
- [ ] **Frontend Page**: Implement `frontend/src/pages/PrintLabels.jsx` with product selection and quantity input.

---

## Module: Manufacturing

### Feature: Production status page (/manufacturing/status)
- [ ] **Backend Controller**: Update `backend/src/controllers/productionController.js`. Implement `getProductionStatus` (aggregates).
- [ ] **Backend Route**: Add `GET /api/production/status` to `backend/src/routes/productionRoutes.js`.
- [ ] **Frontend Page**: Create `frontend/src/pages/ManufacturingStatus.jsx`. Show Kanban or List view of orders in production.
- [ ] **Frontend Sidebar**: Add route `/manufacturing/status` to `frontend/src/components/layout/Sidebar.jsx`.

### Feature: Recipes management page (/manufacturing/recipes)
- [ ] **Backend Model**: Verify `Recipe` model in `backend/src/models/Recipe.js`.
- [ ] **Backend Controller**: Create `backend/src/controllers/recipeController.js`. Implement CRUD.
- [ ] **Backend Route**: Create `backend/src/routes/recipeRoutes.js`.
- [ ] **Frontend Page**: Create `frontend/src/pages/Recipes.jsx`. Implement Master-Detail view for recipes and ingredients.
- [ ] **Frontend Sidebar**: Add route `/manufacturing/recipes` to `frontend/src/components/layout/Sidebar.jsx`.

---

## Module: Purchases

### Feature: Purchase returns processing
- [ ] **Database**: Verify `purchase_returns` and `purchase_return_items` tables in `init.sql`.
- [ ] **Backend Model**: Create `backend/src/models/PurchaseReturn.js` and `PurchaseReturnItem.js`.
- [ ] **Backend Controller**: Create `backend/src/controllers/purchaseReturnController.js`. Implement `createReturn`, `approveReturn`.
- [ ] **Backend Route**: Create `backend/src/routes/purchaseReturnRoutes.js`.
- [ ] **Frontend Page**: Create `frontend/src/pages/PurchaseReturns.jsx`.

### Feature: Purchase returns page (/purchases/returns)
- [ ] **Frontend Page**: Implement `frontend/src/pages/PurchaseReturns.jsx` (List view) and `frontend/src/pages/AddPurchaseReturn.jsx`.
- [ ] **Frontend Sidebar**: Add route `/purchases/returns` to `frontend/src/components/layout/Sidebar.jsx`.

---

## Module: Sales

### Feature: Sales order management (drafts, quotations, returns, shipments, discounts)
- [ ] **Database**: Verify `sales_orders` has `order_type` ('draft', 'quotation', 'invoice'). Verify `discounts` table.
- [ ] **Backend Controller**: Update `backend/src/controllers/salesController.js`. Handle `order_type` in `createSale`. Implement `convertQuoteToSale`.
- [ ] **Backend Route**: Update `backend/src/routes/salesRoutes.js`. Add endpoints for drafts and quotations.

### Feature: Delivery notes and custom documents
- [ ] **Database**: Verify `delivery_note_templates` table.
- [ ] **Backend Controller**: Create `backend/src/controllers/deliveryNoteController.js`. Implement `generateDeliveryNote`.
- [ ] **Backend Route**: Create `backend/src/routes/deliveryNoteRoutes.js`.
- [ ] **Frontend Page**: Create `frontend/src/pages/DeliveryNotes.jsx`.

### Feature: Sales list page (/sales)
- [ ] **Frontend Page**: Create `frontend/src/pages/Sales.jsx`. Implement comprehensive filterable list.
- [ ] **Frontend Sidebar**: Add route `/sales` to `frontend/src/components/layout/Sidebar.jsx`.

### Feature: Add sale page (/sales/add)
- [ ] **Frontend Page**: Create `frontend/src/pages/AddSale.jsx`. Implement complex form with product search, cart, and payment.
- [ ] **Frontend Sidebar**: Add route `/sales/add` to `frontend/src/components/layout/Sidebar.jsx`.

### Feature: POS list page (/sales/pos-list)
- [ ] **Frontend Page**: Create `frontend/src/pages/POSList.jsx`. Simplified sales list for cashiers.
- [ ] **Frontend Sidebar**: Add route `/sales/pos-list` to `frontend/src/components/layout/Sidebar.jsx`.

### Feature: Drafts management (/sales/drafts)
- [ ] **Frontend Page**: Create `frontend/src/pages/Drafts.jsx`. List orders with `order_type = 'draft'`.
- [ ] **Frontend Sidebar**: Add route `/sales/drafts` to `frontend/src/components/layout/Sidebar.jsx`.

### Feature: Quotations management (/sales/quotations)
- [ ] **Frontend Page**: Create `frontend/src/pages/Quotations.jsx`. List orders with `order_type = 'quotation'`.
- [ ] **Frontend Sidebar**: Add route `/sales/quotations` to `frontend/src/components/layout/Sidebar.jsx`.

### Feature: Sales returns page (/sales/returns)
- [ ] **Database**: Verify `sales_returns` table.
- [ ] **Backend Controller**: Create `backend/src/controllers/salesReturnController.js`.
- [ ] **Backend Route**: Create `backend/src/routes/salesReturnRoutes.js`.
- [ ] **Frontend Page**: Create `frontend/src/pages/SalesReturns.jsx`.
- [ ] **Frontend Sidebar**: Add route `/sales/returns` to `frontend/src/components/layout/Sidebar.jsx`.

### Feature: Discounts management (/sales/discounts)
- [ ] **Database**: Verify `discounts` table.
- [ ] **Backend Controller**: Create `backend/src/controllers/discountController.js`.
- [ ] **Backend Route**: Create `backend/src/routes/discountRoutes.js`.
- [ ] **Frontend Page**: Create `frontend/src/pages/Discounts.jsx`.
- [ ] **Frontend Sidebar**: Add route `/sales/discounts` to `frontend/src/components/layout/Sidebar.jsx`.

### Feature: Custom delivery notes (/sales/delivery-notes)
- [ ] **Frontend Page**: Create `frontend/src/pages/DeliveryNotes.jsx`. Manage templates.
- [ ] **Frontend Sidebar**: Add route `/sales/delivery-notes` to `frontend/src/components/layout/Sidebar.jsx`.

---

## Module: Accounts & Reports

### Feature: Comprehensive reporting system
- [ ] **Backend Controller**: Create `backend/src/controllers/reportController.js`. Implement `getPL`, `getBalanceSheet`, `getTaxReport`.
- [ ] **Backend Route**: Create `backend/src/routes/reportRoutes.js`.
- [ ] **Frontend Page**: Create `frontend/src/pages/Reports.jsx`. Implement dashboard with charts.

### Feature: Payment accounts management
- [ ] **Database**: Verify `payment_accounts` and `account_transactions` tables.
- [ ] **Backend Controller**: Create `backend/src/controllers/paymentAccountController.js`.
- [ ] **Backend Route**: Create `backend/src/routes/paymentAccountRoutes.js`.
- [ ] **Frontend Page**: Create `frontend/src/pages/PaymentAccounts.jsx`.

### Feature: Financial statements
- [ ] **Frontend Page**: Create `frontend/src/pages/BalanceSheet.jsx`, `TrialBalance.jsx`, `CashFlow.jsx`.
- [ ] **Frontend Sidebar**: Add routes under Accounts group.

### Feature: Reports dashboard (/accounts/reports)
- [ ] **Frontend Page**: Implement `frontend/src/pages/Reports.jsx`.
- [ ] **Frontend Sidebar**: Add route `/accounts/reports` to `frontend/src/components/layout/Sidebar.jsx`.

### Feature: Payment accounts page (/accounts/payment-accounts)
- [ ] **Frontend Page**: Implement `frontend/src/pages/PaymentAccounts.jsx`.
- [ ] **Frontend Sidebar**: Add route `/accounts/payment-accounts` to `frontend/src/components/layout/Sidebar.jsx`.

---

## Module: Settings

### Feature: Business settings management
- [ ] **Database**: Verify `business_settings` table.
- [ ] **Backend Controller**: Create `backend/src/controllers/settingsController.js`.
- [ ] **Backend Route**: Create `backend/src/routes/settingsRoutes.js`.
- [ ] **Frontend Page**: Create `frontend/src/pages/BusinessSettings.jsx`.

### Feature: Tax rates and invoice settings
- [ ] **Database**: Verify `tax_rates` table.
- [ ] **Backend Controller**: Create `backend/src/controllers/taxController.js`.
- [ ] **Backend Route**: Create `backend/src/routes/taxRoutes.js`.
- [ ] **Frontend Page**: Create `frontend/src/pages/TaxRates.jsx`, `InvoiceSettings.jsx`.

### Feature: Barcode and printer settings
- [ ] **Database**: Verify `receipt_printers` table.
- [ ] **Backend Controller**: Create `backend/src/controllers/printerController.js`.
- [ ] **Backend Route**: Create `backend/src/routes/printerRoutes.js`.
- [ ] **Frontend Page**: Create `frontend/src/pages/BarcodeSettings.jsx`, `ReceiptPrinters.jsx`.

### Feature: Business settings page (/settings/business)
- [ ] **Frontend Page**: Implement `frontend/src/pages/BusinessSettings.jsx`.
- [ ] **Frontend Sidebar**: Add route `/settings/business`.

### Feature: Business locations page (/settings/locations)
- [ ] **Frontend Page**: Create `frontend/src/pages/BusinessLocations.jsx`.
- [ ] **Frontend Sidebar**: Add route `/settings/locations`.

### Feature: Invoice settings page (/settings/invoice)
- [ ] **Frontend Page**: Implement `frontend/src/pages/InvoiceSettings.jsx`.
- [ ] **Frontend Sidebar**: Add route `/settings/invoice`.

### Feature: Barcode settings page (/settings/barcode)
- [ ] **Frontend Page**: Implement `frontend/src/pages/BarcodeSettings.jsx`.
- [ ] **Frontend Sidebar**: Add route `/settings/barcode`.

### Feature: Receipt printers page (/settings/printers)
- [ ] **Frontend Page**: Implement `frontend/src/pages/ReceiptPrinters.jsx`.
- [ ] **Frontend Sidebar**: Add route `/settings/printers`.

### Feature: Tax rates page (/settings/tax)
- [ ] **Frontend Page**: Implement `frontend/src/pages/TaxRates.jsx`.
- [ ] **Frontend Sidebar**: Add route `/settings/tax`.

---

## Module: Dashboard

### Feature: Advanced dashboard graphs
- [ ] **Backend Controller**: Update `backend/src/controllers/dashboardController.js`. Add `getSalesChart`, `getInventoryValueHistory`.
- [ ] **Frontend Page**: Update `frontend/src/pages/Dashboard.jsx`. Add Recharts or Chart.js components.

---

## Module: Print & Document Generation

### Feature: Document printing system
- [ ] **Backend Controller**: Update `backend/src/controllers/printController.js`. Add `generateInvoicePDF`, `generateReceiptPDF`.
- [ ] **Frontend API**: Add `frontend/src/utils/printUtils.js`.

---

## Module: API Enhancements

### Feature: Complete API endpoints
- [ ] **Backend**: Review all controllers against JSON spec. Ensure all CRUD operations are present and protected.

---

## Module: Payroll

### Feature: Salary calculations and commissions
- [ ] **Database**: Verify `payroll_records` and `agent_commissions` tables.
- [ ] **Backend Controller**: Update `backend/src/controllers/payrollController.js`. Implement `calculateMonthlyPayroll` (including commissions).
- [ ] **Frontend Page**: Update `frontend/src/pages/Payroll.jsx`. Add "Generate Payroll" button and modal.

---

## Execution Order

1. **Database Verification**: Ensure `init.sql` is fully applied (manual step for user, but we assume schema matches file).
2. **Backend Core**: Implement `settings`, `agents`, `tax`, `printers` controllers/routes.
3. **Frontend Settings**: Build all settings pages to establish configuration.
4. **Backend Inventory/Manufacturing**: Complete `recipes`, `print`, `update-price`.
5. **Frontend Inventory/Manufacturing**: Build corresponding pages.
6. **Backend Sales/Purchases**: Complete `returns`, `drafts`, `quotations`.
7. **Frontend Sales/Purchases**: Build complex transaction pages.
8. **Accounts & Reports**: Build reporting engine last as it depends on all data.
