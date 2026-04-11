"use client";

import React from "react";

import {
  LayoutDashboard,
  PlusCircle,
  Code2,
  Flag,
  GitPullRequest,
  Bell,
  LogOut,
  ChevronUp,
  Shield,
  User2,
  Terminal,
  Film,
  Award,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Logo } from "@/components/Logo";

// Docker SVG wrapper — matches lucide icon sizing, auto-inverts for dark/light
function DockerIcon({ className }: { className?: string }) {
  return (
    <span className={`inline-flex items-center justify-center ${className ?? ""}`}>
      <Image
        src="/admin-icons/docker.svg"
        alt="Docker"
        width={26}
        height={26}
        // SVG fill is white; invert in light mode so it reads as dark text,
        // leave as-is in dark mode so it stays visible on dark backgrounds.
        className="invert dark:invert-0 opacity-80"
      />
    </span>
  );
}

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const adminNavItems = [
  { title: "Dashboard", url: "/admin", icon: LayoutDashboard, imgIcon: null },
  { title: "Add Problem", url: "/admin/add", icon: PlusCircle, imgIcon: null },
  { title: "Test Problem", url: "/admin/testproblem", icon: Code2, imgIcon: null },
  { title: "Reports", url: "/admin/reports", icon: Flag, imgIcon: null },
  { title: "Pull Requests", url: "/admin/prs", icon: GitPullRequest, imgIcon: null },
  { title: "Notifications", url: "/admin/notifications", icon: Bell, imgIcon: null },
  { title: "Cluster", url: "/admin/cluster", icon: null, imgIcon: "docker" },
  { title: "Console", url: "/admin/console", icon: Terminal, imgIcon: null },
  { title: "Replays", url: "/admin/replays", icon: Film, imgIcon: null },
  { title: "Rating", url: "/admin/rating", icon: Award, imgIcon: null },
];

export function AdminSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const [adminUser, setAdminUser] = React.useState<{ username: string; image?: string } | null>(null);

  React.useEffect(() => {
    const fetchAdmin = async () => {
      try {
        const response = await fetch("/api/admin/me");
        if (response.ok) {
          const data = await response.json();
          setAdminUser(data);
        }
      } catch (error) {
        console.error("Failed to fetch admin info", error);
      }
    };
    fetchAdmin();
  }, []);

  const handleLogout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-border/40 font-sans z-20">
      {/* Subtle gradient background */}
      <div className="absolute inset-0 bg-linear-to-b from-sidebar via-sidebar to-sidebar pointer-events-none z-0" />
      {/* Radial glow — dark mode only */}
      <div
        className="pointer-events-none absolute inset-0 z-0 opacity-70 dark:block hidden"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 10%, rgba(99,102,241,0.06) 0%, transparent 60%)",
        }}
      />
      {/* Top accent line */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-linear-to-r from-transparent via-indigo-500/50 to-transparent pointer-events-none z-10" />

      {/* ── HEADER ── */}
      <SidebarHeader className="z-10 relative bg-transparent pt-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent hover:bg-muted/50 transition-colors data-[state=open]:text-sidebar-accent-foreground"
            >
              <div className="flex items-center justify-center rounded-lg text-sidebar-primary-foreground overflow-hidden h-8 w-8 shrink-0">
                <Logo width={24} height={18} />
              </div>
              <div className="flex flex-col justify-center pl-1 group-data-[collapsible=icon]:hidden">
                <div className="flex items-center gap-2">
                  <span className="truncate font-bold text-lg tracking-tight text-foreground">
                    CodeArena
                  </span>

                </div>
                <span className="text-[10px] text-zinc-500 tracking-wider font-semibold mt-0.1">
                  Control Center
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {/* ── NAV ── */}
      <SidebarContent className="z-10 relative bg-transparent">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {adminNavItems.map((item) => {
                const isActive =
                  item.url === "/admin"
                    ? pathname === "/admin"
                    : pathname.startsWith(item.url);

                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      tooltip={item.title}
                      isActive={isActive}
                    >
                      <Link href={item.url}>
                        {item.imgIcon === "docker"
                          ? <DockerIcon />
                          : item.icon ? <item.icon /> : null
                        }
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* ── FOOTER ── */}
      <SidebarFooter className="z-10 relative bg-transparent pb-4 border-t border-border/40">
        <SidebarMenu>
          {/* Admin badge */}
          <SidebarMenuItem className="group-data-[collapsible=icon]:hidden px-2 py-1 flex items-center gap-2">
            <Shield className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
            <span className="text-xs text-muted-foreground font-medium">
              Administrator
            </span>
          </SidebarMenuItem>

          {/* User / logout dropdown */}
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <Avatar className="h-8 w-8 rounded-lg">
                    {adminUser?.image ? (
                      <img src={adminUser.image} alt="Profile" className="h-full w-full object-cover rounded-lg" />
                    ) : (
                      <AvatarFallback className="rounded-lg bg-indigo-500/20 text-indigo-400">
                        <Shield className="size-4" />
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <span className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">{adminUser?.username || "Admin"}</span>
                    <span className="truncate text-xs text-muted-foreground">
                      Control Center
                    </span>
                  </span>
                  <ChevronUp className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" className="w-[--radix-popper-anchor-width]">
                <DropdownMenuLabel className="p-0 font-normal">
                  <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                    <Avatar className="h-8 w-8 rounded-lg">
                      {adminUser?.image ? (
                        <img src={adminUser.image} alt="Profile" className="h-full w-full object-cover rounded-lg" />
                      ) : (
                        <AvatarFallback className="rounded-lg bg-indigo-500/20 text-indigo-400">
                          <Shield className="size-4" />
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold">{adminUser?.username || "Administrator"}</span>
                      <span className="truncate text-xs text-muted-foreground">
                        CodeArena Admin
                      </span>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/admin/profile" className="cursor-pointer">
                    <Shield className="h-4 w-4 mr-2" />
                    Admin Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/">← Back to App</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="text-rose-500 focus:text-rose-500 focus:bg-rose-500/10 cursor-pointer"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
