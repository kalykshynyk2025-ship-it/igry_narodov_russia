import React from 'react';

export const RussianOrnamentsBackground: React.FC = () => {
  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none bg-white"
    >
      {/* Subtle geometric pattern grid */}
      <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:24px_24px] opacity-40" />

      {/* Ornament 1: North Reindeer Antler / Solar Diamond (Top-Left) */}
      <div className="absolute -top-12 -left-12 w-80 h-80 opacity-[0.06] text-red-600 animate-[spin_120s_linear_infinite]">
        <svg viewBox="0 0 200 200" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-full h-full">
          {/* Diamond Rhombus */}
          <polygon points="100,20 180,100 100,180 20,100" />
          <polygon points="100,45 155,100 100,155 45,100" />
          <circle cx="100" cy="100" r="18" strokeWidth="2" />
          <circle cx="100" cy="100" r="6" fill="currentColor" />
          {/* Antler branches */}
          <path d="M20,100 L5,85 M20,100 L5,115" />
          <path d="M180,100 L195,85 M180,100 L195,115" />
          <path d="M100,20 L85,5 M100,20 L115,5" />
          <path d="M100,180 L85,195 M100,180 L115,195" />
          <path d="M50,50 L40,30 M50,50 L30,40" />
          <path d="M150,50 L160,30 M150,50 L170,40" />
          <path d="M150,150 L160,170 M150,150 L170,160" />
          <path d="M50,150 L40,170 M50,150 L30,160" />
        </svg>
      </div>

      {/* Ornament 2: Yakut Sacred Sun Disc "Күн" (Top-Right) */}
      <div className="absolute top-20 -right-20 w-96 h-96 opacity-[0.05] text-red-700 animate-[spin_160s_linear_infinite_reverse]">
        <svg viewBox="0 0 220 220" fill="none" stroke="currentColor" strokeWidth="2" className="w-full h-full">
          <circle cx="110" cy="110" r="90" strokeDasharray="6 6" />
          <circle cx="110" cy="110" r="70" />
          <circle cx="110" cy="110" r="45" />
          <circle cx="110" cy="110" r="20" fill="currentColor" opacity="0.2" />
          {/* 8 rays */}
          {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
            <line
              key={angle}
              x1="110"
              y1="20"
              x2="110"
              y2="40"
              transform={`rotate(${angle} 110 110)`}
              strokeWidth="3"
            />
          ))}
          {/* Inner folk hooks */}
          <path d="M110,65 L118,80 L110,95 L102,80 Z" />
          <path d="M110,125 L118,140 L110,155 L102,140 Z" />
          <path d="M65,110 L80,118 L95,110 L80,102 Z" />
          <path d="M125,110 L140,118 L155,110 L140,102 Z" />
        </svg>
      </div>

      {/* Ornament 3: Khanty-Mansi Geometric Waves / Hare Ears (Middle Left) */}
      <div className="absolute top-1/2 -left-16 -translate-y-1/2 w-72 h-72 opacity-[0.05] text-gray-500 animate-[pulse_12s_ease-in-out_infinite]">
        <svg viewBox="0 0 200 200" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-full h-full">
          <rect x="30" y="30" width="140" height="140" strokeDasharray="8 6" />
          {/* Step pyramid stepped zigzags */}
          <path d="M40,100 L60,80 L80,100 L100,80 L120,100 L140,80 L160,100" />
          <path d="M40,120 L60,140 L80,120 L100,140 L120,120 L140,140 L160,120" />
          <circle cx="100" cy="100" r="14" />
          <polygon points="100,70 115,85 100,100 85,85" />
          <polygon points="100,100 115,115 100,130 85,115" />
        </svg>
      </div>

      {/* Ornament 4: Altai Geometric Solar Flower / Petroglyphic Star (Middle Right) */}
      <div className="absolute top-2/3 -right-16 w-88 h-88 opacity-[0.05] text-red-600 animate-[spin_140s_linear_infinite]">
        <svg viewBox="0 0 200 200" fill="none" stroke="currentColor" strokeWidth="2" className="w-full h-full">
          <polygon points="100,10 125,75 190,100 125,125 100,190 75,125 10,100 75,75" />
          <circle cx="100" cy="100" r="30" strokeDasharray="4 4" />
          <circle cx="100" cy="100" r="12" strokeWidth="2" />
          {/* Diagonal corner arrows */}
          <path d="M35,35 L60,60 M40,60 L60,60 L60,40" strokeWidth="2.5" />
          <path d="M165,35 L140,60 M160,60 L140,60 L140,40" strokeWidth="2.5" />
          <path d="M165,165 L140,140 M160,140 L140,140 L140,160" strokeWidth="2.5" />
          <path d="M35,165 L60,140 M40,140 L60,140 L60,160" strokeWidth="2.5" />
        </svg>
      </div>

      {/* Ornament 5: Slavic "Орепей" (Bottom Center) */}
      <div className="absolute -bottom-24 left-1/2 -translate-x-1/2 w-96 h-96 opacity-[0.06] text-red-600 animate-[pulse_10s_ease-in-out_infinite]">
        <svg viewBox="0 0 240 240" fill="none" stroke="currentColor" strokeWidth="2" className="w-full h-full">
          <polygon points="120,20 220,120 120,220 20,120" />
          <polygon points="120,50 190,120 120,190 50,120" />
          <polygon points="120,80 160,120 120,160 80,120" />
          {/* Comb-like decorative teeth (гребёнка) */}
          <path d="M50,120 L40,110 M50,120 L40,130" strokeWidth="3" />
          <path d="M190,120 L200,110 M190,120 L200,130" strokeWidth="3" />
          <path d="M120,50 L110,40 M120,50 L130,40" strokeWidth="3" />
          <path d="M120,190 L110,200 M120,190 L130,200" strokeWidth="3" />
          <circle cx="120" cy="120" r="10" fill="currentColor" opacity="0.3" />
        </svg>
      </div>
    </div>
  );
};
