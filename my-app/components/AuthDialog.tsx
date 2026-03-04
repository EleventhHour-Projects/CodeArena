"use client";
import { signIn } from "next-auth/react";
import Image from "next/image";
import googleIcon from "@/public/google-icon-logo-svgrepo-com.svg";

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function AuthDialog({ open, onClose }: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="relative bg-white dark:bg-zinc-900 border border-transparent dark:border-zinc-800 rounded-lg p-6 w-full max-w-sm mx-4 z-10 shadow-xl">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 transition-colors"
        >
          ✕
        </button>

        <h2 className="text-lg font-semibold text-center text-zinc-900 dark:text-zinc-100">
          Sign in
        </h2>

        <p className="text-sm text-zinc-500 dark:text-zinc-400 text-center mt-1">
          Sign in using your Google account
        </p>

        <button
          onClick={() => signIn("google", { callbackUrl: "/" })}
          className="mt-6 w-full flex items-center justify-center gap-3 border border-gray-300 px-4 py-2.5 rounded-md hover:bg-gray-50 transition-colors font-medium text-gray-700 active:bg-gray-200 active:border-gray-200 active:scale-95 cursor-pointer hover:border-gray-200"
        >
          <div className="relative w-5 h-5">
            <Image
              src={googleIcon}
              alt="Google"
              fill
              className="object-contain"
            />
          </div>
          Continue with Google
        </button>

        <p className="mt-4 text-xs text-center text-gray-400">
          By signing in, you agree to our Terms & Privacy Policy
        </p>
      </div>
    </div>
  );
}
