import { Home, Trophy, Code2, User2, ChevronUp, History } from "lucide-react"
import { getServerSession } from "next-auth"
import Link from "next/link"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"

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
} from "@/components/ui/sidebar"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Logo } from "@/components/Logo"
import Image from "next/image"
import { ThemeToggleSidebarItem } from "@/components/theme-toggle-sidebar-item"

const navItems = [
  { title: "Home", url: "/", icon: Home },
  { title: "Leaderboard", url: "/leaderboard", icon: Trophy },
  { title: "My Statistics", url: "/user-stats", icon: Code2 },
  { title: "Battle History", url: "/battle-history", icon: History }
]

export async function AppSidebar() {
  const session = await getServerSession(authOptions)

  // fetch rating from database using getServerSession
  const userRating = session?.user?.rating ?? "Unable to fetch rating"

  return (
    <Sidebar collapsible="icon" className="border-r border-border/40 font-sans z-20">
      {/* Background gradient — subtle in dark, clean in light */}
      <div className="absolute inset-0 bg-linear-to-b from-sidebar via-sidebar to-sidebar pointer-events-none z-0" />
      {/* Radial glow to match Center Panel */}
      <div
        className="pointer-events-none absolute inset-0 z-0 opacity-70 dark:block hidden"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 10%, rgba(34,197,94,0.05) 0%, transparent 60%)",
        }}
      />
      {/* Top accent line */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-linear-to-r from-transparent via-primary/50 to-transparent pointer-events-none z-10" />

      <SidebarHeader className="z-10 relative bg-transparent pt-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent hover:bg-muted/50 transition-colors data-[state=open]:text-sidebar-accent-foreground">
              <div className="flex items-center justify-center rounded-lg text-sidebar-primary-foreground overflow-hidden h-8 w-8 shrink-0">
                <Logo width={24} height={18} />
              </div>
              <div className="flex flex-col justify-center pl-1 group-data-[collapsible=icon]:hidden">
                <div className="flex items-center gap-2">
                  <span className="truncate font-bold text-lg tracking-tight text-foreground">CodeArena</span>
                  <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.8)] shrink-0" />
                </div>
                <span className="text-[10px] text-zinc-500 tracking-wider font-semibold mt-0.1">
                  By-Eleventh_Hour
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="z-10 relative bg-transparent">
        <SidebarGroup>
          {/* <SidebarGroupLabel>Application</SidebarGroupLabel> */}
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <Link href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              <ThemeToggleSidebarItem />
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="z-10 relative bg-transparent pb-4 border-t border-border/40">
        <SidebarMenu>
          {/* RATING PLACEHOLDER (Above avatar) */}
          {session && (
            <SidebarMenuItem className="group-data-[collapsible=icon]:hidden px-2 py-1">
              <div className="text-xs text-muted-foreground font-medium">
                Rating: <span className="text-primary ">{userRating}</span>
              </div>
            </SidebarMenuItem>
          )}

          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarImage src={session?.user?.image || ""} alt={session?.user?.name || ""} />
                    <AvatarFallback className="rounded-lg">
                      <User2 className="size-4" />
                    </AvatarFallback>
                  </Avatar>
                  <span className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">
                      {session?.user?.username || "Guest"}
                    </span>
                    <span className="truncate text-xs">
                      {session?.user?.email || "Not logged in"}
                    </span>
                  </span>
                  <ChevronUp className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side="top"
                className="w-[--radix-popper-anchor-width]"
              >
                {session ? (
                  <>
                    <DropdownMenuLabel className="p-0 font-normal">
                      <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                        <Avatar className="h-8 w-8 rounded-lg">
                          <AvatarImage src={session?.user?.image || ""} alt={session?.user?.name || ""} />
                          <AvatarFallback className="rounded-lg">
                            <User2 className="size-4" />
                          </AvatarFallback>
                        </Avatar>
                        <div className="grid flex-1 text-left text-sm leading-tight">
                          <span className="truncate font-semibold">
                            {session?.user?.name || "Unnamed User"}
                          </span>
                          <span className="truncate text-xs text-muted-foreground">
                            {session?.user?.email || "No email"}
                          </span>
                        </div>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/profile">Profile</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/api/auth/signout">Logout</Link>
                    </DropdownMenuItem>
                  </>
                ) : (
                  <>
                    {/* <DropdownMenuLabel>Account</DropdownMenuLabel> */}
                    {/* <DropdownMenuSeparator /> */}
                    <DropdownMenuItem asChild>
                      <Link href="/api/auth/signin">Login</Link>
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}