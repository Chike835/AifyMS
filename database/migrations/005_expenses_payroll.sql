-- ============================================
-- Migration: Expenses & Payroll Infrastructure
-- Version: 005
-- ============================================

-- ============================================
-- TABLES
-- ============================================

-- Expense Categories table (branch-scoped)
CREATE TABLE expense_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    branch_id UUID NOT NULL REFERENCES branches(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(name, branch_id)
);

-- Expenses table (branch-scoped, linked to category and user)
CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID NOT NULL REFERENCES expense_categories(id),
    branch_id UUID NOT NULL REFERENCES branches(id),
    user_id UUID NOT NULL REFERENCES users(id),
    amount DECIMAL(15, 2) NOT NULL,
    description TEXT,
    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CHECK (amount > 0)
);

-- Payroll Records table (branch-scoped, linked to user/employee)
CREATE TABLE payroll_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    branch_id UUID NOT NULL REFERENCES branches(id),
    month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
    year INTEGER NOT NULL CHECK (year >= 2000),
    gross_pay DECIMAL(15, 2) NOT NULL DEFAULT 0,
    deductions DECIMAL(15, 2) NOT NULL DEFAULT 0,
    net_pay DECIMAL(15, 2) NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, month, year),
    CHECK (gross_pay >= 0),
    CHECK (deductions >= 0),
    CHECK (net_pay >= 0)
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_expense_categories_branch_id ON expense_categories(branch_id);
CREATE INDEX idx_expense_categories_name ON expense_categories(name);

CREATE INDEX idx_expenses_branch_id ON expenses(branch_id);
CREATE INDEX idx_expenses_category_id ON expenses(category_id);
CREATE INDEX idx_expenses_user_id ON expenses(user_id);
CREATE INDEX idx_expenses_expense_date ON expenses(expense_date);

CREATE INDEX idx_payroll_records_branch_id ON payroll_records(branch_id);
CREATE INDEX idx_payroll_records_user_id ON payroll_records(user_id);
CREATE INDEX idx_payroll_records_month_year ON payroll_records(month, year);

-- ============================================
-- PERMISSIONS
-- ============================================

INSERT INTO permissions (slug, group_name) VALUES
    ('expense_view', 'expenses'),
    ('expense_manage', 'expenses'),
    ('expense_category_manage', 'expenses'),
    ('payroll_view', 'payroll'),
    ('payroll_manage', 'payroll');

-- Grant expense permissions to Super Admin
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'Super Admin' AND p.slug IN ('expense_view', 'expense_manage', 'expense_category_manage', 'payroll_view', 'payroll_manage');

-- Grant expense view & manage to Branch Manager
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'Branch Manager' AND p.slug IN ('expense_view', 'expense_manage', 'expense_category_manage');

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE expense_categories IS 'Branch-scoped expense categories for organizing business expenses';
COMMENT ON TABLE expenses IS 'Individual expense records tied to branches, categories, and users';
COMMENT ON TABLE payroll_records IS 'Monthly payroll records for employees, scoped by branch';
COMMENT ON COLUMN payroll_records.net_pay IS 'Calculated as gross_pay - deductions';

-- ============================================
-- MIGRATION COMPLETE
-- ============================================

