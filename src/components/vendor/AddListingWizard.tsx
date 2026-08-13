"use client";

import { useState } from "react";
import { php } from "@/lib/utils";
import { play } from "@/lib/audio";
import { SubmitButton } from "@/components/shared/SubmitButton";
import { ImageUpload } from "@/components/shared/ImageUpload";

/**
 * Add Listing — the CANONICAL 4-step wizard.
 *
 * Reference: VENDOR ADD NEW LISTING VIEW.png. Deliberately NOT
 * VENDOR ADD LISTING.png, which is the single-page 5-section variant the spec
 * says to ignore.
 *
 * Steps: Card Information → Condition & Price → Photos & Description → Preview.
 * The live Listing Preview is pinned right and always visible — never its own
 * step. Below 1024px it moves under the form, per the responsive rules.
 *
 * All fields stay mounted across steps so stepping back and forth never loses
 * input; only visibility changes.
 */

const STEPS = ["Card Information", "Condition & Price", "Photos & Description", "Preview"];

/** Per MASTER_PROMPT §2.2 step 3. Slab/Label is only meaningful when graded,
 *  but it stays in the grid rather than appearing and disappearing as the
 *  Graded toggle flips — a photo grid that reflows mid-wizard loses uploads. */
const PHOTO_SLOTS = ["Front", "Back", "Close-up", "Slab / Label"];

/** Modern rarity ladder alongside the classic three tiers — free text on the
 *  server (no DB enum), so this list can grow without a migration. */
const RARITIES = [
  "Common", "Uncommon", "Rare", "Double Rare", "Rare Holo", "Reverse Holo",
  "Ultra Rare", "Illustration Rare", "Special Illustration Rare", "Hyper Rare",
  "Secret Rare", "Amazing Rare", "Radiant Rare", "ACE SPEC Rare", "Promo", "Other",
];
const FINISHES = ["Non-Holo", "Holo", "Reverse Holo", "Full Art", "Other"];
const EDITIONS = ["Unlimited", "1st Edition", "Shadowless"];
const LANGUAGES = ["English", "Japanese", "Korean", "Chinese", "Other"];

export function AddListingWizard({
  action,
  shopName,
  shopId,
  draftId,
}: {
  action: (fd: FormData) => Promise<void>;
  shopName: string;
  shopId: string;
  /** Groups this wizard session's uploads under one folder. Generated on the
   *  server per page load — a client-side `crypto.randomUUID()` would be an
   *  impure call during render, which React 19 lints as an error. */
  draftId: string;
}) {
  const [step, setStep] = useState(1);
  const [cardName, setCardName] = useState("");
  const [setName, setSetName] = useState("");
  const [graded, setGraded] = useState(true);
  const [company, setCompany] = useState("PSA");
  const [grade, setGrade] = useState("10");
  const [price, setPrice] = useState("4500");
  const [comparePrice, setComparePrice] = useState("");
  const [qty, setQty] = useState("1");
  const [description, setDescription] = useState("");
  // Whether Flat Scan is satisfied — a Front photo IS the flat scan, so this
  // gates Publish without any separate upload step. Save as Draft is never
  // gated: a vendor should be able to save progress before they have a photo.
  const [hasFrontPhoto, setHasFrontPhoto] = useState(false);

  const condition = graded ? `${company} ${grade}` : "Non-Graded";

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <form action={action} className="flex flex-col gap-4">
        {/* Step indicator */}
        <ol className="flex flex-wrap items-center gap-2">
          {STEPS.map((label, i) => {
            const n = i + 1;
            const done = n < step;
            const active = n === step;
            return (
              <li key={label} className="flex items-center gap-2">
                <span
                  className={`grid size-7 place-items-center rounded-full border-2 text-caption font-medium transition-colors duration-(--duration-base) ${
                    done ? "border-primary bg-primary text-white"
                      : active ? "border-primary text-primary"
                        : "border-border text-text-muted"
                  }`}
                >
                  {done ? "✓" : n}
                </span>
                <span className={`hidden text-caption sm:inline ${active ? "font-medium text-primary" : "text-text-secondary"}`}>
                  {label}
                </span>
                {n < STEPS.length && <span className="mx-1 hidden h-px w-6 bg-border sm:block" />}
              </li>
            );
          })}
        </ol>

        <div className="rounded-lg border border-border bg-bg p-(--card-pad)">
          {/* 1 — Card Information */}
          <div hidden={step !== 1}>
            <h2 className="text-h3 font-semibold">Card Information</h2>
            <p className="mt-1 text-caption text-text-secondary">
              Type in your card&apos;s details — name, set, and number identify exactly which card;
              finish, edition, and language matter because the same card prices differently across
              each printing.
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Field label="Card name" htmlFor="cardName">
                <input
                  id="cardName" name="cardName" required value={cardName}
                  onChange={(e) => setCardName(e.target.value)}
                  placeholder="e.g. Charizard ex"
                  className="h-11 w-full rounded-md border border-border bg-bg px-3 text-body"
                />
              </Field>
              <Field label="Set" htmlFor="setName">
                <input
                  id="setName" name="setName" required value={setName}
                  onChange={(e) => setSetName(e.target.value)}
                  placeholder="e.g. Obsidian Flames"
                  className="h-11 w-full rounded-md border border-border bg-bg px-3 text-body"
                />
              </Field>
              <Field label="Card number" htmlFor="cardNumber">
                <input
                  id="cardNumber" name="cardNumber" placeholder="e.g. 199/197"
                  className="h-11 w-full rounded-md border border-border bg-bg px-3 text-body tabular"
                />
              </Field>
              <Field label="Rarity" htmlFor="rarity">
                <select id="rarity" name="rarity" defaultValue=""
                  className="h-11 w-full rounded-md border border-border bg-bg px-3 text-body">
                  <option value="">Not specified</option>
                  {RARITIES.map((r) => <option key={r}>{r}</option>)}
                </select>
              </Field>
              <Field label="Illustrator" htmlFor="illustrator">
                <input
                  id="illustrator" name="illustrator" placeholder="e.g. Mitsuhiro Arita"
                  className="h-11 w-full rounded-md border border-border bg-bg px-3 text-body"
                />
              </Field>
              <Field label="Finish" htmlFor="finish">
                <select id="finish" name="finish" defaultValue=""
                  className="h-11 w-full rounded-md border border-border bg-bg px-3 text-body">
                  <option value="">Not specified</option>
                  {FINISHES.map((f) => <option key={f}>{f}</option>)}
                </select>
              </Field>
              <Field label="Edition" htmlFor="edition">
                <select id="edition" name="edition" defaultValue="Unlimited"
                  className="h-11 w-full rounded-md border border-border bg-bg px-3 text-body">
                  {EDITIONS.map((e) => <option key={e}>{e}</option>)}
                </select>
              </Field>
              <Field label="Language" htmlFor="language">
                <select id="language" name="language" defaultValue="English"
                  className="h-11 w-full rounded-md border border-border bg-bg px-3 text-body">
                  {LANGUAGES.map((l) => <option key={l}>{l}</option>)}
                </select>
              </Field>
            </div>
          </div>

          {/* 2 — Condition & Price */}
          <div hidden={step !== 2}>
            <h2 className="text-h3 font-semibold">Condition &amp; Price</h2>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <button
                type="button" onClick={() => setGraded(true)}
                className={`rounded-md border p-3 text-left ${graded ? "border-primary bg-primary-subtle" : "border-border"}`}
              >
                <span className="block text-body font-medium">Graded Card</span>
                <span className="block text-caption text-text-secondary">Professionally graded and slabbed</span>
              </button>
              <button
                type="button" onClick={() => setGraded(false)}
                className={`rounded-md border p-3 text-left ${!graded ? "border-primary bg-primary-subtle" : "border-border"}`}
              >
                <span className="block text-body font-medium">Non-Graded Card</span>
                <span className="block text-caption text-text-secondary">Raw card, not graded</span>
              </button>
            </div>
            <input type="hidden" name="listingType" value={graded ? "graded" : "non_graded"} />

            {graded && (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <Field label="Grading company" htmlFor="gradingCompany">
                  <select id="gradingCompany" name="gradingCompany" value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    className="h-11 w-full rounded-md border border-border bg-bg px-3 text-body">
                    {["PSA", "BGS", "CGC", "Other"].map((c) => <option key={c}>{c}</option>)}
                  </select>
                </Field>
                <Field label="Grade" htmlFor="grade">
                  <select id="grade" name="grade" value={grade}
                    onChange={(e) => setGrade(e.target.value)}
                    className="h-11 w-full rounded-md border border-border bg-bg px-3 text-body">
                    {["10", "9.5", "9", "8.5", "8"].map((g) => <option key={g}>{g}</option>)}
                  </select>
                </Field>
                <Field label="Certification number" htmlFor="certNumber">
                  <input id="certNumber" name="certNumber" className="h-11 w-full rounded-md border border-border px-3 text-body tabular" />
                </Field>
                <Field label="Population" htmlFor="population">
                  <input id="population" name="population" type="number" min="0" className="h-11 w-full rounded-md border border-border px-3 text-body tabular" />
                </Field>
              </div>
            )}

            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <Field label="Price ₱" htmlFor="price">
                <input id="price" name="price" type="number" min="1" required value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="h-11 w-full rounded-md border border-border px-3 text-body tabular" />
              </Field>
              <Field label="Compare price ₱" htmlFor="comparePrice">
                <input id="comparePrice" name="comparePrice" type="number" min="0" value={comparePrice}
                  onChange={(e) => setComparePrice(e.target.value)}
                  className="h-11 w-full rounded-md border border-border px-3 text-body tabular" />
              </Field>
              <Field label="Quantity" htmlFor="quantity">
                <input id="quantity" name="quantity" type="number" min="1" value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  className="h-11 w-full rounded-md border border-border px-3 text-body tabular" />
              </Field>
            </div>
          </div>

          {/* 3 — Photos & Description */}
          <div hidden={step !== 3}>
            <h2 className="text-h3 font-semibold">Photos &amp; Description</h2>
            <p className="mt-2 text-caption text-text-secondary">
              Photos upload as you pick them. A draft never needs one — but a
              <span className="font-medium text-text-primary"> Front photo is required to publish</span>:
              it doubles as this listing&apos;s Flat Scan, the minimum every listing
              needs so buyers see real surface detail, not a placeholder.
            </p>
            <div className="mt-3">
              <ImageUpload
                name="photos"
                bucket="listing-photos"
                prefix={`${shopId}/${draftId}`}
                slots={PHOTO_SLOTS}
                required={["Front", "Back"]}
                onChange={(images) => setHasFrontPhoto(Boolean(images["Front"]))}
              />
            </div>
            <div className="mt-3 flex flex-col gap-1.5">
              <label htmlFor="description" className="text-body font-medium">Description</label>
              <textarea
                id="description" name="description" rows={4} maxLength={500}
                value={description} onChange={(e) => setDescription(e.target.value)}
                placeholder="Centering, surfaces, edges, storage history…"
                className="w-full rounded-md border border-border p-3 text-body"
              />
              <span className="self-end text-caption text-text-muted tabular">
                {description.length}/500
              </span>
            </div>
          </div>

          {/* 4 — Preview */}
          <div hidden={step !== 4}>
            <h2 className="text-h3 font-semibold">Preview &amp; publish</h2>
            <dl className="mt-3 flex flex-col gap-2">
              <Sum k="Card" v={`${cardName} — ${setName}`} />
              <Sum k="Condition" v={condition} />
              <Sum k="Price" v={php(Number(price || 0))} />
              <Sum k="Quantity" v={qty} />
            </dl>
            <p className="mt-3 text-caption text-text-secondary">
              Publishing makes this live on the marketplace immediately.
            </p>
            {!hasFrontPhoto && (
              <p className="mt-2 rounded-md bg-attention-bg px-3 py-2 text-caption text-attention">
                Add a Front photo in Photos &amp; Description before publishing —
                it&apos;s this listing&apos;s Flat Scan and every listing needs one.
                You can still save as a draft without it.
              </p>
            )}
          </div>

          {/* Nav */}
          <div className="mt-5 flex gap-2">
            {step > 1 && (
              <button type="button" onClick={() => setStep((s) => s - 1)}
                className="h-11 rounded-md border border-border px-4 text-body font-medium">
                Back
              </button>
            )}
            {step < 4 ? (
              <button type="button" onClick={() => setStep((s) => s + 1)}
                className="h-11 flex-1 rounded-md bg-primary text-body font-medium text-white active:scale-[0.98]">
                Continue
              </button>
            ) : (
              <>
                <SubmitButton name="intent" value="draft" pendingLabel="Saving…"
                  className="h-11 rounded-md border border-border px-4 text-body font-medium">
                  Save as Draft
                </SubmitButton>
                <SubmitButton name="intent" value="publish" pendingLabel="Publishing…"
                  onClick={() => play("listing-live")}
                  disabled={!hasFrontPhoto}
                  className="h-11 flex-1 rounded-md bg-primary text-body font-medium text-white">
                  Publish Listing
                </SubmitButton>
              </>
            )}
          </div>
        </div>
      </form>

      {/* Live preview — pinned right on desktop, below the form on mobile. */}
      <aside className="lg:sticky lg:top-6 lg:self-start">
        <div className="rounded-lg border border-border bg-bg p-(--card-pad)">
          <p className="text-caption font-medium text-text-secondary">Listing Preview</p>
          <div className="relative mt-3 aspect-[3/4] overflow-hidden rounded-md bg-bg-muted">
            <span className="absolute top-2 left-2 z-10 rounded-md bg-primary px-2 py-0.5 text-caption font-medium text-white">
              {condition}
            </span>
            <Art name={cardName || "Card"} />
          </div>
          <p className="mt-3 text-body font-medium">{cardName || "Card name"}</p>
          <p className="text-caption text-text-secondary">{setName}</p>
          <p className="mt-1 text-h3 font-bold tabular">{php(Number(price || 0))}</p>
          {comparePrice && Number(comparePrice) > Number(price) && (
            <p className="text-caption text-text-secondary tabular line-through">
              {php(Number(comparePrice))}
            </p>
          )}
          <p className="mt-2 text-caption text-text-secondary">{shopName}</p>
        </div>
      </aside>
    </div>
  );
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-body font-medium">{label}</label>
      {children}
    </div>
  );
}

function Sum({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border pb-2 last:border-0">
      <dt className="text-caption text-text-secondary">{k}</dt>
      <dd className="text-body">{v}</dd>
    </div>
  );
}

function Art({ name }: { name: string }) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
  return (
    <div className="absolute inset-0 grid place-items-center p-3 text-center"
      style={{ background: `linear-gradient(150deg, hsl(${h} 70% 88%), hsl(${(h + 40) % 360} 65% 78%))` }}>
      <span className="text-caption font-medium text-text-primary/60">{name}</span>
    </div>
  );
}
