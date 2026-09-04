"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { NotificationBell } from "@/components/notifications/notification-bell";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/teams", label: "Teams" },
  { href: "/matches", label: "Matches" },
  { href: "/teams/discover", label: "Discover" },
  { href: "/profile", label: "Profile" },
] as const;

function isActivePath(pathname: string, href: string) {
  if (href === "/teams") {
    return (
      pathname === "/teams" ||
      (pathname.startsWith("/teams/") && !pathname.startsWith("/teams/discover"))
    );
  }

  if (href === "/matches") {
    return pathname === "/matches" || pathname.startsWith("/matches/");
  }

  return pathname === href;
}

export function AppNavBar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b bg-background">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-6">
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          <Link href="/dashboard" className="shrink-0 text-sm font-semibold">
            SportSphere
          </Link>
          <nav aria-label="Main">
            <ul className="flex flex-wrap items-center gap-1">
              {NAV_LINKS.map((link) => {
                const active = isActivePath(pathname, link.href);
                return (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className={cn(
                        "rounded-md px-2.5 py-1.5 text-sm transition-colors hover:bg-accent hover:text-accent-foreground",
                        active
                          ? "font-medium text-foreground"
                          : "text-muted-foreground"
                      )}
                      aria-current={active ? "page" : undefined}
                    >
                      {link.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <NotificationBell />
          <form action="/logout" method="post">
            <Button type="submit" variant="outline" size="sm">
              Log out
            </Button>
          </form>
        </div>
      </div>
    </header>
  );
}
