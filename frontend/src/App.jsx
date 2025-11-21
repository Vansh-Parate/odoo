import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import Layout from './components/layout/Layout';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Stock from './pages/Stock';
import Operations from './pages/Operations';
import MoveHistory from './pages/MoveHistory';
import Settings from './pages/Settings';
import Receipts from './pages/Receipts';
import ReceiptsList from './pages/ReceiptsList';
import ReceiptDetail from './pages/ReceiptDetail';
import Deliveries from './pages/Deliveries';
import Toast from './components/ui/Toast';

// Protected Route Component
function ProtectedRoute({ children }) {
  const { user } = useApp();
  return user ? children : <Navigate to="/login" replace />;
}

// Public Route Component (redirects to dashboard if logged in)
function PublicRoute({ children }) {
  const { user } = useApp();
  return user ? <Navigate to="/dashboard" replace /> : children;
}

function AppRoutes() {
  const { toast, closeToast } = useApp();

  return (
    <>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Layout>
                <Dashboard />
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
          path="/stock"
          element={
            <ProtectedRoute>
              <Stock />
            </ProtectedRoute>
          }
        />
        <Route
          path="/operations"
          element={
            <ProtectedRoute>
              <Operations />
            </ProtectedRoute>
          }
        />
        <Route
          path="/move-history"
          element={
            <ProtectedRoute>
              <MoveHistory />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          }
        />
        <Route
          path="/receipts"
          element={
            <ProtectedRoute>
              <Layout>
                <ReceiptsList />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/receipts/:id"
          element={
            <ProtectedRoute>
              <Layout>
                <ReceiptDetail />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/deliveries"
          element={
            <ProtectedRoute>
              <Layout>
                <Deliveries />
              </Layout>
            </ProtectedRoute>
          }
        />
      </Routes>
      <Toast toast={toast} onClose={closeToast} />
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <AppRoutes />
      </AppProvider>
    </BrowserRouter>
  );
}

export default App;
