import React, { useState, useEffect } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Sparkles, Video, Crown, Mail, Calendar, PartyPopper } from 'lucide-react';

const FloatingOrbs = () => {
  const shouldReduceMotion = useReducedMotion();
  const orbAnimation = shouldReduceMotion ? {} : {
    y: [0, -20, 0],
    transition: { duration: 6, repeat: Infinity, ease: "easeInOut" }
  };

  const orbs = [
    { color: 'bg-yellow-400', size: 'w-32 h-32', position: 'top-20 left-20', blur: 'blur-xl', delay: 0 },
    { color: 'bg-blue-400', size: 'w-40 h-40', position: 'bottom-20 right-20', blur: 'blur-xl', delay: 0.3 },
    { color: 'bg-pink-400', size: 'w-24 h-24', position: 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2', blur: 'blur-xl', delay: 0.6 },
    { color: 'bg-cyan-400', size: 'w-16 h-16', position: 'top-10 right-10', blur: 'blur-lg', delay: 0.9 },
    { color: 'bg-orange-400', size: 'w-20 h-20', position: 'bottom-10 left-10', blur: 'blur-lg', delay: 1.2 },
    { color: 'bg-green-400', size: 'w-12 h-12', position: 'top-1/3 right-1/4', blur: 'blur-md', delay: 1.5 },
  ];

  return (
    <div className="absolute inset-0 pointer-events-none">
      {orbs.map((orb, i) => (
        <motion.div
          key={i}
          className={`absolute ${orb.position} ${orb.size} ${orb.color} rounded-full ${orb.blur} opacity-30`}
          animate={orbAnimation}
          transition={{ delay: orb.delay }}
        />
      ))}
    </div>
  );
};

const AnimatedIconButton = ({ icon: Icon, gradient, delay = 0 }: { icon: any, gradient: string, delay?: number }) => (
  <motion.div
    className={`w-20 h-20 bg-gradient-to-r ${gradient} rounded-full flex items-center justify-center shadow-2xl cursor-pointer`}
    whileHover={{ scale: 1.1 }}
    whileTap={{ scale: 0.95 }}
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, type: "spring", stiffness: 300 }}
  >
    <Icon size={40} className="text-white" />
  </motion.div>
);

const CountdownTimer = ({ targetDate }: { targetDate: Date }) => {
  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());

  function calculateTimeLeft() {
    const difference = +new Date(targetDate) - +new Date();
    if (difference <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
    return {
      days: Math.floor(difference / (1000 * 60 * 60 * 24)),
      hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
      minutes: Math.floor((difference / 1000 / 60) % 60),
      seconds: Math.floor((difference / 1000) % 60),
    };
  }

  useEffect(() => {
    const timer = setInterval(() => setTimeLeft(calculateTimeLeft()), 1000);
    return () => clearInterval(timer);
  }, [targetDate]);

  const timeUnits = [
    { label: 'Days', value: timeLeft.days },
    { label: 'Hours', value: timeLeft.hours },
    { label: 'Minutes', value: timeLeft.minutes },
    { label: 'Seconds', value: timeLeft.seconds },
  ];

  return (
    <div className="flex justify-center space-x-4 md:space-x-8">
      {timeUnits.map((unit) => (
        <div key={unit.label} className="text-center">
          <div className="text-4xl md:text-6xl font-black bg-white/10 backdrop-blur-sm rounded-2xl px-4 py-2 border border-white/20 shadow-lg">
            {String(unit.value).padStart(2, '0')}
          </div>
          <div className="text-sm md:text-base uppercase tracking-wider mt-2 text-white/70">
            {unit.label}
          </div>
        </div>
      ))}
    </div>
  );
};

const NewsletterForm = () => {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      setStatus('error');
      setMessage('Please enter a valid email address.');
      return;
    }
    setStatus('loading');
    setTimeout(() => {
      setStatus('success');
      setMessage('You’re on the list! 🎉');
      setEmail('');
      setTimeout(() => setStatus('idle'), 3000);
    }, 800);
  };

  return (
    <motion.div
      className="w-full max-w-md mx-auto"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1.2 }}
    >
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/40" size={20} />
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white/10 backdrop-blur-sm border border-white/30 rounded-full text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
            aria-label="Email address for launch notification"
            disabled={status === 'loading'}
          />
        </div>
        <motion.button
          type="submit"
          className="px-8 py-3 bg-gradient-to-r from-yellow-400 to-pink-500 rounded-full font-semibold text-white shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          disabled={status === 'loading'}
        >
          {status === 'loading' ? 'Submitting...' : 'Notify Me'}
        </motion.button>
      </form>
      {message && (
        <motion.p
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`mt-3 text-sm ${status === 'error' ? 'text-red-300' : 'text-green-300'}`}
        >
          {message}
        </motion.p>
      )}
    </motion.div>
  );
};

export const ComingSoon = ({ onBack }: { onBack: () => void }) => {
  const launchDate = new Date();
  launchDate.setDate(launchDate.getDate() + 30);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.2, delayChildren: 0.3 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 200 } }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center font-['Fredoka'] text-white overflow-hidden relative">
      <FloatingOrbs />
      <button onClick={onBack} className="absolute top-8 left-8 text-white/50 hover:text-white z-50">← Back</button>
      <motion.div className="text-center space-y-8 md:space-y-12 p-6 md:p-12 relative z-10 max-w-5xl mx-auto" variants={containerVariants} initial="hidden" animate="visible">
        <motion.div variants={itemVariants}>
          <h1 className="text-6xl md:text-8xl lg:text-9xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-pink-500 to-cyan-400 drop-shadow-2xl">
            Coming Soon!
          </h1>
        </motion.div>
        <motion.p variants={itemVariants} className="text-xl md:text-3xl text-white/80 font-medium drop-shadow-md">
          Get ready for the most magical cartoon studio ever!
        </motion.p>
        <motion.div variants={itemVariants} className="flex justify-center space-x-6 md:space-x-8">
          <AnimatedIconButton icon={Sparkles} gradient="from-red-500 to-yellow-500" delay={0.4} />
          <AnimatedIconButton icon={Video} gradient="from-blue-500 to-purple-500" delay={0.6} />
          <AnimatedIconButton icon={Crown} gradient="from-green-500 to-teal-500" delay={0.8} />
        </motion.div>
        <motion.div variants={itemVariants}>
          <h2 className="text-2xl md:text-3xl font-semibold mb-6 flex items-center justify-center gap-2"><Calendar className="text-yellow-400" /> Launching In <PartyPopper className="text-pink-400" /></h2>
          <CountdownTimer targetDate={launchDate} />
        </motion.div>
        <motion.div variants={itemVariants}>
          <p className="text-lg md:text-xl text-white/60 mb-6">Be the first to know when we launch!</p>
          <NewsletterForm />
        </motion.div>
      </motion.div>
    </div>
  );
};
