# Structured Logging Implementation

## Status: Partial - winston `logger.js` created

## What Was Done
✅ Created `backend/src/utils/logger.js` with:
- Winston logger configuration
- Multiple log levels (error, warn, info, http, debug)
- File rotation (5MB max, 5 files)
- Console and file transports
- Helper functions for different log types
- Request context support

## What Remains

### 1. Install Winston (if not already installed)
```bash
cd backend
npm install winston
```

### 2. Update Controllers (Example Pattern)

**BEFORE:**
```javascript
console.log('Payment confirmed:', paymentId);
console.error('Error confirming payment:', error);
```

**AFTER:**
```javascript
import { logInfo, logError } from '../utils/logger.js';

// Info logging
logInfo('Payment confirmed', {
  paymentId,
  userId: req.user.id,
  amount,
  module: 'payments'
});

// Error logging
logError('Error confirming payment', error, {
  paymentId,
  userId: req.user.id,
  module: 'payments'
});
```

### 3. Add Request Logging Middleware

Create `backend/src/middleware/requestLogger.js`:
```javascript
import morgan from 'morgan';
import logger from '../utils/logger.js';

export const requestLogger = morgan('combined', {
  stream: logger.stream
});
```

Then in `server.js`:
```javascript
import { requestLogger } from './src/middleware/requestLogger.js';
app.use(requestLogger);
```

### 4. Create Logs Directory
```bash
mkdir -p backend/logs
```

Add to `.gitignore`:
```
logs/
*.log
```

## Files to Update (Examples)
High priority controllers for logging:
- `paymentController.js` - Payment operations
- `inventoryBatchController.js` - Inventory changes
- `salesOrderController.js` - Sales transactions
- `purchaseController.js` - Purchase operations
- `authController.js` - Authentication events

## Log Levels Usage

- **error**: Database failures, unhandled exceptions, critical errors
- **warn**: Deprecated API usage, high latency, validation warnings
- **info**: Payment confirmed, inventory updated, user logged in
- **http**: HTTP requests (via Morgan)
- **debug**: Development debugging (disabled in production)

## Benefits
✅ Centralized logging configuration
✅ Log rotation prevents disk space issues  
✅ Structured JSON logs for easy parsing
✅ Request context tracking
✅ Environment-aware (dev vs production)

## Verification
After full implementation:
1. Check `backend/logs/combined.log` for all logs
2. Check `backend/logs/error.log` for errors only
3. Verify log rotation after 5MB
4. Confirm structured JSON format
