import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';

type CatchItem = { id: number; x: number; y: number; type: 'star' | 'golden' | 'bomb'; speed: number };

export const CatchStars: React.FC<{ onScore: (p: number) => void }> = ({ onScore }) => {
  const [basketX, setBasketX] = useState(50);
  const basketXRef = useRef(50);
  const onScoreRef = useRef(onScore);
  const [items, setItems] = useState<CatchItem[]>([]);
  const [catchTexts, setCatchTexts] = useState<{ id: number; x: number; y: number; text: string; color: string }[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    onScoreRef.current = onScore;
  }, [onScore]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent | TouchEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
      const x = ((clientX - rect.left) / rect.width) * 100;
      const newX = Math.max(5, Math.min(95, x));
      setBasketX(newX);
      basketXRef.current = newX;
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchmove', handleMouseMove, { passive: true });
    return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('touchmove', handleMouseMove);
    };
  }, []);

  useEffect(() => {
    const spawnInterval = setInterval(() => {
      setItems(prev => {
        if (prev.length > 15) return prev;
        const rand = Math.random();
        let type: 'star' | 'golden' | 'bomb' = 'star';
        if (rand > 0.9) type = 'golden';
        else if (rand > 0.75) type = 'bomb';
        
        return [...prev, { 
          id: Date.now() + Math.random(), 
          x: Math.random() * 90 + 5, 
          y: -10,
          type,
          speed: (type === 'golden' ? 3 : type === 'bomb' ? 2.5 : 1.5 + Math.random()) * (16 / 50)
        }];
      });
    }, 800);

    const fallInterval = setInterval(() => {
      setItems(prev => {
        const next = prev.map(s => ({ ...s, y: s.y + s.speed }));
        const currentBasketX = basketXRef.current;
        const caught = next.filter(s => s.y >= 85 && s.y <= 95 && Math.abs(s.x - currentBasketX) < 12);
        
        if (caught.length > 0) {
          setTimeout(() => {
            let pointsToAdd = 0;
            caught.forEach(c => {
              let pts = 0;
              let text = '';
              let color = '';
              if (c.type === 'star') { pts = 2; text = '+2'; color = '#FFF'; }
              else if (c.type === 'golden') { pts = 10; text = 'MEGA! +10'; color = '#FFD700'; }
              else if (c.type === 'bomb') { pts = -5; text = 'OUCH! -5'; color = '#FF4444'; }
              
              pointsToAdd += pts;
              
              const textId = Date.now() + Math.random();
              setCatchTexts(pt => [...pt, { id: textId, x: c.x, y: 80, text, color }]);
              setTimeout(() => setCatchTexts(pt => pt.filter(t => t.id !== textId)), 1000);
            });
            onScoreRef.current(pointsToAdd);
          }, 0);
        }
        
        return next.filter(s => s.y < 110 && !caught.includes(s));
      });
    }, 16);

    return () => {
      clearInterval(spawnInterval);
      clearInterval(fallInterval);
    };
  }, []);

  return (
    <div ref={containerRef} className="absolute inset-0 overflow-hidden pointer-events-auto cursor-none bg-gradient-to-b from-indigo-950 to-purple-900/50">
      {/* Stars/Items */}
      {items.map(item => (
        <div
          key={item.id}
          className={`absolute text-3xl sm:text-4xl transition-transform ${item.type === 'bomb' ? 'animate-pulse' : 'animate-bounce'}`}
          style={{ 
            left: `${item.x}%`, 
            top: `${item.y}%`, 
            transform: `translate(-50%, -50%) rotate(${item.y * 2}deg)`,
            filter: item.type === 'golden' ? 'drop-shadow(0 0 15px rgba(255,215,0,0.8))' : item.type === 'star' ? 'drop-shadow(0 0 8px rgba(255,255,255,0.6))' : 'none'
          }}
        >
          {item.type === 'star' ? '⭐' : item.type === 'golden' ? '🌟' : '💣'}
        </div>
      ))}
      
      {/* Floating Texts */}
      <AnimatePresence>
        {catchTexts.map(pt => (
          <motion.div
            key={pt.id}
            initial={{ opacity: 1, top: `${pt.y}%`, left: `${pt.x}%`, scale: 0.5 }}
            animate={{ opacity: 0, top: `${pt.y - 15}%`, scale: 1.2 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="absolute font-black text-xl sm:text-2xl drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] pointer-events-none z-20"
            style={{ color: pt.color, transform: 'translate(-50%, -50%)' }}
          >
            {pt.text}
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Basket */}
      <div
        className="absolute bottom-4 sm:bottom-8 h-12 sm:h-16 w-24 sm:w-32 bg-gradient-to-b from-amber-400 to-amber-600 rounded-b-2xl rounded-t-md border-t-4 border-amber-200 flex items-center justify-center text-3xl sm:text-4xl shadow-[0_10px_20px_rgba(0,0,0,0.5)] z-10"
        style={{ left: `${basketX}%`, transform: 'translateX(-50%)' }}
      >
        <div className="absolute -top-2 w-full h-4 bg-black/20 rounded-full blur-[2px]"></div>
        🛒
      </div>
      
      <div className="absolute bottom-20 sm:bottom-28 left-0 right-0 text-center text-white/50 text-xs sm:text-sm pointer-events-none font-bold tracking-widest uppercase bg-black/30 px-4 py-1 rounded-full w-max mx-auto">
        Catch stars, avoid bombs!
      </div>
    </div>
  );
};
