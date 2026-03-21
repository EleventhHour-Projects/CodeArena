"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useTheme } from "next-themes";

const CHARACTERS = "ELEVENTHHOUR<>/\\;:";

const getRandomChar = () => CHARACTERS[Math.floor(Math.random() * CHARACTERS.length)];

interface CodeColumnProps {
  delay: number;
  duration: number;
  bright?: boolean;
}

const CodeColumn: React.FC<CodeColumnProps> = ({ delay, duration, bright }) => {
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === "light";
  const length = 40;
  const [chars, setChars] = useState<string[]>(() =>
    Array.from({ length }, getRandomChar)
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setChars((prev) => {
        const next = [...prev];
        const count = bright ? 5 : 3;
        for (let i = 0; i < count; i++) {
          const idx = Math.floor(Math.random() * length);
          next[idx] = getRandomChar();
        }
        return next;
      });
    }, bright ? 80 : 130);

    return () => clearInterval(interval);
  }, [bright]);

  return (
    <motion.div
      initial={{ y: "-100%" }}
      animate={{ y: "150%" }}
      transition={{
        duration,
        repeat: Infinity,
        ease: "linear",
        delay,
      }}
      className="flex flex-col text-xs font-mono whitespace-pre items-center shrink-0 select-none"
      style={{
        width: "20px",
        willChange: "transform",
        color: isLight 
          ? (bright ? "rgba(22, 163, 74, 0.45)" : "rgba(34, 197, 94, 0.12)")
          : (bright ? "rgba(74, 222, 128, 0.7)" : "rgba(34, 197, 94, 0.22)"),
        textShadow: bright
          ? (isLight 
              ? "0 0 8px rgba(34, 197, 94, 0.3)" 
              : "0 0 12px rgba(74, 222, 128, 0.9), 0 0 4px rgba(74, 222, 128, 0.5)")
          : (isLight ? "none" : "0 0 6px rgba(34, 197, 94, 0.3)"),
      }}
    >
      {chars.map((c, i) => (
        <span
          key={i}
          className="my-[2px] leading-none"
          style={{
            opacity: bright
              ? Math.max(0.15, 1 - i / (length * 0.8))
              : Math.max(0.05, 0.5 - i / (length * 1.2)),
          }}
        >
          {c}
        </span>
      ))}
    </motion.div>
  );
};

export const CodeBackground = () => {
  const [columnProps, setColumnProps] = useState<
    { delay: number; duration: number; bright: boolean }[]
  >([]);

  useEffect(() => {
    const updateColumns = () => {
      const elWidth = window.innerWidth * 0.7;
      const columnsCount = Math.floor(elWidth / 22);

      setColumnProps(
        Array.from({ length: columnsCount }).map((_, i) => ({
          delay: Math.random() * 8,
          duration: Math.random() * 12 + 10,
          bright: i % 7 === 0, // every 7th column is a bright "lead" column
        }))
      );
    };

    updateColumns();
    window.addEventListener("resize", updateColumns);
    return () => window.removeEventListener("resize", updateColumns);
  }, []);

  return (
    <div className="absolute inset-0 z-0 overflow-hidden bg-background flex justify-center pointer-events-none transition-colors duration-500">
      {/* Vertical fade overlays */}
      <div className="absolute inset-0 z-10 bg-linear-to-b from-background via-transparent to-background" />
      {/* Horizontal fade from center */}
      <div className="absolute inset-0 z-10 bg-[radial-gradient(ellipse_80%_60%_at_50%_50%,transparent_30%,var(--background)_100%)] opacity-80" />

      <div className="flex w-full h-[200%] justify-evenly items-start">
        {columnProps.map((props, i) => (
          <CodeColumn
            key={i}
            delay={props.delay}
            duration={props.duration}
            bright={props.bright}
          />
        ))}
      </div>
    </div>
  );
};
