"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";

const CHARACTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%^&*()_+";

const getRandomChar = () => CHARACTERS[Math.floor(Math.random() * CHARACTERS.length)];

interface CodeColumnProps {
  delay: number;
  duration: number;
}

const CodeColumn: React.FC<CodeColumnProps> = ({ delay, duration }) => {
  const length = 40;
  const [chars, setChars] = useState<string[]>(() => 
    Array.from({ length }, getRandomChar)
  );

  useEffect(() => {
    // interval to randomly flip characters to give a matrix vibe
    const interval = setInterval(() => {
      setChars((prev) => {
        const next = [...prev];
        // randomly flip a few characters
        for (let i = 0; i < 3; i++) {
          const idx = Math.floor(Math.random() * length);
          next[idx] = getRandomChar();
        }
        return next;
      });
    }, 100);

    return () => clearInterval(interval);
  }, []);

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
      className="flex flex-col text-green-400/60 dark:text-green-500/40 text-xs sm:text-sm font-mono whitespace-pre w-5 md:w-6 items-center shrink-0 transition-colors duration-300"
      style={{
        textShadow: "0 0 8px rgba(34, 197, 94, 0.4)",
      }}
    >
      {chars.map((c, i) => (
        <span key={i} className="my-[2px]">
          {c}
        </span>
      ))}
    </motion.div>
  );
};

export const CodeBackground = () => {
  const [columnProps, setColumnProps] = useState<{delay: number, duration: number}[]>([]);

  useEffect(() => {
    const updateColumns = () => {
      // calculate for ~70% screen width
      const elWidth = window.innerWidth * 0.7;
      const columnsCount = Math.floor(elWidth / 24);
      
      setColumnProps(
        Array.from({ length: columnsCount }).map(() => ({
          delay: Math.random() * 5,
          duration: Math.random() * 10 + 8,
        }))
      );
    };

    updateColumns();
    window.addEventListener("resize", updateColumns);
    return () => window.removeEventListener("resize", updateColumns);
  }, []);

  return (
    <div className="absolute inset-0 z-0 overflow-hidden bg-zinc-50 dark:bg-[#050505] flex justify-center pointer-events-none transition-colors duration-300">
      {/* Gradient overlays to fade top and bottom */}
      <div className="absolute inset-0 bg-linear-to-b from-zinc-50/90 via-transparent to-zinc-50/90 dark:from-black/80 dark:via-transparent dark:to-black/80 z-10 transition-colors duration-300"></div>
      
      <div className="flex w-full h-[200%] opacity-50 justify-evenly">
        {columnProps.map((props, i) => (
          <CodeColumn
            key={i}
            delay={props.delay}
            duration={props.duration}
          />
        ))}
      </div>
    </div>
  );
};
