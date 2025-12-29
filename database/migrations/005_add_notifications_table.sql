-- Migration: Add notifications table for in-app notifications
-- Date: 2025-01-XX
-- Purpose: Support in-app notification system for discount approvals and other events

-- ============================================
-- NOTIFICATIONS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT,
    reference_type VARCHAR(50),
    reference_id UUID,
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_reference ON notifications(reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- ============================================
-- NOTES
-- ============================================
-- user_id: The user who should receive this notification
-- type: Type of notification (e.g., 'discount_approval', 'payment_pending', etc.)
-- title: Short title for the notification
-- message: Detailed message content
-- reference_type: Type of related entity (e.g., 'sale', 'payment', etc.)
-- reference_id: ID of the related entity
-- is_read: Whether the user has read the notification
-- read_at: Timestamp when notification was read






