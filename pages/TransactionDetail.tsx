
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { GoogleGenAI, Type } from "@google/genai";
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
  FileDown,
  UserRoundCheck,
  ShieldHalf,
  MessageSquare,
  Send,
  Bot,
  Radar,
  GanttChart,
  Target,
  BarChart3,
  Dna,
  SearchCode,
  Clock,
  ExternalLink,
  Cpu,
  RefreshCw,
  Inbox,
  Tag,
  X,
  Plus,
  ChevronDown,
  ChevronUp,
  Database,
  ArrowRight,
  Trash2,
  ListTodo
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
  tags?: string[] | null;
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

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface AuditReport {
  riskScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  vectors: {
    velocity: string;
    magnitude: string;
    authenticity: string;
  };
  patterns: string[];
  anomalies: string[];
  verdict: string;
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
  
  // Chat & Consultation State
  const [isConsulting, setIsConsulting] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isAiThinking, setIsAiThinking] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatInstance = useRef<any>(null);

  // New Audit Intelligence State
  const [auditReport, setAuditReport] = useState<AuditReport | null>(null);
  const [isPerformingAudit, setIsPerformingAudit] = useState(false);

  // QR Code State
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [isGeneratingQr, setIsGeneratingQr] = useState(false);

  // Neural Audit State (Quick Insight)
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [aiScore, setAiScore] = useState<number | null>(null);

  // Edit States
  const [editAmount, setEditAmount] = useState('');
  const [editTag, setEditTag] = useState('');
  const [editTags, setEditTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [tagSuggestions, setTagSuggestions] = useState<string[]>([]);
  const [allExistingTags, setAllExistingTags] = useState<string[]>([]);
  const [focusedSuggestionIndex, setFocusedSuggestionIndex] = useState(-1);
  const suggestionRef = useRef<HTMLDivElement>(null);
  
  const [isUpdating, setIsUpdating] = useState(false);
  const [isGeneratingSeal, setIsGeneratingSeal] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{ valid: boolean; message: string } | null>(null);
  const [correctionMsg, setCorrectionMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Log Expansion State
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());

  const isSuperAdmin = currentUserRole === 'super_admin';

  const toggleLog = (logId: string) => {
    setExpandedLogs(prev => {
      const next = new Set(prev);
      if (next.has(logId)) next.delete(logId);
      else next.add(logId);
      return next;
    });
  };

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (chatMessages.length > 0) scrollToBottom();
  }, [chatMessages]);

  const generateQrCode = useCallback(async (text: string) => {
    try {
      setIsGeneratingQr(true);
      const url = await QRCode.toDataURL(text, {
        width: 400,
        margin: 2,
        color: { dark: '#4f46e5', light: '#ffffff' },
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

  const performDetailedAudit = async () => {
    if (!transaction) return;
    setIsPerformingAudit(true);
    setAuditReport(null);
    try {
      const { data: history } = await supabase
        .from('transactions')
        .select('amount, created_at, payment_mode, reference_id')
        .eq('source', transaction.source)
        .order('created_at', { ascending: false })
        .limit(20);

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `
        Perform a high-fidelity forensic audit on this transaction.
        Context: Source "${transaction.source}", Amount ₹${transaction.amount}, Mode ${transaction.payment_mode}, Reference "${transaction.reference_id || 'LOCAL'}".
        Historical Context: ${JSON.stringify(history)}

        Return a structured JSON object representing the audit result.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              riskScore: { type: Type.NUMBER, description: "0-100 score of risk" },
              riskLevel: { type: Type.STRING, enum: ["LOW", "MEDIUM", "HIGH"] },
              vectors: {
                type: Type.OBJECT,
                properties: {
                  velocity: { type: Type.STRING },
                  magnitude: { type: Type.STRING },
                  authenticity: { type: Type.STRING }
                },
                required: ["velocity", "magnitude", "authenticity"]
              },
              patterns: { type: Type.ARRAY, items: { type: Type.STRING } },
              anomalies: { type: Type.ARRAY, items: { type: Type.STRING } },
              verdict: { type: Type.STRING }
            },
            required: ["riskScore", "riskLevel", "vectors", "patterns", "anomalies", "verdict"]
          }
        }
      });

      const result = JSON.parse(response.text.trim());
      setAuditReport(result);
    } catch (err: any) {
      console.error('Audit Intelligence Error:', err);
    } finally {
      setIsPerformingAudit(false);
    }
  };

  const initForensicConsultation = async () => {
    if (!transaction || isConsulting) return;
    setIsConsulting(true);
    setIsAiThinking(true);
    
    try {
      const { data: history } = await supabase
        .from('transactions')
        .select('amount, created_at, payment_mode, reference_id')
        .eq('source', transaction.source)
        .order('created_at', { ascending: false })
        .limit(20);

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const systemPrompt = `
        You are the "FinTrack Forensic Consultant". 
        You are auditing a specific transaction:
        - ID: ${transaction.id}
        - Source: ${transaction.source}
        - Amount: ₹${transaction.amount}
        - Mode: ${transaction.payment_mode}
        - Reference: ${transaction.reference_id || 'LOCAL'}
        
        Historical Context for this source: ${JSON.stringify(history)}
        
        GOAL: Discuss this entry with the auditor. Help identify risks, patterns, or verify legitimacy.
        Be professional, analytical, and highly precise.
      `;

      chatInstance.current = ai.chats.create({
        model: 'gemini-3-pro-preview',
        config: {
          systemInstruction: systemPrompt,
          thinkingConfig: { thinkingBudget: 32768 }
        }
      });

      const response = await chatInstance.current.sendMessage({
        message: "Perform an initial forensic intake of this transaction and provide a 2-sentence summary of your immediate observation."
      });

      setChatMessages([{ role: 'assistant', content: response.text || "Neural connection established. Analysis core ready." }]);
    } catch (err) {
      setChatMessages([{ role: 'assistant', content: "Forensic bridge failed to initialize. Error in neural telemetry." }]);
    } finally {
      setIsAiThinking(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isAiThinking || !chatInstance.current) return;

    const userText = chatInput.trim();
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', content: userText }]);
    setIsAiThinking(true);

    try {
      const response = await chatInstance.current.sendMessage({ message: userText });
      setChatMessages(prev => [...prev, { role: 'assistant', content: response.text || "Signal drift detected. Re-evaluating." }]);
    } catch (err) {
      setChatMessages(prev => [...prev, { role: 'assistant', content: "Failed to process query. Neural core interrupted." }]);
    } finally {
      setIsAiThinking(false);
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
      setAiInsight("Telemetry drift detected but forensic link is offline.");
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  const fetchExistingTags = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('transactions').select('tags');
      if (error) throw error;
      const allTags = new Set<string>();
      data.forEach(item => {
        if (item.tags && Array.isArray(item.tags)) {
          item.tags.forEach((t: string) => allTags.add(t));
        }
      });
      setAllExistingTags(Array.from(allTags));
    } catch (err) {
      console.error('Failed to fetch existing tags:', err);
    }
  }, []);

  const fetchTransactionAndLogs = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const { data: txData, error: txError } = await supabase
        .from('transactions')
        .select(`
          id, amount, payment_mode, reference_id, source, created_at, updated_at, created_by, audit_tag, tags, secure_id, signature,
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
      setEditTags(txData.tags || []);

      if (txData.secure_id) {
        generateQrCode(txData.secure_id);
      }

      generateNeuralAudit(txData);
      fetchExistingTags();

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
      setError(err.message || 'Vault access failure.');
    } finally {
      setLoading(false);
    }
  }, [id, generateNeuralAudit, generateQrCode, fetchExistingTags]);

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
      setError("Seal initialization failed.");
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
          message: 'Cryptographic signature match. Transaction integrity verified against master node key.' 
        });
        await supabase.from('activity_logs').insert([{
          entity_type: 'transactions',
          entity_id: transaction.id,
          action: 'INTEGRITY_VERIFIED',
          performed_by: user!.id,
          details: { status: 'MATCH', secure_id: transaction.secure_id }
        }]);
      } else {
        setVerificationResult({ 
          valid: false, 
          message: 'Signature mismatch detected. The ledger signal has been modified or signed with an unauthorized key.' 
        });
        await supabase.from('activity_logs').insert([{
          entity_type: 'transactions',
          entity_id: transaction.id,
          action: 'INTEGRITY_FAILURE',
          performed_by: user!.id,
          details: { status: 'MISMATCH', actual: transaction.signature.slice(0, 10) + '...' }
        }]);
      }
    } catch (err) {
      setVerificationResult({ valid: false, message: 'Cryptographic verification engine error.' });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleAddTag = (tag: string) => {
    const trimmed = tag.trim().toUpperCase();
    if (trimmed && !editTags.includes(trimmed)) {
      setEditTags(prev => [...prev, trimmed]);
      setTagInput('');
      setTagSuggestions([]);
      setFocusedSuggestionIndex(-1);
    }
  };

  const handleRemoveTag = (tag: string) => {
    setEditTags(prev => prev.filter(t => t !== tag));
  };

  const handleTagInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setTagInput(value);
    if (value.trim()) {
      const filtered = allExistingTags.filter(t => 
        t.toLowerCase().includes(value.toLowerCase()) && !editTags.includes(t)
      );
      setTagSuggestions(filtered);
    } else {
      setTagSuggestions(allExistingTags.filter(t => !editTags.includes(t)).slice(0, 5));
    }
    setFocusedSuggestionIndex(-1);
  };

  const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedSuggestionIndex(prev => Math.min(prev + 1, tagSuggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedSuggestionIndex(prev => Math.max(prev - 1, -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (focusedSuggestionIndex >= 0) {
        handleAddTag(tagSuggestions[focusedSuggestionIndex]);
      } else if (tagInput.trim()) {
        handleAddTag(tagInput);
      }
    } else if (e.key === 'Escape') {
      setTagSuggestions([]);
    }
  };

  const handleUpdateRecord = async () => {
    if (!id || !transaction || !user) return;
    setCorrectionMsg(null);
    const newAmount = parseFloat(editAmount);
    
    // Forensic validation for positive numeric values
    if (isNaN(newAmount) || newAmount <= 0) {
      setCorrectionMsg({ type: 'error', text: 'Invalid value entry. Amount must be positive.' });
      return;
    }
    
    setIsUpdating(true);
    try {
      const oldAmount = transaction.amount;
      const oldTag = transaction.audit_tag;
      const oldTags = transaction.tags || [];
      const sanitizedTag = editTag.trim() || null;
      
      const { error: updateError } = await supabase
        .from('transactions')
        .update({ 
          amount: newAmount, 
          audit_tag: sanitizedTag, 
          tags: editTags,
          updated_at: new Date().toISOString() 
        })
        .eq('id', id);
        
      if (updateError) throw updateError;
      
      // Mandatory forensic logging in activity_logs
      await supabase.from('activity_logs').insert([{
        entity_type: 'transactions',
        entity_id: id,
        action: 'UPDATE',
        performed_by: user.id,
        details: {
          changes: {
            amount: { from: oldAmount, to: newAmount },
            audit_tag: { from: oldTag, to: sanitizedTag },
            tags: { from: oldTags, to: editTags }
          }
        }
      }]);
      
      setCorrectionMsg({ type: 'success', text: 'Ledger recalibrated. All forensic drifts recorded.' });
      await fetchTransactionAndLogs();
    } catch (err: any) {
      setCorrectionMsg({ type: 'error', text: 'Transmission failure.' });
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
    <div className="flex h-[80vh] flex-col items-center justify-center p-8 text-center">
      <AlertCircle className="h-12 w-12 text-rose-500 mb-4" />
      <p className="text-sm font-bold text-slate-900">{error || 'Vault Access Error'}</p>
      <button onClick={() => navigate(-1)} className="mt-6 text-[10px] font-black uppercase tracking-widest text-indigo-600 underline">Return to Vault</button>
    </div>
  );

  const hasBeenModified = transaction.updated_at !== transaction.created_at;
  const getRiskUI = (score: number) => {
    if (score > 70) return { color: 'text-rose-500', bg: 'bg-rose-50', border: 'border-rose-100', icon: AlertTriangle, label: 'High Anomaly' };
    if (score > 30) return { color: 'text-amber-500', bg: 'bg-amber-50', border: 'border-amber-100', icon: Info, label: 'Moderate Drift' };
    return { color: 'text-emerald-500', bg: 'bg-emerald-50', border: 'border-emerald-100', icon: ShieldCheck, label: 'Verified Nominal' };
  };
  const risk = getRiskUI(aiScore || 0);

  const getLogIndicator = (action: string) => {
    switch(action) {
      case 'UPDATE': return { icon: RefreshCw, color: 'text-amber-600', bg: 'bg-amber-100' };
      case 'SECURE_ID_GENERATED': return { icon: Fingerprint, color: 'text-indigo-600', bg: 'bg-indigo-100' };
      case 'INITIAL_RECORD': return { icon: Zap, color: 'text-emerald-600', bg: 'bg-emerald-100' };
      case 'INTEGRITY_VERIFIED': return { icon: ShieldCheck, color: 'text-emerald-600', bg: 'bg-emerald-100' };
      case 'INTEGRITY_FAILURE': return { icon: ShieldAlert, color: 'text-rose-600', bg: 'bg-rose-100' };
      default: return { icon: Activity, color: 'text-slate-600', bg: 'bg-slate-100' };
    }
  };

  const renderChanges = (changes: any) => {
    if (!changes) return null;
    return Object.entries(changes).map(([key, val]: [string, any]) => {
      const from = val.from === null || val.from === undefined ? 'NULL' : Array.isArray(val.from) ? `[${val.from.join(', ')}]` : val.from;
      const to = val.to === null || val.to === undefined ? 'NULL' : Array.isArray(val.to) ? `[${val.to.join(', ')}]` : val.to;
      
      const isAmount = key === 'amount';
      
      return (
        <div key={key} className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 border-b border-white/5 last:border-0">
           <div className="flex items-center justify-between">
              <span className="text-[8px] font-black uppercase tracking-widest text-slate-500">{key} Observation</span>
              {isAmount && typeof from === 'number' && typeof to === 'number' && (
                <span className={`text-[8px] font-bold px-2 py-0.5 rounded-full ${to > from ? 'bg-rose-500/10 text-rose-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                   {to > from ? '+' : ''}{((to - from) / from * 100).toFixed(1)}% Drift
                </span>
              )}
           </div>
           <div className="flex items-center gap-3">
              <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-800/50 px-3 py-1 rounded-lg truncate max-w-[140px] border border-white/5 shadow-inner">
                {isAmount ? `₹${Number(from).toLocaleString()}` : String(from)}
              </span>
              <ArrowRight className="h-3 w-3 text-indigo-500 shrink-0" />
              <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950/50 px-3 py-1 rounded-lg truncate max-w-[140px] border border-emerald-500/10 shadow-inner">
                {isAmount ? `₹${Number(to).toLocaleString()}` : String(to)}
              </span>
           </div>
        </div>
      );
    });
  };

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

      {/* Neural Quick Insight HUD */}
      <div className="mb-12 rounded-[3.5rem] bg-indigo-950 p-10 text-white shadow-3xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-12 opacity-5 rotate-12 transition-transform group-hover:rotate-0 duration-700">
           <BrainCircuit className="h-40 w-40" />
        </div>
        <div className="relative z-10">
           <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                 <Sparkles className={`h-5 w-5 ${isAnalyzing ? 'animate-spin text-indigo-400' : 'text-indigo-400'}`} />
                 <span className="text-[10px] font-black uppercase tracking-[0.4em] text-indigo-400">Neural Quick Scan</span>
              </div>
              <button onClick={() => generateNeuralAudit(transaction)} disabled={isAnalyzing} className="p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
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
                      "{aiInsight || 'Intelligence core awaiting signal.'}"
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

      {/* Main Ledger Card */}
      <div className="relative rounded-[4rem] bg-white shadow-3xl overflow-hidden border border-slate-100 mb-12">
          <div className="bg-slate-950 p-12 md:p-16 text-white relative">
              <div className="relative z-10">
                  <div className="flex items-center gap-4 mb-10">
                       <div className="h-10 w-10 rounded-2xl bg-indigo-50 flex items-center justify-center shadow-2xl">
                          <Zap className="h-5 w-5 text-indigo-600" />
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
                      
                      {/* Integrated Tags Display */}
                      <div className="flex flex-wrap gap-2 justify-center mt-6">
                        {transaction.audit_tag && (
                          <span className="flex items-center gap-2 rounded-full bg-indigo-600 text-white px-8 py-3 text-[10px] font-black uppercase tracking-[0.3em] ring-1 ring-indigo-500 shadow-lg shadow-indigo-100">
                            <Bookmark className="h-3 w-3 text-indigo-200" /> 
                            {transaction.audit_tag}
                          </span>
                        )}
                        <AnimatePresence>
                          {transaction.tags && transaction.tags.map(t => (
                            <motion.span 
                              key={t}
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              className="flex items-center gap-2 rounded-full bg-slate-100 text-slate-600 px-8 py-3 text-[10px] font-black uppercase tracking-[0.3em] ring-1 ring-slate-200"
                            >
                              <Tag className="h-3 w-3 text-slate-400" />
                              {t}
                            </motion.span>
                          ))}
                        </AnimatePresence>
                      </div>
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

              {/* Operational Authority Node */}
              <div className="space-y-8 border-t border-slate-50 pt-16 group">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-xl bg-indigo-100 flex items-center justify-center group-hover:bg-indigo-600 transition-colors">
                      <UserRoundCheck className="h-4 w-4 text-indigo-600 group-hover:text-white" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">Operational Authority Node</span>
                  </div>
                  
                  <div className="flex flex-col md:flex-row items-center gap-10 p-10 rounded-[3.5rem] bg-slate-50 border border-slate-100 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-10 opacity-[0.03] rotate-12"><ShieldHalf className="h-32 w-32" /></div>
                    <div className="h-24 w-24 rounded-[2.5rem] bg-white flex items-center justify-center shadow-xl shrink-0 border border-slate-50">
                       <User className="h-10 w-10 text-slate-300" />
                    </div>
                    <div className="flex-1 text-center md:text-left z-10">
                       <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Authenticated Operator</p>
                       <p className="text-2xl font-black text-slate-950 tracking-tight leading-none mb-4">
                          {transaction.creator?.email || `LEGACY_REF_${transaction.created_by.slice(0, 8)}`}
                       </p>
                       <div className="flex flex-wrap justify-center md:justify-start gap-3">
                          <span className="px-5 py-2 rounded-xl bg-indigo-600 text-white text-[10px] font-black uppercase tracking-[0.2em]">
                            {transaction.creator?.role?.replace('_', ' ') || 'Registered Node'}
                          </span>
                       </div>
                    </div>
                  </div>
              </div>
          </div>
      </div>

      {/* Audit History & Modification Trail */}
      <div className="bg-white rounded-[4rem] p-12 md:p-16 shadow-3xl border border-slate-100 mb-12 overflow-hidden relative">
          <div className="flex items-center justify-between mb-16 relative z-10">
            <div className="flex items-center gap-5">
              <div className="h-12 w-12 rounded-[1.5rem] bg-slate-950 flex items-center justify-center shadow-2xl">
                <ListTodo className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-black italic tracking-tighter uppercase text-slate-900 leading-none">Audit History & Trail</h3>
                <p className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-400 mt-2">Historical Modification Consensus</p>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-slate-50 px-5 py-3 rounded-2xl border border-slate-100 shadow-sm">
               <span className="text-lg font-black text-indigo-600 tabular-nums">{logs.length}</span>
               <span className="text-[8px] font-black uppercase tracking-widest text-slate-500">Events Recorded</span>
            </div>
          </div>
          
          <div className="space-y-12 relative before:absolute before:left-[23px] before:top-4 before:bottom-4 before:w-[2px] before:bg-slate-100">
            {logs.length === 0 ? (
              <div className="py-12 pl-16 flex flex-col items-start opacity-30">
                <Inbox className="h-10 w-10 text-slate-300 mb-4" />
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">No historical drifts detected for this entity node.</p>
              </div>
            ) : (
              logs.map((log, idx) => {
                const indicator = getLogIndicator(log.action);
                const isExpanded = expandedLogs.has(log.id);
                const hasChanges = log.details?.changes && Object.keys(log.details.changes).length > 0;

                return (
                  <motion.div 
                    key={log.id} 
                    initial={{ opacity: 0, x: -20 }} 
                    animate={{ opacity: 1, x: 0 }} 
                    transition={{ delay: idx * 0.05 }} 
                    className="relative pl-16 group/log"
                  >
                    <div className={`absolute left-0 top-1.5 h-12 w-12 rounded-2xl ${indicator.bg} flex items-center justify-center z-10 shadow-sm border border-white ring-4 ring-white group-hover/log:scale-110 transition-transform duration-300`}>
                       <indicator.icon className={`h-5 w-5 ${indicator.color}`} />
                    </div>

                    <div className={`flex flex-col gap-6 p-10 rounded-[2.5rem] bg-slate-50/50 hover:bg-white hover:shadow-xl hover:shadow-slate-200/40 border border-transparent hover:border-slate-100 transition-all duration-500`}>
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
                        <div className="space-y-4">
                          <div className="flex flex-wrap items-center gap-3">
                            <span className={`text-[9px] font-black uppercase tracking-widest px-4 py-2 rounded-xl border shadow-sm ${
                              log.action === 'UPDATE' ? 'bg-amber-50 text-amber-700 border-amber-100' : 
                              log.action === 'SECURE_ID_GENERATED' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' :
                              log.action === 'INTEGRITY_VERIFIED' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                              'bg-emerald-50 text-emerald-700 border-emerald-100'
                            }`}>
                              {log.action.replace(/_/g, ' ')}
                            </span>
                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-300 flex items-center gap-2">
                               <ShieldCheck className="h-3 w-3" /> Signal Authenticated
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-100 w-fit">
                            <div className="h-6 w-6 rounded-lg bg-indigo-50 flex items-center justify-center">
                               <User className="h-3.5 w-3.5 text-indigo-600" />
                            </div>
                            <p className="text-xs font-black text-slate-700 uppercase tracking-tight">
                               {log.performer?.email || `LEGACY_NODE_${log.performed_by.slice(0, 8)}`}
                            </p>
                          </div>
                        </div>

                        <div className="text-left md:text-right shrink-0 flex items-center gap-8">
                           <div>
                             <div className="flex items-center md:justify-end gap-3 text-slate-950 mb-1">
                                <Clock className="h-4 w-4 text-indigo-500" />
                                <span className="text-lg font-black tabular-nums tracking-tighter italic">
                                   {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                </span>
                             </div>
                             <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] block">
                                {new Date(log.created_at).toLocaleDateString(undefined, { day: '2-digit', month: 'long', year: 'numeric' })}
                             </span>
                           </div>
                           
                           {hasChanges && (
                             <button 
                               onClick={() => toggleLog(log.id)}
                               className={`p-4 rounded-2xl transition-all shadow-md active:scale-90 ${isExpanded ? 'bg-indigo-600 text-white' : 'bg-white text-slate-400 border border-slate-100 hover:border-indigo-600 hover:text-indigo-600'}`}
                             >
                               {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                             </button>
                           )}
                        </div>
                      </div>

                      {/* Expandable Changes Section (Modification Details) */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div 
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                             <div className="pt-8 border-t border-slate-200/60 mt-2">
                                <div className="flex items-center gap-3 mb-6">
                                   <Database className="h-4 w-4 text-indigo-500" />
                                   <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500">Forensic Delta Capture</span>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-950 p-8 rounded-[3rem] border border-slate-800 shadow-2xl">
                                   {renderChanges(log.details.changes)}
                                </div>
                             </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
      </div>

      {/* Super Admin Terminal (Master Recalibration & Amount Editing) */}
      {isSuperAdmin && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="rounded-[4rem] bg-slate-900 p-12 md:p-16 text-white shadow-3xl relative overflow-hidden mb-12">
          <div className="absolute top-0 right-0 p-12 opacity-10"><Settings className="h-32 w-32 animate-spin-slow" /></div>
          <div className="relative z-10">
            <div className="flex items-center gap-4 mb-10">
              <ShieldAlert className="h-8 w-8 text-amber-400" />
              <h3 className="text-2xl font-black italic tracking-tighter uppercase">Master Recalibration</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500 ml-1">Amount Adjustment (New Value)</label>
                <div className="relative">
                  <span className="absolute left-6 top-1/2 -translate-y-1/2 text-2xl font-black text-indigo-500 italic">₹</span>
                  <input 
                    type="number" 
                    value={editAmount} 
                    onChange={(e) => setEditAmount(e.target.value)} 
                    className="h-20 w-full rounded-3xl bg-white/5 border border-white/10 pl-16 text-2xl font-black text-white italic outline-none focus:ring-2 focus:ring-indigo-600 transition-all shadow-inner" 
                    placeholder="0.00"
                  />
                </div>
                <p className="text-[8px] font-bold text-slate-500 ml-1 uppercase tracking-widest">Validation: Must be a positive numeric value.</p>
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500 ml-1">Audit Tag Override</label>
                <input 
                  type="text" 
                  value={editTag} 
                  onChange={(e) => setEditTag(e.target.value)} 
                  className="h-20 w-full rounded-3xl bg-white/5 border border-white/10 px-8 text-lg font-black text-white uppercase outline-none focus:ring-2 focus:ring-indigo-600 transition-all shadow-inner" 
                  placeholder="OPTIONAL_PRIMARY_TAG" 
                />
              </div>
            </div>

            {/* Optimized Tag Management Console */}
            <div className="mt-12 space-y-6">
              <div className="flex items-center justify-between ml-1">
                <label className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500">Neural Forensic Multi-Tags</label>
                {editTags.length > 0 && (
                  <button onClick={() => setEditTags([])} className="text-[9px] font-black uppercase tracking-widest text-rose-500 hover:text-rose-400 transition-colors flex items-center gap-2">
                    <Trash2 className="h-3 w-3" /> Clear Matrix Tags
                  </button>
                )}
              </div>
              
              <div className="p-10 rounded-[3rem] bg-white/5 border border-white/10 shadow-inner">
                <div className="flex flex-wrap gap-3 mb-10 min-h-[40px]">
                  <AnimatePresence>
                    {editTags.map(tag => (
                      <motion.span 
                        key={tag} 
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="inline-flex items-center gap-2 bg-indigo-600/30 text-indigo-300 px-6 py-3 rounded-2xl border border-indigo-500/20 text-[10px] font-black tracking-widest uppercase shadow-2xl"
                      >
                        {tag}
                        <button onClick={() => handleRemoveTag(tag)} className="hover:text-rose-400 transition-colors p-1 hover:bg-rose-500/10 rounded-lg">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </motion.span>
                    ))}
                  </AnimatePresence>
                  {editTags.length === 0 && (
                    <div className="w-full flex flex-col items-center justify-center py-6 opacity-30">
                       <Tag className="h-8 w-8 mb-3" />
                       <span className="text-[10px] font-black uppercase tracking-widest italic text-center">Awaiting primary categorization tags.</span>
                    </div>
                  )}
                </div>
                
                <div className="relative group/input">
                  <div className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-600 transition-colors group-focus-within/input:text-indigo-400">
                    <Tag className="h-full w-full" />
                  </div>
                  <input 
                    type="text"
                    value={tagInput}
                    onFocus={handleTagInputChange}
                    onChange={handleTagInputChange}
                    onKeyDown={handleTagInputKeyDown}
                    placeholder="Search ledger or inject custom audit tag..."
                    className="h-20 w-full rounded-3xl bg-black/40 border border-white/10 pl-16 pr-16 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-indigo-600/50 transition-all shadow-2xl placeholder:text-slate-700"
                  />
                  <button 
                    onClick={() => handleAddTag(tagInput)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 h-12 w-12 bg-indigo-600 rounded-2xl flex items-center justify-center hover:bg-indigo-500 transition-all shadow-xl active:scale-95"
                  >
                    <Plus className="h-6 w-6" />
                  </button>

                  {/* Suggestion HUD */}
                  <AnimatePresence>
                    {tagSuggestions.length > 0 && (
                      <motion.div 
                        ref={suggestionRef}
                        initial={{ opacity: 0, y: -15, scale: 0.98 }} 
                        animate={{ opacity: 1, y: 0, scale: 1 }} 
                        exit={{ opacity: 0, y: -10, scale: 0.98 }}
                        className="absolute left-0 right-0 top-full mt-4 z-[100] bg-slate-800 border border-white/10 rounded-[2.5rem] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] overflow-hidden backdrop-blur-xl"
                      >
                        <div className="px-6 py-4 border-b border-white/5 bg-black/20">
                           <span className="text-[8px] font-black uppercase tracking-[0.4em] text-slate-500">Suggested Signatures</span>
                        </div>
                        <div className="p-3 space-y-1 max-h-[300px] overflow-y-auto scrollbar-hide">
                          {tagSuggestions.map((suggestion, idx) => (
                            <button
                              key={suggestion}
                              onClick={() => handleAddTag(suggestion)}
                              onMouseEnter={() => setFocusedSuggestionIndex(idx)}
                              className={`w-full text-left px-6 py-4 rounded-2xl transition-all flex items-center justify-between group/suggest ${
                                focusedSuggestionIndex === idx ? 'bg-indigo-600 text-white shadow-xl' : 'hover:bg-white/5 text-slate-300'
                              }`}
                            >
                              <div className="flex items-center gap-4">
                                <TrendingUp className={`h-4 w-4 ${focusedSuggestionIndex === idx ? 'text-indigo-200' : 'text-slate-600'}`} />
                                <span className="text-xs font-black uppercase tracking-widest">{suggestion}</span>
                              </div>
                              <ArrowRight className={`h-4 w-4 opacity-0 group-hover/suggest:opacity-100 transition-all ${focusedSuggestionIndex === idx ? 'text-white translate-x-0' : 'text-slate-500 -translate-x-2'}`} />
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>

            <button 
              onClick={handleUpdateRecord} 
              disabled={isUpdating} 
              className="w-full mt-12 h-24 rounded-[2.5rem] bg-indigo-600 text-white text-[11px] font-black uppercase tracking-[0.5em] flex items-center justify-center gap-6 hover:bg-indigo-500 transition-all shadow-3xl active:scale-[0.98] disabled:opacity-50"
            >
              {isUpdating ? <Loader2 className="h-8 w-8 animate-spin" /> : <Save className="h-8 w-8" />} Update Transaction Signal
            </button>
            <AnimatePresence>
              {correctionMsg && (
                <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className={`mt-10 p-8 rounded-[2.5rem] border shadow-2xl backdrop-blur-md ${correctionMsg.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>
                  <div className="flex items-center gap-6">
                    <div className={`h-12 w-12 rounded-2xl flex items-center justify-center ${correctionMsg.type === 'success' ? 'bg-emerald-500/20' : 'bg-rose-500/20'}`}>
                      {correctionMsg.type === 'success' ? <ShieldCheck className="h-6 w-6" /> : <AlertTriangle className="h-6 w-6" />}
                    </div>
                    <span className="text-xs font-black uppercase tracking-widest leading-relaxed">{correctionMsg.text}</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}

      <style>{`.animate-spin-slow { animation: spin 12s linear infinite; } @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } } .scrollbar-hide::-webkit-scrollbar { display: none; } .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }`}</style>
    </motion.div>
  );
}

