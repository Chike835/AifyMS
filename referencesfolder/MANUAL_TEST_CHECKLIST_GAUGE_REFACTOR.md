# Manual Test Checklist: Gauge Range & Category Toggles Refactor

**Feature:** Dynamic gauge input system based on category toggles  
**Date:** 2025-01-27  
**Status:** Ready for Testing

---

## Pre-Testing Setup

1. **Database Migration:**
   - Verify `gauge_enabled_categories` setting exists in `business_settings` table
   - Default value should be: `["aluminium", "stone_tile"]`
   - Verify `manufacturing_gauges` setting still exists (backward compatibility)

2. **Test Data:**
   - Ensure at least 2 product categories exist (e.g., "Aluminium", "Stone Tile", and one other category)
   - Ensure at least one product exists in each category
   - Products should be of type `raw_tracked` for batch creation

---

## Test Scenarios

### 1. Settings UI - Category Toggle Functionality

**Location:** `/inventory/settings/gauges-colors` → Gauges tab

#### Test 1.1: View Category Checkboxes
- [ ] Navigate to Settings → Gauges & Colors → Gauges tab
- [ ] Verify checkbox list displays all product categories
- [ ] Verify "aluminium" and "stone_tile" are checked by default
- [ ] Verify other categories are unchecked by default

#### Test 1.2: Enable Category
- [ ] Check an unchecked category (e.g., "Accessories")
- [ ] Verify loading indicator appears briefly
- [ ] Verify category remains checked after save
- [ ] Refresh page and verify category is still checked (persistence)

#### Test 1.3: Disable Category
- [ ] Uncheck a previously checked category (e.g., "Aluminium")
- [ ] Verify loading indicator appears briefly
- [ ] Verify category remains unchecked after save
- [ ] Refresh page and verify category is still unchecked (persistence)

#### Test 1.4: Permission Check
- [ ] Log in as user without `settings_manage` permission
- [ ] Verify checkboxes are disabled/not clickable
- [ ] Verify no error messages appear

---

### 2. Batch Creation - Gauge Input Display

**Location:** `/inventory/batches` → Create Batch

#### Test 2.1: Gauge Input Appears for Enabled Category
- [ ] Create new batch
- [ ] Select a product from an enabled category (e.g., "Aluminium")
- [ ] Verify "Gauge (mm)" input field appears
- [ ] Verify input has attributes:
  - Type: number
  - Step: 0.01
  - Min: 0.10
  - Max: 1.00
  - Placeholder: "0.10 - 1.00"
  - Help text: "Enter a value between 0.10 and 1.00 mm (2 decimal places)"

#### Test 2.2: Gauge Input Hidden for Disabled Category
- [ ] Create new batch
- [ ] Select a product from a disabled category (not in enabled list)
- [ ] Verify "Gauge (mm)" input field does NOT appear
- [ ] Verify form can still be submitted without gauge value

#### Test 2.3: Gauge Input Value Entry
- [ ] Enter valid gauge value: `0.17`
- [ ] Verify value is accepted
- [ ] Enter another valid value: `0.34`
- [ ] Verify value updates correctly
- [ ] Enter edge case values:
  - [ ] `0.10` (minimum) - should be accepted
  - [ ] `1.00` (maximum) - should be accepted
  - [ ] `0.99` - should be accepted
  - [ ] `0.55` - should be accepted

#### Test 2.4: Gauge Input Validation (Frontend)
- [ ] Enter invalid value: `0.05` (below minimum)
- [ ] Verify browser validation prevents submission
- [ ] Enter invalid value: `1.50` (above maximum)
- [ ] Verify browser validation prevents submission
- [ ] Enter invalid value: `abc` (non-numeric)
- [ ] Verify browser validation prevents submission

#### Test 2.5: Decimal Precision
- [ ] Enter value with 3+ decimals: `0.123`
- [ ] Verify value rounds to 2 decimals: `0.12`
- [ ] Enter value: `0.999`
- [ ] Verify value rounds to: `0.99`

---

### 3. Batch Creation - Full Flow

#### Test 3.1: Create Batch with Gauge (Enabled Category)
- [ ] Fill in all required fields:
  - Product (from enabled category)
  - Branch
  - Batch Type
  - Initial Quantity
  - Gauge (e.g., `0.17`)
- [ ] Submit form
- [ ] Verify batch is created successfully
- [ ] Verify batch `attribute_data.gauge_mm` = `0.17` in database

#### Test 3.2: Create Batch without Gauge (Disabled Category)
- [ ] Fill in all required fields:
  - Product (from disabled category)
  - Branch
  - Batch Type
  - Initial Quantity
  - (No gauge field should appear)
- [ ] Submit form
- [ ] Verify batch is created successfully
- [ ] Verify batch `attribute_data.gauge_mm` is `null` or undefined

---

### 4. Batch Edit - Gauge Input

**Location:** `/inventory/batches` → Edit Batch

#### Test 4.1: Edit Batch with Existing Gauge
- [ ] Open existing batch with gauge value (from enabled category)
- [ ] Verify "Gauge (mm)" input appears with existing value
- [ ] Modify gauge value: `0.17` → `0.25`
- [ ] Save batch
- [ ] Verify batch is updated successfully
- [ ] Verify new gauge value is persisted

#### Test 4.2: Edit Batch - Category Changed to Enabled
- [ ] Open existing batch from disabled category
- [ ] Change product to one from enabled category
- [ ] Verify "Gauge (mm)" input appears
- [ ] Enter gauge value
- [ ] Save batch
- [ ] Verify batch updates with gauge value

#### Test 4.3: Edit Batch - Category Changed to Disabled
- [ ] Open existing batch with gauge value
- [ ] Change product to one from disabled category
- [ ] Verify "Gauge (mm)" input disappears
- [ ] Save batch
- [ ] Verify batch updates (gauge value may be retained but not validated)

---

### 5. Backend Validation

#### Test 5.1: Valid Gauge Value
- [ ] Create/update batch with gauge = `0.50` (enabled category)
- [ ] Verify backend accepts value
- [ ] Check database: `attribute_data.gauge_mm` = `0.5` or `0.50`

#### Test 5.2: Invalid Gauge Value - Below Minimum
- [ ] Attempt to create batch with gauge = `0.05` (enabled category)
- [ ] Verify backend returns error: "Gauge (gauge_mm) must be between 0.10 and 1.00 mm"
- [ ] Verify batch is NOT created

#### Test 5.3: Invalid Gauge Value - Above Maximum
- [ ] Attempt to create batch with gauge = `1.50` (enabled category)
- [ ] Verify backend returns error: "Gauge (gauge_mm) must be between 0.10 and 1.00 mm"
- [ ] Verify batch is NOT created

#### Test 5.4: Missing Gauge for Enabled Category
- [ ] For enabled category products, attempt to create batch without gauge_mm
- [ ] Verify backend behavior (may require gauge_mm or may allow null based on requirements)
- [ ] Document actual behavior

#### Test 5.5: Category Name Normalization
- [ ] Create category with name: "Stone Tile" (space)
- [ ] Enable it in settings
- [ ] Verify normalized name in DB: `stone_tile`
- [ ] Create batch with product from this category
- [ ] Verify gauge input appears and validation works

---

### 6. Edge Cases & Error Handling

#### Test 6.1: Settings Not Configured
- [ ] Manually delete `gauge_enabled_categories` setting from database
- [ ] Verify settings page still loads (no crash)
- [ ] Verify batch creation still works (gauge input should not appear)

#### Test 6.2: Invalid Settings Value
- [ ] Manually set `gauge_enabled_categories` to invalid JSON: `"not an array"`
- [ ] Verify system handles gracefully (defaults to empty array)
- [ ] Verify batch creation still works

#### Test 6.3: Category Name Variations
- [ ] Test categories with names:
  - "Aluminium" vs "aluminium" (case sensitivity)
  - "Stone Tile" vs "Stone_Tile" (spaces vs underscores)
- [ ] Verify normalization handles all cases correctly

---

### 7. API Response Verification

#### Test 7.1: Settings API
- [ ] `GET /api/settings?category=manufacturing`
- [ ] Verify response includes:
  ```json
  {
    "settings": {
      "gauge_enabled_categories": {
        "value": ["aluminium", "stone_tile"],
        "type": "json",
        "category": "manufacturing"
      }
    }
  }
  ```

#### Test 7.2: Update Settings API
- [ ] `PUT /api/settings/gauge_enabled_categories`
- [ ] Payload: `{ "value": ["aluminium", "stone_tile", "accessories"] }`
- [ ] Verify response: `{ "message": "Setting updated successfully" }`
- [ ] Verify setting is persisted in database

#### Test 7.3: Batch Creation API
- [ ] `POST /api/inventory/batches`
- [ ] Payload includes `attribute_data: { gauge_mm: 0.17 }`
- [ ] Verify response includes created batch with gauge value
- [ ] Verify database record has correct gauge value

---

## Expected Results Summary

### ✅ Success Criteria
1. Category toggles work correctly and persist to database
2. Gauge input appears only for enabled categories
3. Frontend validation prevents invalid gauge values
4. Backend validation enforces 0.10-1.00 range for enabled categories
5. Batch creation/editing works with and without gauge values
6. No regressions in existing batch functionality
7. Category name normalization handles all cases correctly

### ⚠️ Known Issues / Notes
- Document any discrepancies between expected and actual behavior
- Note any performance issues with settings queries
- Record any error messages encountered

---

## Post-Testing Actions

- [ ] Review all test results
- [ ] Document any bugs found
- [ ] Verify no console errors in browser DevTools
- [ ] Verify no backend errors in server logs
- [ ] Update FeaturesStatus.md to mark feature as **[Working]** if all tests pass

---

*This checklist should be completed after deployment and before marking the feature as working.*

