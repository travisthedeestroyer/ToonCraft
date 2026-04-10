import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { soundManager } from '../../utils/sound';

export const BubblePop: React.FC<{ onScore: (p: number) => void }> = ({ onScore }) => {
  const [bubbles, setBubbles] = useState<{ id: number; x: number; y: number; size: number; color: string; isGolden: boolean }[]>([]);
  const [popTexts, setPopTexts] = useState<{ id: number; x: number; y: number; text: string; color: string }[]>([]);

  useEffect(() => {
    try {
      const interval = setInterval(() => {
        setBubbles(prev => {
          if (prev.length > 12) return prev;
          const isGolden = Math.random() > 0.85;
          return [...prev, {
            id: Date.now(),
            x: Math.random() * 80 + 10,
            y: 110,
            size: Math.random() * 40 + (isGolden ? 60 : 40),
            color: isGolden ? 'hsl(45, 100%, 50%)' : `hsl(${Math.random() * 360}, 80%, 60%)`,
            isGolden
          }];
        });
      }, 800);
      return () => clearInterval(interval);
    } catch (error) {
      console.error("Error in BubblePop interval:", error);
    }
  }, []);

  const popBubble = (id: number, x: number, isGolden: boolean) => {
    try {
      setBubbles(prev => prev.filter(b => b.id !== id));
      const points = isGolden ? 5 : 1;
      onScore(points);
      soundManager.playEffect('pop');
      
      const textId = Date.now();
      setPopTexts(prev => [...prev, { id: textId, x, y: 50, text: `+${points}`, color: isGolden ? '#FFD700' : '#FFF' }]);
      setTimeout(() => {
        setPopTexts(prev => prev.filter(t => t.id !== textId));
      }, 1000);
    } catch (error) {
      console.error("Error popping bubble:", error);
    }
  };

  const removeBubble = (id: number) => {
    setBubbles(prev => prev.filter(b => b.id !== id));
  };

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-auto">
      <AnimatePresence>
        {bubbles.map(bubble => (
          <motion.div
            key={bubble.id}
            initial={{ top: '110%', left: `${bubble.x}%`, scale: 0, rotate: -10 }}
            animate={{ 
              top: '-20%', 
              scale: 1, 
              rotate: [10, -10, 10],
              x: [0, 20, -20, 0]
            }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ 
              top: { duration: 4 + Math.random() * 3, ease: "linear" },
              scale: { duration: 0.5 },
              rotate: { duration: 2, repeat: Infinity, ease: "easeInOut" },
              x: { duration: 3, repeat: Infinity, ease: "easeInOut" }
            }}
            onAnimationComplete={() => removeBubble(bubble.id)}
            onClick={() => popBubble(bubble.id, bubble.x, bubble.isGolden)}
            className={`absolute rounded-full cursor-pointer shadow-inner flex items-center justify-center ${bubble.isGolden ? 'border-2 border-yellow-300 shadow-[0_0_15px_rgba(255,215,0,0.8)]' : 'border border-white/40'}`}
            style={{
              width: bubble.size,
              height: bubble.size,
              backgroundColor: bubble.color,
              boxShadow: bubble.isGolden 
                ? 'inset -10px -10px 20px rgba(0,0,0,0.2), inset 10px 10px 20px rgba(255,255,255,0.8), 0 0 20px rgba(255,215,0,0.6)' 
                : 'inset -10px -10px 20px rgba(0,0,0,0.2), inset 10px 10px 20px rgba(255,255,255,0.5)'
            }}
          >
            <div className="w-1/4 h-1/4 bg-white/60 rounded-full absolute top-1/4 left-1/4" />
            {bubble.isGolden && <span className="text-2xl drop-shadow-md">⭐</span>}
          </motion.div>
        ))}
        {popTexts.map(pt => (
          <motion.div
            key={pt.id}
            initial={{ opacity: 1, top: `${pt.y}%`, left: `${pt.x}%`, scale: 0.5 }}
            animate={{ opacity: 0, top: `${pt.y - 20}%`, scale: 1.5 }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="absolute font-black text-3xl drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)] pointer-events-none"
            style={{ color: pt.color, transform: 'translate(-50%, -50%)' }}
          >
            {pt.text}
          </motion.div>
        ))}
      </AnimatePresence>
      <div className="absolute bottom-4 left-0 right-0 text-center text-white/50 text-sm pointer-events-none font-bold tracking-widest uppercase">
        Pop the bubbles!
      </div>
    </div>
  );
};
