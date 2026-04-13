import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "../globals.css";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin-sidebar";
import { Toaster } from "@/components/ui/sonner";
import Providers from "../(main)/providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Admin Panel | CodeArena",
  description: "CodeArena Administration Panel",
  metadataBase: new URL("https://codearena.pro"),
  openGraph: {
    title: "Admin Panel | CodeArena",
    description: "CodeArena Administration Panel",
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
    title: "Admin Panel | CodeArena",
    description: "CodeArena Administration Panel",
    images: ["/thumbnail.png"],
  },
};

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>
          <SidebarProvider>
            <AdminSidebar />
            <SidebarInset>
              <header className="flex h-14 shrink-0 items-center gap-3 border-b px-4 md:hidden">
                <SidebarTrigger />
                <span className="font-semibold">CodeArena Admin</span>
              </header>
              <main className="w-full flex-1">
                {children}
              </main>
            </SidebarInset>
          </SidebarProvider>
          <Toaster position="top-center" richColors />
        </Providers>
      </body>
    </html>
  );
}
