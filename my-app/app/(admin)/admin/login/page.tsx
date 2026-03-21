"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function AdminLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Login failed");
      }

      toast.success("Logged in successfully");
      router.push("/admin");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 px-4">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-sm">

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-semibold text-white">
              Admin Login
            </h1>
            <p className="text-sm text-zinc-400 mt-1">
              Enter your credentials to continue
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-5">

            {/* Username */}
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
              <Input
                type="text"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="pl-9 h-11 bg-zinc-950 border-zinc-800 text-white placeholder:text-zinc-500 focus-visible:ring-1 focus-visible:ring-zinc-600"
                required
              />
            </div>

            {/* Password */}
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-9 h-11 bg-zinc-950 border-zinc-800 text-white placeholder:text-zinc-500 focus-visible:ring-1 focus-visible:ring-zinc-600"
                required
              />
            </div>

            {/* Button */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-white text-black hover:bg-zinc-200 font-medium"
            >
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-zinc-500 mt-6">
          Restricted access
        </p>
      </div>
    </div>
  );
}