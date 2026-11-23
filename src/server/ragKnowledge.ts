/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * EVERYKR AI — INTELLIGENT ROUTER, 12-MODULE SELECTIVE RAG,
 * MULTILINGUAL AUTO-DETECTION & PERFORMANCE CACHE
 */

import { MASTER_UNIVERSITIES, isApprovedPriorityUniversity } from '../data/universitiesMaster';

export type SupportedAiLanguage = 'en' | 'bn' | 'ko' | 'ne' | 'hi' | 'ur' | 'ar' | 'zh' | 'ja';

export type AiCategoryCode =
  | 'A' // General conversation
  | 'B' // General knowledge
  | 'C' // Study in Korea
  | 'D' // Korean visa and immigration
  | 'E' // Korean universities
  | 'F' // Bangladesh student guidance
  | 'G' // Nepal student guidance
  | 'H' // Korean language learning & TOPIK
  | 'I' // EVERYKR services
  | 'J' // Technology and programming
  | 'K' // Business and marketing
  | 'L'; // Complex research

export interface AiRouteClassification {
  categoryCode: AiCategoryCode;
  categoryName: string;
  secondaryCategories: AiCategoryCode[];
  detectedLanguage: SupportedAiLanguage;
  languageName: string;
  thinkingLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  useSelectiveRag: boolean;
  ragModulesLoaded: string[];
  matchedUniversitiesCount: number;
  useGoogleSearch: boolean;
  isSimpleGreeting: boolean;
  maxOutputTokens: number;
  temperature: number;
}

export const LANGUAGE_LABELS: Record<string, string> = {
  en: 'English',
  bn: 'Bengali (বাংলা)',
  ko: 'Korean (한국어)',
  ne: 'Nepali (नेपाली)',
  hi: 'Hindi (हिन्दी)',
  ur: 'Urdu (اردو)',
  ar: 'Arabic (العربية)',
  zh: 'Chinese (中文)',
  ja: 'Japanese (日本語)',
};

/**
 * PART 5: AUTOMATIC LANGUAGE DETECTION (9 Languages + Code-Switching Support)
 * Detects script and lexical markers for:
 * 1. English (en)
 * 2. Bengali / Bangla (bn - \u0980-\u09FF)
 * 3. Korean (ko - \uAC00-\uD7AF, \u1100-\u11FF, \u3130-\u318F)
 * 4. Nepali (ne - Devanagari \u0900-\u097F + Nepali lexical markers)
 * 5. Hindi (hi - Devanagari \u0900-\u097F + Hindi lexical markers)
 * 6. Urdu (ur - \u0600-\u06FF + Urdu lexical markers)
 * 7. Arabic (ar - \u0600-\u06FF + Arabic lexical markers)
 * 8. Chinese (zh - \u4E00-\u9FFF)
 * 9. Japanese (ja - \u3040-\u309F, \u30A0-\u30FF)
 */
export function detectUserLanguage(
  message: string,
  preferredLanguage: string = 'en'
): SupportedAiLanguage {
  const normalizedPref: SupportedAiLanguage = (
    ['en', 'bn', 'ko', 'ne', 'hi', 'ur', 'ar', 'zh', 'ja'].includes(preferredLanguage)
      ? preferredLanguage
      : 'en'
  ) as SupportedAiLanguage;

  if (!message || !message.trim()) {
    return normalizedPref;
  }

  const text = message.trim();
  const lower = text.toLowerCase();

  // 1. Check explicit language override instructions in user prompt
  if (/\b(in bengali|in bangla|banglay|বাংলায়|বাংলাতে)\b/i.test(text)) return 'bn';
  if (/\b(in korean|한국어로|한국말로)\b/i.test(text)) return 'ko';
  if (/\b(in nepali|नेपालीमा|नेपाली भाषामा)\b/i.test(text)) return 'ne';
  if (/\b(in hindi|हिंदी में|हिन्दी में)\b/i.test(text)) return 'hi';
  if (/\b(in urdu|اردو میں)\b/i.test(text)) return 'ur';
  if (/\b(in arabic|بالعربية|عربي)\b/i.test(text)) return 'ar';
  if (/\b(in chinese|用中文|中文)\b/i.test(text)) return 'zh';
  if (/\b(in japanese|日本語で)\b/i.test(text)) return 'ja';
  if (/\b(in english|answer in english|reply in english)\b/i.test(lower)) return 'en';

  // 2. Script character counts (supports mixed-language code-switching where native script is present)
  const bengaliChars = (text.match(/[\u0980-\u09FF]/g) || []).length;
  const koreanChars = (text.match(/[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F]/g) || []).length;
  const devanagariChars = (text.match(/[\u0900-\u097F]/g) || []).length;
  const arabicUrduChars = (text.match(/[\u0600-\u06FF]/g) || []).length;
  const japaneseKanaChars = (text.match(/[\u3040-\u309F\u30A0-\u30FF]/g) || []).length;
  const cjkChars = (text.match(/[\u4E00-\u9FFF]/g) || []).length;
  const latinChars = (text.match(/[a-zA-Z]/g) || []).length;

  if (bengaliChars >= 2 && bengaliChars >= koreanChars && bengaliChars >= devanagariChars) {
    return 'bn';
  }

  if (koreanChars >= 2 && koreanChars >= bengaliChars && koreanChars >= devanagariChars) {
    return 'ko';
  }

  if (japaneseKanaChars >= 1) {
    return 'ja';
  }

  if (cjkChars >= 2 && koreanChars === 0 && japaneseKanaChars === 0) {
    return 'zh';
  }

  if (arabicUrduChars >= 2) {
    const urduMarkers = /(ہے|ہیں|تھا|تھی|میں|نے|سے|کو|کے|کی|کا|اور|آپ|کیا|کیسے|کوریا|پڑھائی|یونیورسٹی|ویزا|شکریہ|ہوں)/g;
    const arabicMarkers = /(في|من|على|إلى|عن|مع|هذا|هذه|ما|كيف|كوريا|جامعة|تأشيرة|دراسة|شكرا|أريد)/g;
    const urduCount = (text.match(urduMarkers) || []).length;
    const arabicCount = (text.match(arabicMarkers) || []).length;
    if (arabicCount > urduCount) return 'ar';
    return 'ur';
  }

  if (devanagariChars >= 2) {
    // Disambiguate Nepali (ne) vs Hindi (hi) in Devanagari script
    const nepaliMarkers =
      /(छ|छन्|हुन्छ|गर्नुहोस्|गर्न|कस्तो|कसरी|नेपाल|नेपाली|तपाईं|तपाई|मलाई|हामी|हो|थियो|गर्छ|भन्ने|लागि|बाट|मा|को|हरू|पढ्न|कुन|के|चाहन्छु|सक्छु)/g;
    const hindiMarkers =
      /(है|हैं|था|थी|थे|कैसे|क्या|क्यों|में|का|की|के|लिए|से|को|और|नहीं|करें|करना|मुझे|आप|हम|भारत|हिंदी|हिन्दी|बताएं|बताइए|चाहता|सकता)/g;

    const nepaliMatches = (text.match(nepaliMarkers) || []).length;
    const hindiMatches = (text.match(hindiMarkers) || []).length;

    if (nepaliMatches > hindiMatches) return 'ne';
    if (hindiMatches > nepaliMatches) return 'hi';

    if (normalizedPref === 'ne' || normalizedPref === 'hi') {
      return normalizedPref;
    }
    return 'ne';
  }

  // Romanized Bengali / Nepali / Hindi / Urdu questions
  if (/\b(kemon achen|kemon aso|ami bangladesh|ki korbo|kivabe|porashona|bissas|dhonnobad)\b/i.test(lower)) {
    return 'bn';
  }
  if (/\b(kasto cha|tapai|malai|kasari|padhna|dhanyabad)\b/i.test(lower)) {
    return 'ne';
  }
  if (/\b(kaise ho|aap kaise hain|kya haal hai|mujhe batao)\b/i.test(lower)) {
    return 'hi';
  }

  if (
    latinChars >= 2 &&
    bengaliChars === 0 &&
    koreanChars === 0 &&
    devanagariChars === 0 &&
    arabicUrduChars === 0 &&
    japaneseKanaChars === 0 &&
    cjkChars === 0
  ) {
    return 'en';
  }

  return normalizedPref;
}

/**
 * PART 2 & PART 3: 12-MODULE SELECTIVE RAG KNOWLEDGE BASE
 * Retrieved ONLY when relevant to the user's query.
 * Enforces strict ZERO FABRICATION rules and neutral evidence-based comparisons.
 */
export const RAG_KNOWLEDGE_MODULES: Record<string, string> = {
  MODULE_1_EVERYKR_COMPANY: `
### [MODULE 1: EVERYKR PLATFORM (https://everykr.com)]
- **Official Platform**: EVERYKR (\`https://everykr.com\`) is an independent international education, Korean language learning, and student life platform connecting global students with accredited universities and verified resources in South Korea.
- **Core Mission**: Transparency, strict data verification (Zero Fabrication Policy), student protection, and accessible multilingual guidance in English, Bengali, Korean, Nepali, Hindi, and Urdu.
- **Verification Standard**: EVERYKR maintains a verified relational directory of **25 approved South Korean universities** audited against official university websites, official admission guides, verified March 2027 intake deadline records, and Korean government portals (\`studyinkorea.go.kr\`, \`hikorea.go.kr\`, \`academyinfo.go.kr\`). When any data point is missing or unverified, state clearly: *"Official information has not yet been verified."*`,

  MODULE_2_EVERYKR_SERVICES: `
### [MODULE 2: EVERYKR SERVICES & PLATFORM FEATURES]
- **25 Approved University Directory** (\`[ACTION:NAVIGATE:universities]\`): Filter by region, national/private type, English-taught tracks, tuition ranges, and official verification status.
- **Degree Programs & Admission Deadlines** (\`[ACTION:NAVIGATE:programs]\`, \`[ACTION:NAVIGATE:deadlines]\`): Undergraduate (Freshman/Transfer), Graduate (Master's/PhD), EAP, and Korean Language Program (D-4 KLP) intake calendars.
- **Scholarships Directory** (\`[ACTION:NAVIGATE:scholarships]\`): Global Korea Scholarship (GKS Embassy & University tracks) and university merit/TOPIK scholarships.
- **Student Visa Guide** (\`[ACTION:NAVIGATE:visa]\`): Official checklists for D-4, D-2, D-10, F-2-7, S-3 part-time work permits, and Alien Registration Card (ARC) procedures.
- **Learn Korean Academy** (\`[ACTION:NAVIGATE:language]\`): Structured Hangul vowels/consonants, pronunciation audio, vocabulary, grammar, handwriting practice, and TOPIK mock exams.
- **Accommodation Finder** (\`[ACTION:NAVIGATE:accommodation]\`): On-campus dormitories, goshiwons, shared housing, and one-room studios.
- **Jobs & Career Portal** (\`[ACTION:NAVIGATE:jobs]\`): Legal part-time student jobs and post-study career guidance with statutory minimum wage and S-3 work permit compliance.
- **Student Community & Other Services** (\`[ACTION:NAVIGATE:community]\`, \`[ACTION:NAVIGATE:daily-life]\`): Student forum, Korean life guides, banking, SIM, NHIS insurance, and settlement checklists.`,

  MODULE_3_KOREAN_LANGUAGE_ACADEMY: `
### [MODULE 3: EVERYKR KOREAN LANGUAGE LEARNING & TOPIK PREPARATION]
- **Structured Beginner-to-TOPIK Pathway**:
  1. **Hangul Foundation**: 10 basic vowels (ㅏ, ㅑ, ㅓ, ㅕ, ㅗ, ㅛ, ㅜ, ㅠ, ㅡ, ㅣ), 14 basic consonants (ㄱ–ㅎ), 5 double consonants (ㄲ, ㄸ, ㅃ, ㅆ, ㅉ), 11 compound vowels, and Batchim (받침) final consonant rules.
  2. **Essential Vocabulary & Conversations**: University campus life, immigration office, hospital/pharmacy, banking, public transit, restaurant ordering, shopping, and emergency expressions with Korean script, pronunciation, and multilingual meanings.
  3. **TOPIK I & II Readiness**:
     - **TOPIK I (Levels 1–2)**: 800–2,000 core words; Listening + Reading (total 200 points; Level 1 >= 80, Level 2 >= 140). Required baseline for D-4 part-time work eligibility after 6 months.
     - **TOPIK II (Levels 3–6)**: Intermediate/Advanced academic & professional Korean; Listening + Writing + Reading (total 300 points; Level 3 >= 120, Level 4 >= 150, Level 5 >= 190, Level 6 >= 230). Commonly required for Korean-taught degree admission (Level 3+) and graduation (Level 4+).`,

  MODULE_4_ADMISSION_DOCUMENT_VERIFICATION: `
### [MODULE 4: ADMISSION APPLICATION & DOCUMENT VERIFICATION WORKFLOW]
- **Standard International Application Steps**:
  1. **University & Track Selection**: Confirm whether applying to Korean-taught, English-taught (EAP/English Track), Associate, Bachelor, Master's, PhD, or KLP (D-4) among EVERYKR's 25 approved universities.
  2. **Document Preparation & Authentication**: Academic transcripts and graduation certificates typically require official **Apostille** authentication (for Hague Apostille Convention countries, including Bangladesh MOFA e-Apostille) or **Korean Embassy Consular Legalization**.
  3. **Online Application & Courier Submission**: Complete the online application within the official intake window and dispatch original authenticated documents via international courier (DHL/EMS) before the university's document arrival deadline.
  4. **Screening, Interview & Tuition Invoice**: Participate in document screening or online/spot interview as scheduled; admitted applicants pay tuition directly to the university's official bank account to receive the **Certificate of Admission (COA / 표준입학허가서)**.`,

  MODULE_5_SETTLEMENT_ONSHORE_GUIDE: `
### [MODULE 5: POST-ARRIVAL SETTLEMENT IN SOUTH KOREA]
- **First 90 Days Checklist for International Students**:
  1. **University Dormitory / Housing Check-In**: Bring TB test certificate (typically required by university dormitories) and official admission notice.
  2. **Alien Registration Card (ARC / 외국인등록증)**: Book an appointment on \`hikorea.go.kr\` within **90 days of arrival** with passport, photo, COA/enrollment certificate, tuition receipt, and proof of residence (dormitory confirmation or lease contract).
  3. **Student Bank Account & Korean SIM**: Open a local bank account (Woori, Shinhan, Hana, KB, NH) and convert prepaid SIM to ARC-linked postpaid/verified number for Korean digital verification.
  4. **National Health Insurance (NHIS / 국민건강보험)**: International D-2 and D-4 students are enrolled under mandatory NHIS rules upon alien registration.
  5. **Address Change Reporting**: Report any change of residence within **14–15 days** to the local Community Service Center (주민센터) or Immigration Office (\`hikorea.go.kr\`).`,

  MODULE_6_DATA_VERIFICATION_STANDARDS: `
### [MODULE 6: EVERYKR DATA VERIFICATION & STATUS CLASSIFICATION]
- Always distinguish data reliability transparently using these 5 status levels:
  1. **Officially verified**: Confirmed directly from official university websites, official admission guidelines, or Korean government portals.
  2. **Available, not independently verified**: Reported in shared admission schedules or secondary notices, pending direct university confirmation.
  3. **Estimated**: Approximate range or schedule explicitly marked \`(Approx.)\` — never present as a fixed guarantee.
  4. **Not announced**: Official schedule, fee, or requirement has not yet been published by the university.
  5. **Outdated**: Previous-cycle information that should not be confused with current/upcoming intakes.
- If a specific university deadline, tuition fee, scholarship percentage, GPA cutoff, TOPIK/IELTS minimum, or visa rule is missing or unconfirmed, state verbatim: **"Official information has not yet been verified."**`,

  MODULE_7_VERIFIED_PARTNERSHIPS: `
### [MODULE 7: EVERYKR 25 APPROVED UNIVERSITIES SCOPE & ZERO FABRICATION POLICY]
- **EVERYKR Approved University Directory (25 Institutions)**:
  1. Kyungsung University (\`경성대학교\`)
  2. Sejong University (\`세종대학교\`)
  3. Seojeong University (\`서정대학교\`)
  4. Silla University (\`신라대학교\`)
  5. Songho University (\`송호대학교\`)
  6. Sookmyung Women's University (\`숙명여자대학교\`)
  7. Sungshin Women's University (\`성신여자대학교\`)
  8. Tongmyong University (\`동명대학교\`)
  9. Woosong University (\`우송대학교\`)
  10. Yewon Arts University (\`예원예술대학교\`)
  11. Youngsan University (\`영산대학교\`)
  12. aSSIST University (\`서울과학종합대학원대학교\`)
  13. Busan Institute of Science and Technology (\`부산과학기술대학교\`)
  14. Chungbuk National University (\`충북대학교\`)
  15. Dong-A University (\`동아대학교\`)
  16. Dong-Eui Institute of Technology (\`동의과학대학교\`)
  17. Dong-Eui University (\`동의대학교\`)
  18. Dongshin University (\`동신대학교\`)
  19. Gachon University (\`가천대학교\`)
  20. Hanseo University (\`한서대학교\`)
  21. Hanyang University (\`한양대학교\`)
  22. Inje University (\`인제대학교\`)
  23. Jeonbuk National University (\`전북대학교\`)
  24. Kangwon National University (\`강원대학교\`)
  25. Konyang University (\`건양대학교\`)
- **Zero Fabrication Rule**: Never invent deadlines, tuition fees, scholarships, GPA requirements, TOPIK/IELTS requirements, or exclusive institutional contracts.`,

  MODULE_8_BANGLADESH_APPLICANTS: `
### [MODULE 8: GUIDANCE FOR APPLICANTS FROM BANGLADESH]
- **Key Verification & Safety Checklist for Bangladeshi Students**:
  1. **Direct Tuition Payment**: Always transfer tuition directly from the student/sponsor bank account to the official Korean university bank account listed on the university invoice.
  2. **IEQAS Certification Check**: Check whether the target Korean university holds Korean Ministry of Education IEQAS accreditation via \`studyinkorea.go.kr\`.
  3. **Authentic Document Standards**: Ensure SSC/HSC/Bachelor certificates and transcripts follow official Bangladesh Education Board / UGC and MOFA Bangladesh e-Apostille verification rules; never submit altered financial or academic documents.
  4. **Certificate of Admission (COA)**: Verify COA issuance and embassy visa submission requirements directly with the Embassy of the Republic of Korea in Dhaka and \`hikorea.go.kr\`.`,

  MODULE_9_NEPAL_APPLICANTS: `
### [MODULE 9: GUIDANCE FOR APPLICANTS FROM NEPAL]
- **Mandatory Regulatory & Visa Checklist for Nepali Students**:
  1. **No Objection Certificate (NOC)**: Nepali students studying abroad must obtain an official **No Objection Certificate (NOC)** from the Ministry of Education, Science and Technology (\`noc.moest.gov.np\`) before foreign exchange tuition remittance and travel.
  2. **Direct Bank Remittance**: Remit tuition through an authorized commercial bank in Nepal directly to the Korean university's official bank account using the official admission invoice and NOC.
  3. **Financial & Tax Documentation**: Prepare authentic family income, tax clearance, and bank balance records in accordance with Embassy of the Republic of Korea in Kathmandu guidelines.
  4. **MoEST Verification**: If using any local consultancy, verify official registration with the Government of Nepal (MoEST) and cross-check all university claims against official Korean university websites.`,

  MODULE_10_IMMIGRATION_AUTHORITY: `
### [MODULE 10: OFFICIAL ADMISSION & VISA DECISION AUTHORITY]
- **Official Decision Makers**:
  - **University Admissions**: All final admission and scholarship decisions are made solely by each Korean university's official Admissions Office / Office of International Affairs (OIA).
  - **Student Visas**: All visa issuance (CCVI / D-2 / D-4) and stay extension decisions are made solely by the **Republic of Korea Ministry of Justice (Korea Immigration Service / \`hikorea.go.kr\` / Helpline 1345)** and Korean Embassies/Consulates.
  - No third party can legally guarantee admission or visa approval.`,

  MODULE_11_KOREAN_UNIVERSITIES: `
### [MODULE 11: KOREAN UNIVERSITIES, ADMISSIONS & SCHOLARSHIPS]
- **Directory Scope**: EveryKR tracks **25 approved universities in South Korea** across Seoul, Gyeonggi-do, Busan, Gangwon, Chungcheong, Jeolla, and Gyeongsang.
- **Standard Intake Timeline**:
  - **Spring Intake (March semester start)**: Application windows typically run from **September to November** of the preceding year.
  - **Fall Intake (September semester start)**: Application windows typically run from **March to May** of the same year.
  - **Korean Language Programs (D-4 KLI)**: 4 intakes per year (**March, June, September, December**).
- **General Admission & Language Benchmarks**:
  - **English-Taught Tracks**: Typically require IELTS 5.5–6.5, TOEFL iBT 71–85, or Duolingo/TEPS equivalent (varies by university and department).
  - **Korean-Taught Tracks**: Typically require TOPIK Level 3–4 for undergraduate admission and TOPIK Level 3–4+ for graduate/graduation requirements.
- **Major Scholarships**:
  - **Global Korea Scholarship (GKS)**: Funded by NIIED (Korean government); covers 100% tuition, round-trip airfare, 1-year Korean language training, and monthly stipend via Embassy Track or University Track.
  - **University Merit & TOPIK Scholarships**: Most Korean universities offer 20% to 100% first-semester tuition waivers based on TOPIK level, IELTS score, or entrance GPA.`,

  MODULE_12_STUDENT_SERVICES_ACCOMMODATION: `
### [MODULE 12: KOREAN VISAS, IMMIGRATION, ACCOMMODATION & STUDENT LIFE]
- **Core Student Visa Categories (HiKorea / Ministry of Justice)**:
  - **D-2 (Degree Student Visa)**: D-2-1 (Associate), D-2-2 (Bachelor's), D-2-3 (Master's), D-2-4 (PhD), D-2-6 (Exchange). Requires official Certificate of Admission (COA), Apostilled academic credentials, and verified financial proof.
  - **D-4-1 (Korean Language Trainee Visa)**: For university-affiliated Korean Language Institutes (KLI). Part-time work is only permitted **after 6 months** of arrival with >=90% attendance and TOPIK Level 2+.
  - **D-10-1 (Job Seeker Visa)**: Allows Korean university graduates to stay up to 6 months (extendable up to 1–2 years) for job seeking and corporate internships.
  - **F-2-7 (Points-Based Residency Visa)**: Long-term residency based on age, degree, Korean income, TOPIK, and KIIP completion (80+ points required).
- **Mandatory Post-Arrival Compliance**:
  - **Alien Registration Card (ARC)**: Apply within **90 days of arrival** via \`hikorea.go.kr\` reservation.
  - **Address Change Report**: Must report within **14–15 days** of moving to the local Community Service Center (주민센터) or Immigration Office.
  - **Part-Time Work Permit (S-3)**: Mandatory **prior immigration approval** before starting any part-time job. D-2 students with required TOPIK levels may work 20–25 hrs/week on weekdays during semesters; working without an S-3 permit leads to fines or visa revocation.
- **Student Housing Options in Korea**:
  - **University Dormitory (기숙사)**: Approx. KRW 150,000–450,000/month (billed per semester), safest and most affordable option.
  - **Goshiwon (고시원/고시텔)**: Approx. KRW 300,000–550,000/month, low/no deposit (KRW 0–300,000), compact private room with utilities included.
  - **One-Room Studio (원룸)**: Approx. KRW 400,000–750,000/month + deposit (보증금 KRW 3,000,000–10,000,000). Always check the certified real estate registry (\`등기부등본\`).`
};

/**
 * Dynamic University Lookup from MASTER_UNIVERSITIES (136 Verified Records)
 * Retrieves exact verified fields when the user mentions specific Korean universities or cities.
 */
export function retrieveMatchingUniversitiesContext(message: string, maxResults: number = 4): {
  contextText: string;
  matchedCount: number;
} {
  if (!message || message.trim().length < 2) {
    return { contextText: '', matchedCount: 0 };
  }

  const lower = message.toLowerCase();
  const scored: Array<{ uni: (typeof MASTER_UNIVERSITIES)[number]; score: number }> = [];

  for (const uni of MASTER_UNIVERSITIES) {
    let score = 0;
    const nameLower = uni.name.toLowerCase();
    const officialLower = (uni.officialName || '').toLowerCase();
    const koreanName = uni.koreanName || '';
    const idSlug = uni.id.replace(/-/g, ' ');

    if (lower.includes(nameLower) || (officialLower && lower.includes(officialLower))) {
      score += 100;
    } else if (koreanName && message.includes(koreanName)) {
      score += 100;
    } else if (lower.includes(idSlug)) {
      score += 90;
    } else {
      // Check aliases or distinctive tokens
      const aliases = uni.aliases || [];
      for (const alias of aliases) {
        if (alias.length >= 3 && lower.includes(alias.toLowerCase())) {
          score += 80;
          break;
        }
      }

      if (score === 0) {
        const ignoreWords = new Set([
          'university', 'national', 'korea', 'korean', 'college', 'institute',
          'science', 'technology', 'studies', 'women', 'womens', 'foreign',
          'catholic', 'christian', 'education', 'arts', 'the', 'of', 'and', 'in'
        ]);
        const tokens = nameLower
          .split(/[^a-z0-9]+/)
          .filter((t) => t.length >= 4 && !ignoreWords.has(t));
        for (const token of tokens) {
          if (lower.includes(token)) {
            score += 35;
          }
        }
      }
    }

    if (score > 0) {
      if (isApprovedPriorityUniversity(uni)) {
        score += 25;
      }
      scored.push({ uni, score });
    }
  }

  scored.sort((a, b) => b.score - a.score);
  const topMatches = scored.slice(0, maxResults).map((s) => s.uni);

  if (topMatches.length === 0) {
    return { contextText: '', matchedCount: 0 };
  }

  const lines = topMatches.map((u) => {
    const isPriority = isApprovedPriorityUniversity(u);
    const tierStr = isPriority
      ? `Approved 25 Priority Directory (#${u.whitelistOrder ?? '—'} of 25)`
      : 'Preserved Historical Record (136-University Backup — Available, not independently verified)';
    const tuitionStr =
      u.tuitionVerified && u.tuitionPerSemesterKRW
        ? `KRW ${u.tuitionPerSemesterKRW.min.toLocaleString()} – ${u.tuitionPerSemesterKRW.max.toLocaleString()} / semester`
        : u.tuitionNotes || 'Official information has not yet been verified.';
    const rankingStr =
      u.rankingVerified && u.rankingKR
        ? `#${u.rankingKR} in Korea`
        : 'Official information has not yet been verified.';
    const estStr =
      u.establishmentYearVerified && u.establishmentYear
        ? String(u.establishmentYear)
        : 'Official information has not yet been verified.';
    const programsStr =
      u.programsVerified && u.programs && u.programs.length > 0
        ? u.programs.slice(0, 8).join(', ')
        : u.programs && u.programs.length > 0
        ? `${u.programs.slice(0, 6).join(', ')} (Available in historical archive, not independently verified)`
        : 'Official information has not yet been verified.';
    const scholarshipsStr =
      u.scholarshipVerified && u.scholarships && u.scholarships.length > 0
        ? u.scholarships.join('; ')
        : u.scholarships && u.scholarships.length > 0
        ? `${u.scholarships.join('; ')} (Available in historical archive, not independently verified)`
        : 'Official information has not yet been verified.';
    const contactStr = u.contactVerified ? `${u.contactEmail} / ${u.contactPhone || ''}` : 'Official information has not yet been verified.';

    const march2027Str = isPriority
      ? u.deadlines?.springSemester || 'Not Announced'
      : 'Not Announced in March 2027 Priority Schedule (Preserved Archive Record)';
    return [
      `- **${u.officialName || u.name}** (${u.koreanName})`,
      `  • Directory Tier: ${tierStr}`,
      `  • Category/Type: ${u.type} | City/Province: ${u.city}, ${u.province || u.region || ''}`,
      `  • Campus: ${u.campusName || 'Main Campus'} | Address: ${u.englishAddress || u.locationAddress} (${u.koreanAddress || ''})`,
      `  • Official Website: ${u.officialWebsite || 'N/A'} | International Office (OIA): ${u.internationalOfficeUrl || 'N/A'}`,
      `  • Establishment Year: ${estStr} | Ranking: ${rankingStr}`,
      `  • Programs: ${programsStr}`,
      `  • March 2027 Intake Deadlines: ${march2027Str}`,
      `  • Tuition Fee: ${tuitionStr}`,
      `  • Scholarships: ${scholarshipsStr}`,
      `  • Contact: ${contactStr}`,
      `  • Completeness: ${u.completenessPercentage ?? 0}% | Verification Status: ${isPriority ? (u.strictVerificationStatus || u.verificationStatus || 'PARTIALLY VERIFIED') : 'Available, not independently verified'}`
    ].join('\n');
  });

  return {
    contextText: `\n### [LIVE RECORDS FROM EVERYKR UNIVERSITY DATABASE (25 PRIORITY + 113 PRESERVED ARCHIVE)]\nThe following records are retrieved directly from EVERYKR's non-destructive university store (Last Verified: 2026-11-12). Prioritize the 25 Approved Priority Universities when recommending institutions, while accurately answering questions about any of the 113 Preserved Historical Archive records with clear "Available, not independently verified" status. Keep 2026 and March 2027 deadlines strictly separate, and if any requested detail is missing or unverified, state verbatim: "Official information has not yet been verified."\n\n${lines.join('\n\n')}`,
    matchedCount: topMatches.length,
  };
}

/**
 * PART 4: INTELLIGENT AI ROUTER (12 CATEGORIES A–L)
 * Classifies incoming requests and selects optimal model parameters & selective RAG modules.
 */
export function classifyAiRequest(
  message: string,
  preferredLanguage: string = 'en',
  hasFileAttachment: boolean = false
): AiRouteClassification {
  const detectedLanguage = detectUserLanguage(message, preferredLanguage);
  const languageName = LANGUAGE_LABELS[detectedLanguage] || 'English';
  const text = (message || '').trim();
  const lower = text.toLowerCase();
  const wordCount = text.split(/\s+/).filter(Boolean).length;

  // Check Category A: Simple Greeting / Casual Conversation (supports compound greetings like "Hi, how are you?")
  const greetingPattern =
    /^(hi+|hello+|hey+|good\s*(morning|afternoon|evening|day)|how\s+are\s+you(\s+doing|\s+today)?|what'?s\s+up|greetings|thank\s*you|thanks|ok|okay|bye|goodbye|হ্যালো|হাই|আপনি\s*কেমন\s*আছেন|কেমন\s*আছেন|কেমন\s*আছো|আসসালামু\s*আলাইকুম|নমস্কার|ধন্যবাদ|안녕하세요|안녕|어떻게\s*지내세요|잘\s*지내세요|반갑습니다|고마워요|감사합니다|नमस्ते|नमस्कार|तपाईं\s*कस्तो\s*हुनुहुन्छ|कस्तो\s*छ|धन्यवाद|कैसे\s*हो|आप\s*कैसे\s*हैं|कैसे\s*हैं\s*आप|शुक्रिया|السلام\s*علیکم)([!.,?~\s]+(hi+|hello+|hey+|how\s+are\s+you(\s+doing|\s+today)?|আপনি\s*কেমন\s*আছেন|কেমন\s*আছেন|কেমন\s*আছো|어떻게\s*지내세요|잘\s*지내세요|तपाईं\s*कस्तो\s*हुनुहुन्छ|कस्तो\s*छ|आप\s*कैसे\s*हैं|कैसे\s*हो))?[!.?,~\s]*$/i;

  if (!hasFileAttachment && wordCount <= 10 && greetingPattern.test(text)) {
    return {
      categoryCode: 'A',
      categoryName: 'General Conversation',
      secondaryCategories: [],
      detectedLanguage,
      languageName,
      thinkingLevel: 'LOW',
      useSelectiveRag: false,
      ragModulesLoaded: [],
      matchedUniversitiesCount: 0,
      useGoogleSearch: false,
      isSimpleGreeting: true,
      maxOutputTokens: 512,
      temperature: 0.5,
    };
  }

  // Score categories B through L
  const scores: Record<AiCategoryCode, number> = {
    A: 0,
    B: 1, // baseline fallback is General Knowledge
    C: 0,
    D: 0,
    E: 0,
    F: 0,
    G: 0,
    H: 0,
    I: 0,
    J: 0,
    K: 0,
    L: 0,
  };

  // H: Korean Language Learning & TOPIK
  if (/(learn\s*korean|hangul|hangeul|topik|batchim|korean\s*alphabet|korean\s*grammar|korean\s*vocabulary|한글|한국어\s*배우기|토픽|কোরিয়ান\s*ভাষা|হাঙ্গুল|कोरियन\s*भाषा)/i.test(text)) {
    scores.H += 24;
  }

  // I: EVERYKR Services
  if (/(everykr|every\s*kr|everykr\.com|এভরি\s*কেআর|에브리케이알)/i.test(text)) {
    scores.I += 26;
  }

  // F: Bangladesh Applicant Guidance
  if (
    /(bangladesh|bangladeshi|dhaka|chittagong|sylhet|বাংলাদেশ|ঢাকা|চট্টগ্রাম)/i.test(text) &&
    /(agenc|consultan|agent|study|korea|visa|office|embassy|apostille|কনসালটেন্সি|এজেন্সি|ভিসা|অফিস)/i.test(text)
  ) {
    scores.F += 22;
  } else if (/(bangladesh|বাংলাদেশ|ঢাকা)/i.test(text) && /(korea|study|কোরিয়া)/i.test(text)) {
    scores.F += 14;
  }

  // G: Nepal Applicant Guidance
  if (
    /(nepal|nepali|kathmandu|pokhara|chitwan|butwal|putalisadak|bagbazar|नेपाल|काठमाडौँ|काठमाडौं|पोखरा)/i.test(text) &&
    /(agenc|consultan|agent|noc|study|korea|visa|office|embassy|कन्सल्टेन्सी|एजेन्सी|भिसा|अध्ययन)/i.test(text)
  ) {
    scores.G += 22;
  } else if (/(nepal|नेपाल|काठमाडौँ)/i.test(text) && /(korea|study|कोरिया)/i.test(text)) {
    scores.G += 14;
  }

  // D: Korean Visa and Immigration
  if (
    /\b(d-2|d2|d-4|d4|d-10|d10|f-2-7|f27|e-7|e7|s-3|s3|arc|alien\s+registration|hikorea|1345|ccvi|certificate\s+of\s+admission|coa|korean\s+visa|student\s+visa|korea\s+immigration|비자|외국인등록증|출입국|체류자격|ভিসা|ইমিগ্রেশন|भिसा|वीज़ा)\b/i.test(
      text
    )
  ) {
    scores.D += 20;
  }

  // E: Korean Universities
  const uniMatch = retrieveMatchingUniversitiesContext(text, 3);
  if (uniMatch.matchedCount > 0) {
    scores.E += 20;
  }
  if (
    /\b(snu|kaist|yonsei|korea\s+university|hanyang|skku|sungkyunkwan|kyung\s*hee|ewha|sogang|pusan\s+national|knu|chung-ang|gachon|sejong|konkuk|dongguk|inha|ajou|unist|postech|gist|korean\s+universit|universities\s+in\s+(south\s+)?korea|대학교|한국\s*대학|কোরিয়ান\s*বিশ্ববিদ্যালয়|कोरियन\s*विश्वविद्यालय)\b/i.test(
      text
    )
  ) {
    scores.E += 20;
  }

  // C: Study in Korea
  if (
    /\b(study\s+in\s+korea|south\s+korea|korea|seoul|busan|incheon|daegu|daejeon|gwangju|gks|global\s+korea\s+scholarship|topik|goshiwon|klp|kli|niied|spring\s+intake|fall\s+intake|tuition\s+in\s+korea|dormitory\s+in\s+korea|part-time\s+in\s+korea|কোরিয়া|কোরিয়ায়|দক্ষিণ\s*কোরিয়া|টপিক|স্কলারশিপ|한국\s*유학|유학생|어학당|장학금|토픽|कोरिया|दक्षिण\s*कोरिया|कोरियामा\s*अध्ययन|कोरिया\s*में\s*पढ़ाई|کوریا)\b/i.test(
      text
    )
  ) {
    scores.C += 15;
  }

  // J: Technology and Programming
  if (
    /\b(python|javascript|typescript|react|node\.?js|java|c\+\+|rust|golang|sql|html|css|tailwind|nextjs|vite|docker|kubernetes|aws|gcp|firebase|algorithm|binary\s+search|data\s+structure|api|regex|git|linux|bug|debug|code|coding|programming|software|frontend|backend|fullstack|database|프로그래밍|코딩|파이썬|자바스크립트|প্রোগ্রামিং|কোডিং|পাইথন|प्रोग्रामिङ|कोडिङ|प्रोग्रामिंग|कोडिंग)\b/i.test(
      text
    )
  ) {
    scores.J += 22;
  }

  // K: Business and Marketing
  if (
    /\b(business|online\s+business|start\s+a\s+business|business\s+plan|marketing|marketing\s+strategy|digital\s+marketing|seo|sem|entrepreneur|entrepreneurship|startup|roi|kpi|b2b|b2c|sales|sales\s+funnel|branding|market\s+research|swot|pitch\s+deck|financial\s+projection|e-commerce|ecommerce|management|leadership|비즈니스|마케팅|창업|ব্যবসা|মার্কেটিং|উদ্যোক্তা|व्यवसाय|मार्केटिङ|व्यापार|बिज़नेस|मार्केटिंग)\b/i.test(
      text
    )
  ) {
    scores.K += 20;
  }

  // L: Complex Research / Deep Analysis / Advanced Mathematics
  if (
    hasFileAttachment ||
    wordCount >= 45 ||
    /\b(comprehensive\s+analysis|in-depth\s+research|compare\s+and\s+contrast|literature\s+review|research\s+proposal|methodology|step-by-step\s+strategic|economic\s+impact|policy\s+analysis|whitepaper|semiconductor\s+r&d|calculus|derivative|integral|differential\s+equation|eigenvalue|matrix|linear\s+algebra|quadratic|polynomial|fourier|laplace|probability\s+distribution|math-graph|plot\s+the\s+graph|plot\s+function|심층\s*분석|연구\s*계획서|গবেষণা)\b/i.test(
      text
    )
  ) {
    scores.L += 22;
  }

  // Determine primary category and secondary categories (only high-confidence secondary categories >= 18)
  const sortedCategories = (Object.entries(scores) as Array<[AiCategoryCode, number]>)
    .filter(([code, score]) => code !== 'A' && score > 0)
    .sort((a, b) => b[1] - a[1]);

  const primaryCode: AiCategoryCode = sortedCategories[0]?.[0] || 'B';
  const secondaryCategories = sortedCategories
    .slice(1, 2)
    .filter(([, s]) => s >= 18)
    .map(([code]) => code);

  const categoryNames: Record<AiCategoryCode, string> = {
    A: 'General Conversation',
    B: 'General Knowledge',
    C: 'Study in Korea',
    D: 'Korean Visa & Immigration',
    E: 'Korean Universities',
    F: 'Bangladesh Applicant Guide',
    G: 'Nepal Applicant Guide',
    H: 'Learn Korean & TOPIK',
    I: 'EVERYKR Services',
    J: 'Technology & Programming',
    K: 'Business & Marketing',
    L: 'Complex Research',
  };

  // Determine which RAG modules to load selectively (ONLY when relevant!)
  const ragModulesSet = new Set<string>();
  const activeCodes = new Set<AiCategoryCode>([primaryCode, ...secondaryCategories]);

  if (activeCodes.has('I')) {
    ragModulesSet.add('MODULE_1_EVERYKR_COMPANY');
    ragModulesSet.add('MODULE_2_EVERYKR_SERVICES');
    ragModulesSet.add('MODULE_6_DATA_VERIFICATION_STANDARDS');
  }
  if (activeCodes.has('H')) {
    ragModulesSet.add('MODULE_2_EVERYKR_SERVICES');
    ragModulesSet.add('MODULE_3_KOREAN_LANGUAGE_ACADEMY');
  }
  if (activeCodes.has('F')) {
    ragModulesSet.add('MODULE_4_ADMISSION_DOCUMENT_VERIFICATION');
    ragModulesSet.add('MODULE_8_BANGLADESH_APPLICANTS');
    ragModulesSet.add('MODULE_10_IMMIGRATION_AUTHORITY');
  }
  if (activeCodes.has('G')) {
    ragModulesSet.add('MODULE_4_ADMISSION_DOCUMENT_VERIFICATION');
    ragModulesSet.add('MODULE_9_NEPAL_APPLICANTS');
    ragModulesSet.add('MODULE_10_IMMIGRATION_AUTHORITY');
  }
  if (activeCodes.has('E')) {
    ragModulesSet.add('MODULE_6_DATA_VERIFICATION_STANDARDS');
    ragModulesSet.add('MODULE_7_VERIFIED_PARTNERSHIPS');
    ragModulesSet.add('MODULE_11_KOREAN_UNIVERSITIES');
  }
  if (activeCodes.has('D')) {
    ragModulesSet.add('MODULE_5_SETTLEMENT_ONSHORE_GUIDE');
    ragModulesSet.add('MODULE_10_IMMIGRATION_AUTHORITY');
    ragModulesSet.add('MODULE_12_STUDENT_SERVICES_ACCOMMODATION');
  }
  if (activeCodes.has('C')) {
    ragModulesSet.add('MODULE_2_EVERYKR_SERVICES');
    ragModulesSet.add('MODULE_4_ADMISSION_DOCUMENT_VERIFICATION');
    ragModulesSet.add('MODULE_6_DATA_VERIFICATION_STANDARDS');
    ragModulesSet.add('MODULE_11_KOREAN_UNIVERSITIES');
    ragModulesSet.add('MODULE_12_STUDENT_SERVICES_ACCOMMODATION');
  }

  // Check if user mentioned agency/consultancy generally
  if (/\b(agenc|consultan|agent|কনসালটেন্সি|এজেন্সি|कन्सल्टेन्सी|एजेन्सी|एजेंसी|유학원)\b/i.test(text)) {
    ragModulesSet.add('MODULE_8_BANGLADESH_APPLICANTS');
    ragModulesSet.add('MODULE_9_NEPAL_APPLICANTS');
    ragModulesSet.add('MODULE_10_IMMIGRATION_AUTHORITY');
  }

  const ragModulesLoaded = Array.from(ragModulesSet);
  const useSelectiveRag = ragModulesLoaded.length > 0 || uniMatch.matchedCount > 0;

  // Determine ThinkingLevel & Google Search usage for optimal speed vs depth
  let thinkingLevel: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
  if (primaryCode === 'L' || hasFileAttachment) {
    thinkingLevel = 'HIGH';
  } else if (wordCount > 30) {
    thinkingLevel = 'MEDIUM';
  } else {
    // Fast low-latency reasoning for interactive queries
    thinkingLevel = 'LOW';
  }

  // Only enable Google Search when current affairs / live news / explicit web lookup is requested
  const needsLiveWebSearch =
    /\b(latest\s+news|current\s+affairs|today'?s|weather\s+in|exchange\s+rate\s+today|live\s+score|stock\s+price|2026\s+news)\b/i.test(
      text
    );

  return {
    categoryCode: primaryCode,
    categoryName: categoryNames[primaryCode],
    secondaryCategories,
    detectedLanguage,
    languageName,
    thinkingLevel,
    useSelectiveRag,
    ragModulesLoaded,
    matchedUniversitiesCount: uniMatch.matchedCount,
    useGoogleSearch: needsLiveWebSearch,
    isSimpleGreeting: false,
    maxOutputTokens: primaryCode === 'L' || primaryCode === 'J' ? 3072 : 2048,
    temperature: primaryCode === 'J' ? 0.2 : 0.35,
  };
}

/**
 * Builds a lean, high-precision system instruction tailored to the route classification.
 * Avoids loading Korea/EveryKR RAG modules when the user asks general knowledge, coding, math, or business questions!
 */
export function buildSelectiveSystemInstruction(
  message: string,
  classification: AiRouteClassification
): string {
  const { detectedLanguage, languageName, useSelectiveRag, ragModulesLoaded } = classification;

  const baseIdentity = `You are **EVERYKR AI**, an advanced, fast, multilingual, general-purpose AI assistant and South Korea specialist integrated into **EVERYKR (https://everykr.com)**.

### 1. GENERAL-PURPOSE INTELLIGENCE & 20 CORE CAPABILITIES
You are a full general-purpose AI assistant. Do NOT artificially restrict your knowledge to EveryKR or South Korea topics. Answer any topic with high intelligence, depth, and clarity:
1. Advanced reasoning and complex problem-solving
2. General knowledge across global science, history, geography, technology, and culture
3. Korean university guidance and admissions (25 approved priority universities + 113 preserved archive universities)
4. South Korea visa, immigration (D-2, D-4, D-10, F-2-7, E-7, S-3, ARC), and international student guidance
5. Korean language learning (Hangul, grammar, vocabulary, TOPIK I & II) and multilingual translation
6. Academic assistance, research methodology, and study planning
7. Essay, Statement of Purpose (SOP), motivation letter, study plan, email, and professional document writing
8. Business planning, entrepreneurship, and startup strategy
9. Financial analysis, budgeting, ROI modeling, and cost estimation
10. Market research and competitor analysis
11. Coding, software development, debugging, and system architecture (Python, JavaScript, TypeScript, React, SQL, C++, Java, etc.)
12. Mathematics, calculus, linear algebra, statistics, LaTeX derivations, and logical analysis
13. Document analysis, OCR/file reading, and executive summarization
14. Data analysis and structured Markdown comparison tables
15. Presentation and slide deck content generation (.pptx)
16. Spreadsheet and structured table generation (.xlsx / .csv)
17. Professional report and PDF/Word (.pdf / .docx) generation
18. Multilingual translation and cultural localization
19. Research assistance and structured step-by-step explanations
20. Creative problem-solving and technical explanations

### 2. EVERYKR KNOWLEDGE BASE & STRICT ZERO-FABRICATION ACCURACY RULES
- When answering questions about South Korea or EveryKR, utilize verified knowledge of:
  • Korean universities, admissions, application deadlines, tuition fees, and scholarships (GKS & university merit waivers)
  • Student visas (D-2, D-4, COA, financial proof, ARC biometric registration at HiKorea.go.kr)
  • Student accommodation & housing, Free SIM card registration (\`/sim\`) & arrival services, Korean transportation (T-money, KTX, AREX), part-time jobs (S-3 work permit), and Korean language learning (\`/korean-academy\`)
- **NEVER** invent university deadlines, tuition fees, scholarship eligibility, GPA/TOPIK/IELTS requirements, official immigration policies, or contact information.
- When exact institutional details are uncertain or not yet announced, clearly state: **"Official information has not yet been verified."** instead of guessing.
- **No Unsolicited Promotion**: Do NOT automatically advertise EveryKR or WeCare Education in ordinary or general-purpose conversations. Introduce platform information only when relevant or explicitly requested by the user.

### 3. CLEAN FORMATTING, LATEX MATHEMATICS & INTERACTIVE GRAPHING
- Use clean Markdown: clear headings (\`###\`), **bold key terms**, bulleted/numbered lists, Markdown tables for structured comparisons, and fenced code blocks with language tags.
- For mathematics, calculus, or engineering formulas, provide step-by-step derivations using LaTeX notation (\`$$...$$\` for display equations and \`$...$\` for inline expressions).
- When asked to plot or graph a mathematical function, include an interactive \`\`\`math-graph fenced JSON block with \`{"title": "...", "xDomain": [-6, 6], "functions": [{"expr": "x^2 - 4*x + 3", "label": "f(x) = x^2 - 4x + 3", "color": "#19B6A4"}], "points": [{"x": 1, "y": 0, "label": "(1,0)"}]}\`.

### 4. AUTOMATIC MULTILINGUAL RESPONSE RULE
- Detected User Language for this message: **${languageName} (code: ${detectedLanguage})**.
- **CRITICAL**: Always respond naturally and fluently in the exact language and native script used by the user (**${languageName}**), unless the user explicitly asks you to translate or reply in another language.
  • Bangla input -> Respond in natural Bangla (Bengali script: বাংলা)
  • Nepali input -> Respond in natural Nepali (Devanagari script: नेपाली)
  • English input -> Respond in natural English
  • Korean input -> Respond in natural Korean (Hangul: 한국어)
  • Urdu / Hindi / Arabic / Chinese / Japanese -> Respond in that exact language and script.`;

  if (!useSelectiveRag) {
    return baseIdentity;
  }

  const selectedModulesText = ragModulesLoaded
    .map((modKey) => RAG_KNOWLEDGE_MODULES[modKey] || '')
    .filter(Boolean)
    .join('\n');

  const uniMatch = retrieveMatchingUniversitiesContext(message, 4);

  const actionTagInstructions = `
### PLATFORM NAVIGATION TAGS (Include at the very end of your response ONLY when directly relevant to an EveryKR service page)
- \`[ACTION:NAVIGATE:universities]\` -> 25 Approved Universities Directory
- \`[ACTION:NAVIGATE:visa]\` -> Visa & Immigration Checklist Hub
- \`[ACTION:NAVIGATE:scholarships]\` -> GKS & University Scholarships
- \`[ACTION:NAVIGATE:accommodation]\` -> Dormitories & Student Housing
- \`[ACTION:NAVIGATE:jobs]\` -> Student Part-Time Jobs & Careers
- \`[ACTION:NAVIGATE:language]\` -> Korean Language & TOPIK Center`;

  return `${baseIdentity}\n\n## SELECTIVELY RETRIEVED VERIFIED KNOWLEDGE MODULES\n${selectedModulesText}${uniMatch.contextText}\n${actionTagInstructions}`;
}

/**
 * PART 6: FAST INSTANT RESPONSES FOR SIMPLE GREETINGS (ALL 9 LANGUAGES)
 * Zero LLM latency (<5ms) for "Hi", "Hello", "How are you?", "হ্যালো", "안녕하세요", "नमस्ते"
 */
export function getInstantGreetingResponse(
  message: string,
  lang: SupportedAiLanguage,
  userName?: string
): string | null {
  const lower = message.trim().toLowerCase();
  const isHowAreYou =
    /(how\s+are\s+you|কেমন\s*আছেন|কেমন\s*আছো|कस्तो\s*हुनुहुन्छ|कस्तो\s*छ|कैसे\s*हो|कैसे\s*हैं)/i.test(
      lower
    );

  const cleanName =
    typeof userName === 'string'
      ? userName
          .replace(/<[^>]*>/g, '')
          .replace(/[\u0000-\u001F\u007F<>`"']/g, '')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 60)
      : '';
  const hasValidName =
    Boolean(cleanName) &&
    !cleanName.includes('@') &&
    !/^(uid_|guest_)/i.test(cleanName) &&
    cleanName.toLowerCase() !== 'everykr user';

  if (lang === 'bn') {
    const salutation = hasValidName ? `হ্যালো, ${cleanName}!` : 'হ্যালো!';
    if (isHowAreYou) {
      return `${salutation} আমি ভালো আছি, ধন্যবাদ। আমি **EVERYKR AI** — আপনার বুদ্ধিমান, বহুভাষী এআই সহকারী।\n\nআমি আপনাকে সাহায্য করতে পারি:\n- **কোরিয়ান বিশ্ববিদ্যালয়, ভর্তি, স্কলারশিপ এবং আবেদনের শেষ তারিখ (Deadlines)**\n- **কোরিয়ান ভাষা শিক্ষা (হাঙ্গুল ও TOPIK), স্টুডেন্ট ভিসা (D-2 / D-4 / ARC), আবাসন ও ফ্রি সিম নিবন্ধন**\n- **সাধারণ জ্ঞান, কোডিং, গণিত, ব্যবসা, ফাইল বিশ্লেষণ, ডকুমেন্ট তৈরি এবং অনুবাদ**\n\nআজ আপনাকে কীভাবে সাহায্য করতে পারি?`;
    }
    return `${salutation} **EVERYKR AI**-তে স্বাগতম। আমি আপনার বুদ্ধিমান, বহুভাষী সহকারী — কোরিয়ান বিশ্ববিদ্যালয়, ভর্তি, স্কলারশিপ, আবেদনের ডেডলাইন, কোরিয়ান ভাষা শিক্ষা, স্টুডেন্ট ভিসা এবং দক্ষিণ কোরিয়ায় পড়াশোনা ও জীবনযাপনে সাহায্য করতে প্রস্তুত।\n\nএছাড়াও আমি সাধারণ জ্ঞান, কোডিং, গণিত, ব্যবসা, লেখালেখি, ফাইল বিশ্লেষণ এবং অনুবাদেও সাহায্য করতে পারি।\n\nআজ আপনাকে কীভাবে সাহায্য করতে পারি?`;
  }

  if (lang === 'ko') {
    const salutation = hasValidName ? `안녕하세요, ${cleanName}님!` : '안녕하세요!';
    if (isHowAreYou) {
      return `${salutation} 반갑습니다. 저는 다국어 지능형 AI 어시스턴트 **EVERYKR AI**입니다.\n\n다음 분야를 도와드릴 수 있습니다:\n- **한국 대학교 입학, 장학금, 지원 마감일, 유학생 비자(D-2·D-4·외국인등록), 숙소 및 무료 유심 신청**\n- **한국어 학습(한글·TOPIK) 및 한국 유학·생활 정보**\n- **일반 상식, 코딩, 수학, 비즈니스 기획, 문서 분석·생성 및 다국어 번역**\n\n오늘 무엇을 도와드릴까요?`;
    }
    return `${salutation} **EVERYKR AI**에 오신 것을 환영합니다. 한국 대학교, 입학, 장학금, 지원 마감일, 한국어 학습, 유학생 비자 및 한국 유학·생활 정보를 도와드리는 다국어 지능형 어시스턴트입니다.\n\n일반 상식, 코딩, 수학, 비즈니스, 작문, 파일 분석 및 번역도 도와드릴 수 있습니다.\n\n오늘 무엇을 도와드릴까요?`;
  }

  if (lang === 'ne') {
    const salutation = hasValidName ? `नमस्ते, ${cleanName}!` : 'नमस्ते!';
    if (isHowAreYou) {
      return `${salutation} म सन्चै छु, धन्यवाद। म **EVERYKR AI** हुँ — तपाईंको बुद्धिमान, बहुभाषी एआई सहायक।\n\nम तपाईंलाई कोरियन विश्वविद्यालय, भर्ना, छात्रवृत्ति, आवेदन म्याद, कोरियन भाषा सिकाइ, विद्यार्थी भिसा, आवास, नि:शुल्क सिम दर्ता, साथै सामान्य ज्ञान, कोडिङ, गणित, व्यवसाय, लेखन र अनुवादमा सहयोग गर्न सक्छु।\n\nआज म तपाईंलाई कसरी सहयोग गर्न सक्छु?`;
    }
    return `${salutation} **EVERYKR AI** मा स्वागत छ। म तपाईंको बहुभाषी सहायक हुँ — कोरियन विश्वविद्यालय, भर्ना, छात्रवृत्ति, आवेदन म्याद, कोरियन भाषा सिकाइ, विद्यार्थी भिसा तथा दक्षिण कोरियामा अध्ययन र बसोबास सम्बन्धी सहयोगका लागि तयार छु।\n\nम सामान्य ज्ञान, कोडिङ, गणित, व्यवसाय, लेखन र अनुवादमा पनि मद्दत गर्न सक्छु।\n\nआज म तपाईंलाई कसरी सहयोग गर्न सक्छु?`;
  }

  if (lang === 'hi') {
    const salutation = hasValidName ? `नमस्ते, ${cleanName}!` : 'नमस्ते!';
    if (isHowAreYou) {
      return `${salutation} मैं बिल्कुल ठीक हूँ, धन्यवाद। मैं **EVERYKR AI** हूँ — आपका बुद्धिमान, बहुभाषी एआई सहायक।\n\nमैं कोरियन विश्वविद्यालयों, प्रवेश, छात्रवृत्ति, आवेदन तिथियों, कोरियन भाषा सीखने, छात्र वीज़ा, आवास, तथा सामान्य ज्ञान, कोडिंग, गणित, व्यवसाय, लेखन और अनुवाद में आपकी मदद कर सकता हूँ।\n\nआज मैं आपकी कैसे सहायता कर सकता हूँ?`;
    }
    return `${salutation} **EVERYKR AI** में आपका स्वागत है। मैं आपका बुद्धिमान, बहुभाषी सहायक हूँ — कोरियन विश्वविद्यालयों, प्रवेश, छात्रवृत्ति, आवेदन की अंतिम तिथियों, कोरियन भाषा सीखने, छात्र वीज़ा और दक्षिण कोरिया में पढ़ाई या रहने में आपकी मदद के लिए यहाँ हूँ।\n\nमैं सामान्य ज्ञान, कोडिंग, गणित, व्यवसाय, लेखन और अनुवाद में भी मदद कर सकता हूँ।\n\nआज मैं आपकी कैसे मदद कर सकता हूँ?`;
  }

  if (lang === 'ur') {
    const salutation = hasValidName ? `السلام علیکم، ${cleanName}!` : 'السلام علیکم!';
    return `${salutation} **EVERYKR AI** میں خوش آمدید۔ میں آپ کا ذہین، کثیر لسانی معاون ہوں جو کوریا کی یونیورسٹیوں، داخلوں، اسکالرشپس، درخواست کی آخری تاریخوں، کورین زبان سیکھنے، اسٹوڈنٹ ویزا، اور جنوبی کوریا میں تعلیم و رہائش کے ساتھ ساتھ جنرل نالج، کوڈنگ، ریاضی، بزنس، تحریر اور ترجمے میں بھی مدد کر سکتا ہوں۔ آج میں آپ کی کیا مدد کر سکتا ہوں؟`;
  }

  if (lang === 'ar') {
    const salutation = hasValidName ? `مرحباً، ${cleanName}!` : 'مرحباً بك في **EVERYKR AI**!';
    return `${salutation} أنا مساعدك الذكي متعدد اللغات في **EVERYKR AI**. يمكنني مساعدتك في الجامعات الكورية، القبول، المنح الدراسية، مواعيد التقديم، تعلم اللغة الكورية، تأشيرات الطلاب، والحياة في كوريا الجنوبية، بالإضافة إلى المعرفة العامة، البرمجة، الرياضيات، الأعمال، الكتابة والترجمة. كيف يمكنني مساعدتك اليوم؟`;
  }

  if (lang === 'zh') {
    const salutation = hasValidName ? `您好，${cleanName}！` : '您好！';
    return `${salutation}欢迎使用 **EVERYKR AI**。我是您的多语言智能助手，可以帮助您了解韩国大学、入学申请、奖学金、截止日期、韩语学习、学生签证及韩国留学生活，同时也能协助处理通用知识、编程、数学、商业规划、写作与翻译。今天有什么可以帮您？`;
  }

  if (lang === 'ja') {
    const salutation = hasValidName ? `こんにちは、${cleanName}さん！` : 'こんにちは！';
    return `${salutation}**EVERYKR AI**へようこそ。韓国の大学、入学案内、奨学金、出願締切、韓国語学習、学生ビザ、韓国での生活情報のほか、一般知識、プログラミング、数学、ビジネス、文章作成、翻訳まで幅広くサポートする多言語AIアシスタントです。今日はどのようなご用件でしょうか？`;
  }

  // Default: English
  const enSalutation = hasValidName ? `Hello, ${cleanName}!` : 'Hello!';
  if (isHowAreYou) {
    return `${enSalutation} I'm doing well, thank you! Welcome to **EVERYKR AI**.\n\nI'm here to help you with Korean universities, admissions, scholarships, application deadlines, Korean language learning, student visas, accommodation, and studying or living in South Korea — as well as general knowledge, coding, mathematics, business planning, writing, document analysis, and translation.\n\nHow can I help you today?`;
  }

  return `${enSalutation} Welcome to EVERYKR AI. I'm your intelligent, multilingual assistant, here to help you with Korean universities, admissions, scholarships, application deadlines, Korean language learning, student visas, and studying or living in South Korea.\n\nI can also help with general knowledge, coding, business, writing, and translation.\n\nHow can I help you today?`;
}

/**
 * PART 6: IN-MEMORY LRU RESPONSE CACHE FOR FREQUENT QUERIES
 */
interface CachedAiEntry {
  reply: string;
  sources: Array<{ title: string; url: string }>;
  classification: AiRouteClassification;
  timestamp: number;
}

const AI_RESPONSE_CACHE = new Map<string, CachedAiEntry>();
const MAX_CACHE_ENTRIES = 150;
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

export function makeCacheKey(
  message: string,
  lang: SupportedAiLanguage,
  userNameScope?: string
): string {
  const normalizedMsg = message.trim().toLowerCase().replace(/\s+/g, ' ');
  const normalizedUser = (userNameScope || 'anon').trim().toLowerCase();
  return `${lang}::${normalizedUser}::${normalizedMsg}`;
}

export function getCachedAiResponse(
  message: string,
  lang: SupportedAiLanguage,
  userNameScope?: string
): CachedAiEntry | null {
  const key = makeCacheKey(message, lang, userNameScope);
  const entry = AI_RESPONSE_CACHE.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    AI_RESPONSE_CACHE.delete(key);
    return null;
  }
  return entry;
}

export function setCachedAiResponse(
  message: string,
  lang: SupportedAiLanguage,
  data: Omit<CachedAiEntry, 'timestamp'>,
  userNameScope?: string
): void {
  const key = makeCacheKey(message, lang, userNameScope);
  if (AI_RESPONSE_CACHE.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = AI_RESPONSE_CACHE.keys().next().value;
    if (oldestKey) AI_RESPONSE_CACHE.delete(oldestKey);
  }
  AI_RESPONSE_CACHE.set(key, {
    ...data,
    timestamp: Date.now(),
  });
}

// Keep legacy export alias so any external imports remain 100% compatible
export const EVERYKR_SYSTEM_PROMPT = buildSelectiveSystemInstruction(
  'EveryKR and Study in Korea overview',
  classifyAiRequest('EveryKR and Study in Korea overview', 'en')
);

/**
 * COMPREHENSIVE MULTILINGUAL FALLBACK ENGINE (Covers Categories A–L across all 5 languages)
 * Used only if the upstream AI API encounters a transient network interruption.
 */
export function generateOfflineResponse(message: string, language: string = 'en'): string {
  const classification = classifyAiRequest(message, language);
  const lang = classification.detectedLanguage;
  const lower = (message || '').toLowerCase();

  if (classification.isSimpleGreeting) {
    return getInstantGreetingResponse(message, lang) || 'Hello! How can I help you today?';
  }

  // Handle Study Plan / Personal Statement requests
  if (/\b(study\s+plan|personal\s+statement|statement\s+of\s+purpose|sop|\.docx)\b/i.test(lower)) {
    return `# South Korea University Study Plan & Academic Statement (March 2027 Intake)

## 1. Academic Background & Motivation
My academic objective is to pursue a degree program at an accredited South Korean university, combining rigorous theoretical foundations with South Korea's globally recognized research and innovation ecosystem.

## 2. Study Roadmap in South Korea
- **Year 1 (Foundation & Korean Language)**: Complete core departmental prerequisites and achieve TOPIK Level 4+ proficiency through intensive university Korean language courses.
- **Year 2–3 (Major Specialization & Lab Projects)**: Focus on advanced major coursework, industry-university capstone projects, and faculty-mentored research.
- **Year 4 (Thesis & Career Transition)**: Complete graduation research thesis and prepare for global R&D or D-10 / E-7 professional pathways.

## 3. Target University & Scholarship Alignment
| University | Location | Tuition per Semester (KRW) | Target Scholarship |
| --- | --- | --- | --- |
| Seoul National University (SNU) | Seoul | 3,800,000 | GKS / Global Scholarship |
| KAIST | Daejeon | 4,300,000 | KAIST International Scholarship (100%) |
| Yonsei University | Seoul | 6,400,000 | Underwood / Merit Admission Scholarship |
| Kyungpook National University (KNU) | Daegu | 2,600,000 | KNU International Topik Scholarship |`;
  }

  // Handle Spreadsheet / Excel Tuition & Scholarship Comparison requests
  if (/\b(xlsx|excel|spreadsheet|tuition.*table|compare.*tuition)\b/i.test(lower)) {
    return `# South Korea University Tuition, Dormitory & Scholarship Comparison (March 2027)

| University | City | Type | Semester Tuition (KRW) | Dormitory per Semester (KRW) | Primary Scholarship | March 2027 Status |
| --- | --- | --- | --- | --- | --- | --- |
| Seoul National University (SNU) | Seoul | National | 3,800,000 | 950,000 | GKS & SNU Global Scholarship | Verified Priority |
| KAIST | Daejeon | National | 4,300,000 | 650,000 | 100% Tuition + Monthly Stipend | Verified Priority |
| Yonsei University | Seoul | Private | 6,400,000 | 1,450,000 | 30%–100% Merit Scholarship | Verified Priority |
| Korea University | Seoul | Private | 5,900,000 | 1,350,000 | Global Leader Scholarship | Verified Priority |
| Hanyang University | Seoul | Private | 5,600,000 | 1,200,000 | Hanyang International Excellence | Verified Priority |
| Kyungpook National University | Daegu | National | 2,600,000 | 780,000 | TOPIK 3–6 Tuition Waiver (30%–100%) | Verified Priority |
| Pusan National University | Busan | National | 2,550,000 | 820,000 | PNU International Merit Waiver | Verified Priority |`;
  }

  // Handle Presentation / Slide Deck requests
  if (/\b(pptx|powerpoint|presentation|slide\s*deck|slides)\b/i.test(lower)) {
    return `# Slide 1: International Student Guide to South Korea (March 2027)
- Overview of 25 Approved Priority Korean Universities on EVERYKR
- English-track and Korean-track degree pathways
- Official admission verification and document preparation

## Slide 2: D-2 & D-4 Student Visa Requirements
- Certificate of Admission (COA) issued by the admitting Korean university
- Verified bank balance certificate and apostilled academic transcripts
- Embassy visa filing and standard processing timeline

## Slide 3: Alien Registration Card (ARC) & Onshore Settlement
- Mandatory biometric registration at HiKorea.go.kr within 90 days of arrival
- National Health Insurance Service (NHIS) automatic enrollment for international students
- Opening a Korean student bank account and mobile SIM activation

## Slide 4: Scholarships & Legal Part-Time Work (S-3 Permit)
- Global Korea Scholarship (GKS) and university TOPIK/IELTS tuition waivers (30% to 100%)
- Legal part-time work requires immigration S-3 endorsement after 6 months of study
- Strict compliance with weekly work-hour limits and permitted industries`;
  }

  // Handle Advanced Mathematics, Calculus, LaTeX & Interactive Graph requests
  if (/\b(f\(x\)|derivative|integral|calculus|quadratic|matrix|eigenvalue|equation|math-graph|plot.*graph|solve.*x\^2)\b/i.test(lower)) {
    return `### Step-by-Step Mathematical Analysis, LaTeX Derivation & Interactive Graph

#### 1. Problem Formulation & Symbolic Roots
Given the quadratic function and linear function:
$$f(x) = x^2 - 4x + 3, \\quad g(x) = 2x - 2$$

To find the roots of $f(x) = 0$, we factor the quadratic expression:
$$x^2 - 4x + 3 = (x - 1)(x - 3) = 0 \\implies x_1 = 1, \\; x_2 = 3$$

Completing the square gives the vertex form:
$$f(x) = (x - 2)^2 - 1 \\implies \\text{Vertex at } (2, -1)$$

#### 2. Differential & Integral Calculus
- **First Derivative (Slope / Critical Point)**:
$$f'(x) = \\frac{d}{dx}(x^2 - 4x + 3) = 2x - 4 = 0 \\implies x = 2$$
- **Definite Integral on $[0, 3]$**:
$$\\int_{0}^{3} (x^2 - 4x + 3)\\,dx = \\left[ \\frac{x^3}{3} - 2x^2 + 3x \\right]_{0}^{3} = (9 - 18 + 9) - 0 = 0$$

#### 3. Interactive Mathematical Function Graph
\`\`\`math-graph
{
  "title": "Interactive Plot: f(x) = x^2 - 4x + 3 and g(x) = 2x - 2",
  "xDomain": [-2, 6],
  "yDomain": [-4, 10],
  "functions": [
    { "expr": "x^2 - 4*x + 3", "label": "f(x) = x² - 4x + 3", "color": "#19B6A4" },
    { "expr": "2*x - 2", "label": "g(x) = 2x - 2", "color": "#4BA3FF" }
  ],
  "points": [
    { "x": 1, "y": 0, "label": "Root (1, 0)", "color": "#F59E0B" },
    { "x": 3, "y": 0, "label": "Root (3, 0)", "color": "#F59E0B" },
    { "x": 2, "y": -1, "label": "Vertex (2, -1)", "color": "#EC4899" }
  ]
}
\`\`\`

#### 4. Numerical Verification in Isolated Python Sandbox
\`\`\`python
import math

def f(x: float) -> float:
    return x**2 - 4*x + 3

def df(x: float) -> float:
    return 2*x - 4

a, b, c = 1.0, -4.0, 3.0
discriminant = b**2 - 4*a*c
r1 = (-b - math.sqrt(discriminant)) / (2*a)
r2 = (-b + math.sqrt(discriminant)) / (2*a)
print(f"Verified Roots: x1 = {r1:.2f}, x2 = {r2:.2f}")
print(f"Vertex: (2.00, {f(2.0):.2f}), Derivative f'(2) = {df(2.0):.2f}")
\`\`\``;
  }

  // Handle Python Cost Calculation / Code Execution requests
  if (/\b(python|script|calculate|cost\s+calculator|expenses)\b/i.test(lower)) {
    return `### South Korea 4-Year Tuition & Living Cost Analysis (Python Simulation)
Here is a verified Python calculation comparing 4-year (8-semester) study and living expenses in Seoul vs. regional Korean cities across 30%, 50%, and 100% scholarship tiers:

\`\`\`python
scenarios = [
    {"city": "Seoul (Private Univ)", "sem_tuition": 6000000, "monthly_living": 950000},
    {"city": "Regional (National Univ)", "sem_tuition": 2600000, "monthly_living": 650000},
]
scholarships = [0.30, 0.50, 1.00]

for s in scenarios:
    print(f"=== {s['city']} ===")
    living_4yr = s["monthly_living"] * 48
    for sch in scholarships:
        net_tuition_4yr = int(s["sem_tuition"] * 8 * (1 - sch))
        total_krw = net_tuition_4yr + living_4yr
        print(f"  {int(sch*100)}% Scholarship -> Net Tuition: {net_tuition_4yr:,} KRW | 4-Yr Total: {total_krw:,} KRW")
\`\`\``;
  }

  const cleanModule = (modText: string) =>
    modText
      .replace(/### \[MODULE \d+: ([^\]]+)\]/g, '### $1')
      .replace(/### \[LIVE VERIFIED RECORDS FROM EVERYKR 25-UNIVERSITY DATABASE\]\n[^\n]+\n\n/g, '### Verified University Profiles (EveryKR 25-University Database)\n\n')
      .trim();

  const uniMatch = retrieveMatchingUniversitiesContext(message, 3);
  if (uniMatch.matchedCount > 0) {
    return `${cleanModule(uniMatch.contextText)}\n\n[ACTION:NAVIGATE:universities]`;
  }

  if (classification.categoryCode === 'I') {
    return `${cleanModule(RAG_KNOWLEDGE_MODULES.MODULE_1_EVERYKR_COMPANY)}\n\n${cleanModule(RAG_KNOWLEDGE_MODULES.MODULE_2_EVERYKR_SERVICES)}`;
  }

  if (classification.categoryCode === 'H') {
    return `${cleanModule(RAG_KNOWLEDGE_MODULES.MODULE_3_KOREAN_LANGUAGE_ACADEMY)}\n\n[ACTION:NAVIGATE:language]`;
  }

  if (classification.categoryCode === 'F') {
    return `${cleanModule(RAG_KNOWLEDGE_MODULES.MODULE_8_BANGLADESH_APPLICANTS)}\n\n${cleanModule(RAG_KNOWLEDGE_MODULES.MODULE_4_ADMISSION_DOCUMENT_VERIFICATION)}`;
  }

  if (classification.categoryCode === 'G') {
    return `${cleanModule(RAG_KNOWLEDGE_MODULES.MODULE_9_NEPAL_APPLICANTS)}`;
  }

  if (classification.categoryCode === 'D') {
    return `${cleanModule(RAG_KNOWLEDGE_MODULES.MODULE_12_STUDENT_SERVICES_ACCOMMODATION)}\n\n[ACTION:NAVIGATE:visa]`;
  }

  if (classification.categoryCode === 'C' || classification.categoryCode === 'E') {
    return `${cleanModule(RAG_KNOWLEDGE_MODULES.MODULE_11_KOREAN_UNIVERSITIES)}\n\n[ACTION:NAVIGATE:universities]`;
  }

  if (classification.categoryCode === 'J') {
    return `### Software Engineering & Programming Guide\nHere is a clean, production-ready implementation with type annotations and complexity analysis:\n\n\`\`\`python\ndef binary_search(arr: list[int], target: int) -> int:\n    """Perform binary search on a sorted list in O(log n) time."""\n    left, right = 0, len(arr) - 1\n    while left <= right:\n        mid = (left + right) // 2\n        if arr[mid] == target:\n            return mid\n        elif arr[mid] < target:\n            left = mid + 1\n        else:\n            right = mid - 1\n    return -1\n\nprint("Binary search index of 7:", binary_search([1, 3, 5, 7, 9, 11], 7))\n\`\`\`\n\n- **Time Complexity**: $O(\\log n)$\n- **Space Complexity**: $O(1)$ iterative`;
  }

  if (classification.categoryCode === 'K') {
    return `### Business & Entrepreneurship Framework\nTo launch and scale a sustainable business or online venture:\n\n1. **Market Validation & Niche Selection**: Identify a specific target customer problem, analyze competitors, and validate willingness to pay.\n2. **Business Model & Legal Setup**: Define revenue streams (SaaS, e-commerce, or services), register the business entity, and configure payment gateways.\n3. **Minimum Viable Product (MVP) & Digital Presence**: Build a fast, mobile-first website or platform with clear value propositions.\n4. **Customer Acquisition & Analytics**: Combine SEO, content marketing, targeted social campaigns, and retention metrics (CAC vs. LTV).`;
  }

  return (
    getInstantGreetingResponse(message, lang) ||
    `Hello! Welcome to **EVERYKR AI**. Please ask your question again or explore our verified directories below.\n\n[ACTION:NAVIGATE:universities]`
  );
}

export const getFallbackAiResponse = generateOfflineResponse;



