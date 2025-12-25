
import React from 'react';
import './src/index.css';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ResetPassword from './pages/ResetPassword';
import NewTransaction from './pages/NewTransaction';
import AdminSearch from './pages/AdminSearch';
import TransactionDetail from './pages/TransactionDetail';
import AIAudit from './pages/AIAudit';
import ScanReceipt from './pages/ScanReceipt';

const App = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* Protected Routes Wrapper */}
          <Route element={<ProtectedRoute />}>
             <Route path="/" element={<Layout><Dashboard /></Layout>} />
          </Route>

          {/* Admin & Super Admin Specific Routes */}
          <Route element={<ProtectedRoute allowedRoles={['admin', 'super_admin']} />}>
             <Route path="/transactions/new" element={<Layout><NewTransaction /></Layout>} />
             <Route path="/admin/search" element={<Layout><AdminSearch /></Layout>} />
             <Route path="/admin/transactions/:id" element={<Layout><TransactionDetail /></Layout>} />
             <Route path="/admin/scan" element={<Layout><ScanReceipt /></Layout>} />
             <Route path="/intelligence" element={<Layout><AIAudit /></Layout>} />
          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
};

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}
