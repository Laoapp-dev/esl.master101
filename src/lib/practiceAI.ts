/**
 * practiceAI.ts
 *
 * AI evaluation for the Writing & Speaking Practice feature.
 * Uses the same admin-configured Gemini API key as the rest of the app
 * (stored under 'moe_admin_api_cfg', set in AdminPanel → AI Keys tab).
 *
 * Two capabilities:
 *  1. evaluateWriting()  — scores typed text against a topic prompt
 *  2. evaluateSpeaking() — scores a transcript captured via the browser's
 *                          Web Speech API against a topic prompt
 *
 * Both fall back to a local heuristic scorer if no API key is configured,
 * so the feature always works, just with simpler feedback.
 */

import type { AIFeedback } from '@/types/practice';
import type { CEFRLevel } from '@/data/speakingTopics';

const ADMIN_API_KEYS_KEY = 'moe_admin_api_cfg';

function getAdminKeys(): { google?: string } {
  try {
    const raw = localStorage.getItem(ADMIN_API_KEYS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/** Calls Gemini with a system + user prompt. Tries a few model names for resilience. */
async function callGemini(systemPrompt: string, userPrompt: string, googleKey: string): Promise<string> {
  const models = ['gemini-2.0-flash', 'gemini-1.5-flash-latest', 'gemini-1.5-flash'];
  let lastErr = '';
  for (const model of models) {
    try {
      const body = {
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        generationConfig: { maxOutputTokens: 800, temperature: 0.4 },
      };
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${googleKey}`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
      );
      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        lastErr = `Gemini ${model} error ${res.status}: ${errText.slice(0, 120)}`;
        continue;
      }
      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
      if (text) return text;
      lastErr = `Empty response from ${model}`;
    } catch (e: any) {
      lastErr = e?.message || String(e);
    }
  }
  throw new Error(lastErr || 'All Gemini models failed');
}

/** Note: speech-to-text is handled entirely by the browser's built-in Web
 * Speech API (see useSpeech.ts / Practice.tsx) — no third-party STT key is used. */


function buildEvalSystemPrompt(level: CEFRLevel, mode: 'writing' | 'speaking'): string {
  return `You are an expert ESL examiner evaluating a CEFR ${level}-level English ${mode} sample.
Score fairly for this level — do not expect native-level perfection, but do expect what a ${level} learner should be able to produce.
Return ONLY valid JSON (no markdown, no code fences) with exactly this shape:
{
  "score": NUMBER (0-100, overall),
  "grammarScore": NUMBER (0-100),
  "vocabularyScore": NUMBER (0-100),
  "fluencyScore": NUMBER (0-100, coherence/flow),
  "feedback": "STRING (2-3 encouraging but honest sentences)",
  "strengths": ["STRING", "STRING"],
  "improvements": ["STRING", "STRING"]
}`;
}

function buildEvalUserPrompt(topicTitle: string, prompt: string, content: string): string {
  return `Topic: "${topicTitle}"\nTask instructions: "${prompt}"\n\nLearner's response:\n"""\n${content}\n"""`;
}

function parseAIFeedback(raw: string): AIFeedback {
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('No JSON object found in AI response');
  const parsed = JSON.parse(jsonMatch[0]);
  return {
    score: clampScore(parsed.score),
    grammarScore: clampScore(parsed.grammarScore),
    vocabularyScore: clampScore(parsed.vocabularyScore),
    fluencyScore: clampScore(parsed.fluencyScore),
    feedback: String(parsed.feedback || 'Good effort! Keep practicing.'),
    strengths: Array.isArray(parsed.strengths) ? parsed.strengths.slice(0, 4).map(String) : [],
    improvements: Array.isArray(parsed.improvements) ? parsed.improvements.slice(0, 4).map(String) : [],
  };
}

function clampScore(n: unknown): number {
  const num = Math.round(Number(n));
  if (Number.isNaN(num)) return 70;
  return Math.max(0, Math.min(100, num));
}

/** Simple local heuristic used when no Gemini key is configured. */
function localHeuristicScore(content: string, minWords: number): AIFeedback {
  const wordCount = content.trim().split(/\s+/).filter(Boolean).length;
  const lengthRatio = Math.min(1, wordCount / Math.max(minWords, 1));
  const score = Math.round(50 + lengthRatio * 40); // 50-90 range based on length only
  return {
    score,
    feedback: wordCount < minWords
      ? `Good start! Try to write or say a bit more — aim for at least ${minWords} words to fully develop your ideas.`
      : 'Nice work! Your response covers the topic well. (Add an AI key in Admin → AI Keys for detailed grammar feedback.)',
    strengths: wordCount >= minWords ? ['Good length and effort'] : [],
    improvements: wordCount < minWords ? ['Add more detail and examples'] : ['Ask an admin to enable AI scoring for detailed feedback'],
  };
}

export async function evaluateWriting(params: {
  topicTitle: string;
  prompt: string;
  content: string;
  level: CEFRLevel;
  minWords: number;
}): Promise<AIFeedback> {
  const { google } = getAdminKeys();
  if (!google) {
    return localHeuristicScore(params.content, params.minWords);
  }
  try {
    const raw = await callGemini(
      buildEvalSystemPrompt(params.level, 'writing'),
      buildEvalUserPrompt(params.topicTitle, params.prompt, params.content),
      google
    );
    return parseAIFeedback(raw);
  } catch (e) {
    console.warn('Gemini writing evaluation failed, using local fallback:', (e as Error).message);
    return localHeuristicScore(params.content, params.minWords);
  }
}

export async function evaluateSpeaking(params: {
  topicTitle: string;
  prompt: string;
  transcript: string;
  level: CEFRLevel;
  minWords: number;
}): Promise<AIFeedback> {
  const { google } = getAdminKeys();
  if (!google) {
    return localHeuristicScore(params.transcript, params.minWords);
  }
  try {
    const raw = await callGemini(
      buildEvalSystemPrompt(params.level, 'speaking') +
        '\nNote: this text was transcribed from spoken audio, so judge fluency/coherence rather than punctuation or capitalization.',
      buildEvalUserPrompt(params.topicTitle, params.prompt, params.transcript),
      google
    );
    return parseAIFeedback(raw);
  } catch (e) {
    console.warn('Gemini speaking evaluation failed, using local fallback:', (e as Error).message);
    return localHeuristicScore(params.transcript, params.minWords);
  }
}

export function hasGeminiKey(): boolean {
  return !!getAdminKeys().google;
}

/* ─────────────────────────────────────────────────────────────────────────
 * AI Lesson & Practice Generation
 *
 * Builds a short mini-lesson + multiple-choice quiz from a batch of words
 * out of the app's built-in 9,000+ word database (see useVocabulary.ts /
 * src/data/defaultVocabulary.json). Uses the same admin-configured Gemini
 * key as writing/speaking evaluation above. Always works even with no key
 * set — it falls back to building the quiz directly from the words' own
 * definitions/synonyms/antonyms, just without the AI-written intro blurb.
 * ────────────────────────────────────────────────────────────────────── */

export interface LessonWordEntry {
  word: string;
  definition: string;
  example: string;
}

export interface LessonQuestion {
  question: string;
  options: string[];
  answer: string;
}

export interface GeneratedLesson {
  title: string;
  summary: string;
  words: LessonWordEntry[];
  questions: LessonQuestion[];
  aiGenerated: boolean;
}

interface SourceWord {
  word: string;
  definition: string;
  exampleSentence: string;
  synonym?: string;
  antonym?: string;
  partOfSpeech: string;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Builds a definition-matching quiz directly from word data — no AI needed. */
function localLesson(words: SourceWord[], level: CEFRLevel): GeneratedLesson {
  const picked = shuffle(words).slice(0, Math.min(5, words.length));
  const pool = words.map(w => w.definition).filter(Boolean);

  const questions: LessonQuestion[] = picked
    .filter(w => w.definition)
    .map(w => {
      const distractors = shuffle(pool.filter(d => d !== w.definition)).slice(0, 3);
      return {
        question: `What does "${w.word}" mean?`,
        options: shuffle([w.definition, ...distractors]),
        answer: w.definition,
      };
    });

  return {
    title: `${level} Vocabulary Lesson`,
    summary: `A quick lesson built from ${picked.length} words in the app's built-in curriculum. Add a Gemini API key in Admin → AI Keys for a written explanation and richer questions.`,
    words: picked.map(w => ({ word: w.word, definition: w.definition, example: w.exampleSentence || '' })),
    questions,
    aiGenerated: false,
  };
}

function buildLessonSystemPrompt(level: CEFRLevel): string {
  return `You are an ESL curriculum designer creating a short vocabulary mini-lesson for a CEFR ${level}-level learner.
Return ONLY valid JSON (no markdown, no code fences) with exactly this shape:
{
  "title": "STRING (short, engaging lesson title)",
  "summary": "STRING (2-3 sentence friendly intro explaining what these words have in common or how they're used)",
  "questions": [
    { "question": "STRING", "options": ["STRING","STRING","STRING","STRING"], "answer": "STRING (must exactly match one option)" }
  ]
}
Write exactly ${5} questions, mixing definition, synonym, antonym, and fill-in-the-blank styles. Keep language appropriate for a ${level} learner.`;
}

function buildLessonUserPrompt(words: SourceWord[]): string {
  const list = words.map(w => `- ${w.word} (${w.partOfSpeech}): ${w.definition}${w.exampleSentence ? ` | e.g. "${w.exampleSentence}"` : ''}`).join('\n');
  return `Build the mini-lesson using ONLY these words:\n${list}`;
}

export async function generateLesson(params: {
  words: SourceWord[];
  level: CEFRLevel;
}): Promise<GeneratedLesson> {
  const { words, level } = params;
  const usable = words.filter(w => w.word && w.definition);
  const picked = shuffle(usable).slice(0, Math.min(8, usable.length));

  if (picked.length === 0) {
    return { title: `${level} Vocabulary Lesson`, summary: 'No words available for this level yet.', words: [], questions: [], aiGenerated: false };
  }

  const { google } = getAdminKeys();
  if (!google) {
    return localLesson(picked, level);
  }

  try {
    const raw = await callGemini(buildLessonSystemPrompt(level), buildLessonUserPrompt(picked), google);
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON object found in AI response');
    const parsed = JSON.parse(jsonMatch[0]);
    const questions: LessonQuestion[] = Array.isArray(parsed.questions)
      ? parsed.questions
          .filter((q: any) => q && typeof q.question === 'string' && Array.isArray(q.options) && q.options.includes(q.answer))
          .slice(0, 6)
          .map((q: any) => ({ question: String(q.question), options: q.options.map(String), answer: String(q.answer) }))
      : [];
    if (questions.length === 0) throw new Error('AI response had no usable questions');
    return {
      title: String(parsed.title || `${level} Vocabulary Lesson`),
      summary: String(parsed.summary || ''),
      words: picked.map(w => ({ word: w.word, definition: w.definition, example: w.exampleSentence || '' })),
      questions,
      aiGenerated: true,
    };
  } catch (e) {
    console.warn('Gemini lesson generation failed, using local fallback:', (e as Error).message);
    return localLesson(picked, level);
  }
}
