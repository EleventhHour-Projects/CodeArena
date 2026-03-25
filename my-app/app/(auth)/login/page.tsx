import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import SignInButton from "./SignInButton";
import { Logo } from "@/components/Logo"
import Image from "next/image";

export default async function LoginPage() {
    const session = await getServerSession(authOptions);

    if (session) {
        redirect("/");
    }

    return (
        <div className="flex h-screen w-full bg-[#111111] overflow-hidden">
            {/* Left Column - Branding */}
            <div className="hidden lg:flex flex-col justify-center items-center w-1/2 bg-[#09090b] relative">
                {/* Abstract Background Element */}
                <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
                    <div className="absolute top-[20%] left-[-10%] w-[80%] h-[80%] bg-[radial-gradient(ellipse_at_center,var(--tw-gradient-stops))] from-blue-900/10 via-[#09090b] to-transparent blur-[80px]" />
                    <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] bg-[radial-gradient(circle_at_center,var(--tw-gradient-stops))] from-indigo-900/10 via-[#09090b] to-transparent blur-[100px]" />
                </div>

                <div className="relative z-10 flex flex-col items-center gap-6">
                    <div className="p-6 bg-zinc-900/50 rounded-3xl border border-white/10 shadow-2xl backdrop-blur-sm group hover:border-primary/50 transition-all duration-500">
                        <Logo width={120} height={105} className="group-hover:scale-110 transition-transform duration-500" />
                    </div>
                    <div className="text-center space-y-2">
                        <h1 className="text-5xl font-black tracking-tighter text-white">
                            Code<span className="text-primary">Arena</span>
                        </h1>
                        <p className="text-zinc-500 font-medium tracking-widest uppercase text-xs">
                            Ultimate Coding Battles
                        </p>
                    </div>
                </div>
            </div>

            {/* Right Column - Auth */}
            <div className="flex flex-col justify-center items-center w-full lg:w-1/2 bg-[#171717] px-8 py-12 relative">
                <div className="w-full max-w-[360px] space-y-8 flex flex-col items-center">
                    <div className="text-center space-y-2 w-full">
                        <h2 className="text-3xl font-semibold tracking-tight text-white mb-2">Sign in</h2>
                        <p className="text-sm text-[#a1a1aa]">Welcome ! Please sign in to continue.</p>
                    </div>

                    <div className="w-full mt-8">
                        <SignInButton />
                    </div>
                </div>
            </div>
        </div>
    );
}