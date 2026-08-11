"use client";

import { useId, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

/**
 * The one upload control.
 *
 * Storage went unused through Phases 0-7 — every image in the app is a
 * generated gradient placeholder — so this is written once here rather than
 * separately by the listing wizard, shop settings, the scan studio and message
 * attachments. Each of those passes a different bucket and prefix.
 *
 * Uploads go **directly from the browser** as the signed-in user, so the
 * storage policies in 0011 are the actual boundary rather than a server action
 * deciding for itself what it's allowed to write. A vendor who tampers with
 * `prefix` to point at another shop's folder gets rejected by Postgres, not by
 * our own good behaviour.
 *
 * The result is submitted as JSON in one hidden input, so the enclosing Server
 * Action reads a single field and doesn't need to know this component exists.
 *
 * **Public buckets only, as written.** It records `getPublicUrl`, which returns
 * a working URL only where the bucket is public (`listing-photos`,
 * `shop-assets`, `scan-maps`). The two private buckets — `scan-raw` and
 * `message-attachments` — will need `createSignedUrl` and an expiry instead;
 * add that branch when Phase 8 wires attachments rather than quietly making
 * those buckets public.
 */

export type UploadedImage = { slot: string; url: string; path: string };

export function ImageUpload({
  name,
  bucket,
  prefix,
  slots,
  required = [],
}: {
  /** Hidden form field carrying the JSON array of uploads. */
  name: string;
  bucket: string;
  /** Folder path the files land under. Its first segment must be the owner id
   *  the bucket's policy checks — see 0011_storage.sql. */
  prefix: string;
  slots: string[];
  /** Slots marked with a * in the label. Not enforced here; the wizard decides
   *  whether to block publishing, because a draft may legitimately lack them. */
  required?: string[];
}) {
  const [images, setImages] = useState<Record<string, UploadedImage>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fieldId = useId();

  async function upload(slot: string, file: File) {
    setBusy(slot);
    setError(null);

    // Slot name, not the original filename: filenames arrive with spaces,
    // non-ASCII and duplicates, and the slot is what identifies the photo
    // anyway. `upsert` so re-shooting a slot replaces it instead of
    // accumulating orphans.
    const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const path = `${prefix}/${slot.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.${ext}`;

    const supabase = createClient();
    const { error: upErr } = await supabase.storage
      .from(bucket)
      .upload(path, file, { upsert: true, contentType: file.type });

    if (upErr) {
      setError(upErr.message);
      setBusy(null);
      return;
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    setImages((prev) => ({ ...prev, [slot]: { slot, url: data.publicUrl, path } }));
    setBusy(null);
  }

  async function remove(slot: string) {
    const img = images[slot];
    if (!img) return;
    setBusy(slot);
    const supabase = createClient();
    await supabase.storage.from(bucket).remove([img.path]);
    setImages((prev) => {
      const next = { ...prev };
      delete next[slot];
      return next;
    });
    setBusy(null);
  }

  return (
    <div>
      <input type="hidden" name={name} value={JSON.stringify(Object.values(images))} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {slots.map((slot) => {
          const img = images[slot];
          const isBusy = busy === slot;
          const inputId = `${fieldId}-${slot}`;

          return (
            <div key={slot} className="flex flex-col gap-1.5">
              <label
                htmlFor={inputId}
                className={cn(
                  "relative grid aspect-square cursor-pointer place-items-center overflow-hidden rounded-md border border-dashed border-border text-caption text-text-muted",
                  "transition-colors duration-(--duration-instant) hover:border-primary hover:text-primary",
                  "focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-primary",
                  img && "border-solid",
                  isBusy && "opacity-60",
                )}
              >
                {img ? (
                  /* Plain <img>: a just-uploaded Storage URL, rendered at
                     thumbnail size. next/image would need the Supabase host
                     allowlisted in next.config for no visible benefit here. */
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={img.url} alt={slot} className="size-full object-cover" />
                ) : (
                  <span className="px-2 text-center">
                    {isBusy ? "Uploading…" : slot}
                    {required.includes(slot) && !isBusy && (
                      <span className="text-danger"> *</span>
                    )}
                  </span>
                )}
                <input
                  id={inputId}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  disabled={isBusy}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void upload(slot, f);
                    e.target.value = "";
                  }}
                />
              </label>

              {img && (
                <button
                  type="button"
                  onClick={() => void remove(slot)}
                  disabled={isBusy}
                  className="flex h-11 items-center justify-center rounded-md text-caption text-text-secondary transition-colors duration-(--duration-instant) hover:bg-bg-muted hover:text-danger"
                >
                  Remove {slot}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {error && (
        <p role="alert" className="mt-2 rounded-md bg-danger-bg px-3 py-2 text-caption text-danger">
          Upload failed: {error}
        </p>
      )}
    </div>
  );
}
