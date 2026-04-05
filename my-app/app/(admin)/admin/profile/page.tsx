"use client";

import React, { useEffect, useState } from "react";
import { Camera, Save, Loader2, Shield, ArrowLeft, Link as LinkIcon, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

export default function AdminProfilePage() {
  const [adminUser, setAdminUser] = useState<{ _id: string; username: string; image?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [image, setImage] = useState("");
  const [mode, setMode] = useState<"upload" | "url">("upload");
  const [urlInput, setUrlInput] = useState("");

  useEffect(() => {
    const fetchAdmin = async () => {
      try {
        const response = await fetch("/api/admin/me");
        if (response.ok) {
          const data = await response.json();
          setAdminUser(data);
          
          // Detect mode based on existing image
          if (data.image) {
            setImage(data.image);
            if (data.image.startsWith("http")) {
              setMode("url");
              setUrlInput(data.image);
            } else {
              setMode("upload");
            }
          }
        }
      } catch (error) {
        toast.error("Failed to fetch admin info");
      } finally {
        setLoading(false);
      }
    };
    fetchAdmin();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Body size limit check — 1MB is safer for most server configs
      if (file.size > 1024 * 1024) {
        toast.error("Image too large. Please use a file under 1MB or use a URL.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setImage(base64);
        toast.success("Image updated from file");
      };
      reader.onerror = () => {
        toast.error("Failed to read file");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUrlSubmit = () => {
    if (!urlInput) {
      toast.error("Please enter a valid URL");
      return;
    }
    if (!urlInput.startsWith("http")) {
      toast.error("URL must start with http:// or https://");
      return;
    }
    setImage(urlInput);
    toast.success("Previewing image from URL");
  };

  const handleSave = async () => {
    if (!image) {
      toast.error("No image data to save");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/admin/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Profile photo updated successfully!");
        // Small delay before reload for toast visibility
        setTimeout(() => window.location.reload(), 1000);
      } else {
        // Detailed error reporting for the user
        const errorMsg = data.error || "Update failed";
        toast.error(`${errorMsg} ${data.details ? `(${data.details})` : ""}`);
        console.error("Profile update error:", data);
      }
    } catch (error) {
      toast.error("Connection error. Payload might be too large.");
      console.error("Network error:", error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground px-6 py-10 selection:bg-primary/30 transition-colors">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-10 flex items-center gap-4">
          <Link href="/admin">
            <Button variant="ghost" size="icon" className="rounded-full hover:bg-muted">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Admin Profile</h1>
            <p className="text-muted-foreground text-sm">Update your administrator identity</p>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-3xl border border-border bg-card/50 backdrop-blur-sm group shadow-2xl p-8 md:p-10"
        >
          {/* dynamic accents */}
          <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full bg-primary/10 blur-[80px] pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-64 h-64 rounded-full bg-indigo-500/10 blur-[80px] pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row gap-12 items-center lg:items-start">
            
            {/* Left Column: Avatar & Mode Selector */}
            <div className="flex flex-col items-center gap-6">
              <div className="relative group/avatar">
                <Avatar className="h-48 w-48 rounded-3xl border-2 border-border/50 shadow-2xl transition-transform group-hover/avatar:scale-[1.02] overflow-hidden bg-muted">
                  {image ? (
                    <img src={image} alt="Profile" className="h-full w-full object-cover" onError={() => toast.error("Invalid image path/URL")} />
                  ) : (
                    <AvatarFallback className="rounded-3xl bg-indigo-500/10 text-indigo-400">
                      <Shield className="h-20 w-20" />
                    </AvatarFallback>
                  )}
                </Avatar>
                
                {mode === "upload" && (
                  <label
                    htmlFor="profile-pic-upload"
                    className="absolute bottom-[-10px] right-[-10px] p-3 bg-primary text-black rounded-2xl shadow-xl cursor-pointer hover:bg-primary/90 transition-all active:scale-90 z-20"
                  >
                    <Camera className="h-6 w-6" />
                    <input
                      id="profile-pic-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                  </label>
                )}
              </div>

              <div className="flex bg-muted/40 p-1 rounded-xl border border-border/40 w-full">
                <button
                  onClick={() => setMode("upload")}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all ${
                    mode === "upload" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Upload className="h-3 w-3" />
                  Upload
                </button>
                <button
                  onClick={() => setMode("url")}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all ${
                    mode === "url" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <LinkIcon className="h-3 w-3" />
                  URL
                </button>
              </div>
            </div>

            {/* Right Column: Inputs & Actions */}
            <div className="flex-1 space-y-8 w-full">
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-[0.2em] mb-1">Authenticated As</h3>
                  <p className="text-3xl font-bold tracking-tight text-foreground truncate">{adminUser?.username}</p>
                </div>

                <AnimatePresence mode="wait">
                  {mode === "url" ? (
                    <motion.div
                      key="url-mode"
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      className="space-y-3"
                    >
                      <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none">External Image URL</label>
                      <div className="flex gap-2">
                        <Input
                          value={urlInput}
                          onChange={(e) => setUrlInput(e.target.value)}
                          placeholder="https://example.com/photo.jpg"
                          className="bg-muted/30 border-border/40 focus:border-primary/50 h-11 rounded-xl"
                        />
                        <Button onClick={handleUrlSubmit} className="h-11 px-4 rounded-xl bg-muted/50 hover:bg-muted text-foreground border border-border/40">
                          Preview
                        </Button>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="upload-mode"
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      className="p-5 rounded-2xl bg-indigo-500/5 border border-indigo-500/10"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
                          <Upload className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-indigo-400">Pick from device</p>
                          <p className="text-[10px] text-zinc-500 font-medium">PNG, JPG, or SVG. Max 1MB.</p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                
                <div className="p-4 rounded-2xl bg-muted/30 border border-border/40">
                  <p className="text-[11px] text-muted-foreground leading-relaxed italic">
                    Note: Using a URL is recommended for stability with large images.
                  </p>
                </div>
              </div>

              <div className="pt-6 border-t border-border/40">
                <Button
                  onClick={handleSave}
                  disabled={saving || !image}
                  className="w-full h-12 rounded-xl bg-primary text-black font-bold text-base shadow-[0_0_20px_rgba(var(--primary-rgb),0.2)] hover:shadow-[0_0_30px_rgba(var(--primary-rgb),0.3)] transition-all"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Saving Profile...
                    </>
                  ) : (
                    <>
                      <Save className="h-5 w-5 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* System Footer */}
        <div className="mt-8 p-6 rounded-3xl border border-border bg-card/30 backdrop-blur-sm flex justify-between items-center text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
          <div className="flex items-center gap-2">
            <Shield className="h-3 w-3 text-indigo-500" />
            ADMIN_ID: {adminUser?._id}
          </div>
          <div>ESTABLISHED_SECURE_LINK</div>
        </div>
      </div>
    </div>
  );
}
