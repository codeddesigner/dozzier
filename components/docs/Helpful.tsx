"use client";
import { useState } from "react";
import Link from "next/link";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import { supabase } from "@/lib/supabase";

/** "Was this helpful?" — stores anonymous feedback per article. */
export function Helpful({ slug }: { slug: string }) {
  const [v, setV] = useState<null | boolean>(null);
  async function vote(up: boolean) {
    setV(up);
    await supabase.from("doc_feedback").insert({ slug, helpful: up });
  }
  return (
    <div className="doc-helpful">
      {v === null ? (
        <>
          <span className="medium">Was this helpful?</span>
          <button className="btn btn-outline btn-s" onClick={() => vote(true)}><ThumbsUp size={14} />Yes</button>
          <button className="btn btn-outline btn-s" onClick={() => vote(false)}><ThumbsDown size={14} />No</button>
        </>
      ) : v ? <span className="muted cycle-item">Thanks for letting us know.</span> : <span className="muted cycle-item">Sorry about that — <Link href="/docs/contact" className="link">tell us what was missing</Link>.</span>}
    </div>
  );
}
