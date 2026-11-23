/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BdKoreanWord } from '../../types/index.ts';
import { coreVocab } from './coreVocab';
import { verbsAndAdjectives } from './verbsAndAdjectives';
import { practicalLifeVocab } from './practicalLifeVocab';
import { topikAndAcademicVocab } from './topikAndAcademicVocab';
import { VOCAB_CATEGORIES, VocabCategory } from './categories';
import { getVocabularyBank20x } from '../korean20x/vocabularyBank20x';
import { VocabTopicId } from '../korean20x/levelsAndCategories';
import { getScriptPronunciation } from '../../utils/hangulPhonetics';

// Base preserved hand-curated array (all 534 original entries preserved, enriched with tri-script pronunciation)
export const rawWordList: BdKoreanWord[] = [
  ...coreVocab,
  ...verbsAndAdjectives,
  ...practicalLifeVocab,
  ...topikAndAcademicVocab,
].map(w => ({
  ...w,
  bengaliPronunciation: getScriptPronunciation(w.hangul, 'bn', { pronunciationBn: w.bengaliPronunciation }),
  nepaliPronunciation: getScriptPronunciation(w.hangul, 'ne'),
  romanization: getScriptPronunciation(w.hangul, 'en', { romanization: w.romanization }),
}));

function topicToLegacyDictCategory(topic: VocabTopicId, pos: string): string {
  if (pos === 'Verb') return 'verbs';
  if (pos === 'Adjective') return 'adjectives';
  switch (topic) {
    case 'university': return 'university';
    case 'housing': return 'housing';
    case 'immigration': return 'visa_immigration';
    case 'daily_life': return 'food_halal';
    case 'healthcare': return 'hospital_health';
    case 'transportation': return 'transit_travel';
    case 'employment':
    case 'business': return 'job_workplace';
    case 'banking':
    case 'shopping': return 'money_banking';
    case 'topik': return 'topik_exam';
    default: return 'essentials';
  }
}

let cachedDictionary: BdKoreanWord[] | null = null;

// Authentic 10,800+ deduplicated Korean-Bengali-Nepali-English dictionary (zero placeholder entries)
export function getFullBdKoreanDictionary(): BdKoreanWord[] {
  if (cachedDictionary) return cachedDictionary;

  const seen = new Set<string>();
  const combined: BdKoreanWord[] = [];

  rawWordList.forEach(w => {
    const key = w.hangul.trim();
    if (!key || seen.has(key)) return;
    seen.add(key);
    combined.push(w);
  });

  getVocabularyBank20x().forEach(item => {
    const key = item.korean.trim();
    if (!key || seen.has(key)) return;
    seen.add(key);
    combined.push({
      id: item.id,
      hangul: item.korean,
      bengali: item.meaningBn,
      nepali: item.meaningNe,
      english: item.meaningEn,
      bengaliPronunciation: item.pronunciationBn,
      nepaliPronunciation: item.pronunciationNe,
      romanization: item.romanization,
      category: topicToLegacyDictCategory(item.topic, item.partOfSpeech),
      topic: item.topic,
      level: item.level,
      partOfSpeech: item.partOfSpeech.toLowerCase(),
      topikLevel: item.level === 'TOPIK II' || item.difficulty === 'Advanced' ? 'TOPIK II' : 'TOPIK I',
      exampleHangul: item.exampleKo,
      exampleBengali: item.exampleBn,
      exampleNepali: item.exampleNe,
      exampleEnglish: item.exampleEn,
      relatedWords: item.relatedWords,
      synonyms: item.synonyms,
    });
  });

  cachedDictionary = combined;
  return combined;
}

export const bdKoreanDictionary: BdKoreanWord[] = getFullBdKoreanDictionary();

export { VOCAB_CATEGORIES };
export type { VocabCategory };
