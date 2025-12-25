
import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleGenAI, Type } from "@google/genai";
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Loader2, ArrowLeft, Zap, AlertCircle, Save, RefreshCw, FileText, Database, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export default function ScanReceipt() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [image, setImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<any>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError("File size limit (5MB) exceeded.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setImage(result);
        analyzeReceipt(result);
      };
      reader.onerror = () => setError("Disk read failure.");
      reader.readAsDataURL(file);
    }
  };

  const analyzeReceipt = async (base64Data: string) => {
    setIsAnalyzing(true);
    setError(null);
    setExtractedData(null);
    try {
      if (!process.env.API_KEY) throw new Error("Terminal authorized credentials missing.");
      
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const parts = base64Data.split(',');
      if (parts.length < 2) throw new Error("Malformed document packet.");
      
      const mimeType = parts[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
      const base64Content = parts[1];

      // Switched to gemini-3-flash-preview for full responseSchema support
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: {
          parts: [
            { inlineData: { data: base64Content, mimeType } },
            { text: "Extract financial record details strictly as JSON. amount (number), source (merchant string), payment_mode ('cash','bank','upi'), and date (ISO string if found)." }
          ]
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              amount: { type: Type.NUMBER },
              source: { type: Type.STRING },
              payment_mode: { type: Type.STRING },
              date: { type: Type.STRING }
            },
            required: ["amount", "source", "payment_mode"]
          }
        }
      });

      let textOutput = response.text || "";
      
      // Secondary cleanup using refined regex for markdown boundaries
      if (textOutput.includes("```")) {
        textOutput = textOutput.replace(/```(json)?|```/g, "").trim();
      }
      
      try {
        const result = JSON.parse(textOutput);
        if (typeof result.amount !== 'number' || !result.source) {
          throw new Error("Validation mismatch in extracted neural data.");
        }
        setExtractedData(result);
      } catch (parseErr) {
        console.error("Neural parsing error:", textOutput);
        throw new Error("Could not decrypt AI intelligence into structured ledger data.");
      }
    } catch (err: any) {
      console.error("Vision Terminal Error:", err);
      setError(err.message || "Failed to analyze document.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const commitTransaction = async () => {
    if (!user || !extractedData) return;
    setIsCommitting(true);
    try {
      const payload = {
        amount: extractedData.amount,
        source: extractedData.source,
        payment_mode: (['cash', 'bank', 'upi'].includes(extractedData.payment_mode) ? extractedData.payment_mode : 'bank'),
        created_by: user.id,
        created_at: extractedData.date && !isNaN(Date.parse(extractedData.date)) ? new Date(extractedData.date).toISOString() : new Date().toISOString(),
        reference_id: `V-SCAN-${Math.random().toString(36).substring(2, 10).toUpperCase()}`
      };

      const { error: insertError } = await supabase.from('transactions').insert([payload]);
      if (insertError) throw insertError;
      navigate('/');
    } catch (err: any) {
      setError(err.message);
      setIsCommitting(false);
    }
  };

  const resetScanner = () => {
    setImage(null);
    setExtractedData(null);
    setError(null);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-7xl mx-auto py-10">
      <div className="flex items-center justify-between mb-12 px-4">
        <button onClick={() => navigate(-1)} className="group flex items-center text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 hover:text-indigo-600 transition-all">
          <ArrowLeft className="h-5 w-5 mr-3 group-hover:-translate-x-1" /> Back to Dashboard
        </button>
        <div className="flex items-center gap-6">
           <button onClick={resetScanner} className="text-slate-300 hover:text-rose-500 transition-colors"><Trash2 className="h-4 w-4" /></button>
           <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Vision_Pipeline_Unit_v2</span>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-12">
        <div className="flex-1 space-y-8">
          <header>
            <h1 className="text-5xl font-black italic tracking-tighter text-slate-900 leading-none">Vision Pulse</h1>
            <p className="mt-6 text-slate-500 font-medium max-w-lg leading-relaxed">Multimodal forensic extraction for converting physical artifacts into cryptographically verified ledger entries.</p>
          </header>
          
          <div 
            onClick={() => !isAnalyzing && fileInputRef.current?.click()}
            className={`relative group aspect-[3/4] rounded-[4rem] border-4 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden shadow-2xl ${image ? 'border-transparent' : 'border-slate-200 hover:border-indigo-600 hover:bg-indigo-50/50'}`}
          >
            {image ? (
              <>
                <img src={image} className="w-full h-full object-cover" alt="Pulse Source" />
                {isAnalyzing && (
                  <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md flex flex-col items-center justify-center text-white">
                    <div className="relative w-full h-1 bg-indigo-500 shadow-[0_0_30px_rgba(99,102,241,1)] animate-[scan_2s_infinite]" />
                    <Loader2 className="h-16 w-16 animate-spin mb-6 text-indigo-400" />
                    <p className="text-[10px] font-black uppercase tracking-[0.5em] text-indigo-300">Neural Decoding Active</p>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center p-16">
                <div className="mx-auto h-24 w-24 rounded-[3rem] bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-indigo-100 group-hover:text-indigo-600 mb-8 transition-colors">
                  <Camera className="h-10 w-10" />
                </div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight">Supply Document Signal</h3>
                <p className="mt-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Supported: JPG / PNG / PDF</p>
              </div>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
          </div>
        </div>

        <div className="w-full lg:w-[480px] shrink-0">
          <div className="bg-slate-950 rounded-[4rem] p-12 text-white shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] border border-slate-800 sticky top-32">
            <div className="flex items-center justify-between mb-12">
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500">Signal Validation HUD</span>
              {extractedData && <button onClick={() => fileInputRef.current?.click()} className="p-3 text-slate-600 hover:text-white transition-colors"><RefreshCw className="h-4 w-4" /></button>}
            </div>

            <AnimatePresence mode="wait">
              {extractedData ? (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-10">
                  <div className="space-y-6">
                    <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800">
                      <label className="text-[9px] font-black uppercase tracking-widest text-slate-600">Merchant Entity</label>
                      <input value={extractedData.source} onChange={(e) => setExtractedData({...extractedData, source: e.target.value})} className="mt-3 block w-full bg-transparent border-none p-0 text-xl font-black text-white focus:ring-0" />
                    </div>
                    <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800">
                      <label className="text-[9px] font-black uppercase tracking-widest text-slate-600">Settlement (INR)</label>
                      <div className="flex items-center mt-3">
                        <span className="text-3xl font-black text-indigo-500 mr-2 italic">₹</span>
                        <input type="number" value={extractedData.amount} onChange={(e) => setExtractedData({...extractedData, amount: parseFloat(e.target.value)})} className="block w-full bg-transparent border-none p-0 text-4xl font-black text-white focus:ring-0 italic tabular-nums" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                       <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800">
                          <label className="text-[9px] font-black uppercase tracking-widest text-slate-600">Channel</label>
                          <select value={extractedData.payment_mode} onChange={(e) => setExtractedData({...extractedData, payment_mode: e.target.value})} className="mt-2 block w-full bg-transparent border-none p-0 text-xs font-black uppercase text-indigo-400 focus:ring-0">
                            <option value="cash">Cash</option><option value="bank">Bank</option><option value="upi">UPI</option>
                          </select>
                       </div>
                       <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800">
                          <label className="text-[9px] font-black uppercase tracking-widest text-slate-600">Temporal Index</label>
                          <p className="mt-2 text-xs font-black text-white">{extractedData.date ? new Date(extractedData.date).toLocaleDateString() : 'Auto-Now'}</p>
                       </div>
                    </div>
                  </div>
                  <button onClick={commitTransaction} disabled={isCommitting} className="w-full rounded-[2.5rem] bg-indigo-600 py-8 text-[11px] font-black uppercase tracking-[0.4em] text-white shadow-2xl flex items-center justify-center gap-4 hover:bg-indigo-500 transition-all">
                    {isCommitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />} Authorize & Commit
                  </button>
                </motion.div>
              ) : (
                <div className="py-20 flex flex-col items-center justify-center text-center opacity-40">
                  <FileText className="h-16 w-16 mb-8 text-slate-700" />
                  <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500">Awaiting Signal Ingestion</p>
                </div>
              )}
            </AnimatePresence>

            {error && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-8 p-6 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex gap-4">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <p className="text-xs font-bold leading-relaxed">{error}</p>
              </motion.div>
            )}
          </div>
        </div>
      </div>
      <style>{`@keyframes scan { 0% { top: 0; opacity: 0; } 10% { opacity: 1; } 90% { opacity: 1; } 100% { top: 100%; opacity: 0; } }`}</style>
    </motion.div>
  );
}
