import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Calendar, CreditCard, Hash, User, FileText, MapPin, Clock, Loader2, AlertCircle } from 'lucide-react';

interface Transaction {
  id: string;
  amount: number;
  payment_mode: 'cash' | 'bank' | 'upi';
  reference_id: string | null;
  source: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  branch_id?: string | null;
  audit_tag?: string | null;
}

export default function TransactionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTransaction = async () => {
      if (!id) return;

      try {
        const { data, error } = await supabase
          .from('transactions')
          .select('*')
          .eq('id', id)
          .single();

        if (error) throw error;
        setTransaction(data);
      } catch (err: any) {
        console.error('Error fetching transaction:', err);
        setError(err.message || 'Failed to load transaction details.');
      } finally {
        setLoading(false);
      }
    };

    fetchTransaction();
  }, [id]);

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
          <span className="text-sm font-medium text-gray-500">Loading details...</span>
        </div>
      </div>
    );
  }

  if (error || !transaction) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
            <h3 className="mt-4 text-lg font-medium text-gray-900">Error Loading Data</h3>
            <p className="mt-2 text-sm text-gray-500">{error || 'Transaction not found.'}</p>
            <button
                onClick={() => navigate(-1)}
                className="mt-6 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
            >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Go Back
            </button>
        </div>
      </div>
    );
  }

  const getModeColor = (mode: string) => {
    switch (mode) {
      case 'cash': return 'bg-green-100 text-green-800';
      case 'upi': return 'bg-blue-100 text-blue-800';
      default: return 'bg-purple-100 text-purple-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="mx-auto max-w-3xl">
        
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center">
             <button onClick={() => navigate(-1)} className="mr-4 rounded-full p-2 hover:bg-gray-200 transition-colors">
                <ArrowLeft className="h-5 w-5 text-gray-600" />
             </button>
             <div>
                <h1 className="text-2xl font-bold text-gray-900">Transaction Details</h1>
                <p className="text-sm text-gray-500 font-mono text-xs mt-1">{transaction.id}</p>
             </div>
          </div>
          <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium capitalize shadow-sm ${getModeColor(transaction.payment_mode)}`}>
            {transaction.payment_mode}
          </span>
        </div>

        {/* Main Card */}
        <div className="overflow-hidden rounded-xl bg-white shadow ring-1 ring-gray-900/5">
            
            {/* Top Section: Amount */}
            <div className="border-b border-gray-200 bg-gray-50 px-6 py-5 sm:px-8">
                <div className="text-sm font-medium text-gray-500 uppercase tracking-wide">Total Amount</div>
                <div className="mt-1 flex items-baseline">
                    <span className="text-4xl font-extrabold text-gray-900 tracking-tight">
                        ₹{transaction.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                    <span className="ml-2 text-sm text-gray-500">INR</span>
                </div>
            </div>

            {/* Details Grid */}
            <div className="px-6 py-6 sm:px-8">
                <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                    
                    <div className="sm:col-span-1">
                        <dt className="flex items-center text-sm font-medium text-gray-500">
                            <Calendar className="mr-2 h-4 w-4 text-gray-400" />
                            Date Recorded
                        </dt>
                        <dd className="mt-1 text-sm text-gray-900 font-medium">
                            {new Date(transaction.created_at).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </dd>
                    </div>

                    <div className="sm:col-span-1">
                        <dt className="flex items-center text-sm font-medium text-gray-500">
                            <Clock className="mr-2 h-4 w-4 text-gray-400" />
                            Time
                        </dt>
                        <dd className="mt-1 text-sm text-gray-900 font-medium">
                            {new Date(transaction.created_at).toLocaleTimeString()}
                        </dd>
                    </div>

                    <div className="sm:col-span-2">
                         <div className="border-t border-gray-100 my-2"></div>
                    </div>

                    <div className="sm:col-span-1">
                        <dt className="flex items-center text-sm font-medium text-gray-500">
                            <FileText className="mr-2 h-4 w-4 text-gray-400" />
                            Source / Payer
                        </dt>
                        <dd className="mt-1 text-sm text-gray-900 bg-gray-50 rounded-md px-3 py-2 border border-gray-200">
                            {transaction.source}
                        </dd>
                    </div>

                    <div className="sm:col-span-1">
                        <dt className="flex items-center text-sm font-medium text-gray-500">
                            <Hash className="mr-2 h-4 w-4 text-gray-400" />
                            Reference ID
                        </dt>
                        <dd className="mt-1 text-sm text-gray-900 bg-gray-50 rounded-md px-3 py-2 border border-gray-200 font-mono">
                            {transaction.reference_id || 'N/A'}
                        </dd>
                    </div>

                    <div className="sm:col-span-2">
                         <div className="border-t border-gray-100 my-2"></div>
                    </div>

                    <div className="sm:col-span-1">
                        <dt className="flex items-center text-sm font-medium text-gray-500">
                            <User className="mr-2 h-4 w-4 text-gray-400" />
                            Created By (User ID)
                        </dt>
                        <dd className="mt-1 text-xs text-gray-500 font-mono break-all">
                            {transaction.created_by}
                        </dd>
                    </div>

                    <div className="sm:col-span-1">
                        <dt className="flex items-center text-sm font-medium text-gray-500">
                            <MapPin className="mr-2 h-4 w-4 text-gray-400" />
                            Branch ID
                        </dt>
                        <dd className="mt-1 text-sm text-gray-500">
                            {transaction.branch_id || 'Global / Unassigned'}
                        </dd>
                    </div>

                </dl>
            </div>

            {/* Footer Metadata */}
            <div className="bg-gray-50 px-6 py-4 sm:px-8 border-t border-gray-200">
                 <div className="text-xs text-gray-400 flex flex-col sm:flex-row sm:justify-between gap-2">
                    <span>Last Updated: {new Date(transaction.updated_at).toLocaleString()}</span>
                    {transaction.audit_tag && <span>Tag: {transaction.audit_tag}</span>}
                 </div>
            </div>

        </div>
      </div>
    </div>
  );
}