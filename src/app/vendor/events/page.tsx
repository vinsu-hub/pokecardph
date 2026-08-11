import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth";
import { VendorShell } from "@/components/vendor/VendorShell";
import { StatusPill } from "@/components/shared/StatusPill";

export const dynamic = "force-dynamic";

const TONE = {
  scheduled: "attention",
  live: "info",
  closed: "neutral",
  winner_selected: "success",
  fulfilled: "success",
  cancelled: "danger",
} as const;

/** Cancel is only available before the event goes live — once people have
 *  started guessing, pulling it would be unfair to them. */
async function cancelEvent(formData: FormData) {
  "use server";
  const user = await getSessionUser();
  if (!user?.shopId) redirect("/vendor/onboarding");

  const id = String(formData.get("id"));
  const supabase = await createClient();
  const { data: e } = await supabase
    .from("pokemon_events")
    .select("status, shop_id")
    .eq("id", id)
    .maybeSingle();

  if (!e || e.shop_id !== user.shopId) throw new Error("Not your event");
  if (e.status !== "scheduled") {
    throw new Error("Only a scheduled event can be cancelled");
  }

  await supabase.from("pokemon_events").update({ status: "cancelled" }).eq("id", id);
  revalidatePath("/vendor/events");
}

export default async function VendorEventsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/vendor/events");
  if (!user.shopId) redirect("/vendor/onboarding");

  const supabase = await createClient();
  const { data: events } = await supabase
    .from("pokemon_events")
    .select("*")
    .eq("shop_id", user.shopId)
    .order("week_start", { ascending: false });

  return (
    <VendorShell shopName={user.shopName ?? "Your shop"}>
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-display font-bold">Events</h1>
        <Link
          href="/vendor/events/create"
          className="flex h-11 items-center rounded-md bg-primary px-4 text-body font-medium text-white active:scale-[0.98]"
        >
          Host an Event
        </Link>
      </header>
      <p className="mt-1 text-body text-text-secondary">
        One &ldquo;Who&apos;s That Pokémon?&rdquo; event per week. You pick the gift
        and a broad window — the platform picks the exact minute.
      </p>

      {(events?.length ?? 0) === 0 ? (
        <p className="mt-6 rounded-lg border border-border bg-bg px-6 py-12 text-center text-body text-text-secondary">
          No events yet. Hosting one puts your shop in the Events tab, which
          people check separately from browsing.
        </p>
      ) : (
        <ul className="mt-6 flex flex-col gap-2">
          {events!.map((e) => (
            <li
              key={e.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-bg p-4"
            >
              <div className="min-w-0">
                <Link href={`/events/${e.id}`} className="truncate text-body font-medium hover:text-primary">
                  {e.gift_name}
                </Link>
                <p className="text-caption text-text-secondary">
                  Week of{" "}
                  {new Date(e.week_start).toLocaleDateString("en-PH", {
                    month: "short", day: "numeric",
                  })}
                  {" · answer "}
                  <span className="capitalize">{e.correct_answer}</span>
                </p>
              </div>
              <div className="flex items-center gap-2">
                <StatusPill tone={TONE[e.status as keyof typeof TONE] ?? "info"}>
                  {e.status.replace("_", " ")}
                </StatusPill>
                {e.status === "scheduled" && (
                  <form action={cancelEvent}>
                    <input type="hidden" name="id" value={e.id} />
                    <button className="h-11 rounded-md border border-border px-3 text-body text-danger">
                      Cancel
                    </button>
                  </form>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </VendorShell>
  );
}
