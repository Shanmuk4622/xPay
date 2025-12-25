import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, Loader2, AlertCircle, UserPlus, CheckCircle, Key, ArrowLeft } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  
  const navigate = useNavigate();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      if (isForgotPassword) {
        // --- FORGOT PASSWORD LOGIC ---
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/reset-password`,
        });
        
        if (resetError) throw resetError;
        setSuccessMsg('Password reset link sent! Please check your email inbox.');
      } else if (isSignUp) {
        // --- SIGN UP LOGIC ---
        const { data, error: authError } = await supabase.auth.signUp({
          email,
          password,
        });

        if (authError) throw authError;

        // Check if session is null (implies email confirmation is required)
        if (data.user && !data.session) {
            setSuccessMsg('Account created successfully! Please check your email to confirm your registration before logging in.');
            setIsSignUp(false); // Switch back to login view
            setPassword(''); // Clear password for security
        } else if (data.session) {
            // Auto-login (if email confirmation is disabled in Supabase)
            navigate('/');
        }
      } else {
        // --- SIGN IN LOGIC ---
        const { error: authError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (authError) throw authError;
        
        navigate('/');
      }
    } catch (err: any) {
      let errorMessage = 'Authentication failed.';
      
      // Map Supabase errors to user-friendly messages
      if (err.message) {
         if (err.message.includes('Invalid login credentials')) {
             errorMessage = 'Invalid email or password.';
         } else if (err.message.includes('Email not confirmed')) {
             errorMessage = 'Please confirm your email address before logging in.';
         } else if (err.message.includes('User already registered')) {
             errorMessage = 'This email is already registered. Please sign in.';
         } else if (err.message.includes('Rate limit exceeded')) {
            errorMessage = 'Too many requests. Please try again later.';
         } else {
             errorMessage = err.message;
         }
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
      setIsSignUp(!isSignUp);
      setIsForgotPassword(false);
      setError(null);
      setSuccessMsg(null);
      setEmail('');
      setPassword('');
  };

  const showForgotPassword = () => {
      setIsForgotPassword(true);
      setIsSignUp(false);
      setError(null);
      setSuccessMsg(null);
      // Keep email if user already typed it
      setPassword('');
  };

  const backToLogin = () => {
      setIsForgotPassword(false);
      setError(null);
      setSuccessMsg(null);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4 sm:p-8">
      <div className="w-full max-w-md overflow-hidden rounded-xl bg-white shadow-xl ring-1 ring-gray-900/5">
        
        {/* Header */}
        <div className="bg-indigo-600 p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-indigo-500 text-white shadow-sm">
            {isForgotPassword ? (
                <Key className="h-6 w-6" />
            ) : isSignUp ? (
                <UserPlus className="h-6 w-6" />
            ) : (
                <Lock className="h-6 w-6" />
            )}
          </div>
          <h2 className="mt-4 text-2xl font-bold text-white">
            {isForgotPassword 
                ? 'Reset Password' 
                : isSignUp 
                    ? 'Create Account' 
                    : 'FinTrack Pro'
            }
          </h2>
          <p className="mt-2 text-indigo-100">
            {isForgotPassword
                ? 'Enter your email to receive instructions'
                : isSignUp 
                    ? 'Join the platform today' 
                    : 'Secure Financial Management'
            }
          </p>
        </div>

        {/* Form */}
        <div className="p-8">
          <form onSubmit={handleAuth} className="space-y-6">
            
            {/* Success Message */}
            {successMsg && (
                <div className="flex items-start rounded-md bg-green-50 p-3 text-sm text-green-700">
                    <CheckCircle className="mr-2 h-4 w-4 mt-0.5 shrink-0" />
                    <span>{successMsg}</span>
                </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="flex items-start rounded-md bg-red-50 p-3 text-sm text-red-600">
                <AlertCircle className="mr-2 h-4 w-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email Address
              </label>
              <div className="relative mt-1">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full rounded-md border border-gray-300 py-2.5 pl-10 pr-3 text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm"
                  placeholder="name@company.com"
                />
              </div>
            </div>

            {!isForgotPassword && (
                <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                    Password
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
                {isSignUp && (
                    <p className="mt-1 text-xs text-gray-500">Must be at least 6 characters.</p>
                )}
                </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full justify-center rounded-md bg-indigo-600 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:bg-indigo-400"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Processing...
                </>
              ) : (
                isForgotPassword
                    ? 'Send Reset Link'
                    : isSignUp 
                        ? 'Create Account' 
                        : 'Sign In'
              )}
            </button>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-white px-2 text-gray-500">or</span>
              </div>
            </div>

            <div className="mt-6 text-center">
                {isForgotPassword ? (
                    <button
                        type="button"
                        onClick={backToLogin}
                        className="flex w-full justify-center items-center text-sm font-medium text-gray-600 hover:text-gray-900 focus:outline-none"
                    >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Sign In
                    </button>
                ) : (
                    <button
                        type="button"
                        onClick={toggleMode}
                        className="text-sm font-medium text-indigo-600 hover:text-indigo-500 focus:outline-none"
                    >
                        {isSignUp 
                            ? 'Already have an account? Sign in' 
                            : "Don't have an account? Sign up"
                        }
                    </button>
                )}
            </div>
            
            {!isSignUp && !isForgotPassword && (
                 <div className="mt-2 text-center">
                    <button
                        type="button"
                        onClick={showForgotPassword}
                        className="text-xs text-gray-400 hover:text-indigo-500 hover:underline focus:outline-none"
                    >
                        Forgot password?
                    </button>
               </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}