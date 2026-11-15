import type { Metadata } from "next";
import "./globals.css";
import { MotionRoot } from "@/components/Motion";
import { THEME_BOOT } from "@/lib/theme";

export const metadata: Metadata = {
  metadataBase: new URL("https://dozzier.co"),
  title: "Dozzier | Secure Document Sharing & Data Rooms with Analytics",
  description: "Share decks, proposals and data rooms as secure links. See who reads every page, get live alerts and send AI follow-ups.",
  icons: { icon: [{ url: "/favicon.svg", type: "image/svg+xml" }, { url: "/favicon.ico", sizes: "48x48" }], apple: "/apple-touch-icon.png" },
  openGraph: { title: "Dozzier | Secure Document Sharing & Data Rooms with Analytics", description: "Share decks, proposals and data rooms as secure links. See who reads every page, get live alerts and send AI follow-ups.", siteName: "Dozzier", url: "https://dozzier.co", type: "website" },
  twitter: { card: "summary", title: "Dozzier | Secure Document Sharing & Data Rooms with Analytics", description: "Share decks, proposals and data rooms as secure links. See who reads every page, get live alerts and send AI follow-ups." },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preload" href="/fonts/Calamantus-Regular.woff" as="font" type="font/woff" crossOrigin="" />
        <link rel="preload" href="/fonts/Calamantus-Medium.woff" as="font" type="font/woff" crossOrigin="" />
        <link rel="preload" href="/fonts/Calamantus-SemiBold.woff" as="font" type="font/woff" crossOrigin="" />
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('motion');" + THEME_BOOT }} />
      </head>
      <body><MotionRoot />{children}</body>
    </html>
  );
}
