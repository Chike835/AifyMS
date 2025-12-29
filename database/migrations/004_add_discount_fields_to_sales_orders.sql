-- Migration: Add discount approval fields to sales_orders table
-- Date: 2025-01-XX
-- Purpose: Support discount approval workflow for sales with discounted prices

-- ============================================
-- ADD DISCOUNT FIELDS TO SALES_ORDERS
-- ============================================

-- Add discount_status enum type if it doesn't exist
DO $$ BEGIN
    CREATE TYPE discount_status AS ENUM ('pending', 'approved', 'declined');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add discount fields to sales_orders table
ALTER TABLE sales_orders 
ADD COLUMN IF NOT EXISTS discount_status discount_status,
ADD COLUMN IF NOT EXISTS discount_approved_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS discount_approved_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS discount_declined_reason TEXT;

-- Create index for filtering by discount status
CREATE INDEX IF NOT EXISTS idx_sales_orders_discount_status ON sales_orders(discount_status);

-- Create index for discount approver
CREATE INDEX IF NOT EXISTS idx_sales_orders_discount_approved_by ON sales_orders(discount_approved_by);

-- ============================================
-- NOTES
-- ============================================
-- discount_status: 
--   - 'pending': Sale has discounted items awaiting approval
--   - 'approved': Discount has been approved, sale can proceed
--   - 'declined': Discount was declined, sale removed from ledger
-- discount_approved_by: User who approved/declined the discount
-- discount_approved_at: Timestamp of approval/decline
-- discount_declined_reason: Optional reason for declining discount






