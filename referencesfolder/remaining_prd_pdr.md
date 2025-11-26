# Product Requirements Document / Product Development Requirements
## Remaining Work for AifyMS ERP System

**Version:** 1.0  
**Date:** November 21, 2025  
**Based on:** Initial JSON PRD (ams_first_eitaration.json), GitHub Repo Analysis, Desired Features List  

### Executive Summary

The AifyMS project currently has a foundational implementation with core authentication, basic inventory management, POS functionality, and payment processing. However, significant development remains to achieve the full ERP functionality as outlined in the requirements. This document identifies all missing modules, features, and integrations needed to complete the system.

### Current Implementation Status

#### Implemented Components
- **Backend:** Authentication, User management (basic), Product management, Inventory tracking, Recipe management, Sales/POS, Payment processing
- **Frontend:** Dashboard, Login, Inventory page, POS interface, Payments page
- **Database:** Core models for users, products, inventory, sales, payments
- **Infrastructure:** Docker setup, basic API structure

#### Missing Components
- Complete user management system
- Contacts management (customers, suppliers)
- Manufacturing workflow beyond recipes
- Purchases module
- Comprehensive sales management
- Expenses and payroll
- Accounting and reporting
- System settings
- Import/export functionality
- Print functionality (labels, reports)
- Advanced inventory features

### Detailed Requirements Breakdown

<requirements>
  <module name="User Management" status="partial">
    <backend status="partial">
      <requirement id="UM-001" priority="high">
        <description>Complete user CRUD operations with role assignment</description>
        <details>Users controller exists but needs full implementation for create, update, delete with proper validation</details>
        <estimated_effort>2 days</estimated_effort>
      </requirement>
      <requirement id="UM-002" priority="high">
        <description>Roles and permissions management</description>
        <details>Implement dynamic role creation with granular permissions checklist</details>
        <estimated_effort>3 days</estimated_effort>
      </requirement>
      <requirement id="UM-003" priority="medium">
        <description>Sales commission agents functionality</description>
        <details>Add agent-specific features, commission tracking, and reporting</details>
        <estimated_effort>2 days</estimated_effort>
      </requirement>
    </backend>
    <frontend status="missing">
      <requirement id="UM-FE-001" priority="high">
        <description>Users management page</description>
        <details>Create /users page with user list, add/edit forms, role assignment</details>
        <estimated_effort>3 days</estimated_effort>
      </requirement>
      <requirement id="UM-FE-002" priority="high">
        <description>Roles & permissions page</description>
        <details>Create /roles page with dynamic permission management interface</details>
        <estimated_effort>2 days</estimated_effort>
      </requirement>
      <requirement id="UM-FE-003" priority="medium">
        <description>Agents management page</description>
        <details>Create /agents page for commission agent management</details>
        <estimated_effort>1 day</estimated_effort>
      </requirement>
    </frontend>
  </module>

  <module name="Contacts" status="missing">
    <backend status="partial">
      <requirement id="CT-001" priority="high">
        <description>Customer management</description>
        <details>Customer model exists but needs full CRUD controller implementation</details>
        <estimated_effort>2 days</estimated_effort>
      </requirement>
      <requirement id="CT-002" priority="high">
        <description>Supplier management</description>
        <details>Create Supplier model and controller for vendor management</details>
        <estimated_effort>2 days</estimated_effort>
      </requirement>
      <requirement id="CT-003" priority="medium">
        <description>Contact import functionality</description>
        <details>Implement bulk import for customers and suppliers via CSV/Excel</details>
        <estimated_effort>2 days</estimated_effort>
      </requirement>
    </backend>
    <frontend status="missing">
      <requirement id="CT-FE-001" priority="high">
        <description>Customers page</description>
        <details>Create /customers page with customer list, add/edit forms, ledger view</details>
        <estimated_effort>3 days</estimated_effort>
      </requirement>
      <requirement id="CT-FE-002" priority="high">
        <description>Suppliers page</description>
        <details>Create /suppliers page with supplier management interface</details>
        <estimated_effort>2 days</estimated_effort>
      </requirement>
      <requirement id="CT-FE-003" priority="medium">
        <description>Import contacts page</description>
        <details>Create /import-contacts page with file upload and validation</details>
        <estimated_effort>1 day</estimated_effort>
      </requirement>
    </frontend>
  </module>

  <module name="Inventory" status="partial">
    <backend status="partial">
      <requirement id="INV-001" priority="high">
        <description>Complete product types implementation</description>
        <details>Implement Standard, Compound Unit, Raw Material (Tracked), Manufactured (Virtual) product types</details>
        <estimated_effort>4 days</estimated_effort>
      </requirement>
      <requirement id="INV-002" priority="medium">
        <description>Stock transfer functionality</description>
        <details>Complete stock transfer between branches with inventory instance tracking</details>
        <estimated_effort>2 days</estimated_effort>
      </requirement>
      <requirement id="INV-003" priority="medium">
        <description>Stock adjustment with reasons</description>
        <details>Implement stock adjustment with mandatory reason logging and wastage tracking</details>
        <estimated_effort>2 days</estimated_effort>
      </requirement>
      <requirement id="INV-004" priority="medium">
        <description>Print labels for inventory instances</description>
        <details>Generate and print barcode/QR labels for coils and pallets</details>
        <estimated_effort>3 days</estimated_effort>
      </requirement>
      <requirement id="INV-005" priority="low">
        <description>Product import functionality</description>
        <details>Bulk import products via CSV/Excel with validation</details>
        <estimated_effort>2 days</estimated_effort>
      </requirement>
    </backend>
    <frontend status="partial">
      <requirement id="INV-FE-001" priority="high">
        <description>Update price functionality</description>
        <details>Create /inventory/update-price page for bulk price updates</details>
        <estimated_effort>1 day</estimated_effort>
      </requirement>
      <requirement id="INV-FE-002" priority="medium">
        <description>Print labels interface</description>
        <details>Create /inventory/print-labels page with label generation and print options</details>
        <estimated_effort>2 days</estimated_effort>
      </requirement>
      <requirement id="INV-FE-003" priority="medium">
        <description>Import products page</description>
        <details>Create /inventory/import page with file upload and preview</details>
        <estimated_effort>1 day</estimated_effort>
      </requirement>
      <requirement id="INV-FE-004" priority="medium">
        <description>Stock transfer page</description>
        <details>Create /inventory/stock-transfer page for inter-branch transfers</details>
        <estimated_effort>2 days</estimated_effort>
      </requirement>
      <requirement id="INV-FE-005" priority="medium">
        <description>Stock adjustment page</description>
        <details>Create /inventory/stock-adjustment page with reason logging</details>
        <estimated_effort>1 day</estimated_effort>
      </requirement>
      <requirement id="INV-FE-006" priority="low">
        <description>Inventory settings page</description>
        <details>Create /inventory/settings page for variations, units, categories, brands, warranties</details>
        <estimated_effort>2 days</estimated_effort>
      </requirement>
    </frontend>
  </module>

  <module name="Manufacturing" status="partial">
    <backend status="partial">
      <requirement id="MFG-001" priority="high">
        <description>Production status tracking</description>
        <details>Implement workflow: Unpaid → Pending → In Production → Produced → Delivered</details>
        <estimated_effort>3 days</estimated_effort>
      </requirement>
      <requirement id="MFG-002" priority="high">
        <description>Production queue management</description>
        <details>Create production list with status updates and worker assignments</details>
        <estimated_effort>2 days</estimated_effort>
      </requirement>
      <requirement id="MFG-003" priority="medium">
        <description>Wastage tracking integration</description>
        <details>Integrate wastage margins and tracking in production process</details>
        <estimated_effort>2 days</estimated_effort>
      </requirement>
    </backend>
    <frontend status="missing">
      <requirement id="MFG-FE-001" priority="high">
        <description>Production status page</description>
        <details>Create /manufacturing/status page to check production status</details>
        <estimated_effort>1 day</estimated_effort>
      </requirement>
      <requirement id="MFG-FE-002" priority="high">
        <description>Recipes management page</description>
        <details>Create /manufacturing/recipes page for recipe CRUD operations</details>
        <estimated_effort>2 days</estimated_effort>
      </requirement>
      <requirement id="MFG-FE-003" priority="high">
        <description>Production list page</description>
        <details>Create /manufacturing/production page for production queue management</details>
        <estimated_effort>3 days</estimated_effort>
      </requirement>
    </frontend>
  </module>

  <module name="Purchases" status="missing">
    <backend status="missing">
      <requirement id="PUR-001" priority="high">
        <description>Purchase orders management</description>
        <details>Create Purchase model and controller for purchase order CRUD</details>
        <estimated_effort>4 days</estimated_effort>
      </requirement>
      <requirement id="PUR-002" priority="medium">
        <description>Purchase returns processing</description>
        <details>Implement return to stock or write-off functionality</details>
        <estimated_effort>2 days</estimated_effort>
      </requirement>
      <requirement id="PUR-003" priority="medium">
        <description>Inventory instance registration on purchase</description>
        <details>Auto-prompt for coil/pallet ID creation when purchasing tracked materials</details>
        <estimated_effort>2 days</estimated_effort>
      </requirement>
    </backend>
    <frontend status="missing">
      <requirement id="PUR-FE-001" priority="high">
        <description>Purchases list page</description>
        <details>Create /purchases page with purchase order list and filters</details>
        <estimated_effort>2 days</estimated_effort>
      </requirement>
      <requirement id="PUR-FE-002" priority="high">
        <description>Add purchase page</description>
        <details>Create /purchases/add page with purchase order creation form</details>
        <estimated_effort>3 days</estimated_effort>
      </requirement>
      <requirement id="PUR-FE-003" priority="medium">
        <description>Purchase returns page</description>
        <details>Create /purchases/returns page for processing returns</details>
        <estimated_effort>2 days</estimated_effort>
      </requirement>
    </frontend>
  </module>

  <module name="Sales" status="partial">
    <backend status="partial">
      <requirement id="SAL-001" priority="high">
        <description>Sales order management beyond POS</description>
        <details>Implement drafts, quotations, returns, shipments, discounts</details>
        <estimated_effort>5 days</estimated_effort>
      </requirement>
      <requirement id="SAL-002" priority="medium">
        <description>Delivery notes and custom documents</description>
        <details>Implement custom delivery note generation and printing</details>
        <estimated_effort>2 days</estimated_effort>
      </requirement>
      <requirement id="SAL-003" priority="medium">
        <description>Shipment tracking and dispatcher workflow</description>
        <details>Implement shipment status updates with dispatcher assignments</details>
        <estimated_effort>3 days</estimated_effort>
      </requirement>
    </backend>
    <frontend status="missing">
      <requirement id="SAL-FE-001" priority="high">
        <description>Sales list page</description>
        <details>Create /sales page with sales order list, filters, and status management</details>
        <estimated_effort>3 days</estimated_effort>
      </requirement>
      <requirement id="SAL-FE-002" priority="high">
        <description>Add sale page</description>
        <details>Create /sales/add page for manual sales order creation</details>
        <estimated_effort>2 days</estimated_effort>
      </requirement>
      <requirement id="SAL-FE-003" priority="medium">
        <description>POS list page</description>
        <details>Create /sales/pos-list page for POS transaction history</details>
        <estimated_effort>1 day</estimated_effort>
      </requirement>
      <requirement id="SAL-FE-004" priority="medium">
        <description>Drafts management</description>
        <details>Create /sales/drafts page for managing draft orders</details>
        <estimated_effort>2 days</estimated_effort>
      </requirement>
      <requirement id="SAL-FE-005" priority="medium">
        <description>Quotations management</description>
        <details>Create /sales/quotations page for quotation CRUD</details>
        <estimated_effort>2 days</estimated_effort>
      </requirement>
      <requirement id="SAL-FE-006" priority="medium">
        <description>Sales returns page</description>
        <details>Create /sales/returns page for processing sales returns</details>
        <estimated_effort>2 days</estimated_effort>
      </requirement>
      <requirement id="SAL-FE-007" priority="medium">
        <description>Shipments page</description>
        <details>Create /sales/shipments page for dispatch management</details>
        <estimated_effort>2 days</estimated_effort>
      </requirement>
      <requirement id="SAL-FE-008" priority="medium">
        <description>Discounts management</description>
        <details>Create /sales/discounts page for discount configuration</details>
        <estimated_effort>1 day</estimated_effort>
      </requirement>
      <requirement id="SAL-FE-009" priority="low">
        <description>Custom delivery notes</description>
        <details>Create /sales/delivery-notes page for custom document generation</details>
        <estimated_effort>2 days</estimated_effort>
      </requirement>
    </frontend>
  </module>

  <module name="Expenses" status="missing">
    <backend status="missing">
      <requirement id="EXP-001" priority="high">
        <description>Expense management system</description>
        <details>Create Expense model and controller for expense tracking</details>
        <estimated_effort>3 days</estimated_effort>
      </requirement>
      <requirement id="EXP-002" priority="medium">
        <description>Expense categories</description>
        <details>Implement dynamic expense category management</details>
        <estimated_effort>1 day</estimated_effort>
      </requirement>
    </backend>
    <frontend status="missing">
      <requirement id="EXP-FE-001" priority="high">
        <description>Expenses list page</description>
        <details>Create /expenses page with expense list and filters</details>
        <estimated_effort>2 days</estimated_effort>
      </requirement>
      <requirement id="EXP-FE-002" priority="high">
        <description>Add expense page</description>
        <details>Create /expenses/add page for expense entry</details>
        <estimated_effort>1 day</estimated_effort>
      </requirement>
      <requirement id="EXP-FE-003" priority="medium">
        <description>Expense categories page</description>
        <details>Create /expenses/categories page for category management</details>
        <estimated_effort>1 day</estimated_effort>
      </requirement>
    </frontend>
  </module>

  <module name="Payroll" status="missing">
    <backend status="missing">
      <requirement id="PAY-001" priority="high">
        <description>Payroll management system</description>
        <details>Create Payroll model and controller for employee payroll processing</details>
        <estimated_effort>4 days</estimated_effort>
      </requirement>
      <requirement id="PAY-002" priority="medium">
        <description>Salary calculations and commissions</description>
        <details>Implement automatic commission calculations and salary processing</details>
        <estimated_effort>2 days</estimated_effort>
      </requirement>
    </backend>
    <frontend status="missing">
      <requirement id="PAY-FE-001" priority="high">
        <description>Payroll list page</description>
        <details>Create /payroll page with payroll records and history</details>
        <estimated_effort>2 days</estimated_effort>
      </requirement>
      <requirement id="PAY-FE-002" priority="high">
        <description>Add payroll page</description>
        <details>Create /payroll/add page for payroll processing</details>
        <estimated_effort>2 days</estimated_effort>
      </requirement>
    </frontend>
  </module>

  <module name="Accounts & Reports" status="missing">
    <backend status="missing">
      <requirement id="ACC-001" priority="high">
        <description>Comprehensive reporting system</description>
        <details>Implement all required reports: P&L, Purchase & Sale, Tax, Supplier & Customer, Stock, etc.</details>
        <estimated_effort>10 days</estimated_effort>
      </requirement>
      <requirement id="ACC-002" priority="high">
        <description>Payment accounts management</description>
        <details>Create PaymentAccount model for cash drawers, bank accounts, balance tracking</details>
        <estimated_effort>3 days</estimated_effort>
      </requirement>
      <requirement id="ACC-003" priority="medium">
        <description>Financial statements</description>
        <details>Implement Balance Sheet, Trial Balance, Cash Flow statements</details>
        <estimated_effort>5 days</estimated_effort>
      </requirement>
    </backend>
    <frontend status="missing">
      <requirement id="ACC-FE-001" priority="high">
        <description>Reports dashboard</description>
        <details>Create /accounts/reports page with report generation and export options</details>
        <estimated_effort>5 days</estimated_effort>
      </requirement>
      <requirement id="ACC-FE-002" priority="high">
        <description>Payment accounts page</description>
        <details>Create /accounts/payment-accounts page for account management</details>
        <estimated_effort>2 days</estimated_effort>
      </requirement>
    </frontend>
  </module>

  <module name="Settings" status="missing">
    <backend status="missing">
      <requirement id="SET-001" priority="high">
        <description>Business settings management</description>
        <details>Create settings models and controllers for all business configurations</details>
        <estimated_effort>4 days</estimated_effort>
      </requirement>
      <requirement id="SET-002" priority="medium">
        <description>Multi-branch management</description>
        <details>Complete branch/location management with settings</details>
        <estimated_effort>2 days</estimated_effort>
      </requirement>
      <requirement id="SET-003" priority="medium">
        <description>Tax rates and invoice settings</description>
        <details>Implement dynamic tax rate management and invoice customization</details>
        <estimated_effort>3 days</estimated_effort>
      </requirement>
      <requirement id="SET-004" priority="low">
        <description>Barcode and printer settings</description>
        <details>Configure barcode generation and receipt printer settings</details>
        <estimated_effort>2 days</estimated_effort>
      </requirement>
    </backend>
    <frontend status="missing">
      <requirement id="SET-FE-001" priority="high">
        <description>Business settings page</description>
        <details>Create /settings/business page for core business configuration</details>
        <estimated_effort>2 days</estimated_effort>
      </requirement>
      <requirement id="SET-FE-002" priority="high">
        <description>Business locations page</description>
        <details>Create /settings/locations page for branch management</details>
        <estimated_effort>2 days</estimated_effort>
      </requirement>
      <requirement id="SET-FE-003" priority="medium">
        <description>Invoice settings page</description>
        <details>Create /settings/invoice page for invoice customization</details>
        <estimated_effort>1 day</estimated_effort>
      </requirement>
      <requirement id="SET-FE-004" priority="medium">
        <description>Barcode settings page</description>
        <details>Create /settings/barcode page for barcode configuration</details>
        <estimated_effort>1 day</estimated_effort>
      </requirement>
      <requirement id="SET-FE-005" priority="medium">
        <description>Receipt printers page</description>
        <details>Create /settings/printers page for printer management</details>
        <estimated_effort>1 day</estimated_effort>
      </requirement>
      <requirement id="SET-FE-006" priority="medium">
        <description>Tax rates page</description>
        <details>Create /settings/tax page for tax rate management</details>
        <estimated_effort>1 day</estimated_effort>
      </requirement>
    </frontend>
  </module>

  <module name="Dashboard Enhancements" status="partial">
    <requirement id="DASH-001" priority="medium">
      <description>Advanced dashboard graphs</description>
      <details>Implement comprehensive charts for sales, inventory, financial metrics</details>
      <estimated_effort>3 days</estimated_effort>
    </requirement>
  </module>

  <module name="Import/Export System" status="missing">
    <requirement id="IMP-001" priority="high">
      <description>Universal import/export functionality</description>
      <details>Implement CSV/Excel import/export for all major entities (products, contacts, transactions)</details>
      <estimated_effort>5 days</estimated_effort>
    </requirement>
  </module>

  <module name="Print & Document Generation" status="missing">
    <requirement id="PRT-001" priority="medium">
      <description>Document printing system</description>
      <details>Implement PDF generation and printing for invoices, labels, reports, receipts</details>
      <estimated_effort>4 days</estimated_effort>
    </requirement>
  </module>

  <module name="API Enhancements" status="partial">
    <requirement id="API-001" priority="high">
      <description>Complete API endpoints</description>
      <details>Implement all missing API endpoints as per the JSON specification</details>
      <estimated_effort>7 days</estimated_effort>
    </requirement>
  </module>
</requirements>

### Development Roadmap

#### Phase 1: Core Completion (Weeks 1-4)
- Complete User Management
- Contacts Management
- Enhanced Inventory Features
- Manufacturing Workflow
- Basic Import/Export

**Total Effort:** ~30 days

#### Phase 2: Transaction Management (Weeks 5-8)
- Purchases Module
- Complete Sales Management
- Expenses and Payroll
- Basic Accounting

**Total Effort:** ~25 days

#### Phase 3: Reporting & Settings (Weeks 9-12)
- Advanced Reports
- Settings Management
- Document Generation
- Print Functionality

**Total Effort:** ~20 days

#### Phase 4: Polish & Integration (Weeks 13-14)
- Dashboard Enhancements
- API Completion
- Testing & Bug Fixes
- Performance Optimization

**Total Effort:** ~10 days

### Total Estimated Effort: ~85 Developer Days

### Technical Considerations

1. **Permission-Driven UI**: All new components must implement dynamic rendering based on user permissions
2. **Multi-Branch Architecture**: Ensure all features support branch-level filtering and data isolation
3. **Manufacturing Logic**: Implement the complex coil-to-roofing conversion workflow with material reservations
4. **Financial Accuracy**: Implement proper double-entry accounting principles
5. **Scalability**: Design for multiple concurrent users and large datasets
6. **Mobile Responsiveness**: Ensure PWA compatibility for production and dispatch workflows

### Quality Assurance Requirements

- Unit tests for all business logic
- Integration tests for API endpoints
- End-to-end tests for critical workflows
- Performance testing for large datasets
- Security testing for permission enforcement

### Deployment Considerations

- Database migrations for new models
- Environment configuration updates
- Docker container optimizations
- Backup and recovery procedures
- Monitoring and logging enhancements

---

*This PRD/PDR outlines the remaining development work to achieve the full AifyMS ERP functionality. Implementation should follow the existing codebase patterns and adhere to the architectural principles outlined in the original JSON specification.*