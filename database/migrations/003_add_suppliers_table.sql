-- Migration: Add Suppliers table
-- Version: 003
-- Date: 2025-11-24
-- Description: Creates suppliers table with branch_id foreign key for branch-based filtering

-- Create suppliers table
CREATE TABLE IF NOT EXISTS suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(255),
    address TEXT,
    ledger_balance DECIMAL(15, 2) DEFAULT 0 NOT NULL,
    branch_id UUID REFERENCES branches(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for suppliers table
CREATE INDEX IF NOT EXISTS idx_suppliers_branch_id ON suppliers(branch_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers(name);
CREATE INDEX IF NOT EXISTS idx_suppliers_email ON suppliers(email);
CREATE INDEX IF NOT EXISTS idx_suppliers_phone ON suppliers(phone);

-- Add comments
COMMENT ON TABLE suppliers IS 'Stores supplier/vendor information with optional branch association';
COMMENT ON COLUMN suppliers.ledger_balance IS 'Outstanding balance owed to/from supplier';
COMMENT ON COLUMN suppliers.branch_id IS 'Optional branch association for branch-level supplier isolation';

