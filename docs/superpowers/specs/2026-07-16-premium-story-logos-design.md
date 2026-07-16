# Design: Premium bilingual kids stories from `story_logos`

**Date:** 2026-07-16  
**Status:** Approved in conversation (scope: all 16 stories; free users see locked cards)  
**Repo:** Engkids (`comic-lingua-kids`)

---

## 1. Context (from live codebase + DB)

### Live `stories` table columns
`id`, `title_en`, `title_vi`, `level`, `topics`, `cover_image`, `estimated_minutes`, `published`, `panels`, `vocabulary`, `games`, `curriculum_stage_id`, `created_at`, `updated_at`

- **No** `premium_only` / content-gate column today.
- **11** published stories already exist (fairy-tale style); covers live in Supabase Storage bucket `story-images`.
- Panel shape used in production:

```json
{
  "panel_id": 1,
  "image": "https://.../story-images/<id>/panel-1-....jpg",
  "sentence_en": "...",
  "sentence_vi": "...",
  "tokens": [{ "display", "norm", "lemma", "vi?" }]
}
```

- Vocab: `{ word, vi, ipa }`  
- Games: `{ match: [{word,vi}], fill_blank: [{sentence_en, answer, choices}] }`

### Premium today (users, not content)
- `user_profiles.is_premium`, `account_type`, `premium_until`
- Client helper: `checkPremiumStatus()` in `src/lib/freemium.ts` (admin = unlimited)
- Stories routes `/stories` and `/stories/*` are **public** in middleware (browse without login)
- Freemium daily time limit does **not** currently gate story reading specifically

### Cover assets
16 files under `story_logos/` (PNG/JPEG ~1–2MB each), titles encoded in filenames:

| File | Story EN title |
|------|----------------|
| Benny and the Blue Balloon.png | Benny and the Blue Balloon |
| Luna’s Lost Little Star.png | Luna's Lost Little Star |
| Milo and the Magic Backpack.png | Milo and the Magic Backpack |
| The Brave Tiny Turtle.png | The Brave Tiny Turtle |
| 6. The Moonlight Cookie Shop.png | The Moonlight Cookie Shop |
| 7. Oliver and the Friendly Dragon.png | Oliver and the Friendly Dragon |
| 8. Daisy's Dancing Shoes.png | Daisy's Dancing Shoes |
| 9. The Secret Treehouse Club.png | The Secret Treehouse Club |
| 10. Finn and the Talking Fish.png | Finn and the Talking Fish |
| 11. Mia's Wonderful Word Box.png | Mia's Wonderful Word Box |
| 14. Ruby's Robot Friend.png | Ruby's Robot Friend |
| 15. The Little Fox Who Loved English.png | The Little Fox Who Loved English |
| 16. Max and the Time-Traveling Clock.png | Max and the Time-Traveling Clock |
| 17. Sophie's Space School.png | Sophie's Space School |
| 18. The Mystery of the Missing Moon.png | The Mystery of the Missing Moon |
| 20. Emma's Amazing Animal Train.png | Emma's Amazing Animal Train |

### Content pipeline already in app
- Create path: admin → `POST /api/stories` → `createStory` → `storeStoryImages` (base64 → Supabase `story-images` or local uploads)
- List: `listStories()` filters `published = true` only
- Reader: `getStory(id)` returns full row including panels; **no premium strip**

---

## 2. Goal

1. Author **16 original, kid-friendly, bilingual (EN + VI)** stories matching the cover art themes.
2. Persist them in the **live Supabase `stories` table** with covers uploaded to **`story-images`**.
3. Mark them **premium-only**.
4. **Free users**: still see cards (cover + title) with lock badge; open → upgrade CTA `/pricing`.
5. **Premium + admin**: full reader (panels, vocab, games, TTS, click-to-learn).

Non-goals:
- Per-panel unique illustrations (only cover art exists) — reuse cover URL on each panel or a single shared cover path.
- Changing freemium daily minutes.
- Hiding premium stories entirely from free list.

---

## 3. Data model change

### Migration `035_story_premium_only.sql`

```sql
ALTER TABLE stories
  ADD COLUMN IF NOT EXISTS premium_only BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_stories_published_premium
  ON stories (published, premium_only);
```

- Existing 11 tales stay `premium_only = false` (free/public as today).
- New 16 logo stories set `premium_only = true`, `published = true`.

### TypeScript / validation
- `Story` in `src/types/index.ts`: `premium_only?: boolean` (default false when missing for legacy rows).
- `storySchema` in `src/lib/validations/story.ts`: optional/default `false`.
- Admin form: toggle “Chỉ Premium” in story info tab.
- `normalizeStory` in API routes: pass through `premium_only`.

### RLS note
Current RLS: published stories readable by everyone. **Keep that** so free users can list covers/titles via anon/service reader. Full panel lock is enforced in **application layer** (API + reader page), same pattern as freemium UI guards — not RLS-by-premium (premium is on `user_profiles`, not JWT claims easily for RLS).

---

## 4. Content design (each of 16 stories)

| Field | Rule |
|-------|------|
| `id` | slug `premium-<kebab-title>` e.g. `premium-benny-and-the-blue-balloon` |
| `level` | mostly `Beginner`; a few adventure ones `Elementary` |
| `curriculum_stage_id` | `a2-key` (matches existing tales) |
| `topics` | 2–3 from app topics (Animals, Adventure, Friendship, Fantasy, School, …) |
| `estimated_minutes` | 4–5 (~8 panels × 0.5) |
| `published` | `true` |
| `premium_only` | `true` |
| `panels` | **8** panels; short EN sentences (kid A1–A2), matching VI; tokens from vocab where useful |
| `vocabulary` | 6–8 key words `{ word, vi, ipa: "" }` |
| `games.match` | first 6 vocab pairs |
| `games.fill_blank` | 3 blanks from panels with real distractors (better than form’s `"other"/"words"` placeholders) |
| `cover_image` | public URL after upload to `story-images/<id>/cover-...` |
| panel `image` | same cover URL for all panels (only logo art available) + `image_alt` from title |

**Tone:** kind, funny, no violence/scary witches; positive English-learning moments where natural (Fox, Word Box, Space School, etc.).

---

## 5. Access control

### List (`/stories`, `GET /api/stories`)
- Still return **all published** stories including `premium_only`.
- Summaries include `premium_only` so UI can badge.

### Detail (`/stories/[id]`, `GET /api/stories/[id]`)
1. Load story (published).
2. If `!premium_only` → full story (current behavior).
3. If `premium_only`:
   - Resolve user via cookies / Supabase session.
   - Premium if: admin role **or** (`is_premium` / `account_type` premium/admin) **and** `premium_until > now()` — reuse same rules as `checkPremiumStatus` / profile API (server-side helper preferred).
   - **Allowed:** return full story.
   - **Denied:** do **not** expose full `panels` / `vocabulary` / `games` in JSON. Either:
     - HTTP 403 with `{ error: 'premium_required', story: summary }`, or
     - 200 with summary only + `locked: true`.
   - Reader page shows lock overlay + link to `/pricing` (not raw 404).

### Client UI
- `StoriesPageClient`: lock badge + Crown on premium cards; click still navigates to detail (detail handles CTA).
- Optional: soft-disable click on free with modal — detail page is source of truth.

### Server helper (new)
`src/lib/server/story-access.ts` (or under existing server libs):
- `isUserPremium(supabase, user): Promise<boolean>`
- `canReadPremiumStory(request): Promise<boolean>`
- Used by `GET /api/stories/[id]` and optionally server component page.

---

## 6. Seed / insert pipeline

**Script:** `scripts/seed-premium-story-logos.mjs`

1. Load `.env.local` (service role + Supabase URL).
2. For each of 16 stories in a JSON/TS content file (`data/premium-stories-from-logos.json` or embedded in script):
   - Read cover from `story_logos/<file>`.
   - Upload to Storage bucket `story-images` at `<id>/cover-<uuid>.png|jpg`.
   - Build full story object with panels/vocab/games.
   - `upsert` into `stories` on `id` (idempotent re-run).
3. Flags: `--dry-run`, `--apply` (default dry-run for safety).
4. Do **not** delete existing 11 free tales.

**Why script not only SQL:** binary covers must hit Storage; JSONB panels are large; matches `createStory` / `storeStoryImages` production path.

Also add SQL migration for the column only; content seed is operational script.

Copy logos optionally into `public/` is **not** required if Storage public URLs work (matches existing tales).

---

## 7. Files to touch

| Area | Files |
|------|--------|
| DB | `supabase/migrations/035_story_premium_only.sql` |
| Types / validation | `src/types/index.ts`, `src/lib/validations/story.ts` |
| Story service | `src/services/story.ts` (select columns if needed; summary includes premium_only) |
| API | `src/app/api/stories/route.ts`, `src/app/api/stories/[id]/route.ts` |
| Reader page | `src/app/stories/[id]/page.tsx` (+ small client lock component) |
| List UI | `src/components/pages/StoriesPageClient.tsx` |
| Admin | `src/hooks/useStoryForm.ts`, `src/components/admin/StoryForm.tsx` |
| Access helper | `src/lib/server/story-access.ts` (new) |
| Content + seed | `data/premium-stories-from-logos.json` (or mjs module), `scripts/seed-premium-story-logos.mjs` |
| package.json | optional script alias `stories:seed-premium-logos` |

---

## 8. Verification

1. Migration applied on Supabase (column exists, default false).
2. Seed `--apply`: 16 rows with `premium_only=true`, cover URLs 200 OK.
3. Anonymous / free user:
   - `/stories` shows 16 cards with Premium lock.
   - Open detail → lock CTA, no full sentences in network response.
4. Premium / admin: full reader works (panels, audio, save word).
5. Existing free tales still fully readable.
6. Admin create/edit can toggle `premium_only`.
7. Re-run seed is idempotent (upsert by id).

---

## 9. Risks & mitigations

| Risk | Mitigation |
|------|------------|
| Large cover files | Compress/resize on upload (max side ~1024, jpeg quality ~0.85) like admin form |
| Zod `cover_image` max 10000 | Use Storage URLs only (never inline multi-MB base64 in API payload after seed) |
| Free user scrapes list API for full panels | List can use summary columns; detail strips panels when locked |
| Admin bypass | Treat admin like premium (same as freemium) |
| Apostrophe in filename `Luna’s` | Normalize path carefully in seed script |

---

## 10. Implementation order

1. Migration `premium_only` + types/validation/admin toggle.
2. Server access helper + API/detail lock + list badge UI.
3. Author 16 story contents + seed script + run against live DB.
4. Manual verify free vs premium accounts.

---

## Approval

- Scope: **16 full stories**  
- Free UX: **card + lock**  
- Approach: **column `premium_only` + app-layer gate + Storage covers + seed script**  
- Conversation approval: 2026-07-16 (user selected recommended design)
