"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Bell } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  formatNotificationTime,
  getNotificationHref,
  getNotificationLabel,
  parseNotification,
} from "@/lib/notifications/parse";
import { createClient } from "@/lib/supabase/client";
import type { AppNotification } from "@/lib/types/notification";
import { cn } from "@/lib/utils";

const RECENT_LIMIT = 20;

function formatUnreadCount(count: number) {
  if (count > 99) return "99+";
  return String(count);
}

export function NotificationBell() {
  const pathname = usePathname();
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [highlightedIds, setHighlightedIds] = useState<Set<string>>(new Set());
  const [loadError, setLoadError] = useState<string | null>(null);
  const markAttemptedRef = useRef(false);
  const openRef = useRef(open);
  openRef.current = open;

  const loadNotifications = useCallback(async () => {
    if (openRef.current) return;
    const supabase = createClient();
    const [listResult, countResult] = await Promise.all([
      supabase
        .from("notifications")
        .select(
          "id, recipient_id, event_type, message, related_record_id, read_status, created_at"
        )
        .order("created_at", { ascending: false })
        .limit(RECENT_LIMIT),
      supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("read_status", false),
    ]);

    if (listResult.error) {
      setLoadError(listResult.error.message);
      return;
    }

    setLoadError(null);
    setNotifications(
      (listResult.data ?? []).map((row) =>
        parseNotification(row as Record<string, unknown>)
      )
    );
    setUnreadCount(countResult.count ?? 0);
  }, []);

  const markAsRead = useCallback(async (items: AppNotification[]) => {
    const unreadIds = items
      .filter((notification) => !notification.read_status)
      .map((notification) => notification.id);

    if (unreadIds.length === 0) return;

    setHighlightedIds((current) => {
      const next = new Set(current);
      unreadIds.forEach((id) => next.add(id));
      return next;
    });
    setNotifications((current) =>
      current.map((notification) =>
        notification.read_status
          ? notification
          : { ...notification, read_status: true }
      )
    );
    setUnreadCount(0);

    const supabase = createClient();
    const { error } = await supabase
      .from("notifications")
      .update({ read_status: true })
      .eq("read_status", false);

    if (error) {
      setLoadError(error.message);
      setNotifications((current) =>
        current.map((notification) =>
          unreadIds.includes(notification.id)
            ? { ...notification, read_status: false }
            : notification
        )
      );
      setUnreadCount(unreadIds.length);
    }
  }, []);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications, pathname]);

  useEffect(() => {
    function onFocus() {
      void loadNotifications();
    }

    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [loadNotifications]);

  useEffect(() => {
    if (open) return;
    markAttemptedRef.current = false;
    setHighlightedIds((current) => (current.size === 0 ? current : new Set()));
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const hasUnread = notifications.some((notification) => !notification.read_status);
    if (!hasUnread || markAttemptedRef.current) return;
    markAttemptedRef.current = true;
    void markAsRead(notifications);
  }, [open, notifications, markAsRead]);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function handleToggle() {
    setOpen((current) => !current);
  }

  return (
    <div ref={rootRef} className="relative">
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label={
          unreadCount > 0
            ? `Notifications, ${unreadCount} unread`
            : "Notifications"
        }
        aria-expanded={open}
        aria-controls={menuId}
        onClick={handleToggle}
        className="relative"
      >
        <Bell />
        {unreadCount > 0 ? (
          <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-medium text-destructive-foreground">
            {formatUnreadCount(unreadCount)}
          </span>
        ) : null}
      </Button>
      {open ? (
        <div
          id={menuId}
          role="menu"
          aria-label="Recent notifications"
          className="absolute right-0 z-50 mt-2 w-[min(calc(100vw-2rem),20rem)] overflow-hidden rounded-lg border bg-background shadow-lg"
        >
          <div className="border-b px-3 py-2">
            <p className="text-sm font-medium">Notifications</p>
          </div>
          {loadError ? (
            <p className="px-3 py-4 text-sm text-destructive" role="alert">
              {loadError}
            </p>
          ) : notifications.length === 0 ? (
            <p className="px-3 py-6 text-sm text-muted-foreground">
              No notifications yet.
            </p>
          ) : (
            <ul className="max-h-80 overflow-y-auto">
              {notifications.map((notification) => {
                const unread = highlightedIds.has(notification.id);
                return (
                  <li key={notification.id} className="border-b last:border-b-0">
                    <Link
                      href={getNotificationHref(notification)}
                      role="menuitem"
                      className={cn(
                        "block px-3 py-3 text-left hover:bg-accent",
                        unread && "bg-accent/50"
                      )}
                      onClick={() => setOpen(false)}
                    >
                      <p className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                        <span>{getNotificationLabel(notification.event_type)}</span>
                        <time dateTime={notification.created_at}>
                          {formatNotificationTime(notification.created_at)}
                        </time>
                      </p>
                      <p
                        className={cn(
                          "mt-1 text-sm",
                          unread ? "font-medium" : "text-muted-foreground"
                        )}
                      >
                        {notification.message}
                      </p>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
