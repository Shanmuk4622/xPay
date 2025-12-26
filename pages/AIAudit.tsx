import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { formatCurrency, getCategoryIcon } from '../lib/utils';

const GROQ_API_KEY = 'REMOVED_API_KEY';

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

interface AuditResult {
  summary: string;
  insights: string[];
  recommendations: string[];
  spendingScore: number;
  topCategories: { name: string; amount: number; percentage: number }[];
}

export default function AIAudit() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AuditResult | null>(null);
  const [period, setPeriod] = useState<'week' | 'month' | 'year'>('month');

  useEffect(() => {
    if (user) fetchTransactions();
  }, [user, period]);

  const getDateRange = () => {
    const now = new Date();
    const start = new Date();
    
    switch (period) {
      case 'week':
        start.setDate(now.getDate() - 7);
        break;
      case 'month':
        start.setMonth(now.getMonth() - 1);
        break;
      case 'year':
        start.setFullYear(now.getFullYear() - 1);
        break;
    }
    
    return start.toISOString().split('T')[0];
  };

  const fetchTransactions = async () => {
    setLoading(true);
    setResult(null);
    
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user?.id)
        .gte('created_at', getDateRange())
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Normalize and filter by date range
      const dateRangeStart = getDateRange();
      const normalized = (data || [])
        .map((raw: RawTransaction) => normalizeTransaction(raw))
        .filter((t) => t.date >= dateRangeStart);
      
      setTransactions(normalized);
    } catch (err: any) {
      console.error('Fetch transactions error:', err);
      showToast('error', 'Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  const runAudit = async () => {
    if (transactions.length < 3) {
      showToast('warning', 'Add more transactions for a meaningful analysis');
      return;
    }

    setAnalyzing(true);

    // Calculate stats
    const expenses = transactions.filter((t) => t.type === 'expense');
    const income = transactions.filter((t) => t.type === 'income');
    const totalExpenses = expenses.reduce((sum, t) => sum + t.amount, 0);
    const totalIncome = income.reduce((sum, t) => sum + t.amount, 0);
    
    const categoryTotals = expenses.reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount;
      return acc;
    }, {} as Record<string, number>);

    const topCategories = Object.entries(categoryTotals)
      .map(([name, amount]) => ({
        name,
        amount,
        percentage: totalExpenses > 0 ? Math.round((amount / totalExpenses) * 100) : 0,
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            {
              role: 'system',
              content: `You are a personal finance advisor. Analyze spending data and provide actionable insights. Return ONLY valid JSON with these fields:
                - summary: string (2-3 sentence overview)
                - insights: string[] (3-4 key observations)
                - recommendations: string[] (3-4 actionable tips)
                - spendingScore: number (1-100, higher is better money management)
                Be concise, practical, and encouraging.`
            },
            {
              role: 'user',
              content: `Analyze this ${period}'s finances:
                - Total Income: $${totalIncome.toFixed(2)}
                - Total Expenses: $${totalExpenses.toFixed(2)}
                - Net: $${(totalIncome - totalExpenses).toFixed(2)}
                - Transaction Count: ${transactions.length}
                - Top Categories: ${topCategories.map(c => `${c.name}: $${c.amount.toFixed(2)} (${c.percentage}%)`).join(', ')}
                - Savings Rate: ${totalIncome > 0 ? Math.round(((totalIncome - totalExpenses) / totalIncome) * 100) : 0}%`
            }
          ],
          temperature: 0.7,
          max_tokens: 500,
        }),
      });

      if (!response.ok) throw new Error('AI analysis failed');

      const data = await response.json();
      const content = data.choices[0]?.message?.content || '';
      
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        setResult({
          ...parsed,
          topCategories,
          spendingScore: Math.max(1, Math.min(100, parsed.spendingScore || 50)),
        });
        showToast('success', 'Analysis complete!');
      } else {
        throw new Error('Could not parse AI response');
      }
    } catch (err: any) {
      showToast('error', 'AI analysis failed. Please try again.');
      // Fallback result
      setResult({
        summary: `In the past ${period}, you spent ${formatCurrency(totalExpenses)} and earned ${formatCurrency(totalIncome)}.`,
        insights: [
          `Your top spending category is ${topCategories[0]?.name || 'N/A'}`,
          `You had ${transactions.length} transactions this period`,
          totalIncome > totalExpenses ? 'You saved money this period!' : 'Your expenses exceeded income',
        ],
        recommendations: [
          'Track your spending daily for better awareness',
          'Set category budgets to control spending',
          'Review subscriptions for potential savings',
        ],
        spendingScore: totalIncome > totalExpenses ? 70 : 40,
        topCategories,
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-green-500';
    if (score >= 40) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Needs Improvement';
  };

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">AI Financial Audit</h1>
        <p className="text-slate-500 mt-1">Get personalized insights powered by AI</p>
      </div>

      {/* Period Selector */}
      <div className="bg-white rounded-2xl p-2 shadow-sm border border-slate-100 mb-6">
        <div className="grid grid-cols-3 gap-2">
          {(['week', 'month', 'year'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`py-3 px-4 rounded-xl font-medium transition-all capitalize ${
                period === p
                  ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Past {p}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Overview */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 mb-6">
        {loading ? (
          <div className="space-y-3">
            <div className="skeleton-shimmer h-8 w-1/2 rounded"></div>
            <div className="skeleton-shimmer h-4 w-3/4 rounded"></div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-slate-500">Transactions in period</p>
                <p className="text-3xl font-bold text-slate-900">{transactions.length}</p>
              </div>
              <div className="w-14 h-14 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-2xl flex items-center justify-center">
                <svg className="w-7 h-7 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
            <button
              onClick={runAudit}
              disabled={analyzing || transactions.length < 3}
              className="w-full py-4 px-6 bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-semibold rounded-xl shadow-lg shadow-purple-500/30 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-3"
            >
              {analyzing ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Analyzing your finances...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  Run AI Analysis
                </>
              )}
            </button>
            {transactions.length < 3 && (
              <p className="text-sm text-slate-400 text-center mt-3">Add at least 3 transactions to run analysis</p>
            )}
          </>
        )}
      </div>

      {/* Results */}
      {result && (
        <div className="space-y-4 animate-slide-up">
          {/* Score Card */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 text-center">
            <p className="text-sm text-slate-500 mb-2">Your Financial Score</p>
            <div className={`text-6xl font-bold mb-2 ${getScoreColor(result.spendingScore)}`}>
              {result.spendingScore}
            </div>
            <p className={`font-medium ${getScoreColor(result.spendingScore)}`}>
              {getScoreLabel(result.spendingScore)}
            </p>
            <div className="mt-4 h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-1000 ${
                  result.spendingScore >= 70 ? 'bg-green-500' :
                  result.spendingScore >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                }`}
                style={{ width: `${result.spendingScore}%` }}
              ></div>
            </div>
          </div>

          {/* Summary */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <span className="text-xl">📊</span> Summary
            </h3>
            <p className="text-slate-600 leading-relaxed">{result.summary}</p>
          </div>

          {/* Top Categories */}
          {result.topCategories.length > 0 && (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
              <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <span className="text-xl">🏷️</span> Top Spending Categories
              </h3>
              <div className="space-y-3">
                {result.topCategories.map((cat, idx) => (
                  <div key={cat.name} className="flex items-center gap-3">
                    <span className="text-xl">{getCategoryIcon(cat.name)}</span>
                    <div className="flex-1">
                      <div className="flex justify-between mb-1">
                        <span className="font-medium text-slate-700 capitalize">{cat.name}</span>
                        <span className="text-sm text-slate-500">{formatCurrency(cat.amount)}</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full transition-all duration-500"
                          style={{ width: `${cat.percentage}%` }}
                        ></div>
                      </div>
                    </div>
                    <span className="text-sm font-medium text-slate-500 w-12 text-right">{cat.percentage}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Insights */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <span className="text-xl">💡</span> Key Insights
            </h3>
            <ul className="space-y-3">
              {result.insights.map((insight, idx) => (
                <li key={idx} className="flex items-start gap-3">
                  <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                    {idx + 1}
                  </span>
                  <span className="text-slate-600">{insight}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Recommendations */}
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-100">
            <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <span className="text-xl">✨</span> Recommendations
            </h3>
            <ul className="space-y-3">
              {result.recommendations.map((rec, idx) => (
                <li key={idx} className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-slate-700">{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
