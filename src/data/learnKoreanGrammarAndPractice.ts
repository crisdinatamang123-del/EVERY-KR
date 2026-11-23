import { QuadLangText } from './learnKoreanHangulAndVocab';

export interface MasterGrammarTopic {
  id: string;
  tier: 'Beginner' | 'Intermediate' | 'Advanced';
  patternKo: string;
  title: QuadLangText;
  formula: string;
  whenToUse: QuadLangText;
  politeVsInformal: QuadLangText;
  commonMistakes: QuadLangText;
  examples: Array<{
    ko: string;
    romanization: string;
    translation: QuadLangText;
    breakdown: QuadLangText;
  }>;
  practiceQuestions: Array<{
    prompt: QuadLangText;
    options: string[];
    correctIndex: number;
    explanation: QuadLangText;
  }>;
}

export const MASTER_GRAMMAR_TOPICS: MasterGrammarTopic[] = [
  // ================= BEGINNER GRAMMAR (13 Essential Topics) =================
  {
    id: 'bg-1',
    tier: 'Beginner',
    patternKo: '이다 / 아니다',
    title: {
      en: 'To be (이다) / To not be (아니다)',
      bn: 'হওয়া (이다 - ইয়েয়ো/ইয়েয়ো) এবং না হওয়া (아니다 - আনিয়েয়ো)',
      ne: 'हुनु (이다 - 이에요/예요) र नहुनु (아니다 - 아니에요)',
      ur: 'ہونا (이다 - 이에요/예요) اور نہ ہونا (아니다 - 아니에요)',
    },
    formula: 'Noun + 이에요/예요 (am/is/are) · Noun + 이/가 아니에요 (am/is/are not)',
    whenToUse: {
      en: 'Use 이에요 after a noun ending in a consonant (Batchim) and 예요 after a vowel to introduce identity, nationality, or occupation. Use 이/가 아니에요 for negative statements.',
      bn: 'পরিচয়, জাতীয়তা বা পেশা বোঝাতে ব্যঞ্জনবর্ণ (받침) থাকলে 이에요 এবং স্বরবর্ণ থাকলে 예요 বসে। না-বোধক বাক্যে 이/가 아니에요 ব্যবহৃত হয়।',
      ne: 'परिचय, राष्ट्रियता वा पेशा बताउँदा व्यञ्जन (받침) पछि 이에요 र स्वर पछि 예요 लाग्छ। नकारात्मक वाक्यमा 이/가 아니에요 प्रयोग हुन्छ।',
      ur: 'اپنا تعارف، قومیت یا پیشہ بتانے کے لیے حرفِ صحیح (Batchim) کے بعد 이에요 اور واول کے بعد 예요 لگائیں۔ منفی جملے کے لیے 이/가 아니에요 استعمال کریں۔',
    },
    politeVsInformal: {
      en: 'Formal: 입니다 / 아닙니다 · Polite: 이에요/예요 / 아니에요 · Casual: 이야/야 / 아니야',
      bn: 'ফরমাল: 입니다 / 아닙니다 · ভদ্র: 이에요/예요 / 아니에요 · ঘরোয়া: 이야/야',
      ne: 'औपचारिक: 입니다 / 아닙니다 · शिष्ट: 이에요/예요 / 아니에요 · सामान्य: 이야/야',
      ur: 'رسمی: 입니다 / 아닙니다 · مؤدبانہ: 이에요/예요 / 아니에요 · بے تکلف: 이야/야',
    },
    commonMistakes: {
      en: 'Do not attach 이에요 directly without checking Batchim: 학생이에요 (correct), 의사예요 (correct).',
      bn: '받침 না দেখে ভুল রূপ বসাবেন না: 학생이에요 (সঠিক), 의사예요 (সঠিক)।',
      ne: '받침 नहेरी गलत रूप नराख्नुहोस्: 학생이에요 (सही), 의사예요 (सही)।',
      ur: 'Batchim دیکھے بغیر غلط لاحقہ نہ لگائیں: 학생이에요 (درست)، 의사예요 (درست)۔',
    },
    examples: [
      {
        ko: '저는 한국대학교 유학생이에요.',
        romanization: 'Jeoneun Hanguk-daehakgyo yuhaksaeng-ieyo.',
        translation: {
          en: 'I am an international student at Korea University.',
          bn: 'আমি কোরিয়া বিশ্ববিদ্যালয়ের একজন বিদেশি শিক্ষার্থী।',
          ne: 'म कोरिया विश्वविद्यालयको अन्तर्राष्ट्रिय विद्यार्थी हुँ।',
          ur: 'میں کوریا یونیورسٹی کا ایک بین الاقوامی طالب علم ہوں۔',
        },
        breakdown: {
          en: '저 (I) + 는 (topic) + 유학생 (international student, ends in ㅇ) + 이에요 (am)',
          bn: '저 (আমি) + 는 + 유학생 (বিদেশি ছাত্র) + 이에요 (হই)',
          ne: '저 (म) + 는 + 유학생 (विद्यार्थी) + 이에요 (हुँ)',
          ur: '저 (میں) + 는 + 유학생 (طالب علم) + 이에요 (ہوں)',
        },
      },
      {
        ko: '이분은 교수님이 아니에요.',
        romanization: 'Ibuneun gyosunimi anieyo.',
        translation: {
          en: 'This person is not a professor.',
          bn: 'ইনি প্রফেসর নন।',
          ne: 'उहाँ प्रोफेसर हुनुहुन्न।',
          ur: 'یہ صاحب پروفیسر نہیں ہیں۔',
        },
        breakdown: {
          en: '이분은 (this person) + 교수님이 (professor + subject particle) + 아니에요 (is not)',
          bn: '이분은 (ইনি) + 교수님이 + 아니에요 (নন)',
          ne: '이분은 (उहाँ) + 교수님이 + 아니에요 (हुनुहुन्न)',
          ur: '이분은 (یہ شخص) + 교수님이 + 아니에요 (نہیں ہیں)',
        },
      },
    ],
    practiceQuestions: [
      {
        prompt: {
          en: 'Choose the correct form: 저는 컴퓨터공학과 학생_____.',
          bn: 'সঠিক রূপটি নির্বাচন করুন: 저는 컴퓨터공학과 학생_____.',
          ne: 'सही रूप छान्नुहोस्: 저는 컴퓨터공학과 학생_____.',
          ur: 'درست شکل منتخب کریں: 저는 컴퓨터공학과 학생_____.',
        },
        options: ['이에요', '예요', '가 아니에요', '를이에요'],
        correctIndex: 0,
        explanation: {
          en: '학생 ends with the final consonant ㅇ (Batchim), so 이에요 is used.',
          bn: '학생 শব্দের শেষে ㅇ (받침) থাকায় 이에요 বসেছে।',
          ne: '학생 को अन्त्यमा ㅇ (받침) भएकाले 이에요 लाग्छ।',
          ur: '학생 کے آخر میں ㅇ (Batchim) ہے اس لیے 이에요 آئے گا۔',
        },
      },
    ],
  },
  {
    id: 'bg-2',
    tier: 'Beginner',
    patternKo: '은 / 는',
    title: {
      en: 'Topic Marker Particle (은 / 는)',
      bn: 'টপিক বা প্রসঙ্গ নির্দেশক পার্টিকেল (은 / 는)',
      ne: 'विषय सूचक कारक (은 / 는 - Topic Marker)',
      ur: 'موضوع ظاہر کرنے والا لاحقہ (은 / 는 - Topic Marker)',
    },
    formula: 'Consonant + 은 · Vowel + 는',
    whenToUse: {
      en: 'Marks the main topic of a sentence ("as for...") or expresses contrast between two things.',
      bn: 'বাক্যের মূল প্রসঙ্গ (Topic) বা দুটি বিষয়ের মধ্যে তুলনা বোঝাতে ব্যঞ্জনবর্ণের পরে 은 এবং স্বরবর্ণের পরে 는 বসে।',
      ne: 'वाक्यको मुख्य विषय वा दुई कुराबीच तुलना देखाउन व्यञ्जन पछि 은 र स्वर पछि 는 प्रयोग गरिन्छ।',
      ur: 'جملے کا مرکزی موضوع بتانے یا دو چیزوں کا موازنہ کرنے کے لیے حرفِ صحیح کے بعد 은 اور واول کے بعد 는 لگاتے ہیں۔',
    },
    politeVsInformal: {
      en: 'Used in all speech levels; in casual spoken Korean it is sometimes omitted.',
      bn: 'সকল কথোপকথনে ব্যবহৃত হয়; ঘরোয়া কথায় কখনো উহ্য থাকে।',
      ne: 'सबै तहको भाषामा प्रयोग हुन्छ।',
      ur: 'ہر سطح کی گفتگو میں استعمال ہوتا ہے۔',
    },
    commonMistakes: {
      en: 'Do not confuse 은/는 (general topic or contrast) with 이/가 (new specific subject).',
      bn: 'সাধারণ প্রসঙ্গ বোঝাতে 은/는 এবং নির্দিষ্ট নতুন কর্তা বোঝাতে 이/가 ব্যবহৃত হয়।',
      ne: 'सामान्य विषयमा 은/는 र नयाँ विशिष्ट कर्तामा 이/가 प्रयोग हुन्छ।',
      ur: 'عام موضوع کے لیے 은/는 اور نئے مخصوص فاعل کے لیے 이/가 استعمال کریں۔',
    },
    examples: [
      {
        ko: '한국어는 재미있지만 발음은 조금 어려워요.',
        romanization: 'Hangugeoneun jaemiitjiman bareumeun jogeum eoryeowoyo.',
        translation: {
          en: 'Korean is interesting, but pronunciation is a little difficult.',
          bn: 'কোরিয়ান ভাষা মজার, কিন্তু উচ্চারণ একটু কঠিন।',
          ne: 'कोरियन भाषा रोचक छ, तर उच्चारण अलि गाह्रो छ।',
          ur: 'کورین زبان دلچسپ ہے لیکن تلفظ تھوڑا مشکل ہے۔',
        },
        breakdown: {
          en: '한국어 + 는 (vowel topic) ... 발음 + 은 (consonant contrast topic)',
          bn: '한국어 + 는 (স্বরবর্ণ) ... 발음 + 은 (ব্যঞ্জনবর্ণ ও তুলনা)',
          ne: '한국어 + 는 (स्वर) ... 발음 + 은 (व्यञ्जन र तुलना)',
          ur: '한국어 + 는 (واول) ... 발음 + 은 (حرفِ صحیح اور موازنہ)',
        },
      },
    ],
    practiceQuestions: [
      {
        prompt: {
          en: 'Fill in the blank: 오늘___ 날씨가 따뜻해요.',
          bn: 'শূন্যস্থান পূরণ করুন: 오늘___ 날씨가 따뜻해요.',
          ne: 'खाली ठाउँ भर्नुहोस्: 오늘___ 날씨가 따뜻해요.',
          ur: 'خالی جگہ پر کریں: 오늘___ 날씨가 따뜻해요.',
        },
        options: ['은', '는', '를', '에'],
        correctIndex: 0,
        explanation: {
          en: '오늘 ends in ㄹ (Batchim), so 은 is attached.',
          bn: '오늘 শব্দের শেষে ㄹ (받침) থাকায় 은 বসবে।',
          ne: '오늘 को अन्त्यमा ㄹ भएकाले 은 लाग्छ।',
          ur: '오늘 کے آخر میں ㄹ ہے اس لیے 은 لگے گا۔',
        },
      },
    ],
  },
  {
    id: 'bg-3',
    tier: 'Beginner',
    patternKo: '이 / 가',
    title: {
      en: 'Subject Marker Particle (이 / 가)',
      bn: 'কর্তা বা সাবজেক্ট নির্দেশক পার্টিকেল (이 / 가)',
      ne: 'कर्ता कारक (이 / 가 - Subject Marker)',
      ur: 'فاعل ظاہر کرنے والا لاحقہ (이 / 가 - Subject Marker)',
    },
    formula: 'Consonant + 이 · Vowel + 가',
    whenToUse: {
      en: 'Marks the grammatical subject, especially before descriptive adjectives (좋다, 많다) or existential verbs (있다, 없다, 되다, 아니다).',
      bn: 'বাক্যের নির্দিষ্ট কর্তা এবং বিশেষ করে 있다, 없다, 좋다, 많다 এর আগে ব্যঞ্জনবর্ণে 이 ও স্বরবর্ণে 가 বসে।',
      ne: 'वाक्यको कर्ता र विशेष गरी 있다, 없다, 좋다, 많다 अगाडि व्यञ्जनमा 이 र स्वरमा 가 लाग्छ।',
      ur: 'جملے کے فاعل اور خاص طور پر 있다، 없다، 좋다، 많다 سے پہلے حرفِ صحیح کے ساتھ 이 اور واول کے ساتھ 가 لگتا ہے۔',
    },
    politeVsInformal: {
      en: 'Note: 저 + 가 becomes 제가 (polite "I") and 나 + 가 becomes 내가 (casual "I").',
      bn: 'মনে রাখুন: 저 + 가 মিলে 제가 এবং 나 + 가 মিলে 내가 হয়।',
      ne: 'ध्यान दिनुहोस्: 저 + 가 मिलेर 제가 र 나 + 가 मिलेर 내가 बन्छ।',
      ur: 'یاد رکھیں: 저 + 가 مل کر 제가 اور 나 + 가 مل کر 내가 بن جاتا ہے۔',
    },
    commonMistakes: {
      en: 'Never say 저가 or 나가 — always use 제가 or 내가.',
      bn: 'কখনোই 저가 বা 나가 বলবেন না — সবসময় 제가 বা 내가 বলুন।',
      ne: 'कहिल्यै 저가 वा 나가 नभन्नुहोस् — सधैं 제가 वा 내가 प्रयोग गर्नुहोस्।',
      ur: 'کبھی 저가 یا 나가 نہ کہیں بلکہ ہمیشہ 제가 یا 내가 استعمال کریں۔',
    },
    examples: [
      {
        ko: '질문이 있어요. 도서관이 어디에 있어요?',
        romanization: 'Jilmuni isseoyo. Doseogwani eodie isseoyo?',
        translation: {
          en: 'I have a question. Where is the library?',
          bn: 'আমার একটি প্রশ্ন আছে। লাইব্রেরি কোথায়?',
          ne: 'मेरो एउटा प्रश्न छ। पुस्तकालय कहाँ छ?',
          ur: 'میرا ایک سوال ہے۔ لائبریری کہاں ہے؟',
        },
        breakdown: {
          en: '질문 + 이 + 있어요 (have a question) · 도서관 + 이 + 어디에 있어요?',
          bn: '질문 + 이 (받침 থাকায় 이) + 있어요',
          ne: '질문 + 이 + 있어요',
          ur: '질문 + 이 + 있어요',
        },
      },
    ],
    practiceQuestions: [
      {
        prompt: {
          en: 'Choose the correct particle: 시간___ 없어요. (I do not have time.)',
          bn: 'সঠিক পার্টিকেল বেছে নিন: 시간___ 없어요.',
          ne: 'सही कारक छान्नुहोस्: 시간___ 없어요.',
          ur: 'درست لاحقہ منتخب کریں: 시간___ 없어요.',
        },
        options: ['이', '가', '을', '에'],
        correctIndex: 0,
        explanation: {
          en: '시간 ends with ㄴ (Batchim) and comes before 없어요, so 이 is used.',
          bn: '시간 শব্দের শেষে ㄴ থাকায় এবং 없어요 এর আগে বসায় 이 হবে।',
          ne: '시간 को अन्त्यमा ㄴ भएकाले 이 प्रयोग हुन्छ।',
          ur: '시간 کے آخر میں ㄴ ہے اور 없어요 سے پہلے 이 آتا ہے۔',
        },
      },
    ],
  },
  {
    id: 'bg-4',
    tier: 'Beginner',
    patternKo: '을 / 를',
    title: {
      en: 'Object Marker Particle (을 / 를)',
      bn: 'কর্ম বা অবজেক্ট নির্দেশক পার্টিকেল (을 / 를)',
      ne: 'कर्म कारक (을 / 를 - Object Marker)',
      ur: 'مفعول ظاہر کرنے والا لاحقہ (을 / 를 - Object Marker)',
    },
    formula: 'Consonant + 을 · Vowel + 를',
    whenToUse: {
      en: 'Marks the direct object of an action verb (eat, read, study, meet, buy).',
      bn: 'ক্রিয়াপদের সরাসরি কর্ম (কী খাই, কী পড়ি, কী কিনি) বোঝাতে ব্যঞ্জনবর্ণে 을 এবং স্বরবর্ণে 를 বসে।',
      ne: 'क्रियाको प्रत्यक्ष कर्म (के खाने, के पढ्ने, के किन्ने) बुझाउन व्यञ्जनमा 을 र स्वरमा 를 लाग्छ।',
      ur: 'فعل کے مفعول (کیا کھانا، کیا پڑھنا، کیا خریدنا) کے ساتھ حرفِ صحیح کے بعد 을 اور واول کے بعد 를 لگتا ہے۔',
    },
    politeVsInformal: {
      en: 'Often contracted to -ㄹ after vowels in spoken Korean (커피를 -> 커필).',
      bn: 'কথ্য ভাষায় স্বরবর্ণের পর সংক্ষেপে -ㄹ হতে পারে।',
      ne: 'बोलीचालीमा स्वर पछि छोटकरीमा -ㄹ हुन सक्छ।',
      ur: 'بول چال میں واول کے بعد مختصر ہو کر -ㄹ بن سکتا ہے۔',
    },
    commonMistakes: {
      en: 'Do not use 을/를 with descriptive adjectives like 좋다 or 많다 (use 이/가 instead).',
      bn: '좋다 বা 많다 এর মতো বিশেষণের সাথে 을/를 বসে না (সেখানে 이/가 বসে)।',
      ne: '좋다 वा 많다 जस्ता विशेषणसँग 을/를 प्रयोग नगर्नुहोस्।',
      ur: '좋다 یا 많다 جیسی صفات کے ساتھ 을/를 استعمال نہ کریں۔',
    },
    examples: [
      {
        ko: '매일 아침 한국어를 공부하고 커피를 마셔요.',
        romanization: 'Maeil achim hangugeoreul gongbuhago keopireul masyeoyo.',
        translation: {
          en: 'Every morning I study Korean and drink coffee.',
          bn: 'প্রতিদিন সকালে আমি কোরিয়ান ভাষা পড়ি এবং কফি পান করি।',
          ne: 'हरेक बिहान म कोरियन भाषा पढ्छु र कफी पिउँछु।',
          ur: 'ہر صبح میں کورین زبان پڑھتا ہوں اور کافی پیتا ہوں۔',
        },
        breakdown: {
          en: '한국어 + 를 공부하다 · 커피 + 를 마시다',
          bn: '한국어 + 를 (কোরিয়ান ভাষা) · 커피 + 를 (কফি)',
          ne: '한국어 + 를 · 커피 + 를',
          ur: '한국어 + 를 · 커피 + 를',
        },
      },
    ],
    practiceQuestions: [
      {
        prompt: {
          en: 'Choose the correct particle: 도서관에서 책___ 읽어요.',
          bn: 'সঠিক পার্টিকেল বেছে নিন: 도서관에서 책___ 읽어요.',
          ne: 'सही कारक छान्नुहोस्: 도서관에서 책___ 읽어요.',
          ur: 'درست لاحقہ منتخب کریں: 도서관에서 책___ 읽어요.',
        },
        options: ['을', '를', '이', '은'],
        correctIndex: 0,
        explanation: {
          en: '책 ends in ㄱ (Batchim) and is the direct object of 읽어요 (read), so 을 is required.',
          bn: '책 শব্দের শেষে ㄱ (받침) থাকায় কর্ম হিসেবে 을 বসবে।',
          ne: '책 को अन्त्यमा ㄱ भएकाले 을 लाग्छ।',
          ur: '책 کے آخر میں ㄱ ہے اس لیے مفعول کے طور پر 을 آئے گا۔',
        },
      },
    ],
  },
  {
    id: 'bg-5',
    tier: 'Beginner',
    patternKo: '에 / 에서',
    title: {
      en: 'Location, Time & Action Place Particles (에 vs 에서)',
      bn: 'স্থান, গন্তব্য ও সময় নির্দেশক পার্টিকেল (에 বনাম 에서)',
      ne: 'स्थान, गन्तव्य र समय कारक (에 बनाम 에서)',
      ur: 'مقام، منزل اور وقت ظاہر کرنے والے لاحقے (에 بمقابلہ 에서)',
    },
    formula: 'Place/Time + 에 (at/to/in) · Place + 에서 (at/in where an action happens, or from)',
    whenToUse: {
      en: 'Use 에 for static existence (있다/없다), destination (가다/오다), or time. Use 에서 for the location where a dynamic action (study, eat, work) takes place.',
      bn: 'থাকা (있다/없다), যাওয়া/আসা (가다/오다) বা সময়ের সাথে 에 বসে। কিন্তু কোনো স্থানে কাজ করা (পড়া, খাওয়া, চাকরি করা) বোঝালে 에서 বসে।',
      ne: 'रहनु (있다/없다), जानु/आउनु (가다/오다) वा समयमा 에 लाग्छ। तर कुनै ठाउँमा काम/क्रिया (पढ्नु, खानु) हुँदा 에서 लाग्छ।',
      ur: 'موجودگی (있다/없다)، جانے/آنے (가다/오다) یا وقت کے لیے 에 لگائیں۔ لیکن جس جگہ کوئی عمل (پڑھنا، کھانا، کام کرنا) ہو رہا ہو وہاں 에서 استعمال کریں۔',
    },
    politeVsInformal: {
      en: 'Same across all politeness levels.',
      bn: 'সকল স্তরে একই নিয়ম প্রযোজ্য।',
      ne: 'सबै तहमा एउटै नियम लागू हुन्छ।',
      ur: 'تمام درجات میں یکساں اصول ہے۔',
    },
    commonMistakes: {
      en: 'Saying 도서관에 공부해요 is incorrect — studying is an active verb, so say 도서관에서 공부해요.',
      bn: '도서관에 공부해요 বলা ভুল — পড়াশোনা একটি কাজ, তাই 도서관에서 공부해요 হবে।',
      ne: '도서관에 공부해요 भन्नु गलत हो — 도서관에서 공부해요 भन्नुपर्छ।',
      ur: '도서관에 공부해요 کہنا غلط ہے، درست جملہ 도서관에서 공부해요 ہے۔',
    },
    examples: [
      {
        ko: '오전 아홉 시에 대학교에 가요. 그리고 도서관에서 공부해요.',
        romanization: 'Ojeon ahop sie daehakgyoe gayo. Geurigo doseogwaneseo gongbuhaeyo.',
        translation: {
          en: 'I go to the university at 9 AM. And I study at the library.',
          bn: 'আমি সকাল ৯টায় বিশ্ববিদ্যালয়ে যাই। এবং লাইব্রেরিতে পড়াশোনা করি।',
          ne: 'म बिहान ९ बजे विश्वविद्यालय जान्छु। अनि पुस्तकालयमा पढ्छु।',
          ur: 'میں صبح نو بجے یونیورسٹی جاتا ہوں اور لائبریری میں پڑھائی کرتا ہوں۔',
        },
        breakdown: {
          en: '아홉 시 + 에 (time) · 대학교 + 에 가요 (destination) · 도서관 + 에서 공부해요 (action location)',
          bn: '아홉 시에 (সময়) · 대학교에 (গন্তব্য) · 도서관에서 (কাজের স্থান)',
          ne: '아홉 시에 (समय) · 대학교에 (गन्तव्य) · 도서관에서 (काम गर्ने ठाउँ)',
          ur: '아홉 시에 (وقت) · 대학교에 (منزل) · 도서관에서 (عمل کی جگہ)',
        },
      },
    ],
    practiceQuestions: [
      {
        prompt: {
          en: 'Choose the correct particle: 학생 식당____ 점심을 먹어요.',
          bn: 'সঠিক পার্টিকেল বেছে নিন: 학생 식당____ 점심을 먹어요.',
          ne: 'सही कारक छान्नुहोस्: 학생 식당____ 점심을 먹어요.',
          ur: 'درست لاحقہ منتخب کریں: 학생 식당____ 점심을 먹어요.',
        },
        options: ['에서', '에', '을', '는'],
        correctIndex: 0,
        explanation: {
          en: 'Eating lunch (먹어요) is an active action taking place at the cafeteria, so 에서 is used.',
          bn: 'দুপুরের খাবার খাওয়া একটি গতিশীল কাজ, তাই স্থানে 에서 বসবে।',
          ne: 'खाना खानु क्रिया भएकाले ठाउँमा 에서 लाग्छ।',
          ur: 'کھانا کھانا ایک عمل ہے اس لیے جگہ کے ساتھ 에서 آئے گا۔',
        },
      },
    ],
  },
  {
    id: 'bg-6',
    tier: 'Beginner',
    patternKo: '-아요 / -어요',
    title: {
      en: 'Present Tense Polite Ending (-아요 / -어요 / -해요)',
      bn: 'বর্তমান কালের ভদ্র সমাপিকা ক্রিয়া (-아요 / -어요 / -해요)',
      ne: 'वर्तमान कालको शिष्ट क्रिया रूप (-아요 / -어요 / -해요)',
      ur: 'فعلِ حال کا مؤدبانہ انداز (-아요 / -어요 / -해요)',
    },
    formula: 'ㅏ/ㅗ stem + -아요 · Other vowels + -어요 · 하다 verbs -> 해요',
    whenToUse: {
      en: 'Standard polite present tense used in 90% of daily conversations in Korea.',
      bn: 'দৈনন্দিন কোরিয়ান কথোপকথনে সবচেয়ে বেশি ব্যবহৃত ভদ্র বর্তমান কাল। ধাতুর শেষ স্বরবর্ণ ㅏ বা ㅗ হলে -아요, অন্য স্বরবর্ণ হলে -어요 এবং 하다 থাকলে 해요 হয়।',
      ne: 'दैनिक कोरियन कुराकानीमा सबैभन्दा बढी प्रयोग हुने शिष्ट वर्तमान काल। धातुको स्वर ㅏ/ㅗ भए -아요, अन्य स्वरमा -어요 र 하다 क्रियामा 해요 हुन्छ।',
      ur: 'روزمرہ کورین گفتگو میں سب سے زیادہ استعمال ہونے والا مؤدبانہ فعلِ حال۔ ㅏ یا ㅗ ہو تو -아요، دیگر واولز کے ساتھ -어요 اور 하다 ہو تو 해요 لگتا ہے۔',
    },
    politeVsInformal: {
      en: 'Formal: -습니다/-ㅂ니다 · Polite: -아요/-어요 · Casual: -아/-어',
      bn: 'ফরমাল: -습니다/-ㅂ니다 · ভদ্র: -아요/-어요 · ঘরোয়া: -아/-어',
      ne: 'औपचारिक: -습니다/-ㅂ니다 · शिष्ट: -아요/-어요 · सामान्य: -아/-어',
      ur: 'رسمی: -습니다/-ㅂ니다 · مؤدبانہ: -아요/-어요 · بے تکلف: -아/-어',
    },
    commonMistakes: {
      en: 'Contract vowels when there is no Batchim: 가 + 아요 -> 가요, 오 + 아요 -> 와요, 마시 + 어요 -> 마셔요.',
      bn: '받침 না থাকলে স্বরবর্ণ সংকুচিত হয়: 가+아요 -> 가요, 오+아요 -> 와요, 마시+어요 -> 마셔요।',
      ne: '받침 नहुँदा स्वर छोटिन्छ: 가+아요 -> 가요, 오+아요 -> 와요।',
      ur: 'جب Batchim نہ ہو تو واولز مل جاتے ہیں: 가+아요 -> 가요، 오+아요 -> 와요۔',
    },
    examples: [
      {
        ko: '저는 서울에 살아요. 매일 운동해요.',
        romanization: 'Jeoneun Seoure sarayo. Maeil undonghaeyo.',
        translation: {
          en: 'I live in Seoul. I exercise every day.',
          bn: 'আমি সিউলে থাকি। প্রতিদিন ব্যায়াম করি।',
          ne: 'म सियोलमा बस्छु। हरेक दिन व्यायाम गर्छु।',
          ur: 'میں سیول میں رہتا ہوں۔ روزانہ ورزش کرتا ہوں۔',
        },
        breakdown: {
          en: '살다 (stem vowel ㅏ) + 아요 -> 살아요 · 운동하다 -> 운동해요',
          bn: '살다 -> 살아요 · 운동하다 -> 운동해요',
          ne: '살다 -> 살아요 · 운동하다 -> 운동해요',
          ur: '살다 -> 살아요 · 운동하다 -> 운동해요',
        },
      },
    ],
    practiceQuestions: [
      {
        prompt: {
          en: 'Conjugate 먹다 (to eat) into polite present tense:',
          bn: '먹다 (খাওয়া) ক্রিয়াটির ভদ্র বর্তমান কালের রূপ কোনটি?',
          ne: '먹다 (खानु) क्रियाको शिष्ट वर्तमान रूप कुन हो?',
          ur: '먹다 (کھانا) کی مؤدبانہ فعلِ حال کی شکل کون سی ہے؟',
        },
        options: ['먹어요', '먹아요', '먹해요', '먹워요'],
        correctIndex: 0,
        explanation: {
          en: 'The stem 먹 has the vowel ㅓ (not ㅏ or ㅗ), so -어요 is added -> 먹어요.',
          bn: '먹 ধাতুতে ㅓ স্বরবর্ণ থাকায় -어요 যুক্ত হয়ে 먹어요 হয়েছে।',
          ne: '먹 धातुमा ㅓ स्वर भएकाले -어요 जोडिएर 먹어요 बन्छ।',
          ur: '먹 میں واول ㅓ ہے اس لیے -어요 لگ کر 먹어요 بنے گا۔',
        },
      },
    ],
  },
  {
    id: 'bg-7',
    tier: 'Beginner',
    patternKo: '-았어요 / -었어요',
    title: {
      en: 'Past Tense Polite Ending (-았어요 / -었어요 / -했어요)',
      bn: 'অতীত কালের ভদ্র ক্রিয়াপদ (-았어요 / -었어요 / -했어요)',
      ne: 'भूतकालको शिष्ट क्रिया रूप (-았어요 / -었어요 / -했어요)',
      ur: 'فعلِ ماضی کا مؤدبانہ انداز (-았어요 / -었어요 / -했어요)',
    },
    formula: 'ㅏ/ㅗ stem + -았어요 · Other vowels + -었어요 · 하다 -> 했어요',
    whenToUse: {
      en: 'Expresses completed actions or states in the past.',
      bn: 'অতীতে সম্পন্ন কোনো কাজ বা অবস্থা বোঝাতে ব্যবহৃত হয়।',
      ne: 'विगतमा पूरा भएको काम वा अवस्था जनाउन प्रयोग हुन्छ।',
      ur: 'ماضی میں مکمل ہونے والے کام یا حالت کو بیان کرنے کے لیے استعمال ہوتا ہے۔',
    },
    politeVsInformal: {
      en: 'Formal: -았습니다/-었습니다 · Polite: -았어요/-었어요 · Casual: -았어/-었어',
      bn: 'ফরমাল: -았습니다/-었습니다 · ভদ্র: -았어요/-었어요',
      ne: 'औपचारिक: -았습니다/-었습니다 · शिष्ट: -았어요/-었어요',
      ur: 'رسمی: -았습니다/-었습니다 · مؤدبانہ: -았어요/-었어요',
    },
    commonMistakes: {
      en: 'Remember vowel contractions: 가다 -> 갔어요, 오다 -> 왔어요, 마시다 -> 마셨어요.',
      bn: 'সংকুচিত রূপ মনে রাখুন: 가다 -> 갔어요, 오다 -> 왔어요, 마시다 -> 마셨어요।',
      ne: 'छोटकरी रूप सम्झनुहोस्: 가다 -> 갔어요, 오다 -> 왔어요।',
      ur: 'مختصر شکلیں یاد رکھیں: 가다 -> 갔어요، 오다 -> 왔어요۔',
    },
    examples: [
      {
        ko: '어제 친구하고 같이 한국 영화를 봤어요.',
        romanization: 'Eoje chinguhago gachi Hanguk yeonghwareul bwasseoyo.',
        translation: {
          en: 'Yesterday I watched a Korean movie together with my friend.',
          bn: 'গতকাল বন্ধুর সাথে একসাথে একটি কোরিয়ান সিনেমা দেখেছি।',
          ne: 'हिजो साथीसँग मिलेर कोरियन फिल्म हेरेँ।',
          ur: 'کل میں نے اپنے دوست کے ساتھ مل کر ایک کورین فلم دیکھی۔',
        },
        breakdown: {
          en: '보다 (to see/watch, vowel ㅗ) + 았어요 -> 봤어요',
          bn: '보다 + 았어요 -> 봤어요 (দেখেছি)',
          ne: '보다 + 았어요 -> 봤어요 (हेरेँ)',
          ur: '보다 + 았어요 -> 봤어요 (دیکھی)',
        },
      },
    ],
    practiceQuestions: [
      {
        prompt: {
          en: 'Choose the correct past tense form of 공부하다 (to study):',
          bn: '공부하다 (পড়াশোনা করা) এর অতীত কালের রূপ কোনটি?',
          ne: '공부하다 (पढ्नु) को भूतकाल रूप कुन हो?',
          ur: '공부하다 (پڑھائی کرنا) کی ماضی کی شکل کون سی ہے؟',
        },
        options: ['공부했어요', '공부았어요', '공부었어요', '공부하어요'],
        correctIndex: 0,
        explanation: {
          en: 'All 하다 verbs change to 했어요 in the past tense.',
          bn: 'সকল 하다 ক্রিয়া অতীত কালে 했어요 তে পরিবর্তিত হয়।',
          ne: 'सबै 하다 क्रिया भूतकालमा 했어요 मा परिवर्तन हुन्छन्।',
          ur: 'تمام 하다 والے افعال ماضی میں 했어요 بن جاتے ہیں۔',
        },
      },
    ],
  },
  {
    id: 'bg-8',
    tier: 'Beginner',
    patternKo: '-고 싶어요',
    title: {
      en: 'Expressing Desire: "Want to..." (-고 싶어요)',
      bn: 'ইচ্ছা প্রকাশ: "করতে চাই" (-고 싶어요)',
      ne: 'इच्छा व्यक्त गर्ने: "गर्न चाहन्छु" (-고 싶어요)',
      ur: 'خواہش کا اظہار: "کرنا چاہتا ہوں" (-고 싶어요)',
    },
    formula: 'Verb Stem + -고 싶어요 (Negative: -고 싶지 않아요)',
    whenToUse: {
      en: 'Attach directly to any action verb stem (regardless of Batchim) to say what you want to do or ask what someone wants to do.',
      bn: 'যেকোনো ক্রিয়ার মূল (Verb stem) এর সাথে সরাসরি -고 싶어요 যুক্ত করে নিজের ইচ্ছা ("খেতে চাই", "যেতে চাই") প্রকাশ করা হয়।',
      ne: 'कुनै पनि क्रियाको धातुमा सीधै -고 싶어요 जोडेर आफ्नो इच्छा ("खान चाहन्छु", "जान चाहन्छु") व्यक्त गरिन्छ।',
      ur: 'کسی بھی فعل کی جڑ (Verb stem) کے ساتھ براہِ راست -고 싶어요 لگا کر اپنی خواہش کا اظہار کیا جاتا ہے۔',
    },
    politeVsInformal: {
      en: 'For a 3rd person subject ("He/She wants to..."), use -고 싶어해요.',
      bn: 'তৃতীয় পুরুষের ইচ্ছা বোঝাতে -고 싶어해요 ব্যবহৃত হয়।',
      ne: 'तेस्रो व्यक्तिको इच्छा बताउँदा -고 싶어해요 प्रयोग गरिन्छ।',
      ur: 'تیسرے شخص کی خواہش بتانے کے لیے -고 싶어해요 استعمال ہوتا ہے۔',
    },
    commonMistakes: {
      en: 'Do not conjugate the verb before -고 싶어요: 가고 싶어요 (correct), 가요고 싶어요 (wrong).',
      bn: '-고 싶어요 এর আগে ক্রিয়া পরিবর্তন করবেন না: 가고 싶어요 (সঠিক)।',
      ne: '-고 싶어요 अगाडि धातु मात्र राख्नुहोस्: 가고 싶어요 (सही)।',
      ur: '-고 싶어요 سے پہلے صرف فعل کی اصل جڑ لگائیں: 가고 싶어요 (درست)۔',
    },
    examples: [
      {
        ko: '졸업 후에 한국 회사에서 일하고 싶어요.',
        romanization: 'Joreop hue Hanguk hoesaeseo ilhago sipeoyo.',
        translation: {
          en: 'After graduation, I want to work at a Korean company.',
          bn: 'গ্র্যাজুয়েশনের পর আমি একটি কোরিয়ান কোম্পানিতে কাজ করতে চাই।',
          ne: 'स्नातक पछि म कोरियन कम्पनीमा काम गर्न चाहन्छु।',
          ur: 'گریجویشن کے بعد میں ایک کورین کمپنی میں کام کرنا چاہتا ہوں۔',
        },
        breakdown: {
          en: '일하다 (work) -> stem 일하 + 고 싶어요 (want to work)',
          bn: '일하 (কাজ করা) + 고 싶어요 (করতে চাই)',
          ne: '일하 + 고 싶어요 (काम गर्न चाहन्छु)',
          ur: '일하 + 고 싶어요 (کام کرنا چاہتا ہوں)',
        },
      },
    ],
    practiceQuestions: [
      {
        prompt: {
          en: 'How do you say "I want to eat Korean food"?',
          bn: '"আমি কোরিয়ান খাবার খেতে চাই" — সঠিক বাক্য কোনটি?',
          ne: '"म कोरियन खाना खान चाहन्छु" — सही वाक्य कुन हो?',
          ur: '"میں کورین کھانا کھانا چاہتا ہوں" — درست جملہ کون سا ہے؟',
        },
        options: ['한국 음식을 먹고 싶어요.', '한국 음식을 먹어요 싶어요.', '한국 음식을 먹은 싶어요.', '한국 음식을 먹기 싶어요.'],
        correctIndex: 0,
        explanation: {
          en: 'Verb stem 먹 + 고 싶어요 = 먹고 싶어요.',
          bn: '먹 ধাতুর সাথে সরাসরি -고 싶어요 যুক্ত হয়ে 먹고 싶어요 হয়।',
          ne: '먹 धातुमा -고 싶어요 जोडिएर 먹고 싶어요 हुन्छ।',
          ur: '먹 کے ساتھ براہِ راست -고 싶어요 لگ کر 먹고 싶어요 بنتا ہے۔',
        },
      },
    ],
  },
  {
    id: 'bg-9',
    tier: 'Beginner',
    patternKo: '안 / -지 않아요',
    title: {
      en: 'Negation: "Do not / Is not" (안 vs -지 않아요)',
      bn: 'না-বোধক বাক্য গঠন (안 বনাম -지 않아요)',
      ne: 'नकारात्मक वाक्य (안 बनाम -지 않아요)',
      ur: 'منفی جملے بنانا (안 بمقابلہ -지 않아요)',
    },
    formula: '안 + Verb/Adj · Verb/Adj Stem + -지 않아요',
    whenToUse: {
      en: 'Place 안 immediately before the verb (for Noun+하다 verbs, put 안 between the noun and 하다: 공부 안 해요), or attach -지 않아요 to the verb stem.',
      bn: 'ক্রিয়ার আগে 안 বসিয়ে (Noun+하다 ক্রিয়ার ক্ষেত্রে মাঝখানে: 공부 안 해요) অথবা ধাতুর শেষে -지 않아요 যুক্ত করে না-বোধক বাক্য তৈরি করা হয়।',
      ne: 'क्रियाको अगाडि 안 राखेर वा धातुमा -지 않아요 जोडेर नकारात्मक वाक्य बनाइन्छ।',
      ur: 'فعل سے پہلے 안 لگا کر یا فعل کی جڑ کے بعد -지 않아요 لگا کر منفی جملہ بنایا جاتا ہے۔',
    },
    politeVsInformal: {
      en: '-지 않아요 sounds slightly more formal and written than 안.',
      bn: 'কথ্য ভাষায় 안 এবং লিখিত বা মার্জিত ভাষায় -지 않아요 বেশি ব্যবহৃত হয়।',
      ne: 'बोलीचालीमा 안 र लेखाइमा -지 않아요 बढी प्रयोग हुन्छ।',
      ur: 'بول چال میں 안 اور تحریر میں -지 않아요 زیادہ استعمال ہوتا ہے۔',
    },
    commonMistakes: {
      en: 'Do not say 안 공부해요 — split Noun+하다 verbs into 공부를 안 해요 or 공부하지 않아요.',
      bn: '안 공부해요 বলা ভুল — সবসময় 공부 안 해요 বা 공부하지 않아요 বলুন।',
      ne: '안 공부해요 नभन्नुहोस् — 공부 안 해요 वा 공부하지 않아요 भन्नुहोस्।',
      ur: '안 공부해요 نہ کہیں بلکہ 공부 안 해요 یا 공부하지 않아요 کہیں۔',
    },
    examples: [
      {
        ko: '이 음식은 맵지 않아요. 전혀 안 매워요.',
        romanization: 'I eumsigeun maepji anayo. Jeonhyeo an maewoyo.',
        translation: {
          en: 'This food is not spicy. It is not spicy at all.',
          bn: 'এই খাবারটি ঝাল নয়। একদমই ঝাল না।',
          ne: 'यो खाना पिरो छैन। बिल्कुलै पिरो छैन।',
          ur: 'یہ کھانا تیکھا (مرچوں والا) نہیں ہے۔ بالکل بھی تیکھا نہیں ہے۔',
        },
        breakdown: {
          en: '맵다 (spicy) -> 맵지 않아요 = 안 매워요',
          bn: '맵다 -> 맵지 않아요 / 안 매워요',
          ne: '맵다 -> 맵지 않아요 / 안 매워요',
          ur: '맵다 -> 맵지 않아요 / 안 매워요',
        },
      },
    ],
    practiceQuestions: [
      {
        prompt: {
          en: 'Which sentence is grammatically correct?',
          bn: 'নিচের কোন বাক্যটি ব্যাকরণগতভাবে সঠিক?',
          ne: 'तलका मध्ये कुन वाक्य व्याकरणগত रूपमा सही छ?',
          ur: 'درج ذیل میں سے کون سا جملہ گرامر کے لحاظ سے درست ہے؟',
        },
        options: ['오늘 운동을 안 해요.', '오늘 안 운동해요.', '오늘 운동해요 않아요.', '오늘 운동안하다요.'],
        correctIndex: 0,
        explanation: {
          en: 'In Noun+하다 verbs like 운동하다, 안 must be placed right before 해요 -> 운동을 안 해요.',
          bn: '운동하다 এর ক্ষেত্রে 안 অবশ্যই 해요 এর আগে বসবে -> 운동을 안 해요।',
          ne: '운동하다 मा 안 सधैं 해요 अगाडि आउँछ -> 운동을 안 해요।',
          ur: '운동하다 جیسے افعال میں 안 کو 해요 سے پہلے رکھا جاتا ہے -> 운동을 안 해요۔',
        },
      },
    ],
  },
  {
    id: 'bg-10',
    tier: 'Beginner',
    patternKo: '-(으)ㄹ 수 있어요 / 없어요',
    title: {
      en: 'Ability & Possibility: "Can / Cannot" (-(으)ㄹ 수 있다/없다)',
      bn: 'সক্ষমতা ও সম্ভাবনা: "পারি / পারি না" (-(으)ㄹ 수 있어요/없어요)',
      ne: 'क्षमता र सम्भावना: "सक्छु / सक्दिन" (-(으)ㄹ 수 있어요/없어요)',
      ur: 'قابلیت اور امکان: "کر سکتا ہوں / نہیں کر سکتا" (-(으)ㄹ 수 있어요/없어요)',
    },
    formula: 'Vowel/ㄹ Stem + -ㄹ 수 있어요/없어요 · Consonant Stem + -을 수 있어요/없어요',
    whenToUse: {
      en: 'Expresses whether someone has the ability or situational possibility to do something.',
      bn: 'কোনো কাজ করার সক্ষমতা বা পরিস্থিতিগত সম্ভাবনা আছে কি না তা বোঝাতে ব্যবহৃত হয়।',
      ne: 'कुनै काम गर्ने क्षमता वा सम्भावना छ कि छैन भनी बुझाउन प्रयोग हुन्छ।',
      ur: 'کسی کام کو کرنے کی صلاحیت یا امکان ظاہر کرنے کے لیے استعمال ہوتا ہے۔',
    },
    politeVsInformal: {
      en: 'Short spoken alternative for cannot: 못 + Verb (e.g., 못 가요 = 갈 수 없어요).',
      bn: 'না পারার সংক্ষিপ্ত কথ্য রূপ: 못 + ক্রিয়া (যেমন: 못 가요 = 갈 수 없어요)।',
      ne: 'नसक्ने छोटकरी रूप: 못 + क्रिया (जस्तै: 못 가요 = 갈 수 없어요)।',
      ur: 'نہ کر سکنے کی مختصر شکل: 못 + فعل (جیسے: 못 가요 = 갈 수 없어요)۔',
    },
    commonMistakes: {
      en: 'If the verb stem already ends in ㄹ (like 만들다 or 살다), just add 수 있어요 -> 만들 수 있어요.',
      bn: 'ধাতুর শেষে আগে থেকেই ㄹ থাকলে (যেমন: 만들다) শুধু 수 있어요 যুক্ত হয় -> 만들 수 있어요।',
      ne: 'धातुको अन्त्यमा ㄹ भए (जस्तै: 만들다) सीधै 수 있어요 थपिन्छ -> 만들 수 있어요।',
      ur: 'اگر فعل کے آخر میں پہلے ہی ㄹ ہو (جیسے: 만들다) تو صرف 수 있어요 لگائیں -> 만들 수 있어요۔',
    },
    examples: [
      {
        ko: '저는 한글을 읽을 수 있어요.',
        romanization: 'Jeoneun Hangeureul ilgeul su isseoyo.',
        translation: {
          en: 'I can read Hangul.',
          bn: 'আমি হানগুল পড়তে পারি।',
          ne: 'म हंगुल पढ्न सक्छु।',
          ur: 'میں ہنگُل پڑھ سکتا ہوں۔',
        },
        breakdown: {
          en: '읽다 (ends in consonant ㄺ) + 을 수 있어요 -> 읽을 수 있어요',
          bn: '읽다 + 을 수 있어요 (পড়তে পারি)',
          ne: '읽다 + 을 수 있어요 (पढ्न सक्छु)',
          ur: '읽다 + 을 수 있어요 (پڑھ سکتا ہوں)',
        },
      },
    ],
    practiceQuestions: [
      {
        prompt: {
          en: 'Choose the correct form: 한국 음식을 만_____. (I can make Korean food.)',
          bn: 'সঠিক রূপটি বেছে নিন: 한국 음식을 만_____.',
          ne: 'सही रूप छान्नुहोस्: 한국 음식을 만_____.',
          ur: 'درست شکل منتخب کریں: 한국 음식을 만_____.',
        },
        options: ['들 수 있어요', '들을 수 있어요', '들고 수 있어요', '드는 수 있어요'],
        correctIndex: 0,
        explanation: {
          en: '만들다 already ends in ㄹ, so it becomes 만들 수 있어요.',
          bn: '만들다 ধাতুর শেষে ㄹ থাকায় 만들 수 있어요 হবে।',
          ne: '만들다 को अन्त्यमा ㄹ भएकाले 만들 수 있어요 हुन्छ।',
          ur: '만들다 کے آخر میں ㄹ پہلے سے موجود ہے اس لیے 만들 수 있어요 بنے گا۔',
        },
      },
    ],
  },
  {
    id: 'bg-11',
    tier: 'Beginner',
    patternKo: '-고',
    title: {
      en: 'Connecting Clauses: "And / And then" (-고)',
      bn: 'দুটি বাক্য যুক্ত করা: "এবং / তারপর" (-고)',
      ne: 'वाक्य जोड्ने: "र / अनि" (-고)',
      ur: 'دو جملوں کو جوڑنا: "اور / پھر" (-고)',
    },
    formula: 'Verb/Adjective Stem + -고',
    whenToUse: {
      en: 'Links two actions or descriptions together ("and") or shows sequential actions ("do A and then do B").',
      bn: 'দুটি কাজ বা বর্ণনাকে "এবং" অর্থে যুক্ত করতে কিংবা একটি কাজ শেষ করে আরেকটি কাজ করা বোঝাতে ধাতুর সাথে -고 বসে।',
      ne: 'दुई काम वा विवरणलाई "र / अनि" ले जोड्न धातुमा -고 प्रयोग गरिन्छ।',
      ur: 'دو کاموں یا باتوں کو "اور / اس کے بعد" کے معنی میں جوڑنے کے لیے فعل کے ساتھ -고 لگاتے ہیں۔',
    },
    politeVsInformal: {
      en: 'Tense (past/future) is usually marked only on the final verb of the sentence.',
      bn: 'কাল (অতীত/ভবিষ্যৎ) সাধারণত বাক্যের শেষ ক্রিয়াপদে যুক্ত হয়।',
      ne: 'काल सामान्यतया वाक्यको अन्तिम क्रियामा मात्र राखिन्छ।',
      ur: 'زمانہ (ماضی یا مستقبل) عموماً جملے کے آخری فعل پر لگایا جاتا ہے۔',
    },
    commonMistakes: {
      en: 'Use 하고/랑 to link nouns, and -고 to link verbs/adjectives.',
      bn: 'বিশেষ্য (Noun) যুক্ত করতে 하고/랑 এবং ক্রিয়া যুক্ত করতে -고 ব্যবহৃত হয়।',
      ne: 'नाम जोड्न 하고/랑 र क्रिया जोड्न -고 प्रयोग हुन्छ।',
      ur: 'اسم کو جوڑنے کے لیے 하고/랑 اور فعل کو جوڑنے کے لیے -고 استعمال کریں۔',
    },
    examples: [
      {
        ko: '손을 씻고 저녁을 먹었어요.',
        romanization: 'Soneul ssitgo jeonyeogeul meogeosseoyo.',
        translation: {
          en: 'I washed my hands and ate dinner.',
          bn: 'আমি হাত ধুয়ে রাতের খাবার খেয়েছি।',
          ne: 'मैले हात धोएँ र बेलुकाको खाना खाएँ।',
          ur: 'میں نے ہاتھ دھوئے اور رات کا کھانا کھایا۔',
        },
        breakdown: {
          en: '씻다 (wash) + 고 (and then) + 먹었어요 (ate)',
          bn: '씻고 (ধুয়ে) + 먹었어요 (খেয়েছি)',
          ne: '씻고 (धोएर) + 먹었어요 (खाएँ)',
          ur: '씻고 (دھو کر) + 먹었어요 (کھایا)',
        },
      },
    ],
    practiceQuestions: [
      {
        prompt: {
          en: 'Connect the two clauses: 숙제를 하다 + 자다',
          bn: 'যুক্ত করুন: 숙제를 하다 + 자다',
          ne: 'जोड्नुहोस्: 숙제를 하다 + 자다',
          ur: 'ان دو افعال کو جوڑیں: 숙제를 하다 + 자다',
        },
        options: ['숙제를 하고 자요.', '숙제를 한고 자요.', '숙제를 해고 자요.', '숙제를 하서 자요.'],
        correctIndex: 0,
        explanation: {
          en: 'Attach -고 directly to the verb stem 하 -> 숙제를 하고 자요.',
          bn: '하 ধাতুর সাথে সরাসরি -고 যুক্ত হয়ে 하고 হয়।',
          ne: '하 धातुमा सीधै -고 जोडिएर 하고 हुन्छ।',
          ur: '하 کے ساتھ براہِ راست -고 لگ کر 하고 بنتا ہے۔',
        },
      },
    ],
  },
  {
    id: 'bg-12',
    tier: 'Beginner',
    patternKo: '-지만',
    title: {
      en: 'Contrastive Connector: "But / Although" (-지만)',
      bn: 'বিপরীত বা তুলনামূলক সংযোজক: "কিন্তু / যদিও" (-지만)',
      ne: 'विपरीत संयोजक: "तर / यद्यपि" (-지만)',
      ur: 'تضاد ظاہر کرنے والا رابطہ: "لیکن / اگرچہ" (-지만)',
    },
    formula: 'Verb/Adjective Stem + -지만 (Past: -았/었지만)',
    whenToUse: {
      en: 'Connects two contrasting clauses within a single sentence.',
      bn: 'দুটি বিপরীতধর্মী বাক্যাংশকে "কিন্তু" অর্থে যুক্ত করতে ধাতুর সাথে -지만 বসে।',
      ne: 'दुई विपरीत भनाइलाई "तर" ले जोड्न धातुमा -지만 लाग्छ।',
      ur: 'دو متضاد جملوں کو "لیکن" کے ساتھ ملانے کے لیے فعل کے ساتھ -지만 لگتا ہے۔',
    },
    politeVsInformal: {
      en: 'Works identically across all speech levels.',
      bn: 'সব ধরনের বাক্যে একইভাবে বসে।',
      ne: 'सबै तहका वाक्यमा समान रूपमा प्रयोग हुन्छ।',
      ur: 'ہر قسم کے جملوں میں یکساں استعمال ہوتا ہے۔',
    },
    commonMistakes: {
      en: 'For nouns, attach 이지만 (after consonant) or 지만 (after vowel).',
      bn: 'বিশেষ্যের পর ব্যঞ্জনবর্ণ থাকলে 이지만 এবং স্বরবর্ণ থাকলে 지만 বসে।',
      ne: 'नाम पछि व्यञ्जन भए 이지만 र स्वर भए 지만 लाग्छ।',
      ur: 'اسم کے بعد حرفِ صحیح ہو تو 이지만 اور واول ہو تو 지만 لگائیں۔',
    },
    examples: [
      {
        ko: '기숙사 방이 작지만 아주 깨끗해요.',
        romanization: 'Gisuksa bang-i jakjiman aju kkaekkeuthaeyo.',
        translation: {
          en: 'The dormitory room is small, but very clean.',
          bn: 'ডরমিটরির রুমটি ছোট, কিন্তু খুব পরিষ্কার।',
          ne: 'होस्टेलको कोठा सानो छ, तर निकै सफा छ।',
          ur: 'ہاسٹل کا کمرہ چھوٹا ہے لیکن بہت صاف ستھرا ہے۔',
        },
        breakdown: {
          en: '작다 (small) + 지만 (but) + 깨끗해요 (is clean)',
          bn: '작다 (ছোট) + 지만 (কিন্তু) + 깨끗해요 (পরিষ্কার)',
          ne: '작다 + 지만 + 깨끗해요',
          ur: '작다 + 지만 + 깨끗해요',
        },
      },
    ],
    practiceQuestions: [
      {
        prompt: {
          en: 'Choose the best connector: 비가 오____ 학교에 가요. (It is raining, but I go to school.)',
          bn: 'সঠিক সংযোজক বেছে নিন: 비가 오____ 학교에 가요.',
          ne: 'सही संयोजक छान्नुहोस्: 비가 오____ 학교에 가요.',
          ur: 'درست رابطہ منتخب کریں: 비가 오____ 학교에 가요.',
        },
        options: ['지만', '고 싶어요', '을 수 있어요', '아서'],
        correctIndex: 0,
        explanation: {
          en: '오다 + 지만 = 오지만 ("It rains, but...").',
          bn: '오다 + 지만 = 오지만 ("বৃষ্টি হচ্ছে, কিন্তু...")।',
          ne: '오다 + 지만 = 오지만 ("पानी पर्दैछ, तर...")।',
          ur: '오다 + 지만 = 오지만 ("بارش ہو رہی ہے لیکن...")۔',
        },
      },
    ],
  },
  {
    id: 'bg-13',
    tier: 'Beginner',
    patternKo: '-아서 / -어서',
    title: {
      en: 'Cause, Reason & Sequence: "Because / So" (-아서 / -어서 / -해서)',
      bn: 'কারণ ও ধারাবাহিকতা: "কারণে / তাই / করে" (-아서 / -어서 / -해서)',
      ne: 'कारण र क्रम: "भएर / त्यसैले" (-아서 / -어서 / -해서)',
      ur: 'وجہ اور ترتیب: "کیونکہ / اس لیے" (-아서 / -어서 / -해서)',
    },
    formula: 'ㅏ/ㅗ stem + -아서 · Other vowels + -어서 · 하다 -> 해서',
    whenToUse: {
      en: 'Expresses a natural cause/reason ("because...") or closely linked sequential actions ("go to the library and study there").',
      bn: 'সাধারণ কারণ ("কারণে/তাই") অথবা ঘনিষ্ঠভাবে সম্পর্কিত দুটি কাজের ধারাবাহিকতা বোঝাতে ব্যবহৃত হয়।',
      ne: 'सामान्य कारण ("भएर/त्यसैले") वा क्रमिक काम जनाउन प्रयोग हुन्छ।',
      ur: 'قدرتی وجہ ("کیونکہ/اس لیے") یا ایک دوسرے سے جڑے ہوئے دو کاموں کی ترتیب بتانے کے لیے استعمال ہوتا ہے۔',
    },
    politeVsInformal: {
      en: 'Commonly used in polite apologies/thanks: 늦어서 죄송합니다 (Sorry for being late).',
      bn: 'ক্ষমা বা ধন্যবাদ জানাতে খুব ব্যবহৃত হয়: 늦어서 죄송합니다 (দেরি হওয়ায় দুঃখিত)।',
      ne: 'माफी वा धन्यवाद दिँदा धेरै प्रयोग हुन्छ: 늦어서 죄송합니다 (ढिलो भएकोमा माफ गर्नुहोस्)।',
      ur: 'معذرت یا شکریہ ادا کرنے میں بہت عام ہے: 늦어서 죄송합니다 (دیر ہونے پر معذرت خواہ ہوں)۔',
    },
    commonMistakes: {
      en: 'Important TOPIK rule! You CANNOT put past tense (-았/었-) before -아서/어서, and the second clause CANNOT be an imperative (-세요) or suggestion (-자/까요).',
      bn: 'গুরুত্বপূর্ণ নিয়ম! -아서/어서 এর আগে অতীত কাল (-았/었-) বসে না এবং পরের বাক্যে আদেশ (-세요) বা প্রস্তাব (-까요) ব্যবহার করা যায় না।',
      ne: 'महत्त्वपूर्ण नियम! -아서/어서 अगाडि भूतकाल (-았/었-) लाग्दैन र पछाडि आदेश (-세요) प्रयोग हुँदैन।',
      ur: 'اہم اصول! -아서/어서 سے پہلے ماضی (-았/었-) نہیں لگتا اور دوسرے حصے میں حکم (-세요) یا تجویز استعمال نہیں ہو سکتی۔',
    },
    examples: [
      {
        ko: '배가 아파서 병원에 갔어요.',
        romanization: 'Baega apaseo byeongwone gasseoyo.',
        translation: {
          en: 'My stomach hurt, so I went to the hospital.',
          bn: 'পেট ব্যথা করায় আমি হাসপাতালে গিয়েছিলাম।',
          ne: 'पेट दुखेर म अस्पताल गएँ।',
          ur: 'پیٹ میں درد تھا اس لیے میں ہسپتال گیا۔',
        },
        breakdown: {
          en: '아프다 (hurt) -> 아파서 (present stem!) + 병원에 갔어요 (past tense at the end)',
          bn: '아파서 (ব্যথা করায়) + 병원에 갔어요 (হাসপাতালে গিয়েছিলাম)',
          ne: '아파서 (दुखेर) + 병원에 갔어요 (अस्पताल गएँ)',
          ur: '아파서 (درد ہونے کی وجہ سے) + 병원에 갔어요 (ہسپتال گیا)',
        },
      },
    ],
    practiceQuestions: [
      {
        prompt: {
          en: 'Which sentence is CORRECT?',
          bn: 'কোন বাক্যটি ব্যাকরণগতভাবে সঠিক?',
          ne: 'कुन वाक्य व्याकरणগত रूपमा सही छ?',
          ur: 'کون سا جملہ گرامر کے لحاظ سے درست ہے؟',
        },
        options: [
          '바빠서 못 만났어요.',
          '바빴어서 못 만났어요.',
          '바빠서 내일 만나세요.',
          '바빠서 같이 갑시다.',
        ],
        correctIndex: 0,
        explanation: {
          en: '-아서/어서 never takes -았/었- before it, and cannot be followed by commands/suggestions.',
          bn: '-아서/어서 এর আগে অতীত কাল বসে না, তাই 바빠서 못 만났어요 সঠিক।',
          ne: '-아서/어서 अगाडि भूतकाल नलाग्ने हुँदा 바빠서 못 만났어요 सही हो।',
          ur: '-아서/어서 سے پہلے ماضی نہیں آتا اس لیے 바빠서 못 만났어요 درست ہے۔',
        },
      },
    ],
  },

  // ================= INTERMEDIATE GRAMMAR (9 Topics) =================
  {
    id: 'ig-1',
    tier: 'Intermediate',
    patternKo: '-(으)니까',
    title: {
      en: 'Subjective Reason & Discovery: "Since / Because" (-(으)니까)',
      bn: 'কারণ ও আবিষ্কার (আদেশ/প্রস্তাবসহ): "যেহেতু / কারণ" (-(으)니까)',
      ne: 'कारण र अनुरोध: "भएकाले / किनकि" (-(으)니까)',
      ur: 'وجہ اور حکم/تجویز: "چونکہ / اس لیے" (-(으)니까)',
    },
    formula: 'Vowel/ㄹ + -니까 · Consonant + -으니까',
    whenToUse: {
      en: 'Expresses a reason when the second clause is a command (-세요), suggestion (-읍시다/까요?), or when stating a personal justification.',
      bn: 'পরের বাক্যে আদেশ (-세요), অনুরোধ বা প্রস্তাব (-까요?) থাকলে কারণ বোঝাতে অবশ্যই -(으)니까 ব্যবহৃত হয়।',
      ne: 'पछाडिको वाक्यमा आदेश (-세요) वा प्रस्ताव (-까요?) हुँदा कारण देखाउन -(으)니까 प्रयोग हुन्छ।',
      ur: 'جب جملے کے دوسرے حصے میں حکم (-세요) یا تجویز (-까요) ہو تو وجہ بتانے کے لیے -(으)니까 استعمال ہوتا ہے۔',
    },
    politeVsInformal: {
      en: 'Can take past tense before it (-았/었으니까).',
      bn: 'এর আগে অতীত কাল (-았/었으니까) বসতে পারে।',
      ne: 'यसको अगाडि भूतकाल (-았/었으니까) लाग्न सक्छ।',
      ur: 'اس سے پہلے فعلِ ماضی (-았/었으니까) آ سکتا ہے۔',
    },
    commonMistakes: {
      en: 'Do not use -(으)니까 in formal greetings/apologies (say 반가워서/죄송해서, not 반가우니까).',
      bn: 'ধন্যবাদ বা দুঃখ প্রকাশের সৌজন্যমূলক বাক্যে -(으)니까 বসে না (সেখানে -아서/어서 বসে)।',
      ne: 'अभिवादन वा माफी माग्दा -(으)니까 प्रयोग नगर्नुहोस्।',
      ur: 'شکریہ یا معذرت کے رسمی جملوں میں -(으)니까 استعمال نہ کریں۔',
    },
    examples: [
      {
        ko: '밖이 추우니까 따뜻한 옷을 입으세요.',
        romanization: 'Bakki chuuunikka ttatteuthan oseul ibeuseyo.',
        translation: {
          en: 'Since it is cold outside, please wear warm clothes.',
          bn: 'যেহেতু বাইরে ঠান্ডা, তাই গরম পোশাক পরুন।',
          ne: 'बाहिर जाडो भएकाले न्यानो लुगा लगाउनुहोस्।',
          ur: 'چونکہ باہر سردی ہے، اس لیے گرم کپڑے پہنیں۔',
        },
        breakdown: {
          en: '춥다 (ㅂ irregular -> 추우) + 니까 + 입으세요 (imperative)',
          bn: '춥다 -> 추우니까 + 입으세요 (আদেশ/অনুরোধ)',
          ne: '춥다 -> 추우니까 + 입으세요',
          ur: '춥다 -> 추우니까 + 입으세요',
        },
      },
    ],
    practiceQuestions: [
      {
        prompt: {
          en: 'Choose the right form before a suggestion: 시간이 없_____ 택시를 탈까요?',
          bn: 'প্রস্তাবমূলক বাক্যের আগে সঠিক রূপটি বেছে নিন: 시간이 없_____ 택시를 탈까요?',
          ne: 'प्रस्ताव वाक्य अगाडि सही रूप छान्नुहोस्: 시간이 없_____ 택시를 탈까요?',
          ur: 'تجویز والے جملے سے پہلے درست شکل منتخب کریں: 시간이 없_____ 택시를 탈까요?',
        },
        options: ['으니까', '어서', '지만', '고'],
        correctIndex: 0,
        explanation: {
          en: 'Because the main clause is a suggestion (-ㄹ까요?), -(으)니까 must be used.',
          bn: 'পরের অংশে প্রস্তাব (-ㄹ까요?) থাকায় 없으니까 বসবে।',
          ne: 'पछाडि प्रस्ताव (-ㄹ까요?) भएकाले 없으니까 प्रयोग हुन्छ।',
          ur: 'آخر میں تجویز (-ㄹ까요?) ہے اس لیے 없으니까 آئے گا۔',
        },
      },
    ],
  },
  {
    id: 'ig-2',
    tier: 'Intermediate',
    patternKo: '-(으)면서',
    title: {
      en: 'Simultaneous Actions: "While doing..." (-(으)면서)',
      bn: 'একই সময়ে দুটি কাজ করা: "করতে করতে" (-(으)면서)',
      ne: 'एकै समयमा दुई काम: "गर्दै / सँगसँगै" (-(으)면서)',
      ur: 'بیک وقت دو کام کرنا: "کرتے ہوئے" (-(으)면서)',
    },
    formula: 'Vowel/ㄹ + -면서 · Consonant + -으면서',
    whenToUse: {
      en: 'Used when the SAME person performs two actions at the same time.',
      bn: 'একই ব্যক্তি একই সময়ে দুটি কাজ একসাথে করছে বোঝাতে ব্যবহৃত হয়।',
      ne: 'एउटै व्यक्तिले एकै समयमा दुई काम गर्दा प्रयोग हुन्छ।',
      ur: 'جب ایک ہی شخص ایک ہی وقت میں دو کام اکٹھے کرے تو استعمال ہوتا ہے۔',
    },
    politeVsInformal: {
      en: 'The subject of both clauses must be identical.',
      bn: 'উভয় অংশের কর্তা একই ব্যক্তি হতে হবে।',
      ne: 'दुवै वाक्यको कर्ता एउटै हुनुपर्छ।',
      ur: 'دونوں حصوں کا فاعل ایک ہی شخص ہونا چاہیے۔',
    },
    commonMistakes: {
      en: 'If two different people do actions simultaneously, use -는 동안 instead of -(으)면서.',
      bn: 'দুজন ভিন্ন ব্যক্তি আলাদা কাজ করলে -(으)면서 না বসে -는 동안 বসে।',
      ne: 'दुई फरक व्यक्ति भए -는 동안 प्रयोग गर्नुहोस्।',
      ur: 'اگر دو مختلف افراد کام کر رہے ہوں تو -(으)면서 کے بجائے -는 동안 لگائیں۔',
    },
    examples: [
      {
        ko: '한국 대학교에 다니면서 아르바이트를 해요.',
        romanization: 'Hanguk daehakgyoe danimyeonseo areubaiteureul haeyo.',
        translation: {
          en: 'I work a part-time job while attending a Korean university.',
          bn: 'কোরিয়ান বিশ্ববিদ্যালয়ে পড়াশোনার পাশাপাশি আমি পার্ট-টাইম কাজ করি।',
          ne: 'कोरियन विश्वविद्यालयमा पढ्दै म पार्ट-टाइम काम गर्छु।',
          ur: 'میں کورین یونیورسٹی میں پڑھنے کے ساتھ ساتھ پارٹ ٹائم ملازمت کرتا ہوں۔',
        },
        breakdown: {
          en: '다니다 (attend) + 면서 (while) + 아르바이트를 해요',
          bn: '다니다 + 면서 (পড়ার পাশাপাশি)',
          ne: '다니다 + 면서 (पढ्दै)',
          ur: '다니다 + 면서 (پڑھتے ہوئے)',
        },
      },
    ],
    practiceQuestions: [
      {
        prompt: {
          en: 'Fill in the blank: 음악을 들_____ 산책해요. (I take a walk while listening to music.)',
          bn: 'শূন্যস্থান পূরণ করুন: 음악을 들_____ 산책해요.',
          ne: 'खाली ठाउँ भर्नुहोस्: 음악을 들_____ 산책해요.',
          ur: 'خالی جگہ پر کریں: 음악을 들_____ 산책해요.',
        },
        options: ['으면서', '면서', '으니까', '어서'],
        correctIndex: 0,
        explanation: {
          en: '듣다 is a ㄷ-irregular verb (듣 -> 들 before a vowel) -> 들으면서.',
          bn: '듣다 অনিয়মিত ক্রিয়াটি স্বরবর্ণের আগে 들 হয়ে 들으면서 হয়।',
          ne: '듣다 क्रिया स्वर अगाडि 들 बनेर 들으면서 हुन्छ।',
          ur: '듣다 بے قاعدہ فعل واول سے پہلے 들 بن کر 들으면서 ہو جاتا ہے۔',
        },
      },
    ],
  },
  {
    id: 'ig-3',
    tier: 'Intermediate',
    patternKo: '-기 때문에',
    title: {
      en: 'Clear Objective Reason: "Because of..." (-기 때문에)',
      bn: 'স্পষ্ট ও সুনির্দিষ্ট কারণ: "কারণে / জন্য" (-기 때문에)',
      ne: 'स्पष्ट कारण: "को कारणले गर्दा" (-기 때문에)',
      ur: 'واضح اور مضبوط وجہ: "کی وجہ سے / کیونکہ" (-기 때문에)',
    },
    formula: 'Verb/Adj Stem + -기 때문에 · Noun + 때문에',
    whenToUse: {
      en: 'Gives a clear, objective, or emphatic reason in both spoken and written Korean.',
      bn: 'কোনো কাজের সুস্পষ্ট ও জোরালো কারণ ব্যাখ্যা করতে ক্রিয়ার সাথে -기 때문에 এবং বিশেষ্যের সাথে 때문에 বসে।',
      ne: 'स्पष्ट कारण बताउन क्रियामा -기 때문에 र नाममा 때문에 लाग्छ।',
      ur: 'کسی بات کی واضح وجہ بیان کرنے کے لیے فعل کے ساتھ -기 때문에 اور اسم کے ساتھ 때문에 لگتا ہے۔',
    },
    politeVsInformal: {
      en: 'More formal and analytical than -아서/어서; great for essays and presentations.',
      bn: 'প্রবন্ধ, ইন্টারভিউ ও একাডেমিক লেখায় এটি খুবই উপযোগী।',
      ne: 'निबन्ध र औपचारिक प्रस्तुतिमा निकै उपयोगी हुन्छ।',
      ur: 'مضامین، انٹرویوز اور تعلیمی تحریر کے لیے بہت موزوں ہے۔',
    },
    commonMistakes: {
      en: 'Do not use commands (-세요) or suggestions (-읍시다) in the following clause.',
      bn: 'এর পরের অংশে আদেশ বা প্রস্তাবমূলক বাক্য বসে না।',
      ne: 'यसको पछाडि आदेश वा प्रस्ताव वाक्य प्रयोग हुँदैन।',
      ur: 'اس کے بعد والے حصے میں حکم یا تجویز استعمال نہیں ہوتی۔',
    },
    examples: [
      {
        ko: '장학금을 받기 때문에 학비 걱정이 없어요.',
        romanization: 'Janghakgeumeul batgi ttaemune hakbi geokjeong-i eopseoyo.',
        translation: {
          en: 'Because I receive a scholarship, I do not worry about tuition fees.',
          bn: 'স্কলারশিপ পাওয়ায় টিউশন ফি নিয়ে আমার কোনো চিন্তা নেই।',
          ne: 'छात्रवृत्ति पाएको कारणले शिक्षण शुल्कको चिन्ता छैन।',
          ur: 'اسکالرشپ ملنے کی وجہ سے مجھے ٹیوشن فیس کی کوئی فکر نہیں ہے۔',
        },
        breakdown: {
          en: '받다 (receive) + 기 때문에 (because) + 학비 걱정이 없어요',
          bn: '받다 + 기 때문에 (পাওয়ার কারণে)',
          ne: '받다 + 기 때문에',
          ur: '받다 + 기 때문에',
        },
      },
    ],
    practiceQuestions: [
      {
        prompt: {
          en: 'Choose the correct form with a Noun: 시험 _____ 도서관에 사람이 많아요. (Because of the exam...)',
          bn: 'বিশেষ্যের পর সঠিক রূপটি বেছে নিন: 시험 _____ 도서관에 사람이 많아요.',
          ne: 'नाम पछि सही रूप छान्नुहोस्: 시험 _____ 도서관에 사람이 많아요.',
          ur: 'اسم کے ساتھ درست شکل منتخب کریں: 시험 _____ 도서관에 사람이 많아요.',
        },
        options: ['때문에', '기 때문에', '으니까', '면서'],
        correctIndex: 0,
        explanation: {
          en: 'After a noun (시험), attach 때문에 directly without 기.',
          bn: 'বিশেষ্য (시험) এর পরে সরাসরি 때문에 বসে (기 বসে না)।',
          ne: 'नाम (시험) पछि सीधै 때문에 मात्र लाग्छ।',
          ur: 'اسم (시험) کے بعد بغیر 기 کے براہِ راست 때문에 آتا ہے۔',
        },
      },
    ],
  },
  {
    id: 'ig-4',
    tier: 'Intermediate',
    patternKo: '-(으)려고',
    title: {
      en: 'Purpose & Intention: "In order to..." (-(으)려고)',
      bn: 'উদ্দেশ্য ও সংকল্প: "করার উদ্দেশ্যে / করার জন্য" (-(으)려고)',
      ne: 'उद्देश्य र इरादा: "गर्नको लागि" (-(으)려고)',
      ur: 'مقصد اور ارادہ: "کرنے کے لیے / کی غرض سے" (-(으)려고)',
    },
    formula: 'Vowel/ㄹ + -려고 · Consonant + -으려고',
    whenToUse: {
      en: 'Expresses the speaker’s purpose or intention for performing the action in the main clause.',
      bn: 'কোনো নির্দিষ্ট উদ্দেশ্য পূরণের জন্য আরেকটি কাজ করা বোঝাতে ব্যবহৃত হয়।',
      ne: 'कुनै उद्देश्य पूरा गर्न अर्को काम गर्दा प्रयोग गरिन्छ।',
      ur: 'کسی خاص مقصد کو پورا کرنے کے لیے کوئی عمل کرنے پر استعمال ہوتا ہے۔',
    },
    politeVsInformal: {
      en: 'With movement verbs (가다/오다), -(으)러 is also frequently used.',
      bn: 'যাওয়া/আসা ক্রিয়ার সাথে -(으)러 এবং অন্য সকল ক্রিয়ার সাথে -(으)려고 বসে।',
      ne: 'जानु/आउनु सँग -(으)러 र अन्य सबै क्रियामा -(으)려고 लाग्छ।',
      ur: 'جانے/آنے کے افعال کے ساتھ -(으)러 اور دیگر تمام افعال کے ساتھ -(으)려고 آتا ہے۔',
    },
    commonMistakes: {
      en: 'Never attach tense markers (-았/었-) before -(으)려고.',
      bn: '-(으)려고 এর আগে কখনোই অতীত কাল (-았/었-) যুক্ত হয় না।',
      ne: '-(으)려고 अगाडि कहिल्यै भूतकाल लाग्दैन।',
      ur: '-(으)려고 سے پہلے کبھی ماضی کا لاحقہ نہیں لگتا۔',
    },
    examples: [
      {
        ko: '한국 대학교에 입학하려고 TOPIK을 열심히 준비하고 있어요.',
        romanization: 'Hanguk daehakgyoe ipakharyeogo TOPIK-eul yeolsimhi junbihago isseoyo.',
        translation: {
          en: 'In order to enter a Korean university, I am preparing hard for TOPIK.',
          bn: 'কোরিয়ান বিশ্ববিদ্যালয়ে ভর্তি হওয়ার জন্য আমি মনোযোগ দিয়ে TOPIK প্রস্তুতি নিচ্ছি।',
          ne: 'कोरियन विश्वविद्यालयमा भर्ना हुन म मिहिनेतसाथ TOPIK तयारी गर्दैछु।',
          ur: 'کورین یونیورسٹی میں داخلہ لینے کے لیے میں محنت سے TOPIK کی تیاری کر رہا ہوں۔',
        },
        breakdown: {
          en: '입학하다 (enter university) + 려고 (in order to) + 준비하고 있어요',
          bn: '입학하려고 (ভর্তি হওয়ার উদ্দেশ্যে)',
          ne: '입학하려고 (भर्ना हुन)',
          ur: '입학하려고 (داخلہ لینے کے لیے)',
        },
      },
    ],
    practiceQuestions: [
      {
        prompt: {
          en: 'Complete the sentence: 친구에게 줄 선물을 사____ 백화점에 갔어요.',
          bn: 'বাক্যটি সম্পূর্ণ করুন: 친구에게 줄 선물을 사____ 백화점에 갔어요.',
          ne: 'वाक्य पूरा गर्नुहोस्: 친구에게 줄 선물을 사____ 백화점에 갔어요.',
          ur: 'جملہ مکمل کریں: 친구에게 줄 선물을 사____ 백화점에 갔어요.',
        },
        options: ['려고', '으려고', '지만', '면서'],
        correctIndex: 0,
        explanation: {
          en: '사다 (to buy) ends in a vowel, so -려고 is added -> 사려고.',
          bn: '사다 স্বরবর্ণে শেষ হওয়ায় -려고 যুক্ত হয়ে 사려고 হয়েছে।',
          ne: '사다 स्वरमा टुङ्गिएकाले 사려고 हुन्छ।',
          ur: '사다 واول پر ختم ہوتا ہے اس لیے 사려고 بنے گا۔',
        },
      },
    ],
  },
  {
    id: 'ig-5',
    tier: 'Intermediate',
    patternKo: '-게 되다',
    title: {
      en: 'Change of Situation: "Come to / End up doing" (-게 되다)',
      bn: 'পরিস্থিতির পরিবর্তন: "ঘটে যাওয়া / করতে হওয়া" (-게 되다)',
      ne: 'परिस्थिति परिवर्तन: "हुन पुग्नु / गर्न थाल्नु" (-게 되다)',
      ur: 'حالات میں تبدیلی: "ایسا ہو جانا / کرنے لگنا" (-게 되다)',
    },
    formula: 'Verb Stem + -게 되다 (Past: -게 되었어요 / 됐어요)',
    whenToUse: {
      en: 'Shows how a situation naturally developed or changed due to external circumstances.',
      bn: 'বাইরের পরিস্থিতি বা সুযোগের কারণে কোনো নতুন অবস্থায় পৌঁছানো বা কোনো কাজ শুরু করা বোঝায়।',
      ne: 'बाहिरी परिस्थितिका कारण कुनै नयाँ अवस्थामा पुग्नु बुझाउँछ।',
      ur: 'بیرونی حالات یا موقع کی وجہ سے کسی نئی صورتحال تک پہنچنے کو ظاہر کرتا ہے۔',
    },
    politeVsInformal: {
      en: 'Polite past: -게 됐어요.',
      bn: 'অতীত কালে সংক্ষেপে -게 됐어요 বলা হয়।',
      ne: 'भूतकालमा छोटकरीमा -게 됐어요 भनिन्छ।',
      ur: 'ماضی میں مختصراً -게 됐어요 کہا جاتا ہے۔',
    },
    commonMistakes: {
      en: 'Attach directly to the verb stem without conjugating first.',
      bn: 'ক্রিয়ামূলের সাথে সরাসরি -게 되다 যুক্ত করুন।',
      ne: 'धातुमा सीधै -게 되다 जोड्नुहोस्।',
      ur: 'فعل کی جڑ کے ساتھ براہِ راست -게 되다 لگائیں۔',
    },
    examples: [
      {
        ko: '다음 달부터 서울에서 일하게 되었어요.',
        romanization: 'Daeum dalbuteo Seoureseo ilhage doeeosseoyo.',
        translation: {
          en: 'Starting next month, I will be working in Seoul.',
          bn: 'আগামী মাস থেকে আমার সিউলে কাজ করার সুযোগ হয়েছে।',
          ne: 'अर्को महिनादेखि म सियोलमा काम गर्ने भएको छु।',
          ur: 'اگلے مہینے سے مجھے سیول میں کام کرنے کا موقع مل گیا ہے۔',
        },
        breakdown: {
          en: '일하다 (work) + 게 되었어요 (came to work)',
          bn: '일하 + 게 되었어요',
          ne: '일하 + 게 되었어요',
          ur: '일하 + 게 되었어요',
        },
      },
    ],
    practiceQuestions: [
      {
        prompt: {
          en: 'Choose the right expression: 한국 드라마를 보고 한국어를 좋아하_____.',
          bn: 'সঠিক রূপ বেছে নিন: 한국 드라마를 보고 한국어를 좋아하_____.',
          ne: 'सही रूप छान्नुहोस्: 한국 드라마를 보고 한국어를 좋아하_____.',
          ur: 'درست شکل منتخب کریں: 한국 드라마를 보고 한국어를 좋아하_____.',
        },
        options: ['게 되었어요', '고 싶어요', '지 않아요', '는 반면에'],
        correctIndex: 0,
        explanation: {
          en: '좋아하게 되었어요 means "I came to like Korean (after watching Korean dramas)."',
          bn: '좋아하게 되었어요 অর্থ "পছন্দ করতে শুরু করেছি"।',
          ne: '좋아하게 되었어요 को अर्थ "मन पर्न थाल्यो" हो।',
          ur: '좋아하게 되었어요 کا مطلب ہے "پسند کرنے لگا ہوں"۔',
        },
      },
    ],
  },
  {
    id: 'ig-6',
    tier: 'Intermediate',
    patternKo: '-아/어 보다',
    title: {
      en: 'Trying an Experience: "Try doing..." (-아/어 보다)',
      bn: 'নতুন কিছু চেষ্টা বা অভিজ্ঞতা অর্জন: "করে দেখা" (-아/어 보다)',
      ne: 'प्रयास वा अनुभव: "गरी हेर्नु" (-아/어 보다)',
      ur: 'کوشش یا تجربہ کرنا: "کر کے دیکھنا" (-아/어 보다)',
    },
    formula: 'ㅏ/ㅗ + -아 보다 · Other vowels + -어 보다 · 하다 -> 해 보다',
    whenToUse: {
      en: 'Used to suggest trying something new (-아/어 보세요) or talking about past experiences (-아/어 봤어요).',
      bn: 'নতুন কোনো কাজ চেষ্টা করে দেখা বা অতীতের কোনো অভিজ্ঞতা প্রকাশ করতে ব্যবহৃত হয়।',
      ne: 'नयाँ काम प्रयास गर्न (-아/어 보세요) वा अनुभव बताउन (-아/어 봤어요) प्रयोग हुन्छ।',
      ur: 'کوئی نیا کام آزمانے (-아/어 보세요) یا ماضی کا تجربہ بتانے (-아/어 봤어요) کے لیے استعمال ہوتا ہے۔',
    },
    politeVsInformal: {
      en: 'Very polite way to give advice: 이 음식을 드셔 보세요 (Please try eating this food).',
      bn: 'কাউকে ভদ্রভাবে পরামর্শ দিতে: 한번 해 보세요 (একবার চেষ্টা করে দেখুন)।',
      ne: 'विनम्र सल्लाह दिँदा: 한번 해 보세요 (एकपटक प्रयास गरी हेर्नुहोस्)।',
      ur: 'مؤدبانہ مشورہ دینے کے لیے: 한번 해 보세요 (ایک بار کوشش کر کے دیکھیں)۔',
    },
    commonMistakes: {
      en: 'Do not use 보다 (to see) + 아/어 보다 together (never say 봐 보다).',
      bn: '보다 (দেখা) ক্রিয়ার সাথে পুনরায় -아/어 보다 বসে না।',
      ne: '보다 क्रियासँग फेरि -아/어 보다 प्रयोग हुँदैन।',
      ur: '보다 کے ساتھ دوبارہ -아/어 보다 استعمال نہیں ہوتا۔',
    },
    examples: [
      {
        ko: '제주도에 가 봤어요? 꼭 한번 가 보세요!',
        romanization: 'Jejudoe ga bwasseoyo? Kkok hanbeon ga boseyo!',
        translation: {
          en: 'Have you ever been to Jeju Island? Definitely try going once!',
          bn: 'আপনি কি কখনো জেজু দ্বীপে গিয়েছেন? অবশ্যই একবার ঘুরে আসুন!',
          ne: 'तपाईं कहिल्यै जेजु टापु जानुभएको छ? अवश्य एकपटक जानुहोस्!',
          ur: 'کیا آپ کبھی جیجو آئی لینڈ گئے ہیں؟ ضرور ایک بار جا کر دیکھیں!',
        },
        breakdown: {
          en: '가다 + 아 봤어요 (have tried going) · 가 보세요 (please try going)',
          bn: '가 봤어요 (গিয়েছেন কি) · 가 보세요 (গিয়ে দেখুন)',
          ne: '가 봤어요 · 가 보세요',
          ur: '가 봤어요 · 가 보세요',
        },
      },
    ],
    practiceQuestions: [
      {
        prompt: {
          en: 'How do you politely say "Please try wearing this coat"? (입다 = to wear)',
          bn: '"এই কোটটি পরে দেখুন" — সঠিক কোরিয়ান কোনটি? (입다 = পরা)',
          ne: '"यो कोट लगाएर हेर्नुहोस्" — सही कोरियन कुन हो?',
          ur: '"براہِ کرم یہ کوٹ پہن کر دیکھیں" — درست کورین کون سی ہے؟',
        },
        options: ['이 코트를 입어 보세요.', '이 코트를 입아 보세요.', '이 코트를 입고 보세요.', '이 코트를 입기 보세요.'],
        correctIndex: 0,
        explanation: {
          en: '입다 has the vowel ㅣ, so -어 보세요 is attached -> 입어 보세요.',
          bn: '입다 ধাতুতে ㅣ স্বরবর্ণ থাকায় -어 보세요 যুক্ত হয়ে 입어 보세요 হয়।',
          ne: '입다 मा ㅣ स्वर भएकाले 입어 보세요 हुन्छ।',
          ur: '입다 میں واول ㅣ ہے اس لیے 입어 보세요 بنے گا۔',
        },
      },
    ],
  },
  {
    id: 'ig-7',
    tier: 'Intermediate',
    patternKo: '-아/어야 하다 (되다)',
    title: {
      en: 'Obligation & Necessity: "Must / Have to" (-아/어야 하다)',
      bn: 'বাধ্যবাধকতা ও প্রয়োজনীয়তা: "করতেই হবে" (-아/어야 하다 / 되다)',
      ne: 'बाध्यता र आवश्यकता: "गर्नैपर्छ" (-아/어야 하다 / 되다)',
      ur: 'ضرورت اور فرض: "ضرور کرنا چاہیے / کرنا پڑتا ہے" (-아/어야 하다)',
    },
    formula: 'ㅏ/ㅗ + -아야 해요 · Other vowels + -어야 해요 · 하다 -> 해야 해요',
    whenToUse: {
      en: 'Expresses duty, rule, or necessity ("must / have to"). In conversation, -아/어야 돼요 is equally common.',
      bn: 'নিয়ম, দায়িত্ব বা কোনো কাজ অবশ্যই করতে হবে বোঝাতে -아/어야 해요 বা -아/어야 돼요 ব্যবহৃত হয়।',
      ne: 'नियम वा обов\'язково गर्नुपर्ने काम बुझाउन -아/어야 해요 वा -아/어야 돼요 प्रयोग हुन्छ।',
      ur: 'اصول، ذمہ داری یا لازمی کام بتانے کے لیے -아/어야 해요 یا -아/어야 돼요 استعمال ہوتا ہے۔',
    },
    politeVsInformal: {
      en: 'Formal written: -아/어야 합니다.',
      bn: 'ফরমাল বা অফিসিয়াল নির্দেশনায়: -아/어야 합니다।',
      ne: 'औपचारिक नियममा: -아/어야 합니다।',
      ur: 'رسمی ہدایات میں: -아/어야 합니다۔',
    },
    commonMistakes: {
      en: 'Remember 하다 contracts to 해야 해요 (not 하야 해요).',
      bn: '하다 সবসময় সংকুচিত হয়ে 해야 해요 হয়।',
      ne: '하다 सधैं छोटिएर 해야 해요 बन्छ।',
      ur: '하다 ہمیشہ مختصر ہو کر 해야 해요 بن جاتا ہے۔',
    },
    examples: [
      {
        ko: '외국인 유학생은 주소가 바뀌면 14일 이내에 신고해야 합니다.',
        romanization: 'Oegugin yuhaksaeng-eun jusoga bakkwimyeon sipsail inaee singohaeya hamnida.',
        translation: {
          en: 'International students must report a change of address within 14 days.',
          bn: 'বিদেশি শিক্ষার্থীদের ঠিকানা পরিবর্তন হলে ১৪ দিনের মধ্যে অবশ্যই রিপোর্ট করতে হবে।',
          ne: 'अन्तर्राष्ट्रिय विद्यार्थीले ठेगाना परिवर्तन भएमा १४ दिनभित्र दर्ता गर्नैपर्छ।',
          ur: 'بین الاقوامی طلباء کو پتہ تبدیل ہونے کی صورت میں 14 دن کے اندر اطلاع دینی چاہیے۔',
        },
        breakdown: {
          en: '신고하다 (report) -> 신고해야 합니다 (must report)',
          bn: '신고하다 -> 신고해야 합니다 (রিপোর্ট করতে হবে)',
          ne: '신고하다 -> 신고해야 합니다',
          ur: '신고하다 -> 신고해야 합니다',
        },
      },
    ],
    practiceQuestions: [
      {
        prompt: {
          en: 'Complete the sentence: 내일 시험이 있어서 오늘 밤에 공부_____.',
          bn: 'বাক্যটি সম্পূর্ণ করুন: 내일 시험이 있어서 오늘 밤에 공부_____.',
          ne: 'वाक्य पूरा गर्नुहोस्: 내일 시험이 있어서 오늘 밤에 공부_____.',
          ur: 'جملہ مکمل کریں: 내일 시험이 있어서 오늘 밤에 공부_____.',
        },
        options: ['해야 해요', '아야 해요', '고야 해요', '기야 해요'],
        correctIndex: 0,
        explanation: {
          en: '공부하다 + 여야 해요 = 공부해야 해요 (must study).',
          bn: '공부하다 থেকে 공부해야 해요 (পড়াশোনা করতে হবে)।',
          ne: '공부하다 बाट 공부해야 해요 (पढ्नैपर्छ)।',
          ur: '공부하다 سے 공부해야 해요 (پڑھائی کرنی ہے) بنتا ہے۔',
        },
      },
    ],
  },
  {
    id: 'ig-8',
    tier: 'Intermediate',
    patternKo: '-(으)ㄴ 적이 있다 / 없다',
    title: {
      en: 'Past Experience: "Have / Have never done" (-(으)ㄴ 적이 있다/없다)',
      bn: 'অতীতের অভিজ্ঞতা: "কখনো করেছি / কখনো করিনি" (-(으)ㄴ 적이 있다/없다)',
      ne: 'विगतको अनुभव: "गरेको छु / गरेको छैन" (-(으)ㄴ 적이 있다/없다)',
      ur: 'ماضی کا تجربہ: "کبھی کیا ہے / کبھی نہیں کیا" (-(으)ㄴ 적이 있다/없다)',
    },
    formula: 'Vowel/ㄹ + -ㄴ 적이 있다/없다 · Consonant + -은 적이 있다/없다',
    whenToUse: {
      en: 'Talks about whether you have ever experienced something in your life.',
      bn: 'জীবনে কখনো কোনো কাজ করার অভিজ্ঞতা হয়েছে কি হয়নি তা প্রকাশ করতে ব্যবহৃত হয়।',
      ne: 'जीवनमा कहिल्यै कुनै अनुभव भएको छ कि छैन भनी बताउन प्रयोग हुन्छ।',
      ur: 'زندگی میں کبھی کسی کام کا تجربہ ہوا ہے یا نہیں، یہ بتانے کے لیے استعمال ہوتا ہے۔',
    },
    politeVsInformal: {
      en: 'Often paired with 한복을 입어 본 적이 있어요 (combining -아/어 보다 + -ㄴ 적이 있다).',
      bn: '-아/어 본 적이 있어요 আকারে সবচেয়ে বেশি ব্যবহৃত হয়।',
      ne: '-아/어 본 적이 있어요 को रूपमा धेरै प्रयोग गरिन्छ।',
      ur: '-아/어 본 적이 있어요 کی صورت میں بہت زیادہ استعمال ہوتا ہے۔',
    },
    commonMistakes: {
      en: 'Do not use this for routine daily habits (like brushing teeth today).',
      bn: 'প্রতিদিনের সাধারণ অভ্যাসের ক্ষেত্রে এটি ব্যবহৃত হয় না; কেবল বিশেষ অভিজ্ঞতার ক্ষেত্রে বসে।',
      ne: 'दैनिक सामान्य बानीमा यो प्रयोग हुँदैन, विशेष अनुभवमा मात्र लाग्छ।',
      ur: 'یہ روزمرہ کی عام عادات کے لیے نہیں بلکہ خاص تجربات کے لیے استعمال ہوتا ہے۔',
    },
    examples: [
      {
        ko: '저는 한국에서 한복을 입어 본 적이 있어요.',
        romanization: 'Jeoneun Hangugeseo hanbogeul ibeo bon jeogi isseoyo.',
        translation: {
          en: 'I have experienced wearing Hanbok in Korea.',
          bn: 'আমার কোরিয়ায় হানবোক (ঐতিহ্যবাহী পোশাক) পরার অভিজ্ঞতা আছে।',
          ne: 'मैले कोरियामा हानबोक लगाएको अनुभव छ।',
          ur: 'مجھے کوریا میں ہان بوک (روایتی لباس) پہننے کا تجربہ ہوا ہے۔',
        },
        breakdown: {
          en: '입어 보다 + ㄴ 적이 있어요',
          bn: '입어 본 적이 있어요 (পরার অভিজ্ঞতা আছে)',
          ne: '입어 본 적이 있어요',
          ur: '입어 본 적이 있어요',
        },
      },
    ],
    practiceQuestions: [
      {
        prompt: {
          en: 'Choose the correct form: 부산에 가 _____ 있어요? (Have you ever been to Busan?)',
          bn: 'সঠিক রূপ বেছে নিন: 부산에 가 _____ 있어요?',
          ne: 'सही रूप छान्नुहोस्: 부산에 가 _____ 있어요?',
          ur: 'درست شکل منتخب کریں: 부산에 가 _____ 있어요?',
        },
        options: ['본 적이', '보는 적이', '볼 적이', '보던 적이'],
        correctIndex: 0,
        explanation: {
          en: 'Past modifier -(으)ㄴ is required before 적이 있다 -> 가 본 적이 있어요.',
          bn: 'অতীতের অভিজ্ঞতা বোঝাতে -ㄴ 적이 বসে -> 가 본 적이 있어요।',
          ne: 'विगतको अनुभव बुझाउन 가 본 적이 있어요 प्रयोग हुन्छ।',
          ur: 'ماضی کے تجربے کے لیے 가 본 적이 있어요 استعمال ہوتا ہے۔',
        },
      },
    ],
  },
  {
    id: 'ig-9',
    tier: 'Intermediate',
    patternKo: '-(으)ㄹ 것 같다',
    title: {
      en: 'Supposition & Polite Opinion: "I think / It seems" (-(으)ㄹ 것 같다)',
      bn: 'অনুমান ও নম্র মতামত: "মনে হচ্ছে / হতে পারে" (-(으)ㄹ 것 같아요)',
      ne: 'अनुमान र विचार: "जस्तो छ / होला" (-(으)ㄹ 것 같아요)',
      ur: 'اندازہ اور نرم رائے: "لگتا ہے کہ / شاید" (-(으)ㄹ 것 같아요)',
    },
    formula: 'Past: -(으)ㄴ 것 같다 · Present: -는 것 같다 · Future/Guess: -(으)ㄹ 것 같다',
    whenToUse: {
      en: 'Used to make a conjecture about the future/present or to soften your opinion politely.',
      bn: 'ভবিষ্যৎ সম্পর্কে অনুমান করতে কিংবা নিজের মতামত অত্যন্ত নম্রভাবে প্রকাশ করতে ব্যবহৃত হয়।',
      ne: 'भविष्यको अनुमान गर्न वा आफ्नो विचार विनम्रतापूर्वक राख्न प्रयोग हुन्छ।',
      ur: 'مستقبل کے بارے میں اندازہ لگانے یا اپنی رائے شائستگی سے پیش کرنے کے لیے استعمال ہوتا ہے۔',
    },
    politeVsInformal: {
      en: 'Polite ending: -(으)ㄹ 것 같아요.',
      bn: 'কথোপকথনে: -(으)ㄹ 것 같아요।',
      ne: 'कुराकानीमा: -(으)ㄹ 것 같아요।',
      ur: 'گفتگو میں: -(으)ㄹ 것 같아요۔',
    },
    commonMistakes: {
      en: 'Check whether you are guessing about the past (-(으)ㄴ 것 같아요), present (-는 것 같아요), or future (-(으)ㄹ 것 같아요).',
      bn: 'অতীত হলে -(으)ㄴ 것 같아요, বর্তমান হলে -는 것 같아요 এবং ভবিষ্যৎ হলে -(으)ㄹ 것 같아요 বসে।',
      ne: 'भूतकालमा -(으)ㄴ, वर्तमानमा -는 र भविष्यमा -(으)ㄹ 것 같아요 लाग्छ।',
      ur: 'ماضی کے لیے -(으)ㄴ، حال کے لیے -는 اور مستقبل کے لیے -(으)ㄹ 것 같아요 لگائیں۔',
    },
    examples: [
      {
        ko: '하늘에 구름이 많은 걸 보니까 오후에 비가 올 것 같아요.',
        romanization: 'Haneure gureumi maneun geol bonikka ohue biga ol geot gatayo.',
        translation: {
          en: 'Seeing all the clouds in the sky, it looks like it will rain in the afternoon.',
          bn: 'আকাশে অনেক মেঘ দেখে মনে হচ্ছে বিকেলে বৃষ্টি হতে পারে।',
          ne: 'आकाशमा धेरै बादल देख्दा दिउँसो पानी पर्ला जस्तो छ।',
          ur: 'آسمان پر گہرے بادل دیکھ کر لگتا ہے کہ سہ پہر کو بارش ہو گی۔',
        },
        breakdown: {
          en: '오다 (come/rain) + ㄹ 것 같아요 (looks like it will come)',
          bn: '오다 + ㄹ 것 같아요 -> 올 것 같아요',
          ne: '오다 + ㄹ 것 같아요 -> 올 것 같아요',
          ur: '오다 + ㄹ 것 같아요 -> 올 것 같아요',
        },
      },
    ],
    practiceQuestions: [
      {
        prompt: {
          en: 'Choose the right form for future supposition: 내일은 시험이 쉽지 않_____.',
          bn: 'ভবিষ্যৎ অনুমানের জন্য সঠিক রূপটি বেছে নিন: 내일은 시험이 쉽지 않_____.',
          ne: 'भविष्यको अनुमानका लागि सही रूप छान्नुहोस्: 내일은 시험이 쉽지 않_____.',
          ur: 'مستقبل کے اندازے کے لیے درست شکل منتخب کریں: 내일은 시험이 쉽지 않_____.',
        },
        options: ['을 것 같아요', '는 것 같아요', '은 적이 있어요', '기 때문에요'],
        correctIndex: 0,
        explanation: {
          en: '않다 ends in a consonant, so -을 것 같아요 is attached.',
          bn: '않다 ব্যঞ্জনবর্ণে শেষ হওয়ায় -을 것 같아요 যুক্ত হবে।',
          ne: '않다 व्यञ्जनमा टुङ्गिएकाले -을 것 같아요 लाग्छ।',
          ur: '않다 حرفِ صحیح پر ختم ہوتا ہے اس لیے -을 것 같아요 آئے گا۔',
        },
      },
    ],
  },

  // ================= ADVANCED GRAMMAR (7 Academic & TOPIK II Topics) =================
  {
    id: 'ag-1',
    tier: 'Advanced',
    patternKo: '-(으)ㅁ에도 불구하고 / -는데도 불구하고',
    title: {
      en: 'Despite / In spite of (-(으)ㅁ에도 불구하고)',
      bn: 'সত্ত্বেও / তা সত্ত্বেও (-(으)ㅁ에도 불구하고)',
      ne: 'का बाबजुद / तापनि (-(으)ㅁ에도 불구하고)',
      ur: 'کے باوجود / باوجودیکہ (-(으)ㅁ에도 불구하고)',
    },
    formula: 'Verb/Adj Nominalized -(으)ㅁ/았음/었음 + 에도 불구하고 · Noun + 에도 불구하고',
    whenToUse: {
      en: 'High-frequency TOPIK II academic structure expressing that an unexpected result occurred despite a strong condition.',
      bn: 'TOPIK II এবং একাডেমিক প্রবন্ধে কোনো প্রতিকূল পরিস্থিতি সত্ত্বেও কোনো কাজ ঘটা বোঝাতে ব্যবহৃত হয়।',
      ne: 'TOPIK II र शैक्षिक लेखनमा कुनै अवस्थाका बाबजुद विपरीत परिणाम आउँदा प्रयोग हुन्छ।',
      ur: 'TOPIK II اور علمی تحریروں میں کسی صورتحال کے باوجود غیر متوقع نتیجہ ظاہر کرنے کے لیے استعمال ہوتا ہے۔',
    },
    politeVsInformal: {
      en: 'Primarily used in formal speeches, news reports, and TOPIK II Essay 54.',
      bn: 'সংবাদপত্র, গবেষণা ও TOPIK II রচনায় ব্যবহৃত ফরমাল রূপ।',
      ne: 'समाचार र TOPIK II निबन्धमा प्रयोग हुने औपचारिक रूप।',
      ur: 'خبروں، تحقیقی مضامین اور TOPIK II کے مضمون میں استعمال ہونے والا رسمی انداز۔',
    },
    commonMistakes: {
      en: 'With verbs/adjectives, nominalize with -(으)ㅁ or use -는데도 불구하고.',
      bn: 'ক্রিয়ার সাথে -(으)ㅁ বা -는데도 যুক্ত করে তারপর 불구하고 বসান।',
      ne: 'क्रियामा -(으)ㅁ वा -는데도 जोडेर मात्र 불구하고 राख्नुहोस्।',
      ur: 'فعل کے ساتھ -(으)ㅁ یا -는데도 لگا کر پھر 불구하고 استعمال کریں۔',
    },
    examples: [
      {
        ko: '바쁜 일정에도 불구하고 행사에 참석해 주셔서 감사합니다.',
        romanization: 'Bappeun iljeong-edo bulguhago haengsae chamseokhae jusyeoseo gamsahamnida.',
        translation: {
          en: 'Thank you for attending the event despite your busy schedule.',
          bn: 'ব্যস্ত সময়সূচি সত্ত্বেও অনুষ্ঠানে উপস্থিত হওয়ার জন্য আপনাকে ধন্যবাদ।',
          ne: 'व्यस्त कार्यतालिकाका बाबजुद कार्यक्रममा उपस्थित भइदिनुभएकोमा धन्यवाद।',
          ur: 'مصروف شیڈول کے باوجود تقریب میں شرکت کرنے پر آپ کا شکریہ۔',
        },
        breakdown: {
          en: '바쁜 일정 (busy schedule) + 에도 불구하고 (despite)',
          bn: '바쁜 일정 + 에도 불구하고 (ব্যস্ততা সত্ত্বেও)',
          ne: '바쁜 일정 + 에도 불구하고',
          ur: '바쁜 일정 + 에도 불구하고',
        },
      },
    ],
    practiceQuestions: [
      {
        prompt: {
          en: 'Choose the best academic connector: 많은 노력_____ 문제가 쉽게 해결되지 않았다.',
          bn: 'সঠিক একাডেমিক সংযোজক বেছে নিন: 많은 노력_____ 문제가 쉽게 해결되지 않았다.',
          ne: 'सही शैक्षिक संयोजक छान्नुहोस्: 많은 노력_____ 문제가 쉽게 해결되지 않았다.',
          ur: 'درست علمی رابطہ منتخب کریں: 많은 노력_____ 문제가 쉽게 해결되지 않았다.',
        },
        options: ['에도 불구하고', '기 때문에', '으려고', '는 한'],
        correctIndex: 0,
        explanation: {
          en: '많은 노력에도 불구하고 means "Despite great effort, the problem was not easily solved."',
          bn: '많은 노력에도 불구하고 অর্থ "অনেক প্রচেষ্টা সত্ত্বেও"।',
          ne: '많은 노력에도 불구하고 को अर्थ "धेरै प्रयासका बाबजुद" हो।',
          ur: '많은 노력에도 불구하고 کا مطلب ہے "بہت کوشش کے باوجود"۔',
        },
      },
    ],
  },
  {
    id: 'ag-2',
    tier: 'Advanced',
    patternKo: '-(으)ㄴ/는 반면에',
    title: {
      en: 'On the other hand / Whereas (-(으)ㄴ/는 반면에)',
      bn: 'অন্যদিকে / পক্ষান্তরে (-(으)ㄴ/는 반면에)',
      ne: 'अर्कोतर्फ / जबकि (-(으)ㄴ/는 반면에)',
      ur: 'دوسری طرف / اس کے برعکس (-(으)ㄴ/는 반면에)',
    },
    formula: 'Adjective + -(으)ㄴ 반면에 · Verb + -는 반면에',
    whenToUse: {
      en: 'Compares two contrasting characteristics, pros and cons, or opposing trends (essential for TOPIK II Question 53 & 54).',
      bn: 'কোনো বিষয়ের সুবিধা ও অসুবিধা কিংবা দুটি বিপরীত বৈশিষ্ট্য তুলনা করতে (বিশেষ করে TOPIK II ৫৩ ও ৫৪ নং প্রশ্নে) ব্যবহৃত হয়।',
      ne: 'कुनै विषयको फाइदा र बेफाइदा वा दुई विपरीत पक्ष तुलना गर्न प्रयोग हुन्छ।',
      ur: 'کسی چیز کے فوائد و نقصانات یا دو متضاد پہلوؤں کا موازنہ کرنے کے لیے استعمال ہوتا ہے۔',
    },
    politeVsInformal: {
      en: 'Can be shortened to -(으)ㄴ/는 반면 in formal academic prose.',
      bn: 'লিখিত ভাষায় সংক্ষেপে -(으)ㄴ/는 반면 লেখা যায়।',
      ne: 'लेखाइमा छोटकरीमा -(으)ㄴ/는 반면 लेख्न सकिन्छ।',
      ur: 'تحریری زبان میں اسے مختصراً -(으)ㄴ/는 반면 بھی لکھا جا سکتا ہے۔',
    },
    commonMistakes: {
      en: 'Pay attention to adjective (-(으)ㄴ 반면에) vs action verb (-는 반면에).',
      bn: 'বিশেষণে -(으)ㄴ 반면에 এবং ক্রিয়াপদে -는 반면에 বসে।',
      ne: 'विशेषणमा -(으)ㄴ 반면에 र क्रियामा -는 반면에 लाग्छ।',
      ur: 'صفت کے ساتھ -(으)ㄴ 반면에 اور فعل کے ساتھ -는 반면에 لگائیں۔',
    },
    examples: [
      {
        ko: '대도시는 교통이 편리한 반면에 집값이 비싸다.',
        romanization: 'Daedosineun gyotong-i pyeollihan banmyeone jipgapsi bissada.',
        translation: {
          en: 'In big cities, transportation is convenient, whereas housing costs are expensive.',
          bn: 'বড় শহরে যাতায়াত সুবিধাজনক, অন্যদিকে বাড়ির ভাড়া বেশ ব্যয়বহুল।',
          ne: 'ठूला सहरमा यातायात सहज हुन्छ भने अर्कोतर्फ घरभाडा महँगो हुन्छ।',
          ur: 'بڑے شہروں میں ٹرانسپورٹ آسان ہے، جبکہ دوسری طرف رہائش مہنگی ہے۔',
        },
        breakdown: {
          en: '편리하다 (adj) + ㄴ 반면에 (whereas)',
          bn: '편리한 반면에 (সুবিধাজনক হলেও অন্যদিকে)',
          ne: '편리한 반면에',
          ur: '편리한 반면에',
        },
      },
    ],
    practiceQuestions: [
      {
        prompt: {
          en: 'Fill in the blank: 온라인 수업은 편리_____ 집중하기 어려울 수 있다.',
          bn: 'শূন্যস্থান পূরণ করুন: 온라인 수업은 편리_____ 집중하기 어려울 수 있다.',
          ne: 'खाली ठाउँ भर्नुहोस्: 온라인 수업은 편리_____ 집중하기 어려울 수 있다.',
          ur: 'خالی جگہ پر کریں: 온라인 수업은 편리_____ 집중하기 어려울 수 있다.',
        },
        options: ['한 반면에', '하는 반면에', '할 따름이다', '기 마련이다'],
        correctIndex: 0,
        explanation: {
          en: '편리하다 is a descriptive adjective, so it takes -ㄴ 반면에 -> 편리한 반면에.',
          bn: '편리하다 বিশেষণ হওয়ায় 편리한 반면에 হবে।',
          ne: '편리하다 विशेषण भएकाले 편리한 반면에 हुन्छ।',
          ur: '편리하다 صفت ہے اس لیے 편리한 반면에 بنے گا۔',
        },
      },
    ],
  },
  {
    id: 'ag-3',
    tier: 'Advanced',
    patternKo: '-(으)ㄹ 뿐만 아니라',
    title: {
      en: 'Not only... but also (-(으)ㄹ 뿐만 아니라)',
      bn: 'শুধু তাই নয়... বরং আরও (-(으)ㄹ 뿐만 아니라)',
      ne: 'त्यति मात्र होइन... साथै (-(으)ㄹ 뿐만 아니라)',
      ur: 'نہ صرف یہ... بلکہ (-(으)ㄹ 뿐만 아니라)',
    },
    formula: 'Verb/Adj + -(으)ㄹ 뿐만 아니라 · Noun + 뿐만 아니라',
    whenToUse: {
      en: 'Adds an additional positive or negative point on top of the first statement.',
      bn: 'প্রথম গুণের পাশাপাশি আরও একটি বৈশিষ্ট্য যুক্ত করতে ব্যবহৃত হয় ("শুধু এটাই নয়, বরং...")।',
      ne: 'एउटा गुणका साथै अर्को थप विशेषता जोड्न प्रयोग गरिन्छ।',
      ur: 'پہلی بات کے ساتھ مزید خوبی یا پہلو جوڑنے کے لیے استعمال ہوتا ہے ("نہ صرف... بلکہ")۔',
    },
    politeVsInformal: {
      en: 'Frequently paired with 도 or 또한 in the second clause.',
      bn: 'দ্বিতীয় অংশে সাধারণত 도 বা 또한 থাকে।',
      ne: 'दोस्रो वाक्यमा प्रायः 도 वा 또한 आउँछ।',
      ur: 'جملے کے دوسرے حصے میں عموماً 도 یا 또한 آتا ہے۔',
    },
    commonMistakes: {
      en: 'Nouns attach 뿐만 아니라 directly without 이다.',
      bn: 'বিশেষ্যের পরে সরাসরি 뿐만 아니라 বসে।',
      ne: 'नाम पछि सीधै 뿐만 아니라 जोडिन्छ।',
      ur: 'اسم کے بعد براہِ راست 뿐만 아니라 لگتا ہے۔',
    },
    examples: [
      {
        ko: '그 학생은 한국어를 잘할 뿐만 아니라 성적도 매우 우수하다.',
        romanization: 'Geu haksaeng-eun hangugeoreul jalhal ppunman anira seongjeokdo maeu usuhada.',
        translation: {
          en: 'Not only does that student speak Korean well, but their grades are also outstanding.',
          bn: 'ওই শিক্ষার্থী শুধু কোরিয়ান ভাষায় দক্ষই নয়, তার পরীক্ষার ফলাফলও অত্যন্ত চমৎকার।',
          ne: 'त्यो विद्यार्थी कोरियन भाषामा मात्र राम्रो नभई उसको नतिजा पनि उत्कृष्ट छ।',
          ur: 'وہ طالب علم نہ صرف کورین زبان اچھی بولتا ہے بلکہ اس کے تعلیمی نمبر بھی بہت شاندار ہیں۔',
        },
        breakdown: {
          en: '잘하다 + ㄹ 뿐만 아니라 (not only does well, but also)',
          bn: '잘할 뿐만 아니라 (শুধু ভালোই পারে না, বরং)',
          ne: '잘할 뿐만 아니라',
          ur: '잘할 뿐만 아니라',
        },
      },
    ],
    practiceQuestions: [
      {
        prompt: {
          en: 'Complete the sentence: 이 도서관은 시설이 좋_____ 책도 많다.',
          bn: 'বাক্যটি সম্পূর্ণ করুন: 이 도서관은 시설이 좋_____ 책도 많다.',
          ne: 'वाक्य पूरा गर्नुहोस्: 이 도서관은 시설이 좋_____ 책도 많다.',
          ur: 'جملہ مکمل کریں: 이 도서관은 시설이 좋_____ 책도 많다.',
        },
        options: ['을 뿐만 아니라', '는 반면에', '음에도 불구하고', '는 한'],
        correctIndex: 0,
        explanation: {
          en: '좋다 + 을 뿐만 아니라 = 좋을 뿐만 아니라 (Not only are the facilities good, there are also many books).',
          bn: '좋다 + 을 뿐만 아니라 = 좋을 뿐만 아니라।',
          ne: '좋다 + 을 뿐만 아니라 = 좋을 뿐만 아니라।',
          ur: '좋다 + 을 뿐만 아니라 = 좋을 뿐만 아니라۔',
        },
      },
    ],
  },
  {
    id: 'ag-4',
    tier: 'Advanced',
    patternKo: '-는 한',
    title: {
      en: 'As long as / Provided that (-는 한)',
      bn: 'যতক্ষণ পর্যন্ত / শর্ত থাকে যে (-는 한)',
      ne: 'जबसम्म / शर्तमा (-는 한)',
      ur: 'جب تک کہ / بشرطیکہ (-는 한)',
    },
    formula: 'Action Verb Stem + -는 한',
    whenToUse: {
      en: 'Sets a prerequisite condition ("as long as A continues or holds true, B will happen").',
      bn: 'কোনো শর্ত বজায় থাকা পর্যন্ত ("যতক্ষণ চেষ্টা চালিয়ে যাবেন...") বোঝাতে ব্যবহৃত হয়।',
      ne: 'कुनै शर्त कायम रहेसम्म ("जबसम्म प्रयास जारी रहन्छ...") बुझाउन प्रयोग हुन्छ।',
      ur: 'کسی شرط کے برقرار رہنے تک ("جب تک کوشش جاری رہے گی...") کے معنی میں استعمال ہوتا ہے۔',
    },
    politeVsInformal: {
      en: 'Formal and analytical expression.',
      bn: 'মার্জিত ও আনুষ্ঠানিক প্রকাশভঙ্গি।',
      ne: 'शिष्ट र औपचारिक अभिव्यक्ति।',
      ur: 'مؤدبانہ اور سنجیدہ اندازِ بیاں۔',
    },
    commonMistakes: {
      en: 'Used with action verbs, not descriptive adjectives.',
      bn: 'এটি ক্রিয়াপদের সাথে বসে, বিশেষণের সাথে নয়।',
      ne: 'यो क्रियापदसँग मात्र प्रयोग हुन्छ।',
      ur: 'یہ فعل کے ساتھ استعمال ہوتا ہے، صفت کے ساتھ نہیں۔',
    },
    examples: [
      {
        ko: '포기하지 않고 끝까지 노력하는 한 반드시 목표를 이룰 수 있다.',
        romanization: 'Pogihaji anko kkeutkkaji noryeokaneun han bandeusi mokpyoreul irul su itda.',
        translation: {
          en: 'As long as you do not give up and keep trying until the end, you can surely achieve your goal.',
          bn: 'হাল না ছেড়ে শেষ পর্যন্ত চেষ্টা চালিয়ে যাওয়ার শর্তে আপনি অবশ্যই লক্ষ্য অর্জন করতে পারবেন।',
          ne: 'हार नमानी अन्त्यसम्म प्रयास गरिरहेसम्म लक्ष्य अवश्य पूरा गर्न सकिन्छ।',
          ur: 'جب تک آپ ہمت نہیں ہارتے اور آخر تک کوشش جاری رکھتے ہیں، آپ یقیناً اپنا مقصد حاصل کر سکتے ہیں۔',
        },
        breakdown: {
          en: '노력하다 (make effort) + 는 한 (as long as)',
          bn: '노력하는 한 (যতক্ষণ চেষ্টা করবেন)',
          ne: '노력하는 한',
          ur: '노력하는 한',
        },
      },
    ],
    practiceQuestions: [
      {
        prompt: {
          en: 'Choose the best expression: 기초를 튼튼히 공부하_____ TOPIK 시험에 합격할 수 있다.',
          bn: 'সঠিক রূপ বেছে নিন: 기초를 튼튼히 공부하_____ TOPIK 시험에 합격할 수 있다.',
          ne: 'सही रूप छान्नुहोस्: 기초를 튼튼히 공부하_____ TOPIK 시험에 합격할 수 있다.',
          ur: 'درست شکل منتخب کریں: 기초를 튼튼히 공부하_____ TOPIK 시험에 합격할 수 있다.',
        },
        options: ['는 한', '는 반면에', '음에도 불구하고', '기 마련이다'],
        correctIndex: 0,
        explanation: {
          en: '공부하는 한 means "As long as you study the basics solidly..."',
          bn: '공부하는 한 অর্থ "যতক্ষণ ভিত্তি মজবুত করে পড়বেন..."।',
          ne: '공부하는 한 को अर्थ "जबसम्म आधार बलियो बनाएर पढ्नुहुन्छ..." हो।',
          ur: '공부하는 한 کا مطلب ہے "جب تک آپ بنیاد مضبوط کر کے پڑھیں گے..."۔',
        },
      },
    ],
  },
  {
    id: 'ag-5',
    tier: 'Advanced',
    patternKo: '-기 마련이다',
    title: {
      en: 'Natural Inevitability: "Bound to / Naturally" (-기 마련이다)',
      bn: 'স্বাভাবিক নিয়ম: "স্বাভাবিকভাবেই এমন হয় / হতে বাধ্য" (-기 마련이다)',
      ne: 'स्वाभाविक नियम: "स्वतः हुने गर्छ" (-기 마련이다)',
      ur: 'فطری اصول: "لازماً ایسا ہوتا ہے / فطری بات ہے" (-기 마련이다)',
    },
    formula: 'Verb/Adjective Stem + -기 마련이다',
    whenToUse: {
      en: 'States a universal truth or natural consequence (equivalent to -는 법이다).',
      bn: 'কোনো কিছু ঘটাই স্বাভাবিক বা প্রাকৃতিক নিয়ম বোঝাতে ব্যবহৃত হয় (বিশেষ করে TOPIK II প্রবন্ধের উপসংহারে)।',
      ne: 'कुनै कुरा हुनु स्वाभाविक नियम हो भनी बताउन प्रयोग हुन्छ।',
      ur: 'کسی بات کے فطری یا یقینی نتیجے کو بیان کرنے کے لیے استعمال ہوتا ہے۔',
    },
    politeVsInformal: {
      en: 'Very effective in TOPIK II essay introductions and conclusions.',
      bn: 'TOPIK II রচনার ভূমিকা ও উপসংহারে অত্যন্ত কার্যকর।',
      ne: 'TOPIK II निबन्धको सुरु र अन्त्यमा निकै प्रभावकारी हुन्छ।',
      ur: 'TOPIK II کے مضمون کے آغاز اور اختتام میں بہت مؤثر ہے۔',
    },
    commonMistakes: {
      en: 'Attach -기 마련이다 directly to the present stem.',
      bn: 'ধাতুর সাথে সরাসরি -기 마련이다 যুক্ত করুন।',
      ne: 'धातुमा सीधै -기 마련이다 जोड्नुहोस्।',
      ur: 'فعل کی جڑ کے ساتھ براہِ راست -기 마련이다 لگائیں۔',
    },
    examples: [
      {
        ko: '새로운 환경에 적응할 때는 누구나 어려움을 겪기 마련이다.',
        romanization: 'Saeroun hwangyeong-e jeogeunghal ttaeneun nuguna eoryeoumeul gyeokgi maryeonida.',
        translation: {
          en: 'When adapting to a new environment, anyone is bound to experience difficulties.',
          bn: 'নতুন পরিবেশে মানিয়ে নেওয়ার সময় যে কারোরই কিছু সমস্যার মুখোমুখি হওয়া স্বাভাবিক।',
          ne: 'नयाँ वातावरणमा घुलमिल हुँदा जोकोहीलाई कठिनाइ हुनु स्वाभाविक हो।',
          ur: 'نئے ماحول میں ڈھلتے وقت ہر شخص کو مشکلات کا سامনা کرنا فطری بات ہے۔',
        },
        breakdown: {
          en: '겪다 (experience) + 기 마련이다 (is bound to experience)',
          bn: '겪기 마련이다 (সম্মুখীন হওয়া স্বাভাবিক)',
          ne: '겪기 마련이다',
          ur: '겪기 마련이다',
        },
      },
    ],
    practiceQuestions: [
      {
        prompt: {
          en: 'Choose the right expression: 열심히 노력하면 좋은 결과가 있_____.',
          bn: 'সঠিক রূপ বেছে নিন: 열심히 노력하면 좋은 결과가 있_____.',
          ne: 'सही रूप छान्नुहोस्: 열심히 노력하면 좋은 결과가 있_____.',
          ur: 'درست شکل منتخب کریں: 열심히 노력하면 좋은 결과가 있_____.',
        },
        options: ['기 마련이다', '는 반면에', '는데도 불구하고', '으려고 한다'],
        correctIndex: 0,
        explanation: {
          en: '있기 마련이다 expresses that good results naturally follow hard effort.',
          bn: '있기 마련이다 অর্থ পরিশ্রম করলে ভালো ফল আসাই স্বাভাবিক।',
          ne: '있기 마련이다 ले मिहिनेत गरे राम्रो नतिजा आउनु स्वाभाविक हो भन्छ।',
          ur: '있기 마련이다 کا مطلب ہے کہ محنت کرنے سے اچھا نتیجہ آنا فطری امر ہے۔',
        },
      },
    ],
  },
  {
    id: 'ag-6',
    tier: 'Advanced',
    patternKo: '-(으)ㄹ 따름이다',
    title: {
      en: 'Only / Merely: "Can only..." (-(으)ㄹ 따름이다)',
      bn: 'কেবলমাত্র / শুধুই: "শুধু এটুকুই করার আছে" (-(으)ㄹ 따름이다)',
      ne: 'केवल / मात्र: "गर्नु बाहेक अर्को विकल्प छैन" (-(으)ㄹ 따름이다)',
      ur: 'صرف اور صرف / محض: "صرف یہی کیا جا سکتا ہے" (-(으)ㄹ 따름이다)',
    },
    formula: 'Vowel/ㄹ + -ㄹ 따름이다 · Consonant + -을 따름이다',
    whenToUse: {
      en: 'Expresses that there is no other choice or emotion except the stated action (similar to -(으)ㄹ 뿐이다).',
      bn: 'অন্য কোনো উপায় না থেকে কেবল একটি কাজ বা অনুভূতি প্রকাশ করা বোঝায় (-(으)ㄹ 뿐이다 এর সমার্থক)।',
      ne: 'अर्को विकल्प नभई केवल एउटै भावना वा काम मात्र बाँकी रहनु बुझाउँछ।',
      ur: 'یہ ظاہر کرتا ہے کہ اس عمل یا جذبے کے سوا کوئی اور راستہ نہیں (-(으)ㄹ 뿐이다 کے ہم معنی)۔',
    },
    politeVsInformal: {
      en: 'Formal literary and oratorical style.',
      bn: 'আনুষ্ঠানিক ও সাহিত্যিক রীতি।',
      ne: 'औपचारिक र साहित्यिक शैली।',
      ur: 'رسمی اور ادبی انداز۔',
    },
    commonMistakes: {
      en: 'Used only with verbs/adjectives, not directly after nouns.',
      bn: 'এটি কেবল ক্রিয়া বা বিশেষণের সাথে বসে।',
      ne: 'यो क्रिया र विशेषणमा मात्र प्रयोग हुन्छ।',
      ur: 'یہ صرف فعل یا صفت کے ساتھ آتا ہے۔',
    },
    examples: [
      {
        ko: '큰 도움을 주신 교수님께 진심으로 감사할 따름입니다.',
        romanization: 'Keun doumeul jusin gyosunimkke jinsimeuro gamsahal ttareumimnida.',
        translation: {
          en: 'I can only feel sincere gratitude toward the professor who gave me great help.',
          bn: 'যিনি আমাকে এত বড় সাহায্য করেছেন সেই প্রফেসরের প্রতি আমি কেবল আন্তরিক কৃতজ্ঞতাই প্রকাশ করতে পারি।',
          ne: 'ठूलो सहयोग गर्नुहुने प्रोफेसरप्रति म केवल हार्दिक কৃতজ্ঞता व्यक्त गर्दछु।',
          ur: 'جن پروفیسر نے میری اتنی بڑی مدد کی، میں ان کا صرف تہہ دل سے شکر گزار ہی ہو سکتا ہوں۔',
        },
        breakdown: {
          en: '감사하다 + ㄹ 따름입니다',
          bn: '감사할 따름입니다 (কেবল কৃতজ্ঞতাই জানাতে পারি)',
          ne: '감사할 따름입니다',
          ur: '감사할 따름입니다',
        },
      },
    ],
    practiceQuestions: [
      {
        prompt: {
          en: 'Which grammar pattern has the closest meaning to -(으)ㄹ 따름이다?',
          bn: '-(으)ㄹ 따름이다 এর সবচেয়ে কাছাকাছি অর্থের ব্যাকরণ কোনটি?',
          ne: '-(으)ㄹ 따름이다 सँग सबैभन्दा मिल्दोजुल्दो व्याकरण कुन हो?',
          ur: '-(으)ㄹ 따름이다 کے سب سے قریب ترین معنی والا گرامر کون سا ہے؟',
        },
        options: ['-(으)ㄹ 뿐이다', '-(으)면서', '-기 때문에', '-(으)려고'],
        correctIndex: 0,
        explanation: {
          en: 'Both -(으)ㄹ 따름이다 and -(으)ㄹ 뿐이다 mean "only / merely".',
          bn: '-(으)ㄹ 따름이다 এবং -(으)ㄹ 뿐이다 উভয়ের অর্থই "কেবলমাত্র / শুধুই"।',
          ne: 'दुवैको अर्थ "केवल / मात्र" हो।',
          ur: 'دونوں کا مطلب "صرف / محض" ہے۔',
        },
      },
    ],
  },
  {
    id: 'ag-7',
    tier: 'Advanced',
    patternKo: '-는다 / -ㄴ다 / -다 (간접화법·서술체)',
    title: {
      en: 'Formal Written & Academic Style (-는다/-ㄴ다 & Data Reporting)',
      bn: 'একাডেমিক ও প্রবন্ধ লিখন রীতি (-는다/-ㄴ다 - TOPIK II Writing)',
      ne: 'शैक्षिक र निबन्ध लेखन शैली (-는다/-ㄴ다 - TOPIK II Writing)',
      ur: 'علمی اور مضمون نویسی کا رسمی انداز (-는다/-ㄴ다 - TOPIK II Writing)',
    },
    formula: 'Action Verb: -는다/-ㄴ다 · Adjective: -다 · Noun: (이)다 · Past: -았다/-었다',
    whenToUse: {
      en: 'Mandatory plain written style (해라체/서술체) used in TOPIK II Questions 53 & 54, newspapers, and research papers.',
      bn: 'TOPIK II পরীক্ষার ৫৩ ও ৫৪ নং প্রবন্ধ, সংবাদপত্র এবং গবেষণাপত্রে অবশ্যই এই লিখিত রীতি (-는다/-ㄴ다/-다) ব্যবহার করতে হয়।',
      ne: 'TOPIK II को प्रश्न ५३ र ५४ निबन्ध, समाचारपत्र र अनुसन्धान पत्रमा अनिवार्य प्रयोग हुने लेखन शैली।',
      ur: 'TOPIK II کے سوال نمبر 53 اور 54، اخبارات اور تحقیقی مقالوں میں لازمی استعمال ہونے والا تحریری انداز۔',
    },
    politeVsInformal: {
      en: 'Never mix -아요/-어요 or -습니다 inside a TOPIK II Question 53/54 essay!',
      bn: 'TOPIK II প্রবন্ধে কখনোই -아요/-어요 বা -습니다 মেশাবেন না!',
      ne: 'TOPIK II निबन्धमा कहिल्यै -아요/-어요 वा -습니다 नमिलाउनुहोस्!',
      ur: 'TOPIK II کے مضمون میں کبھی بھی -아요/-어요 یا -습니다 شامل نہ کریں!',
    },
    commonMistakes: {
      en: 'Adjectives take -다 directly (높다, 중요하다), NOT -는다/ㄴ다 (never write 중요한다).',
      bn: 'বিশেষণের সাথে সরাসরি -다 বসে (যেমন: 중요하다, 높다); কখনোই 중요한다 লিখবেন না।',
      ne: 'विशेषणमा सीधै -다 मात्र लाग्छ (जस्तै: 중요하다); कहिल्यै 중요한다 नलेख्नुहोस्।',
      ur: 'صفت کے ساتھ براہِ راست -다 لگتا ہے (جیسے: 중요하다)، کبھی بھی 중요한다 نہ لکھیں۔',
    },
    examples: [
      {
        ko: '조사 결과에 따르면 유학생의 비율이 20%에서 45%로 크게 증가하였다.',
        romanization: 'Josa gyeolgwae ttareumyeon yuhaksaeng-ui biyuri isip-peosenteueseo sasibo-peosenteuro keuge jeunggahayeotda.',
        translation: {
          en: 'According to the survey results, the proportion of international students increased significantly from 20% to 45%.',
          bn: 'জরিপের ফলাফল অনুসারে, বিদেশি শিক্ষার্থীদের হার ২০% থেকে উল্লেখযোগ্যভাবে বেড়ে ৪৫%-এ দাঁড়িয়েছে।',
          ne: 'सर्वेक्षणको नतिजा अनुसार अन्तर्राष्ट्रिय विद्यार्थीको अनुपात २०% बाट बढेर ४५% पुगेको छ।',
          ur: 'سروے کے نتائج کے مطابق بین الاقوامی طلباء کا تناسب 20 فیصد سے بڑھ کر 45 فیصد ہو گیا۔',
        },
        breakdown: {
          en: '~에 따르면 (according to) + ~에서 ~로 (from... to...) + 증가하였다 (formal written past)',
          bn: '조사 결과에 따르면 (জরিপ অনুযায়ী) + 증가하였다 (বৃদ্ধি পেয়েছে)',
          ne: '조사 결과에 따르면 + 증가하였다',
          ur: '조사 결과에 따르면 + 증가하였다',
        },
      },
    ],
    practiceQuestions: [
      {
        prompt: {
          en: 'Which ending is correct for an adjective (중요하다) in a TOPIK II Essay?',
          bn: 'TOPIK II রচনায় 중요하다 বিশেষণটির সঠিক সমাপিকা রূপ কোনটি?',
          ne: 'TOPIK II निबन्धमा 중요하다 विशेषणको सही अन्त्य रूप कुन हो?',
          ur: 'TOPIK II کے مضمون میں صفت 중요하다 کی درست آخری شکل کون سی ہے؟',
        },
        options: ['중요하다', '중요한다', '중요해요', '중요하는다'],
        correctIndex: 0,
        explanation: {
          en: 'Descriptive adjectives use their base dictionary form (-다) in formal written essays -> 중요하다.',
          bn: 'লিখিত প্রবন্ধে বিশেষণ পদ অপরিবর্তিত (-다) থাকে -> 중요하다।',
          ne: 'लिखित निबन्धमा विशेषणको मूल रूप (-다) नै प्रयोग हुन्छ -> 중요하다।',
          ur: 'تحریری مضامین میں صفت اپنی اصل شکل (-다) میں رہتی ہے -> 중요하다۔',
        },
      },
    ],
  },
];

// ================= MODULE 10: KOREAN FOR EVERYDAY LIFE (16 CATEGORIES) =================
export interface EverydayLifeCategory16 {
  id: string;
  order: number;
  titleKo: string;
  title: QuadLangText;
  situation: QuadLangText;
  dialogue: Array<{
    speaker: string;
    ko: string;
    romanization: string;
    translation: QuadLangText;
  }>;
  keyVocab: Array<{
    ko: string;
    romanization: string;
    meaning: QuadLangText;
  }>;
}

export const EVERYDAY_LIFE_16_CATEGORIES: EverydayLifeCategory16[] = [
  {
    id: 'life-1',
    order: 1,
    titleKo: '공항에서',
    title: { en: '1. At the Airport', bn: '১. বিমানবন্দরে (At the Airport)', ne: '१. विमानस्थलमा (At the Airport)', ur: '1. ایئرپورٹ پر (At the Airport)' },
    situation: {
      en: 'Arriving at Incheon International Airport, finding baggage claim, and buying a USIM/T-money card.',
      bn: 'ইনচন আন্তর্জাতিক বিমানবন্দরে নেমে লাগেজ সংগ্রহ ও সিম/টি-মানি কার্ড কেনা।',
      ne: 'इन्चोन विमानस्थलमा ओर्लेर लगेज लिने र सिम/टी-मनी कार्ड किन्ने।',
      ur: 'انچن انٹرنیشنل ایئرپورٹ پر اتر کر سامان لینا اور سم/ٹی منی کارڈ خریدنا۔',
    },
    dialogue: [
      { speaker: 'Student', ko: '실례합니다, 수하물 찾는 곳이 어디예요?', romanization: 'Sillyehamnida, suhamul channeun gosi eodiyeyo?', translation: { en: 'Excuse me, where is the baggage claim area?', bn: 'এক্সকিউজ মি, লাগেজ নেওয়ার জায়গাটি কোথায়?', ne: 'माफ गर्नुहोस्, लगेज लिने ठाउँ कहाँ छ?', ur: 'معاف کیجیے، سامان (لگیج) لینے کی جگہ کہاں ہے؟' } },
      { speaker: 'Staff', ko: '저기 오른쪽 에스컬레이터를 타고 내려가시면 됩니다.', romanization: 'Jeogi oreunjjok eseukeolleiteoreul tago naeryeogasimyeon doemnida.', translation: { en: 'Take the escalator on the right over there and go down.', bn: 'ওই যে ডান পাশের এসকেলেটরে করে নিচে নামলেই পাবেন।', ne: 'त्यहाँ दायाँपट्टिको एस्केलेटर चढेर तल जानुहोस्।', ur: 'وہاں دائیں طرف والی ایسکلیٹر سے نیچے تشریف لے جائیں۔' } },
    ],
    keyVocab: [
      { ko: '수하물', romanization: 'suhamul', meaning: { en: 'Baggage / Luggage', bn: 'লাগেজ / মালপত্র', ne: 'लगेज / सामान', ur: 'سامان / لگیج' } },
      { ko: '탑승구', romanization: 'tapseunggu', meaning: { en: 'Boarding gate', bn: 'বোর্ডিং গেট', ne: 'बोर्डिङ गेट', ur: 'بورڈنگ گیٹ' } },
    ],
  },
  {
    id: 'life-2',
    order: 2,
    titleKo: '출입국·비자 사무소',
    title: { en: '2. Immigration & Visa Office', bn: '২. ইমিগ্রেশন ও ভিসা অফিস', ne: '२. अध्यागमन र भिसा कार्यालय', ur: '2. امیگریشن اور ویزا آفس' },
    situation: {
      en: 'Applying for your Alien Registration Card (ARC) and extending a D-2/D-4 student visa.',
      bn: 'ফরেনার রেজিস্ট্রেশন কার্ড (ARC) আবেদন এবং D-2/D-4 ছাত্র ভিসার মেয়াদ বৃদ্ধি।',
      ne: 'विदेशी दर्ता कार्ड (ARC) आवेदन र D-2/D-4 विद्यार्थी भिसा नवीकरण।',
      ur: 'ایلین رجسٹریشن کارڈ (ARC) کے لیے درخواست دینا اور اسٹوڈنٹ ویزا میں توسیع کروانا۔',
    },
    dialogue: [
      { speaker: 'Student', ko: '안녕하세요. 외국인등록증을 신청하러 왔습니다.', romanization: 'Annyeonghaseyo. Oegugindeungnokjeungeul sincheonghareo watseumnida.', translation: { en: 'Hello. I came to apply for my Alien Registration Card.', bn: 'হ্যালো। আমি এআরসি (ARC) কার্ডের আবেদন করতে এসেছি।', ne: 'नमस्ते। म विदेशी दर्ता कार्ड (ARC) 신청 गर्न आएको हुँ।', ur: 'السلام علیکم۔ میں اپنا اے آر سی (ARC) کارڈ بنوانے آیا ہوں۔' } },
      { speaker: 'Officer', ko: '여권과 재학증명서, 거주지 확인서를 제출해 주세요.', romanization: 'Yeogwongwa jaehakjeungmyeongseo, geojuji hwaginseoreul jechulhae juseyo.', translation: { en: 'Please submit your passport, certificate of enrollment, and proof of residence.', bn: 'আপনার পাসপোর্ট, অধ্যয়ন সনদ এবং বাসস্থানের প্রমাণপত্র জমা দিন।', ne: 'कृपया राहदानी, भर्ना प्रमाणपत्र र बसोबास प्रमाण बुझाउनुहोस्।', ur: 'براہِ کرم اپنا پاسپورٹ، یونیورسٹی انرولمنٹ سرٹیفکیٹ اور رہائش کا ثبوت جمع کروائیں۔' } },
    ],
    keyVocab: [
      { ko: '외국인등록증', romanization: 'oegugindeungnokjeung', meaning: { en: 'Alien Registration Card (ARC)', bn: 'এআরসি কার্ড', ne: 'ARC कार्ड', ur: 'اے آر سی کارڈ' } },
      { ko: '체류 기간 연장', romanization: 'cheryu gigan yeonjang', meaning: { en: 'Extension of stay', bn: 'অবস্থানের মেয়াদ বৃদ্ধি', ne: 'बसाइ अवधि थप', ur: 'قیام کی مدت میں توسیع' } },
    ],
  },
  {
    id: 'life-3',
    order: 3,
    titleKo: '대학교 수강신청 및 등록',
    title: { en: '3. University Registration', bn: '৩. বিশ্ববিদ্যালয় নিবন্ধন ও কোর্স রেজিস্ট্রেশন', ne: '३. विश्वविद्यालय दर्ता र कोर्स छनोट', ur: '3. یونیورسٹی رجسٹریشن اور کورس کا انتخاب' },
    situation: {
      en: 'Registering for semester courses (수강신청) and paying tuition at the international office.',
      bn: 'সেমিস্টারের কোর্স রেজিস্ট্রেশন (수강신청) এবং ইন্টারন্যাশনাল অফিসে টিউশন ফি জমা দেওয়া।',
      ne: 'सेमेस्टर कोर्स दर्ता (수강신청) र अन्तर्राष्ट्रिय कार्यालयमा शुल्क बुझाउने।',
      ur: 'سمسٹر کے مضامین کی رجسٹریشن (수강신청) اور انٹرنیشنل آفس میں فیس جمع کروانا۔',
    },
    dialogue: [
      { speaker: 'Student', ko: '이번 학기 수강신청 기간이 언제까지인가요?', romanization: 'Ibeon hakgi sugangsincheong gigani eonjekkajiingayo?', translation: { en: 'Until when is the course registration period this semester?', bn: 'এই সেমিস্টারের কোর্স রেজিস্ট্রেশনের সময়সীমা কবে পর্যন্ত?', ne: 'यस सेमेस्टरको कोर्स दर्ता गर्ने म्याद कहिलेसम्म हो?', ur: 'اس سمسٹر میں کورس رجسٹریشن کی آخری تاریخ کب تک ہے؟' } },
      { speaker: 'Staff', ko: '이번 주 금요일 오후 다섯 시까지 온라인으로 신청하셔야 합니다.', romanization: 'Ibeon ju geumyoil ohu daseot sikkaji onraineuro sincheonghasyeoya hamnida.', translation: { en: 'You must register online by 5 PM this Friday.', bn: 'এই শুক্রবার বিকেল ৫টার মধ্যে অনলাইনে রেজিস্ট্রেশন করতে হবে।', ne: 'यो शुक्रबार दिउँसो ५ बजेभित्र अनलाइन दर्ता गर्नुपर्छ।', ur: 'آپ کو اس جمعہ کی شام پانچ بجے تک آن لائن رجسٹریشن مکمل کرنی ہو گی۔' } },
    ],
    keyVocab: [
      { ko: '수강신청', romanization: 'sugangsincheong', meaning: { en: 'Course registration', bn: 'কোর্স রেজিস্ট্রেশন', ne: 'कोर्स दर्ता', ur: 'کورس رجسٹریشن' } },
      { ko: '등록금 고지서', romanization: 'deungnokgeum gojiseo', meaning: { en: 'Tuition invoice', bn: 'টিউশন ফি ইনভয়েস', ne: 'शुल्क बिल', ur: 'ٹیوشن فیس کا چالان' } },
    ],
  },
  {
    id: 'life-4',
    order: 4,
    titleKo: '교수님과 상담하기',
    title: { en: '4. Talking to Professors', bn: '৪. প্রফেসরের সাথে কথা বলা ও পরামর্শ', ne: '४. प्रोफेसरसँग संवाद र परामर्श', ur: '4. پروفیسر سے گفتگو اور مشاورت' },
    situation: {
      en: 'Visiting a professor’s office using proper Korean academic honorifics.',
      bn: 'সঠিক সম্মানসূচক কোরিয়ান ভাষায় প্রফেসরের সাথে গবেষণা ও ক্লাস নিয়ে আলোচনা।',
      ne: 'उचित आदरार्थी भाषा प्रयोग गरी प्रोफेसरसँग अध्ययनबारे छलफल।',
      ur: 'مؤدبانہ تعلیمی انداز میں پروفیسر سے کلاس اور تحقیق کے بارے میں بات چیت۔',
    },
    dialogue: [
      { speaker: 'Student', ko: '교수님, 잠시 시간 괜찮으십니까? 과제에 대해 여쭤볼 것이 있습니다.', romanization: 'Gyosunim, jamsi sigan gwaenchaneusimnikka? Gwajee daehae yeojjwobol geosi itseumnida.', translation: { en: 'Professor, do you have a moment? I have something to ask you about the assignment.', bn: 'প্রফেসর, আপনার কি একটু সময় হবে? অ্যাসাইনমেন্ট সম্পর্কে একটি বিষয় জানার ছিল।', ne: 'प्रोफेसर, के हजुरसँग एकैछिन समय छ? असाइनमेन्टबारे सोध्नु थियो।', ur: 'پروفیسر صاحب، کیا آپ کے پاس تھوڑا وقت ہے؟ مجھے اسائنمنٹ کے بارے میں کچھ پوچھنا تھا۔' } },
      { speaker: 'Professor', ko: '그래요, 들어오세요. 어떤 부분이 궁금한가요?', romanization: 'Geuraeyo, deureooseyo. Eotteon bubuni gunggeumhangayo?', translation: { en: 'Sure, come in. Which part are you curious about?', bn: 'হ্যাঁ, ভেতরে আসুন। কোন অংশটি জানতে চান?', ne: 'हुन्छ, भित्र आउनुहोस्। कुन भागबारे जान्न चाहनुहुन्छ?', ur: 'جی بالکل، اندر آ جائیے۔ آپ کس حصے کے بارے میں پوچھنا چاہتے ہیں؟' } },
    ],
    keyVocab: [
      { ko: '여쭤보다', romanization: 'yeojjwoboda', meaning: { en: 'To ask (Humble honorific)', bn: 'জিজ্ঞাসা করা (সম্মানসূচক)', ne: 'सोध्नु (आदरार्थी)', ur: 'پوچھنا (مؤدبانہ)' } },
      { ko: '면담 신청', romanization: 'myeondam sincheong', meaning: { en: 'Consultation request', bn: 'সাক্ষাতের আবেদন', ne: 'भेटघाट अनुरोध', ur: 'ملاقات کی درخواست' } },
    ],
  },
  {
    id: 'life-5',
    order: 5,
    titleKo: '기숙사 생활',
    title: { en: '5. Dormitory Conversations', bn: '৫. ডরমিটরি বা ছাত্রাবাসের কথোপকথন', ne: '५. होस्टेल (छात्रावास) कुराकानी', ur: '5. ہاسٹل (ڈورمیٹری) کی گفتگو' },
    situation: {
      en: 'Checking into the campus dormitory, curfew rules, parcel pickup, and talking with your roommate.',
      bn: 'ক্যাম্পাস ডরমিটরিতে চেক-ইন, প্রবেশের সময়সীমা, পার্সেল গ্রহণ এবং রুমমেটের সাথে কথা বলা।',
      ne: 'होस्टेलमा चेक-इन, समय नियम, पार्सल लिने र रुममेटसँग कुराकानी।',
      ur: 'کیمپس ہاسٹل میں چیک ان، اوقات کی پابندی، پارسل وصول کرنا اور روم میٹ سے بات چیت۔',
    },
    dialogue: [
      { speaker: 'Student', ko: '관리실 선생님, 제 이름으로 온 택배가 있나요?', romanization: 'Gwallisil seonsaengnim, je ireumeuro on taekbaega innayo?', translation: { en: 'Excuse me (dorm office), is there a parcel that arrived under my name?', bn: 'অফিস স্যার, আমার নামে কি কোনো কুরিয়ার পার্সেল এসেছে?', ne: 'सर, मेरो नाममा कुनै पार्सल (कुरियर) आएको छ?', ur: 'سر، کیا میرے نام سے کوئی کوریئر پارسل آیا ہے؟' } },
      { speaker: 'Manager', ko: '방 번호와 이름을 말씀해 주시면 확인해 드릴게요.', romanization: 'Bang beonhowa ireumeul malsseumhae jusimyeon hwaginhae deurilgeyo.', translation: { en: 'Tell me your room number and name, and I will check for you.', bn: 'আপনার রুম নম্বর ও নাম বলুন, আমি দেখে দিচ্ছি।', ne: 'तपाईंको कोठा नम्बर र नाम भन्नुहोस्, म हेरिदिन्छु।', ur: 'اپنا کمرہ نمبر اور نام بتائیں، میں ابھی چیک کر دیتا ہوں۔' } },
    ],
    keyVocab: [
      { ko: '통금 시간', romanization: 'tonggeum sigan', meaning: { en: 'Curfew time', bn: 'ডরমিটরিতে ফেরার শেষ সময়', ne: 'होस्टेल फर्कने अन्तिम समय', ur: 'ہاسٹل واپسی کا آخری وقت' } },
      { ko: '택배 보관함', romanization: 'taekbae bogwanham', meaning: { en: 'Parcel locker', bn: 'পার্সেল লকার', ne: 'पार्सल लकर', ur: 'پارسل لاکر' } },
    ],
  },
  {
    id: 'life-6',
    order: 6,
    titleKo: '집 구하기 (원룸·고시원)',
    title: { en: '6. Finding Accommodation', bn: '৬. আবাসন খোঁজা (ওয়ান-রুম ও গোশিওন)', ne: '६. कोठा खोज्ने (वन-रुम र गोशिवन)', ur: '6. رہائش تلاش کرنا (ون روم اور گوشی وون)' },
    situation: {
      en: 'Talking to a real estate agent (부동산) about deposit (보증금), monthly rent (월세), and maintenance fees (관리비).',
      bn: 'রিয়েল এস্টেট এজেন্টের (부동산) সাথে ডিপোজিট (보증금), মাসিক ভাড়া (월세) এবং মেইনটেন্যান্স ফি নিয়ে কথা বলা।',
      ne: 'घरजग्गा एजेन्टसँग धरौटी (보증금), मासिक भाडा (월세) र मर्मत शुल्कबारे कुरा गर्ने।',
      ur: 'پراپرٹی ایجنٹ سے سیکیورٹی ڈپازٹ (보증금)، ماہانہ کرایہ (월세) اور مینٹیننس فیس کے بارے میں بات کرنا۔',
    },
    dialogue: [
      { speaker: 'Student', ko: '학교 근처에 보증금이 낮은 원룸이 있을까요?', romanization: 'Hakgyo geuncheoe bojeunggeumi najeun wonrumi isseulkkayo?', translation: { en: 'Is there a one-room studio with a low deposit near the university?', bn: 'বিশ্ববিদ্যালয়ের কাছে কম ডিপোজিটের কোনো ওয়ান-রুম পাওয়া যাবে কি?', ne: 'विश्वविद्यालय नजिकै कम धरौटी भएको वन-रुम पाइएला?', ur: 'کیا یونیورسٹی کے قریب کم ڈپازٹ والا کوئی ون روم اسٹوڈیو مل سکتا ہے؟' } },
      { speaker: 'Agent', ko: '네, 보증금 300만 원에 월세 40만 원인 깨끗한 방이 하나 있어요.', romanization: 'Ne, bojeunggeum sambaengman wone wolse sasimman wonin kkaekkeuthan bang-i hana isseoyo.', translation: { en: 'Yes, there is a clean room with a 3 million KRW deposit and 400,000 KRW monthly rent.', bn: 'হ্যাঁ, ৩০ লাখ ওন ডিপোজিট এবং মাসে ৪ লাখ ওন ভাড়ার একটি পরিষ্কার রুম আছে।', ne: 'हजुर, ३० लाख वोन धरौटी र मासिक ४ लाख वोन भाडा भएको सफा कोठा छ।', ur: 'جی ہاں، تیس لاکھ وون ڈپازٹ اور چار لاکھ وون ماہانہ کرائے والا ایک صاف کمرہ موجود ہے۔' } },
    ],
    keyVocab: [
      { ko: '보증금 / 월세', romanization: 'bojeunggeum / wolse', meaning: { en: 'Security deposit / Monthly rent', bn: 'ডিপোজিট / মাসিক ভাড়া', ne: 'धरौटी / मासिक भाडा', ur: 'سیکیورٹی ڈپازٹ / ماہانہ کرایہ' } },
      { ko: '관리비', romanization: 'gwallibi', meaning: { en: 'Maintenance / Utility fee', bn: 'মেইনটেন্যান্স ও ইউটিলিটি বিল', ne: 'व्यवस्थापन शुल्क', ur: 'مینٹیننس چارجز' } },
    ],
  },
  {
    id: 'life-7',
    order: 7,
    titleKo: '대중교통 이용하기',
    title: { en: '7. Public Transportation', bn: '৭. গণপরিবহন ও টি-মানি কার্ড', ne: '७. सार्वजनिक यातायात र टी-मनी', ur: '7. پبلک ٹرانسپورٹ اور ٹی منی کارڈ' },
    situation: {
      en: 'Recharging a T-money card and taking intercity KTX or express buses.',
      bn: 'টি-মানি কার্ড রিচার্জ করা এবং আন্তঃনগর KTX ট্রেন বা এক্সপ্রেস বাসে ভ্রমণ।',
      ne: 'टी-मनी कार्ड रिचार्ज गर्ने र KTX रेल वा बसमा यात्रा गर्ने।',
      ur: 'ٹی منی کارڈ ریچارج کرنا اور KTX ٹرین یا ایکسپریس بس میں سفر کرنا۔',
    },
    dialogue: [
      { speaker: 'Student', ko: '교통카드에 만 원 충전해 주세요.', romanization: 'Gyotongkadeue man won chungjeonhae juseyo.', translation: { en: 'Please recharge 10,000 KRW onto my transit card.', bn: 'আমার ট্রানজিট কার্ডে ১০,০০০ ওন রিচার্জ করে দিন।', ne: 'मेरो यातायात कार्डमा १०,००० वोन रिचार्ज गरिदिनुहोस्।', ur: 'براہِ کرم میرے ٹرانزٹ کارڈ میں دس ہزار وون ریچارج کر دیں۔' } },
      { speaker: 'Clerk', ko: '네, 단말기 위에 카드를 올려놓으세요.', romanization: 'Ne, danmalgi wie kadeureul ollyeonoeuseyo.', translation: { en: 'Sure, please place your card on top of the reader.', bn: 'জি, কার্ড রিডারের ওপর আপনার কার্ডটি রাখুন।', ne: 'हजुर, कार्ड रिडरमाथि कार्ड राख्नुहोस्।', ur: 'جی، کارڈ ریڈر کے اوپر اپنا کارڈ رکھیں۔' } },
    ],
    keyVocab: [
      { ko: '교통카드 충전', romanization: 'gyotongkadeu chungjeon', meaning: { en: 'Transit card top-up', bn: 'ট্রানজিট কার্ড রিচার্জ', ne: 'यातायात कार्ड रिचार्ज', ur: 'ٹرانزٹ کارڈ ریچارج' } },
      { ko: '환승 할인', romanization: 'hwanseung harin', meaning: { en: 'Transfer discount', bn: 'ট্রান্সফার ডিসকাউন্ট', ne: 'ट्रान्सफर छुट', ur: 'ٹرانسفر ڈسکاؤنٹ' } },
    ],
  },
  {
    id: 'life-8',
    order: 8,
    titleKo: '지하철과 버스',
    title: { en: '8. Subway & Bus', bn: '৮. সাবওয়ে ও বাস চলাচল', ne: '८. सबवे र बस यात्रा', ur: '8. سب وے اور بس کا سفر' },
    situation: {
      en: 'Asking which subway exit to take and checking bus stops.',
      bn: 'সাবওয়ের সঠিক এক্সিট নম্বর এবং বাসের গন্তব্য সম্পর্কে জিজ্ঞাসা করা।',
      ne: 'सबवेको सही गेट (Exit) र बस बिसौनी सोध्ने।',
      ur: 'سب وے کے درست ایگزٹ نمبر اور بس اسٹاپ کے بارے میں پوچھنا۔',
    },
    dialogue: [
      { speaker: 'Student', ko: '이 버스가 서울역까지 가나요?', romanization: 'I beoseuga Seouryeokkkaji ganayo?', translation: { en: 'Does this bus go to Seoul Station?', bn: 'এই বাসটি কি সিউল স্টেশন পর্যন্ত যায়?', ne: 'के यो बस सियोल स्टेशनसम्म जान्छ?', ur: 'کیا یہ بس سیول اسٹیشن تک جاتی ہے؟' } },
      { speaker: 'Driver', ko: '네, 세 정거장 뒤에 내리시면 됩니다.', romanization: 'Ne, se jeonggeojang dwie naerisimyeon doemnida.', translation: { en: 'Yes, you can get off after three stops.', bn: 'হ্যাঁ, তিন স্টপেজ পরে নামলেই হবে।', ne: 'हजुर, तीन स्टप पछि ओर्लनुहोस्।', ur: 'جی ہاں، تین اسٹاپ کے بعد اتر جائیے گا۔' } },
    ],
    keyVocab: [
      { ko: '정거장 / 역', romanization: 'jeonggeojang / yeok', meaning: { en: 'Bus stop / Subway station', bn: 'বাস স্টপেজ / সাবওয়ে স্টেশন', ne: 'बस स्टप / सबवे स्टेशन', ur: 'بس اسٹاپ / سب وے اسٹیشن' } },
      { ko: '몇 번 출구', romanization: 'myeot beon chulgu', meaning: { en: 'Which exit number', bn: 'কত নম্বর এক্সিট গেট', ne: 'कति नम्बर बाहिर निस्कने गेट', ur: 'کون سا ایگزٹ نمبر' } },
    ],
  },
  {
    id: 'life-9',
    order: 9,
    titleKo: '식당에서 음식 주문하기',
    title: { en: '9. Ordering Food', bn: '৯. রেস্তোরাঁয় খাবার অর্ডার করা', ne: '९. रेस्टुरेन्टमा खाना अर्डर गर्ने', ur: '9. ریستوران میں کھانا آرڈر کرنا' },
    situation: {
      en: 'Ordering meals, asking about ingredients (pork/beef/halal/vegetarian), and requesting side dishes.',
      bn: 'খাবার অর্ডার করা, খাবারের উপাদান (হালাল/নিরামিষ/মাংস) সম্পর্কে জানা এবং বিল পরিশোধ।',
      ne: 'खाना अर्डर गर्ने, सामग्री (मासु/शाकाहारी/हलाल) सोध्ने र बिल तिर्ने।',
      ur: 'کھانا آرڈر کرنا، اجزاء (حلال/گوشت/سبزی) کے بارے میں پوچھنا اور بل ادا کرنا۔',
    },
    dialogue: [
      { speaker: 'Student', ko: '저기요, 이 음식에 돼지고기가 들어가나요?', romanization: 'Jeogiyo, i eumsige dwaejigogiga deureoganayo?', translation: { en: 'Excuse me, does this dish contain pork?', bn: 'এক্সকিউজ মি, এই খাবারে কি শুকরের মাংস আছে?', ne: 'माफ गर्नुहोस्, के यो खानामा बंगुरको मासु मिसाइएको छ?', ur: 'معاف کیجیے، کیا اس کھانے میں سور کا گوشت شامل ہے؟' } },
      { speaker: 'Server', ko: '아니요, 소고기와 야채만 들어갑니다.', romanization: 'Aniyo, sogogiwa yachaeman deureogamnida.', translation: { en: 'No, it only contains beef and vegetables.', bn: 'না, এতে কেবল গরুর মাংস এবং সবজি আছে।', ne: 'छैन, यसमा गाईको मासु र तरकारी मात्र छ।', ur: 'نہیں، اس میں صرف گائے کا گوشت اور سبزیاں شامل ہیں۔' } },
    ],
    keyVocab: [
      { ko: '돼지고기 빼 주세요', romanization: 'dwaejigogi ppae juseyo', meaning: { en: 'Please leave out pork', bn: 'দয়া করে পর্ক/শুকরের মাংস বাদ দিন', ne: 'कृपया बंगुरको मासु नराख्नुहोस्', ur: 'براہِ کرم سور کا گوشت شامل نہ کریں' } },
      { ko: '포장해 주세요', romanization: 'pojanghae juseyo', meaning: { en: 'Please pack it to go (Takeout)', bn: 'পার্সেল করে দিন', ne: 'प्याक गरिदिनुहोस् (टेकअवे)', ur: 'براہِ کرم پیک کر دیں (ٹیک اوے)' } },
    ],
  },
  {
    id: 'life-10',
    order: 10,
    titleKo: '쇼핑 및 마트',
    title: { en: '10. Shopping', bn: '১০. কেনাকাটা ও সুপারমার্কেট', ne: '१०. किनमेल र मार्ट', ur: '10. خریداری اور سپر مارکیٹ' },
    situation: {
      en: 'Asking for sizes, discounts, receipts, and exchanging items at Korean stores.',
      bn: 'দোকান বা মার্টে সাইজ, ডিসকাউন্ট, রসিদ এবং পণ্য পরিবর্তন সম্পর্কে কথা বলা।',
      ne: 'पसलमा साइज, छुट, रसिद र सामान साट्नेबारे कुराकानी।',
      ur: 'دکان یا مارٹ میں سائز، ڈسکاؤنٹ، رسید اور چیز تبدیل کرنے کے بارے میں گفتگو۔',
    },
    dialogue: [
      { speaker: 'Student', ko: '이 옷 한 치수 더 큰 걸로 입어 봐도 될까요?', romanization: 'I ot han chisu deo keun geollo ibeo bwado doelkkayo?', translation: { en: 'May I try on this outfit in one size larger?', bn: 'এই পোশাকটির এক সাইজ বড়টা কি পরে দেখতে পারি?', ne: 'यो लुगा एक साइज ठूलो लगाएर हेर्न मिल्छ?', ur: 'کیا میں اس لباس کا ایک سائز بڑا پہن کر چیک کر سکتا ہوں؟' } },
      { speaker: 'Clerk', ko: '네, 탈의실은 저쪽 왼쪽에 있습니다.', romanization: 'Ne, taruisireun jeojjok oenjjoge itseumnida.', translation: { en: 'Yes, the fitting room is over there on the left.', bn: 'জি, ট্রায়াল রুম ওই যে বাম দিকে।', ne: 'हजुर, ট্রायल रुम त्यहाँ बायाँपट्टि छ।', ur: 'جی ہاں، ٹرائل روم وہاں بائیں طرف ہے۔' } },
    ],
    keyVocab: [
      { ko: '영수증 / 환불', romanization: 'yeongsujeung / hwanbul', meaning: { en: 'Receipt / Refund', bn: 'রসিদ / রিফান্ড', ne: 'रसिद / फिर्ता (रिफन्ड)', ur: 'رسید / رقم کی واپسی' } },
      { ko: '일시불', romanization: 'ilsibul', meaning: { en: 'One-time full card payment', bn: 'একবারে পূর্ণ কার্ড পেমেন্ট', ne: 'एकैपटक पूरा भुक्तानी', ur: 'یکمشت کارڈ ادائیگی' } },
    ],
  },
  {
    id: 'life-11',
    order: 11,
    titleKo: '병원과 약국',
    title: { en: '11. Hospitals & Pharmacies', bn: '১১. হাসপাতাল ও ফার্মেসি', ne: '११. अस्पताल र औषधि पसल', ur: '11. ہسپتال اور فارمیسی' },
    situation: {
      en: 'Explaining symptoms to a doctor in Korea and getting medicine at a pharmacy.',
      bn: 'ডাক্তারের কাছে রোগের লক্ষণ বলা এবং ফার্মেসি থেকে ওষুধ খাওয়ার নিয়ম বুঝে নেওয়া।',
      ne: 'डाक्टरलाई लक्षण बताउने र फार्मेसीबाट औषधि खाने तरिका बुझ्ने।',
      ur: 'ڈاکٹر کو بیماری کی علامات بتانا اور فارمیسی سے دوا کھانے کا طریقہ سمجھنا۔',
    },
    dialogue: [
      { speaker: 'Student', ko: '어제부터 열이 나고 목이 많이 아파요.', romanization: 'Eojebuteo yeori nago mogi mani apayo.', translation: { en: 'Since yesterday I have had a fever and a very sore throat.', bn: 'গতকাল থেকে আমার জ্বর এসেছে এবং গলায় খুব ব্যথা করছে।', ne: 'हिजोदेखि ज्वरो आएको छ र घाँटी धेरै दुखेको छ।', ur: 'کل سے مجھے بخار ہے اور گلے میں شدید درد ہے۔' } },
      { speaker: 'Pharmacist', ko: '이 약은 하루 세 번, 식후 30분에 드세요.', romanization: 'I yageun haru se beon, sikhu samsip-bune deuseyo.', translation: { en: 'Take this medicine three times a day, 30 minutes after meals.', bn: 'এই ওষুধটি দিনে তিনবার, খাবার ৩০ মিনিট পরে খাবেন।', ne: 'यो औषधि दिनको तीन पटक, खाना खाएको ३० मिनेट पछि खानुहोस्।', ur: 'یہ دوا دن میں تین بار، کھانے کے تیس منٹ بعد لیں۔' } },
    ],
    keyVocab: [
      { ko: '국민건강보험', romanization: 'gungmingeongangboheom', meaning: { en: 'National Health Insurance (NHIS)', bn: 'জাতীয় স্বাস্থ্য বীমা', ne: 'राष्ट्रिय स्वास्थ्य बीमा', ur: 'قومی ہیلتھ انشورنس' } },
      { ko: '식후 30분', romanization: 'sikhu samsip-bun', meaning: { en: '30 minutes after meals', bn: 'খাবারের ৩০ মিনিট পর', ne: 'खाना खाएको ३० मिनेट पछि', ur: 'کھانے کے تیس منٹ بعد' } },
    ],
  },
  {
    id: 'life-12',
    order: 12,
    titleKo: '아르바이트 구하기',
    title: { en: '12. Part-Time Jobs', bn: '১২. পার্ট-টাইম জব ও ইন্টারভিউ', ne: '१२. पार्ट-टाइम जागिर र अन्तर्वार्ता', ur: '12. پارٹ ٹائم ملازمت اور انٹرویو' },
    situation: {
      en: 'Inquiring about a student part-time job (아르바이트), hourly minimum wage (시급), and working hours.',
      bn: 'পার্ট-টাইম জবের ইন্টারভিউ, ঘণ্টাপ্রতি বেতন (시급) এবং কাজের সময়সূচি নিয়ে কথা বলা।',
      ne: 'पार्ट-टाइम कामको अन्तर्वार्ता, प्रतिघण्टा पारिश्रमिक (시급) र समयबारे कुरा गर्ने।',
      ur: 'پارٹ ٹائم جاب کے انٹرویو، فی گھنٹہ اجرت (시급) اور کام کے اوقات کے بارے میں بات چیت۔',
    },
    dialogue: [
      { speaker: 'Student', ko: '아르바이트 공고를 보고 연락드렸습니다. 주말 근무인가요?', romanization: 'Areubaiteu gonggoreul bogo yeollakdeuryeotseumnida. Jumal geunmuingayo?', translation: { en: 'I am contacting you after seeing the part-time job posting. Is it weekend work?', bn: 'পার্ট-টাইম কাজের বিজ্ঞপ্তি দেখে যোগাযোগ করছি। এটি কি সাপ্তাহিক ছুটির দিনের কাজ?', ne: 'पार्ट-टाइम कामको विज्ञापन देखेर सम्पर्क गरेको हुँ। के यो सप्ताहन्तको काम हो?', ur: 'میں نے پارٹ ٹائم ملازمت کا اشتہار دیکھ کر رابطہ کیا ہے۔ کیا یہ ویک اینڈ کا کام ہے؟' } },
      { speaker: 'Employer', ko: '네, 토요일과 일요일 하루 다섯 시간씩 근무합니다.', romanization: 'Ne, toyoilgwa iryoil haru daseot siganssik geunmuhamnida.', translation: { en: 'Yes, you work five hours a day on Saturdays and Sundays.', bn: 'হ্যাঁ, শনিবার ও রবিবার প্রতিদিন পাঁচ ঘণ্টা করে কাজ।', ne: 'हजुर, शनिबार र आइतबार दिनको पाँच घण्टा काम हुन्छ।', ur: 'جی ہاں، ہفتہ اور اتوار کو روزانہ پانچ گھنٹے کام ہوتا ہے۔' } },
    ],
    keyVocab: [
      { ko: '시급 / 근로계약서', romanization: 'sigeup / geullogyeyakseo', meaning: { en: 'Hourly wage / Employment contract', bn: 'ঘণ্টাপ্রতি মজুরি / কাজের চুক্তিপত্র', ne: 'प्रतिघण्टा ज्याला / श्रम सम्झौता', ur: 'فی گھنٹہ اجرت / ملازمت کا معاہدہ' } },
    ],
  },
  {
    id: 'life-13',
    order: 13,
    titleKo: '직장 및 사무실 예절',
    title: { en: '13. Workplace Conversations', bn: '১৩. কর্মক্ষেত্রের কথোপকথন ও শিষ্টাচার', ne: '१३. कार्यस्थल संवाद र शिष्टाचार', ur: '13. دفتر اور کام کی جگہ پر گفتگو' },
    situation: {
      en: 'Greeting coworkers, reporting task completion, and using polite workplace expressions.',
      bn: 'সহকর্মীদের অভিবাদন জানানো, কাজের রিপোর্ট জমা দেওয়া এবং অফিসের ভদ্র অভিব্যক্তি।',
      ne: 'सहकर्मीलाई अभिवादन गर्ने, कामको रिपोर्ट बुझाउने र कार्यालय शिष्टाचार।',
      ur: 'ساتھی کارکنان سے سلام و آداب، کام کی رپورٹ دینا اور دفتری آداب۔',
    },
    dialogue: [
      { speaker: 'Employee', ko: '팀장님, 요청하신 자료 정리를 마쳤습니다. 확인 부탁드립니다.', romanization: 'Timjangnim, yocheonghasin jaryo jeongnireul machyeotseumnida. Hwagin butakdeurimnida.', translation: { en: 'Team Leader, I have finished organizing the materials you requested. Please review them.', bn: 'টিম লিডার, আপনার চাওয়া ফাইলগুলো গোছানো শেষ হয়েছে। দয়া করে একটু দেখবেন।', ne: 'टिम लिडरज्यू, हजुरले माग्नुभएको सामग्री तयार भयो। कृपया जाँच गरिदिनुहोला।', ur: 'ٹیم لیڈر صاحب، آپ کی مطلوبہ معلومات ترتیب دے دی گئی ہیں۔ براہِ کرم جائزہ لے لیں۔' } },
      { speaker: 'Manager', ko: '수고했어요. 검토해 보고 다시 이야기합시다.', romanization: 'Sugohaesseoyo. Geomtohae bogo dasi iyagihapsida.', translation: { en: 'Good job. Let’s review it and talk again.', bn: 'ভালো কাজ করেছেন। পর্যালোচনা করে আবার কথা বলব।', ne: 'राम्रो काम गर्नुभयो। हेरेर फेरि कुरा गरौँला।', ur: 'بہت خوب۔ میں دیکھ کر دوبارہ بات کرتا ہوں۔' } },
    ],
    keyVocab: [
      { ko: '수고하셨습니다', romanization: 'sugohasyeotseumnida', meaning: { en: 'Thank you for your hard work', bn: 'আপনার পরিশ্রমের জন্য ধন্যবাদ', ne: 'तपाईंको मिहिनेतको लागि धन्यवाद', ur: 'آپ کی محنت کا شکریہ' } },
    ],
  },
  {
    id: 'life-14',
    order: 14,
    titleKo: '은행 및 휴대폰 개통',
    title: { en: '14. Bank & Mobile Services', bn: '১৪. ব্যাংক অ্যাকাউন্ট ও মোবাইল সিম সেবা', ne: '१४. बैंक खाता र मोबाइल सेवा', ur: '14. بینک اکاؤنٹ اور موبائل سم سروس' },
    situation: {
      en: 'Opening a Korean bank account, getting a check card, and activating a postpaid mobile plan.',
      bn: 'কোরিয়ায় ব্যাংক অ্যাকাউন্ট খোলা, চেক কার্ড নেওয়া এবং মোবাইল সিম চালু করা।',
      ne: 'कोरियामा बैंक खाता खोल्ने, चेक कार्ड लिने र मोबाइल सिम सुचारु गर्ने।',
      ur: 'کوریا میں بینک اکاؤنٹ کھولنا، ڈیبٹ کارڈ لینا اور موبائل سم ایکٹیویٹ کروانا۔',
    },
    dialogue: [
      { speaker: 'Student', ko: '유학생 통장과 체크카드를 만들고 싶습니다.', romanization: 'Yuhaksaeng tongjanggwa chekeukadeureul mandeulgo sipseumnida.', translation: { en: 'I would like to open a student bank account and get a debit check card.', bn: 'আমি স্টুডেন্ট ব্যাংক অ্যাকাউন্ট এবং একটি চেক কার্ড করতে চাই।', ne: 'म विद्यार्थी बैंक खाता र चेक कार्ड बनाउन चाहन्छु।', ur: 'میں اسٹوڈنٹ بینک اکاؤنٹ کھولنا اور چیک کارڈ بنوانا چاہتا ہوں۔' } },
      { speaker: 'Banker', ko: '외국인등록증과 여권을 보여 주시고 신청서를 작성해 주세요.', romanization: 'Oegugindeungnokjeunggwa yeogwoneul boyeo jusigo sincheongseoreul jakseonghae juseyo.', translation: { en: 'Please show your ARC and passport and fill out the application form.', bn: 'আপনার এআরসি ও পাসপোর্ট দেখান এবং আবেদন ফর্মটি পূরণ করুন।', ne: 'कृपया ARC र राहदानी देखाउनुहोस् र फारम भर्नुहोस्।', ur: 'براہِ کرم اپنا اے آر سی اور پاسپورٹ دکھائیں اور فارم پر کریں۔' } },
    ],
    keyVocab: [
      { ko: '계좌 이체 / 통장', romanization: 'gyejwa iche / tongjang', meaning: { en: 'Bank transfer / Bankbook', bn: 'ব্যাংক ট্রান্সফার / ব্যাংকবুক', ne: 'बैंक ट्रान्सफर / पासबुक', ur: 'بینک ٹرانسفر / پاس بک' } },
    ],
  },
  {
    id: 'life-15',
    order: 15,
    titleKo: '긴급 상황 (112·119·분실)',
    title: { en: '15. Emergency Situations', bn: '১৫. জরুরি পরিস্থিতি (১১২, ১১৯ ও হারানো জিনিস)', ne: '१५. आपतकालीन अवस्था (११२, ११९ र हराएको सामान)', ur: '15. ہنگامی صورتحال (112، 119 اور گمشدہ اشیاء)' },
    situation: {
      en: 'Calling 119 for an ambulance, 112 for police, or reporting a lost wallet/ARC at the lost-and-found center.',
      bn: 'অ্যাম্বুলেন্সের জন্য ১১৯, পুলিশের জন্য ১১২ অথবা মানিব্যাগ/এআরসি হারালে লস্ট অ্যান্ড ফাউন্ড সেন্টারে যোগাযোগ।',
      ne: 'एम्बुलेन्सका लागि ११९, प्रहरीका लागि ११२ वा पर्स/ARC हराउँदा रिपोर्ट गर्ने।',
      ur: 'ایمبولینس کے لیے 119، پولیس کے لیے 112 پر کال کرنا یا بٹوہ/کارڈ گم ہونے کی اطلاع دینا۔',
    },
    dialogue: [
      { speaker: 'Student', ko: '도와주세요! 지하철에 가방을 두고 내렸어요.', romanization: 'Dowajuseyo! Jihacheore gabang-eul dugo naeryeosseoyo.', translation: { en: 'Please help! I left my bag on the subway and got off.', bn: 'দয়া করে সাহায্য করুন! আমি সাবওয়েতে ব্যাগ রেখে নেমে গেছি।', ne: 'कृपया सहयोग गर्नुहोस्! मैले सबवेमा झोला छोडेर ओर्लिएँ।', ur: 'مدد کیجیے! میں اپنا بیگ سب وے ٹرین میں بھول کر اتر گیا ہوں۔' } },
      { speaker: 'Staff', ko: '유실물 센터에 바로 연락해 드릴게요. 몇 호선을 타셨나요?', romanization: 'Yusilmul senteoe baro yeollakhae deurilgeyo. Myeot hoseoneul tasyeonnayo?', translation: { en: 'I will contact the Lost & Found Center right away. Which line did you take?', bn: 'আমি এখনই লস্ট অ্যান্ড ফাউন্ড সেন্টারে যোগাযোগ করছি। আপনি কত নম্বর লাইনে ছিলেন?', ne: 'म तुरुन्तै हराएको सामान केन्द्रमा खबर गर्छु। कुन लाइन चढ्नुभएको थियो?', ur: 'میں ابھی لاسٹ اینڈ فاؤنڈ سینٹر سے رابطہ کرتا ہوں۔ آپ کس لائن کی ٹرین میں تھے؟' } },
    ],
    keyVocab: [
      { ko: '유실물 센터', romanization: 'yusilmul senteo', meaning: { en: 'Lost & Found Center', bn: 'লস্ট অ্যান্ড ফাউন্ড সেন্টার', ne: 'हराएको सामान खोज केन्द्र', ur: 'لاسٹ اینڈ فاؤنڈ سینٹر' } },
    ],
  },
  {
    id: 'life-16',
    order: 16,
    titleKo: '한국 친구 사귀기 및 동아리',
    title: { en: '16. Making Friends', bn: '১৬. কোরিয়ান বন্ধু তৈরি ও ক্যাম্পাস ক্লাব', ne: '१६. कोरियन साथी बनाउने र क्लब गतिविधि', ur: '16. کورین دوست بنانا اور یونیورسٹی کلب' },
    situation: {
      en: 'Joining a university student club (동아리), exchanging KakaoTalk IDs, and making Korean friends.',
      bn: 'বিশ্ববিদ্যালয়ের ক্লাবে (동아리) যোগ দেওয়া, কাকাওটক আইডি বিনিময় এবং নতুন বন্ধু তৈরি করা।',
      ne: 'विश्वविद्यालय क्लब (동아리) मा सहभागी हुने, काकाओटक साटासाट र साथी बनाउने।',
      ur: 'یونیورسٹی کے اسٹوڈنٹ کلب (동아리) میں شامل ہونا، کاکاؤ ٹاک آئی ڈی کا تبادلہ اور دوست بنانا۔',
    },
    dialogue: [
      { speaker: 'Student', ko: '우리 시간 될 때 같이 학생 식당에서 밥 먹어요! 카카오톡 아이디 알려 줄래요?', romanization: 'Uri sigan doel ttae gachi haksaeng sikdang-eseo bap meogeoyo! Kakaotok aidi allyeo jullaeyo?', translation: { en: 'Let’s eat together at the student cafeteria when we have time! Could you share your KakaoTalk ID?', bn: 'সময় হলে চলুন একসাথে স্টুডেন্ট ক্যাফেটেরিয়ায় খাবার খাই! আপনার কাকাওটক আইডি দেবেন কি?', ne: 'समय मिल्दा सँगै क्यान्टिनमा खाना खाऔँ न! तपाईंको काकाओटक आइडी दिनुहुन्छ कि?', ur: 'جب وقت ملے تو آئیں اسٹوڈنٹ کیفے ٹیریا میں ساتھ کھانا کھاتے ہیں! کیا آپ اپنی کاکاؤ ٹاک آئی ڈی بتائیں گے؟' } },
      { speaker: 'Friend', ko: '좋아요! 제 번호 등록하면 카톡에 바로 뜰 거예요.', romanization: 'Joayo! Je beonho deungnokhamyeon katoge baro tteul geoyeyo.', translation: { en: 'Sounds great! If you save my phone number, I will pop up right away on KakaoTalk.', bn: 'দারুণ! আমার ফোন নম্বর সেভ করলেই কাকাওটকে চলে আসবে।', ne: 'हुन्छ! मेरो नम्बर सेभ गर्नुभयो भने काकाओटकमा तुरुन्तै देखिन्छ।', ur: 'بہت اچھا! اگر آپ میرا فون نمبر محفوظ کریں گے تو کاکاؤ ٹاک پر فوراً شو ہو جائے گا۔' } },
    ],
    keyVocab: [
      { ko: '동아리 / 학번', romanization: 'dongari / hakbeon', meaning: { en: 'Student club / Student ID entry year', bn: 'ইউনিভার্সিটি ক্লাব / ভর্তি বর্ষ', ne: 'विद्यार्थी क्लब / भर्ना वर्ष', ur: 'اسٹوڈنٹ کلب / داخلے کا سال' } },
    ],
  },
];

// ================= MODULE 6: INTERACTIVE WORD-TAP READING PASSAGES =================
export interface InteractiveReadingPassage {
  id: string;
  level: 'Beginner' | 'Elementary' | 'Intermediate' | 'Advanced';
  textType: string;
  titleKo: string;
  title: QuadLangText;
  tokens: Array<{
    surface: string;
    romanization?: string;
    meaning?: QuadLangText;
  }>;
  fullTranslation: QuadLangText;
  grammarNote: QuadLangText;
  question: {
    prompt: QuadLangText;
    options: string[];
    correctIndex: number;
  };
}

export const INTERACTIVE_READING_PASSAGES: InteractiveReadingPassage[] = [
  {
    id: 'irp-1',
    level: 'Beginner',
    textType: 'Student Life in Korea',
    titleKo: '나의 첫 한국 대학교 생활',
    title: {
      en: 'My First Semester at a Korean University',
      bn: 'কোরিয়ান বিশ্ববিদ্যালয়ে আমার প্রথম সেমিস্টার',
      ne: 'कोरियन विश्वविद्यालयमा मेरो पहिलो सेमेस्टर',
      ur: 'کورین یونیورسٹی میں میرا پہلا سمسٹر',
    },
    tokens: [
      { surface: '저는', romanization: 'jeoneun', meaning: { en: 'As for me / I', bn: 'আমি', ne: 'म', ur: 'میں' } },
      { surface: '이번', romanization: 'ibeon', meaning: { en: 'This time / current', bn: 'এই', ne: 'यस', ur: 'اس' } },
      { surface: '학기에', romanization: 'hakgie', meaning: { en: 'In the semester', bn: 'সেমিস্টারে', ne: 'सेमेस्टरमा', ur: 'سمسٹر میں' } },
      { surface: '서울에', romanization: 'Seoure', meaning: { en: 'In Seoul', bn: 'সিউলে', ne: 'सियोलमा', ur: 'سیول میں' } },
      { surface: '있는', romanization: 'inneun', meaning: { en: 'Located in', bn: 'অবস্থিত', ne: 'रहेको', ur: 'موجود' } },
      { surface: '대학교에', romanization: 'daehakgyoe', meaning: { en: 'To/at the university', bn: 'বিশ্ববিদ্যালয়ে', ne: 'विश्वविद्यालयमा', ur: 'یونیورسٹی میں' } },
      { surface: '입학했습니다.', romanization: 'ipakhaetseumnida.', meaning: { en: 'Enrolled / matriculated', bn: 'ভর্তি হয়েছি', ne: 'भर्ना भएँ', ur: 'داخلہ لیا ہے' } },
      { surface: '오전에는', romanization: 'ojeoneneun', meaning: { en: 'In the morning', bn: 'সকালে', ne: 'बिहान', ur: 'صبح کے وقت' } },
      { surface: '한국어', romanization: 'hangugeo', meaning: { en: 'Korean language', bn: 'কোরিয়ান ভাষা', ne: 'कोरियन भाषा', ur: 'کورین زبان' } },
      { surface: '수업을', romanization: 'sueobeul', meaning: { en: 'Class / lecture', bn: 'ক্লাস', ne: 'कक्षा', ur: 'کلاس' } },
      { surface: '듣고,', romanization: 'deutgo,', meaning: { en: 'Take/listen and', bn: 'করে এবং', ne: 'लिएर', ur: 'لیتا ہوں اور' } },
      { surface: '오후에는', romanization: 'ohueneun', meaning: { en: 'In the afternoon', bn: 'বিকেলে', ne: 'दिउँसो', ur: 'سہ پہر کو' } },
      { surface: '도서관에서', romanization: 'doseogwaneseo', meaning: { en: 'At the library', bn: 'লাইব্রেরিতে', ne: 'पुस्तकालयमा', ur: 'لائبریری میں' } },
      { surface: '전공', romanization: 'jeongong', meaning: { en: 'Academic major', bn: 'মেজর বিষয়', ne: 'मुख्य विषय', ur: 'میجر مضمون' } },
      { surface: '책을', romanization: 'chaegeul', meaning: { en: 'Book (object)', bn: 'বই', ne: 'किताब', ur: 'کتاب' } },
      { surface: '읽습니다.', romanization: 'ikseumnida.', meaning: { en: 'Read', bn: 'পড়ি', ne: 'पढ्छु', ur: 'پڑھتا ہوں' } },
    ],
    fullTranslation: {
      en: 'I enrolled in a university in Seoul this semester. In the morning I take Korean classes, and in the afternoon I read books for my major at the library.',
      bn: 'আমি এই সেমিস্টারে সিউলের একটি বিশ্ববিদ্যালয়ে ভর্তি হয়েছি। সকালে আমি কোরিয়ান ভাষার ক্লাস করি এবং বিকেলে লাইব্রেরিতে আমার মেজর বিষয়ের বই পড়ি।',
      ne: 'म यस सेमेस्टरमा सियोलको विश्वविद्यालयमा भर्ना भएँ। बिहान कोरियन कक्षा लिन्छु र दिउँसो पुस्तकालयमा मुख्य विषयको किताब पढ्छु।',
      ur: 'میں نے اس سمسٹر میں سیول کی ایک یونیورسٹی میں داخلہ لیا ہے۔ صبح میں کورین زبان کی کلاس لیتا ہوں اور سہ پہر کو لائبریری میں اپنے میجر کی کتابیں پڑھتا ہوں۔',
    },
    grammarNote: {
      en: '수업을 듣다 literally means "to listen to a class", which is the natural Korean expression for "to take a course".',
      bn: 'কোরিয়ান ভাষায় "ক্লাস করা" বোঝাতে 수업을 듣다 (ক্লাস শোনা) ব্যবহৃত হয়।',
      ne: 'कोरियनमा "कक्षा लिनु" भन्न 수업을 듣다 प्रयोग गरिन्छ।',
      ur: 'کورین میں "کلاس لینا" کہنے کے لیے 수업을 듣다 استعمال ہوتا ہے۔',
    },
    question: {
      prompt: {
        en: 'What does the student do in the afternoon?',
        bn: 'শিক্ষার্থী বিকেলে কী করে?',
        ne: 'विद्यार्थीले दिउँसो के गर्छ?',
        ur: 'طالب علم سہ پہر کو کیا کرتا ہے؟',
      },
      options: [
        'Reads major books at the library (도서관에서 전공 책을 읽습니다)',
        'Works at a convenience store (편의점에서 일합니다)',
        'Goes to the airport (공항에 갑니다)',
        'Exercises at the gym (운동을 합니다)',
      ],
      correctIndex: 0,
    },
  },
  {
    id: 'irp-2',
    level: 'Intermediate',
    textType: 'University Notice & Email',
    titleKo: '[공지] 외국인 유학생 장학금 신청 안내',
    title: {
      en: '[Notice] International Student Scholarship Application Guide',
      bn: '[বিজ্ঞপ্তি] বিদেশি শিক্ষার্থীদের স্কলারশিপ আবেদনের নির্দেশিকা',
      ne: '[सूचना] अन्तर्राष्ट्रिय विद्यार्थी छात्रवृत्ति आवेदन 안내',
      ur: '[نوٹس] بین الاقوامی طلباء کے لیے اسکالرشپ کی درخواست کی ہدایات',
    },
    tokens: [
      { surface: '국제교류처에서는', romanization: 'Gukjegyorucheo-eseoneun', meaning: { en: 'Office of International Affairs', bn: 'আন্তর্জাতিক দপ্তর থেকে', ne: 'अन्तर्राष्ट्रिय कार्यालयबाट', ur: 'انٹرنیشنل آفس کی جانب سے' } },
      { surface: '성적이', romanization: 'seongjeogi', meaning: { en: 'Academic grades', bn: 'পরীক্ষার ফলাফল', ne: 'शैक्षिक नतिजा', ur: 'تعلیمی نمبر' } },
      { surface: '우수하고', romanization: 'usuhago', meaning: { en: 'Excellent and', bn: 'চমৎকার এবং', ne: 'उत्कृष्ट र', ur: 'شاندار اور' } },
      { surface: 'TOPIK', romanization: 'TOPIK', meaning: { en: 'TOPIK exam', bn: 'টপিক পরীক্ষা', ne: 'TOPIK परीक्षा', ur: 'TOPIK امتحان' } },
      { surface: '4급', romanization: 'sa-geup', meaning: { en: 'Level 4', bn: 'লেভেল ৪', ne: 'तह ४', ur: 'لیول 4' } },
      { surface: '이상을', romanization: 'isang-eul', meaning: { en: 'Or higher', bn: 'বা তার বেশি', ne: 'वा सोभन्दा माथि', ur: 'یا اس سے اوپر' } },
      { surface: '취득한', romanization: 'chwideukhan', meaning: { en: 'Obtained / achieved', bn: 'অর্জনকারী', ne: 'प्राप्त गरेको', ur: 'حاصل کرنے والے' } },
      { surface: '재학생에게', romanization: 'jaehaksaeng-ege', meaning: { en: 'To enrolled students', bn: 'অধ্যয়নরত শিক্ষার্থীদের', ne: 'अध्ययनरत विद्यार्थीलाई', ur: 'زیرِ تعلیم طلباء کو' } },
      { surface: '장학금을', romanization: 'janghakgeumeul', meaning: { en: 'Scholarship', bn: 'স্কলারশিপ', ne: 'छात्रवृत्ति', ur: 'اسکالرشپ' } },
      { surface: '지급합니다.', romanization: 'jigeuphamnida.', meaning: { en: 'Provide / award', bn: 'প্রদান করা হবে', ne: 'प्रदान गरिनेछ', ur: 'فراہم کی جائے گی' } },
      { surface: '희망자는', romanization: 'huimangjaneun', meaning: { en: 'Applicants', bn: 'আগ্রহী প্রার্থীরা', ne: 'इच्छुक आवेदकले', ur: 'خواہشمند امیدوار' } },
      { surface: '금요일까지', romanization: 'geumyoilkkaji', meaning: { en: 'By Friday', bn: 'শুক্রবারের মধ্যে', ne: 'शुक्रबारसम्म', ur: 'جمعہ تک' } },
      { surface: '서류를', romanization: 'seoryureul', meaning: { en: 'Documents', bn: 'কাগজপত্র', ne: 'कागजातहरू', ur: 'دستاویزات' } },
      { surface: '제출하시기', romanization: 'jechulhasigi', meaning: { en: 'Submitting', bn: 'জমা দেওয়ার', ne: 'बुझाउन', ur: 'جمع کروانے کی' } },
      { surface: '바랍니다.', romanization: 'baramnida.', meaning: { en: 'We request / hope', bn: 'অনুরোধ করা হচ্ছে', ne: 'अनुरोध गरिन्छ', ur: 'درخواست کی جاتی ہے' } },
    ],
    fullTranslation: {
      en: 'The Office of International Affairs awards scholarships to enrolled students with excellent grades who have obtained TOPIK Level 4 or higher. Applicants are requested to submit their documents by Friday.',
      bn: 'আন্তর্জাতিক দপ্তর থেকে ভালো ফলাফলধারী এবং TOPIK ৪ বা তদূর্ধ্ব অর্জনকারী শিক্ষার্থীদের স্কলারশিপ প্রদান করা হবে। আগ্রহীদের শুক্রবারের মধ্যে কাগজপত্র জমা দেওয়ার অনুরোধ করা হচ্ছে।',
      ne: 'अन्तर्राष्ट्रिय कार्यालयले उत्कृष्ट नतिजा र TOPIK ४ वा सोभन्दा माथि प्राप्त गरेका विद्यार्थीलाई छात्रवृत्ति प्रदान गर्दछ। इच्छुकले शुक्रबारसम्म कागजात बुझाउनुहोला।',
      ur: 'انٹرنیشنل آفس بہترین تعلیمی نتائج اور TOPIK لیول 4 یا اس سے اوپر حاصل کرنے والے طلباء کو اسکالرشپ دیتا ہے۔ خواہشمند طلباء جمعہ تک اپنے کاغذات جمع کروائیں۔',
    },
    grammarNote: {
      en: '-시기 바랍니다 is the standard formal polite ending used in official university announcements.',
      bn: 'বিশ্ববিদ্যালয়ের অফিসিয়াল নোটিশে অনুরোধ জানাতে -시기 바랍니다 ব্যবহৃত হয়।',
      ne: 'विश्वविद्यालयको आधिकारिक सूचनामा -시기 바랍니다 प्रयोग हुन्छ।',
      ur: 'یونیورسٹی کے سرکاری اعلانات میں درخواست کے لیے -시기 바랍니다 استعمال ہوتا ہے۔',
    },
    question: {
      prompt: {
        en: 'What is the minimum TOPIK level required for this scholarship?',
        bn: 'এই স্কলারশিপের জন্য ন্যূনতম কত TOPIK লেভেল প্রয়োজন?',
        ne: 'यस छात्रवृत्तिका लागि न्यूनतम कति TOPIK तह चाहिन्छ?',
        ur: 'اس اسکالرشپ کے لیے کم از کم کون سا TOPIK لیول درکار ہے؟',
      },
      options: ['TOPIK Level 4 or higher (4급 이상)', 'TOPIK Level 1 (1급)', 'TOPIK Level 2 (2급)', 'No TOPIK required'],
      correctIndex: 0,
    },
  },
];

// ================= MODULE 7: WRITING PRACTICE PROMPTS (10 CATEGORIES) =================
export interface WritingPracticePromptItem {
  id: string;
  category: string;
  title: QuadLangText;
  prompt: QuadLangText;
  starterHintKo: string;
  modelAnswerKo: string;
  modelTranslation: QuadLangText;
}

export const WRITING_PRACTICE_10_CATEGORIES: WritingPracticePromptItem[] = [
  {
    id: 'wp-1',
    category: '1. Hangul Character & Word Writing',
    title: { en: 'Essential Campus Words', bn: 'ক্যাম্পাসের প্রয়োজনীয় শব্দ লিখন', ne: 'क्याम्पसका अत्यावश्यक शब्द लेखन', ur: 'کیمپس کے ضروری الفاظ لکھنا' },
    prompt: { en: 'Write the Korean words for University, Library, Dormitory, and Scholarship.', bn: 'বিশ্ববিদ্যালয়, লাইব্রেরি, ডরমিটরি ও স্কলারশিপ-এর কোরিয়ান শব্দগুলো লিখুন।', ne: 'विश्वविद्यालय, पुस्तकालय, होस्टेल र छात्रवृत्तिको कोरियन शब्द लेख्नुहोस्।', ur: 'یونیورسٹی، لائبریری، ہاسٹل اور اسکالرشپ کے کورین الفاظ لکھیں۔' },
    starterHintKo: '대학교, 도서관, ...',
    modelAnswerKo: '대학교, 도서관, 기숙사, 장학금',
    modelTranslation: { en: 'University, Library, Dormitory, Scholarship', bn: 'বিশ্ববিদ্যালয়, লাইব্রেরি, ডরমিটরি, স্কলারশিপ', ne: 'विश्वविद्यालय, पुस्तकालय, होस्टेल, छात्रवृत्ति', ur: 'یونیورسٹی، لائبریری، ہاسٹل، اسکالرشپ' },
  },
  {
    id: 'wp-2',
    category: '2. Sentence Formation & Correction',
    title: { en: 'Polite Request to Professor', bn: 'প্রফেসরের কাছে ভদ্র ইমেইল বাক্য', ne: 'प्रोफेसरलाई विनम्र इमेल वाक्य', ur: 'پروفیسر کے نام مؤدبانہ جملہ' },
    prompt: { en: 'Write a polite sentence explaining why you need consultation about your major.', bn: 'মেজর বিষয় নিয়ে প্রফেসরের সাথে কেন পরামর্শ করতে চান তা জানিয়ে একটি ভদ্র বাক্য লিখুন।', ne: 'मुख्य विषयबारे प्रोफेसरसँग परामर्श माग्दै शिष्ट वाक्य लेख्नुहोस्।', ur: 'اپنے میجر مضمون کے بارے میں پروفیسر سے مشاورت کے لیے ایک مؤدبانہ جملہ لکھیں۔' },
    starterHintKo: '교수님, 안녕하십니까? 저는 ...',
    modelAnswerKo: '교수님, 안녕하십니까? 전공 수업과 진로에 대해 상담을 받고 싶어서 이메일을 드립니다.',
    modelTranslation: { en: 'Hello Professor. I am emailing you because I would like consultation regarding my major classes and career path.', bn: 'হ্যালো প্রফেসর। মেজর ক্লাস ও ক্যারিয়ার বিষয়ে পরামর্শ নেওয়ার জন্য আপনাকে ইমেইল করছি।', ne: 'नमस्ते प्रोफेसर। मुख्य कक्षा र भविष्यको मार्गबारे परामर्श लिन इमेल गरेको छु।', ur: 'السلام علیکم پروفیسر صاحب۔ میں اپنے میجر کی کلاسز اور کیریئر کے بارے میں مشورہ لینے کے لیے ای میل کر رہا ہوں۔' },
  },
  {
    id: 'wp-3',
    category: '3. Self-Introduction Writing (자기소개)',
    title: { en: 'Self-Introduction for University & Part-Time Job', bn: 'বিশ্ববিদ্যালয় ও চাকরির জন্য আত্মপরিচয় (자기소개)', ne: 'विश्वविद्यालय र कामका लागि आत्म-परिचय', ur: 'یونیورسٹی اور ملازمت کے لیے اپنا تعارف (자기소개)' },
    prompt: { en: 'Introduce your name, country, university major, and goal in Korea in 3–4 sentences.', bn: 'আপনার নাম, দেশ, মেজর বিষয় এবং কোরিয়ায় আপনার লক্ষ্য ৩-৪ বাক্যে লিখুন।', ne: 'आफ्नो नाम, देश, मुख्य विषय र कोरियामा लक्ष्य ३-४ वाक्यमा लेख्नुहोस्।', ur: 'اپنا نام، ملک، یونیورسٹی میجر اور کوریا میں اپنا مقصد 3 سے 4 جملوں میں لکھیں۔' },
    starterHintKo: '안녕하세요. 제 이름은 ... 입니다.',
    modelAnswerKo: '안녕하십니까? 저는 한국에서 컴퓨터공학을 전공하고 있는 유학생입니다. 한국어와 전공 공부를 열심히 해서 졸업 후에 한국 IT 기업에서 일하고 싶습니다.',
    modelTranslation: { en: 'Hello. I am an international student majoring in Computer Engineering in Korea. I want to study Korean and my major diligently and work at a Korean IT company after graduation.', bn: 'হ্যালো। আমি কোরিয়ায় কম্পিউটার ইঞ্জিনিয়ারিংয়ে অধ্যয়নরত একজন বিদেশি শিক্ষার্থী। মনোযোগ দিয়ে পড়াশোনা করে গ্র্যাজুয়েশনের পর আমি কোরিয়ার আইটি কোম্পানিতে কাজ করতে চাই।', ne: 'नमस्ते। म कोरियामा कम्प्युटर इन्जिनियरिङ पढ्दै गरेको विद्यार्थी हुँ। स्नातक पछि कोरियन आइटी कम्पनीमा काम गर्न चाहन्छु।', ur: 'السلام علیکم۔ میں کوریا میں کمپیوٹر انجینئرنگ پڑھنے والا بین الاقوامی طالب علم ہوں۔ میں محنت سے پڑھ کر گریجویشن کے بعد کورین آئی ٹی کمپنی میں کام کرنا چاہتا ہوں۔' },
  },
  {
    id: 'wp-4',
    category: '4. University Study Plan & Application Writing',
    title: { en: 'Study Plan Paragraph (학업계획서)', bn: 'স্টাডি প্ল্যান অনুচ্ছেদ (학업계획서)', ne: 'अध्ययन योजना अनुच्छेद (학업계획서)', ur: 'اسٹڈی پلان پیراگراف (학업계획서)' },
    prompt: { en: 'Write a short paragraph explaining your study plan for your first year at a Korean university.', bn: 'কোরিয়ান বিশ্ববিদ্যালয়ে প্রথম বছরের স্টাডি প্ল্যান সম্পর্কে একটি অনুচ্ছেদ লিখুন।', ne: 'कोरियन विश्वविद्यालयमा पहिलो वर्षको अध्ययन योजनाबारे छोटो अनुच्छेद लेख्नुहोस्।', ur: 'کورین یونیورسٹی میں اپنے پہلے سال کے تعلیمی منصوبے (Study Plan) پر ایک مختصر پیراگراف لکھیں۔' },
    starterHintKo: '입학 후 첫 학기에는 ...',
    modelAnswerKo: '입학 후 첫 학기에는 전공 기초 과목을 충실히 이수하고 한국어 능력을 향상시키기 위해 노력하겠습니다. 또한 학과 동아리 활동에 참여하여 한국 학생들과 적극적으로 교류할 계획입니다.',
    modelTranslation: { en: 'In my first semester after admission, I will faithfully complete foundational major courses and strive to improve my Korean proficiency. Furthermore, I plan to participate in department club activities and actively interact with Korean students.', bn: 'ভর্তির পর প্রথম সেমিস্টারে আমি মেজরের মৌলিক কোর্সগুলো ভালোভাবে সম্পন্ন করব এবং কোরিয়ান দক্ষতা বাড়াতে সচেষ্ট থাকব। এছাড়া বিভাগীয় ক্লাবে যুক্ত হয়ে কোরিয়ান শিক্ষার্থীদের সাথে সক্রিয়ভাবে মতবিনিময় করব।', ne: 'भर्ना पछिको पहिलो सेमेस्टरमा आधारभूत विषयहरू पूरा गरी कोरियन भाषा सुधार्नेछु र क्लब गतिविधिमा सहभागी हुनेछु।', ur: 'داخلے کے بعد پہلے سمسٹر میں، میں اپنے میجر کے بنیادی مضامین مکمل کروں گا اور کورین زبان بہتر بنانے کی کوشش کروں گا۔ نیز ڈیپارٹمنٹ کلب میں شامل ہو کر کورین طلباء سے روابط بڑھاؤں گا۔' },
  },
  {
    id: 'wp-5',
    category: '5. TOPIK II Writing Tasks 51–54 Preparation',
    title: { en: 'TOPIK II Task 53 (Chart Analysis) & Task 54 (Argumentative Essay)', bn: 'TOPIK II প্রশ্ন ৫৩ (গ্রাফ বিশ্লেষণ) ও ৫৪ (প্রবন্ধ লিখন)', ne: 'TOPIK II प्रश्न ५३ (चार्ट विश्लेषण) र ५৪ (निबन्ध लेखन)', ur: 'TOPIK II سوال 53 (چارٹ تجزیہ) اور 54 (مضمون نویسی)' },
    prompt: { en: 'Write a formal written paragraph (-는다/다 style) describing why learning the local language is important when studying abroad.', bn: 'বিদেশে উচ্চশিক্ষার ক্ষেত্রে স্থানীয় ভাষা শেখা কেন গুরুত্বপূর্ণ তা লিখিত রীতিতে (-는다/다) লিখুন।', ne: 'विदेशमा अध्ययन गर्दा स्थानीय भाषा सिक्नु किन महत्त्वपूर्ण छ भनी लिखित शैलीमा (-는다/다) लेख्नुहोस्।', ur: 'بیرونِ ملک تعلیم کے دوران مقامی زبان سیکھنا کیوں ضروری ہے، رسمی تحریری انداز (-는다/다) میں لکھیں۔' },
    starterHintKo: '유학 생활에서 현지 언어를 배우는 것은 매우 중요하다. 왜냐하면 ...',
    modelAnswerKo: '유학 생활에서 현지 언어를 배우는 것은 매우 중요하다. 첫째, 언어 능력이 뛰어나면 전공 수업을 깊이 이해할 수 있을 뿐만 아니라 학업 성취도도 높아진다. 둘째, 현지인들과 원활하게 소통하면서 문화적 차이를 극복하고 안정적으로 정착할 수 있기 때문이다.',
    modelTranslation: { en: 'Learning the local language in study-abroad life is very important. First, strong language skills not only allow deep understanding of major lectures but also raise academic achievement. Second, communicating smoothly with locals helps overcome cultural differences and settle down stably.', bn: 'প্রবাস জীবনে স্থানীয় ভাষা শেখা অত্যন্ত গুরুত্বপূর্ণ। প্রথমত, ভাষাগত দক্ষতা ভালো হলে শুধু মেজর ক্লাস গভীরভাবে বোঝাই যায় না, একাডেমিক ফলাফলও উন্নত হয়। দ্বিতীয়ত, স্থানীয়দের সাথে সহজে যোগাযোগের মাধ্যমে সাংস্কৃতিক পার্থক্য দূর করে স্থায়ীভাবে মানিয়ে নেওয়া যায়।', ne: 'वैदेशिक अध्ययनमा स्थानीय भाषा सिक्नु निकै महत्त्वपूर्ण हुन्छ। यसले पढाइ बुझ्न र स्थानीय संस्कृतिमा घुलमिल हुन मद्दत गर्छ।', ur: 'بیرونِ ملک تعلیمی زندگی میں مقامی زبان سیکھنا بے حد ضروری ہے۔ اول یہ کہ زبان پر عبور ہونے سے نہ صرف میجر کے لیکچرز گہرائی سے سمجھے جا سکتے ہیں بلکہ تعلیمی کارکردگی بھی بہتر ہوتی ہے۔ دوم، مقامی لوگوں سے بہتر رابطے کے ذریعے ثقافتی فرق کو سمجھ کر باآسانی ایڈجسٹ ہوا جا سکتا ہے۔' },
  },
];
