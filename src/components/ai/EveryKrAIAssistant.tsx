/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { useApp, ActivePage } from '../../context/AppContext';
import { OFFICIAL_EVERYKR_ICON } from '../../constants/brandAssets';
import { MarkdownRenderer } from './MarkdownRenderer';
import {
  getOrCreateGuestSessionId,
  getStoredGuestDisplayName,
  saveGuestDisplayName,
  sanitizeGuestDisplayNameClient,
  sanitizeAccountDisplayName,
  buildPersonalizedAiGreeting,
  getLocalizedWelcomeGateCopy
} from '../../services/chatSessionService';
import { resolveAuthenticatedAccountDisplayName } from '../../services/firebaseService';
import { auth } from '../../lib/firebase';
import { GeneratedDocClientItem, ExecutionJobClientItem } from '../../types/chat';
import {
  Sparkles,
  Send,
  Mic,
  MicOff,
  Paperclip,
  X,
  Trash2,
  Volume2,
  VolumeX,
  Copy,
  Check,
  ArrowRight,
  Bot,
  User,
  GraduationCap,
  FileText,
  Compass,
  BookOpen,
  CalendarClock,
  Download,
  Code2,
  Briefcase,
  Loader2,
  Sun,
  Moon
} from 'lucide-react';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  fileAttachment?: {
    name: string;
    mimeType: string;
    dataUrl?: string;
  };
  generatedDocuments?: GeneratedDocClientItem[];
  executionJob?: ExecutionJobClientItem | null;
  actions?: ParsedAction[];
  sources?: string[];
  isFallback?: boolean;
}

export interface ParsedAction {
  type: 'NAVIGATE' | 'COMPARE' | 'BUDGET';
  page?: ActivePage;
  query?: string;
  label?: string;
  rawParams?: Record<string, string>;
}

export interface AiLanguageOption {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
  ttsCode: string;
}

export const AI_LANGUAGES: AiLanguageOption[] = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸', ttsCode: 'en-US' },
  { code: 'ko', name: 'Korean', nativeName: '한국어', flag: '🇰🇷', ttsCode: 'ko-KR' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', flag: '🇧🇩', ttsCode: 'bn-BD' },
  { code: 'ne', name: 'Nepali', nativeName: 'नेपाली', flag: '🇳🇵', ttsCode: 'ne-NP' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳', ttsCode: 'hi-IN' },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو', flag: '🇵🇰', ttsCode: 'ur-PK' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦', ttsCode: 'ar-SA' },
  { code: 'zh', name: 'Chinese', nativeName: '简体中文', flag: '🇨🇳', ttsCode: 'zh-CN' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵', ttsCode: 'ja-JP' },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt', flag: '🇻🇳', ttsCode: 'vi-VN' },
  { code: 'th', name: 'Thai', nativeName: 'ภาษาไทย', flag: '🇹🇭', ttsCode: 'th-TH' },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia', flag: '🇮🇩', ttsCode: 'id-ID' },
  { code: 'ms', name: 'Malay', nativeName: 'Bahasa Melayu', flag: '🇲🇾', ttsCode: 'ms-MY' },
  { code: 'mn', name: 'Mongolian', nativeName: 'Монгол', flag: '🇲🇳', ttsCode: 'mn-MN' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺', ttsCode: 'ru-RU' }
];

export const EVERYKR_AI_WELCOME_MESSAGE = `Hello! Welcome to EVERYKR AI. I'm your intelligent, multilingual assistant, here to help you with Korean universities, admissions, scholarships, application deadlines, Korean language learning, student visas, and studying or living in South Korea.

I can also help with general knowledge, coding, business, writing, document generation, and translation.

How can I help you today?`;

export const SUGGESTED_PROMPTS = [
  {
    icon: GraduationCap,
    label: 'Korean Universities & Admissions',
    query: 'Compare verified admission pathways, campuses, and degree programs among the 25 approved Korean universities on EVERYKR.'
  },
  {
    icon: Compass,
    label: 'Student Visa Guidance',
    query: 'Explain the complete D-2 and D-4 Korean student visa requirements, Certificate of Admission (COA), financial proof, and ARC registration.'
  },
  {
    icon: CalendarClock,
    label: 'Scholarship Research',
    query: 'What are the verified March 2027 intake admission deadlines and GKS / university merit scholarship opportunities in South Korea?'
  },
  {
    icon: BookOpen,
    label: 'Korean Language Learning',
    query: 'Help me learn Korean from Hangul basics, essential student conversation phrases, and a structured TOPIK preparation plan.'
  },
  {
    icon: Briefcase,
    label: 'Business Planning',
    query: 'Create a structured startup business plan with market research, revenue model, and financial projections.'
  },
  {
    icon: Code2,
    label: 'Coding & Development',
    query: 'Write and execute a Python script calculating 4-year university tuition and living expenses in South Korea across 30%, 50%, and 100% scholarship tiers.'
  },
  {
    icon: FileText,
    label: 'Document / Data Analysis',
    query: 'Generate a formal Korean University Study Plan and Statement of Purpose and export it as a downloadable Word (.docx) document.'
  }
];

function detectTtsLangCode(text: string, fallbackLangCode: string): string {
  const bengaliChars = (text.match(/[\u0980-\u09FF]/g) || []).length;
  const koreanChars = (text.match(/[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F]/g) || []).length;
  const devanagariChars = (text.match(/[\u0900-\u097F]/g) || []).length;
  const arabicUrduChars = (text.match(/[\u0600-\u06FF]/g) || []).length;
  const japaneseKanaChars = (text.match(/[\u3040-\u309F\u30A0-\u30FF]/g) || []).length;
  const cjkChars = (text.match(/[\u4E00-\u9FFF]/g) || []).length;

  if (bengaliChars >= 2) return 'bn-BD';
  if (koreanChars >= 2) return 'ko-KR';
  if (japaneseKanaChars >= 1) return 'ja-JP';
  if (cjkChars >= 2) return 'zh-CN';
  if (arabicUrduChars >= 2) {
    const urduMarkers = /(ہے|ہیں|تھا|تھی|میں|نے|سے|کو|کے|کی|کا|اور|آپ|کیا|کیسے|کوریا)/g;
    return (text.match(urduMarkers) || []).length > 0 ? 'ur-PK' : 'ar-SA';
  }
  if (devanagariChars >= 2) {
    const nepaliMarkers = /(छ|छन्|हुन्छ|गर्नुहोस्|गर्न|कस्तो|कसरी|नेपाल|नेपाली|तपाईं|मलाई|हामी|पढ्न|चाहन्छु)/g;
    const hindiMarkers = /(है|हैं|था|थी|कैसे|क्या|क्यों|में|लिए|नहीं|मुझे|आप|भारत|हिंदी)/g;
    const neCount = (text.match(nepaliMarkers) || []).length;
    const hiCount = (text.match(hindiMarkers) || []).length;
    if (neCount >= hiCount) return 'ne-NP';
    return 'hi-IN';
  }

  const found = AI_LANGUAGES.find((l) => l.code === fallbackLangCode);
  return found ? found.ttsCode : 'en-US';
}

function formatDurationSeconds(totalSec: number): string {
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

const AI_UI_COPY: Record<
  string,
  {
    placeholder: string;
    send: string;
    stop: string;
    done: string;
    cancel: string;
    listening: string;
    transcribing: string;
    processingFile: string;
    thinking: string;
    clearChat: string;
    closeChat: string;
    prompts: string[];
  }
> = {
  en: {
    placeholder: 'Ask EVERYKR AI (Any language, Universities, Visa, Code, Docs)...',
    send: 'Send',
    stop: 'Stop',
    done: 'Done',
    cancel: 'Cancel',
    listening: 'Listening',
    transcribing: 'Transcribing speech into native script...',
    processingFile: 'Processing selected file...',
    thinking: 'EVERYKR AI is thinking...',
    clearChat: 'Clear conversation',
    closeChat: 'Close chat',
    prompts: [
      'Korean Universities & Admissions',
      'Student Visa Guidance',
      'Scholarship Research',
      'Korean Language Learning',
      'Business Planning',
      'Coding & Development',
      'Document / Data Analysis'
    ]
  },
  bn: {
    placeholder: 'EVERYKR AI-কে জিজ্ঞাসা করুন (বিশ্ববিদ্যালয়, ভিসা, বৃত্তি, কোড বা ডকুমেন্ট)...',
    send: 'পাঠান',
    stop: 'থামুন',
    done: 'সম্পন্ন',
    cancel: 'বাতিল',
    listening: 'শোনা হচ্ছে',
    transcribing: 'কথা থেকে লেখায় রূপান্তর করা হচ্ছে...',
    processingFile: 'ফাইল প্রক্রিয়া করা হচ্ছে...',
    thinking: 'EVERYKR AI চিন্তা করছে...',
    clearChat: 'কথোপকথন মুছুন',
    closeChat: 'চ্যাট বন্ধ করুন',
    prompts: [
      'কোরিয়ান বিশ্ববিদ্যালয় ও ভর্তি',
      'স্টুডেন্ট ভিসা নির্দেশিকা',
      'বৃত্তি ও টিউশন তথ্য',
      'কোরিয়ান ভাষা শিক্ষা',
      'ব্যবসায়িক পরিকল্পনা',
      'কোডিং ও ডেভেলপমেন্ট',
      'ডকুমেন্ট ও ডেটা বিশ্লেষণ'
    ]
  },
  ko: {
    placeholder: 'EVERYKR AI에게 질문하세요 (대학교, 비자, 장학금, 코드, 문서)...',
    send: '전송',
    stop: '중지',
    done: '완료',
    cancel: '취소',
    listening: '듣는 중',
    transcribing: '음성을 텍스트로 변환하는 중...',
    processingFile: '파일 처리 중...',
    thinking: 'EVERYKR AI가 답변을 작성 중입니다...',
    clearChat: '대화 지우기',
    closeChat: '채팅 닫기',
    prompts: [
      '한국 대학교 및 입학 안내',
      '학생 비자 가이드',
      '장학금 정보 탐색',
      '한국어 학습',
      '비즈니스 기획',
      '코딩 및 개발',
      '문서 및 데이터 분석'
    ]
  },
  ne: {
    placeholder: 'EVERYKR AI लाई सोध्नुहोस् (विश्वविद्यालय, भिसा, छात्रवृत्ति, कोड, कागजात)...',
    send: 'पठाउनुहोस्',
    stop: 'रोक्नुहोस्',
    done: 'सम्पन्न',
    cancel: 'रद्द गर्नुहोस्',
    listening: 'सुन्दैछ',
    transcribing: 'आवाजलाई अक्षरमा रूपान्तरण गर्दै...',
    processingFile: 'फाइल प्रशोधन हुँदैछ...',
    thinking: 'EVERYKR AI सोच्दैछ...',
    clearChat: 'कुराकानी हटाउनुहोस्',
    closeChat: 'च्याट बन्द गर्नुहोस्',
    prompts: [
      'कोरियन विश्वविद्यालय र भर्ना',
      'विद्यार्थी भिसा मार्गदर्शन',
      'छात्रवृत्ति अनुसन्धान',
      'कोरियन भाषा सिकाइ',
      'व्यावसायिक योजना',
      'कोडिङ र विकास',
      'कागजात र डाटा विश्लेषण'
    ]
  },
  ur: {
    placeholder: 'EVERYKR AI سے پوچھیں (یونیورسٹیاں، ویزا، اسکالرشپ، کوڈ، دستاویزات)...',
    send: 'بھیجیں',
    stop: 'روکیں',
    done: 'مکمل',
    cancel: 'منسوخ کریں',
    listening: 'سن رہا ہے',
    transcribing: 'آواز کو تحریر میں تبدیل کیا جا رہا ہے...',
    processingFile: 'فائل پراسیس ہو رہی ہے...',
    thinking: 'EVERYKR AI سوچ رہا ہے...',
    clearChat: 'گفتگو صاف کریں',
    closeChat: 'چیٹ بند کریں',
    prompts: [
      'کورین یونیورسٹیاں اور داخلہ',
      'اسٹوڈنٹ ویزا رہنمائی',
      'اسکالرشپ کی معلومات',
      'کورین زبان سیکھیں',
      'کاروباری منصوبہ بندی',
      'کوڈنگ اور ڈیولپمنٹ',
      'دستاویز اور ڈیٹا تجزیہ'
    ]
  },
  hi: {
    placeholder: 'EVERYKR AI से पूछें (विश्वविद्यालय, वीज़ा, छात्रवृत्ति, कोड, दस्तावेज़)...',
    send: 'भेजें',
    stop: 'रोकें',
    done: 'पूर्ण',
    cancel: 'रद्द करें',
    listening: 'सुन रहा है',
    transcribing: 'आवाज़ को टेक्स्ट में बदला जा रहा है...',
    processingFile: 'फ़ाइल प्रोसेस हो रही है...',
    thinking: 'EVERYKR AI सोच रहा है...',
    clearChat: 'बातचीत साफ़ करें',
    closeChat: 'चैट बंद करें',
    prompts: [
      'कोरियाई विश्वविद्यालय और प्रवेश',
      'छात्र वीज़ा मार्गदर्शन',
      'छात्रवृत्ति अनुसंधान',
      'कोरियाई भाषा सीखना',
      'व्यावसायिक योजना',
      'कोडिंग और विकास',
      'दस्तावेज़ और डेटा विश्लेषण'
    ]
  },
  ar: {
    placeholder: 'اسأل EVERYKR AI (الجامعات، التأشيرة، المنح، البرمجة، المستندات)...',
    send: 'إرسال',
    stop: 'إيقاف',
    done: 'تم',
    cancel: 'إلغاء',
    listening: 'جارٍ الاستماع',
    transcribing: 'جارٍ تحويل الصوت إلى نص...',
    processingFile: 'جارٍ معالجة الملف...',
    thinking: 'EVERYKR AI يفكر...',
    clearChat: 'مسح المحادثة',
    closeChat: 'إغلاق المحادثة',
    prompts: [
      'الجامعات الكورية والقبول',
      'إرشادات تأشيرة الطالب',
      'البحث عن المنح الدراسية',
      'تعلم اللغة الكورية',
      'تخطيط الأعمال',
      'البرمجة والتطوير',
      'تحليل المستندات والبيانات'
    ]
  },
  zh: {
    placeholder: '向 EVERYKR AI 提问（大学、签证、奖学金、编程、文档）...',
    send: '发送',
    stop: '停止',
    done: '完成',
    cancel: '取消',
    listening: '正在聆听',
    transcribing: '正在将语音转换为文字...',
    processingFile: '正在处理所选文件...',
    thinking: 'EVERYKR AI 正在思考...',
    clearChat: '清除对话',
    closeChat: '关闭聊天',
    prompts: [
      '韩国大学与入学申请',
      '学生签证指南',
      '奖学金查询',
      '韩语学习',
      '商业规划',
      '编程与开发',
      '文档与数据分析'
    ]
  },
  ja: {
    placeholder: 'EVERYKR AIに質問する（大学、ビザ、奨学金、コード、書類）...',
    send: '送信',
    stop: '停止',
    done: '完了',
    cancel: 'キャンセル',
    listening: '聞き取り中',
    transcribing: '音声をテキストに変換しています...',
    processingFile: 'ファイルを処理しています...',
    thinking: 'EVERYKR AIが考えています...',
    clearChat: '会話をクリア',
    closeChat: 'チャットを閉じる',
    prompts: [
      '韓国の大学・入学案内',
      '学生ビザガイド',
      '奨学金リサーチ',
      '韓国語学習',
      'ビジネスプラン作成',
      'コーディング・開発',
      '書類・データ分析'
    ]
  }
};

export const EveryKrAIAssistant: React.FC = () => {
  const { setActivePage, currentUser, isAuthReady, showToast, language, t, theme, toggleTheme } = useApp();
  const isAuthenticated = Boolean(isAuthReady && currentUser && (currentUser.id || currentUser.uid));

  const [guestSessionId, setGuestSessionId] = useState<string>(() => getOrCreateGuestSessionId());
  const [guestName, setGuestName] = useState<string | null>(() => getStoredGuestDisplayName());
  const [guestNameInput, setGuestNameInput] = useState<string>('');
  const [guestNameError, setGuestNameError] = useState<string | null>(null);

  const [accountDisplayName, setAccountDisplayName] = useState<string | null>(() =>
    currentUser
      ? sanitizeAccountDisplayName(
          auth.currentUser?.displayName || currentUser.fullName || currentUser.name,
          currentUser.id || currentUser.uid,
          currentUser.email
        )
      : null
  );

  // Resolve authenticated user's name: 1) Firebase Auth displayName -> 2) Firestore user profile
  // Never display email addresses or Firebase UIDs as names
  useEffect(() => {
    let cancelled = false;
    if (!isAuthReady) return;

    if (!isAuthenticated || !currentUser) {
      setAccountDisplayName(null);
      return;
    }

    const immediateClean = sanitizeAccountDisplayName(
      auth.currentUser?.displayName || currentUser.fullName || currentUser.name,
      currentUser.id || currentUser.uid,
      currentUser.email
    );
    if (immediateClean) {
      setAccountDisplayName(immediateClean);
    }

    resolveAuthenticatedAccountDisplayName(currentUser)
      .then((resolved) => {
        if (!cancelled) {
          setAccountDisplayName(resolved);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAccountDisplayName(immediateClean || null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    isAuthReady,
    isAuthenticated,
    currentUser?.id,
    currentUser?.uid,
    currentUser?.name,
    currentUser?.fullName,
    currentUser?.email
  ]);

  // Synchronize guest name updates and clean state immediately upon logout
  useEffect(() => {
    const handleGuestNameUpdated = (event: Event) => {
      const custom = event as CustomEvent<{ name?: string | null }>;
      const nextName = custom.detail?.name ?? getStoredGuestDisplayName();
      setGuestName(nextName || null);
    };

    const handleAuthReset = (event: Event) => {
      const custom = event as CustomEvent<{ guestSessionId?: string }>;
      const nextGuestSessionId = custom.detail?.guestSessionId || getOrCreateGuestSessionId();
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      window.speechSynthesis?.cancel();
      setLoading(false);
      setAccountDisplayName(null);
      setGuestName(null);
      setGuestNameInput('');
      setGuestNameError(null);
      setInput('');
      setAttachedFile(null);
      setGuestSessionId(nextGuestSessionId);
      setMessages([]);
    };

    window.addEventListener('everykr-ai-guest-name-updated', handleGuestNameUpdated);
    window.addEventListener('everykr-ai-auth-reset', handleAuthReset);
    return () => {
      window.removeEventListener('everykr-ai-guest-name-updated', handleGuestNameUpdated);
      window.removeEventListener('everykr-ai-auth-reset', handleAuthReset);
    };
  }, []);

  const userScope = isAuthenticated
    ? String(currentUser?.id || currentUser?.uid)
    : guestSessionId;
  const storageKey = `everykr_ai_chat_v3::${userScope}`;

  const isRtl = language === 'ur' || language === 'ar';
  const uiCopy = AI_UI_COPY[language] || AI_UI_COPY.en;
  const gateCopy = getLocalizedWelcomeGateCopy(language);

  const activeDisplayName = isAuthenticated
    ? accountDisplayName || ''
    : guestName || '';

  const showGuestNamePopup = isAuthReady && !isAuthenticated && !guestName;

  const personalizedGreetingText = buildPersonalizedAiGreeting(
    activeDisplayName,
    isAuthenticated,
    language
  );

  const [isOpen, setIsOpenState] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem('everykr_ai_open') === 'true';
    } catch {
      return false;
    }
  });
  const setIsOpen = (val: boolean) => {
    setIsOpenState(val);
    try {
      sessionStorage.setItem('everykr_ai_open', val ? 'true' : 'false');
    } catch {
      // ignore storage errors
    }
  };

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState<string>('EVERYKR AI is thinking...');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [exportingDocKey, setExportingDocKey] = useState<string | null>(null);
  const guestNameInputRef = useRef<HTMLInputElement>(null);

  const handleGuestNameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validation = sanitizeGuestDisplayNameClient(guestNameInput, language);
    if (!validation.valid) {
      setGuestNameError(validation.error || gateCopy.errorRequired);
      guestNameInputRef.current?.focus();
      return;
    }
    const saved = saveGuestDisplayName(validation.name, language);
    if (!saved) {
      setGuestNameError(gateCopy.errorRequired);
      return;
    }
    setGuestName(saved);
    setGuestNameInput('');
    setGuestNameError(null);
  };

  // File Upload State
  const [isReadingFile, setIsReadingFile] = useState(false);
  const [attachedFile, setAttachedFile] = useState<{
    name: string;
    mimeType: string;
    data: string; // base64
    sizeBytes?: number;
    previewUrl?: string;
  } | null>(null);

  // Advanced Multilingual Voice Input (STT) & Voice Response (TTS)
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [liveInterimTranscript, setLiveInterimTranscript] = useState('');
  const [activeSpeakingId, setActiveSpeakingId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputTextareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<number | null>(null);
  const recordingCancelledRef = useRef<boolean>(false);
  const interimTranscriptRef = useRef<string>('');
  const abortControllerRef = useRef<AbortController | null>(null);

  const clearRecordingTimer = () => {
    if (recordingTimerRef.current !== null) {
      window.clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  };

  const cleanupVoiceResources = () => {
    clearRecordingTimer();
    try {
      if (recognitionRef.current) {
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
    } catch {
      // ignore stop errors
    }
    try {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
      }
    } catch {
      // ignore stream cleanup errors
    }
    mediaRecorderRef.current = null;
    setIsRecording(false);
    setRecordingSeconds(0);
    setLiveInterimTranscript('');
  };

  // Global open trigger + pre-warm TTS voices
  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    window.addEventListener('open-everykr-ai', handleOpen);
    try {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.getVoices();
        window.speechSynthesis.onvoiceschanged = () => {
          window.speechSynthesis.getVoices();
        };
      }
    } catch {
      // ignore
    }
    return () => {
      window.removeEventListener('open-everykr-ai', handleOpen);
      cleanupVoiceResources();
    };
  }, []);

  // Load conversation history scoped by user UID or guestSessionId once auth state is ready
  useEffect(() => {
    if (!isAuthReady) return;
    if (!isAuthenticated && !guestName) return;

    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const sanitized = parsed.map((msg: ChatMessage) =>
            msg.id === 'welcome-1'
              ? {
                  ...msg,
                  text: personalizedGreetingText,
                  sources: ['EVERYKR Verified Knowledge Base', '25 Approved Universities DB']
                }
              : msg
          );
          setMessages(sanitized);
          return;
        }
      }
    } catch {
      // fallback
    }

    setMessages([
      {
        id: 'welcome-1',
        sender: 'assistant',
        text: personalizedGreetingText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        sources: ['EVERYKR Verified Knowledge Base', '25 Approved Universities DB']
      }
    ]);
  }, [isAuthReady, isAuthenticated, guestName, storageKey, personalizedGreetingText]);

  // Save conversation history scoped by user UID or current guest session
  useEffect(() => {
    if (!isAuthReady) return;
    if (!isAuthenticated && !guestName) return;
    if (messages.length > 0) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(messages.slice(-30)));
      } catch {
        // quota limit
      }
    }
  }, [messages, storageKey, isAuthReady, isAuthenticated, guestName]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Auto-resize textarea height based on content
  useEffect(() => {
    const el = inputTextareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 112)}px`;
  }, [input]);

  // Transcribe recorded audio blob via server-side Gemini multimodal Speech-to-Text
  const transcribeRecordedAudioBlob = async (audioBlob: Blob, mimeType: string, fallbackSpeechText: string) => {
    if (!audioBlob || audioBlob.size < 200) {
      if (fallbackSpeechText.trim()) {
        setInput((prev) => (prev.trim() ? `${prev.trim()} ${fallbackSpeechText.trim()}` : fallbackSpeechText.trim()));
        setTimeout(() => inputTextareaRef.current?.focus(), 60);
      } else {
        showToast('No clear speech detected. Please speak clearly and try again.');
      }
      return;
    }

    setIsTranscribing(true);
    try {
      const base64Audio = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = String(reader.result || '');
          const base64 = result.includes(',') ? result.split(',')[1] : result;
          resolve(base64);
        };
        reader.onerror = () => reject(new Error('Failed to read recorded audio'));
        reader.readAsDataURL(audioBlob);
      });

      const response = await fetch('/api/ai/speech-to-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioBase64: base64Audio,
          mimeType,
          preferredLanguage: language
        })
      });

      const data = await response.json();
      const serverTranscript = typeof data?.transcript === 'string' ? data.transcript.trim() : '';
      const finalTranscript = serverTranscript || fallbackSpeechText.trim();

      if (finalTranscript) {
        setInput((prev) => (prev.trim() ? `${prev.trim()} ${finalTranscript}` : finalTranscript));
        setTimeout(() => inputTextareaRef.current?.focus(), 60);
      } else {
        showToast('Could not detect clear speech. Please try speaking again.');
      }
    } catch {
      if (fallbackSpeechText.trim()) {
        setInput((prev) => (prev.trim() ? `${prev.trim()} ${fallbackSpeechText.trim()}` : fallbackSpeechText.trim()));
        setTimeout(() => inputTextareaRef.current?.focus(), 60);
      } else {
        showToast('Voice transcription failed. Please try again or type your message.');
      }
    } finally {
      setIsTranscribing(false);
    }
  };

  // Start or Stop User-Initiated Multilingual Voice Recording
  const toggleRecording = async () => {
    if (isTranscribing) return;

    if (isRecording) {
      stopAndTranscribeRecording();
      return;
    }

    if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') {
      showToast('Voice input is not supported in this browser. Text chat remains fully available.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      mediaStreamRef.current = stream;
      audioChunksRef.current = [];
      recordingCancelledRef.current = false;
      interimTranscriptRef.current = '';
      setLiveInterimTranscript('');
      setRecordingSeconds(0);

      // Select best supported audio container for MediaRecorder
      const preferredMimeTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
        'audio/ogg;codecs=opus'
      ];
      let selectedMimeType = '';
      if (typeof MediaRecorder !== 'undefined' && typeof MediaRecorder.isTypeSupported === 'function') {
        for (const candidate of preferredMimeTypes) {
          if (MediaRecorder.isTypeSupported(candidate)) {
            selectedMimeType = candidate;
            break;
          }
        }
      }

      const recorder = selectedMimeType
        ? new MediaRecorder(stream, { mimeType: selectedMimeType })
        : new MediaRecorder(stream);

      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const wasCancelled = recordingCancelledRef.current;
        const capturedInterim = interimTranscriptRef.current;
        const actualMime = recorder.mimeType || selectedMimeType || 'audio/webm';
        const blob = new Blob(audioChunksRef.current, { type: actualMime });
        cleanupVoiceResources();

        if (!wasCancelled) {
          transcribeRecordedAudioBlob(blob, actualMime, capturedInterim);
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start(250);
      setIsRecording(true);

      recordingTimerRef.current = window.setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);

      // Optional parallel browser SpeechRecognition for live interim visual feedback
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        try {
          const recognition = new SpeechRecognition();
          recognition.continuous = true;
          recognition.interimResults = true;
          const langConfig = AI_LANGUAGES.find((l) => l.code === language);
          recognition.lang = langConfig ? langConfig.ttsCode : 'en-US';

          recognition.onresult = (event: any) => {
            let combined = '';
            for (let i = 0; i < (event?.results?.length || 0); i++) {
              combined += (event.results[i]?.[0]?.transcript || '') + ' ';
            }
            const trimmed = combined.trim();
            if (trimmed) {
              interimTranscriptRef.current = trimmed;
              setLiveInterimTranscript(trimmed);
            }
          };
          recognition.onerror = () => {
            // Ignore browser recognition errors because MediaRecorder + Gemini STT is primary
          };
          recognitionRef.current = recognition;
          recognition.start();
        } catch {
          // Ignore optional live preview errors
        }
      }
    } catch {
      cleanupVoiceResources();
      showToast('Microphone permission was not granted. You can continue chatting by text.');
    }
  };

  const stopAndTranscribeRecording = () => {
    recordingCancelledRef.current = false;
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
        return;
      } catch {
        // fallback cleanup
      }
    }
    cleanupVoiceResources();
  };

  const cancelVoiceRecording = () => {
    recordingCancelledRef.current = true;
    audioChunksRef.current = [];
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        cleanupVoiceResources();
      }
    } else {
      cleanupVoiceResources();
    }
    showToast('Voice recording cancelled');
  };

  // Intelligent Multilingual Text-To-Speech (TTS)
  const speakMessage = (msgId: string, text: string) => {
    if (!('speechSynthesis' in window)) {
      showToast('Speech synthesis is not supported on this browser');
      return;
    }

    if (activeSpeakingId === msgId) {
      window.speechSynthesis.cancel();
      setActiveSpeakingId(null);
      return;
    }

    window.speechSynthesis.cancel();

    // Strip code blocks, action tags, Markdown symbols, table pipes, and raw URLs for natural speech
    const cleanText = text
      .replace(/```[\s\S]*?```/g, ' ')
      .replace(/\[ACTION:[^\]]+\]/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/https?:\/\/\S+/g, '')
      .replace(/[#*`_~|>]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleanText) return;

    const targetBcp47 = detectTtsLangCode(cleanText, language);
    const langPrefix = targetBcp47.split('-')[0].toLowerCase();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = targetBcp47;
    utterance.rate = 0.96;

    try {
      const voices = window.speechSynthesis.getVoices() || [];
      if (voices.length > 0) {
        const exactVoice =
          voices.find((v) => v.lang.toLowerCase() === targetBcp47.toLowerCase() && /natural|google|microsoft/i.test(v.name)) ||
          voices.find((v) => v.lang.toLowerCase() === targetBcp47.toLowerCase()) ||
          voices.find((v) => v.lang.toLowerCase().startsWith(langPrefix));
        if (exactVoice) {
          utterance.voice = exactVoice;
          utterance.lang = exactVoice.lang;
        }
      }
    } catch {
      // use default voice for lang
    }

    utterance.onstart = () => setActiveSpeakingId(msgId);
    utterance.onend = () => setActiveSpeakingId(null);
    utterance.onerror = () => setActiveSpeakingId(null);

    window.speechSynthesis.speak(utterance);
  };

  // Quick Export AI Response into Downloadable Document (PDF, DOCX, XLSX, PPTX)
  const handleExportResponseDocument = async (
    msg: ChatMessage,
    format: 'pdf' | 'docx' | 'xlsx' | 'pptx'
  ) => {
    const busyKey = `${msg.id}:${format}`;
    if (exportingDocKey) return;
    setExportingDocKey(busyKey);

    try {
      const headingMatch = msg.text.match(/^#+\s+(.+)$/m);
      const cleanTitle =
        (headingMatch ? headingMatch[1] : msg.text.slice(0, 42))
          .replace(/[^\w\s-]/g, '')
          .trim()
          .slice(0, 44) || 'EVERYKR_AI_Document';

      const res = await fetch('/api/ai/documents/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ownerId: userScope,
          title: cleanTitle,
          format,
          content: msg.text
        })
      });

      const data = await res.json();
      if (res.ok && data?.document) {
        const newDoc: GeneratedDocClientItem = data.document;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === msg.id
              ? {
                  ...m,
                  generatedDocuments: [
                    ...(m.generatedDocuments || []).filter((d) => d.id !== newDoc.id),
                    newDoc
                  ]
                }
              : m
          )
        );
        // Trigger automatic download
        const link = document.createElement('a');
        link.href = newDoc.downloadUrl;
        link.download = newDoc.fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast(`Downloaded ${newDoc.fileName}`);
      } else {
        showToast('Could not generate document right now.');
      }
    } catch {
      showToast('Document generation failed. Please try again.');
    } finally {
      setExportingDocKey(null);
    }
  };

  // File Upload Handler (.pdf, .docx, .xlsx, .pptx, .csv, .txt, .md, .json, images)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 20 * 1024 * 1024) {
      showToast('File size must be under 20 MB');
      return;
    }

    setIsReadingFile(true);
    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const result = uploadEvent.target?.result as string;
      const base64Data = result.split(',')[1];
      setAttachedFile({
        name: file.name,
        mimeType: file.type || 'application/octet-stream',
        data: base64Data,
        sizeBytes: file.size,
        previewUrl: file.type.startsWith('image/') ? result : undefined
      });
      setIsReadingFile(false);
      showToast(`Attached ${file.name}`);
    };
    reader.onerror = () => {
      setIsReadingFile(false);
      showToast('Failed to read selected file.');
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Action Tag Parser
  const parseResponseActions = (rawText: string): { cleanText: string; actions: ParsedAction[]; sources: string[] } => {
    const actionRegex = /\[ACTION:([A-Z_]+)([^\]]*)\]/g;
    const actions: ParsedAction[] = [];
    let cleanText = rawText;
    let match;

    while ((match = actionRegex.exec(rawText)) !== null) {
      const type = match[1] as ParsedAction['type'];
      const paramStr = match[2];
      const params: Record<string, string> = {};
      const paramRegex = /(\w+)="([^"]+)"/g;
      let pMatch;
      while ((pMatch = paramRegex.exec(paramStr)) !== null) {
        params[pMatch[1]] = pMatch[2];
      }

      if (!params['page'] && paramStr && paramStr.trim().startsWith(':')) {
        params['page'] = paramStr.trim().slice(1).trim().toLowerCase();
      }

      let label = 'View Section';
      let page: ActivePage | undefined = undefined;

      if (type === 'NAVIGATE') {
        const p = params['page'];
        if (p === 'universities') {
          page = 'universities';
          label = 'Explore University Directory';
        } else if (p === 'scholarships') {
          page = 'scholarships';
          label = 'Browse Scholarships & GKS';
        } else if (p === 'programs') {
          page = 'programs';
          label = 'Explore Degree Programs';
        } else if (p === 'deadlines') {
          page = 'deadlines';
          label = 'View Admission Deadlines';
        } else if (p === 'visa') {
          page = 'visa';
          label = 'Open Visa & Immigration Center';
        } else if (p === 'jobs') {
          page = 'jobs';
          label = 'Browse Part-Time Jobs';
        } else if (p === 'accommodation' || p === 'housing') {
          page = 'accommodation';
          label = 'Find Student Accommodation';
        } else if (p === 'daily-life') {
          page = 'daily-life';
          label = 'Explore Daily Living Hub';
        } else if (p === 'study-language' || p === 'language') {
          page = 'study-language';
          label = 'Study & Korean Language Center';
        } else if (p === 'marketplace') {
          page = 'marketplace';
          label = 'Student Marketplace';
        } else if (p === 'dashboard') {
          page = 'dashboard';
          label = 'Open Student Dashboard';
        }
      } else if (type === 'COMPARE') {
        page = 'universities';
        label = 'Compare Selected Universities';
      } else if (type === 'BUDGET') {
        page = 'daily-life';
        label = 'View Living Budget Calculator';
      }

      if (page) {
        actions.push({
          type,
          page,
          query: params['query'],
          label,
          rawParams: params
        });
      }
    }

    cleanText = cleanText.replace(actionRegex, '').trim();

    const sources: string[] = [];
    if (rawText.toLowerCase().includes('hikorea')) sources.push('HiKorea.go.kr');
    if (rawText.toLowerCase().includes('studyinkorea')) sources.push('StudyInKorea.go.kr');
    if (rawText.toLowerCase().includes('nhis')) sources.push('NHIS (국민건강보험)');
    if (rawText.toLowerCase().includes('1345')) sources.push('Immigration Hotline 1345');
    if (sources.length === 0) sources.push('EVERYKR Verified Knowledge Base');

    return { cleanText, actions, sources };
  };

  const stopGenerating = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setLoading(false);
    showToast('Stopped response generation');
  };

  // Submit User Message
  const handleSendMessage = async (textToSend?: string) => {
    if (!isAuthReady || showGuestNamePopup) return;
    const messageContent = (textToSend !== undefined ? textToSend : input).trim();
    if ((!messageContent && !attachedFile) || loading) return;

    if (isRecording) {
      cleanupVoiceResources();
    }

    const fileToUpload = attachedFile;
    setInput('');
    setAttachedFile(null);

    const userMessage: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: messageContent || (fileToUpload ? `Please analyze the attached file: ${fileToUpload.name}` : ''),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      fileAttachment: fileToUpload
        ? {
            name: fileToUpload.name,
            mimeType: fileToUpload.mimeType,
            dataUrl: fileToUpload.previewUrl
          }
        : undefined
    };

    setMessages((prev) => [...prev, userMessage]);
    setLoading(true);
    setLoadingStage(fileToUpload ? `Processing ${fileToUpload.name}...` : 'EVERYKR AI is thinking...');

    const controller = new AbortController();
    abortControllerRef.current = controller;

    const aiMessageId = `ai-${Date.now()}`;
    const historyTurns = messages
      .filter((m) => m.id !== 'welcome-1' && m.text.trim().length > 0)
      .slice(-8)
      .map((m) => ({
        role: m.sender === 'user' ? 'user' : 'model',
        text: m.text
      }));

    const requestPayload = {
      message: messageContent,
      conversation: historyTurns,
      language,
      ownerId: userScope,
      userName: activeDisplayName || undefined,
      isGuest: !isAuthenticated,
      fileAttachment: fileToUpload
        ? {
            name: fileToUpload.name,
            mimeType: fileToUpload.mimeType,
            data: fileToUpload.data
          }
        : undefined,
      studentContext: isAuthenticated && currentUser
        ? {
            uid: currentUser.id || currentUser.uid,
            name: activeDisplayName || undefined,
            nationality: currentUser.nationality,
            major: currentUser.major,
            studyLevel: currentUser.studyLevel,
            currentCity: currentUser.currentCity,
            university: currentUser.university
          }
        : activeDisplayName
        ? {
            name: activeDisplayName
          }
        : undefined
    };

    try {
      let streamedSuccessfully = false;
      try {
        const streamRes = await fetch('/api/ai/chat/stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestPayload),
          signal: controller.signal
        });

        if (streamRes.ok && streamRes.body) {
          const reader = streamRes.body.getReader();
          const decoder = new TextDecoder('utf-8');
          let accumulatedRaw = '';
          let addedPlaceholder = false;
          let receivedDocs: GeneratedDocClientItem[] = [];
          let receivedJob: ExecutionJobClientItem | null = null;

          while (true) {
            const { value, done } = await reader.read();
            if (done) break;

            const chunkStr = decoder.decode(value, { stream: true });
            const lines = chunkStr.split('\n');

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const parsed = JSON.parse(line.substring(6));
                  if (parsed.stage && typeof parsed.stage === 'string') {
                    setLoadingStage(`${parsed.stage}...`);
                  }
                  if (parsed.text) {
                    accumulatedRaw += parsed.text;
                    const { cleanText, actions, sources } = parseResponseActions(accumulatedRaw);
                    if (!addedPlaceholder) {
                      addedPlaceholder = true;
                      setMessages((prev) => [
                        ...prev,
                        {
                          id: aiMessageId,
                          sender: 'assistant',
                          text: cleanText,
                          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                          actions,
                          sources
                        }
                      ]);
                    } else {
                      setMessages((prev) =>
                        prev.map((m) =>
                          m.id === aiMessageId
                            ? { ...m, text: cleanText, actions, sources }
                            : m
                        )
                      );
                    }
                  }
                  if (parsed.done) {
                    if (Array.isArray(parsed.generatedDocuments)) receivedDocs = parsed.generatedDocuments;
                    if (parsed.executionJob) receivedJob = parsed.executionJob;
                  }
                } catch {
                  // Ignore partial SSE JSON frame
                }
              }
            }
          }

          if (accumulatedRaw.trim().length > 0) {
            const { cleanText, actions, sources } = parseResponseActions(accumulatedRaw);
            setMessages((prev) =>
              prev.map((m) =>
                m.id === aiMessageId
                  ? {
                      ...m,
                      text: cleanText,
                      actions,
                      sources,
                      generatedDocuments: receivedDocs,
                      executionJob: receivedJob
                    }
                  : m
              )
            );
            streamedSuccessfully = true;
          }
        }
      } catch (streamErr: any) {
        if (streamErr?.name === 'AbortError') {
          return;
        }
      }

      if (!streamedSuccessfully && !controller.signal.aborted) {
        const res = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestPayload),
          signal: controller.signal
        });

        const data = await res.json();
        const rawReply = data.reply || 'I am processing your inquiry. Please try again.';
        const { cleanText, actions, sources } = parseResponseActions(rawReply);

        const aiMessage: ChatMessage = {
          id: aiMessageId,
          sender: 'assistant',
          text: cleanText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          actions,
          sources,
          generatedDocuments: data.generatedDocuments || [],
          executionJob: data.executionJob || null,
          isFallback: Boolean(data.isOfflineFallback)
        };

        setMessages((prev) => [...prev, aiMessage]);
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') return;
      const fallbackMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'assistant',
        text: `I experienced a temporary connection hiccup, but EVERYKR AI is ready to assist you with Korean universities, admissions, scholarships, application deadlines, Korean language learning, student visas, and general questions.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        actions: [{ type: 'NAVIGATE', page: 'universities', label: 'Browse 25 Universities' }],
        sources: ['EVERYKR Verified Knowledge Base'],
        isFallback: true
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      abortControllerRef.current = null;
      setLoading(false);
    }
  };

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    showToast('Copied to clipboard');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClearHistory = () => {
    window.speechSynthesis?.cancel();
    localStorage.removeItem(storageKey);
    setMessages([
      {
        id: 'welcome-1',
        sender: 'assistant',
        text: personalizedGreetingText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        sources: ['EVERYKR Verified Knowledge Base', '25 Approved Universities DB']
      }
    ]);
    showToast('Conversation history cleared');
  };

  const executeAction = (action: ParsedAction) => {
    if (action.page) {
      setActivePage(action.page);
      setIsOpen(false);
      showToast(`Navigated to ${action.label || action.page}`);
    }
  };

  return (
    <>
      {/* 1. Single Floating Day/Night Toggle Button + Primary Floating AI Button ([ ☀ / ☾ ] [ AI ]) */}
      <div
        dir="ltr"
        className="fixed bottom-4 right-4 sm:bottom-5 sm:right-5 z-40 flex items-center gap-2.5"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        {/* Single Floating Day/Night Toggle Button (Immediately to the LEFT of the AI button) */}
        <button
          type="button"
          onClick={toggleTheme}
          data-no-translate="true"
          className="ekr-glass-card h-11 w-11 sm:h-12 sm:w-12 rounded-2xl text-[#10213D] dark:text-[#DCE8FA] hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0875E8] shrink-0"
          title={theme === 'dark' ? 'Switch to Day Mode' : 'Switch to Night Mode'}
          aria-label={theme === 'dark' ? 'Switch to Day Mode' : 'Switch to Night Mode'}
        >
          {theme === 'dark' ? (
            <Sun className="w-5 h-5 text-amber-400 transition-transform duration-200" />
          ) : (
            <Moon className="w-5 h-5 text-[#10213D] transition-transform duration-200" />
          )}
        </button>

        {/* Floating AI Button (Displays ONLY "AI") */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="everykr-ai-launcher-glow group inline-flex items-center gap-2 sm:gap-2.5 h-11 sm:h-12 ps-2.5 pe-3.5 sm:pe-4 rounded-2xl bg-[#061B49]/85 hover:bg-[#0B204A]/95 backdrop-blur-xl text-white border border-white/25 hover:border-[#60A5FA]/60 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#60A5FA] whitespace-nowrap shadow-lg"
          title={t('ai_tooltip')}
          aria-label="Open EVERYKR AI Assistant"
        >
          <span className="w-7 h-7 rounded-xl bg-[#0875E8]/30 group-hover:bg-[#0875E8]/50 border border-[#60A5FA]/40 flex items-center justify-center shrink-0 transition-colors">
            <Bot className="w-4 h-4 text-[#60A5FA] shrink-0 ekr-icon-ai-idle" />
          </span>
          <span
            data-no-translate="true"
            className="text-xs font-semibold tracking-wide text-[#DCE8FA] group-hover:text-white"
          >
            AI
          </span>
        </button>
      </div>

      {/* 2. Floating Primary EVERYKR AI Assistant Window (Positioned cleanly above the floating controls) */}
      {isOpen && (
        <div
          dir={isRtl ? 'rtl' : 'ltr'}
          className="fixed z-50 animate-in fade-in zoom-in-95 duration-200 flex flex-col bottom-[68px] right-3 sm:bottom-[76px] sm:right-5 w-[calc(100vw-24px)] sm:w-[440px] md:w-[465px] h-[calc(100dvh-140px)] sm:h-[610px] max-h-[80dvh] ekr-glass-modal rounded-3xl overflow-hidden transition-colors duration-200"
        >
          {/* Clean Header Bar — Follows Main Website Theme Automatically */}
          <div className="px-4 py-3 bg-white/50 dark:bg-white/5 text-[#10213D] dark:text-white flex items-center justify-between border-b border-slate-200/60 dark:border-white/12 shrink-0 transition-colors duration-200">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 flex items-center justify-center shrink-0">
                <img
                  src={OFFICIAL_EVERYKR_ICON}
                  alt="EveryKR — Everything Korea, One Platform"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-contain drop-shadow-[0_0_6px_rgba(147,197,253,0.35)]"
                />
              </div>
              <div className="min-w-0">
                <h3
                  data-no-translate="true"
                  className="text-sm font-extrabold tracking-tight text-[#10213D] dark:text-white truncate"
                >
                  EVERYKR AI
                </h3>
                {isAuthReady && activeDisplayName && (
                  <div
                    data-no-translate="true"
                    className="flex items-center gap-1.5 text-[11px] text-[#526685] dark:text-[#B8C9E5]"
                  >
                    <span className="truncate">{activeDisplayName}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1">
              {/* Clear History (shown once chat is active) */}
              {isAuthReady && !showGuestNamePopup && (
                <button
                  type="button"
                  onClick={handleClearHistory}
                  className="p-1.5 text-[#526685] dark:text-[#B8C9E5] hover:text-[#10213D] dark:hover:text-white hover:bg-white/60 dark:hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                  title={uiCopy.clearChat}
                  aria-label={uiCopy.clearChat}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}

              {/* Close Button */}
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  window.speechSynthesis?.cancel();
                  if (isRecording) {
                    cancelVoiceRecording();
                  }
                }}
                className="p-1.5 text-[#526685] dark:text-[#B8C9E5] hover:text-[#10213D] dark:hover:text-white hover:bg-white/60 dark:hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                title={uiCopy.closeChat}
                aria-label={uiCopy.closeChat}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {!isAuthReady ? (
            <div className="flex-1 p-6 flex items-center justify-center bg-transparent transition-colors">
              <Loader2 className="w-6 h-6 animate-spin text-[#0754B8] dark:text-[#60A5FA]" />
            </div>
          ) : showGuestNamePopup ? (
            <div
              data-no-translate="true"
              className="flex-1 p-6 flex items-center justify-center bg-transparent transition-colors"
            >
              <form
                onSubmit={handleGuestNameSubmit}
                className="w-full max-w-sm ekr-glass-panel rounded-2xl p-6 space-y-4"
              >
                <div className="w-10 h-10 rounded-xl ekr-glass-btn-primary flex items-center justify-center text-white shadow-xs">
                  <Bot className="w-5 h-5 ekr-icon-ai-idle" />
                </div>

                <div className="space-y-1">
                  <h4 className="text-base font-bold text-[#10213D] dark:text-white leading-snug">
                    {gateCopy.heading}
                  </h4>
                </div>

                <div className="space-y-1.5">
                  <input
                    ref={guestNameInputRef}
                    type="text"
                    value={guestNameInput}
                    onChange={(e) => {
                      setGuestNameInput(e.target.value);
                      if (guestNameError) setGuestNameError(null);
                    }}
                    placeholder={gateCopy.placeholder}
                    maxLength={50}
                    autoFocus
                    aria-label={gateCopy.heading}
                    aria-invalid={Boolean(guestNameError)}
                    className="ekr-glass-input w-full px-3.5 py-2.5 text-sm rounded-xl"
                  />
                  {guestNameError && (
                    <p role="alert" className="text-xs font-medium text-rose-600 dark:text-rose-400">
                      {guestNameError}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  className="ekr-glass-btn-primary w-full py-2.5 px-4 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <span>{gateCopy.button}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </div>
          ) : (
            <>
          {/* Chat Messages Body */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-white/20 dark:bg-black/15 transition-colors">
            {messages.map((msg) => {
              const isUser = msg.sender === 'user';
              const isSpeaking = activeSpeakingId === msg.id;
              const isRtlMsg = /[\u0600-\u06FF]/.test(msg.text);

              return (
                <div
                  key={msg.id}
                  className={`flex gap-2.5 sm:gap-3 text-xs leading-relaxed ${
                    isUser ? 'flex-row-reverse' : 'flex-row'
                  }`}
                >
                  <div
                    className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 text-white shadow-xs ${
                      isUser
                        ? 'ekr-glass-btn-primary'
                        : 'bg-gradient-to-tr from-[#061B49] to-[#0875E8]'
                    }`}
                  >
                    {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                  </div>

                  <div
                    dir={isRtlMsg ? 'rtl' : 'ltr'}
                    className={`max-w-[86%] sm:max-w-[82%] min-w-0 overflow-hidden rounded-2xl p-3.5 sm:p-4 shadow-xs relative group ${
                      isUser
                        ? 'ekr-glass-btn-primary text-white rounded-tr-xs'
                        : 'ekr-glass-card text-[#10213D] dark:text-white rounded-tl-xs'
                    }`}
                  >
                    {msg.fileAttachment && (
                      <div className="mb-2.5 p-2 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center gap-2 text-[11px] text-slate-700 dark:text-slate-200">
                        <Paperclip className="w-4 h-4 text-blue-500 shrink-0" />
                        <span className="truncate max-w-[210px] font-medium font-mono">
                          {msg.fileAttachment.name}
                        </span>
                      </div>
                    )}

                    {isUser ? (
                      <p className="whitespace-pre-wrap break-words font-sans text-xs sm:text-[13px] leading-relaxed text-white">
                        {msg.text}
                      </p>
                    ) : (
                      <MarkdownRenderer content={msg.text} variant="compact" />
                    )}

                    {/* Generated Downloadable Files */}
                    {msg.generatedDocuments && msg.generatedDocuments.length > 0 && (
                      <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
                        {msg.generatedDocuments.map((doc) => (
                          <a
                            key={doc.id}
                            href={doc.downloadUrl}
                            download={doc.fileName}
                            className="p-2.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 flex items-center justify-between text-[11px] font-bold transition-colors"
                          >
                            <span className="truncate">{doc.fileName}</span>
                            <Download className="w-3.5 h-3.5 shrink-0 ms-2" />
                          </a>
                        ))}
                      </div>
                    )}

                    {/* Sandbox Code Execution Output */}
                    {msg.executionJob && (
                      <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800">
                        <div className="p-2.5 rounded-xl bg-[#050B18] text-emerald-300 font-mono text-[11px]">
                          <div className="text-[10px] text-[#4BA3FF] mb-1">
                            Code Output ({msg.executionJob.language.toUpperCase()} · {msg.executionJob.durationMs}ms)
                          </div>
                          <pre className="whitespace-pre-wrap overflow-x-auto max-h-36">
                            {msg.executionJob.stdout || msg.executionJob.stderr}
                          </pre>
                        </div>
                      </div>
                    )}

                    {/* Interactive Action Buttons */}
                    {msg.actions && msg.actions.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap gap-2">
                        {msg.actions.map((act, actIdx) => (
                          <button
                            key={actIdx}
                            type="button"
                            onClick={() => executeAction(act)}
                            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-[#10243A] dark:text-slate-100 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <span>{act.label || 'View in EVERYKR'}</span>
                            <ArrowRight className="w-3.5 h-3.5 text-[#1769AA] dark:text-[#19B6A4]" />
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Message Footer: Timestamp, Voice TTS, Copy, and Quick Document Export */}
                    <div
                      className={`mt-2.5 flex flex-wrap items-center justify-between gap-2 text-[10px] ${
                        isUser ? 'text-slate-300' : 'text-slate-400'
                      }`}
                    >
                      <span>{msg.timestamp}</span>

                      {!isUser && (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {msg.id !== 'welcome-1' && msg.text.length >= 120 && (
                            <div className="flex items-center gap-1 me-1">
                              {(['pdf', 'docx', 'xlsx', 'pptx'] as const).map((fmt) => {
                                const isExporting = exportingDocKey === `${msg.id}:${fmt}`;
                                return (
                                  <button
                                    key={fmt}
                                    type="button"
                                    onClick={() => handleExportResponseDocument(msg, fmt)}
                                    disabled={Boolean(exportingDocKey)}
                                    className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-semibold uppercase tracking-wider text-[9px] transition-colors cursor-pointer disabled:opacity-50"
                                    title={`Export response as .${fmt.toUpperCase()}`}
                                  >
                                    {isExporting ? '...' : fmt.toUpperCase()}
                                  </button>
                                );
                              })}
                            </div>
                          )}

                          <button
                            type="button"
                            onClick={() => speakMessage(msg.id, msg.text)}
                            className="p-1 hover:text-slate-700 dark:hover:text-white rounded transition-colors cursor-pointer"
                            title={isSpeaking ? 'Stop speaking' : 'Listen with voice'}
                            aria-label={isSpeaking ? 'Stop speaking' : 'Listen with voice'}
                          >
                            {isSpeaking ? (
                              <VolumeX className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
                            ) : (
                              <Volume2 className="w-3.5 h-3.5" />
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleCopyText(msg.text, msg.id)}
                            className="p-1 hover:text-slate-700 dark:hover:text-white rounded transition-colors cursor-pointer"
                            title="Copy message"
                            aria-label="Copy message"
                          >
                            {copiedId === msg.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-500" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {loading && (
              <div className="flex gap-3 text-xs">
                <div className="w-7 h-7 rounded-xl ekr-glass-btn-primary flex items-center justify-center text-white shrink-0 shadow-xs">
                  <Sparkles className="w-4 h-4 animate-pulse" />
                </div>
                <div className="p-3 ekr-glass-card rounded-2xl rounded-tl-xs flex items-center gap-2 text-[#526685] dark:text-[#B8C9E5]">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#0754B8] dark:text-[#60A5FA]" />
                  <span className="text-[11px] font-medium font-sans">
                    {loadingStage}
                  </span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Suggestion Chips */}
          <div className="px-3.5 py-2 bg-white/40 dark:bg-white/5 border-t border-slate-200/60 dark:border-white/12 flex items-center gap-2 overflow-x-auto text-[11px] shrink-0">
            <span className="text-[10px] font-bold text-[#526685] dark:text-[#B8C9E5] uppercase tracking-wider shrink-0">
              {t('ai_prompts_label')}
            </span>
            {SUGGESTED_PROMPTS.map((prompt, pIdx) => {
              const Icon = prompt.icon;
              const localizedLabel = uiCopy.prompts[pIdx] || prompt.label;
              return (
                <button
                  key={pIdx}
                  type="button"
                  onClick={() => handleSendMessage(prompt.query)}
                  className="group px-3 py-1.5 rounded-xl ekr-glass-subtle hover:bg-white/80 dark:hover:bg-white/15 text-[#10213D] dark:text-white hover:text-[#0754B8] dark:hover:text-[#60A5FA] font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  <Icon className="w-3 h-3 text-[#0754B8] dark:text-[#60A5FA] ekr-icon-book-float" />
                  <span>{localizedLabel}</span>
                </button>
              );
            })}
          </div>

          {/* Live Multilingual Voice Recording / Transcription Status Banner */}
          {(isRecording || isTranscribing) && (
            <div className="px-3.5 py-2.5 bg-rose-500/10 dark:bg-rose-500/15 border-t border-rose-500/30 flex items-center justify-between gap-2 text-xs shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                {isRecording ? (
                  <>
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping shrink-0" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 font-bold text-rose-600 dark:text-rose-300 text-[11px]">
                        <span>{uiCopy.listening} ({formatDurationSeconds(recordingSeconds)})</span>
                        <span className="text-[10px] font-normal text-slate-500 dark:text-slate-400 hidden sm:inline">
                          Bangla · Nepali · English · Korean · Auto
                        </span>
                      </div>
                      {liveInterimTranscript && (
                        <p className="text-[11px] text-slate-600 dark:text-slate-300 truncate max-w-[230px]">
                          {liveInterimTranscript}
                        </p>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="flex items-center gap-2 text-[#1769AA] dark:text-[#4BA3FF] font-semibold text-[11px]">
                    <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                    <span>{uiCopy.transcribing}</span>
                  </div>
                )}
              </div>

              {isRecording && (
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={stopAndTranscribeRecording}
                    className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                    title="Stop recording and place text in input"
                  >
                    <Check className="w-3 h-3" />
                    <span>{uiCopy.done}</span>
                  </button>
                  <button
                    type="button"
                    onClick={cancelVoiceRecording}
                    className="px-2 py-1 rounded-lg bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-semibold cursor-pointer transition-colors"
                    title="Cancel voice recording"
                  >
                    {uiCopy.cancel}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Pending File Attachment Banner */}
          {(isReadingFile || attachedFile) && (
            <div className="px-4 py-2 bg-slate-100 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-800 dark:text-slate-200 shrink-0">
              {isReadingFile ? (
                <div className="flex items-center gap-2 text-[11px] text-[#1769AA] dark:text-[#4BA3FF]">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>{uiCopy.processingFile}</span>
                </div>
              ) : (
                attachedFile && (
                  <>
                    <div className="flex items-center gap-2 min-w-0">
                      <Paperclip className="w-4 h-4 text-[#1769AA] dark:text-[#19B6A4] shrink-0" />
                      <span className="font-semibold truncate max-w-[220px]">
                        {attachedFile.name}
                      </span>
                      {attachedFile.sizeBytes && (
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 shrink-0">
                          ({Math.max(1, Math.round(attachedFile.sizeBytes / 1024))} KB)
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setAttachedFile(null)}
                      className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded text-slate-600 dark:text-slate-300 cursor-pointer"
                      title="Remove attachment"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </>
                )
              )}
            </div>
          )}

          {/* Bottom Chat Input Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-3 bg-white/50 dark:bg-white/5 border-t border-slate-200/60 dark:border-white/12 flex items-end gap-2 shrink-0 transition-colors"
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".pdf,.docx,.pptx,.xlsx,.xls,.csv,.txt,.md,.json,.xml,.zip,.py,.js,.ts,.html,.css,image/*"
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={loading || isReadingFile}
              className="p-2.5 rounded-xl ekr-glass-subtle hover:bg-white/80 dark:hover:bg-white/15 text-[#526685] dark:text-[#B8C9E5] transition-colors cursor-pointer shrink-0 disabled:opacity-50"
              title="Attach PDF, Word, Excel, PowerPoint, CSV, Text, or Image"
              aria-label="Attach file"
            >
              <Paperclip className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={toggleRecording}
              disabled={loading || isTranscribing}
              className={`p-2.5 rounded-xl transition-all cursor-pointer shrink-0 disabled:opacity-50 ${
                isRecording
                  ? 'bg-rose-500 text-white animate-pulse shadow-md'
                  : 'ekr-glass-subtle hover:bg-white/80 dark:hover:bg-white/15 text-[#526685] dark:text-[#B8C9E5]'
              }`}
              title={
                isRecording
                  ? 'Stop recording and transcribe into input'
                  : 'Multilingual Voice Input (Bangla, Nepali, English, Korean & more)'
              }
              aria-label={isRecording ? 'Stop voice recording' : 'Start voice input'}
            >
              {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>

            <textarea
              ref={inputTextareaRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder={uiCopy.placeholder}
              className="ekr-glass-input flex-1 px-3.5 py-2.5 text-xs sm:text-sm rounded-xl transition-all resize-none max-h-28 overflow-y-auto leading-relaxed"
              disabled={loading}
            />

            {loading ? (
              <button
                type="button"
                onClick={stopGenerating}
                className="px-3.5 py-2.5 bg-rose-600/90 hover:bg-rose-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md transition-all cursor-pointer shrink-0"
                title="Stop generating response"
              >
                <span>{uiCopy.stop}</span>
                <X className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={(!input.trim() && !attachedFile) || isTranscribing}
                className="ekr-glass-btn-primary px-4 py-2.5 disabled:opacity-40 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
              >
                <span>{uiCopy.send}</span>
                <Send className="w-3.5 h-3.5" />
              </button>
            )}
          </form>
            </>
          )}
        </div>
      )}
    </>
  );
};
