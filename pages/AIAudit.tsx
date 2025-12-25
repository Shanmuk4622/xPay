
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Modality, LiveServerMessage } from "@google/genai";
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Cpu, 
  Send, 
  Loader2, 
  Terminal,
  Key,
  Mic,
  Volume2,
  Activity,
  MessageSquare,
  Zap,
  Layers,
  AlertCircle,
  ExternalLink,
  Trash2,
  Info,
  ShieldCheck,
  History,
  Lightbulb
} from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  sources?: Array<{ title: string; uri: string }>;
  isThinking?: boolean;
}

interface TranscriptionEntry {
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

const SYSTEM_PROMPT = `
You are "FinTrack Intelligence Core v3", a high-level Forensic Accountant and Data Auditor.
Objective: Analyze financial signals within the provided ledger context to detect anomalies, patterns, and velocity shifts.
Guidelines:
1. PRECISION: Use exact figures from context.
2. ANOMALY DETECTION: Flag potential duplicates or unusual patterns.
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
    { role: 'assistant', content: "Intelligence Core synchronized. Ready for forensic analysis via terminal or live audio." }
  ]);
  const [transcriptions, setTranscriptions] = useState<TranscriptionEntry[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasKey, setHasKey] = useState<boolean | null>(null);
  const [isLiveActive, setIsLiveActive] = useState(false);
  const [useThinking, setUseThinking] = useState(true);
  
  const bottomRef = useRef<HTMLDivElement>(null);
  const transcriptionEndRef = useRef<HTMLDivElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const liveSessionRef = useRef<any>(null);
  const audioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const nextStartTimeRef = useRef(0);
  const curInputTransRef = useRef('');
  const curOutputTransRef = useRef('');
  
  const micStreamRef = useRef<MediaStream | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);

  useEffect(() => {
    const checkKey = async () => {
      try {
        const selected = await (window as any).aistudio.hasSelectedApiKey();
        setHasKey(selected);
      } catch { setHasKey(false); }
    };
    checkKey();
    return () => stopLiveMode();
  }, []);

  const handleSelectKey = async () => {
    await (window as any).aistudio.openSelectKey();
    setHasKey(true);
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  useEffect(() => {
    transcriptionEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcriptions]);

  const toggleLiveMode = async () => {
    if (isLiveActive) stopLiveMode();
    else await startLiveMode();
  };

  const startLiveMode = async () => {
    setIsLiveActive(true);
    setIsLoading(true);
    setTranscriptions([]);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;
      
      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      
      await inputCtx.resume();
      await outputCtx.resume();
      audioContextRef.current = outputCtx;

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: () => {
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
              audioSourcesRef.current.forEach(s => {
                try { s.stop(); } catch(e) {}
              });
              audioSourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }
          },
          onclose: () => {
            setIsLiveActive(false);
            cleanupAudioPipeline();
          },
          onerror: (e: any) => {
            if (e.message?.includes('Requested entity was not found')) setHasKey(false);
            setIsLiveActive(false);
            cleanupAudioPipeline();
          },
        },
        config: {
          responseModalities: [Modality.AUDIO],
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
          systemInstruction: SYSTEM_PROMPT
        }
      });
      liveSessionRef.current = sessionPromise;
    } catch (err: any) {
      if (err.message?.includes('Requested entity was not found')) setHasKey(false);
      setIsLiveActive(false);
      setIsLoading(false);
      cleanupAudioPipeline();
    }
  };

  const cleanupAudioPipeline = () => {
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
  };

  const stopLiveMode = () => {
    setIsLiveActive(false);
    if (liveSessionRef.current) {
      liveSessionRef.current.then((s: any) => s.close());
      liveSessionRef.current = null;
    }
    
    if (transcriptions.length > 0) {
      const summary = transcriptions.map(t => `${t.role.toUpperCase()}: ${t.text}`).join('\n');
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `VOICE_AUDIT_LOG_ENTRY:\n${summary.length > 500 ? summary.slice(0, 500) + '...' : summary}` 
      }]);
    }

    cleanupAudioPipeline();
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsLoading(true);

    try {
      const { data: txs } = await supabase.from('transactions').select('*').order('created_at', { ascending: false }).limit(30);
      const ledger = txs?.map(t => `[${t.created_at}] ${t.source}: ₹${t.amount}`).join('\n') || "No data";

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: userMsg,
        config: {
          systemInstruction: `${SYSTEM_PROMPT}\n\n[LEDGER_CONTEXT]\n${ledger}`,
          thinkingConfig: { thinkingBudget: useThinking ? 32768 : 0 },
          tools: [{ googleSearch: {} }]
        }
      });

      const citations = response.candidates?.[0]?.groundingMetadata?.groundingChunks
        ?.map((chunk: any) => chunk.web)
        .filter((web: any) => web && web.uri) || [];

      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: response.text || "Consensus node timeout.",
        sources: citations
      }]);
    } catch (err: any) {
      if (err.message?.includes('Requested entity was not found')) {
        setHasKey(false);
        return;
      }
      setMessages(prev => [...prev, { role: 'assistant', content: `CRITICAL_ERROR: ${err.message}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearLogs = () => {
    setMessages([{ role: 'assistant', content: "Terminal buffers cleared. Monitoring standby." }]);
    setTranscriptions([]);
  };

  if (hasKey === false) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] text-center px-4">
        <Key className="h-16 w-16 text-indigo-600 mb-8" />
        <h2 className="text-4xl font-black italic tracking-tighter mb-6 text-slate-900">Secure Protocol Required</h2>
        <p className="mb-8 text-sm font-medium text-slate-500 max-w-sm leading-relaxed">
          Forensic analysis requires a verified Google Cloud Project. 
          Visit <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="text-indigo-600 font-bold hover:underline">billing documentation</a> to authorize access.
        </p>
        <button onClick={handleSelectKey} className="rounded-3xl bg-slate-950 px-12 py-6 text-sm font-black uppercase tracking-widest text-white shadow-2xl hover:scale-105 transition-transform active:scale-95">Verify Identity</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-14rem)] max-w-6xl mx-auto">
      <div className="mb-10 flex items-center justify-between px-4">
        <div className="flex items-center gap-8">
          <h1 className="text-4xl font-black tracking-tighter text-slate-900 italic flex items-center gap-5">
            <Cpu className={`h-10 w-10 text-indigo-600 ${isLiveActive ? 'animate-pulse' : ''}`} />
            Audit Terminal
          </h1>
          <div className="flex items-center gap-4 bg-white px-6 py-3 rounded-2xl border border-slate-200 shadow-sm">
             <Layers className={`h-4 w-4 ${useThinking ? 'text-indigo-600' : 'text-slate-300'}`} />
             <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Neural Depth</span>
             <button 
               onClick={() => setUseThinking(!useThinking)}
               className={`relative w-12 h-6 rounded-full transition-colors ${useThinking ? 'bg-indigo-600 shadow-[0_0_15px_rgba(79,70,229,0.4)]' : 'bg-slate-200'}`}
             >
                <motion.div 
                  animate={{ x: useThinking ? 24 : 4 }}
                  className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-md"
                />
             </button>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <button onClick={clearLogs} className="p-4 rounded-2xl text-slate-300 hover:text-rose-500 transition-colors">
            <Trash2 className="h-5 w-5" />
          </button>
          <button 
            onClick={toggleLiveMode}
            className={`flex items-center gap-4 px-8 py-4 rounded-3xl font-black text-xs uppercase tracking-widest transition-all ${isLiveActive ? 'bg-rose-600 text-white shadow-2xl shadow-rose-200' : 'bg-slate-900 text-white shadow-xl hover:bg-slate-800'}`}
          >
            {isLiveActive ? <Activity className="h-5 w-5 animate-pulse" /> : <Mic className="h-5 w-5" />}
            {isLiveActive ? 'Disconnect' : 'Voice Pulse'}
          </button>
        </div>
      </div>

      <div className="flex-1 flex gap-8 overflow-hidden">
        <div className="flex-1 flex flex-col bg-slate-950 rounded-[3.5rem] shadow-2xl border border-slate-800 overflow-hidden relative">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 opacity-20" />
          
          <AnimatePresence mode="wait">
            {isLiveActive ? (
              <motion.div 
                key="voice"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 flex flex-col items-center justify-center p-12 space-y-16"
              >
                <div className="relative">
                  <motion.div animate={{ scale: [1, 1.4, 1], opacity: [0.1, 0.4, 0.1] }} transition={{ repeat: Infinity, duration: 3 }} className="absolute inset-0 bg-indigo-500 blur-[80px] rounded-full" />
                  <div className="relative h-64 w-64 rounded-full border-2 border-indigo-500/20 flex items-center justify-center backdrop-blur-3xl bg-slate-900/40">
                     <div className="flex gap-2 items-center h-20">
                        {[...Array(8)].map((_, i) => (
                          <motion.div key={i} animate={{ height: [12, 60, 12] }} transition={{ repeat: Infinity, duration: 0.6, delay: i * 0.08 }} className="w-2.5 bg-indigo-500 rounded-full" />
                        ))}
                     </div>
                  </div>
                </div>
                <div className="text-center space-y-4">
                  <h3 className="text-2xl font-black text-white italic tracking-tight">Biometric Stream Active</h3>
                  <p className="text-[10px] font-black uppercase text-indigo-400 tracking-[0.4em] flex items-center justify-center gap-2">
                    <ShieldCheck className="h-3 w-3" /> Central Unit Consensus Verified
                  </p>
                </div>
              </motion.div>
            ) : (
              <motion.div key="chat" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 overflow-y-auto p-12 space-y-12">
                {messages.map((msg, idx) => (
                  <motion.div key={idx} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                    <div className={`p-10 rounded-[2.5rem] text-sm leading-relaxed max-w-[85%] font-medium whitespace-pre-wrap ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none shadow-2xl' : 'bg-slate-900/40 text-slate-200 rounded-tl-none border border-slate-800 backdrop-blur-md'}`}>
                       {msg.content}
                    </div>
                    {msg.sources && msg.sources.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-2 ml-4">
                        {msg.sources.map((src, sIdx) => (
                          <a key={sIdx} href={src.uri} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-4 py-2 rounded-xl text-[10px] font-black text-indigo-400 hover:bg-slate-800 transition-all">
                            <ExternalLink className="h-3 w-3" /> {src.title.slice(0, 20)}...
                          </a>
                        ))}
                      </div>
                    )}
                  </motion.div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-slate-900/40 px-8 py-5 rounded-full border border-slate-800 flex items-center gap-4">
                      <div className="flex gap-1 items-center">
                        <motion.div animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 1 }} className="h-2 w-2 rounded-full bg-indigo-500" />
                        <motion.div animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="h-2 w-2 rounded-full bg-indigo-500" />
                        <motion.div animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="h-2 w-2 rounded-full bg-indigo-500" />
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                        <Lightbulb className="h-3 w-3" /> Core Thinking...
                      </span>
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </motion.div>
            )}
          </AnimatePresence>

          {!isLiveActive && (
            <form onSubmit={handleSend} className="p-12 bg-slate-900/20 backdrop-blur-xl border-t border-slate-800/50">
              <div className="relative flex items-center">
                 <Terminal className="absolute left-8 h-6 w-6 text-slate-600" />
                 <input 
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Input forensic signal query..."
                    className="w-full bg-slate-950 border-slate-800/80 rounded-[2rem] py-7 pl-18 pr-20 text-slate-200 placeholder:text-slate-700 focus:ring-4 focus:ring-indigo-600/10 text-sm font-mono transition-all"
                 />
                 <button type="submit" disabled={isLoading} className="absolute right-5 h-14 w-14 flex items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-xl hover:scale-105 active:scale-95 transition-all">
                    <Send className="h-6 w-6" />
                 </button>
              </div>
            </form>
          )}
        </div>

        <AnimatePresence>
          {isLiveActive && (
            <motion.div initial={{ x: 300, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 300, opacity: 0 }} className="w-96 flex flex-col bg-white rounded-[3.5rem] shadow-2xl border border-slate-200 overflow-hidden">
              <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <History className="h-4 w-4 text-slate-400" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Telemetry Log</span>
                </div>
                <MessageSquare className="h-4 w-4 text-slate-300" />
              </div>
              <div className="flex-1 overflow-y-auto p-8 space-y-8">
                {transcriptions.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center opacity-20 text-center px-6">
                    <Info className="h-12 w-12 mb-4" />
                    <p className="text-[10px] font-black uppercase tracking-widest">Awaiting Pulse</p>
                  </div>
                )}
                {transcriptions.map((t, i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="space-y-2">
                    <span className={`text-[9px] font-black uppercase tracking-widest ${t.role === 'user' ? 'text-indigo-600' : 'text-slate-400'}`}>{t.role === 'user' ? 'Operator' : 'Central_Unit'}</span>
                    <p className={`text-xs font-medium leading-relaxed ${t.role === 'user' ? 'text-slate-900' : 'text-slate-500 italic'}`}>{t.text}</p>
                  </motion.div>
                ))}
                <div ref={transcriptionEndRef} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
