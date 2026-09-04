import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';

export const WhackAMole: React.FC<{ onScore: (p: number) => void }> = ({ onScore }) => {
  const [activeHole, setActiveHole] = useState<{ index: number; isGolden: boolean } | null>(null);
  const [whackTexts, setWhackTexts] = useState<{ id: number; index: number; text: string; color: string }[]>([]);
  
  useEffect(() => {
    const interval = setInterval(() => {
      const isGolden = Math.random() > 0.8;
      setActiveHole({ index: Math.floor(Math.random() * 9), isGolden });
      setTimeout(() => setActiveHole(null), isGolden ? 600 : 900); // Golden moles are faster
    }, 1200);
    return () => clearInterval(interval);
  }, []);

  const whack = (index: number) => {
    if (activeHole?.index === index) {
      const points = activeHole.isGolden ? 5 : 2;
      onScore(points);
      setActiveHole(null);

      const textId = Date.now();
      setWhackTexts(prev => [...prev, { 
        id: textId, 
        index, 
        text: activeHole.isGolden ? 'SMASH! +5' : 'WHACK! +2',
        color: activeHole.isGolden ? '#FFD700' : '#FFF'
      }]);
      setTimeout(() => {
        setWhackTexts(prev => prev.filter(t => t.id !== textId));
      }, 800);
    }
  };

  return (
    <div 
      className="absolute inset-0 flex flex-col items-center justify-center pointer-events-auto"
      style={{ cursor: "url('data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"40\" height=\"40\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"%23FFF\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"m15 12-8.5 8.5c-.83.83-2.17.83-3 0 0 0 0 0 0 0a2.12 2.12 0 0 1 0-3L12 9\"/><path d=\"M17.64 15 22 10.64\"/><path d=\"m20.91 11.7-1.25-1.25c-.6-.6-.93-1.4-.93-2.25v-.86L16.01 4.6a5.56 5.56 0 0 0-3.94-1.64H11.2l-1.42 1.42a2.5 2.5 0 0 0 0 3.54l1.14 1.14\"/></svg>'), auto" }}
    >
      <div className="grid grid-cols-3 gap-4 sm:gap-6 p-6 bg-amber-900/60 rounded-3xl shadow-[0_0_30px_rgba(0,0,0,0.5)] border-4 border-amber-800 backdrop-blur-sm">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="w-20 h-20 sm:w-24 sm:h-24 bg-amber-950 rounded-full relative overflow-hidden border-4 border-amber-900 shadow-inner">
            <AnimatePresence>
              {activeHole?.index === i && (
                <motion.div
                  initial={{ y: 100 }}
                  animate={{ y: 10 }}
                  exit={{ y: 100 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  onClick={() => whack(i)}
                  className={`absolute inset-x-2 bottom-0 h-20 rounded-t-full cursor-pointer flex flex-col items-center pt-3 shadow-lg ${activeHole.isGolden ? 'bg-yellow-400' : 'bg-amber-600'}`}
                >
                  {/* Eyes */}
                  <div className="flex gap-2 mb-1">
                    <div className="w-3 h-3 bg-black rounded-full flex items-center justify-center"><div className="w-1 h-1 bg-white rounded-full translate-x-0.5 -translate-y-0.5" /></div>
                    <div className="w-3 h-3 bg-black rounded-full flex items-center justify-center"><div className="w-1 h-1 bg-white rounded-full translate-x-0.5 -translate-y-0.5" /></div>
                  </div>
                  {/* Nose */}
                  <div className="w-5 h-3 bg-pink-400 rounded-full" />
                </motion.div>
              )}
            </AnimatePresence>
            
            {/* Whack Text Overlay */}
            <AnimatePresence>
              {whackTexts.find(t => t.index === i) && (
                <motion.div
                  key={whackTexts.find(t => t.index === i)?.id}
                  initial={{ opacity: 1, scale: 0.5, y: 0, rotate: Math.random() * 20 - 10 }}
                  animate={{ opacity: 0, scale: 1.5, y: -30 }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className="absolute inset-0 flex items-center justify-center pointer-events-none z-10"
                >
                  <span 
                    className="font-black text-xl drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]"
                    style={{ color: whackTexts.find(t => t.index === i)?.color }}
                  >
                    {whackTexts.find(t => t.index === i)?.text}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
      <div className="mt-8 text-white/50 text-sm pointer-events-none font-bold tracking-widest uppercase bg-black/30 px-4 py-1 rounded-full">
        Whack the moles!
      </div>
    </div>
  );
};
