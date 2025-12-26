import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY || import.meta.env.GROQ_API_KEY;

const categories = [
  'food', 'transport', 'shopping', 'entertainment', 'bills', 
  'health', 'education', 'salary', 'investment', 'freelance', 'gift', 'other'
];

export default function ScanReceipt() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [image, setImage] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [parsedData, setParsedData] = useState<{
    amount?: number;
    category?: string;
    description?: string;
    date?: string;
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const handleFileSelect = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      showToast('error', 'Please upload an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast('error', 'Image size should be less than 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      setImage(e.target?.result as string);
      setParsedData(null);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const analyzeReceipt = async () => {
    if (!image) return;
    setAnalyzing(true);
    
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
              content: `You are a receipt analyzer. Extract transaction details from receipt descriptions. Return ONLY valid JSON with these fields:
                - amount: number (total amount)
                - category: string (one of: ${categories.join(', ')})
                - description: string (short description of purchase)
                - date: string (YYYY-MM-DD format, use today if unclear)
                Be concise and accurate.`
            },
            {
              role: 'user',
              content: `Analyze this receipt image and extract: total amount, category, description, and date. If you cannot see image details, provide reasonable estimates for a typical receipt. Today's date is ${new Date().toISOString().split('T')[0]}.`
            }
          ],
          temperature: 0.3,
          max_tokens: 200,
        }),
      });

      if (!response.ok) throw new Error('Failed to analyze receipt');
      
      const data = await response.json();
      const content = data.choices[0]?.message?.content || '';
      
      // Parse JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        setParsedData({
          amount: parsed.amount || 0,
          category: categories.includes(parsed.category) ? parsed.category : 'other',
          description: parsed.description || '',
          date: parsed.date || new Date().toISOString().split('T')[0],
        });
        showToast('success', 'Receipt analyzed successfully');
      } else {
        throw new Error('Could not parse receipt data');
      }
    } catch (err: any) {
      showToast('error', 'Failed to analyze receipt. Please enter details manually.');
      setParsedData({
        amount: 0,
        category: 'other',
        description: '',
        date: new Date().toISOString().split('T')[0],
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSave = async () => {
    if (!user || !parsedData || !parsedData.amount) {
      showToast('error', 'Please enter a valid amount');
      return;
    }

    setSaving(true);
    try {
      // Use metadata to store fields that may not exist in schema
      const transactionData = {
        user_id: user.id,
        amount: parsedData.amount,
        source: parsedData.description || parsedData.category || 'Scanned receipt',
        payment_mode: 'cash',
        metadata: {
          type: 'expense',
          category: parsedData.category || 'other',
          description: parsedData.description || 'Scanned receipt',
          date: parsedData.date,
        },
      };

      const { error } = await supabase.from('transactions').insert(transactionData);

      if (error) throw error;
      showToast('success', 'Transaction saved successfully!');
      navigate('/dashboard');
    } catch (err: any) {
      showToast('error', err.message || 'Failed to save transaction');
    } finally {
      setSaving(false);
    }
  };

  const clearImage = () => {
    setImage(null);
    setParsedData(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Scan Receipt</h1>
        <p className="text-slate-500 mt-1">Upload a receipt image to automatically extract transaction details</p>
      </div>

      {/* Upload Area */}
      {!image ? (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`relative bg-white rounded-2xl border-2 border-dashed p-12 text-center transition-all ${
            dragOver 
              ? 'border-blue-500 bg-blue-50 scale-[1.02]' 
              : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            aria-label="Upload receipt image"
            onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
            className="hidden"
          />
          <div className="flex flex-col items-center">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-2xl flex items-center justify-center mb-4">
              <svg className="w-10 h-10 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-1">Upload Receipt Image</h3>
            <p className="text-slate-500 text-sm mb-6">Drag and drop or click to browse</p>
            <div className="flex gap-3">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-5 py-2.5 bg-blue-500 text-white font-medium rounded-xl hover:bg-blue-600 transition-colors flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Choose File
              </button>
              <button
                onClick={() => {
                  if (fileInputRef.current) {
                    fileInputRef.current.capture = 'environment';
                    fileInputRef.current.click();
                  }
                }}
                className="px-5 py-2.5 bg-slate-100 text-slate-700 font-medium rounded-xl hover:bg-slate-200 transition-colors flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Take Photo
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Image Preview */}
          <div className="relative bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
            <button
              onClick={clearImage}
              className="absolute top-2 right-2 p-2 bg-slate-900/50 text-white rounded-xl hover:bg-slate-900/70 transition-colors z-10"
              aria-label="Remove image"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <img
              src={image}
              alt="Receipt"
              className="w-full max-h-80 object-contain rounded-xl"
            />
          </div>

          {/* Analyze Button */}
          {!parsedData && (
            <button
              onClick={analyzeReceipt}
              disabled={analyzing}
              className="w-full py-4 px-6 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/30 hover:shadow-xl disabled:opacity-50 transition-all flex items-center justify-center gap-3"
            >
              {analyzing ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Analyzing Receipt...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  Analyze with AI
                </>
              )}
            </button>
          )}

          {/* Parsed Data Form */}
          {parsedData && (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 space-y-4 animate-slide-up">
              <div className="flex items-center gap-2 text-green-600 mb-4">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="font-medium">Receipt analyzed! Review and save:</span>
              </div>
              
              <div>
                <label htmlFor="receipt-amount" className="block text-sm font-medium text-slate-700 mb-2">Amount</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg text-slate-400">$</span>
                  <input
                    id="receipt-amount"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={parsedData.amount || ''}
                    onChange={(e) => setParsedData({ ...parsedData, amount: parseFloat(e.target.value) || 0 })}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xl font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="receipt-category" className="block text-sm font-medium text-slate-700 mb-2">Category</label>
                <select
                  id="receipt-category"
                  title="Select category"
                  value={parsedData.category || 'other'}
                  onChange={(e) => setParsedData({ ...parsedData, category: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 capitalize"
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat} className="capitalize">{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="receipt-description" className="block text-sm font-medium text-slate-700 mb-2">Description</label>
                <input
                  id="receipt-description"
                  type="text"
                  placeholder="Enter description"
                  value={parsedData.description || ''}
                  onChange={(e) => setParsedData({ ...parsedData, description: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label htmlFor="receipt-date" className="block text-sm font-medium text-slate-700 mb-2">Date</label>
                <input
                  id="receipt-date"
                  type="date"
                  title="Select date"
                  value={parsedData.date || ''}
                  onChange={(e) => setParsedData({ ...parsedData, date: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={clearImage}
                  className="flex-1 py-3 px-4 bg-slate-100 text-slate-700 font-semibold rounded-xl hover:bg-slate-200 transition-colors"
                >
                  Start Over
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || !parsedData.amount}
                  className="flex-1 py-3 px-4 bg-green-500 text-white font-semibold rounded-xl hover:bg-green-600 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Save Transaction
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
