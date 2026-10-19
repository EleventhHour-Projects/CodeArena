"use client";

import React from "react";
import { SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { Heart } from "lucide-react";
import { openFundingModal } from "@/components/modals/FundingModal";

export function SidebarFundingAction() {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        tooltip="Support & Fund CodeArena ($5/mo)"
        onClick={() => openFundingModal()}
        className="cursor-pointer text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 transition-colors group"
      >
        <Heart className="w-4 h-4 text-emerald-400 group-hover:scale-110 fill-emerald-500/20 transition-transform" />
        <span className="font-medium">Fund Us</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}
