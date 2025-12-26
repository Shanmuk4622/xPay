import React, { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { formatCurrency, formatDate, getCategoryIcon, getCategoryColor } from '../lib/utils';
import { useDebounce } from '../hooks/useDebounce';

// Raw transaction from database
interface RawTransaction {
  id: string;
  amount: number;
  source?: string;
  payment_mode?: string;
  metadata?: {
    type?: 'income' | 'expense';
    category?: string;
    description?: string;
    date?: string;
  };
  created_at: string;
  type?: 'income' | 'expense';
  category?: string;
  description?: string;
  date?: string;
}

interface Transaction {
  id: string;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  description: string;
  date: string;
}

// Helper to normalize transaction
function normalizeTransaction(raw: RawTransaction): Transaction {
  return {
    id: raw.id,
    amount: raw.amount,
    type: raw.type || raw.metadata?.type || 'expense',
    category: raw.category || raw.metadata?.category || raw.source || 'other',
    description: raw.description || raw.metadata?.description || raw.source || '',
    date: raw.date || raw.metadata?.date || raw.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
  };
}

export default function AdminSearch() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [filters, setFilters] = useState({
    type: 'all' as 'all' | 'income' | 'expense',
    category: 'all',
    dateFrom: '',
    dateTo: '',
    minAmount: '',
    maxAmount: '',
  });
  const [showFilters, setShowFilters] = useState(false);

  const debouncedSearch = useDebounce(searchQuery, 300);

  const categories = [
    'food', 'transport', 'shopping', 'entertainment', 'bills',
    'health', 'education', 'salary', 'investment', 'freelance', 'gift', 'other'
  ];

  const search = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setHasSearched(true);

    try {
      let query = supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      // Apply text search on source column (works with existing schema)
      if (debouncedSearch.trim()) {
        query = query.ilike('source', `%${debouncedSearch}%`);
      }

      // Apply amount filters (these always work)
      if (filters.minAmount) {
        query = query.gte('amount', parseFloat(filters.minAmount));
      }
      if (filters.maxAmount) {
        query = query.lte('amount', parseFloat(filters.maxAmount));
      }

      const { data, error } = await query.limit(100);

      if (error) throw error;
      
      // Normalize and filter results client-side for type/category
      let results = (data || []).map((raw: RawTransaction) => normalizeTransaction(raw));
      
      // Apply type and category filters client-side
      if (filters.type !== 'all') {
        results = results.filter(t => t.type === filters.type);
      }
      if (filters.category !== 'all') {
        results = results.filter(t => t.category === filters.category);
      }
      if (filters.dateFrom) {
        results = results.filter(t => t.date >= filters.dateFrom);
      }
      if (filters.dateTo) {
        results = results.filter(t => t.date <= filters.dateTo);
      }
      
      setTransactions(results);
    } catch (err: any) {
      console.error('Search error:', err);
      showToast('error', 'Search failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [user, debouncedSearch, filters]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    search();
  };

  const clearFilters = () => {
    setFilters({
      type: 'all',
      category: 'all',
      dateFrom: '',
      dateTo: '',
      minAmount: '',
      maxAmount: '',
    });
  };

  const activeFilterCount = Object.entries(filters).filter(
    ([key, value]) => value !== 'all' && value !== ''
  ).length;

  const totalAmount = transactions.reduce((sum, t) => {
    return t.type === 'income' ? sum + t.amount : sum - t.amount;
  }, 0);

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Search Transactions</h1>
        <p className="text-slate-500 mt-1">Find and filter your transaction history</p>
      </div>

      {/* Search Form */}
      <form onSubmit={handleSearch} className="mb-6">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by description or category..."
                className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-3.5 rounded-xl font-medium transition-colors flex items-center gap-2 ${
                showFilters || activeFilterCount > 0
                  ? 'bg-blue-100 text-blue-600'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              Filters
              {activeFilterCount > 0 && (
                <span className="w-5 h-5 bg-blue-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3.5 bg-blue-500 text-white font-semibold rounded-xl hover:bg-blue-600 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Searching...' : 'Search'}
            </button>
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-slate-100 animate-slide-down">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="filter-type" className="block text-sm font-medium text-slate-700 mb-1.5">Type</label>
                  <select
                    id="filter-type"
                    title="Filter by type"
                    value={filters.type}
                    onChange={(e) => setFilters({ ...filters, type: e.target.value as any })}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Types</option>
                    <option value="income">Income</option>
                    <option value="expense">Expense</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="filter-category" className="block text-sm font-medium text-slate-700 mb-1.5">Category</label>
                  <select
                    id="filter-category"
                    title="Filter by category"
                    value={filters.category}
                    onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 capitalize"
                  >
                    <option value="all">All Categories</option>
                    {categories.map((cat) => (
                      <option key={cat} value={cat} className="capitalize">{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="filter-date-from" className="block text-sm font-medium text-slate-700 mb-1.5">Date From</label>
                  <input
                    id="filter-date-from"
                    type="date"
                    title="Filter from date"
                    value={filters.dateFrom}
                    onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label htmlFor="filter-date-to" className="block text-sm font-medium text-slate-700 mb-1.5">Date To</label>
                  <input
                    id="filter-date-to"
                    type="date"
                    title="Filter to date"
                    value={filters.dateTo}
                    onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label htmlFor="filter-min-amount" className="block text-sm font-medium text-slate-700 mb-1.5">Min Amount</label>
                  <input
                    id="filter-min-amount"
                    type="number"
                    value={filters.minAmount}
                    onChange={(e) => setFilters({ ...filters, minAmount: e.target.value })}
                    placeholder="$0"
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label htmlFor="filter-max-amount" className="block text-sm font-medium text-slate-700 mb-1.5">Max Amount</label>
                  <input
                    id="filter-max-amount"
                    type="number"
                    value={filters.maxAmount}
                    onChange={(e) => setFilters({ ...filters, maxAmount: e.target.value })}
                    placeholder="$∞"
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              {activeFilterCount > 0 && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="mt-4 text-sm text-blue-500 hover:text-blue-600 font-medium"
                >
                  Clear all filters
                </button>
              )}
            </div>
          )}
        </div>
      </form>

      {/* Results */}
      {loading ? (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="skeleton-shimmer w-12 h-12 rounded-xl"></div>
                <div className="flex-1 space-y-2">
                  <div className="skeleton-shimmer h-4 w-1/3 rounded"></div>
                  <div className="skeleton-shimmer h-3 w-1/2 rounded"></div>
                </div>
                <div className="skeleton-shimmer h-6 w-20 rounded"></div>
              </div>
            ))}
          </div>
        </div>
      ) : hasSearched ? (
        <div className="space-y-4">
          {/* Summary */}
          {transactions.length > 0 && (
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex items-center justify-between">
              <span className="text-slate-600">
                Found <span className="font-semibold text-slate-900">{transactions.length}</span> transaction{transactions.length !== 1 ? 's' : ''}
              </span>
              <span className={`font-semibold ${totalAmount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                Net: {totalAmount >= 0 ? '+' : ''}{formatCurrency(totalAmount)}
              </span>
            </div>
          )}

          {/* Transaction List */}
          {transactions.length > 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden divide-y divide-slate-100">
              {transactions.map((t, idx) => (
                <Link
                  key={t.id}
                  to={`/transaction/${t.id}`}
                  className="flex items-center gap-4 p-4 hover:bg-slate-50 transition-colors"
                  style={{ animationDelay: `${idx * 30}ms` }}
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl ${getCategoryColor(t.category)}`}>
                    {getCategoryIcon(t.category)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 capitalize truncate">
                      {t.description || t.category}
                    </p>
                    <p className="text-sm text-slate-500">
                      {formatDate(t.date)} · <span className="capitalize">{t.category}</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                      {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                    </p>
                    <p className="text-xs text-slate-400 capitalize">{t.type}</p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-12 shadow-sm border border-slate-100 text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-1">No transactions found</h3>
              <p className="text-slate-500">Try adjusting your search or filters</p>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl p-12 shadow-sm border border-slate-100 text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-1">Search your transactions</h3>
          <p className="text-slate-500">Enter a search term or apply filters to find transactions</p>
        </div>
      )}
    </div>
  );
}
