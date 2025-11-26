# Execution Plan: Reports Overhaul & Customer Ledger Enhancements

## Overview
This plan addresses three major phases:
1. **Reports Navigation Overhaul** - Simplify sidebar and make Reports page responsive
2. **Customer & Ledger Enhancements** - Enhanced customer list and ledger summary cards
3. **Payment Logic Upgrade** - Advance payments and refunds with fees

---

## 1. Database Schema Updates (init.sql)

### Task: Add new transaction types to ENUM
- [ ] Add `'ADVANCE_PAYMENT'`, `'REFUND'`, `'REFUND_FEE'` to `transaction_type` ENUM
- **Location**: `database/init.sql` line 17
- **Action**: Modify the CREATE TYPE statement for `transaction_type`

### Current State:
```sql
CREATE TYPE transaction_type AS ENUM ('INVOICE', 'PAYMENT', 'RETURN', 'ADJUSTMENT', 'OPENING_BALANCE');
```

### Required Change:
```sql
CREATE TYPE transaction_type AS ENUM ('INVOICE', 'PAYMENT', 'RETURN', 'ADJUSTMENT', 'OPENING_BALANCE', 'ADVANCE_PAYMENT', 'REFUND', 'REFUND_FEE');
```

**Note**: PostgreSQL requires dropping and recreating ENUMs. Will use ALTER TYPE ... ADD VALUE for existing databases.

---

## 2. Backend Implementation Plan

### A. ReportController Expansions

#### Task: Verify all report methods exist
- [x] `getProfitLoss` - exists (line 473)
- [x] `getPurchasePaymentReport` - exists (line 1245)
- [x] `getSellPaymentReport` - exists (line 1310)
- [x] `getTaxReport` - exists (line 1376)
- [x] `getSupplierCustomerReport` - exists (line 1362)
- [x] `getStockAdjustmentReport` - exists (line 1189)
- [x] `getTrendingProducts` - exists (line 1200)
- [x] `getItemsReport` - exists (line 1205)
- [x] `getProductPurchaseReport` - exists (line 1224)
- [x] `getProductSellReport` - exists (line 1234)
- [x] `getExpenseSummary` - exists (line 342)
- [x] `getSalesRepresentativeReport` - exists (line 1417)
- [x] `getActivityLogReport` - exists (line 1587)

**Status**: All report methods already exist in `backend/src/controllers/reportController.js`. No backend expansion needed.

---

### B. PaymentController Logic for Advances and Refunds

#### Task 1: Create `addAdvance()` method
- [ ] **File**: `backend/src/controllers/paymentController.js`
- **Route**: `POST /api/payments/advance`
- **Logic**:
  - Accept: `customer_id`, `amount`, `method`, `reference_note`
  - Create Payment record (status: `pending_confirmation`)
  - On confirmation: Create Ledger Entry with `transaction_type: 'ADVANCE_PAYMENT'`
  - Ledger: Credit Customer, Debit Cash
  - Update customer `ledger_balance` (decrease)

#### Task 2: Create `processRefund()` method
- [ ] **File**: `backend/src/controllers/paymentController.js`
- **Route**: `POST /api/payments/refund`
- **Inputs**: `customer_id`, `refund_amount`, `withdrawal_fee`, `method`, `reference_note`
- **Logic**:
  - Validate customer has sufficient advance balance
  - Create Ledger Entry 1: `REFUND` - Debit Customer, Credit Cash
  - Create Ledger Entry 2: `REFUND_FEE` - Debit Customer, Credit 'Other Income'
  - Update customer `ledger_balance` (increase for refund, decrease for fee)
  - Create payment_account transaction (withdrawal)

#### Task 3: Create helper function `calculateAdvanceBalance()`
- [ ] **File**: `backend/src/services/ledgerService.js`
- **Purpose**: Calculate total advance payments (sum of ADVANCE_PAYMENT credits - REFUND debits)
- **Return**: Decimal amount

#### Task 4: Update LedgerEntry model
- [ ] **File**: `backend/src/models/LedgerEntry.js`
- **Action**: Verify ENUM includes new transaction types (will be handled by DB migration)

---

### C. Ledger Controller Enhancements

#### Task: Add summary calculation endpoint
- [ ] **File**: `backend/src/controllers/ledgerController.js`
- **Route**: `GET /api/ledger/customer/:id/summary`
- **Returns**:
  ```json
  {
    "opening_balance": 0,
    "total_invoiced": 0,
    "total_paid": 0,
    "advance_balance": 0,
    "balance_due": 0
  }
  ```
- **Logic**:
  - `opening_balance`: Sum of OPENING_BALANCE transactions
  - `total_invoiced`: Sum of INVOICE debit_amount
  - `total_paid`: Sum of PAYMENT credit_amount + ADVANCE_PAYMENT credit_amount
  - `advance_balance`: Total Paid - Total Invoiced (if positive)
  - `balance_due`: Total Invoiced - Total Paid (if positive)

---

## 3. Frontend UI Plan

### A. Sidebar Simplification

#### Task: Collapse Reports into single link
- [ ] **File**: `frontend/src/components/layout/Sidebar.jsx`
- **Location**: Lines 196-217
- **Current**: Nested subgroup with 16+ report items
- **Change**: Replace entire subgroup with single item:
  ```jsx
  { name: 'Reports', path: '/reports', icon: BarChart3, permission: 'report_view_sales' }
  ```
- **Remove**: Entire Reports subgroup structure (lines 197-217)

---

### B. Reports Page Responsive Navigation

#### Task: Implement responsive report selector
- [ ] **File**: `frontend/src/pages/Reports.jsx`
- **Location**: Lines 1981-2004 (tabs navigation)

**Mobile View** (`< 768px`):
- Use `<select>` dropdown
- Show all report types
- Set `activeTab` on change

**Desktop View** (`>= 768px`):
- Horizontal scrollable tab bar
- CSS: `overflow-x: auto`, `white-space: nowrap`
- Remove vertical stacking

**Implementation**:
```jsx
// Replace lines 1981-2004 with responsive component
<div className="bg-white rounded-lg shadow mb-6">
  <div className="border-b border-gray-200">
    {/* Mobile: Dropdown */}
    <div className="md:hidden p-4">
      <select
        value={activeTab}
        onChange={(e) => setActiveTab(e.target.value)}
        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
      >
        {visibleTabs.map(tab => (
          <option key={tab.id} value={tab.id}>{tab.name}</option>
        ))}
      </select>
    </div>
    
    {/* Desktop: Scrollable tabs */}
    <nav 
      className="hidden md:flex space-x-8 px-6 overflow-x-auto" 
      style={{ scrollbarWidth: 'thin' }}
      aria-label="Tabs"
    >
      {visibleTabs.map((tab) => {
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-shrink-0 ${
              activeTab === tab.id
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
          >
            <Icon className="h-5 w-5" />
            <span>{tab.name}</span>
          </button>
        );
      })}
    </nav>
  </div>
</div>
```

---

### C. Customer List Enhancements

#### Task 1: Add "Total Sales Due" column
- [ ] **File**: `frontend/src/pages/Customers.jsx`
- **Backend**: Update `GET /api/customers` to include `total_sales_due` in response
- **Frontend**: Add column header (line 209) and cell (line 238)
- **Calculation**: `total_sales_due` = Sum of unpaid invoice amounts

#### Task 2: Implement Column Visibility feature
- [ ] **File**: `frontend/src/pages/Customers.jsx`
- **Add State**: 
  ```jsx
  const [visibleColumns, setVisibleColumns] = useState({
    name: true,
    phone: true,
    email: true,
    balance: true,
    totalSalesDue: true,
    actions: true
  });
  ```
- **Add Dropdown Button**: Column visibility toggle (eye icon) near "Add Customer" button
- **Toggle Logic**: Checkbox dropdown to show/hide columns

#### Task 3: Enhanced Action Menu
- [ ] **File**: `frontend/src/pages/Customers.jsx`
- **Replace**: Single action buttons (lines 248-276) with dropdown menu
- **Menu Items**: 
  - Pay (navigate to payments page with customer filter)
  - View (view customer details)
  - Edit
  - Delete
  - Deactivate (if status field exists)
  - Ledger (existing)
  - Invoices (navigate to sales with customer filter)
  - Documents & Notes (placeholder for future)

**Implementation**: Use lucide-react `MoreVertical` icon with dropdown menu

---

### D. Ledger Header Summary Cards

#### Task: Add summary card to CustomerLedger
- [ ] **File**: `frontend/src/pages/CustomerLedger.jsx`
- **Location**: After Contact Info card (line 170), before Filters (line 172)
- **Backend**: Create `GET /api/ledger/customer/:id/summary` endpoint (see Backend Plan C)
- **Frontend**: Fetch summary data and display 5 cards:
  - Opening Balance
  - Total Invoiced
  - Total Paid
  - Advance Balance
  - Balance Due

**UI Design**:
```jsx
<div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
  <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
    <p className="text-sm text-gray-500">Opening Balance</p>
    <p className="text-2xl font-bold">{formatCurrency(summary.opening_balance)}</p>
  </div>
  {/* Repeat for other 4 metrics */}
</div>
```

**Logic**:
- `Advance Balance` = max(0, Total Paid - Total Invoiced)
- `Balance Due` = max(0, Total Invoiced - Total Paid)

---

### E. Payment UI Enhancements

#### Task 1: Add "Advance Payment" option
- [ ] **File**: `frontend/src/pages/Payments.jsx` (or relevant payment form)
- **Add**: Checkbox or toggle for "Advance Payment" (not linked to invoice)
- **When checked**: Hide invoice selection, show customer selection only
- **API Call**: `POST /api/payments/advance` instead of `/api/payments`

#### Task 2: Add "Process Refund" modal/form
- [ ] **File**: `frontend/src/pages/CustomerLedger.jsx` or separate component
- **Button**: "Process Refund" (only visible if advance_balance > 0)
- **Form Fields**:
  - Refund Amount (max: advance_balance)
  - Withdrawal Fee
  - Payment Method
  - Reference Note
- **API Call**: `POST /api/payments/refund`

---

## 4. Route Configuration

### Task: Add new payment routes
- [ ] **File**: `backend/src/routes/paymentRoutes.js`
- **Add Routes**:
  - `POST /advance` → `addAdvance`
  - `POST /refund` → `processRefund`
- **File**: `backend/src/routes/ledgerRoutes.js` (or create if missing)
- **Add Route**:
  - `GET /customer/:id/summary` → `getCustomerLedgerSummary`

---

## 5. Testing Checklist

- [ ] Reports page loads correctly with simplified sidebar
- [ ] Reports navigation works on mobile (dropdown) and desktop (scrollable tabs)
- [ ] All report types are accessible from `/reports`
- [ ] Customer list shows "Total Sales Due" column
- [ ] Column visibility toggle works
- [ ] Action menu dropdown includes all specified items
- [ ] Ledger summary cards display correct calculations
- [ ] Advance payment creates ledger entry with correct transaction type
- [ ] Refund creates two ledger entries (refund + fee)
- [ ] Customer ledger balance updates correctly for advances and refunds
- [ ] Database ENUM includes new transaction types

---

## 6. Documentation Updates

- [ ] Update `.cursor/cursor-context.md` with new payment flows
- [ ] Update `FeaturesStatus.md` marking features as [Built]

---

## Implementation Order

1. **Database Schema** (init.sql) - Add ENUM values
2. **Backend Payment Logic** - Add advance/refund methods
3. **Backend Ledger Summary** - Add summary endpoint
4. **Frontend Sidebar** - Simplify Reports navigation
5. **Frontend Reports Page** - Responsive navigation
6. **Frontend Customer List** - Columns and visibility
7. **Frontend Ledger Header** - Summary cards
8. **Frontend Payment UI** - Advance/Refund forms
9. **Testing & Documentation**

---

## Notes

- All database changes MUST be applied directly to `database/init.sql` (NO migration files per requirement)
- PostgreSQL ENUM modifications may require server restart or migration script
- Advance payments do NOT require invoice linkage
- Refunds require two ledger entries (refund transaction + fee transaction)
- Column visibility state should be stored in localStorage for persistence

---

**Status**: Plan Created - Ready for Implementation

