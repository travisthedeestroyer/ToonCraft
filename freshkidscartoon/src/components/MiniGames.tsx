import React, { useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { soundManager } from '../utils/sound';

import { BubblePop } from './minigames/BubblePop';
import { WhackAMole } from './minigames/WhackAMole';
import { CatchStars } from './minigames/CatchStars';
import { GeometryWars } from './minigames/GeometryWars';

interface MiniGameProps {
  userAge: number;
  onScore: (points: number) => void;
}

export const MiniGames: React.FC<MiniGameProps> = ({ userAge, onScore }) => {
  const [localScore, setLocalScore] = useState(0);
  const [isMuted, setIsMuted] = useState(false);

  const toggleMute = () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    soundManager.toggleMute(newMuted);
  };

  const handleScore = (points: number) => {
    setLocalScore(prev => prev + points);
    onScore(points);
  };

  // Determine game based on age
  let GameComponent = BubblePop;
  let gameTitle = "Bubble Pop!";
  if (userAge > 3 && userAge <= 6) {
    GameComponent = WhackAMole;
    gameTitle = "Whack-a-Mole!";
  } else if (userAge > 6 && userAge <= 9) {
    GameComponent = CatchStars;
    gameTitle = "Star Catcher!";
  } else if (userAge > 9) {
    GameComponent = GeometryWars;
    gameTitle = "Neon Defender!";
  }

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col">
      {/* Polished Wrapper UI */}
      <div className="absolute top-4 left-4 right-4 flex justify-between items-start z-10 pointer-events-none">
        <div className="bg-black/40 backdrop-blur-md border border-white/20 rounded-2xl px-4 py-2 shadow-xl flex flex-col items-start">
          <span className="text-white/60 text-xs font-bold uppercase tracking-wider mb-1">Mini-Game</span>
          <span className="text-white font-black text-lg drop-shadow-md">{gameTitle}</span>
        </div>
        <div className="bg-gradient-to-br from-yellow-400 to-orange-500 border-2 border-white/30 rounded-full px-5 py-2 shadow-lg flex items-center gap-2 transform hover:scale-105 transition-transform">
          <span className="text-black font-black text-xl">{localScore}</span>
          <span className="text-xl">🪙</span>
        </div>
        <button 
          onClick={toggleMute}
          className="bg-black/40 backdrop-blur-md border border-white/20 rounded-full p-3 shadow-xl hover:bg-black/60 transition-colors pointer-events-auto"
        >
          {isMuted ? <VolumeX className="text-white" size={20} /> : <Volume2 className="text-white" size={20} />}
        </button>
      </div>

      {/* Game Area */}
      <div className="flex-1 relative pointer-events-auto">
        <GameComponent onScore={handleScore} />
      </div>
    </div>
  );
};