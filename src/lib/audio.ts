"use client";

/**
 * Audio cues — the second half of the motion system.
 *
 * Rules this file enforces (from POKECARD_PH_DESIGN_SYSTEM.md, "Audio system"):
 *  - Muted by default, opt-in per session, persisted to localStorage.
 *  - Two independent switches: SFX and ambient. Someone may want cue feedback
 *    without a storefront music bed.
 *  - `prefers-reduced-motion` suppresses audio too — people reducing motion are
 *    usually reducing sensory load generally.
 *  - One sound per event. Re-triggering a playing cue restarts it rather than
 *    layering a second voice on top.
 *  - Audio never carries information alone; every cue has a visual counterpart,
 *    so a muted session loses nothing. Nothing here should ever be the only
 *    signal for a state change.
 *
 * Cues are addressed by ROLE, never by filename. The underlying assets are
 * placeholders pending a licensing decision (they are recognisably first-party
 * Pokémon audio); swapping them should touch this map and nothing else.
 */

export type Cue =
  | "select" // tapping a card in a grid
  | "cart-add" // pairs with the 1 -> 1.08 -> 1 thumbnail bounce
  | "order-complete" // order status reaching `completed`
  | "listing-live" // listing published from the wizard        (Phase 2)
  | "auction-won" // winning an auction                        (Phase 4)
  | "tier-up" // crossing a billing tier                       (Phase 5)
  | "reveal"; // the 800ms silhouette cross-dissolve           (Phase 6)

const SFX_KEY = "pcph:sfx";
const AMBIENT_KEY = "pcph:ambient";

const cache = new Map<Cue, HTMLAudioElement>();

function reducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/** Off unless explicitly enabled. Browser autoplay policy blocks anything before
 *  a first user gesture anyway — design for that rather than fighting it. */
export function sfxEnabled(): boolean {
  if (typeof window === "undefined") return false;
  if (reducedMotion()) return false;
  return localStorage.getItem(SFX_KEY) === "on";
}

export function ambientEnabled(): boolean {
  if (typeof window === "undefined") return false;
  if (reducedMotion()) return false;
  return localStorage.getItem(AMBIENT_KEY) === "on";
}

export function setSfxEnabled(on: boolean) {
  localStorage.setItem(SFX_KEY, on ? "on" : "off");
}

export function setAmbientEnabled(on: boolean) {
  localStorage.setItem(AMBIENT_KEY, on ? "on" : "off");
}

/**
 * Play a cue. Silent no-op when disabled, under reduced motion, or when the
 * browser refuses playback (no gesture yet) — never throws, never blocks.
 */
export function play(cue: Cue) {
  if (!sfxEnabled()) return;

  let el = cache.get(cue);
  if (!el) {
    el = new Audio();
    // Opus where supported, mp3 elsewhere. Roughly half the bytes on Chrome.
    const canOpus = el.canPlayType('audio/webm; codecs="opus"');
    el.src = `/sfx/${cue}.${canOpus ? "webm" : "mp3"}`;
    el.preload = "auto";
    cache.set(cue, el);
  }

  // One sound per event — restart rather than layering a second voice.
  el.currentTime = 0;
  void el.play().catch(() => {
    /* autoplay blocked until first gesture; nothing to recover */
  });
}

/**
 * The storefront ambient bed. 29 seconds — music, not a cue. Never autoplays,
 * lives behind its own toggle, and fades out on navigation away.
 */
let ambient: HTMLAudioElement | null = null;

export function startAmbient() {
  if (!ambientEnabled() || ambient) return;
  ambient = new Audio("/sfx/ambient-storefront.mp3");
  ambient.loop = true;
  ambient.volume = 0;
  void ambient.play().catch(() => {});
  // Fade in rather than starting at full level.
  const target = 0.35;
  const step = target / 20;
  const id = setInterval(() => {
    if (!ambient) return clearInterval(id);
    ambient.volume = Math.min(target, ambient.volume + step);
    if (ambient.volume >= target) clearInterval(id);
  }, 40);
}

export function stopAmbient() {
  const el = ambient;
  if (!el) return;
  ambient = null;
  const id = setInterval(() => {
    el.volume = Math.max(0, el.volume - 0.05);
    if (el.volume <= 0) {
      el.pause();
      clearInterval(id);
    }
  }, 40);
}
