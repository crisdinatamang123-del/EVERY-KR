/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type LanguageCode =
  | 'en' // English
  | 'bn' // Bengali (বাংলা)
  | 'ko' // Korean (한국어)
  | 'ne' // Nepali (नेपाली)
  | 'hi' // Hindi (हिन्दी)
  | 'ur' // Urdu (اردو) - RTL
  | 'ar' // Arabic (العربية) - RTL
  | 'zh' // Simplified Chinese (简体中文)
  | 'ja' // Japanese (日本語)
  | 'vi' // Vietnamese (Tiếng Việt)
  | 'th' // Thai (ภาษาไทย)
  | 'id' // Indonesian (Bahasa Indonesia)
  | 'ms' // Malay (Bahasa Melayu)
  | 'ru' // Russian (Русский)
  | 'es'; // Spanish (Español)

export interface LanguageOption {
  code: LanguageCode;
  name: string;
  nativeName: string;
  flag: string;
  dir: 'ltr' | 'rtl';
}

export const supportedLanguages: LanguageOption[] = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸', dir: 'ltr' },
  { code: 'ko', name: 'Korean', nativeName: '한국어', flag: '🇰🇷', dir: 'ltr' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', flag: '🇧🇩', dir: 'ltr' },
  { code: 'ne', name: 'Nepali', nativeName: 'नेपाली', flag: '🇳🇵', dir: 'ltr' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳', dir: 'ltr' },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو', flag: '🇵🇰', dir: 'rtl' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦', dir: 'rtl' },
  { code: 'zh', name: 'Chinese (Simplified)', nativeName: '简体中文', flag: '🇨🇳', dir: 'ltr' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵', dir: 'ltr' },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt', flag: '🇻🇳', dir: 'ltr' },
  { code: 'th', name: 'Thai', nativeName: 'ภาษาไทย', flag: '🇹🇭', dir: 'ltr' },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia', flag: '🇮🇩', dir: 'ltr' },
  { code: 'ms', name: 'Malay', nativeName: 'Bahasa Melayu', flag: '🇲🇾', dir: 'ltr' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺', dir: 'ltr' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸', dir: 'ltr' },
];

export interface TranslationSchema {
  nav: {
    home: string;
    universities: string;
    housing: string;
    transit: string;
    marketplace: string;
    grocery: string;
    community: string;
    visa: string;
    myPage: string;
    profile: string;
    admin: string;
    signIn: string;
    signUp: string;
    signOut: string;
    deployGuide: string;
    language: string;
  };
  common: {
    search: string;
    searchPlaceholder: string;
    viewAll: string;
    save: string;
    saved: string;
    cancel: string;
    close: string;
    submit: string;
    loading: string;
    error: string;
    success: string;
    required: string;
    optional: string;
    edit: string;
    delete: string;
    learnMore: string;
    contact: string;
    details: string;
    explore: string;
    back: string;
    reset: string;
    filter: string;
    resultsCount: string;
    month: string;
    free: string;
  };
  auth: {
    signInTitle: string;
    signUpTitle: string;
    forgotPasswordTitle: string;
    emailLabel: string;
    emailPlaceholder: string;
    passwordLabel: string;
    passwordPlaceholder: string;
    nameLabel: string;
    namePlaceholder: string;
    countryLabel: string;
    languageLabel: string;
    universityLabel: string;
    visaStatusLabel: string;
    signInBtn: string;
    signUpBtn: string;
    googleSignInBtn: string;
    sendResetLink: string;
    backToSignIn: string;
    noAccount: string;
    alreadyAccount: string;
    forgotPassword: string;
    authSuccess: string;
    resetEmailSent: string;
    orContinueWith: string;
    firebaseStatus: string;
    firebaseMissingNotice: string;
    weakPassword: string;
    invalidEmail: string;
    userNotFound: string;
    wrongPassword: string;
    emailInUse: string;
  };
  home: {
    heroKicker: string;
    heroTitle1: string;
    heroTitle2: string;
    heroSubtitle: string;
    searchBarPlaceholder: string;
    exploreBtn: string;
    trustUniversities: string;
    trustLandlords: string;
    trustVisaRules: string;
    servicesTitle: string;
    servicesSubtitle: string;
    calculatorTitle: string;
    krwConverterTitle: string;
    s3CalculatorTitle: string;
    urgentHelpTitle: string;
    urgentHelpDesc: string;
    callNow: string;
  };
  profile: {
    profileTitle: string;
    overviewTab: string;
    editTab: string;
    securityTab: string;
    photoUpload: string;
    photoUploadDesc: string;
    uploading: string;
    maxPhotoSize: string;
    displayName: string;
    email: string;
    country: string;
    preferredLanguage: string;
    enrolledUniv: string;
    visaType: string;
    visaExpiry: string;
    saveChanges: string;
    savedSuccess: string;
    changePassword: string;
    newPassword: string;
    confirmPassword: string;
    updatePasswordBtn: string;
    accountSecurity: string;
    sessionInfo: string;
    registeredOn: string;
  };
  dashboard: {
    welcomeBack: string;
    daysRemaining: string;
    arcExpiry: string;
    renewalSteps: string;
    applicationTracker: string;
    applicationTrackerSubtitle: string;
    addUniversity: string;
    savedHousing: string;
    savedHousingSubtitle: string;
    marketplaceActivity: string;
    marketplaceSubtitle: string;
    noApplications: string;
    noHousing: string;
    noItems: string;
  };
  footer: {
    tagline: string;
    studentServices: string;
    immigrationCommunity: string;
    emergencyHotlines: string;
    disclaimer: string;
    copyright: string;
  };
}
