import type { Metadata } from "next";
import "./globals.css";
import { MotionRoot } from "@/components/Motion";

export const metadata: Metadata = {
  title: "Dozzier — Share documents. Know what happens next.",
  description: "Secure document sharing with page-by-page analytics, live alerts, data rooms and AI follow-ups.",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preload" href="/fonts/Kolosa-Regular.woff" as="font" type="font/woff" crossOrigin="" />
        <link rel="preload" href="/fonts/Kolosa-Medium.woff" as="font" type="font/woff" crossOrigin="" />
        <link rel="preload" href="/fonts/Kolosa-SemiBold.woff" as="font" type="font/woff" crossOrigin="" />
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('motion')" }} />
      </head>
      <body><MotionRoot />{children}</body>
    </html>
  );
}
