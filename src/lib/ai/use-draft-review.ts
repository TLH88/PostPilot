"use client";

/**
 * Studio AI client orchestration hook.
 *
 * Owns the trigger logic, rate limit, daily cap, mute state, and the
 * latest review payload for one draft. The host (post editor page) wires
 * the live content into `setContent()` on every change; the hook decides
 * when to fire `/api/ai/review-draft`.
 *
 * Trigger rules (matches the Phase 1 spec):
 *   - Initial review on mount if `content.length > 0`.
 *   - Re-review after 10s idle when ≥40 chars have changed since the last
 *     review (uses `diffEdits` length to measure).
 *   - Hard 30s rate limit between calls regardless of edit volume.
 *   - Per-draft soft cap of 20 reviews per UTC day (localStorage).
 *   - Mute toggle (localStorage per-draft) suspends all triggers.
 *
 * Gate handling: if the endpoint returns 402 with code `tier_gate` or
 * `byok_required`, the hook surfaces it via `gate` so the panel can
 * render an upsell/setup nudge instead of cards.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type { ReviewResponse } from "@/lib/ai/review-prompts";
import { diffEdits } from "@/lib/ai/diff-edits";

const IDLE_DEBOUNCE_MS = 10_000;
const RATE_LIMIT_MS = 30_000;
const MIN_EDIT_CHARS = 40;
const DAY_CAP = 20;

type StudioGate = "tier_gate" | "byok_required";
export type StudioTriggerState = "reading" | "idle" | "paused" | "error";

interface DayCounter {
  date: string; // YYYY-MM-DD UTC
  count: number;
}

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

function readDayCounter(postId: string): DayCounter {
  if (typeof window === "undefined") return { date: todayUtc(), count: 0 };
  try {
    const raw = localStorage.getItem(`studio-ai:cap:${postId}`);
    if (!raw) return { date: todayUtc(), count: 0 };
    const parsed = JSON.parse(raw) as DayCounter;
    if (parsed.date !== todayUtc()) return { date: todayUtc(), count: 0 };
    return parsed;
  } catch {
    return { date: todayUtc(), count: 0 };
  }
}

function writeDayCounter(postId: string, counter: DayCounter) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(`studio-ai:cap:${postId}`, JSON.stringify(counter));
  } catch {
    /* quota / private mode → swallow */
  }
}

function readMuted(postId: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(`studio-ai:mute:${postId}`) === "1";
  } catch {
    return false;
  }
}

function writeMuted(postId: string, muted: boolean) {
  if (typeof window === "undefined") return;
  try {
    if (muted) localStorage.setItem(`studio-ai:mute:${postId}`, "1");
    else localStorage.removeItem(`studio-ai:mute:${postId}`);
  } catch {
    /* swallow */
  }
}

export interface UseDraftReviewOptions {
  postId: string;
  content: string;
  title?: string;
  contentPillar?: string;
  /**
   * Whether the AI panel is open. Reviews only fire while the panel is
   * visible — there's no point spending tokens on suggestions the user
   * can't see.
   */
  panelOpen: boolean;
  /** When false, AI is instructed to avoid em-dashes in its suggestions. */
  allowEmDashes?: boolean;
}

export interface UseDraftReviewResult {
  state: StudioTriggerState;
  review: ReviewResponse | null;
  /** Hash of the content the current `review` was computed against. */
  reviewedHash: string | null;
  gate: StudioGate | null;
  gateMessage: string | null;
  muted: boolean;
  toggleMuted: () => void;
  /** True once the daily cap has been hit. */
  capReached: boolean;
  /** Fire a review immediately (still subject to the 30s rate limit). */
  refresh: () => void;
}

export function useDraftReview({
  postId,
  content,
  title,
  contentPillar,
  panelOpen,
  allowEmDashes,
}: UseDraftReviewOptions): UseDraftReviewResult {
  const [state, setState] = useState<StudioTriggerState>("idle");
  const [review, setReview] = useState<ReviewResponse | null>(null);
  const [reviewedHash, setReviewedHash] = useState<string | null>(null);
  const [gate, setGate] = useState<StudioGate | null>(null);
  const [gateMessage, setGateMessage] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const [capReached, setCapReached] = useState(false);

  const lastFiredAtRef = useRef<number>(0);
  const lastReviewedContentRef = useRef<string>("");
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlightRef = useRef<boolean>(false);
  const initialFiredRef = useRef<boolean>(false);

  // Hydrate per-draft localStorage state on mount / postId change.
  useEffect(() => {
    setMuted(readMuted(postId));
    setCapReached(readDayCounter(postId).count >= DAY_CAP);
    initialFiredRef.current = false;
    lastFiredAtRef.current = 0;
    lastReviewedContentRef.current = "";
    setReview(null);
    setReviewedHash(null);
    setGate(null);
    setGateMessage(null);
    setState("idle");
  }, [postId]);

  const fireReview = useCallback(async () => {
    if (inFlightRef.current) return;
    if (muted) return;
    if (!panelOpen) return;
    if (!content || content.trim().length < 20) return;
    if (gate) return; // a permanent gate has already shut us down

    // Daily cap
    const counter = readDayCounter(postId);
    if (counter.count >= DAY_CAP) {
      setCapReached(true);
      return;
    }

    // Rate limit
    if (Date.now() - lastFiredAtRef.current < RATE_LIMIT_MS) return;

    inFlightRef.current = true;
    lastFiredAtRef.current = Date.now();
    setState("reading");

    try {
      const res = await fetch("/api/ai/review-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId, content, title, contentPillar, allowEmDashes }),
      });

      if (res.status === 402) {
        const body = (await res.json().catch(() => ({}))) as {
          code?: StudioGate;
          error?: string;
          action?: string;
        };
        const code = body.code === "tier_gate" || body.code === "byok_required"
          ? body.code
          : "tier_gate";
        setGate(code);
        setGateMessage(body.action ?? body.error ?? null);
        setState("paused");
        return;
      }

      if (!res.ok) {
        setState("error");
        return;
      }

      const data = (await res.json()) as ReviewResponse & { contentHash: string };
      setReview({
        hook: data.hook,
        overall: data.overall,
        close: data.close,
      });
      setReviewedHash(data.contentHash);
      lastReviewedContentRef.current = content;
      setState("idle");

      // Bump day counter
      const next = { date: todayUtc(), count: counter.count + 1 };
      writeDayCounter(postId, next);
      if (next.count >= DAY_CAP) setCapReached(true);
    } catch (err) {
      console.error("Studio AI review failed", err);
      setState("error");
    } finally {
      inFlightRef.current = false;
    }
  }, [allowEmDashes, content, contentPillar, gate, muted, panelOpen, postId, title]);

  // Initial review when panel opens with non-empty content.
  useEffect(() => {
    if (!panelOpen) return;
    if (initialFiredRef.current) return;
    if (!content || content.trim().length < 20) return;
    if (muted || gate || capReached) return;
    initialFiredRef.current = true;
    void fireReview();
  }, [panelOpen, content, muted, gate, capReached, fireReview]);

  // Idle re-review on meaningful edits.
  useEffect(() => {
    if (!panelOpen || muted || gate || capReached) return;
    if (!content) return;
    // Need an existing review to diff against; otherwise the initial-review
    // effect above handles it.
    if (!lastReviewedContentRef.current) return;

    const diff = diffEdits(lastReviewedContentRef.current, content);
    if (diff.length < MIN_EDIT_CHARS) return;

    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      void fireReview();
    }, IDLE_DEBOUNCE_MS);

    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [content, panelOpen, muted, gate, capReached, fireReview]);

  const toggleMuted = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      writeMuted(postId, next);
      setState(next ? "paused" : "idle");
      return next;
    });
  }, [postId]);

  const refresh = useCallback(() => {
    initialFiredRef.current = true;
    void fireReview();
  }, [fireReview]);

  return {
    state,
    review,
    reviewedHash,
    gate,
    gateMessage,
    muted,
    toggleMuted,
    capReached,
    refresh,
  };
}
