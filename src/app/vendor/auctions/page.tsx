import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth";
import { VendorShell } from "@/components/vendor/VendorShell";
import { StatusPill } from "@/components/shared/StatusPill";
import { Countdown } from "@/components/auction/Countdown";
import { php } from "@/lib/utils";

export const dynamic = "force-dynamic";

/**
 * Cancel is enabled only while bid_count = 0. Once someone has bid, the vendor
 * cannot pull the auction — a fairness rule from the spec, not a technical
 * constraint. Re-checked here rather than trusted from the hidden field.
 */
async function cancelAuction(formData: FormData) {
  "use server";
  const user = await getSessionUser();
  if (!user?.shopId) redirect("/vendor/onboarding");

  const id = String(formData.get("id"));
  const supabase = await createClient();

  const { data: a } = await supabase
    .from("auctions")
    .select("bid_count, listings(shop_id)")
    .eq("id", id)
    .maybeSingle();

  const shopId = (a?.listings as unknown as { shop_id: string } | null)?.shop_id;
  if (!a || shopId !== user.shopId) throw new Error("Not your auction");
  if (a.bid_count > 0) throw new Error("Bidding has started — this auction can no longer be cancelled");

  await supabase.from("auctions").update({ status: "cancelled" }).eq("id", id);
  revalidatePath("/vendor/auctions");
}

export default async function VendorAuctionsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const sp = await searchParams;
  const tab = sp.tab === "ended" ? "ended" : "active";

  const user = await getSessionUser();
  if (!user) redirect("/login?next=/vendor/auctions");
  if (!user.shopId) redirect("/vendor/onboarding");

  const supabase = await createClient();
  const { data: listings } = await supabase
    .from("listings")
    .select("id")
    .eq("shop_id", user.shopId);
  const ids = (listings ?? []).map((l) => l.id);

  const { data } = ids.length
    ? await supabase
        .from("auctions")
        .select("*, listings(description, cards(name))")
        .in("listing_id", ids)
        .in(
          "status",
          tab === "active"
            ? ["scheduled", "live"]
            : ["ended_sold", "ended_unsold", "cancelled"],
        )
        .order("end_time", { ascending: true })
    : { data: [] };

  const rows = data ?? [];

  return (
    <VendorShell shopName={user.shopName ?? "Your shop"}>
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-display font-bold">Auctions</h1>
        <Link
          href="/vendor/auctions/create"
          className="flex h-11 items-center rounded-md bg-primary px-4 text-body font-medium text-white active:scale-[0.98]"
        >
          Create Auction
        </Link>
      </header>

      <div className="mt-4 flex gap-1">
        {[
          ["active", "Active"],
          ["ended", "Ended"],
        ].map(([v, label]) => (
          <Link
            key={v}
            href={`/vendor/auctions?tab=${v}`}
            className={`flex h-11 items-center rounded-md px-4 text-body font-medium ${
              tab === v
                ? "bg-primary-subtle text-primary-on-subtle"
                : "border border-border bg-bg text-text-secondary"
            }`}
          >
            {label}
          </Link>
        ))}
      </div>

      {rows.length === 0 ? (
        <p className="mt-6 rounded-lg border border-border bg-bg px-6 py-12 text-center text-body text-text-secondary">
          Nothing here yet.
        </p>
      ) : (
        <ul className="mt-6 flex flex-col gap-2">
          {rows.map((a) => {
            const l = a.listings as unknown as {
              description: string | null;
              cards: { name: string } | null;
            };
            const title = l?.cards?.name ?? l?.description?.split("\n")[0] ?? "Auction";
            return (
              <li
                key={a.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-bg p-4"
              >
                <div className="min-w-0">
                  <Link href={`/auctions/${a.id}`} className="truncate text-body font-medium hover:text-primary">
                    {title}
                  </Link>
                  <p className="text-caption text-text-secondary">
                    {php(Number(a.current_bid ?? a.starting_bid))} ·{" "}
                    <span className="tabular">{a.bid_count}</span> bids ·{" "}
                    <span className="tabular">{a.watcher_count}</span> watching
                    {tab === "active" && (
                      <>
                        {" · "}
                        <Countdown endsAt={a.end_time} />
                      </>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusPill
                    tone={
                      a.status === "ended_sold"
                        ? "success"
                        : a.status === "live"
                          ? "info"
                          : a.status === "cancelled"
                            ? "danger"
                            : "attention"
                    }
                  >
                    {a.status.replace(/_/g, " ")}
                  </StatusPill>
                  {tab === "active" && (
                    <form action={cancelAuction}>
                      <input type="hidden" name="id" value={a.id} />
                      <button
                        disabled={a.bid_count > 0}
                        title={
                          a.bid_count > 0
                            ? "Bidding has started — this auction can no longer be cancelled"
                            : undefined
                        }
                        className="h-11 rounded-md border border-border px-3 text-body text-danger disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Cancel
                      </button>
                    </form>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </VendorShell>
  );
}
