"use client";
import { useState } from "react";
import AuthDialog from "@/components/AuthDialog";

export default function LoginPage() {
    const [open, setOpen] = useState(true);

    return <AuthDialog open={open} onClose={() => setOpen(false)} />;
}