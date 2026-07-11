import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { ToastProviderWrapper } from "@/components/providers/ToastProvider";
import { getSiteSettings } from "@/lib/data/site-settings";
import { resolveBranding } from "@/lib/site/branding";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  const { storeName, seoTitle, seoDescription } = resolveBranding(settings);

  return {
    title: {
      default: seoTitle || storeName || "Store",
      template: storeName ? `%s | ${storeName}` : "%s",
    },
    description: seoDescription || undefined,
  };
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen antialiased`}
      >
        <ThemeProvider>
          <QueryProvider>
            <ToastProviderWrapper>{children}</ToastProviderWrapper>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
