import type { Metadata } from "next";
import { DocsHeader } from "@/components/docs/DocsHeader";

export const metadata: Metadata = { title: "Dozzier Docs — Guides, API reference and changelog", description: "Guides, answers and API docs for sharing securely with Dozzier." };

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="docs">
      <DocsHeader />
      {children}
    </div>
  );
}
