import React from 'react';

// Modern University Logo Component using favicon1.jpg and its exact #101A24 / #E5DDC6 palette
export function UniversityLogo({ className = "", tone = "dark" }: { className?: string; tone?: "dark" | "light" }) {
  const cleanClassName = className.replace(/\bw-\d+\b|\bh-\d+\b/g, '').trim();
  const isLight = tone === "light";
  
  return (
    <div className={`h-10 sm:h-12 flex items-center gap-2.5 select-none ${cleanClassName}`}>
      <div className="w-9 h-9 rounded-xl overflow-hidden flex items-center justify-center shadow-sm border border-[#E5DDC6]/30 flex-shrink-0 bg-[#101A24]">
        <img src="/favicon1.jpg" alt="University Logo" className="w-full h-full object-cover" />
      </div>
      <div className="flex flex-col justify-center">
        <span className={`text-base font-bold tracking-tight leading-none ${
          isLight ? 'text-[#E5DDC6]' : 'text-[#101A24]'
        }`}>
          University
        </span>
        <span className={`text-[10px] font-semibold tracking-wider uppercase mt-0.5 ${
          isLight ? 'text-[#E5DDC6]/80' : 'text-[#101A24]/70'
        }`}>
          Portal
        </span>
      </div>
    </div>
  );
}

export const GitamLogo = UniversityLogo;
export default UniversityLogo;
