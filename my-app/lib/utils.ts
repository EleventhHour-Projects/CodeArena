import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const playBattleJoinSound = () => {
  try {
    const audio = new Audio("/match-found.wav");
    audio.volume = 0.5;
    audio.play().catch(e => console.warn("Audio play blocked:", e));
  } catch (err) {
    console.error("Failed to play sound:", err);
  }
};
