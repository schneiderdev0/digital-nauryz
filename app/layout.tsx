import type { Metadata, Viewport } from "next";
import Script from "next/script";

import "@/app/globals.css";
import { TelegramAuthBootstrap } from "@/components/telegram-auth-bootstrap";
import { getAuthState } from "@/lib/auth/server";
import { env } from "@/lib/env";
import { getAppMetadata, getRequestLocale } from "@/lib/locale";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const meta = getAppMetadata(locale);

  return {
    title: meta.title,
    description: meta.description,
    manifest: "/manifest.webmanifest",
    appleWebApp: {
      capable: true,
      statusBarStyle: "default",
      title: meta.title
    }
  };
}

export const viewport: Viewport = {
  themeColor: "#f4d17a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false
};

export default async function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  const authState = await getAuthState();
  const locale = await getRequestLocale();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body suppressHydrationWarning>
        <Script
          src="https://telegram.org/js/telegram-web-app.js"
          strategy="beforeInteractive"
        />
        <TelegramAuthBootstrap
          initialIsAuthenticated={Boolean(authState.profile)}
          hasSupabase={env.hasSupabase}
          telegramDebug={env.telegramDebug}
          telegramBotName={env.telegramBotName}
        />
        {children}
      </body>
    </html>
  );
}
