/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface VocabCategory {
  id: string;
  nameEn: string;
  nameBn: string;
  nameKr: string;
  descriptionBn: string;
  iconName: string;
  badgeColor: string;
}

export const VOCAB_CATEGORIES: VocabCategory[] = [
  {
    id: 'all',
    nameEn: 'All 5,000+ Words',
    nameBn: 'সব ৫,০০০+ শব্দ',
    nameKr: '전체 단어',
    descriptionBn: 'বাংলাদেশী শিক্ষার্থীদের জন্য সম্পূর্ণ বাংলা-কোরিয়ান অভিধান',
    iconName: 'BookOpen',
    badgeColor: 'blue'
  },
  {
    id: 'essentials',
    nameEn: 'Daily Greetings & Basics',
    nameBn: 'দৈনন্দিন অভিবাদন ও মৌলিক',
    nameKr: '기초 회화 및 인사',
    descriptionBn: 'কোরিয়াতে পা রেখেই যে কথাগুলো প্রতিদিন কাজে লাগবে',
    iconName: 'Smile',
    badgeColor: 'emerald'
  },
  {
    id: 'university',
    nameEn: 'University & Admissions',
    nameBn: 'বিশ্ববিদ্যালয় ও ভর্তি',
    nameKr: '대학 및 입학',
    descriptionBn: 'ক্লাস, প্রফেসর, স্কলারশিপ, পরীক্ষা ও অ্যাসাইনমেন্টের শব্দ',
    iconName: 'GraduationCap',
    badgeColor: 'indigo'
  },
  {
    id: 'housing',
    nameEn: 'Housing & Goshiwon',
    nameBn: 'বাসাভাড়া ও আবাসন',
    nameKr: '부동산 및 기숙사',
    descriptionBn: 'বাড়িওয়ালা, গোশিওয়ান, ওয়ানরুম, চুক্তি ও গ্যাস-বিদ্যুৎ বিল',
    iconName: 'Home',
    badgeColor: 'amber'
  },
  {
    id: 'visa_immigration',
    nameEn: 'Visa & Immigration',
    nameBn: 'ভিসা ও অভিবাসন',
    nameKr: '비자 및 출입국',
    descriptionBn: 'ইমিগ্রেশন অফিস, এআরসি কার্ড, এক্সটেনশন ও পারমিট',
    iconName: 'ShieldCheck',
    badgeColor: 'rose'
  },
  {
    id: 'food_halal',
    nameEn: 'Food, Dining & Halal',
    nameBn: 'খাবার, রেস্তোরাঁ ও হালাল',
    nameKr: '음식 및 식당',
    descriptionBn: 'হালাল খাবার নির্বাচন, রেস্তোরাঁয় অর্ডার ও কাঁচাবাজার',
    iconName: 'Utensils',
    badgeColor: 'orange'
  },
  {
    id: 'hospital_health',
    nameEn: 'Hospital & Healthcare',
    nameBn: 'হাসপাতাল, ওষুধ ও স্বাস্থ্য',
    nameKr: '병원 및 약국',
    descriptionBn: 'ডাক্তার দেখানো, প্রেসক্রিপশন, ফার্মেসি ও রোগের লক্ষণ',
    iconName: 'HeartPulse',
    badgeColor: 'red'
  },
  {
    id: 'transit_travel',
    nameEn: 'Transit & Directions',
    nameBn: 'যাতায়াত ও সাবওয়ে',
    nameKr: '교통 및 길찾기',
    descriptionBn: 'টি-মানি কার্ড, সাবওয়ে লাইন, বাস, কেটিএক্স ও ট্যাক্সি',
    iconName: 'Compass',
    badgeColor: 'cyan'
  },
  {
    id: 'job_workplace',
    nameEn: 'Part-Time Jobs (Alba)',
    nameBn: 'পার্ট-টাইম কাজ (আলবা)',
    nameKr: '아르바이트 및 근로',
    descriptionBn: 'কাজের ইন্টারভিউ, বেতন, শিফট ও বসের সাথে কথোপকথন',
    iconName: 'Briefcase',
    badgeColor: 'teal'
  },
  {
    id: 'money_banking',
    nameEn: 'Banking & Shopping',
    nameBn: 'ব্যাংক, টাকা ও কেনাকাটা',
    nameKr: '은행 및 쇼핑',
    descriptionBn: 'অ্যাকাউন্ট খোলা, এটিএম বুথ, রেমিট্যান্স ও বাজারদর',
    iconName: 'CreditCard',
    badgeColor: 'violet'
  },
  {
    id: 'verbs',
    nameEn: 'Essential Action Verbs',
    nameBn: 'প্রয়োজনীয় ক্রিয়াপদ (Verbs)',
    nameKr: '필수 동사',
    descriptionBn: 'প্রতিদিনের সকল কাজের কোরিয়ান ক্রিয়াপদ ও রূপান্তর',
    iconName: 'Zap',
    badgeColor: 'fuchsia'
  },
  {
    id: 'adjectives',
    nameEn: 'Descriptive Adjectives',
    nameBn: 'বর্ণনামূলক বিশেষণ (Adjectives)',
    nameKr: '형용사',
    descriptionBn: 'অনুভূতি, অবস্থা, আকার, স্বাদ ও আবহাওয়ার বিশেষণ',
    iconName: 'Sparkles',
    badgeColor: 'pink'
  },
  {
    id: 'topik_exam',
    nameEn: 'TOPIK I & II Exam Vocab',
    nameBn: 'টপিক (TOPIK) পরীক্ষার শব্দ',
    nameKr: 'TOPIK 필수 어휘',
    descriptionBn: 'টপিক ১ ও টপিক ২ পরীক্ষায় বারবার আসা গুরুত্বপূর্ণ শব্দ',
    iconName: 'Award',
    badgeColor: 'purple'
  }
];
