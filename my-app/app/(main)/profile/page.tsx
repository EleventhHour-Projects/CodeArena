"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useDebounceCallback } from "usehooks-ts";
import { toast } from "sonner";
import { Loader2, CheckCircle2, User as UserIcon, XCircle, Mail, IdCard, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface CustomUser {
    name?: string | null;
    email?: string | null;
    image?: string | null;
    username?: string;
}

export default function ProfilePage() {
    const { data: session, update } = useSession();
    
    // State for username field
    const [username, setUsername] = useState("");
    const [isEditing, setIsEditing] = useState(false);
    
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

        // If it's the current username, no need to check
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
        } catch (error) {
            setUsernameStatus('error');
            setUsernameMessage('Error checking username');
        } finally {
            setIsChecking(false);
        }
    };

    // Debounce the API call to prevent too many requests
    const debouncedCheckUsername = useDebounceCallback(checkUsernameUnique, 500);

    const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setUsername(val);
        
        // Basic frontend validation before hitting the API
        if (val.length < 2 || val.length > 20) {
            setUsernameStatus('invalid');
            setUsernameMessage('Username must be 2-20 characters long');
        } else if (!/^[a-zA-Z0-9_]+$/.test(val)) {
            setUsernameStatus('invalid');
            setUsernameMessage('Only letters, numbers, and underscores allowed');
        } else {
            // Trigger debounced backend check
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
                
                // Optimistically update session
                await update({ username });
                
            } else {
                toast.error(data.message || "Failed to change username");
            }
        } catch (error) {
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

    return (
        // height of div should fit screen 
        <div className="flex-1 w-full max-w-3xl mx-auto p-4 md:p-8 lg:p-12 animate-in fade-in duration-500">
            <div className="bg-card w-full rounded-2xl md:rounded-[2.5rem] p-6 sm:p-10 shadow-sm border border-border/40 relative overflow-hidden backdrop-blur-xl">
                
                {/* Background decorative elements */}
                <div className="absolute top-0 right-0 -mt-16 -mr-16 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
                <div className="absolute bottom-0 left-0 -mb-16 -ml-16 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
                
                <div className="relative z-10">
                    <div className="flex flex-col items-center mb-10 md:mb-14">
                        <div className="relative mb-6">
                            <Avatar className="w-32 h-32 md:w-40 md:h-40 border-4 border-background shadow-xl">
                                <AvatarImage src={session?.user?.image || ""} alt={session?.user?.name || "User"} className="object-cover" />
                                <AvatarFallback className="bg-primary/5 text-primary text-4xl">
                                    <UserIcon className="w-16 h-16 opacity-50" />
                                </AvatarFallback>
                            </Avatar>
                            <div className="absolute bottom-2 right-2 p-2 bg-success text-success-foreground rounded-full shadow-lg scale-90 border-2 border-background bg-green-500">
                                <Check className="w-4 h-4" />
                            </div>
                        </div>
                        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
                            {session?.user?.name || "Profile"}
                        </h1>
                        <p className="text-muted-foreground mt-1 text-sm md:text-base font-medium">
                            Manage your personal information
                        </p>
                    </div>

                    <div className="max-w-2xl mx-auto space-y-8 md:space-y-10">
                        {/* Username Field */}
                        <div className="space-y-3 p-1">
                            <div className="flex items-center space-x-2 text-foreground/80 font-semibold text-lg md:text-xl ml-1">
                                <IdCard className="w-5 h-5 text-primary" />
                                <label htmlFor="username">Username</label>
                            </div>
                            
                            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                                <div className="relative flex-1 w-full">
                                    <Input
                                        id="username"
                                        value={username}
                                        onChange={handleUsernameChange}
                                        disabled={!isEditing || isSubmitting}
                                        className={`h-12 md:h-14 bg-background/50 border-input/60 focus-visible:ring-1 text-base shadow-inner transition-all duration-300 rounded-xl ${
                                            isEditing ? "border-primary/50 focus-visible:ring-primary shadow-sm" : "opacity-80 cursor-not-allowed"
                                        }`}
                                        placeholder="Enter username"
                                    />
                                    {isEditing && (
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center">
                                            {isChecking && <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />}
                                            {!isChecking && usernameStatus === 'unique' && <CheckCircle2 className="w-5 h-5 text-green-500 animate-in zoom-in" />}
                                            {!isChecking && (usernameStatus === 'taken' || usernameStatus === 'invalid') && <XCircle className="w-5 h-5 text-red-500 animate-in zoom-in" />}
                                        </div>
                                    )}
                                </div>
                                
                                <div className="flex gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                                    {!isEditing ? (
                                        <Button 
                                            onClick={() => setIsEditing(true)} 
                                            variant="outline" 
                                            className="h-12 md:h-14 px-6 md:px-8 w-full sm:w-auto rounded-xl hover:bg-secondary border-border/60 transition-colors shadow-sm"
                                        >
                                            Change
                                        </Button>
                                    ) : (
                                        <>
                                            <Button 
                                                onClick={handleCancel} 
                                                variant="ghost" 
                                                disabled={isSubmitting}
                                                className="h-12 md:h-14 px-6 w-full sm:w-auto rounded-xl hover:bg-destructive/10 hover:text-destructive transition-colors"
                                            >
                                                Cancel
                                            </Button>
                                            <Button 
                                                onClick={handleSubmit} 
                                                disabled={isSubmitDisabled}
                                                className="h-12 md:h-14 px-6 md:px-8 w-full sm:w-auto rounded-xl shadow-md transition-all duration-300"
                                            >
                                                {isSubmitting ? (
                                                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting</>
                                                ) : "Submit"}
                                            </Button>
                                        </>
                                    )}
                                </div>
                            </div>
                            
                            {/* Validation Messages & Helper Text */}
                            <div className="h-6 ml-2">
                                {isEditing && usernameMessage ? (
                                    <p className={`text-sm font-medium animate-in slide-in-from-top-1 ${
                                        usernameStatus === 'unique' ? 'text-green-500' : 'text-red-500'
                                    }`}>
                                        {usernameMessage}
                                    </p>
                                ) : (
                                    <p className="text-sm text-muted-foreground/80 font-medium">
                                        It can only be changed up to 2 times!
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="h-px bg-border/40 w-full" />

                        {/* Name Field - Readonly */}
                        <div className="space-y-3 p-1">
                             <div className="flex items-center space-x-2 text-foreground/80 font-semibold text-lg md:text-xl ml-1">
                                <UserIcon className="w-5 h-5 text-primary/60" />
                                <label>Name</label>
                            </div>
                            <div className="relative">
                                <Input
                                    value={session?.user?.name || ""}
                                    disabled
                                    className="h-12 md:h-14 bg-muted/30 border-none cursor-not-allowed opacity-70 text-base rounded-xl"
                                />
                                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground bg-muted px-2 py-1 rounded-md">Google Sync</span>
                                </div>
                            </div>
                        </div>

                        {/* Email Field - Readonly */}
                        <div className="space-y-3 p-1 pb-4">
                             <div className="flex items-center space-x-2 text-foreground/80 font-semibold text-lg md:text-xl ml-1">
                                <Mail className="w-5 h-5 text-primary/60" />
                                <label>Email</label>
                            </div>
                            <div className="relative">
                                <Input
                                    value={session?.user?.email || ""}
                                    disabled
                                    className="h-12 md:h-14 bg-muted/30 border-none cursor-not-allowed opacity-70 text-base rounded-xl"
                                />
                                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground bg-muted px-2 py-1 rounded-md">Google Sync</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
