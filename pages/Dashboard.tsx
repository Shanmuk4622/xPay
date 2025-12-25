
import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { GoogleGenAI, Modality } from "@google/genai";
import { 
  PlusCircle, 
  Search, 
  Activity,
  Sparkles,
  Camera,
  Cpu,
  BarChart3,
  ShieldCheck,
  ChevronRight,
  ExternalLink,
  Globe,
  Zap,
  Volume2,
  VolumeX,
  Loader2
} from 'lucide-react';

interface Transaction {
  id: string;
  amount: number;
  payment_mode: string;
  source: string;
  created_at: string;
}

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);
  return bytes;
}

async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiBrief, setAiBrief] = useState<string | null>(null);
  const [forecast, setForecast] = useState<string | null>(null);
  const [sources, setSources] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalVolume: 0,
    count: 0,
    health: 'NOMINAL'
  });
  const [isVocalizing, setIsVocalizing] = useState(false);

  const generateIntelligence = async (txs: Transaction[]) => {
    if (txs.length === 0) {
      setAiBrief("Ledger empty. Awaiting first transaction signal.");
      setForecast("Liquidity outlook stable. Cold start pending.");
      return;
    }
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const context = txs.map(t => `${t.source}: ₹${t.amount}`).join(', ');
      
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `As a financial auditor, analyze these transactions and project a 7-day outlook. Cite sources if discussing economic trends: ${context}`,
        config: { tools: [{ googleSearch: {} }] }
      });

      setForecast(response.text);
      setAiBrief("Analysis synchronized with live economic signals.");
      
      const citations = response.candidates?.[0]?.groundingMetadata?.groundingChunks
        ?.map((chunk: any) => chunk.web)
        .filter((web: any) => web && web.uri) || [];
      setSources(citations);

    } catch (e) {
      console.error('Intelligence engine timeout:', e);
      setAiBrief("Offline Analysis Mode.");
    }
  };

  const handleVocalBrief = async () => {
    if (!forecast || isVocalizing) return;
    setIsVocalizing(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: `Provide an executive summary of the following forecast in a professional but warm voice: ${forecast}` }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
        },
      });

      const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (audioData) {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        const decoded = await decodeAudioData(decode(audioData), audioCtx, 24000, 1);
        const source = audioCtx.createBufferSource();
        source.buffer = decoded;
        source.connect(audioCtx.destination);
        source.onended = () => setIsVocalizing(false);
        source.start();
      } else {
        setIsVocalizing(false);
      }
    } catch (err) {
      console.error("Vocal failure:", err);
      setIsVocalizing(false);
    }
  };

  const fetchMetrics = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const { data: recent, error: recentError } = await supabase
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(30);
      
      if (recentError) throw recentError;
      const txList = recent || [];
      setRecentTransactions(txList.slice(0, 8));
      
      if (txList.length > 0) generateIntelligence(txList);

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const total = txList
        .filter(tx => new Date(tx.created_at) >= today)
        .reduce((acc, tx) => acc + tx.amount, 0);
        
      setStats({ 
        totalVolume: total, 
        count: txList.filter(tx => new Date(tx.created_at) >= today).length, 
        health: 'NOMINAL' 
      });

    } catch (err) {
      setStats(s => ({ ...s, health: 'DEGRADED' }));
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
    const channel = supabase.channel('ledger-stream')
      .on('postgres_changes', { event: '*', table: 'transactions' }, () => fetchMetrics(false))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchMetrics]);

  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="space-y-12">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-8 px-2">
        <div>
          <h1 className="text-5xl font-black tracking-tight text-slate-900 italic leading-none">Command Center</h1>
          <div className="mt-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.5em] flex items-center gap-3">
             <div className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-ping" /> Unit Telemetry Nominal
          </div>
        </div>
        <div className="flex gap-4">
           {forecast && (
             <button 
               onClick={handleVocalBrief}
               className={`bg-white px-8 py-5 rounded-[2rem] border border-slate-200 shadow-sm flex items-center gap-4 transition-all hover:scale-105 active:scale-95 ${isVocalizing ? 'ring-2 ring-indigo-500 text-indigo-600' : 'text-slate-600'}`}
             >
                {isVocalizing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Volume2 className="h-4 w-4" />}
                <span className="text-[10px] font-black uppercase tracking-widest">{isVocalizing ? 'Neural Briefing...' : 'Vocalize Brief'}</span>
             </button>
           )}
           <div className="bg-white px-8 py-5 rounded-[2rem] border border-slate-200 shadow-sm flex items-center gap-6">
              <Activity className={`h-5 w-5 ${stats.health === 'NOMINAL' ? 'text-emerald-500' : 'text-rose-500'}`} />
              <div><p className="text-[10px] font-black uppercase text-slate-400 mb-1.5">Consensus</p><p className="text-sm font-bold text-slate-900">{stats.health}</p></div>
           </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-4 space-y-10">
          <div className="grid grid-cols-1 gap-4">
            <Link to="/transactions/new" className="group flex items-center justify-between rounded-[2.5rem] bg-slate-950 p-10 text-white shadow-2xl hover:scale-[1.02] transition-all">
              <div className="flex items-center gap-6"><Zap className="h-8 w-8 text-indigo-500" /><h3 className="font-black text-2xl tracking-tighter italic">Manual Log</h3></div>
              <ChevronRight className="h-5 w-5 text-slate-700" />
            </Link>
            <Link to="/admin/scan" className="group flex items-center justify-between rounded-[2.5rem] border-2 border-indigo-100 bg-indigo-50/20 p-10 text-indigo-950 hover:bg-indigo-50 hover:scale-[1.02] transition-all">
              <div className="flex items-center gap-6"><Camera className="h-8 w-8 text-indigo-600" /><h3 className="font-black text-2xl tracking-tighter italic">AI Scanner</h3></div>
              <Sparkles className="h-5 w-5 text-indigo-400 animate-pulse" />
            </Link>
          </div>

          <AnimatePresence>
            {aiBrief && (
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-indigo-600 rounded-[3rem] p-10 text-white shadow-premium relative overflow-hidden">
                <div className="absolute right-0 top-0 opacity-10 p-8 rotate-12"><Cpu className="h-20 w-20" /></div>
                <div className="relative z-10">
                  <span className="text-[10px] font-black uppercase tracking-[0.4em] text-indigo-200">System Brief</span>
                  <p className="mt-4 text-lg font-black leading-relaxed italic">"{aiBrief}"</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="lg:col-span-8 space-y-10">
           {forecast && (
             <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} className="bg-white rounded-[3rem] border border-slate-200 p-10 shadow-lg relative overflow-hidden">
                <div className="flex flex-col md:flex-row gap-8 items-start">
                   <div className="h-20 w-20 rounded-[2rem] bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0"><BarChart3 className="h-8 w-8" /></div>
                   <div className="flex-1">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">Grounded Forecast</span>
                        {sources.length > 0 && (
                          <div className="flex items-center gap-2 text-[10px] font-black text-indigo-600 uppercase tracking-widest">
                            <Globe className="h-3 w-3" /> Grounded
                          </div>
                        )}
                      </div>
                      <p className="text-base font-bold text-slate-900 leading-relaxed">{forecast}</p>
                      {sources.length > 0 && (
                        <div className="mt-8 pt-6 border-t border-slate-100">
                          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-4">Verification Sources</p>
                          <div className="flex flex-wrap gap-2">
                            {sources.map((s, idx) => (
                              <a key={idx} href={s.uri} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-xl text-[9px] font-black text-indigo-600 border border-slate-200 hover:bg-indigo-50 transition-colors">
                                <ExternalLink className="h-3 w-3" /> {s.title || 'Economic Verifier'}
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                   </div>
                </div>
             </motion.div>
           )}

          <div className="bg-white rounded-[3rem] border border-slate-200 shadow-xl overflow-hidden">
            <div className="px-10 py-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
               <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Signal Stream</span>
               <Link to="/admin/search" className="text-[9px] font-black uppercase text-indigo-600 hover:underline">Full Vault</Link>
            </div>
            <div className="divide-y divide-slate-100">
              {loading ? [...Array(3)].map((_, i) => <div key={i} className="p-10 animate-pulse h-24 bg-slate-50/20" />) : recentTransactions.length === 0 ? (
                <div className="py-24 text-center"><ShieldCheck className="mx-auto h-12 w-12 text-slate-100 mb-6" /><p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Standby for ledger pulse</p></div>
              ) : recentTransactions.map((tx, idx) => (
                <motion.div key={tx.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} onClick={() => navigate(`/admin/transactions/${tx.id}`)} className="group flex items-center justify-between p-10 hover:bg-slate-50 cursor-pointer transition-all">
                  <div className="flex items-center gap-8">
                     <div className="h-12 w-12 rounded-2xl flex items-center justify-center text-[10px] font-black uppercase bg-indigo-50 text-indigo-600">{tx.payment_mode.slice(0, 3)}</div>
                     <div><p className="text-lg font-black text-slate-900 tracking-tight leading-none mb-2">{tx.source}</p><p className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em]">{new Date(tx.created_at).toLocaleTimeString()}</p></div>
                  </div>
                  <p className="font-mono text-2xl font-black text-slate-900 italic tabular-nums">₹{tx.amount.toLocaleString()}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
