import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, ArrowLeft, ChevronLeft, ChevronRight, Calendar, Download, RefreshCw, Hash } from 'lucide-react';
import { useDebounce } from '../hooks/useDebounce';

interface Transaction {
  id: string;
  amount: number;
  payment_mode: 'cash' | 'bank' | 'upi';
  reference_id: string | null;
  source: string;
  created_at: string;
  created_by: string;
  branch_id?: string | null;
}

const PAGE_SIZE = 10;

export default function AdminSearch() {
  const navigate = useNavigate();
  
  // Data State
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  
  // Filter State
  const [searchQuery, setSearchQuery] = useState(''); // Search Ref ID or Source
  
  // Use custom hook for debouncing
  const debouncedQuery = useDebounce(searchQuery, 500);

  const [paymentMode, setPaymentMode] = useState<string>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  
  // Pagination State
  const [page, setPage] = useState(1);

  // Reset page when search query changes (debounced)
  useEffect(() => {
    setPage(1);
  }, [debouncedQuery]);

  const buildQuery = (isExport = false) => {
      let query = supabase
        .from('transactions')
        .select('*', { count: isExport ? undefined : 'exact' });

      // 1. Text Search (Source or Reference ID) - Uses Debounced Query
      if (debouncedQuery.trim()) {
        const term = debouncedQuery.trim();
        query = query.or(`source.ilike.%${term}%,reference_id.ilike.%${term}%`);
      }

      // 2. Payment Mode
      if (paymentMode !== 'all') {
        query = query.eq('payment_mode', paymentMode);
      }

      // 3. Date Range (Local Timezone Aware)
      if (startDate) {
        // Construct local date at 00:00:00
        const [y, m, d] = startDate.split('-').map(Number);
        const localStart = new Date(y, m - 1, d, 0, 0, 0, 0);
        query = query.gte('created_at', localStart.toISOString());
      }
      if (endDate) {
        // Construct local date at 23:59:59.999
        const [y, m, d] = endDate.split('-').map(Number);
        const localEnd = new Date(y, m - 1, d, 23, 59, 59, 999);
        query = query.lte('created_at', localEnd.toISOString());
      }

      // 4. Amount Range
      if (minAmount) {
        const min = parseFloat(minAmount);
        if (!isNaN(min)) {
           query = query.gte('amount', min);
        }
      }
      if (maxAmount) {
        const max = parseFloat(maxAmount);
        if (!isNaN(max)) {
           query = query.lte('amount', max);
        }
      }
      
      return query;
  };

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      let query = buildQuery();

      // 5. Pagination & Sorting
      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      
      const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;

      setTransactions(data || []);
      setTotalCount(count || 0);

    } catch (err) {
      console.error('Error fetching transactions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
        const query = buildQuery(true);
        // Apply sorting but no pagination
        const { data, error } = await query.order('created_at', { ascending: false });

        if (error) throw error;

        if (!data || data.length === 0) {
            alert('No data to export matching current filters.');
            return;
        }

        // CSV Generation
        const headers = ['Transaction ID', 'Date', 'Time', 'Source', 'Reference ID', 'Payment Mode', 'Amount', 'Created By', 'Branch ID'];
        const csvRows = [headers.join(',')];

        for (const row of data) {
            const date = new Date(row.created_at);
            const dateStr = date.toLocaleDateString();
            const timeStr = date.toLocaleTimeString();
            
            // Escape quotes for CSV
            const safeSource = `"${(row.source || '').replace(/"/g, '""')}"`;
            const safeRef = `"${(row.reference_id || '').replace(/"/g, '""')}"`;
            
            const values = [
                row.id,
                dateStr,
                timeStr,
                safeSource,
                safeRef,
                row.payment_mode,
                row.amount,
                row.created_by,
                row.branch_id || ''
            ];
            csvRows.push(values.join(','));
        }

        const csvContent = csvRows.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `transactions_export_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

    } catch (err) {
        console.error('Export failed:', err);
        alert('Failed to export data.');
    } finally {
        setExporting(false);
    }
  };

  // Fetch on mount, when Page changes, or when Debounced Query changes
  useEffect(() => {
    fetchTransactions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, debouncedQuery]); 

  // Handle "Apply Filters" (Manual Override)
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // debouncedQuery updates automatically, we just reset page and fetch
    setPage(1);
    fetchTransactions();
  };

  const handleReset = () => {
    setSearchQuery('');
    setPaymentMode('all');
    setStartDate('');
    setEndDate('');
    setMinAmount('');
    setMaxAmount('');
    setPage(1);
    // Effects will handle re-fetch since debouncedQuery will change
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="mx-auto max-w-7xl">
        
        {/* Header */}
        <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center">
             <button onClick={() => navigate('/')} className="mr-4 rounded-full p-2 hover:bg-gray-200">
                <ArrowLeft className="h-5 w-5 text-gray-600" />
             </button>
             <div>
                <h1 className="text-2xl font-bold text-gray-900">Transaction Search</h1>
                <p className="text-sm text-gray-500">Search, filter, and review system transactions.</p>
             </div>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={handleExport}
              disabled={exporting || loading}
              className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              <Download className={`mr-2 h-4 w-4 ${exporting ? 'animate-bounce' : ''}`} />
              {exporting ? 'Exporting...' : 'Export CSV'}
            </button>
            <button 
              onClick={() => fetchTransactions()}
              disabled={loading}
              className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Filter Card */}
        <div className="mb-8 rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-900/5">
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              
              {/* Text Search */}
              <div className="col-span-1 sm:col-span-2">
                <label className="block text-xs font-medium text-gray-500 uppercase">Search</label>
                <div className="relative mt-1">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <Search className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Reference ID or Source Name..."
                    className="block w-full rounded-md border-gray-300 pl-10 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>
              </div>

              {/* Payment Mode */}
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase">Mode</label>
                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                >
                  <option value="all">All Modes</option>
                  <option value="cash">Cash</option>
                  <option value="bank">Bank Transfer</option>
                  <option value="upi">UPI</option>
                </select>
              </div>

               {/* Amount Range */}
               <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase">Amount Range</label>
                  <div className="mt-1 flex items-center space-x-2">
                      <input
                        type="number"
                        placeholder="Min"
                        value={minAmount}
                        onChange={(e) => setMinAmount(e.target.value)}
                        className="block w-full rounded-md border-gray-300 sm:text-sm px-2 py-2"
                      />
                      <span className="text-gray-400">-</span>
                      <input
                        type="number"
                        placeholder="Max"
                        value={maxAmount}
                        onChange={(e) => setMaxAmount(e.target.value)}
                        className="block w-full rounded-md border-gray-300 sm:text-sm px-2 py-2"
                      />
                  </div>
              </div>

              {/* Date From */}
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase">From Date</label>
                <div className="relative mt-1 rounded-md shadow-sm">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <Calendar className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="block w-full rounded-md border-gray-300 py-2 pl-10 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>
              </div>

              {/* Date To */}
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase">To Date</label>
                <div className="relative mt-1 rounded-md shadow-sm">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <Calendar className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="block w-full rounded-md border-gray-300 py-2 pl-10 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-end space-x-2 sm:col-span-2 lg:col-span-4 lg:justify-end">
                <button
                  type="button"
                  onClick={handleReset}
                  className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none"
                >
                  Clear
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                >
                  <Filter className="mr-2 h-4 w-4" />
                  Apply Filters
                </button>
              </div>

            </div>
          </form>
        </div>

        {/* Results Table */}
        <div className="overflow-hidden rounded-lg bg-white shadow ring-1 ring-black ring-opacity-5">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-300">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">Date</th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Source</th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Ref ID</th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Mode</th>
                  <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {loading ? (
                   <tr>
                     <td colSpan={5} className="py-10 text-center">
                        <div className="flex justify-center">Loading data...</div>
                     </td>
                   </tr>
                ) : transactions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-gray-500">
                       No transactions found matching your filters.
                    </td>
                  </tr>
                ) : (
                  transactions.map((tx) => (
                    <tr 
                      key={tx.id} 
                      onClick={() => navigate(`/admin/transactions/${tx.id}`)}
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm text-gray-500 sm:pl-6">
                        {new Date(tx.created_at).toLocaleDateString()}
                        <div className="text-xs text-gray-400">{new Date(tx.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm font-medium text-gray-900">
                        {tx.source}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 font-mono">
                         {tx.reference_id || '-'}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize 
                          ${tx.payment_mode === 'cash' ? 'bg-green-100 text-green-800' : 
                            tx.payment_mode === 'upi' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>
                          {tx.payment_mode}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-right text-sm font-bold text-gray-900">
                        ₹{tx.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination Footer */}
          {totalCount > 0 && (
            <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
                <div className="flex flex-1 justify-between sm:hidden">
                    <button
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400"
                    >
                        Previous
                    </button>
                    <button
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400"
                    >
                        Next
                    </button>
                </div>
                <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                    <div>
                        <p className="text-sm text-gray-700">
                            Showing <span className="font-medium">{(page - 1) * PAGE_SIZE + 1}</span> to <span className="font-medium">{Math.min(page * PAGE_SIZE, totalCount)}</span> of <span className="font-medium">{totalCount}</span> results
                        </p>
                    </div>
                    <div>
                        <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:bg-gray-50"
                            >
                                <span className="sr-only">Previous</span>
                                <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                            </button>
                            {/* Simple Page Indicator */}
                            <span className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 focus:outline-offset-0">
                                Page {page} of {totalPages}
                            </span>
                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                                className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:bg-gray-50"
                            >
                                <span className="sr-only">Next</span>
                                <ChevronRight className="h-5 w-5" aria-hidden="true" />
                            </button>
                        </nav>
                    </div>
                </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}