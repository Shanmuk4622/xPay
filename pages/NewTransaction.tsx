import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, CheckCircle, AlertTriangle, Loader2, DollarSign, CreditCard, FileText, Hash } from 'lucide-react';

type PaymentMode = 'cash' | 'bank' | 'upi';

export default function NewTransaction() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // Form State
  const [amount, setAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('cash');
  const [source, setSource] = useState('');
  const [referenceId, setReferenceId] = useState('');
  
  // UI State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Reset Reference ID if Cash is selected
  useEffect(() => {
    if (paymentMode === 'cash') {
      setReferenceId('');
      setFieldErrors((prev) => ({ ...prev, referenceId: '' }));
    }
  }, [paymentMode]);

  const validateForm = () => {
    const errors: Record<string, string> = {};
    const numAmount = parseFloat(amount);

    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      errors.amount = 'Please enter a valid positive amount.';
    }

    if (!source.trim()) {
      errors.source = 'Source/Payer name is required.';
    }

    if (paymentMode !== 'cash' && !referenceId.trim()) {
      errors.referenceId = 'Reference ID is required for Bank/UPI transactions.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInitialSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (validateForm()) {
      setShowModal(true);
    }
  };

  const confirmSubmit = async () => {
    if (!user) return;
    
    setIsSubmitting(true);
    setError(null);

    try {
      // 1. Prepare Payload
      const payload = {
        amount: parseFloat(amount),
        payment_mode: paymentMode,
        source: source.trim(),
        reference_id: paymentMode === 'cash' ? null : referenceId.trim(),
        created_by: user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // 2. Insert into Supabase
      const { error: insertError } = await supabase
        .from('transactions')
        .insert([payload]);

      if (insertError) {
        // Handle Unique Constraint Violation (Postgres Code 23505)
        if (insertError.code === '23505') {
          throw new Error('This Reference ID already exists. Please check your records.');
        }
        throw insertError;
      }

      // 3. Success (Navigate back or show success state)
      navigate('/', { state: { successMessage: 'Transaction recorded successfully.' } });

    } catch (err: any) {
      console.error('Transaction Error:', err);
      setError(err.message || 'Failed to submit transaction. Please try again.');
      setShowModal(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="mx-auto max-w-2xl">
        
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center">
             <button onClick={() => navigate(-1)} className="mr-4 rounded-full p-2 hover:bg-gray-200">
                <ArrowLeft className="h-5 w-5 text-gray-600" />
             </button>
             <h1 className="text-2xl font-bold text-gray-900">New Transaction</h1>
          </div>
        </div>

        {/* Main Card */}
        <div className="rounded-xl bg-white shadow-sm ring-1 ring-gray-900/5">
          <div className="p-6 sm:p-8">
            
            {error && (
              <div className="mb-6 flex items-center rounded-md bg-red-50 p-4 text-red-700">
                <AlertTriangle className="mr-2 h-5 w-5 flex-shrink-0" />
                <span className="text-sm font-medium">{error}</span>
              </div>
            )}

            <form onSubmit={handleInitialSubmit} className="space-y-6">
              
              {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700">Amount (INR)</label>
                <div className="relative mt-2 rounded-md shadow-sm">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <span className="text-gray-500 sm:text-sm">₹</span>
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className={`block w-full rounded-md border py-3 pl-7 pr-12 focus:outline-none focus:ring-2 sm:text-sm ${
                      fieldErrors.amount 
                        ? 'border-red-300 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-red-500' 
                        : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'
                    }`}
                    placeholder="0.00"
                  />
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                    <span className="text-gray-500 sm:text-sm">INR</span>
                  </div>
                </div>
                {fieldErrors.amount && <p className="mt-2 text-sm text-red-600">{fieldErrors.amount}</p>}
              </div>

              {/* Payment Mode */}
              <div>
                <label className="block text-sm font-medium text-gray-700">Payment Mode</label>
                <div className="mt-2 grid grid-cols-3 gap-3">
                   {['cash', 'bank', 'upi'].map((mode) => (
                     <div
                       key={mode}
                       onClick={() => setPaymentMode(mode as PaymentMode)}
                       className={`cursor-pointer rounded-lg border px-4 py-3 text-center text-sm font-medium uppercase transition-all ${
                         paymentMode === mode
                           ? 'border-indigo-600 bg-indigo-50 text-indigo-700 ring-1 ring-indigo-600'
                           : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                       }`}
                     >
                       {mode}
                     </div>
                   ))}
                </div>
              </div>

              {/* Reference ID (Conditional) */}
              <div className={`transition-all duration-300 ${paymentMode === 'cash' ? 'opacity-50 grayscale' : 'opacity-100'}`}>
                <label className="block text-sm font-medium text-gray-700">
                  Reference ID {paymentMode !== 'cash' && <span className="text-red-500">*</span>}
                </label>
                <div className="relative mt-2 rounded-md shadow-sm">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <Hash className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    disabled={paymentMode === 'cash'}
                    value={referenceId}
                    onChange={(e) => setReferenceId(e.target.value.toUpperCase())}
                    className={`block w-full rounded-md border py-3 pl-10 focus:outline-none focus:ring-2 sm:text-sm ${
                      paymentMode === 'cash' ? 'cursor-not-allowed bg-gray-100 text-gray-400' : 'bg-white'
                    } ${
                      fieldErrors.referenceId
                        ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                        : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'
                    }`}
                    placeholder={paymentMode === 'cash' ? 'Not applicable for Cash' : 'UTR / Transaction ID'}
                  />
                </div>
                {paymentMode !== 'cash' && fieldErrors.referenceId && (
                  <p className="mt-2 text-sm text-red-600">{fieldErrors.referenceId}</p>
                )}
              </div>

              {/* Source / Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Source / Payer Name <span className="text-red-500">*</span>
                </label>
                <div className="relative mt-2 rounded-md shadow-sm">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <FileText className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                    className={`block w-full rounded-md border py-3 pl-10 focus:outline-none focus:ring-2 sm:text-sm ${
                       fieldErrors.source
                        ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                        : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'
                    }`}
                    placeholder="e.g. Client Name, Vendor ID, etc."
                  />
                </div>
                {fieldErrors.source && <p className="mt-2 text-sm text-red-600">{fieldErrors.source}</p>}
              </div>

              {/* Submit Button */}
              <div className="pt-4">
                <button
                  type="submit"
                  className="flex w-full justify-center rounded-md bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                >
                  Review & Submit
                </button>
              </div>

            </form>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 p-4 backdrop-blur-sm">
           <div className="w-full max-w-sm overflow-hidden rounded-lg bg-white shadow-xl">
              <div className="bg-gray-50 p-6 text-center">
                 <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100">
                    <CreditCard className="h-6 w-6 text-indigo-600" />
                 </div>
                 <h3 className="mt-4 text-lg font-semibold text-gray-900">Confirm Transaction</h3>
                 <p className="mt-2 text-sm text-gray-500">Please verify the details below before submitting.</p>
              </div>
              
              <div className="space-y-3 px-6 py-4">
                 <div className="flex justify-between border-b border-gray-100 pb-2">
                    <span className="text-sm text-gray-500">Amount</span>
                    <span className="font-semibold text-gray-900">₹{parseFloat(amount).toFixed(2)}</span>
                 </div>
                 <div className="flex justify-between border-b border-gray-100 pb-2">
                    <span className="text-sm text-gray-500">Mode</span>
                    <span className="font-semibold uppercase text-gray-900">{paymentMode}</span>
                 </div>
                 <div className="flex justify-between border-b border-gray-100 pb-2">
                    <span className="text-sm text-gray-500">Source</span>
                    <span className="truncate pl-4 font-semibold text-gray-900">{source}</span>
                 </div>
                 {paymentMode !== 'cash' && (
                    <div className="flex justify-between border-b border-gray-100 pb-2">
                        <span className="text-sm text-gray-500">Ref ID</span>
                        <span className="font-mono text-sm font-semibold text-gray-900">{referenceId}</span>
                    </div>
                 )}
              </div>

              <div className="flex gap-3 bg-gray-50 px-6 py-4">
                 <button
                   onClick={() => setShowModal(false)}
                   disabled={isSubmitting}
                   className="flex-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
                 >
                   Edit
                 </button>
                 <button
                   onClick={confirmSubmit}
                   disabled={isSubmitting}
                   className="flex flex-1 items-center justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:bg-indigo-400"
                 >
                   {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm'}
                 </button>
              </div>
           </div>
        </div>
      )}

    </div>
  );
}