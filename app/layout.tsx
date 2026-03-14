import type { Metadata } from "next";
import "./globals.css";
import { MainNav } from "@/components/main-nav";

export const metadata: Metadata = {
  title: "MedFlow AI",
  description: "AI-powered EHR platform with Next.js and Supabase",
};

export const dynamic = "force-dynamic";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <div className="app-shell">
          <MainNav />
          <main className="content-shell">{children}</main>
        </div>
      </body>
    </html>
  );
}
