# CRITICAL REMEDIATION PLAN
**Version:** 1.0.0  
**Date:** 2024  
**Status:** ✅ COMPLETED  
**Principle:** Financial Data Integrity is Paramount - Operations MUST be Atomic (ACID) or Fail Completely

---

## EXECUTIVE SUMMARY

This document outlines the systematic remediation of **3 Critical Bugs**, **1 Performance Bottleneck**, and **Architecture Consistency Issues** identified in the code audit. All fixes prioritize **Financial Data Integrity** and **ACID Compliance**.

---

## PHASE 1: VERIFICATION & ANALYSIS

### ✅ Verification Complete

- [x] **Bug 1 Verified**: `paymentController.js:602` - Inverted refund logic confirmed
- [x] **Bug 2 Verified**: `importService.js:249` - N+1 query in `importProducts` loop confirmed
- [x] **Bug 3 Verified**: `paymentController.js:155-172` - Ledger entries created outside transaction confirmed
- [x] **Bug 4 Verified**: `importExportController.js:108` - Entity validation exists but can be hardened

---

## PHASE 2: ARCHITECTURE PLAN

### Transaction Strategy

**Current State:**
- `ledgerService.createLedgerEntry()` does NOT accept a `transaction` parameter
- Controllers commit transactions BEFORE creating ledger entries
- Silent error swallowing in catch blocks (lines 169-172, 507-510, 694-703)

**Target State:**
- `createLedgerEntry()` accepts optional `transaction` parameter
- All ledger operations participate in the same transaction
- Transaction rollback on ANY failure (including ledger creation)

**Implementation Pattern:**
```javascript
// Service signature change
export const createLedgerEntry = async (contactId, contactType, transactionData, transaction = null) => {
  // Pass transaction to all DB operations
  const ledgerEntry = await LedgerEntry.create({...}, { transaction });
  // ...
}
```

### Bulk Import Strategy

**Current State:**
- Loop with `await Product.findOne()` for each row (N+1 queries)
- Sequential processing (slow for large imports)

**Target State:**
- Batch fetch all products by SKU in single query
- In-memory Map for O(1) lookups
- Use `bulkCreate` and `bulkUpdate` for batch operations

**Pseudocode:**
```javascript
// 1. Extract all SKUs from data
const skus = data.map(row => row.sku.trim());

// 2. Batch fetch existing products
const existingProducts = await Product.findAll({ where: { sku: { [Op.in]: skus } } });
const productMap = new Map(existingProducts.map(p => [p.sku, p]));

// 3. Separate into creates and updates
const toCreate = [];
const toUpdate = [];

for (const row of data) {
  const existing = productMap.get(row.sku.trim());
  if (existing) {
    toUpdate.push({ id: existing.id, ...productData });
  } else {
    toCreate.push(productData);
  }
}

// 4. Bulk operations
if (toCreate.length > 0) await Product.bulkCreate(toCreate);
if (toUpdate.length > 0) await Product.bulkUpdate(toUpdate, { fields: [...] });
```

---

## PHASE 3: IMPLEMENTATION CHECKLIST

### STEP 1: Fix Refund Math Logic (CRITICAL, LOW EFFORT) ✅ COMPLETED
- [x] **File**: `backend/src/controllers/paymentController.js`
- [x] **Location**: Line 602 in `processRefund`
- [x] **Change**: Change subtraction to addition for refund_amount
- [x] **Current**: `customer.ledger_balance = ... - refund_amount + fee`
- [x] **Fixed**: `customer.ledger_balance = ... + refund_amount + fee`
- [x] **Rationale**: Refund increases customer's advance balance (reduces liability), so we ADD to negative balance

### STEP 2: Refactor Ledger Service for Transaction Support (CRITICAL, MEDIUM EFFORT) ✅ COMPLETED
- [x] **File**: `backend/src/services/ledgerService.js`
- [x] **Change**: Add optional `transaction` parameter to `createLedgerEntry`
- [x] **Change**: Pass transaction to all DB operations (LedgerEntry.create, Customer.findByPk, Customer.save, etc.)
- [x] **Change**: Update `calculateRunningBalance` to accept and use transaction
- [x] **File**: `backend/src/controllers/paymentController.js`
- [x] **Change**: Pass transaction to `createLedgerEntry` in `confirmPayment` (line 155)
- [x] **Change**: Pass transaction to `createLedgerEntry` in `confirmAdvancePayment` (line 493)
- [x] **Change**: Pass transaction to `createLedgerEntry` in `processRefund` (lines 642, 660)
- [x] **Change**: REMOVE try/catch blocks that swallow ledger errors (lines 147-172, 486-510, 634-703)
- [x] **Change**: Move ledger entry creation INSIDE transaction (before commit)
- [x] **Rationale**: ACID compliance - entire payment operation must succeed or fail atomically

### STEP 3: Refactor Import Service for Bulk Operations (PERFORMANCE, HIGH EFFORT) ✅ COMPLETED
- [x] **File**: `backend/src/services/importService.js`
- [x] **Function**: `importProducts` (line 145)
- [x] **Change**: Extract all SKUs from data array
- [x] **Change**: Batch fetch existing products using `Product.findAll({ where: { sku: { [Op.in]: skus } } })`
- [x] **Change**: Create in-memory Map: `new Map(existingProducts.map(p => [p.sku, p]))`
- [x] **Change**: Separate data into `toCreate` and `toUpdate` arrays
- [x] **Change**: Use `Product.bulkCreate()` with `updateOnDuplicate` for both creates and updates
- [x] **Change**: Maintain error tracking per row for detailed reporting
- [x] **Rationale**: Eliminate N+1 queries - reduce 1000-row import from 1001 queries to ~3 queries

### STEP 4: Harden Entity Validation (SECURITY, LOW EFFORT) ✅ COMPLETED
- [x] **File**: `backend/src/controllers/importExportController.js`
- [x] **Location**: `importData` function (line 93)
- [x] **Change**: Move entity validation to TOP of function (before file parsing)
- [x] **Change**: Use strict whitelist with early return
- [x] **Change**: Consider adding rate limiting or additional validation
- [x] **Rationale**: Fail fast - don't waste resources parsing invalid entity types

### STEP 5: Extract Locale Configuration (MINOR, LOW EFFORT) ✅ COMPLETED
- [x] **File**: `backend/src/controllers/paymentController.js`
- [x] **Location**: Line 11 (hardcoded 'en-NG')
- [x] **Change**: Create `backend/src/config/locale.js` with locale constants
- [x] **Change**: Import and use locale constant in `formatCurrency`
- [x] **Change**: Consider making it configurable via BusinessSettings
- [x] **Rationale**: Centralize configuration for easier maintenance

### STEP 6: Buffer/BOM Handling Enhancement (MINOR, LOW EFFORT) ✅ VERIFIED
- [x] **File**: `backend/src/services/importService.js`
- [x] **Location**: `normalizeHeader` function (line 10)
- [x] **Status**: Already handles BOM (line 16: `header.replace(/^\uFEFF/, '')`)
- [x] **Action**: Verified BOM handling is sufficient
- [x] **Rationale**: Ensure robust CSV parsing across different encodings

---

## PHASE 4: TESTING & VALIDATION

### Test Cases

- [ ] **Refund Logic Test**: Customer with -1000 advance balance, refund 500 → balance should be -500 (not -1500)
- [ ] **Transaction Integrity Test**: Simulate ledger service failure → entire payment should rollback
- [ ] **Bulk Import Performance Test**: Import 1000 products → should complete in <5 seconds
- [ ] **Entity Validation Test**: Attempt import with invalid entity → should fail before file parsing
- [ ] **Locale Configuration Test**: Verify currency formatting uses configured locale

---

## RISK ASSESSMENT

| Risk | Severity | Mitigation |
|------|----------|------------|
| Refund logic fix breaks existing refunds | HIGH | Test with negative balances, verify math |
| Transaction rollback causes data inconsistency | HIGH | Ensure all operations use same transaction object |
| Bulk import loses error granularity | MEDIUM | Maintain per-row error tracking |
| Performance regression | LOW | Benchmark before/after, use bulk operations |

---

## ROLLBACK PLAN

If issues arise:
1. Revert transaction support changes (Step 2) - most critical
2. Revert refund logic (Step 1) - verify test cases first
3. Revert bulk import (Step 3) - performance can be optimized later

---

## NOTES

- **Silent Error Swallowing**: The try/catch blocks in paymentController that swallow ledger errors MUST be removed. Financial operations cannot silently fail.
- **Transaction Propagation**: Ensure transaction object is passed through ALL service layers that touch the database.
- **Bulk Operations**: Sequelize's `bulkUpdate` may not support all use cases. May need to use `bulkCreate` with `updateOnDuplicate` or individual updates in a transaction.

---

**END OF PLAN**

