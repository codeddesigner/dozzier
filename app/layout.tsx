import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dozzier — Share documents. Know what happens next.",
  description: "Secure document sharing with page-by-page analytics, live alerts, data rooms and AI follow-ups.",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preload" href="/fonts/CorlletED-Pro-Regular.woff2" as="font" type="font/woff2" crossOrigin="" />
        <link rel="preload" href="/fonts/CorlletED-Pro-Medium.woff2" as="font" type="font/woff2" crossOrigin="" />
        <link rel="preload" href="/fonts/CorlletED-Pro-SemiBold.woff2" as="font" type="font/woff2" crossOrigin="" />
      </head>
      <body>{children}</body>
    </html>
  );
}
