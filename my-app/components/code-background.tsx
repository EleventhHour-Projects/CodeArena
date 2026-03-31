"use client";

import React, { useMemo } from "react";
import { useTheme } from "next-themes";

const CHARACTERS = "ELEVENTHHOUR<>/\\;:";
const getRandomChar = () => CHARACTERS[Math.floor(Math.random() * CHARACTERS.length)];

interface StaticColumnProps {
  opacity: number;
  color: string;
  glow?: string;
  offset: string;
}

const StaticColumn: React.FC<StaticColumnProps> = ({ opacity, color, glow, offset }) => {
  const chars = useMemo(() => 
    Array.from({ length: 50 }, getRandomChar).map((c, i) => (
      <span key={i} className="block">{c}</span>
    )), 
  []);
  
  return (
    <div 
      className="flex flex-col text-[10px] font-mono leading-none select-none"
      style={{ 
        color, 
        opacity,
        transform: `translateY(${offset})`,
        textShadow: glow ? `0 0 12px ${glow}` : 'none',
        willChange: 'auto'
      }}
    >
      {chars}
    </div>
  );
};

export const CodeBackground = () => {
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === "light";

  // Generate static positions and properties once
  const columns = useMemo(() => {
    return Array.from({ length: 40 }).map((_, i) => ({
      opacity: Math.random() * 0.2 + 0.05,
      bright: i % 8 === 0,
      offset: `${Math.random() * -100}px`,
    }));
  }, []);

  const baseColor = isLight ? "rgba(22, 163, 74, 0.35)" : "rgba(34, 197, 94, 0.25)";
  const brightColor = isLight ? "rgba(21, 128, 61, 0.6)" : "rgba(74, 222, 128, 0.5)";
  const glowColor = isLight ? "rgba(34, 197, 94, 0.3)" : "rgba(74, 222, 128, 0.4)";

  return (
    <div className="absolute inset-0 z-0 overflow-hidden bg-background flex justify-around pointer-events-none transition-colors duration-500 px-4">
      {/* Background Gradients for Depth */}
      <div className="absolute inset-0 z-10 bg-linear-to-b from-background via-transparent to-background" />
      <div className="absolute inset-0 z-10 bg-[radial-gradient(ellipse_80%_60%_at_50%_50%,transparent_20%,var(--background)_100%)] opacity-90" />

      {columns.map((col, i) => (
        <StaticColumn 
          key={i} 
          opacity={col.opacity} 
          color={col.bright ? brightColor : baseColor}
          glow={col.bright ? glowColor : undefined}
          offset={col.offset}
        />
      ))}
    </div>
  );
};
