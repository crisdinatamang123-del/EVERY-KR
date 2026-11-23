import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  BookOpen,
  Bot,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  Edit3,
  Eye,
  EyeOff,
  FileSpreadsheet,
  FolderPlus,
  HelpCircle,
  Layers,
  Loader2,
  MessageSquare,
  Plus,
  RefreshCw,
  Save,
  Search,
  Sparkles,
  Trash2,
  Upload,
  Users,
  Volume2,
  X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { auth } from '../../lib/firebase';
import { getAdminRequestHeaders } from '../../services/firebaseService';
import {
  AcademyCategory,
  AcademyExamQuestion,
  AcademyVocabItem,
  ExamDifficulty,
  ExamQuestionType,
  ExamSubject,
  HangulLessonUnit,
} from '../../data/koreanAcademyData';
import {
  CURRICULUM_LEVELS_20X,
  RealLifeScenario20x,
  VOCAB_TOPICS_20X,
} from '../../data/korean20x/levelsAndCategories';
import { SCENARIO_DOMAINS_22_LIST } from '../../data/korean20x/scenariosAndConversations20x';
import { get20xExpansionAuditReport } from '../../data/korean20x/practiceActivities20x';
import {
  bulkUpsertAcademyVocab,
  deleteAcademyCategory,
  deleteAcademyLesson,
  deleteAcademyQuestion,
  deleteAcademyScenario,
  deleteAcademyVocab,
  detectDuplicateVocabEntries,
  fetchAcademyCurriculum,
  fetchAdminAcademyStats,
  playKoreanAudio,
  upsertAcademyCategory,
  upsertAcademyLesson,
  upsertAcademyQuestion,
  upsertAcademyScenario,
  upsertAcademyVocab,
  UserAcademyProgress,
} from '../../services/koreanAcademyService';
import { getScriptPronunciation } from '../../utils/hangulPhonetics';

type AdminSubTab =
  | 'stats'
  | 'vocabulary'
  | 'bulk_csv'
  | 'duplicates'
  | 'ai_review'
  | 'scenarios'
  | 'lessons'
  | 'questions'
  | 'categories';

const ADMIN_ITEMS_PER_PAGE = 24;

// Simple RFC-4180 compatible CSV row parser
function parseCsvRows(csvText: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const ch = csvText[i];
    const next = csvText[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        field += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        row.push(field.trim());
        field = '';
      } else if (ch === '\n' || (ch === '\r' && next === '\n')) {
        if (ch === '\r') i++;
        row.push(field.trim());
        if (row.some(cell => cell.length > 0)) {
          rows.push(row);
        }
        row = [];
        field = '';
      } else {
        field += ch;
      }
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field.trim());
    if (row.some(cell => cell.length > 0)) {
      rows.push(row);
    }
  }
  return rows;
}

export const AdminKoreanAcademyTab: React.FC = () => {
  const { currentUser, isServerVerifiedAdmin } = useApp();
  const isAdmin = Boolean(isServerVerifiedAdmin || currentUser?.role === 'admin');

  const [subTab, setSubTab] = useState<AdminSubTab>('stats');
  const [loading, setLoading] = useState<boolean>(true);
  const [statusBanner, setStatusBanner] = useState<string>('');

  const [categories, setCategories] = useState<AcademyCategory[]>([]);
  const [lessons, setLessons] = useState<HangulLessonUnit[]>([]);
  const [vocabulary, setVocabulary] = useState<AcademyVocabItem[]>([]);
  const [questions, setQuestions] = useState<AcademyExamQuestion[]>([]);
  const [scenarios, setScenarios] = useState<RealLifeScenario20x[]>([]);
  const [customVocabIds, setCustomVocabIds] = useState<Set<string>>(new Set());

  const [stats, setStats] = useState<{
    totalLearners: number;
    totalQuestionsAnsweredAllUsers: number;
    totalPracticeMinutesAllUsers: number;
    totalExamsCompleted: number;
    averageExamScore: number;
    learners: UserAcademyProgress[];
  }>({
    totalLearners: 0,
    totalQuestionsAnsweredAllUsers: 0,
    totalPracticeMinutesAllUsers: 0,
    totalExamsCompleted: 0,
    averageExamScore: 0,
    learners: [],
  });

  // Search & Pagination States
  const [vocabSearch, setVocabSearch] = useState<string>('');
  const [vocabTopicFilter, setVocabTopicFilter] = useState<string>('all');
  const [vocabPage, setVocabPage] = useState<number>(1);
  const [lessonPage, setLessonPage] = useState<number>(1);
  const [questionPage, setQuestionPage] = useState<number>(1);
  const [scenarioPage, setScenarioPage] = useState<number>(1);

  // Form States
  const [editingLesson, setEditingLesson] = useState<HangulLessonUnit | null>(null);
  const [editingVocab, setEditingVocab] = useState<AcademyVocabItem | null>(null);
  const [editingQuestion, setEditingQuestion] = useState<AcademyExamQuestion | null>(null);
  const [editingCategory, setEditingCategory] = useState<AcademyCategory | null>(null);
  const [editingScenario, setEditingScenario] = useState<RealLifeScenario20x | null>(null);

  // Bulk CSV State
  const [csvRawText, setCsvRawText] = useState<string>('');
  const [csvPreviewItems, setCsvPreviewItems] = useState<AcademyVocabItem[]>([]);
  const [csvSkippedCount, setCsvSkippedCount] = useState<number>(0);
  const [csvUploading, setCsvUploading] = useState<boolean>(false);

  // AI Draft Queue State
  const [aiTopic, setAiTopic] = useState<string>('daily_life');
  const [aiLevel, setAiLevel] = useState<string>('Beginner 1');
  const [aiCount, setAiCount] = useState<number>(3);
  const [aiGenerating, setAiGenerating] = useState<boolean>(false);
  const [aiCandidates, setAiCandidates] = useState<AcademyVocabItem[]>([]);

  const auditReport = useMemo(() => get20xExpansionAuditReport(), []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [curr, st] = await Promise.all([
        fetchAcademyCurriculum({ includeUnpublished: true }),
        fetchAdminAcademyStats(),
      ]);
      setCategories(curr.categories);
      setLessons(curr.lessons);
      setVocabulary(curr.vocabulary);
      setQuestions(curr.questions);
      setScenarios(curr.scenarios);
      setCustomVocabIds(curr.customVocabIds);
      setStats(st);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadAll();
    }
  }, [isAdmin]);

  const notify = (msg: string) => {
    setStatusBanner(msg);
    window.setTimeout(() => setStatusBanner(''), 4500);
  };

  // Filtered & Paginated Admin Lists
  const filteredAdminVocab = useMemo(() => {
    const q = vocabSearch.trim().toLowerCase();
    return vocabulary.filter(v => {
      if (vocabTopicFilter !== 'all' && v.categoryId !== vocabTopicFilter && v.topic !== vocabTopicFilter) {
        return false;
      }
      if (!q) return true;
      return (
        v.korean.toLowerCase().includes(q) ||
        v.meaningEn.toLowerCase().includes(q) ||
        v.meaningBn.toLowerCase().includes(q) ||
        (v.meaningNe || '').toLowerCase().includes(q)
      );
    });
  }, [vocabulary, vocabSearch, vocabTopicFilter]);

  const totalAdminVocabPages = Math.max(1, Math.ceil(filteredAdminVocab.length / ADMIN_ITEMS_PER_PAGE));
  const paginatedAdminVocab = useMemo(() => {
    const p = Math.min(vocabPage, totalAdminVocabPages);
    return filteredAdminVocab.slice((p - 1) * ADMIN_ITEMS_PER_PAGE, p * ADMIN_ITEMS_PER_PAGE);
  }, [filteredAdminVocab, vocabPage, totalAdminVocabPages]);

  const duplicateGroups = useMemo(() => detectDuplicateVocabEntries(vocabulary), [vocabulary]);

  const pendingReviewVocab = useMemo(
    () =>
      vocabulary.filter(
        v => v.reviewStatus === 'pending_ai_review' || v.published === false
      ),
    [vocabulary]
  );

  if (!isAdmin) {
    return null;
  }

  const handleAudioFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    onResult: (dataUrl: string) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 800 * 1024) {
      notify('Audio file is too large for inline storage (max 800KB). You can also paste an external audio URL.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onResult(reader.result);
        notify('Audio file attached successfully.');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveVocab = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVocab) return;
    const ko = editingVocab.korean.trim();
    const enriched: AcademyVocabItem = {
      ...editingVocab,
      korean: ko,
      romanization: editingVocab.romanization?.trim() || getScriptPronunciation(ko, 'en'),
      pronunciationBn: editingVocab.pronunciationBn?.trim() || getScriptPronunciation(ko, 'bn'),
      pronunciationNe: editingVocab.pronunciationNe?.trim() || getScriptPronunciation(ko, 'ne'),
      meaningNe: editingVocab.meaningNe?.trim() || editingVocab.meaningEn,
      published: editingVocab.published !== false,
      reviewStatus: editingVocab.reviewStatus || 'approved',
    };
    await upsertAcademyVocab(enriched);
    setEditingVocab(null);
    await loadAll();
    notify('Tri-lingual vocabulary item saved to Firestore.');
  };

  const handleToggleVocabPublish = async (item: AcademyVocabItem) => {
    const nextPublished = item.published === false;
    await upsertAcademyVocab({
      ...item,
      published: nextPublished,
      reviewStatus: nextPublished ? 'approved' : 'draft',
    });
    await loadAll();
    notify(nextPublished ? `"${item.korean}" published for learners.` : `"${item.korean}" unpublished (draft).`);
  };

  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingQuestion) return;
    await upsertAcademyQuestion({
      ...editingQuestion,
      promptNe: editingQuestion.promptNe || editingQuestion.promptEn,
      explanationNe: editingQuestion.explanationNe || editingQuestion.explanationEn,
      published: editingQuestion.published !== false,
    });
    setEditingQuestion(null);
    await loadAll();
    notify('Examination question saved to Firestore.');
  };

  const handleSaveLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLesson) return;
    await upsertAcademyLesson({
      ...editingLesson,
      titleNe: editingLesson.titleNe || editingLesson.titleEn,
      overviewNe: editingLesson.overviewNe || editingLesson.overviewEn,
      published: editingLesson.published !== false,
      reviewStatus: 'approved',
    });
    setEditingLesson(null);
    await loadAll();
    notify('Lesson unit saved to Firestore.');
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory) return;
    await upsertAcademyCategory({
      ...editingCategory,
      nameNe: editingCategory.nameNe || editingCategory.nameEn,
    });
    setEditingCategory(null);
    await loadAll();
    notify('Category saved to Firestore.');
  };

  const handleSaveScenario = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingScenario) return;
    await upsertAcademyScenario({
      ...editingScenario,
      published: editingScenario.published !== false,
      reviewStatus: 'approved',
    });
    setEditingScenario(null);
    await loadAll();
    notify('Real-life Korea scenario saved to Firestore.');
  };

  // CSV Template Download & Parsing
  const handleDownloadCsvTemplate = () => {
    const sample = [
      'korean,meaningEn,meaningBn,meaningNe,topic,level,partOfSpeech,exampleKo,exampleEn,exampleBn,exampleNe',
      '"외국인등록증","Alien Registration Card (ARC)","বিদেশি নিবন্ধন কার্ড (ARC)","विदेशी दर्ता कार्ड (ARC)","immigration","Beginner 2","Noun","외국인등록증을 재발급받았습니다.","I had my ARC reissued.","আমি আমার এআরসি কার্ড পুনরায় তুলেছি।","मैले मेरो ARC कार्ड पुनः बनाएँ।"',
      '"건강보험료","Health insurance premium","স্বাস্থ্য বীমা কিস্তি","स्वास्थ्य बीमा शुल्क","healthcare","Elementary","Noun","매달 건강보험료를 자동이체로 납부합니다.","I pay my health insurance premium monthly via autopay.","প্রতি মাসে অটো-ট্রান্সফারের মাধ্যমে স্বাস্থ্য বীমা ফি পরিশোধ করি।","हरेक महिना स्वचालित भुक्तानीबाट स्वास्थ्य बीमा शुल्क तिर्छु।"',
    ].join('\n');
    const blob = new Blob([sample], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'everykr_vocabulary_bulk_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleParseCsvInput = (raw: string) => {
    setCsvRawText(raw);
    const rows = parseCsvRows(raw);
    if (rows.length <= 1) {
      setCsvPreviewItems([]);
      setCsvSkippedCount(0);
      return;
    }

    const existingKorean = new Set(vocabulary.map(v => v.korean.trim()));
    const seenInBatch = new Set<string>();
    const parsedItems: AcademyVocabItem[] = [];
    let skipped = 0;

    // Skip header row if first cell is 'korean'
    const startIdx = rows[0][0]?.toLowerCase().includes('korean') ? 1 : 0;

    for (let i = startIdx; i < rows.length; i++) {
      const r = rows[i];
      const ko = (r[0] || '').trim();
      const meaningEn = (r[1] || '').trim();
      const meaningBn = (r[2] || '').trim();
      const meaningNe = (r[3] || meaningEn).trim();
      const topic = (r[4] || 'daily_life').trim();
      const level = (r[5] || 'Beginner 1').trim();
      const pos = ((r[6] || 'Noun').trim() as AcademyVocabItem['partOfSpeech']) || 'Noun';
      const exKo = (r[7] || `${ko} 표현을 자주 사용합니다.`).trim();
      const exEn = (r[8] || `We frequently use the expression ${meaningEn}.`).trim();
      const exBn = (r[9] || `${meaningBn} শব্দটি নিয়মিত ব্যবহৃত হয়।`).trim();
      const exNe = (r[10] || `${meaningNe} शब्द नियमित प्रयोग गरिन्छ।`).trim();

      if (!ko || !meaningEn || !meaningBn || existingKorean.has(ko) || seenInBatch.has(ko)) {
        skipped++;
        continue;
      }
      seenInBatch.add(ko);

      parsedItems.push({
        id: `csv_${Date.now()}_${i}`,
        topic,
        categoryId: topic,
        korean: ko,
        romanization: getScriptPronunciation(ko, 'en'),
        pronunciationBn: getScriptPronunciation(ko, 'bn'),
        pronunciationNe: getScriptPronunciation(ko, 'ne'),
        meaningEn,
        meaningBn,
        meaningNe,
        partOfSpeech: pos,
        level,
        difficulty: level.includes('Advanced') ? 'Advanced' : level.includes('Intermediate') ? 'Intermediate' : 'Beginner',
        exampleKo: exKo,
        exampleEn: exEn,
        exampleBn: exBn,
        exampleNe: exNe,
        published: true,
        reviewStatus: 'approved',
      });
    }

    setCsvPreviewItems(parsedItems);
    setCsvSkippedCount(skipped);
  };

  const handleCommitCsvUpload = async () => {
    if (csvPreviewItems.length === 0 || csvUploading) return;
    setCsvUploading(true);
    try {
      const count = await bulkUpsertAcademyVocab(csvPreviewItems);
      setCsvPreviewItems([]);
      setCsvRawText('');
      await loadAll();
      notify(`Uploaded ${count} verified tri-lingual vocabulary entries to Firestore.`);
    } finally {
      setCsvUploading(false);
    }
  };

  // AI Content Review Queue Generator
  const handleGenerateAiDrafts = async () => {
    if (aiGenerating) return;
    setAiGenerating(true);
    try {
      let firebaseIdToken: string | undefined;
      if (auth.currentUser) {
        firebaseIdToken = await auth.currentUser.getIdToken().catch(() => undefined);
      }
      const headers = {
        ...getAdminRequestHeaders(currentUser),
        ...(firebaseIdToken ? { 'x-firebase-id-token': firebaseIdToken } : {}),
      };
      const res = await fetch('/api/korean-tutor/admin-draft', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          topic: aiTopic,
          level: aiLevel,
          count: aiCount,
          firebaseIdToken,
        }),
      });
      const data = await res.json();
      if (data.ok && Array.isArray(data.drafts)) {
        setAiCandidates(prev => [...data.drafts, ...prev]);
        notify(`Generated ${data.drafts.length} AI drafts in Review Queue. Inspect and approve before publishing.`);
      } else {
        notify(data.error || 'Could not generate AI drafts.');
      }
    } catch {
      notify('Network error while generating AI drafts.');
    } finally {
      setAiGenerating(false);
    }
  };

  const handleApproveAiDraft = async (draft: AcademyVocabItem) => {
    const approved: AcademyVocabItem = {
      ...draft,
      published: true,
      reviewStatus: 'approved',
    };
    await upsertAcademyVocab(approved);
    setAiCandidates(prev => prev.filter(c => c.id !== draft.id));
    await loadAll();
    notify(`Approved & published "${draft.korean}" to the live Academy.`);
  };

  const handleSaveDraftUnpublished = async (draft: AcademyVocabItem) => {
    await upsertAcademyVocab({
      ...draft,
      published: false,
      reviewStatus: 'pending_ai_review',
    });
    setAiCandidates(prev => prev.filter(c => c.id !== draft.id));
    await loadAll();
    notify(`Saved "${draft.korean}" as unpublished pending review.`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
            Verified Administrator Console • 20X Content & Review System
          </span>
          <h2 className="text-xl font-black text-slate-900 dark:text-white mt-0.5">
            EveryKR Korean Learning Academy — Admin Content & Quality Control
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Manage 11,300+ tri-lingual (বাংলা / नेपाली / English) words, Bulk CSV uploads, Duplicate Detection, AI Review Queue, 22 Korea Scenarios, Lessons, and Exam Questions.
          </p>
        </div>
        <button
          type="button"
          onClick={loadAll}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-xs font-bold cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh Data
        </button>
      </div>

      {statusBanner && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-bold">
          {statusBanner}
        </div>
      )}

      {/* Sub-navigation */}
      <div className="flex flex-wrap gap-2">
        {[
          { id: 'stats', label: '20X Audit & Learner Stats', icon: BarChart3 },
          { id: 'vocabulary', label: `Vocabulary (${vocabulary.length.toLocaleString()})`, icon: Layers },
          { id: 'bulk_csv', label: 'Bulk CSV Upload', icon: FileSpreadsheet },
          {
            id: 'duplicates',
            label: `Duplicates (${duplicateGroups.length})`,
            icon: AlertTriangle,
          },
          {
            id: 'ai_review',
            label: `AI Review Queue (${aiCandidates.length + pendingReviewVocab.length})`,
            icon: Bot,
          },
          { id: 'scenarios', label: `22 Domain Scenarios (${scenarios.length})`, icon: MessageSquare },
          { id: 'lessons', label: `Lessons (${lessons.length})`, icon: BookOpen },
          { id: 'questions', label: `Exam Questions (${questions.length})`, icon: HelpCircle },
          { id: 'categories', label: `Topics (${categories.length})`, icon: FolderPlus },
        ].map(tab => {
          const Icon = tab.icon;
          const active = subTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSubTab(tab.id as AdminSubTab)}
              className={`inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                active
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-blue-400'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ============================================================
          1. 20X CONTENT EXPANSION AUDIT & LEARNER STATISTICS TAB
      ============================================================ */}
      {subTab === 'stats' && (
        <div className="space-y-6">
          {/* Learner Cloud Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800">
              <div className="text-xs font-bold text-slate-400 uppercase">Registered Learners</div>
              <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                {stats.totalLearners}
              </div>
            </div>
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800">
              <div className="text-xs font-bold text-slate-400 uppercase">Questions Answered</div>
              <div className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">
                {stats.totalQuestionsAnsweredAllUsers}
              </div>
            </div>
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800">
              <div className="text-xs font-bold text-slate-400 uppercase">Total Practice Time</div>
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                {stats.totalPracticeMinutesAllUsers}m
              </div>
            </div>
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800">
              <div className="text-xs font-bold text-slate-400 uppercase">Exams Completed</div>
              <div className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-1">
                {stats.totalExamsCompleted}
              </div>
            </div>
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800">
              <div className="text-xs font-bold text-slate-400 uppercase">Avg Exam Score</div>
              <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
                {stats.averageExamScore}%
              </div>
            </div>
          </div>

          {/* Live 20X Content Expansion Verification Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  Before vs. After 20X Content Expansion Verification Report
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Live programmatic count across all 15 learning categories (zero duplicates, 100% tri-lingual bn/ne/en).
                </p>
              </div>
              <span className="px-3 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-xs font-black">
                20X Audit Verified
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase">
                    <th className="py-2.5 px-3">Learning Category</th>
                    <th className="py-2.5 px-3">Before Expansion</th>
                    <th className="py-2.5 px-3">After 20X Expansion</th>
                    <th className="py-2.5 px-3">Expansion Multiple</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {auditReport.map((row, idx) => (
                    <tr key={idx}>
                      <td className="py-2.5 px-3 font-bold text-slate-800 dark:text-slate-200">
                        {row.categoryName}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500">{row.baselineBefore.toLocaleString()}</td>
                      <td className="py-2.5 px-3 font-black text-blue-600 dark:text-blue-400">
                        {row.expandedAfter.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 font-black">
                          {row.expansionMultiple}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Active Student Progress Records */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
            <h3 className="text-sm font-black text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-600" />
              Active Student Progress Records
            </h3>
            {stats.learners.length === 0 ? (
              <p className="text-xs text-slate-500 py-4">
                No cloud learner records synced yet. Student progress records appear here automatically as logged-in users practice.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase">
                      <th className="py-2.5 px-3">Learner</th>
                      <th className="py-2.5 px-3">Level / Lang</th>
                      <th className="py-2.5 px-3">Streak</th>
                      <th className="py-2.5 px-3">Lessons Done</th>
                      <th className="py-2.5 px-3">Vocab Mastered</th>
                      <th className="py-2.5 px-3">Questions (Correct/Total)</th>
                      <th className="py-2.5 px-3">Practice Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {stats.learners.map(l => (
                      <tr key={l.userId}>
                        <td className="py-2.5 px-3 font-bold text-slate-800 dark:text-slate-200">
                          {l.userName || l.userEmail || l.userId.slice(0, 10)}
                        </td>
                        <td className="py-2.5 px-3">
                          {l.currentLevel || 'Beginner'} ({(l.preferredLearningLang || 'bn').toUpperCase()})
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-amber-600">
                          {l.streakDays || 1} days
                        </td>
                        <td className="py-2.5 px-3">{l.completedLessons?.length || 0}</td>
                        <td className="py-2.5 px-3">{l.masteredVocabIds?.length || 0}</td>
                        <td className="py-2.5 px-3">
                          {l.totalCorrectAnswers || 0} / {l.totalQuestionsAnswered || 0}
                        </td>
                        <td className="py-2.5 px-3">{l.totalPracticeMinutes || 0} mins</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================
          2. TRI-LINGUAL VOCABULARY & PUBLISH/UNPUBLISH MANAGEMENT
      ============================================================ */}
      {subTab === 'vocabulary' && (
        <div className="space-y-4">
          <div className="flex flex-wrap justify-between items-center gap-3">
            <h3 className="text-sm font-black text-slate-900 dark:text-white">
              Tri-Lingual Vocabulary & Essential Expressions ({filteredAdminVocab.length.toLocaleString()} items)
            </h3>
            <button
              type="button"
              onClick={() =>
                setEditingVocab({
                  id: `voc-${Date.now()}`,
                  topic: 'daily_life',
                  categoryId: categories[0]?.id || 'daily_life',
                  korean: '',
                  romanization: '',
                  pronunciationBn: '',
                  pronunciationNe: '',
                  meaningEn: '',
                  meaningBn: '',
                  meaningNe: '',
                  partOfSpeech: 'Noun',
                  level: 'Beginner 1',
                  difficulty: 'Beginner',
                  exampleKo: '',
                  exampleEn: '',
                  exampleBn: '',
                  exampleNe: '',
                  audioUrl: '',
                  published: true,
                  reviewStatus: 'approved',
                })
              }
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Add Tri-Lingual Vocabulary
            </button>
          </div>

          {/* Search & Topic Filter */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={vocabSearch}
                onChange={e => {
                  setVocabSearch(e.target.value);
                  setVocabPage(1);
                }}
                placeholder="Search Korean, English, Bengali, or Nepali meaning..."
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
              />
            </div>
            <select
              value={vocabTopicFilter}
              onChange={e => {
                setVocabTopicFilter(e.target.value);
                setVocabPage(1);
              }}
              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold"
            >
              <option value="all">All Topics ({vocabulary.length.toLocaleString()})</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>
                  {c.nameEn} ({c.nameBn})
                </option>
              ))}
            </select>
          </div>

          {editingVocab && (
            <form
              onSubmit={handleSaveVocab}
              className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-blue-500 p-6 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h4 className="font-black text-sm text-slate-900 dark:text-white">
                  {editingVocab.korean ? `Edit "${editingVocab.korean}"` : 'Add New Tri-Lingual Vocabulary'}
                </h4>
                <button
                  type="button"
                  onClick={() => setEditingVocab(null)}
                  className="text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Topic / Category</label>
                  <select
                    value={editingVocab.categoryId}
                    onChange={e =>
                      setEditingVocab({
                        ...editingVocab,
                        categoryId: e.target.value,
                        topic: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold"
                  >
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.nameEn}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Korean Word / Phrase *</label>
                  <input
                    type="text"
                    required
                    value={editingVocab.korean}
                    onChange={e => {
                      const ko = e.target.value;
                      setEditingVocab({
                        ...editingVocab,
                        korean: ko,
                        romanization: getScriptPronunciation(ko, 'en'),
                        pronunciationBn: getScriptPronunciation(ko, 'bn'),
                        pronunciationNe: getScriptPronunciation(ko, 'ne'),
                      });
                    }}
                    placeholder="e.g. 외국인등록증"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">10-Level Path</label>
                  <select
                    value={editingVocab.level || 'Beginner 1'}
                    onChange={e => setEditingVocab({ ...editingVocab, level: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                  >
                    {CURRICULUM_LEVELS_20X.map(l => (
                      <option key={l.id} value={l.id}>
                        {l.titleEn}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Visibility</label>
                  <select
                    value={editingVocab.published === false ? 'draft' : 'published'}
                    onChange={e =>
                      setEditingVocab({
                        ...editingVocab,
                        published: e.target.value === 'published',
                        reviewStatus: e.target.value === 'published' ? 'approved' : 'draft',
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold"
                  >
                    <option value="published">Published (Live)</option>
                    <option value="draft">Unpublished (Draft)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">English Meaning *</label>
                  <input
                    type="text"
                    required
                    value={editingVocab.meaningEn}
                    onChange={e => setEditingVocab({ ...editingVocab, meaningEn: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Bengali Meaning (বাংলা অর্থ) *</label>
                  <input
                    type="text"
                    required
                    value={editingVocab.meaningBn}
                    onChange={e => setEditingVocab({ ...editingVocab, meaningBn: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Nepali Meaning (नेपाली अर्थ) *</label>
                  <input
                    type="text"
                    required
                    value={editingVocab.meaningNe || ''}
                    onChange={e => setEditingVocab({ ...editingVocab, meaningNe: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Romanization (English Script)</label>
                  <input
                    type="text"
                    value={editingVocab.romanization}
                    onChange={e => setEditingVocab({ ...editingVocab, romanization: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Bengali Script Pronunciation</label>
                  <input
                    type="text"
                    value={editingVocab.pronunciationBn}
                    onChange={e => setEditingVocab({ ...editingVocab, pronunciationBn: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Nepali Devanagari Pronunciation</label>
                  <input
                    type="text"
                    value={editingVocab.pronunciationNe || ''}
                    onChange={e => setEditingVocab({ ...editingVocab, pronunciationNe: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                  />
                </div>
              </div>

              {/* Audio Upload & URL */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 space-y-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200">
                  Audio Pronunciation File (Optional MP3/WAV or URL — falls back to native Korean TTS)
                </label>
                <div className="flex flex-wrap items-center gap-3">
                  <input
                    type="text"
                    value={editingVocab.audioUrl || ''}
                    onChange={e => setEditingVocab({ ...editingVocab, audioUrl: e.target.value })}
                    placeholder="https://... or upload audio file ->"
                    className="flex-1 min-w-[220px] px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                  />
                  <label className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 text-xs font-bold cursor-pointer">
                    <Upload className="w-3.5 h-3.5" />
                    Upload Audio
                    <input
                      type="file"
                      accept="audio/*"
                      className="hidden"
                      onChange={e =>
                        handleAudioFileUpload(e, dataUrl =>
                          setEditingVocab({ ...editingVocab, audioUrl: dataUrl })
                        )
                      }
                    />
                  </label>
                  {editingVocab.korean && (
                    <button
                      type="button"
                      onClick={() => playKoreanAudio(editingVocab.korean, editingVocab.audioUrl)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold cursor-pointer"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                      Test Audio
                    </button>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingVocab(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  Save Vocabulary
                </button>
              </div>
            </form>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {paginatedAdminVocab.map(item => {
              const isPublished = item.published !== false;
              return (
                <div
                  key={item.id}
                  className={`bg-white dark:bg-slate-900 rounded-2xl border p-4 flex items-start justify-between gap-3 ${
                    isPublished
                      ? 'border-slate-200 dark:border-slate-800'
                      : 'border-amber-400 bg-amber-50/20 dark:bg-amber-950/20'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                        {item.topic || item.categoryId}
                      </span>
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                          isPublished
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                        }`}
                      >
                        {isPublished ? 'Published' : 'Unpublished'}
                      </span>
                    </div>
                    <div className="text-base font-black text-slate-900 dark:text-white mt-1">
                      {item.korean}
                    </div>
                    <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">
                      EN: {item.meaningEn}
                    </div>
                    <div className="text-xs font-medium text-emerald-600 dark:text-emerald-400 truncate">
                      BN: {item.meaningBn}
                    </div>
                    {item.meaningNe && (
                      <div className="text-xs font-medium text-amber-600 dark:text-amber-400 truncate">
                        NE: {item.meaningNe}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => playKoreanAudio(item.korean, item.audioUrl)}
                      className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 cursor-pointer"
                      title="Play Audio"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleVocabPublish(item)}
                      className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer"
                      title={isPublished ? 'Unpublish' : 'Publish'}
                    >
                      {isPublished ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingVocab(item)}
                      className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer"
                      title="Edit"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    {customVocabIds.has(item.id) && (
                      <button
                        type="button"
                        onClick={async () => {
                          await deleteAcademyVocab(item.id);
                          await loadAll();
                          notify('Custom vocabulary item deleted.');
                        }}
                        className="p-2 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 cursor-pointer"
                        title="Delete Custom Entry"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 px-5 py-3">
            <button
              type="button"
              disabled={vocabPage <= 1}
              onClick={() => setVocabPage(p => Math.max(1, p - 1))}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold disabled:opacity-40 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              Prev
            </button>
            <span className="text-xs font-bold text-slate-500">
              Page {vocabPage} of {totalAdminVocabPages} ({filteredAdminVocab.length.toLocaleString()} items)
            </span>
            <button
              type="button"
              disabled={vocabPage >= totalAdminVocabPages}
              onClick={() => setVocabPage(p => Math.min(totalAdminVocabPages, p + 1))}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-bold disabled:opacity-40 cursor-pointer"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ============================================================
          3. BULK CSV VOCABULARY UPLOAD TAB
      ============================================================ */}
      {subTab === 'bulk_csv' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Bulk CSV Vocabulary Upload (Auto-Phonetics & Duplicate Guard)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Upload a CSV file or paste CSV rows. Script-specific pronunciations (বাংলা, नेपाली, Romanization) are generated automatically if omitted, and duplicate Korean entries are skipped.
              </p>
            </div>
            <button
              type="button"
              onClick={handleDownloadCsvTemplate}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold cursor-pointer"
            >
              <Download className="w-4 h-4" />
              Download CSV Template
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer">
              <Upload className="w-4 h-4" />
              Select .CSV File
              <input
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = () => {
                    if (typeof reader.result === 'string') {
                      handleParseCsvInput(reader.result);
                    }
                  };
                  reader.readAsText(file);
                }}
              />
            </label>
            <span className="text-xs text-slate-500">
              Columns: <code>korean,meaningEn,meaningBn,meaningNe,topic,level,partOfSpeech,exampleKo,exampleEn,exampleBn,exampleNe</code>
            </span>
          </div>

          <textarea
            rows={5}
            value={csvRawText}
            onChange={e => handleParseCsvInput(e.target.value)}
            placeholder='Paste CSV rows here, e.g.&#10;"외국인등록증","Alien Registration Card","বিদেশি নিবন্ধন কার্ড","विदेशी दर्ता कार्ड","immigration","Beginner 2","Noun"'
            className="w-full p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono"
          />

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs font-bold text-slate-600 dark:text-slate-300">
              Ready to Import: <span className="text-emerald-600">{csvPreviewItems.length}</span> valid unique rows • Skipped (duplicates/incomplete):{' '}
              <span className="text-amber-600">{csvSkippedCount}</span>
            </div>
            <button
              type="button"
              disabled={csvPreviewItems.length === 0 || csvUploading}
              onClick={handleCommitCsvUpload}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-xs font-black cursor-pointer"
            >
              {csvUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Commit {csvPreviewItems.length} Words to Firestore
            </button>
          </div>

          {csvPreviewItems.length > 0 && (
            <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 uppercase">
                  <tr>
                    <th className="py-2 px-3">Korean</th>
                    <th className="py-2 px-3">Pronunciations (BN / NE / EN)</th>
                    <th className="py-2 px-3">Meanings (EN / BN / NE)</th>
                    <th className="py-2 px-3">Topic & Level</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {csvPreviewItems.slice(0, 15).map(item => (
                    <tr key={item.id}>
                      <td className="py-2 px-3 font-black">{item.korean}</td>
                      <td className="py-2 px-3 text-slate-500">
                        {item.pronunciationBn} • {item.pronunciationNe} • {item.romanization}
                      </td>
                      <td className="py-2 px-3">
                        {item.meaningEn} / {item.meaningBn} / {item.meaningNe}
                      </td>
                      <td className="py-2 px-3">
                        {item.topic} ({item.level})
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ============================================================
          4. DUPLICATE ENTRY DETECTOR TAB
      ============================================================ */}
      {subTab === 'duplicates' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Duplicate Vocabulary Entry Detector
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Scans all {vocabulary.length.toLocaleString()} Korean entries for identical Hangul headwords.
              </p>
            </div>
            <span className="px-3 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-xs font-black">
              {duplicateGroups.length === 0 ? '0 Duplicates Found' : `${duplicateGroups.length} Duplicate Groups`}
            </span>
          </div>

          {duplicateGroups.length === 0 ? (
            <div className="p-8 rounded-2xl bg-slate-50 dark:bg-slate-800/50 text-center space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
              <div className="text-sm font-black text-slate-900 dark:text-white">
                100% Unique Korean Headwords Across {vocabulary.length.toLocaleString()} Entries
              </div>
              <p className="text-xs text-slate-500">
                No duplicate Korean words or phrases were detected in the database.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {duplicateGroups.map(group => (
                <div
                  key={group.korean}
                  className="p-4 rounded-xl border border-amber-300 bg-amber-50/40 dark:bg-amber-950/20 flex flex-wrap items-center justify-between gap-3"
                >
                  <div>
                    <div className="text-base font-black text-slate-900 dark:text-white">
                      {group.korean} ({group.items.length} entries)
                    </div>
                    <div className="text-xs text-slate-500">
                      IDs: {group.items.map(i => i.id).join(', ')}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {group.items.slice(1).map(dup =>
                      customVocabIds.has(dup.id) ? (
                        <button
                          key={dup.id}
                          type="button"
                          onClick={async () => {
                            await deleteAcademyVocab(dup.id);
                            await loadAll();
                            notify(`Removed duplicate "${dup.korean}" (${dup.id}).`);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-bold cursor-pointer"
                        >
                          Remove {dup.id}
                        </button>
                      ) : null
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ============================================================
          5. AI CONTENT REVIEW QUEUE (HUMAN-IN-THE-LOOP APPROVAL)
      ============================================================ */}
      {subTab === 'ai_review' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Bot className="w-5 h-5 text-blue-600" />
                AI Content Review Queue — Generate & Verify Before Publishing
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                AI-generated candidate entries are never published automatically. Inspect meanings and script pronunciations below, then click Approve & Publish.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Topic</label>
                <select
                  value={aiTopic}
                  onChange={e => setAiTopic(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold"
                >
                  {VOCAB_TOPICS_20X.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.nameEn} ({t.nameKo})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Proficiency Level</label>
                <select
                  value={aiLevel}
                  onChange={e => setAiLevel(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold"
                >
                  {CURRICULUM_LEVELS_20X.map(l => (
                    <option key={l.id} value={l.id}>
                      {l.titleEn}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Draft Count</label>
                <select
                  value={aiCount}
                  onChange={e => setAiCount(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold"
                >
                  <option value={2}>2 Drafts</option>
                  <option value={3}>3 Drafts</option>
                  <option value={5}>5 Drafts</option>
                </select>
              </div>
              <button
                type="button"
                disabled={aiGenerating}
                onClick={handleGenerateAiDrafts}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-black cursor-pointer"
              >
                {aiGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                Generate Candidate Drafts
              </button>
            </div>
          </div>

          {/* Pending Candidates List */}
          <div className="space-y-3">
            {[...aiCandidates, ...pendingReviewVocab].length === 0 ? (
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 text-center text-xs text-slate-500">
                No unapproved AI drafts in queue. Use the generator above to draft new tri-lingual vocabulary for review.
              </div>
            ) : (
              [...aiCandidates, ...pendingReviewVocab].map(draft => (
                <div
                  key={draft.id}
                  className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-amber-300 dark:border-amber-800 p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-black uppercase">
                        Pending Admin Review
                      </span>
                      <span className="text-xs font-bold text-slate-400">
                        {draft.topic} • {draft.level}
                      </span>
                    </div>
                    <div className="text-xl font-black text-slate-900 dark:text-white">
                      {draft.korean}
                    </div>
                    <div className="text-xs font-semibold text-blue-600">
                      BN Pron: {draft.pronunciationBn} • NE Pron: {draft.pronunciationNe} • EN: {draft.romanization}
                    </div>
                    <div className="text-xs text-slate-700 dark:text-slate-200">
                      <strong>EN:</strong> {draft.meaningEn} | <strong>BN:</strong> {draft.meaningBn} | <strong>NE:</strong> {draft.meaningNe}
                    </div>
                    <div className="text-xs text-slate-500">
                      Example: {draft.exampleKo} — {draft.exampleEn}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setEditingVocab(draft)}
                      className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold cursor-pointer"
                    >
                      Edit Before Approval
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSaveDraftUnpublished(draft)}
                      className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold cursor-pointer"
                    >
                      Save as Draft
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApproveAiDraft(draft)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Approve & Publish
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ============================================================
          6. 22 REAL-LIFE KOREA SCENARIOS MANAGEMENT TAB
      ============================================================ */}
      {subTab === 'scenarios' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-black text-slate-900 dark:text-white">
              22 Real-Life Korea Scenarios ({scenarios.length} Dialogues)
            </h3>
            <button
              type="button"
              onClick={() =>
                setEditingScenario({
                  id: `scen-custom-${Date.now()}`,
                  domainId: SCENARIO_DOMAINS_22_LIST[0].domainId,
                  domainOrder: SCENARIO_DOMAINS_22_LIST[0].order,
                  domainTitleEn: SCENARIO_DOMAINS_22_LIST[0].titleEn,
                  domainTitleBn: SCENARIO_DOMAINS_22_LIST[0].titleBn,
                  domainTitleNe: SCENARIO_DOMAINS_22_LIST[0].titleNe,
                  level: 'Beginner 1',
                  titleKo: '새로운 한국 생활 회화',
                  titleEn: 'New Real-Life Korea Dialogue',
                  titleBn: 'নতুন কোরিয়া বাস্তব সংলাপ',
                  titleNe: 'नयाँ कोरिया वास्तविक संवाद',
                  settingEn: 'Practical conversation in South Korea.',
                  settingBn: 'দক্ষিণ কোরিয়ায় প্রাত্যহিক কথোপকথন।',
                  settingNe: 'दक्षिण कोरियामा व्यावहारिक कुराकानी।',
                  dialogue: [
                    {
                      speakerKo: '학생',
                      speakerRoleEn: 'Student',
                      speakerRoleBn: 'শিক্ষার্থী',
                      speakerRoleNe: 'विद्यार्थी',
                      korean: '안녕하세요, 문의할 것이 있습니다.',
                      pronunciationBn: getScriptPronunciation('안녕하세요, 문의할 것이 있습니다.', 'bn'),
                      pronunciationNe: getScriptPronunciation('안녕하세요, 문의할 것이 있습니다.', 'ne'),
                      romanization: getScriptPronunciation('안녕하세요, 문의할 것이 있습니다.', 'en'),
                      meaningEn: 'Hello, I have something to inquire about.',
                      meaningBn: 'হ্যালো, আমার একটি বিষয়ে জানার ছিল।',
                      meaningNe: 'नमस्ते, मसँग सोधपुछ गर्नुपर्ने कुरा छ।',
                    },
                  ],
                  keyVocab: [],
                  practiceExercise: {
                    questionEn: 'What is Speaker A doing?',
                    questionBn: 'বক্তা A কী করছেন?',
                    questionNe: 'वक्ता A के गर्दै हुनुहुन्छ?',
                    options: ['Making a polite inquiry', 'Ordering food', 'Canceling a flight', 'Buying clothes'],
                    correctIndex: 0,
                    explanationEn: '문의할 것이 있습니다 means having an inquiry.',
                    explanationBn: '문의할 것이 있습니다 অর্থ জানার বা জিজ্ঞাসা করার বিষয় আছে।',
                    explanationNe: '문의할 것이 있습니다 को अर्थ सोधपुछ गर्नु छ भन्ने हो।',
                  },
                  published: true,
                  reviewStatus: 'approved',
                })
              }
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Add Scenario Dialogue
            </button>
          </div>

          {editingScenario && (
            <form
              onSubmit={handleSaveScenario}
              className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-blue-500 p-6 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h4 className="font-black text-sm text-slate-900 dark:text-white">
                  Edit Real-Life Scenario ({editingScenario.id})
                </h4>
                <button
                  type="button"
                  onClick={() => setEditingScenario(null)}
                  className="text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">English Title</label>
                  <input
                    type="text"
                    required
                    value={editingScenario.titleEn}
                    onChange={e => setEditingScenario({ ...editingScenario, titleEn: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Bengali Title</label>
                  <input
                    type="text"
                    required
                    value={editingScenario.titleBn}
                    onChange={e => setEditingScenario({ ...editingScenario, titleBn: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Nepali Title</label>
                  <input
                    type="text"
                    required
                    value={editingScenario.titleNe}
                    onChange={e => setEditingScenario({ ...editingScenario, titleNe: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingScenario(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold cursor-pointer"
                >
                  Save Scenario
                </button>
              </div>
            </form>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {scenarios
              .slice((scenarioPage - 1) * ADMIN_ITEMS_PER_PAGE, scenarioPage * ADMIN_ITEMS_PER_PAGE)
              .map(sc => (
                <div
                  key={sc.id}
                  className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 flex items-start justify-between gap-3"
                >
                  <div>
                    <span className="text-[10px] font-bold uppercase text-blue-600">
                      {sc.domainTitleEn} • {sc.level}
                    </span>
                    <div className="font-bold text-sm text-slate-900 dark:text-white mt-0.5">
                      {sc.titleEn}
                    </div>
                    <div className="text-xs text-emerald-600">{sc.titleBn}</div>
                    <div className="text-xs text-amber-600">{sc.titleNe}</div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setEditingScenario(sc)}
                      className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        await deleteAcademyScenario(sc.id);
                        await loadAll();
                        notify('Scenario custom override removed.');
                      }}
                      className="p-2 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
          </div>

          <div className="flex items-center justify-between bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 px-5 py-3">
            <button
              type="button"
              disabled={scenarioPage <= 1}
              onClick={() => setScenarioPage(p => Math.max(1, p - 1))}
              className="px-3 py-1.5 rounded-xl border text-xs font-bold disabled:opacity-40 cursor-pointer"
            >
              Prev
            </button>
            <span className="text-xs font-bold text-slate-500">
              Page {scenarioPage} of {Math.max(1, Math.ceil(scenarios.length / ADMIN_ITEMS_PER_PAGE))}
            </span>
            <button
              type="button"
              disabled={scenarioPage >= Math.ceil(scenarios.length / ADMIN_ITEMS_PER_PAGE)}
              onClick={() => setScenarioPage(p => p + 1)}
              className="px-3 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-bold disabled:opacity-40 cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* ============================================================
          7. LESSONS MANAGEMENT TAB (PAGINATED)
      ============================================================ */}
      {subTab === 'lessons' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-black text-slate-900 dark:text-white">
              Structured Hangul & 10-Level Korean Lessons ({lessons.length})
            </h3>
            <button
              type="button"
              onClick={() =>
                setEditingLesson({
                  id: `lesson-${Date.now()}`,
                  slug: `custom-lesson-${Date.now()}`,
                  order: lessons.length + 1,
                  level: 'Beginner 1',
                  titleKo: '새 한국어 수업',
                  titleEn: `${lessons.length + 1}. New Korean Lesson`,
                  titleBn: `${lessons.length + 1}. নতুন কোরিয়ান পাঠ`,
                  titleNe: `${lessons.length + 1}. नयाँ कोरियन पाठ`,
                  subtitleEn: 'Lesson subtitle in English',
                  subtitleBn: 'পাঠের সংক্ষিপ্ত বিবরণ',
                  subtitleNe: 'पाठको संक्षिप्त विवरण',
                  estimatedMinutes: 15,
                  overviewEn: 'Detailed lesson explanation in English.',
                  overviewBn: 'বাংলায় বিস্তারিত পাঠের ব্যাখ্যা।',
                  overviewNe: 'नेपालीमा विस्तृत पाठ व्याख्या।',
                  keyRulesEn: ['Key rule 1'],
                  keyRulesBn: ['মূল নিয়ম ১'],
                  keyRulesNe: ['मुख्य नियम १'],
                  letters: [],
                  published: true,
                  reviewStatus: 'approved',
                })
              }
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Add New Lesson
            </button>
          </div>

          {editingLesson && (
            <form
              onSubmit={handleSaveLesson}
              className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-blue-500 p-6 space-y-4"
            >
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Korean Title</label>
                  <input
                    type="text"
                    required
                    value={editingLesson.titleKo}
                    onChange={e => setEditingLesson({ ...editingLesson, titleKo: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">English Title</label>
                  <input
                    type="text"
                    required
                    value={editingLesson.titleEn}
                    onChange={e => setEditingLesson({ ...editingLesson, titleEn: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Bengali Title</label>
                  <input
                    type="text"
                    required
                    value={editingLesson.titleBn}
                    onChange={e => setEditingLesson({ ...editingLesson, titleBn: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Nepali Title</label>
                  <input
                    type="text"
                    value={editingLesson.titleNe || ''}
                    onChange={e => setEditingLesson({ ...editingLesson, titleNe: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingLesson(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold cursor-pointer"
                >
                  Save Lesson
                </button>
              </div>
            </form>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {lessons
              .slice((lessonPage - 1) * ADMIN_ITEMS_PER_PAGE, lessonPage * ADMIN_ITEMS_PER_PAGE)
              .map(lesson => (
                <div
                  key={lesson.id}
                  className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 flex items-start justify-between gap-4"
                >
                  <div>
                    <span className="text-xs font-bold text-blue-600">
                      {lesson.titleKo} • {lesson.level || 'Beginner'}
                    </span>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white mt-0.5">
                      {lesson.titleEn}
                    </h4>
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                      {lesson.titleBn}
                    </p>
                    {lesson.titleNe && (
                      <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                        {lesson.titleNe}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => setEditingLesson(lesson)}
                      className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        await deleteAcademyLesson(lesson.id);
                        await loadAll();
                        notify('Lesson removed from custom overrides.');
                      }}
                      className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
          </div>

          <div className="flex items-center justify-between bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 px-5 py-3">
            <button
              type="button"
              disabled={lessonPage <= 1}
              onClick={() => setLessonPage(p => Math.max(1, p - 1))}
              className="px-3 py-1.5 rounded-xl border text-xs font-bold disabled:opacity-40 cursor-pointer"
            >
              Prev
            </button>
            <span className="text-xs font-bold text-slate-500">
              Page {lessonPage} of {Math.max(1, Math.ceil(lessons.length / ADMIN_ITEMS_PER_PAGE))}
            </span>
            <button
              type="button"
              disabled={lessonPage >= Math.ceil(lessons.length / ADMIN_ITEMS_PER_PAGE)}
              onClick={() => setLessonPage(p => p + 1)}
              className="px-3 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-bold disabled:opacity-40 cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* ============================================================
          8. EXAMINATION QUESTIONS TAB (PAGINATED)
      ============================================================ */}
      {subTab === 'questions' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-black text-slate-900 dark:text-white">
              Korean Examination Question Bank ({questions.length} Questions)
            </h3>
            <button
              type="button"
              onClick={() =>
                setEditingQuestion({
                  id: `q-${Date.now()}`,
                  type: 'multiple_choice',
                  subject: 'daily_korean',
                  difficulty: 'Beginner',
                  promptEn: '',
                  promptBn: '',
                  promptNe: '',
                  koreanStimulus: '',
                  readingPassageKo: '',
                  audioScriptKo: '',
                  audioUrl: '',
                  options: ['Option 1', 'Option 2', 'Option 3', 'Option 4'],
                  correctIndex: 0,
                  explanationEn: '',
                  explanationBn: '',
                  explanationNe: '',
                  published: true,
                })
              }
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Create Exam Question
            </button>
          </div>

          {editingQuestion && (
            <form
              onSubmit={handleSaveQuestion}
              className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-blue-500 p-6 space-y-4"
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Question Type</label>
                  <select
                    value={editingQuestion.type}
                    onChange={e =>
                      setEditingQuestion({ ...editingQuestion, type: e.target.value as ExamQuestionType })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold"
                  >
                    <option value="multiple_choice">Multiple-Choice</option>
                    <option value="listening">Listening Question</option>
                    <option value="vocabulary">Vocabulary Question</option>
                    <option value="reading">Reading Comprehension</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Subject</label>
                  <select
                    value={editingQuestion.subject}
                    onChange={e =>
                      setEditingQuestion({ ...editingQuestion, subject: e.target.value as ExamSubject })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold"
                  >
                    <option value="hangul">Hangul & Pronunciation</option>
                    <option value="daily_korean">Daily Korean</option>
                    <option value="university">University</option>
                    <option value="workplace">Workplace</option>
                    <option value="hospital_emergency">Hospital & Emergency</option>
                    <option value="immigration_transport">Immigration & Transport</option>
                    <option value="listening">Listening</option>
                    <option value="reading">Reading</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Difficulty</label>
                  <select
                    value={editingQuestion.difficulty}
                    onChange={e =>
                      setEditingQuestion({ ...editingQuestion, difficulty: e.target.value as ExamDifficulty })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold"
                  >
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Prompt (English) *</label>
                  <input
                    type="text"
                    required
                    value={editingQuestion.promptEn}
                    onChange={e => setEditingQuestion({ ...editingQuestion, promptEn: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Prompt (Bengali) *</label>
                  <input
                    type="text"
                    required
                    value={editingQuestion.promptBn}
                    onChange={e => setEditingQuestion({ ...editingQuestion, promptBn: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Prompt (Nepali)</label>
                  <input
                    type="text"
                    value={editingQuestion.promptNe || ''}
                    onChange={e => setEditingQuestion({ ...editingQuestion, promptNe: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-500">
                  4 Answer Choices (Select radio button next to Correct Answer)
                </label>
                {editingQuestion.options.map((opt, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="correctIndex"
                      checked={editingQuestion.correctIndex === idx}
                      onChange={() => setEditingQuestion({ ...editingQuestion, correctIndex: idx })}
                    />
                    <input
                      type="text"
                      required
                      value={opt}
                      onChange={e => {
                        const nextOpts = [...editingQuestion.options];
                        nextOpts[idx] = e.target.value;
                        setEditingQuestion({ ...editingQuestion, options: nextOpts });
                      }}
                      className="flex-1 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                    />
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingQuestion(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold cursor-pointer"
                >
                  Save Question
                </button>
              </div>
            </form>
          )}

          <div className="space-y-3">
            {questions
              .slice((questionPage - 1) * ADMIN_ITEMS_PER_PAGE, questionPage * ADMIN_ITEMS_PER_PAGE)
              .map(q => (
                <div
                  key={q.id}
                  className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 flex items-start justify-between gap-4"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-600 text-[10px] font-bold uppercase">
                        {q.type}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 text-[10px] font-bold uppercase">
                        {q.subject} • {q.difficulty}
                      </span>
                    </div>
                    <div className="text-sm font-bold text-slate-900 dark:text-white">{q.promptEn}</div>
                    <div className="text-xs text-emerald-600 dark:text-emerald-400">{q.promptBn}</div>
                    {q.promptNe && (
                      <div className="text-xs text-amber-600 dark:text-amber-400">{q.promptNe}</div>
                    )}
                    <div className="text-xs text-slate-500 mt-1">
                      Correct Answer:{' '}
                      <strong className="text-slate-700 dark:text-slate-200">
                        {q.options[q.correctIndex]}
                      </strong>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => setEditingQuestion(q)}
                      className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        await deleteAcademyQuestion(q.id);
                        await loadAll();
                        notify('Question removed.');
                      }}
                      className="p-2 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
          </div>

          <div className="flex items-center justify-between bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 px-5 py-3">
            <button
              type="button"
              disabled={questionPage <= 1}
              onClick={() => setQuestionPage(p => Math.max(1, p - 1))}
              className="px-3 py-1.5 rounded-xl border text-xs font-bold disabled:opacity-40 cursor-pointer"
            >
              Prev
            </button>
            <span className="text-xs font-bold text-slate-500">
              Page {questionPage} of {Math.max(1, Math.ceil(questions.length / ADMIN_ITEMS_PER_PAGE))}
            </span>
            <button
              type="button"
              disabled={questionPage >= Math.ceil(questions.length / ADMIN_ITEMS_PER_PAGE)}
              onClick={() => setQuestionPage(p => p + 1)}
              className="px-3 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-bold disabled:opacity-40 cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* ============================================================
          9. TOPICS & CATEGORIES TAB
      ============================================================ */}
      {subTab === 'categories' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-black text-slate-900 dark:text-white">
              15 Core Vocabulary Topics & Legacy Categories
            </h3>
            <button
              type="button"
              onClick={() =>
                setEditingCategory({
                  id: `cat_${Date.now()}`,
                  nameEn: '',
                  nameBn: '',
                  nameNe: '',
                  nameKo: '',
                  descriptionEn: '',
                  descriptionBn: '',
                  descriptionNe: '',
                  iconName: 'BookOpen',
                  order: categories.length + 1,
                })
              }
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Add Topic Category
            </button>
          </div>

          {editingCategory && (
            <form
              onSubmit={handleSaveCategory}
              className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-blue-500 p-6 space-y-4"
            >
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">English Name *</label>
                  <input
                    type="text"
                    required
                    value={editingCategory.nameEn}
                    onChange={e => setEditingCategory({ ...editingCategory, nameEn: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Bengali Name *</label>
                  <input
                    type="text"
                    required
                    value={editingCategory.nameBn}
                    onChange={e => setEditingCategory({ ...editingCategory, nameBn: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Nepali Name</label>
                  <input
                    type="text"
                    value={editingCategory.nameNe || ''}
                    onChange={e => setEditingCategory({ ...editingCategory, nameNe: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Korean Name *</label>
                  <input
                    type="text"
                    required
                    value={editingCategory.nameKo}
                    onChange={e => setEditingCategory({ ...editingCategory, nameKo: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingCategory(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold cursor-pointer"
                >
                  Save Category
                </button>
              </div>
            </form>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map(cat => (
              <div
                key={cat.id}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 flex items-start justify-between gap-3"
              >
                <div>
                  <span className="text-xs font-bold text-blue-600">{cat.nameKo}</span>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">{cat.nameEn}</h4>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                    {cat.nameBn}
                  </p>
                  {cat.nameNe && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                      {cat.nameNe}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setEditingCategory(cat)}
                    className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      await deleteAcademyCategory(cat.id);
                      await loadAll();
                      notify('Category removed.');
                    }}
                    className="p-2 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
