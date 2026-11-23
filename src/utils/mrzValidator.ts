/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ICAO Document 9303 TD3 Passport MRZ Parser & Check-Digit Validator.
 * Validates passport number, date of birth, expiry date, and composite check digits
 * strictly in code so verified MRZ fields take precedence over visual-zone OCR.
 */

import type { MrzValidationResult } from '../types/smartApplication';

const WEIGHTS = [7, 3, 1];

export function computeIcaoCheckDigit(input: string): number {
  const normalized = String(input || '').toUpperCase();
  let sum = 0;
  for (let i = 0; i < normalized.length; i += 1) {
    const ch = normalized[i];
    let val = 0;
    if (ch === '<') {
      val = 0;
    } else if (ch >= '0' && ch <= '9') {
      val = ch.charCodeAt(0) - 48;
    } else if (ch >= 'A' && ch <= 'Z') {
      val = ch.charCodeAt(0) - 55; // A=10 .. Z=35
    } else {
      val = 0;
    }
    sum += val * WEIGHTS[i % 3];
  }
  return sum % 10;
}

export function normalizePassportNumber(raw: string): string {
  return String(raw || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .trim();
}

function cleanMrzLine(line: string): string {
  return String(line || '')
    .toUpperCase()
    .replace(/\s+/g, '')
    .replace(/[^A-Z0-9<]/g, '');
}

function parseMrzDate(yymmdd: string, kind: 'dob' | 'expiry'): string {
  if (!/^\d{6}$/.test(yymmdd)) return '';
  const yy = parseInt(yymmdd.slice(0, 2), 10);
  const mm = parseInt(yymmdd.slice(2, 4), 10);
  const dd = parseInt(yymmdd.slice(4, 6), 10);
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return '';

  const currentYear = new Date().getUTCFullYear();
  const currentTwoDigit = currentYear % 100;

  let fullYear: number;
  if (kind === 'dob') {
    // DOB cannot be in the future
    fullYear = yy <= currentTwoDigit ? 2000 + yy : 1900 + yy;
  } else {
    // Passport expiry is typically between 1995 and 2060
    fullYear = yy >= 80 ? 1900 + yy : 2000 + yy;
  }

  const mmStr = String(mm).padStart(2, '0');
  const ddStr = String(dd).padStart(2, '0');
  return `${fullYear}-${mmStr}-${ddStr}`;
}

export const ISO3_COUNTRY_MAP: Record<string, string> = {
  AFG: 'Afghanistan',
  AUS: 'Australia',
  AZE: 'Azerbaijan',
  BGD: 'Bangladesh',
  BRA: 'Brazil',
  BTN: 'Bhutan',
  CAN: 'Canada',
  CHN: 'China',
  COL: 'Colombia',
  DEU: 'Germany',
  D: 'Germany',
  EGY: 'Egypt',
  ESP: 'Spain',
  ETH: 'Ethiopia',
  FRA: 'France',
  GBR: 'United Kingdom',
  GHA: 'Ghana',
  HKG: 'Hong Kong',
  IDN: 'Indonesia',
  IND: 'India',
  IRN: 'Iran',
  IRQ: 'Iraq',
  ITA: 'Italy',
  JPN: 'Japan',
  KAZ: 'Kazakhstan',
  KEN: 'Kenya',
  KGZ: 'Kyrgyzstan',
  KHM: 'Cambodia',
  KOR: 'South Korea',
  LAO: 'Laos',
  LKA: 'Sri Lanka',
  MAR: 'Morocco',
  MDV: 'Maldives',
  MEX: 'Mexico',
  MMR: 'Myanmar',
  MNG: 'Mongolia',
  MYS: 'Malaysia',
  NGA: 'Nigeria',
  NLD: 'Netherlands',
  NPL: 'Nepal',
  NZL: 'New Zealand',
  PAK: 'Pakistan',
  PER: 'Peru',
  PHL: 'Philippines',
  POL: 'Poland',
  RUS: 'Russia',
  SAU: 'Saudi Arabia',
  SGP: 'Singapore',
  THA: 'Thailand',
  TJK: 'Tajikistan',
  TKM: 'Turkmenistan',
  TUR: 'Turkey',
  TWN: 'Taiwan',
  UKR: 'Ukraine',
  USA: 'United States',
  UZB: 'Uzbekistan',
  VNM: 'Vietnam',
  ZAF: 'South Africa',
};

export function iso3ToCountryName(code: string): string {
  const clean = String(code || '')
    .toUpperCase()
    .replace(/[^A-Z]/g, '');
  if (!clean) return '';
  return ISO3_COUNTRY_MAP[clean] || clean;
}

/**
 * Validates TD3 2-line (44 chars each) passport MRZ per ICAO 9303.
 */
export function validateTd3Mrz(rawLine1?: string, rawLine2?: string): MrzValidationResult {
  const line1 = cleanMrzLine(rawLine1 || '');
  const line2 = cleanMrzLine(rawLine2 || '');

  if (line1.length < 36 || line2.length < 42) {
    return {
      hasMrz: false,
      isValid: false,
      passportCheckPassed: false,
      dobCheckPassed: false,
      expiryCheckPassed: false,
      compositeCheckPassed: false,
      warnings: ['MRZ lines were missing or incomplete. Please check extracted fields carefully.'],
    };
  }

  // Pad to 44 chars if minor trailing '<' were clipped by OCR
  const l1 = line1.padEnd(44, '<').slice(0, 44);
  const l2 = line2.padEnd(44, '<').slice(0, 44);

  // Line 1: pos 0..1 document code (e.g. P<), pos 2..4 issuing state, pos 5..43 names (SURNAME<<GIVEN<NAMES)
  const nameBlock = l1.slice(5);
  const [rawSurname = '', rawGiven = ''] = nameBlock.split('<<');
  const surname = rawSurname.replace(/<+/g, ' ').trim();
  const givenNames = rawGiven.replace(/<+/g, ' ').trim();

  // Line 2 per ICAO 9303 TD3:
  // 0..8   Passport number (9)
  // 9      Passport check digit (1)
  // 10..12 Nationality ISO-3 (3)
  // 13..18 Date of Birth YYMMDD (6)
  // 19     DOB check digit (1)
  // 20     Sex (M/F/<)
  // 21..26 Expiry Date YYMMDD (6)
  // 27     Expiry check digit (1)
  // 28..41 Personal number / optional data (14)
  // 42     Personal number check digit (1)
  // 43     Composite check digit over l2[0..9] + l2[13..19] + l2[21..42]
  const passportRaw = l2.slice(0, 9);
  const passportCheckChar = l2[9];
  const nationalityRaw = l2.slice(10, 13).replace(/</g, '');
  const dobRaw = l2.slice(13, 19);
  const dobCheckChar = l2[19];
  const sexChar = l2[20];
  const expiryRaw = l2.slice(21, 27);
  const expiryCheckChar = l2[27];
  const optionalDataAndCheck = l2.slice(28, 43);
  const compositeCheckChar = l2[43];

  const passportCheckPassed =
    /^\d$/.test(passportCheckChar) &&
    computeIcaoCheckDigit(passportRaw) === parseInt(passportCheckChar, 10);

  const dobCheckPassed =
    /^\d$/.test(dobCheckChar) &&
    /^\d{6}$/.test(dobRaw) &&
    computeIcaoCheckDigit(dobRaw) === parseInt(dobCheckChar, 10);

  const expiryCheckPassed =
    /^\d$/.test(expiryCheckChar) &&
    /^\d{6}$/.test(expiryRaw) &&
    computeIcaoCheckDigit(expiryRaw) === parseInt(expiryCheckChar, 10);

  const compositeInput = `${passportRaw}${passportCheckChar}${dobRaw}${dobCheckChar}${expiryRaw}${expiryCheckChar}${optionalDataAndCheck}`;
  const compositeCheckPassed =
    /^\d$/.test(compositeCheckChar) &&
    computeIcaoCheckDigit(compositeInput) === parseInt(compositeCheckChar, 10);

  const warnings: string[] = [];
  if (!passportCheckPassed) warnings.push('Passport number MRZ check digit failed — please check.');
  if (!dobCheckPassed) warnings.push('Date of birth MRZ check digit failed — please check.');
  if (!expiryCheckPassed) warnings.push('Passport expiry date MRZ check digit failed — please check.');
  if (!compositeCheckPassed) warnings.push('Composite MRZ check digit failed — please check all passport fields.');

  const sex: 'Male' | 'Female' | 'Other' | '' =
    sexChar === 'M' ? 'Male' : sexChar === 'F' ? 'Female' : sexChar === '<' ? 'Other' : '';

  const isValid =
    passportCheckPassed && dobCheckPassed && expiryCheckPassed && compositeCheckPassed;

  return {
    hasMrz: true,
    isValid,
    passportCheckPassed,
    dobCheckPassed,
    expiryCheckPassed,
    compositeCheckPassed,
    parsed: {
      surname,
      givenNames,
      passportNumber: passportRaw.replace(/</g, '').trim(),
      nationalityIso3: nationalityRaw,
      dateOfBirth: parseMrzDate(dobRaw, 'dob'),
      sex,
      expiryDate: parseMrzDate(expiryRaw, 'expiry'),
    },
    warnings,
  };
}
