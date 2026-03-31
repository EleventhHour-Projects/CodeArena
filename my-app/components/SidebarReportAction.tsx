"use client";

import React, { useState } from "react";
import { SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { BugIcon } from "lucide-react";
import { ReportModal } from "@/components/modals/ReportModal";

export function SidebarReportAction() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <SidebarMenuItem>
        <SidebarMenuButton
          tooltip="Report an Issue"
          onClick={() => setIsOpen(true)}
          className="cursor-pointer"
        >
          <BugIcon className="w-4 h-4" />
          <span>Report a Bug</span>
        </SidebarMenuButton>
      </SidebarMenuItem>

      <ReportModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        mode="global"
      />
    </>
  );
}
