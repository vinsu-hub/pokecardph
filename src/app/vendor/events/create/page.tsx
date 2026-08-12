import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth";
import { VendorShell } from "@/components/vendor/VendorShell";
import { SubmitButton } from "@/components/shared/SubmitButton";

/**
 * Host an event.
 *
 * The vendor picks a gift, the answer (plus aliases so "pika" counts), a guess
 * duration, and a **broad window** — never an exact time. The platform draws
 * the actual start inside that window, which is what makes the tab worth
 * checking rather than a scheduled appointment.
 */
export const dynamic = "force-dynamic";

/** Monday of the current week — the uniqueness key for one-event-per-week. */
function weekStart(d = new Date()) {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = (t.getUTCDay() + 6) % 7; // Monday = 0
  t.setUTCDate(t.getUTCDate() - day);
  return t.toISOString().slice(0, 10);
}

async function createEvent(formData: FormData) {
  "use server";
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/vendor/events/create");
  if (!user.shopId) redirect("/vendor/onboarding");

  const windowStart = String(formData.get("windowStart"));
  const windowEnd = String(formData.get("windowEnd"));
  if (new Date(windowEnd) <= new Date(windowStart)) {
    throw new Error("The window must end after it starts");
  }

  const aliases = String(formData.get("aliases") ?? "")
    .split(",")
    .map((a) => a.trim())
    .filter(Boolean);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pokemon_events")
    .insert({
      shop_id: user.shopId,
      gift_name: String(formData.get("giftName")),
      gift_description: String(formData.get("giftDescription") ?? "") || null,
      correct_answer: String(formData.get("answer")).trim().toLowerCase(),
      answer_aliases: aliases,
      week_start: weekStart(new Date(windowStart)),
      window_start: new Date(windowStart).toISOString(),
      window_end: new Date(windowEnd).toISOString(),
      guess_duration_minutes: Number(formData.get("duration") || 60),
      status: "scheduled",
    })
    .select("id")
    .single();

  if (error) {
    // The unique index is the one-event-per-week rule surfacing.
    if (error.code === "23505") {
      throw new Error("You already have an event scheduled for that week");
    }
    throw new Error(error.message);
  }

  redirect(`/vendor/events?created=${data.id}`);
}

export default async function CreateEventPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/vendor/events/create");
  if (!user.shopId) redirect("/vendor/onboarding");

  const now = new Date();
  const soon = new Date(now.getTime() + 10 * 60 * 1000);
  const later = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  const iso = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString().slice(0, 16);

  return (
    <VendorShell shopName={user.shopName ?? "Your shop"} tier={user.shopTier} isBetaVendor={user.isBetaVendor}>
      <h1 className="text-display font-bold">Host an Event</h1>
      <p className="mt-1 text-body text-text-secondary">
        Offer a gift, set the answer, and choose a window. We&apos;ll start it at
        a random moment inside that window.
      </p>

      <form action={createEvent} className="mt-6 flex max-w-[640px] flex-col gap-4">
        <Field label="Gift name" htmlFor="giftName">
          <input id="giftName" name="giftName" required maxLength={80}
            placeholder="e.g. Pikachu VMAX (Celebrations)"
            className="h-11 w-full rounded-md border border-border px-3 text-body" />
        </Field>

        <Field label="Gift description" htmlFor="giftDescription">
          <textarea id="giftDescription" name="giftDescription" rows={2}
            className="w-full rounded-md border border-border p-3 text-body" />
        </Field>

        <Field label="Correct answer" htmlFor="answer">
          <input id="answer" name="answer" required placeholder="e.g. Pikachu"
            className="h-11 w-full rounded-md border border-border px-3 text-body" />
        </Field>

        <Field label="Accepted alternatives (comma separated)" htmlFor="aliases">
          <input id="aliases" name="aliases" placeholder="pika, pikachuu"
            className="h-11 w-full rounded-md border border-border px-3 text-body" />
        </Field>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Window opens" htmlFor="windowStart">
            <input id="windowStart" name="windowStart" type="datetime-local" required
              defaultValue={iso(soon)}
              className="h-11 w-full rounded-md border border-border px-3 text-body" />
          </Field>
          <Field label="Window closes" htmlFor="windowEnd">
            <input id="windowEnd" name="windowEnd" type="datetime-local" required
              defaultValue={iso(later)}
              className="h-11 w-full rounded-md border border-border px-3 text-body" />
          </Field>
          <Field label="Guessing stays open (min)" htmlFor="duration">
            <input id="duration" name="duration" type="number" min="5" max="1440"
              defaultValue={60}
              className="h-11 w-full rounded-md border border-border px-3 text-body tabular" />
          </Field>
        </div>

        <p className="rounded-md bg-primary-subtle px-3 py-2 text-caption text-text-secondary">
          The exact start stays hidden — even from your own Events tab — until it
          happens. That surprise is the point.
        </p>

        <SubmitButton
          pendingLabel="Scheduling…"
          className="h-11 rounded-md bg-primary text-body font-medium text-white"
        >
          Schedule event
        </SubmitButton>
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
