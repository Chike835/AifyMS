import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import ErrorBoundary from './components/ErrorBoundary';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/layout/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import POS from './pages/POS';
import Inventory from './pages/Inventory';
import InventoryBatches from './pages/InventoryBatches';
import Products from './pages/Products';
import Payments from './pages/Payments';
import Customers from './pages/Customers';
import Suppliers from './pages/Suppliers';
import Purchases from './pages/Purchases';
import AddPurchase from './pages/AddPurchase';
import Expenses from './pages/Expenses';
import ExpenseCategories from './pages/ExpenseCategories';
import Payroll from './pages/Payroll';
import Users from './pages/Users';
import Roles from './pages/Roles';
import Settings from './pages/Settings';
import ProductionQueue from './pages/ProductionQueue';
import Shipments from './pages/Shipments';
import Sales from './pages/Sales';
import AddSale from './pages/AddSale';
import Drafts from './pages/Drafts';
import Quotations from './pages/Quotations';
import SalesReturns from './pages/SalesReturns';
import PurchaseReturns from './pages/PurchaseReturns';
import UpdatePrice from './pages/UpdatePrice';
import Reports from './pages/Reports';
import PaymentAccounts from './pages/PaymentAccounts';
import BusinessSettings from './pages/BusinessSettings';
import TaxRates from './pages/TaxRates';
import InvoiceSettings from './pages/InvoiceSettings';
import ManufacturingStatus from './pages/ManufacturingStatus';
import Recipes from './pages/Recipes';
import PrintLabels from './pages/PrintLabels';
import Agents from './pages/Agents';
import ImportContacts from './pages/ImportContacts';
import Discounts from './pages/Discounts';
import DeliveryNotes from './pages/DeliveryNotes';
import BarcodeSettings from './pages/BarcodeSettings';
import ReceiptPrinters from './pages/ReceiptPrinters';
import POSList from './pages/POSList';
import BusinessLocations from './pages/BusinessLocations';
import Variations from './pages/Variations';
import Units from './pages/Units';
import Categories from './pages/Categories';
import Warranties from './pages/Warranties';
import BalanceSheet from './pages/BalanceSheet';
import TrialBalance from './pages/TrialBalance';
import CashFlow from './pages/CashFlow';
import PaymentAccountReport from './pages/PaymentAccountReport';
import StockTransfer from './pages/StockTransfer';
import StockAdjustment from './pages/StockAdjustment';
import BatchSettings from './pages/inventory/settings/BatchSettings';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function App() {
  console.log('[DEBUG] App.jsx: Component rendering');
  
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            <ErrorBoundary>
              <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Dashboard />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/pos"
              element={
                <ProtectedRoute>
                  <Layout>
                    <POS />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/sales"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Sales />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/sales/add"
              element={
                <ProtectedRoute>
                  <Layout>
                    <AddSale />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/sales/drafts"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Drafts />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/sales/quotations"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Quotations />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/sales/pos-list"
              element={
                <ProtectedRoute>
                  <Layout>
                    <POSList />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/sales/returns"
              element={
                <ProtectedRoute>
                  <Layout>
                    <SalesReturns />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/inventory"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Inventory />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/inventory/batches"
              element={
                <ProtectedRoute>
                  <Layout>
                    <InventoryBatches />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/payments"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Payments />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/customers"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Customers />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/suppliers"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Suppliers />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/purchases"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Purchases />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/purchases/add"
              element={
                <ProtectedRoute>
                  <Layout>
                    <AddPurchase />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/purchases/returns"
              element={
                <ProtectedRoute>
                  <Layout>
                    <PurchaseReturns />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/expenses"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Expenses />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/expenses/categories"
              element={
                <ProtectedRoute>
                  <Layout>
                    <ExpenseCategories />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/payroll"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Payroll />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/users"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Users />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/roles"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Roles />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/products"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Products />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/products/update-price"
              element={
                <ProtectedRoute>
                  <Layout>
                    <UpdatePrice />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Settings />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/production-queue"
              element={
                <ProtectedRoute>
                  <Layout>
                    <ProductionQueue />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/shipments"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Shipments />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/accounts/reports"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Reports />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/accounts/payment-accounts"
              element={
                <ProtectedRoute>
                  <Layout>
                    <PaymentAccounts />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings/business"
              element={
                <ProtectedRoute>
                  <Layout>
                    <BusinessSettings />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings/tax"
              element={
                <ProtectedRoute>
                  <Layout>
                    <TaxRates />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings/invoice"
              element={
                <ProtectedRoute>
                  <Layout>
                    <InvoiceSettings />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/manufacturing/status"
              element={
                <ProtectedRoute>
                  <Layout>
                    <ManufacturingStatus />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/manufacturing/recipes"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Recipes />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/inventory/print-labels"
              element={
                <ProtectedRoute>
                  <Layout>
                    <PrintLabels />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/inventory/stock-transfer"
              element={
                <ProtectedRoute>
                  <Layout>
                    <StockTransfer />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/inventory/stock-adjustment"
              element={
                <ProtectedRoute>
                  <Layout>
                    <StockAdjustment />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/agents"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Agents />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/discounts"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Discounts />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/delivery-notes"
              element={
                <ProtectedRoute>
                  <Layout>
                    <DeliveryNotes />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings/barcode"
              element={
                <ProtectedRoute>
                  <Layout>
                    <BarcodeSettings />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings/receipt-printers"
              element={
                <ProtectedRoute>
                  <Layout>
                    <ReceiptPrinters />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings/locations"
              element={
                <ProtectedRoute>
                  <Layout>
                    <BusinessLocations />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/inventory/settings/variations"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Variations />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/inventory/settings/units"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Units />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/inventory/settings/categories"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Categories />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/inventory/settings/batches"
              element={
                <ProtectedRoute>
                  <Layout>
                    <BatchSettings />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/inventory/settings/warranties"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Warranties />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/import-contacts"
              element={
                <ProtectedRoute>
                  <Layout>
                    <ImportContacts />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/accounts/payment-accounts/balance-sheet"
              element={
                <ProtectedRoute>
                  <Layout>
                    <BalanceSheet />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/accounts/payment-accounts/trial-balance"
              element={
                <ProtectedRoute>
                  <Layout>
                    <TrialBalance />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/accounts/payment-accounts/cash-flow"
              element={
                <ProtectedRoute>
                  <Layout>
                    <CashFlow />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/accounts/payment-accounts/report/:accountId"
              element={
                <ProtectedRoute>
                  <Layout>
                    <PaymentAccountReport />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </ErrorBoundary>
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;

