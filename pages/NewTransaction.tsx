import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  Loader2, 
  FileText, 
  Hash, 
  CheckCircle2,
  Zap,
  AlertCircle
} from 'lucide-react';

type PaymentMode = 'cash' | 'bank' | 'upi';

export default function NewTransaction() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [amount, setAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('cash');
  const [source, setSource] = useState('');
  const [referenceId, setReferenceId] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (paymentMode === 'cash') {
      setReferenceId('');
      setFieldErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.referenceId;
        return newErrors;
      });
    }
  }, [paymentMode]);

  const cleanAmountString = (str: string) => str.replace(/,/g, '');

  const validateForm = useCallback(() => {
    const errors: Record<string, string> = {};
    const clean = cleanAmountString(amount);
    const numAmount = parseFloat(clean);
    
    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      errors.amount = 'Valid settlement value required';
    }
    if (!source.trim()) {
      errors.source = 'Entity source required';
    }
    if (paymentMode !== 'cash' && !referenceId.trim()) {
      errors.referenceId = 'Network UTR/Ref ID required';
    }
    
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }, [amount, source, paymentMode, referenceId]);

  const handleInitialSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      setShowModal(true);
    }
  };

  const confirmSubmit = async () => {
    if (!user || isSubmitting) return;
    
    const clean = cleanAmountString(amount);
    const numAmount = parseFloat(clean);
    
    if (isNaN(numAmount)) {
        setError('Invalid amount detected. Re-verify input.');
        setShowModal(false);
        return;
    }

    setIsSubmitting(true);
    setError(null);
    
    try {
      const payload = {
        amount: numAmount,
        payment_mode: paymentMode,
        source: source.trim(),
        reference_id: paymentMode === 'cash' ? null : referenceId.trim().toUpperCase(),
        created_by: user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { error: insertError } = await supabase.from('transactions').insert([payload]);
      
      if (insertError) throw insertError;
      
      navigate('/', { replace: true });
    } catch (err: any) {
      console.error('Submission failed:', err);
      setError(err.message || 'Transaction authorization failed.');
      setShowModal(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayAmount = parseFloat(cleanAmountString(amount) || '0');

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-xl mx-auto py-8"
    >
      <button 
        onClick={() => navigate(-1)} 
        className="mb-10 group flex items-center text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 hover:text-indigo-600 transition-colors"
        aria-label="Back to Console"
      >
        <ArrowLeft className="h-5 w-5 mr-2 group-hover:-translate-x-1 transition-transform" />
        Back to Console
      </button>

      <div className="overflow-hidden rounded-[3rem] bg-white shadow-[0_50px_100px_-20px_rgba(0,0,0,0.12)] ring-1 ring-slate-100">
        <div className="bg-slate-900 px-12 py-10 text-white">
           <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500 shadow-lg shadow-indigo-500/30">
                  <Zap className="h-5 w-5" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500">Node Settlement Terminal</span>
           </div>
           <h1 className="mt-6 text-4xl font-black italic tracking-tighter">Record Entry</h1>
        </div>

        <div className="p-12">
          {error && (
            <div className="mb-8 flex items-center gap-3 rounded-2xl bg-rose-50 p-4 text-xs font-bold text-rose-600 ring-1 ring-rose-100">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleInitialSubmit} className="space-y-12">
            <div className="text-center group relative">
              <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Settlement Value (INR)</label>
              <div className="relative mt-6">
                <span className="absolute left-0 top-1/2 -translate-y-1/2 text-5xl font-black text-slate-100 group-focus-within:text-indigo-100 transition-colors">₹</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9.]/g, '');
                    if (val.split('.').length <= 2) setAmount(val);
                  }}
                  className="block w-full border-none bg-transparent py-4 text-center text-7xl font-black text-slate-900 tracking-tighter tabular-nums placeholder:text-slate-50 focus:ring-0"
                  placeholder="0.00"
                  autoFocus
                />
                <motion.div 
                  initial={{ scaleX: 0 }}
                  whileInView={{ scaleX: 1 }}
                  className={`mx-auto h-1 w-40 transition-all duration-700 rounded-full ${fieldErrors.amount ? 'bg-rose-500' : 'bg-slate-100 group-focus-within:bg-indigo-600'}`} 
                />
              </div>
              {fieldErrors.amount && <p className="mt-4 text-[10px] font-black text-rose-500 uppercase tracking-widest">{fieldErrors.amount}</p>}
            </div>

            <div className="grid grid-cols-3 gap-4">
               {(['cash', 'bank', 'upi'] as PaymentMode[]).map((mode) => (
                 <motion.button
                   whileHover={{ scale: 1.05 }}
                   whileTap={{ scale: 0.95 }}
                   key={mode}
                   type="button"
                   onClick={() => setPaymentMode(mode)}
                   className={`flex flex-col items-center gap-3 rounded-[2rem] border-2 py-6 transition-all ${
                     paymentMode === mode
                       ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-xl shadow-indigo-100'
                       : 'border-slate-50 bg-slate-50 text-slate-300'
                   }`}
                 >
                   <span className="text-[10px] font-black uppercase tracking-[0.2em]">{mode}</span>
                 </motion.button>
               ))}
            </div>

            <div className="space-y-8">
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-2">Entity Reference Source</label>
                <div className="relative">
                  <FileText className="absolute left-6 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-300" />
                  <input
                    type="text"
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                    className={`h-16 w-full rounded-3xl border-none bg-slate-50 pl-16 pr-6 text-sm font-bold shadow-inner focus:ring-4 transition-all ${fieldErrors.source ? 'ring-2 ring-rose-500 focus:ring-rose-100' : 'focus:ring-indigo-600/5'}`}
                    placeholder="Customer or Organization Name"
                  />
                </div>
                {fieldErrors.source && <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest ml-2">{fieldErrors.source}</p>}
              </div>

              <AnimatePresence>
              {paymentMode !== 'cash' && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-3 overflow-hidden"
                >
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-2">Network UTR / Reference ID</label>
                  <div className="relative">
                    <Hash className="absolute left-6 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-300" />
                    <input
                      type="text"
                      value={referenceId}
                      onChange={(e) => setReferenceId(e.target.value.toUpperCase())}
                      className={`h-16 w-full rounded-3xl border-none bg-slate-50 pl-16 pr-6 text-sm font-mono font-bold shadow-inner focus:ring-4 transition-all ${fieldErrors.referenceId ? 'ring-2 ring-rose-500 focus:ring-rose-100' : 'focus:ring-indigo-600/5'}`}
                      placeholder="UTR-XXXX-XXXX"
                    />
                  </div>
                  {fieldErrors.referenceId && <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest ml-2">{fieldErrors.referenceId}</p>}
                </motion.div>
              )}
              </AnimatePresence>
            </div>

            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              className="w-full rounded-[2rem] bg-slate-950 py-6 text-[10px] font-black uppercase tracking-[0.3em] text-white shadow-2xl transition-all hover:bg-black active:bg-indigo-900"
            >
              Authorize Settlement
            </motion.button>
          </form>
        </div>
      </div>

      <AnimatePresence>
      {showModal && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-md"
        >
           <motion.div 
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="w-full max-w-sm overflow-hidden rounded-[3rem] bg-white shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)]"
           >
              <div className="p-12 text-center">
                 <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[2rem] bg-indigo-50 text-indigo-600 shadow-inner">
                    <CheckCircle2 className="h-10 w-10" />
                 </div>
                 <h3 className="mt-8 text-3xl font-black tracking-tighter text-slate-900 leading-none">Confirm Log</h3>
                 <p className="mt-4 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Final Verification Pulse</p>
                 
                 <div className="mt-10 space-y-5 rounded-[2.5rem] bg-slate-50 p-8 text-left ring-1 ring-slate-100">
                    <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Amount</span>
                        <span className="font-mono text-xl font-black text-indigo-600 italic">₹{displayAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between items-center border-t border-slate-200 pt-5">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Channel</span>
                        <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">{paymentMode}</span>
                    </div>
                 </div>
              </div>
              <div className="flex border-t border-slate-100 bg-slate-50/30 p-6 gap-4">
                 <button 
                  onClick={() => setShowModal(false)} 
                  disabled={isSubmitting}
                  className="flex-1 rounded-2xl bg-white py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50 disabled:opacity-50"
                 >
                    Dismiss
                 </button>
                 <button 
                  onClick={confirmSubmit} 
                  disabled={isSubmitting} 
                  className="flex-1 rounded-2xl bg-indigo-600 py-4 text-[10px] font-black uppercase tracking-widest text-white shadow-xl shadow-indigo-100 hover:bg-indigo-700 disabled:opacity-50"
                 >
                    {isSubmitting ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : 'Authorize'}
                 </button>
              </div>
           </motion.div>
        </motion.div>
      )}
      </AnimatePresence>
    </motion.div>
  );
}