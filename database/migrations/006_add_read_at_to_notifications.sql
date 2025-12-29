-- Migration: Add read_at column to notifications table
-- Date: 2025-01-XX
-- Purpose: Add missing read_at column to track when notifications were read

-- ============================================
-- ADD read_at COLUMN TO NOTIFICATIONS
-- ============================================

ALTER TABLE notifications 
ADD COLUMN IF NOT EXISTS read_at TIMESTAMP;

-- ============================================
-- NOTES
-- ============================================
-- read_at: Timestamp when notification was read (nullable)
-- This column is added to match the Sequelize model definition
-- Existing rows will have NULL for read_at until they are marked as read






