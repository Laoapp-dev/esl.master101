/**
 * Practice — Writing & Speaking AI Practice
 *
 * Replaces the old RolePlay (AI shadowing) feature.
 *
 * Flow:
 *  1. Learner picks a CEFR level (A1-C1) and a topic from that level.
 *  2. On the topic screen, the learner can EITHER or BOTH:
 *       - Write a response (typed text)
 *       - Speak a response (record audio in-browser, or upload an audio file)
 *  3. On submit, AI evaluates the response (Google Gemini for text; audio is
 *     transcribed using the browser's built-in Web Speech API) and returns
 *     a score + feedback.
 *  4. Every submission is saved to this user's practice history, which
 *     feeds the stats shown on the Dashboard.
 */

import { useState, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown, ChevronRight, ChevronLeft, Mic, Square, Upload, Send,
  Loader2, CheckCircle2, AlertCircle, PenLine, TrendingUp,
  Clock, FileAudio, X,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { usePracticeSubmissions } from '@/hooks/usePracticeSubmissions';
import { evaluateWriting, evaluateSpeaking, hasGeminiKey } from '@/lib/practiceAI';
import { AILessonPanel } from '@/components/AILessonPanel';
import { SPEAKING_TOPICS, LEVEL_INFO, type SpeakingTopic, type CEFRLevel } from '@/data/speakingTopics';
import type { PracticeSubmission } from '@/types/practice';

type ActiveTab = 'writing' | 'speaking';
type RecordState = 'idle' | 'recording' | 'processing';

export function Practice() {
  const { currentUser } = useAuth();
  const dataKeyPrefix = currentUser?.dataKey;
  const { stats, startSubmission, completeSubmission, failSubmission, getSubmissionsForTopic } =
    usePracticeSubmissions(dataKeyPrefix);

  const [selectedLevel, setSelectedLevel] = useState<CEFRLevel>('A1');
  const [showLevelPicker, setShowLevelPicker] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<SpeakingTopic | null>(null);

  const levelTopics = SPEAKING_TOPICS.filter(t => t.level === selectedLevel);
  const levelInfo = LEVEL_INFO.find(l => l.level === selectedLevel)!;
  const aiReady = hasGeminiKey();

  if (selectedTopic) {
    return (
      <TopicPracticeView
        topic={selectedTopic}
        onBack={() => setSelectedTopic(null)}
        startSubmission={startSubmission}
        completeSubmission={completeSubmission}
        failSubmission={failSubmission}
        getSubmissionsForTopic={getSubmissionsForTopic}
      />
    );
  }

  return (
    <div className="space-y-5 pb-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2">
          <PenLine className="h-6 w-6 text-[#F5A623]" strokeWidth={1.5} /> Writing &amp; Speaking Practice
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose a topic, write or speak your answer, and get instant AI feedback &amp; scoring.
        </p>
      </div>

      {!aiReady && (
        <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
          <AlertCircle className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800 space-y-0.5">
            <p><strong>Basic scoring active.</strong> You can practice and get a score right now.</p>
            <p className="text-xs text-blue-600">For detailed AI feedback on grammar &amp; vocabulary, an admin must add a Gemini API key (Admin → AI Keys).</p>
          </div>
        </div>
      )}

      {/* Level selector */}
      <div className="relative">
        <button onClick={() => setShowLevelPicker(!showLevelPicker)}
          className="flex items-center gap-3 w-full rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium text-foreground hover:bg-muted/30 transition-colors">
          <TrendingUp className="h-4 w-4 text-[#F5A623]" />
          <span className="flex-1 text-left">{levelInfo.label} ({selectedLevel}) — {levelInfo.desc}</span>
          <span className="text-xs text-muted-foreground">{levelTopics.length} topics</span>
          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${showLevelPicker ? 'rotate-180' : ''}`} />
        </button>
        <AnimatePresence>
          {showLevelPicker && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              className="absolute top-full mt-1 w-full z-30 bg-card border border-border rounded-xl shadow-lg overflow-hidden">
              {LEVEL_INFO.map(l => {
                const count = SPEAKING_TOPICS.filter(t => t.level === l.level).length;
                return (
                  <button key={l.level} onClick={() => { setSelectedLevel(l.level); setShowLevelPicker(false); }}
                    className={`flex items-center gap-3 w-full px-4 py-3 text-sm text-left transition-colors
                      ${l.level === selectedLevel ? 'bg-[#FFF3DD]' : 'hover:bg-muted/40'}`}>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${l.badge}`}>{l.level}</span>
                    <span className="text-foreground">{l.label}</span>
                    <span className="text-muted-foreground text-xs ml-auto">{count} topics</span>
                    {l.level === selectedLevel && <CheckCircle2 className="h-4 w-4 text-[#F5A623]" />}
                  </button>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl bg-card border border-border px-4 py-2.5 text-center">
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">Attempts</p>
          <p className="text-xl font-bold text-foreground mt-0.5">{stats.totalAttempts}</p>
        </div>
        <div className="rounded-xl bg-card border border-border px-4 py-2.5 text-center">
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">Topics Tried</p>
          <p className="text-xl font-bold text-foreground mt-0.5">{stats.topicsAttempted}<span className="text-sm text-muted-foreground font-normal">/{SPEAKING_TOPICS.length}</span></p>
        </div>
        <div className="rounded-xl bg-[#1A1A2E] text-white px-4 py-2.5 text-center">
          <p className="text-[10px] text-white/40 uppercase tracking-widest font-semibold">Avg Score</p>
          <p className="text-xl font-bold mt-0.5">{stats.avgScore || '–'}</p>
        </div>
      </div>

      {/* AI Vocabulary Lesson — built from the app's own word database */}
      <AILessonPanel level={selectedLevel} />

      {/* Topic cards */}
      <div className="space-y-2">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
          {levelInfo.label} Topics
        </h2>
        {levelTopics.map((topic) => {
          const topicSubs = getSubmissionsForTopic(topic.id);
          const best = topicSubs.filter(s => s.status === 'done' && s.aiFeedback)
            .reduce((max, s) => Math.max(max, s.aiFeedback?.score || 0), 0);
          const attempted = topicSubs.length > 0;
          return (
            <motion.button key={topic.id}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSelectedTopic(topic)}
              className={`w-full text-left rounded-2xl border transition-all cursor-pointer
                ${attempted ? 'border-emerald-200 bg-emerald-50/40' : 'border-border bg-card hover:border-[#F5A623]/40 hover:bg-[#FFF3DD]/30'}`}>
              <div className="flex items-center gap-4 px-4 py-3.5">
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${topic.color}`}>
                  <topic.icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">{topic.title}</p>
                    {attempted && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{topic.area} · {topic.description}</p>
                </div>
                {best > 0 && (
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full shrink-0 ${best >= 80 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                    {best}
                  </span>
                )}
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

// ── Topic Practice View (Writing + Speaking tabs) ──────────────────────────────

function TopicPracticeView({
  topic, onBack, startSubmission, completeSubmission, failSubmission, getSubmissionsForTopic,
}: {
  topic: SpeakingTopic;
  onBack: () => void;
  startSubmission: ReturnType<typeof usePracticeSubmissions>['startSubmission'];
  completeSubmission: ReturnType<typeof usePracticeSubmissions>['completeSubmission'];
  failSubmission: ReturnType<typeof usePracticeSubmissions>['failSubmission'];
  getSubmissionsForTopic: ReturnType<typeof usePracticeSubmissions>['getSubmissionsForTopic'];
}) {
  const [activeTab, setActiveTab] = useState<ActiveTab>('writing');
  const history = getSubmissionsForTopic(topic.id);
  const levelInfo = LEVEL_INFO.find(l => l.level === topic.level)!;

  return (
    <div className="space-y-5 pb-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold text-foreground truncate">{topic.title}</h1>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full border shrink-0 ${levelInfo.badge}`}>{topic.level}</span>
          </div>
          <p className="text-xs text-muted-foreground">{topic.area}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <p className="text-sm text-foreground">{topic.description}</p>
      </div>

      {/* Mode tabs */}
      <div className="flex items-center gap-2 rounded-xl bg-muted/50 p-1">
        <button onClick={() => setActiveTab('writing')}
          className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-semibold transition-colors
            ${activeTab === 'writing' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}>
          <PenLine className="h-4 w-4" /> Writing
        </button>
        <button onClick={() => setActiveTab('speaking')}
          className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-semibold transition-colors
            ${activeTab === 'speaking' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}>
          <Mic className="h-4 w-4" /> Speaking
        </button>
      </div>

      {activeTab === 'writing' ? (
        <WritingPanel topic={topic} startSubmission={startSubmission} completeSubmission={completeSubmission} failSubmission={failSubmission} />
      ) : (
        <SpeakingPanel topic={topic} startSubmission={startSubmission} completeSubmission={completeSubmission} failSubmission={failSubmission} />
      )}

      {/* History */}
      {history.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Your Attempts</h2>
          {history.map(sub => <SubmissionResultCard key={sub.id} submission={sub} />)}
        </div>
      )}
    </div>
  );
}

// ── Writing Panel ───────────────────────────────────────────────────────────────

function WritingPanel({
  topic, startSubmission, completeSubmission, failSubmission,
}: {
  topic: SpeakingTopic;
  startSubmission: ReturnType<typeof usePracticeSubmissions>['startSubmission'];
  completeSubmission: ReturnType<typeof usePracticeSubmissions>['completeSubmission'];
  failSubmission: ReturnType<typeof usePracticeSubmissions>['failSubmission'];
}) {
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [lastResult, setLastResult] = useState<PracticeSubmission | null>(null);

  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
  const meetsMin = wordCount >= topic.minWords;

  const handleSubmit = async () => {
    if (!text.trim() || submitting) return;
    setSubmitting(true);
    setLastResult(null);
    const id = startSubmission({
      topicId: topic.id, topicTitle: topic.title, level: topic.level, area: topic.area,
      mode: 'writing', content: text.trim(),
    });
    try {
      const feedback = await evaluateWriting({
        topicTitle: topic.title, prompt: topic.writingPrompt, content: text.trim(),
        level: topic.level, minWords: topic.minWords,
      });
      completeSubmission(id, feedback);
      setLastResult({
        id, topicId: topic.id, topicTitle: topic.title, level: topic.level, area: topic.area,
        mode: 'writing', content: text.trim(), submittedAt: new Date().toISOString(),
        aiFeedback: feedback, status: 'done',
      });
    } catch {
      failSubmission(id);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="rounded-xl bg-[#FFF3DD] px-4 py-3">
        <p className="text-sm text-[#7A5200]">{topic.writingPrompt}</p>
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Type your answer here…"
        rows={8}
        disabled={submitting}
        className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#F5A623]/50 disabled:opacity-60 resize-none"
      />

      <div className="flex items-center justify-between">
        <span className={`text-xs font-medium ${meetsMin ? 'text-emerald-600' : 'text-muted-foreground'}`}>
          {wordCount} words {meetsMin ? '✓' : `(aim for ${topic.minWords}+)`}
        </span>
        <button
          onClick={handleSubmit}
          disabled={!text.trim() || submitting}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#F5A623] text-white rounded-xl text-sm font-semibold hover:bg-[#E09400] disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {submitting ? 'Evaluating…' : 'Submit for Feedback'}
        </button>
      </div>

      {lastResult?.aiFeedback && <FeedbackCard feedback={lastResult.aiFeedback} />}
    </div>
  );
}

// ── Speaking Panel ──────────────────────────────────────────────────────────────

function SpeakingPanel({
  topic, startSubmission, completeSubmission, failSubmission,
}: {
  topic: SpeakingTopic;
  startSubmission: ReturnType<typeof usePracticeSubmissions>['startSubmission'];
  completeSubmission: ReturnType<typeof usePracticeSubmissions>['completeSubmission'];
  failSubmission: ReturnType<typeof usePracticeSubmissions>['failSubmission'];
}) {
  const [recordState, setRecordState] = useState<RecordState>('idle');
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [recordedSeconds, setRecordedSeconds] = useState(0);
  const [error, setError] = useState('');
  const [lastResult, setLastResult] = useState<PracticeSubmission | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);
  const recognitionTranscriptRef = useRef<string>('');
  const recognitionRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const speechSupported = useMemo(
    () => !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition),
    []
  );

  const resetAudio = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioBlob(null);
    setAudioUrl(null);
    setRecordedSeconds(0);
    setFileName(null);
    setLastResult(null);
    setError('');
  };

  const startRecording = async () => {
    setError('');
    resetAudio();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm';
      const recorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];
      recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach(t => t.stop());
        streamRef.current = null;
        if (timerRef.current) { window.clearInterval(timerRef.current); timerRef.current = null; }
        try { recognitionRef.current?.stop(); } catch { /* noop */ }
      };
      recorder.start(250);
      mediaRef.current = recorder;
      startWebSpeechRecognition();
      setRecordState('recording');
      const startTime = Date.now();
      timerRef.current = window.setInterval(() => {
        setRecordedSeconds(Math.floor((Date.now() - startTime) / 1000));
      }, 250);
    } catch {
      setError('Microphone access denied. Please allow microphone access, or upload an audio file instead.');
      setRecordState('idle');
    }
  };

  const stopRecording = () => {
    if (mediaRef.current && mediaRef.current.state !== 'inactive') {
      mediaRef.current.stop();
    }
    setRecordState('idle');
  };

  const startWebSpeechRecognition = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    try {
      recognitionTranscriptRef.current = '';
      const recognition = new SR();
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.lang = 'en-US';
      recognition.onresult = (e: any) => {
        for (let i = e.resultIndex; i < e.results.length; i++) {
          if (e.results[i].isFinal) recognitionTranscriptRef.current += e.results[i][0].transcript + ' ';
        }
      };
      recognition.onerror = () => { /* ignore — falls back to manual entry if no transcript is captured */ };
      recognition.start();
      recognitionRef.current = recognition;
    } catch { /* SpeechRecognition unsupported in this browser */ }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    resetAudio();
    setAudioBlob(file);
    setAudioUrl(URL.createObjectURL(file));
    setFileName(file.name);
    recognitionTranscriptRef.current = ''; // no live transcript available for uploaded files
    const audio = new Audio(URL.createObjectURL(file));
    audio.onloadedmetadata = () => setRecordedSeconds(Math.round(audio.duration || 0));
  };

  const handleSubmit = async () => {
    if (!audioBlob) return;
    setRecordState('processing');
    setError('');
    setLastResult(null);

    try {
      // Transcribe: Web Speech API live transcript (captured during recording).
      // Uploaded files have no live transcript, so they require Chrome's
      // recognition during playback isn't available — ask the user to record live instead.
      const transcript = recognitionTranscriptRef.current.trim();

      if (!transcript) {
        setError(fileName
          ? 'Could not transcribe this audio file automatically. Please record your answer live in Chrome instead of uploading a file.'
          : 'Could not transcribe your audio automatically. Try recording again in a quiet space, or use Chrome for best results.');
        setRecordState('idle');
        return;
      }

      const id = startSubmission({
        topicId: topic.id, topicTitle: topic.title, level: topic.level, area: topic.area,
        mode: 'speaking', content: transcript, audioDurationSeconds: recordedSeconds,
      });

      const feedback = await evaluateSpeaking({
        topicTitle: topic.title, prompt: topic.speakingPrompt, transcript,
        level: topic.level, minWords: topic.minWords,
      }).catch((e) => {
        failSubmission(id);
        throw e;
      });
      completeSubmission(id, feedback);
      setLastResult({
        id, topicId: topic.id, topicTitle: topic.title, level: topic.level, area: topic.area,
        mode: 'speaking', content: transcript, audioDurationSeconds: recordedSeconds,
        submittedAt: new Date().toISOString(), aiFeedback: feedback, status: 'done',
      });
      setRecordState('idle');
    } catch {
      setError('Something went wrong evaluating your speech. Please try again.');
      setRecordState('idle');
    }
  };

  const meetsMin = recordedSeconds >= topic.targetSeconds;

  return (
    <div className="space-y-3">
      <div className="rounded-xl bg-[#FFF3DD] px-4 py-3">
        <p className="text-sm text-[#7A5200]">{topic.speakingPrompt}</p>
      </div>

      {topic.questions?.length > 0 && (
        <div className="rounded-xl border border-border bg-card px-4 py-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Guiding Questions</p>
          <ul className="space-y-1.5">
            {topic.questions.map((q, i) => (
              <li key={i} className="text-sm text-foreground flex gap-2">
                <span className="text-muted-foreground font-medium shrink-0">{i + 1}.</span>
                <span>{q}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {!speechSupported && (
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5">
          <AlertCircle className="h-3.5 w-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700">Automatic transcription may not work well in this browser. Chrome is recommended for the best live speech-to-text results.</p>
        </div>
      )}

      <div className="rounded-2xl border border-border bg-card p-5 flex flex-col items-center gap-4">
        {!audioUrl ? (
          <>
            <div className={`h-20 w-20 rounded-full flex items-center justify-center transition-all
              ${recordState === 'recording' ? 'bg-red-500 animate-pulse' : 'bg-[#1A1A2E]'}`}>
              {recordState === 'recording' ? (
                <button onClick={stopRecording} className="h-full w-full flex items-center justify-center">
                  <Square className="h-7 w-7 text-white" />
                </button>
              ) : (
                <button onClick={startRecording} className="h-full w-full flex items-center justify-center">
                  <Mic className="h-8 w-8 text-[#F5A623]" strokeWidth={1.5} />
                </button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {recordState === 'recording'
                ? `🔴 Recording… ${recordedSeconds}s (aim for ${topic.targetSeconds}s+)`
                : 'Tap to record, or upload an audio file below'}
            </p>

            <div className="flex items-center gap-2 w-full">
              <div className="h-px flex-1 bg-border" />
              <span className="text-[10px] text-muted-foreground uppercase">or</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            <button onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-muted/40 transition-colors">
              <Upload className="h-4 w-4" /> Upload Audio File
            </button>
            <input ref={fileInputRef} type="file" accept="audio/*" className="hidden" onChange={handleFileUpload} />
          </>
        ) : (
          <div className="w-full space-y-3">
            <div className="flex items-center gap-2 text-sm text-foreground">
              <FileAudio className="h-4 w-4 text-[#4A90E2]" />
              <span className="flex-1 truncate">{fileName || 'Recorded audio'}</span>
              <span className={`text-xs font-medium ${meetsMin ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                {recordedSeconds}s {meetsMin && '✓'}
              </span>
              <button onClick={resetAudio} className="p-1 rounded-md hover:bg-muted/60 text-muted-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            <audio controls src={audioUrl} className="w-full h-10" />
            <button
              onClick={handleSubmit}
              disabled={recordState === 'processing'}
              className="w-full flex items-center justify-center gap-2 px-5 py-2.5 bg-[#F5A623] text-white rounded-xl text-sm font-semibold hover:bg-[#E09400] disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              {recordState === 'processing' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {recordState === 'processing' ? 'Transcribing & Evaluating…' : 'Submit for Feedback'}
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
          <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
          <span className="text-sm text-red-700">{error}</span>
        </div>
      )}

      {lastResult?.aiFeedback && (
        <div className="space-y-2">
          {lastResult.content && (
            <div className="rounded-xl bg-muted/40 px-4 py-3">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">What we heard</p>
              <p className="text-sm text-foreground italic">"{lastResult.content}"</p>
            </div>
          )}
          <FeedbackCard feedback={lastResult.aiFeedback} />
        </div>
      )}
    </div>
  );
}

// ── Shared Feedback / Result Components ─────────────────────────────────────────

function FeedbackCard({ feedback }: { feedback: NonNullable<PracticeSubmission['aiFeedback']> }) {
  const color = feedback.score >= 80 ? 'emerald' : feedback.score >= 60 ? 'amber' : 'rose';
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border bg-card p-5 space-y-4">
      <div className="flex items-center gap-4">
        <div className={`h-16 w-16 rounded-full flex items-center justify-center shrink-0
          ${color === 'emerald' ? 'bg-emerald-100 text-emerald-700' : color === 'amber' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'}`}>
          <span className="text-xl font-bold">{feedback.score}</span>
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-foreground">AI Feedback</p>
          <p className="text-xs text-muted-foreground mt-0.5">{feedback.feedback}</p>
        </div>
      </div>

      {(feedback.grammarScore !== undefined || feedback.vocabularyScore !== undefined || feedback.fluencyScore !== undefined) && (
        <div className="grid grid-cols-3 gap-2">
          {feedback.grammarScore !== undefined && <MiniScore label="Grammar" value={feedback.grammarScore} />}
          {feedback.vocabularyScore !== undefined && <MiniScore label="Vocabulary" value={feedback.vocabularyScore} />}
          {feedback.fluencyScore !== undefined && <MiniScore label="Fluency" value={feedback.fluencyScore} />}
        </div>
      )}

      {(feedback.strengths?.length || feedback.improvements?.length) ? (
        <div className="grid sm:grid-cols-2 gap-3">
          {feedback.strengths && feedback.strengths.length > 0 && (
            <div className="rounded-xl bg-emerald-50 px-3 py-2.5">
              <p className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wider mb-1">Strengths</p>
              <ul className="space-y-1">
                {feedback.strengths.map((s, i) => <li key={i} className="text-xs text-emerald-800">• {s}</li>)}
              </ul>
            </div>
          )}
          {feedback.improvements && feedback.improvements.length > 0 && (
            <div className="rounded-xl bg-amber-50 px-3 py-2.5">
              <p className="text-[10px] font-semibold text-amber-700 uppercase tracking-wider mb-1">To Improve</p>
              <ul className="space-y-1">
                {feedback.improvements.map((s, i) => <li key={i} className="text-xs text-amber-800">• {s}</li>)}
              </ul>
            </div>
          )}
        </div>
      ) : null}
    </motion.div>
  );
}

function MiniScore({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-muted/40 px-2 py-2 text-center">
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className="text-sm font-bold text-foreground mt-0.5">{value}</p>
    </div>
  );
}

function SubmissionResultCard({ submission }: { submission: PracticeSubmission }) {
  const [expanded, setExpanded] = useState(false);
  const score = submission.aiFeedback?.score;
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <button onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/30 transition-colors">
        <div className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 text-[11px] font-bold
          ${submission.status === 'evaluating' ? 'bg-muted text-muted-foreground'
            : submission.status === 'failed' ? 'bg-rose-100 text-rose-600'
            : (score ?? 0) >= 80 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
          {submission.status === 'evaluating' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : submission.status === 'failed' ? '!' : score}
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {submission.mode === 'writing' ? <PenLine className="h-3 w-3" /> : <Mic className="h-3 w-3" />}
          <span className="capitalize">{submission.mode}</span>
        </div>
        <span className="text-xs text-muted-foreground flex items-center gap-1 ml-auto">
          <Clock className="h-3 w-3" /> {new Date(submission.submittedAt).toLocaleDateString()}
        </span>
        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden">
            <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
              <p className="text-sm text-foreground">{submission.content}</p>
              {submission.aiFeedback && <FeedbackCard feedback={submission.aiFeedback} />}
              {submission.status === 'failed' && (
                <p className="text-xs text-rose-600 flex items-center gap-1"><AlertCircle className="h-3 w-3" /> Evaluation failed. Please try submitting again.</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
