
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { 
  Search, 
  Filter, 
  ChevronLeft, 
  ChevronRight, 
  RefreshCw, 
  Building,
  MoreHorizontal,
  Copy,
  Check,
  Inbox,
  TrendingUp,
  FileDown,
  Loader2
} from 'lucide-react';
import { useDebounce } from '../hooks/useDebounce';

interface Transaction {
  id: string;
  amount: number;
  payment_mode: 'cash' | 'bank' | 'upi';
  reference_id: string | null;
  source: string;
  created_at: string;
  created_by: string;
}

const PAGE_SIZE = 12;

export default function AdminSearch() {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [filteredValue, setFilteredValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [copyId, setCopyId] = useState<string | null>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedQuery = useDebounce(searchQuery, 400);

  const [paymentMode, setPaymentMode] = useState<string>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [page, setPage] = useState(1);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase.from('transactions').select('*', { count: 'exact' });
      
      if (debouncedQuery.trim()) {
        const term = debouncedQuery.trim();
        query = query.or(`source.ilike.%${term}%,reference_id.ilike.%${term}%`);
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
      setTransactions(data || []);
      setTotalCount(count || 0);

      // Fetch Total Value of filtered results
      let valQuery = supabase.from('transactions').select('amount');
      if (debouncedQuery.trim()) valQuery = valQuery.or(`source.ilike.%${debouncedQuery}%,reference_id.ilike.%${debouncedQuery}%`);
      if (paymentMode !== 'all') valQuery = valQuery.eq('payment_mode', paymentMode);
      if (startDate) valQuery = valQuery.gte('created_at', new Date(startDate).toISOString());
      if (endDate) valQuery = valQuery.lte('created_at', new Date(endDate + 'T23:59:59').toISOString());
      if (minAmount) valQuery = valQuery.gte('amount', parseFloat(minAmount));
      if (maxAmount) valQuery = valQuery.lte('amount', parseFloat(maxAmount));
      
      const { data: allMatch } = await valQuery;
      const sum = (allMatch || []).reduce((acc, tx) => acc + tx.amount, 0);
      setFilteredValue(sum);

    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [page, debouncedQuery, paymentMode, startDate, endDate, minAmount, maxAmount]);

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
      // Create workbook and worksheet
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Filtered Ledger');

      // Define columns
      worksheet.columns = [
        { header: 'Timestamp', key: 'timestamp', width: 25 },
        { header: 'Entity Source', key: 'source', width: 30 },
        { header: 'Channel', key: 'mode', width: 15 },
        { header: 'Settled Value (INR)', key: 'amount', width: 20 },
        { header: 'Network ID / Ref', key: 'ref', width: 25 },
      ];

      // Format headers
      worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF0F172A' } // Slate 900
      };

      // Add data
      transactions.forEach(tx => {
        worksheet.addRow({
          timestamp: new Date(tx.created_at).toLocaleString(),
          source: tx.source,
          mode: tx.payment_mode.toUpperCase(),
          amount: tx.amount,
          ref: tx.reference_id || 'LOCAL_AUDIT'
        });
      });

      // Format currency column
      worksheet.getColumn('amount').numFmt = '"₹"#,##0.00';

      // Generate Buffer
      const buffer = await workbook.xlsx.writeBuffer();
      
      // Simulate API streaming response and download
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, `fintrack_export_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopy = async (e: React.MouseEvent, text: string) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      setCopyId(text);
      setTimeout(() => setCopyId(null), 2000);
    } catch (err) {
      console.error('Copy failed', err);
    }
  };

  const resetFilters = () => {
    setSearchQuery('');
    setPaymentMode('all');
    setStartDate('');
    setEndDate('');
    setMinAmount('');
    setMaxAmount('');
    // Fix: Corrected typo 'Page 1' to '1'
    setPage(1);
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-10"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
        <div>
           <h1 className="text-4xl font-black tracking-tighter text-slate-900 italic leading-none">Ledger Explorer</h1>
           <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 mt-4 ml-1">Historical Unit Audit Consensus</p>
        </div>
        <div className="flex flex-wrap gap-3">
           <button 
             onClick={handleExport}
             disabled={transactions.length === 0 || isExporting}
             className="flex items-center justify-center rounded-2xl px-6 py-4 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
           >
             {isExporting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <FileDown className="mr-2 h-4 w-4" />}
             Export XLSX
           </button>
           <button 
             onClick={() => setShowFilters(!showFilters)}
             className={`flex-1 md:flex-none flex items-center justify-center rounded-2xl px-8 py-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all ${showFilters ? 'bg-indigo-100 text-indigo-700 shadow-inner' : 'bg-white text-slate-900 border border-slate-200 shadow-sm'}`}
           >
             <Filter className="mr-3 h-4 w-4" />
             Filters
           </button>
           <button 
             onClick={() => fetchTransactions()}
             className="rounded-2xl bg-white border border-slate-200 p-4 text-slate-400 hover:text-indigo-600 transition-colors shadow-sm"
           >
             <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
           </button>
        </div>
      </div>

      {/* Aggregate Bar */}
      <motion.div 
        layout
        className="bg-slate-900 rounded-[2.5rem] p-8 text-white flex flex-col sm:flex-row items-center justify-between gap-6 shadow-2xl"
      >
         <div className="flex items-center gap-6">
            <div className="h-14 w-14 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-900/40">
               <TrendingUp className="h-7 w-7" />
            </div>
            <div>
               <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mb-1">Scope Synthesis</p>
               <h3 className="text-2xl font-black tabular-nums italic tracking-tighter">₹{filteredValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h3>
            </div>
         </div>
         <div className="flex gap-4">
            <div className="text-right">
               <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mb-1">Signal Count</p>
               <h4 className="text-xl font-black tabular-nums tracking-tighter">{totalCount} Matches</h4>
            </div>
         </div>
      </motion.div>

      <AnimatePresence>
      {showFilters && (
        <motion.div 
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="overflow-hidden"
        >
          <div className="rounded-[2.5rem] border border-slate-100 bg-white p-10 shadow-2xl ring-1 ring-slate-900/5 mb-10">
            <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-4">
               <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Channel Target</label>
                  <select value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)} className="mt-4 w-full rounded-2xl bg-slate-50 text-xs font-bold py-4 px-4 border-none focus:ring-2 focus:ring-indigo-600">
                    <option value="all">Global Archive</option>
                    <option value="cash">Cash Ledger</option>
                    <option value="bank">Bank Wire</option>
                    <option value="upi">UPI/Network</option>
                  </select>
               </div>
               <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Value Bounds (₹)</label>
                  <div className="mt-4 flex gap-3">
                    <input type="number" placeholder="Min" value={minAmount} onChange={(e) => setMinAmount(e.target.value)} className="w-full rounded-2xl bg-slate-50 py-4 px-4 text-xs font-bold border-none" />
                    <input type="number" placeholder="Max" value={maxAmount} onChange={(e) => setMaxAmount(e.target.value)} className="w-full rounded-2xl bg-slate-50 py-4 px-4 text-xs font-bold border-none" />
                  </div>
               </div>
               <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Time Window</label>
                  <div className="mt-4 flex gap-3">
                    <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full rounded-2xl bg-slate-50 py-4 px-4 text-[10px] font-bold border-none" />
                    <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full rounded-2xl bg-slate-50 py-4 px-4 text-[10px] font-bold border-none" />
                  </div>
               </div>
               <div className="flex items-end">
                  <button onClick={resetFilters} className="w-full rounded-2xl bg-slate-950 py-4 text-[10px] font-black uppercase text-white tracking-[0.2em] shadow-lg active:scale-95 transition-transform">
                    Reset Signals
                  </button>
               </div>
            </div>
          </div>
        </motion.div>
      )}
      </AnimatePresence>

      <div className="relative group">
        <div className="absolute left-8 top-1/2 -translate-y-1/2">
           <Search className="h-6 w-6 text-slate-300 group-focus-within:text-indigo-600 transition-colors" />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by Payer Entity, Branch, or UTR Network ID..."
          className="h-20 w-full rounded-[2.5rem] border-none bg-white pl-20 pr-10 text-slate-900 shadow-sm ring-1 ring-slate-200 placeholder:text-slate-300 focus:ring-8 focus:ring-indigo-600/5 text-xl font-medium tracking-tight"
        />
      </div>

      <div className="hidden md:block overflow-hidden rounded-[3rem] border border-slate-200 bg-white shadow-xl min-h-[400px]">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
             <RefreshCw className="h-8 w-8 animate-spin text-indigo-600" />
          </div>
        ) : transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center">
             <Inbox className="h-16 w-16 text-slate-100 mb-6" />
             <h3 className="text-xl font-black text-slate-900 tracking-tight">Zero Matches</h3>
             <p className="mt-2 text-sm text-slate-400 font-medium max-w-xs">The cryptographically verified ledger has no records matching your current criteria.</p>
             <button onClick={resetFilters} className="mt-8 text-[10px] font-black uppercase tracking widest text-indigo-600 hover:underline">Clear all filters</button>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-slate-100">
            <thead className="bg-slate-50/50">
              <tr>
                <th className="px-10 py-6 text-left text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Timestamp</th>
                <th className="px-10 py-6 text-left text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Entity Source</th>
                <th className="px-10 py-6 text-left text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Channel</th>
                <th className="px-10 py-6 text-right text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Settled Value</th>
                <th className="w-10 px-10 py-6"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              <AnimatePresence mode="popLayout">
              {transactions.map((tx, idx) => (
                <motion.tr 
                  key={tx.id} 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ delay: Math.min(idx * 0.03, 0.3) }}
                  onClick={() => navigate(`/admin/transactions/${tx.id}`)}
                  className="group cursor-pointer transition-colors hover:bg-indigo-50/20"
                >
                  <td className="whitespace-nowrap px-10 py-8">
                    <div className="text-sm font-black text-slate-900 tracking-tight tabular-nums">{new Date(tx.created_at).toLocaleDateString()}</div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 opacity-60 tabular-nums">{new Date(tx.created_at).toLocaleTimeString()}</div>
                  </td>
                  <td className="px-10 py-8">
                    <div className="flex items-center gap-5">
                      <div className="h-12 w-12 flex items-center justify-center rounded-2xl bg-slate-50 text-slate-400 group-hover:bg-white group-hover:shadow-md transition-all">
                         <Building className="h-6 w-6" />
                      </div>
                      <div>
                        <div className="text-base font-black text-slate-900 tracking-tight">{tx.source}</div>
                        <div 
                          onClick={(e) => handleCopy(e, tx.reference_id || 'LOCAL')}
                          className="font-mono text-[10px] text-slate-400 uppercase tracking-widest mt-1 flex items-center gap-2 hover:text-indigo-600 transition-colors"
                        >
                          {tx.reference_id || 'LOCAL_AUDIT'}
                          {copyId === (tx.reference_id || 'LOCAL') ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3 opacity-30" />}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-10 py-8">
                    <span className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm ring-1 ring-inset
                      ${tx.payment_mode === 'cash' ? 'bg-emerald-50 text-emerald-700 ring-emerald-100' : 
                        tx.payment_mode === 'upi' ? 'bg-sky-50 text-sky-700 ring-sky-100' : 'bg-indigo-50 text-indigo-700 ring-indigo-100'}`}>
                      {tx.payment_mode}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-10 py-8 text-right font-mono text-xl font-black text-slate-900 tracking-tighter italic tabular-nums">
                    ₹{tx.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-10 py-8 text-right">
                     <MoreHorizontal className="h-5 w-5 text-slate-200 group-hover:text-slate-900 transition-colors" />
                  </td>
                </motion.tr>
              ))}
              </AnimatePresence>
            </tbody>
          </table>
        )}
      </div>

      <div className="flex items-center justify-between py-6 px-2">
         <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-300">
           Found <span className="text-slate-900 mx-1 tabular-nums">{totalCount}</span> Archive Files
         </p>
         <div className="flex items-center gap-3">
            <motion.button whileTap={{ scale: 0.9 }} onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="h-12 w-12 flex items-center justify-center rounded-2xl bg-white border border-slate-200 disabled:opacity-20 shadow-sm"><ChevronLeft className="h-5 w-5" /></motion.button>
            <div className="h-12 min-w-[3rem] px-5 flex items-center justify-center rounded-2xl bg-slate-950 text-white font-black text-xs tracking-widest italic shadow-xl tabular-nums">
              {page} / {totalPages || 1}
            </div>
            <motion.button whileTap={{ scale: 0.9 }} onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages || totalCount === 0} className="h-12 w-12 flex items-center justify-center rounded-2xl bg-white border border-slate-200 disabled:opacity-20 shadow-sm"><ChevronRight className="h-5 w-5" /></motion.button>
         </div>
      </div>
    </motion.div>
  );
}
