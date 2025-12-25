import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { LogOut, LayoutDashboard, PlusCircle, Search, FileBarChart } from 'lucide-react';

export default function Dashboard() {
  const { user, role, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const isAdmin = role === 'admin' || role === 'super_admin';

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
            
            <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {/* Admin Actions */}
                {isAdmin && (
                    <>
                        <Link to="/transactions/new" className="relative flex items-center space-x-3 rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm focus-within:ring-2 focus-within:ring-indigo-500 focus-within:ring-offset-2 hover:border-gray-400 hover:bg-gray-50">
                            <div className="flex-shrink-0">
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
                                    <PlusCircle className="h-6 w-6" />
                                </div>
                            </div>
                            <div className="min-w-0 flex-1">
                                <span className="absolute inset-0" aria-hidden="true" />
                                <p className="text-sm font-medium text-gray-900">New Transaction</p>
                                <p className="truncate text-sm text-gray-500">Record a payment entry</p>
                            </div>
                        </Link>

                        <Link to="/admin/search" className="relative flex items-center space-x-3 rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm focus-within:ring-2 focus-within:ring-indigo-500 focus-within:ring-offset-2 hover:border-gray-400 hover:bg-gray-50">
                            <div className="flex-shrink-0">
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 text-green-600">
                                    <Search className="h-6 w-6" />
                                </div>
                            </div>
                            <div className="min-w-0 flex-1">
                                <span className="absolute inset-0" aria-hidden="true" />
                                <p className="text-sm font-medium text-gray-900">Global Search</p>
                                <p className="truncate text-sm text-gray-500">Filter and view history</p>
                            </div>
                        </Link>
                    </>
                )}

                <div className="relative flex items-center space-x-3 rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm focus-within:ring-2 focus-within:ring-indigo-500 focus-within:ring-offset-2 hover:border-gray-400 hover:bg-gray-50">
                    <div className="flex-shrink-0">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-100 text-yellow-600">
                            <FileBarChart className="h-6 w-6" />
                        </div>
                    </div>
                    <div className="min-w-0 flex-1">
                        <span className="absolute inset-0" aria-hidden="true" />
                        <p className="text-sm font-medium text-gray-900">My Reports</p>
                        <p className="truncate text-sm text-gray-500">View your activity</p>
                    </div>
                </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}