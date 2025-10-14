import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DollarSign } from 'lucide-react';

const MoneyParticle = ({ x, delay, duration, size, opacity }) => (
  <motion.div
    className="absolute"
    style={{
      left: `${x}%`,
      fontSize: `${size}px`,
      top: '-50px',
    }}
    initial={{ y: 0, rotate: 0 }}
    animate={{ y: 'calc(100vh + 50px)', rotate: Math.random() * 720 - 360 }}
    transition={{
      delay,
      duration,
      ease: 'linear',
    }}
  >
    <DollarSign className="text-green-500" style={{ width: size, height: size, opacity }} />
  </motion.div>
);

const BearParticle = ({ x, delay, duration, size, opacity }) => (
    <motion.div
      className="absolute"
      style={{
        left: `${x}%`,
        top: '-100px',
      }}
      initial={{ y: 0, rotate: 0 }}
      animate={{ y: 'calc(100vh + 100px)', rotate: 360 }}
      transition={{
        delay,
        duration,
        ease: 'linear',
      }}
    >
      <img 
        src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68d2b2a650846fbd3f78c242/13a135050_e376fe48-a618-426a-81d2-1b4cc1573622.png" 
        alt="Falling Bear"
        style={{
            width: size,
            height: size,
            opacity: opacity,
        }}
      />
    </motion.div>
  );

export default function MoneyFall({ duration = 15000 }) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, duration);

    return () => clearTimeout(timer);
  }, [duration]);

  const dollarParticles = React.useMemo(() => 
    Array.from({ length: 40 }).map((_, i) => ({
      id: `dollar-${i}`,
      x: Math.random() * 100,
      delay: Math.random() * 15,
      duration: 5 + Math.random() * 5,
      size: 20 + Math.random() * 40,
      opacity: 0.3 + Math.random() * 0.5,
    })), 
  []);

  const bearParticles = React.useMemo(() => 
    Array.from({ length: 15 }).map((_, i) => ({
      id: `bear-${i}`,
      x: Math.random() * 100,
      delay: Math.random() * 15,
      duration: 6 + Math.random() * 6,
      size: 100 + Math.random() * 80,
      opacity: 0.4 + Math.random() * 0.6,
    })), 
  []);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
            className="fixed inset-0 pointer-events-none z-[5] overflow-hidden"
            exit={{ opacity: 0, transition: { duration: 1 } }}
        >
          {dollarParticles.map(p => (
            <MoneyParticle key={p.id} {...p} />
          ))}
          {bearParticles.map(p => (
            <BearParticle key={p.id} {...p} />
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}