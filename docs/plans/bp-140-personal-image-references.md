# BP-140 — Personal Reference Photos for AI Image Generation

> Author: Design agent (general-purpose), 2026-04-26
> Source feedback: [USER_FEEDBACK.md UF-006](../USER_FEEDBACK.md)
> Backlog: [BACKLOG.md BP-140](../BACKLOG.md)
>
> **Status:** Awaiting owner review and decisions on the five open questions listed at the end.

---

## Why this design doc exists

DALL·E 3 — the provider currently powering PostPilot image generation — does not accept image inputs. "Add a reference photo" sounds like a one-day feature; it actually requires choosing a different AI provider, a dedicated storage bucket with GDPR-grade cleanup, a consent flow, ToS updates, and a quota model revision. This document works through all of that so no engineering time is wasted on the wrong foundation.

---

## 1. Provider Research + Recommendation

### Comparison matrix

| Dimension | **OpenAI gpt-image-1** | **Google Gemini 2.0 Flash Image** [^gemini-naming] | **Fal.ai — Flux + IP-Adapter (open-weights)** |
|---|---|---|---|
| **Image input (reference)** | Yes — `input_image` parameter (multipart upload) | Yes — `inline_data` in the parts array | Yes — `image_url` IP-Adapter conditioning input |
| **Output quality for human likeness** | High. Preserves face structure well at 1024×1024; tends toward polished/editorial look | Medium-high. Good stylistic range; likeness fidelity slightly softer than gpt-image-1 | Variable. Flux Schnell + IP-Adapter is fast and cheap; Flux Dev or Flux Pro + IP-Adapter is near-comparable to gpt-image-1. Quality depends on LoRA/adapter weights used |
| **Cost per image (system key)** | ~$0.08–$0.17 (1024×1024, standard quality; high quality ~$0.19) | ~$0.039 (Gemini 2.0 Flash Experimental, multimodal output) | ~$0.03–$0.06 (Fal.ai Flux Schnell IP-Adapter); ~$0.07–$0.12 (Flux Dev/Pro IP-Adapter) |
| **API maturity** | GA as of early 2025. Well-documented, stable. | Experimental/preview as of Q1 2026. Output image API is newer, rate limits apply, format can change | GA on Fal.ai. Replicate also offers compatible endpoints. Fal is the more production-ready host |
| **BYOK feasibility for Pro+** | Yes — user provides OpenAI API key (same key as text generation) | Separate Google Cloud / Gemini API key. Adds BYOK complexity (second key type to manage) | Yes — user provides Fal.ai API key. Different provider ecosystem; another third-party key |
| **Likeness-specific ToS / safety** | OpenAI Usage Policy prohibits generating deceptive content or impersonating real people without consent. Personal use by the subject themselves is generally permitted. "Faces of real people" policy requires the subject is the uploader | Google Gemini ToS prohibits generating content that "misleads users about real people." Same carve-out: the user is generating their own likeness | Fal.ai follows the model card of the underlying weights. FLUX models have permissive licenses (FLUX.1-dev is Apache 2.0 for Schnell, commercial license for Dev/Pro). IP-Adapter is Apache 2.0. No faces-of-real-people restriction beyond general "don't deepfake without consent" |
| **LinkedIn image spec compliance** | 1024×1024 or 1792×1024; needs resize/crop for LinkedIn 1.91:1 feed image | Same; output aspect ratio configurable | Output resolution configurable via endpoint params. Fal supports 1024×576 and other LinkedIn-friendly ratios natively |

### Recommendation: gpt-image-1 as primary, Fal.ai Flux + IP-Adapter as BYOK / Pro+ fallback

**Primary: gpt-image-1.**

gpt-image-1 is the highest-fidelity option for human likeness and is already in PostPilot's ecosystem (OpenAI is the existing image-gen provider via DALL·E 3). Migrating from DALL·E 3 to gpt-image-1 reuses the same API key, same client library, and the same server-side route. It's a near-drop-in upgrade. The cost increase versus DALL·E 3 ($0.04–0.08 → $0.08–0.17) is real but justified by the capability gap — reference-image generation is a premium feature and should be treated as such in quotas (see Section 5).

**Fallback / BYOK option: Fal.ai Flux Dev + IP-Adapter.**

For Pro+ users who bring their own key, Fal.ai is the cleanest option: lower cost per image (~$0.07–0.10), Apache/commercial-licensed weights, no faces-specific restrictions, and Fal's managed hosting means no GPU provisioning. BYOK users who want cheap, high-volume reference generation can supply a Fal.ai API key alongside their existing OpenAI key. This aligns with BP-125's "image-gen BYOK" work already planned.

**Do not use Gemini 2.0 Flash Image as the primary.** It is still experimental, its rate limits are unpredictable, and adding a Google Cloud credential type creates a third BYOK provider to manage — complexity without enough quality uplift to justify it. Revisit Gemini when the API reaches stable GA.

[^gemini-naming]: The original BP-140 entry referenced "Gemini 2.5 Image" as a candidate. As of Q1 2026, Gemini 2.5 Image was not yet exposed via a public, stable API for image *generation* with `inline_data` reference inputs — Google's available endpoint at this writing is the Gemini 2.0 Flash multimodal-output preview. This doc evaluates what is actually callable today; revisit when 2.5 Image GA's.

---

## 2. Privacy + Storage Design

### Bucket choice

Create a **new `user-references` Supabase Storage bucket** — do not co-locate reference photos in `post-images`.

Rationale: reference photos are biometric-adjacent data (face photos). Mixing them with generated post images conflates two different retention horizons, two different deletion semantics, and makes RLS simpler to audit if they're isolated. A dedicated bucket makes it trivially obvious to any future engineer that this data is sensitive.

**Bucket settings:**

```
Bucket:         user-references
Access:         Private (never public)
RLS policy:     Users can only SELECT/INSERT/DELETE objects under their own user_id prefix
Admin:          Service-role key only for deletion during account cleanup
Max object size: 10 MB per file
Allowed MIME:   image/jpeg, image/png, image/webp
```

### Object path convention

```
user-references/<user_id>/<photo_id>.<ext>
```

Example:

```
user-references/a1b2c3d4-e5f6.../ref_01_20260426.jpg
```

`photo_id` is a UUID generated at upload time. No sequential IDs, no predictable paths.

### Retention rules

| Rule | Value | Rationale |
|---|---|---|
| Max photos per user | **5** | Enough for natural variation (different outfits, headshots); limits storage abuse |
| Auto-expire unused photos | No auto-expire in Phase 1 | Keep it simple; revisit if storage costs spike |
| On account deletion | Hard delete — all objects under `user-references/<user_id>/` | GDPR right-to-erasure; same pattern as resumes/post-images |
| On user request | Immediate hard delete from bucket + DB row | User-initiated, from Settings → Reference Photos |

### Deletion-on-account-delete cascade

The existing `cleanupUserStorage()` function in `src/lib/account/storage-cleanup.ts` iterates over `USER_BUCKETS` (currently `["resumes", "post-images"]`). **The implementation must add `"user-references"` to that array.** Because this is a constant array, the change is a single-line addition, and the existing pagination + error-handling logic applies automatically.

No separate Edge Function or migration is needed — the hook into BP-131 is purely additive.

### Database table

A lightweight `user_reference_photos` table tracks metadata:

```sql
create table user_reference_photos (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  storage_path text not null,           -- full path: user-references/<user_id>/<photo_id>.<ext>
  label        text,                    -- optional user-set label e.g. "Headshot 2026"
  is_primary   boolean not null default false,
  created_at   timestamptz not null default now()
);

-- Only one primary per user
create unique index on user_reference_photos(user_id) where is_primary = true;

-- RLS
alter table user_reference_photos enable row level security;
create policy "users manage own reference photos"
  on user_reference_photos for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

The `on delete cascade` on `user_id` handles DB row cleanup when auth.users is deleted. Storage object cleanup is handled by `cleanupUserStorage()` as noted above.

### Consent flow

A user must complete a one-time **in-app consent acknowledgement** before uploading their first reference photo. This is separate from (and in addition to) the ToS update described in Section 3. It presents only once, is stored in the DB (a `reference_photos_consent_at` timestamptz column on `user_profiles`), and gates the upload UI.

---

## 3. Likeness Rights + ToS

### Gap analysis

PostPilot's current ToS covers user-generated content in general terms. It does not specifically address:
- User uploading biometric data (face photos) to the platform
- PostPilot passing that biometric data to a third-party AI provider (OpenAI)
- The platform generating synthetic images derived from the user's likeness
- Retention and deletion of that data

All four need to be covered before Phase 1 ships.

### Recommended ToS additions

Add a new subsection titled **"Reference Photos and AI Image Generation"** containing the following language (owner should have a lawyer review before shipping):

```
Reference Photos and AI Image Generation

If you choose to upload reference photos to PostPilot (the "Reference Photos" feature), you grant PostPilot a limited, revocable license to process those images solely for the purpose of generating AI-assisted images for your posts. Specifically:

1. We will transmit your reference photos to our AI image-generation provider (currently OpenAI) on your behalf, subject to OpenAI's usage policies.
2. You represent that you are the individual depicted in any reference photo you upload, or that you have the explicit consent of that individual.
3. You may delete your reference photos at any time from Settings → Reference Photos. Deleted photos are removed from PostPilot's storage immediately and are no longer transmitted to AI providers.
4. Reference photos are stored in a private, access-controlled bucket and are not visible to other users, to PostPilot staff, or to third parties except as required to fulfill the image-generation request.
5. PostPilot does not use reference photos to train AI models.
6. We do not generate images that depict other identifiable individuals without their consent; the Reference Photos feature is intended solely for users generating images of themselves.
```

### Consent click requirement

**Both** a ToS update and a one-time in-app consent click are required. The ToS update alone is not sufficient because:
- Face photo upload is a qualitatively different data action than ordinary SaaS usage
- Regulators in GDPR jurisdictions require explicit, affirmative consent for biometric data processing (not implied consent via ToS acceptance at signup)
- It surfaces the commitment clearly at the moment of action

**Consent modal copy (shown once, before first upload):**

```
Headline:  Before you upload a reference photo

Body:      PostPilot will use your photo to personalize AI-generated images
           for your posts. To do this, your photo is sent to OpenAI's image
           API — it is not stored by OpenAI for model training.

           Your photo stays private: only you can see or delete it.
           You can remove it at any time in Settings.

           By continuing, you confirm that this photo shows you (or
           that the person shown has given you permission), and you agree
           to PostPilot's updated Terms of Service.

           [Read updated Terms →]  (link, opens in new tab)

Buttons:   [Cancel]   [I understand — continue]
```

The "Cancel" path returns the user to Settings without uploading. The consent timestamp is written to `user_profiles.reference_photos_consent_at` only on the affirmative click.

---

## 4. UX Flow

### Where the upload lives

**Settings → Reference Photos** (new page, Phase 1). Per-post upload is a Phase 3 enhancement.

Rationale: a reference photo is a profile-level asset — it represents the user across all their posts. Uploading it once in Settings, like a profile picture, matches the mental model. Per-post upload adds complexity and upload friction at exactly the moment the user is trying to focus on writing. Ship the Settings-based flow first, validate usage, then decide if per-post is worth the additional surface area.

### Settings → Reference Photos page (ASCII wireframe)

```
┌─────────────────────────────────────────────────────────────────┐
│  Settings                                                        │
│  ─────────────────────────────────────────────────────────────  │
│  Profile   Billing   AI Settings   Reference Photos   ← active  │
│                                                                  │
│  Reference Photos                                                │
│  Use a photo of yourself to personalize AI-generated images.     │
│  ─────────────────────────────────────────────────────────────  │
│                                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐   │
│  │          │  │          │  │          │  │              │   │
│  │ [photo1] │  │ [photo2] │  │ [photo3] │  │  + Add photo │   │
│  │          │  │          │  │          │  │              │   │
│  │ ★ Primary│  │          │  │          │  │  (up to 5)   │   │
│  │ [Delete] │  │ [Set     │  │ [Set     │  │              │   │
│  │          │  │  primary]│  │  primary]│  │              │   │
│  │          │  │ [Delete] │  │ [Delete] │  │              │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────────┘   │
│                                                                  │
│  The primary photo is used by default when "Use my reference    │
│  photo" is enabled during image generation.                      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Upload component behavior:**
- Clicking "+ Add photo" opens the native file picker (JPEG, PNG, WebP; max 10 MB)
- If no consent yet: show the consent modal first; file picker opens only after affirmative click
- On upload: show a loading spinner on the card slot; write to Supabase Storage then insert the DB row
- On success: the new photo appears in the grid; if it is the user's first photo, it is automatically set as primary
- On error: toast "Couldn't upload photo — please try again." (do not leak storage errors)
- At 5 photos: "+ Add photo" card is hidden; a note reads "You've reached the 5-photo limit. Delete a photo to add a new one."

**Photo management:**
- **Delete:** clicking "Delete" on any photo shows an inline confirmation: "Remove this photo? It will no longer be used in image generation." Confirm button: "Remove photo". Cancel: "Keep it". Deletion hits storage + DB immediately; no soft delete.
- **Set primary:** clicking "Set primary" on a non-primary photo updates the `is_primary` flag (flips the previous primary to false). The star badge moves instantly (optimistic update).
- **No rename in Phase 1.** The optional `label` column in the DB is reserved for a future enhancement.

### How the reference is applied during image generation

**Explicit toggle — "Use my reference photo" — is the recommendation.** Do not silently inject the reference for all users who have one uploaded. Reasons:
1. A user may want professional posts with a branded graphic and personal posts with their face — they need control per generation
2. A user may have uploaded a reference but not want every image to feature them (e.g., a quote card, an abstract background)
3. Silent injection is a surprise; explicit toggle is informed consent in action

**Toggle placement in the image generation panel:**

```
┌─────────────────────────────────────────────────────────────────┐
│  Generate image                                                  │
│  ─────────────────────────────────────────────────────────────  │
│  Prompt: [auto-filled from post content]       [Edit prompt]    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Use my reference photo                          [○ Off] │   │  ← toggle
│  │  Uses your primary reference photo to personalize       │   │
│  │  the generated image.  [Manage photos →]               │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  Style: [Auto] [Professional] [Bold] [Minimal]                  │
│                                                                  │
│                              [Generate image]                    │
└─────────────────────────────────────────────────────────────────┘
```

If the user has no reference photos uploaded, the toggle row is replaced with:

```
│  Want to personalize images with your photo?                    │
│  [Upload a reference photo →]  (links to Settings)             │
```

**Toggle state persistence:** store last-used state in a new `user_profiles.use_reference_image_default boolean` column. Cross-device consistency matters for a settings-level preference; localStorage would silently reset whenever the user switches browser, device, or clears site data. Default: `false` for new users (preserves current behavior + matches the consent-required model).

**Copy library for this feature:**

| Element | Copy |
|---|---|
| Settings nav label | `Reference Photos` |
| Page heading | `Reference Photos` |
| Page subheading | `Use a photo of yourself to personalize AI-generated images.` |
| Add button | `+ Add photo` |
| Capacity warning | `You've reached the 5-photo limit. Delete a photo to add a new one.` |
| Primary badge | `★ Primary` |
| Set primary button | `Set primary` |
| Delete button | `Delete` |
| Delete confirmation heading | `Remove this photo?` |
| Delete confirmation body | `It will no longer be used in image generation.` |
| Delete confirm button | `Remove photo` |
| Delete cancel button | `Keep it` |
| Upload success toast | `Reference photo added.` |
| Upload error toast | `Couldn't upload photo — please try again.` |
| Delete success toast | `Reference photo removed.` |
| Image gen toggle label | `Use my reference photo` |
| Image gen toggle subtext | `Uses your primary reference photo to personalize the generated image.` |
| Manage link | `Manage photos →` |
| No-photos nudge | `Want to personalize images with your photo?` |
| No-photos link | `Upload a reference photo →` |
| Consent modal headline | `Before you upload a reference photo` |
| Consent modal primary button | `I understand — continue` |
| Consent modal cancel button | `Cancel` |

---

## 5. Cost + Quotas

### Baseline vs reference-augmented cost per image

Using gpt-image-1 (the recommended primary provider):

| Scenario | Cost per image | Notes |
|---|---|---|
| Standard generation (no reference), 1024×1024 | ~$0.08 | Current DALL·E 3 equivalent; gpt-image-1 standard quality |
| Reference-augmented generation, 1024×1024 | ~$0.17 | gpt-image-1 high quality. **Caveat:** this assumes reference (`input_image`) calls require the higher quality tier; this assumption needs verification against current OpenAI gpt-image-1 docs before BP-123 closes. If standard quality accepts `input_image`, the cost drops to ~$0.08 and the margin math relaxes — re-evaluate the 50/month cap upward in that case. |
| Premium/HD without reference | ~$0.12 | Mid-tier option |

**Uplift factor: approximately 2×** for reference-augmented vs standard generation.

### Worst-case monthly cost per Pro-tier user (system key, no BYOK)

Pro tier quota: 200 image generations per month.

| Scenario | Cost to PostPilot |
|---|---|
| 200 standard generations (no reference) | $16.00/user/month |
| 200 reference-augmented generations (all use reference toggle) | $34.00/user/month |
| Realistic mixed (50% reference, 50% standard) | $25.00/user/month |

At $50/month revenue per Pro user, the worst case ($34.00 image-gen cost alone) leaves only $16/month for all other AI operations (post drafts, brainstorms, chat) plus infrastructure. This is a significant margin hit if reference usage is widespread.

### Quota recommendation: separate sub-quota for reference-augmented generations

**Do not** share the reference-augmented budget with the standard `image_generation` quota counter. Instead, introduce a sub-quota:

```
image_generation:          200 / month   (standard, no reference)
image_generation_reference: 50 / month   (reference-augmented, any quality)
```

Rationale:
- This matches the cost asymmetry (reference calls cost ~2× more)
- It limits downside without preventing users from exploring the feature
- 50 reference-augmented images per month is generous for a LinkedIn creator (most users post 4–20 times per month; they won't use reference on every post)
- Users who hit the 50-reference limit can still generate standard images against their 200-image quota
- The quota model is already per-feature (BP-117); adding a sub-bucket for this feature is a natural extension, not a new pattern
- BYOK Pro+ users are unlimited on both counters, matching the existing BYOK-unlocks-unlimited promise

**BP-123 cost study impact:** the study must be updated to include a "reference-augmented image gen" row with the 2× cost multiplier and the 50/month cap. At 50 calls × $0.17 = $8.50/user/month worst case for reference images alone — tolerable within the Pro margin even before considering that most users won't hit the cap.

**BP-117 quota refactor impact:** the `image_generation_reference` counter is a new quota key that must be added to the quota enforcement middleware. It gates the `/api/ai/generate-image` route when the `use_reference=true` parameter is present.

**Tier availability:**

| Tier | Standard image gen | Reference-augmented image gen |
|---|---|---|
| Free | No (not currently offered) | No |
| Personal | TBD per BP-123 | No (system key cost too high at Personal margin) |
| Professional (system) | 200/month | 50/month |
| Professional (BYOK) | Unlimited | Unlimited |
| Team | Unlimited | Unlimited |

Personal tier is excluded from reference generation in Phase 1. The margin math doesn't support it, and the feature is a premium differentiator for Pro. Revisit if Personal pricing changes.

---

## Implementation Phasing

### Phase 1 — Storage, consent, and Settings UI (no AI integration yet)

- Create `user-references` Supabase Storage bucket with private access + RLS
- Migration: `user_reference_photos` table + `reference_photos_consent_at` on `user_profiles`
- Add `"user-references"` to `USER_BUCKETS` in `src/lib/account/storage-cleanup.ts`
- ToS update (legal review required)
- Settings → Reference Photos page: upload, grid, delete, set-primary, consent modal
- No image generation integration in this phase — users can manage photos but the toggle in the image gen panel shows as "Coming soon"

**Effort:** M (1–2 sprints)

### Phase 2 — Provider integration + generation toggle

- Migrate image-gen route from DALL·E 3 to gpt-image-1 (or support both; gpt-image-1 for reference calls, DALL·E 3 for standard)
- Add `use_reference` parameter to `/api/ai/generate-image`; when true, fetch the user's primary reference photo from storage and pass it as the `input_image`
- Add `image_generation_reference` quota counter to BP-117's enforcement middleware
- Image gen panel: "Use my reference photo" toggle (explicit, default Off)
- Fal.ai Flux + IP-Adapter integration for BYOK Pro+ users who supply a Fal key (depends on BP-125 BYOK image-gen work)
- Update BP-123 cost study to include reference-augmented pricing

**Effort:** L (2–3 sprints; depends on BP-117 and BP-125 landing first)

### Phase 3 — Per-post upload + photo management enhancements (post-launch)

- Per-post reference photo upload (in the image gen panel, for one-off use without saving to Settings)
- Photo labeling ("Headshot 2026", "Conference look")
- Multiple reference photos selectable at gen time (not just primary)
- Revisit Gemini image output API if it reaches stable GA

**Effort:** M (1–2 sprints)

---

## Open Questions for the Owner

Before Phase 1 implementation can begin, the owner needs to answer these questions:

**1. Is reference-image generation gated to Professional tier only, or should Personal tier get a smaller allowance (e.g., 10/month)?**
Recommendation: Pro only for Phase 1. But if Personal users are a meaningful revenue segment and this is a key retention feature, a smaller allowance might be worth the margin hit.

**2. Do you want a lawyer to review the ToS language before Phase 1 ships, or will you treat the suggested language as final?**
This doc includes draft language, but PostPilot is handling biometric-adjacent data. A one-hour legal review is inexpensive insurance before collecting any user face photos.

**3. Should the "Use my reference photo" toggle default to On for users who have uploaded a photo, or always default to Off?**
Recommendation: always default to Off (explicit opt-in per generation). Defaulting to On is more "magical" but risks surprising users and creates implicit consent concerns. Pick one and it becomes the permanent behavior.

**4. Is 50 reference-augmented generations per month (Pro system-key) the right cap, or should it be lower (e.g., 20) given the 2× cost?**
At 50 × $0.17 = $8.50 worst-case cost, the margin is tight but workable. If you want a tighter safety margin before you have real usage data, start at 20 and increase when BP-123's cost study confirms headroom.

**5. Do you want to allow users to select a non-primary reference photo at generation time (Phase 2), or lock Phase 2 to "primary photo only" and defer multi-photo selection to Phase 3?**
Recommendation: primary-only in Phase 2 to keep the UI simple. Multi-photo selection is a nice-to-have but adds a picker UI inside an already-busy image gen panel.

---

## Effort Summary

| Phase | Scope | Estimate |
|---|---|---|
| Design (this doc) | M | Done |
| Phase 1 — Storage + Settings UI + consent | M | 1–2 sprints |
| Phase 2 — Provider integration + toggle + quotas | L | 2–3 sprints (blocked on BP-117, BP-125) |
| Phase 3 — Per-post upload + enhancements | M | 1–2 sprints (post-launch, unscheduled) |

**Total implementation estimate:** L–XL depending on BP-117 and BP-125 readiness.

**Expected ROI:** High. "Posts that look like you" is a genuine differentiator for LinkedIn creators — it moves PostPilot from "generic AI content tool" to "your personal brand, end to end." Phase 2 alone is a premium feature worth promoting on the pricing page.

---

## ⚠ Owner decisions before Phase 1 can begin

1. **Confirm Pro-only gating** (or specify a Personal-tier allowance).
2. **Legal review** of the ToS language — yes or no?
3. **Toggle default** — Off (recommended) or On for users with an uploaded photo?
4. **Reference quota cap** — confirm 50/month, or override lower (e.g., 20) if you want a tighter Phase 1 ceiling. Recommendation stands at 50.
5. **Phase 2 scope** — primary-photo-only (recommended) or include multi-photo selection?
