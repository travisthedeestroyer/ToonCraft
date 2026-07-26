
import React, { useState, useEffect, useRef } from 'react';
import { Script, Theme } from '../types';
import { Play, Pause, RotateCcw, Home, Save, Music, Volume2, ChevronLeft, ChevronRight, Clapperboard } from 'lucide-react';
import { MUSIC_TRACKS, SOUND_EFFECTS } from '../constants';
import { toImageDataUrl } from '../services/geminiService';
import { useAppStore } from '../store';
import { motion, AnimatePresence } from 'motion/react';

interface CinemaPlayerProps {
  script: Script;
  theme: Theme;
  onHome: () => void;
  onSave?: () => void;
}

export const CinemaPlayer: React.FC<CinemaPlayerProps> = ({ script, theme, onHome, onSave }) => {
  const { isIntermission, setIsIntermission } = useAppStore();
  const [isPlaying, setIsPlaying] = useState(false);
  const isPlayingRef = useRef(isPlaying);
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [backgroundMusicUrl, setBackgroundMusicUrl] = useState(
      script.scenes[0]?.bgMusicUrl ? script.scenes[0].bgMusicUrl : MUSIC_TRACKS[1].url
  );
  const [showMusicMenu, setShowMusicMenu] = useState(false);
  const [showSfxMenu, setShowSfxMenu] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [, setUpdateTick] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const musicRef = useRef<HTMLAudioElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const sfxRef = useRef<HTMLAudioElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isMountedRef = useRef(true);
  const endedForSceneRef = useRef(-1);
  const currentScene = script?.scenes?.[currentSceneIndex];
  const isVideoActive = currentScene?.isVideo && !videoError;

  // Web Audio API refs for recording
  const audioCtxRef = useRef<AudioContext | null>(null);
  const destNodeRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const sourceNodesRef = useRef<{
    audio?: MediaElementAudioSourceNode;
    music?: MediaElementAudioSourceNode;
    sfx?: MediaElementAudioSourceNode;
    video?: MediaElementAudioSourceNode;
  }>({});

  const initAudioContext = () => {
    if (!audioCtxRef.current) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      audioCtxRef.current = new AudioContextClass();
      destNodeRef.current = audioCtxRef.current.createMediaStreamDestination();

      const setupSource = (element: HTMLMediaElement | null, key: keyof typeof sourceNodesRef.current) => {
        if (element && !sourceNodesRef.current[key]) {
          try {
            const source = audioCtxRef.current!.createMediaElementSource(element);
            source.connect(destNodeRef.current!);
            source.connect(audioCtxRef.current!.destination); // Also play to speakers
            sourceNodesRef.current[key] = source;
          } catch (e) {
            console.warn(`Could not create audio source for ${key}`, e);
          }
        }
      };

      setupSource(audioRef.current, 'audio');
      setupSource(musicRef.current, 'music');
      setupSource(sfxRef.current, 'sfx');
      setupSource(videoRef.current, 'video');
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
  };

  const startRecording = () => {
    initAudioContext();
    setIsRecording(true);
    recordedChunksRef.current = [];
    const canvas = canvasRef.current;
    if (!canvas) return;

    const canvasStream = canvas.captureStream(30);
    const audioStream = destNodeRef.current?.stream;
    
    let combinedStream: MediaStream;
    if (audioStream && audioStream.getAudioTracks().length > 0) {
      combinedStream = new MediaStream([
        ...canvasStream.getVideoTracks(),
        ...audioStream.getAudioTracks()
      ]);
    } else {
      combinedStream = canvasStream;
    }

    try {
      mediaRecorderRef.current = new MediaRecorder(combinedStream, { mimeType: 'video/webm;codecs=vp9,opus' });
    } catch (e) {
      // Fallback if vp9/opus is not supported
      mediaRecorderRef.current = new MediaRecorder(combinedStream, { mimeType: 'video/webm' });
    }

    mediaRecorderRef.current.ondataavailable = (event) => {
      if (event.data.size > 0) recordedChunksRef.current.push(event.data);
    };
    mediaRecorderRef.current.onstop = () => {
      const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${script.title || 'cartoon'}.webm`;
      link.click();
      setIsRecording(false);
    };
    mediaRecorderRef.current.start();
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  const handleSave = () => {
    if (isRecording) return;
    // Start recording process
    setCurrentSceneIndex(0);
    setIsPlaying(false);
    
    // Small delay to allow state to reset before starting
    setTimeout(() => {
      startRecording();
      if (!isPlayingRef.current) {
        handlePlayPause();
      }
    }, 500);
  };

  // Draw current scene to canvas
  useEffect(() => {
    if (!isPlaying || !currentScene) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    let animationFrameId: number;
    let img: HTMLImageElement | null = null;

    if (!currentScene.isVideo && currentScene.imageUrl) {
      img = new Image();
      img.src = toImageDataUrl(currentScene.imageUrl);
    }

    const draw = () => {
      if (!isPlayingRef.current) return;
      
      // Clear canvas
      ctx.fillStyle = 'black';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      if (currentScene.isVideo && videoRef.current) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      } else if (img && img.complete) {
        // Draw image
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      }
      
      // Draw captions
      if (currentScene.narrative) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(0, canvas.height - 100, canvas.width, 100);
        
        ctx.font = 'bold 32px sans-serif';
        ctx.fillStyle = '#facc15'; // yellow-400
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Simple text wrapping or just center for now
        ctx.fillText(currentScene.narrative, canvas.width / 2, canvas.height - 50);
      }

      animationFrameId = requestAnimationFrame(draw);
    };
    
    draw();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isPlaying, currentSceneIndex, currentScene]);
  
  useEffect(() => {
    isMountedRef.current = true;
    // Intermission lives in the global store, so clear any leftover from a previous movie.
    setIsIntermission(false);
    return () => { isMountedRef.current = false; };
  }, []);

  // Auto-hide controls
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    const resetTimer = () => {
        if (!isMountedRef.current) return;
        setShowControls(true);
        clearTimeout(timeout);
        if (isPlaying) {
            timeout = setTimeout(() => {
                if(isMountedRef.current) setShowControls(false);
            }, 3000);
        }
    };
    
    window.addEventListener('mousemove', resetTimer);
    return () => {
        window.removeEventListener('mousemove', resetTimer);
        clearTimeout(timeout);
    };
  }, [isPlaying]);

  // Initial Setup & Volume
  useEffect(() => {
    if (musicRef.current) {
        musicRef.current.volume = 0.2;
    }
  }, []);

  // Asset Loading - Triggered when the scene we're showing changes.
  // Keyed on the scene object rather than the whole script: background generation
  // publishes a new script on every finished scene, and reloading here would
  // restart narration mid-playback.
  useEffect(() => {
    if (!currentScene) return;

    endedForSceneRef.current = -1;

    // We wrap in a small timeout to ensure refs are bound after render
    const timer = setTimeout(() => {
        loadSceneAssets(currentSceneIndex);
    }, 0);

    return () => clearTimeout(timer);
  }, [currentSceneIndex, currentScene]);

  // Sync Play state with Music
  useEffect(() => {
      const music = musicRef.current;
      if (!music) return;

      if (isPlaying && backgroundMusicUrl) {
          const playPromise = music.play();
          if (playPromise !== undefined) {
              playPromise.catch(e => {
                  if (e.name !== 'AbortError' && e.name !== 'NotAllowedError') {
                      console.warn("Music play prevented");
                  }
              });
          }
      } else {
          music.pause();
      }
  }, [isPlaying, backgroundMusicUrl]);

  // Audio Ducking Logic
  useEffect(() => {
    const music = musicRef.current;
    const narration = audioRef.current;
    
    if (!music || !narration) return;

    const fadeOut = () => { if (music) music.volume = 0.05; };
    const fadeIn = () => { if (music) music.volume = 0.2; };

    narration.addEventListener('play', fadeOut);
    narration.addEventListener('ended', fadeIn);
    narration.addEventListener('pause', fadeIn);
    
    return () => {
        narration.removeEventListener('play', fadeOut);
        narration.removeEventListener('ended', fadeIn);
        narration.removeEventListener('pause', fadeIn);
    };
  }, []);

  // Assigning src="" resolves to the page URL and makes the element fire a spurious
  // `error` event, which used to skip scenes. Removing the attribute is the safe reset.
  const setMediaSource = (el: HTMLMediaElement | null, src?: string) => {
    if (!el) return;
    if (src) {
        el.src = src;
        el.load();
    } else {
        el.pause();
        el.removeAttribute('src');
        el.load();
    }
  };

  const loadSceneAssets = (index: number) => {
    const scene = script.scenes[index];
    setVideoError(false);

    setMediaSource(audioRef.current, scene.audioUrl ? `data:audio/wav;base64,${scene.audioUrl}` : undefined);
    setMediaSource(sfxRef.current, scene.sfxUrl);

    // Background Music (Scene specific overrides global)
    if (scene.bgMusicUrl) {
        setBackgroundMusicUrl(scene.bgMusicUrl);
    }

    setMediaSource(videoRef.current, scene.isVideo && scene.videoUrl ? `data:video/mp4;base64,${scene.videoUrl}` : undefined);
  };

  // Playback logic
  useEffect(() => {
    if (!isPlaying) {
      audioRef.current?.pause();
      videoRef.current?.pause();
      musicRef.current?.pause();
      sfxRef.current?.pause();
      return;
    }

    const safePlay = (media: HTMLMediaElement | null, label: string) => {
        if (media) {
            media.play().catch(e => {
                if (e.name !== 'AbortError' && e.name !== 'NotAllowedError') {
                    console.warn(`${label} play failed`, e.message);
                }
                
                // If play fails, we need to ensure the scene doesn't get stuck
                if (!isMountedRef.current || !isPlayingRef.current) return;
                
                if (label === "Narration") {
                    // If narration fails, and there's no active video to drive the scene, advance it
                    if (!isVideoActive) handleEnded();
                } else if (label === "Video") {
                    // If video fails to play, trigger the error fallback
                    setVideoError(true);
                    // If narration has already ended or doesn't exist, advance
                    if (!currentScene.audioUrl || (audioRef.current && audioRef.current.ended)) {
                        handleEnded();
                    }
                }
            });
        }
    };

    // Small delay to ensure assets are loaded
    let silentSceneTimer: ReturnType<typeof setTimeout> | undefined;
    const playTimer = setTimeout(() => {
      if (!isMountedRef.current || !isPlayingRef.current) return;

      // 1. Narration
      if (currentScene.audioUrl && audioRef.current) {
         safePlay(audioRef.current, "Narration");
      } else if (!isVideoActive) {
         // No narration and no video: hold the still frame long enough to read the
         // caption, then move on. This is the common path when TTS is unavailable.
         const duration = Math.max(3000, (currentScene.narrative?.length || 0) * 150);
         silentSceneTimer = setTimeout(() => {
             if (isPlayingRef.current && isMountedRef.current) handleEnded();
         }, duration);
      }

      // 2. Video
      if (isVideoActive && videoRef.current) {
          safePlay(videoRef.current, "Video");
      }

      // 3. SFX
      if (currentScene.sfxUrl && sfxRef.current) {
          sfxRef.current.currentTime = 0;
          safePlay(sfxRef.current, "SFX");
      }
    }, 100);

    return () => {
      clearTimeout(playTimer);
      if (silentSceneTimer) clearTimeout(silentSceneTimer);
    };
  }, [isPlaying, currentSceneIndex, currentScene, isVideoActive]);

  const handlePlayPause = () => {
    if (isPlaying) {
      setShowControls(true);
      setIsPlaying(false);
    } else {
      setIsPlaying(true);
    }
  };

  const handleEnded = () => {
    if (!isMountedRef.current) return;
    // Narration `ended`, video `ended` and the silent-scene timer can all fire for the
    // same scene. Only the first one should advance.
    if (endedForSceneRef.current === currentSceneIndex) return;
    endedForSceneRef.current = currentSceneIndex;

    if (currentSceneIndex < script.scenes.length - 1) {
      const nextScene = script.scenes[currentSceneIndex + 1];
      if (nextScene.isReady) {
        setCurrentSceneIndex(prev => prev + 1);
        setIsIntermission(false);
      } else {
        setIsIntermission(true);
        setIsPlaying(false);
      }
    } else {
      // End of Movie
      setIsPlaying(false);
      setShowControls(true);
      if (mediaRecorderRef.current?.state === 'recording') {
        stopRecording();
      }
    }
  };

  // Auto-resume from intermission when next scene is ready
  useEffect(() => {
    if (isIntermission && script.scenes[currentSceneIndex + 1]?.isReady) {
      setIsIntermission(false);
      setCurrentSceneIndex(prev => prev + 1);
      setIsPlaying(true);
    }
  }, [isIntermission, script.scenes, currentSceneIndex, setIsIntermission]);

  const handleSelectSFX = (url: string) => {
    const scene = script.scenes[currentSceneIndex];
    scene.sfxUrl = url;
    setUpdateTick(t => t + 1); // Force update to show selection
    setShowSfxMenu(false);

    // Preview
    if (url) {
        const audio = new Audio(url);
        audio.play().catch(() => {});
        // Update current ref immediately if configured
        if (sfxRef.current) sfxRef.current.src = url;
    } else {
        if (sfxRef.current) sfxRef.current.src = "";
    }
  };

  const getKenBurnsEffect = (index: number) => {
      // Varied pan/zoom effects based on scene index
      const effects = [
          'scale-125 origin-center',         // Zoom Center
          'scale-125 origin-top-left',       // Pan from Top-Left
          'scale-125 origin-bottom-right',   // Pan from Bottom-Right
          'scale-125 origin-left',           // Pan Right
          'scale-125 origin-right'           // Pan Left
      ];
      return effects[index % effects.length];
  };
  
  const marqueeDuration = Math.max(6, (currentScene?.narrative?.length || 0) * 0.2);

  if (!script || !script.scenes || script.scenes.length === 0) {
      return (
          <div className="flex flex-col items-center justify-center h-full bg-black text-white p-8 text-center rounded-3xl">
              <h2 className="text-2xl font-bold text-red-500 mb-4">Invalid Movie Data</h2>
              <p className="opacity-70 mb-8">The movie script appears to be empty or corrupted.</p>
              <button onClick={onHome} className="px-6 py-2 bg-indigo-600 rounded-full hover:bg-indigo-500 transition-colors">Go Home</button>
          </div>
      );
  }

  return (
    <div className="flex flex-col h-full bg-black rounded-3xl overflow-hidden shadow-2xl relative group border border-white/10" ref={containerRef}>
      
      {/* Top Toolbar */}
      <div className={`absolute top-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 z-50 transition-all duration-300 ${showControls ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-10'}`}>
          {/* Scene Indicator */}
          <div className="px-4 py-1 bg-black/40 backdrop-blur-md rounded-full text-xs font-bold text-white/50 border border-white/5">
             Scene {currentSceneIndex + 1} / {script.scenes.length}
          </div>

          <div className="bg-black/60 backdrop-blur-xl px-2 py-2 rounded-full border border-white/10 flex items-center gap-2 shadow-xl">
             <button 
                 onClick={() => { setIsPlaying(false); setCurrentSceneIndex(prev => Math.max(0, prev - 1)); }}
                 disabled={currentSceneIndex === 0}
                 className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors text-white/70 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent"
                 title="Previous Scene"
             >
                 <ChevronLeft size={20} />
             </button>

             <div className="w-px h-6 bg-white/20 mx-1"></div>

             <button onClick={onHome} className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors text-white/70 hover:text-white" title="Home">
                 <Home size={20} />
             </button>
             <button onClick={() => { setIsPlaying(false); setCurrentSceneIndex(0); }} className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors text-white/70 hover:text-white" title="Restart">
                 <RotateCcw size={20} />
             </button>
             <button onClick={handleSave} className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${isRecording ? 'bg-red-500/20 text-red-500 animate-pulse' : 'hover:bg-white/10 text-white/70 hover:text-white'}`} title={isRecording ? "Recording..." : "Record & Save Cartoon"}>
                 <Save size={20} />
             </button>
             
             <div className="w-px h-6 bg-white/20 mx-1"></div>

             {/* Music Menu */}
             <div className="relative">
                 <button 
                    onClick={() => { setShowMusicMenu(!showMusicMenu); setShowSfxMenu(false); }} 
                    className={`w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors ${backgroundMusicUrl ? 'text-yellow-400' : 'text-white/50'}`}
                    title="Select Background Music"
                 >
                     <Music size={20} />
                 </button>
                 {showMusicMenu && (
                     <div className="absolute top-12 left-1/2 -translate-x-1/2 bg-black/90 backdrop-blur-xl border border-white/10 rounded-xl p-2 w-48 shadow-2xl z-[60]">
                         <h4 className="text-xs font-bold text-white/50 px-3 py-1 mb-1">SOUNDTRACK</h4>
                         {MUSIC_TRACKS.map(t => (
                             <button 
                                key={t.name}
                                onClick={() => { 
                                    setBackgroundMusicUrl(t.url); 
                                    setShowMusicMenu(false);
                                }}
                                className={`w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-white/10 ${backgroundMusicUrl === t.url ? 'text-yellow-400 font-bold' : 'text-white/70'}`}
                             >
                                 {t.name}
                             </button>
                         ))}
                     </div>
                 )}
             </div>

             {/* SFX Menu */}
             <div className="relative">
                 <button 
                    onClick={() => { setShowSfxMenu(!showSfxMenu); setShowMusicMenu(false); }} 
                    className={`w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors ${currentScene.sfxUrl ? 'text-pink-400' : 'text-white/50'}`}
                    title="Select Sound Effect for Scene"
                 >
                     <Volume2 size={20} />
                 </button>
                 {showSfxMenu && (
                     <div className="absolute top-12 left-1/2 -translate-x-1/2 bg-black/90 backdrop-blur-xl border border-white/10 rounded-xl p-2 w-48 shadow-2xl z-[60]">
                         <h4 className="text-xs font-bold text-white/50 px-3 py-1 mb-1">SCENE SOUND FX</h4>
                         {SOUND_EFFECTS.map(s => (
                             <button 
                                key={s.name}
                                onClick={() => handleSelectSFX(s.url)}
                                className={`w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-white/10 ${currentScene.sfxUrl === s.url ? 'text-pink-400 font-bold' : 'text-white/70'}`}
                             >
                                 {s.name}
                             </button>
                         ))}
                     </div>
                 )}
             </div>
             
             <div className="w-px h-6 bg-white/20 mx-1"></div>

             <button 
                 onClick={() => { setIsPlaying(false); setCurrentSceneIndex(prev => Math.min(script.scenes.length - 1, prev + 1)); }}
                 disabled={currentSceneIndex === script.scenes.length - 1}
                 className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors text-white/70 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent"
                 title="Next Scene"
             >
                 <ChevronRight size={20} />
             </button>
          </div>
      </div>

      {/* Main Screen */}
      <div className="flex-1 relative overflow-hidden bg-black flex items-center justify-center">
        <canvas ref={canvasRef} className="absolute opacity-0 pointer-events-none" width="1280" height="720" />
        <video 
            ref={videoRef} 
            className={`w-full h-full object-contain ${isVideoActive ? 'block' : 'hidden'}`} 
            muted 
            playsInline 
            onEnded={() => {
                if (isVideoActive) handleEnded();
            }}
            onError={() => {
                if (currentScene.isVideo) {
                    console.warn("Video playback failed, falling back to image.");
                    setVideoError(true);
                    // If audio has already ended, or there is no audio, we must advance the scene manually
                    // because the video onEnded will never fire.
                    if (!currentScene.audioUrl || (audioRef.current && audioRef.current.ended)) {
                        handleEnded();
                    }
                }
            }}
        />
        <img
            key={currentSceneIndex}
            src={toImageDataUrl(currentScene.imageUrl) || undefined}
            alt={currentScene.visualDescription || 'Cartoon scene'}
            className={`w-full h-full object-cover transition-transform duration-[20s] ease-linear will-change-transform ${isPlaying ? getKenBurnsEffect(currentSceneIndex) : 'scale-100 origin-center'} ${!isVideoActive ? 'block' : 'hidden'}`} 
        />
        
        {/* Caption Bar - Only animates when playing */}
        <div className="absolute bottom-0 w-full bg-gradient-to-t from-black via-black/80 to-transparent border-t border-white/5 h-16 sm:h-24 flex items-center z-40">
             <div className="w-full h-full relative overflow-hidden flex items-center">
                 <p 
                    key={currentSceneIndex}
                    className={`text-xl sm:text-3xl font-bold text-yellow-400 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] whitespace-nowrap absolute ${isPlaying ? 'animate-marquee' : ''}`} 
                    style={{ animationDuration: `${marqueeDuration}s` }}
                 >
                    {currentScene?.narrative}
                 </p>
             </div>
        </div>

        {/* Big Play Button */}
        {!isPlaying && !isIntermission && (
            <button 
                onClick={handlePlayPause} 
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 sm:w-24 sm:h-24 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center border-4 border-white/50 hover:scale-110 transition-transform group shadow-[0_0_50px_rgba(255,255,255,0.2)] z-50"
            >
                <Play size={32} fill="white" className="ml-1 sm:ml-2 text-white group-hover:text-yellow-400 transition-colors sm:w-[40px] sm:h-[40px]" />
            </button>
        )}

        {/* Intermission UI */}
        <AnimatePresence>
          {isIntermission && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-[60] bg-black/90 backdrop-blur-xl flex flex-col items-center justify-center p-8 text-center"
            >
              <motion.div
                animate={{ rotate: [0, -10, 10, 0] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="w-32 h-32 bg-yellow-400 rounded-3xl flex items-center justify-center mb-8 shadow-[0_0_50px_rgba(250,204,21,0.3)]"
              >
                <Clapperboard size={64} className="text-black" />
              </motion.div>
              <h2 className="text-4xl font-black text-white mb-4">INTERMISSION</h2>
              <p className="text-xl text-white/70 max-w-md">
                The robots are painting the next scene! Grab some popcorn, we'll be right back...
              </p>
              <div className="mt-12 flex gap-2">
                {[0, 1, 2].map(i => (
                  <motion.div
                    key={i}
                    animate={{ scale: [1, 1.5, 1] }}
                    transition={{ repeat: Infinity, duration: 1, delay: i * 0.2 }}
                    className="w-3 h-3 bg-yellow-400 rounded-full"
                  />
                ))}
              </div>

              {/* Escape hatch: the overlay sits above the toolbar, so if the next scene
                  never arrives (production cancelled or failed) the child isn't trapped. */}
              <button
                onClick={() => { setIsIntermission(false); onHome(); }}
                className="mt-10 px-6 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white text-sm font-bold border border-white/10 transition-colors"
              >
                Back to Home
              </button>
            </motion.div>
          )}
        </AnimatePresence>
        
        {isPlaying && showControls && (
             <button 
                onClick={handlePlayPause}
                className="absolute bottom-20 sm:bottom-32 right-4 sm:right-8 w-10 h-10 sm:w-14 sm:h-14 bg-white text-black rounded-full flex items-center justify-center shadow-lg hover:scale-105 transition-transform z-50"
             >
                 <Pause size={16} fill="black" className="sm:w-[24px] sm:h-[24px]" />
             </button>
        )}
      </div>

      <audio
          ref={audioRef}
          onEnded={() => {
              if (!isVideoActive) handleEnded();
          }}
          onError={() => {
              // Ignore the error fired while the element is being reset between scenes.
              if (!currentScene?.audioUrl || !isPlayingRef.current) return;
              if (!isVideoActive) handleEnded();
          }}
          className="hidden"
      />
      <audio 
          ref={sfxRef} 
          onError={() => {
              // Silently handle SFX errors
          }}
          className="hidden" 
      />
      <audio 
          ref={musicRef} 
          src={backgroundMusicUrl || undefined} 
          loop 
          crossOrigin="anonymous"
          className="hidden" 
      />
      
      <style>{`
        @keyframes marquee {
            0% { transform: translateX(100vw); }
            100% { transform: translateX(-100%); }
        }
        .animate-marquee {
            animation-name: marquee;
            animation-timing-function: linear;
            animation-iteration-count: 1;
            padding-left: 0;
            left: 0;
            will-change: transform;
        }
      `}</style>
    </div>
  );
};
