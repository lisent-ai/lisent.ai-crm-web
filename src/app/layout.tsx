import type { Metadata } from "next";
import "./globals.css";

import { SuperTokensProvider } from "@/components/auth/supertokens-provider";

export const metadata: Metadata = {
  title: "Lisent CRM",
  description: "Tenant-aware CRM web app for Lisent",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <SuperTokensProvider>{children}</SuperTokensProvider>
      </body>
    </html>
  );
}
