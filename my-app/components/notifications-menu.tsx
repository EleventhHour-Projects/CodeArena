"use client";

import { useEffect, useState, useRef } from "react";
import { Bell } from "lucide-react";
import { Notification } from "@/types/NotificationType";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDistanceToNow } from "date-fns";

export function NotificationsMenu() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  
  const unreadCount = notifications.filter(n => !n.isRead).length;

  useEffect(() => {
    fetchNotifications();
    // Optional: poll every minute
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setNotifications(data.notifications || []);
        }
      }
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      if (unreadCount === 0) return;
      
      const res = await fetch("/api/notifications", {
        method: "PATCH",
      });
      
      if (res.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      }
    } catch (error) {
      console.error("Failed to mark notifications as read:", error);
    }
  };

  const clearAllNotifications = async () => {
    try {
      const res = await fetch("/api/notifications", {
        method: "DELETE",
      });
      
      if (res.ok) {
        setNotifications([]);
      }
    } catch (error) {
      console.error("Failed to clear notifications:", error);
    }
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={(open: boolean) => {
      setIsOpen(open);
      if (open && unreadCount > 0) {
        markAllAsRead();
      }
    }}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative group hover:bg-muted/50 transition-colors">
          <Bell className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0 border-border/40 shadow-xl" sideOffset={10}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/40 bg-muted/20">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-sm">Notifications</h4>
            {unreadCount > 0 && (
              <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full font-medium">
                {unreadCount} new
              </span>
            )}
          </div>
          {notifications.length > 0 && (
            <Button variant="ghost" size="sm" className="h-auto p-1 text-xs text-muted-foreground hover:text-foreground" onClick={clearAllNotifications}>
              Clear
            </Button>
          )}
        </div>
        <div className="max-h-[300px] overflow-y-auto w-full">
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
              <Bell className="w-8 h-8 text-muted-foreground/30 opacity-50" />
              <p>No notifications yet</p>
            </div>
          ) : (
            <div className="flex flex-col">
              {notifications.map((n, i) => (
                <div key={n._id.toString()} className={`p-4 border-b border-border/40 hover:bg-muted/30 transition-colors ${!n.isRead ? 'bg-primary/5' : ''}`}>
                  <p className="text-sm font-medium leading-relaxed break-words">{n.message}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
