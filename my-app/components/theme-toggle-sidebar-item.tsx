"use client"

import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar"

export function ThemeToggleSidebarItem() {
  const { setTheme, resolvedTheme } = useTheme()

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
        tooltip="Toggle Theme"
      >
        <Sun className="size-4 hidden dark:block" />
        <Moon className="size-4 block dark:hidden" />
        <span>Toggle Theme</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}
