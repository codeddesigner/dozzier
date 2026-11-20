"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Shared with me now lives in the Content library. */
export default function Shared() {
  const router = useRouter();
  useEffect(() => { router.replace("/app/content?view=shared"); }, [router]);
  return null;
}
