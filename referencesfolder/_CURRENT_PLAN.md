# Execution Plan: Gauge Input Bugfixes
- [x] `_CURRENT_PLAN.md`: Capture this new execution plan with checkboxes before making code changes.
- [x] [`frontend/src/pages/InventoryBatches.jsx`](frontend/src/pages/InventoryBatches.jsx): Clear or reinitialize `attribute_data.gauge_mm` when the selected product/category changes so hidden gauge values are not submitted for non-enabled categories.
- [x] [`frontend/src/pages/InventoryBatches.jsx`](frontend/src/pages/InventoryBatches.jsx): Prevent duplicate gauge inputs by filtering `gauge_mm` out of the schema passed to `AttributeRenderer` (or otherwise synchronizing the standalone control with the dynamic renderer).
- [x] Verification: Describe manual/automated checks confirming gauge values reset on product change and that only one gauge input renders when schema includes `gauge_mm`.

## Verification Steps

### Bug 1 Verification: Gauge Value Persistence
1. **Test Case**: Switch from gauge-enabled to non-gauge-enabled product
   - Create batch, select product from gauge-enabled category (e.g., "Aluminium")
   - Enter gauge value (e.g., `0.17`)
   - Switch to product from non-gauge-enabled category (e.g., "Accessories")
   - **Expected**: Gauge input field disappears and `gauge_mm` is cleared from `formData.attribute_data`
   - Submit form and verify batch is created without `gauge_mm` in `attribute_data`

2. **Test Case**: Switch from non-gauge-enabled to gauge-enabled product
   - Create batch, select product from non-gauge-enabled category
   - Switch to product from gauge-enabled category
   - **Expected**: Gauge input field appears, no stale `gauge_mm` value present

3. **Test Case**: Switch between two gauge-enabled products
   - Select product A (gauge-enabled), enter gauge `0.17`
   - Switch to product B (gauge-enabled, different category)
   - **Expected**: Gauge input remains visible, `gauge_mm` is cleared (to prevent using wrong category's gauge value)

### Bug 2 Verification: Duplicate Input Prevention
1. **Test Case**: Category schema includes `gauge_mm`
   - Manually add `gauge_mm` to a category's `attribute_schema` in database
   - Create/edit batch with product from that category
   - **Expected**: Only ONE gauge input field appears (the standalone one), not two
   - Verify `AttributeRenderer` does not render `gauge_mm` field

2. **Test Case**: Normal category schema without `gauge_mm`
   - Create/edit batch with product from category that doesn't have `gauge_mm` in schema
   - **Expected**: Other attributes render normally via `AttributeRenderer`, no errors

### Manual Testing Checklist
- [ ] Bug 1: Gauge value clears when switching to non-enabled category
- [ ] Bug 1: Gauge value clears when switching between different products
- [ ] Bug 1: No `gauge_mm` in submitted data for non-enabled categories
- [ ] Bug 2: Only one gauge input appears when schema includes `gauge_mm`
- [ ] Bug 2: Other attributes render normally when `gauge_mm` is filtered out
- [ ] No console errors during product switching
- [ ] No form state inconsistencies
