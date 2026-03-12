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
import logo from "@/public/logo.svg"
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
  const userRating = session?.user?.rating || "Unable to fetch rating" 

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground">
              <span className="flex aspect-square size-8 items-center justify-center rounded-lg  bg-black text-sidebar-primary-foreground">
                <Image src={logo} alt="Logo" width={42} height={42} />
              </span>
              <span className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold text-lg">CodeArena</span>
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      
      <SidebarContent>
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

      <SidebarFooter>
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