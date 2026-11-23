/**
 * EveryKR Linguistic Hangul Phonetics & Quad-Script Pronunciation Engine
 *
 * Converts Korean Hangul words and sentences into authentic surface-phonetic
 * pronunciations in four distinct learner scripts:
 * - Bengali ('bn'): Bengali script (বাংলা হরফ), e.g. 안녕하세요 -> আন্নিওংহাসেয়ো
 * - Nepali ('ne'): Devanagari script (नेपाली देवनागरी), e.g. 안녕하세요 -> आन्योङहासेयो
 * - Urdu ('ur'): Urdu script / Romanized phonetic guide (اردو), e.g. 안녕하세요 -> آنیونگ ہاسیو (Annyeonghaseyo)
 * - English ('en'): Revised Romanization of Korean, e.g. 안녕하세요 -> Annyeonghaseyo
 */

export type LearningExplanationLang =
  | 'en'
  | 'bn'
  | 'ko'
  | 'ne'
  | 'hi'
  | 'ur'
  | 'ar'
  | 'zh'
  | 'ja';

interface SyllableParts {
  cho: number;  // 0..18
  jung: number; // 0..20
  jong: number; // 0..27 (0 = no batchim)
}

const HANGUL_BASE = 0xac00;
const HANGUL_END = 0xd7a3;

// 19 Initial Consonants (초성):
// 0:ㄱ 1:ㄲ 2:ㄴ 3:ㄷ 4:ㄸ 5:ㄹ 6:ㅁ 7:ㅂ 8:ㅃ 9:ㅅ 10:ㅆ 11:ㅇ 12:ㅈ 13:ㅉ 14:ㅊ 15:ㅋ 16:ㅌ 17:ㅍ 18:ㅎ

// 21 Medial Vowels (중성):
// 0:ㅏ 1:ㅐ 2:ㅑ 3:ㅒ 4:ㅓ 5:ㅔ 6:ㅕ 7:ㅖ 8:ㅗ 9:ㅘ 10:ㅙ 11:ㅚ 12:ㅛ 13:ㅜ 14:ㅝ 15:ㅞ 16:ㅟ 17:ㅠ 18:ㅡ 19:ㅢ 20:ㅣ

// 28 Final Consonants / Batchim (종성):
// 0:'' 1:ㄱ 2:ㄲ 3:ㄳ 4:ㄴ 5:ㄵ 6:ㄶ 7:ㄷ 8:ㄹ 9:ㄺ 10:ㄻ 11:ㄼ 12:ㄽ 13:ㄾ 14:ㄿ 15:ㅀ
// 16:ㅁ 17:ㅂ 18:ㅄ 19:ㅅ 20:ㅆ 21:ㅇ 22:ㅈ 23:ㅊ 24:ㅋ 25:ㅌ 26:ㅍ 27:ㅎ

// Exact high-frequency phrase & word overrides for maximally natural learner pronunciation
const EXACT_OVERRIDES: Record<string, { bn: string; ne: string; en: string }> = {
  '안녕하세요': { bn: 'আন্নিওংহাসেয়ো', ne: 'आन्योङहासेयो', en: 'Annyeonghaseyo' },
  '안녕하십니까': { bn: 'আন্নিওংহাশিম্নিক্কা', ne: 'आन्योङहाशिम्निक्का', en: 'Annyeonghasimnikka' },
  '감사합니다': { bn: 'খামসাহামনিদা', ne: 'खाम्साहाम्निदा', en: 'Gamsahamnida' },
  '고맙습니다': { bn: 'গোমাপ্সুম্নিদা', ne: 'गोमाप्सुम्निदा', en: 'Gomapseumnida' },
  '고마워요': { bn: 'গোমাওয়য়ো', ne: 'गोमावयो', en: 'Gomawoyo' },
  '죄송합니다': { bn: 'ছোয়েসংহামনিদা', ne: 'छोएसोङहाम्निदा', en: 'Joesonghamnida' },
  '미안합니다': { bn: 'মিয়ানহামনিদা', ne: 'मियानहाम्निदा', en: 'Mianhamnida' },
  '미안해요': { bn: 'মিয়ানহেয়ো', ne: 'मियानहेयो', en: 'Mianhaeyo' },
  '괜찮아요': { bn: 'কুয়েনছানায়ো', ne: 'क्वेन्छानायो', en: 'Gwaenchanayo' },
  '괜찮습니다': { bn: 'কুয়েনছানসুম্নিদা', ne: 'क्वेन्छान्सुम्निदा', en: 'Gwaenchanseumnida' },
  '반갑습니다': { bn: 'ফানগাপ্সুম্নিদা', ne: 'फानगाप्सुम्निदा', en: 'Bangapseumnida' },
  '만나서 반갑습니다': { bn: 'মান্নাস ফানগাপ্সুম্নিদা', ne: 'मान्नास फानगाप्सुम्निदा', en: 'Mannaseo bangapseumnida' },
  '잠시만요': { bn: 'ছামশিমানিও', ne: 'छाम्शिमान्यो', en: 'Jamsimanyo' },
  '실례합니다': { bn: 'শিল্লিয়েহামনিদা', ne: 'शिल्ल्येहाम्निदा', en: 'Sillyehamnida' },
  '도와주세요': { bn: 'দোওয়াজুসেয়ো', ne: 'दोवाजुसेयो', en: 'Dowajuseyo' },
  '살려주세요': { bn: 'সাল্লিয়জুসেয়ো', ne: 'साल्ल्यजुसेयो', en: 'Sallyeojuseyo' },
  '어떻게': { bn: 'অত্তখে', ne: 'अत्तखे', en: 'Eotteoke' },
  '같이': { bn: 'খাছি', ne: 'खाछी', en: 'Gachi' },
  '있어요': { bn: 'ইস্সয়ো', ne: 'इस्सयो', en: 'Isseoyo' },
  '없어요': { bn: 'অপ্সয়ো', ne: 'अप्सयो', en: 'Eopseoyo' },
  '주세요': { bn: 'জুসেয়ো', ne: 'जुसेयो', en: 'Juseyo' },
  '얼마예요': { bn: 'অলমায়েয়ো', ne: 'अल्मायेयो', en: 'Eolmayeyo' },
  '얼마예요?': { bn: 'অলমায়েয়ো?', ne: 'अल्मायेयो?', en: 'Eolmayeyo?' },
  '화장실': { bn: 'হোয়াজাংশিল', ne: 'ह्वाजाङशिल', en: 'Hwajangsil' },
  '한국어': { bn: 'হানগুগ', ne: 'हानगुग', en: 'Hangugeo' },
  '한국': { bn: 'হানগুক', ne: 'हानगुक', en: 'Hanguk' },
  '대학교': { bn: 'দেহাক্কিয়ো', ne: 'देहाक्क्यो', en: 'Daehakgyo' },
  '외국인등록증': { bn: 'ওয়েগুগিন দুংনোকচ্চুং', ne: 'वेगुगिन दुङनोक्च्चुङ', en: 'Oegugin deungnokjeung' },
  '출입국관리사무소': { bn: 'ছুরিপকুক কোয়াল্লি সামুসো', ne: 'छुरिपकुक ग्वाल्ली सामुसो', en: 'Churipguk gwalli samuso' },
  '지하철': { bn: 'ছিহাছল', ne: 'छिहाछल', en: 'Jihacheol' },
  '병원': { bn: 'বিয়ংউওন', ne: 'ब्यङवोन', en: 'Byeongwon' },
  '약국': { bn: 'ইয়াক্কুক', ne: 'याक्कुक', en: 'Yakguk' },
  '은행': { bn: 'উনহেং', ne: 'उनहेङ', en: 'Eunhaeng' },
  '편의점': { bn: 'ফিয়নুইজম', ne: 'फ्यनुइजम', en: 'Pyeonuijeom' },
  '기숙사': { bn: 'খিসুক্সা', ne: 'खिसुक्सा', en: 'Gisuksa' },
  '장학금': { bn: 'ছাংহাক্কুম', ne: 'छाङहाक्कुम', en: 'Janghakgeum' },
  '아르바이트': { bn: 'আরুবাইথু', ne: 'आरुबाइथु', en: 'Areubaiteu' },
  '근로계약서': { bn: 'গুল্লো খিয়েইয়াক্স', ne: 'गुल्लो खेयाक्स', en: 'Geullo gyeyakseo' },
};

function decomposeHangulChar(ch: string): SyllableParts | null {
  const code = ch.charCodeAt(0);
  if (code < HANGUL_BASE || code > HANGUL_END) return null;
  const offset = code - HANGUL_BASE;
  const jong = offset % 28;
  const jung = ((offset - jong) / 28) % 21;
  const cho = Math.floor((offset - jong) / 28 / 21);
  return { cho, jung, jong };
}

// Map single batchim index -> initial cho index when liaison (연음) occurs before ㅇ (cho=11)
const LIAISON_SINGLE: Record<number, [number, number]> = {
  1: [0, 0],   // ㄱ -> cho ㄱ
  2: [0, 1],   // ㄲ -> cho ㄲ
  3: [1, 10],  // ㄳ -> keep ㄱ, move ㅆ
  4: [0, 2],   // ㄴ -> cho ㄴ
  5: [4, 12],  // ㄵ -> keep ㄴ, move ㅈ
  6: [4, 11],  // ㄶ -> keep ㄴ, ㅎ silent
  7: [0, 3],   // ㄷ -> cho ㄷ
  8: [0, 5],   // ㄹ -> cho ㄹ
  9: [8, 0],   // ㄺ -> keep ㄹ, move ㄱ
  10: [8, 6],  // ㄻ -> keep ㄹ, move ㅁ
  11: [8, 7],  // ㄼ -> keep ㄹ, move ㅂ
  12: [8, 10], // ㄽ -> keep ㄹ, move ㅆ
  13: [8, 16], // ㄾ -> keep ㄹ, move ㅌ
  14: [8, 17], // ㄿ -> keep ㄹ, move ㅍ
  15: [8, 11], // ㅀ -> keep ㄹ, ㅎ silent
  16: [0, 6],  // ㅁ -> cho ㅁ
  17: [0, 7],  // ㅂ -> cho ㅂ
  18: [17, 10],// ㅄ -> keep ㅂ, move ㅆ
  19: [0, 9],  // ㅅ -> cho ㅅ
  20: [0, 10], // ㅆ -> cho ㅆ
  22: [0, 12], // ㅈ -> cho ㅈ
  23: [0, 14], // ㅊ -> cho ㅊ
  24: [0, 15], // ㅋ -> cho ㅋ
  25: [0, 16], // ㅌ -> cho ㅌ
  26: [0, 17], // ㅍ -> cho ㅍ
  27: [0, 11], // ㅎ -> silent before vowel
};

// Neutralize final coda into 7 surface sounds: 0:'', 1:k, 4:n, 7:t, 8:l, 16:m, 17:p, 21:ng
function neutralizeJong(jong: number): number {
  switch (jong) {
    case 0: return 0;
    case 1: case 2: case 3: case 9: case 24: return 1; // k
    case 4: case 5: case 6: return 4; // n
    case 7: case 19: case 20: case 22: case 23: case 25: case 27: return 7; // t
    case 8: case 11: case 12: case 13: case 15: return 8; // l
    case 10: case 16: return 16; // m
    case 14: case 17: case 18: case 26: return 17; // p
    case 21: return 21; // ng
    default: return 0;
  }
}

/**
 * Applies core Korean phonological rules across adjacent syllables within a word:
 * - Palatalization (ㄷ/ㅌ + 이 -> 지/치)
 * - Liaison (batchim + ㅇ -> onset)
 * - Aspiration (ㄱ/ㄷ/ㅂ/ㅈ + ㅎ -> ㅋ/ㅌ/ㅍ/ㅊ)
 * - Nasalization (k/t/p + n/m -> ng/n/m)
 * - Liquidization (n + l / l + n -> l + l)
 * - Coda 7-sound neutralization
 */
function applyPhonologyToWord(word: string): Array<SyllableParts | string> {
  const items: Array<SyllableParts | string> = Array.from(word).map(ch => {
    const parts = decomposeHangulChar(ch);
    return parts ? { ...parts } : ch;
  });

  for (let i = 0; i < items.length - 1; i++) {
    const cur = items[i];
    const nxt = items[i + 1];
    if (typeof cur === 'string' || typeof nxt === 'string') continue;

    // 1. Palatalization: ㄷ(7) or ㅌ(25) before 이(cho=11, jung=20)
    if (nxt.cho === 11 && nxt.jung === 20) {
      if (cur.jong === 7) {
        cur.jong = 0;
        nxt.cho = 12; // ㅈ
        continue;
      }
      if (cur.jong === 25) {
        cur.jong = 0;
        nxt.cho = 14; // ㅊ
        continue;
      }
      if (cur.jong === 13) {
        cur.jong = 8;
        nxt.cho = 14; // ㄾ + 이 -> ㄹ치
        continue;
      }
    }

    // 2. Aspiration with ㅎ (cho=18 or jong=27/6/15)
    if (nxt.cho === 18) {
      if (cur.jong === 1 || cur.jong === 9) {
        cur.jong = cur.jong === 9 ? 8 : 0;
        nxt.cho = 15; // ㅋ
        continue;
      }
      if (cur.jong === 7 || cur.jong === 19 || cur.jong === 22 || cur.jong === 23) {
        cur.jong = 0;
        nxt.cho = 16; // ㅌ
        continue;
      }
      if (cur.jong === 17 || cur.jong === 11) {
        cur.jong = cur.jong === 11 ? 8 : 0;
        nxt.cho = 17; // ㅍ
        continue;
      }
    }
    if (cur.jong === 27 || cur.jong === 6 || cur.jong === 15) {
      const rem = cur.jong === 6 ? 4 : cur.jong === 15 ? 8 : 0;
      if (nxt.cho === 0) { cur.jong = rem; nxt.cho = 15; continue; } // ㄱ -> ㅋ
      if (nxt.cho === 3) { cur.jong = rem; nxt.cho = 16; continue; } // ㄷ -> ㅌ
      if (nxt.cho === 7) { cur.jong = rem; nxt.cho = 17; continue; } // ㅂ -> ㅍ
      if (nxt.cho === 12) { cur.jong = rem; nxt.cho = 14; continue; } // ㅈ -> ㅊ
    }

    // 3. Liaison before vowel-initial syllable (cho === 11 'ㅇ')
    if (cur.jong !== 0 && nxt.cho === 11 && cur.jong !== 21) {
      const rule = LIAISON_SINGLE[cur.jong];
      if (rule) {
        cur.jong = rule[0];
        nxt.cho = rule[1];
        continue;
      }
    }

    // Neutralize cur.jong before consonant assimilation
    const cJong = neutralizeJong(cur.jong);

    // 4. Liquidization: ㄴ(4) + ㄹ(cho 5) or ㄹ(8) + ㄴ(cho 2) -> ㄹ + ㄹ
    if (cJong === 4 && nxt.cho === 5) {
      cur.jong = 8;
      nxt.cho = 5;
      continue;
    }
    if (cJong === 8 && nxt.cho === 2) {
      cur.jong = 8;
      nxt.cho = 5;
      continue;
    }

    // 5. Nasalization before ㄴ(cho 2) or ㅁ(cho 6)
    if (nxt.cho === 2 || nxt.cho === 6) {
      if (cJong === 17) { cur.jong = 16; continue; } // p -> m (감사합니다 -> 감사함니다)
      if (cJong === 1) { cur.jong = 21; continue; }  // k -> ng (한국말 -> 한궁말)
      if (cJong === 7) { cur.jong = 4; continue; }   // t -> n (있는 -> 인는)
    }

    // 6. Nasalization of ㄹ(cho 5) after ㅁ(16) or ㅇ(21) or ㄱ(1) or ㅂ(17)
    if (nxt.cho === 5) {
      if (cJong === 16 || cJong === 21) {
        nxt.cho = 2; // ㄹ -> ㄴ (종로 -> 종노, 심리 -> 심니)
        continue;
      }
      if (cJong === 1) {
        cur.jong = 21;
        nxt.cho = 2; // 국립 -> 궁닙
        continue;
      }
      if (cJong === 17) {
        cur.jong = 16;
        nxt.cho = 2; // 섭리 -> 섬니
        continue;
      }
    }

    // 7. Post-obstruent tensification (경음화): k(1), t(7), p(17) + ㄱ/ㄷ/ㅂ/ㅅ/ㅈ
    if (cJong === 1 || cJong === 7 || cJong === 17) {
      if (nxt.cho === 0) nxt.cho = 1;
      else if (nxt.cho === 3) nxt.cho = 4;
      else if (nxt.cho === 7) nxt.cho = 8;
      else if (nxt.cho === 9) nxt.cho = 10;
      else if (nxt.cho === 12) nxt.cho = 13;
    }

    cur.jong = neutralizeJong(cur.jong);
  }

  const last = items[items.length - 1];
  if (last && typeof last !== 'string') {
    last.jong = neutralizeJong(last.jong);
  }

  return items;
}

// ============================================================================
// 1. REVISED ROMANIZATION (English Learners: 'en')
// ============================================================================
const RR_CHO_INITIAL = ['g', 'kk', 'n', 'd', 'tt', 'r', 'm', 'b', 'pp', 's', 'ss', '', 'j', 'jj', 'ch', 'k', 't', 'p', 'h'];
const RR_JUNG = ['a', 'ae', 'ya', 'yae', 'eo', 'e', 'yeo', 'ye', 'o', 'wa', 'wae', 'oe', 'yo', 'u', 'wo', 'we', 'wi', 'yu', 'eu', 'ui', 'i'];
const RR_JONG: Record<number, string> = { 0: '', 1: 'k', 4: 'n', 7: 't', 8: 'l', 16: 'm', 17: 'p', 21: 'ng' };

function renderWordRomanized(word: string): string {
  const exact = EXACT_OVERRIDES[word];
  if (exact) return exact.en;

  const seq = applyPhonologyToWord(word);
  let out = '';
  for (let i = 0; i < seq.length; i++) {
    const item = seq[i];
    if (typeof item === 'string') {
      out += item;
      continue;
    }
    let onset = RR_CHO_INITIAL[item.cho] ?? '';
    const prev = i > 0 ? seq[i - 1] : null;
    if (item.cho === 5 && prev && typeof prev !== 'string' && prev.jong === 8) {
      onset = 'l';
    }
    // Avoid triple consonant like 'hakkkyo' when prev coda already provides k/t/p
    if (prev && typeof prev !== 'string') {
      if (prev.jong === 1 && item.cho === 1) onset = 'g';
      else if (prev.jong === 7 && item.cho === 4) onset = 'd';
      else if (prev.jong === 17 && item.cho === 8) onset = 'b';
    }
    const vowel = RR_JUNG[item.jung] ?? '';
    const coda = RR_JONG[item.jong] ?? '';
    out += `${onset}${vowel}${coda}`;
  }
  return out ? out.charAt(0).toUpperCase() + out.slice(1) : word;
}

// ============================================================================
// 2. BENGALI SCRIPT PRONUNCIATION (Bengali Learners: 'bn')
// ============================================================================
const BN_CHO_WORD_START = ['খ', 'ক্ক', 'ন', 'থ', 'ত্ত', 'র', 'ম', 'ফ', 'প্প', 'স', 'স্স', '', 'ছ', 'জ্জ', 'ছ', 'খ', 'থ', 'ফ', 'হ'];
const BN_CHO_MEDIAL = ['গ', 'ক্ক', 'ন', 'দ', 'ত্ত', 'র', 'ম', 'ব', 'প্প', 'স', 'স্স', '', 'জ', 'জ্জ', 'ছ', 'খ', 'থ', 'ফ', 'হ'];

// Independent vowels (when cho === 11 'ㅇ') vs Matra / Dependent forms (after consonant)
const BN_VOWEL_INDEP = [
  'আ', 'এ', 'ইয়া', 'ইয়ে', 'অ', 'এ', 'ইয়', 'ইয়ে',
  'ও', 'ওয়া', 'ওয়ে', 'ওয়ে', 'ইয়ো', 'উ', 'উয়', 'উয়ে',
  'উই', 'ইউ', 'উ', 'উই', 'ই',
];
const BN_VOWEL_MATRA = [
  'া', 'ে', 'িয়া', 'িয়ে', '', 'ে', 'িয়', 'িয়ে',
  'ো', 'োয়া', 'োয়ে', 'োয়ে', 'িয়ো', 'ু', 'ুয়', 'ুয়ে',
  'ুই', 'িউ', 'ু', 'ুই', 'ি',
];
const BN_JONG: Record<number, string> = {
  0: '',
  1: 'ক',
  4: 'ন',
  7: 'ত',
  8: 'ল',
  16: 'ম',
  17: 'প',
  21: 'ং',
};

function renderWordBengali(word: string): string {
  const exact = EXACT_OVERRIDES[word];
  if (exact) return exact.bn;

  const seq = applyPhonologyToWord(word);
  let out = '';
  let isFirstHangul = true;

  for (let i = 0; i < seq.length; i++) {
    const item = seq[i];
    if (typeof item === 'string') {
      out += item;
      continue;
    }

    const nxt = i + 1 < seq.length ? seq[i + 1] : null;
    const suppressHomorganicCoda =
      nxt &&
      typeof nxt !== 'string' &&
      ((item.jong === 1 && nxt.cho === 1) ||
        (item.jong === 7 && nxt.cho === 4) ||
        (item.jong === 17 && nxt.cho === 8));
    const coda = suppressHomorganicCoda ? '' : (BN_JONG[item.jong] ?? '');

    if (item.cho === 11) {
      const v = BN_VOWEL_INDEP[item.jung] ?? 'আ';
      out += `${v}${coda}`;
    } else {
      let c = (isFirstHangul ? BN_CHO_WORD_START : BN_CHO_MEDIAL)[item.cho] ?? '';
      if (item.cho === 9 && [2, 6, 12, 16, 17, 20].includes(item.jung)) {
        c = 'শ';
      }
      const prev = i > 0 ? seq[i - 1] : null;
      if (item.cho === 5 && prev && typeof prev !== 'string' && prev.jong === 8) {
        c = 'ল';
      }
      const m = BN_VOWEL_MATRA[item.jung] ?? '';
      out += `${c}${m}${coda}`;
    }
    isFirstHangul = false;
  }
  return out || word;
}

// ============================================================================
// 3. NEPALI DEVANAGARI SCRIPT PRONUNCIATION (Nepali Learners: 'ne')
// ============================================================================
const NE_CHO_WORD_START = ['ख', 'क्क', 'न', 'थ', 'त्त', 'र', 'म', 'फ', 'प्प', 'स', 'स्स', '', 'छ', 'ज्ज', 'छ', 'ख', 'थ', 'फ', 'ह'];
const NE_CHO_MEDIAL = ['ग', 'क्क', 'न', 'द', 'त्त', 'र', 'म', 'ब', 'प्प', 'स', 'स्स', '', 'ज', 'ज्ज', 'छ', 'ख', 'थ', 'फ', 'ह'];

const NE_VOWEL_INDEP = [
  'आ', 'ए', 'या', 'ये', 'अ', 'ए', 'य', 'ये',
  'ओ', 'वा', 'वे', 'वे', 'यो', 'उ', 'व', 'वे',
  'वी', 'यु', 'उ', 'उई', 'इ',
];
const NE_VOWEL_MATRA = [
  'ा', 'े', '्या', '्ये', '', 'े', '्य', '्ये',
  'ो', '्वा', '्वे', '्वे', '्यो', 'ु', '्व', '्वे',
  '्वी', '्यु', 'ु', 'ुई', 'ि',
];
const NE_JONG: Record<number, string> = {
  0: '',
  1: 'क',
  4: 'न',
  7: 'त',
  8: 'ल',
  16: 'म',
  17: 'प',
  21: 'ङ',
};

function renderWordNepali(word: string): string {
  const exact = EXACT_OVERRIDES[word];
  if (exact) return exact.ne;

  const seq = applyPhonologyToWord(word);
  let out = '';
  let isFirstHangul = true;

  for (let i = 0; i < seq.length; i++) {
    const item = seq[i];
    if (typeof item === 'string') {
      out += item;
      continue;
    }

    const nxt = i + 1 < seq.length ? seq[i + 1] : null;
    const suppressHomorganicCoda =
      nxt &&
      typeof nxt !== 'string' &&
      ((item.jong === 1 && nxt.cho === 1) ||
        (item.jong === 7 && nxt.cho === 4) ||
        (item.jong === 17 && nxt.cho === 8));
    const coda = suppressHomorganicCoda ? '' : (NE_JONG[item.jong] ?? '');

    if (item.cho === 11) {
      const v = NE_VOWEL_INDEP[item.jung] ?? 'अ';
      out += `${v}${coda}`;
    } else {
      let c = (isFirstHangul ? NE_CHO_WORD_START : NE_CHO_MEDIAL)[item.cho] ?? '';
      if (item.cho === 9 && [2, 6, 12, 16, 17, 20].includes(item.jung)) {
        c = 'श';
      }
      const prev = i > 0 ? seq[i - 1] : null;
      if (item.cho === 5 && prev && typeof prev !== 'string' && prev.jong === 8) {
        c = 'ल';
      }
      const m = NE_VOWEL_MATRA[item.jung] ?? '';
      out += `${c}${m}${coda}`;
    }
    isFirstHangul = false;
  }
  return out || word;
}

function transformSentenceByTokens(textKo: string, fn: (token: string) => string): string {
  if (!textKo) return '';
  const fullOverride = EXACT_OVERRIDES[textKo.trim()];
  if (fullOverride) {
    if (fn === renderWordBengali) return fullOverride.bn;
    if (fn === renderWordNepali) return fullOverride.ne;
    if (fn === renderWordRomanized) return fullOverride.en;
  }

  // Split preserving whitespace and punctuation
  return textKo
    .split(/(\s+|[.,!?~()[\]"'“”‘’/·:-]+)/)
    .map(part => {
      if (!part || /^\s+$/.test(part) || /^[.,!?~()[\]"'“”‘’/·:-]+$/.test(part)) {
        return part;
      }
      return fn(part);
    })
    .join('');
}

export function toBengaliPronunciation(hangul: string): string {
  return transformSentenceByTokens(hangul, renderWordBengali);
}

export function toNepaliPronunciation(hangul: string): string {
  return transformSentenceByTokens(hangul, renderWordNepali);
}

export function toRomanization(hangul: string): string {
  return transformSentenceByTokens(hangul, renderWordRomanized);
}

export function containsHangulChars(str?: string): boolean {
  if (!str) return false;
  return /[\uAC00-\uD7A3\u3131-\u318E]/.test(str);
}

const UR_CHO_INITIAL = ['کھ', 'کّ', 'ن', 'تھ', 'تّ', 'ر', 'م', 'پھ', 'پّ', 'س', 'سّ', 'ا', 'چھ', 'جّ', 'چھ', 'کھ', 'تھ', 'پھ', 'ہ'];
const UR_CHO_MEDIAL = ['گ', 'کّ', 'ن', 'د', 'تّ', 'ر', 'م', 'ب', 'پّ', 'س', 'سّ', '', 'ج', 'جّ', 'چھ', 'کھ', 'تھ', 'پھ', 'ہ'];
const UR_VOWEL = ['ا', 'ے', 'یا', 'یے', 'و', 'ے', 'یو', 'یے', 'و', 'وا', 'وے', 'وے', 'یو', 'و', 'وو', 'وے', 'وی', 'یو', 'ئ', 'وئی', 'ی'];
const UR_JONG: Record<number, string> = { 0: '', 1: 'ک', 4: 'ن', 7: 'ت', 8: 'ل', 16: 'م', 17: 'پ', 21: 'نگ' };

const UR_EXACT_OVERRIDES: Record<string, string> = {
  '안녕하세요': 'آنیونگ ہاسیو (Annyeonghaseyo)',
  '안녕하십니까': 'آنیونگ ہاشِمنِکّا (Annyeonghasimnikka)',
  '감사합니다': 'کھامساہامنیدا (Gamsahamnida)',
  '고맙습니다': 'گوماپسُمنیدا (Gomapseumnida)',
  '죄송합니다': 'چھوئے سونگ ہامنیدا (Joesonghamnida)',
  '미안합니다': 'میان ہامنیدا (Mianhamnida)',
  '괜찮아요': 'کوینچھانایو (Gwaenchanayo)',
  '반갑습니다': 'پھانگاپسُمنیدا (Bangapseumnida)',
  '도와주세요': 'دوواجوسیو (Dowajuseyo)',
  '얼마예요?': 'اولمایے یو؟ (Eolmayeyo?)',
  '한국어': 'ہانگوگو (Hangugeo)',
  '대학교': 'دے ہاکّیو (Daehakgyo)',
};

function renderWordUrdu(word: string): string {
  if (UR_EXACT_OVERRIDES[word]) return UR_EXACT_OVERRIDES[word];
  const seq = applyPhonologyToWord(word);
  let out = '';
  let isFirst = true;
  for (let i = 0; i < seq.length; i++) {
    const item = seq[i];
    if (typeof item === 'string') {
      out += item;
      continue;
    }
    const onset = (isFirst ? UR_CHO_INITIAL : UR_CHO_MEDIAL)[item.cho] ?? '';
    const v = UR_VOWEL[item.jung] ?? 'ا';
    const coda = UR_JONG[item.jong] ?? '';
    out += `${onset}${v}${coda}`;
    isFirst = false;
  }
  const rom = renderWordRomanized(word);
  return out ? `${out} (${rom})` : rom;
}

export function toUrduPronunciation(hangul: string): string {
  if (!hangul) return '';
  if (UR_EXACT_OVERRIDES[hangul.trim()]) return UR_EXACT_OVERRIDES[hangul.trim()];
  return transformSentenceByTokens(hangul, renderWordUrdu);
}

/**
 * Resolves the script-specific Korean pronunciation for the active learning language:
 * - 'bn' -> Bengali script pronunciation
 * - 'ne' -> Nepali Devanagari script pronunciation
 * - 'ur' -> Urdu script + Romanized pronunciation
 * - 'en' -> Revised Romanization (Latin script)
 */
export function getScriptPronunciation(
  korean: string,
  lang: LearningExplanationLang,
  overrides?: {
    pronunciationBn?: string;
    pronunciationNe?: string;
    pronunciationUr?: string;
    romanization?: string;
  }
): string {
  if (lang === 'bn') {
    const cand = overrides?.pronunciationBn?.trim();
    if (cand && !containsHangulChars(cand)) return cand;
    return toBengaliPronunciation(korean);
  }
  if (lang === 'ne') {
    const cand = overrides?.pronunciationNe?.trim();
    if (cand && !containsHangulChars(cand)) return cand;
    return toNepaliPronunciation(korean);
  }
  if (lang === 'ur') {
    const cand = overrides?.pronunciationUr?.trim();
    if (cand && !containsHangulChars(cand)) return cand;
    return toUrduPronunciation(korean);
  }
  const cand = overrides?.romanization?.trim();
  if (cand && !containsHangulChars(cand)) return cand;
  return toRomanization(korean);
}

/**
 * Normalizes a learning language code into one of the nine
 * supported explanation languages ('en' | 'bn' | 'ko' | 'ne' | 'hi' | 'ur' | 'ar' | 'zh' | 'ja').
 */
export function resolveLearningLang(code?: string): LearningExplanationLang {
  if (
    code === 'bn' ||
    code === 'ne' ||
    code === 'ur' ||
    code === 'ko' ||
    code === 'hi' ||
    code === 'ar' ||
    code === 'zh' ||
    code === 'ja'
  ) {
    return code;
  }
  return 'en';
}

/**
 * Automatically detects the student's preferred learning explanation language
 * strictly from the country selected in their registration profile:
 * - Bangladesh -> 'bn' (বাংলা)
 * - Nepal -> 'ne' (नेपाली)
 * - India -> 'hi' (हिन्दी)
 * - Pakistan -> 'ur' (اردو)
 * - Saudi Arabia / UAE / Egypt -> 'ar' (العربية)
 * - China / Taiwan -> 'zh' (中文)
 * - Japan -> 'ja' (日本語)
 * - Korea -> 'ko' (한국어)
 * - All other countries -> 'en' (English)
 */
export function detectCountryLearningLanguage(user?: {
  nationality?: string;
  countryOfResidence?: string;
  currentCountry?: string;
  countryCode?: string;
  generalUserProfile?: { nationality?: string; currentCountry?: string };
  agentPartnerProfile?: { country?: string };
} | null): LearningExplanationLang {
  if (!user) return 'en';
  const candidates = [
    user.nationality,
    user.countryOfResidence,
    user.currentCountry,
    user.generalUserProfile?.nationality,
    user.generalUserProfile?.currentCountry,
    user.agentPartnerProfile?.country,
    user.countryCode,
  ]
    .filter(Boolean)
    .map(s => String(s).trim().toLowerCase());

  for (const val of candidates) {
    if (val === 'bd' || val.includes('bangladesh') || val.includes('বাংলাদেশ') || val.includes('bangladeshi')) {
      return 'bn';
    }
    if (val === 'np' || val.includes('nepal') || val.includes('नेपाल') || val.includes('nepali') || val.includes('nepalese')) {
      return 'ne';
    }
    if (val === 'pk' || val.includes('pakistan') || val.includes('پاکستان') || val.includes('pakistani')) {
      return 'ur';
    }
    if (val === 'in' || val.includes('india') || val.includes('indian') || val.includes('भारत')) {
      return 'hi';
    }
    if (val === 'cn' || val.includes('china') || val.includes('chinese') || val.includes('中国')) {
      return 'zh';
    }
    if (val === 'jp' || val.includes('japan') || val.includes('japanese') || val.includes('日本')) {
      return 'ja';
    }
    if (val === 'sa' || val === 'ae' || val === 'eg' || val.includes('arab')) {
      return 'ar';
    }
  }
  return 'en';
}

export function pickTriLingual(
  lang: LearningExplanationLang,
  values: {
    bn?: string;
    ne?: string;
    ur?: string;
    ko?: string;
    hi?: string;
    ar?: string;
    zh?: string;
    ja?: string;
    en: string;
  }
): string {
  if (lang === 'bn' && values.bn) return values.bn;
  if (lang === 'ne' && values.ne) return values.ne;
  if (lang === 'ur' && values.ur) return values.ur;
  if (lang === 'ko' && values.ko) return values.ko;
  if (lang === 'hi') return values.hi || values.ne || values.en;
  if (lang === 'ar') return values.ar || values.ur || values.en;
  if (lang === 'zh' && values.zh) return values.zh;
  if (lang === 'ja' && values.ja) return values.ja;
  return values.en;
}


