import type { Metadata } from "next";
import "./globals.css";
import { MotionRoot } from "@/components/Motion";
import { THEME_BOOT } from "@/lib/theme";

export const metadata: Metadata = {
  metadataBase: new URL("https://dozzier.co"),
  title: "Dozzier | Cheaper and better than Docsend",
  description: "Secure document sharing with page-by-page analytics, live alerts, data rooms and AI follow-ups.",
  icons: { icon: "/favicon.svg" },
  openGraph: { title: "Dozzier | Cheaper and better than Docsend", siteName: "Dozzier", url: "https://dozzier.co", type: "website" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preload" href="/fonts/Kolosa-Regular.woff" as="font" type="font/woff" crossOrigin="" />
        <link rel="preload" href="/fonts/Kolosa-Medium.woff" as="font" type="font/woff" crossOrigin="" />
        <link rel="preload" href="/fonts/Kolosa-SemiBold.woff" as="font" type="font/woff" crossOrigin="" />
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('motion');" + THEME_BOOT }} />
      </head>
      <body><MotionRoot />{children}</body>
    </html>
  );
}
