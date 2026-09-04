import type { Metadata } from "next";

import { AppNav } from "@/components/layout/app-nav";

import "./globals.css";

export const metadata: Metadata = {
  title: "SportSphere",
  description: "Volleyball team coordination",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:rounded-md focus:border focus:bg-background focus:px-3 focus:py-2 focus:text-sm focus:ring-2 focus:ring-ring"
        >
          Skip to content
        </a>
        <AppNav />
        {children}
      </body>
    </html>
  );
}