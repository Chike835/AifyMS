# Execution Plan: Fix ReferenceError in Payments.jsx

## Goal
Fix the `ReferenceError: Cannot access 'createPaymentMutation' before initialization` which crashes the Payments page.

## Proposed Changes
- [x] `frontend/src/pages/Payments.jsx`: Move `createPaymentMutation` and `confirmPaymentMutation` definitions before they are referenced by `isCreateDisabled`.
