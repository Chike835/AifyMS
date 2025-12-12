// Backend Constants - Database Enums and Validation

/**
 * Product Types (Must match database enum: product_type)
 */
export const PRODUCT_TYPES = {
    STANDARD: 'standard',
    COMPOUND: 'compound',
    RAW_TRACKED: 'raw_tracked',
    MANUFACTURED_VIRTUAL: 'manufactured_virtual',
    VARIABLE: 'variable'
};

export const VALID_PRODUCT_TYPES = Object.values(PRODUCT_TYPES);

/**
 * Payment Methods (Must match database enum: payment_method)
 */
export const PAYMENT_METHODS = {
    CASH: 'cash',
    TRANSFER: 'transfer',
    POS: 'pos'
};

export const VALID_PAYMENT_METHODS = Object.values(PAYMENT_METHODS);

/**
 * Payment Status (Must match database enum: payment_status)
 */
export const PAYMENT_STATUS = {
    PENDING_CONFIRMATION: 'pending_confirmation',
    CONFIRMED: 'confirmed',
    VOIDED: 'voided'
};

export const VALID_PAYMENT_STATUSES = Object.values(PAYMENT_STATUS);

/**
 * Production Status (Must match database enum: production_status)
 */
export const PRODUCTION_STATUS = {
    QUEUE: 'queue',
    PROCESSING: 'processing',
    PRODUCED: 'produced',
    DELIVERED: 'delivered',
    NA: 'na'
};

export const VALID_PRODUCTION_STATUSES = Object.values(PRODUCTION_STATUS);

/**
 * Instance Status (Must match database enum: instance_status)
 */
export const INSTANCE_STATUS = {
    IN_STOCK: 'in_stock',
    DEPLETED: 'depleted',
    SCRAPPED: 'scrapped'
};

export const VALID_INSTANCE_STATUSES = Object.values(INSTANCE_STATUS);

/**
 * Contact Type (Must match database enum: contact_type)
 */
export const CONTACT_TYPES = {
    CUSTOMER: 'customer',
    SUPPLIER: 'supplier'
};

export const VALID_CONTACT_TYPES = Object.values(CONTACT_TYPES);

/**
 * Transaction Type (Must match database enum: transaction_type)
 */
export const TRANSACTION_TYPES = {
    INVOICE: 'INVOICE',
    PAYMENT: 'PAYMENT',
    RETURN: 'RETURN',
    ADJUSTMENT: 'ADJUSTMENT',
    OPENING_BALANCE: 'OPENING_BALANCE',
    ADVANCE_PAYMENT: 'ADVANCE_PAYMENT',
    REFUND: 'REFUND',
    REFUND_FEE: 'REFUND_FEE'
};

export const VALID_TRANSACTION_TYPES = Object.values(TRANSACTION_TYPES);

/**
 * Action Type (Must match database enum: action_type)
 */
export const ACTION_TYPES = {
    LOGIN: 'LOGIN',
    CREATE: 'CREATE',
    UPDATE: 'UPDATE',
    DELETE: 'DELETE',
    PRINT: 'PRINT',
    CONFIRM: 'CONFIRM',
    VOID: 'VOID'
};

export const VALID_ACTION_TYPES = Object.values(ACTION_TYPES);
