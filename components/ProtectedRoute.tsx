import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Loader2, ShieldAlert, ArrowLeft, Home } from 'lucide-react';

export type AppRole = 'super_admin' | 'admin' | 'user';

interface ProtectedRouteProps {
  allowedRoles?: AppRole[];
  children?: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles, children }) => {
  const { user, role, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // 1. Loading state: check if we are still verifying identity or role
  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Verifying Access Protocol...</span>
        </div>
      </div>
    );
  }

  // 2. Not authenticated: Redirect to login
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 3. Authenticated but Role not yet available (Security guard)
  if (!role) {
     return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-50">
         <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  // 4. Role mismatch: Show Access Denied UI
  if (allowedRoles && !allowedRoles.includes(role as AppRole)) {
    return (
        <div className="flex h-screen flex-col items-center justify-center bg-gray-50 p-4 text-center">
            <div className="rounded-[2rem] bg-rose-50 p-6 shadow-inner ring-1 ring-rose-100">
                <ShieldAlert className="h-12 w-12 text-rose-600" />
            </div>
            <h1 className="mt-8 text-3xl font-black italic tracking-tighter text-slate-900">Access Denied</h1>
            <p className="mt-4 text-slate-500 font-medium max-w-xs">
                Your credentials lack the authorization required for this terminal node.
            </p>
            <div className="mt-10 rounded-3xl bg-white p-8 shadow-xl ring-1 ring-slate-200 text-left w-full max-w-sm">
              <div className="flex justify-between items-center mb-4">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Required Clearance</span>
                <span className="text-[10px] font-black text-slate-900 bg-slate-100 px-3 py-1 rounded-full">{allowedRoles.join(', ').toUpperCase()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Current Clearance</span>
                <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">{role.toUpperCase()}</span>
              </div>
            </div>
            <div className="mt-10 flex justify-center gap-4 w-full max-w-sm">
              <button 
                  onClick={() => navigate(-1)}
                  className="flex-1 rounded-2xl bg-white px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-900 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50"
              >
                  <ArrowLeft className="mr-2 h-4 w-4 inline" />
                  Back
              </button>
              <button 
                  onClick={() => navigate('/')}
                  className="flex-1 rounded-2xl bg-indigo-600 px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white shadow-xl shadow-indigo-100 hover:bg-indigo-700"
              >
                  <Home className="mr-2 h-4 w-4 inline" />
                  Pulse
              </button>
            </div>
        </div>
    )
  }

  // 5. Authorized: Render children or Outlet
  return children ? <>{children}</> : <Outlet />;
};