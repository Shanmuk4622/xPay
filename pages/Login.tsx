import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, Loader2, AlertCircle, UserPlus, CheckCircle, Key, ArrowLeft, Wallet } from 'lucide-react';

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
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/reset-password`,
        });
        if (resetError) throw resetError;
        setSuccessMsg('Reset instructions dispatched to your inbox.');
      } else if (isSignUp) {
        const { data, error: authError } = await supabase.auth.signUp({ email, password });
        if (authError) throw authError;
        if (data.user && !data.session) {
            setSuccessMsg('Verification email sent! Please check your inbox.');
            setIsSignUp(false);
            setPassword('');
        } else if (data.session) navigate('/');
      } else {
        const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
        if (authError) throw authError;
        navigate('/');
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed.');
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

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Left Panel: Visual/Branding */}
      <div className="relative hidden flex-col justify-between bg-indigo-600 p-12 lg:flex overflow-hidden">
        {/* Abstract Background Element */}
        <div className="absolute -right-20 -top-20 h-96 w-96 rounded-full bg-indigo-500/50 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-96 w-96 rounded-full bg-indigo-800/50 blur-3xl" />
        
        <div className="relative z-10 flex items-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-indigo-600 shadow-xl">
            <Wallet className="h-6 w-6" />
          </div>
          <span className="ml-3 text-2xl font-black tracking-tighter text-white">FinTrack<span className="text-indigo-300">Pro</span></span>
        </div>

        <div className="relative z-10 max-w-md">
           <h1 className="text-5xl font-black leading-tight text-white italic">Audit Everything. Control Everywhere.</h1>
           <p className="mt-6 text-lg font-medium text-indigo-100">The world's most intuitive financial transaction engine for modern branches.</p>
           <div className="mt-10 flex items-center gap-4">
              <div className="flex -space-x-3">
                 {[1,2,3,4].map(i => <div key={i} className="h-10 w-10 rounded-full border-2 border-indigo-600 bg-indigo-400 shadow-sm ring-1 ring-white/10" />)}
              </div>
              <span className="text-sm font-bold text-indigo-200 uppercase tracking-widest">Trusted by 500+ Branches</span>
           </div>
        </div>

        <div className="relative z-10 text-xs font-medium text-indigo-300">
           &copy; 2025 FinTrack Pro Systems. All Rights Reserved.
        </div>
      </div>

      {/* Right Panel: Auth Form */}
      <div className="flex items-center justify-center bg-white p-8 sm:p-12">
        <div className="w-full max-w-md">
          <header className="mb-10 lg:hidden">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg">
                <Wallet className="h-6 w-6" />
              </div>
              <h2 className="mt-4 text-2xl font-black text-slate-900 uppercase tracking-tighter">FinTrack Pro</h2>
          </header>

          <h2 className="text-3xl font-black tracking-tight text-slate-900">
            {isForgotPassword ? 'Rescue Password' : isSignUp ? 'Onboard Unit' : 'Terminal Access'}
          </h2>
          <p className="mt-2 text-sm font-medium text-slate-400">
            {isForgotPassword ? 'Enter verified email for recovery.' : 'Please provide your security credentials.'}
          </p>

          <form onSubmit={handleAuth} className="mt-10 space-y-5">
            {successMsg && (
                <div className="flex items-center gap-3 rounded-2xl bg-emerald-50 p-4 text-xs font-bold text-emerald-700 ring-1 ring-emerald-100 animate-in fade-in duration-300">
                    <CheckCircle className="h-4 w-4 shrink-0" />
                    <span>{successMsg}</span>
                </div>
            )}
            {error && (
              <div className="flex items-center gap-3 rounded-2xl bg-rose-50 p-4 text-xs font-bold text-rose-600 ring-1 ring-rose-100">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Work Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-300" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-14 w-full rounded-2xl border-none bg-slate-50 pl-12 pr-4 text-sm font-bold text-slate-900 shadow-inner ring-1 ring-slate-200 placeholder:text-slate-300 focus:ring-2 focus:ring-indigo-600"
                  placeholder="admin@branch.com"
                />
              </div>
            </div>

            {!isForgotPassword && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Secret Key</label>
                  <div className="relative">
                      <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-300" />
                      <input
                        type="password"
                        required
                        minLength={6}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="h-14 w-full rounded-2xl border-none bg-slate-50 pl-12 pr-4 text-sm font-bold text-slate-900 shadow-inner ring-1 ring-slate-200 placeholder:text-slate-300 focus:ring-2 focus:ring-indigo-600"
                        placeholder="••••••••"
                      />
                  </div>
                </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex h-14 w-full items-center justify-center rounded-2xl bg-indigo-600 text-sm font-black uppercase tracking-widest text-white shadow-xl shadow-indigo-100 transition-all hover:bg-indigo-700 active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : isForgotPassword ? 'Request Reset' : isSignUp ? 'Initialize' : 'Authorize'}
            </button>
          </form>

          <div className="mt-8 text-center">
            {isForgotPassword ? (
                <button onClick={() => setIsForgotPassword(false)} className="inline-flex items-center text-xs font-black uppercase tracking-widest text-slate-400 hover:text-indigo-600 transition-colors">
                    <ArrowLeft className="mr-2 h-3 w-3" /> Back to Authorization
                </button>
            ) : (
                <div className="space-y-4">
                  <button onClick={toggleMode} className="text-xs font-black uppercase tracking-widest text-slate-400 hover:text-indigo-600 transition-colors">
                      {isSignUp ? 'Existing Terminal User? Sign In' : 'New Branch Setup? Register'}
                  </button>
                  {!isSignUp && (
                    <div>
                      <button onClick={() => setIsForgotPassword(true)} className="text-[10px] font-bold uppercase tracking-widest text-slate-300 hover:text-rose-400 transition-colors">Forgot Access Key?</button>
                    </div>
                  )}
                </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}