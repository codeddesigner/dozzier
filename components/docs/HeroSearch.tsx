"use client";
import { Search } from "lucide-react";
import { openDocsSearch } from "@/components/docs/DocsSearch";

export function HeroSearch() {
  return (
    <button className="docs-hero-search h-in" style={{ animationDelay: ".35s" }} onClick={() => openDocsSearch()}>
      <Search size={18} /><span className="grow">Ask a question or search, e.g. “how do I require an NDA?”</span><span className="kbd">⌘K</span>
    </button>
  );
}
