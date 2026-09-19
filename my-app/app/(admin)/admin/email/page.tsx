"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Mail,
  Send,
  Code2,
  FileText,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Maximize2,
  Minimize2,
  Shield,
  User2,
  Headset,
  BellOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

type ContentType = "html" | "text";

interface SenderOption {
  email: string;
  label: string;
  description: string;
  icon: "support" | "noreply" | "personal";
  /** If set, only this admin username can use this sender */
  restrictedTo?: string;
}

const SENDER_OPTIONS: SenderOption[] = [
  {
    email: "CodeArena Support <support@codearena.pro>",
    label: "Support",
    description: "support@codearena.pro",
    icon: "support",
  },
  {
    email: "CodeArena <noreply@codearena.pro>",
    label: "No Reply",
    description: "noreply@codearena.pro",
    icon: "noreply",
  },
  {
    email: "Manav Sharma <manav@codearena.pro>",
    label: "Manav Sharma",
    description: "manav@codearena.pro",
    icon: "personal",
    restrictedTo: "manav",
  },
  {
    email: "Dhananjay Mishra <dhananjay@codearena.pro>",
    label: "Dhananjay Mishra",
    description: "dhananjay@codearena.pro",
    icon: "personal",
    restrictedTo: "dhananjay",
  },
];

function SenderIcon({ type, className }: { type: SenderOption["icon"]; className?: string }) {
  switch (type) {
    case "support":
      return <Headset className={className} />;
    case "noreply":
      return <BellOff className={className} />;
    case "personal":
      return <User2 className={className} />;
  }
}

export default function AdminEmailPage() {
  const [adminUser, setAdminUser] = useState<string | null>(null);
  const [loadingAdmin, setLoadingAdmin] = useState(true);
  const [to, setTo] = useState("");
  const [selectedSender, setSelectedSender] = useState<string>("");
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [contentType, setContentType] = useState<ContentType>("html");
  const [sending, setSending] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [previewExpanded, setPreviewExpanded] = useState(false);
  const [lastSent, setLastSent] = useState<{
    to: string;
    subject: string;
    id: string;
    at: Date;
  } | null>(null);

  // Fetch admin user to determine available senders
  useEffect(() => {
    const fetchAdmin = async () => {
      try {
        const res = await fetch("/api/admin/me");
        if (res.ok) {
          const data = await res.json();
          setAdminUser(data.username?.toLowerCase() || null);
        }
      } catch {
        console.error("Failed to fetch admin info");
      } finally {
        setLoadingAdmin(false);
      }
    };
    fetchAdmin();
  }, []);

  // Filter senders based on admin user
  const availableSenders = SENDER_OPTIONS.filter(
    (s) => !s.restrictedTo || s.restrictedTo === adminUser
  );

  // Auto-select first available sender
  useEffect(() => {
    if (!loadingAdmin && availableSenders.length > 0 && !selectedSender) {
      setSelectedSender(availableSenders[0].email);
    }
  }, [loadingAdmin, availableSenders, selectedSender]);

  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Update iframe preview content
  const updatePreview = () => {
    if (!iframeRef.current) return;
    const doc = iframeRef.current.contentDocument;
    if (!doc) return;
    doc.open();
    doc.write(content);
    doc.close();
  };

  // biome-ignore: react-hooks/exhaustive-deps
  React.useEffect(() => {
    if (contentType === "html" && showPreview) {
      const t = setTimeout(updatePreview, 300);
      return () => clearTimeout(t);
    }
  }, [content, contentType, showPreview]);

  const handleSend = async () => {
    if (!to.trim()) {
      toast.error("Recipient email is required");
      return;
    }
    if (!subject.trim()) {
      toast.error("Subject is required");
      return;
    }
    if (!content.trim()) {
      toast.error("Email content is required");
      return;
    }

    // Basic email validation
    const emails = to
      .split(",")
      .map((e) => e.trim())
      .filter(Boolean);
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const invalid = emails.find((e) => !emailRegex.test(e));
    if (invalid) {
      toast.error(`Invalid email address: ${invalid}`);
      return;
    }

    if (!selectedSender) {
      toast.error("Please select a sender address");
      return;
    }

    setSending(true);
    try {
      const res = await fetch("/api/admin/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: emails,
          subject: subject.trim(),
          content: content,
          contentType,
          from: selectedSender,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send email");

      toast.success("Email sent successfully!");
      setLastSent({
        to: emails.join(", "),
        subject: subject.trim(),
        id: data.id,
        at: new Date(),
      });
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to send email"
      );
    } finally {
      setSending(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  return (
    <div className="min-h-screen bg-background text-foreground px-4 sm:px-6 py-6 sm:py-10 selection:bg-primary/30">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-widest mb-2">
            <Mail className="h-3.5 w-3.5" />
            Admin · Email
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">
            Send Email
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Compose and send emails via Resend. Supports HTML with live preview
            and plain text.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* ── LEFT: COMPOSE ── */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="space-y-5"
          >
            {/* Sender Selector */}
            <div className="bg-card border border-border rounded-2xl p-5">
              <p className="text-xs text-muted-foreground uppercase tracking-widest font-medium mb-3">
                Send from
              </p>
              {loadingAdmin ? (
                <div className="flex items-center gap-2 py-4 justify-center text-muted-foreground">
                  <div className="h-3.5 w-3.5 border-2 border-violet-400/40 border-t-violet-400 rounded-full animate-spin" />
                  <span className="text-xs">Loading senders…</span>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {availableSenders.map((sender) => {
                    const isSelected = selectedSender === sender.email;
                    return (
                      <button
                        key={sender.email}
                        onClick={() => setSelectedSender(sender.email)}
                        className={`
                          flex items-center gap-3 rounded-xl p-3.5 border transition-all text-left
                          ${isSelected
                            ? "border-indigo-500/50 bg-indigo-500/8 text-foreground"
                            : "border-border bg-muted/20 text-muted-foreground hover:border-border/80 hover:text-foreground"
                          }
                        `}
                      >
                        <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${isSelected
                          ? "bg-indigo-500/15"
                          : "bg-muted/40"
                          }`}>
                          <SenderIcon
                            type={sender.icon}
                            className={`h-4 w-4 ${isSelected ? "text-indigo-400" : "text-muted-foreground"
                              }`}
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-sm truncate">{sender.label}</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                            {sender.description}
                          </p>
                        </div>
                        {isSelected && (
                          <div className="ml-auto shrink-0">
                            <CheckCircle2 className="h-4 w-4 text-indigo-400" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* To / Subject */}
            <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
              <p className="text-xs text-muted-foreground uppercase tracking-widest font-medium">
                Recipients
              </p>

              {/* To */}
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block font-medium">
                  To{" "}
                  <span className="text-muted-foreground/50">
                    (comma-separated for multiple)
                  </span>
                </label>
                <input
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  placeholder="user@example.com, another@example.com"
                  className="w-full px-3.5 py-2.5 bg-muted/40 border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-violet-500/50 transition"
                />
              </div>

              {/* Subject */}
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block font-medium">
                  Subject
                </label>
                <input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Your assessment invitation"
                  className="w-full px-3.5 py-2.5 bg-muted/40 border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-violet-500/50 transition"
                />
              </div>
            </div>

            {/* Content Type Selector */}
            <div className="bg-card border border-border rounded-2xl p-5">
              <p className="text-xs text-muted-foreground uppercase tracking-widest font-medium mb-3">
                Content Type
              </p>
              <div className="grid grid-cols-2 gap-3">
                {(["html", "text"] as ContentType[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => setContentType(t)}
                    className={`
                      flex items-center gap-3 rounded-xl p-4 border transition-all text-left
                      ${contentType === t
                        ? t === "html"
                          ? "border-violet-500/50 bg-violet-500/8 text-foreground"
                          : "border-emerald-500/50 bg-emerald-500/8 text-foreground"
                        : "border-border bg-muted/20 text-muted-foreground hover:border-border/80 hover:text-foreground"
                      }
                    `}
                  >
                    {t === "html" ? (
                      <Code2
                        className={`h-5 w-5 shrink-0 ${contentType === "html" ? "text-violet-400" : ""
                          }`}
                      />
                    ) : (
                      <FileText
                        className={`h-5 w-5 shrink-0 ${contentType === "text" ? "text-emerald-400" : ""
                          }`}
                      />
                    )}
                    <div>
                      <p className="font-semibold text-sm uppercase">
                        {t === "html" ? "HTML" : "Plain Text"}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {t === "html"
                          ? "Rich formatted email with preview"
                          : "Simple text-only email"}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Editor */}
            <div className="bg-card border border-border rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-muted-foreground uppercase tracking-widest font-medium flex items-center gap-2">
                  {contentType === "html" ? (
                    <Code2 className="h-3.5 w-3.5 text-violet-400" />
                  ) : (
                    <FileText className="h-3.5 w-3.5 text-emerald-400" />
                  )}
                  {contentType === "html" ? "HTML Content" : "Text Content"}
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono text-muted-foreground">
                    {content.length.toLocaleString()} chars
                  </span>
                  {content && (
                    <button
                      onClick={() => copyToClipboard(content)}
                      className="p-1 rounded-md hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors"
                      title="Copy content"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={
                  contentType === "html"
                    ? `<!DOCTYPE html>\n<html>\n<body>\n  <h1>Hello!</h1>\n  <p>Your email content here...</p>\n</body>\n</html>`
                    : "Type your plain text email content here..."
                }
                rows={18}
                spellCheck={false}
                className={`w-full bg-muted/40 border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/40 resize-none focus:outline-none focus:ring-1 transition ${contentType === "html"
                  ? "font-mono text-[13px] leading-relaxed focus:ring-violet-500/50"
                  : "focus:ring-emerald-500/50"
                  }`}
              />
            </div>

            {/* Send button */}
            <Button
              onClick={handleSend}
              disabled={sending}
              className="w-full h-12 font-semibold flex items-center gap-2 transition-all bg-violet-600 hover:bg-violet-500 text-white text-base rounded-xl"
            >
              {sending ? (
                <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {sending ? "Sending..." : "Send Email"}
            </Button>

            {/* Last sent confirmation */}
            <AnimatePresence>
              {lastSent && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="bg-emerald-500/8 border border-emerald-500/30 rounded-2xl p-4 flex items-start gap-3"
                >
                  <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-emerald-400">
                      Email sent successfully
                    </p>
                    <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                      <p className="truncate">
                        <span className="text-muted-foreground/60">To:</span>{" "}
                        {lastSent.to}
                      </p>
                      <p className="truncate">
                        <span className="text-muted-foreground/60">
                          Subject:
                        </span>{" "}
                        {lastSent.subject}
                      </p>
                      <p>
                        <span className="text-muted-foreground/60">ID:</span>{" "}
                        <span className="font-mono text-[10px]">
                          {lastSent.id}
                        </span>
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* ── RIGHT: PREVIEW ── */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className={previewExpanded ? "fixed inset-4 z-50" : ""}
          >
            {/* Expanded overlay backdrop */}
            {previewExpanded && (
              <div
                className="fixed inset-0 bg-black/60 backdrop-blur-sm -z-10"
                onClick={() => setPreviewExpanded(false)}
              />
            )}

            <div
              className={`bg-card border border-border rounded-2xl overflow-hidden flex flex-col ${previewExpanded ? "h-full" : "h-full min-h-[700px]"
                }`}
            >
              {/* Preview header */}
              <div className="p-4 border-b border-border flex items-center justify-between shrink-0">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <Eye className="h-4 w-4 text-violet-400" />
                  Preview
                  {contentType === "text" && (
                    <span className="text-[10px] text-muted-foreground bg-muted/40 px-2 py-0.5 rounded-full">
                      Text mode
                    </span>
                  )}
                </h3>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setShowPreview(!showPreview)}
                    className="p-1.5 rounded-lg hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors"
                    title={showPreview ? "Hide preview" : "Show preview"}
                  >
                    {showPreview ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                  <button
                    onClick={() => setPreviewExpanded(!previewExpanded)}
                    className="p-1.5 rounded-lg hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors"
                    title={
                      previewExpanded
                        ? "Exit fullscreen"
                        : "Fullscreen preview"
                    }
                  >
                    {previewExpanded ? (
                      <Minimize2 className="h-4 w-4" />
                    ) : (
                      <Maximize2 className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Email envelope preview */}
              {showPreview && (selectedSender || to || subject) && (
                <div className="px-5 py-3 border-b border-border/50 bg-muted/20 space-y-1 shrink-0">
                  {selectedSender && (
                    <p className="text-xs text-muted-foreground truncate">
                      <span className="font-semibold text-muted-foreground/80 w-14 inline-block">
                        From:
                      </span>{" "}
                      <span className="text-foreground/80">
                        {SENDER_OPTIONS.find((s) => s.email === selectedSender)?.description || selectedSender}
                      </span>
                    </p>
                  )}
                  {to && (
                    <p className="text-xs text-muted-foreground truncate">
                      <span className="font-semibold text-muted-foreground/80 w-14 inline-block">
                        To:
                      </span>{" "}
                      <span className="text-foreground/80">{to}</span>
                    </p>
                  )}
                  {subject && (
                    <p className="text-xs text-muted-foreground truncate">
                      <span className="font-semibold text-muted-foreground/80 w-14 inline-block">
                        Subj:
                      </span>{" "}
                      <span className="text-foreground/80 font-medium">
                        {subject}
                      </span>
                    </p>
                  )}
                </div>
              )}

              {/* Preview body */}
              <div className="flex-1 min-h-0">
                {!showPreview ? (
                  <div className="h-full flex items-center justify-center text-muted-foreground">
                    <div className="text-center space-y-2">
                      <EyeOff className="h-8 w-8 mx-auto opacity-20" />
                      <p className="text-sm">Preview hidden</p>
                    </div>
                  </div>
                ) : !content.trim() ? (
                  <div className="h-full flex items-center justify-center text-muted-foreground">
                    <div className="text-center space-y-3">
                      <div className="h-16 w-16 mx-auto rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                        <Mail className="h-7 w-7 text-violet-400/40" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">No content yet</p>
                        <p className="text-xs text-muted-foreground/60 mt-0.5">
                          Start typing to see a live preview
                        </p>
                      </div>
                    </div>
                  </div>
                ) : contentType === "html" ? (
                  <iframe
                    ref={iframeRef}
                    title="HTML Email Preview"
                    className="w-full h-full border-0 bg-white"
                    sandbox="allow-same-origin"
                  />
                ) : (
                  <div className="p-5 h-full overflow-y-auto">
                    <pre className="text-sm text-foreground whitespace-pre-wrap break-words font-sans leading-relaxed">
                      {content}
                    </pre>
                  </div>
                )}
              </div>

              {/* Preview footer */}
              {showPreview && content.trim() && contentType === "html" && (
                <div className="px-4 py-2.5 border-t border-border/50 bg-muted/10 flex items-center gap-2 shrink-0">
                  <AlertTriangle className="h-3 w-3 text-amber-400/60" />
                  <p className="text-[10px] text-muted-foreground">
                    Preview is approximate. Email clients may render differently.
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
