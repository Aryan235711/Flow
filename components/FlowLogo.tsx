
import React, { memo } from 'react';

export const FlowLogo = memo(({ className = "w-10 h-10" }: { className?: string }) => (
  <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <defs>
      <linearGradient id="flowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#6366f1" />
        <stop offset="50%" stopColor="#818cf8" />
        <stop offset="100%" stopColor="#d946ef" />
      </linearGradient>
      <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="4" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
    </defs>
    
    {/* Abstract Flow Shape - F / Infinity Loop Hybrid */}
    <path 
      d="M30 70C30 70 20 80 35 85C50 90 60 75 60 75L75 40C75 40 85 15 65 15C45 15 40 35 40 35L30 60C30 60 25 75 45 75C65 75 80 50 80 50" 
      stroke="url(#flowGrad)" 
      strokeWidth="12" 
      strokeLinecap="round" 
      strokeLinejoin="round"
      filter="url(#glow)"
    />
    
    {/* Accent Dot */}
    <circle cx="72" cy="22" r="6" fill="#fff" fillOpacity="0.9" />
  </svg>
));
