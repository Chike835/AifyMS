# Execution Plan: Fix Payment Controller Bugs

## Bug 1: Incorrect transaction_date in Ledger Entries
- [x] Fix `confirmPayment`: Use `payment.created_at` instead of `new Date()` for transaction_date
- [x] Fix `confirmAdvancePayment`: Use `payment.created_at` instead of `new Date()` for transaction_date
- [x] Verify `processRefund`: Keep `new Date()` (correct for new refund transaction)

## Bug 2: Invalid branch_id Filter on Payments Table
- [x] Fix `getPayments`: Filter by creator's branch_id via User join instead of non-existent payment.branch_id
- [x] Fix `getRecentPayments`: Filter by creator's branch_id via User join instead of non-existent payment.branch_id
- [x] Fix `getPendingPayments`: Filter by creator's branch_id via User join instead of non-existent payment.branch_id
