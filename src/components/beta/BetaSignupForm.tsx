"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { User, Wallet, Store } from "lucide-react";
import { SubmitButton } from "@/components/shared/SubmitButton";
import { LoadingIndicator } from "@/components/shared/LoadingIndicator";

const STEPS = ["Your Information", "Shop Details", "Review & Submit", "Start Listing"];

const VENDOR_TYPES = [
  { value: "hobbyist", label: "Hobbyist", blurb: "Collecting & selling as a hobby", Icon: User },
  { value: "casual_reseller", label: "Casual Reseller", blurb: "Selling cards part-time", Icon: Wallet },
  { value: "established_shop", label: "Established Shop", blurb: "Running a growing card business", Icon: Store },
];

const HOW_HEARD_OPTIONS = ["Facebook group", "Friend or fellow collector", "Instagram/TikTok", "Search engine", "Other"];

/**
 * Beta registration wizard. Reference: REFERENCE IMAGES/VENDOR REGISTRATION
 * BETA.png — a 4-node stepper (Your Information / Shop Details / Review &
 * Submit / Start Listing). Node 4 never becomes "active" in this component:
 * submitting step 3 redirects straight into the real Add Listing wizard, so
 * it's shown only as the upcoming destination, the same way it reads in the
 * reference image itself (no step-4 screen exists there either).
 *
 * All fields stay mounted across steps and only visibility toggles — the
 * same pattern AddListingWizard.tsx already established — so stepping back
 * and forth never loses input.
 */
export function BetaSignupForm({
  action,
  fullName: initialFullName,
  email,
  errorMessage,
}: {
  action: (formData: FormData) => Promise<void>;
  fullName: string;
  email: string;
  errorMessage?: string;
}) {
  const [step, setStep] = useState(1);
  const [fullName, setFullName] = useState(initialFullName);
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [shopName, setShopName] = useState("");
  const [vendorType, setVendorType] = useState("hobbyist");
  const [socialHandle, setSocialHandle] = useState("");
  const [howHeard, setHowHeard] = useState("");

  const canContinueStep1 = fullName.trim().length > 0 && location.trim().length > 0;
  const canContinueStep2 = shopName.trim().length > 0;

  return (
    <div className="mt-6">
      {/* Stepper */}
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

      <form action={action} className="mt-4 flex flex-col gap-4 rounded-lg border border-border bg-bg p-(--card-pad)">
        <PendingOverlay />
        <input type="hidden" name="fullName" value={fullName} />
        <input type="hidden" name="phone" value={phone} />
        <input type="hidden" name="location" value={location} />
        <input type="hidden" name="name" value={shopName} />
        <input type="hidden" name="vendorType" value={vendorType} />
        <input type="hidden" name="socialHandle" value={socialHandle} />
        <input type="hidden" name="howHeard" value={howHeard} />

        {/* Step 1 — Your Information */}
        <div hidden={step !== 1}>
          <h2 className="text-h3 font-semibold">Your Information</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Field label="Full Name" htmlFor="fullNameInput">
              <input
                id="fullNameInput" required maxLength={80} value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Juan Dela Cruz"
                className="h-11 w-full rounded-md border border-border px-3 text-body outline-none focus:border-primary"
              />
            </Field>
            <Field label="Email Address" htmlFor="emailDisplay">
              <div id="emailDisplay" className="flex h-11 items-center rounded-md border border-border bg-bg-muted px-3 text-body text-text-secondary">
                {email}
              </div>
            </Field>
            <Field label="Phone Number" optional htmlFor="phoneInput">
              <input
                id="phoneInput" type="tel" value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="09XX XXX XXXX"
                className="h-11 w-full rounded-md border border-border px-3 text-body outline-none focus:border-primary"
              />
            </Field>
            <Field label="City / Location" htmlFor="locationInput">
              <input
                id="locationInput" required value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Quezon City, Metro Manila"
                className="h-11 w-full rounded-md border border-border px-3 text-body outline-none focus:border-primary"
              />
            </Field>
          </div>
        </div>

        {/* Step 2 — Shop Details */}
        <div hidden={step !== 2}>
          <h2 className="text-h3 font-semibold">Shop Details</h2>
          <div className="mt-3 flex flex-col gap-1.5">
            <label htmlFor="shopNameInput" className="text-body font-medium">Preferred Shop Name</label>
            <input
              id="shopNameInput" required maxLength={60} value={shopName}
              onChange={(e) => setShopName(e.target.value)}
              placeholder="e.g. JDC Trading Cards"
              className="h-11 rounded-md border border-border px-3 text-body outline-none focus:border-primary"
            />
          </div>

          <div className="mt-4 flex flex-col gap-1.5">
            <span className="text-body font-medium">Vendor Type</span>
            <div className="grid gap-2 sm:grid-cols-3">
              {VENDOR_TYPES.map(({ value, label, blurb, Icon }) => {
                const selected = vendorType === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setVendorType(value)}
                    className={`flex flex-col items-center gap-1.5 rounded-md border p-3 text-center transition-colors duration-(--duration-instant) ${
                      selected ? "border-primary bg-primary-subtle" : "border-border hover:bg-bg-muted"
                    }`}
                  >
                    <Icon className={`size-5 ${selected ? "text-primary" : "text-text-secondary"}`} />
                    <span className="text-body font-medium">{label}</span>
                    <span className="text-caption text-text-secondary">{blurb}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Field label="Social Handle" optional htmlFor="socialHandleInput">
              <input
                id="socialHandleInput" value={socialHandle}
                onChange={(e) => setSocialHandle(e.target.value)}
                placeholder="@jdc.cards"
                className="h-11 w-full rounded-md border border-border px-3 text-body outline-none focus:border-primary"
              />
            </Field>
            <Field label="How did you hear about us?" optional htmlFor="howHeardInput">
              <select
                id="howHeardInput" value={howHeard}
                onChange={(e) => setHowHeard(e.target.value)}
                className="h-11 w-full rounded-md border border-border bg-bg px-3 text-body"
              >
                <option value="">Select an option</option>
                {HOW_HEARD_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </Field>
          </div>
        </div>

        {/* Step 3 — Review & Submit */}
        <div hidden={step !== 3}>
          <h2 className="text-h3 font-semibold">Review &amp; Submit</h2>
          <dl className="mt-3 flex flex-col gap-2">
            <Sum k="Full Name" v={fullName || "—"} />
            <Sum k="Email" v={email} />
            <Sum k="Phone" v={phone || "—"} />
            <Sum k="Location" v={location || "—"} />
            <Sum k="Shop Name" v={shopName || "—"} />
            <Sum k="Vendor Type" v={VENDOR_TYPES.find((t) => t.value === vendorType)?.label ?? "—"} />
            <Sum k="Social Handle" v={socialHandle || "—"} />
            <Sum k="How did you hear about us?" v={howHeard || "—"} />
          </dl>
          <p className="mt-3 text-caption text-text-secondary">
            Submitting creates your shop and starts your trial immediately — next you&apos;ll go
            straight into listing your first card.
          </p>
        </div>

        {errorMessage && (
          <p role="alert" className="rounded-md bg-danger-bg px-3 py-2 text-caption text-danger">
            {errorMessage}
          </p>
        )}

        {/* Nav */}
        <div className="mt-2 flex gap-2">
          {step > 1 && (
            <button type="button" onClick={() => setStep((s) => s - 1)}
              className="h-11 rounded-md border border-border px-4 text-body font-medium">
              Back
            </button>
          )}
          {step < 3 ? (
            <button
              type="button"
              onClick={() => setStep((s) => s + 1)}
              disabled={(step === 1 && !canContinueStep1) || (step === 2 && !canContinueStep2)}
              className="h-11 flex-1 rounded-md bg-primary text-body font-medium text-white transition-all duration-(--duration-instant) active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {step === 1 ? "Continue to Shop Details" : "Continue to Review"}
            </button>
          ) : (
            <SubmitButton
              pendingLabel="Creating your shop…"
              className="h-11 flex-1 rounded-md bg-primary text-body font-medium text-white"
            >
              Submit &amp; Start Listing
            </SubmitButton>
          )}
        </div>
      </form>
    </div>
  );
}

/**
 * `useFormStatus()` only reflects the status of the nearest ancestor
 * `<form>` when called from one of its descendants, not from the component
 * that renders the form itself — hence this being a separate child rather
 * than reading `pending` directly in `BetaSignupForm`. The RPC call redirects
 * on both success and failure, so there's no in-page "success" moment to
 * show here — that's reused via `?beta=welcome` on the page it redirects to
 * (`vendor/listings/add`) instead. On failure it's a full-page redirect back
 * to this route with `?error=`, so by the time that renders, `pending` is
 * already false — the existing inline error message below (already
 * danger-styled, matching the app's convention) is what actually
 * communicates it, not this overlay.
 */
function PendingOverlay() {
  const { pending } = useFormStatus();
  return (
    <LoadingIndicator
      state={pending ? "pending" : "idle"}
      pendingLabel="Creating your shop…"
    />
  );
}

function Field({ label, htmlFor, optional, children }: { label: string; htmlFor: string; optional?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-body font-medium">
        {label} {optional && <span className="font-normal text-text-muted">(Optional)</span>}
      </label>
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
