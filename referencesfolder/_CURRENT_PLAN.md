# Execution Plan: Fix Product Import - Currency Parsing

## Problem
Product import fails because numeric fields (`sale_price`, etc.) contain currency symbols (₦) and commas, causing `parseFloat` to return `NaN` or incorrect values.

## Tasks
- [x] `backend/src/services/importService.js`: Add a `parseCurrency` helper to strip non-numeric characters (except `.` and `-`) from price fields.
