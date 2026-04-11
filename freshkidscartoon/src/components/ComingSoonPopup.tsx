import React, { useState } from 'react';
import { motion } from 'motion/react';
import { X, Sparkles, Video, Crown, Mail, Rocket } from 'lucide-react';

interface ComingSoonPopupProps {
  onClose: () => void;
}

const SPARKLE_POSITIONS = [
  { delay: 0,   x: 12,  y: 78 },
  { delay: 0.4, x: 82,  y: 68 },
  { delay: 0.7, x: 22,  y: 38 },
  { delay: 1.0, x: 73,  y: 25 },
  { delay: 1.3, x: 50,  y: 88 },
  { delay: 1.6, x: 38,  y: 55 },
  { delay: 1.9, x: 63,  y: 12 },
  { delay: 0.2, x: 90,  y: 90 },
];

const SparkleParticle = ({ delay, x, y }: { delay: number; x: number; y: number }) => (
  <motion.div
    className="absolute w-1.5 h-1.5 rounded-full bg-yellow-300"
    style={{ left: `${x}%`, top: `${y}%` }}
    animate={{ opacity: [0, 1, 0], scale: [0, 1.8, 0], y: [0, -18, -36] }}
    transition={{ duration: 2.2, delay, repeat: Infinity, repeatDelay: 1.5 + delay * 0.3 }}
  />
);

const FEATURES = [
  { icon: Video,     label: 'Magic AI Video Generation',    color: 'text-blue-400' },
  { icon: Sparkles,  label: 'Unlimited Cartoon Stories',    color: 'text-yellow-400' },
  { icon: Crown,     label: 'Pro Creator Studio Tools',     color: 'text-pink-400' },
];

export const ComingSoonPopup: React.FC<ComingSoonPopupProps> = ({ onClose }) => {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [emailError, setEmailError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      setEmailError('Enter a valid email!');
      return;
    }
    setEmailError('');
    setSubscribed(true);
  };

  return (
    <div className="absolute inset-0 z-[100] flex items-center justify-center p-4 font-['Fredoka']">
      {/* Blurred backdrop — clicking it closes the popup */}
      <motion.div
        className="absolute inset-0 bg-black/65 backdrop-blur-[6px]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        onClick={onClose}
      />

      {/* Modal card */}
      <motion.div
        className="relative w-full max-w-xs sm:max-w-sm"
        initial={{ scale: 0.72, opacity: 0, y: 32 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 290, damping: 22 }}
      >
        <div className="relative bg-gradient-to-b from-indigo-950 via-[#2a1060] to-[#4a0a38] rounded-[2rem] p-6 border border-white/10 shadow-[0_0_80px_rgba(130,80,255,0.45)] overflow-hidden">

          {/* Animated sparkle particles */}
          {SPARKLE_POSITIONS.map((s, i) => <SparkleParticle key={i} {...s} />)}

          {/* Ambient glow blobs */}
          <div className="absolute -top-10 -left-10 w-36 h-36 bg-indigo-500/25 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-10 -right-10 w-36 h-36 bg-pink-600/25 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-24 bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white/50 hover:text-white transition-all z-20"
            aria-label="Close"
          >
            <X size={15} />
          </button>

          {/* Content */}
          <div className="relative z-10 flex flex-col items-center text-center gap-4">

            {/* Animated clapperboard emoji */}
            <motion.div
              className="text-5xl select-none"
              animate={{ rotate: [-6, 6, -6], scale: [1, 1.06, 1] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            >
              🎬
            </motion.div>

            {/* Title */}
            <div>
              <h2 className="text-[2.2rem] leading-none font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-pink-400 to-cyan-400">
                Coming Soon!
              </h2>
              <p className="text-white/55 text-sm mt-1 font-medium">
                Something magical is being crafted…
              </p>
            </div>

            {/* Feature teasers */}
            <div className="w-full bg-white/[0.06] rounded-2xl px-4 py-3 space-y-2.5 text-left border border-white/[0.07]">
              {FEATURES.map(({ icon: Icon, label, color }) => (
                <div key={label} className="flex items-center gap-3">
                  <Icon size={15} className={color} />
                  <span className="text-white/75 text-sm font-semibold">{label}</span>
                </div>
              ))}
            </div>

            {/* Email signup */}
            {!subscribed ? (
              <form onSubmit={handleSubmit} className="w-full space-y-2">
                <div className="relative">
                  <Mail size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/35" />
                  <input
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={e => { setEmail(e.target.value); setEmailError(''); }}
                    className="w-full pl-9 pr-4 py-2.5 bg-white/10 border border-white/15 rounded-full text-white text-sm placeholder-white/35 focus:outline-none focus:ring-2 focus:ring-yellow-400/60 focus:border-yellow-400/40 transition-all"
                  />
                </div>
                {emailError && (
                  <p className="text-red-300 text-xs pl-1">{emailError}</p>
                )}
                <motion.button
                  type="submit"
                  className="w-full py-2.5 bg-gradient-to-r from-yellow-400 via-pink-500 to-pink-500 rounded-full font-bold text-white text-sm shadow-lg shadow-pink-600/30 flex items-center justify-center gap-2"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                >
                  <Rocket size={14} />
                  Notify Me When Ready!
                </motion.button>
              </form>
            ) : (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 300 }}
                className="w-full py-3 bg-green-500/15 border border-green-400/25 rounded-2xl text-green-300 font-bold text-sm"
              >
                🎉 You&apos;re on the list! We&apos;ll let you know!
              </motion.div>
            )}

            {/* Subtle dismiss link */}
            <button
              onClick={onClose}
              className="text-white/25 hover:text-white/55 text-xs transition-colors mt-1"
            >
              Continue watching production →
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
