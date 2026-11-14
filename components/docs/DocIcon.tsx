import { Sparkles, Link2, BarChart3, HousePlus, Signature, FileInput, Plug, CreditCard, History } from "lucide-react";

const MAP = { sparkles: Sparkles, link: Link2, chart: BarChart3, space: HousePlus, signature: Signature, file: FileInput, plug: Plug, card: CreditCard, history: History };

export function DocIcon({ name, size = 18 }: { name: string; size?: number }) {
  const I = MAP[name as keyof typeof MAP] || Sparkles;
  return <I size={size} />;
}
