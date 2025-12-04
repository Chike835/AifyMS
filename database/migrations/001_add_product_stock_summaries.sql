-- Migration: Add product stock summaries for performance optimization
-- Date: 2025-12-04
-- Purpose: Create a materialized summary table to avoid expensive real-time stock calculations

-- ============================================
-- PRODUCT STOCK SUMMARIES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS product_stock_summaries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    total_stock DECIMAL(15, 3) NOT NULL DEFAULT 0,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(product_id, branch_id)
);

CREATE INDEX idx_product_stock_summaries_product_id ON product_stock_summaries(product_id);
CREATE INDEX idx_product_stock_summaries_branch_id ON product_stock_summaries(branch_id);
CREATE INDEX idx_product_stock_summaries_last_updated ON product_stock_summaries(last_updated);

-- ============================================
-- TRIGGER FUNCTION: Update stock summary
-- ============================================

CREATE OR REPLACE FUNCTION update_product_stock_summary()
RETURNS TRIGGER AS $$
BEGIN
    -- Handle INSERT and UPDATE
    IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
        INSERT INTO product_stock_summaries (product_id, branch_id, total_stock, last_updated)
        VALUES (
            NEW.product_id,
            NEW.branch_id,
            (
                SELECT COALESCE(SUM(remaining_quantity), 0)
                FROM inventory_batches
                WHERE product_id = NEW.product_id
                  AND branch_id = NEW.branch_id
                  AND status = 'in_stock'
            ),
            CURRENT_TIMESTAMP
        )
        ON CONFLICT (product_id, branch_id)
        DO UPDATE SET
            total_stock = (
                SELECT COALESCE(SUM(remaining_quantity), 0)
                FROM inventory_batches
                WHERE product_id = EXCLUDED.product_id
                  AND branch_id = EXCLUDED.branch_id
                  AND status = 'in_stock'
            ),
            last_updated = CURRENT_TIMESTAMP;
    END IF;

    -- Handle DELETE
    IF (TG_OP = 'DELETE') THEN
        INSERT INTO product_stock_summaries (product_id, branch_id, total_stock, last_updated)
        VALUES (
            OLD.product_id,
            OLD.branch_id,
            (
                SELECT COALESCE(SUM(remaining_quantity), 0)
                FROM inventory_batches
                WHERE product_id = OLD.product_id
                  AND branch_id = OLD.branch_id
                  AND status = 'in_stock'
            ),
            CURRENT_TIMESTAMP
        )
        ON CONFLICT (product_id, branch_id)
        DO UPDATE SET
            total_stock = (
                SELECT COALESCE(SUM(remaining_quantity), 0)
                FROM inventory_batches
                WHERE product_id = EXCLUDED.product_id
                  AND branch_id = EXCLUDED.branch_id
                  AND status = 'in_stock'
            ),
            last_updated = CURRENT_TIMESTAMP;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGER: Auto-update stock summary on batch changes
-- ============================================

DROP TRIGGER IF EXISTS trg_update_stock_summary ON inventory_batches;

CREATE TRIGGER trg_update_stock_summary
AFTER INSERT OR UPDATE OR DELETE ON inventory_batches
FOR EACH ROW
EXECUTE FUNCTION update_product_stock_summary();

-- ============================================
-- INITIAL DATA POPULATION
-- ============================================

-- Populate the summary table with existing data
INSERT INTO product_stock_summaries (product_id, branch_id, total_stock, last_updated)
SELECT 
    product_id,
    branch_id,
    COALESCE(SUM(remaining_quantity), 0) as total_stock,
    CURRENT_TIMESTAMP
FROM inventory_batches
WHERE status = 'in_stock'
GROUP BY product_id, branch_id
ON CONFLICT (product_id, branch_id) DO NOTHING;

-- ============================================
-- NOTES
-- ============================================
-- This migration creates a summary table that is automatically maintained by database triggers.
-- Benefits:
-- 1. O(1) lookup instead of O(n) aggregation for stock queries
-- 2. No application code changes needed for updates
-- 3. ACID-compliant (updates happen in same transaction as batch changes)
-- 4. Scales to millions of batches without performance degradation
