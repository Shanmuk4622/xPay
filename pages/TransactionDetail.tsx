import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { formatCurrency, formatDate, getCategoryIcon, getCategoryColor } from '../lib/utils';

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
  created_at: string;
}

// Helper to normalize transaction
function normalizeTransaction(raw: RawTransaction): Transaction {
  return {
    id: raw.id,
    amount: raw.amount,
    created_at: raw.created_at,
    type: raw.type || raw.metadata?.type || 'expense',
    category: raw.category || raw.metadata?.category || raw.source || 'other',
    description: raw.description || raw.metadata?.description || raw.source || '',
    date: raw.date || raw.metadata?.date || raw.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
  };
}

export default function TransactionDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (user && id) fetchTransaction();
  }, [user, id]);

  const fetchTransaction = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('id', id)
        .eq('user_id', user?.id)
        .single();

      if (error) throw error;
      setTransaction(normalizeTransaction(data as RawTransaction));
    } catch (err) {
      showToast('error', 'Transaction not found');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const { error } = await supabase.from('transactions').delete().eq('id', id);
      if (error) throw error;
      showToast('success', 'Transaction deleted successfully');
      navigate('/dashboard');
    } catch (err: any) {
      showToast('error', err.message || 'Failed to delete transaction');
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto animate-fade-in">
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100">
          <div className="space-y-4">
            <div className="skeleton-shimmer h-8 w-1/2 rounded"></div>
            <div className="skeleton-shimmer h-4 w-1/4 rounded"></div>
            <div className="skeleton-shimmer h-24 w-full rounded-xl"></div>
            <div className="space-y-3">
              <div className="skeleton-shimmer h-12 w-full rounded-xl"></div>
              <div className="skeleton-shimmer h-12 w-full rounded-xl"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!transaction) {
    return (
      <div className="max-w-2xl mx-auto animate-fade-in">
        <div className="bg-white rounded-2xl p-12 shadow-sm border border-slate-100 text-center">
          <div className="text-5xl mb-4">🔍</div>
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Transaction Not Found</h2>
          <p className="text-slate-500 mb-6">This transaction may have been deleted or doesn't exist.</p>
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-500 text-white font-medium rounded-xl hover:bg-blue-600 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="p-2.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
          aria-label="Go back"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-2xl font-bold text-slate-900">Transaction Details</h1>
      </div>

      {/* Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {/* Amount Header */}
        <div className={`p-8 text-center ${transaction.type === 'income' ? 'bg-gradient-to-br from-green-500 to-emerald-600' : 'bg-gradient-to-br from-red-500 to-rose-600'}`}>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/20 backdrop-blur-sm rounded-full text-white text-sm font-medium mb-4 capitalize">
            {transaction.type === 'income' ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 13l-5 5m0 0l-5-5m5 5V6" />
              </svg>
            )}
            {transaction.type}
          </div>
          <p className="text-5xl font-bold text-white stat-value">
            {transaction.type === 'expense' ? '-' : '+'}{formatCurrency(transaction.amount)}
          </p>
        </div>

        {/* Category Badge */}
        <div className="flex justify-center -mt-6 relative z-10">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-lg ${getCategoryColor(transaction.category)} border-4 border-white`}>
            {getCategoryIcon(transaction.category)}
          </div>
        </div>

        {/* Details */}
        <div className="p-6 pt-4 space-y-0">
          <DetailRow label="Category" value={transaction.category} capitalize />
          <DetailRow label="Date" value={formatDate(transaction.date, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} />
          {transaction.description && (
            <DetailRow label="Description" value={transaction.description} />
          )}
          <DetailRow 
            label="Created" 
            value={formatDate(transaction.created_at, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })} 
            last 
          />
        </div>

        {/* Actions */}
        <div className="p-6 bg-slate-50 border-t border-slate-100">
          {showDeleteConfirm ? (
            <div className="animate-scale-in">
              <p className="text-center text-slate-600 mb-4">Are you sure you want to delete this transaction?</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-3 px-4 bg-slate-200 text-slate-700 font-semibold rounded-xl hover:bg-slate-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex-1 py-3 px-4 bg-red-500 text-white font-semibold rounded-xl hover:bg-red-600 disabled:opacity-50 transition-colors"
                >
                  {deleting ? 'Deleting...' : 'Yes, Delete'}
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full py-3 px-4 bg-red-100 text-red-600 font-semibold rounded-xl hover:bg-red-200 transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete Transaction
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value, capitalize, last }: { label: string; value: string; capitalize?: boolean; last?: boolean }) {
  return (
    <div className={`flex justify-between py-4 ${!last ? 'border-b border-slate-100' : ''}`}>
      <span className="text-slate-500">{label}</span>
      <span className={`font-medium text-slate-900 text-right max-w-[60%] ${capitalize ? 'capitalize' : ''}`}>
        {value}
      </span>
    </div>
  );
}

