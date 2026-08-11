import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth";
import { VendorShell } from "@/components/vendor/VendorShell";
import { StatusPill } from "@/components/shared/StatusPill";
import { php } from "@/lib/utils";
import { toneFor } from "@/app/trade/page";

/**
 * Vendor Trade Requests — incoming proposals against this shop.
 * Click-through goes to the same shared /trade/[tradeId] page, vendor view.
 */
export const dynamic = "force-dynamic";

export default async function TradeRequestsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/vendor/trade-requests");
  if (!user.shopId) redirect("/vendor/onboarding");

  const supabase = await createClient();
  const { data: trades } = await supabase
    .from("trades")
    .select("*, profiles!trades_proposer_id_fkey(display_name)")
    .eq("shop_id", user.shopId)
    .order("created_at", { ascending: false });

  const fresh = (trades ?? []).filter((t) => t.status === "proposed");

  return (
    <VendorShell shopName={user.shopName ?? "Your shop"}>
      <header className="flex flex-wrap items-center gap-3">
        <h1 className="text-display font-bold">Trade Requests</h1>
        {fresh.length > 0 && (
          <span className="rounded-full bg-attention-bg px-2.5 py-0.5 text-caption font-medium text-attention tabular">
            {fresh.length} new
          </span>
        )}
      </header>

      {(trades?.length ?? 0) === 0 ? (
        <p className="mt-6 rounded-lg border border-border bg-bg px-6 py-12 text-center text-body text-text-secondary">
          No trade requests yet. They&apos;ll appear here when a buyer proposes
          a trade against one of your listings.
        </p>
      ) : (
        <ul className="mt-6 flex flex-col gap-2">
          {trades!.map((t) => (
            <li key={t.id}>
              <Link
                href={`/trade/${t.id}`}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-bg p-4 transition-colors duration-(--duration-instant) hover:bg-bg-muted"
              >
                <div className="min-w-0">
                  <p className="truncate text-body font-medium">
                    {t.profiles?.display_name ?? "A collector"} wants to trade
                  </p>
                  <p className="text-caption text-text-secondary">
                    {new Date(t.created_at).toLocaleString("en-PH", {
                      month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
                    })}
                    {Number(t.value_difference) > 0 && (
                      <> · difference <span className="tabular">{php(Number(t.value_difference))}</span></>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {t.status === "proposed" && (
                    <span className="rounded-full bg-primary px-2 py-0.5 text-caption font-medium text-white">
                      New
                    </span>
                  )}
                  <StatusPill tone={toneFor(t.status)}>
                    {t.status.replace(/_/g, " ")}
                  </StatusPill>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </VendorShell>
  );
}
