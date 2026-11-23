import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { getPostLoginRedirectPath } from '../utils/seoRoutes';
import {
  AccountType,
  EducationRecord,
  LanguageCode
} from '../types';
import {
  COUNTRIES_DATA,
  STUDY_LEVEL_OPTIONS,
  EDUCATION_LEVEL_OPTIONS,
  INTAKE_OPTIONS,
  KOREAN_LEVEL_OPTIONS,
  GENERAL_USER_INTERESTS
} from '../data/countriesData';
import { isAndroidOrMobileBrowser } from '../lib/firebase';
import {
  deriveUniqueUidFromEmail,
  generateRegistrationId,
  syncOtpVerificationMetadataDoc
} from '../services/firebaseService';
import { RecaptchaCheckbox } from './security/RecaptchaCheckbox';
import {
  GraduationCap,
  User,
  Building2,
  Briefcase,
  Home,
  ShieldCheck,
  Lock,
  Mail,
  Phone,
  Globe,
  Calendar,
  Plus,
  Trash2,
  CheckCircle2,
  Circle,
  X,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Loader2,
  RefreshCw,
  KeyRound,
  Clock,
  FileText,
  Sparkles,
  Check
} from 'lucide-react';

interface RegistrationWizardProps {
  compactModal?: boolean;
  onSwitchToLogin?: () => void;
  onSuccessClose?: () => void;
}

const DRAFT_STORAGE_KEY = 'everykr_registration_draft_v1';

export const RegistrationWizard: React.FC<RegistrationWizardProps> = ({
  compactModal = false,
  onSwitchToLogin,
  onSuccessClose
}) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const postRegistrationTarget = getPostLoginRedirectPath(null, searchParams.get('redirect'));
  const {
    login,
    loginWithGoogle,
    universitiesList,
    showToast,
    t
  } = useApp();

  // Wizard Step: 1=Account Type, 2=Account Info, 3=Personal & Passport, 4=Role Details, 5=Consent & OTP
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [otpSubStep, setOtpSubStep] = useState<'consent_review' | 'otp_verify'>('consent_review');

  // Step 1: Account Type
  const [accountType, setAccountType] = useState<AccountType>('student');

  // Step 2: Mandatory Account Information
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [countryCode, setCountryCode] = useState('+82');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [countryOfResidence, setCountryOfResidence] = useState('South Korea');
  const [nationality, setNationality] = useState('Bangladesh');
  const [residenceSearch, setResidenceSearch] = useState('');
  const [nationalitySearch, setNationalitySearch] = useState('');
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [emailDuplicateError, setEmailDuplicateError] = useState<string | null>(null);

  // Step 3: Personal Information & Conditional Passport Collection
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('');
  const [currentCity, setCurrentCity] = useState('Seoul');
  const [passportRequiredForService, setPassportRequiredForService] = useState(false);
  const [passportNumber, setPassportNumber] = useState('');
  const [passportIssueDate, setPassportIssueDate] = useState('');
  const [passportExpiryDate, setPassportExpiryDate] = useState('');
  const [passportStepConsent, setPassportStepConsent] = useState(false);

  // Step 4A: Student Education Information
  const [currentEducationLevel, setCurrentEducationLevel] = useState<string>('High School / HSC / A-Level');
  const [lastCompletedEducation, setLastCompletedEducation] = useState<string>('High School / HSC / A-Level');
  const [sscPassingYear, setSscPassingYear] = useState('');
  const [sscGpa, setSscGpa] = useState('');
  const [hscPassingYear, setHscPassingYear] = useState('');
  const [hscGpa, setHscGpa] = useState('');
  const [diplomaPassingYear, setDiplomaPassingYear] = useState('');
  const [bachelorPassingYear, setBachelorPassingYear] = useState('');
  const [currentUniversity, setCurrentUniversity] = useState('');
  const [currentMajor, setCurrentMajor] = useState('');
  const [desiredStudyLevel, setDesiredStudyLevel] = useState<string>("Bachelor's Degree");
  const [preferredIntake, setPreferredIntake] = useState<string>('Fall 2026 (September)');
  const [preferredUniversity, setPreferredUniversity] = useState<string>('Yonsei University');
  const [uniSearchQuery, setUniSearchQuery] = useState('');
  const [koreanLanguageLevel, setKoreanLanguageLevel] = useState<string>('Beginner (No TOPIK)');
  const [englishScore, setEnglishScore] = useState('');
  const [studyGap, setStudyGap] = useState('');
  const [educationRecords, setEducationRecords] = useState<EducationRecord[]>([
    {
      id: 'edu_init_1',
      level: 'High School / HSC / A-Level',
      institution: '',
      boardOrUniversity: '',
      passingYear: '',
      gpaOrGrade: '',
      majorOrGroup: ''
    }
  ]);

  // Step 4B: General User Information
  const [selectedInterests, setSelectedInterests] = useState<string[]>([
    'University Admissions & D-2 Visa',
    'GKS / Korean Scholarships'
  ]);
  const [preferredLanguage, setPreferredLanguage] = useState<LanguageCode>('en');

  // Step 4C: Education Agent / Partner Information
  const [agencyName, setAgencyName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [agencyCountry, setAgencyCountry] = useState('Bangladesh');
  const [agencyCity, setAgencyCity] = useState('Dhaka');
  const [businessEmail, setBusinessEmail] = useState('');
  const [agencyPhone, setAgencyPhone] = useState('');
  const [agencyWebsite, setAgencyWebsite] = useState('');
  const [yearsOfExperience, setYearsOfExperience] = useState('');

  // Step 5: Privacy Consent Checkboxes (Strictly UNCHECKED by default)
  const [privacyPolicyAccepted, setPrivacyPolicyAccepted] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [personalInfoConsent, setPersonalInfoConsent] = useState(false);
  const [passportInfoConsent, setPassportInfoConsent] = useState(false);
  const [showPrivacyDisclosureDetails, setShowPrivacyDisclosureDetails] = useState(false);

  // OTP & Submission State
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [otpExpirySeconds, setOtpExpirySeconds] = useState(300);
  const [attemptsRemaining, setAttemptsRemaining] = useState(5);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResendingOtp, setIsResendingOtp] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [otpStatusBanner, setOtpStatusBanner] = useState<string | null>(null);
  const [honeypot, setHoneypot] = useState<string>('');
  const [recaptchaToken, setRecaptchaToken] = useState<string>('');
  const [recaptchaError, setRecaptchaError] = useState<string | null>(null);
  const [recaptchaResetSignal, setRecaptchaResetSignal] = useState<number>(0);

  const otpInputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const isMobileBrowser = isAndroidOrMobileBrowser();

  // Restore non-sensitive draft progress from sessionStorage on mount
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(DRAFT_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.accountType) setAccountType(parsed.accountType);
        if (parsed.fullName) setFullName(parsed.fullName);
        if (parsed.email) setEmail(parsed.email);
        if (parsed.countryCode) setCountryCode(parsed.countryCode);
        if (parsed.phoneNumber) setPhoneNumber(parsed.phoneNumber);
        if (parsed.countryOfResidence) setCountryOfResidence(parsed.countryOfResidence);
        if (parsed.nationality) setNationality(parsed.nationality);
        if (parsed.dateOfBirth) setDateOfBirth(parsed.dateOfBirth);
        if (parsed.gender) setGender(parsed.gender);
        if (parsed.currentCity) setCurrentCity(parsed.currentCity);
        if (parsed.desiredStudyLevel) setDesiredStudyLevel(parsed.desiredStudyLevel);
        if (parsed.preferredIntake) setPreferredIntake(parsed.preferredIntake);
        if (parsed.preferredUniversity) setPreferredUniversity(parsed.preferredUniversity);
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  // Save non-sensitive draft progress to sessionStorage (never stores password, passportNumber, or OTP)
  useEffect(() => {
    try {
      sessionStorage.setItem(
        DRAFT_STORAGE_KEY,
        JSON.stringify({
          accountType,
          fullName,
          email,
          countryCode,
          phoneNumber,
          countryOfResidence,
          nationality,
          dateOfBirth,
          gender,
          currentCity,
          desiredStudyLevel,
          preferredIntake,
          preferredUniversity
        })
      );
    } catch {
      // ignore
    }
  }, [
    accountType,
    fullName,
    email,
    countryCode,
    phoneNumber,
    countryOfResidence,
    nationality,
    dateOfBirth,
    gender,
    currentCity,
    desiredStudyLevel,
    preferredIntake,
    preferredUniversity
  ]);

  // Countdown timer for OTP expiry & resend cooldown
  useEffect(() => {
    if (step !== 5 || otpSubStep !== 'otp_verify') return;
    const timer = setInterval(() => {
      setResendCooldown(prev => (prev > 0 ? prev - 1 : 0));
      setOtpExpirySeconds(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [step, otpSubStep]);

  // Validation helpers
  const isValidEmail = (val: string) =>
    /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(val.trim());

  const isValidPhone = (val: string) =>
    /^[0-9+\-\s()]{6,20}$/.test(val.trim());

  const hasMinLength = password.length >= 8;
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumberOrSymbol = /[0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password);
  const isPasswordStrong = hasMinLength && hasLetter && hasNumberOrSymbol;
  const doPasswordsMatch = password.length > 0 && password === confirmPassword;

  // Filtered country lists for searchable selectors
  const filteredResidenceCountries = useMemo(() => {
    const q = residenceSearch.trim().toLowerCase();
    if (!q) return COUNTRIES_DATA;
    return COUNTRIES_DATA.filter(
      c => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q)
    );
  }, [residenceSearch]);

  const filteredNationalityCountries = useMemo(() => {
    const q = nationalitySearch.trim().toLowerCase();
    if (!q) return COUNTRIES_DATA;
    return COUNTRIES_DATA.filter(
      c => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q)
    );
  }, [nationalitySearch]);

  // Filtered Korean Universities for searchable university selector
  const filteredKoreanUniversities = useMemo(() => {
    const q = uniSearchQuery.trim().toLowerCase();
    if (!q) return universitiesList.slice(0, 60);
    return universitiesList
      .filter(
        u =>
          u.name.toLowerCase().includes(q) ||
          (u.koreanName || '').toLowerCase().includes(q) ||
          u.city.toLowerCase().includes(q)
      )
      .slice(0, 60);
  }, [universitiesList, uniSearchQuery]);

  // Real-time duplicate email check on blur or before advancing from Step 2
  const checkEmailAvailability = async (targetEmail: string): Promise<boolean> => {
    const normalized = targetEmail.trim().toLowerCase();
    if (!isValidEmail(normalized)) return false;
    setIsCheckingEmail(true);
    setEmailDuplicateError(null);
    try {
      const res = await fetch(`/api/auth/check-email?email=${encodeURIComponent(normalized)}`);
      const data = await res.json().catch(() => null);
      if (data?.exists) {
        setEmailDuplicateError(
          'An EveryKR account with this email address already exists. Please sign in or use a different email.'
        );
        return false;
      }
      return true;
    } catch {
      return true;
    } finally {
      setIsCheckingEmail(false);
    }
  };

  // Step-by-Step Validation before advancing
  const handleNextStep = async () => {
    setErrorBanner(null);

    if (step === 1) {
      setStep(2);
      return;
    }

    if (step === 2) {
      if (!fullName.trim() || fullName.trim().length < 2) {
        setErrorBanner('Full Name is required (minimum 2 characters).');
        return;
      }
      if (!isValidEmail(email)) {
        setErrorBanner('Please enter a valid email address.');
        return;
      }
      if (!isPasswordStrong) {
        setErrorBanner(
          'Password must be at least 8 characters long and contain both letters and numbers/symbols.'
        );
        return;
      }
      if (!doPasswordsMatch) {
        setErrorBanner('Password and Confirm Password do not match.');
        return;
      }
      if (!isValidPhone(phoneNumber)) {
        setErrorBanner('Please enter a valid phone number (6–20 digits).');
        return;
      }
      if (!countryOfResidence.trim()) {
        setErrorBanner('Please select your Country of Residence.');
        return;
      }
      if (!nationality.trim()) {
        setErrorBanner('Please select your Nationality.');
        return;
      }

      const emailAvailable = await checkEmailAvailability(email);
      if (!emailAvailable) {
        setErrorBanner(
          'This email address is already registered on EveryKR. Duplicate registrations are not permitted.'
        );
        return;
      }

      if (!agencyEmailInitialized && accountType === 'agent') {
        setBusinessEmail(email.trim().toLowerCase());
        setContactPerson(fullName.trim());
        setAgencyPhone(`${countryCode} ${phoneNumber.trim()}`);
        setAgencyCountry(countryOfResidence);
      }

      setStep(3);
      return;
    }

    if (step === 3) {
      if (!dateOfBirth) {
        setErrorBanner('Please provide your Date of Birth.');
        return;
      }
      if (passportRequiredForService) {
        if (!passportNumber.trim() || passportNumber.trim().length < 5) {
          setErrorBanner(
            'Please enter a valid Passport Number or uncheck the passport verification option.'
          );
          return;
        }
        if (!passportStepConsent) {
          setErrorBanner(
            'Explicit consent is required to collect and encrypt your passport number.'
          );
          return;
        }
        setPassportInfoConsent(true);
      }
      setStep(4);
      return;
    }

    if (step === 4) {
      if (accountType === 'student') {
        if (!desiredStudyLevel || !preferredIntake) {
          setErrorBanner('Please select your Desired Study Level and Preferred Intake in Korea.');
          return;
        }
      } else if (accountType === 'agent') {
        if (!agencyName.trim() || !contactPerson.trim() || !businessEmail.trim() || !agencyCity.trim()) {
          setErrorBanner(
            'Agency Name, Contact Person, Business Email, and City are required for Education Agent / Partner accounts.'
          );
          return;
        }
      }
      setStep(5);
      setOtpSubStep('consent_review');
      return;
    }
  };

  const agencyEmailInitialized = Boolean(businessEmail);

  // Add / Remove / Update Multiple Education Records for Students
  const addEducationRecordRow = () => {
    setEducationRecords(prev => [
      ...prev,
      {
        id: `edu_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        level: 'Secondary School / SSC / O-Level',
        institution: '',
        boardOrUniversity: '',
        passingYear: '',
        gpaOrGrade: '',
        majorOrGroup: ''
      }
    ]);
  };

  const updateEducationRecordRow = (id: string, field: keyof EducationRecord, value: string) => {
    setEducationRecords(prev =>
      prev.map(rec => (rec.id === id ? { ...rec, [field]: value } : rec))
    );
  };

  const removeEducationRecordRow = (id: string) => {
    setEducationRecords(prev => (prev.length > 1 ? prev.filter(rec => rec.id !== id) : prev));
  };

  const toggleInterest = (interest: string) => {
    setSelectedInterests(prev =>
      prev.includes(interest) ? prev.filter(i => i !== interest) : [...prev, interest]
    );
  };

  const getResolvedRegistrantName = (fallbackServerName?: string): string => {
    const candidates = [
      fullName,
      contactPerson,
      fallbackServerName
    ];
    for (const c of candidates) {
      if (typeof c === 'string' && c.trim().length > 0) {
        return c.trim();
      }
    }
    const cleanEmail = email.trim().toLowerCase();
    if (cleanEmail.includes('@')) {
      const derived = cleanEmail
        .split('@')[0]
        .replace(/[._-]+/g, ' ')
        .replace(/\b\w/g, ch => ch.toUpperCase())
        .trim();
      if (derived) return derived;
    }
    return 'EveryKR Student';
  };

  // Build Complete Registration Profile Payload (Sanitized with safe fallbacks so no undefined fields are sent to Firestore)
  const buildRegistrationPayload = (fallbackServerName?: string) => {
    const nowIso = new Date().toISOString();
    const resolvedName = getResolvedRegistrantName(fallbackServerName);
    const cleanedEduRecords =
      accountType === 'student'
        ? educationRecords
            .filter(r => r.institution.trim() || r.passingYear.trim() || r.gpaOrGrade.trim())
            .map(r => ({
              id: r.id,
              level: r.level || 'Secondary School / SSC / O-Level',
              institution: r.institution.trim(),
              boardOrUniversity: (r.boardOrUniversity || '').trim(),
              passingYear: r.passingYear.trim(),
              gpaOrGrade: r.gpaOrGrade.trim(),
              majorOrGroup: (r.majorOrGroup || '').trim()
            }))
        : [];

    const maskedPassport =
      passportRequiredForService && passportNumber.trim()
        ? `${'*'.repeat(Math.max(4, passportNumber.trim().length - 3))}${passportNumber
            .trim()
            .slice(-3)
            .toUpperCase()}`
        : '';

    const normalizedEmail = email.trim().toLowerCase();
    const targetUid = deriveUniqueUidFromEmail(normalizedEmail);
    const registrationId = generateRegistrationId(targetUid, accountType, nowIso);

    const payload: Record<string, any> = {
      registrationId,
      fullName: resolvedName,
      name: resolvedName,
      email: normalizedEmail,
      role: accountType,
      accountType,
      phoneNumber: `${countryCode} ${phoneNumber.trim()}`.trim(),
      countryCode: countryCode || '+82',
      countryOfResidence: countryOfResidence || 'South Korea',
      nationality: nationality || countryOfResidence || 'International',
      currentCity: currentCity.trim() || 'Seoul',
      city: currentCity.trim() || 'Seoul',
      dateOfBirth: dateOfBirth || '',
      gender: gender || 'Prefer not to say',
      passportDetails: passportRequiredForService
        ? {
            hasPassportSaved: Boolean(passportNumber.trim() && passportInfoConsent),
            requiredForService: true,
            passportNumberMasked: maskedPassport,
            passportIssueDate: passportIssueDate || '',
            passportExpiryDate: passportExpiryDate || '',
            consentGiven: Boolean(passportInfoConsent),
            consentedAt: nowIso
          }
        : {
            hasPassportSaved: false,
            requiredForService: false,
            consentGiven: false
          },
      educationRecords: cleanedEduRecords,
      preferredLanguage: preferredLanguage || 'en',
      privacyConsent: {
        privacyPolicyAccepted: Boolean(privacyPolicyAccepted),
        termsAccepted: Boolean(termsAccepted),
        personalInfoConsent: Boolean(personalInfoConsent),
        passportInfoConsent: Boolean(passportRequiredForService && passportInfoConsent),
        consentedAt: nowIso
      }
    };

    if (passportRequiredForService && passportInfoConsent && passportNumber.trim()) {
      payload.rawPassportNumber = passportNumber.trim();
    }

    if (accountType === 'student') {
      const resolvedProgram = currentMajor.trim() || desiredStudyLevel || '';
      payload.studentAcademicProfile = {
        currentEducationLevel: currentEducationLevel || '',
        lastCompletedEducation: lastCompletedEducation || '',
        sscPassingYear: sscPassingYear.trim() || '',
        sscGpa: sscGpa.trim() || '',
        hscPassingYear: hscPassingYear.trim() || '',
        hscGpa: hscGpa.trim() || '',
        diplomaPassingYear: diplomaPassingYear.trim() || '',
        bachelorPassingYear: bachelorPassingYear.trim() || '',
        currentUniversity: currentUniversity.trim() || '',
        currentMajor: resolvedProgram,
        interestedProgram: resolvedProgram,
        desiredStudyLevel: desiredStudyLevel || '',
        preferredIntake: preferredIntake || '',
        preferredUniversity: preferredUniversity || '',
        koreanLanguageLevel: koreanLanguageLevel || 'None',
        englishScore: englishScore.trim() || '',
        studyGap: studyGap.trim() || 'None'
      };
      payload.preferredStudyLevel = desiredStudyLevel || '';
      payload.preferredIntake = preferredIntake || '';
      payload.preferredUniversity = preferredUniversity || '';
      payload.interestedProgram = resolvedProgram;
      payload.university = (currentUniversity.trim() || preferredUniversity || '').trim();
      payload.major = resolvedProgram;
      payload.studyLevel = desiredStudyLevel || '';
    } else if (accountType === 'general') {
      payload.generalUserProfile = {
        currentCountry: countryOfResidence || '',
        currentCity: currentCity.trim() || 'Seoul',
        nationality: nationality || '',
        interests: Array.isArray(selectedInterests) ? selectedInterests : [],
        preferredLanguage: preferredLanguage || 'en'
      };
    } else if (accountType === 'agent') {
      payload.agentPartnerProfile = {
        agencyName: agencyName.trim() || '',
        contactPerson: contactPerson.trim() || resolvedName,
        country: agencyCountry || countryOfResidence || '',
        city: agencyCity.trim() || currentCity.trim() || '',
        businessEmail: businessEmail.trim().toLowerCase() || email.trim().toLowerCase(),
        phoneNumber: agencyPhone.trim() || `${countryCode} ${phoneNumber.trim()}`.trim(),
        website: agencyWebsite.trim() || '',
        yearsOfExperience: yearsOfExperience.trim() || '',
        approvalStatus: 'pending_approval' as const
      };
    }

    return payload;
  };

  // Request or Resend 6-Digit Email OTP
  const handleRequestOtp = async (isResend: boolean = false) => {
    if (isSubmitting || isResendingOtp) return;
    setErrorBanner(null);

    if (!privacyPolicyAccepted || !termsAccepted || !personalInfoConsent) {
      setErrorBanner(
        'Please accept the Privacy Policy, Terms & Conditions, and Personal Information Collection Consent before continuing.'
      );
      return;
    }

    if (passportRequiredForService && !passportInfoConsent) {
      setErrorBanner(
        'Please check the separate Sensitive Passport Information Consent box or disable passport collection in Step 3.'
      );
      return;
    }

    if (!recaptchaToken) {
      const msg = t('recaptcha_required_error');
      setRecaptchaError(msg);
      setErrorBanner(msg);
      return;
    }

    setRecaptchaError(null);
    if (isResend) {
      setIsResendingOtp(true);
    } else {
      setIsSubmitting(true);
    }

    try {
      const trimmedEmail = email.trim().toLowerCase();
      const trimmedName = getResolvedRegistrantName();

      const res = await fetch('/api/auth/otp/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: trimmedName,
          email: trimmedEmail,
          password,
          role: accountType,
          accountType,
          isResend,
          honeypot,
          recaptchaToken
        })
      });

      const data = await res.json().catch(() => ({
        ok: false,
        status: 'server_error',
        message: 'Could not reach EveryKR verification server.'
      }));

      if (!res.ok || !data.ok) {
        if (data.resendCooldownSeconds) {
          setResendCooldown(data.resendCooldownSeconds);
        }
        setErrorBanner(data.message || 'Unable to send verification code.');
        return;
      }

      const nowIso = new Date().toISOString();
      const expIso = new Date(Date.now() + (data.expiresInSeconds || 300) * 1000).toISOString();
      const targetUid = deriveUniqueUidFromEmail(trimmedEmail);

      syncOtpVerificationMetadataDoc({
        id: `otp_${targetUid}`,
        uid: targetUid,
        email: trimmedEmail,
        fullName: trimmedName,
        role: accountType,
        accountType,
        status: 'pending_otp',
        emailVerified: false,
        attemptsUsed: 0,
        maxAttempts: 5,
        requestedAt: nowIso,
        expiresAt: expIso
      }).catch(() => {});

      setOtpSubStep('otp_verify');
      setOtpDigits(['', '', '', '', '', '']);
      setResendCooldown(data.resendCooldownSeconds || 60);
      setOtpExpirySeconds(data.expiresInSeconds || 300);
      setAttemptsRemaining(5);
      setOtpStatusBanner(
        isResend
          ? `A new 6-digit verification code was sent to ${trimmedEmail}. Previous codes have been invalidated.`
          : `We sent a 6-digit verification code to ${trimmedEmail} from EveryKR <newsletter@everykr.com>.`
      );
      showToast(`6-digit verification code sent to ${trimmedEmail}`);

      setTimeout(() => {
        otpInputRefs.current[0]?.focus();
      }, 80);
    } catch (err: any) {
      setErrorBanner(err?.message || 'Network error while requesting verification code.');
    } finally {
      setIsSubmitting(false);
      setIsResendingOtp(false);
      setRecaptchaToken('');
      setRecaptchaResetSignal((prev) => prev + 1);
    }
  };

  // OTP Digit Input Handlers
  const handleOtpDigitChange = (index: number, rawValue: string) => {
    const digitsOnly = rawValue.replace(/\D/g, '');
    if (!digitsOnly) {
      const updated = [...otpDigits];
      updated[index] = '';
      setOtpDigits(updated);
      return;
    }

    if (digitsOnly.length > 1) {
      const chars = digitsOnly.slice(0, 6).split('');
      const updated = [...otpDigits];
      for (let i = 0; i < 6; i++) {
        if (index + i < 6 && chars[i]) {
          updated[index + i] = chars[i];
        }
      }
      setOtpDigits(updated);
      const nextFocusIndex = Math.min(5, index + chars.length);
      otpInputRefs.current[nextFocusIndex]?.focus();
      return;
    }

    const updated = [...otpDigits];
    updated[index] = digitsOnly;
    setOtpDigits(updated);
    if (index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    const nextDigits = ['', '', '', '', '', ''];
    for (let i = 0; i < pasted.length; i++) {
      nextDigits[i] = pasted[i];
    }
    setOtpDigits(nextDigits);
    const focusIdx = Math.min(5, pasted.length);
    otpInputRefs.current[focusIdx]?.focus();
  };

  // Verify 6-digit OTP and Complete Account Creation
  const handleVerifyOtpAndComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    const enteredOtp = otpDigits.join('');
    if (enteredOtp.length !== 6) {
      setErrorBanner('Please enter all 6 digits of your verification code.');
      return;
    }

    setIsSubmitting(true);
    setErrorBanner(null);

    try {
      const normalizedTargetEmail = email.trim().toLowerCase();
      const targetUid = deriveUniqueUidFromEmail(normalizedTargetEmail);
      const initialResolvedName = getResolvedRegistrantName();

      const verifyRes = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: normalizedTargetEmail,
          otp: enteredOtp
        })
      });

      const verifyData = await verifyRes.json().catch(() => ({
        ok: false,
        status: 'server_error',
        message: 'Could not verify code.'
      }));

      if (!verifyRes.ok || !verifyData.ok || !verifyData.verificationProofToken) {
        if (typeof verifyData.attemptsRemaining === 'number') {
          setAttemptsRemaining(verifyData.attemptsRemaining);
          syncOtpVerificationMetadataDoc({
            id: `otp_${targetUid}`,
            uid: targetUid,
            email: normalizedTargetEmail,
            fullName: initialResolvedName,
            role: accountType,
            accountType,
            status: verifyData.attemptsRemaining === 0 ? 'locked' : 'pending_otp',
            emailVerified: false,
            attemptsUsed: 5 - verifyData.attemptsRemaining,
            maxAttempts: 5,
            requestedAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + otpExpirySeconds * 1000).toISOString()
          }).catch(() => {});
        }
        setErrorBanner(verifyData.message || 'Invalid or expired verification code.');
        return;
      }

      const finalResolvedName = getResolvedRegistrantName(verifyData.verifiedUser?.name);

      syncOtpVerificationMetadataDoc({
        id: `otp_${targetUid}`,
        uid: targetUid,
        email: normalizedTargetEmail,
        fullName: finalResolvedName,
        role: accountType,
        accountType,
        status: 'verified',
        emailVerified: true,
        attemptsUsed: 5 - attemptsRemaining,
        maxAttempts: 5,
        requestedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + otpExpirySeconds * 1000).toISOString(),
        verifiedAt: verifyData.verifiedUser?.verifiedAt || new Date().toISOString()
      }).catch(() => {});

      const fullPayload = buildRegistrationPayload(finalResolvedName);

      await login(
        normalizedTargetEmail,
        accountType,
        finalResolvedName,
        true,
        password,
        verifyData.verificationProofToken,
        fullPayload
      );

      try {
        sessionStorage.removeItem(DRAFT_STORAGE_KEY);
      } catch {
        // ignore
      }

      setPassword('');
      setConfirmPassword('');
      setPassportNumber('');
      setOtpDigits(['', '', '', '', '', '']);

      onSuccessClose?.();
      navigate(postRegistrationTarget);
    } catch (err: any) {
      setErrorBanner(err?.message || 'Could not complete account registration.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Google Sign-In with selected Account Type (Does NOT require another Email OTP)
  const handleGoogleRegistration = async (useRedirect: boolean = false) => {
    setErrorBanner(null);
    setIsGoogleLoading(true);
    try {
      await loginWithGoogle(useRedirect, accountType);
      onSuccessClose?.();
      navigate(postRegistrationTarget);
    } catch (err: any) {
      setErrorBanner(err?.message || 'Google Sign-In could not be completed. Please try again.');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const formatCountdown = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const stepsMeta = [
    { num: 1, title: 'Account Type' },
    { num: 2, title: 'Account Info' },
    { num: 3, title: 'Personal & Passport' },
    {
      num: 4,
      title:
        accountType === 'student'
          ? 'Academic Profile'
          : accountType === 'agent'
          ? 'Agency Details'
          : 'Preferences'
    },
    { num: 5, title: 'Consent & OTP' }
  ];

  const primaryAccountTypes: Array<{
    id: AccountType;
    title: string;
    subtitle: string;
    badge: string;
    icon: React.ReactNode;
  }> = [
    {
      id: 'student',
      title: 'Student',
      subtitle:
        'Applying to or studying at a Korean university (Language, Bachelor, Master, PhD, GKS Scholarship, D-2/D-4 Visa).',
      badge: 'Most Popular',
      icon: <GraduationCap className="w-5 h-5 text-[#1769AA] dark:text-[#19B6A4]" />
    },
    {
      id: 'general',
      title: 'General User',
      subtitle:
        'Exploring life in South Korea, Korean language, jobs, housing, community discussions, and cultural events.',
      badge: 'Fast Setup',
      icon: <User className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
    },
    {
      id: 'agent',
      title: 'Education Agent / Partner',
      subtitle:
        'Official student recruitment agency or institutional partner assisting students with Korean university admissions.',
      badge: 'Admin Approval',
      icon: <Building2 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
    }
  ];

  const secondaryPartnerTypes: Array<{
    id: AccountType;
    label: string;
    icon: React.ReactNode;
  }> = [
    { id: 'employer', label: 'Korean Employer', icon: <Briefcase className="w-3.5 h-3.5" /> },
    { id: 'landlord', label: 'Housing Provider', icon: <Home className="w-3.5 h-3.5" /> },
    { id: 'university', label: 'University OIA', icon: <GraduationCap className="w-3.5 h-3.5" /> }
  ];

  return (
    <div className="w-full">
      {/* Progress Indicator Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between gap-1 sm:gap-2">
          {stepsMeta.map((s, idx) => {
            const isCompleted = step > s.num;
            const isCurrent = step === s.num;
            return (
              <React.Fragment key={s.num}>
                <button
                  type="button"
                  onClick={() => {
                    if (s.num < step) {
                      setErrorBanner(null);
                      setStep(s.num as 1 | 2 | 3 | 4 | 5);
                    }
                  }}
                  disabled={s.num > step}
                  className={`flex items-center gap-1.5 sm:gap-2 text-left transition-colors ${
                    s.num < step ? 'cursor-pointer' : 'cursor-default'
                  }`}
                >
                  <div
                    className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-extrabold shrink-0 transition-all ${
                      isCompleted
                        ? 'bg-emerald-600 text-white'
                        : isCurrent
                        ? 'bg-[#10243A] dark:bg-[#19B6A4] text-white dark:text-[#10243A] ring-4 ring-blue-100 dark:ring-teal-950'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {isCompleted ? <Check className="w-3.5 h-3.5" /> : s.num}
                  </div>
                  <div className="hidden sm:block">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Step {s.num}
                    </div>
                    <div
                      className={`text-xs font-bold leading-tight ${
                        isCurrent
                          ? 'text-[#10243A] dark:text-white'
                          : isCompleted
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : 'text-slate-400 dark:text-slate-500'
                      }`}
                    >
                      {s.title}
                    </div>
                  </div>
                </button>
                {idx < stepsMeta.length - 1 && (
                  <div
                    className={`flex-1 h-1 rounded-full ${
                      step > s.num
                        ? 'bg-emerald-500'
                        : 'bg-slate-200 dark:bg-slate-800'
                    }`}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
        <div className="sm:hidden mt-2 flex items-center justify-between text-xs font-bold text-[#10243A] dark:text-white">
          <span>
            Step {step} of 5: {stepsMeta[step - 1].title}
          </span>
          <span className="text-[#1769AA] dark:text-[#19B6A4] uppercase text-[11px]">
            {accountType}
          </span>
        </div>
      </div>

      {/* Error Alert Banner */}
      {errorBanner && (
        <div className="mb-5 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200 text-xs flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1 leading-relaxed">{errorBanner}</div>
          <button
            type="button"
            onClick={() => setErrorBanner(null)}
            className="text-rose-500 hover:text-rose-800 font-bold text-[11px] cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ================================================================= */}
      {/* STEP 1: ACCOUNT TYPE SELECTION & GOOGLE QUICK SIGN-IN             */}
      {/* ================================================================= */}
      {step === 1 && (
        <div className="space-y-5">
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-[#10243A] dark:text-white">
              1. Select Your EveryKR Account Type
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              We tailor your registration fields and dashboard tools based on your selected account type.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {primaryAccountTypes.map(item => {
              const selected = accountType === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setAccountType(item.id)}
                  className={`w-full p-4 rounded-2xl border-2 text-left transition-all cursor-pointer flex items-start gap-3.5 ${
                    selected
                      ? 'border-[#1769AA] dark:border-[#19B6A4] bg-blue-50/60 dark:bg-slate-800/90 shadow-xs'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shrink-0">
                    {item.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-extrabold text-[#10243A] dark:text-white">
                        {item.title}
                      </span>
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                          selected
                            ? 'bg-[#10243A] text-[#19B6A4]'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {item.badge}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                      {item.subtitle}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Secondary Directory Partner Roles */}
          <div className="pt-1">
            <span className="block text-[11px] font-semibold text-slate-400 dark:text-slate-500 mb-2">
              Korean Service &amp; Institutional Roles:
            </span>
            <div className="grid grid-cols-3 gap-2">
              {secondaryPartnerTypes.map(sp => (
                <button
                  key={sp.id}
                  type="button"
                  onClick={() => setAccountType(sp.id)}
                  className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl border text-[11px] font-bold cursor-pointer transition-colors ${
                    accountType === sp.id
                      ? 'border-[#1769AA] bg-blue-50 text-[#10243A] dark:bg-blue-950/60 dark:text-white'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
                  }`}
                >
                  {sp.icon}
                  <span className="truncate">{sp.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Fast Google OAuth Registration Option */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2.5">
            <button
              type="button"
              onClick={handleNextStep}
              className="w-full py-3 px-4 rounded-xl bg-[#10243A] hover:bg-[#1769AA] dark:bg-[#19B6A4] dark:text-[#10243A] text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs"
            >
              <span>Continue Registration as {accountType.toUpperCase()}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 py-1">
              <div className="flex-1 border-t border-slate-200 dark:border-slate-800" />
              <span className="text-[11px] text-slate-400 font-medium">or instant Google registration</span>
              <div className="flex-1 border-t border-slate-200 dark:border-slate-800" />
            </div>

            <button
              type="button"
              onClick={() => handleGoogleRegistration(false)}
              disabled={isGoogleLoading}
              className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-800 dark:text-slate-100 rounded-xl text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
            >
              {isGoogleLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-[#1769AA]" />
                  <span>Connecting Google Account...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  <span>Continue with Google ({accountType.toUpperCase()})</span>
                </>
              )}
            </button>

            {isMobileBrowser && (
              <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
                <span>On mobile browser?</span>
                <button
                  type="button"
                  onClick={() => handleGoogleRegistration(true)}
                  className="text-[#1769AA] dark:text-[#19B6A4] font-bold hover:underline cursor-pointer"
                >
                  Use Google Redirect Mode
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* STEP 2: MANDATORY ACCOUNT INFORMATION                             */}
      {/* ================================================================= */}
      {step === 2 && (
        <form
          id="everykr-register-step2-form"
          name="everykr-register"
          action="https://everykr.com/register"
          method="post"
          onSubmit={e => {
            e.preventDefault();
            handleNextStep();
          }}
          className="space-y-4"
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-[#10243A] dark:text-white">
                2. Mandatory Account Information
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Enter your official name, email address, international phone number, and country details.
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-slate-800 text-[#1769AA] dark:text-[#19B6A4] text-[11px] font-extrabold uppercase">
              {accountType}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Full Name */}
            <div className="sm:col-span-2">
              <label htmlFor="everykr-register-name" className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                Full Name (as shown on official ID / Passport) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="everykr-register-name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="e.g. Tariqul Islam / Elena Rostova"
                  className="w-full pl-9 pr-3 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-[#1769AA]"
                  required
                />
              </div>
            </div>

            {/* Email Address */}
            <div className="sm:col-span-2">
              <label htmlFor="everykr-register-email" className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                Email Address (for 6-digit OTP verification) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="everykr-register-email"
                  name="username"
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={e => {
                    setEmail(e.target.value);
                    setEmailDuplicateError(null);
                  }}
                  onBlur={() => {
                    if (isValidEmail(email)) {
                      checkEmailAvailability(email);
                    }
                  }}
                  placeholder="name@university.ac.kr or personal email"
                  className={`w-full pl-9 pr-3 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border rounded-xl text-slate-900 dark:text-white focus:outline-none ${
                    emailDuplicateError
                      ? 'border-rose-500 focus:border-rose-600'
                      : 'border-slate-300 dark:border-slate-700 focus:border-[#1769AA]'
                  }`}
                  required
                />
              </div>
              {isCheckingEmail && (
                <span className="text-[11px] text-slate-400 mt-1 inline-flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" /> Checking email availability...
                </span>
              )}
              {emailDuplicateError && (
                <p className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold mt-1">
                  {emailDuplicateError}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="everykr-register-password" className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                Password <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="everykr-register-password"
                  name="new-password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Min. 8 chars (letters + numbers)"
                  className="w-full pl-9 pr-3 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-[#1769AA]"
                  required
                />
              </div>
              <div className="mt-1.5 flex flex-wrap gap-x-2.5 gap-y-0.5 text-[10px]">
                <span className={`inline-flex items-center gap-1 ${hasMinLength ? 'text-emerald-600 font-bold' : 'text-slate-400'}`}>
                  {hasMinLength ? <Check className="w-3 h-3" /> : <Circle className="w-2.5 h-2.5" />}
                  <span>8+ chars</span>
                </span>
                <span className={`inline-flex items-center gap-1 ${hasLetter ? 'text-emerald-600 font-bold' : 'text-slate-400'}`}>
                  {hasLetter ? <Check className="w-3 h-3" /> : <Circle className="w-2.5 h-2.5" />}
                  <span>Letter</span>
                </span>
                <span className={`inline-flex items-center gap-1 ${hasNumberOrSymbol ? 'text-emerald-600 font-bold' : 'text-slate-400'}`}>
                  {hasNumberOrSymbol ? <Check className="w-3 h-3" /> : <Circle className="w-2.5 h-2.5" />}
                  <span>Number/Symbol</span>
                </span>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="everykr-register-confirm-password" className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                Confirm Password <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="everykr-register-confirm-password"
                  name="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your password"
                  className="w-full pl-9 pr-3 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-[#1769AA]"
                  required
                />
              </div>
              {confirmPassword.length > 0 && (
                <span
                  className={`text-[10px] mt-1 inline-flex items-center gap-1 font-bold ${
                    doPasswordsMatch ? 'text-emerald-600' : 'text-rose-500'
                  }`}
                >
                  {doPasswordsMatch ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                  <span>{doPasswordsMatch ? 'Passwords match' : 'Passwords do not match'}</span>
                </span>
              )}
            </div>

            {/* International Phone Number with Country Code Selector */}
            <div className="sm:col-span-2">
              <label htmlFor="everykr-register-phone" className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                International Phone Number (with Country Code) <span className="text-rose-500">*</span>
              </label>
              <div className="flex gap-2">
                <select
                  value={countryCode}
                  onChange={e => setCountryCode(e.target.value)}
                  aria-label="Country Dial Code"
                  className="w-36 sm:w-44 px-2.5 py-2.5 text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-[#1769AA]"
                >
                  {COUNTRIES_DATA.map(c => (
                    <option key={`${c.code}-${c.dialCode}`} value={c.dialCode}>
                      {c.flag} {c.dialCode} ({c.code})
                    </option>
                  ))}
                </select>
                <div className="relative flex-1">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="everykr-register-phone"
                    name="tel"
                    type="tel"
                    autoComplete="tel"
                    value={phoneNumber}
                    onChange={e => setPhoneNumber(e.target.value)}
                    placeholder="10-1234-5678 or mobile number"
                    className="w-full pl-9 pr-3 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-[#1769AA]"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Country of Residence (Searchable Dropdown with Flags) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                Country of Residence <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={residenceSearch}
                onChange={e => setResidenceSearch(e.target.value)}
                placeholder="Filter country list..."
                className="w-full px-3 py-1.5 mb-1.5 text-[11px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300"
              />
              <select
                value={countryOfResidence}
                onChange={e => setCountryOfResidence(e.target.value)}
                aria-label="Country of Residence"
                className="w-full px-3 py-2.5 text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-[#1769AA]"
              >
                {filteredResidenceCountries.map(c => (
                  <option key={c.code} value={c.name}>
                    {c.flag} {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Nationality (Searchable Dropdown with Flags) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                Nationality <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={nationalitySearch}
                onChange={e => setNationalitySearch(e.target.value)}
                placeholder="Filter nationality list..."
                className="w-full px-3 py-1.5 mb-1.5 text-[11px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300"
              />
              <select
                value={nationality}
                onChange={e => setNationality(e.target.value)}
                aria-label="Nationality"
                className="w-full px-3 py-2.5 text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-[#1769AA]"
              >
                {filteredNationalityCountries.map(c => (
                  <option key={c.code} value={c.name}>
                    {c.flag} {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
            <button
              type="submit"
              disabled={isCheckingEmail}
              className="px-6 py-2.5 rounded-xl bg-[#10243A] hover:bg-[#1769AA] dark:bg-[#19B6A4] dark:text-[#10243A] text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <span>Next: Personal Info</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      )}

      {/* ================================================================= */}
      {/* STEP 3: PERSONAL INFORMATION & CONDITIONAL PASSPORT COLLECTION    */}
      {/* ================================================================= */}
      {step === 3 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-[#10243A] dark:text-white">
              3. Personal Information &amp; Identity Protection
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Provide your personal details. Passport collection is optional and strictly encrypted unless required for visa/admission verification.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                Date of Birth <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="date"
                  value={dateOfBirth}
                  onChange={e => setDateOfBirth(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-[#1769AA]"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                Gender (Optional)
              </label>
              <select
                value={gender}
                onChange={e => setGender(e.target.value)}
                className="w-full px-3 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-[#1769AA]"
              >
                <option value="">Prefer not to say / Optional</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Non-binary / Other">Non-binary / Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                Current Country
              </label>
              <input
                type="text"
                value={countryOfResidence}
                disabled
                className="w-full px-3 py-2.5 text-xs bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-400"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                Current City (Optional)
              </label>
              <input
                type="text"
                value={currentCity}
                onChange={e => setCurrentCity(e.target.value)}
                placeholder="e.g. Seoul, Busan, Dhaka, Kathmandu"
                className="w-full px-3 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-[#1769AA]"
              />
            </div>
          </div>

          {/* Conditional Sensitive Passport Section */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 space-y-3">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={passportRequiredForService}
                onChange={e => {
                  setPassportRequiredForService(e.target.checked);
                  if (!e.target.checked) {
                    setPassportNumber('');
                    setPassportIssueDate('');
                    setPassportExpiryDate('');
                    setPassportStepConsent(false);
                    setPassportInfoConsent(false);
                  }
                }}
                className="mt-0.5 rounded border-slate-300 text-[#1769AA] focus:ring-[#1769AA]"
              />
              <div>
                <span className="text-xs font-bold text-[#10243A] dark:text-white block">
                  Include Passport Verification for D-2 / D-4 Visa &amp; University Admission Assistance (Optional)
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed block mt-0.5">
                  Only enable this if you require official admission COA or visa document verification. Passport numbers are encrypted with AES-256-GCM and never shown in public profiles or ordinary dashboard views.
                </span>
              </div>
            </label>

            {passportRequiredForService && (
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-3">
                <div className="p-3 rounded-xl bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-[11px] text-amber-950 dark:text-amber-200 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>Sensitive Personal Information Protection Notice (PIPA Korea Compliant)</span>
                  </div>
                  <p className="leading-relaxed">
                    • <strong>Purpose:</strong> Verification of identity for Korean university admission applications and D-2/D-4 student visa issuance.<br />
                    • <strong>Access Control:</strong> Encrypted at rest; masked as <code className="font-mono">******123</code> by default. Only you and authorized EveryKR compliance officers (with mandatory audit logging) can access it.<br />
                    • <strong>Retention &amp; Deletion:</strong> Retained only while your admission/visa service is active. You can permanently purge your passport data at any time from your User Dashboard.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Passport Number <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={passportNumber}
                      onChange={e => setPassportNumber(e.target.value.toUpperCase())}
                      placeholder="e.g. A12345678"
                      className="w-full px-3 py-2 text-xs font-mono bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Issue Date (Optional)
                    </label>
                    <input
                      type="date"
                      value={passportIssueDate}
                      onChange={e => setPassportIssueDate(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Expiry Date (Optional)
                    </label>
                    <input
                      type="date"
                      value={passportExpiryDate}
                      onChange={e => setPassportExpiryDate(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <label className="flex items-start gap-2 pt-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={passportStepConsent}
                    onChange={e => {
                      setPassportStepConsent(e.target.checked);
                      setPassportInfoConsent(e.target.checked);
                    }}
                    className="mt-0.5 rounded border-slate-300 text-[#1769AA]"
                  />
                  <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                    I explicitly consent to the encrypted collection and restricted storage of my passport information for visa/admission verification.
                  </span>
                </label>
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
            <button
              type="button"
              onClick={handleNextStep}
              className="px-6 py-2.5 rounded-xl bg-[#10243A] hover:bg-[#1769AA] dark:bg-[#19B6A4] dark:text-[#10243A] text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <span>
                Next:{' '}
                {accountType === 'student'
                  ? 'Student Education Profile'
                  : accountType === 'agent'
                  ? 'Agency Partner Details'
                  : 'User Preferences'}
              </span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* STEP 4: ACCOUNT-TYPE SPECIFIC INFORMATION                         */}
      {/* ================================================================= */}
      {step === 4 && (
        <div className="space-y-5">
          {accountType === 'student' ? (
            /* ------------------------------------------------------------- */
            /* 4A. STUDENT EDUCATION INFORMATION                             */
            /* ------------------------------------------------------------- */
            <div className="space-y-4">
              <div>
                <h2 className="text-base sm:text-lg font-extrabold text-[#10243A] dark:text-white">
                  4. Student Academic &amp; Korean Admission Profile
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Provide your academic background and target study program in South Korea. You can also add multiple education records below.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                    Current Education Level
                  </label>
                  <select
                    value={currentEducationLevel}
                    onChange={e => setCurrentEducationLevel(e.target.value)}
                    className="w-full px-3 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  >
                    {EDUCATION_LEVEL_OPTIONS.map(opt => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                    Last Completed Education
                  </label>
                  <select
                    value={lastCompletedEducation}
                    onChange={e => setLastCompletedEducation(e.target.value)}
                    className="w-full px-3 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  >
                    {EDUCATION_LEVEL_OPTIONS.map(opt => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                    SSC / O-Level Passing Year
                  </label>
                  <input
                    type="text"
                    value={sscPassingYear}
                    onChange={e => setSscPassingYear(e.target.value)}
                    placeholder="e.g. 2020"
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                    SSC / O-Level GPA / Grade
                  </label>
                  <input
                    type="text"
                    value={sscGpa}
                    onChange={e => setSscGpa(e.target.value)}
                    placeholder="e.g. 5.00 / 5.00 or 92%"
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                    HSC / A-Level Passing Year
                  </label>
                  <input
                    type="text"
                    value={hscPassingYear}
                    onChange={e => setHscPassingYear(e.target.value)}
                    placeholder="e.g. 2022"
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                    HSC / A-Level GPA / Grade
                  </label>
                  <input
                    type="text"
                    value={hscGpa}
                    onChange={e => setHscGpa(e.target.value)}
                    placeholder="e.g. 4.85 / 5.00"
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                    Diploma Passing Year (Optional)
                  </label>
                  <input
                    type="text"
                    value={diplomaPassingYear}
                    onChange={e => setDiplomaPassingYear(e.target.value)}
                    placeholder="Optional"
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                    Bachelor Passing Year (Optional)
                  </label>
                  <input
                    type="text"
                    value={bachelorPassingYear}
                    onChange={e => setBachelorPassingYear(e.target.value)}
                    placeholder="e.g. 2025 (if applying for Master/PhD)"
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                    Current University / College (Optional)
                  </label>
                  <input
                    type="text"
                    value={currentUniversity}
                    onChange={e => setCurrentUniversity(e.target.value)}
                    placeholder="e.g. Dhaka College / Yonsei KLI"
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                    Interested Program / Major in Korea
                  </label>
                  <input
                    type="text"
                    value={currentMajor}
                    onChange={e => setCurrentMajor(e.target.value)}
                    placeholder="e.g. Computer Science, Business Administration, AI, Korean Language"
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  />
                </div>

                {/* Target Study Preferences in South Korea */}
                <div>
                  <label className="block text-xs font-bold text-[#1769AA] dark:text-[#19B6A4] mb-1">
                    Desired Study Level in Korea <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={desiredStudyLevel}
                    onChange={e => setDesiredStudyLevel(e.target.value)}
                    className="w-full px-3 py-2.5 text-xs font-bold bg-blue-50/50 dark:bg-slate-800 border border-[#1769AA]/40 rounded-xl text-slate-900 dark:text-white"
                  >
                    {STUDY_LEVEL_OPTIONS.map(opt => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#1769AA] dark:text-[#19B6A4] mb-1">
                    Preferred Intake <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={preferredIntake}
                    onChange={e => setPreferredIntake(e.target.value)}
                    className="w-full px-3 py-2.5 text-xs font-bold bg-blue-50/50 dark:bg-slate-800 border border-[#1769AA]/40 rounded-xl text-slate-900 dark:text-white"
                  >
                    {INTAKE_OPTIONS.map(opt => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Searchable Korean University Dropdown */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                    Preferred University in South Korea (Search 25 Approved Universities)
                  </label>
                  <input
                    type="text"
                    value={uniSearchQuery}
                    onChange={e => setUniSearchQuery(e.target.value)}
                    placeholder="Type university name or city (e.g. Hanyang, Sejong, Gachon, Dong-A, Busan)..."
                    className="w-full px-3 py-1.5 mb-1.5 text-[11px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300"
                  />
                  <select
                    value={preferredUniversity}
                    onChange={e => setPreferredUniversity(e.target.value)}
                    aria-label="Preferred University in Korea"
                    className="w-full px-3 py-2.5 text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  >
                    {filteredKoreanUniversities.map(u => (
                      <option key={u.id} value={u.name}>
                        {u.name} ({u.city})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                    Korean Language Level (Optional)
                  </label>
                  <select
                    value={koreanLanguageLevel}
                    onChange={e => setKoreanLanguageLevel(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  >
                    {KOREAN_LEVEL_OPTIONS.map(opt => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                    IELTS / TOEFL / English Score (Optional)
                  </label>
                  <input
                    type="text"
                    value={englishScore}
                    onChange={e => setEnglishScore(e.target.value)}
                    placeholder="e.g. IELTS 6.5 / TOEFL 88 / Duolingo 115"
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                    Study Gap Explanation (Optional)
                  </label>
                  <input
                    type="text"
                    value={studyGap}
                    onChange={e => setStudyGap(e.target.value)}
                    placeholder="e.g. No gap / 1 year Korean language preparation"
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Dynamic Multiple Education Records Section */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-extrabold text-[#10243A] dark:text-white">
                      Academic Transcripts &amp; Multiple Education Records ({educationRecords.length})
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Add your schools, colleges, or universities for D-2 admission eligibility matching.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={addEducationRecordRow}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-slate-800 text-[#1769AA] dark:text-[#19B6A4] text-xs font-bold hover:bg-blue-100 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Education Record</span>
                  </button>
                </div>

                <div className="space-y-2.5">
                  {educationRecords.map((rec, idx) => (
                    <div
                      key={rec.id}
                      className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 space-y-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-[#10243A] dark:text-slate-200">
                          Education Record #{idx + 1}
                        </span>
                        {educationRecords.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeEducationRecordRow(rec.id)}
                            className="text-rose-500 hover:text-rose-700 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Remove</span>
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <select
                          value={rec.level}
                          onChange={e => updateEducationRecordRow(rec.id, 'level', e.target.value)}
                          className="px-2.5 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-white"
                        >
                          {EDUCATION_LEVEL_OPTIONS.map(opt => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                        <input
                          type="text"
                          value={rec.institution}
                          onChange={e =>
                            updateEducationRecordRow(rec.id, 'institution', e.target.value)
                          }
                          placeholder="School / College / University Name"
                          className="px-2.5 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-white"
                        />
                        <input
                          type="text"
                          value={rec.boardOrUniversity || ''}
                          onChange={e =>
                            updateEducationRecordRow(rec.id, 'boardOrUniversity', e.target.value)
                          }
                          placeholder="Education Board / Affiliation"
                          className="px-2.5 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-white"
                        />
                        <input
                          type="text"
                          value={rec.passingYear}
                          onChange={e =>
                            updateEducationRecordRow(rec.id, 'passingYear', e.target.value)
                          }
                          placeholder="Passing Year (e.g. 2023)"
                          className="px-2.5 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-white"
                        />
                        <input
                          type="text"
                          value={rec.gpaOrGrade}
                          onChange={e =>
                            updateEducationRecordRow(rec.id, 'gpaOrGrade', e.target.value)
                          }
                          placeholder="GPA / CGPA / Division"
                          className="px-2.5 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-white"
                        />
                        <input
                          type="text"
                          value={rec.majorOrGroup || ''}
                          onChange={e =>
                            updateEducationRecordRow(rec.id, 'majorOrGroup', e.target.value)
                          }
                          placeholder="Group / Major (e.g. Science)"
                          className="px-2.5 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-white"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : accountType === 'agent' ? (
            /* ------------------------------------------------------------- */
            /* 4B. EDUCATION AGENT / PARTNER INFORMATION                     */
            /* ------------------------------------------------------------- */
            <div className="space-y-4">
              <div>
                <h2 className="text-base sm:text-lg font-extrabold text-[#10243A] dark:text-white">
                  4. Education Agent / Partner Organization Profile
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Provide your agency credentials. Agent accounts are created with <code className="font-mono text-amber-600">pending_approval</code> status until verified by an EveryKR administrator.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                    Official Agency / Partner Organization Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={agencyName}
                    onChange={e => setAgencyName(e.target.value)}
                    placeholder="e.g. Global Bridge Study Abroad Ltd."
                    className="w-full px-3 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                    Primary Contact Person <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={contactPerson}
                    onChange={e => setContactPerson(e.target.value)}
                    placeholder="Full name of representative"
                    className="w-full px-3 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                    Official Business Email <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={businessEmail}
                    onChange={e => setBusinessEmail(e.target.value)}
                    placeholder="admissions@youragency.com"
                    className="w-full px-3 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                    Country <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={agencyCountry}
                    onChange={e => setAgencyCountry(e.target.value)}
                    className="w-full px-3 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  >
                    {COUNTRIES_DATA.map(c => (
                      <option key={c.code} value={c.name}>
                        {c.flag} {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                    City <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={agencyCity}
                    onChange={e => setAgencyCity(e.target.value)}
                    placeholder="e.g. Dhaka, Kathmandu, Tashkent, Seoul"
                    className="w-full px-3 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                    Agency Phone Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={agencyPhone}
                    onChange={e => setAgencyPhone(e.target.value)}
                    placeholder="+880 1711-000000"
                    className="w-full px-3 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                    Years of Experience (Optional)
                  </label>
                  <input
                    type="text"
                    value={yearsOfExperience}
                    onChange={e => setYearsOfExperience(e.target.value)}
                    placeholder="e.g. 5+ Years in Korean Admissions"
                    className="w-full px-3 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                    Website URL (Optional)
                  </label>
                  <input
                    type="url"
                    value={agencyWebsite}
                    onChange={e => setAgencyWebsite(e.target.value)}
                    placeholder="https://www.youragency.com"
                    className="w-full px-3 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            </div>
          ) : (
            /* ------------------------------------------------------------- */
            /* 4C. GENERAL USER / PARTNER PREFERENCES                        */
            /* ------------------------------------------------------------- */
            <div className="space-y-4">
              <div>
                <h2 className="text-base sm:text-lg font-extrabold text-[#10243A] dark:text-white">
                  4. General User Preferences &amp; Interests
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Customize your EveryKR experience. Student-specific academic transcripts are not required for General User accounts.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                    Current Country
                  </label>
                  <input
                    type="text"
                    value={countryOfResidence}
                    disabled
                    className="w-full px-3 py-2.5 text-xs bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                    City (Optional)
                  </label>
                  <input
                    type="text"
                    value={currentCity}
                    onChange={e => setCurrentCity(e.target.value)}
                    placeholder="e.g. Seoul, Incheon, Busan"
                    className="w-full px-3 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                    Nationality
                  </label>
                  <input
                    type="text"
                    value={nationality}
                    disabled
                    className="w-full px-3 py-2.5 text-xs bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                    Preferred Portal Language (Optional)
                  </label>
                  <select
                    value={preferredLanguage}
                    onChange={e => setPreferredLanguage(e.target.value as LanguageCode)}
                    className="w-full px-3 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  >
                    <option value="en">English (EN)</option>
                    <option value="ko">한국어 (Korean)</option>
                    <option value="bn">বাংলা (Bengali)</option>
                    <option value="ne">नेपाली (Nepali)</option>
                    <option value="zh">中文 (Chinese)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-2">
                  Topics of Interest in South Korea (Optional)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {GENERAL_USER_INTERESTS.map(interest => {
                    const active = selectedInterests.includes(interest);
                    return (
                      <button
                        key={interest}
                        type="button"
                        onClick={() => toggleInterest(interest)}
                        className={`p-2.5 rounded-xl border text-left text-xs font-semibold flex items-center justify-between cursor-pointer transition-colors ${
                          active
                            ? 'border-[#1769AA] bg-blue-50/80 dark:bg-blue-950/50 text-[#10243A] dark:text-white'
                            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        <span className="truncate pr-2">{interest}</span>
                        {active && <CheckCircle2 className="w-3.5 h-3.5 text-[#1769AA] shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setStep(3)}
              className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
            <button
              type="button"
              onClick={handleNextStep}
              className="px-6 py-2.5 rounded-xl bg-[#10243A] hover:bg-[#1769AA] dark:bg-[#19B6A4] dark:text-[#10243A] text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <span>Next: Privacy Consent &amp; OTP</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* STEP 5: PRIVACY CONSENT & 6-DIGIT EMAIL OTP VERIFICATION          */}
      {/* ================================================================= */}
      {step === 5 && (
        <div className="space-y-5">
          {otpSubStep === 'consent_review' ? (
            <div className="space-y-4">
              <div>
                <h2 className="text-base sm:text-lg font-extrabold text-[#10243A] dark:text-white">
                  5. Privacy Consent &amp; Email OTP Verification
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Review your registration summary, provide explicit consent, and verify your email with a 6-digit OTP code sent via Resend.
                </p>
              </div>

              {/* Registration Summary Card */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 grid grid-cols-2 gap-2.5 text-xs">
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Full Name</span>
                  <span className="font-bold text-[#10243A] dark:text-white">{fullName}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Account Type</span>
                  <span className="font-extrabold uppercase text-[#1769AA] dark:text-[#19B6A4]">
                    {accountType}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Email Address</span>
                  <span className="font-mono text-slate-700 dark:text-slate-200 break-all">{email}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Phone</span>
                  <span className="font-mono text-slate-700 dark:text-slate-200">
                    {countryCode} {phoneNumber}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Residence / Nationality</span>
                  <span className="text-slate-700 dark:text-slate-200">
                    {countryOfResidence} · {nationality}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Passport Storage</span>
                  <span className="text-slate-700 dark:text-slate-200">
                    {passportRequiredForService ? 'Encrypted (AES-256-GCM)' : 'Not Collected'}
                  </span>
                </div>
              </div>

              {/* Mandatory Unchecked-by-Default Privacy & Consent Checkboxes */}
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-[#10243A] dark:text-white flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-[#1769AA]" />
                    <span>Mandatory Privacy &amp; Data Protection Consents</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowPrivacyDisclosureDetails(prev => !prev)}
                    className="text-[11px] font-bold text-[#1769AA] dark:text-[#19B6A4] hover:underline cursor-pointer"
                  >
                    {showPrivacyDisclosureDetails ? 'Hide Policy Details' : 'Read Full Disclosure'}
                  </button>
                </div>

                {showPrivacyDisclosureDetails && (
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-[11px] text-slate-600 dark:text-slate-300 space-y-1.5 leading-relaxed">
                    <p>
                      <strong>1. Purpose of Collection:</strong> EveryKR collects your name, contact details, nationality, and (for students) academic records to provide personalized university admission matching, D-2/D-4 visa checklists, and verified account isolation.
                    </p>
                    <p>
                      <strong>2. Access Control:</strong> Your profile is strictly isolated to your unique Firebase Auth UID (<code className="font-mono">users/&#123;uid&#125;</code>). Ordinary users can never view your personal data. Sensitive passport numbers (if provided) are encrypted at rest and masked by default.
                    </p>
                    <p>
                      <strong>3. Retention Period:</strong> Retained for the duration of your active EveryKR membership or as required by Republic of Korea PIPA regulations.
                    </p>
                    <p>
                      <strong>4. Right to Correction &amp; Deletion:</strong> You may edit your profile, request personal data correction, purge your passport record, or permanently delete your account at any time from your User Dashboard.
                    </p>
                  </div>
                )}

                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={privacyPolicyAccepted}
                    onChange={e => setPrivacyPolicyAccepted(e.target.checked)}
                    className="mt-0.5 rounded border-slate-300 text-[#1769AA]"
                  />
                  <span className="text-xs text-slate-700 dark:text-slate-200">
                    <strong>[Required]</strong> I have read and agree to the EveryKR{' '}
                    <a href="/privacy" target="_blank" rel="noreferrer" className="text-[#1769AA] underline">
                      Privacy Policy
                    </a>
                    .
                  </span>
                </label>

                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={e => setTermsAccepted(e.target.checked)}
                    className="mt-0.5 rounded border-slate-300 text-[#1769AA]"
                  />
                  <span className="text-xs text-slate-700 dark:text-slate-200">
                    <strong>[Required]</strong> I agree to the EveryKR{' '}
                    <a href="/terms" target="_blank" rel="noreferrer" className="text-[#1769AA] underline">
                      Terms and Conditions
                    </a>
                    .
                  </span>
                </label>

                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={personalInfoConsent}
                    onChange={e => setPersonalInfoConsent(e.target.checked)}
                    className="mt-0.5 rounded border-slate-300 text-[#1769AA]"
                  />
                  <span className="text-xs text-slate-700 dark:text-slate-200">
                    <strong>[Required]</strong> I consent to the collection and use of my personal and academic information for EveryKR account creation and student services.
                  </span>
                </label>

                {passportRequiredForService && (
                  <label className="flex items-start gap-2.5 cursor-pointer pt-1 border-t border-slate-100 dark:border-slate-800">
                    <input
                      type="checkbox"
                      checked={passportInfoConsent}
                      onChange={e => setPassportInfoConsent(e.target.checked)}
                      className="mt-0.5 rounded border-slate-300 text-[#1769AA]"
                    />
                    <span className="text-xs text-amber-900 dark:text-amber-300 font-semibold">
                      <strong>[Required for Passport Verification]</strong> I provide separate explicit consent for EveryKR to encrypt and store my passport details solely for visa/admission document verification.
                    </span>
                  </label>
                )}
              </div>

              <input
                type="text"
                name="website_hp"
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
                tabIndex={-1}
                autoComplete="off"
                className="hidden"
                aria-hidden="true"
              />

              <div className="p-4 rounded-2xl bg-white dark:bg-[#10243A] border border-slate-200 dark:border-slate-800">
                <RecaptchaCheckbox
                  idPrefix="everykr-register-otp"
                  onTokenChange={(tok) => {
                    setRecaptchaToken(tok);
                    if (tok) setRecaptchaError(null);
                  }}
                  errorMessage={recaptchaError}
                  resetSignal={recaptchaResetSignal}
                />
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setStep(4)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleRequestOtp(false)}
                  disabled={isSubmitting}
                  className="flex-1 py-3 px-5 rounded-xl bg-[#10243A] hover:bg-[#1769AA] dark:bg-[#19B6A4] dark:text-[#10243A] text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Sending 6-Digit Verification OTP...</span>
                    </>
                  ) : (
                    <>
                      <Mail className="w-4 h-4" />
                      <span>Send 6-Digit OTP to {email.trim()}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            /* ------------------------------------------------------------- */
            /* 5B. 6-DIGIT EMAIL OTP VERIFICATION SCREEN                     */
            /* ------------------------------------------------------------- */
            <form
              id="everykr-register-complete-form"
              name="everykr-register-complete"
              action="/register"
              method="post"
              onSubmit={handleVerifyOtpAndComplete}
              className="space-y-4"
            >
              <input
                type="email"
                name="username"
                autoComplete="username"
                value={email.trim().toLowerCase()}
                readOnly
                tabIndex={-1}
                aria-hidden="true"
                className="sr-only"
              />
              <input
                type="password"
                name="new-password"
                autoComplete="new-password"
                value={password}
                readOnly
                tabIndex={-1}
                aria-hidden="true"
                className="sr-only"
              />
              <div className="p-4 rounded-2xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-[#10243A] dark:text-white flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-[#1769AA] dark:text-[#19B6A4]" />
                    <span>Enter 6-Digit Email Verification Code</span>
                  </span>
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-[#10243A] text-[#19B6A4]">
                    {accountType}
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {otpStatusBanner ||
                    `Enter the 6-digit verification code sent to ${email.trim().toLowerCase()} to activate your EveryKR account.`}
                </p>
                <div className="flex items-center justify-between pt-1 text-[11px] border-t border-blue-200/60 dark:border-blue-800/60">
                  <span className="font-mono font-bold text-[#10243A] dark:text-blue-200">
                    {email.trim().toLowerCase()}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setOtpSubStep('consent_review');
                      setStep(2);
                    }}
                    className="text-[#1769AA] dark:text-blue-400 font-bold hover:underline cursor-pointer"
                  >
                    Change Email Address
                  </button>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-[#1769AA]" />
                    <span>6-Digit OTP Code</span>
                  </label>
                  <span
                    className={`text-[11px] font-mono font-bold flex items-center gap-1 ${
                      otpExpirySeconds <= 60 ? 'text-rose-600' : 'text-slate-500'
                    }`}
                  >
                    <Clock className="w-3 h-3" />
                    <span>
                      {otpExpirySeconds > 0
                        ? `Expires in ${formatCountdown(otpExpirySeconds)}`
                        : 'Code Expired'}
                    </span>
                  </span>
                </div>

                <div className="grid grid-cols-6 gap-2 sm:gap-2.5">
                  {otpDigits.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={el => {
                        otpInputRefs.current[idx] = el;
                      }}
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={6}
                      value={digit}
                      onChange={e => handleOtpDigitChange(idx, e.target.value)}
                      onKeyDown={e => handleOtpKeyDown(idx, e)}
                      onPaste={handleOtpPaste}
                      aria-label={`OTP digit ${idx + 1}`}
                      className="w-full h-12 text-center font-mono text-lg font-black rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-[#10243A] dark:text-white focus:outline-none focus:border-[#1769AA]"
                    />
                  ))}
                </div>

                <div className="flex items-center justify-between mt-2 text-[11px] text-slate-500">
                  <span>Sender: EveryKR &lt;newsletter@everykr.com&gt;</span>
                  <span>
                    Attempts remaining: <strong>{attemptsRemaining}/5</strong>
                  </span>
                </div>
              </div>

              <button
                type="submit"
                disabled={
                  isSubmitting ||
                  otpDigits.join('').length !== 6 ||
                  otpExpirySeconds === 0 ||
                  attemptsRemaining === 0
                }
                className="w-full py-3 px-4 rounded-xl bg-[#10243A] hover:bg-[#1769AA] dark:bg-[#19B6A4] dark:text-[#10243A] text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verifying OTP &amp; Saving Profile to Firestore...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Verify OTP &amp; Complete Registration</span>
                  </>
                )}
              </button>

              {resendCooldown === 0 && (
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700">
                  <RecaptchaCheckbox
                    idPrefix="everykr-register-resend-otp"
                    compact
                    onTokenChange={(tok) => {
                      setRecaptchaToken(tok);
                      if (tok) setRecaptchaError(null);
                    }}
                    errorMessage={recaptchaError}
                    resetSignal={recaptchaResetSignal}
                  />
                </div>
              )}

              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => handleRequestOtp(true)}
                  disabled={resendCooldown > 0 || isResendingOtp || isSubmitting}
                  className="inline-flex items-center gap-1.5 font-bold text-[#1769AA] dark:text-blue-400 hover:underline disabled:text-slate-400 cursor-pointer disabled:cursor-not-allowed"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isResendingOtp ? 'animate-spin' : ''}`} />
                  <span>
                    {isResendingOtp
                      ? 'Sending new OTP...'
                      : resendCooldown > 0
                      ? `Resend OTP in ${resendCooldown}s`
                      : 'Resend OTP Code'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setRecaptchaToken('');
                    setRecaptchaError(null);
                    setOtpSubStep('consent_review');
                  }}
                  className="text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 font-semibold cursor-pointer"
                >
                  ← Back to Consent Review
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Footer Switch to Sign In */}
      {onSwitchToLogin && (
        <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500">
          Already have a verified EveryKR account?{' '}
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="font-bold text-[#1769AA] dark:text-[#19B6A4] hover:underline cursor-pointer"
          >
            Sign In Here
          </button>
        </div>
      )}
    </div>
  );
};
