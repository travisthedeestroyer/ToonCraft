import React, { useState, useEffect } from 'react';
import { Theme, GenerationProgress } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { X, Sparkles, PenTool, Palette } from 'lucide-react';
import { MiniGames } from './MiniGames';

interface ProductionLoaderProps {
  progress: GenerationProgress;
  theme: Theme;
  onCollectCoin: (amount: number) => void;
  userAge: number;
  onCancel: () => void;
}

export const ProductionLoader: React.FC<ProductionLoaderProps> = ({
  progress,
  theme,
  onCollectCoin,
  userAge,
  onCancel
}) => {
  const [displayText, setDisplayText] = useState('');
  const [showSketch, setShowSketch] = useState(true);
  const [showTooltip, setShowTooltip] = useState(false);

  // Avoid NaN before the script (and therefore the scene count) exists
  const percentComplete = progress.totalScenes > 0
    ? Math.round((progress.scenesReady / progress.totalScenes) * 100)
    : 0;

  useEffect(() => {
    if (progress.status === 'scripting' && progress.message) {
      let i = 0;
      const interval = setInterval(() => {
        setDisplayText(progress.message.slice(0, i));
        i++;
        if (i > progress.message.length) clearInterval(interval);
      }, 50);
      return () => clearInterval(interval);
    }
  }, [progress.status, progress.message]);

  useEffect(() => {
    if (progress.status === 'progressive') {
      const interval = setInterval(() => {
        setShowSketch(prev => !prev);
      }, 3000);
      
      // Show tooltip after a short delay once progressive rendering starts
      const tooltipTimer = setTimeout(() => {
        setShowTooltip(true);
      }, 4000);

      return () => {
        clearInterval(interval);
        clearTimeout(tooltipTimer);
      };
    }
  }, [progress.status]);

  const [isMinimized, setIsMinimized] = useState(false);

  if (isMinimized) {
    return (
      <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#1a1a2e] overflow-hidden rounded-[inherit]">
        <div className="absolute inset-0 z-0 opacity-100 pointer-events-auto">
          <MiniGames userAge={userAge} onScore={onCollectCoin} />
        </div>
        
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2">
          <div className="bg-black/80 backdrop-blur-md px-6 py-3 rounded-full border border-white/20 shadow-2xl flex items-center gap-4">
            <div className="flex flex-col">
              <span className="text-white font-bold text-sm">Making Movie Magic...</span>
              <div className="w-48 h-2 bg-white/20 rounded-full overflow-hidden mt-1">
                <motion.div
                  className="h-full bg-gradient-to-r from-indigo-500 to-pink-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${percentComplete}%` }}
                />
              </div>
            </div>
            <button 
              onClick={() => setIsMinimized(false)}
              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 rounded-full text-white text-sm font-bold transition-colors"
            >
              Show Tour
            </button>
          </div>
        </div>
        
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors z-50 border border-white/10 backdrop-blur-md"
        >
          <X size={24} />
        </button>
      </div>
    );
  }

  return (
    <div className={`absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#1a1a2e]/90 backdrop-blur-sm overflow-hidden rounded-[inherit]`} onClick={() => setIsMinimized(true)} onTouchEnd={() => setIsMinimized(true)}>
      {/* Iridescent Animated Blobs */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 opacity-20 pointer-events-none">
          <div className="absolute top-10 left-10 w-48 sm:w-64 h-48 sm:h-64 bg-purple-500 rounded-full blur-[80px] sm:blur-[100px] animate-pulse"></div>
          <div className="absolute bottom-10 right-10 w-64 sm:w-80 h-64 sm:h-80 bg-blue-500 rounded-full blur-[100px] sm:blur-[120px] animate-pulse"></div>
      </div>

      <div className="relative z-10 w-full max-w-2xl p-8 flex flex-col items-center text-center space-y-8" onClick={(e) => e.stopPropagation()} onTouchEnd={(e) => e.stopPropagation()}>
        <AnimatePresence mode="wait">
          {progress.status === 'scripting' && (
            <motion.div 
              key="scripting"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              className="bg-white/5 backdrop-blur-xl p-8 rounded-3xl border border-white/10 shadow-2xl w-full"
            >
              <div className="flex items-center justify-center mb-6">
                <div className="w-16 h-16 bg-indigo-500 rounded-2xl flex items-center justify-center animate-bounce shadow-lg shadow-indigo-500/50">
                  <PenTool className="text-white w-8 h-8" />
                </div>
              </div>
              <h2 className="text-3xl font-black mb-4">Writing Your Story...</h2>
              <p className="text-xl font-mono text-indigo-200 min-h-[3em] bg-black/20 p-4 rounded-xl border border-white/5">
                {displayText}<span className="animate-pulse">|</span>
              </p>
            </motion.div>
          )}

          {progress.status === 'progressive' && (
            <motion.div 
              key="progressive"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/5 backdrop-blur-xl p-8 rounded-3xl border border-white/10 shadow-2xl w-full"
            >
              <div className="relative w-full aspect-video bg-black/40 rounded-2xl overflow-hidden mb-6 border border-white/5 shadow-inner">
                <AnimatePresence mode="wait">
                  {showSketch ? (
                    <motion.div 
                      key="sketch"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 flex flex-col items-center justify-center"
                    >
                      <div className="w-full h-full bg-[url('https://www.transparenttextures.com/patterns/graphy.png')] opacity-20 absolute inset-0"></div>
                      <PenTool className="w-16 h-16 text-white/30 mb-4 animate-pulse" />
                      <p className="text-white/50 font-bold uppercase tracking-widest text-sm">Sketching Scene {progress.scenesReady + 1}...</p>
                    </motion.div>
                  ) : (
                    <motion.div 
                      key="color"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-indigo-500/20 to-purple-500/20"
                    >
                      <Palette className="w-16 h-16 text-yellow-400 mb-4 animate-bounce" />
                      <p className="text-white font-bold uppercase tracking-widest text-sm">Adding Magic Colors!</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <h2 className="text-3xl font-black mb-2">Studio Tour</h2>
              <p className="text-indigo-200 font-medium">The robots are working hard on your cartoon!</p>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="w-full space-y-4 relative">
          <AnimatePresence>
            {showTooltip && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="absolute -top-16 left-1/2 -translate-x-1/2 bg-yellow-400 text-black font-bold px-4 py-2 rounded-xl shadow-lg whitespace-nowrap pointer-events-none"
              >
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-yellow-400 rotate-45"></div>
                💡 Click outside to play mini-games!
              </motion.div>
            )}
          </AnimatePresence>
          <div className="flex justify-between text-sm font-bold text-white/60 px-2">
            <span>{progress.scenesReady} / {progress.totalScenes} Scenes Ready</span>
            <span>{percentComplete}%</span>
          </div>
          <div className="w-full h-4 bg-black/40 rounded-full overflow-hidden border border-white/10 shadow-inner">
            <motion.div
              className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 shadow-[0_0_15px_rgba(99,102,241,0.5)]"
              initial={{ width: 0 }}
              animate={{ width: `${percentComplete}%` }}
            />
          </div>
        </div>

        <button 
          onClick={onCancel}
          className="px-8 py-3 bg-white/10 hover:bg-white/20 rounded-full text-white font-bold transition-all border border-white/10 backdrop-blur-md"
        >
          Stop Making Movie
        </button>
      </div>

      {/* Mini Games in background but less prominent */}
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
        <MiniGames userAge={userAge} onScore={onCollectCoin} />
      </div>

      <button
        onClick={onCancel}
        className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors z-50 border border-white/10 backdrop-blur-md"
      >
        <X size={24} />
      </button>
    </div>
  );
};
