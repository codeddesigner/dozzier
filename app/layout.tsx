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
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  );
}
