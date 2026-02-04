import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Modality } from "@google/genai";
import { InterviewStyle, UserProfile } from '../types';
import { float32To16BitPCM, arrayBufferToBase64, base64ToUint8Array } from '../services/audioUtils';

interface StudioProps {
  interviewStyle: InterviewStyle;
  interviewTopic?: string;
  userProfile: UserProfile | null;
  onFinish: (blob: Blob) => void;
  onCancel: () => void;
}

// Updated Personalities: "Professional Inquiry"
const STYLES_CONFIG: Record<InterviewStyle, { system: string; voice: string }> = {
  'WIN_OF_WEEK': {
    system: "You are an investigative journalist. Your goal is to uncover the root cause of a recent success. Ask these 3 questions, but LISTEN closely. If the user gives a short answer, ask a follow-up 'Why?' or 'Tell me more about X' before moving to the next number. \n\n1. What’s something that worked better than expected recently? \n2. Why do you think it worked—what was the underlying insight? \n3. How might you replicate or amplify this?",
    voice: 'Kore'
  },
  'HARD_LESSON': {
    system: "You are an empathetic but analytical mentor. Your goal is to extract a lesson from failure. Listen closely. Mirror back what they say ('So you felt X...'). If they are vague, dig deeper. \n\n1. What’s something that didn’t go the way you wanted lately? \n2. What assumptions did you have going in that turned out to be off? \n3. What are you doing differently now because of it?",
    voice: 'Charon'
  },
  'CUSTOMER_VOICE': {
    system: "You are a product researcher. Your goal is to understand the customer. Don't just accept surface answers. Ask for specific quotes or feelings. \n\n1. Tell me about a recent conversation with a customer that stuck with you. \n2. What did it reveal about how they actually experience your product or service? \n3. Is there something you need to change or communicate differently based on that?",
    voice: 'Puck'
  },
  'DECISION_IN_PROGRESS': {
    system: "You are a strategic advisor. Help the user weigh a decision. If they seem stuck, ask them to clarify the stakes. \n\n1. What’s a decision you’re wrestling with right now? \n2. What’s making it hard—what are the tensions or tradeoffs? \n3. What would make you feel confident enough to move forward?",
    voice: 'Fenrir'
  },
  'PATTERN_RECOGNITION': {
    system: "You are a market analyst. Your goal is to separate signal from noise. Be skeptical but curious. \n\n1. What’s something you keep seeing over and over in your business lately? \n2. Is it a signal you should be acting on or noise you should ignore? \n3. If it’s a signal, what’s the move?",
    voice: 'Puck'
  },
  'ENERGY_CHECK': {
    system: "You are a performance coach. Focus on the user's state of mind. \n\n1. What part of the work is giving you energy right now? \n2. What’s draining you or feeling like a grind? \n3. Is there something you need to delegate, drop, or redesign?",
    voice: 'Kore'
  }
};

export const Studio: React.FC<StudioProps> = ({ interviewStyle, interviewTopic, userProfile, onFinish, onCancel }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [aiSpeaking, setAiSpeaking] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string|null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<number | null>(null);
  
  // Dual Contexts: One for Mic input (16k), one for Speaker output (24k/System)
  const inputContextRef = useRef<AudioContext | null>(null);
  const outputContextRef = useRef<AudioContext | null>(null);
  
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const nextStartTimeRef = useRef<number>(0);

  // Active voice config
  const activeVoice = STYLES_CONFIG[interviewStyle].voice;

  useEffect(() => {
    let cleanup = false;

    const init = async () => {
      try {
        // AUDIO ONLY REQUEST
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            sampleRate: 16000,
            channelCount: 1,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        });
        
        streamRef.current = stream;
        
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        
        // 1. Input Context (Must be 16kHz for Gemini)
        const inputCtx = new AudioContextClass({ sampleRate: 16000 });
        inputContextRef.current = inputCtx;

        // 2. Output Context (Higher quality for playback, e.g. 24kHz or 48kHz)
        // We use 24000 to match Gemini's native output rate
        const outputCtx = new AudioContextClass({ sampleRate: 24000 });
        outputContextRef.current = outputCtx;
        
        // Resume contexts if they started suspended (common in browsers waiting for user gesture)
        try { if (inputCtx.state === 'suspended') await inputCtx.resume(); } catch(e) {}
        try { if (outputCtx.state === 'suspended') await outputCtx.resume(); } catch(e) {}

        const styleConfig = STYLES_CONFIG[interviewStyle];
        const client = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
        
        // INJECT USER MEMORY & TOPIC
        let dynamicSystemInstruction = styleConfig.system;
        
        if (interviewTopic) {
            dynamicSystemInstruction += `\n\nCONTEXT: The user specifically wants to discuss "${interviewTopic}" within this framework.`;
        }
        
        if (userProfile) {
            const insightsText = (userProfile.insights || [])
                .slice(-10)
                .map(i => `- [${i.category}] ${i.text}`)
                .join('\n');
            
            dynamicSystemInstruction += `\n\nIMPORTANT - You are interviewing ${userProfile.name}. 
            Here is what you know about them from past conversations:\n${insightsText}\n`;
        }
        
        // Strict behavior enforcement
        dynamicSystemInstruction += `\n\nBEHAVIOR:
        - Do NOT initiate the conversation. Wait for the user to speak or the system trigger.
        - Be concise.
        - Ask one question at a time.
        - Use professional curiosity, not fake enthusiasm.`;

        const sessionPromise = client.live.connect({
          model: 'gemini-2.5-flash-native-audio-preview-09-2025',
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              voiceConfig: { prebuiltVoiceConfig: { voiceName: styleConfig.voice } }
            },
            systemInstruction: dynamicSystemInstruction,
          },
          callbacks: {
            onopen: () => {
              console.log("Gemini Live Connected");
              setIsConnected(true);
            },
            onmessage: async (msg: any) => {
              const audioData = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
              if (audioData) {
                setAiSpeaking(true);
                const audioBytes = base64ToUint8Array(audioData);
                const int16 = new Int16Array(audioBytes.buffer);
                const float32 = new Float32Array(int16.length);
                for(let i=0; i<int16.length; i++) {
                  float32[i] = int16[i] / 32768.0;
                }
                
                // Play via Output Context
                const ctx = outputContextRef.current;
                if (!ctx) return;
                
                if (ctx.state === 'suspended') await ctx.resume();

                const buffer = ctx.createBuffer(1, float32.length, 24000); 
                buffer.getChannelData(0).set(float32);

                const source = ctx.createBufferSource();
                source.buffer = buffer;
                source.connect(ctx.destination);
                
                const now = ctx.currentTime;
                const start = Math.max(now, nextStartTimeRef.current);
                source.start(start);
                nextStartTimeRef.current = start + buffer.duration;
                
                source.onended = () => {
                  if (ctx.currentTime >= nextStartTimeRef.current) {
                    setAiSpeaking(false);
                  }
                };
              }
            },
            onclose: () => setIsConnected(false),
            onerror: (err: any) => {
              console.error("Gemini Live Error:", err);
              if (!isRecording) {
                 const msg = err.message || JSON.stringify(err);
                 if (msg.includes('unavailable') || msg.includes('503')) {
                    setErrorMsg("AI Service is currently overloaded/unavailable. Please try again in a moment.");
                 } else {
                    setErrorMsg("Connection to AI assistant failed.");
                 }
              }
            }
          }
        });
        sessionPromiseRef.current = sessionPromise;

        // Connect Mic -> Input Context -> Processor
        const source = inputCtx.createMediaStreamSource(stream);
        const processor = inputCtx.createScriptProcessor(4096, 1, 1);
        processorRef.current = processor;
        
        processor.onaudioprocess = (e) => {
           if (cleanup) return;
           const inputData = e.inputBuffer.getChannelData(0);
           
           let sum = 0;
           for(let i=0; i<inputData.length; i++) sum += inputData[i] * inputData[i];
           setAudioLevel(Math.sqrt(sum / inputData.length));

           const int16Data = float32To16BitPCM(inputData);
           const b64Data = arrayBufferToBase64(int16Data.buffer);
           
           if (sessionPromiseRef.current) {
             sessionPromiseRef.current.then(session => {
                session.sendRealtimeInput({
                  media: { mimeType: 'audio/pcm;rate=16000', data: b64Data }
                });
             });
           }
        };

        source.connect(processor);
        processor.connect(inputCtx.destination); 

      } catch (err) {
        console.error("Setup failed", err);
        setErrorMsg("Failed to access microphone. Please ensure permissions are granted.");
      }
    };

    init();

    return () => {
      cleanup = true;
      if (processorRef.current) {
        processorRef.current.disconnect();
        processorRef.current = null;
      }
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      if (inputContextRef.current) inputContextRef.current.close();
      if (outputContextRef.current) outputContextRef.current.close();
    };
  }, [interviewStyle, userProfile, interviewTopic]);


  const startRecording = async () => {
    if (!streamRef.current) return;
    
    // Safety: Ensure audio contexts are running
    if (inputContextRef.current?.state === 'suspended') await inputContextRef.current.resume();
    if (outputContextRef.current?.state === 'suspended') await outputContextRef.current.resume();

    chunksRef.current = [];
    
    // Audio MIME Types
    const supportedTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4', // iOS Safari 14.5+
        'audio/ogg;codecs=opus'
    ];
    
    const mimeType = supportedTypes.find(type => MediaRecorder.isTypeSupported(type));
    console.log("Using MIME type:", mimeType);

    try {
      const options: MediaRecorderOptions = {};
      if (mimeType) {
          options.mimeType = mimeType;
      }

      const recorder = new MediaRecorder(streamRef.current, options);
      
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        // Blob type should match recorder type
        const blob = new Blob(chunksRef.current, { type: mimeType || 'audio/webm' });
        if (blob.size > 0) onFinish(blob);
      };
      
      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      
      if (sessionPromiseRef.current) {
          sessionPromiseRef.current.then((session: any) => {
              session.sendRealtimeInput({
                  text: "System: The user has started recording. IMMEDIATELY ask the first question in your sequence now. Do not greet them."
              });
          });
      }
      timerRef.current = window.setInterval(() => setRecordingTime(prev => prev + 1), 1000);
    } catch (e) {
      console.error("MediaRecorder error:", e);
      setErrorMsg("Could not start recording. Browser might not support this format.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      if (timerRef.current) clearInterval(timerRef.current);
      setIsRecording(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="relative h-[100dvh] bg-gradient-to-b from-gray-900 to-black overflow-hidden flex flex-col">

      {!isConnected && !errorMsg && (
         <div className="absolute inset-0 z-50 bg-black/80 flex items-center justify-center flex-col text-white">
            <div className="w-12 h-12 border-4 border-[#1f3a2e] border-t-transparent rounded-full animate-spin mb-4"></div>
            <p>Connecting to AI Interviewer...</p>
         </div>
      )}

      {errorMsg && (
         <div className="absolute inset-0 z-50 bg-black/80 flex items-center justify-center flex-col text-white p-6 text-center">
            <p className="text-red-400 mb-4">{errorMsg}</p>
            <button onClick={onCancel} className="bg-white text-black px-4 py-2 rounded">Go Back</button>
         </div>
      )}

      {/* Main Overlay UI */}
      <div className="relative z-10 flex-1 flex flex-col justify-between p-6">
        
        {/* Top Header */}
        <div className="flex flex-col gap-4 w-full">
            <div className="flex justify-between items-start">
                <div className="bg-white/5 backdrop-blur-md rounded-lg px-4 py-2 border border-white/10 flex flex-col items-start gap-1">
                    <div className="flex items-center gap-2">
                        <h2 className="text-white font-semibold text-sm tracking-wide uppercase text-[#6B9B7F]">
                            {interviewStyle.replace(/_/g, ' ')}
                        </h2>
                        <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500 animate-pulse'}`}></div>
                            <span className="text-xs text-gray-300">{isConnected ? 'Online' : 'Loading...'}</span>
                        </div>
                    </div>
                    {interviewTopic && (
                        <span className="text-xs text-white/70 max-w-[200px] truncate">
                            Topic: {interviewTopic}
                        </span>
                    )}
                </div>
                <button onClick={onCancel} className="text-white/70 hover:text-white text-sm bg-white/5 hover:bg-white/10 px-3 py-1 rounded backdrop-blur-sm transition-all border border-white/10">Cancel</button>
            </div>

            {/* Prompt Text - Moved to top and styled to avoid overlap */}
            {isConnected && !isRecording && (
                <div className="mx-auto text-center max-w-md mt-4 animate-fade-in-up bg-black/30 backdrop-blur-sm rounded-xl p-3 border border-white/5 relative z-30">
                     <p className="text-white/90 text-lg font-light drop-shadow-md">
                        {interviewTopic 
                            ? `Ready to discuss "${interviewTopic}"`
                            : "Press record to start your session."}
                     </p>
                </div>
            )}
        </div>

        {/* AI VISUALIZER - OPAQUE & GLOWING BRAND ORB (Now on dark background) */}
        {/* Added pointer-events-none so it doesn't block the stop button */}
        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 transition-opacity duration-500 z-20 pointer-events-none ${aiSpeaking ? 'opacity-100' : 'opacity-100' /* Always visible now as main focus */}`}>
             <div className="relative flex items-center justify-center">
                
                {/* Outer Aura (The "Glowing" Part) */}
                <div className={`absolute rounded-full bg-[#1f3a2e] blur-3xl opacity-30 animate-pulse transition-all duration-700 ease-in-out ${aiSpeaking ? 'w-96 h-96' : 'w-64 h-64'}`}></div>
                
                {/* Middle Ring */}
                <div className={`absolute rounded-full border border-[#1f3a2e]/20 bg-[#1f3a2e]/5 animate-ping opacity-20 w-80 h-80`}></div>

                {/* The Core Orb (The "Opaque" Part) */}
                <div className={`relative rounded-full bg-gradient-to-br from-white via-[#e8ede9] to-[#6B9B7F] shadow-[0_0_60px_rgba(31,58,46,0.6)] border border-white/40 overflow-hidden flex items-center justify-center transition-all duration-300 ${aiSpeaking ? 'w-40 h-40 scale-110' : 'w-32 h-32 scale-100'}`}>
                    
                    {/* Glossy Reflection */}
                    <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/90 to-transparent opacity-80 rounded-t-full"></div>
                    
                    {/* Inner Activity Animation */}
                    <div className="absolute inset-0 bg-[#1f3a2e] opacity-20 animate-pulse"></div>
                    
                </div>
             </div>
        </div>

        {/* Bottom Controls */}
        <div className="flex flex-col items-center gap-6 pb-8 z-50">
            {isRecording && (
                <div className="flex items-center gap-2 px-4 py-1 bg-red-600/90 rounded-full text-white font-mono text-sm shadow-lg animate-pulse">
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                    {formatTime(recordingTime)}
                </div>
            )}

            <div className="flex items-center gap-8 relative">
                 {/* Mic Input Visualizer */}
                 <div 
                    className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none w-28 h-28 rounded-full border border-[#1f3a2e]/50 transition-all duration-75"
                    style={{ transform: `translate(-50%, -50%) scale(${1 + audioLevel * 3})`, opacity: audioLevel > 0.01 ? 1 : 0 }}
                 ></div>

                 {!isRecording ? (
                    <button
                        onClick={startRecording}
                        disabled={!isConnected}
                        className="relative z-10 w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-xl hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
                    >
                        <div className="w-16 h-16 bg-red-500 rounded-full group-hover:bg-red-600 transition-colors"></div>
                    </button>
                 ) : (
                    <button
                        onClick={stopRecording}
                        className="relative z-10 w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-xl hover:scale-105 transition-all group"
                    >
                         <div className="w-8 h-8 bg-black rounded-md group-hover:bg-gray-800 transition-colors"></div>
                    </button>
                 )}
            </div>
            <p className="text-white/50 text-xs font-medium tracking-wide">
                {isRecording ? "LISTENING..." : "READY"}
            </p>
        </div>
      </div>
    </div>
  );
};