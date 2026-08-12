import {
  Award,
  Star,
  Hash,
  Users,
  Globe,
  Layers,
  Sparkles,
  Calendar,
  Percent,
  type LucideIcon,
} from "lucide-react";
import type { Card, Listing } from "@/lib/supabase/types";

const FIELDS: { label: string; icon: LucideIcon; value: (c: Card, l: Listing) => string | null }[] = [
  { label: "Grading Company", icon: Award, value: (_c, l) => l.grading_company },
  { label: "Card Grade", icon: Star, value: (_c, l) => l.grade },
  { label: "Cert Number", icon: Hash, value: (_c, l) => l.cert_number },
  { label: "Population", icon: Users, value: (_c, l) => (l.population ? String(l.population) : null) },
  { label: "Language", icon: Globe, value: (c) => c.language },
  { label: "Set", icon: Layers, value: (c) => c.set_name },
  { label: "Card Number", icon: Hash, value: (c) => c.card_number },
  { label: "Rarity", icon: Sparkles, value: (c) => c.rarity },
  { label: "Generation", icon: Calendar, value: (c) => c.generation },
  { label: "Approx. Pull Rate", icon: Percent, value: (c) => c.pull_rate },
];

/**
 * "Card Details" — a 3-column icon/label/value grid, replacing the old flat
 * `specs` `<dl>`. Same 10 fields, same null-filtering, new layout.
 */
export function CardDetailsGrid({
  card,
  listing,
  description,
}: {
  card: Card;
  listing: Listing;
  description: string | null;
}) {
  const rows = FIELDS.map((f) => ({ label: f.label, icon: f.icon, value: f.value(card, listing) })).filter(
    (r) => r.value,
  );

  return (
    <section className="mt-6 rounded-lg border border-border bg-bg p-(--card-pad)">
      <h2 className="text-h3 font-semibold">Card Details</h2>
      <p className="mt-2 text-body text-text-secondary">
        {description ?? "No additional description provided by the vendor."}
      </p>

      {rows.length > 0 && (
        <dl className="mt-4 grid grid-cols-1 gap-x-4 gap-y-3 border-t border-border pt-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map(({ label, icon: Icon, value }) => (
            <div key={label} className="flex items-start gap-2">
              <Icon className="mt-0.5 size-4 shrink-0 text-text-secondary" aria-hidden />
              <div className="min-w-0">
                <dt className="text-caption text-text-secondary">{label}</dt>
                <dd className="truncate text-body font-medium">{value}</dd>
              </div>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}
