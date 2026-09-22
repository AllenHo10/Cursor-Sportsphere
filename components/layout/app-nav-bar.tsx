"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";

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

function NavLinks({
  pathname,
  stacked = false,
  onNavigate,
}: {
  pathname: string;
  stacked?: boolean;
  onNavigate?: () => void;
}) {
  return (
    <ul
      className={cn(
        stacked ? "flex flex-col gap-1" : "flex flex-wrap items-center gap-1"
      )}
    >
      {NAV_LINKS.map((link) => {
        const active = isActivePath(pathname, link.href);
        return (
          <li key={link.href}>
            <Link
              href={link.href}
              className={cn(
                "rounded-md text-sm transition-colors",
                stacked ? "block px-3 py-2.5" : "px-2.5 py-1.5",
                active
                  ? "bg-primary font-medium text-primary-foreground"
                  : "text-white/80 hover:bg-white/10 hover:text-white"
              )}
              aria-current={active ? "page" : undefined}
              onClick={onNavigate}
            >
              {link.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function AppNavBar() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[hsl(215_32%_17%)] text-white">
      <div className="mx-auto flex min-h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="border-white/40 bg-transparent text-white hover:bg-white/10 hover:text-white md:hidden"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X /> : <Menu />}
          </Button>
          <Link href="/dashboard" className="shrink-0 text-sm font-semibold text-white">
            SportSphere
          </Link>
          <nav className="hidden md:block" aria-label="Main">
            <NavLinks pathname={pathname} />
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <NotificationBell />
          <form action="/logout" method="post" className="hidden sm:block">
            <Button
              type="submit"
              variant="outline"
              size="sm"
              className="border-white/40 bg-transparent text-white hover:bg-white/10 hover:text-white"
            >
              Log out
            </Button>
          </form>
        </div>
      </div>
      {menuOpen ? (
        <nav
          id="mobile-nav"
          aria-label="Main"
          className="border-t border-white/10 bg-[hsl(215_32%_17%)] px-4 py-3 md:hidden"
        >
          <NavLinks
            pathname={pathname}
            stacked
            onNavigate={() => setMenuOpen(false)}
          />
          <form action="/logout" method="post" className="mt-3 sm:hidden">
            <Button
              type="submit"
              variant="outline"
              className="w-full border-white/40 bg-transparent text-white hover:bg-white/10 hover:text-white"
            >
              Log out
            </Button>
          </form>
        </nav>
      ) : null}
    </header>
  );
}
