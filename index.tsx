import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ResetPassword from './pages/ResetPassword';
import NewTransaction from './pages/NewTransaction';
import './index.css'; // Assuming Tailwind directives are here or handled by the environment

const App = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* Protected Routes */}
          {/* Default dashboard accessible by all authenticated roles */}
          <Route element={<ProtectedRoute />}>
             <Route path="/" element={<Dashboard />} />
          </Route>

          {/* Admin & Super Admin Routes */}
          <Route element={<ProtectedRoute allowedRoles={['admin', 'super_admin']} />}>
             <Route path="/transactions/new" element={<NewTransaction />} />
          </Route>

          {/* Example of Role Specific Route */}
          <Route element={<ProtectedRoute allowedRoles={['super_admin']} />}>
             <Route path="/admin/settings" element={<div>Super Admin Settings</div>} />
          </Route>

          {/* Catch all redirect to login */}
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