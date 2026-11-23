import { UserProfile } from '../types';

export interface CountryOption {
  code: string;
  name: string;
  dialCode: string;
  flag: string;
}

export const COUNTRIES_DATA: CountryOption[] = [
  { code: 'KR', name: 'South Korea', dialCode: '+82', flag: '🇰🇷' },
  { code: 'BD', name: 'Bangladesh', dialCode: '+880', flag: '🇧🇩' },
  { code: 'NP', name: 'Nepal', dialCode: '+977', flag: '🇳🇵' },
  { code: 'VN', name: 'Vietnam', dialCode: '+84', flag: '🇻🇳' },
  { code: 'CN', name: 'China', dialCode: '+86', flag: '🇨🇳' },
  { code: 'UZ', name: 'Uzbekistan', dialCode: '+998', flag: '🇺🇿' },
  { code: 'IN', name: 'India', dialCode: '+91', flag: '🇮🇳' },
  { code: 'PK', name: 'Pakistan', dialCode: '+92', flag: '🇵🇰' },
  { code: 'MN', name: 'Mongolia', dialCode: '+976', flag: '🇲🇳' },
  { code: 'ID', name: 'Indonesia', dialCode: '+62', flag: '🇮🇩' },
  { code: 'PH', name: 'Philippines', dialCode: '+63', flag: '🇵🇭' },
  { code: 'MY', name: 'Malaysia', dialCode: '+60', flag: '🇲🇾' },
  { code: 'TH', name: 'Thailand', dialCode: '+66', flag: '🇹🇭' },
  { code: 'MM', name: 'Myanmar', dialCode: '+95', flag: '🇲🇲' },
  { code: 'KH', name: 'Cambodia', dialCode: '+855', flag: '🇰🇭' },
  { code: 'LK', name: 'Sri Lanka', dialCode: '+94', flag: '🇱🇰' },
  { code: 'KZ', name: 'Kazakhstan', dialCode: '+7', flag: '🇰🇿' },
  { code: 'KG', name: 'Kyrgyzstan', dialCode: '+996', flag: '🇰🇬' },
  { code: 'RU', name: 'Russia', dialCode: '+7', flag: '🇷🇺' },
  { code: 'JP', name: 'Japan', dialCode: '+81', flag: '🇯🇵' },
  { code: 'TW', name: 'Taiwan', dialCode: '+886', flag: '🇹🇼' },
  { code: 'HK', name: 'Hong Kong', dialCode: '+852', flag: '🇭🇰' },
  { code: 'SG', name: 'Singapore', dialCode: '+65', flag: '🇸🇬' },
  { code: 'US', name: 'United States', dialCode: '+1', flag: '🇺🇸' },
  { code: 'CA', name: 'Canada', dialCode: '+1', flag: '🇨🇦' },
  { code: 'GB', name: 'United Kingdom', dialCode: '+44', flag: '🇬🇧' },
  { code: 'AU', name: 'Australia', dialCode: '+61', flag: '🇦🇺' },
  { code: 'NZ', name: 'New Zealand', dialCode: '+64', flag: '🇳🇿' },
  { code: 'DE', name: 'Germany', dialCode: '+49', flag: '🇩🇪' },
  { code: 'FR', name: 'France', dialCode: '+33', flag: '🇫🇷' },
  { code: 'IT', name: 'Italy', dialCode: '+39', flag: '🇮🇹' },
  { code: 'ES', name: 'Spain', dialCode: '+34', flag: '🇪🇸' },
  { code: 'NL', name: 'Netherlands', dialCode: '+31', flag: '🇳🇱' },
  { code: 'SE', name: 'Sweden', dialCode: '+46', flag: '🇸🇪' },
  { code: 'NO', name: 'Norway', dialCode: '+47', flag: '🇳🇴' },
  { code: 'FI', name: 'Finland', dialCode: '+358', flag: '🇫🇮' },
  { code: 'DK', name: 'Denmark', dialCode: '+45', flag: '🇩🇰' },
  { code: 'PL', name: 'Poland', dialCode: '+48', flag: '🇵🇱' },
  { code: 'TR', name: 'Turkey', dialCode: '+90', flag: '🇹🇷' },
  { code: 'EG', name: 'Egypt', dialCode: '+20', flag: '🇪🇬' },
  { code: 'NG', name: 'Nigeria', dialCode: '+234', flag: '🇳🇬' },
  { code: 'KE', name: 'Kenya', dialCode: '+254', flag: '🇰🇪' },
  { code: 'GH', name: 'Ghana', dialCode: '+233', flag: '🇬🇭' },
  { code: 'ZA', name: 'South Africa', dialCode: '+27', flag: '🇿🇦' },
  { code: 'MA', name: 'Morocco', dialCode: '+212', flag: '🇲🇦' },
  { code: 'ET', name: 'Ethiopia', dialCode: '+251', flag: '🇪🇹' },
  { code: 'BR', name: 'Brazil', dialCode: '+55', flag: '🇧🇷' },
  { code: 'MX', name: 'Mexico', dialCode: '+52', flag: '🇲🇽' },
  { code: 'CO', name: 'Colombia', dialCode: '+57', flag: '🇨🇴' },
  { code: 'PE', name: 'Peru', dialCode: '+51', flag: '🇵🇪' },
  { code: 'AR', name: 'Argentina', dialCode: '+54', flag: '🇦🇷' },
  { code: 'CL', name: 'Chile', dialCode: '+56', flag: '🇨🇱' },
  { code: 'AE', name: 'United Arab Emirates', dialCode: '+971', flag: '🇦🇪' },
  { code: 'SA', name: 'Saudi Arabia', dialCode: '+966', flag: '🇸🇦' },
  { code: 'QA', name: 'Qatar', dialCode: '+974', flag: '🇶🇦' },
];

export const STUDY_LEVEL_OPTIONS = [
  'Korean Language Program',
  'Associate Degree',
  "Bachelor's Degree",
  "Master's Degree",
  'PhD',
] as const;

export const EDUCATION_LEVEL_OPTIONS = [
  'High School / HSC / A-Level',
  'Secondary School / SSC / O-Level',
  'Diploma / Polytechnic',
  "Bachelor's Degree (Undergraduate)",
  "Master's Degree (Graduate)",
  'PhD / Doctorate',
  'Korean Language Institute (KLI)',
] as const;

export const INTAKE_OPTIONS = [
  'Spring 2026 (March)',
  'Summer 2026 (June - Language)',
  'Fall 2026 (September)',
  'Winter 2026 (December - Language)',
  'Spring 2027 (March)',
  'Fall 2027 (September)',
] as const;

export const KOREAN_LEVEL_OPTIONS = [
  'Beginner (No TOPIK)',
  'TOPIK Level 1',
  'TOPIK Level 2',
  'TOPIK Level 3',
  'TOPIK Level 4',
  'TOPIK Level 5',
  'TOPIK Level 6',
  'King Sejong Institute / KIIP',
] as const;

export const GENERAL_USER_INTERESTS = [
  'University Admissions & D-2 Visa',
  'GKS / Korean Scholarships',
  'Part-Time Student Jobs & E-7 Careers',
  'Student Housing & Goshiwons',
  'Korean Language (TOPIK)',
  'Campus Life & Student Community',
  'Visa Rules & Immigration Updates',
  'Korean Culture & Events',
] as const;

export function calculateProfileCompletion(profile: Partial<UserProfile>): {
  percentage: number;
  missingFields: string[];
} {
  const accountType = profile.accountType || (profile.role === 'student' ? 'student' : 'general');
  const checks: Array<{ label: string; valid: boolean }> = [
    { label: 'Full Name', valid: Boolean(profile.name && profile.name.trim().length >= 2) },
    { label: 'Verified Email', valid: Boolean(profile.email && profile.emailVerified !== false) },
    { label: 'Phone Number', valid: Boolean(profile.phoneNumber && profile.phoneNumber.trim().length >= 6) },
    { label: 'Country of Residence', valid: Boolean(profile.countryOfResidence && profile.countryOfResidence.trim()) },
    { label: 'Nationality', valid: Boolean(profile.nationality && profile.nationality.trim()) },
    { label: 'Date of Birth', valid: Boolean(profile.dateOfBirth && profile.dateOfBirth.trim()) },
  ];

  if (accountType === 'student') {
    const academic = profile.studentAcademicProfile;
    const hasEducationRecords = Array.isArray(profile.educationRecords) && profile.educationRecords.length > 0;
    checks.push(
      {
        label: 'Current / Last Completed Education',
        valid: Boolean(
          academic?.currentEducationLevel ||
            academic?.lastCompletedEducation ||
            hasEducationRecords ||
            profile.degreeLevel
        ),
      },
      {
        label: 'SSC / HSC Academic Scores or Records',
        valid: Boolean(
          (academic?.sscPassingYear && academic?.sscGpa) ||
            (academic?.hscPassingYear && academic?.hscGpa) ||
            hasEducationRecords
        ),
      },
      {
        label: 'Desired Study Level in Korea',
        valid: Boolean(profile.preferredStudyLevel || academic?.desiredStudyLevel || profile.degreeLevel),
      },
      {
        label: 'Preferred Intake & Target University',
        valid: Boolean(
          (profile.preferredIntake || academic?.preferredIntake) &&
            (profile.preferredUniversity || academic?.preferredUniversity || profile.university)
        ),
      }
    );
  } else if (accountType === 'agent') {
    const agent = profile.agentPartnerProfile;
    checks.push(
      { label: 'Agency Name', valid: Boolean(agent?.agencyName && agent.agencyName.trim()) },
      { label: 'Contact Person', valid: Boolean(agent?.contactPerson && agent.contactPerson.trim()) },
      { label: 'Business Email', valid: Boolean(agent?.businessEmail && agent.businessEmail.trim()) },
      { label: 'Agency Country & City', valid: Boolean(agent?.country && agent?.city) }
    );
  } else {
    const gen = profile.generalUserProfile;
    checks.push(
      { label: 'Current City', valid: Boolean(profile.city || gen?.currentCity) },
      {
        label: 'Interests or Preferred Language',
        valid: Boolean((gen?.interests && gen.interests.length > 0) || gen?.preferredLanguage || profile.preferredLanguage),
      }
    );
  }

  const completedCount = checks.filter((c) => c.valid).length;
  const percentage = Math.round((completedCount / checks.length) * 100);
  const missingFields = checks.filter((c) => !c.valid).map((c) => c.label);

  return { percentage, missingFields };
}
