import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "../globals.css";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { Toaster } from "@/components/ui/sonner"
import Providers from "./providers";
import { AnnouncementBanner } from "@/components/announcement-banner";
import { FundingModal } from "@/components/modals/FundingModal";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CodeArena",
  description: "Challenge friends to solve algorithmic problems in real time. Prove your skills, climb the ranks, dominate the arena.",
  metadataBase: new URL("https://codearena.pro"),
  openGraph: {
    title: "CodeArena",
    description: "Challenge friends to solve algorithmic problems in real time. Prove your skills, climb the ranks, dominate the arena.",
    url: "https://codearena.pro",
    siteName: "CodeArena",
    images: [
      {
        url: "/thumbnail.png",
        width: 1200,
        height: 630,
        alt: "CodeArena Preview",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "CodeArena",
    description: "Challenge friends to solve algorithmic problems in real time. Prove your skills, climb the ranks, dominate the arena.",
    images: ["/thumbnail.png"],
  },
  icons: {
    icon: "/logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning >
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>
          <SidebarProvider>
            <AppSidebar />
            <main className="w-full relative">
              <div className="absolute top-4 left-4 z-50 overflow-hidden">
                <SidebarTrigger />
              </div>
              {children}
            </main>
          </SidebarProvider>
          <Toaster position="top-center" richColors />
          <FundingModal />
        </Providers>
      </body>
    </html>
  );
}
