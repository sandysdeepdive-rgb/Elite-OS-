'use client';

import { useEffect, useState } from 'react';
import CountUp from 'react-countup';
import WaveOrb from './WaveOrb';
import ArcProgress from './ArcProgress';

interface MetricCardProps {
  label: string;
  value: number;
  suffix?: string;
  subtitle: string;
  percent: number;
}

export default function MetricCard({
  label,
  value,
  suffix = '',
  subtitle,
  percent,
}: MetricCardProps) {
  const [currentPercent, setCurrentPercent] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPercent(percent);
    }, 100);
    return () => clearTimeout(timer);
  }, [percent]);

  return (
    <div className="relative overflow-hidden rounded-2xl p-4 sm:p-5 bg-surface-container-lowest/70 backdrop-blur-xl border border-outline-variant/30 shadow-sm group flex flex-col justify-between min-h-[140px]">
      <WaveOrb position="top-right" size="md" />
      <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-20">
        <ArcProgress percent={percent} size={42} strokeWidth={3} />
      </div>
      <div className="relative z-10 flex-1 flex flex-col">
        <span className="font-label text-[9px] sm:text-[10px] text-tertiary-container tracking-[0.1em] uppercase block mb-2 sm:mb-4 pr-12">
          {label}
        </span>
        <div className="flex items-end justify-between mb-1 sm:mb-2 mt-auto">
          <span className="font-headline text-2xl sm:text-3xl text-primary leading-none tracking-tighter">
            <CountUp 
              end={value} 
              duration={2} 
              separator="," 
              decimals={Number.isInteger(value) ? 0 : 2} 
            />
            {suffix && <span className="text-sm sm:text-lg font-body ml-1">{suffix}</span>}
          </span>
        </div>
        <p className="font-body text-[10px] sm:text-xs text-secondary mb-3 sm:mb-4 line-clamp-1">{subtitle}</p>
        <div className="w-full h-[2px] bg-surface-container rounded-full overflow-hidden mt-auto">
          <div
            className="h-full bg-primary-container transition-all duration-1000 ease-out"
            style={{ width: `${currentPercent}%` }}
          />
        </div>
      </div>
    </div>
  );
}
