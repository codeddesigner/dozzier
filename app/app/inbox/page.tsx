"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Activity is a popup now; old /app/inbox links open it over the dashboard. */
export default function Inbox() {
  const router = useRouter();
  useEffect(() => { router.replace("/app?activity=1"); }, [router]);
  return null;
}
