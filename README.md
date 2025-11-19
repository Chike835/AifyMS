# Aify Global ERP v2.0.0

Bespoke ERP system for a Nigerian Aluminum & Building Materials company with 4 branches. Key features include manufacturing conversion (Coil to Roofing), granular inventory tracking, and strict financial security with Maker-Checker workflow.

## Tech Stack

- **Frontend**: React 18 (Vite), Tailwind CSS, React Query, Axios
- **Backend**: Node.js, Express.js, Sequelize ORM
- **Database**: PostgreSQL 15+
- **Containerization**: Docker & Docker Compose

## Prerequisites

- Docker Desktop (or Docker Engine + Docker Compose)
- Git

## Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd AMS
```

### 2. Start the Application

```bash
docker-compose up --build
```

This will start:
- PostgreSQL database on port `5432`
- Backend API on port `5000`
- Frontend UI on port `5173`

### 3. Access the Application

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:5000/api
- **Health Check**: http://localhost:5000/health

### 4. Default Login Credentials

- **Email**: `admin@aify.com`
- **Password**: `Admin@123`
- **Role**: Super Admin (Full access)

## Project Structure

```
AMS/
├── backend/
│   ├── src/
│   │   ├── config/          # Database & environment config
│   │   ├── controllers/     # API controllers
│   │   ├── models/          # Sequelize models
│   │   ├── routes/          # Express routes
│   │   ├── middleware/      # Auth & permission middleware
│   │   └── services/        # Business logic services
│   ├── server.js            # Express server entry point
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── pages/           # Page components
│   │   ├── context/         # React Context (Auth)
│   │   ├── utils/           # Utilities (API client)
│   │   └── App.jsx          # Main app component
│   └── Dockerfile
├── database/
│   └── init.sql             # Database schema & seed data
├── docker-compose.yml
└── README.md
```

## Testing the Coil-to-Roofing Logic

This is the **critical manufacturing workflow** that converts raw material coils into finished roofing products.

### Prerequisites for Testing

1. **Login** as Super Admin (`admin@aify.com` / `Admin@123`)

2. **Create a Raw Material Product** (if not exists):
   - Navigate to Inventory → Register New Coil
   - First, you need a `raw_tracked` product
   - Example: "Aluminum Coil 0.8mm" (SKU: `COIL-AL-0.8`, Type: `raw_tracked`, Unit: `KG`)

3. **Create a Manufactured Virtual Product**:
   - Example: "Longspan 0.55" (SKU: `LONGSPAN-0.55`, Type: `manufactured_virtual`, Unit: `Meter`)

4. **Create a Recipe**:
   - Navigate to Recipes (or use API: `POST /api/recipes`)
   - Link the virtual product to the raw product
   - Set conversion factor: `0.8` (1 Meter Longspan = 0.8 KG Coil)

5. **Register a Coil**:
   - Navigate to Inventory → Register New Coil
   - Select the raw material product
   - Enter instance code: `COIL-001`
   - Enter initial quantity: `100` KG

### Testing the POS Workflow

1. **Navigate to POS** (`/pos`)

2. **Search for the Manufactured Product**:
   - Type "Longspan" in the search box
   - Click "Add" on the manufactured product

3. **Coil Selector Modal Opens**:
   - The system automatically:
     - Fetches the recipe for the product
     - Calculates required raw material: `Quantity × Conversion Factor`
     - Example: 10 Meters × 0.8 = 8 KG required
   - You'll see available coils listed
   - Select one or more coils to fulfill the requirement
   - Adjust quantities per coil if needed
   - **Validation**: Selected total must be >= Required KG

4. **Confirm Selection**:
   - Click "Confirm Selection"
   - The product is added to cart with `item_assignments` attached

5. **Complete the Sale**:
   - Add more items if needed
   - Click "Complete Sale"
   - The system will:
     - Create the sales order
     - Deduct quantities from selected coils
     - Create `item_assignments` records linking sales items to coils
     - Update `inventory_instances.remaining_quantity`

6. **Verify**:
   - Navigate to Inventory
   - Check that `COIL-001` now shows `remaining_quantity: 92 KG` (100 - 8)

## Testing the Maker-Checker Payment Workflow

1. **Login as Cashier** (or user with `payment_receive` permission)

2. **Log a Payment**:
   - Navigate to Payments
   - Create a payment (via API: `POST /api/payments`)
   - Status: `pending_confirmation`

3. **Login as Manager** (or user with `payment_confirm` permission)

4. **Confirm Payment**:
   - Navigate to Payments
   - View pending payments table
   - Click "Confirm" on a payment
   - The system will:
     - Update payment status to `confirmed`
     - Set `confirmed_by` and `confirmed_at`
     - Update `Customer.ledger_balance` (decrements)

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

### Products
- `GET /api/products` - List products
- `POST /api/products` - Create product (requires `product_add`)

### Inventory
- `GET /api/inventory/instances` - List inventory instances
- `POST /api/inventory/instances` - Register new coil (requires `stock_add_opening`)
- `GET /api/inventory/instances/available/:productId` - Get available coils for POS

### Recipes
- `GET /api/recipes` - List recipes
- `POST /api/recipes` - Create recipe (requires `recipe_manage`)
- `GET /api/recipes/by-virtual/:productId` - Get recipe for virtual product

### Sales
- `POST /api/sales` - Create sale/invoice (requires `pos_access`)
- `GET /api/sales` - List sales orders
- `PUT /api/sales/:id/production-status` - Update production status

### Payments
- `POST /api/payments` - Log payment (requires `payment_receive`)
- `PUT /api/payments/:id/confirm` - Confirm payment (requires `payment_confirm`)
- `GET /api/payments/pending` - List pending payments

## User Roles & Permissions

### Super Admin
- Full access to all features
- Can manage all branches
- Can confirm payments
- Can configure recipes

### Branch Manager
- Oversees specific branch operations
- Can approve stock transfers
- Can confirm payments
- Cannot view global data

### Sales Representative
- Can create quotes and invoices
- Cannot receive payments
- Cannot see cost prices

### Cashier
- Can log payments
- Cannot confirm payments
- Cannot edit prices

### Inventory Manager
- Manages physical stock
- Registers new coils/pallets
- Handles wastage

### Production Worker
- View-only access to Production Queue
- Can update status to 'Produced'

## Development

### Running Locally (Without Docker)

#### Backend
```bash
cd backend
npm install
npm run dev
```

#### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Environment Variables

Create `.env` files in `backend/` and `frontend/` directories:

**backend/.env**:
```
DATABASE_URL=postgresql://aify_user:aify_password@localhost:5432/aify_erp
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=7d
PORT=5000
NODE_ENV=development
```

**frontend/.env**:
```
VITE_API_URL=http://localhost:5000
```

## Troubleshooting

### Database Connection Issues
- Ensure PostgreSQL container is running: `docker ps`
- Check database logs: `docker logs aify-postgres`
- Verify connection string in `docker-compose.yml`

### Frontend Not Loading
- Check if Vite dev server is running: `docker logs aify-frontend`
- Verify port mapping: `5173:5173`
- Check browser console for errors

### Backend API Errors
- Check backend logs: `docker logs aify-backend`
- Verify JWT_SECRET is set
- Check database migrations/sync status

### Permission Errors
- Verify user has required permissions
- Check role-permission mappings in database
- Super Admin should have all permissions

## Production Deployment

For production deployment:

1. **Update Environment Variables**:
   - Change `JWT_SECRET` to a strong random string
   - Update `DATABASE_URL` to production database
   - Set `NODE_ENV=production`

2. **Build Frontend**:
   - Update `frontend/Dockerfile` to build production bundle
   - Use `npm run build` and serve with nginx

3. **Database Migrations**:
   - Use Sequelize migrations instead of `sync({ alter: true })`
   - Backup database before migrations

4. **Security**:
   - Enable HTTPS
   - Use environment variables for secrets
   - Implement rate limiting
   - Add CORS restrictions

## Support

For issues or questions, please contact the development team.

---

**Version**: 2.0.0  
**Last Updated**: 2024

