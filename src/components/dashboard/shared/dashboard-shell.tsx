"use client";

import { AppShell } from "@/components/dashboard/shared/app-shell";

export function DashboardShell({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <AppShell>{children}</AppShell>;
}
