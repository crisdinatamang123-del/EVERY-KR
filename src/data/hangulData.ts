/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { HangulLetter } from '../types';

export const BASIC_CONSONANTS: HangulLetter[] = [
  {
    char: 'ㄱ',
    nameKr: '기역',
    nameEn: 'Giyeok',
    bengaliSound: 'ক / গ (g/k)',
    bengaliName: 'গিয়ক',
    type: 'consonant',
    sampleWord: '가방',
    sampleWordMeaning: 'ব্যাগ / Bag',
    sampleWordBengali: 'খাবাং / খাবাং',
    pronunciationTip: 'শব্দের শুরুতে থাকলে হালকা ‘খ’ বা ‘ক’ এর মতো, মাঝে বা শেষে থাকলে ‘গ’ এর মতো উচ্চারিত হয়।'
  },
  {
    char: 'ㄴ',
    nameKr: '니은',
    nameEn: 'Nieun',
    bengaliSound: 'ন (n)',
    bengaliName: 'নিয়ন',
    type: 'consonant',
    sampleWord: '나무',
    sampleWordMeaning: 'গাছ / Tree',
    sampleWordBengali: 'নামু',
    pronunciationTip: 'বাংলার ‘ন’ এর মতোই পরিষ্কার উচ্চারণ।'
  },
  {
    char: 'ㄷ',
    nameKr: '디귿',
    nameEn: 'Digeut',
    bengaliSound: 'দ / ত (d/t)',
    bengaliName: 'দিগুত',
    type: 'consonant',
    sampleWord: '돈',
    sampleWordMeaning: 'টাকা / Money',
    sampleWordBengali: 'থন / দোন',
    pronunciationTip: 'শব্দের শুরুতে হালকা ‘থ’ এর মতো বাতাস বের হয়, মাঝে থাকলে ‘দ’ এর মতো হয়।'
  },
  {
    char: 'ㄹ',
    nameKr: '리을',
    nameEn: 'Rieul',
    bengaliSound: 'র / ল (r/l)',
    bengaliName: 'রিউল',
    type: 'consonant',
    sampleWord: '라면',
    sampleWordMeaning: 'রামিয়ন / নুডলস',
    sampleWordBengali: 'রামিয়ন',
    pronunciationTip: 'শব্দের শুরুতে বা মাঝে থাকলে নরম ‘র’, নিচে বাচ্ছিম (Batchim) হিসেবে থাকলে পরিষ্কার ‘ল’ উচ্চারিত হয়।'
  },
  {
    char: 'ㅁ',
    nameKr: '미음',
    nameEn: 'Mieum',
    bengaliSound: 'ম (m)',
    bengaliName: 'মিউম',
    type: 'consonant',
    sampleWord: '물',
    sampleWordMeaning: 'পানি / Water',
    sampleWordBengali: 'মুল',
    pronunciationTip: 'বাংলার ‘ম’ এর মতোই সহজ ও পরিষ্কার।'
  },
  {
    char: 'ㅂ',
    nameKr: '비읍',
    nameEn: 'Bieup',
    bengaliSound: 'ব / প (b/p)',
    bengaliName: 'বিউব',
    type: 'consonant',
    sampleWord: '밥',
    sampleWordMeaning: 'ভাত / Rice or Meal',
    sampleWordBengali: 'পাপ / বাব',
    pronunciationTip: 'শব্দের শুরুতে হালকা ‘প’ বা ‘ফ’, মাঝে থাকলে নরম ‘ব’।'
  },
  {
    char: 'ㅅ',
    nameKr: '시옷',
    nameEn: 'Siot',
    bengaliSound: 'স / শ (s/sh)',
    bengaliName: 'সিওত',
    type: 'consonant',
    sampleWord: '사람',
    sampleWordMeaning: 'মানুষ / Person',
    sampleWordBengali: 'সারাম',
    pronunciationTip: 'সাধারণত ‘স’ এর মতো, তবে ‘ㅣ (ই)’ বা ‘ㅑ/ㅕ/ㅛ/ㅠ’ এর সাথে যুক্ত হলে ‘শ’ উচ্চারিত হয়।'
  },
  {
    char: 'ㅇ',
    nameKr: '이응',
    nameEn: 'Ieung',
    bengaliSound: 'অনুস্বার ং / নীরব (ng/silent)',
    bengaliName: 'ইং',
    type: 'consonant',
    sampleWord: '아이',
    sampleWordMeaning: 'শিশু / Child',
    sampleWordBengali: 'আই',
    pronunciationTip: 'শব্দের প্রথমে থাকলে এটি কোনো শব্দ করে না (নীরব), শুধু স্বরবর্ণ উচ্চারিত হয়। নিচে বাচ্ছিম থাকলে ‘ং’ (অনুস্বার) হয়।'
  },
  {
    char: 'ㅈ',
    nameKr: '지읒',
    nameEn: 'Jieut',
    bengaliSound: 'জ / চ (j/ch)',
    bengaliName: 'জিউত',
    type: 'consonant',
    sampleWord: '집',
    sampleWordMeaning: 'বাড়ি / House',
    sampleWordBengali: 'ছিপ / জিপ',
    pronunciationTip: 'শব্দের শুরুতে ‘চ’ এর কাছাকাছি, মাঝে থাকলে স্বাভাবিক ‘জ’।'
  },
  {
    char: 'ㅊ',
    nameKr: '치읓',
    nameEn: 'Chieut',
    bengaliSound: 'ছ (ch - জোরসহ বাতাস)',
    bengaliName: 'ছিউত',
    type: 'consonant',
    sampleWord: '친구',
    sampleWordMeaning: 'বন্ধু / Friend',
    sampleWordBengali: 'ছিনগু',
    pronunciationTip: 'বাংলার ‘ছ’ এর মতো মুখ থেকে বাতাস ছাড়তে হবে।'
  },
  {
    char: 'ㅋ',
    nameKr: '키읔',
    nameEn: 'Kieuk',
    bengaliSound: 'খ (k - বাতাসসহ)',
    bengaliName: 'খিউক',
    type: 'consonant',
    sampleWord: '커피',
    sampleWordMeaning: 'কফি / Coffee',
    sampleWordBengali: 'খফি',
    pronunciationTip: 'উচ্চারণ হবে স্পষ্ট ‘খ’ এর মতো।'
  },
  {
    char: 'ㅌ',
    nameKr: '티읕',
    nameEn: 'Tieut',
    bengaliSound: 'থ / ঠ (t - বাতাসসহ)',
    bengaliName: 'থিউত',
    type: 'consonant',
    sampleWord: '택시',
    sampleWordMeaning: 'ট্যাক্সি / Taxi',
    sampleWordBengali: 'থেকসি',
    pronunciationTip: 'মুখ দিয়ে বাতাস ছেড়ে ‘থ’ বা ‘ঠ’ এর মতো উচ্চারণ।'
  },
  {
    char: 'ㅍ',
    nameKr: '피읖',
    nameEn: 'Pieup',
    bengaliSound: 'ফ (p - বাতাসসহ)',
    bengaliName: 'ফিউপ',
    type: 'consonant',
    sampleWord: '피자',
    sampleWordMeaning: 'পিজা / Pizza',
    sampleWordBengali: 'ফি-জা',
    pronunciationTip: 'দুটো ঠোঁট লাগিয়ে জোরে বাতাস ছেড়ে ‘ফ’ এর মতো।'
  },
  {
    char: 'ㅎ',
    nameKr: '히읗',
    nameEn: 'Hieut',
    bengaliSound: 'হ (h)',
    bengaliName: 'হিউত',
    type: 'consonant',
    sampleWord: '학교',
    sampleWordMeaning: 'স্কুল / School',
    sampleWordBengali: 'হাক-গিও',
    pronunciationTip: 'বাংলার ‘হ’ এর মতোই স্বাভাবিক কণ্ঠনালীর ধ্বনি।'
  }
];

export const DOUBLE_CONSONANTS: HangulLetter[] = [
  {
    char: 'ㄲ',
    nameKr: '쌍기역',
    nameEn: 'Ssanggiyeok',
    bengaliSound: 'ক্ক / শক্ত ক (kk)',
    bengaliName: 'সাং-গিয়ক',
    type: 'double_consonant',
    sampleWord: '꽃',
    sampleWordMeaning: 'ফুল / Flower',
    sampleWordBengali: 'ক্কোত',
    pronunciationTip: 'গলায় কোনো বাতাস না ছেড়ে খুব শক্ত করে ‘ক্ক’ বলতে হয়।'
  },
  {
    char: 'ㄸ',
    nameKr: '쌍디귿',
    nameEn: 'Ssangdigeut',
    bengaliSound: 'ত্ত / শক্ত ত (tt)',
    bengaliName: 'সাং-দিগুত',
    type: 'double_consonant',
    sampleWord: '떡',
    sampleWordMeaning: 'রাইস কেক / Tteok',
    sampleWordBengali: 'ত্তক',
    pronunciationTip: 'বাতাস ছাড়া শক্ত ‘ত্ত’।'
  },
  {
    char: 'ㅃ',
    nameKr: '쌍비읍',
    nameEn: 'Ssangbieup',
    bengaliSound: 'প্প / শক্ত প (pp)',
    bengaliName: 'সাং-বিউব',
    type: 'double_consonant',
    sampleWord: '빵',
    sampleWordMeaning: 'পাউরুটি / Bread',
    sampleWordBengali: 'প্বাং',
    pronunciationTip: 'ঠোঁট চেপে শক্ত ‘প্প’।'
  },
  {
    char: 'ㅆ',
    nameKr: '쌍시옷',
    nameEn: 'Ssangsiot',
    bengaliSound: 'স্স / শক্ত স (ss)',
    bengaliName: 'সাং-সিওত',
    type: 'double_consonant',
    sampleWord: '쌀',
    sampleWordMeaning: 'চাল / Uncooked Rice',
    sampleWordBengali: 'স্সাল',
    pronunciationTip: 'বাতাস ছাড়া দাঁতে চাপ দিয়ে তীব্র ‘স্স’।'
  },
  {
    char: 'ㅉ',
    nameKr: '쌍지읒',
    nameEn: 'Ssangjieut',
    bengaliSound: 'চ্চ / শক্ত চ (jj)',
    bengaliName: 'সাং-জিউত',
    type: 'double_consonant',
    sampleWord: '찌개',
    sampleWordMeaning: 'স্ট্যু বা স্যুপ / Stew',
    sampleWordBengali: 'চ্চিগে',
    pronunciationTip: 'জিহ্বা তালুতে শক্ত করে ঠেকিয়ে ‘চ্চ’ উচ্চারণ।'
  }
];

export const BASIC_VOWELS: HangulLetter[] = [
  {
    char: 'ㅏ',
    nameKr: '아',
    nameEn: 'A',
    bengaliSound: 'আ (a)',
    bengaliName: 'আ',
    type: 'vowel',
    sampleWord: '아버지',
    sampleWordMeaning: 'বাবা / Father',
    sampleWordBengali: 'আ-ব-জি',
    pronunciationTip: 'মুখ খুলে পরিষ্কার ‘আ’।'
  },
  {
    char: 'ㅑ',
    nameKr: '야',
    nameEn: 'Ya',
    bengaliSound: 'ইয়া (ya)',
    bengaliName: 'ইয়া',
    type: 'vowel',
    sampleWord: '야구',
    sampleWordMeaning: 'বেসবল / Baseball',
    sampleWordBengali: 'ইয়া-গু',
    pronunciationTip: '‘ই’ ও ‘আ’ একসাথে দ্রুত বললে যা হয়।'
  },
  {
    char: 'ㅓ',
    nameKr: '어',
    nameEn: 'Eo',
    bengaliSound: 'অ (eo)',
    bengaliName: 'অ',
    type: 'vowel',
    sampleWord: '어머니',
    sampleWordMeaning: 'মা / Mother',
    sampleWordBengali: 'অ-ম-নি',
    pronunciationTip: 'চোয়াল কিছুটা নিচে নামিয়ে গলার ভেতর থেকে ‘অ’।'
  },
  {
    char: 'ㅕ',
    nameKr: '여',
    nameEn: 'Yeo',
    bengaliSound: 'ইয় (yeo)',
    bengaliName: 'ইয়',
    type: 'vowel',
    sampleWord: '여기',
    sampleWordMeaning: 'এখানে / Here',
    sampleWordBengali: 'ইয়-গি',
    pronunciationTip: '‘ই’ ও ‘অ’ মিলিয়ে উচ্চারণ।'
  },
  {
    char: 'ㅗ',
    nameKr: '오',
    nameEn: 'O',
    bengaliSound: 'ও (o)',
    bengaliName: 'ও',
    type: 'vowel',
    sampleWord: '오이',
    sampleWordMeaning: 'শসা / Cucumber',
    sampleWordBengali: 'ও-ই',
    pronunciationTip: 'ঠোঁট গোল করে গোল ‘ও’।'
  },
  {
    char: 'ㅛ',
    nameKr: '요',
    nameEn: 'Yo',
    bengaliSound: 'ইয়ো (yo)',
    bengaliName: 'ইয়ো',
    type: 'vowel',
    sampleWord: '요리',
    sampleWordMeaning: 'রান্না / Cooking',
    sampleWordBengali: 'ইয়ো-রি',
    pronunciationTip: 'ঠোঁট গোল করে ‘ইয়ো’।'
  },
  {
    char: 'ㅜ',
    nameKr: '우',
    nameEn: 'U',
    bengaliSound: 'উ (u)',
    bengaliName: 'উ',
    type: 'vowel',
    sampleWord: '우유',
    sampleWordMeaning: 'দুধ / Milk',
    sampleWordBengali: 'উ-ইউ',
    pronunciationTip: 'ঠোঁট গোল করে সামনের দিকে এনে ‘উ’।'
  },
  {
    char: 'ㅠ',
    nameKr: '유',
    nameEn: 'Yu',
    bengaliSound: 'ইউ (yu)',
    bengaliName: 'ইউ',
    type: 'vowel',
    sampleWord: '유학',
    sampleWordMeaning: 'বিদেশে পড়াশোনা / Study Abroad',
    sampleWordBengali: 'ইউ-হাক',
    pronunciationTip: 'সহজ ‘ইউ’।'
  },
  {
    char: 'ㅡ',
    nameKr: '으',
    nameEn: 'Eu',
    bengaliSound: 'উ / উই (eu - দাঁত চেপে উ)',
    bengaliName: 'উই',
    type: 'vowel',
    sampleWord: '은행',
    sampleWordMeaning: 'ব্যাংক / Bank',
    sampleWordBengali: 'উন-হেং',
    pronunciationTip: 'হাসিমুখ করে ঠোঁট না গোল করে দাঁত চেপে ভেতর থেকে ‘উ’ বলা।'
  },
  {
    char: 'ㅣ',
    nameKr: '이',
    nameEn: 'I',
    bengaliSound: 'ই (i)',
    bengaliName: 'ই',
    type: 'vowel',
    sampleWord: '이름',
    sampleWordMeaning: 'নাম / Name',
    sampleWordBengali: 'ই-রুম',
    pronunciationTip: 'সহজ ‘ই’।'
  }
];

export const COMPOUND_VOWELS: HangulLetter[] = [
  {
    char: 'ㅐ',
    nameKr: '애',
    nameEn: 'Ae',
    bengaliSound: 'অ্যা / এ (ae)',
    bengaliName: 'অ্যা',
    type: 'compound_vowel',
    sampleWord: '배',
    sampleWordMeaning: 'জাহাজ / নাশপাতি / পেট',
    sampleWordBengali: 'বে / ব্যা',
    pronunciationTip: '‘এ’ বা চওড়া ‘অ্যা’ এর মতো।'
  },
  {
    char: 'ㅒ',
    nameKr: '얘',
    nameEn: 'Yae',
    bengaliSound: 'ইয়্যা (yae)',
    bengaliName: 'ইয়্যা',
    type: 'compound_vowel',
    sampleWord: '얘기',
    sampleWordMeaning: 'গল্প / কথা',
    sampleWordBengali: 'ইয়ে-গি',
    pronunciationTip: '‘ই’ ও ‘অ্যা’ এর মিশ্রণ।'
  },
  {
    char: 'ㅔ',
    nameKr: '에',
    nameEn: 'E',
    bengaliSound: 'এ (e)',
    bengaliName: 'এ',
    type: 'compound_vowel',
    sampleWord: '가게',
    sampleWordMeaning: 'দোকান / Shop',
    sampleWordBengali: 'খা-গে',
    pronunciationTip: 'স্বাভাবিক ‘এ’।'
  },
  {
    char: 'ㅖ',
    nameKr: '예',
    nameEn: 'Ye',
    bengaliSound: 'ইয়ে (ye)',
    bengaliName: 'ইয়ে',
    type: 'compound_vowel',
    sampleWord: '예',
    sampleWordMeaning: 'হ্যাঁ / Yes (ভদ্র)',
    sampleWordBengali: 'ইয়ে',
    pronunciationTip: '‘ই’ ও ‘এ’ একসাথে।'
  },
  {
    char: 'ㅘ',
    nameKr: '와',
    nameEn: 'Wa',
    bengaliSound: 'ওয়া (wa)',
    bengaliName: 'ওয়া',
    type: 'compound_vowel',
    sampleWord: '과일',
    sampleWordMeaning: 'ফল / Fruit',
    sampleWordBengali: 'খোয়া-ইল',
    pronunciationTip: 'ㅗ (ও) + ㅏ (আ) = ওয়া।'
  },
  {
    char: 'ㅙ',
    nameKr: '왜',
    nameEn: 'Wae',
    bengaliSound: 'ওয়ে / ওয়্যা (wae)',
    bengaliName: 'ওয়ে',
    type: 'compound_vowel',
    sampleWord: '왜',
    sampleWordMeaning: 'কেন? / Why?',
    sampleWordBengali: 'ওয়ে',
    pronunciationTip: 'ㅗ (ও) + ㅐ (অ্যা) = ওয়ে।'
  },
  {
    char: 'ㅚ',
    nameKr: '외',
    nameEn: 'Oe',
    bengaliSound: 'ওয়ে (oe)',
    bengaliName: 'ওয়ে',
    type: 'compound_vowel',
    sampleWord: '외국',
    sampleWordMeaning: 'বিদেশ / Foreign country',
    sampleWordBengali: 'ওয়ে-গুক',
    pronunciationTip: 'উচ্চারণ আধুনিক কোরিয়ানে ‘ওয়ে’ এর মতোই হয়।'
  },
  {
    char: 'ㅝ',
    nameKr: '워',
    nameEn: 'Wo',
    bengaliSound: 'ওঅ (wo)',
    bengaliName: 'ওঅ',
    type: 'compound_vowel',
    sampleWord: '월',
    sampleWordMeaning: 'মাস / Month',
    sampleWordBengali: 'ওঅল',
    pronunciationTip: 'ㅜ (উ) + ㅓ (অ) = ওঅ।'
  },
  {
    char: 'ㅞ',
    nameKr: '웨',
    nameEn: 'We',
    bengaliSound: 'ওয়ে (we)',
    bengaliName: 'ওয়ে',
    type: 'compound_vowel',
    sampleWord: '웨딩',
    sampleWordMeaning: 'বিবাহ / Wedding',
    sampleWordBengali: 'ওয়ে-দিং',
    pronunciationTip: 'ㅜ (উ) + ㅔ (এ) = ওয়ে।'
  },
  {
    char: 'ㅟ',
    nameKr: '위',
    nameEn: 'Wi',
    bengaliSound: 'উই (wi)',
    bengaliName: 'উই',
    type: 'compound_vowel',
    sampleWord: '위',
    sampleWordMeaning: 'উপরে / Above',
    sampleWordBengali: 'উই',
    pronunciationTip: 'ㅜ (উ) + ㅣ (ই) = উই।'
  },
  {
    char: 'ㅢ',
    nameKr: '의',
    nameEn: 'Ui',
    bengaliSound: 'উই / এ (ui)',
    bengaliName: 'উই',
    type: 'compound_vowel',
    sampleWord: '의사',
    sampleWordMeaning: 'ডাক্তার / Doctor',
    sampleWordBengali: 'উই-সা',
    pronunciationTip: 'ㅡ (উ) + ㅣ (ই) = উই।'
  }
];

export const BATCHIM_RULES = [
  {
    sound: '[ㄱ] (ক)',
    letters: 'ㄱ, ㅋ, ㄲ, ㄳ, ㄺ',
    description: 'শব্দের শেষে এলে বাতাস ছাড়া রুদ্ধ ‘ক’ উচ্চারিত হয়।',
    exampleKr: '책 (বই) -> ছেক, 밖 (বাইরে) -> বাক'
  },
  {
    sound: '[ㄴ] (ন)',
    letters: 'ㄴ, ㄵ, ㄶ',
    description: 'শব্দের নিচে আসলে স্বাভাবিক ‘ন’ উচ্চারিত হয়।',
    exampleKr: '눈 (চোখ / বরফ) -> নুন, 문 (দরজা) -> মুন'
  },
  {
    sound: '[ㄷ] (ত/দ)',
    letters: 'ㄷ, ㅌ, ㅅ, ㅆ, ㅈ, ㅊ, ㅎ',
    description: 'এই ৭টি ব্যঞ্জনবর্ণ বাচ্ছিম হিসেবে থাকলে সবগুলোর উচ্চারণ ‘ত’ এর মতো বন্ধ ধ্বনি হয়।',
    exampleKr: '옷 (পোশাক) -> ওত, 꽃 (ফুল) -> ক্কোত, 낮 (দিন) -> নাত'
  },
  {
    sound: '[ㄹ] (ল)',
    letters: 'ㄹ, ㄼ, ㄽ, ㄾ, ㅀ',
    description: 'বাচ্ছিম হিসেবে সবসময় পরিষ্কার ‘ল’ উচ্চারিত হয়।',
    exampleKr: '물 (পানি) -> মুল, 달 (চাঁদ) -> দাল, 서울 -> সিউল'
  },
  {
    sound: '[ㅁ] (ম)',
    letters: 'ㅁ, ㄻ',
    description: 'স্বাভাবিক ‘ম’ উচ্চারিত হয়।',
    exampleKr: '엄마 (মা) -> অম্মা, 밤 (রাত) -> বাম'
  },
  {
    sound: '[ㅂ] (প/ব)',
    letters: 'ㅂ, ㅍ, ㅄ, ㄿ',
    description: 'বাতাস ছাড়া রুদ্ধ ‘প’ উচ্চারিত হয়।',
    exampleKr: '밥 (ভাত) -> বাপ, 집 (বাড়ি) -> ছিপ/জিপ'
  },
  {
    sound: '[ㅇ] (ং / অনুস্বার)',
    letters: 'ㅇ',
    description: 'বাচ্ছিমে থাকলে সবসময় বাংলার ‘ং’ বা ‘ঙ’ (ng) এর মতো হয়।',
    exampleKr: '방 (রুম) -> বাং, 사랑 (ভালোবাসা) -> সারাং'
  }
];

// Hangul Syllable Builder Mapping
export const INITIAL_CONSONANTS = [
  { char: 'ㄱ', bengali: 'গ/ক' }, { char: 'ㄲ', bengali: 'ক্ক' }, { char: 'ㄴ', bengali: 'ন' },
  { char: 'ㄷ', bengali: 'দ/ত' }, { char: 'ㄸ', bengali: 'ত্ত' }, { char: 'ㄹ', bengali: 'র/ল' },
  { char: 'ㅁ', bengali: 'ম' }, { char: 'ㅂ', bengali: 'ব/প' }, { char: 'ㅃ', bengali: 'প্প' },
  { char: 'ㅅ', bengali: 'স' }, { char: 'ㅆ', bengali: 'স্স' }, { char: 'ㅇ', bengali: '' },
  { char: 'ㅈ', bengali: 'জ' }, { char: 'ㅉ', bengali: 'চ্চ' }, { char: 'ㅊ', bengali: 'ছ' },
  { char: 'ㅋ', bengali: 'খ' }, { char: 'ㅌ', bengali: 'থ' }, { char: 'ㅍ', bengali: 'ফ' },
  { char: 'ㅎ', bengali: 'হ' }
];

export const MEDIAL_VOWELS = [
  { char: 'ㅏ', bengali: 'আ' }, { char: 'ㅐ', bengali: 'অ্যা' }, { char: 'ㅑ', bengali: 'ইয়া' },
  { char: 'ㅒ', bengali: 'ইয়্যা' }, { char: 'ㅓ', bengali: 'অ' }, { char: 'ㅔ', bengali: 'এ' },
  { char: 'ㅕ', bengali: 'ইয়' }, { char: 'ㅖ', bengali: 'ইয়ে' }, { char: 'ㅗ', bengali: 'ও' },
  { char: 'ㅘ', bengali: 'ওয়া' }, { char: 'ㅙ', bengali: 'ওয়ে' }, { char: 'ㅚ', bengali: 'ওয়ে' },
  { char: 'ㅛ', bengali: 'ইয়ো' }, { char: 'ㅜ', bengali: 'উ' }, { char: 'ㅝ', bengali: 'ওঅ' },
  { char: 'ㅞ', bengali: 'ওয়ে' }, { char: 'ㅟ', bengali: 'উই' }, { char: 'ㅠ', bengali: 'ইউ' },
  { char: 'ㅡ', bengali: 'উ' }, { char: 'ㅢ', bengali: 'উই' }, { char: 'ㅣ', bengali: 'ই' }
];

export const FINAL_BATCHIM = [
  { char: '없음 (None)', value: '', bengali: '' },
  { char: 'ㄱ', value: 'ㄱ', bengali: 'ক' }, { char: 'ㄲ', value: 'ㄲ', bengali: 'ক' },
  { char: 'ㄳ', value: 'ㄳ', bengali: 'ক' }, { char: 'ㄴ', value: 'ㄴ', bengali: 'ন' },
  { char: 'ㄵ', value: 'ㄵ', bengali: 'ন' }, { char: 'ㄶ', value: 'ㄶ', bengali: 'ন' },
  { char: 'ㄷ', value: 'ㄷ', bengali: 'ত' }, { char: 'ㄹ', value: 'ㄹ', bengali: 'ল' },
  { char: 'ㄺ', value: 'ㄺ', bengali: 'ক' }, { char: 'ㄻ', value: 'ㄻ', bengali: 'ম' },
  { char: 'ㄼ', value: 'ㄼ', bengali: 'ল' }, { char: 'ㄽ', value: 'ㄽ', bengali: 'ল' },
  { char: 'ㄾ', value: 'ㄾ', bengali: 'ল' }, { char: 'ㄿ', value: 'ㄿ', bengali: 'প' },
  { char: 'ㅀ', value: 'ㅀ', bengali: 'ল' }, { char: 'ㅁ', value: 'ㅁ', bengali: 'ম' },
  { char: 'ㅂ', value: 'ㅂ', bengali: 'প' }, { char: 'ㅄ', value: 'ㅄ', bengali: 'প' },
  { char: 'ㅅ', value: 'ㅅ', bengali: 'ত' }, { char: 'ㅆ', value: 'ㅆ', bengali: 'ত' },
  { char: 'ㅇ', value: 'ㅇ', bengali: 'ং' }, { char: 'ㅈ', value: 'ㅈ', bengali: 'ত' },
  { char: 'ㅊ', value: 'ㅊ', bengali: 'ত' }, { char: 'ㅋ', value: 'ㅋ', bengali: 'ক' },
  { char: 'ㅌ', value: 'ㅌ', bengali: 'ত' }, { char: 'ㅍ', value: 'ㅍ', bengali: 'প' },
  { char: 'ㅎ', value: 'ㅎ', bengali: 'ত' }
];
