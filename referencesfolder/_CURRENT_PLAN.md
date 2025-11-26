# Execution Plan: Critical Code Review Fixes

## Phase 1: Verification & Auditing - COMPLETED

### ✅ Verified Issues:

1. **Critical Bug 1A - Undefined Variable `inventoryInstance`**
   - **Location:** `backend/src/controllers/salesController.js:211`
   - **Issue:** Variable defined as `inventoryBatch` (line 203) but checked as `inventoryInstance` (line 211)
   - **Status:** ✅ CONFIRMED

2. **Critical Bug 1B - Undefined Variable `total_amount`**
   - **Location:** `backend/src/controllers/salesController.js:266, 273`
   - **Issue:** Variable defined as `totalAmount` (line 72) but used as `total_amount` (snake_case) in commission calculation
   - **Status:** ✅ CONFIRMED

3. **Race Condition 2A - Invoice Number Generation**
   - **Location:** `backend/src/controllers/salesController.js:8-33` (`generateInvoiceNumber` function)
   - **Issue:** Reads last invoice and increments without transaction lock. Concurrent requests will create duplicates.
   - **Status:** ✅ CONFIRMED

4. **Destructive Draft Updates 2B**
   - **Location:** `backend/src/controllers/salesController.js:715-788` (`updateDraft` function)
   - **Issue:** Uses `destroy` (line 736) followed by `create` (line 756), breaking potential future relations (notes/allocations)
   - **Status:** ✅ CONFIRMED

5. **Floating Point Math Errors 2C**
   - **Locations:** Multiple throughout `salesController.js`:
     - Lines 74-75: `totalAmount += subtotal` (parseFloat multiplication)
     - Line 138: `parseFloat(quantity) * parseFloat(unit_price)`
     - Line 176: `parseFloat(quantity) * parseFloat(recipe.conversion_factor)`
     - Line 181: `totalAssigned += parseFloat(assignment.quantity_deducted || 0)`
     - Line 184: `Math.abs(totalAssigned - totalRawMaterialNeeded) > 0.001`
     - Line 227: `parseFloat(quantity_deducted)`
     - Line 236: `inventoryBatch.remaining_quantity -= qtyToDeduct`
     - Line 266: `(total_amount * parseFloat(agent.commission_rate)) / 100`
     - Lines 744-745: Similar calculations in `updateDraft`
     - Line 882: `batch.remaining_quantity -= quantity_deducted` (in convertDraftToInvoice)
     - Similar patterns in `convertQuotationToInvoice`
   - **Status:** ✅ CONFIRMED - Standard JS math operators on currency/inventory

6. **Heavy Authentication Middleware 3A**
   - **Location:** `backend/src/middleware/authMiddleware.js:24-43`
   - **Issue:** Queries User, Role (with nested Permissions), and Branch on EVERY request via `findByPk` with includes
   - **Status:** ✅ CONFIRMED

7. **Redundant Encryption Libraries 4A**
   - **Location:** `backend/package.json:20-21`
   - **Issue:** Both `bcrypt` (^5.1.1) and `bcryptjs` (^2.4.3) present
   - **Status:** ✅ CONFIRMED

8. **Docker Node Version 4B**
   - **Location:** `backend/Dockerfile:1` and `backend/package.json:9`
   - **Issue:** Dockerfile uses Node 18, dev script uses `--watch` (Node 18+ feature)
   - **Status:** ✅ VERIFIED - Actually compatible (Node 18 supports --watch), but should be documented

9. **Logic Duplication 5A - manufactured_virtual Logic**
   - **Locations:**
     - `createSale`: Lines 149-255
     - `convertDraftToInvoice`: Lines 826-904
     - `convertQuotationToInvoice`: Lines 1083-1159
   - **Issue:** Recipe check, inventory lock, stock deduction logic duplicated across three functions
   - **Status:** ✅ CONFIRMED

---

## Phase 2: Execution Plan - ✅ COMPLETED

### Quick Fixes (Priority 1 - Critical Bugs)

- [x] **Fix 1A:** Changed `inventoryInstance` to `inventoryBatch` in `salesController.js:211`
- [x] **Fix 1B:** Changed `total_amount` to `totalAmount` in `salesController.js:266, 273`
- [x] **Fix 4A:** Removed `bcrypt` from `package.json` (kept `bcryptjs` as per Dockerfile ENV)

### Data Integrity Fixes (Priority 2)

- [x] **Fix 2A:** Implemented PostgreSQL advisory lock for `generateInvoiceNumber`
  - Uses `pg_advisory_xact_lock()` within transaction to prevent race conditions
  - Lock automatically released when transaction ends
- [x] **Fix 2B:** Refactored `updateDraft` to use `update` instead of `destroy`+`create`
  - Updates existing SalesItems in-place where possible
  - Only creates/deletes items that actually changed
  - Preserves relations and maintains data integrity
- [x] **Fix 2C:** Implemented precision math utility for currency/inventory calculations
  - Created `backend/src/utils/mathUtils.js` with integer-based math (cents)
  - Replaced all `parseFloat` arithmetic with utility functions
  - Functions: `add`, `subtract`, `multiply`, `divide`, `percentage`, `equals`, `sum`, etc.

### Performance Optimization (Priority 3)

- [x] **Fix 3A:** Optimized auth middleware
  - Added role_id, branch_id, role_name, and permissions to JWT payload
  - Reduced DB query to only check `is_active` with minimal fields
  - Removed heavy joins (Role with nested Permissions) from every request
  - **Note:** Permissions in JWT may be stale if changed, but tokens expire (acceptable trade-off)

### Code Quality / DRY (Priority 4)

- [x] **Fix 5A:** Extracted manufactured_virtual logic to service
  - Created `backend/src/services/inventoryService.js`
  - Functions: `processManufacturedVirtualItem` and `processManufacturedVirtualItemForConversion`
  - Refactored `createSale`, `convertDraftToInvoice`, `convertQuotationToInvoice` to use service
  - Eliminated ~150 lines of duplicated code

---

## Phase 3: Execution - ✅ COMPLETED

**Status:** All fixes implemented and verified. No linter errors.
