import Image from "next/image";
import Link from "next/link";
import { StatusPill } from "@/components/shared/StatusPill";
import type { Shop } from "@/lib/supabase/types";

/**
 * The shop identity card shown on Card Detail — avatar/initials, name,
 * Premium/Founding Vendor badges, rating, About text, Visit Store link.
 * Shared between the 2D and 3D views so they can never drift the way the
 * 3D page previously did (a plain "Sold by {name}" text line, missing
 * everything else this card shows).
 */
export function ShopInfoCard({ shop }: { shop: Shop }) {
  const shopInitials = shop.name
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <div className="rounded-lg border border-border bg-bg p-(--card-pad)">
      <div className="flex items-center gap-3">
        {shop.logo_url ? (
          <Image
            src={shop.logo_url}
            alt={shop.name}
            width={36}
            height={36}
            className="size-9 shrink-0 rounded-full object-cover"
          />
        ) : (
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary-subtle text-caption font-medium text-primary">
            {shopInitials}
          </span>
        )}
        <div className="min-w-0">
          <h2 className="truncate text-h3 font-semibold">{shop.name}</h2>
          <p className="text-caption text-text-secondary">
            ★ {shop.rating} ({shop.review_count}) · {shop.location}
          </p>
        </div>
      </div>
      {(shop.tier === "premium" || shop.is_beta_vendor) && (
        <div className="mt-2 flex flex-wrap gap-1">
          {shop.tier === "premium" && <StatusPill tone="paid">Premium Shop</StatusPill>}
          {shop.is_beta_vendor && <StatusPill tone="attention">Founding Vendor</StatusPill>}
        </div>
      )}

      {shop.description && (
        <div className="mt-3 border-t border-border pt-3">
          <h3 className="text-caption font-medium text-text-secondary">
            About {shop.name}
          </h3>
          <p className="mt-1 text-body text-text-secondary">{shop.description}</p>
        </div>
      )}

      <Link
        href={`/shops/${shop.id}`}
        className="mt-3 flex h-11 items-center justify-center rounded-md border border-primary text-body font-medium text-primary transition-colors duration-(--duration-instant) hover:bg-primary-subtle"
      >
        Visit Store
      </Link>
    </div>
  );
}
