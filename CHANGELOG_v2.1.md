# ESL Learning — Update Notes (this package)

## 0. Simplified to a fully local, sync-free app

Removed every external data-sync integration: GitHub sync (per-user backup
and shared-curriculum push), Google Sheet auto-sync, and CSV/JSON
import/export. The app now has exactly one vocabulary source — the
built-in 9,142-word curriculum (`src/data/defaultVocabulary.json`),
bundled directly into the app and loaded straight into memory, duplicates
and all. Everything else (a learner's own added words, study progress,
streaks, settings) lives only in that browser's local storage.

**Admin Panel** is now just two tabs: **Users** and **AI Keys**. The AI
Keys tab now also powers a new **AI Vocabulary Lesson** feature on the
Practice page — a mini-lesson + quiz generated on demand from the
built-in word list using the same Gemini key that already powered
writing/speaking feedback.

No secrets or environment variables are needed to build or deploy this
app anymore — the GitHub Pages / Cloudflare Pages workflows were
simplified accordingly.

## 1. "Still loading…" stuck-boot screen — auto-recovery added

That screen was already a deliberate safety net (see `index.html`) that
appears when the app fails to start within 6 seconds — most commonly caused
by a stale service worker / browser cache still pointing at JS files from a
previous deploy (every deploy replaces all filenames with new hashes, so old
cached references 404 silently). Previously the ONLY fix was a human seeing
the message and tapping the button after already waiting 6 seconds.

**What changed (`index.html`):**
- The page now listens for the exact failure directly (a script/stylesheet
  404, or a lazy page-chunk import failing) and clears the stale
  cache + service worker and reloads **immediately** and **automatically** —
  no more waiting for the timeout, and for most people the broken-cache
  screen won't appear at all anymore, it'll just silently self-heal on the
  very first failed load.
- Capped to one automatic attempt per browser tab session so it can never
  loop; a manual tap on the button always still works regardless.
- This is a client-side self-heal only. It cannot fix a genuinely broken
  deploy (e.g. a real build error on the server) — only stale-cache cases,
  which is what the existing safety-net message describes.

## 2. Built-in ~5,500-word default vocabulary bank

Added `src/data/defaultVocabulary.json` — cleaned, de-duplicated, and
normalized from the supplied `7000_ESL_Learning.json` (actually a CSV):

- **5,483 unique words** (source had 7,076 rows; 1,593 were exact duplicates
  and were merged, keeping the most complete copy of each)
- 7 rows with corrupted/column-shifted source data (e.g. "million",
  "conservation", "livestock", "boutique", "cay", "desert", "fjord") were
  manually repaired rather than imported broken
- Each entry has: word, definition, part of speech, CEFR level (A1–C2),
  example sentence, difficulty, and — where present in the source —
  synonym, antonym, category, Lao translation, Thai translation
- 174 categories, spread across all 6 CEFR levels

**How it's wired in (`src/App.tsx`, `src/hooks/useVocabulary.ts`):**
- Seeded automatically into the shared curriculum store the first time a
  browser has none (fresh install, or after a full data reset) — no admin
  setup required.
- Loaded via a **dynamic import**, so it's its own ~295KB (gzipped) chunk
  fetched only after login, in the background — it never blocks or slows
  down the initial app boot.
- Uses the existing add-only merge path, so it never overwrites or removes
  anything an admin has already pushed via Google Sheet / GitHub sync, and
  never re-seeds once any shared curriculum exists.
- Because every study mode (Flashcards, Quiz, Matching, Spelling,
  Categories, Level Journey, Word List, Favorites) already reads from the
  same shared `vocabulary.words` list, all of them get the full word bank
  automatically — no per-feature changes needed.

## Deploying
Same as before — push this to your `esl.learning` repo's `main` branch (or
wherever your GitHub Actions Pages workflow builds from). No new secrets or
config needed for the word bank; it's baked into the build.

## 3. Category cleanup (this update)

Reviewed all categories generated from the word list and cleaned them up:

- **175 → 99 categories.** Merged naming inconsistencies from the source
  file (e.g. "Political" + "Politics" → **Politics**; "Economics" +
  "Economy" → **Economy**; "Flower"/"Flowers" → **Nature**; "House" →
  **Home**), and folded ~50 one-off categories that only existed because a
  single idiomatic phrase (e.g. "bank on", "grow apart", "wrestle with")
  had been given its own unique category name into one real, useful
  category: **Phrasal Verbs & Idioms** (48 entries).
- **Fixed 15 words with corrupted source data** (comma inside a field had
  shifted every column after it) so their definition, example, category,
  etc. are all correct instead of garbled: million, conservation,
  livestock, boutique, cay, desert, fjord, besides, delegate, otherwise,
  so, therefore, unlike, archipelago.
- **0 uncategorized words** (was 2) and **0 singleton categories** (was 15+)
  — every one of the 99 categories now has a meaningful number of words in
  it, so Categories/Level Journey/Flashcards etc. are all useful to browse.
- All 5,483 words are still present — this only touched the `category`
  field and the 15 corrupted rows' text, not word count.

## 4. This update: clean app + real import system + 16-category word list

**App is now clean by default.** `src/data/defaultVocabulary.json` is an
empty array — the app no longer bundles or auto-loads any word list, and
the risky first-login "merge 5,483 words into localStorage" step from the
previous update is fully removed. This was the most likely cause of the
error screen on open, and removing it also shrank the production bundle
significantly (precached assets dropped from ~3.3MB to ~1.8MB), which
should make first load noticeably faster and more reliable on slow
connections too.

**Import system (already existed, now also handles JSON everywhere):**
- **Admin Panel → Import/Export tab**: upload a `.csv` or `.json` file to
  push words into the shared curriculum every learner sees. Supports up to
  **20,000 words per file** (50MB) — comfortably over the 10,000-word
  requirement. A "Push to All Learners" button syncs it to every device via
  GitHub.
- **Admin Panel → Google Sheet tab**: paste a published Google Sheet CSV
  link (or an Apps Script URL) and sync directly — no file upload needed.
- **My Words → Import/Export** (every learner): now also accepts `.json`
  files, not just `.csv`/`.xlsx`/`.xls`, for personal word list imports.
- **New: Admin Panel → Import/Export → Danger Zone → "Full Factory Reset &
  Sign Out"**. This app doesn't use Firebase — everything (login session,
  vocabulary, settings) lives only in the browser's own storage. This new
  button clears ALL of it (localStorage, sessionStorage, IndexedDB, cached
  files, the service worker) and signs out, exactly like a fresh install —
  for when the app is stuck and nothing else has fixed it.

**Category-organized starter word list (delivered separately, not
bundled):** `esl_vocabulary_16categories_5517words.json` /
`.csv` — the word list re-organized into exactly the 16 categories
requested, ready to import via Admin Panel:

- People, Family, & Relationships (325) · Time & Sequences (142) ·
  Food & Drink (134) · Places & Locations (429) · Common Actions / Verbs
  (1,061) · Body Parts & Health (329) · Money & Commerce (190) ·
  Work, Study, & Technology (828) · Weather & Nature (258) ·
  Describing People (1,181) · Agriculture & Farming (49) ·
  Forestry & Land Management (29) · Environment & Ecology (113) ·
  Climate & Atmospheric Dynamics (36) · Economy & Finance (111) ·
  Policy & Governance (302)
- **5,517 words total.** This is the accurate, verified word set from your
  original file, re-categorized — not fabricated. Reaching 10,000+ with
  the same accuracy (correct definitions AND correct Lao/Thai translations)
  needs a larger source list; the import system itself already supports
  20,000+ words whenever one is available, and the smaller Forestry/Climate
  categories were hand-supplemented with ~50 additional verified English
  entries so every one of the 16 categories has solid coverage.

To load this into the app: Admin Panel → Import/Export → Import CSV/JSON →
select `esl_vocabulary_16categories_5517words.json` → Push to All Learners.

## 5. This update: Firebase fully removed + words loaded into the app

**Firebase double-checked and fully removed.** The earlier check only
searched `src/`, which is why these were missed — they're now deleted:
- `firestore.rules` (orphaned Firestore security rules, unused by the app)
- `scripts/import-excel-to-firestore.mjs` (orphaned admin script, not
  referenced by any `package.json` script — dead code)
- `VITE_FIREBASE_*` secrets removed from `.github/workflows/deploy.yml`
  (they were being injected into the build but nothing in the app ever
  read them)
- `MIGRATION_GUIDE.md` rewritten to remove all Firebase/Firestore setup
  instructions (which described files that were never actually built) and
  accurately describe the two systems that really exist: GitHub Sync and
  Google Sheet sync.
- Confirmed: no `firebase` package.json dependency, no `.env` file with
  Firebase keys, no Firebase imports anywhere in `src/`.

**The 16-category word list is now loaded into the app.** 
`src/data/defaultVocabulary.json` is restored — but now containing the
5,517-word list organized into your 16 requested categories (not the old
99-category set), so Categories, Flashcards, Quiz, Matching, and Spelling
all have real content from first install.

Seeded more carefully than the version that shipped before:
- Loaded as its own ~294KB (gzipped) chunk, fetched only after login —
  never part of the initial bundle.
- Merged in **11 batches of 500 words** on a timer instead of one big
  synchronous pass, so it can't block the UI.
- Every batch is individually wrapped so one bad batch can only get
  skipped — it can never take down the app.
- Only runs the very first time a browser's shared curriculum is empty;
  an admin's own CSV/JSON import or Google Sheet sync always takes
  priority and is never overwritten.

## 6. This update: GitHub cloud reset workflow, Apps Script removed, big-CSV fix

**(1) Reset the GitHub cloud database, then re-sync — now documented and
fixed end-to-end.** The pieces already existed but had a real bug that
would've broken on a large wordlist; the workflow is now, in Admin Panel:
1. **Google Sheet tab** — a new guide box explains this exact flow.
2. **Import/Export tab → Danger Zone → "Reset Curriculum Vocabulary"** —
   deletes the old wordlist from **both** this device and the GitHub cloud
   file in one click (it already called `clearSharedVocabulary()`, which
   overwrites the cloud file with an empty list).
3. **Google Sheet tab → paste your new sheet link → "Sync from Google
   Sheet Now"** — pulls the new words onto this device.
4. **"Push to All Learners"** — writes the new wordlist to the GitHub
   cloud file and every learner's device picks it up on next login (or
   within 15 min with auto-sync on).

**Real bug fixed along the way:** GitHub's Contents API only returns a
file's content inline for files ≤1MB — anything bigger (which a
10,000+ word JSON easily is) came back with an **empty content field**,
silently breaking both "pull shared vocabulary" and the "get current file
version" step every push needs. `ghGet` now detects that case and
re-fetches the same file using GitHub's raw content type instead, which
has no such limit — pushing, pulling, and resetting the cloud wordlist all
now work correctly at any size.

**(2) Apps Script removed.** Google Sheet sync is CSV-link only now — the
"Connection Method" toggle, the Apps Script URL field, and the
copy-paste script template are all gone from Admin Panel → Google Sheet
tab. One simple setup path (File → Share → Publish to web → CSV) instead
of two.

**(3) Big CSV/wordlist support (10,000+) hardened further:**
- Fixed the GitHub cloud 1MB bug above — this was the real ceiling on
  supporting a large shared wordlist end-to-end, not the import step.
- Google Sheet CSV parsing now uses PapaParse instead of a hand-rolled
  line-splitter, which broke on real-world sheets once fields contained
  commas, quoted text, or line breaks inside a cell — common well before
  10,000 rows. PapaParse handles all of that correctly at any size.
- Fetch timeout for the Google Sheet CSV raised from 12s to 30s, since a
  10,000+ row published sheet genuinely takes longer for Google + the CORS
  proxy to return.
- Admin Panel and My Words import (CSV/JSON/XLSX) already supported up to
  20,000 rows / 50MB — confirmed and left as-is, comfortably over 10,000.

## 7. This update: hide sync mechanism from learners + rebuild

- `src/pages/LevelJourney.tsx` — the two learner-facing "no words yet"
  messages used to say "add via Google Sheet in Admin Panel" / "Add words
  ... in your Google Sheet". Learners never see the actual link (confirmed:
  `csvUrl`/Google Sheet config only ever appears in `AdminPanel.tsx`, which
  is only reachable when `currentUser.role === 'admin'` — the `/admin`
  route isn't even registered for non-admin users), but these hints still
  named the mechanism. Reworded to generic "check back soon" / "new lessons
  are added regularly" so the admin's workflow is completely invisible to
  learners.
- No other changes this round — see `DEPLOY_ME_FIRST.md` for why the
  "Still loading…" screen may still be showing up.

## 8. This update: fixed the real ~5,000-word ceiling + Cloudflare Pages support

**Found and fixed the actual cause of the "GitHub can only handle ~5,000
words" wall.** It wasn't GitHub — it was `localStorage`, which has a
small, inconsistent per-origin quota (commonly ~5MB, and in some browsers
measured in UTF-16 code units, which roughly halves the usable budget).
The shared curriculum (`GS_WORDS_KEY`) was still being written there in
several places even after last update's GitHub-API raw-content fix, and
every write attempt beyond ~5,000 richly-tagged words would silently fail.

**Fix — migrated the shared curriculum from localStorage to IndexedDB**
(`src/lib/idbStore.ts`, new): IndexedDB has no comparable small fixed
limit (browsers grant it a share of disk space, typically tens of MB up
to several GB) and stores data natively without the JSON-string overhead.
- `useVocabulary.ts` now loads the shared curriculum from IndexedDB
  asynchronously on mount, with automatic one-time migration of any words
  still sitting in the old localStorage key (or duplicated into a
  learner's personal storage from even further back) — nothing is lost,
  the old key is then cleared to free up its quota for good.
- Every write path (merge, replace, edit, delete, dedupe, reset) now
  persists to IndexedDB instead.
- Cross-tab live sync (previously via the browser's `storage` event, which
  only fires for localStorage) now uses `BroadcastChannel` instead, since
  IndexedDB writes don't fire that event.
- Removed a second, redundant raw localStorage write inside
  `useGoogleSheet.ts`'s sync function that would silently abort an entire
  large-sheet sync the moment it hit the same quota wall, before the
  (already-fixed) IndexedDB path even ran. This was the last real ceiling
  on syncing 10,000+ words end-to-end — now removed.

**Cloudflare Pages support added** (works alongside the existing GitHub
Pages setup, or instead of it):
- `CLOUDFLARE_DEPLOY.md` — full setup guide, both the no-YAML dashboard
  method and a GitHub Actions method.
- `.github/workflows/deploy-cloudflare.yml` — optional Action that builds
  and deploys to Cloudflare Pages on every push (needs
  `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` repo secrets).
- `wrangler.toml` — for `wrangler pages deploy` CLI usage.
- `public/_headers` — sets `no-cache` on the HTML shell / service worker /
  manifest and long-cache on hashed assets. This matters more on
  Cloudflare than GitHub Pages, since Cloudflare's edge cache is more
  aggressive by default — without this, a stale cached shell could stick
  around longer, worsening exactly the "stuck on old version" boot problem
  this app already has several layers of defense against.
- `public/_redirects` — SPA fallback safety net for any path that isn't a
  real file (this app uses HashRouter, so it's mostly a belt-and-suspenders
  measure, not strictly required).
- No code changes were needed for Cloudflare Pages itself — the existing
  relative build path (`base: './'`) and `HashRouter` already work
  identically on any host (GitHub Pages subpath, Cloudflare Pages
  subdomain or custom domain root, etc.).
- PWA install (desktop + Android + iOS) already fully configured and
  confirmed to work the same way on Cloudflare Pages — see
  `CLOUDFLARE_DEPLOY.md` for how to verify the install prompt on each.

## 9. This update: renamed to "ESL Master Vocab" v1.2.0

Renamed everywhere it appears — app name, package name, browser tab
title, PWA install name (both `name` and `short_name`), meta tags/Open
Graph tags, sidebar logo text, login screen heading + image alt text,
error screen text, console log tags, and the GitHub commit-message tag
used by GitHub Sync:
- `ESL Learning` → **`ESL Master Vocab`** (short_name: `ESL Vocab`, used
  for the home-screen icon label where space is tight)
- `package.json` name: `esl-learning` → `esl-master-vocab`
- version bumped to **1.2.0** everywhere: `package.json`, and a new
  `__APP_VERSION__` build-time constant (same pattern as the existing
  `__BUILD_TIME__` one) now feeds both the small "v1.2.0 · build …" stamp
  on the login screen AND the "App Version" row in Settings → About,
  which was previously a hardcoded `2.0.0` string that never actually
  matched `package.json` — now both read from one real source.
- Cloudflare project name in `wrangler.toml` / `deploy-cloudflare.yml`
  also updated to `esl-master-vocab`, with an explicit warning comment in
  both files: **if you already have a live Cloudflare Pages project under
  the old name, keep using that exact name instead** — changing it creates
  a brand new project/URL rather than renaming the existing one.
- Did NOT touch anything that depends on your actual GitHub repo name
  (`esl.learning`) — the app already works under any repo/project name
  thanks to the relative build path, so renaming the repo itself is
  entirely optional and unrelated to this update.

Runs on both GitHub Pages and Cloudflare Pages exactly as before — this
was a branding/version change only, no deploy-relevant code changed.

## 10. This update: static base curriculum baked into the app (no storage)

**Architecture change per request:** the word database no longer needs
localStorage or IndexedDB at all — it's now bundled directly into the
app's code as `src/data/defaultVocabulary.json` and loaded straight from
the deployed build into memory each session (still via a lazy dynamic
import, so it's its own chunk and never blocks first paint — just never
written to any browser storage).

- `useVocabulary.ts` — new `baseWords` state, loaded once on mount purely
  in memory. It's a separate layer from `sharedContent` (admin's
  synced/imported extra words, which still uses IndexedDB — kept for
  admins who want to add custom words beyond the bundled base), combined
  together in the `words` list every learner sees. Removed the old
  "seed the built-in bank into IndexedDB" effect entirely — nothing to
  seed anymore, the base list is just always there.
- Every base word now has a **stable, deterministic id** (`w-<word-slug>`,
  baked into the JSON file itself, not generated at runtime) so a
  learner's own progress (starred/learned/study count) reliably survives
  reloads, rebuilds, and redeploys.

**Merged your new 9,142-row file with the existing base list.** Honest
result: **5,955 unique words**, not 10,000+. The two files you've
provided overlap heavily — of the new file's 5,921 unique entries after
its own internal duplicates were removed, only ~438 were actually new
against what the app already had; the rest were the same words already
in the bundled list. I did not fabricate additional words to hit a
10,000 target — that would mean invented definitions and, worse,
guessed Lao/Thai translations that could actively mislead learners.
Fixed the same 7-row column-shift corruption found in the earlier file
(same underlying source data). All 5,955 words re-organized into the
same 16 categories as before, all populated:
Describing People (1,322) · Common Actions/Verbs (1,212) ·
Work/Study/Technology (850) · Places & Locations (438) ·
Body Parts & Health (353) · People/Family/Relationships (344) ·
Policy & Governance (324) · Weather & Nature (256) ·
Money & Commerce (199) · Time & Sequences (169) · Food & Drink (140) ·
Environment & Ecology (116) · Economy & Finance (114) ·
Agriculture & Farming (53) · Climate & Atmospheric Dynamics (36) ·
Forestry & Land Management (29).

**To genuinely reach 10,000+:** the Admin Panel's CSV/JSON import and
Google Sheet sync (both fixed for large files in an earlier update) are
still fully available as an *additional* layer on top of this bundled
base — an admin can import more non-overlapping words any time without
touching the code at all. Or send another source file that isn't mostly
the same words as these first two and I'll merge it in the same way.
