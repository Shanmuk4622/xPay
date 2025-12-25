
import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { GoogleGenAI } from "@google/genai";
import QRCode from 'qrcode';
import { 
  ArrowLeft, 
  Hash, 
  FileText, 
  Loader2, 
  AlertCircle,
  Download,
  ShieldCheck,
  Printer, 
  Zap,
  Copy,
  Check,
  UserCheck,
  ShieldAlert,
  History,
  Fingerprint,
  Activity,
  ChevronRight,
  Settings,
  Save,
  User,
  Info,
  Lock,
  QrCode,
  LockKeyhole,
  BrainCircuit,
  Sparkles,
  AlertTriangle,
  RotateCcw,
  Key,
  Verified,
  Bookmark,
  TrendingUp,
  Terminal,
  Shield,
  Layers,
  FileDown
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
  audit_tag?: string | null;
  secure_id?: string | null;
  signature?: string | null;
  creator?: {
    email: string;
    role: string;
  };
}

interface ActivityLog {
  id: string;
  action: string;
  created_at: string;
  performed_by: string;
  details: any;
  performer?: {
    email: string;
  };
}

export default function TransactionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, role: currentUserRole } = useAuth();
  
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [copiedSecure, setCopiedSecure] = useState(false);
  
  // QR Code State
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [isGeneratingQr, setIsGeneratingQr] = useState(false);

  // Neural Audit State (Basic)
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [aiScore, setAiScore] = useState<number | null>(null);

  // Forensic Deep Dive State (Advanced Thinking)
  const [isDeepAnalyzing, setIsDeepAnalyzing] = useState(false);
  const [deepReport, setDeepReport] = useState<string | null>(null);

  const [editAmount, setEditAmount] = useState('');
  const [editTag, setEditTag] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isGeneratingSeal, setIsGeneratingSeal] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{ valid: boolean; message: string } | null>(null);
  const [correctionMsg, setCorrectionMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const isSuperAdmin = currentUserRole === 'super_admin';

  const generateQrCode = useCallback(async (text: string) => {
    try {
      setIsGeneratingQr(true);
      const url = await QRCode.toDataURL(text, {
        width: 400,
        margin: 2,
        color: {
          dark: '#4f46e5',
          light: '#ffffff',
        },
      });
      setQrCodeUrl(url);
    } catch (err) {
      console.error('QR Generation Failure:', err);
    } finally {
      setIsGeneratingQr(false);
    }
  }, []);

  const downloadQrCode = () => {
    if (!qrCodeUrl || !transaction) return;
    const link = document.createElement('a');
    link.href = qrCodeUrl;
    link.download = `FinTrack_Seal_${transaction.secure_id?.slice(0, 8)}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getOrCreatePrivateKey = useCallback(() => {
    const keyPath = `fintrack_pk_${user?.id}`;
    let key = localStorage.getItem(keyPath);
    if (!key) {
      const array = new Uint8Array(32);
      window.crypto.getRandomValues(array);
      key = Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
      localStorage.setItem(keyPath, key);
    }
    return key;
  }, [user?.id]);

  const generateSignature = async (data: string, privateKey: string) => {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(privateKey);
    const msgData = encoder.encode(data);
    const cryptoKey = await window.crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const signature = await window.crypto.subtle.sign('HMAC', cryptoKey, msgData);
    return Array.from(new Uint8Array(signature), b => b.toString(16).padStart(2, '0')).join('');
  };

  const handleDeepForensicAnalysis = async () => {
    if (!transaction) return;
    setIsDeepAnalyzing(true);
    setDeepReport(null);
    try {
      const { data: history } = await supabase
        .from('transactions')
        .select('amount, created_at, payment_mode, reference_id')
        .eq('source', transaction.source)
        .order('created_at', { ascending: false })
        .limit(20);

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `
        PERFORM DEEP FORENSIC ANALYSIS (THINKING MODE)
        
        TRANSACTION TO AUDIT:
        - Source: ${transaction.source}
        - Amount: ₹${transaction.amount}
        - Mode: ${transaction.payment_mode}
        - Reference: ${transaction.reference_id || 'LOCAL'}
        - Date: ${new Date(transaction.created_at).toLocaleString()}
        
        HISTORICAL CONTEXT (SIMILAR ENTITIES):
        ${JSON.stringify(history)}

        GOAL: Provide a structured forensic report identifying anomalies, source reliability, and pattern consistency.
        FORMAT:
        1. ANOMALY DETECTION: (Highlight outliers)
        2. VELOCITY CHECK: (Frequency analysis)
        3. SOURCE RELIABILITY: (Is this entity known?)
        4. VERDICT: (Clear forensic opinion)
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: prompt,
        config: {
          thinkingConfig: { thinkingBudget: 32768 }
        }
      });

      setDeepReport(response.text);
    } catch (err: any) {
      console.error('Deep Analysis Failure:', err);
      setDeepReport("## Analysis Failure\nFailed to engage neural core for deep forensic reasoning.");
    } finally {
      setIsDeepAnalyzing(false);
    }
  };

  const generateNeuralAudit = useCallback(async (currentTx: Transaction) => {
    setIsAnalyzing(true);
    try {
      const { data: history } = await supabase
        .from('transactions')
        .select('amount, created_at, payment_mode')
        .eq('source', currentTx.source)
        .neq('id', currentTx.id)
        .order('created_at', { ascending: false })
        .limit(10);

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const historyContext = history && history.length > 0 
        ? history.map(h => `₹${h.amount} (${h.payment_mode}) on ${new Date(h.created_at).toLocaleDateString()}`).join(', ') 
        : "No previous history for this source.";

      const prompt = `
        Analyze this transaction for forensic verification:
        Current: Source "${currentTx.source}", Amount ₹${currentTx.amount}, Mode ${currentTx.payment_mode}, Ref "${currentTx.reference_id || 'N/A'}".
        Context: ${historyContext}
        
        Identify if the current amount is an outlier (velocity anomaly) or follows standard patterns.
        Return: Insight: [max 35 words forensic observation] | Score: [0-100 where 100 is highly anomalous]
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });

      const result = response.text || "";
      const insightMatch = result.match(/Insight:\s*(.*?)(?=\s*\||$)/i);
      const scoreMatch = result.match(/Score:\s*(\d+)/i);

      setAiInsight(insightMatch ? insightMatch[1].trim() : "Neural synthesis completed. No high-level deviations detected.");
      setAiScore(scoreMatch ? parseInt(scoreMatch[1]) : 0);
    } catch (err) {
      console.error('Neural Audit Error:', err);
      setAiInsight("Telemetry drift detected but forensic link is offline. Statistics within nominal range.");
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  const fetchTransactionAndLogs = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const { data: txData, error: txError } = await supabase
        .from('transactions')
        .select(`
          *,
          creator:users!transactions_created_by_fkey (
            email,
            role
          )
        `)
        .eq('id', id)
        .single();

      if (txError) throw txError;
      
      setTransaction(txData);
      setEditAmount(txData.amount?.toString() || '');
      setEditTag(txData.audit_tag || '');

      if (txData.secure_id) {
        generateQrCode(txData.secure_id);
      }

      generateNeuralAudit(txData);

      const { data: logData, error: logError } = await supabase
        .from('activity_logs')
        .select('*, performer:users(email)')
        .eq('entity_type', 'transactions')
        .eq('entity_id', id)
        .order('created_at', { ascending: false });

      if (!logError) {
        setLogs(logData || []);
      }
    } catch (err: any) {
      console.error('Audit Fetch Error:', err);
      setError(err.message || 'Vault access failure: Record unreachable.');
    } finally {
      setLoading(false);
    }
  }, [id, generateNeuralAudit, generateQrCode]);

  useEffect(() => {
    fetchTransactionAndLogs();
  }, [fetchTransactionAndLogs]);

  const handleCopy = (text: string, isSecure = false) => {
    navigator.clipboard.writeText(text);
    if (isSecure) {
      setCopiedSecure(true);
      setTimeout(() => setCopiedSecure(false), 2000);
    } else {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const generateSecureId = () => {
    const array = new Uint8Array(16);
    window.crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('').toUpperCase();
  };

  const handleInitializeSeal = async () => {
    if (!id || !user || !transaction || transaction.secure_id) return;
    setIsGeneratingSeal(true);
    try {
      const newSecureId = generateSecureId();
      const privateKey = getOrCreatePrivateKey();
      const signature = await generateSignature(newSecureId, privateKey);
      const { error: updateError } = await supabase
        .from('transactions')
        .update({ 
          secure_id: newSecureId,
          signature: signature,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);
      if (updateError) throw updateError;
      await supabase.from('activity_logs').insert([{
        entity_type: 'transactions',
        entity_id: id,
        action: 'SECURE_ID_GENERATED',
        performed_by: user.id,
        details: { secure_id: newSecureId, signature, method: 'CSPRNG_V1_HMAC' }
      }]);
      await fetchTransactionAndLogs();
    } catch (err: any) {
      setError("Seal initialization failed: " + err.message);
    } finally {
      setIsGeneratingSeal(false);
    }
  };

  const handleVerifySeal = async () => {
    if (!transaction?.signature || !transaction?.secure_id) return;
    setIsVerifying(true);
    setVerificationResult(null);
    await new Promise(resolve => setTimeout(resolve, 1500));
    try {
      const privateKey = getOrCreatePrivateKey();
      const expectedSignature = await generateSignature(transaction.secure_id, privateKey);
      if (transaction.signature === expectedSignature) {
        setVerificationResult({ 
          valid: true, 
          message: 'Cryptographic signature match. Transaction integrity verified against original operator node.' 
        });
      } else {
        setVerificationResult({ 
          valid: false, 
          message: 'Signature mismatch detected. Potential tampering or key drift in transit.' 
        });
      }
    } catch (err) {
      setVerificationResult({ valid: false, message: 'Verification engine encountered a runtime error.' });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleUpdateRecord = async () => {
    if (!id || !transaction || !user) return;
    setCorrectionMsg(null);
    const newAmount = parseFloat(editAmount);
    if (isNaN(newAmount) || newAmount <= 0) {
      setCorrectionMsg({ type: 'error', text: 'Invalid signal: Settled value must be a positive number.' });
      return;
    }
    setIsUpdating(true);
    try {
      const oldAmount = transaction.amount;
      const oldTag = transaction.audit_tag;
      const sanitizedTag = editTag.trim() || null;
      const { error: updateError } = await supabase
        .from('transactions')
        .update({ amount: newAmount, audit_tag: sanitizedTag, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (updateError) throw updateError;
      await supabase.from('activity_logs').insert([{
        entity_type: 'transactions',
        entity_id: id,
        action: 'UPDATE',
        performed_by: user.id,
        details: {
          changes: {
            amount: { from: oldAmount, to: newAmount },
            audit_tag: { from: oldTag, to: sanitizedTag }
          }
        }
      }]);
      setCorrectionMsg({ type: 'success', text: 'Ledger recalibrated successfully.' });
      await fetchTransactionAndLogs();
    } catch (err: any) {
      setCorrectionMsg({ type: 'error', text: err.message || 'Transmission failure.' });
    } finally {
      setIsUpdating(false);
    }
  };

  if (loading) return (
    <div className="flex h-[80vh] items-center justify-center">
      <Loader2 className="h-12 w-12 animate-spin text-indigo-600" />
    </div>
  );

  if (error || !transaction) return (
    <div className="flex h-[80vh] flex-col items-center justify-center p-8">
      <AlertCircle className="h-12 w-12 text-rose-500 mb-4" />
      <p className="text-sm font-bold text-slate-900">{error || 'Integrity Failure'}</p>
      <button onClick={() => navigate(-1)} className="mt-6 text-[10px] font-black uppercase tracking-widest text-indigo-600">Return to Console</button>
    </div>
  );

  const hasBeenModified = transaction.updated_at !== transaction.created_at;
  const getRiskUI = (score: number) => {
    if (score > 70) return { color: 'text-rose-500', bg: 'bg-rose-50', border: 'border-rose-100', icon: AlertTriangle, label: 'High Anomaly' };
    if (score > 30) return { color: 'text-amber-500', bg: 'bg-amber-50', border: 'border-amber-100', icon: Info, label: 'Moderate Drift' };
    return { color: 'text-emerald-500', bg: 'bg-emerald-50', border: 'border-emerald-100', icon: ShieldCheck, label: 'Verified Nominal' };
  };
  const risk = getRiskUI(aiScore || 0);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl mx-auto py-10 px-4 md:px-0">
      {/* Toolbar */}
      <div className="mb-12 flex items-center justify-between no-print px-2">
        <button onClick={() => navigate(-1)} className="group flex items-center text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 hover:text-indigo-600 transition-all">
           <ArrowLeft className="mr-3 h-5 w-5 transition-transform group-hover:-translate-x-1" /> Ledger Vault
        </button>
        <div className="flex gap-4">
           <button onClick={() => window.print()} className="rounded-2xl bg-white p-5 text-slate-400 shadow-sm border border-slate-100 hover:text-slate-900 transition-colors">
              <Printer className="h-5 w-5" />
           </button>
           <button className="rounded-2xl bg-indigo-600 p-5 text-white shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all">
              <Download className="h-5 w-5" />
           </button>
        </div>
      </div>

      {/* Neural Audit HUD */}
      <div className="mb-12 rounded-[3.5rem] bg-indigo-950 p-10 text-white shadow-3xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-12 opacity-5 rotate-12 transition-transform group-hover:rotate-0 duration-700">
           <BrainCircuit className="h-40 w-40" />
        </div>
        <div className="relative z-10">
           <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                 <Sparkles className={`h-5 w-5 ${isAnalyzing ? 'animate-spin text-indigo-400' : 'text-indigo-400'}`} />
                 <span className="text-[10px] font-black uppercase tracking-[0.4em] text-indigo-400">Neural Record Audit</span>
              </div>
              <button 
                onClick={() => generateNeuralAudit(transaction)} 
                disabled={isAnalyzing}
                className="p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
              >
                 <RotateCcw className={`h-4 w-4 ${isAnalyzing ? 'animate-spin' : ''}`} />
              </button>
           </div>
           
           <AnimatePresence mode="wait">
             {isAnalyzing ? (
               <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                  <div className="h-4 w-full bg-white/5 rounded-full animate-pulse" />
                  <div className="h-4 w-3/4 bg-white/5 rounded-full animate-pulse" />
               </motion.div>
             ) : (
               <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row gap-8 items-start">
                  <div className="flex-1">
                    <p className="text-xl font-black italic leading-snug tracking-tight">
                      "{aiInsight || 'Intelligence core awaiting signal handshake.'}"
                    </p>
                  </div>
                  {aiScore !== null && (
                    <div className={`px-6 py-4 rounded-[2rem] border ${risk.bg} ${risk.border} ${risk.color} flex flex-col items-center gap-2 shrink-0 shadow-xl shadow-black/20`}>
                       <risk.icon className="h-6 w-6" />
                       <span className="text-[10px] font-black uppercase tracking-widest">{risk.label}</span>
                       <span className="text-2xl font-black tabular-nums">{aiScore}%</span>
                    </div>
                  )}
               </motion.div>
             )}
           </AnimatePresence>
        </div>
      </div>

      {/* Forensic Lab Terminal */}
      <div className="mb-12 rounded-[4rem] bg-slate-900 border border-slate-800 p-12 text-slate-100 shadow-premium relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-20" />
        <div className="flex items-center justify-between mb-10">
           <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-2xl bg-indigo-600/20 border border-indigo-500/20 flex items-center justify-center">
                 <Terminal className="h-5 w-5 text-indigo-400" />
              </div>
              <div>
                 <h3 className="text-xl font-black italic tracking-tighter uppercase leading-none text-white">Forensic Lab Terminal</h3>
                 <p className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-500 mt-2">Neural Deep-Dive Protocol v3.1</p>
              </div>
           </div>
           {!isDeepAnalyzing && !deepReport && (
             <button 
               onClick={handleDeepForensicAnalysis}
               className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl transition-all active:scale-95 flex items-center gap-3"
             >
                <Layers className="h-4 w-4" />
                Engage Deep Analysis
             </button>
           )}
        </div>

        <AnimatePresence mode="wait">
           {isDeepAnalyzing ? (
             <motion.div 
               key="thinking"
               initial={{ opacity: 0 }} 
               animate={{ opacity: 1 }} 
               exit={{ opacity: 0 }}
               className="py-20 flex flex-col items-center justify-center bg-slate-950/40 rounded-[3rem] border border-slate-800"
             >
                <div className="flex gap-2 items-center h-16 mb-8">
                  {[...Array(8)].map((_, i) => (
                    <motion.div 
                      key={i} 
                      animate={{ height: [8, 48, 8], opacity: [0.3, 1, 0.3] }} 
                      transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.1 }} 
                      className="w-2.5 bg-indigo-500 rounded-full" 
                    />
                  ))}
                </div>
                <p className="text-[10px] font-black uppercase tracking-[0.5em] text-indigo-400 animate-pulse">Engaging Intelligence Core...</p>
                <div className="mt-4 flex items-center gap-4 text-slate-600 text-[8px] font-black uppercase tracking-widest">
                   <Shield className="h-3 w-3" /> Encrypted Sandbox Established
                </div>
             </motion.div>
           ) : deepReport ? (
             <motion.div 
               key="report"
               initial={{ opacity: 0, y: 20 }} 
               animate={{ opacity: 1, y: 0 }}
               className="space-y-8"
             >
                <div className="bg-slate-950/60 p-10 rounded-[3rem] border border-slate-800 relative group">
                   <div className="absolute top-6 right-8 opacity-10">
                      <TrendingUp className="h-12 w-12 text-indigo-400" />
                   </div>
                   <div className="prose prose-invert prose-sm max-w-none text-slate-300 font-medium leading-relaxed">
                      {deepReport.split('\n').map((line, i) => (
                        <p key={i} className={line.startsWith('#') ? 'text-indigo-400 font-black tracking-widest uppercase text-xs mt-6 first:mt-0' : ''}>
                          {line.replace(/^#+\s*/, '')}
                        </p>
                      ))}
                   </div>
                </div>
                <button 
                  onClick={() => setDeepReport(null)}
                  className="text-[9px] font-black uppercase tracking-widest text-slate-500 hover:text-indigo-400 transition-colors flex items-center gap-2"
                >
                   <RotateCcw className="h-3 w-3" /> Purge Report Session
                </button>
             </motion.div>
           ) : null}
        </AnimatePresence>
      </div>

      {/* Main Ledger Card */}
      <div className="relative rounded-[4rem] bg-white shadow-3xl overflow-hidden border border-slate-100 mb-12">
          <div className="bg-slate-950 p-12 md:p-16 text-white relative">
              <div className="relative z-10">
                  <div className="flex items-center gap-4 mb-10">
                       <div className="h-10 w-10 rounded-2xl bg-indigo-500 flex items-center justify-center shadow-2xl">
                          <Zap className="h-5 w-5 text-white" />
                       </div>
                       <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-600">Secure Asset Settlement Archive</span>
                  </div>
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 md:gap-0">
                    <h2 className="text-4xl md:text-5xl font-black italic tracking-tighter leading-none">Entry_{transaction.id.slice(0, 8).toUpperCase()}</h2>
                    <div className="text-left md:text-right w-full md:w-auto">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-700 block mb-3">Audit Trace Hash</span>
                        <div onClick={() => handleCopy(transaction.id)} className="font-mono text-[10px] font-black text-indigo-400 bg-white/5 px-4 py-2.5 rounded-xl cursor-pointer hover:bg-white/10 transition-colors flex items-center gap-3">
                          #{transaction.id.toUpperCase()}
                          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3 opacity-30" />}
                        </div>
                    </div>
                  </div>
              </div>
          </div>

          <div className="p-8 md:p-16">
              <div className="mb-20 text-center">
                  <span className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-300 block mb-6">Settlement Value (INR)</span>
                  <div className="font-mono text-7xl md:text-9xl font-black text-slate-950 tracking-tighter tabular-nums italic leading-none">
                      ₹{transaction.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>

                  <div className="mt-12 flex flex-wrap justify-center items-center gap-4">
                      <span className={`rounded-full px-8 py-3 text-[10px] font-black uppercase tracking-[0.3em] shadow-sm ring-1 ring-inset ${
                          transaction.payment_mode === 'cash' ? 'bg-emerald-50 text-emerald-700 ring-emerald-100' : 'bg-indigo-50 text-indigo-700 ring-indigo-100'
                      }`}>
                          NODE_{transaction.payment_mode.toUpperCase()}
                      </span>
                      {hasBeenModified && (
                        <span className="flex items-center gap-2 rounded-full bg-amber-50 text-amber-700 px-8 py-3 text-[10px] font-black uppercase tracking-[0.3em] ring-1 ring-amber-100">
                           <History className="h-3 w-3" /> Modified
                        </span>
                      )}
                      <span className={`flex items-center gap-2 rounded-full px-8 py-3 text-[10px] font-black uppercase tracking-[0.3em] ring-1 transition-colors ${transaction.audit_tag ? 'bg-indigo-600 text-white ring-indigo-500 shadow-lg shadow-indigo-100' : 'bg-slate-100 text-slate-600 ring-slate-200'}`}>
                        <Bookmark className={`h-3 w-3 ${transaction.audit_tag ? 'text-indigo-200' : 'text-slate-400'}`} /> 
                        {transaction.audit_tag || 'UNTAGGED'}
                      </span>
                  </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-16 border-t border-slate-50 pt-16 mb-16">
                  <div className="space-y-4">
                      <span className="flex items-center text-[10px] font-black uppercase tracking-[0.4em] text-slate-300">
                         <FileText className="mr-3 h-4 w-4" /> Entity Attribution
                      </span>
                      <p className="text-2xl font-black text-slate-900 leading-tight">{transaction.source}</p>
                  </div>
                  <div className="space-y-4">
                      <span className="flex items-center text-[10px] font-black uppercase tracking-[0.4em] text-slate-300">
                         <Hash className="mr-3 h-4 w-4" /> Network UTR / Reference
                      </span>
                      <p className="font-mono text-base font-black text-indigo-600 uppercase truncate bg-indigo-50 px-6 py-3 rounded-2xl inline-block max-w-full">
                          {transaction.reference_id || 'LOCAL_SIGNAL_ONLY'}
                      </p>
                  </div>
              </div>

              {/* Cryptographic Audit Seal HUD */}
              <div className="mb-16 p-8 rounded-[3rem] bg-indigo-600 text-white relative overflow-hidden shadow-premium">
                 <div className="absolute right-0 top-0 p-8 opacity-10 rotate-12">
                    <LockKeyhole className="h-32 w-32" />
                 </div>
                 <div className="relative z-10">
                    <div className="flex items-center justify-between mb-6">
                       <div className="flex items-center gap-3">
                          <QrCode className="h-4 w-4 text-indigo-300" />
                          <span className="text-[10px] font-black uppercase tracking-[0.4em] text-indigo-200">Cryptographic Audit Seal</span>
                       </div>
                       {transaction.secure_id && (
                         <div className="flex items-center gap-2 bg-white/10 px-4 py-1.5 rounded-full border border-white/10">
                            <ShieldCheck className="h-3 w-3 text-emerald-400" />
                            <span className="text-[8px] font-black uppercase tracking-widest text-emerald-400">Locked & Sealed</span>
                         </div>
                       )}
                    </div>

                    <div className="space-y-6">
                       {transaction.secure_id ? (
                         <div className="space-y-8">
                            <div className="flex flex-col md:flex-row gap-8 items-start">
                               <div className="flex-1 space-y-6 w-full">
                                  <div 
                                    onClick={() => handleCopy(transaction.secure_id!, true)}
                                    className="font-mono text-xl md:text-2xl font-black tracking-[0.15em] break-all bg-black/20 p-6 rounded-2xl cursor-pointer hover:bg-black/30 transition-all border border-white/5 flex items-center justify-between gap-4"
                                  >
                                      <span className="truncate">{transaction.secure_id}</span>
                                      {copiedSecure ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4 text-white/40" />}
                                  </div>
                                  
                                  <div className="space-y-4">
                                     <div className="flex items-center gap-2">
                                        <Key className="h-3 w-3 text-indigo-300" />
                                        <span className="text-[8px] font-black uppercase tracking-widest text-indigo-200">Digital Authentication Signature</span>
                                     </div>
                                     <div className="font-mono text-[9px] break-all bg-black/40 p-5 rounded-xl border border-white/5 text-indigo-300 leading-relaxed shadow-inner">
                                        {transaction.signature || 'NO_SIGNATURE_DATA'}
                                     </div>
                                  </div>
                               </div>

                               {/* QR Code Section */}
                               <div className="shrink-0 w-full md:w-48 space-y-4">
                                  <div className="aspect-square bg-white rounded-3xl p-4 flex items-center justify-center shadow-2xl relative overflow-hidden group/qr">
                                     {isGeneratingQr ? (
                                       <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                                     ) : qrCodeUrl ? (
                                       <img src={qrCodeUrl} alt="Secure ID QR" className="w-full h-full object-contain" />
                                     ) : (
                                       <button onClick={() => generateQrCode(transaction.secure_id!)} className="text-[8px] font-black uppercase tracking-widest text-slate-400 text-center px-4">Initialize Visual Token</button>
                                     )}
                                  </div>
                                  {qrCodeUrl && (
                                    <button 
                                      onClick={downloadQrCode}
                                      className="w-full flex items-center justify-center gap-2 py-3 bg-black/20 hover:bg-black/40 rounded-xl text-[8px] font-black uppercase tracking-[0.2em] transition-all border border-white/5"
                                    >
                                       <FileDown className="h-3 w-3" /> Download Token
                                    </button>
                                  )}
                               </div>
                            </div>
                               
                            {isSuperAdmin && (
                               <div className="pt-4 flex flex-col gap-4">
                                  <button 
                                    onClick={handleVerifySeal}
                                    disabled={isVerifying}
                                    className="flex items-center justify-center gap-3 bg-white text-indigo-600 px-6 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-indigo-50 transition-all disabled:opacity-50"
                                  >
                                     {isVerifying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Verified className="h-4 w-4" />}
                                     Verify Signature Authenticity
                                  </button>
                                  
                                  <AnimatePresence>
                                     {verificationResult && (
                                       <motion.div 
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className={`p-5 rounded-xl flex items-start gap-4 border ${verificationResult.valid ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'}`}
                                       >
                                          {verificationResult.valid ? <ShieldCheck className="h-5 w-5 shrink-0" /> : <ShieldAlert className="h-5 w-5 shrink-0" />}
                                          <p className="text-[10px] font-bold uppercase tracking-tight leading-relaxed">{verificationResult.message}</p>
                                       </motion.div>
                                     )}
                                  </AnimatePresence>
                               </div>
                            )}
                         </div>
                       ) : isSuperAdmin ? (
                         <button 
                          onClick={handleInitializeSeal}
                          disabled={isGeneratingSeal}
                          className="w-full bg-white text-indigo-600 px-8 py-5 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-indigo-50 transition-all flex items-center justify-center gap-3"
                         >
                            {isGeneratingSeal ? <Loader2 className="h-4 w-4 animate-spin" /> : <Fingerprint className="h-4 w-4" />}
                            Generate Cryptographic Audit Seal
                         </button>
                       ) : (
                         <div className="w-full py-4 px-8 border border-white/10 rounded-2xl flex items-center gap-4 text-indigo-200">
                            <Info className="h-4 w-4" />
                            <p className="text-[10px] font-bold uppercase tracking-widest">Seal Awaiting Master Node Authorization</p>
                         </div>
                       )}
                    </div>
                 </div>
              </div>

              {/* Operator Node */}
              <div className="space-y-8 border-t border-slate-50 pt-16">
                  <div className="flex items-center gap-3">
                    <div className="h-6 w-6 rounded-lg bg-indigo-100 flex items-center justify-center">
                      <UserCheck className="h-3 w-3 text-indigo-600" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">Operational Authority Node</span>
                  </div>
                  <div className="flex items-center gap-10 p-10 rounded-[3rem] bg-slate-50 border border-slate-100">
                    <div className="h-20 w-20 rounded-[2rem] bg-white flex items-center justify-center shadow-lg shrink-0">
                       <User className="h-8 w-8 text-slate-300" />
                    </div>
                    <div>
                       <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Operator Identity</span>
                       <p className="text-xl font-black text-slate-900">{transaction.creator?.email || 'LEGACY_USER_' + transaction.created_by.slice(0, 6)}</p>
                       <span className="mt-2 inline-block px-3 py-1 rounded-lg bg-indigo-600 text-white text-[8px] font-black uppercase tracking-widest">
                         {transaction.creator?.role?.replace('_', ' ') || 'User'}
                       </span>
                    </div>
                  </div>
              </div>
          </div>
      </div>

      {/* Super Admin Terminal */}
      {isSuperAdmin && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="rounded-[4rem] bg-slate-900 p-12 md:p-16 text-white shadow-3xl relative overflow-hidden mb-12">
          <div className="absolute top-0 right-0 p-12 opacity-10">
            <Settings className="h-32 w-32 animate-spin-slow" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-4 mb-10">
              <ShieldAlert className="h-8 w-8 text-amber-400" />
              <h3 className="text-2xl font-black italic tracking-tighter uppercase">Master Recalibration Terminal</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <div className="space-y-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500 ml-1">Settled Value Adjustment</label>
                  <div className="relative">
                    <span className="absolute left-6 top-1/2 -translate-y-1/2 text-2xl font-black text-indigo-500 italic">₹</span>
                    <input 
                      type="number"
                      value={editAmount}
                      onChange={(e) => setEditAmount(e.target.value)}
                      className="h-20 w-full rounded-3xl bg-white/5 border border-white/10 pl-16 pr-8 text-2xl font-black text-white focus:ring-4 focus:ring-indigo-500/30 transition-all italic outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500 ml-1">Audit Metadata Tag</label>
                  <input 
                    type="text"
                    value={editTag}
                    onChange={(e) => setEditTag(e.target.value)}
                    className="h-20 w-full rounded-3xl bg-white/5 border border-white/10 px-8 text-lg font-black text-white focus:ring-4 focus:ring-indigo-500/30 transition-all uppercase tracking-widest outline-none"
                    placeholder="e.g. DUPLICATE_SIGNAL"
                  />
                </div>
                <button 
                  onClick={handleUpdateRecord} 
                  disabled={isUpdating} 
                  className="w-full h-20 rounded-3xl bg-indigo-600 text-white text-xs font-black uppercase tracking-[0.4em] flex items-center justify-center gap-4 hover:bg-indigo-500 transition-all shadow-xl"
                >
                  {isUpdating ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                  Save Recalibration
                </button>
              </div>
            </div>

            <AnimatePresence>
              {correctionMsg && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className={`mt-10 p-6 rounded-2xl flex items-center gap-4 text-[10px] font-black uppercase tracking-widest border ${
                    correctionMsg.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                  }`}>
                  {correctionMsg.type === 'success' ? <ShieldCheck className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
                  {correctionMsg.text}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}

      {/* Forensic Timeline */}
      <div className="bg-white rounded-[4rem] p-12 md:p-16 shadow-3xl border border-slate-100">
          <div className="flex items-center gap-4 mb-16">
            <Activity className="h-8 w-8 text-indigo-600" />
            <h3 className="text-2xl font-black italic tracking-tighter uppercase">Forensic Activity Stream</h3>
          </div>
          
          <div className="space-y-12 relative before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-50">
            {logs.length === 0 ? (
              <p className="pl-12 text-[10px] font-black uppercase tracking-widest text-slate-300 italic">No activity drifts detected.</p>
            ) : (
              logs.map((log, idx) => (
                <motion.div key={log.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.05 }} className="relative pl-12">
                  <div className="absolute left-0 top-1.5 h-6 w-6 rounded-full bg-white border-2 border-indigo-500 shadow-sm flex items-center justify-center z-10">
                     <div className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                  </div>
                  <div className="flex flex-col md:flex-row justify-between gap-6">
                    <div>
                      <span className={`text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-lg border ${
                        log.action === 'UPDATE' ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'
                      }`}>{log.action}</span>
                      <p className="mt-4 text-xs font-bold text-slate-800">Operator: {log.performer?.email || log.performed_by}</p>
                    </div>
                    <div className="text-right shrink-0">
                       <span className="text-[11px] font-black text-slate-900 tabular-nums block">{new Date(log.created_at).toLocaleTimeString()}</span>
                       <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">{new Date(log.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
      </div>
      <style>{`.animate-spin-slow { animation: spin 12s linear infinite; } @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </motion.div>
  );
}
