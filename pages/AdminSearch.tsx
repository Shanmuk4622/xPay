
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { GoogleGenAI } from "@google/genai";
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { 
  Search, 
  Filter, 
  ChevronLeft, 
  ChevronRight, 
  RefreshCw, 
  Building,
  Copy,
  Check,
  Inbox,
  FileDown,
  Loader2,
  BrainCircuit,
  PieChart,
  Activity,
  Zap,
  BarChart,
  Calendar,
  IndianRupee,
  Hash,
  XCircle,
  Clock,
  ChevronDown
} from 'lucide-react';
import { useDebounce } from '../hooks/useDebounce';

interface Transaction {
  id: string;
  amount: number;
  payment_mode: 'cash' | 'bank' | 'upi';
  reference_id: string | null;
  source: string;
  created_at: string;
}

const PAGE_SIZE = 12;

export default function AdminSearch() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [filteredValue, setFilteredValue] = useState(0);
  const [avgValue, setAvgValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [copyId, setCopyId] = useState<string | null>(null);
  
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [paymentMode, setPaymentMode] = useState<string>(searchParams.get('mode') || 'all');
  const [startDate, setStartDate] = useState(searchParams.get('start') || '');
  const [endDate, setEndDate] = useState(searchParams.get('end') || '');
  const [minAmount, setMinAmount] = useState(searchParams.get('min') || '');
  const [maxAmount, setMaxAmount] = useState(searchParams.get('max') || '');
  const [page, setPage] = useState(parseInt(searchParams.get('page') || '1'));

  const debouncedQuery = useDebounce(searchQuery, 400);

  useEffect(() => {
    const params: Record<string, string> = {};
    if (debouncedQuery) params.q = debouncedQuery;
    if (paymentMode !== 'all') params.mode = paymentMode;
    if (startDate) params.start = startDate;
    if (endDate) params.end = endDate;
    if (minAmount) params.min = minAmount;
    if (maxAmount) params.max = maxAmount;
    if (page > 1) params.page = page.toString();
    
    setSearchParams(params, { replace: true });
  }, [debouncedQuery, paymentMode, startDate, endDate, minAmount, maxAmount, page, setSearchParams]);

  const generateNeuralAudit = useCallback(async (txs: Transaction[], total: number, avg: number, count: number) => {
    if (txs.length === 0) {
      setAiInsight(null);
      return;
    }
    
    setIsAnalyzing(true);
    try {
      const modeDistribution = txs.reduce((acc: any, t) => {
        acc[t.payment_mode] = (acc[t.payment_mode] || 0) + 1;
        return acc;
      }, {});

      const statsSummary = {
        totalValue: total,
        averageValue: avg,
        transactionCount: count,
        topModes: modeDistribution,
        sampleSources: txs.slice(0, 5).map(t => t.source).join(', ')
      };

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Analyze these ledger metrics for patterns or anomalies: ${JSON.stringify(statsSummary)}. 
                   Return a high-density forensic summary (max 35 words). Focus on behavioral trends.`,
      });

      setAiInsight(response.text.trim());
    } catch (e) {
      setAiInsight("Statistical patterns stable. Anomaly check nominal.");
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase.from('transactions').select('*', { count: 'exact' });
      
      if (debouncedQuery.trim()) {
        const term = debouncedQuery.trim();
        query = query.or(`source.ilike.%${term}%,reference_id.ilike.%${term}%,id.ilike.%${term}%`);
      }
      if (paymentMode !== 'all') query = query.eq('payment_mode', paymentMode);
      if (startDate) query = query.gte('created_at', new Date(startDate).toISOString());
      if (endDate) query = query.lte('created_at', new Date(endDate + 'T23:59:59').toISOString());
      if (minAmount) query = query.gte('amount', parseFloat(minAmount));
      if (maxAmount) query = query.lte('amount', parseFloat(maxAmount));

      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      const { data, error, count } = await query.order('created_at', { ascending: false }).range(from, to);
      
      if (error) throw error;
      const txs = data || [];
      setTransactions(txs);
      setTotalCount(count || 0);

      // Aggregate sum calculation for statistics based on current filters
      let sumQuery = supabase.from('transactions').select('amount');
      if (debouncedQuery.trim()) sumQuery = sumQuery.or(`source.ilike.%${debouncedQuery}%,reference_id.ilike.%${debouncedQuery}%,id.ilike.%${debouncedQuery}%`);
      if (paymentMode !== 'all') sumQuery = sumQuery.eq('payment_mode', paymentMode);
      if (startDate) sumQuery = sumQuery.gte('created_at', new Date(startDate).toISOString());
      if (endDate) sumQuery = sumQuery.lte('created_at', new Date(endDate + 'T23:59:59').toISOString());
      if (minAmount) sumQuery = sumQuery.gte('amount', parseFloat(minAmount));
      if (maxAmount) sumQuery = sumQuery.lte('amount', parseFloat(maxAmount));
      
      const { data: allMatched } = await sumQuery;
      const total = (allMatched || []).reduce((acc, tx) => acc + tx.amount, 0);
      const avg = count ? total / count : 0;
      
      setFilteredValue(total);
      setAvgValue(avg);

      if (txs.length > 0) generateNeuralAudit(txs, total, avg, count || 0);

    } catch (err) {
      console.error('Forensic fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [page, debouncedQuery, paymentMode, startDate, endDate, minAmount, maxAmount, generateNeuralAudit]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  useEffect(() => {
    setPage(1);
  }, [debouncedQuery, paymentMode, startDate, endDate, minAmount, maxAmount]);

  const handleExport = async () => {
    if (transactions.length === 0 || isExporting) return;
    setIsExporting(true);
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Ledger_Export');
      worksheet.columns = [
        { header: 'Archive Date', key: 'date', width: 25 },
        { header: 'Entity', key: 'source', width: 30 },
        { header: 'Mode', key: 'mode', width: 15 },
        { header: 'Value (INR)', key: 'amount', width: 20 },
        { header: 'Reference ID', key: 'ref', width: 25 },
        { header: 'Trace ID', key: 'id', width: 40 },
      ];
      transactions.forEach(tx => {
        worksheet.addRow({
          date: new Date(tx.created_at).toLocaleString(),
          source: tx.source,
          mode: tx.payment_mode.toUpperCase(),
          amount: tx.amount,
          ref: tx.reference_id || 'LOCAL',
          id: tx.id
        });
      });
      const buffer = await workbook.xlsx.writeBuffer();
      saveAs(new Blob([buffer]), `FinTrack_Audit_${Date.now()}.xlsx`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopy = async (e: React.MouseEvent, text: string) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(text);
    setCopyId(text);
    setTimeout(() => setCopyId(null), 2000);
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const activeFiltersCount = [paymentMode !== 'all', startDate, endDate, minAmount, maxAmount].filter(Boolean).length;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
        <div>
           <h1 className="text-5xl font-black tracking-tighter text-slate-900 italic leading-none">Global Ledger</h1>
           <p className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-400 mt-5 ml-1 flex items-center gap-3">
             <BarChart className="h-4 w-4 text-indigo-500" /> Authorized Audit Interface
           </p>
        </div>
        <div className="flex flex-wrap gap-4">
           <button 
             onClick={handleExport}
             disabled={transactions.length === 0 || isExporting}
             className="flex items-center rounded-2xl bg-slate-900 px-8 py-5 text-[10px] font-black uppercase tracking-widest text-white shadow-2xl transition-all hover:bg-black active:scale-95 disabled:opacity-50"
           >
             {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
             Export Archive
           </button>
           <button 
             onClick={() => setShowFilters(!showFilters)}
             className={`relative flex items-center rounded-2xl px-8 py-5 text-[10px] font-black uppercase tracking-widest transition-all ${showFilters ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-400'}`}
           >
             <Filter className="mr-2 h-4 w-4" />
             Filters Terminal
             {activeFiltersCount > 0 && (
               <span className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-indigo-500 text-white flex items-center justify-center text-[10px] ring-4 ring-white shadow-lg">{activeFiltersCount}</span>
             )}
           </button>
        </div>
      </div>

      <AnimatePresence>
        {showFilters && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 bg-white p-10 rounded-[2.5rem] shadow-xl border border-slate-100 relative">
               <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                    <IndianRupee className="h-3 w-3" /> Settlement Node
                  </label>
                  <select value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)} className="w-full rounded-xl bg-slate-50 py-3 px-4 border-none text-xs font-black uppercase tracking-widest focus:ring-2 focus:ring-indigo-500 transition-all appearance-none cursor-pointer">
                    <option value="all">Consolidated Node</option>
                    <option value="cash">Cash Ledger</option>
                    <option value="bank">Bank Wire</option>
                    <option value="upi">Digital UPI</option>
                  </select>
               </div>
               <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                    <Activity className="h-3 w-3" /> Quantum Spread
                  </label>
                  <div className="flex gap-2">
                    <input type="number" placeholder="Min" value={minAmount} onChange={(e) => setMinAmount(e.target.value)} className="w-full rounded-xl bg-slate-50 py-3 px-4 text-xs font-bold border-none focus:ring-2 focus:ring-indigo-500" />
                    <input type="number" placeholder="Max" value={maxAmount} onChange={(e) => setMaxAmount(e.target.value)} className="w-full rounded-xl bg-slate-50 py-3 px-4 text-xs font-bold border-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
               </div>
               <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                    <Calendar className="h-3 w-3" /> Forensic Window
                  </label>
                  <div className="flex gap-2">
                    <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full rounded-xl bg-slate-50 py-3 px-4 text-[10px] font-bold border-none focus:ring-2 focus:ring-indigo-500" />
                    <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full rounded-xl bg-slate-50 py-3 px-4 text-[10px] font-bold border-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
               </div>
               <div className="flex items-end">
                  <button 
                    onClick={() => { setPaymentMode('all'); setStartDate(''); setEndDate(''); setMinAmount(''); setMaxAmount(''); setSearchQuery(''); }} 
                    className="w-full rounded-xl bg-slate-100 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition-all flex items-center justify-center gap-2"
                  >
                    <XCircle className="h-3 w-3" /> Reset Engine
                  </button>
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <motion.div layout className="lg:col-span-8 bg-slate-950 rounded-[3.5rem] p-12 text-white shadow-2xl relative overflow-hidden group">
           <div className="absolute top-0 right-0 p-12 opacity-5 rotate-12 transition-transform group-hover:rotate-45 duration-700">
             <PieChart className="h-64 w-64" />
           </div>
           
           <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-12">
              <div className="space-y-2 text-center md:text-left">
                 <p className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-500">Aggregate Filtered Volume</p>
                 <h3 className="text-6xl font-black italic tracking-tighter tabular-nums text-indigo-400">₹{filteredValue.toLocaleString('en-IN', { minimumFractionDigits: 0 })}</h3>
              </div>
              
              <div className="flex gap-16 border-l border-white/10 pl-16">
                 <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mb-2">Archive Hits</p>
                    <h4 className="text-2xl font-black tabular-nums">{totalCount}</h4>
                 </div>
                 <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mb-2">Mean Settlement</p>
                    <h4 className="text-2xl font-black tabular-nums">₹{Math.round(avgValue).toLocaleString('en-IN')}</h4>
                 </div>
              </div>
           </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="lg:col-span-4 bg-indigo-600 rounded-[3.5rem] p-12 text-white shadow-premium relative overflow-hidden">
           <div className="absolute right-0 top-0 p-8 opacity-10">
              <BrainCircuit className="h-32 w-32" />
           </div>
           <div className="relative z-10 flex flex-col h-full justify-between">
              <div>
                <div className="flex items-center gap-3 mb-8">
                  <div className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center">
                    <Zap className={`h-4 w-4 ${isAnalyzing ? 'text-yellow-400 animate-pulse' : 'text-indigo-200'}`} />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-[0.4em] text-indigo-200">Neural Summary</span>
                </div>
                
                <AnimatePresence mode="wait">
                  {isAnalyzing ? (
                    <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                       <div className="h-4 w-full bg-white/10 rounded-full animate-pulse" />
                       <div className="h-4 w-3/4 bg-white/10 rounded-full animate-pulse" />
                    </motion.div>
                  ) : aiInsight ? (
                    <motion.p key="content" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-lg font-black italic tracking-tight leading-relaxed">
                      "{aiInsight}"
                    </motion.p>
                  ) : (
                    <p className="text-sm font-bold text-indigo-200/60 uppercase tracking-widest leading-relaxed">Neural bridge standby. Filter data to generate forensic narrative.</p>
                  )}
                </AnimatePresence>
              </div>
              
              <div className="mt-12 flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-indigo-200">
                <div className="h-1.5 w-1.5 rounded-full bg-indigo-200 animate-ping" />
                Audit Pulse Online
              </div>
           </div>
        </motion.div>
      </div>

      <div className="relative group">
        <Search className="absolute left-10 top-1/2 -translate-y-1/2 h-8 w-8 text-slate-300 group-focus-within:text-indigo-600 transition-colors" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Forensic Global Search (Entity, UTR, Trace ID)..."
          className="h-28 w-full rounded-[3.5rem] border-none bg-white pl-28 pr-12 text-2xl font-black tracking-tighter text-slate-900 shadow-xl ring-1 ring-slate-200 placeholder:text-slate-200 focus:ring-[16px] focus:ring-indigo-600/5 transition-all outline-none"
        />
        {searchQuery && (
          <button 
            onClick={() => setSearchQuery('')}
            className="absolute right-10 top-1/2 -translate-y-1/2 h-10 w-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 hover:text-rose-600 transition-all"
          >
            <XCircle className="h-5 w-5" />
          </button>
        )}
      </div>

      <div className="overflow-hidden rounded-[4rem] border border-slate-200 bg-white shadow-3xl">
        {loading ? (
          <div className="flex h-[400px] items-center justify-center bg-slate-50/50">
             <div className="flex flex-col items-center gap-5">
                <RefreshCw className="h-12 w-12 animate-spin text-indigo-600" />
                <span className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-300">Synchronizing Ledger...</span>
             </div>
          </div>
        ) : transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-48 opacity-40 bg-slate-50/50">
             <Inbox className="h-32 w-32 text-slate-100 mb-8" />
             <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">Zero matches in active archive</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100">
              <thead className="bg-slate-50/80 backdrop-blur-sm">
                <tr>
                  <th className="px-12 py-10 text-left text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">Archive Log</th>
                  <th className="px-12 py-10 text-left text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">Entity Source</th>
                  <th className="px-12 py-10 text-left text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">Channel Node</th>
                  <th className="px-12 py-10 text-right text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">Settled Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transactions.map((tx, idx) => (
                  <motion.tr 
                    key={tx.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.02 }}
                    onClick={() => navigate(`/admin/transactions/${tx.id}`)}
                    className="group cursor-pointer hover:bg-indigo-50/30 transition-all"
                  >
                    <td className="px-12 py-10">
                      <div className="text-lg font-black text-slate-900 tracking-tight tabular-nums">{new Date(tx.created_at).toLocaleDateString()}</div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1.5 opacity-60 flex items-center gap-2">
                        <Clock className="h-3 w-3" />
                        {new Date(tx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>
                    <td className="px-12 py-10">
                      <div className="flex items-center gap-6">
                        <div className="h-14 w-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white group-hover:shadow-xl transition-all">
                          <Building className="h-7 w-7" />
                        </div>
                        <div>
                          <div className="text-xl font-black text-slate-900 tracking-tighter mb-1 leading-none group-hover:text-indigo-600 transition-colors">{tx.source}</div>
                          <div onClick={(e) => handleCopy(e, tx.reference_id || 'LOCAL')} className="text-[9px] font-black text-slate-300 uppercase tracking-widest flex items-center gap-2 hover:text-indigo-600 transition-colors">
                            <Hash className="h-3 w-3" />
                            {tx.reference_id || 'LOCAL_SIGNAL'}
                            {copyId === (tx.reference_id || 'LOCAL') ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3 opacity-20" />}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-12 py-10">
                      <span className={`rounded-full px-5 py-2 text-[10px] font-black uppercase tracking-widest ring-1 ring-inset shadow-sm ${
                        tx.payment_mode === 'cash' ? 'bg-emerald-50 text-emerald-700 ring-emerald-100' : 'bg-indigo-50 text-indigo-700 ring-indigo-100'
                      }`}>
                        {tx.payment_mode}
                      </span>
                    </td>
                    <td className="px-12 py-10 text-right">
                      <div className="text-3xl font-black italic tracking-tighter text-slate-900 tabular-nums group-hover:text-indigo-600 transition-colors">₹{tx.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="flex flex-col md:flex-row items-center justify-between gap-6 px-4 pb-20">
         <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-300">
           Displaying <span className="text-slate-950 mx-1">{transactions.length}</span> of <span className="text-slate-950 mx-1">{totalCount}</span> Archive Units
         </p>
         <div className="flex items-center gap-3">
            <button 
              disabled={page === 1} 
              onClick={() => setPage(p => p - 1)} 
              className="h-16 w-16 rounded-[1.5rem] bg-white border border-slate-200 flex items-center justify-center shadow-sm disabled:opacity-20 hover:shadow-xl transition-all active:scale-95"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <div className="h-16 flex items-center gap-2">
               {[...Array(Math.min(5, totalPages))].map((_, i) => {
                 let pageNum = page;
                 if (totalPages <= 5) pageNum = i + 1;
                 else if (page <= 3) pageNum = i + 1;
                 else if (page >= totalPages - 2) pageNum = totalPages - 4 + i;
                 else pageNum = page - 2 + i;
                 
                 if (pageNum < 1 || pageNum > totalPages) return null;

                 return (
                   <button 
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={`h-16 w-16 rounded-[1.5rem] text-[10px] font-black transition-all ${page === pageNum ? 'bg-indigo-600 text-white shadow-2xl scale-110' : 'bg-white border border-slate-200 text-slate-400 hover:bg-slate-50'}`}
                   >
                     {pageNum}
                   </button>
                 );
               })}
            </div>
            <button 
              disabled={page === totalPages || totalPages === 0} 
              onClick={() => setPage(p => p + 1)} 
              className="h-16 w-16 rounded-[1.5rem] bg-white border border-slate-200 flex items-center justify-center shadow-sm disabled:opacity-20 hover:shadow-xl transition-all active:scale-95"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
         </div>
      </div>
    </motion.div>
  );
}
