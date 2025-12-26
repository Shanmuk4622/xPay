import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { formatCurrency, formatDate, formatRelativeDate, getCategoryIcon, getCategoryColor } from '../lib/utils';

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
  // New schema columns (may or may not exist)
  type?: 'income' | 'expense';
  category?: string;
  description?: string;
  date?: string;
}

// Normalized transaction for UI
interface Transaction {
  id: string;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  description: string;
  date: string;
  created_at: string;
}

// Helper to normalize transaction from either schema
function normalizeTransaction(raw: RawTransaction): Transaction {
  return {
    id: raw.id,
    amount: raw.amount,
    created_at: raw.created_at,
    // Prefer direct columns, fallback to metadata
    type: raw.type || raw.metadata?.type || (raw.amount >= 0 ? 'expense' : 'income'),
    category: raw.category || raw.metadata?.category || raw.source || 'other',
    description: raw.description || raw.metadata?.description || raw.source || '',
    date: raw.date || raw.metadata?.date || raw.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
  };
}

interface Stats {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  transactionCount: number;
  monthlyChange: number;
}


export default function Dashboard() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stats, setStats] = useState<Stats>({ 
    totalIncome: 0, 
    totalExpense: 0, 
    balance: 0, 
    transactionCount: 0,
    monthlyChange: 0 
  });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'income' | 'expense'>('all');

  const fetchData = useCallback(async () => {
    if (!user) return;
    
    try {
      setLoading(true);

      // Single query to get all transactions
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Fetch transactions error:', error);
        throw error;
      }

      // Normalize all transactions to handle both old and new schema
      const all = (data || []).map((raw: RawTransaction) => normalizeTransaction(raw));
      
      // Show only recent 20 in list
      setTransactions(all.slice(0, 20));

      // Calculate stats from all transactions
      const income = all.filter((t) => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
      const expense = all.filter((t) => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
      
      // Calculate monthly change
      const now = new Date();
      const thisMonth = now.getMonth();
      const lastMonth = thisMonth === 0 ? 11 : thisMonth - 1;
      const thisYear = now.getFullYear();
      const lastMonthYear = thisMonth === 0 ? thisYear - 1 : thisYear;

      const thisMonthExpense = all.filter((t) => {
        const d = new Date(t.date);
        return t.type === 'expense' && d.getMonth() === thisMonth && d.getFullYear() === thisYear;
      }).reduce((s, t) => s + t.amount, 0);

      const lastMonthExpense = all.filter((t) => {
        const d = new Date(t.date);
        return t.type === 'expense' && d.getMonth() === lastMonth && d.getFullYear() === lastMonthYear;
      }).reduce((s, t) => s + t.amount, 0);

      const change = lastMonthExpense > 0 
        ? Math.round(((thisMonthExpense - lastMonthExpense) / lastMonthExpense) * 100)
        : 0;

      setStats({
        totalIncome: income,
        totalExpense: expense,
        balance: income - expense,
        transactionCount: all.length,
        monthlyChange: change,
      });
    } catch (err: any) {
      console.error('Dashboard fetch error:', err);
      showToast('error', err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [user, showToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredTransactions = transactions.filter((t) => {
    if (filter === 'all') return true;
    return t.type === filter;
  });

  const StatCard = ({ 
    title, 
    value, 
    icon, 
    color, 
    trend 
  }: { 
    title: string; 
    value: string; 
    icon: React.ReactNode; 
    color: string;
    trend?: { value: number; positive: boolean };
  }) => (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 card-hover">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-medium text-slate-500">{title}</span>
        <div className={`w-11 h-11 ${color} rounded-xl flex items-center justify-center`}>
          {icon}
        </div>
      </div>
      <p className="text-2xl font-bold text-slate-900 stat-value">{value}</p>
      {trend && (
        <div className="flex items-center gap-1 mt-1">
          <span className={`text-xs font-medium ${trend.positive ? 'text-red-500' : 'text-green-500'}`}>
            {trend.positive ? '↑' : '↓'} {Math.abs(trend.value)}%
          </span>
          <span className="text-xs text-slate-400">vs last month</span>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-500 mt-1">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            to="/scan-receipt"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-100 text-slate-700 font-medium rounded-xl hover:bg-slate-200 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            </svg>
            <span className="hidden sm:inline">Scan</span>
          </Link>
          <Link
            to="/new-transaction"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 transition-all btn-press"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <span className="hidden sm:inline">Add Transaction</span>
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          [...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
              <div className="skeleton-shimmer h-4 w-20 rounded mb-4"></div>
              <div className="skeleton-shimmer h-8 w-32 rounded"></div>
            </div>
          ))
        ) : (
          <>
            <StatCard
              title="Balance"
              value={formatCurrency(stats.balance)}
              color="bg-blue-100"
              icon={<svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            />
            <StatCard
              title="Income"
              value={formatCurrency(stats.totalIncome)}
              color="bg-green-100"
              icon={<svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" /></svg>}
            />
            <StatCard
              title="Expenses"
              value={formatCurrency(stats.totalExpense)}
              color="bg-red-100"
              icon={<svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 13l-5 5m0 0l-5-5m5 5V6" /></svg>}
              trend={stats.monthlyChange !== 0 ? { value: stats.monthlyChange, positive: stats.monthlyChange > 0 } : undefined}
            />
            <StatCard
              title="Transactions"
              value={stats.transactionCount.toString()}
              color="bg-purple-100"
              icon={<svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>}
            />
          </>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { to: '/new-transaction', title: 'Add Transaction', desc: 'Record income or expense', icon: '➕', color: 'blue' },
          { to: '/scan-receipt', title: 'Scan Receipt', desc: 'AI-powered extraction', icon: '📷', color: 'green' },
          { to: '/ai-audit', title: 'AI Audit', desc: 'Smart spending analysis', icon: '🤖', color: 'purple' },
        ].map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className={`flex items-center gap-4 p-5 bg-white rounded-2xl border border-slate-100 hover:border-${item.color}-200 hover:bg-${item.color}-50/50 transition-all group card-hover`}
          >
            <div className={`w-12 h-12 bg-${item.color}-100 rounded-xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform`}>
              {item.icon}
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">{item.title}</h3>
              <p className="text-sm text-slate-500">{item.desc}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Recent Transactions */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-slate-900">Recent Transactions</h2>
          <div className="flex bg-slate-100 rounded-xl p-1">
            {(['all', 'income', 'expense'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-all capitalize ${
                  filter === f ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="p-6 space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="skeleton-shimmer w-12 h-12 rounded-xl"></div>
                <div className="flex-1">
                  <div className="skeleton-shimmer h-4 w-32 rounded mb-2"></div>
                  <div className="skeleton-shimmer h-3 w-24 rounded"></div>
                </div>
                <div className="skeleton-shimmer h-5 w-20 rounded"></div>
              </div>
            ))}
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-5xl mb-4">💸</div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              {filter === 'all' ? 'No transactions yet' : `No ${filter} transactions`}
            </h3>
            <p className="text-slate-500 mb-6">
              {filter === 'all' 
                ? 'Start tracking your finances by adding your first transaction.'
                : `You haven't recorded any ${filter} transactions.`}
            </p>
            <Link
              to="/new-transaction"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-500 text-white font-medium rounded-xl hover:bg-blue-600 transition-colors btn-press"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add Transaction
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredTransactions.map((txn, index) => (
              <Link
                key={txn.id}
                to={`/transaction/${txn.id}`}
                className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50 transition-colors animate-slide-up"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl ${getCategoryColor(txn.category)}`}>
                  {getCategoryIcon(txn.category)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900 truncate">{txn.description || txn.category}</p>
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <span className="capitalize">{txn.category}</span>
                    <span>•</span>
                    <span>{formatRelativeDate(txn.date)}</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`font-semibold ${txn.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                    {txn.type === 'income' ? '+' : '-'}{formatCurrency(txn.amount)}
                  </span>
                </div>
                <svg className="w-5 h-5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
