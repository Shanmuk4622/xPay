import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Lock, Loader2, AlertCircle, CheckCircle, Key } from 'lucide-react';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if session exists. Supabase handles the URL fragment parsing automatically.
    // If the user clicks the email link, the session (type: recovery) is established.
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Invalid or expired password reset link. Please request a new one.');
      }
    };
    checkSession();
  }, []);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Updates the user's password using the active session
      const { error } = await supabase.auth.updateUser({ password });
      
      if (error) throw error;
      
      setSuccess(true);
      
      // Redirect to dashboard after a short delay
      setTimeout(() => {
        navigate('/');
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to update password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4 sm:p-8">
      <div className="w-full max-w-md overflow-hidden rounded-xl bg-white shadow-xl ring-1 ring-gray-900/5">
        
        {/* Header */}
        <div className="bg-indigo-600 p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-indigo-500 text-white shadow-sm">
            <Key className="h-6 w-6" />
          </div>
          <h2 className="mt-4 text-2xl font-bold text-white">Set New Password</h2>
          <p className="mt-2 text-indigo-100">
            Please enter your new password below.
          </p>
        </div>

        {/* Form */}
        <div className="p-8">
          <form onSubmit={handleUpdatePassword} className="space-y-6">
            
            {success && (
              <div className="flex items-start rounded-md bg-green-50 p-3 text-sm text-green-700">
                <CheckCircle className="mr-2 h-4 w-4 mt-0.5 shrink-0" />
                <span>Password updated successfully! Redirecting...</span>
              </div>
            )}

            {error && (
              <div className="flex items-start rounded-md bg-red-50 p-3 text-sm text-red-600">
                <AlertCircle className="mr-2 h-4 w-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                New Password
              </label>
              <div className="relative mt-1">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full rounded-md border border-gray-300 py-2.5 pl-10 pr-3 text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm"
                  placeholder="••••••••"
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">Must be at least 6 characters.</p>
            </div>

            <button
              type="submit"
              disabled={loading || !!success}
              className="flex w-full justify-center rounded-md bg-indigo-600 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:bg-indigo-400"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Password'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}