import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Loader2, ShieldAlert, ArrowLeft, Home } from 'lucide-react';

type AppRole = 'super_admin' | 'admin' | 'user';

interface ProtectedRouteProps {
  allowedRoles?: AppRole[];
  children?: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles, children }) => {
  const { user, role, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // 1. Loading state
  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
          <span className="text-sm font-medium text-gray-500">Verifying access...</span>
        </div>
      </div>
    );
  }

  // 2. Not authenticated: Redirect to login
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 3. Authenticated but Role not yet loaded (Safety guard)
  if (!role) {
     return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-50">
         <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  // 4. Role mismatch: Show Access Denied
  // The 'as AppRole' cast is safe here because we checked !role above
  if (allowedRoles && !allowedRoles.includes(role as AppRole)) {
    return (
        <div className="flex h-screen flex-col items-center justify-center bg-gray-50 p-4 text-center">
            <div className="rounded-full bg-red-100 p-3">
                <ShieldAlert className="h-10 w-10 text-red-600" />
            </div>
            <h1 className="mt-4 text-2xl font-bold text-gray-900">Access Denied</h1>
            <p className="mt-2 text-gray-600">
                You do not have permission to view this page.
            </p>
            <div className="mt-4 rounded-md bg-gray-100 px-4 py-2 text-sm text-gray-700">
              Required: <span className="font-semibold text-gray-900">{allowedRoles.join(', ')}</span>
              <br/>
              Current: <span className="font-semibold text-indigo-600">{role}</span>
            </div>
            <div className="mt-8 flex justify-center gap-3">
              <button 
                  onClick={() => navigate(-1)}
                  className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Go Back
              </button>
              <button 
                  onClick={() => navigate('/')}
                  className="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                  <Home className="mr-2 h-4 w-4" />
                  Dashboard
              </button>
            </div>
        </div>
    )
  }

  // 5. Authorized: Render children or Outlet
  return children ? <>{children}</> : <Outlet />;
};