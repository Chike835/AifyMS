# Locale Configuration Migration Guide

## Completed
- ✅ Created centralized locale config: `frontend/src/config/locale.js`
- ✅ Updated `PaymentAccountReport.jsx` as reference example

## Pattern for Remaining Files

### Files to Update (42 total)
See grep search results for complete list. Key files include:
- Dashboard.jsx
- Reports.jsx
- Sales.jsx, Quotations.jsx, Drafts.jsx
- Customers.jsx, CustomerLedger.jsx
- Suppliers.jsx, SupplierLedger.jsx
- PaymentAccounts.jsx, Payments.jsx
- And 30+ more...

### Migration Pattern

**OLD CODE (Remove):**
```javascript
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN'
  }).format(amount || 0);
};

const formatDate = (dateString) => {
  if (!dateString) return '—';
  return new Date(dateString).toLocaleDateString('en-NG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};
```

**NEW CODE (Add):**
```javascript
// At top of file, add import
import { formatCurrency, formatDate, formatDateTime } from '../config/locale';

// Remove formatCurrency and formatDate functions
// Use imported functions directly
```

### Search & Replace Instructions

1. **Add import** at top of each file:
   ```javascript
   import { formatCurrency, formatDate, formatDateTime } from '../config/locale';
   ```

2. **Remove local formatCurrency functions** (look for `new Intl.NumberFormat('en-NG'`)

3. **Remove local formatDate functions** (look for `new Date(dateString).toLocaleDateString('en-NG'`)

4. **Replace inline formatting**:
   - Replace: `new Date(date).toLocaleDateString('en-NG', {...})` 
   - With: `formatDate(date)` or `formatDateTime(date)`

5. **Replace inline currency**:
   - Replace: `new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount)`
   - With: `formatCurrency(amount)`

## Verification

After migration, search for:
- `'en-NG'` - should only appear in `frontend/src/config/locale.js`
- `currency: 'NGN'` - should only appear in `frontend/src/config/locale.js`

## Benefits

✅ Single source of truth for locale settings  
✅ Easy to change currency or locale globally  
✅ Consistent formatting across entire app  
✅ Reduced code duplication

## Status
- **Completed**: 1/43 files (PaymentAccountReport.jsx)  
- **Remaining**: 42 files (documented pattern for user to complete or automate)
