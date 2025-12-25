
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Modality, LiveServerMessage } from "@google/genai";
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Cpu, 
  Send, 
  Loader2, 
  Terminal,
  Mic,
  Activity,
  Zap,
  Layers,
  AlertCircle,
  ShieldCheck,
  History,
  Radio,
  Radar,
  TrendingUp,
  AlertTriangle,
  Fingerprint,
  ChevronRight,
  Trash2,
  Camera,
  CameraOff
} from 'lucide-react';

interface Message {
  role: 'user' | 'assistant' | 'live';
  content: string;
  sources?: Array<{ title: string; uri: string }>;
  isLive?: boolean;
}

interface TranscriptionEntry {
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

interface AuditInsight {
  title: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
  icon: any;
}

const SYSTEM_PROMPT_BASE = `
You are "FinTrack Intelligence Core v3", a high-level Forensic Accountant and Data Auditor.
Objective: Analyze financial signals within the provided ledger context to detect anomalies, patterns, and velocity shifts.
Guidelines:
1. PRECISION: Use exact figures from context.
2. VISUAL INTEL: You may receive images. Analyze receipts, documents, or environments for authenticity.
3. VOICE MODE: Keep responses concise, helpful, and human-like. Focus on oral clarity.
`;

function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
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

export default function AIAudit() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: "Intelligence Core synchronized. Ready for forensic analysis via terminal or live audio-visual bridge." }
  ]);
  const [transcriptions, setTranscriptions] = useState<TranscriptionEntry[]>([]);
  const [auditInsights, setAuditInsights] = useState<AuditInsight[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAuditing, setIsAuditing] = useState(false);
  const [isLiveActive, setIsLiveActive] = useState(false);
  const [useThinking, setUseThinking] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const bottomRef = useRef<HTMLDivElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const liveSessionRef = useRef<any>(null);
  const audioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const nextStartTimeRef = useRef(0);
  
  const curInputTransRef = useRef('');
  const curOutputTransRef = useRef('');
  
  const micStreamRef = useRef<MediaStream | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    return () => cleanupAudioPipeline();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, transcriptions, isLoading]);

  const cleanupAudioPipeline = () => {
    if (frameIntervalRef.current) {
      window.clearInterval(frameIntervalRef.current);
      frameIntervalRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(track => track.stop());
      micStreamRef.current = null;
    }
    if (scriptProcessorRef.current) {
      scriptProcessorRef.current.disconnect();
      scriptProcessorRef.current = null;
    }
    audioSourcesRef.current.forEach(s => { try { s.stop(); } catch(e) {} });
    audioSourcesRef.current.clear();
    nextStartTimeRef.current = 0;
    if (audioContextRef.current) {
      try { audioContextRef.current.close(); } catch(e) {}
      audioContextRef.current = null;
    }
  };

  const startLiveMode = async () => {
    setError(null);
    setIsLiveActive(true);
    setIsLoading(true);
    setTranscriptions([]);

    try {
      const { data: txs } = await supabase.from('transactions').select('*').order('created_at', { ascending: false }).limit(30);
      const ledger = txs?.map(t => `[${t.created_at}] ${t.source}: ₹${t.amount}`).join('\n') || "No data";

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      // Request Audio & Video for the bridge
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: { width: 640, height: 480 } });
      micStreamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      
      await inputCtx.resume();
      await outputCtx.resume();
      audioContextRef.current = outputCtx;

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: () => {
            // Setup Audio Stream
            const source = inputCtx.createMediaStreamSource(stream);
            const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
            scriptProcessorRef.current = scriptProcessor;
            
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const int16 = new Int16Array(inputData.length);
              for (let i = 0; i < inputData.length; i++) int16[i] = inputData[i] * 32768;
              
              sessionPromise.then(s => {
                if (s) {
                  s.sendRealtimeInput({ 
                    media: { data: encode(new Uint8Array(int16.buffer)), mimeType: 'audio/pcm;rate=16000' } 
                  });
                }
              });
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputCtx.destination);

            // Setup Video Stream (1 frame per second)
            frameIntervalRef.current = window.setInterval(() => {
              if (videoRef.current && canvasRef.current) {
                const canvas = canvasRef.current;
                const video = videoRef.current;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                  canvas.width = video.videoWidth;
                  canvas.height = video.videoHeight;
                  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                  const base64Data = canvas.toDataURL('image/jpeg', 0.6).split(',')[1];
                  sessionPromise.then(s => {
                    s.sendRealtimeInput({
                      media: { data: base64Data, mimeType: 'image/jpeg' }
                    });
                  });
                }
              }
            }, 1000);

            setIsLoading(false);
          },
          onmessage: async (message: LiveServerMessage) => {
            const parts = message.serverContent?.modelTurn?.parts || [];
            for (const part of parts) {
              if (part.inlineData?.data) {
                const base64Audio = part.inlineData.data;
                nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputCtx.currentTime);
                const buffer = await decodeAudioData(decode(base64Audio), outputCtx, 24000, 1);
                const source = outputCtx.createBufferSource();
                source.buffer = buffer;
                source.connect(outputCtx.destination);
                source.start(nextStartTimeRef.current);
                nextStartTimeRef.current += buffer.duration;
                audioSourcesRef.current.add(source);
                source.onended = () => audioSourcesRef.current.delete(source);
              }
            }

            if (message.serverContent?.inputTranscription) {
              curInputTransRef.current += message.serverContent.inputTranscription.text;
              setTranscriptions(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === 'user') {
                  const newT = [...prev];
                  newT[newT.length - 1] = { ...last, text: curInputTransRef.current };
                  return newT;
                }
                return [...prev, { role: 'user', text: curInputTransRef.current, timestamp: Date.now() }];
              });
            }
            if (message.serverContent?.outputTranscription) {
              curOutputTransRef.current += message.serverContent.outputTranscription.text;
              setTranscriptions(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === 'model') {
                  const newT = [...prev];
                  newT[newT.length - 1] = { ...last, text: curOutputTransRef.current };
                  return newT;
                }
                return [...prev, { role: 'model', text: curOutputTransRef.current, timestamp: Date.now() }];
              });
            }

            if (message.serverContent?.turnComplete) {
              curInputTransRef.current = '';
              curOutputTransRef.current = '';
            }

            if (message.serverContent?.interrupted) {
              audioSourcesRef.current.forEach(s => { try { s.stop(); } catch(e) {} });
              audioSourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }
          },
          onclose: () => {
            setIsLiveActive(false);
            cleanupAudioPipeline();
          },
          onerror: (e: any) => {
            setError(e.message || "Live bridge integrity failure.");
            setIsLiveActive(false);
            cleanupAudioPipeline();
          },
        },
        config: {
          responseModalities: [Modality.AUDIO],
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
          systemInstruction: `${SYSTEM_PROMPT_BASE}\n\n[LEDGER_CONTEXT]\n${ledger}`
        }
      });
      liveSessionRef.current = sessionPromise;
    } catch (err: any) {
      setError(err.message || "Hardware bridge failure.");
      setIsLiveActive(false);
      setIsLoading(false);
      cleanupAudioPipeline();
    }
  };

  const stopLiveMode = () => {
    setIsLiveActive(false);
    if (liveSessionRef.current) {
      liveSessionRef.current.then((s: any) => s.close());
      liveSessionRef.current = null;
    }
    setTranscriptions([]);
    cleanupAudioPipeline();
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsLoading(true);
    setError(null);

    try {
      const { data: txs } = await supabase.from('transactions').select('*').order('created_at', { ascending: false }).limit(30);
      const ledger = txs?.map(t => `[${t.created_at}] ${t.source}: ₹${t.amount}`).join('\n') || "No data";

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: userMsg,
        config: {
          systemInstruction: `${SYSTEM_PROMPT_BASE}\n\n[LEDGER_CONTEXT]\n${ledger}`,
          thinkingConfig: { thinkingBudget: useThinking ? 32768 : 0 },
          tools: [{ googleSearch: {} }]
        }
      });

      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: response.text || "Neural consensus node timeout."
      }]);
    } catch (err: any) {
      setError(err.message || "Signal ingestion failure.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-14rem)] max-w-7xl mx-auto">
      <canvas ref={canvasRef} className="hidden" />
      
      <div className="mb-10 flex items-center justify-between px-4">
        <div className="flex items-center gap-8">
          <h1 className="text-4xl font-black tracking-tighter text-slate-900 italic flex items-center gap-5">
            <Cpu className={`h-10 w-10 text-indigo-600 ${isLiveActive ? 'animate-pulse' : ''}`} />
            Forensic Command
          </h1>
          <div className="flex items-center gap-4 bg-white px-6 py-3 rounded-2xl border border-slate-200 shadow-sm">
             <Layers className={`h-4 w-4 ${useThinking ? 'text-indigo-600' : 'text-slate-300'}`} />
             <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Neural Depth</span>
             <button 
               onClick={() => setUseThinking(!useThinking)}
               className={`relative w-12 h-6 rounded-full transition-colors ${useThinking ? 'bg-indigo-600' : 'bg-slate-200'}`}
             >
                <motion.div animate={{ x: useThinking ? 24 : 4 }} className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-md" />
             </button>
          </div>
        </div>
        
        <div className="flex gap-4">
          <button 
            onClick={isLiveActive ? stopLiveMode : startLiveMode}
            className={`flex items-center gap-4 px-10 py-5 rounded-3xl font-black text-xs uppercase tracking-widest transition-all ${isLiveActive ? 'bg-rose-600 text-white shadow-2xl' : 'bg-slate-900 text-white shadow-xl hover:bg-slate-800'}`}
          >
            {isLiveActive ? <CameraOff className="h-5 w-5" /> : <Camera className="h-5 w-5" />}
            {isLiveActive ? 'Sever Bridge' : 'Live Vision Audit'}
          </button>
        </div>
      </div>

      <div className="flex-1 flex gap-8 overflow-hidden">
        {/* Main Console */}
        <div className="flex-1 flex flex-col bg-slate-950 rounded-[4rem] shadow-3xl border border-slate-800 overflow-hidden relative">
          
          {/* Live Video Feed Overlay */}
          <AnimatePresence>
            {isLiveActive && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }} 
                animate={{ opacity: 1, scale: 1 }} 
                exit={{ opacity: 0, scale: 1.1 }}
                className="absolute top-8 right-8 w-64 aspect-video bg-black rounded-3xl overflow-hidden border-2 border-indigo-500/50 shadow-2xl z-50 ring-4 ring-black/50"
              >
                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
                <div className="absolute top-0 left-0 w-full h-0.5 bg-indigo-500/80 shadow-[0_0_15px_rgba(99,102,241,1)] animate-[scan_3s_infinite] pointer-events-none" />
                <div className="absolute bottom-3 left-3 flex items-center gap-2">
                   <div className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" />
                   <span className="text-[8px] font-black uppercase text-white tracking-widest">Live Visual Data</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex-1 overflow-y-auto p-12 space-y-12">
            {messages.map((msg, idx) => (
              <motion.div key={idx} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`p-10 rounded-[2.5rem] text-sm leading-relaxed max-w-[85%] font-medium whitespace-pre-wrap ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none shadow-2xl' : 'bg-slate-900/40 text-slate-200 rounded-tl-none border border-slate-800 backdrop-blur-md'}`}>
                   {msg.content}
                </div>
              </motion.div>
            ))}

            <AnimatePresence>
              {isLiveActive && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
                  <div className="flex flex-col items-center justify-center py-20 bg-indigo-500/5 rounded-[3rem] border border-indigo-500/10">
                    <div className="flex gap-2 items-center h-16">
                      {[...Array(12)].map((_, i) => (
                        <motion.div key={i} animate={{ height: [8, 48, 8] }} transition={{ repeat: Infinity, duration: 0.5, delay: i * 0.05 }} className="w-2 bg-indigo-500 rounded-full" />
                      ))}
                    </div>
                    <p className="mt-8 text-[10px] font-black uppercase tracking-[0.5em] text-indigo-400">Processing Neural Signals</p>
                  </div>
                  
                  {transcriptions.map((t, i) => (
                    <motion.div key={`live-${i}`} initial={{ opacity: 0, x: t.role === 'user' ? 20 : -20 }} animate={{ opacity: 1, x: 0 }} className={`flex flex-col ${t.role === 'user' ? 'items-end' : 'items-start'}`}>
                       <span className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-600 mb-2">{t.role === 'user' ? 'Operator Stream' : 'Unit Synthesis'}</span>
                       <div className={`p-8 rounded-[2rem] text-xs font-bold ${t.role === 'user' ? 'bg-indigo-600/20 text-indigo-100' : 'bg-slate-800 text-slate-300'} border border-white/5`}>
                          {t.text}
                       </div>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
            
            {isLoading && !isLiveActive && (
              <div className="flex justify-start">
                <div className="bg-slate-900/40 px-8 py-5 rounded-full border border-slate-800 flex items-center gap-4">
                  <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Node Thinking...</span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {!isLiveActive && (
            <form onSubmit={handleSend} className="p-12 bg-slate-900/20 border-t border-slate-800/50">
              <div className="relative flex items-center">
                 <Terminal className="absolute left-8 h-6 w-6 text-slate-600" />
                 <input 
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Input forensic signal query..."
                    className="w-full bg-slate-950 border-slate-800/80 rounded-[2.5rem] py-8 pl-20 pr-24 text-slate-200 placeholder:text-slate-700 focus:ring-4 focus:ring-indigo-600/10 text-sm font-mono transition-all"
                 />
                 <button type="submit" disabled={isLoading} className="absolute right-5 h-16 w-16 flex items-center justify-center rounded-3xl bg-indigo-600 text-white shadow-xl hover:scale-105 active:scale-95 transition-all">
                    <Send className="h-7 w-7" />
                 </button>
              </div>
            </form>
          )}
        </div>
      </div>
      
      {error && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="fixed bottom-12 right-12 z-[200]">
           <div className="bg-rose-50 text-rose-600 border border-rose-100 px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-4">
              <AlertCircle className="h-5 w-5" />
              <span className="text-xs font-black uppercase tracking-widest">{error}</span>
              <button onClick={() => setError(null)} className="ml-4 hover:scale-110 transition-transform"><Trash2 className="h-4 w-4" /></button>
           </div>
        </motion.div>
      )}
      <style>{`
        @keyframes scan {
          0% { transform: translateY(0); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(144px); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
