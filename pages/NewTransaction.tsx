
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { GoogleGenAI } from "@google/genai";
import { motion, AnimatePresence } from 'framer-motion';
import { z } from 'zod';
// Added ShieldCheck to the lucide-react imports
import { 
  ArrowLeft, 
  Loader2, 
  FileText, 
  Hash, 
  CheckCircle2,
  Zap,
  AlertCircle,
  ShieldAlert,
  ShieldCheck,
  Cpu,
  Sparkles,
  LockKeyhole
} from 'lucide-react';

type PaymentMode = 'cash' | 'bank' | 'upi';

const transactionSchema = z.object({
  amount: z.string().refine((val) => {
    const num = parseFloat(val.replace(/,/g, ''));
    return !isNaN(num) && num > 0;
  }, { message: "Settlement value must be a positive number" }),
  source: z.string().min(2, "Entity source must be at least 2 characters").max(100, "Source name too long"),
  paymentMode: z.enum(['cash', 'bank', 'upi'] as const),
  referenceId: z.string().optional()
}).refine((data) => {
  if (data.paymentMode !== 'cash') {
    return !!data.referenceId && data.referenceId.trim().length > 0;
  }
  return true;
}, {
  message: "Network UTR/Ref ID is mandatory for digital settlements",
  path: ["referenceId"]
});

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
  
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditWarning, setAuditWarning] = useState<string | null>(null);

  useEffect(() => {
    if (paymentMode === 'cash') {
      setReferenceId('');
      setFieldErrors(prev => {
        const next = { ...prev };
        delete next.referenceId;
        return next;
      });
    }
  }, [paymentMode]);

  useEffect(() => {
    const auditTimer = setTimeout(async () => {
      if (amount && source.length > 3) {
        performSmartAudit();
      }
    }, 1500);
    return () => clearTimeout(auditTimer);
  }, [amount, source]);

  const performSmartAudit = async () => {
    setIsAuditing(true);
    setAuditWarning(null);
    try {
      const { data: recent } = await supabase
        .from('transactions')
        .select('source, amount, created_at')
        .order('created_at', { ascending: false })
        .limit(10);

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const context = recent?.map(r => `${r.source}: ₹${r.amount}`).join(', ') || "No recent history.";
      
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Analyze this new entry: "${source}" for ₹${amount}. Recent ledger: [${context}]. 
                   Return a brief warning only if this looks like a duplicate or unusual anomaly. 
                   If safe, respond with 'OK'. Keep it under 15 words.`
      });

      const result = response.text.trim();
      if (result.toUpperCase() !== 'OK' && !result.toUpperCase().includes('OK')) {
        setAuditWarning(result);
      }
    } catch (e) {
      console.debug('Audit skip:', e);
    } finally {
      setIsAuditing(false);
    }
  };

  const validateForm = useCallback(() => {
    const result = transactionSchema.safeParse({
      amount,
      source,
      paymentMode,
      referenceId
    });

    if (!result.success) {
      const errors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        const path = issue.path[0] as string;
        if (issue.code === 'custom' && issue.path.includes('referenceId')) {
          errors['referenceId'] = issue.message;
        } else if (path) {
          errors[path] = issue.message;
        }
      });
      setFieldErrors(errors);
      return false;
    }

    setFieldErrors({});
    return true;
  }, [amount, source, paymentMode, referenceId]);

  const handleInitialSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      setShowModal(true);
    }
  };

  const generateSecureId = () => {
    const array = new Uint8Array(16);
    window.crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('').toUpperCase();
  };

  const confirmSubmit = async () => {
    if (!user || isSubmitting) return;
    
    if (!validateForm()) {
      setShowModal(false);
      return;
    }

    const cleanAmount = parseFloat(amount.replace(/,/g, ''));
    setIsSubmitting(true);
    setError(null);
    
    try {
      // CSPRNG Audit Seal Generation
      const secureId = generateSecureId();
      
      const payload = {
        amount: cleanAmount,
        payment_mode: paymentMode,
        source: source.trim(),
        reference_id: paymentMode === 'cash' ? null : referenceId.trim().toUpperCase(),
        created_by: user.id,
        secure_id: secureId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { error: insertError } = await supabase.from('transactions').insert([payload]);
      if (insertError) throw insertError;
      
      navigate('/', { replace: true });
    } catch (err: any) {
      setError(err.message || 'Transaction authorization failed during ledger write.');
      setShowModal(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto py-8"
    >
      <button 
        onClick={() => navigate(-1)} 
        className="mb-10 group flex items-center text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 hover:text-indigo-600 transition-colors"
      >
        <ArrowLeft className="h-5 w-5 mr-2 group-hover:-translate-x-1 transition-transform" />
        Back to Console
      </button>

      <div className="overflow-hidden rounded-[3.5rem] bg-white shadow-[0_50px_100px_-20px_rgba(0,0,0,0.1)] ring-1 ring-slate-100">
        <div className="bg-slate-950 px-12 py-12 text-white relative">
           <div className="absolute top-0 right-0 p-12 opacity-10">
              <Cpu className="h-24 w-24" />
           </div>
           <div className="relative z-10 flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500 shadow-lg shadow-indigo-500/30">
                  <Zap className="h-5 w-5" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-500">Node Settlement Protocol</span>
           </div>
           <h1 className="mt-8 text-5xl font-black italic tracking-tighter leading-none">Record Entry</h1>
        </div>

        <div className="p-12">
          {error && (
            <div className="mb-10 flex items-center gap-3 rounded-2xl bg-rose-50 p-6 text-xs font-bold text-rose-600 ring-1 ring-rose-100">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleInitialSubmit} className="space-y-12">
            <div className="text-center group relative">
              <label className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">Settlement Value (INR)</label>
              <div className="relative mt-8">
                <span className={`absolute left-0 top-1/2 -translate-y-1/2 text-5xl font-black transition-colors italic ${fieldErrors.amount ? 'text-rose-200' : 'text-slate-100 group-focus-within:text-indigo-100'}`}>₹</span>
                <input
                  type="text"
                  value={amount}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9.]/g, '');
                    if (val.split('.').length <= 2) {
                      setAmount(val);
                      if (fieldErrors.amount) setFieldErrors(prev => {
                        const next = { ...prev };
                        delete next.amount;
                        return next;
                      });
                    }
                  }}
                  className={`block w-full border-none bg-transparent py-4 text-center text-8xl font-black tracking-tighter tabular-nums placeholder:text-slate-50 focus:ring-0 italic transition-colors ${fieldErrors.amount ? 'text-rose-500' : 'text-slate-900'}`}
                  placeholder="0.00"
                  autoFocus
                />
                <motion.div 
                  initial={{ scaleX: 0 }}
                  whileInView={{ scaleX: 1 }}
                  className={`mx-auto h-1.5 w-60 transition-all duration-700 rounded-full ${fieldErrors.amount ? 'bg-rose-500' : 'bg-slate-100 group-focus-within:bg-indigo-600'}`} 
                />
              </div>
              <AnimatePresence mode="wait">
                {fieldErrors.amount && (
                  <motion.p 
                    initial={{ opacity: 0, y: -5 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    exit={{ opacity: 0, y: -5 }}
                    className="mt-6 text-[10px] font-black text-rose-500 uppercase tracking-widest"
                  >
                    {fieldErrors.amount}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            <div className="grid grid-cols-3 gap-6">
               {(['cash', 'bank', 'upi'] as const).map((mode) => (
                 <motion.button
                   whileHover={{ scale: 1.05 }}
                   whileTap={{ scale: 0.95 }}
                   key={mode}
                   type="button"
                   onClick={() => {
                     setPaymentMode(mode);
                   }}
                   className={`flex flex-col items-center gap-4 rounded-[2.5rem] border-2 py-8 transition-all ${
                     paymentMode === mode
                       ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-2xl shadow-indigo-100'
                       : 'border-slate-50 bg-slate-50 text-slate-300 hover:border-slate-200'
                   }`}
                 >
                   <span className="text-[10px] font-black uppercase tracking-[0.3em]">{mode}</span>
                 </motion.button>
               ))}
            </div>

            <div className="space-y-10">
              <div className="space-y-4">
                <div className="flex items-center justify-between px-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Entity Reference Source</label>
                  {isAuditing && (
                    <div className="flex items-center gap-2 text-[10px] font-black text-indigo-500 uppercase tracking-widest">
                       <Loader2 className="h-3 w-3 animate-spin" /> Neural Sync
                    </div>
                  )}
                </div>
                <div className="relative">
                  <FileText className={`absolute left-8 top-1/2 h-6 w-6 -translate-y-1/2 transition-colors ${fieldErrors.source ? 'text-rose-400' : 'text-slate-300'}`} />
                  <input
                    type="text"
                    value={source}
                    onChange={(e) => {
                      setSource(e.target.value);
                      if (fieldErrors.source) setFieldErrors(prev => {
                        const next = { ...prev };
                        delete next.source;
                        return next;
                      });
                    }}
                    className={`h-20 w-full rounded-[2rem] border-none bg-slate-50 pl-20 pr-8 text-base font-bold shadow-inner focus:ring-8 transition-all ${fieldErrors.source ? 'ring-2 ring-rose-500 focus:ring-rose-100' : 'focus:ring-indigo-600/5'}`}
                    placeholder="Merchant or Org Name"
                  />
                </div>
                <AnimatePresence mode="wait">
                  {fieldErrors.source && (
                    <motion.p 
                      initial={{ opacity: 0, x: -10 }} 
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      className="text-[10px] font-black text-rose-500 uppercase tracking-widest ml-4"
                    >
                      {fieldErrors.source}
                    </motion.p>
                  )}
                </AnimatePresence>
                
                <AnimatePresence>
                  {auditWarning && (
                    <motion.div 
                      initial={{ opacity: 0, x: -10 }} 
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-start gap-3 p-4 rounded-2xl bg-amber-50 border border-amber-100 text-amber-700"
                    >
                       <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
                       <span className="text-[11px] font-black uppercase tracking-tight">{auditWarning}</span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <AnimatePresence>
              {paymentMode !== 'cash' && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-4 overflow-hidden"
                >
                  <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 ml-2">Network UTR / Reference ID</label>
                  <div className="relative">
                    <Hash className={`absolute left-8 top-1/2 h-6 w-6 -translate-y-1/2 transition-colors ${fieldErrors.referenceId ? 'text-rose-400' : 'text-slate-300'}`} />
                    <input
                      type="text"
                      value={referenceId}
                      onChange={(e) => {
                        setReferenceId(e.target.value.toUpperCase());
                        if (fieldErrors.referenceId) setFieldErrors(prev => {
                          const next = { ...prev };
                          delete next.referenceId;
                          return next;
                        });
                      }}
                      className={`h-20 w-full rounded-[2rem] border-none bg-slate-50 pl-20 pr-8 text-base font-mono font-bold shadow-inner focus:ring-8 transition-all ${fieldErrors.referenceId ? 'ring-2 ring-rose-500 focus:ring-rose-100' : 'focus:ring-indigo-600/5'}`}
                      placeholder="UTR-XXXX-XXXX"
                    />
                  </div>
                  <AnimatePresence mode="wait">
                    {fieldErrors.referenceId && (
                      <motion.p 
                        initial={{ opacity: 0, x: -10 }} 
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        className="text-[10px] font-black text-rose-500 uppercase tracking-widest ml-4"
                      >
                        {fieldErrors.referenceId}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}
              </AnimatePresence>
            </div>

            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              className="w-full rounded-[2.5rem] bg-slate-950 py-8 text-xs font-black uppercase tracking-[0.5em] text-white shadow-2xl transition-all hover:bg-black active:bg-indigo-900 flex items-center justify-center gap-4"
            >
              Authorize Signal Entry
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
          className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/80 p-6 backdrop-blur-xl"
        >
           <motion.div 
            initial={{ scale: 0.95, y: 30 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 30 }}
            className="w-full max-w-lg overflow-hidden rounded-[4rem] bg-white shadow-3xl"
           >
              <div className="p-16 text-center">
                 <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-[2.5rem] bg-indigo-50 text-indigo-600 shadow-inner relative">
                    <LockKeyhole className="h-12 w-12" />
                    <Sparkles className="absolute -top-2 -right-2 h-6 w-6 text-indigo-300 animate-pulse" />
                 </div>
                 <h3 className="mt-10 text-4xl font-black tracking-tighter text-slate-900 leading-none italic">Confirm Auth</h3>
                 <p className="mt-5 text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">Ledger Integrity Checklist</p>
                 
                 <div className="mt-12 space-y-6 rounded-[3rem] bg-slate-50 p-10 text-left ring-1 ring-slate-100">
                    <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Value</span>
                        <span className="font-mono text-3xl font-black text-indigo-600 italic tabular-nums">₹{parseFloat(amount.replace(/,/g, '')).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between items-center border-t border-slate-200 pt-6">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Source</span>
                        <span className="text-sm font-black text-slate-900 uppercase truncate max-w-[180px]">{source}</span>
                    </div>
                    <div className="flex justify-between items-center border-t border-slate-200 pt-6">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Security</span>
                        <span className="text-[8px] font-black text-emerald-600 flex items-center gap-1">
                           <ShieldCheck className="h-3 w-3" /> CSPRNG SEAL READY
                        </span>
                    </div>
                 </div>
              </div>
              <div className="flex border-t border-slate-100 bg-slate-50/50 p-8 gap-6">
                 <button 
                  onClick={() => setShowModal(false)} 
                  disabled={isSubmitting}
                  className="flex-1 rounded-[2rem] bg-white py-5 text-[10px] font-black uppercase tracking-widest text-slate-500 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50 disabled:opacity-50 transition-all"
                 >
                    Dismiss
                 </button>
                 <button 
                  onClick={confirmSubmit} 
                  disabled={isSubmitting} 
                  className="flex-1 rounded-[2rem] bg-indigo-600 py-5 text-[10px] font-black uppercase tracking-widest text-white shadow-2xl shadow-indigo-100 hover:bg-indigo-700 disabled:opacity-50 transition-all flex items-center justify-center gap-3"
                 >
                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldAlert className="h-4 w-4" />}
                    Authorize & Seal
                 </button>
              </div>
           </motion.div>
        </motion.div>
      )}
      </AnimatePresence>
    </motion.div>
  );
}
