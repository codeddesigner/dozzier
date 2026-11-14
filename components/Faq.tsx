"use client";
import { useState } from "react";
import { ChevronDown } from "lucide-react";

const FAQS = [
  ["How is Dozzier different from DocSend?", "You get the same secure links and analytics, plus live alerts, page-pinned Q&A, AI follow-ups, version compare and a deal pipeline — at a lower price."],
  ["Can I move my existing links over?", "Yes. Upload the same files and create links in bulk — your old links keep working until you switch them off, and you can import contacts from your CRM."],
  ["Do viewers need an account?", "No. Viewers open your link in any browser. Depending on your link settings they may be asked for their email, a passcode or to accept an NDA first."],
  ["Is there a free plan?", "Every plan starts with a free 14-day trial, no credit card required. After that, Personal starts at $5 per user per month."],
  ["Can I use my own domain and branding?", "Standard and Data Rooms plans include custom branding, and you can serve links from your own domain such as docs.yourcompany.com."],
];

export function Faq() {
  const [open, setOpen] = useState(0);
  return (
    <div style={{ maxWidth: 800, margin: "0 auto" }}>
      {FAQS.map(([q, a], i) => (
        <div className="faq-item" key={q}>
          <button className="faq-q" aria-expanded={open === i} onClick={() => setOpen(open === i ? -1 : i)}>
            <span className="grow">{q}</span>
            <ChevronDown size={20} />
          </button>
          <div className={`faq-a ${open === i ? "open" : ""}`}><div><p className="body-m muted" style={{ paddingTop: 10 }}>{a}</p></div></div>
        </div>
      ))}
    </div>
  );
}
