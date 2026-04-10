import React from 'react';
import { Theme } from '../types';
import { X, ShoppingBag, Check } from 'lucide-react';
import { THEMES, VOICE_SKINS } from '../constants';

interface ShopProps {
  currentTheme: Theme;
  ownedThemes: string[];
  currentVoiceId: string;
  ownedVoices: string[];
  wallet: number;
  onBuyTheme: (id: string, cost: number) => void;
  onSelectTheme: (id: string) => void;
  onBuyVoice: (id: string, cost: number) => void;
  onSelectVoice: (id: string) => void;
  onClose: () => void;
}

export const Shop: React.FC<ShopProps> = ({
  currentTheme,
  ownedThemes,
  currentVoiceId,
  ownedVoices,
  wallet,
  onBuyTheme,
  onSelectTheme,
  onBuyVoice,
  onSelectVoice,
  onClose
}) => {
  return (
    <div className={`fixed inset-0 z-50 flex flex-col p-8 ${currentTheme.bgClass} overflow-y-auto`}>
      {/* Iridescent Animated Blobs matching Landing Page */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden z-0 opacity-20 pointer-events-none">
          <div className="absolute top-10 left-10 w-48 sm:w-64 h-48 sm:h-64 bg-purple-500 rounded-full blur-[80px] sm:blur-[100px] animate-pulse"></div>
          <div className="absolute bottom-10 right-10 w-64 sm:w-80 h-64 sm:h-80 bg-blue-500 rounded-full blur-[100px] sm:blur-[120px] animate-pulse"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500 rounded-full blur-[150px] animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      <div className="relative z-10 flex justify-between items-center mb-8">
        <h2 className={`text-5xl font-bold text-white drop-shadow-lg flex items-center gap-4 ${currentTheme.fontClass}`}>
          <ShoppingBag size={48} className="text-yellow-400" />
          Magic Shop
        </h2>
        <div className="flex items-center gap-4">
          <div className="bg-black/30 px-6 py-2 rounded-full text-white font-bold text-xl flex items-center gap-2">
            <span>{wallet}</span>
            <span className="text-2xl">🪙</span>
          </div>
          <button 
            onClick={onClose}
            className="p-3 bg-white/20 hover:bg-white/30 rounded-full text-white transition-colors"
          >
            <X size={28} />
          </button>
        </div>
      </div>

      <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Themes Section */}
        <div className="bg-black/20 rounded-3xl p-6 border border-white/10">
          <h3 className="text-3xl font-bold text-white mb-6">Colors & Styles</h3>
          <div className="space-y-4">
            {THEMES.map(theme => {
              const isOwned = ownedThemes.includes(theme.id);
              const isSelected = currentTheme.id === theme.id;
              
              return (
                <div key={theme.id} className={`p-4 rounded-2xl flex items-center justify-between ${isSelected ? 'bg-white/30 border-2 border-yellow-400' : 'bg-white/10 border border-white/5'}`}>
                  <div>
                    <h4 className="text-xl font-bold text-white">{theme.name}</h4>
                    {!isOwned && <p className="text-yellow-400 font-bold">{theme.cost} 🪙</p>}
                  </div>
                  
                  {isOwned ? (
                    <button 
                      onClick={() => onSelectTheme(theme.id)}
                      disabled={isSelected}
                      className={`px-6 py-2 rounded-full font-bold transition-colors ${isSelected ? 'bg-yellow-400 text-black' : 'bg-white/20 text-white hover:bg-white/30'}`}
                    >
                      {isSelected ? 'Selected' : 'Use'}
                    </button>
                  ) : (
                    <button 
                      onClick={() => onBuyTheme(theme.id, theme.cost)}
                      disabled={wallet < theme.cost}
                      className={`px-6 py-2 rounded-full font-bold transition-colors ${wallet >= theme.cost ? 'bg-green-500 hover:bg-green-600 text-white' : 'bg-gray-500 text-gray-300 opacity-50 cursor-not-allowed'}`}
                    >
                      Buy
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Voices Section */}
        <div className="bg-black/20 rounded-3xl p-6 border border-white/10">
          <h3 className="text-3xl font-bold text-white mb-6">Magic Voices</h3>
          <div className="space-y-4">
            {VOICE_SKINS.map(voice => {
              const isOwned = ownedVoices.includes(voice.id);
              const isSelected = currentVoiceId === voice.id;
              
              return (
                <div key={voice.id} className={`p-4 rounded-2xl flex items-center justify-between ${isSelected ? 'bg-white/30 border-2 border-yellow-400' : 'bg-white/10 border border-white/5'}`}>
                  <div>
                    <h4 className="text-xl font-bold text-white">{voice.name}</h4>
                    {!isOwned && <p className="text-yellow-400 font-bold">{voice.cost} 🪙</p>}
                  </div>
                  
                  {isOwned ? (
                    <button 
                      onClick={() => onSelectVoice(voice.id)}
                      disabled={isSelected}
                      className={`px-6 py-2 rounded-full font-bold transition-colors ${isSelected ? 'bg-yellow-400 text-black' : 'bg-white/20 text-white hover:bg-white/30'}`}
                    >
                      {isSelected ? 'Selected' : 'Use'}
                    </button>
                  ) : (
                    <button 
                      onClick={() => onBuyVoice(voice.id, voice.cost)}
                      disabled={wallet < voice.cost}
                      className={`px-6 py-2 rounded-full font-bold transition-colors ${wallet >= voice.cost ? 'bg-green-500 hover:bg-green-600 text-white' : 'bg-gray-500 text-gray-300 opacity-50 cursor-not-allowed'}`}
                    >
                      Buy
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
