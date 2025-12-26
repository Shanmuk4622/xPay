import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const categories = [
  { value: 'food', label: 'Food & Dining', icon: '🍔', type: 'expense' },
  { value: 'transport', label: 'Transportation', icon: '🚗', type: 'expense' },
  { value: 'shopping', label: 'Shopping', icon: '🛍️', type: 'expense' },
  { value: 'entertainment', label: 'Entertainment', icon: '🎬', type: 'expense' },
  { value: 'bills', label: 'Bills & Utilities', icon: '📄', type: 'expense' },
  { value: 'health', label: 'Healthcare', icon: '🏥', type: 'expense' },
  { value: 'education', label: 'Education', icon: '📚', type: 'expense' },
  { value: 'salary', label: 'Salary', icon: '💰', type: 'income' },
  { value: 'investment', label: 'Investment', icon: '📈', type: 'income' },
  { value: 'freelance', label: 'Freelance', icon: '💼', type: 'income' },
  { value: 'gift', label: 'Gift', icon: '🎁', type: 'both' },
  { value: 'other', label: 'Other', icon: '📦', type: 'both' },
];

export default function NewTransaction() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ amount?: string; category?: string }>({});

  const filteredCategories = categories.filter(
    (c) => c.type === 'both' || c.type === type
  );

  const validate = (): boolean => {
    const newErrors: { amount?: string; category?: string } = {};
    
    if (!amount || parseFloat(amount) <= 0) {
      newErrors.amount = 'Please enter a valid amount';
    }
    
    if (!category) {
      newErrors.category = 'Please select a category';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      showToast('error', 'You must be logged in to add transactions');
      return;
    }
    if (!validate()) return;

    setLoading(true);

    try {
      // Use metadata to store category, type, date since columns may not exist
      const transactionData = {
        user_id: user.id,
        amount: parseFloat(amount),
        // Core fields that should exist
        source: description.trim() || category,
        payment_mode: 'cash', // default payment mode
        // Store additional data in metadata
        metadata: {
          type,
          category,
          description: description.trim() || null,
          date,
        },
      };

      const { data, error } = await supabase
        .from('transactions')
        .insert(transactionData)
        .select()
        .single();

      if (error) {
        console.error('Transaction insert error:', error);
        throw error;
      }
      
      console.log('Transaction created:', data);
      showToast('success', `${type === 'income' ? 'Income' : 'Expense'} added successfully!`);
      navigate('/dashboard');
    } catch (err: any) {
      console.error('Transaction error:', err);
      let message = 'Failed to create transaction';
      if (err.message?.includes('violates row-level security')) {
        message = 'Permission denied. Please try logging in again.';
      } else if (err.message?.includes('duplicate')) {
        message = 'This transaction already exists';
      } else if (err.code === 'PGRST204') {
        message = 'Database schema needs updating. Please run the migration SQL.';
      } else if (err.message) {
        message = err.message;
      }
      showToast('error', message);
    } finally {
      setLoading(false);
    }
  };

  const handleTypeChange = (newType: 'income' | 'expense') => {
    setType(newType);
    // Reset category if it doesn't match new type
    const validCategory = categories.find(
      (c) => c.value === category && (c.type === 'both' || c.type === newType)
    );
    if (!validCategory) setCategory('');
  };

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">New Transaction</h1>
        <p className="text-slate-500 mt-1">Record a new income or expense</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Type Toggle */}
        <div className="bg-white rounded-2xl p-2 shadow-sm border border-slate-100">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleTypeChange('expense')}
              className={`py-3.5 px-4 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 ${
                type === 'expense'
                  ? 'bg-red-500 text-white shadow-lg shadow-red-500/30'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 13l-5 5m0 0l-5-5m5 5V6" />
              </svg>
              Expense
            </button>
            <button
              type="button"
              onClick={() => handleTypeChange('income')}
              className={`py-3.5 px-4 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 ${
                type === 'income'
                  ? 'bg-green-500 text-white shadow-lg shadow-green-500/30'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
              </svg>
              Income
            </button>
          </div>
        </div>

        {/* Amount */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <label htmlFor="amount" className="block text-sm font-medium text-slate-700 mb-2">
            Amount
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl text-slate-400 font-light">$</span>
            <input
              id="amount"
              type="number"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                if (errors.amount) setErrors((prev) => ({ ...prev, amount: undefined }));
              }}
              placeholder="0.00"
              className={`w-full pl-12 pr-4 py-4 text-3xl font-bold text-slate-900 bg-slate-50 border rounded-xl placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.amount ? 'border-red-300 bg-red-50' : 'border-slate-200'
              }`}
            />
          </div>
          {errors.amount && <p className="mt-2 text-sm text-red-500">{errors.amount}</p>}
        </div>

        {/* Category */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <label className="block text-sm font-medium text-slate-700 mb-3">
            Category {errors.category && <span className="text-red-500">*</span>}
          </label>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {filteredCategories.map((cat) => (
              <button
                key={cat.value}
                type="button"
                onClick={() => {
                  setCategory(cat.value);
                  if (errors.category) setErrors((prev) => ({ ...prev, category: undefined }));
                }}
                className={`p-3 rounded-xl text-center transition-all card-hover ${
                  category === cat.value
                    ? 'bg-blue-100 border-2 border-blue-500 scale-105'
                    : 'bg-slate-50 border-2 border-transparent hover:bg-slate-100'
                }`}
              >
                <span className="text-2xl block mb-1">{cat.icon}</span>
                <span className="text-xs font-medium text-slate-700 line-clamp-1">{cat.label}</span>
              </button>
            ))}
          </div>
          {errors.category && <p className="mt-3 text-sm text-red-500">{errors.category}</p>}
        </div>

        {/* Description & Date */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 space-y-4">
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-slate-700 mb-2">
              Description <span className="text-slate-400">(optional)</span>
            </label>
            <input
              id="description"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What was this transaction for?"
              maxLength={100}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="mt-1 text-xs text-slate-400 text-right">{description.length}/100</p>
          </div>
          <div>
            <label htmlFor="date" className="block text-sm font-medium text-slate-700 mb-2">
              Date
            </label>
            <input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Submit */}
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex-1 py-3.5 px-4 bg-slate-100 text-slate-700 font-semibold rounded-xl hover:bg-slate-200 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 py-3.5 px-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 disabled:opacity-60 disabled:cursor-not-allowed transition-all btn-press"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Saving...
              </span>
            ) : (
              'Save Transaction'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
