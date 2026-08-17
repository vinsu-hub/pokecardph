"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { php } from "@/lib/utils";
import { SubmitButton } from "@/components/shared/SubmitButton";
import { LoadingIndicator } from "@/components/shared/LoadingIndicator";

/**
 * 4-step checkout: Review Cart → Delivery → Payment → Confirm.
 *
 * Step state is client-side and every field stays mounted across steps —
 * stepping through a server-rendered URL (?step=n) would reload the page and
 * wipe whatever the person had already typed. Hidden rather than unmounted,
 * so the final submit carries all four steps' values in one form post.
 */
export function CheckoutForm({
  action,
  items,
  defaultName,
  totals,
}: {
  action: (fd: FormData) => Promise<void>;
  items: { id: string; name: string; meta: string; qty: number; lineTotal: number }[];
  defaultName: string;
  totals: { subtotal: number; shipping: number; fee: number; total: number };
}) {
  const [step, setStep] = useState(1);
  const STEPS = ["Review Cart", "Delivery", "Payment", "Confirm"];

  return (
    <>
      <ol className="mt-4 flex flex-wrap items-center gap-2">
        {STEPS.map((label, i) => {
          const n = i + 1;
          const done = n < step;
          const active = n === step;
          return (
            <li key={label} className="flex items-center gap-2">
              <span
                className={`grid size-7 place-items-center rounded-full border-2 text-caption font-medium transition-colors duration-(--duration-base) ${
                  done
                    ? "border-primary bg-primary text-white"
                    : active
                      ? "border-primary text-primary"
                      : "border-border text-text-muted"
                }`}
              >
                {done ? "✓" : n}
              </span>
              <span className={`text-caption ${active ? "font-medium text-primary" : "text-text-secondary"}`}>
                {label}
              </span>
              {n < STEPS.length && <span className="mx-1 hidden h-px w-6 bg-border sm:block" />}
            </li>
          );
        })}
      </ol>

      <form action={action} className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="rounded-lg border border-border bg-bg p-(--card-pad)">
          {/* Step 1 */}
          <Panel show={step === 1}>
            <h2 className="text-h3 font-semibold">Review your items</h2>
            <ul className="mt-3 flex flex-col gap-3">
              {items.map((it) => (
                <li key={it.id} className="flex items-center justify-between gap-3 border-b border-border pb-3 last:border-0">
                  <div className="min-w-0">
                    <p className="truncate text-body font-medium">{it.name}</p>
                    <p className="truncate text-caption text-text-secondary">{it.meta} · ×{it.qty}</p>
                  </div>
                  <span className="text-body font-bold tabular">{php(it.lineTotal)}</span>
                </li>
              ))}
            </ul>
          </Panel>

          {/* Step 2 */}
          <Panel show={step === 2}>
            <h2 className="text-h3 font-semibold">Delivery details</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Field id="name" label="Full name" defaultValue={defaultName} />
              <Field id="phone" label="Mobile number" placeholder="09XX XXX XXXX" />
              <Field id="address" label="Address" className="sm:col-span-2" />
              <Field id="city" label="City" />
            </div>
          </Panel>

          {/* Step 3 */}
          <Panel show={step === 3}>
            <h2 className="text-h3 font-semibold">Payment method</h2>
            <p className="mt-2 rounded-md bg-attention-bg px-3 py-2 text-caption text-attention">
              Payment processing isn&apos;t connected yet — Xendit credentials aren&apos;t
              provisioned. Your order is created for real with status{" "}
              <span className="font-medium">pending</span>.
            </p>
            <ul className="mt-3 flex flex-col gap-2">
              {[
                ["gcash", "GCash"],
                ["maya", "Maya"],
                ["card", "Credit / Debit Card"],
                ["bank", "Bank Transfer"],
              ].map(([v, label], i) => (
                <li key={v}>
                  <label className="flex min-h-11 items-center gap-3 rounded-md border border-border px-3">
                    <input type="radio" name="payment" value={v} defaultChecked={i === 0} className="size-4 accent-[var(--color-primary)]" />
                    <span className="text-body">{label}</span>
                  </label>
                </li>
              ))}
            </ul>
          </Panel>

          {/* Step 4 */}
          <Panel show={step === 4}>
            <h2 className="text-h3 font-semibold">Confirm your order</h2>
            <p className="mt-2 text-body text-text-secondary">
              {items.length} item{items.length === 1 ? "" : "s"} · {php(totals.total)} total.
            </p>
            <div className="mt-4 flex flex-wrap gap-2 text-caption text-text-secondary">
              {["100% Authentic", "Secure Packaging", "Fast Delivery", "Buyer Protection"].map((t) => (
                <span key={t} className="rounded-full bg-bg-muted px-3 py-1">{t}</span>
              ))}
            </div>
          </Panel>

          <div className="mt-5 flex gap-2">
            {step > 1 && (
              <button
                type="button"
                onClick={() => setStep((s) => s - 1)}
                className="h-11 rounded-md border border-border px-4 text-body font-medium"
              >
                Back
              </button>
            )}
            {step < 4 ? (
              <button
                type="button"
                onClick={() => setStep((s) => s + 1)}
                className="h-11 flex-1 rounded-md bg-primary text-body font-medium text-white transition-transform duration-(--duration-instant) active:scale-[0.98]"
              >
                Continue
              </button>
            ) : (
              <SubmitButton
                pendingLabel="Placing order…"
                className="h-11 flex-1 rounded-md bg-primary text-body font-medium text-white"
              >
                Place Order
              </SubmitButton>
            )}
          </div>

          <CheckoutPendingOverlay />
        </div>

        <aside className="rounded-lg border border-border bg-bg p-(--card-pad) lg:sticky lg:top-24 lg:self-start">
          <h2 className="text-h3 font-semibold">Summary</h2>
          <dl className="mt-3 flex flex-col gap-2">
            <Row label="Subtotal" value={php(totals.subtotal)} />
            <Row label="Shipping" value={totals.shipping === 0 ? "Free" : php(totals.shipping)} />
            <Row label="Platform fee" value={php(totals.fee)} />
            <div className="flex items-center justify-between border-t border-border pt-3">
              <dt className="text-body font-medium">Total</dt>
              <dd className="text-h3 font-bold tabular">{php(totals.total)}</dd>
            </div>
          </dl>
        </aside>
      </form>
    </>
  );
}

/**
 * `useFormStatus()` only reflects the nearest ancestor `<form>`'s status when
 * called from a descendant, not from the component that renders the form
 * itself — same reason `BetaSignupForm.tsx` splits this out. `placeOrder`
 * redirects to the order confirmation page on success, so there's no in-page
 * "success" moment to show here.
 */
function CheckoutPendingOverlay() {
  const { pending } = useFormStatus();
  return (
    <LoadingIndicator
      state={pending ? "pending" : "idle"}
      pendingLabel="Processing your transaction…"
    />
  );
}

/** Hidden, not unmounted — values must survive stepping back and forth. */
function Panel({ show, children }: { show: boolean; children: React.ReactNode }) {
  return <div hidden={!show}>{children}</div>;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-body text-text-secondary">{label}</dt>
      <dd className="text-body tabular">{value}</dd>
    </div>
  );
}

function Field({
  id, label, placeholder, defaultValue, className,
}: {
  id: string; label: string; placeholder?: string; defaultValue?: string; className?: string;
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${className ?? ""}`}>
      <label htmlFor={id} className="text-body font-medium">{label}</label>
      <input
        id={id}
        name={id}
        placeholder={placeholder}
        defaultValue={defaultValue}
        className="h-11 rounded-md border border-border px-3 text-body outline-none focus:border-primary"
      />
    </div>
  );
}
