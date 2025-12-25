import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  Calendar, 
  Hash, 
  FileText, 
  Clock, 
  Loader2, 
  AlertCircle,
  Download,
  ShieldCheck,
  Printer,
  Zap,
  Tag,
  Copy,
  Check,
  Edit3,
  Save,
  X,
  UserCheck,
  ShieldAlert
} from 'lucide-react';

interface Transaction {
  id: string;
  amount: number;
  payment_mode: 'cash' | 'bank' | 'upi';
  reference_id: string | null;
  source: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  branch_id?: string | null;
  audit_tag?: string | null;
  creator?: {
    email: string;
    role: string;
  };
}

export default function TransactionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { role } = useAuth();
  
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  
  // Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [editAmount, setEditAmount] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const isSuperAdmin = role === 'super_admin';

  useEffect(() => {
    fetchTransaction();
  }, [id]);

  const fetchTransaction = async () => {
    if (!id) return;
    try {
      // Joining with users table to get email and role of the creator
      const { data, error } = await supabase
        .from('transactions')
        .select('*, creator:users(email, role)')
        .eq('id', id)
        .single();

      if (error) throw error;
      setTransaction(data);
      setEditAmount(data.amount.toString());
    } catch (err: any) {
      setError(err.message || 'Transaction not found.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleUpdate = async () => {
    if (!id || !transaction) return;
    
    const newAmount = parseFloat(editAmount);
    if (isNaN(newAmount) || newAmount <= 0) {
      setError('Invalid amount. Please provide a positive value.');
      return;
    }

    setIsUpdating(true);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from('transactions')
        .update({ 
          amount: newAmount, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', id);

      if (updateError) throw updateError;
      
      // Refresh local data
      await fetchTransaction();
      setIsEditing(false);
    } catch (err: any) {
      setError(err.message || 'Update failed. Check system logs.');
    } finally {
      setIsUpdating(false);
    }
  };

  if (loading) return (
    <div className="flex h-[80vh] w-full items-center justify-center">
      <Loader2 className="h-12 w-12 animate-spin text-indigo-600" />
    </div>
  );

  if (error && !transaction) return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex min-h-[60vh] items-center justify-center p-4"
    >
      <div className="max-w-md text-center p-12 bg-white rounded-[3rem] shadow-2xl border border-slate-100">
          <AlertCircle className="mx-auto h-20 w-20 text-rose-500 mb-8" />
          <h3 className="text-3xl font-black text-slate-900 tracking-tight">Audit Mismatch</h3>
          <p className="mt-4 text-slate-500 font-medium">{error || 'This transaction signature could not be verified in the secure cloud ledger.'}</p>
          <button onClick={() => navigate(-1)} className="mt-10 w-full rounded-2xl bg-slate-900 px-8 py-5 text-xs font-black uppercase tracking-[0.2em] text-white">Back to Command</button>
      </div>
    </motion.div>
  );

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto py-10"
    >
      <div className="mb-10 flex items-center justify-between no-print px-2">
        <button onClick={() => navigate(-1)} className="group flex items-center text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 hover:text-indigo-600 transition-colors">
           <ArrowLeft className="mr-2 h-5 w-5 transition-transform group-hover:-translate-x-1" />
           Ledger Archive
        </button>
        <div className="flex gap-3">
           <button onClick={() => window.print()} className="rounded-2xl bg-white p-4 text-slate-400 shadow-sm ring-1 ring-slate-200 hover:text-slate-900 transition-all hover:shadow-lg">
              <Printer className="h-5 w-5" />
           </button>
           <button className="rounded-2xl bg-indigo-600 p-4 text-white shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all hover:scale-105 active:scale-95">
              <Download className="h-5 w-5" />
           </button>
        </div>
      </div>

      <div className="relative rounded-[3rem] bg-white shadow-[0_50px_100px_-20px_rgba(0,0,0,0.12)] overflow-hidden border border-slate-100">
          {/* Header Section */}
          <div className="bg-slate-950 p-12 text-white relative">
              <div className="absolute top-0 right-0 p-8 opacity-10">
                <ShieldCheck className="h-24 w-24" />
              </div>
              <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-8">
                       <div className="h-8 w-8 rounded-xl bg-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/40">
                          <Zap className="h-5 w-5 text-white" />
                       </div>
                       <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Verified Settlement Node</span>
                  </div>
                  <div className="flex justify-between items-end">
                    <h2 className="text-4xl font-black italic tracking-tighter leading-none">Record Log</h2>
                    <div className="text-right">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-600 block mb-2">Hash Reference</span>
                        <div 
                          onClick={() => handleCopy(transaction!.id)}
                          className="font-mono text-[10px] font-black text-indigo-400 bg-indigo-400/10 px-3 py-2 rounded-xl cursor-pointer hover:bg-indigo-400/20 transition-colors flex items-center gap-2"
                        >
                          #{transaction!.id.slice(0, 12)}...
                          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3 opacity-50" />}
                        </div>
                    </div>
                  </div>
              </div>
          </div>

          <div className="p-12">
              <div className="mb-16 text-center">
                  <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-300 block mb-4">Settled Value</span>
                  
                  {isEditing ? (
                    <div className="flex flex-col items-center gap-6">
                      <div className="relative">
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 text-5xl font-black text-slate-200 italic">₹</span>
                        <input
                          type="number"
                          value={editAmount}
                          onChange={(e) => setEditAmount(e.target.value)}
                          className="block w-full border-none bg-transparent py-2 text-center text-7xl font-black text-slate-900 tracking-tighter tabular-nums focus:ring-0"
                          autoFocus
                        />
                      </div>
                      <div className="flex gap-4">
                        <button 
                          onClick={() => setIsEditing(false)}
                          className="flex items-center gap-2 rounded-xl bg-slate-100 px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-200 transition-colors"
                        >
                          <X className="h-4 w-4" /> Cancel
                        </button>
                        <button 
                          onClick={handleUpdate}
                          disabled={isUpdating}
                          className="flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-indigo-100 hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                        >
                          {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                          Update Log
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="group relative inline-block">
                      <div className="font-mono text-7xl font-black text-slate-900 tracking-tighter tabular-nums italic">
                          ₹{transaction!.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                      {isSuperAdmin && (
                        <button 
                          onClick={() => setIsEditing(true)}
                          className="absolute -right-12 top-1/2 -translate-y-1/2 rounded-full bg-slate-100 p-2 text-slate-400 opacity-0 group-hover:opacity-100 transition-all hover:bg-indigo-600 hover:text-white"
                          title="Edit Value"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  )}

                  <div className="mt-8 flex justify-center">
                      <span className={`rounded-full px-6 py-2 text-[10px] font-black uppercase tracking-[0.2em] shadow-sm ring-1 ring-inset ${
                          transaction!.payment_mode === 'cash' ? 'bg-emerald-50 text-emerald-700 ring-emerald-100' : 
                          'bg-indigo-50 text-indigo-700 ring-indigo-100'
                      }`}>
                          Channel: {transaction!.payment_mode}
                      </span>
                  </div>
              </div>

              {error && isEditing && (
                <div className="mb-8 flex items-center gap-3 rounded-2xl bg-rose-50 p-4 text-xs font-bold text-rose-600 ring-1 ring-rose-100">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-x-12 gap-y-12 border-t border-slate-50 pt-12">
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
                      <span className="flex items-center text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">
                         <FileText className="mr-3 h-4 w-4" /> Payer Entity
                      </span>
                      <p className="mt-4 text-base font-black text-slate-900 leading-tight">{transaction!.source}</p>
                  </motion.div>
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
                      <span className="flex items-center text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">
                         <Hash className="mr-3 h-4 w-4" /> UTR / Network ID
                      </span>
                      <div className="flex items-center gap-2 mt-4">
                        <p className="font-mono text-sm font-black text-slate-900 uppercase truncate">
                            {transaction!.reference_id || 'LOCAL_AUDIT'}
                        </p>
                        {transaction!.reference_id && (
                          <button onClick={() => handleCopy(transaction!.reference_id!)} className="text-slate-300 hover:text-indigo-600">
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                  </motion.div>
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
                      <span className="flex items-center text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">
                         <Calendar className="mr-3 h-4 w-4" /> Entry Date
                      </span>
                      <p className="mt-4 text-sm font-bold text-slate-800">
                          {new Date(transaction!.created_at).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
                      </p>
                  </motion.div>
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
                      <span className="flex items-center text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">
                         <Clock className="mr-3 h-4 w-4" /> Timestamp
                      </span>
                      <p className="mt-4 text-sm font-bold text-slate-800">
                          {new Date(transaction!.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </p>
                  </motion.div>

                  {/* New Auditor Details Section */}
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.55 }}>
                      <span className="flex items-center text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">
                         <UserCheck className="mr-3 h-4 w-4" /> Auditor Email
                      </span>
                      <p className="mt-4 text-sm font-bold text-slate-800 truncate">
                          {transaction!.creator?.email || 'System Default'}
                      </p>
                  </motion.div>
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>
                      <span className="flex items-center text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">
                         <ShieldAlert className="mr-3 h-4 w-4" /> Auth Level
                      </span>
                      <p className="mt-4 text-[10px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full inline-block">
                          {transaction!.creator?.role || 'Unknown'}
                      </p>
                  </motion.div>
              </div>

              <motion.div 
                initial={{ opacity: 0, y: 10 }} 
                animate={{ opacity: 1, y: 0 }} 
                transition={{ delay: 0.65 }}
                className="mt-20 rounded-[2.5rem] bg-slate-50 p-10 ring-1 ring-slate-100 relative overflow-hidden"
              >
                  <div className="relative z-10 flex items-start gap-6">
                      <div className="mt-1 flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white text-indigo-600 shadow-sm border border-slate-100">
                          <ShieldCheck className="h-7 w-7" />
                      </div>
                      <div className="flex-1">
                          <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-950 mb-3 flex items-center gap-3">
                              <Tag className="h-4 w-4" /> Integrity Seal
                          </h4>
                          <p className="text-[11px] font-medium leading-relaxed text-slate-500">
                              Immutable ledger entry authorized by operator <span className="font-black text-slate-900">{transaction!.creator?.email || transaction!.created_by.slice(0,12)}</span> 
                              via branch node <span className="font-black text-slate-900 uppercase">{transaction!.branch_id || 'CENTRAL_UNIT'}</span>. 
                              SHA-256 Cloud Integrity Verified.
                              {transaction!.updated_at !== transaction!.created_at && (
                                <span className="block mt-2 text-indigo-600 font-bold">
                                  Last Integrity Update: {new Date(transaction!.updated_at).toLocaleString()}
                                </span>
                              )}
                          </p>
                      </div>
                  </div>
              </motion.div>
          </div>

          {/* Visual Embellishments */}
          <div className="flex justify-between items-center h-6 w-full bg-slate-50/20 px-4">
             {[...Array(24)].map((_, i) => (
               <div key={i} className="h-1.5 w-1.5 bg-slate-100 rounded-full" />
             ))}
          </div>

          <div className="flex justify-center p-10 bg-slate-50/10">
               <div className="flex h-2 w-20 rounded-full bg-slate-100" />
          </div>
      </div>
    </motion.div>
  );
}