"use client";
import { supabase, Contact } from "@/lib/supabase";
import { useLoad } from "@/components/ui";
import type { IPage, IQuestion, IVisit } from "@/lib/insights";

export type CData = { contact: Contact & { accounts: { id: string; name: string } | null; notes?: string | null }; visits: IVisit[]; pages: IPage[]; questions: IQuestion[]; forwards: string[] };

/** Loads everything the visitor deep-dive and follow-up screens need. */
export function useContact(id: string) {
  return useLoad<CData>(async () => {
    const c = await supabase.from("contacts").select("*, accounts(id,name)").eq("id", id).single();
    if (c.error) throw c.error;
    const v = await supabase.from("visits").select("id,document_id,link_id,duration_seconds,downloaded,pages_viewed,location,started_at,user_agent,documents(name,file_type,page_count),links(name)").eq("contact_id", id).order("started_at", { ascending: false });
    const visits = (v.data || []) as unknown as IVisit[];
    const ids = visits.map((x) => x.id);
    const linkIds = [...new Set(visits.map((x) => x.link_id).filter(Boolean))] as string[];
    const firstAt = visits.length ? visits[visits.length - 1].started_at : null;
    const [pv, q, others] = await Promise.all([
      ids.length ? supabase.from("page_views").select("visit_id,document_id,page_number,seconds").in("visit_id", ids) : Promise.resolve({ data: [] }),
      supabase.from("doc_questions").select("id,body,page_number,answer,created_at,document_id").eq("contact_id", id).order("created_at", { ascending: false }),
      linkIds.length && firstAt ? supabase.from("visits").select("visitor_email").in("link_id", linkIds).gt("started_at", firstAt).neq("visitor_email", c.data.email) : Promise.resolve({ data: [] }),
    ]);
    const forwards = [...new Set(((others.data || []) as { visitor_email: string | null }[]).map((o) => o.visitor_email).filter(Boolean))] as string[];
    return { contact: c.data as CData["contact"], visits, pages: (pv.data || []) as IPage[], questions: (q.data || []) as IQuestion[], forwards };
  }, [id]);
}
