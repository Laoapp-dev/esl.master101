import type { VocabularyWord, CEFRLevel } from '@/types/vocabulary';

// ── Level mastery / unlock rules ─────────────────────────────────────────────
// Shared by every study mode (Flashcards, Quiz, Matching, Spelling) so a level
// that's locked in one mode is locked everywhere, and unlocking it in one
// place (by reaching UNLOCK_PCT mastery) unlocks it everywhere else too.
export const CEFR_ORDER: CEFRLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
export const UNLOCK_PCT = 80; // % mastery needed to unlock the next level

export function getMasteryPct(words: VocabularyWord[], level: CEFRLevel): number {
  const wds = words.filter(w => w.cefrLevel === level);
  if (wds.length === 0) return 0;
  return Math.round((wds.filter(w => w.isLearned).length / wds.length) * 100);
}

export function isLevelUnlocked(
  words: VocabularyWord[],
  level: CEFRLevel,
  pretestLevel?: string
): boolean {
  const idx = CEFR_ORDER.indexOf(level);
  if (idx === 0) return true; // A1 always unlocked
  // If user passed pretest at this level or higher → unlocked
  if (pretestLevel) {
    const pretestIdx = CEFR_ORDER.indexOf(pretestLevel as CEFRLevel);
    if (idx <= pretestIdx) return true;
  }
  // Otherwise need to pass previous level at UNLOCK_PCT
  const prevLevel = CEFR_ORDER[idx - 1];
  return getMasteryPct(words, prevLevel) >= UNLOCK_PCT;
}

// Read the current user's pretest level from localStorage (via auth session).
// Wrapped in try/catch since localStorage/JSON parsing can fail (private
// browsing, corrupted data, etc.) and this must never crash a study page.
export function getPretestLevel(): string | undefined {
  try {
    const sess = localStorage.getItem('lexicon_auth_session');
    if (!sess) return undefined;
    const { userId } = JSON.parse(sess);
    const users = JSON.parse(localStorage.getItem('lexicon_auth_users') || '[]');
    const u = users.find((x: any) => x.id === userId);
    return u?.pretestLevel;
  } catch {
    return undefined;
  }
}

// ── Session composition helpers ──────────────────────────────────────────────

// Pick a random session length within [min, max], never exceeding what's
// actually available.
export function randomSessionSize(min: number, max: number, available: number): number {
  const size = Math.floor(Math.random() * (max - min + 1)) + min;
  return Math.max(0, Math.min(size, available));
}

// Stratified sample: spreads picks round-robin across the CEFR levels present
// in the pool (instead of pure random selection) so a session studying "All"
// levels draws a diverse mix rather than being dominated by whichever level
// happens to have the most words.
export function pickDiverseSample<T extends { cefrLevel: CEFRLevel }>(pool: T[], count: number): T[] {
  if (count <= 0) return [];
  if (pool.length <= count) return [...pool].sort(() => Math.random() - 0.5);

  const byLevel = new Map<CEFRLevel, T[]>();
  for (const item of pool) {
    const list = byLevel.get(item.cefrLevel) ?? [];
    list.push(item);
    byLevel.set(item.cefrLevel, list);
  }
  for (const [lvl, list] of byLevel) {
    byLevel.set(lvl, [...list].sort(() => Math.random() - 0.5));
  }

  const levels = CEFR_ORDER.filter(l => byLevel.has(l));
  const result: T[] = [];
  let i = 0;
  while (result.length < count && levels.some(l => (byLevel.get(l)?.length ?? 0) > 0)) {
    const lvl = levels[i % levels.length];
    const bucket = byLevel.get(lvl)!;
    if (bucket.length > 0) result.push(bucket.shift()!);
    i++;
  }
  return result.sort(() => Math.random() - 0.5);
}
