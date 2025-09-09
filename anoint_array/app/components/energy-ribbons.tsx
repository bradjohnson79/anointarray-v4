
'use client';

import { motion } from 'framer-motion';

interface EnergyRibbonsProps {
  intensity?: 'subtle' | 'moderate' | 'intense';
  count?: number;
}

export default function EnergyRibbons({ intensity = 'subtle', count = 2 }: EnergyRibbonsProps) {
  const ribbons = Array.from({ length: count }, (_, i) => i);
  
  const getIntensityClass = () => {
    switch (intensity) {
      case 'subtle':
        return 'opacity-20';
      case 'moderate':
        return 'opacity-40';
      case 'intense':
        return 'opacity-60';
      default:
        return 'opacity-20';
    }
  };

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {ribbons.map((index) => (
        <motion.div
          key={index}
          className={`section-energy-ribbon section-energy-ribbon-${index + 1} ${getIntensityClass()}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: index * 0.5 }}
        />
      ))}
    </div>
  );
}
