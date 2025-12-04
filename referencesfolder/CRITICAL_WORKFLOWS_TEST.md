# Critical Workflows - Manual Testing Checklist

**Purpose**: Verify core business logic functions correctly  
**Date**: 2025-12-04  
**Status**: Ready for User Testing

---

## How to Use This Checklist

1. Complete each test case in order
2. Mark [x] when test passes
3. Note any failures with description
4. Test with real data when possible, test data otherwise

---

## Test 1: Coil-to-Roofing Manufacturing Workflow

### Prerequisites
- [ ] Database initialized with `init.sql`
- [ ] Super Admin login (`admin@aify.com` / `Admin@123`)
- [ ] At least one branch exists

### Step 1.1: Create Raw Material Product
- [ ] Navigate to `/products/add`
- [ ] Enter product details:
  - Name: "Aluminum Coil 0.8mm Test"
  - SKU: `TEST-COIL-001`
  - Type: `raw_tracked`
  - Base Unit: `KG`
  - Cost Price: 1000.00
  - Sale Price: 1200.00
- [ ] Click "Save"
- [ ] **VERIFY**: Product created successfully
- [ ] **VERIFY**: Product appears in `/products` list

### Step 1.2: Create Manufactured Virtual Product
- [ ] Navigate to `/products/add`
- [ ] Enter product details:
  - Name: "Test Longspan 0.55"
  - SKU: `TEST-LONGSPAN-001`
  - Type: `manufactured_virtual`
  - Base Unit: `Meter`
  - Sale Price: 500.00
- [ ] Click "Save"
- [ ] **VERIFY**: Product created successfully

### Step 1.3: Create Recipe
- [ ] Navigate to `/manufacturing/recipes`
- [ ] Click "Add Recipe"
- [ ] Select Virtual Product: "Test Longspan 0.55"
- [ ] Select Raw Product: "Aluminum Coil 0.8mm Test"
- [ ] Enter Conversion Factor: `0.8` (1 Meter = 0.8 KG)
- [ ] Enter Wastage Margin: `5` (5%)
- [ ] Click "Save"
- [ ] **VERIFY**: Recipe created
- [ ] **VERIFY**: Can edit recipe

### Step 1.4: Register Coil Instance
- [ ] Navigate to `/inventory/batches`
- [ ] Click "Add Batch" or "Register Coil"
- [ ] Select Product: "Aluminum Coil 0.8mm Test"
- [ ] Enter Instance Code: `TEST-COIL-BATCH-001`
- [ ] Select Batch Type: `Coil` (or appropriate type)
- [ ] Enter Initial Quantity: `100` KG
- [ ] Click "Save"
- [ ] **VERIFY**: Batch created
- [ ] **VERIFY**: Remaining quantity = 100 KG
- [ ] **VERIFY**: Status = `in_stock`

### Step 1.5: Create Sale with Virtual Product (POS or Add Sale)
- [ ] Navigate to `/pos` OR `/sales/add`
- [ ] Select Customer (or create new)
- [ ] Add Product: "Test Longspan 0.55"
- [ ] Enter Quantity: `10` Meters
- [ ] **VERIFY**: Coil Selector Modal opens (if applicable)
- [ ] **VERIFY**: Required raw material calculated: 10 × 0.8 = 8 KG
- [ ] Select Coil: "TEST-COIL-BATCH-001"
- [ ] **VERIFY**: Coil has sufficient quantity (100 KG available)
- [ ] Confirm coil selection
- [ ] Complete sale (enter payment details if required)
- [ ] **VERIFY**: Sale created successfully
- [ ] **VERIFY**: Invoice generated

### Step 1.6: Verify Inventory Deduction
- [ ] Navigate to `/inventory/batches`
- [ ] Find batch "TEST-COIL-BATCH-001"
- [ ] **VERIFY**: Remaining quantity = 92 KG (100 - 8)
- [ ] **VERIFY**: Status still `in_stock` (not depleted)

### Step 1.7: Verify Production Status
- [ ] Navigate to `/manufacturing/status` OR `/production-queue`
- [ ] **VERIFY**: Sale appears in production queue
- [ ] **VERIFY**: Production status = `queue` OR `pending`
- [ ] Update status to `processing`
- [ ] Update status to `produced`
- [ ] **VERIFY**: Status changes saved successfully

---

## Test 2: Maker-Checker Payment Workflow

### Prerequisites
- [ ] Two users: Cashier (payment_receive permission) and Manager (payment_confirm permission)
- [ ] At least one customer exists with ledger balance

###Step 2.1: Log Payment (as Cashier)
- [ ] Login as Cashier user
- [ ] Navigate to `/payments`
- [ ] Click "Log Payment"
- [ ] Select Customer
- [ ] Enter Amount: `5000.00`
- [ ] Select Method: `cash` or `transfer`
- [ ] Enter Reference Note: "Test payment for workflow verification"
- [ ] Click "Submit"
- [ ] **VERIFY**: Payment created with status `pending_confirmation`
- [ ] **VERIFY**: Customer ledger balance NOT updated yet

### Step 2.2: Confirm Payment (as Manager)
- [ ] Logout and login as Manager user
- [ ] Navigate to `/payments`
- [ ] **VERIFY**: Pending payments table shows the logged payment
- [ ] Click "Confirm" on the payment
- [ ] **VERIFY**: Confirmation dialog appears
- [ ] Confirm the payment
- [ ] **VERIFY**: Payment status changes to `confirmed`
- [ ] **VERIFY**: `confirmed_by` field shows Manager's name
- [ ] **VERIFY**: `confirmed_at` timestamp is set

### Step 2.3: Verify Ledger Update
- [ ] Navigate to customer ledger (`/customers/:id/ledger`)
- [ ] **VERIFY**: Ledger entry created for payment
- [ ] **VERIFY**: Customer ledger balance decreased by payment amount
- [ ] **VERIFY**: Transaction type = `PAYMENT`
- [ ] **VERIFY**: Running balance calculated correctly

### Step 2.4: Test Transaction Rollback (Advanced)
- [ ] Identify a scenario that would cause ledger service to fail
- [ ] Attempt to confirm a payment in that scenario
- [ ] **VERIFY**: Entire transaction rolls back (no partial updates)
- [ ] **VERIFY**: Payment status remains `pending_confirmation`
- [ ] **VERIFY**: Customer ledger NOT updated

---

## Test 3: Multi-Branch Data Scoping

### Prerequisites
- [ ] At least 2 branches created
- [ ] Users assigned to different branches
- [ ] Products and inventory batches exist in both branches

### Step 3.1: Branch-Scoped Data Visibility
- [ ] Login as Branch Manager for Branch A
- [ ] Navigate to `/inventory`
- [ ] **VERIFY**: Only inventory from Branch A is visible
- [ ] Navigate to `/sales`
- [ ] **VERIFY**: Only sales from Branch A are visible
- [ ] Navigate to `/purchases`
- [ ] **VERIFY**: Only purchases from Branch A are visible

### Step 3.2: Super Admin Global View
- [ ] Login as Super Admin
- [ ] Navigate to `/inventory`
- [ ] **VERIFY**: Inventory from ALL branches is visible
- [ ] **VERIFY**: Branch column/filter available
- [ ] Navigate to `/sales`
- [ ] **VERIFY**: Sales from ALL branches visible

### Step 3.3: Stock Transfer Between Branches
- [ ] Login as user with stock_transfer permission
- [ ] Navigate to `/inventory/stock-transfer`
- [ ] Select an inventory batch from Branch A
- [ ] Select destination: Branch B
- [ ] Enter quantity to transfer (less than available)
- [ ] Click "Transfer"
- [ ] **VERIFY**: Transfer created successfully
- [ ] **VERIFY**: Batch now shows in Branch B inventory
- [ ] **VERIFY**: Original batch quantity decreased in Branch A

### Step 3.4: Consolidated Reporting
- [ ] Login as Super Admin
- [ ] Navigate to `/reports` or `/accounts/reports`
- [ ] Generate Profit & Loss report for "All Branches"
- [ ] **VERIFY**: Report includes data from all branches
- [ ] Generate same report filtered by Branch A only
- [ ] **VERIFY**: Report shows only Branch A data

---

## Test 4: Error Boundary (Frontend)

### Step 4.1: Trigger Frontend Error
- [ ] Open browser console (F12)
- [ ] Navigate to any page
- [ ] Artificially cause an error (e.g., access undefined object property in React component)
- [ ] **VERIFY**: Error Boundary catches the error
- [ ] **VERIFY**: User sees "Something went wrong" message
- [ ] **VERIFY**: Error details displayed (in development mode)
- [ ] **VERIFY**: "Refresh Page" and "Go to Login" buttons work

---

## Test 5: Payment Account Report 404 Handling

### Step 5.1: Access Invalid Account
- [ ] Navigate to payment accounts list `/accounts/payment-accounts`
- [ ] Create a fake UUID: `00000000-0000-0000-0000-000000000000`
- [ ] Manually navigate to: `/accounts/payment-accounts/report/00000000-0000-0000-0000-000000000000`
- [ ] **VERIFY**: Error message displays "Account Not Found"
- [ ] **VERIFY**: Error message explains the account doesn't exist
- [ ] **VERIFY**: "Back to Payment Accounts" button appears
- [ ] Click "Back to Payment Accounts"
- [ ] **VERIFY**: Navigates to `/accounts/payment-accounts`

---

## Test Results Summary

### Pass/Fail Count
- Total Tests: 5 major workflows
- Passed: ____
- Failed: ____
- Skipped: ____

### Failed Tests (if any)
List any failed tests with description:

1. ________________________________
2. ________________________________
3. ________________________________

### Notes
_(Add any observations, bugs found, or recommendations)_

---

**Tester**: ________________  
**Date**: ________________  
**Environment**: Development / Staging / Production  
**Database**: Fresh / Existing Data
