import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth";
import { VendorShell } from "@/components/vendor/VendorShell";

/**
 * Create Auction.
 *
 * DEVIATION FROM SPEC, recorded rather than hidden: the Phase 4 spec says this
 * "extends the existing Add Listing wizard" — but that wizard is Phase 2 and
 * isn't built. So this is a standalone form covering the same fields, shaped so
 * the wizard can absorb it later as its Sale Type branch.
 *
 * Item category drives the shape: 'card' uses the catalog lookup, everything
 * else takes a free-text name, which is exactly why listings.card_id had to
 * become nullable.
 */
export const dynamic = "force-dynamic";

async function createAuction(formData: FormData) {
  "use server";
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/vendor/auctions/create");
  if (!user.shopId) redirect("/vendor/onboarding");

  const supabase = await createClient();

  const category = String(formData.get("category") ?? "card");
  const cardId = String(formData.get("cardId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();

  const startingBid = Number(formData.get("startingBid"));
  const increment = Number(formData.get("increment"));
  const reserve = formData.get("reserve") ? Number(formData.get("reserve")) : null;
  const bin = formData.get("bin") ? Number(formData.get("bin")) : null;
  const startTime = String(formData.get("startTime"));
  const endTime = String(formData.get("endTime"));

  // Validation the spec calls for, enforced before anything is written.
  if (new Date(endTime) <= new Date(startTime)) throw new Error("End time must be after start time");
  if (reserve != null && reserve < startingBid) throw new Error("Reserve must be at least the starting bid");
  if (bin != null && reserve != null && bin <= reserve) throw new Error("Buy It Now must exceed the reserve");

  const { data: listing, error: lErr } = await supabase
    .from("listings")
    .insert({
      shop_id: user.shopId,
      card_id: category === "card" && cardId ? cardId : null,
      listing_type: "non_graded",
      price: startingBid,
      quantity: 1,
      description: category === "card" ? description : `${name}\n${description}`,
      status: "active",
      sale_type: "auction",
      item_category: category,
    })
    .select("id")
    .single();
  if (lErr) throw new Error(lErr.message);

  const { data: auction, error: aErr } = await supabase
    .from("auctions")
    .insert({
      listing_id: listing.id,
      starting_bid: startingBid,
      bid_increment: increment,
      reserve_price: reserve,
      buy_it_now_price: bin,
      start_time: new Date(startTime).toISOString(),
      end_time: new Date(endTime).toISOString(),
      status: new Date(startTime) <= new Date() ? "live" : "scheduled",
    })
    .select("id")
    .single();
  if (aErr) throw new Error(aErr.message);

  redirect(`/auctions/${auction.id}`);
}

export default async function CreateAuctionPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/vendor/auctions/create");
  if (!user.shopId) redirect("/vendor/onboarding");

  const supabase = await createClient();
  const { data: cards } = await supabase
    .from("cards")
    .select("id, name, set_name")
    .order("name")
    .limit(50);

  const now = new Date();
  const inAnHour = new Date(now.getTime() + 60 * 60 * 1000);
  const iso = (d: Date) => d.toISOString().slice(0, 16);

  if (user.billingStatus === "restricted") {
    return (
      <VendorShell shopName={user.shopName ?? "Your shop"}>
        <RestrictedNotice />
      </VendorShell>
    );
  }

  return (
    <VendorShell shopName={user.shopName ?? "Your shop"}>
      <h1 className="text-display font-bold">Create Auction</h1>
      <p className="mt-1 text-body text-text-secondary">
        Rare cards, sealed product, or signed items.
      </p>

      <form action={createAuction} className="mt-6 flex max-w-[640px] flex-col gap-4">
        <Field label="Item category" htmlFor="category">
          <select id="category" name="category" className="h-11 w-full rounded-md border border-border bg-bg px-3 text-body">
            <option value="card">Card</option>
            <option value="sealed_pack">Sealed Pack</option>
            <option value="sealed_box">Sealed Box</option>
            <option value="merch">Merch</option>
            <option value="signed_item">Signed Item</option>
          </select>
        </Field>

        <Field label="Catalog card (for Card category)" htmlFor="cardId">
          <select id="cardId" name="cardId" className="h-11 w-full rounded-md border border-border bg-bg px-3 text-body">
            <option value="">— none —</option>
            {(cards ?? []).map((c) => (
              <option key={c.id} value={c.id}>{c.name} — {c.set_name}</option>
            ))}
          </select>
        </Field>

        <Field label="Item name (non-card categories)" htmlFor="name">
          <input id="name" name="name" placeholder="e.g. Scarlet & Violet Booster Box" className="h-11 w-full rounded-md border border-border px-3 text-body" />
        </Field>

        <Field label="Description" htmlFor="description">
          <textarea id="description" name="description" rows={3} className="w-full rounded-md border border-border p-3 text-body" />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Starting bid ₱" htmlFor="startingBid">
            <input id="startingBid" name="startingBid" type="number" min="1" required defaultValue={1000} className="h-11 w-full rounded-md border border-border px-3 text-body tabular" />
          </Field>
          <Field label="Bid increment ₱" htmlFor="increment">
            <input id="increment" name="increment" type="number" min="1" required defaultValue={100} className="h-11 w-full rounded-md border border-border px-3 text-body tabular" />
          </Field>
          <Field label="Reserve price ₱ (optional)" htmlFor="reserve">
            <input id="reserve" name="reserve" type="number" min="0" className="h-11 w-full rounded-md border border-border px-3 text-body tabular" />
          </Field>
          <Field label="Buy It Now ₱ (optional)" htmlFor="bin">
            <input id="bin" name="bin" type="number" min="0" className="h-11 w-full rounded-md border border-border px-3 text-body tabular" />
          </Field>
          <Field label="Start time" htmlFor="startTime">
            <input id="startTime" name="startTime" type="datetime-local" required defaultValue={iso(now)} className="h-11 w-full rounded-md border border-border px-3 text-body" />
          </Field>
          <Field label="End time" htmlFor="endTime">
            <input id="endTime" name="endTime" type="datetime-local" required defaultValue={iso(inAnHour)} className="h-11 w-full rounded-md border border-border px-3 text-body" />
          </Field>
        </div>

        <button className="h-11 rounded-md bg-primary text-body font-medium text-white active:scale-[0.98]">
          Publish auction
        </button>
      </form>
    </VendorShell>
  );
}

function Field({
  label, htmlFor, children,
}: {
  label: string; htmlFor: string; children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-body font-medium">{label}</label>
      {children}
    </div>
  );
}

/**
 * A restricted shop (unpaid invoice past grace) cannot create new listings or
 * auctions. Existing live ones stay visible to buyers — the spec is explicit
 * that a vendor's unpaid bill must not punish buyers mid-purchase.
 */
function RestrictedNotice() {
  return (
    <div className="rounded-lg border border-danger-bg bg-danger-bg p-(--card-pad)">
      <h2 className="text-h3 font-semibold text-danger">Account restricted</h2>
      <p className="mt-1 text-body text-danger">
        Your account is restricted due to an unpaid invoice. Settle it to resume
        creating listings — your existing listings remain live for buyers.
      </p>
      <a href="/vendor/billing" className="mt-3 inline-flex h-11 items-center rounded-md bg-danger px-4 text-body font-medium text-white">
        Go to Billing
      </a>
    </div>
  );
}
