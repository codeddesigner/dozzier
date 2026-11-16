"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search } from "lucide-react";
import { Logo } from "@/components/Logo";
import { DocsSearchDialog, openDocsSearch } from "@/components/docs/DocsSearch";

export function DocsHeader() {
  const path = usePathname();
  const tab = path.startsWith("/docs/api") ? "api" : path.startsWith("/docs/changelog") ? "changelog" : path.startsWith("/docs/contact") ? "status" : "guides";
  return (
    <>
      <header className="docs-head">
        <Link href="/docs" className="row gap-12" aria-label="Dozzier docs home"><Logo height={28} /><span className="docs-pill">Docs</span></Link>
        <nav className="docs-nav">
          <Link href="/docs" className={tab === "guides" ? "on" : ""}>Guides</Link>
          <Link href="/docs/api" className={tab === "api" ? "on" : ""}>Zapier &amp; MCP</Link>
          <Link href="/docs/changelog" className={tab === "changelog" ? "on" : ""}>Changelog</Link>
          <Link href="/docs/contact#status" className={tab === "status" ? "on" : ""}>Status</Link>
        </nav>
        <span className="spacer" />
        <button className="docs-search-btn" onClick={() => openDocsSearch()}><Search size={16} /><span className="grow">Search docs… ⌘K</span></button>
        <Link href="/docs/contact" className="medium hide-sm">Contact support</Link>
        <Link href="/app" className="btn btn-primary">Go to app</Link>
      </header>
      <DocsSearchDialog />
    </>
  );
}
