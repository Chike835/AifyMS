# AifyMS ERP - Testing Guide

This guide will help you verify that all features are working correctly.

---

## Prerequisites

### 1. Database Setup
```bash
# Ensure PostgreSQL is running
# Create database
createdb aify_erp

# Run initialization script
psql -d aify_erp -f database/init.sql
```

### 2. Backend Setup
```bash
cd backend

# Install dependencies
npm install

# Create .env file
cat > .env << EOF
PORT=5000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=aify_erp
DB_USER=postgres
DB_PASSWORD=your_password
JWT_SECRET=your_secret_key_here_change_in_production
NODE_ENV=development
EOF

# Start backend
npm run dev
```

### 3. Frontend Setup
```bash
cd frontend

# Install dependencies
npm install

# Create .env file
cat > .env << EOF
VITE_API_URL=http://localhost:5000/api
EOF

# Start frontend
npm run dev
```

---

## Testing Checklist

### Phase 1: Authentication & Authorization

#### Test 1: Login
- [ ] Navigate to `http://localhost:5173/login`
- [ ] Login with: `admin@aify.com` / `Admin@123`
- [ ] Verify redirect to dashboard
- [ ] Verify user info shows in sidebar

#### Test 2: Permissions
- [ ] Create a new role with limited permissions
- [ ] Create a new user with that role
- [ ] Login as that user
- [ ] Verify only permitted menu items are visible

---

### Phase 2: User Management

#### Test 3: Users
- [ ] Navigate to `/users`
- [ ] Create a new user
- [ ] Assign role and branch
- [ ] Edit user details
- [ ] Deactivate user
- [ ] Verify user list filters work

#### Test 4: Roles & Permissions
- [ ] Navigate to `/roles`
- [ ] Create a new role
- [ ] Assign permissions
- [ ] Edit role permissions
- [ ] Verify permission groups display correctly

#### Test 5: Agents
- [ ] Navigate to `/agents`
- [ ] Create a new sales agent
- [ ] Set commission rate
- [ ] Edit agent details
- [ ] View agent commission history

---

### Phase 3: Contacts Management

#### Test 6: Customers
- [ ] Navigate to `/customers`
- [ ] Add a new customer
- [ ] Edit customer details
- [ ] View customer ledger balance
- [ ] Search and filter customers

#### Test 7: Suppliers
- [ ] Navigate to `/suppliers`
- [ ] Add a new supplier
- [ ] Edit supplier details
- [ ] View supplier ledger balance
- [ ] Search and filter suppliers

#### Test 8: Import Contacts
- [ ] Navigate to `/import-contacts`
- [ ] Download sample CSV template
- [ ] Upload CSV with customer data
- [ ] Verify import results
- [ ] Check imported customers in list

---

### Phase 4: Inventory Management

#### Test 9: Products
- [ ] Navigate to `/products`
- [ ] Create a standard product
- [ ] Create a compound product
- [ ] Create a raw tracked product
- [ ] Create a manufactured virtual product
- [ ] Edit product details
- [ ] Search and filter products

#### Test 10: Update Price
- [ ] Navigate to `/products/update-price`
- [ ] Select multiple products
- [ ] Update sale prices
- [ ] Update cost prices
- [ ] Verify price history is logged

#### Test 11: Print Labels
- [ ] Navigate to `/inventory/print-labels`
- [ ] Select products
- [ ] Set quantity
- [ ] Generate label PDF
- [ ] Verify barcode displays correctly

#### Test 12: Stock Transfer
- [ ] Navigate to `/inventory/stock-transfer`
- [ ] Select inventory instance
- [ ] Choose from/to branches
- [ ] Complete transfer
- [ ] Verify stock updated in both branches

#### Test 13: Stock Adjustment
- [ ] Navigate to `/inventory/stock-adjustment`
- [ ] Select inventory instance
- [ ] Adjust quantity
- [ ] Provide reason
- [ ] Verify adjustment logged

---

### Phase 5: Manufacturing

#### Test 14: Recipes
- [ ] Navigate to `/manufacturing/recipes`
- [ ] Create a new recipe
- [ ] Set virtual product
- [ ] Set raw product
- [ ] Set conversion factor
- [ ] Set wastage margin
- [ ] Test recipe calculation

#### Test 15: Production Status
- [ ] Navigate to `/manufacturing/status`
- [ ] View production orders
- [ ] Filter by status
- [ ] Update order status
- [ ] Verify status changes

#### Test 16: Production Queue
- [ ] Navigate to `/production-queue`
- [ ] View queued orders
- [ ] Mark as produced
- [ ] Mark as delivered
- [ ] Verify inventory deductions

---

### Phase 6: Purchases

#### Test 17: Add Purchase
- [ ] Navigate to `/purchases/add`
- [ ] Select supplier
- [ ] Add products
- [ ] Set quantities and prices
- [ ] Complete purchase
- [ ] Verify inventory instances created

#### Test 18: Purchase List
- [ ] Navigate to `/purchases`
- [ ] View all purchases
- [ ] Filter by date, supplier, status
- [ ] View purchase details
- [ ] Export purchase data

#### Test 19: Purchase Returns
- [ ] Navigate to `/purchases/returns`
- [ ] Create a return
- [ ] Select purchase order
- [ ] Select items to return
- [ ] Provide reason
- [ ] Approve return
- [ ] Verify inventory adjusted

---

### Phase 7: Sales

#### Test 20: POS
- [ ] Navigate to `/pos`
- [ ] Add products to cart
- [ ] Apply discount
- [ ] Select customer
- [ ] Process payment
- [ ] Print receipt
- [ ] Verify inventory deducted

#### Test 21: Sales List
- [ ] Navigate to `/sales`
- [ ] View all sales
- [ ] Filter by date, customer, status
- [ ] View sale details
- [ ] Export sales data

#### Test 22: Add Sale
- [ ] Navigate to `/sales/add`
- [ ] Create invoice
- [ ] Add products
- [ ] Set dispatcher details
- [ ] Complete sale
- [ ] Verify production queue if needed

#### Test 23: Drafts
- [ ] Navigate to `/sales/drafts`
- [ ] Create a draft order
- [ ] Edit draft
- [ ] Convert draft to invoice
- [ ] Delete draft

#### Test 24: Quotations
- [ ] Navigate to `/sales/quotations`
- [ ] Create a quotation
- [ ] Set valid until date
- [ ] Send to customer
- [ ] Convert quotation to sale
- [ ] Mark as expired

#### Test 25: Sales Returns
- [ ] Navigate to `/sales/returns`
- [ ] Create a return
- [ ] Select sales order
- [ ] Select items to return
- [ ] Choose refund method
- [ ] Approve return
- [ ] Verify inventory restocked

#### Test 26: Shipments
- [ ] Navigate to `/shipments`
- [ ] View pending shipments
- [ ] Assign dispatcher
- [ ] Set vehicle details
- [ ] Mark as delivered
- [ ] Capture signature

#### Test 27: Discounts
- [ ] Navigate to `/discounts`
- [ ] Create percentage discount
- [ ] Create fixed discount
- [ ] Set validity dates
- [ ] Set minimum purchase amount
- [ ] Apply to sale

#### Test 28: Delivery Notes
- [ ] Navigate to `/delivery-notes`
- [ ] Create custom template
- [ ] Set as default
- [ ] Generate delivery note
- [ ] Print PDF

---

### Phase 8: Expenses

#### Test 29: Expense Categories
- [ ] Navigate to `/expenses/categories`
- [ ] Create categories (Rent, Utilities, Salaries, etc.)
- [ ] Edit category
- [ ] Delete unused category

#### Test 30: Expenses
- [ ] Navigate to `/expenses`
- [ ] Add new expense
- [ ] Select category
- [ ] Set amount and date
- [ ] Add description
- [ ] View expense list
- [ ] Filter by date and category

---

### Phase 9: Payroll

#### Test 31: Payroll Records
- [ ] Navigate to `/payroll`
- [ ] View payroll list
- [ ] Filter by month/year
- [ ] View employee payroll details

#### Test 32: Calculate Payroll
- [ ] Navigate to `/payroll`
- [ ] Click "Generate Payroll"
- [ ] Select employee
- [ ] Select month/year
- [ ] Verify auto-calculation includes:
  - Base salary
  - Agent commissions (if applicable)
  - Deductions
  - Net pay
- [ ] Save payroll record

---

### Phase 10: Accounts & Reports

#### Test 33: Payment Accounts
- [ ] Navigate to `/accounts/payment-accounts`
- [ ] Create cash account
- [ ] Create bank account
- [ ] Create mobile money account
- [ ] Create POS terminal account
- [ ] Record deposit
- [ ] Record withdrawal
- [ ] View transaction history

#### Test 34: Reports Dashboard
- [ ] Navigate to `/accounts/reports`
- [ ] Generate Profit & Loss report
- [ ] Generate Purchase & Sale report
- [ ] Generate Tax report
- [ ] Generate Stock report
- [ ] Generate Customer report
- [ ] Export reports to CSV/PDF

#### Test 35: Balance Sheet
- [ ] Navigate to `/accounts/payment-accounts/balance-sheet`
- [ ] Select date range
- [ ] View assets
- [ ] View liabilities
- [ ] View equity
- [ ] Verify balance

#### Test 36: Trial Balance
- [ ] Navigate to `/accounts/payment-accounts/trial-balance`
- [ ] Select date range
- [ ] View debits
- [ ] View credits
- [ ] Verify totals match

#### Test 37: Cash Flow
- [ ] Navigate to `/accounts/payment-accounts/cash-flow`
- [ ] Select date range
- [ ] View operating activities
- [ ] View investing activities
- [ ] View financing activities
- [ ] Verify net cash flow

---

### Phase 11: Settings

#### Test 38: Business Settings
- [ ] Navigate to `/settings/business`
- [ ] Update business name
- [ ] Update address
- [ ] Update contact info
- [ ] Upload logo
- [ ] Set currency
- [ ] Set date/time format

#### Test 39: Business Locations
- [ ] Navigate to `/settings/locations`
- [ ] Add new branch
- [ ] Set branch code
- [ ] Set address
- [ ] Edit branch
- [ ] Deactivate branch

#### Test 40: Invoice Settings
- [ ] Navigate to `/settings/invoice`
- [ ] Set invoice prefix
- [ ] Set invoice footer
- [ ] Set payment terms
- [ ] Toggle tax display
- [ ] Toggle discount display

#### Test 41: Barcode Settings
- [ ] Navigate to `/settings/barcode`
- [ ] Select barcode type (CODE128, EAN13, etc.)
- [ ] Set barcode dimensions
- [ ] Toggle text display
- [ ] Set text position
- [ ] Preview barcode

#### Test 42: Receipt Printers
- [ ] Navigate to `/settings/receipt-printers`
- [ ] Add thermal printer
- [ ] Set connection type (USB, Network, Bluetooth)
- [ ] Set paper width
- [ ] Set as default
- [ ] Test print

#### Test 43: Tax Rates
- [ ] Navigate to `/settings/tax`
- [ ] Create tax rate
- [ ] Set percentage
- [ ] Set as default
- [ ] Toggle compound tax
- [ ] Apply to products

---

### Phase 12: Import/Export

#### Test 44: Import Products
- [ ] Navigate to `/inventory/import`
- [ ] Download CSV template
- [ ] Fill with product data
- [ ] Upload CSV
- [ ] Verify import results
- [ ] Check products in list

#### Test 45: Export Data
- [ ] Export products to CSV
- [ ] Export inventory to CSV
- [ ] Export sales to CSV
- [ ] Export customers to CSV
- [ ] Verify CSV format
- [ ] Import exported data

---

### Phase 13: Dashboard

#### Test 46: Dashboard Metrics
- [ ] Navigate to `/`
- [ ] View total sales
- [ ] View total purchases
- [ ] View total expenses
- [ ] View inventory value
- [ ] View low stock alerts

#### Test 47: Dashboard Charts
- [ ] View sales trend chart
- [ ] View top products chart
- [ ] View revenue by branch chart
- [ ] View expense breakdown chart
- [ ] Filter by date range

---

## Performance Testing

### Test 48: Large Data Sets
- [ ] Import 1000+ products
- [ ] Create 100+ sales orders
- [ ] Generate reports with large data
- [ ] Verify page load times < 3 seconds
- [ ] Verify search/filter performance

### Test 49: Concurrent Users
- [ ] Login with 5+ users simultaneously
- [ ] Perform operations concurrently
- [ ] Verify no data conflicts
- [ ] Verify no permission leaks

---

## Security Testing

### Test 50: Permission Enforcement
- [ ] Login as Sales Rep
- [ ] Try to access admin features
- [ ] Verify 403 errors
- [ ] Try to access other branch data
- [ ] Verify branch scoping works

### Test 51: Data Validation
- [ ] Try to create product with negative price
- [ ] Try to create sale with zero quantity
- [ ] Try to adjust stock below zero
- [ ] Verify validation errors

---

## Browser Compatibility

### Test 52: Cross-Browser
- [ ] Test on Chrome
- [ ] Test on Firefox
- [ ] Test on Safari
- [ ] Test on Edge
- [ ] Verify UI consistency

### Test 53: Responsive Design
- [ ] Test on desktop (1920x1080)
- [ ] Test on laptop (1366x768)
- [ ] Test on tablet (768x1024)
- [ ] Test on mobile (375x667)
- [ ] Verify layout adapts

---

## Reporting Issues

If you find any issues during testing:

1. Note the exact steps to reproduce
2. Capture screenshots/error messages
3. Check browser console for errors
4. Check backend logs
5. Document in a testing report

---

## Success Criteria

All features are considered working when:
- [ ] All 53 tests pass
- [ ] No console errors
- [ ] No backend errors
- [ ] Performance is acceptable
- [ ] Security is enforced
- [ ] UI is consistent

---

**Happy Testing!**
