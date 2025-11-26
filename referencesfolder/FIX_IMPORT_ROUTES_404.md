# Fix Import Routes 404 Error

## 1. Root Cause Analysis

### Issue Identified
The 404 errors are caused by **route ordering conflicts** in Express.js. Express matches routes in the order they are defined, and parameterized routes (`/brands/:id`) can intercept more specific routes (`/brands/import`) if they are defined first.

### Current Route Structure
- **Backend Routes Mounted** (in `backend/src/routes/index.js`):
  - `/api/attributes` → `attributeRoutes`
  - `/api/units` → `unitRoutes`
  - `/api/categories` → `categoryRoutes`
  - `/api/variations` → `variationRoutes`
  - `/api/warranties` → `warrantyRoutes`

- **Frontend Endpoints** (all correct):
  - `/api/attributes/brands/import`
  - `/api/units/import`
  - `/api/categories/import`
  - `/api/variations/import`
  - `/api/warranties/import`

### Problem
In Express.js, when you have:
```javascript
router.post('/brands/:id', ...)  // Matches /brands/anything
router.post('/brands/import', ...)  // More specific, but defined after
```

Express will match `/brands/import` to the first route (`/brands/:id`) because it matches the pattern first, treating "import" as the `:id` parameter.

**Solution**: Define specific routes (`/import`, `/export`) BEFORE parameterized routes (`/:id`).

## 2. Backend Wiring Fix

### Current Status: ✅ CORRECT
The routes are properly registered in `backend/src/routes/index.js`:
```javascript
router.use('/attributes', attributeRoutes);  // → /api/attributes/*
router.use('/units', unitRoutes);           // → /api/units/*
router.use('/categories', categoryRoutes);  // → /api/categories/*
router.use('/variations', variationRoutes); // → /api/variations/*
router.use('/warranties', warrantyRoutes);  // → /api/warranties/*
```

**No changes needed** - routes are correctly mounted.

## 3. Route Definition Fix

### Critical: Route Order Matters

All route files must define `/import` and `/export` routes **BEFORE** any `/:id` routes to prevent Express from matching "import" or "export" as an ID parameter.

### Fixed Route Files

#### ✅ attributeRoutes.js (Already Fixed by User)
```javascript
// CORRECT ORDER:
router.get('/brands', ...);
router.post('/brands', ...);
router.post('/brands/import', ...);  // ✅ Before /:id
router.get('/brands/export', ...);  // ✅ Before /:id
router.put('/brands/:id', ...);     // ✅ After specific routes
router.delete('/brands/:id', ...);  // ✅ After specific routes
```

#### ✅ categoryRoutes.js (Already Correct)
```javascript
router.get('/', ...);
router.post('/', ...);
router.post('/import', ...);  // ✅ Before /:id
router.get('/export', ...);   // ✅ Before /:id
router.get('/:id', ...);      // ✅ After specific routes
router.put('/:id', ...);
router.delete('/:id', ...);
```

#### ✅ unitRoutes.js (Already Correct)
```javascript
router.get('/', ...);
router.post('/', ...);
router.post('/import', ...);  // ✅ Before /:id
router.get('/export', ...);   // ✅ Before /:id
router.get('/:id', ...);      // ✅ After specific routes
router.put('/:id', ...);
router.delete('/:id', ...);
```

#### ✅ variationRoutes.js (Already Correct)
```javascript
router.get('/', ...);
router.post('/', ...);
router.post('/import', ...);  // ✅ Before /:id
router.get('/export', ...);   // ✅ Before /:id
router.get('/:id', ...);      // ✅ After specific routes
router.put('/:id', ...);
router.delete('/:id', ...);
```

#### ✅ warrantyRoutes.js (Already Correct)
```javascript
router.get('/', ...);
router.post('/', ...);
router.post('/import', ...);  // ✅ Before /:id
router.get('/export', ...);   // ✅ Before /:id
router.get('/:id', ...);      // ✅ After specific routes
router.put('/:id', ...);
router.delete('/:id', ...);
```

## 4. URL Verification Table

| Entity | Frontend Endpoint | Backend Route | Mount Path | Full URL | Status |
|--------|------------------|---------------|------------|----------|--------|
| **Brands** | `/api/attributes/brands/import` | `POST /brands/import` | `/api/attributes` | `/api/attributes/brands/import` | ✅ Correct |
| **Brands** | `/api/attributes/brands/export` | `GET /brands/export` | `/api/attributes` | `/api/attributes/brands/export` | ✅ Correct |
| **Units** | `/api/units/import` | `POST /import` | `/api/units` | `/api/units/import` | ✅ Correct |
| **Units** | `/api/units/export` | `GET /export` | `/api/units` | `/api/units/export` | ✅ Correct |
| **Categories** | `/api/categories/import` | `POST /import` | `/api/categories` | `/api/categories/import` | ✅ Correct |
| **Categories** | `/api/categories/export` | `GET /export` | `/api/categories` | `/api/categories/export` | ✅ Correct |
| **Variations** | `/api/variations/import` | `POST /import` | `/api/variations` | `/api/variations/import` | ✅ Correct |
| **Variations** | `/api/variations/export` | `GET /export` | `/api/variations` | `/api/variations/export` | ✅ Correct |
| **Warranties** | `/api/warranties/import` | `POST /import` | `/api/warranties` | `/api/warranties/import` | ✅ Correct |
| **Warranties** | `/api/warranties/export` | `GET /export` | `/api/warranties` | `/api/warranties/export` | ✅ Correct |

## 5. Additional Debugging Steps

If 404 errors persist after verifying route order:

### 5.1 Verify Server is Running
```bash
# Check if server is listening
curl http://localhost:PORT/health
```

### 5.2 Test Route Directly
```bash
# Test import endpoint (requires authentication)
curl -X POST http://localhost:PORT/api/units/import \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@test.csv"
```

### 5.3 Check Route Registration
Add temporary logging in `backend/src/routes/index.js`:
```javascript
router.use('/units', (req, res, next) => {
  console.log('Units route hit:', req.method, req.path);
  next();
}, unitRoutes);
```

### 5.4 Verify Middleware Order
Ensure `uploadMiddleware` is correctly imported and applied:
```javascript
import { uploadMiddleware } from '../controllers/importExportController.js';
// ...
router.post('/import', requirePermission('product_add'), uploadMiddleware, importUnits);
```

### 5.5 Check for Conflicting Routes
Search for any other route definitions that might conflict:
```bash
grep -r "router\.(post|get).*import" backend/src/routes/
```

## 6. Common Express Route Matching Pitfalls

### Pitfall 1: Parameterized Routes First
```javascript
// ❌ WRONG - /import will match /:id with id="import"
router.get('/:id', handler);
router.get('/import', handler);

// ✅ CORRECT - Specific routes first
router.get('/import', handler);
router.get('/:id', handler);
```

### Pitfall 2: Wildcard Routes
```javascript
// ❌ WRONG - Catches everything
router.use('*', middleware);

// ✅ CORRECT - Specific routes before wildcard
router.get('/import', handler);
router.use('*', middleware);
```

### Pitfall 3: Multiple Parameter Routes
```javascript
// ❌ WRONG - Order matters
router.get('/:category/:id', handler);
router.get('/categories/import', handler);  // Won't match!

// ✅ CORRECT - More specific first
router.get('/categories/import', handler);
router.get('/:category/:id', handler);
```

## 7. Fix Applied ✅

**Issue Fixed**: Route order in `attributeRoutes.js` has been corrected. The `/brands/import` and `/brands/export` routes are now defined **BEFORE** the `/brands/:id` routes to prevent Express from matching "import" or "export" as ID parameters.

**Action Required**: Restart the backend server for changes to take effect.

## 8. Verification Checklist

- [x] Routes are registered in `backend/src/routes/index.js`
- [x] `/import` and `/export` routes are defined BEFORE `/:id` routes
- [x] Frontend endpoints match backend route structure
- [x] `uploadMiddleware` is imported and applied
- [x] Route order is correct in all route files
- [ ] **Server restarted after route changes** ⚠️ REQUIRED
- [ ] Authentication token is valid
- [ ] File upload format is correct (multipart/form-data)

## 9. Final Verification

After applying fixes, test each endpoint:

```bash
# Test Units Import
POST /api/units/import

# Test Categories Import  
POST /api/categories/import

# Test Variations Import
POST /api/variations/import

# Test Warranties Import
POST /api/warranties/import

# Test Brands Import
POST /api/attributes/brands/import
```

All endpoints should return 200 (success) or 400 (validation error), **NOT 404**.

