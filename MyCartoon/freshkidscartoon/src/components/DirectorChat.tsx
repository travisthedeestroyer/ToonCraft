/**
 * DirectorChat Component
 * 
 * Core voice interaction interface for MyCartoon.org's AI director system.
 * Handles real-time bidirectional voice streaming with Google's Gemini Live API
 * with intelligent fallback to text-based chat when Live API is unavailable.
 * 
 * KEY FEATURES:
 * - Real-time voice streaming at 16kHz sample rate
 * - Age-appropriate director personas (Bubbles/Spark/Ace)
 * - Audio visualizer with dynamic frequency analysis
 * - Automatic idle detection and engagement prompts
 * - Graceful degradation to text-based fallback mode
 * - WebAudio API integration for low-latency playback
 * 
 * TECHNICAL ARCHITECTURE:
 * - Uses ScriptProcessorNode for mic capture (legacy but stable)
 * - Maintains persistent WebSocket connection to Gemini Live API
 * - Implements queue-based audio playback with precise timing
 * - Canvas-based real-time visualizer with frequency domain analysis
 * 
 * @author Travis (MyCartoon.org)
 * @version 2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Clapperboard, Film, Mic, MicOff, Video, BookOpen, Crown, Dice5, AlertTriangle, MessageSquare } from 'lucide-react';
import { base64PCM16ToFloat32 } from '../audio';
import { getLiveClient, generateNarration, transcribeAudio, chatWithDirector } from '../services/geminiService';
import { Theme, Message } from '../types';
import { GET_LIVE_SYSTEM_INSTRUCTION } from '../constants';
import { LiveServerMessage, FunctionDeclaration, Type, Modality } from "@google/genai";


/**
 * DirectorChat Component Props
 * 
 * @property onStoryReady - Callback fired when user completes story brainstorming
 * @property theme - UI theme configuration for consistent styling
 * @property userAge - Child's age (determines director persona: <8=Bubbles, <11=Spark, ≥11=Ace)
 * @property isMovieMode - Toggle between Storybook (images) and Movie (video) mode
 * @property setIsMovieMode - Function to update movie mode state
 * @property isPro - Whether user has PRO subscription (unlimited scenes)
 * @property wallet - User's token balance for in-app purchases
 * @property onOpenSubscription - Callback to open subscription/upgrade modal
 * @property veoTrials - Remaining free video generation trials
 * @property currentVoiceId - Selected TTS voice ID for narration (Kore/Puck/Charon/etc)
 */
interface DirectorChatProps {
  onStoryReady: (context: string) => void;
  theme: Theme;
  userAge: number;
  isMovieMode: boolean;
  setIsMovieMode: (val: boolean) => void;
  isPro: boolean;
  wallet: number;
  onOpenSubscription: () => void;
  veoTrials: number;
  currentVoiceId: string;
}

/**
 * Gemini Live API Function Declaration: "startFilming"
 * 
 * This tool is called by the AI director when story brainstorming is complete.
 * The director must gather 3 core story elements (Hero, Setting, Plot) before calling.
 * 
 * TRIGGER CONDITIONS:
 * - User explicitly says "Start", "Ready", "Action", "I'm done"
 * - Director has collected: character description, location/setting, and conflict/action
 * - User indicates they're finished brainstorming
 * 
 * BEHAVIOR:
 * When this tool is called, the `onStoryReady` callback fires with the story summary,
 * transitioning the app from brainstorming mode to script generation and production.
 * 
 * @param summary - Complete story synopsis combining all gathered elements
 */
const startFilmingTool: FunctionDeclaration = {
    name: 'startFilming',
    description: 'Call this function when the story brainstorming is finished and you have the Hero, Setting, and Plot.',
    parameters: {
        type: Type.OBJECT,
        description: 'Call this function when the story brainstorming is finished and you have the Hero, Setting, and Plot.',
        properties: {
            summary: { type: Type.STRING, description: 'The final summary of the story.' }
        },
        required: ['summary']
    }
};

export const DirectorChat: React.FC<DirectorChatProps> = ({ 
  onStoryReady, 
  theme, 
  userAge,
  isMovieMode,
  setIsMovieMode,
  isPro,
  veoTrials,
  onOpenSubscription,
  currentVoiceId
}) => {
  const [connectionStatus, setConnectionStatus] = useState<string>("Waking up the Director...");
  const [isDirectorSpeaking, setIsDirectorSpeaking] = useState(false);
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // FALLBACK MODE STATES
  const [isFallbackMode, setIsFallbackMode] = useState(false);
  const [isRecordingFallback, setIsRecordingFallback] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  const toggleMute = async () => {
      if (!audioContextRef.current) return;
      if (isMuted) {
          if (!isSessionActiveRef.current) {
              await startLiveSession();
          } else {
              await audioContextRef.current.resume();
          }
          setIsMuted(false);
          setConnectionStatus("Listening...");
      } else {
          await audioContextRef.current.suspend();
          setIsMuted(true);
          setConnectionStatus("Paused");
      }
  };
  const [fallbackHistory, setFallbackHistory] = useState<Message[]>([]);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Refs for audio handling
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourceNodesRef = useRef<AudioBufferSourceNode[]>([]);
  const currentSessionPromise = useRef<Promise<any> | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const isSessionActiveRef = useRef<boolean>(false);

  const onStoryReadyRef = useRef(onStoryReady);
  useEffect(() => {
    onStoryReadyRef.current = onStoryReady;
  }, [onStoryReady]);
  
  useEffect(() => {
    let active = true;
    const init = async () => {
        try {
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            const ctx = new AudioContextClass({ sampleRate: 16000 });
            audioContextRef.current = ctx;

            if (ctx.state === 'suspended') {
                await ctx.resume().catch(() => console.log("Waiting for user gesture"));
            }

            if (active) startLiveSession();
        } catch (e) {
            console.error("Auto-start failed", e);
            setErrorMessage("Please click the mic to start!");
        }
    };
    init();

    const animId = requestAnimationFrame(drawVisualizer);
    const watchdog = setInterval(checkIdle, 1000);

    return () => {
        active = false;
        stopLiveSession();
        cancelAnimationFrame(animId);
        clearInterval(watchdog);
    };
  }, []);

  const checkIdle = async () => {
      // Idle check only runs in Live Mode
      if (isFallbackMode) return;
      
      if (currentSessionPromise.current && !isDirectorSpeaking && !isUserSpeaking && hasStarted) {
          if (Date.now() - lastActivityRef.current > 12000) {
              lastActivityRef.current = Date.now(); 
              triggerIdlePrompt();
          }
      }
  };

  const triggerIdlePrompt = async () => {
      try {
          const idleText = "Are you still there? Tell me about your story!";
          const audio = await generateNarration(idleText, userAge, currentVoiceId);
          if (audio) playStreamAudio(audio); 
      } catch(e) { console.error(e); }
  };

  const resetIdle = () => lastActivityRef.current = Date.now();

  const playStreamAudio = (base64Audio: string) => {
    if (!audioContextRef.current) return;
    
    resetIdle();
    setIsDirectorSpeaking(true);

    const float32 = base64PCM16ToFloat32(base64Audio);
    const audioBuffer = audioContextRef.current.createBuffer(1, float32.length, 24000);
    audioBuffer.copyToChannel(float32, 0);

    const source = audioContextRef.current.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContextRef.current.destination);
    
    if (analyserRef.current) source.connect(analyserRef.current);

    const currentTime = audioContextRef.current.currentTime;
    if (nextStartTimeRef.current < currentTime) nextStartTimeRef.current = currentTime;
    
    source.start(nextStartTimeRef.current);
    nextStartTimeRef.current += audioBuffer.duration;
    sourceNodesRef.current.push(source);

    source.onended = () => {
        sourceNodesRef.current = sourceNodesRef.current.filter(n => n !== source);
        if (sourceNodesRef.current.length === 0) {
            setIsDirectorSpeaking(false);
        }
    };
  };

  const startLiveSession = async () => {
      if (isFallbackMode) return;
      
      setConnectionStatus("Calling your Magic Director...");
      setErrorMessage(null);
      isSessionActiveRef.current = true;
      
      try {
        if (!audioContextRef.current) {
             const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
             audioContextRef.current = new AudioContextClass({ sampleRate: 16000 });
        }
        if (audioContextRef.current.state === 'suspended') await audioContextRef.current.resume();

        // Check if context was successfully created
        if (!audioContextRef.current) {
            throw new Error("Could not create AudioContext");
        }

        analyserRef.current = audioContextRef.current.createAnalyser();
        analyserRef.current.fftSize = 256;

        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (!isSessionActiveRef.current || !audioContextRef.current) {
            stream.getTracks().forEach(t => t.stop());
            return;
        }
        audioStreamRef.current = stream;
        const source = audioContextRef.current.createMediaStreamSource(stream);
        source.connect(analyserRef.current!);

        const ai = getLiveClient(); // Will use current rotated key
        const config = {
            responseModalities: [Modality.AUDIO],
            // Use the passed in currentVoiceId (e.g., 'Puck', 'Kore')
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: currentVoiceId } } },
            systemInstruction: GET_LIVE_SYSTEM_INSTRUCTION(userAge),
            tools: [{ functionDeclarations: [startFilmingTool] }]
        };

        const sessionPromise = ai.live.connect({
            model: 'gemini-3.1-flash-live-preview',
            config,
            callbacks: {
                onopen: () => {
                    if (!isSessionActiveRef.current || !audioContextRef.current) return;
                    setConnectionStatus("Director is listening!");
                    setHasStarted(true);
                    nextStartTimeRef.current = audioContextRef.current.currentTime;
                },
                onmessage: async (msg: LiveServerMessage) => {
                    if (!isSessionActiveRef.current) return;
                    const audioData = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
                    if (audioData) playStreamAudio(audioData);

                    if (msg.serverContent?.interrupted) {
                         sourceNodesRef.current.forEach(n => { try{n.stop()}catch(e){} });
                         sourceNodesRef.current = [];
                         nextStartTimeRef.current = audioContextRef.current?.currentTime || 0;
                         setIsDirectorSpeaking(false);
                    }

                    if (msg.toolCall) {
                        const call = msg.toolCall.functionCalls.find(fc => fc.name === 'startFilming');
                        if (call) {
                            setConnectionStatus("Making your movie!");
                            const summary = (call.args as any).summary;
                            
                            sessionPromise.then(s => s.sendToolResponse({
                                functionResponses: [{
                                    name: call.name,
                                    id: call.id,
                                    response: { result: 'ok' } 
                                }]
                            }));
                            
                            setTimeout(() => {
                                stopLiveSession();
                                onStoryReadyRef.current(summary);
                            }, 2000);
                        }
                    }
                },
                onclose: () => {
                    if (isSessionActiveRef.current) {
                        setConnectionStatus("Disconnected");
                    }
                },
                onerror: (e) => {
                    console.error("Live API Error", e);
                    // CRITICAL: Switch to fallback mode if Live API fails
                    if (isSessionActiveRef.current) {
                        setConnectionStatus("Director is busy, let's use the magic mic!");
                        stopLiveSession();
                        setIsFallbackMode(true);
                        setHasStarted(true);
                    }
                }
            }
        });
        
        // Handle connection promise rejection (e.g., Deadline Exceeded)
        sessionPromise.catch((e) => {
             console.error("Live Connection Handshake Failed:", e);
             if (isSessionActiveRef.current) {
                 setConnectionStatus("Director is busy, let's use the magic mic!");
                 stopLiveSession();
                 setIsFallbackMode(true);
                 setHasStarted(true);
             }
        });

        currentSessionPromise.current = sessionPromise;

        if (!audioContextRef.current) return;
        const processor = audioContextRef.current.createScriptProcessor(4096, 1, 1);
        processorRef.current = processor;
        
        processor.onaudioprocess = async (e) => {
            if (!isSessionActiveRef.current) return;

            const inputData = e.inputBuffer.getChannelData(0);
            
            let sum = 0;
            for(let i=0; i<inputData.length; i++) sum += inputData[i] * inputData[i];
            const rms = Math.sqrt(sum / inputData.length);
            if (rms > 0.02) {
                setIsUserSpeaking(true);
                resetIdle();
            } else {
                setIsUserSpeaking(false);
            }

            const pcmData = new Int16Array(inputData.length);
            for (let i = 0; i < inputData.length; i++) {
                pcmData[i] = Math.max(-1, Math.min(1, inputData[i])) * 0x7FFF;
            }
            let binary = '';
            const bytes = new Uint8Array(pcmData.buffer);
            for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
            const base64Data = btoa(binary);

            try {
                const session = await sessionPromise;
                if (isSessionActiveRef.current) {
                    session.sendRealtimeInput({
                        audio: { mimeType: "audio/pcm;rate=16000", data: base64Data }
                    });
                }
            } catch (err) {
                // Squelch errors if session failed to connect or was closed
            }
        };
        source.connect(processor);
        if (audioContextRef.current) {
            processor.connect(audioContextRef.current.destination);
        }

      } catch (e) {
          console.error(e);
          setErrorMessage("Please allow microphone access!");
      }
  };

  const stopLiveSession = () => {
      isSessionActiveRef.current = false;
      sourceNodesRef.current.forEach(n => { try{n.stop()}catch(e){} });
      sourceNodesRef.current = [];
      processorRef.current?.disconnect();
      processorRef.current = null;
      audioStreamRef.current?.getTracks().forEach(t => t.stop());
      audioStreamRef.current = null;
      
      try {
          audioContextRef.current?.close();
      } catch(e) {}
      audioContextRef.current = null;
      setHasStarted(false);
  };

  // --- FALLBACK MODE HANDLERS ---
  
  const handleFallbackRecording = async () => {
      if (isRecordingFallback) {
          // Stop Recording
          mediaRecorderRef.current?.stop();
          setIsRecordingFallback(false);
      } else {
          // Start Recording
          try {
              const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
              const mediaRecorder = new MediaRecorder(stream);
              mediaRecorderRef.current = mediaRecorder;
              audioChunksRef.current = [];

              mediaRecorder.ondataavailable = (event) => {
                  if (event.data.size > 0) audioChunksRef.current.push(event.data);
              };

              mediaRecorder.onstop = async () => {
                   setConnectionStatus("Thinking...");
                   setIsUserSpeaking(false);
                   const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
                   
                   // 1. STT (Whisper)
                   const text = await transcribeAudio(audioBlob);
                   if (!text.trim()) {
                       setConnectionStatus("Didn't hear that.");
                       return;
                   }

                   // 2. Chat (Gemini)
                   setFallbackHistory(prev => [...prev, { id: Date.now().toString(), role: 'user', text }]);
                   
                   // Check for special commands in text (simple heuristic for tool call replacement)
                   if (text.toLowerCase().includes('start') && text.length < 50) {
                        const summary = fallbackHistory.map(m => m.text).join('\n') + `\n${text}`;
                        onStoryReadyRef.current(summary);
                        return;
                   }

                   const responseText = await chatWithDirector(fallbackHistory, text, userAge);
                   setFallbackHistory(prev => [...prev, { id: Date.now().toString(), role: 'model', text: responseText }]);
                   
                   // 3. TTS (Gemini)
                   setIsDirectorSpeaking(true);
                   setConnectionStatus("Director Speaking...");
                   
                   // Strip the magic trigger word before speaking
                   const spokenText = responseText.replace(/\[startfilming\]/ig, '').trim();
                   const audioBase64 = await generateNarration(spokenText, userAge, currentVoiceId);
                   
                   // Play response
                   const audio = new Audio(`data:audio/wav;base64,${audioBase64}`);
                   audio.onended = () => {
                       setIsDirectorSpeaking(false);
                       setConnectionStatus("Tap mic to reply");
                   };
                   audio.play();

                   // Check if director said "[startFilming]" phrase (simple heuristic)
                   if (responseText.toLowerCase().includes('[startfilming]')) {
                       setTimeout(() => {
                           onStoryReadyRef.current(fallbackHistory.map(m => m.text).join('\n'));
                       }, 3000);
                   }
              };

              mediaRecorder.start();
              setIsRecordingFallback(true);
              setIsUserSpeaking(true);
              setConnectionStatus("Listening...");
          } catch (e) {
              console.error("Fallback Mic Error", e);
          }
      }
  };

  const drawVisualizer = () => {
      requestAnimationFrame(drawVisualizer);
      if (!canvasRef.current || (!analyserRef.current && !isFallbackMode)) return;
      
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      const time = Date.now() / 1000;

      // Clear background with a slight fade for motion blur
      ctx.fillStyle = 'rgba(0, 0, 0, 0.2)'; 
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      let scale = 1;

      if (!isFallbackMode && analyserRef.current) {
          const bufferLength = analyserRef.current.frequencyBinCount;
          const dataArray = new Uint8Array(bufferLength);
          analyserRef.current.getByteFrequencyData(dataArray);
          
          let sum = 0;
          for(let i=0; i<bufferLength; i++) sum += dataArray[i];
          const avg = sum / bufferLength;
          scale = 1 + (avg / 255) * 1.5;
      } else if (isFallbackMode && (isRecordingFallback || isDirectorSpeaking)) {
          scale = 1 + Math.sin(time * 5) * 0.2;
      }

      // Fluid Iridescent Orb Logic
      const baseRadius = 120 * scale;
      
      ctx.save();
      ctx.translate(cx, cy);
      ctx.globalCompositeOperation = 'screen';

      // Create gradient once per frame for optimization
      const gradient = ctx.createLinearGradient(-baseRadius, -baseRadius, baseRadius, baseRadius);
      const isSpeaking = isDirectorSpeaking || isRecordingFallback;
      const isListening = isUserSpeaking;

      if (isSpeaking) {
          gradient.addColorStop(0, `hsla(280, 90%, 60%, 0.6)`);
          gradient.addColorStop(0.5, `hsla(${(time * 50) % 360}, 80%, 60%, 0.6)`);
          gradient.addColorStop(1, `hsla(150, 90%, 50%, 0.6)`);
      } else if (isListening) {
          gradient.addColorStop(0, `hsla(150, 90%, 50%, 0.6)`);
          gradient.addColorStop(0.5, `hsla(280, 80%, 60%, 0.4)`);
          gradient.addColorStop(1, `hsla(150, 90%, 50%, 0.6)`);
      } else {
          gradient.addColorStop(0, `hsla(280, 60%, 40%, 0.4)`);
          gradient.addColorStop(0.5, `hsla(150, 60%, 40%, 0.4)`);
          gradient.addColorStop(1, `hsla(280, 60%, 40%, 0.4)`);
      }

      ctx.fillStyle = gradient;

      // Create multiple overlapping fluid blobs
      for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          const blobRadius = baseRadius * (0.8 + 0.2 * Math.sin(time * 2 + i));
          
          for (let angle = 0; angle < Math.PI * 2; angle += 0.15) {
              // Add noise/fluidity to the edge
              const noise = Math.sin(angle * 3 + time * 1.5 + i) * 15 * scale 
                          + Math.cos(angle * 5 - time + i) * 10 * scale;
              const r = blobRadius + noise;
              const x = Math.cos(angle) * r;
              const y = Math.sin(angle) * r;
              
              if (angle === 0) ctx.moveTo(x, y);
              else ctx.lineTo(x, y);
          }
          ctx.closePath();
          ctx.fill();
      }

      // Inner glowing core
      ctx.globalCompositeOperation = 'source-over';
      const coreGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, baseRadius * 0.8);
      coreGradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
      coreGradient.addColorStop(0.2, 'rgba(200, 100, 255, 0.5)'); // Purple tint
      coreGradient.addColorStop(0.8, 'rgba(100, 255, 150, 0.2)'); // Green tint
      coreGradient.addColorStop(1, 'transparent');
      
      ctx.beginPath();
      ctx.arc(0, 0, baseRadius, 0, Math.PI * 2);
      ctx.fillStyle = coreGradient;
      ctx.fill();

      // Outer ring for structure
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, baseRadius * 1.1, 0, Math.PI * 2);
      ctx.stroke();

      ctx.restore();
  };

  const handleToggleMode = () => {
    // We don't know the scene count here, so just check if > 0
    if (isPro || veoTrials > 0) {
        setIsMovieMode(!isMovieMode);
    } else {
        onOpenSubscription();
    }
  };

  const handleRandomStory = () => {
      const stories = [
          "A brave toaster who goes to Mars to find the perfect bread.",
          "A penguin who discovers he can fly if he sings opera.",
          "A detective octopus solving the mystery of the missing pearl.",
          "A friendship between a cloud and a cactus in the desert.",
          "A video game character who jumps out of the screen into the real world.",
          "A speedy snail participating in the garden Olympics."
      ];
      const random = stories[Math.floor(Math.random() * stories.length)];
      stopLiveSession();
      // Use the ref here too for consistency, though not strictly required as this handler is recreated
      onStoryReadyRef.current(random);
  };

  return (
    <div className={`flex flex-col h-full ${theme.panelBg} rounded-3xl overflow-hidden border ${theme.panelBorder} relative`}>
      
      {/* Header */}
      <div className={`absolute top-0 left-0 w-full p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-start justify-between z-20 gap-4 sm:gap-0 pointer-events-none`}>
        <div className="flex items-center gap-2 sm:gap-3 bg-black/30 backdrop-blur-md px-3 sm:px-4 py-1.5 sm:py-2 rounded-full border border-white/10 self-start pointer-events-auto">
            <div className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full ${isDirectorSpeaking ? 'bg-green-400 animate-pulse' : 'bg-red-500'}`} />
            <p className="text-xs sm:text-sm font-bold text-white/80">{connectionStatus}</p>
        </div>
        
        {/* LARGE TOGGLE SWITCH */}
        <div className="flex flex-col items-end gap-2 self-end sm:self-auto pointer-events-auto absolute top-4 right-4 sm:relative sm:top-0 sm:right-0">
            <div 
                onClick={handleToggleMode}
                className="flex items-center gap-2 sm:gap-3 bg-black/60 p-2 sm:p-3 pl-3 sm:pl-5 rounded-full backdrop-blur-md border border-white/20 cursor-pointer hover:bg-black/70 transition-all shadow-2xl group scale-90 sm:scale-110 origin-right"
            >
                <span className={`text-xs sm:text-sm font-bold uppercase tracking-wider ${!isMovieMode ? 'text-white' : 'text-white/40'}`}>
                    Storybook
                </span>
                
                {/* The Switch Track */}
                <div className={`w-16 sm:w-24 h-8 sm:h-12 rounded-full p-1 sm:p-1.5 transition-all duration-300 relative ${isMovieMode ? 'bg-gradient-to-r from-yellow-400 to-orange-500 shadow-[0_0_20px_rgba(250,204,21,0.6)]' : 'bg-white/10 shadow-inner'}`}>
                    {/* The Knob */}
                    <div className={`w-6 h-6 sm:w-9 sm:h-9 bg-white rounded-full shadow-lg transition-transform duration-300 flex items-center justify-center transform ${isMovieMode ? 'translate-x-8 sm:translate-x-12' : 'translate-x-0'}`}>
                        {isMovieMode ? <Video size={14} className="text-orange-500 sm:w-[20px] sm:h-[20px]" /> : <BookOpen size={14} className="text-gray-500 sm:w-[20px] sm:h-[20px]" />}
                    </div>
                </div>

                <span className={`text-xs sm:text-sm font-bold uppercase tracking-wider ${isMovieMode ? 'text-yellow-400' : 'text-white/40'}`}>
                    Movie
                </span>
            </div>

            {/* Trial Status Badge */}
            <div className="mr-2">
                {isPro ? (
                    <span className="flex items-center gap-1 text-[8px] sm:text-[10px] font-bold text-yellow-400 bg-yellow-400/10 px-2 py-1 rounded-full border border-yellow-400/20">
                        <Crown size={8} className="sm:w-[10px] sm:h-[10px]" /> PRO ACTIVE
                    </span>
                ) : (
                   <span className={`flex items-center gap-1 text-[8px] sm:text-[10px] font-bold px-2 py-1 rounded-full border ${veoTrials > 0 ? 'text-green-400 bg-green-400/10 border-green-400/20' : 'text-red-400 bg-red-400/10 border-red-400/20'}`}>
                       {veoTrials > 0 ? `${veoTrials} FREE SCENES` : '0 FREE LEFT'}
                   </span>
                )}
            </div>
        </div>
      </div>

      {/* Main Visualizer Area */}
      <div className="flex-1 relative flex items-center justify-center overflow-hidden bg-black/20">
          <canvas ref={canvasRef} width={800} height={600} className="w-full h-full object-cover" />
          
          <div className="absolute inset-0 flex flex-col items-center justify-end pb-8 sm:pb-12 pointer-events-none">
              <div className="flex items-center justify-center gap-4 px-4 sm:px-6 transition-all duration-300 transform">
                  <div className="text-center">
                       <h2 className="text-2xl sm:text-4xl font-black text-white drop-shadow-2xl mb-2 sm:mb-4 tracking-tight">
                           {isMuted ? "Paused" : (isDirectorSpeaking 
                              ? (userAge < 8 ? "Listen..." : "Director is talking...") 
                              : (isUserSpeaking ? "Hearing you..." : "Go ahead, say something!"))}
                       </h2>
                       <p className="text-white/60 text-base sm:text-lg animate-pulse">
                           {isMuted ? "Tap to resume" : (isDirectorSpeaking ? "" : (userAge < 8 ? "Tell me a story!" : "Describe your movie idea..."))}
                       </p>
                  </div>
                  {!isFallbackMode && (
                      <button 
                          onClick={toggleMute}
                          className="pointer-events-auto bg-white/10 hover:bg-white/20 p-3 rounded-full backdrop-blur-md border border-white/20 transition-all shadow-xl group"
                          title={isMuted ? "Resume" : "Pause"}
                      >
                          {isMuted ? <MicOff className="text-red-400 group-hover:scale-110 transition-transform" size={24} /> : <Mic className="text-white group-hover:scale-110 transition-transform" size={24} />}
                      </button>
                  )}
              </div>
          </div>

          {/* FALLBACK MANUAL MIC BUTTON */}
          {isFallbackMode && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-30">
                  <button 
                    onClick={handleFallbackRecording}
                    className={`flex flex-col items-center gap-4 p-8 rounded-full transition-all border-4 cursor-pointer shadow-2xl ${
                        isRecordingFallback 
                        ? 'bg-red-500/20 border-red-500 animate-pulse scale-110' 
                        : 'bg-white/10 hover:bg-white/20 border-white/30 hover:scale-105'
                    }`}
                  >
                      <Mic size={56} className={isRecordingFallback ? 'text-red-500' : 'text-white'} />
                      <span className="font-bold text-lg">
                          {isRecordingFallback ? "Stop Recording" : "Tap to Speak"}
                      </span>
                  </button>
                  
                  <div className="absolute bottom-20 text-white/50 text-sm flex items-center gap-2">
                       <AlertTriangle size={14} className="text-yellow-500" />
                       Running in Basic Mode (Live API unavailable)
                  </div>
              </div>
          )}

          {errorMessage && !isFallbackMode && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-30">
                  <button 
                    onClick={startLiveSession}
                    className="flex flex-col items-center gap-4 bg-white/10 p-8 rounded-full hover:bg-white/20 transition-all border-2 border-red-500 animate-pulse cursor-pointer"
                  >
                      <Mic size={48} className="text-red-500" />
                      <span className="font-bold">Tap to Retry</span>
                  </button>
              </div>
          )}
          
          {/* Random Story Button (Testing) */}
          <button
              onClick={handleRandomStory}
              className="absolute bottom-6 right-6 bg-white/10 hover:bg-white/20 p-4 rounded-full backdrop-blur-md border border-white/10 transition-all z-30 group pointer-events-auto shadow-xl"
              title="Random Story (Fast Forward)"
          >
              <Dice5 className="text-white/70 group-hover:text-yellow-400 group-hover:rotate-180 transition-all duration-500" size={24} />
          </button>
      </div>

    </div>
  );
};
