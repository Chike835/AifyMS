# Batch Configuration System - Implementation Plan

## Overview
Replace hardcoded batch types (enum) with a dynamic, relational system where Batch Types are assigned to Categories, enabling strict material typing enforcement.

---

## 1. Schema Changes (init.sql)

### 1.1 Create `batch_types` Table
```sql
CREATE TABLE batch_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true
);
CREATE INDEX idx_batch_types_name ON batch_types(name);
CREATE INDEX idx_batch_types_active ON batch_types(is_active);
```

### 1.2 Create `category_batch_types` Junction Table
```sql
CREATE TABLE category_batch_types (
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    batch_type_id UUID NOT NULL REFERENCES batch_types(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (category_id, batch_type_id)
);
CREATE INDEX idx_category_batch_types_category ON category_batch_types(category_id);
CREATE INDEX idx_category_batch_types_batch_type ON category_batch_types(batch_type_id);
```

### 1.3 Update `inventory_batches` Table
- Remove `batch_type` enum column
- Add `batch_type_id` FK column
- Migrate existing data (map enum values to batch_type IDs)

```sql
-- Add new column
ALTER TABLE inventory_batches 
    ADD COLUMN batch_type_id UUID REFERENCES batch_types(id);

-- Migrate existing data (after seeding batch_types)
UPDATE inventory_batches 
SET batch_type_id = (SELECT id FROM batch_types WHERE name = batch_type::text)
WHERE batch_type_id IS NULL;

-- Make it NOT NULL after migration
ALTER TABLE inventory_batches 
    ALTER COLUMN batch_type_id SET NOT NULL;

-- Drop old enum column
ALTER TABLE inventory_batches 
    DROP COLUMN batch_type;

-- Update index
DROP INDEX IF EXISTS idx_inventory_batches_batch_type;
CREATE INDEX idx_inventory_batches_batch_type_id ON inventory_batches(batch_type_id);
```

### 1.4 Seed Default Batch Types
```sql
INSERT INTO batch_types (id, name, description) VALUES
    (uuid_generate_v4(), 'Coil', 'Rolled materials (e.g., Aluminium coils)'),
    (uuid_generate_v4(), 'Pallet', 'Stacked materials on pallets'),
    (uuid_generate_v4(), 'Carton', 'Boxed materials'),
    (uuid_generate_v4(), 'Loose', 'Untracked bulk materials')
ON CONFLICT (name) DO NOTHING;
```

### 1.5 Seed Category-Batch Type Mappings (Example)
```sql
-- Map default batch types to existing categories
-- This should be done after categories are seeded
-- Example: Aluminium category -> Coil, Pallet
INSERT INTO category_batch_types (category_id, batch_type_id)
SELECT c.id, bt.id
FROM categories c
CROSS JOIN batch_types bt
WHERE c.name = 'Aluminium' AND bt.name IN ('Coil', 'Pallet')
ON CONFLICT DO NOTHING;
```

---

## 2. Backend Implementation Plan

### 2.1 Model: `BatchType.js`
**Location:** `backend/src/models/BatchType.js`

```javascript
import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const BatchType = sequelize.define('BatchType', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  created_by: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'batch_types',
  timestamps: false,
  underscored: true
});

export default BatchType;
```

### 2.2 Model: `CategoryBatchType.js` (Junction)
**Location:** `backend/src/models/CategoryBatchType.js`

```javascript
import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const CategoryBatchType = sequelize.define('CategoryBatchType', {
  category_id: {
    type: DataTypes.UUID,
    primaryKey: true,
    references: {
      model: 'categories',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  batch_type_id: {
    type: DataTypes.UUID,
    primaryKey: true,
    references: {
      model: 'batch_types',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'category_batch_types',
  timestamps: false,
  underscored: true
});

export default CategoryBatchType;
```

### 2.3 Controller: `BatchSettingsController.js`
**Location:** `backend/src/controllers/BatchSettingsController.js`

**Methods:**
1. **`getAllTypes`** - GET `/api/settings/batches/types`
   - Returns all batch types (active only by default)

2. **`createType`** - POST `/api/settings/batches/types`
   - Creates new batch type (e.g., 'Carton')
   - Requires: `name`, optional: `description`

3. **`updateType`** - PUT `/api/settings/batches/types/:id`
   - Updates batch type name/description/status

4. **`deleteType`** - DELETE `/api/settings/batches/types/:id`
   - Soft delete (set is_active = false) if used in batches
   - Hard delete if not used

5. **`getTypesByCategory`** - GET `/api/settings/batches/types/category/:categoryId`
   - Returns valid batch types for a specific category
   - Used by "Add Product" page to filter dropdown

6. **`assignTypeToCategory`** - POST `/api/settings/batches/assignments`
   - Links batch type to category
   - Body: `{ category_id, batch_type_id }`

7. **`removeTypeFromCategory`** - DELETE `/api/settings/batches/assignments`
   - Removes batch type from category
   - Query params: `category_id`, `batch_type_id`

8. **`getCategoryAssignments`** - GET `/api/settings/batches/assignments`
   - Returns all category-batch type mappings
   - Optional filter by `category_id`

### 2.4 Routes: `batchSettingsRoutes.js`
**Location:** `backend/src/routes/batchSettingsRoutes.js`

```javascript
import express from 'express';
import {
  getAllTypes,
  createType,
  updateType,
  deleteType,
  getTypesByCategory,
  assignTypeToCategory,
  removeTypeFromCategory,
  getCategoryAssignments
} from '../controllers/BatchSettingsController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { requirePermission } from '../middleware/permissionMiddleware.js';

const router = express.Router();
router.use(authenticate);

// All routes require admin_access
router.get('/types', requirePermission('admin_access'), getAllTypes);
router.post('/types', requirePermission('admin_access'), createType);
router.put('/types/:id', requirePermission('admin_access'), updateType);
router.delete('/types/:id', requirePermission('admin_access'), deleteType);

router.get('/types/category/:categoryId', getTypesByCategory); // Public for product creation
router.get('/assignments', requirePermission('admin_access'), getCategoryAssignments);
router.post('/assignments', requirePermission('admin_access'), assignTypeToCategory);
router.delete('/assignments', requirePermission('admin_access'), removeTypeFromCategory);

export default router;
```

**Register in `backend/src/server.js`:**
```javascript
import batchSettingsRoutes from './routes/batchSettingsRoutes.js';
app.use('/api/settings/batches', batchSettingsRoutes);
```

### 2.5 Update `InventoryBatch` Model
**Location:** `backend/src/models/InventoryBatch.js`

- Replace `batch_type` enum field with `batch_type_id` FK
- Add association to `BatchType`

---

## 3. Frontend UI Plan

### 3.1 Page: `BatchSettings.jsx`
**Location:** `frontend/src/pages/inventory/settings/BatchSettings.jsx`

**Features:**

1. **Batch Types List Section**
   - Table showing: Name, Description, Status, Actions
   - "Create New Type" button
   - Edit/Delete actions per row

2. **Category-Batch Type Assignment Matrix**
   - Two-column layout:
     - Left: List of Categories (with search/filter)
     - Right: Checkboxes for each Batch Type
   - When category selected, show assigned types
   - Check/uncheck to assign/remove

**UI Components:**
- Modal for creating/editing batch types
- Confirmation dialog for deletions
- Success/error toast notifications

### 3.2 Update Sidebar Navigation
**Location:** `frontend/src/components/layout/Sidebar.jsx`

Add under "Inventory > Settings":
```javascript
{ name: 'Batches', path: '/inventory/settings/batches', icon: Settings, permission: 'admin_access' }
```

### 3.3 Update App Routes
**Location:** `frontend/src/App.jsx`

```javascript
import BatchSettings from './pages/inventory/settings/BatchSettings';

<Route
  path="/inventory/settings/batches"
  element={
    <ProtectedRoute>
      <Layout>
        <BatchSettings />
      </Layout>
    </ProtectedRoute>
  }
/>
```

---

## 4. Integration Logic (How 'Add Product' will use this)

### 4.1 Product Creation Flow
When user creates a product and selects a Category:

1. **Frontend:** Query `/api/settings/batches/types/category/:categoryId`
2. **Backend:** Returns only batch types assigned to that category
3. **Frontend:** Populate batch type dropdown with filtered results
4. **Validation:** Prevent selection of unassigned batch types

### 4.2 Example API Call
```javascript
// In AddProduct.jsx (future implementation)
const { data: batchTypes } = useQuery({
  queryKey: ['batchTypes', selectedCategoryId],
  queryFn: async () => {
    if (!selectedCategoryId) return [];
    const response = await api.get(`/settings/batches/types/category/${selectedCategoryId}`);
    return response.data.batch_types || [];
  },
  enabled: !!selectedCategoryId
});
```

### 4.3 Inventory Batch Creation
When creating an inventory batch:
- Validate that `batch_type_id` is assigned to the product's `category_id`
- Backend validation in `inventoryBatchController.createBatch()`

---

## 5. Migration Strategy

### 5.1 Data Migration Steps
1. Create `batch_types` table
2. Seed default types (Coil, Pallet, Carton, Loose)
3. Add `batch_type_id` column to `inventory_batches` (nullable initially)
4. Migrate existing data: Map enum values to batch_type IDs
5. Set `batch_type_id` to NOT NULL
6. Drop `batch_type` enum column
7. Create category-batch type assignments (manual or automated based on existing data)

### 5.2 Backward Compatibility
- Keep enum type definition temporarily (can be dropped later)
- Ensure all existing batches have valid `batch_type_id` before dropping enum

---

## 6. Testing Checklist

- [ ] Create new batch type (e.g., 'Carton')
- [ ] Assign batch type to category (e.g., 'Carton' → 'Nails')
- [ ] Verify "Add Product" filters batch types by category
- [ ] Create inventory batch with assigned type
- [ ] Prevent creation of batch with unassigned type
- [ ] Update existing batch type
- [ ] Delete unused batch type
- [ ] Prevent deletion of batch type in use
- [ ] Remove batch type from category
- [ ] Verify existing batches still work after migration

---

## 7. Permissions

- **View:** `admin_access` (or new `batch_settings_view`)
- **Create/Edit/Delete Types:** `admin_access`
- **Assign Types to Categories:** `admin_access`
- **Query Types by Category:** Public (for product creation)

---

## 8. Future Enhancements

1. **Batch Type Attributes:** Allow custom attributes per batch type
2. **Default Batch Type:** Set default type per category
3. **Batch Type Templates:** Pre-configure common batch type sets
4. **Audit Log:** Track who created/modified batch types and assignments


