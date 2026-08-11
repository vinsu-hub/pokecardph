import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser, shellUser } from "@/lib/auth";
import { AppShell } from "@/components/shared/AppShell";
import { Countdown } from "@/components/auction/Countdown";
import { Silhouette } from "@/components/events/Silhouette";
import { SubmitButton } from "@/components/shared/SubmitButton";
import { getCartCount } from "@/lib/cart";

/**
 * Event detail — silhouette, one guess, then the reveal.
 *
 * The rule that shapes everything here: correctness is NEVER revealed until
 * the event closes. Revealing on submit would let people re-guess through new
 * accounts and let the crowd triangulate the answer from each other's
 * reactions. The server function returns "recorded", nothing more.
 */
export const dynamic = "force-dynamic";

async function guess(formData: FormData) {
  "use server";
  const eventId = String(formData.get("eventId"));
  const user = await getSessionUser();
  if (!user) redirect(`/login?next=/events/${eventId}`);

  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_guess", {
    p_event_id: eventId,
    p_guess: String(formData.get("guess") ?? ""),
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/events/${eventId}`);
}

export default async function EventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const user = await getSessionUser();
  const cartCount = await getCartCount();

  const { data: event } = await supabase
    .from("pokemon_events")
    .select("*, shops(id, name)")
    .eq("id", id)
    .maybeSingle();
  if (!event) notFound();

  // RLS restricts this to the caller's own row, so it can only ever be theirs.
  const { data: mine } = await supabase
    .from("event_guesses")
    .select("*")
    .eq("event_id", id)
    .maybeSingle();

  const [{ data: total }, { data: correct }] = await Promise.all([
    supabase.rpc("event_guess_count", { p_event_id: id }),
    supabase.rpc("event_correct_count", { p_event_id: id }),
  ]);

  const closed = ["closed", "winner_selected", "fulfilled"].includes(event.status);
  const iWon = event.winner_id != null && event.winner_id === user?.id;
  const iWasRight = closed && mine?.is_correct === true;

  return (
    <AppShell user={shellUser(user)} cartCount={cartCount}>
      <nav className="mb-4 text-caption text-text-secondary">
        <Link href="/events" className="hover:text-text-primary">Events</Link>
        <span className="mx-1.5">›</span>
        <span className="text-text-primary">Who&apos;s That Pokémon?</span>
      </nav>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div>
          <Silhouette
            name={event.gift_name}
            revealed={closed}
            answer={closed ? event.correct_answer : undefined}
            won={iWon}
          />

          {/* Gift preview sits BELOW the fold on purpose — enough to know what
              is being won without giving away its shape. */}
          <section className="mt-6 rounded-lg border border-border bg-bg p-(--card-pad)">
            <h2 className="text-h3 font-semibold">The gift</h2>
            <p className="mt-1 text-body font-medium">{event.gift_name}</p>
            {event.gift_description && (
              <p className="mt-1 text-body text-text-secondary">{event.gift_description}</p>
            )}
            <p className="mt-3 text-caption text-text-secondary">
              Hosted by{" "}
              <Link href={`/shops/${event.shops?.id}`} className="text-primary">
                {event.shops?.name}
              </Link>
            </p>
          </section>
        </div>

        <aside className="flex flex-col gap-4">
          <section className="rounded-lg border border-border bg-bg p-(--card-pad)">
            {!closed ? (
              <>
                <p className="text-caption text-text-secondary">Guessing closes in</p>
                <p className="text-display font-bold">
                  <Countdown endsAt={event.ends_at} />
                </p>
                <p className="mt-1 text-caption text-text-secondary">
                  <span className="tabular">{Number(total ?? 0)}</span> people have
                  guessed
                </p>

                {mine ? (
                  <div className="mt-4 rounded-md bg-primary-subtle px-3 py-3">
                    <p className="text-body font-medium text-primary">Guess submitted</p>
                    <p className="mt-1 text-body text-text-secondary">
                      Winners are announced when the event closes. We don&apos;t
                      say who&apos;s right until then — it keeps the answer from
                      leaking.
                    </p>
                    <p className="mt-2 text-caption text-text-secondary">
                      You guessed: <span className="font-medium capitalize">{mine.guess_text}</span>
                    </p>
                  </div>
                ) : !user ? (
                  <Link
                    href={`/login?next=/events/${id}`}
                    className="mt-4 flex h-11 items-center justify-center rounded-md bg-primary text-body font-medium text-white"
                  >
                    Sign in to guess
                  </Link>
                ) : (
                  <form action={guess} className="mt-4 flex flex-col gap-2">
                    <input type="hidden" name="eventId" value={id} />
                    <label htmlFor="guess" className="text-body font-medium">
                      Who&apos;s that Pokémon?
                    </label>
                    <input
                      id="guess"
                      name="guess"
                      required
                      autoComplete="off"
                      placeholder="e.g. Pikachu"
                      className="h-11 rounded-md border border-border px-3 text-body outline-none focus:border-primary"
                    />
                    <SubmitButton
                      pendingLabel="Submitting…"
                      className="h-11 rounded-md bg-primary text-body font-medium text-white"
                    >
                      Submit Guess
                    </SubmitButton>
                    <p className="text-caption text-text-muted">
                      One guess each. No retries — so take a moment.
                    </p>
                  </form>
                )}
              </>
            ) : (
              <>
                <h2 className="text-h3 font-semibold">Event closed</h2>
                <p className="mt-1 text-body text-text-secondary">
                  <span className="tabular">{Number(correct ?? 0)}</span> of{" "}
                  <span className="tabular">{Number(total ?? 0)}</span> guessed correctly.
                </p>

                {/* Three viewer states, each written with care. */}
                {iWon ? (
                  <div className="mt-4 rounded-md bg-success-bg px-3 py-3">
                    <p className="text-h3 font-semibold text-success">🎉 You won!</p>
                    <p className="mt-1 text-body text-success">
                      {event.gift_name} is yours. Claim it and the vendor will
                      arrange delivery.
                    </p>
                    <button
                      disabled
                      title="Gift claiming routes through the order flow — wiring pending"
                      className="mt-3 h-11 w-full cursor-not-allowed rounded-md bg-success text-body font-medium text-white opacity-60"
                    >
                      Claim your gift
                    </button>
                  </div>
                ) : iWasRight ? (
                  <div className="mt-4 rounded-md bg-primary-subtle px-3 py-3">
                    <p className="text-body font-medium text-primary">
                      You guessed right!
                    </p>
                    <p className="mt-1 text-body text-text-secondary">
                      This time the gift went to another winner — good luck next
                      event.
                    </p>
                  </div>
                ) : (
                  <p className="mt-4 rounded-md bg-bg-muted px-3 py-3 text-body text-text-secondary">
                    The answer was{" "}
                    <span className="font-medium text-text-primary capitalize">
                      {event.correct_answer}
                    </span>
                    {event.winner_id
                      ? `, and it went to ****${event.winner_id.slice(-2)}.`
                      : ". Nobody got it — the gift stays with the vendor."}
                  </p>
                )}
              </>
            )}
          </section>

          <section className="rounded-lg border border-border bg-bg p-(--card-pad)">
            <h2 className="text-h3 font-semibold">How it works</h2>
            <ul className="mt-2 flex flex-col gap-2 text-body text-text-secondary">
              <li>· One guess per person. No retries.</li>
              <li>· Correct or not stays hidden until the event closes.</li>
              <li>
                · The winner is drawn <span className="font-medium text-text-primary">at random</span>{" "}
                from everyone who got it right — not whoever was fastest.
              </li>
              <li>· Events start at a random time inside the vendor&apos;s window.</li>
            </ul>
          </section>
        </aside>
      </div>
    </AppShell>
  );
}
