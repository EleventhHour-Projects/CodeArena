"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useDebounceCallback } from "usehooks-ts";
import { toast } from "sonner";
import { Loader2, CheckCircle2, User as UserIcon, XCircle, Mail, IdCard, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { motion } from "framer-motion";

interface CustomUser {
    name?: string | null;
    email?: string | null;
    image?: string | null;
    username?: string;
    isBanned?: boolean;
    banExpires?: string | null;
}

const SNIPPETS = ["{ }", "[ ]", "=>", "&&", "||", "const", "await", "import", "type", "void", "async"];

const FloatingCode = () => {
    const elements = useMemo(() => {
        return Array.from({ length: 20 }).map((_, i) => ({
            id: i,
            text: SNIPPETS[i % SNIPPETS.length],
            initialX: (i * 7 + 13) % 100 + "%",
            initialY: (i * 11 + 17) % 100 + "%",
            initialRotate: (i * 13) % 360,
            animateX: (i * 17 + 23) % 100 + "%",
            animateY: (i * 19 + 29) % 100 + "%",
            animateRotate: (i * 23 + 41) % 360,
            duration: 15 + (i % 10) * 2,
        }));
    }, []);

    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-[0.03] select-none">
            {elements.map((el) => (
                <motion.div
                    key={el.id}
                    initial={{ 
                        x: el.initialX, 
                        y: el.initialY,
                        opacity: 0,
                        rotate: el.initialRotate
                    }}
                    animate={{ 
                        x: [null, el.animateX],
                        y: [null, el.animateY],
                        opacity: [0, 1, 0],
                        rotate: [null, el.animateRotate]
                    }}
                    transition={{ 
                        duration: el.duration, 
                        repeat: Infinity,
                        ease: "linear"
                    }}
                    className="absolute text-foreground font-mono text-xs font-bold"
                    style={{ willChange: "transform, opacity" }}
                >
                    {el.text}
                </motion.div>
            ))}
        </div>
    );
};

const ScanningLine = () => (
    <motion.div 
        className="absolute inset-0 pointer-events-none z-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
    >
        <motion.div 
            className="w-full h-px bg-primary/10 shadow-[0_0_15px_rgba(var(--primary),0.5)]"
            animate={{ y: ["0vh", "80vh", "0vh"] }}
            transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
            style={{ position: 'absolute', top: 0, willChange: 'transform' }}
        />
    </motion.div>
);

export default function ProfileClient({ initialChangeCount }: { initialChangeCount: number }) {
    const { data: session, update } = useSession();
    const isBanned = (session?.user as CustomUser)?.isBanned;
    const banExpires = (session?.user as CustomUser)?.banExpires;
    
    // State for username field
    const [username, setUsername] = useState("");
    const [isEditing, setIsEditing] = useState(false);
    const [changeCount, setChangeCount] = useState(initialChangeCount);
    
    // Validation states
    const [isChecking, setIsChecking] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [usernameStatus, setUsernameStatus] = useState<'idle' | 'unique' | 'taken' | 'error' | 'invalid'>('idle');
    const [usernameMessage, setUsernameMessage] = useState("");

    // Initialize username once session is loaded
    useEffect(() => {
        if ((session?.user as CustomUser)?.username) {
            setUsername((session?.user as CustomUser)?.username as string);
        }
    }, [session]);

    // Check username uniqueness
    const checkUsernameUnique = async (value: string) => {
        if (!value.trim()) {
            setUsernameStatus('idle');
            setUsernameMessage('');
            return;
        }

        if ((session?.user as CustomUser)?.username && value === (session?.user as CustomUser)?.username) {
            setUsernameStatus('idle');
            setUsernameMessage('');
            return;
        }

        setIsChecking(true);
        setUsernameStatus('idle');
        
        try {
            const response = await fetch(`/api/check-username-unique?username=${encodeURIComponent(value)}`);
            const data = await response.json();
            
            if (response.ok) {
                setUsernameStatus('unique');
                setUsernameMessage('Username is available');
            } else {
                setUsernameStatus('taken');
                setUsernameMessage(data.error || 'Username is already taken');
            }
        } catch {
            setUsernameStatus('error');
            setUsernameMessage('Error checking username');
        } finally {
            setIsChecking(false);
        }
    };

    const debouncedCheckUsername = useDebounceCallback(checkUsernameUnique, 500);

    const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setUsername(val);
        
        if (val.length < 2 || val.length > 20) {
            setUsernameStatus('invalid');
            setUsernameMessage('Username must be 2-20 characters long');
        } else if (!/^[a-zA-Z0-9_]+$/.test(val)) {
            setUsernameStatus('invalid');
            setUsernameMessage('Only letters, numbers, and underscores allowed');
        } else {
            debouncedCheckUsername(val);
        }
    };

    const handleSubmit = async () => {
        if (usernameStatus !== 'unique') {
            toast.error("Please enter a valid and available username");
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await fetch("/api/change-username", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username }),
            });
            const data = await response.json();

            if (response.ok) {
                toast.success(data.message || "Username changed successfully!", {
                    icon: <CheckCircle2 className="w-5 h-5 text-green-500" />
                });
                setIsEditing(false);
                setUsernameStatus('idle');
                setUsernameMessage('');
                setChangeCount(prev => prev + 1);
                
                // Optimistically update session
                await update({ username });
                
            } else {
                toast.error(data.message || "Failed to change username");
            }
        } catch {
            toast.error("An unexpected error occurred. Please try again later.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCancel = () => {
        setIsEditing(false);
        setUsername((session?.user as CustomUser)?.username as string || "");
        setUsernameStatus('idle');
        setUsernameMessage('');
    };

    // Disable condition for the submit button
    const isSubmitDisabled = 
        !isEditing || 
        isChecking || 
        isSubmitting || 
        usernameStatus !== 'unique' || 
        username === (session?.user as CustomUser)?.username;

    const remainingChanges = Math.max(0, 2 - changeCount);
    const limitReached = changeCount >= 2;

    return (
        <div className="flex-1 w-full max-w-4xl mx-auto p-4 md:p-6 lg:p-8 flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] relative">
            
            {/* Background Animations */}
            <div className="absolute inset-0 z-0">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,var(--primary)_0%,transparent_70%)] opacity-[0.03]" />
                <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-size-[4rem_4rem] opacity-[0.02]" />
                <FloatingCode />
                <ScanningLine />
            </div>

            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="bg-card w-full rounded-lg border border-border/60 shadow-2xl relative overflow-hidden backdrop-blur-md z-10"
            >
                
                {/* Cyberpunk/Arena accents */}
                <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-transparent via-primary/50 to-transparent opacity-50" />
                <div className="absolute top-0 content-center p-2 opacity-30 select-none font-mono text-[10px] hidden sm:block">
                    SYSTEM_STATUS: ONLINE<br />
                    SECURE_LINK: ESTABLISHED
                </div>

                {isBanned && (
                    <div className="bg-red-500/10 border-b border-red-500/20 px-6 py-4 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-red-500/20 text-red-500">
                                <XCircle className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-red-500 uppercase tracking-tight">Account Restricted</p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    {banExpires 
                                        ? `Your protocol access is suspended until ${new Date(banExpires).toLocaleString()}.`
                                        : 'Your protocol access has been permanently terminated.'}
                                </p>
                            </div>
                        </div>
                        <div className="hidden sm:block text-[10px] font-mono text-red-500/50 uppercase tracking-widest text-right">
                            ERROR_CODE: ACCESS_DENIED<br />
                            STATUS: UNAUTHORIZED
                        </div>
                    </div>
                )}
                
                <div className="flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-border/40">
                    
                    {/* Sidebar / Profile Header */}
                    <div className="md:w-1/3 p-6 sm:p-8 flex flex-col items-center justify-center space-y-4 bg-muted/20">
                        <div className="relative group">
                            <div className="absolute -inset-0.5 bg-linear-to-tr from-primary/30 to-primary/10 rounded-full blur opacity-30 group-hover:opacity-60 transition duration-500" />
                            <Avatar className="w-28 h-28 md:w-32 md:h-32 border-2 border-background shadow-xl rounded-full relative">
                                <AvatarImage src={session?.user?.image || ""} alt={session?.user?.name || "User"} className="object-cover" />
                                <AvatarFallback className="bg-muted text-muted-foreground">
                                    <UserIcon className="w-12 h-12 opacity-30" />
                                </AvatarFallback>
                            </Avatar>
                            {!isBanned && (
                                <div className="absolute bottom-1 right-1 p-1.5 bg-green-500 text-white rounded-full shadow-lg border-2 border-background">
                                    <Check className="w-3 h-3" />
                                </div>
                            )}
                            {isBanned && (
                                <div className="absolute inset-0 bg-red-950/40 rounded-full flex items-center justify-center pointer-events-none backdrop-blur-[1px] border-2 border-red-500/50">
                                    <span className="text-white font-black text-xs uppercase tracking-widest px-2 py-1 bg-red-600 rounded-lg shadow-xl">BAN</span>
                                </div>
                            )}
                        </div>
                        
                        <div className="text-center space-y-1">
                            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground truncate max-w-[200px]">
                                {session?.user?.name || "Player One"}
                            </h1>
                            {isBanned ? (
                                <div className="inline-flex items-center px-2 py-0.5 rounded-full bg-red-500/10 text-red-500 text-[10px] font-mono border border-red-500/20">
                                    <XCircle className="w-2.5 h-2.5 mr-1.5" />
                                    SUSPENDED
                                </div>
                            ) : (
                                <div className="inline-flex items-center px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-mono border border-primary/20">
                                    <span className="w-2 h-2 rounded-full bg-green-600 mr-1.5 animate-pulse" />
                                    COMBATANT
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Main Content Areas */}
                    <div className="flex-1 p-6 sm:p-8 lg:p-10 space-y-6">
                        <div className="flex flex-col space-y-6">
                            
                            {/* Username Field */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2 text-muted-foreground">
                                        <IdCard className="w-4 h-4" />
                                        <label htmlFor="username" className="text-xs font-mono uppercase tracking-widest">Identification</label>
                                    </div>
                                    {!isEditing && (
                                        <Button 
                                            onClick={() => setIsEditing(true)} 
                                            variant="ghost" 
                                            disabled={limitReached}
                                            className={`h-9 px-4 text-xs font-mono uppercase rounded-md border transition-all active:scale-95 cursor-pointer ${
                                                limitReached 
                                                ? "bg-muted/50 text-muted-foreground border-border cursor-not-allowed" 
                                                : "bg-primary/10 hover:bg-primary/20 border-primary/40 shadow-[0_0_12px_rgba(0,0,0,0)] hover:shadow-primary/20 hover:border-primary/60"
                                            }`}
                                        >
                                            {limitReached ? "[ Limit_Reached ]" : "[ Edit_Handle ]"}
                                        </Button>
                                    )}
                                </div>
                                
                                <div className="space-y-2">
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-muted-foreground/50 font-mono">
                                            {">"}
                                        </div>
                                        <Input
                                            id="username"
                                            value={username}
                                            onChange={handleUsernameChange}
                                            disabled={!isEditing || isSubmitting}
                                            className={`pl-8 h-12 font-mono text-base bg-background/40 transition-all duration-200 rounded-md border-border/60 ${
                                                isEditing ? "border-primary/50 ring-1 ring-primary/20 bg-background" : "cursor-default border-transparent bg-transparent shadow-none"
                                            }`}
                                            placeholder="UNSET_ALIAS"
                                        />
                                        {isEditing && (
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                                                {isChecking && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
                                                {!isChecking && usernameStatus === 'unique' && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                                                {!isChecking && (usernameStatus === 'taken' || usernameStatus === 'invalid') && <XCircle className="w-4 h-4 text-red-500" />}
                                            </div>
                                        )}
                                    </div>
                                    
                                    {isEditing && (
                                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 animate-in fade-in slide-in-from-top-2">
                                            <div className="min-h-5">
                                                {usernameMessage ? (
                                                    <p className={`text-[10px] font-mono ${
                                                        usernameStatus === 'unique' ? 'text-green-500' : 'text-red-500'
                                                    }`}>
                                                        {usernameMessage.toUpperCase().replace(/ /g, '_')}
                                                    </p>
                                                ) : (
                                                    <p className="text-[10px] font-mono text-muted-foreground">
                                                        MODIFICATION_LIMIT: {remainingChanges}
                                                    </p>
                                                )}
                                            </div>
                                            <div className="flex gap-2 w-full sm:w-auto">
                                                <Button 
                                                    onClick={handleCancel} 
                                                    variant="ghost" 
                                                    size="sm"
                                                    disabled={isSubmitting}
                                                    className="h-9 px-4 rounded-md font-mono text-xs uppercase"
                                                >
                                                    Abort
                                                </Button>
                                                <Button 
                                                    onClick={handleSubmit} 
                                                    disabled={isSubmitDisabled}
                                                    size="sm"
                                                    className="h-9 px-4 rounded-md font-mono text-xs uppercase shadow-lg shadow-primary/20"
                                                >
                                                    {isSubmitting ? (
                                                        <Loader2 className="w-3 h-3 animate-spin" />
                                                    ) : "Execute"}
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                    {!isEditing && !limitReached && (
                                        <p className="text-[10px] font-mono text-muted-foreground/60 transition-opacity">
                                            MODIFICATION_LIMIT: {remainingChanges}
                                        </p>
                                    )}
                                    {limitReached && !isEditing && (
                                        <p className="text-[12px] font-mono text-red-500/60 transition-opacity">
                                            PROTOCOL_ERROR: MODIFICATION_LIMIT_REACHED
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                {/* Name Field */}
                                <div className="space-y-2">
                                    <div className="flex items-center space-x-2 text-muted-foreground">
                                        <UserIcon className="w-4 h-4" />
                                        <label className="text-xs font-mono uppercase tracking-widest">Entity_Name</label>
                                    </div>
                                    <div className="p-3 bg-muted/30 border border-border/40 rounded-md font-mono text-sm text-foreground/80 flex items-center justify-between">
                                        <span className="truncate">{session?.user?.name || "N/A"}</span>
                                    </div>
                                </div>

                                {/* Email Field */}
                                <div className="space-y-2">
                                    <div className="flex items-center space-x-2 text-muted-foreground">
                                        <Mail className="w-4 h-4" />
                                        <label className="text-xs font-mono uppercase tracking-widest">Comm_Link</label>
                                    </div>
                                    <div className="p-3 bg-muted/30 border border-border/40 rounded-md font-mono text-sm text-foreground/80 flex items-center justify-between">
                                        <span className="truncate">{session?.user?.email || "N/A"}</span>              
                                    </div>
                                </div>
                            </div>
                            
                            
                        </div>
                    </div>
                </div>
            </motion.div>
            
            {/* Decoration outside the card */}
            <div className="mt-8 items-center gap-12 opacity-10 grayscale select-none pointer-events-none hidden md:flex z-10">
                <div className="font-mono text-[83px] font-bold">PROFILE</div>
                <div className="h-20 w-px bg-foreground" />
                <div className="font-mono text-xs max-w-xs leading-tight">
                    ACCESSING USER PROTOCOL DATA... OK<br />
                    FETCHING ARENA STATISTICS... OK<br />
                    SYNCHRONIZING REPUTATION... OK
                </div>
            </div>
        </div>
    );
}
