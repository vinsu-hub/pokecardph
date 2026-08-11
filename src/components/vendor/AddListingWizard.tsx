"use client";

import { useState } from "react";
import { php } from "@/lib/utils";
import { play } from "@/lib/audio";

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

type Card = { id: string; name: string; set_name: string; card_number: string | null; rarity: string | null };

const STEPS = ["Card Information", "Condition & Price", "Photos & Description", "Preview"];

export function AddListingWizard({
  action,
  cards,
  shopName,
}: {
  action: (fd: FormData) => Promise<void>;
  cards: Card[];
  shopName: string;
}) {
  const [step, setStep] = useState(1);
  const [cardId, setCardId] = useState(cards[0]?.id ?? "");
  const [graded, setGraded] = useState(true);
  const [company, setCompany] = useState("PSA");
  const [grade, setGrade] = useState("10");
  const [price, setPrice] = useState("4500");
  const [comparePrice, setComparePrice] = useState("");
  const [qty, setQty] = useState("1");
  const [description, setDescription] = useState("");

  const card = cards.find((c) => c.id === cardId);
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
            <div className="mt-3 flex flex-col gap-1.5">
              <label htmlFor="cardId" className="text-body font-medium">Search the catalog</label>
              <select
                id="cardId" name="cardId" value={cardId}
                onChange={(e) => setCardId(e.target.value)}
                className="h-11 rounded-md border border-border bg-bg px-3 text-body"
              >
                {cards.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} — {c.set_name} {c.card_number ?? ""}
                  </option>
                ))}
              </select>
            </div>
            {card && (
              <div className="mt-3 rounded-md border border-border p-3">
                <p className="text-body font-medium">{card.name}</p>
                <p className="text-caption text-text-secondary">
                  {[card.set_name, card.card_number, card.rarity].filter(Boolean).join(" · ")}
                </p>
              </div>
            )}
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
            <p className="mt-2 rounded-md bg-attention-bg px-3 py-2 text-caption text-attention">
              Photo upload isn&apos;t wired to Supabase Storage yet — listings publish
              without images and fall back to the placeholder art used elsewhere.
            </p>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {["Front", "Back", "Close-up", "Slab / Label"].map((slot) => (
                <div key={slot} className="grid aspect-square place-items-center rounded-md border border-dashed border-border text-caption text-text-muted">
                  {slot}
                </div>
              ))}
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
              <Sum k="Card" v={card ? `${card.name} — ${card.set_name}` : "—"} />
              <Sum k="Condition" v={condition} />
              <Sum k="Price" v={php(Number(price || 0))} />
              <Sum k="Quantity" v={qty} />
            </dl>
            <p className="mt-3 text-caption text-text-secondary">
              Publishing makes this live on the marketplace immediately.
            </p>
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
                <button type="submit" name="intent" value="draft"
                  className="h-11 rounded-md border border-border px-4 text-body font-medium">
                  Save as Draft
                </button>
                <button type="submit" name="intent" value="publish"
                  onClick={() => play("listing-live")}
                  className="h-11 flex-1 rounded-md bg-primary text-body font-medium text-white active:scale-[0.98]">
                  Publish Listing
                </button>
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
            <Art name={card?.name ?? "Card"} />
          </div>
          <p className="mt-3 text-body font-medium">{card?.name ?? "Select a card"}</p>
          <p className="text-caption text-text-secondary">{card?.set_name}</p>
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
