
import React, { useState, useEffect, useRef } from 'react';
import { AppState, Script, GenerationProgress } from './types';
import { THEMES } from './constants';
import { DirectorChat } from './components/DirectorChat';
import { ProductionLoader } from './components/ProductionLoader';
import { CinemaPlayer } from './components/CinemaPlayer';
import { CoppaPrivacyPolicy } from './components/CoppaPrivacyPolicy';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Shop } from './components/Shop';
import { generateScript, generateSceneImage, generateNarration, generateVeoVideo, generateBackgroundMusic, TokenTracker } from './services/geminiService';
import { saveProjectToDB, getProjectsFromDB, getUserId } from './utils/storage';
import { Sparkles, Trash2, ShoppingBag, ChevronRight, Crown, Zap, Video, X, Layers } from 'lucide-react';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { stripePromise } from './utils/stripe';
import { supabase } from './utils/supabase';

import { useAppStore } from './store';

const createPlaceholder = (text: string): string => {
    const canvas = document.createElement('canvas');
    canvas.width = 1280;
    canvas.height = 720;
    const ctx = canvas.getContext('2d');
    if (ctx) {
        ctx.fillStyle = '#1e1e2e';
        ctx.fillRect(0, 0, 1280, 720);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 40px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(text, 640, 360);
    }
    return canvas.toDataURL('image/jpeg').split(',')[1];
};

// Utility for delays
const wait = (ms: number, signal?: AbortSignal) => new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new Error("Aborted"));
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
        clearTimeout(timer);
        reject(new Error("Aborted"));
    });
});

// --- API KEY CHECKER FOR STUDIO ENVIRONMENT ---
const ensureApiKey = async (): Promise<boolean> => {
    if (import.meta.env.DEV) return true; // Bypass in dev
    if (import.meta.env.VITE_SUPABASE_URL) {
        // If Supabase is configured, we use the server-side proxy which holds the API key
        return true;
    }

    const w = window as any;
    if (w.aistudio) {
        try {
            const hasKey = await w.aistudio.hasSelectedApiKey();
            if (!hasKey) {
                console.log("AI Studio environment detected, but no key selected. Prompting user.");
                const success = await w.aistudio.openSelectKey().catch((err: any) => {
                    console.error("Error during openSelectKey:", err);
                    return false;
                });
                return success;
            }
            return true;
        } catch (e) {
            console.error("An error occurred while checking for AI Studio API key:", e);
        }
    }
    
    // Fallback for local development
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey || apiKey === "YOUR_GEMINI_API_KEY") {
        console.warn("VITE_GEMINI_API_KEY is not set in the .env file.");
        // We don't alert here anymore to avoid being intrusive, 
        // but we'll return false. The calling function can decide how to notify the user.
        return false;
    }
    
    return true;
};

const CheckoutForm = ({ onComplete }: { onComplete: () => void }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [errorMessage, setErrorMessage] = useState(null);

  const handleSubmit = async (event: any) => {
    event.preventDefault();
    if (!stripe || !elements) return;

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.href, // Redirect back here
      },
      redirect: 'if_required' // Avoid redirect if not needed (e.g. card)
    });

    if (error) {
      setErrorMessage(error.message);
    } else {
      // Payment successful!
      // In a real app, listen for webhook. 
      // For this demo, we'll assume success if no error.
      onComplete();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <PaymentElement />
      <button disabled={!stripe} className="w-full mt-4 py-3 bg-indigo-600 rounded text-white font-bold">
        Pay $4.99
      </button>
      {errorMessage && <div className="text-red-500 mt-2">{errorMessage}</div>}
    </form>
  )
};

const App: React.FC = () => {
  const {
    appState, setAppState,
    script, setScript,
    progress, setProgress,
    savedProjects, setSavedProjects,
    errorMessage, setErrorMessage,
  } = useAppStore();

  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [showCoppaModal, setShowCoppaModal] = useState(false);
  const [userAge, setUserAge] = useState<number | null>(null);
  const [sceneCount, setSceneCount] = useState(4);
  const [isMovieMode, setIsMovieMode] = useState(false);
  const [lastStoryContext, setLastStoryContext] = useState<string | null>(null);
  const [isPro, setIsPro] = useState(false);
  const [veoTrials, setVeoTrials] = useState(3);
  const [wallet, setWallet] = useState(0);
  const [currentThemeId, setCurrentThemeId] = useState('default');
  const [ownedThemes, setOwnedThemes] = useState(['default']);
  const [currentVoiceId, setCurrentVoiceId] = useState('Kore');
  const [ownedVoices, setOwnedVoices] = useState(['Kore']);
  const [clientSecret, setClientSecret] = useState('');

  const isMovieModeRef = useRef(isMovieMode); // Ref to hold latest movie mode state

  // Sync ref with state
  useEffect(() => {
      isMovieModeRef.current = isMovieMode;
  }, [isMovieMode]);

  const [showVideo, setShowVideo] = useState(false);

  useEffect(() => {
    if (isMovieMode) return;
    const interval = setInterval(() => setShowVideo(prev => !prev), 3000);
    return () => clearInterval(interval);
  }, [isMovieMode]);

  const indicatorText = isMovieMode 
    ? `${veoTrials} Free Video Scenes`
    : (showVideo ? `${veoTrials} Free Video Scenes` : "12 Free Image Scenes");

  const currentTheme = THEMES.find(t => t.id === currentThemeId) || THEMES[0];

  // Abort Controller for cancelling production
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
      if (showSubscriptionModal && !clientSecret) {
          // Call our Edge Function to get a payment intent
          const fetchPaymentIntent = async () => {
              const userId = await getUserId();
              const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || import.meta.env.VITE_PUBLIC_SUPABASE_URL;
              if (!supabaseUrl) {
                  console.warn("Supabase URL missing. Stripe payments won't work.");
                  return;
              }
              const functionUrl = `${supabaseUrl}/functions/v1/payment-sheet`;
              
              try {
                  const res = await fetch(functionUrl, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ userId })
                  });
                  if (!res.ok) {
                      throw new Error(`HTTP error! status: ${res.status}`);
                  }
                  const data = await res.json();
                  if (data.clientSecret) {
                      setClientSecret(data.clientSecret);
                  } else {
                      throw new Error("No clientSecret returned");
                  }
              } catch (e) {
                  console.error("Failed to fetch payment intent", e);
                  setErrorMessage("Failed to fetch payment intent. Please try again later.");
              }
          };
          fetchPaymentIntent();
      }
  }, [showSubscriptionModal]);

  useEffect(() => {
    // Load Projects
    getProjectsFromDB().then(setSavedProjects).catch(console.error);

    // Keep LocalStorage for simple non-critical UI preferences
    const savedCurrentTheme = localStorage.getItem('mycartoon_current_theme');
    if (savedCurrentTheme) setCurrentThemeId(savedCurrentTheme);
    
    const savedCurrentVoice = localStorage.getItem('mycartoon_current_voice');
    if (savedCurrentVoice) setCurrentVoiceId(savedCurrentVoice);
  }, []);

  const saveProject = async (scriptToSave: Script) => {
    const newProject = {
      id: crypto.randomUUID(),
      title: scriptToSave.title || "Untitled",
      date: new Date().toLocaleDateString(),
      script: scriptToSave
    };

    try {
        await saveProjectToDB(newProject);
        const updated = await getProjectsFromDB();
        setSavedProjects(updated);
        alert("Project saved successfully!");
    } catch (e: any) {
        console.error("Save failed", e?.message || "Unknown error");
        setErrorMessage("Could not save project to database.");
    }
  };

  const handleCollectCoin = (amount: number) => {
      const newBalance = wallet + amount;
      setWallet(newBalance);
  };

  const handleBuyTheme = (themeId: string, cost: number) => {
      if (wallet >= cost && !ownedThemes.includes(themeId)) {
          const newBalance = wallet - cost;
          const newOwned = [...ownedThemes, themeId];
          setWallet(newBalance);
          setOwnedThemes(newOwned);
      }
  };

  const handleSelectTheme = (themeId: string) => {
      if (ownedThemes.includes(themeId)) {
          setCurrentThemeId(themeId);
          localStorage.setItem('mycartoon_current_theme', themeId);
      }
  };

  const handleBuyVoice = (voiceId: string, cost: number) => {
      if (wallet >= cost && !ownedVoices.includes(voiceId)) {
          const newBalance = wallet - cost;
          const newOwned = [...ownedVoices, voiceId];
          setWallet(newBalance);
          setOwnedVoices(newOwned);
      }
  };

  const handleSelectVoice = (voiceId: string) => {
      if (ownedVoices.includes(voiceId)) {
          setCurrentVoiceId(voiceId);
          localStorage.setItem('mycartoon_current_voice', voiceId);
      }
  };

  const handleStartFlow = async () => {
      // Ensure API Key is selected before starting the flow
      const hasApiKey = await ensureApiKey();
      if (!hasApiKey) {
          setErrorMessage("MyCartoon requires an API key to work. Please set it in your .env file or select one in the AI Studio environment.");
          speak("Oh no! We need a magic key to start the studio. Can you ask a grown-up to help?");
          return;
      }

      if (userAge) {
          if (userAge >= 10) {
            setAppState(AppState.SCENE_SELECTION);
          } else {
            setAppState(AppState.BRAINSTORM);
          }
      } else {
          setAppState(AppState.AGE_INPUT);
      }
      setErrorMessage(null);
  };

  const handleAgeSelect = (age: number) => {
      setUserAge(age);
      if (age < 10) {
          setSceneCount(4);
          setAppState(AppState.BRAINSTORM);
          speak("Great! Let's think of a fun story together!");
      } else {
          setAppState(AppState.SCENE_SELECTION);
          speak("Awesome! How long should your story be?");
      }
  };

  const checkVeoAccess = (requiredScenes: number): boolean => {
    if (import.meta.env.DEV) return true; // Allow in DEV mode
    if (isPro) return true;
    if (veoTrials >= requiredScenes) return true;
    setShowSubscriptionModal(true);
    return false;
  };

  const handleCancelProduction = () => {
      if (abortControllerRef.current) {
          abortControllerRef.current.abort();
          abortControllerRef.current = null;
      }
      setAppState(AppState.HOME);
      setScript(null);
      setErrorMessage(null);
  };

  const speak = async (text: string) => {
    if (!userAge) return;
    try {
      const audioBase64 = await generateNarration(text, userAge, currentVoiceId);
      if (audioBase64) {
        const audio = new Audio(`data:audio/wav;base64,${audioBase64}`);
        audio.play().catch(e => console.warn("Speech play blocked", e));
      }
    } catch (e) {
      console.warn("Speech failed", e);
    }
  };

  const handleStoryReady = async (storyContext: string) => {
    if (!userAge) return;
    
    // Reset Cancel Signal
    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    setLastStoryContext(storyContext);
    setAppState(AppState.PRODUCING);
    setErrorMessage(null);
    
    // Ensure Key is Valid before production
    const hasApiKey = await ensureApiKey();
    if (!hasApiKey) {
        setErrorMessage("Production cannot start without an API key. Please configure your key.");
        speak("Oops! We need a special magic key to start the cameras. Ask a grown-up for help!");
        setAppState(AppState.HOME); // Go back home
        return;
    }

    speak("Lights, camera, action! Let's build it!");

    try {
      if (signal.aborted) return;
      
      TokenTracker.reset();

      // 1. Scripting
      setProgress({ status: 'scripting', currentScene: 0, totalScenes: 0, message: 'Dreaming up a magical story... ✨', scenesReady: 0 });
      const currentMovieMode = isMovieModeRef.current;
      const generatedScript = await generateScript(storyContext, userAge, currentMovieMode, sceneCount, signal);
      
      if (signal.aborted) return;

      generatedScript.targetAge = userAge;
      generatedScript.isMovieMode = currentMovieMode;
      const total = generatedScript.scenes.length;
      
      // Initialize scenes with status
      generatedScript.scenes = generatedScript.scenes.map(s => ({ ...s, isReady: false, isGenerating: false }));
      setScript(generatedScript);

      // Progressive Generation Helper
      const generateSceneAssets = async (index: number) => {
          const scene = generatedScript.scenes[index];
          if (scene.isReady || scene.isGenerating) return;
          scene.isGenerating = true;

          try {
              // Audio
              if (!scene.audioUrl) {
                  const audio = await generateNarration(scene.narrative, userAge, currentVoiceId, signal);
                  scene.audioUrl = audio;
              }
              if (!scene.bgMusicUrl && scene.musicMood) {
                  const bgMusic = await generateBackgroundMusic(scene.musicMood, signal);
                  scene.bgMusicUrl = bgMusic;
              }

              // Visuals
              const ref = index > 0 ? generatedScript.scenes[index-1].imageUrl : undefined;
              const img = await generateSceneImage(scene.visualDescription, userAge, ref, false, signal);
              scene.imageUrl = img;

              if (currentMovieMode) {
                  try {
                      const video = await generateVeoVideo(scene.visualDescription, img, signal);
                      scene.videoUrl = video;
                      scene.isVideo = true;
                  } catch (e: any) {
                      if (signal.aborted || e.message === "Aborted" || e.name === "AbortError") throw e;
                      console.warn(`Video failed for scene ${index}, falling back to image`, e);
                      scene.isVideo = false;
                      scene.fallbackToImage = true;
                  }
              } else {
                  scene.isVideo = false;
              }

              scene.isReady = true;
              scene.isGenerating = false;
              
              // Update progress
              const readyCount = generatedScript.scenes.filter(s => s.isReady).length;
              setProgress(prev => ({ ...prev, scenesReady: readyCount }));
              setScript({ ...generatedScript });
          } catch (e: any) {
              if (signal.aborted || e.message === "Aborted" || e.name === "AbortError") throw e;
              console.error(`Failed to generate scene ${index}`, e);
              scene.isGenerating = false;
              // Fallback for safety
              if (!scene.imageUrl) scene.imageUrl = createPlaceholder("Magic failed here!");
              scene.isReady = true; // Mark as ready so we don't get stuck
          }
      };

      // Start generating first two scenes
      setProgress({ status: 'progressive', currentScene: 1, totalScenes: total, message: 'Sketching the first scenes... 🎨', scenesReady: 0 });
      
      await generateSceneAssets(0);
      if (total > 1) await generateSceneAssets(1);

      // Start the movie!
      setAppState(AppState.PLAYING);
      speak("The curtain is opening! Enjoy your movie!");

      // Generate the rest in background
      for (let i = 2; i < total; i++) {
          if (signal.aborted) break;
          await generateSceneAssets(i);
          await wait(1000, signal); // Safety delay
      }

    } catch (error: any) {
      if (signal.aborted || error.message === "Aborted" || error.name === "AbortError") return;
      console.error("Production failed", error?.message || "Unknown error");
      setErrorMessage(error?.message || "Oops! The studio ran out of magic.");
    }
  };

  return (
    <div className={`min-h-screen bg-gradient-to-br ${currentTheme.mainGradient} p-0 sm:p-4 md:p-8 flex items-center justify-center font-['Fredoka'] text-white transition-colors duration-700`}>
      <div className={`w-full h-screen sm:h-auto sm:min-h-[85vh] md:min-h-0 max-w-6xl md:aspect-video ${currentTheme.panelBg} backdrop-blur-3xl sm:rounded-[2.5rem] shadow-2xl border-0 sm:border ${currentTheme.panelBorder} relative overflow-hidden flex flex-col transition-colors duration-700`}>
        
        {/* Iridescent Animated Blobs matching Landing Page */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 opacity-20 pointer-events-none">
            <div className="absolute top-10 left-10 w-48 sm:w-64 h-48 sm:h-64 bg-purple-500 rounded-full blur-[80px] sm:blur-[100px] animate-pulse"></div>
            <div className="absolute bottom-10 right-10 w-64 sm:w-80 h-64 sm:h-80 bg-blue-500 rounded-full blur-[100px] sm:blur-[120px] animate-pulse"></div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500 rounded-full blur-[150px] animate-pulse" style={{ animationDelay: '1s' }}></div>
        </div>

        {appState === AppState.HOME && (
            <div className="flex-1 flex flex-col items-center justify-center relative p-6 sm:p-12 text-center space-y-8 sm:space-y-10 z-10">
                 
                 <div className="absolute top-4 sm:top-8 left-4 sm:left-8 flex gap-4 z-20">
                    <div className="bg-black/40 backdrop-blur-xl px-3 sm:px-4 py-1.5 sm:py-2 rounded-full border border-white/10 flex items-center gap-2 text-xs sm:text-sm font-bold">
                        {isPro ? <Crown size={14} className="text-yellow-400 sm:w-4 sm:h-4" /> : <Zap size={14} className="text-white/50 sm:w-4 sm:h-4" />}
                        {isPro ? (
                          <span className="text-yellow-400">Pro Studio Active</span>
                        ) : (
                          <span className="text-white/50 transition-opacity duration-500">
                            {indicatorText}
                          </span>
                        )}
                    </div>
                 </div>

                 <div className="absolute top-4 sm:top-8 right-4 sm:right-8 z-20">
                     <button 
                        onClick={() => setAppState(AppState.SHOP)}
                        className="bg-black/40 backdrop-blur-xl px-3 sm:px-4 py-1.5 sm:py-2 rounded-full border border-white/10 flex items-center gap-2 text-xs sm:text-sm font-bold hover:bg-black/60 transition-colors"
                     >
                         <ShoppingBag size={16} className="text-pink-400 sm:w-[18px] sm:h-[18px]" />
                         Shop
                         <span className="bg-yellow-500 text-black text-[10px] sm:text-xs px-2 py-0.5 rounded-full">{wallet} 🪙</span>
                     </button>
                 </div>

                 <div className="z-10 space-y-4 sm:space-y-6 animate-fade-in-up mt-12 sm:mt-0">
                     <div className="inline-flex items-center justify-center p-4 sm:p-6 bg-white/10 rounded-3xl mb-2 sm:mb-4 shadow-lg backdrop-blur-md border border-white/10">
                        <Sparkles className="w-12 h-12 sm:w-16 sm:h-16 text-yellow-400" />
                     </div>
                     <h1 className="text-5xl sm:text-7xl md:text-8xl font-black tracking-tighter drop-shadow-2xl bg-clip-text text-transparent bg-gradient-to-r from-white via-indigo-200 to-white">
                        MyCartoon
                     </h1>
                     <p className="text-lg sm:text-2xl text-indigo-100/80 font-medium max-w-2xl mx-auto px-4">
                        Make Your Own Magic Movies!
                     </p>

                     <div className="flex flex-col items-center gap-6 mt-6 sm:mt-8">
                         <button 
                            onClick={handleStartFlow}
                            className="bg-white text-indigo-900 px-8 sm:px-12 py-4 sm:py-5 rounded-full font-black text-xl sm:text-2xl shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-3 group"
                         >
                            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-indigo-100 flex items-center justify-center group-hover:bg-indigo-200 transition-colors">
                                <Video size={18} className="text-indigo-600 sm:w-5 sm:h-5" />
                            </div>
                            Make a Movie! <ChevronRight />
                         </button>
                     </div>
                 </div>
                 
                 {savedProjects.length > 0 && (
                     <div className="absolute bottom-4 sm:bottom-8 left-0 w-full px-4 sm:px-12">
                         <div className="flex gap-4 overflow-x-auto pb-4 justify-start sm:justify-center snap-x">
                             {savedProjects.map(p => (
                                 <div key={p.id} onClick={() => { setScript(p.script); setAppState(AppState.PLAYING); }} className="flex-shrink-0 w-40 sm:w-48 bg-black/40 p-3 sm:p-4 rounded-2xl cursor-pointer hover:bg-black/60 border border-white/5 transition-all snap-center">
                                     <div className="text-sm font-bold truncate">{p.title}</div>
                                     <div className="text-xs text-white/40">{p.date}</div>
                                 </div>
                             ))}
                         </div>
                     </div>
                 )}
            </div>
        )}

        {appState === AppState.SHOP && (
            <Shop 
                currentTheme={currentTheme}
                ownedThemes={ownedThemes}
                currentVoiceId={currentVoiceId}
                ownedVoices={ownedVoices}
                wallet={wallet}
                onBuyTheme={handleBuyTheme}
                onSelectTheme={handleSelectTheme}
                onBuyVoice={handleBuyVoice}
                onSelectVoice={handleSelectVoice}
                onClose={() => setAppState(AppState.HOME)}
            />
        )}

        {appState === AppState.AGE_INPUT && (
            <div className="flex-1 flex flex-col items-center justify-center relative p-6 sm:p-12 z-20 animate-fade-in">
                <h2 className="text-4xl sm:text-5xl font-black mb-8 sm:mb-12 text-center">How old are you?</h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
                    {[5,6,7,8,9,10,11,12].map(age => (
                        <button 
                            key={age} 
                            onClick={() => handleAgeSelect(age)} 
                            className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-white/10 hover:bg-white/20 border-2 border-white/10 hover:border-white/40 text-3xl sm:text-4xl font-black transition-all hover:scale-110"
                        >
                            {age}
                        </button>
                    ))}
                </div>
                <button onClick={() => setAppState(AppState.HOME)} className="mt-12 opacity-50 hover:opacity-100">Back</button>
            </div>
        )}

        {appState === AppState.SCENE_SELECTION && (
            <div className="flex-1 flex flex-col items-center justify-center relative p-6 sm:p-12 z-20 animate-fade-in">
                <div className="inline-flex items-center justify-center p-4 bg-white/10 rounded-full mb-6 shadow-lg backdrop-blur-md border border-white/10">
                    <Layers className="w-8 h-8 text-cyan-400" />
                </div>
                <h2 className="text-3xl sm:text-4xl font-black mb-4 text-center">How long is your story?</h2>
                <p className="text-lg sm:text-xl text-white/50 mb-8 sm:mb-10 text-center">Pick how many pictures your story will have!</p>
                
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-4 sm:gap-6">
                    {[1,2,3,4,5,6,7,8].map(count => (
                        <button 
                            key={count} 
                            onClick={() => { setSceneCount(count); setAppState(AppState.BRAINSTORM); }} 
                            className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/10 hover:bg-cyan-500 hover:text-black border-2 border-white/10 hover:border-cyan-400 text-2xl sm:text-3xl font-black transition-all hover:scale-110 flex items-center justify-center"
                        >
                            {count}
                        </button>
                    ))}
                </div>
                <button onClick={() => setAppState(AppState.AGE_INPUT)} className="mt-12 opacity-50 hover:opacity-100">Back</button>
            </div>
        )}

        {appState === AppState.BRAINSTORM && (
            <DirectorChat 
                onStoryReady={handleStoryReady} 
                theme={currentTheme} 
                userAge={userAge || 8}
                isMovieMode={isMovieMode}
                setIsMovieMode={setIsMovieMode}
                isPro={isPro}
                wallet={wallet}
                onOpenSubscription={() => setShowSubscriptionModal(true)}
                veoTrials={veoTrials}
                currentVoiceId={currentVoiceId}
            />
        )}

        {appState === AppState.PRODUCING && (
            <ProductionLoader 
                progress={progress} 
                theme={currentTheme} 
                onCollectCoin={handleCollectCoin} 
                userAge={userAge || 8}
                onCancel={handleCancelProduction}
            />
        )}

        {appState === AppState.PLAYING && script && (
             <ErrorBoundary fallback={
                 <div className="absolute inset-0 z-50 bg-black flex flex-col items-center justify-center p-12 text-center text-white">
                     <h2 className="text-3xl font-black mb-4 text-red-500">Movie Player Error</h2>
                     <p className="text-xl opacity-70 mb-8">Something went wrong while playing your movie.</p>
                     <button onClick={() => setAppState(AppState.HOME)} className="px-8 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500">Back to Home</button>
                 </div>
             }>
                 <CinemaPlayer 
                    script={script} 
                    theme={currentTheme} 
                    onHome={() => setAppState(AppState.HOME)} 
                    onSave={() => saveProject(script)} 
                 />
             </ErrorBoundary>
        )}

        {errorMessage && (
            <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-xl flex flex-col items-center justify-center p-12 text-center animate-fade-in">
                <Trash2 className="w-20 h-20 text-red-500 mb-6" />
                <h2 className="text-3xl font-black mb-4">Oops!</h2>
                <p className="text-xl opacity-70 mb-8 max-w-lg">{errorMessage}</p>
                <div className="flex gap-4">
                    <button onClick={() => setAppState(AppState.HOME)} className="px-8 py-3 rounded-xl bg-white/10 hover:bg-white/20">Go Home</button>
                    {lastStoryContext && <button onClick={() => handleStoryReady(lastStoryContext)} className="px-8 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500">Try Again</button>}
                </div>
            </div>
        )}

        {showSubscriptionModal && (
            <div className="absolute inset-0 z-50 bg-black/90 backdrop-blur-xl flex flex-col items-center justify-center p-8 animate-fade-in">
                <div className="relative max-w-lg w-full bg-gradient-to-b from-indigo-900 to-black p-8 rounded-3xl border border-yellow-500/50 shadow-2xl text-center">
                    <button onClick={() => setShowSubscriptionModal(false)} className="absolute top-4 right-4 text-white/50 hover:text-white">
                        <X size={24} />
                    </button>
                    
                    <div className="w-20 h-20 bg-yellow-400 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-yellow-500/50">
                        <Crown size={40} className="text-black" />
                    </div>
                    
                    <h2 className="text-3xl font-black mb-2 text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 to-yellow-500">
                        Unlock MyCartoon Pro!
                    </h2>
                    <p className="text-indigo-200 mb-8">
                        Ask your parents to unlock unlimited magic powers!
                    </p>

                    <div className="space-y-4 mb-8 text-left bg-white/5 p-6 rounded-2xl border border-white/5">
                        <div className="flex items-center gap-3">
                            <Video className="text-pink-400" size={20} />
                            <span>Unlimited <strong>Magic AI Video</strong> generation</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <Sparkles className="text-cyan-400" size={20} />
                            <span><strong>4K Quality</strong> Images</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <ShoppingBag className="text-yellow-400" size={20} />
                            <span>Unlock <strong>All Studio Themes</strong></span>
                        </div>
                    </div>

                    {clientSecret && (
                        <Elements stripe={stripePromise} options={{ clientSecret }}>
                            <CheckoutForm onComplete={async () => {
                                // Optimistically set UI, but wait for webhook to update DB
                                setIsPro(true);
                                setShowSubscriptionModal(false);
                                alert("Payment Successful! Welcome to Pro! 🎉");
                                
                                // Poll for backend update
                                let attempts = 0;
                                const pollInterval = setInterval(async () => {
                                    attempts++;
                                    // Removed profile loading logic
                                    if (attempts > 10) {
                                        clearInterval(pollInterval);
                                        console.warn("Webhook update for Pro status timed out.");
                                    }
                                }, 2000);
                            }} />
                        </Elements>
                    )}
                    {!clientSecret && <div className="text-center p-4">Loading payment options...</div>}
                    <p className="mt-4 text-xs text-white/30">One-time purchase. Kids: Ask first!</p>
                </div>
            </div>
        )}

        {showCoppaModal && <CoppaPrivacyPolicy onClose={() => setShowCoppaModal(false)} />}

        <div className="absolute bottom-4 left-4 z-50">
            <button onClick={() => setShowCoppaModal(true)} className="text-xs text-white/30 hover:text-white/60">
                COPPA Terms & Conditions
            </button>
        </div>

      </div>
    </div>
  );
};

export default App;