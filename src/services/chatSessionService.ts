/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ChatSession, ChatMessage } from '../types/chat';

const SESSIONS_STORAGE_PREFIX = 'everykr_ai_chat_sessions_v3';
const ACTIVE_SESSION_ID_PREFIX = 'everykr_ai_active_session_id_v3';
const GUEST_NAME_SESSION_KEY = 'everykr_ai_guest_name_session';
const LEGACY_GUEST_NAME_KEY = 'everykr_ai_guest_name';
const GUEST_SESSION_ID_KEY = 'everykr_ai_guest_session_id';

export function getOrCreateGuestSessionId(): string {
  try {
    // Remove legacy localStorage guest name so guest mode strictly uses sessionStorage
    localStorage.removeItem(LEGACY_GUEST_NAME_KEY);
  } catch {
    // ignore
  }
  try {
    let existing = sessionStorage.getItem(GUEST_SESSION_ID_KEY);
    if (!existing) {
      existing = 'guest_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 8);
      sessionStorage.setItem(GUEST_SESSION_ID_KEY, existing);
    }
    return existing;
  } catch {
    return 'guest_default';
  }
}

export function rotateGuestSessionOnLogout(): string {
  const freshId = 'guest_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 8);
  try {
    localStorage.removeItem(LEGACY_GUEST_NAME_KEY);
    localStorage.removeItem(GUEST_SESSION_ID_KEY);
  } catch {
    // ignore
  }
  try {
    sessionStorage.removeItem(GUEST_NAME_SESSION_KEY);
    sessionStorage.removeItem(LEGACY_GUEST_NAME_KEY);
    sessionStorage.setItem(GUEST_SESSION_ID_KEY, freshId);
  } catch {
    // ignore
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('everykr-ai-auth-reset', { detail: { guestSessionId: freshId } })
    );
  }
  return freshId;
}

/**
 * Checks whether a candidate string looks like an email address, Firebase UID, or internal placeholder
 * so email addresses and UIDs are NEVER displayed as user names.
 */
export function isDisallowedIdentifierAsName(
  candidate: string,
  uid?: string | null,
  email?: string | null
): boolean {
  const trimmed = candidate.trim();
  if (!trimmed) return true;
  if (trimmed.includes('@')) return true;
  const lower = trimmed.toLowerCase();
  if (uid && lower === uid.trim().toLowerCase()) return true;
  if (email && lower === email.trim().toLowerCase()) return true;
  if (lower.startsWith('uid_') || lower.startsWith('guest_')) return true;
  if (lower === 'everykr user' || lower === 'unknown' || lower === 'null' || lower === 'undefined') {
    return true;
  }
  // Reject raw 20+ char opaque Firebase UIDs (mixed alphanumeric without spaces)
  if (/^[A-Za-z0-9_-]{20,}$/.test(trimmed) && /\d/.test(trimmed)) {
    return true;
  }
  return false;
}

export function sanitizeGuestDisplayNameClient(
  rawName: string,
  languageCode: string = 'en'
): { valid: boolean; name: string; error?: string } {
  const copy = getLocalizedWelcomeGateCopy(languageCode);
  const stripped = String(rawName || '')
    .replace(/<[^>]*>/g, '')
    .replace(/[\u0000-\u001F\u007F<>`"']/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!stripped) {
    return { valid: false, name: '', error: copy.errorRequired };
  }
  if (stripped.includes('@')) {
    return { valid: false, name: '', error: copy.errorInvalid };
  }
  if (stripped.length > 50) {
    return { valid: false, name: stripped.slice(0, 50), error: copy.errorTooLong };
  }
  return { valid: true, name: stripped };
}

export function sanitizeAccountDisplayName(
  rawName?: string | null,
  uid?: string | null,
  email?: string | null
): string | null {
  if (typeof rawName !== 'string') return null;
  const stripped = rawName
    .replace(/<[^>]*>/g, '')
    .replace(/[\u0000-\u001F\u007F<>`"']/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!stripped || stripped.length > 80) return null;
  if (isDisallowedIdentifierAsName(stripped, uid, email)) return null;
  return stripped;
}

export function getStoredGuestDisplayName(): string | null {
  try {
    const val = sessionStorage.getItem(GUEST_NAME_SESSION_KEY);
    if (!val) return null;
    const check = sanitizeGuestDisplayNameClient(val);
    return check.valid ? check.name : null;
  } catch {
    return null;
  }
}

export function saveGuestDisplayName(rawName: string, languageCode: string = 'en'): string | null {
  const check = sanitizeGuestDisplayNameClient(rawName, languageCode);
  if (!check.valid) return null;
  try {
    localStorage.removeItem(LEGACY_GUEST_NAME_KEY);
  } catch {
    // ignore
  }
  try {
    sessionStorage.setItem(GUEST_NAME_SESSION_KEY, check.name);
  } catch {
    // ignore
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('everykr-ai-guest-name-updated', { detail: { name: check.name } })
    );
  }
  return check.name;
}

export function clearGuestDisplayName(): void {
  try {
    localStorage.removeItem(LEGACY_GUEST_NAME_KEY);
  } catch {
    // ignore
  }
  try {
    sessionStorage.removeItem(GUEST_NAME_SESSION_KEY);
    sessionStorage.removeItem(LEGACY_GUEST_NAME_KEY);
  } catch {
    // ignore
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('everykr-ai-guest-name-updated', { detail: { name: null } }));
  }
}

export function buildPersonalizedAiGreeting(
  displayName: string,
  _isAuthenticated: boolean,
  languageCode: string = 'en'
): string {
  const cleanName = String(displayName || '')
    .replace(/<[^>]*>/g, '')
    .replace(/[\u0000-\u001F\u007F<>`"']/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  const lang = (languageCode || 'en').toLowerCase();

  if (cleanName) {
    if (lang === 'bn') {
      return `হ্যালো, ${cleanName}! আজ আপনাকে কীভাবে সাহায্য করতে পারি?`;
    }
    if (lang === 'ko') {
      return `안녕하세요, ${cleanName}님! 오늘 무엇을 도와드릴까요?`;
    }
    if (lang === 'ne') {
      return `नमस्ते, ${cleanName}! आज म तपाईंलाई कसरी सहयोग गर्न सक्छु?`;
    }
    if (lang === 'ur') {
      return `السلام علیکم، ${cleanName}! آج میں آپ کی کیا مدد کر سکتا ہوں؟`;
    }
    if (lang === 'hi') {
      return `नमस्ते, ${cleanName}! आज मैं आपकी कैसे मदद कर सकता हूँ?`;
    }
    if (lang === 'ar') {
      return `مرحباً، ${cleanName}! كيف يمكنني مساعدتك اليوم؟`;
    }
    if (lang === 'zh') {
      return `您好，${cleanName}！今天有什么可以帮您的？`;
    }
    if (lang === 'ja') {
      return `こんにちは、${cleanName}さん！今日はどのようなお手伝いができますか？`;
    }
    return `Hello, ${cleanName}! How can I help you today?`;
  }

  if (lang === 'bn') return 'হ্যালো! আজ আপনাকে কীভাবে সাহায্য করতে পারি?';
  if (lang === 'ko') return '안녕하세요! 오늘 무엇을 도와드릴까요?';
  if (lang === 'ne') return 'नमस्ते! आज म तपाईंलाई कसरी सहयोग गर्न सक्छु?';
  if (lang === 'ur') return 'السلام علیکم! آج میں آپ کی کیا مدد کر سکتا ہوں؟';
  if (lang === 'hi') return 'नमस्ते! आज मैं आपकी कैसे मदद कर सकता हूँ?';
  if (lang === 'ar') return 'مرحباً! كيف يمكنني مساعدتك اليوم؟';
  if (lang === 'zh') return '您好！今天有什么可以帮您的？';
  if (lang === 'ja') return 'こんにちは！今日はどのようなお手伝いができますか？';
  return 'Hello! How can I help you today?';
}

export function getLocalizedWelcomeGateCopy(languageCode: string = 'en') {
  const lang = (languageCode || 'en').toLowerCase();
  const defaults = {
    description: 'Enter your name to personalize your conversation.',
    changeNameLabel: 'Change Name'
  };
  if (lang === 'bn') {
    return {
      ...defaults,
      heading: 'শুরু করার আগে, আপনার নাম কী?',
      placeholder: 'আপনার নাম লিখুন',
      button: 'চালিয়ে যান',
      errorRequired: 'চালিয়ে যেতে অনুগ্রহ করে আপনার নাম লিখুন।',
      errorInvalid: 'অনুগ্রহ করে ইমেইল নয়, আপনার নাম লিখুন।',
      errorTooLong: 'নাম ৫০ অক্ষরের মধ্যে হতে হবে।'
    };
  }
  if (lang === 'ko') {
    return {
      ...defaults,
      heading: '시작하기 전에, 성함이 어떻게 되시나요?',
      placeholder: '이름을 입력하세요',
      button: '계속하기',
      errorRequired: '계속하려면 이름을 입력해 주세요.',
      errorInvalid: '이메일 주소가 아닌 이름을 입력해 주세요.',
      errorTooLong: '이름은 50자 이내로 입력해 주세요.'
    };
  }
  if (lang === 'ne') {
    return {
      ...defaults,
      heading: 'सुरु गर्नु अघि, तपाईंको नाम के हो?',
      placeholder: 'आफ्नो नाम लेख्नुहोस्',
      button: 'अगाडि बढ्नुहोस्',
      errorRequired: 'अगाडि बढ्न कृपया आफ्नो नाम लेख्नुहोस्।',
      errorInvalid: 'कृपया इमेल ठेगाना होइन, आफ्नो नाम लेख्नुहोस्।',
      errorTooLong: 'नाम ५० अक्षर वा सोभन्दा कम हुनुपर्छ।'
    };
  }
  if (lang === 'ur') {
    return {
      ...defaults,
      heading: 'شروع کرنے سے پہلے، آپ کا نام کیا ہے؟',
      placeholder: 'اپنا نام درج کریں',
      button: 'جاری رکھیں',
      errorRequired: 'جاری رکھنے کے لیے براہ کرم اپنا نام درج کریں۔',
      errorInvalid: 'براہ کرم ای میل کے بجائے اپنا نام درج کریں۔',
      errorTooLong: 'نام 50 حروف یا اس سے کم ہونا چاہیے۔'
    };
  }
  if (lang === 'hi') {
    return {
      ...defaults,
      heading: 'शुरू करने से पहले, आपका नाम क्या है?',
      placeholder: 'अपना नाम दर्ज करें',
      button: 'जारी रखें',
      errorRequired: 'जारी रखने के लिए कृपया अपना नाम दर्ज करें।',
      errorInvalid: 'कृपया ईमेल पता नहीं, अपना नाम दर्ज करें।',
      errorTooLong: 'नाम 50 अक्षरों या उससे कम का होना चाहिए।'
    };
  }
  if (lang === 'ar') {
    return {
      ...defaults,
      heading: 'قبل أن نبدأ، ما اسمك؟',
      placeholder: 'أدخل اسمك',
      button: 'متابعة',
      errorRequired: 'يرجى إدخال اسمك للمتابعة.',
      errorInvalid: 'يرجى إدخال اسمك وليس البريد الإلكتروني.',
      errorTooLong: 'يجب ألا يتجاوز الاسم 50 حرفاً.'
    };
  }
  if (lang === 'zh') {
    return {
      ...defaults,
      heading: '在开始之前，请问您叫什么名字？',
      placeholder: '输入您的名字',
      button: '继续',
      errorRequired: '请输入您的名字以继续。',
      errorInvalid: '请输入您的名字，而不是电子邮箱。',
      errorTooLong: '名字不能超过 50 个字符。'
    };
  }
  if (lang === 'ja') {
    return {
      ...defaults,
      heading: '始める前に、お名前を教えてください。',
      placeholder: '名前を入力してください',
      button: '続ける',
      errorRequired: '続行するにはお名前を入力してください。',
      errorInvalid: 'メールアドレスではなくお名前を入力してください。',
      errorTooLong: 'お名前は50文字以内で入力してください。'
    };
  }
  return {
    ...defaults,
    heading: "Before we start, what's your name?",
    placeholder: 'Enter your name',
    button: 'Continue',
    errorRequired: 'Please enter your name to continue.',
    errorInvalid: 'Please enter your name, not an email address.',
    errorTooLong: 'Name must be 50 characters or fewer.'
  };
}

function normalizeUserScope(userScope?: string | null): string {
  const clean = (userScope || 'guest').trim().replace(/[^a-zA-Z0-9_-]/g, '_');
  return clean || 'guest';
}

function getSessionsKey(userScope?: string | null): string {
  return `${SESSIONS_STORAGE_PREFIX}::${normalizeUserScope(userScope)}`;
}

function getActiveSessionKey(userScope?: string | null): string {
  return `${ACTIVE_SESSION_ID_PREFIX}::${normalizeUserScope(userScope)}`;
}

export function getStoredChatSessions(userScope: string = 'guest'): ChatSession[] {
  try {
    const raw = localStorage.getItem(getSessionsKey(userScope));
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }

    // Migrate legacy floating assistant history if present so no user chats are lost
    const legacyKey = `everykr_ai_chat_v3::${userScope}`;
    const legacyRaw = localStorage.getItem(legacyKey);
    if (legacyRaw) {
      const legacyMsgs = JSON.parse(legacyRaw);
      if (Array.isArray(legacyMsgs) && legacyMsgs.length > 0) {
        const userTurns = legacyMsgs.filter((m: any) => m && m.sender === 'user');
        if (userTurns.length > 0) {
          const migratedSession: ChatSession = {
            id: 'session_migrated_' + Date.now(),
            title: String(userTurns[0].text || 'Migrated EVERYKR AI Chat').slice(0, 42),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            messages: legacyMsgs,
          };
          saveStoredChatSessions([migratedSession], userScope);
          return [migratedSession];
        }
      }
    }

    return [];
  } catch (err) {
    console.error('Error reading chat sessions:', err);
    return [];
  }
}

export function saveStoredChatSessions(sessions: ChatSession[], userScope: string = 'guest'): void {
  try {
    const trimmed = sessions.slice(0, 40);
    localStorage.setItem(getSessionsKey(userScope), JSON.stringify(trimmed));
  } catch (err) {
    console.error('Error saving chat sessions:', err);
  }
}

export function getActiveSessionId(userScope: string = 'guest'): string | null {
  try {
    return localStorage.getItem(getActiveSessionKey(userScope));
  } catch {
    return null;
  }
}

export function setActiveSessionId(id: string, userScope: string = 'guest'): void {
  try {
    localStorage.setItem(getActiveSessionKey(userScope), id);
  } catch (err) {
    console.error('Error setting active session id:', err);
  }
}

export function createNewChatSession(
  title: string = 'New Conversation',
  initialMessages: ChatMessage[] = [],
  userScope: string = 'guest',
  projectId?: string
): ChatSession {
  const newSession: ChatSession = {
    id: 'session_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    title,
    projectId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    messages: initialMessages,
  };

  const sessions = getStoredChatSessions(userScope);
  sessions.unshift(newSession);
  saveStoredChatSessions(sessions, userScope);
  setActiveSessionId(newSession.id, userScope);
  return newSession;
}

export function updateSessionMessages(
  sessionId: string,
  messages: ChatMessage[],
  userScope: string = 'guest'
): void {
  const sessions = getStoredChatSessions(userScope);
  const session = sessions.find((s) => s.id === sessionId);
  if (session) {
    session.messages = messages;
    session.updatedAt = new Date().toISOString();

    if (session.title === 'New Conversation' && messages.length > 0) {
      const firstUserMsg = messages.find((m) => m.sender === 'user');
      if (firstUserMsg && firstUserMsg.text.trim()) {
        const cleanTitle = firstUserMsg.text.trim().substring(0, 42);
        session.title = cleanTitle.length >= 42 ? cleanTitle + '...' : cleanTitle;
      }
    }

    saveStoredChatSessions(sessions, userScope);
  }
}

export function renameChatSession(
  sessionId: string,
  newTitle: string,
  userScope: string = 'guest'
): void {
  const sessions = getStoredChatSessions(userScope);
  const session = sessions.find((s) => s.id === sessionId);
  if (session && newTitle.trim()) {
    session.title = newTitle.trim();
    session.updatedAt = new Date().toISOString();
    saveStoredChatSessions(sessions, userScope);
  }
}

export function deleteChatSession(sessionId: string, userScope: string = 'guest'): ChatSession[] {
  const sessions = getStoredChatSessions(userScope).filter((s) => s.id !== sessionId);
  saveStoredChatSessions(sessions, userScope);
  return sessions;
}
