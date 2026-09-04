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
        <AppNav />
        {children}
      </body>
    </html>
  );
}