
import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { LogOut, LayoutDashboard } from 'lucide-react';

export default function Dashboard() {
  const { user, role, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 justify-between">
            <div className="flex items-center">
              <LayoutDashboard className="h-6 w-6 text-indigo-600" />
              <span className="ml-2 text-xl font-bold text-gray-900">FinTrack</span>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-gray-900">{user?.email}</p>
                <p className="text-xs text-gray-500 uppercase">{role}</p>
              </div>
              <button
                onClick={handleSignOut}
                className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-lg bg-white px-5 py-6 shadow sm:px-6">
            <div className="border-b border-gray-200 pb-5">
              <h3 className="text-lg font-medium leading-6 text-gray-900">
                Welcome back!
              </h3>
              <p className="mt-2 max-w-4xl text-sm text-gray-500">
                You are logged in as a <strong>{role}</strong>. 
                {role === 'super_admin' && ' You have full access to all system data.'}
                {role === 'admin' && ' You can manage transactions and users for your branch.'}
                {role === 'user' && ' You have read-only access to your assigned transactions.'}
              </p>
            </div>
            <div className="mt-6">
              <div className="rounded-md bg-blue-50 p-4">
                <div className="flex">
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-blue-800">System Status</h3>
                    <div className="mt-2 text-sm text-blue-700">
                      <p>Connected to Supabase. RLS policies are active.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
