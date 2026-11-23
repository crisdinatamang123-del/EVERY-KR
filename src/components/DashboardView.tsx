import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  User,
  FileText,
  GraduationCap,
  Settings,
  LogOut,
  Upload,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  Eye,
  Trash2,
  RefreshCw,
  Edit3,
  Save,
  Plus,
  Search,
  ShieldCheck,
  Bell,
  Lock,
  Globe,
  Sun,
  Moon,
  ChevronRight,
  ExternalLink,
  X,
  FileCheck,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import {
  StudentDocumentCategory,
  StudentDocumentRecord,
  UniversityApplicationRecord,
  UniversityApplicationStatus,
  StudentNotification,
  University
} from '../types';
import {
  saveStudentPortalProfileDoc,
  uploadStudentPortalDocument,
  fetchStudentDocuments,
  deleteStudentDocumentDoc,
  submitUniversityApplicationDoc,
  updateStudentUniversityApplicationDoc,
  fetchStudentUniversityApplications,
  fetchStudentPortalNotificationsDoc,
  maskPassportNumberSafe,
  requestPasswordResetClient,
  submitDataPrivacyRequestDoc
} from '../services/firebaseService';
import { COUNTRIES_DATA } from '../data/countriesData';
import { SUPPORTED_LANGUAGES } from '../i18n/translations';
import { getUniversitySlug } from '../utils/seoRoutes';
import { EveryKrAnimatedLogo } from './common/EveryKrAnimatedLogo';

type StudentPortalSection = 'profile' | 'documents' | 'applications' | 'settings';

export interface DashboardViewProps {
  initialTab?: string;
}

const REQUIRED_DOCUMENT_CATEGORIES: Array<{
  category: StudentDocumentCategory;
  label: string;
  required: boolean;
  description: string;
}> = [
  {
    category: 'Passport',
    label: 'Passport Copy',
    required: true,
    description: 'Clear scan of your valid passport bio-data page (PDF, JPG, PNG).'
  },
  {
    category: 'Academic Certificates',
    label: 'Academic Certificates',
    required: true,
    description: 'High School (HSC) / Bachelor graduation certificate or diploma.'
  },
  {
    category: 'Academic Transcripts',
    label: 'Academic Transcripts',
    required: true,
    description: 'Official mark sheets or academic transcripts for all completed degrees.'
  },
  {
    category: 'English Proficiency Certificate',
    label: 'English Proficiency Certificate',
    required: false,
    description: 'IELTS, TOEFL, Duolingo, or Medium of Instruction (MOI) certificate (optional).'
  },
  {
    category: 'TOPIK Certificate',
    label: 'TOPIK Certificate',
    required: false,
    description: 'Official Korean Language Proficiency Test (TOPIK) score report (optional).'
  },
  {
    category: 'Other Supporting Documents',
    label: 'Other Supporting Documents',
    required: false,
    description: 'Study plan, recommendation letters, bank statement, or family certificate (optional).'
  }
];

const APPLICATION_STATUS_STYLES: Record<
  UniversityApplicationStatus,
  { badge: string; icon: React.ReactNode }
> = {
  Draft: {
    badge: 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
    icon: <Clock className="w-3.5 h-3.5" />
  },
  Submitted: {
    badge: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800',
    icon: <CheckCircle2 className="w-3.5 h-3.5" />
  },
  'Under Review': {
    badge: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800',
    icon: <Clock className="w-3.5 h-3.5" />
  },
  'Documents Required': {
    badge: 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800',
    icon: <AlertCircle className="w-3.5 h-3.5" />
  },
  Processing: {
    badge: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800',
    icon: <RefreshCw className="w-3.5 h-3.5" />
  },
  Accepted: {
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800',
    icon: <CheckCircle2 className="w-3.5 h-3.5" />
  },
  Rejected: {
    badge: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800',
    icon: <XCircle className="w-3.5 h-3.5" />
  },
  Completed: {
    badge: 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/60 dark:text-teal-300 dark:border-teal-800',
    icon: <ShieldCheck className="w-3.5 h-3.5" />
  },
  Withdrawn: {
    badge: 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-900 dark:text-slate-500 dark:border-slate-800',
    icon: <X className="w-3.5 h-3.5" />
  }
};

export const DashboardView: React.FC<DashboardViewProps> = ({ initialTab }) => {
  const navigate = useNavigate();
  const {
    currentUser: user,
    logout,
    updateProfile,
    approvedUniversitiesList,
    universitiesList,
    language,
    setLanguage,
    setActivePage,
    isServerVerifiedAdmin,
    theme,
    toggleTheme
  } = useApp();

  const isAuthenticated = Boolean(user);
  const isAdmin = Boolean(isServerVerifiedAdmin || user?.role === 'admin');
  const universities = useMemo(
    () =>
      approvedUniversitiesList && approvedUniversitiesList.length > 0
        ? approvedUniversitiesList
        : universitiesList,
    [approvedUniversitiesList, universitiesList]
  );

  const [activeSection, setActiveSection] = useState<StudentPortalSection>(() => {
    if (initialTab === 'documents') return 'documents';
    if (initialTab === 'applications') return 'applications';
    if (initialTab === 'settings') return 'settings';
    return 'profile';
  });

  const [bannerMessage, setBannerMessage] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);

  // ---------------------------------------------------------------------------
  // 1. MY PROFILE STATE
  // ---------------------------------------------------------------------------
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const profilePhotoInputRef = useRef<HTMLInputElement | null>(null);

  // Personal Information
  const [fullName, setFullName] = useState('');
  const [photoURL, setPhotoURL] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('');
  const [nationality, setNationality] = useState('');
  const [email, setEmail] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [currentCountry, setCurrentCountry] = useState('');
  const [currentAddress, setCurrentAddress] = useState('');

  // Passport Information
  const [passportNumberInput, setPassportNumberInput] = useState('');
  const [isEditingPassportNumber, setIsEditingPassportNumber] = useState(false);
  const [passportIssueDate, setPassportIssueDate] = useState('');
  const [passportExpiryDate, setPassportExpiryDate] = useState('');
  const [passportCountry, setPassportCountry] = useState('');

  // Academic Information
  const [highestEducationLevel, setHighestEducationLevel] = useState('High School / HSC');
  const [hscPassingYear, setHscPassingYear] = useState('');
  const [previousInstitution, setPreviousInstitution] = useState('');
  const [previousQualification, setPreviousQualification] = useState('');
  const [gpaResult, setGpaResult] = useState('');
  const [intendedStudyLevel, setIntendedStudyLevel] = useState("Bachelor's Degree");
  const [preferredMajor, setPreferredMajor] = useState('');
  const [preferredUniversity, setPreferredUniversity] = useState('');
  const [preferredIntake, setPreferredIntake] = useState('Spring (March)');

  // Language Information
  const [englishProficiency, setEnglishProficiency] = useState('Intermediate');
  const [englishTestScore, setEnglishTestScore] = useState('');
  const [koreanLanguageLevel, setKoreanLanguageLevel] = useState('None / Beginner');
  const [topikLevel, setTopikLevel] = useState('None');

  // ---------------------------------------------------------------------------
  // 2. MY DOCUMENTS STATE
  // ---------------------------------------------------------------------------
  const [documents, setDocuments] = useState<StudentDocumentRecord[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [uploadingCategory, setUploadingCategory] = useState<StudentDocumentCategory | null>(null);
  const [previewDoc, setPreviewDoc] = useState<StudentDocumentRecord | null>(null);

  // ---------------------------------------------------------------------------
  // 3. UNIVERSITY APPLICATIONS STATE
  // ---------------------------------------------------------------------------
  const [applications, setApplications] = useState<UniversityApplicationRecord[]>([]);
  const [, setLoadingApps] = useState(false);
  const [showNewAppModal, setShowNewAppModal] = useState(false);
  const [uniSearchQuery, setUniSearchQuery] = useState('');
  const [selectedUniId, setSelectedUniId] = useState('');
  const [selectedProgramName, setSelectedProgramName] = useState('');
  const [selectedDegreeLevel, setSelectedDegreeLevel] = useState("Bachelor's Degree");
  const [selectedIntake, setSelectedIntake] = useState('Spring (March) 2027');
  const [applicantStatement, setApplicantStatement] = useState('');
  const [isSubmittingApp, setIsSubmittingApp] = useState(false);
  const [selectedApplicationDetail, setSelectedApplicationDetail] =
    useState<UniversityApplicationRecord | null>(null);

  // ---------------------------------------------------------------------------
  // 4. NOTIFICATIONS & ACCOUNT SETTINGS STATE
  // ---------------------------------------------------------------------------
  const [notifications, setNotifications] = useState<StudentNotification[]>([]);
  const [privacyRequestText, setPrivacyRequestText] = useState('');
  const [submittingPrivacyReq, setSubmittingPrivacyReq] = useState(false);
  const [sendingResetEmail, setSendingResetEmail] = useState(false);

  // Sync initial profile fields from authenticated user
  useEffect(() => {
    if (!user) return;
    setFullName(user.fullName || user.name || '');
    setPhotoURL(user.photoURL || user.avatarUrl || '');
    setDateOfBirth(user.dateOfBirth || '');
    setGender(user.gender || '');
    setNationality(user.nationality || '');
    setEmail(user.email || '');
    setWhatsappNumber(user.whatsappNumber || user.phoneNumber || '');
    setCurrentCountry(user.countryOfResidence || user.currentCountry || user.nationality || '');
    setCurrentAddress(user.currentAddress || user.currentCity || '');

    setPassportIssueDate(
      user.passportDetails?.issueDate ||
        user.passportDetails?.passportIssueDate ||
        user.passportIssueDate ||
        ''
    );
    setPassportExpiryDate(
      user.passportDetails?.expiryDate ||
        user.passportDetails?.passportExpiryDate ||
        user.passportExpiryDate ||
        ''
    );
    setPassportCountry(
      user.passportDetails?.issuingCountry || user.passportCountry || user.nationality || ''
    );
    setPassportNumberInput('');
    setIsEditingPassportNumber(false);

    const acad = user.studentAcademicProfile;
    setHighestEducationLevel(
      user.highestEducationLevel ||
        acad?.currentEducationLevel ||
        user.studyLevel ||
        'High School / HSC'
    );
    setHscPassingYear(
      user.hscPassingYear ||
        acad?.hscPassingYear ||
        (acad?.graduationYear ? String(acad.graduationYear) : '') ||
        ''
    );
    setPreviousInstitution(
      user.previousInstitutionName ||
        acad?.institutionName ||
        acad?.currentUniversity ||
        ''
    );
    setPreviousQualification(
      user.previousQualification ||
        acad?.previousQualification ||
        acad?.currentMajor ||
        user.major ||
        ''
    );
    setGpaResult(
      user.academicGpa || acad?.cgpaOrPercentage || acad?.hscGpa || user.gpa || ''
    );
    setIntendedStudyLevel(
      user.intendedStudyLevel ||
        acad?.desiredStudyLevel ||
        user.preferredStudyLevel ||
        "Bachelor's Degree"
    );
    setPreferredMajor(
      user.preferredMajor ||
        acad?.interestedProgram ||
        user.interestedProgram ||
        user.major ||
        ''
    );
    setPreferredUniversity(
      user.preferredUniversity ||
        acad?.preferredUniversity ||
        acad?.preferredUniversities?.[0] ||
        user.university ||
        ''
    );
    setPreferredIntake(
      acad?.targetIntakeSemester ||
        acad?.preferredIntake ||
        user.preferredIntake ||
        'Spring (March)'
    );

    setEnglishProficiency(
      acad?.englishProficiency || user.englishProficiency || 'Intermediate'
    );
    setEnglishTestScore(
      acad?.englishScore || user.englishTestScore || user.ieltsOrToeflScore || ''
    );
    setKoreanLanguageLevel(
      acad?.koreanLanguageLevel || user.koreanLanguageLevel || 'None / Beginner'
    );
    setTopikLevel(acad?.koreanProficiency || user.topikLevel || 'None');
  }, [user]);

  const refreshPortalData = async () => {
    if (!user?.id) return;
    setLoadingDocs(true);
    setLoadingApps(true);
    try {
      const [docsData, appsData, notifsData] = await Promise.all([
        fetchStudentDocuments(user.id),
        fetchStudentUniversityApplications(user.id),
        fetchStudentPortalNotificationsDoc(user.id)
      ]);
      setDocuments(docsData);
      setApplications(appsData);
      setNotifications(notifsData);
    } finally {
      setLoadingDocs(false);
      setLoadingApps(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      refreshPortalData();
    }
  }, [user?.id]);

  const showNotice = (type: 'success' | 'error' | 'info', text: string) => {
    setBannerMessage({ type, text });
    setTimeout(() => {
      setBannerMessage(prev => (prev?.text === text ? null : prev));
    }, 5000);
  };

  const handleProfilePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      showNotice('error', 'Profile photo must be smaller than 5 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      if (result) {
        setPhotoURL(result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!fullName.trim()) {
      showNotice('error', 'Full Name is required.');
      return;
    }

    setIsSavingProfile(true);
    try {
      const rawPassport = isEditingPassportNumber ? passportNumberInput.trim() : undefined;
      const maskedNum = rawPassport
        ? maskPassportNumberSafe(rawPassport)
        : user.passportDetails?.passportNumberMasked || user.passportNumberMasked || '';

      const updates: Partial<typeof user> = {
        name: fullName.trim(),
        fullName: fullName.trim(),
        photoURL: photoURL.trim(),
        avatarUrl: photoURL.trim(),
        dateOfBirth: dateOfBirth.trim(),
        gender: gender.trim(),
        nationality: nationality.trim(),
        countryOfResidence: currentCountry.trim(),
        currentCountry: currentCountry.trim(),
        currentAddress: currentAddress.trim(),
        currentCity: currentAddress.trim() || user.currentCity || 'Seoul',
        phoneNumber: whatsappNumber.trim(),
        whatsappNumber: whatsappNumber.trim(),
        highestEducationLevel,
        hscPassingYear: hscPassingYear.trim(),
        previousInstitutionName: previousInstitution.trim(),
        previousQualification: previousQualification.trim(),
        academicGpa: gpaResult.trim(),
        gpa: gpaResult.trim(),
        studyLevel: highestEducationLevel,
        intendedStudyLevel,
        preferredStudyLevel: intendedStudyLevel,
        preferredMajor: preferredMajor.trim(),
        major: preferredMajor.trim(),
        interestedProgram: preferredMajor.trim(),
        preferredUniversity: preferredUniversity.trim(),
        preferredIntake: preferredIntake.trim(),
        englishProficiency,
        englishTestScore: englishTestScore.trim(),
        ieltsOrToeflScore: englishTestScore.trim(),
        koreanLanguageLevel,
        topikLevel,
        passportCountry: passportCountry.trim() || nationality.trim(),
        passportIssueDate: passportIssueDate.trim(),
        passportExpiryDate: passportExpiryDate.trim(),
        passportNumberMasked: maskedNum,
        passportDetails: {
          requiredForService: true,
          consentGiven: true,
          issuingCountry: passportCountry.trim() || nationality.trim(),
          issueDate: passportIssueDate.trim(),
          expiryDate: passportExpiryDate.trim(),
          passportIssueDate: passportIssueDate.trim(),
          passportExpiryDate: passportExpiryDate.trim(),
          passportNumberMasked: maskedNum,
          hasEncryptedPassport: Boolean(
            rawPassport || user.passportDetails?.hasEncryptedPassport
          )
        },
        studentAcademicProfile: {
          ...(user.studentAcademicProfile || {}),
          currentEducationLevel: highestEducationLevel,
          hscPassingYear: hscPassingYear.trim(),
          graduationYear: hscPassingYear.trim(),
          institutionName: previousInstitution.trim(),
          previousQualification: previousQualification.trim(),
          currentMajor: previousQualification.trim(),
          cgpaOrPercentage: gpaResult.trim(),
          desiredStudyLevel: intendedStudyLevel,
          interestedProgram: preferredMajor.trim(),
          preferredUniversity: preferredUniversity.trim(),
          preferredUniversities: preferredUniversity ? [preferredUniversity] : [],
          targetIntakeSemester: preferredIntake,
          preferredIntake,
          englishProficiency,
          englishScore: englishTestScore.trim(),
          koreanLanguageLevel,
          koreanProficiency: topikLevel
        }
      };

      const savedProfile = await saveStudentPortalProfileDoc({
        userId: user.id,
        currentProfile: user,
        updates,
        rawPassportNumber: rawPassport
      });

      updateProfile(savedProfile);
      setIsEditingProfile(false);
      setIsEditingPassportNumber(false);
      setPassportNumberInput('');
      showNotice('success', 'Your Student Profile has been saved.');
    } catch (err: any) {
      showNotice('error', err?.message || 'Failed to save profile changes.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleDocumentFileSelect = async (
    category: StudentDocumentCategory,
    file: File | undefined,
    existingDocId?: string
  ) => {
    if (!file || !user) return;
    setUploadingCategory(category);
    try {
      const uploaded = await uploadStudentPortalDocument({
        file,
        userId: user.id,
        studentName: fullName || user.fullName || user.name,
        studentEmail: email || user.email,
        studentCountry: nationality || user.nationality || '',
        category,
        documentTitle: category,
        replaceDocumentId: existingDocId
      });

      setDocuments(prev => [
        uploaded,
        ...prev.filter(
          d =>
            d.documentId !== uploaded.documentId &&
            d.id !== uploaded.id &&
            d.category !== category
        )
      ]);
      showNotice('success', `${category} ("${file.name}") uploaded and queued for verification.`);
    } catch (err: any) {
      showNotice('error', err?.message || `Failed to upload ${category}.`);
    } finally {
      setUploadingCategory(null);
    }
  };

  const handleDeleteDocument = async (docRecord: StudentDocumentRecord) => {
    if (!user) return;
    try {
      await deleteStudentDocumentDoc(docRecord.documentId || docRecord.id, user.id);
      setDocuments(prev =>
        prev.filter(
          d => d.documentId !== docRecord.documentId && d.id !== docRecord.id
        )
      );
      showNotice('info', `Removed ${docRecord.category} (${docRecord.fileName}).`);
    } catch {
      showNotice('error', 'Unable to delete document right now.');
    }
  };

  const filteredUniversities = useMemo(() => {
    const q = uniSearchQuery.trim().toLowerCase();
    if (!q) return universities;
    return universities.filter(
      u =>
        u.name.toLowerCase().includes(q) ||
        (u.koreanName && u.koreanName.toLowerCase().includes(q)) ||
        (u.city && u.city.toLowerCase().includes(q)) ||
        (u.region && u.region.toLowerCase().includes(q)) ||
        u.programs?.some(p => p.toLowerCase().includes(q))
    );
  }, [universities, uniSearchQuery]);

  const selectedUniversityObj: University | undefined = useMemo(
    () => universities.find(u => u.id === selectedUniId || u.name === selectedUniId),
    [universities, selectedUniId]
  );

  const openApplicationModalForUni = (uni?: University) => {
    const targetUni =
      uni ||
      universities.find(u => u.name === preferredUniversity) ||
      universities[0];
    if (targetUni) {
      setSelectedUniId(targetUni.id);
      const firstMajor =
        preferredMajor ||
        targetUni.programs?.[0] ||
        targetUni.popularMajors?.[0] ||
        'Computer Science & Engineering';
      setSelectedProgramName(firstMajor);
    }
    setSelectedDegreeLevel(intendedStudyLevel || "Bachelor's Degree");
    setSelectedIntake(
      preferredIntake.includes('202')
        ? preferredIntake
        : `${preferredIntake || 'Spring (March)'} 2027`
    );
    setShowNewAppModal(true);
  };

  const handleCreateOrSubmitApplication = async (targetStatus: 'Draft' | 'Submitted') => {
    if (!user || !selectedUniversityObj) {
      showNotice('error', 'Please select a Korean university and program.');
      return;
    }
    if (!selectedProgramName.trim()) {
      showNotice('error', 'Please enter or select your preferred program / major.');
      return;
    }

    setIsSubmittingApp(true);
    try {
      const appRecord = await submitUniversityApplicationDoc({
        userId: user.id,
        studentName: fullName || user.fullName || user.name,
        studentEmail: email || user.email,
        studentPhone: whatsappNumber || user.phoneNumber || '',
        whatsappNumber: whatsappNumber || user.phoneNumber || '',
        nationality: nationality || user.nationality || 'International',
        currentCountry: currentCountry || nationality || 'International',
        passportNumberMasked:
          user.passportDetails?.passportNumberMasked ||
          user.passportNumberMasked ||
          'Not provided',
        highestEducationLevel,
        hscPassingYear,
        previousInstitutionName: previousInstitution,
        previousQualification,
        academicGpa: gpaResult,
        englishProficiency,
        ieltsOrToeflScore: englishTestScore,
        koreanLanguageLevel,
        topikLevel,
        universityId: selectedUniversityObj.id,
        universityName: selectedUniversityObj.name,
        universityKoreanName: selectedUniversityObj.koreanName,
        universityCity: selectedUniversityObj.city || selectedUniversityObj.region,
        programName: selectedProgramName.trim(),
        degreeLevel: selectedDegreeLevel,
        intake: selectedIntake,
        intendedIntake: selectedIntake,
        status: targetStatus,
        submissionDate: new Date().toISOString(),
        attachedDocumentIds: documents.map(d => d.documentId || d.id),
        statementOfPurpose: applicantStatement.trim(),
        profileSnapshot: {
          highestEducationLevel,
          hscPassingYear,
          previousInstitution,
          previousQualification,
          gpaResult,
          englishProficiency,
          englishTestScore,
          koreanLanguageLevel,
          topikLevel,
          applicantStatement: applicantStatement.trim()
        }
      });

      setApplications(prev => [
        appRecord,
        ...prev.filter(a => a.applicationId !== appRecord.applicationId)
      ]);
      setShowNewAppModal(false);
      setApplicantStatement('');
      showNotice(
        'success',
        targetStatus === 'Submitted'
          ? `Application (${appRecord.applicationId}) submitted to ${selectedUniversityObj.name}!`
          : `Draft application saved for ${selectedUniversityObj.name}.`
      );
    } catch (err: any) {
      showNotice('error', err?.message || 'Failed to save university application.');
    } finally {
      setIsSubmittingApp(false);
    }
  };

  const handleStudentApplicationAction = async (
    app: UniversityApplicationRecord,
    nextStatus: 'Submitted' | 'Withdrawn'
  ) => {
    if (!user) return;
    try {
      const updated = await updateStudentUniversityApplicationDoc({
        applicationId: app.applicationId,
        userId: user.id,
        studentName: fullName || user.fullName || user.name,
        studentEmail: email || user.email,
        updates: {
          status: nextStatus,
          attachedDocumentIds: documents.map(d => d.documentId || d.id),
          submissionDate:
            nextStatus === 'Submitted' ? new Date().toISOString() : app.submissionDate
        },
        note:
          nextStatus === 'Withdrawn'
            ? 'Application withdrawn by student.'
            : 'Updated documents / application submitted by student.'
      });
      if (updated) {
        setApplications(prev =>
          prev.map(a => (a.applicationId === updated.applicationId ? updated : a))
        );
        if (selectedApplicationDetail?.applicationId === updated.applicationId) {
          setSelectedApplicationDetail(updated);
        }
        showNotice(
          'success',
          nextStatus === 'Withdrawn'
            ? `Application ${app.applicationId} has been withdrawn.`
            : `Application ${app.applicationId} has been submitted for review.`
        );
      }
    } catch (err: any) {
      showNotice('error', err?.message || 'Unable to update application.');
    }
  };

  const handlePasswordResetRequest = async () => {
    if (!user?.email) return;
    setSendingResetEmail(true);
    try {
      const res = await requestPasswordResetClient(user.email);
      showNotice(res.ok ? 'success' : 'info', res.message);
    } finally {
      setSendingResetEmail(false);
    }
  };

  const handlePrivacyRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !privacyRequestText.trim()) return;
    setSubmittingPrivacyReq(true);
    try {
      await submitDataPrivacyRequestDoc({
        uid: user.id,
        email: user.email,
        fullName: fullName || user.fullName || user.name,
        requestType: 'data_correction',
        details: privacyRequestText.trim()
      });
      setPrivacyRequestText('');
      showNotice('success', 'Your privacy / data request has been logged with EveryKR Compliance.');
    } finally {
      setSubmittingPrivacyReq(false);
    }
  };

  if (!isAuthenticated || !user) {
    return (
      <div className="max-w-xl mx-auto my-16 p-8 rounded-2xl ekr-glass-panel text-center">
        <GraduationCap className="w-12 h-12 text-[#0754B8] dark:text-[#60A5FA] mx-auto mb-3" />
        <h2 className="text-xl font-bold text-[#10213D] dark:text-white mb-2">
          Student Portal Sign In Required
        </h2>
        <p className="text-sm text-[#526685] dark:text-[#B8C9E5] mb-6">
          Please sign in to access your personal Student Profile, Documents, and Korean University Applications.
        </p>
        <button
          onClick={() => navigate('/login', { state: { from: '/dashboard' } })}
          className="ekr-glass-btn-primary px-6 py-2.5 rounded-xl font-semibold text-sm transition cursor-pointer"
        >
          Go to Login
        </button>
      </div>
    );
  }

  const passportDocRecord = documents.find(d => d.category === 'Passport');
  const maskedPassportDisplay =
    user.passportDetails?.passportNumberMasked ||
    user.passportNumberMasked ||
    'Not provided';

  return (
    <div className="min-h-[calc(100vh-5rem)] bg-transparent py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Top Portal Identity Bar */}
        <div className="ekr-glass-panel rounded-2xl p-5 sm:p-6 mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative w-14 h-14 rounded-2xl overflow-hidden bg-gradient-to-br from-[#0754B8] to-[#0875E8] text-white flex items-center justify-center font-extrabold text-xl shadow-md shrink-0 ring-2 ring-[#FFB800]/35">
              {photoURL ? (
                <img
                  src={photoURL}
                  alt={fullName || user.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                (fullName || user.name || 'S').charAt(0).toUpperCase()
              )}
            </div>
            <div>
              <div className="mb-1">
                <EveryKrAnimatedLogo variant="static" imgClassName="h-5 sm:h-6" />
              </div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-extrabold text-[#061B49] dark:text-white tracking-tight">
                  {fullName || user.name}
                </h1>
                <span className="text-xs font-bold text-[#0754B8] dark:text-[#60A5FA] uppercase tracking-wider">
                  · Student Portal
                </span>
                {user.registrationId && (
                  <span className="text-xs font-mono text-[#526685] dark:text-[#B8C9E5] tabular-nums">
                    ID: {user.registrationId}
                  </span>
                )}
              </div>
              <p className="text-sm text-[#526685] dark:text-[#B8C9E5] mt-0.5">
                {user.email} {nationality ? `• ${nationality}` : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {isAdmin && (
              <button
                onClick={() => {
                  setActivePage('admin');
                  navigate('/admin');
                }}
                className="ekr-glass-btn-primary inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap"
              >
                <ShieldCheck className="w-4 h-4" />
                Open Admin Portal
              </button>
            )}
            <button
              type="button"
              onClick={() => void logout()}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50/80 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 hover:bg-rose-100 dark:hover:bg-rose-950/70 transition cursor-pointer whitespace-nowrap"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>

        {/* Status Notification Banner */}
        {bannerMessage && (
          <div
            className={`mb-6 p-4 rounded-xl border flex items-center justify-between gap-3 text-sm font-medium ${
              bannerMessage.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/50 dark:border-emerald-800 dark:text-emerald-200'
                : bannerMessage.type === 'error'
                ? 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/50 dark:border-rose-800 dark:text-rose-200'
                : 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-950/50 dark:border-blue-800 dark:text-blue-200'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {bannerMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : bannerMessage.type === 'error' ? (
                <AlertCircle className="w-4 h-4 shrink-0" />
              ) : (
                <Bell className="w-4 h-4 shrink-0" />
              )}
              <span>{bannerMessage.text}</span>
            </div>
            <button
              onClick={() => setBannerMessage(null)}
              className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Main Layout: Clean 4-Section Left Sidebar + Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Minimal 4-Item Navigation Sidebar */}
          <aside className="lg:col-span-3 ekr-glass-panel rounded-2xl p-3">
            <nav className="space-y-1" aria-label="Student Portal Navigation">
              <button
                onClick={() => setActiveSection('profile')}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-semibold transition cursor-pointer ${
                  activeSection === 'profile'
                    ? 'ekr-glass-btn-primary shadow-sm'
                    : 'text-[#10213D] dark:text-slate-200 hover:bg-white/60 dark:hover:bg-white/10'
                }`}
              >
                <span className="flex items-center gap-3">
                  <User className="w-4 h-4" />
                  My Profile
                </span>
                <ChevronRight className="w-4 h-4 opacity-70" />
              </button>

              <button
                onClick={() => setActiveSection('documents')}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-semibold transition cursor-pointer ${
                  activeSection === 'documents'
                    ? 'ekr-glass-btn-primary shadow-sm'
                    : 'text-[#10213D] dark:text-slate-200 hover:bg-slate-100/80 dark:hover:bg-white/10'
                }`}
              >
                <span className="flex items-center gap-3">
                  <FileText className="w-4 h-4" />
                  My Documents
                </span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-md tabular-nums ${
                    activeSection === 'documents'
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-100 dark:bg-white/10 text-[#4B607F] dark:text-slate-300'
                  }`}
                >
                  {documents.length}/6
                </span>
              </button>

              <button
                onClick={() => setActiveSection('applications')}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-semibold transition cursor-pointer ${
                  activeSection === 'applications'
                    ? 'ekr-glass-btn-primary shadow-sm'
                    : 'text-[#10213D] dark:text-slate-200 hover:bg-slate-100/80 dark:hover:bg-white/10'
                }`}
              >
                <span className="flex items-center gap-3">
                  <GraduationCap className="w-4 h-4" />
                  University Applications
                </span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-md tabular-nums ${
                    activeSection === 'applications'
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-100 dark:bg-white/10 text-[#4B607F] dark:text-slate-300'
                  }`}
                >
                  {applications.length}
                </span>
              </button>

              <button
                onClick={() => setActiveSection('settings')}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-semibold transition cursor-pointer ${
                  activeSection === 'settings'
                    ? 'ekr-glass-btn-primary shadow-sm'
                    : 'text-[#10213D] dark:text-slate-200 hover:bg-slate-100/80 dark:hover:bg-white/10'
                }`}
              >
                <span className="flex items-center gap-3">
                  <Settings className="w-4 h-4" />
                  Account Settings
                </span>
                {notifications.some(n => !n.read) && (
                  <span className="w-2 h-2 rounded-full bg-[#FFB800]" />
                )}
              </button>
            </nav>

            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => void logout()}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </aside>

          {/* Right Content Area */}
          <main className="lg:col-span-9 space-y-6">
            {/* ================================================================= */}
            {/* SECTION 1: MY PROFILE                                             */}
            {/* ================================================================= */}
            {activeSection === 'profile' && (
              <form
                onSubmit={handleSaveProfile}
                className="ekr-glass-panel rounded-2xl overflow-hidden"
              >
                <div className="p-6 border-b border-slate-200/60 dark:border-white/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                      My Profile
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                      Your saved personal, passport, academic, and language profile is automatically used when applying to Korean universities.
                    </p>
                  </div>
                  <div className="flex items-center gap-2.5">
                    {!isEditingProfile ? (
                      <button
                        type="button"
                        onClick={() => setIsEditingProfile(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        Edit Profile
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => setIsEditingProfile(false)}
                          className="px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={isSavingProfile}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-xs font-semibold transition"
                        >
                          <Save className="w-3.5 h-3.5" />
                          {isSavingProfile ? 'Saving...' : 'Save Changes'}
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div className="p-6 space-y-8">
                  {/* 1A. Personal Information */}
                  <section>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-4">
                      1. Personal Information
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                          Full Name *
                        </label>
                        <input
                          type="text"
                          disabled={!isEditingProfile}
                          value={fullName}
                          onChange={e => setFullName(e.target.value)}
                          required
                          className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 disabled:opacity-75 text-sm text-slate-900 dark:text-white"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                          Email Address
                        </label>
                        <input
                          type="email"
                          disabled
                          value={email}
                          className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 text-sm text-slate-500 dark:text-slate-400 cursor-not-allowed"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                          Phone / WhatsApp Number *
                        </label>
                        <input
                          type="text"
                          disabled={!isEditingProfile}
                          value={whatsappNumber}
                          onChange={e => setWhatsappNumber(e.target.value)}
                          placeholder="+880 1700 000000"
                          className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 disabled:opacity-75 text-sm text-slate-900 dark:text-white"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                          Date of Birth
                        </label>
                        <input
                          type="date"
                          disabled={!isEditingProfile}
                          value={dateOfBirth}
                          onChange={e => setDateOfBirth(e.target.value)}
                          className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 disabled:opacity-75 text-sm text-slate-900 dark:text-white"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                          Gender (Optional)
                        </label>
                        <select
                          disabled={!isEditingProfile}
                          value={gender}
                          onChange={e => setGender(e.target.value)}
                          className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 disabled:opacity-75 text-sm text-slate-900 dark:text-white"
                        >
                          <option value="">Select gender</option>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                          <option value="Prefer not to say">Prefer not to say</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                          Nationality / Country
                        </label>
                        <select
                          disabled={!isEditingProfile}
                          value={nationality}
                          onChange={e => setNationality(e.target.value)}
                          className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 disabled:opacity-75 text-sm text-slate-900 dark:text-white"
                        >
                          <option value="">Select country</option>
                          {COUNTRIES_DATA.map(c => (
                            <option key={c.code} value={c.name}>
                              {c.flag} {c.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                          Current Country
                        </label>
                        <select
                          disabled={!isEditingProfile}
                          value={currentCountry}
                          onChange={e => setCurrentCountry(e.target.value)}
                          className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 disabled:opacity-75 text-sm text-slate-900 dark:text-white"
                        >
                          <option value="">Select current country</option>
                          {COUNTRIES_DATA.map(c => (
                            <option key={c.code} value={c.name}>
                              {c.flag} {c.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                          Current Address (Optional)
                        </label>
                        <input
                          type="text"
                          disabled={!isEditingProfile}
                          value={currentAddress}
                          onChange={e => setCurrentAddress(e.target.value)}
                          placeholder="City, Street, Postal Code"
                          className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 disabled:opacity-75 text-sm text-slate-900 dark:text-white"
                        />
                      </div>

                      {isEditingProfile && (
                        <div className="sm:col-span-3 flex items-center gap-3 pt-1">
                          <input
                            ref={profilePhotoInputRef}
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            onChange={handleProfilePhotoUpload}
                            className="hidden"
                          />
                          <button
                            type="button"
                            onClick={() => profilePhotoInputRef.current?.click()}
                            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            <Upload className="w-3.5 h-3.5" />
                            Upload Profile Photo (Optional)
                          </button>
                          {photoURL && (
                            <button
                              type="button"
                              onClick={() => setPhotoURL('')}
                              className="text-xs text-rose-600 hover:underline"
                            >
                              Remove Photo
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </section>

                  {/* 1B. Passport Information */}
                  <section className="pt-6 border-t border-slate-200 dark:border-slate-800">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                        2. Passport Information (Encrypted & Masked)
                      </h3>
                      <span className="inline-flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                        <Lock className="w-3.5 h-3.5" />
                        AES-256 Protected
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                          Passport Number
                        </label>
                        {isEditingProfile && isEditingPassportNumber ? (
                          <input
                            type="text"
                            value={passportNumberInput}
                            onChange={e => setPassportNumberInput(e.target.value)}
                            placeholder="Enter passport number"
                            className="w-full px-3.5 py-2 rounded-xl border border-blue-400 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white font-mono"
                          />
                        ) : (
                          <div className="flex items-center justify-between px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-sm font-mono text-slate-800 dark:text-slate-200">
                            <span>{maskedPassportDisplay}</span>
                            {isEditingProfile && (
                              <button
                                type="button"
                                onClick={() => setIsEditingPassportNumber(true)}
                                className="text-xs font-sans font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                              >
                                Update
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                          Passport Country
                        </label>
                        <select
                          disabled={!isEditingProfile}
                          value={passportCountry}
                          onChange={e => setPassportCountry(e.target.value)}
                          className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 disabled:opacity-75 text-sm text-slate-900 dark:text-white"
                        >
                          <option value="">Select issuing country</option>
                          {COUNTRIES_DATA.map(c => (
                            <option key={c.code} value={c.name}>
                              {c.flag} {c.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                          Passport Issue Date
                        </label>
                        <input
                          type="date"
                          disabled={!isEditingProfile}
                          value={passportIssueDate}
                          onChange={e => setPassportIssueDate(e.target.value)}
                          className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 disabled:opacity-75 text-sm text-slate-900 dark:text-white"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                          Passport Expiry Date
                        </label>
                        <input
                          type="date"
                          disabled={!isEditingProfile}
                          value={passportExpiryDate}
                          onChange={e => setPassportExpiryDate(e.target.value)}
                          className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 disabled:opacity-75 text-sm text-slate-900 dark:text-white"
                        />
                      </div>
                    </div>

                    <div className="mt-4 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 text-xs">
                        <FileCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          Passport Scan Document:
                        </span>
                        {passportDocRecord ? (
                          <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                            {passportDocRecord.fileName} ({passportDocRecord.verificationStatus})
                          </span>
                        ) : (
                          <span className="text-amber-600 dark:text-amber-400">
                            Not uploaded yet
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveSection('documents')}
                        className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        Manage in My Documents →
                      </button>
                    </div>
                  </section>

                  {/* 1C. Academic Information */}
                  <section className="pt-6 border-t border-slate-200 dark:border-slate-800">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-4">
                      3. Academic Information
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                          Highest Education Level
                        </label>
                        <select
                          disabled={!isEditingProfile}
                          value={highestEducationLevel}
                          onChange={e => setHighestEducationLevel(e.target.value)}
                          className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 disabled:opacity-75 text-sm text-slate-900 dark:text-white"
                        >
                          <option value="High School / HSC">High School / HSC</option>
                          <option value="Diploma">Diploma</option>
                          <option value="Bachelor's Degree">Bachelor's Degree</option>
                          <option value="Master's Degree">Master's Degree</option>
                          <option value="Doctorate / PhD">Doctorate / PhD</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                          HSC / High School Passing Year
                        </label>
                        <input
                          type="text"
                          disabled={!isEditingProfile}
                          value={hscPassingYear}
                          onChange={e => setHscPassingYear(e.target.value)}
                          placeholder="e.g., 2024"
                          className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 disabled:opacity-75 text-sm text-slate-900 dark:text-white"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                          Previous Institution Name
                        </label>
                        <input
                          type="text"
                          disabled={!isEditingProfile}
                          value={previousInstitution}
                          onChange={e => setPreviousInstitution(e.target.value)}
                          placeholder="College or University Name"
                          className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 disabled:opacity-75 text-sm text-slate-900 dark:text-white"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                          Previous Qualification / Stream
                        </label>
                        <input
                          type="text"
                          disabled={!isEditingProfile}
                          value={previousQualification}
                          onChange={e => setPreviousQualification(e.target.value)}
                          placeholder="e.g., Science / Business / B.Sc in CS"
                          className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 disabled:opacity-75 text-sm text-slate-900 dark:text-white"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                          GPA / Academic Result
                        </label>
                        <input
                          type="text"
                          disabled={!isEditingProfile}
                          value={gpaResult}
                          onChange={e => setGpaResult(e.target.value)}
                          placeholder="e.g., 4.85 / 5.00 or 3.75 / 4.00"
                          className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 disabled:opacity-75 text-sm text-slate-900 dark:text-white"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                          Intended Study Level in Korea
                        </label>
                        <select
                          disabled={!isEditingProfile}
                          value={intendedStudyLevel}
                          onChange={e => setIntendedStudyLevel(e.target.value)}
                          className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 disabled:opacity-75 text-sm text-slate-900 dark:text-white"
                        >
                          <option value="Korean Language Program (D-4)">
                            Korean Language Program (D-4)
                          </option>
                          <option value="Associate Degree">Associate Degree</option>
                          <option value="Bachelor's Degree">Bachelor's Degree</option>
                          <option value="Master's Degree">Master's Degree</option>
                          <option value="Doctoral Degree (PhD)">Doctoral Degree (PhD)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                          Preferred Major / Subject
                        </label>
                        <input
                          type="text"
                          disabled={!isEditingProfile}
                          value={preferredMajor}
                          onChange={e => setPreferredMajor(e.target.value)}
                          placeholder="e.g., Computer Science, Business"
                          className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 disabled:opacity-75 text-sm text-slate-900 dark:text-white"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                          Preferred University
                        </label>
                        <select
                          disabled={!isEditingProfile}
                          value={preferredUniversity}
                          onChange={e => setPreferredUniversity(e.target.value)}
                          className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 disabled:opacity-75 text-sm text-slate-900 dark:text-white"
                        >
                          <option value="">Select preferred university</option>
                          {universities.map(u => (
                            <option key={u.id} value={u.name}>
                              {u.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                          Preferred Intake
                        </label>
                        <select
                          disabled={!isEditingProfile}
                          value={preferredIntake}
                          onChange={e => setPreferredIntake(e.target.value)}
                          className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 disabled:opacity-75 text-sm text-slate-900 dark:text-white"
                        >
                          <option value="Spring (March)">Spring (March)</option>
                          <option value="Fall (September)">Fall (September)</option>
                          <option value="Summer (June)">Summer (June)</option>
                          <option value="Winter (December)">Winter (December)</option>
                        </select>
                      </div>
                    </div>
                  </section>

                  {/* 1D. Language Information */}
                  <section className="pt-6 border-t border-slate-200 dark:border-slate-800">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-4">
                      4. Language Information
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                          English Proficiency
                        </label>
                        <select
                          disabled={!isEditingProfile}
                          value={englishProficiency}
                          onChange={e => setEnglishProficiency(e.target.value)}
                          className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 disabled:opacity-75 text-sm text-slate-900 dark:text-white"
                        >
                          <option value="Basic">Basic</option>
                          <option value="Intermediate">Intermediate</option>
                          <option value="Fluent / Advanced">Fluent / Advanced</option>
                          <option value="IELTS Certified">IELTS Certified</option>
                          <option value="TOEFL / Duolingo Certified">
                            TOEFL / Duolingo Certified
                          </option>
                          <option value="Native / MOI">Native / Medium of Instruction</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                          IELTS / TOEFL Score (Optional)
                        </label>
                        <input
                          type="text"
                          disabled={!isEditingProfile}
                          value={englishTestScore}
                          onChange={e => setEnglishTestScore(e.target.value)}
                          placeholder="e.g., IELTS 6.5 / TOEFL 88"
                          className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 disabled:opacity-75 text-sm text-slate-900 dark:text-white"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                          Korean Language Level
                        </label>
                        <select
                          disabled={!isEditingProfile}
                          value={koreanLanguageLevel}
                          onChange={e => setKoreanLanguageLevel(e.target.value)}
                          className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 disabled:opacity-75 text-sm text-slate-900 dark:text-white"
                        >
                          <option value="None / Beginner">None / Beginner</option>
                          <option value="Beginner (A1-A2)">Beginner (A1-A2)</option>
                          <option value="Intermediate (B1-B2)">Intermediate (B1-B2)</option>
                          <option value="Advanced (C1-C2)">Advanced (C1-C2)</option>
                          <option value="TOPIK Certified">TOPIK Certified</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                          TOPIK Level (Optional)
                        </label>
                        <select
                          disabled={!isEditingProfile}
                          value={topikLevel}
                          onChange={e => setTopikLevel(e.target.value)}
                          className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 disabled:opacity-75 text-sm text-slate-900 dark:text-white"
                        >
                          <option value="None">None</option>
                          <option value="TOPIK Level 1">TOPIK Level 1</option>
                          <option value="TOPIK Level 2">TOPIK Level 2</option>
                          <option value="TOPIK Level 3">TOPIK Level 3</option>
                          <option value="TOPIK Level 4">TOPIK Level 4</option>
                          <option value="TOPIK Level 5">TOPIK Level 5</option>
                          <option value="TOPIK Level 6">TOPIK Level 6</option>
                        </select>
                      </div>
                    </div>
                  </section>
                </div>
              </form>
            )}

            {/* ================================================================= */}
            {/* SECTION 2: MY DOCUMENTS                                           */}
            {/* ================================================================= */}
            {activeSection === 'documents' && (
              <div className="ekr-glass-panel rounded-2xl overflow-hidden">
                <div className="p-6 border-b border-slate-200/60 dark:border-white/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                      My Documents
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                      Upload your required admission documents once (PDF, JPG, PNG up to 10 MB). EveryKR Admissions verifies them for your university applications.
                    </p>
                  </div>
                  <button
                    onClick={refreshPortalData}
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 self-start"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingDocs ? 'animate-spin' : ''}`} />
                    Refresh Status
                  </button>
                </div>

                <div className="divide-y divide-slate-200 dark:divide-slate-800">
                  {REQUIRED_DOCUMENT_CATEGORIES.map(slot => {
                    const uploadedDoc = documents.find(d => d.category === slot.category);
                    const isUploading = uploadingCategory === slot.category;
                    const uploadStatus = uploadedDoc
                      ? uploadedDoc.uploadStatus || 'Uploaded'
                      : 'Missing';
                    const verificationStatus = uploadedDoc
                      ? uploadedDoc.verificationStatus
                      : null;

                    return (
                      <div
                        key={slot.category}
                        className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                      >
                        <div className="space-y-1.5 max-w-xl">
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                              {slot.label}
                            </h3>
                            <span
                              className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${
                                slot.required
                                  ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                                  : 'bg-slate-50 text-slate-500 dark:bg-slate-800/50 dark:text-slate-400'
                              }`}
                            >
                              {slot.required ? 'Required' : 'Optional'}
                            </span>

                            <span
                              className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-md border ${
                                uploadStatus === 'Uploaded'
                                  ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800'
                                  : uploadStatus === 'Replacement Requested'
                                  ? 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800'
                                  : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                              }`}
                            >
                              {uploadStatus}
                            </span>

                            {verificationStatus && (
                              <span
                                className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-md border ${
                                  verificationStatus === 'Verified'
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                                    : verificationStatus === 'Rejected'
                                    ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800'
                                    : verificationStatus === 'Replacement Requested'
                                    ? 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800'
                                    : 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                                }`}
                              >
                                {verificationStatus === 'Verified' && (
                                  <CheckCircle2 className="w-3 h-3" />
                                )}
                                {verificationStatus === 'Pending Verification' && (
                                  <Clock className="w-3 h-3" />
                                )}
                                {(verificationStatus === 'Rejected' ||
                                  verificationStatus === 'Replacement Requested') && (
                                  <AlertCircle className="w-3 h-3" />
                                )}
                                {verificationStatus}
                              </span>
                            )}
                          </div>

                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {slot.description}
                          </p>

                          {uploadedDoc && (
                            <div className="pt-1 text-xs text-slate-700 dark:text-slate-300 flex items-center gap-3 flex-wrap">
                              <span className="font-medium">
                                File: <span className="font-mono">{uploadedDoc.fileName}</span>
                              </span>
                              <span className="text-slate-400">•</span>
                              <span className="text-slate-500 tabular-nums">
                                Uploaded {new Date(uploadedDoc.uploadedAt).toLocaleDateString()}
                              </span>
                            </div>
                          )}

                          {uploadedDoc?.verificationNotes && (
                            <div className="mt-2 p-2.5 rounded-lg bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/70 text-xs text-amber-900 dark:text-amber-200">
                              <span className="font-semibold">Admin Verification Note: </span>
                              {uploadedDoc.verificationNotes}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {uploadedDoc && (
                            <button
                              type="button"
                              onClick={() => setPreviewDoc(uploadedDoc)}
                              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              View
                            </button>
                          )}

                          <label className="cursor-pointer inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition">
                            <Upload className="w-3.5 h-3.5" />
                            <span>
                              {isUploading
                                ? 'Uploading...'
                                : uploadedDoc
                                ? 'Replace'
                                : 'Upload'}
                            </span>
                            <input
                              type="file"
                              accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                              disabled={isUploading}
                              onChange={e => {
                                const f = e.target.files?.[0];
                                handleDocumentFileSelect(
                                  slot.category,
                                  f,
                                  uploadedDoc?.documentId || uploadedDoc?.id
                                );
                                e.target.value = '';
                              }}
                              className="hidden"
                            />
                          </label>

                          {uploadedDoc && (
                            <button
                              type="button"
                              onClick={() => handleDeleteDocument(uploadedDoc)}
                              className="p-2 rounded-xl border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                              title="Delete document"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ================================================================= */}
            {/* SECTION 3: UNIVERSITY APPLICATIONS                                */}
            {/* ================================================================= */}
            {activeSection === 'applications' && (
              <div className="space-y-6">
                <div className="ekr-glass-panel rounded-2xl overflow-hidden">
                  <div className="p-6 border-b border-slate-200/60 dark:border-white/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                        My University Applications
                      </h2>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                        Track your Korean university admission status in real time.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => openApplicationModalForUni()}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition self-start"
                    >
                      <Plus className="w-4 h-4" />
                      New University Application
                    </button>
                  </div>

                  {applications.length === 0 ? (
                    <div className="p-10 text-center">
                      <GraduationCap className="w-10 h-10 text-slate-400 mx-auto mb-3" />
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
                        No University Applications Yet
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-5">
                        Select a Korean university below or click "New University Application". Your saved profile and uploaded documents will be auto-populated.
                      </p>
                      <button
                        type="button"
                        onClick={() => openApplicationModalForUni()}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition"
                      >
                        Start First Application
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-200 dark:divide-slate-800">
                      {applications.map(app => {
                        const style =
                          APPLICATION_STATUS_STYLES[app.status] ||
                          APPLICATION_STATUS_STYLES.Submitted;
                        return (
                          <div
                            key={app.applicationId}
                            className="p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                          >
                            <div className="space-y-1.5">
                              <div className="flex items-center gap-2.5 flex-wrap">
                                <span className="text-xs font-mono font-semibold text-slate-500 dark:text-slate-400 tabular-nums">
                                  {app.applicationId}
                                </span>
                                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                                  {app.universityName}
                                </h3>
                                <span
                                  className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-md border ${style.badge}`}
                                >
                                  {style.icon}
                                  {app.status}
                                </span>
                              </div>

                              <div className="text-xs text-slate-600 dark:text-slate-300 flex items-center gap-3 flex-wrap">
                                <span className="font-semibold">
                                  Program: {app.programName} ({app.degreeLevel})
                                </span>
                                <span className="text-slate-400">•</span>
                                <span>Intake: {app.intake || app.intendedIntake}</span>
                                <span className="text-slate-400">•</span>
                                <span className="tabular-nums">
                                  Submitted:{' '}
                                  {new Date(
                                    app.submissionDate || app.createdAt
                                  ).toLocaleDateString()}
                                </span>
                              </div>

                              {app.status === 'Documents Required' && (
                                <div className="mt-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200">
                                  <span className="font-bold">Action Required: </span>
                                  {app.requestedDocumentsNote ||
                                    app.documentRequestMessage ||
                                    'Admissions requested additional supporting documents. Please upload them in My Documents and click "Resubmit with Documents".'}
                                </div>
                              )}
                            </div>

                            <div className="flex items-center gap-2 flex-wrap shrink-0">
                              <button
                                type="button"
                                onClick={() => setSelectedApplicationDetail(app)}
                                className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                              >
                                View Status & History
                              </button>

                              {app.status === 'Draft' && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleStudentApplicationAction(app, 'Submitted')
                                  }
                                  className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition"
                                >
                                  Submit Application
                                </button>
                              )}

                              {app.status === 'Documents Required' && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleStudentApplicationAction(app, 'Submitted')
                                  }
                                  className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold transition"
                                >
                                  Resubmit with Updated Documents
                                </button>
                              )}

                              {app.status !== 'Withdrawn' &&
                                app.status !== 'Accepted' &&
                                app.status !== 'Completed' &&
                                app.status !== 'Rejected' && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleStudentApplicationAction(app, 'Withdrawn')
                                    }
                                    className="px-3 py-2 rounded-xl border border-rose-200 dark:border-rose-900/60 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                                  >
                                    Withdraw
                                  </button>
                                )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Browse Available Korean Universities */}
                <div className="ekr-glass-panel rounded-2xl overflow-hidden">
                  <div className="p-6 border-b border-slate-200/60 dark:border-white/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <h3 className="text-base font-bold text-[#10213D] dark:text-white">
                        Browse Available Korean Universities ({filteredUniversities.length})
                      </h3>
                      <p className="text-xs text-[#526685] dark:text-[#B8C9E5] mt-0.5">
                        Explore programs, tuition fees, and admission deadlines, then apply with one click using your saved Student Profile.
                      </p>
                    </div>
                    <div className="relative w-full sm:w-72">
                      <Search className="w-4 h-4 text-[#526685] dark:text-[#B8C9E5] absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={uniSearchQuery}
                        onChange={e => setUniSearchQuery(e.target.value)}
                        placeholder="Search university, city, major..."
                        className="ekr-glass-input w-full pl-9 pr-3.5 py-2 rounded-xl text-xs"
                      />
                    </div>
                  </div>

                  <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[540px] overflow-y-auto">
                    {filteredUniversities.slice(0, 25).map(uni => {
                      const minTuition = uni.tuitionPerSemesterKRW?.min || 3800000;
                      const deadlineLabel =
                        uni.deadlines?.springSemester ||
                        uni.deadlines?.fallSemester ||
                        uni.undergradDeadline ||
                        'Open Intake';
                      return (
                        <div
                          key={uni.id}
                          className="ekr-glass-card p-4 rounded-xl flex flex-col justify-between gap-3"
                        >
                          <div>
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                                  {uni.name}
                                </h4>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                  {uni.city || uni.region} • {uni.type} University
                                </p>
                              </div>
                              {uni.englishTaughtAvailable && (
                                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shrink-0">
                                  English Track
                                </span>
                              )}
                            </div>

                            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                              <div className="p-2 rounded-lg bg-white dark:bg-slate-800/70 border border-slate-200/70 dark:border-slate-800">
                                <span className="text-slate-400 block text-[10px]">
                                  Tuition / Semester
                                </span>
                                <span className="font-semibold text-slate-800 dark:text-slate-200 tabular-nums">
                                  ₩{minTuition.toLocaleString()}
                                </span>
                              </div>
                              <div className="p-2 rounded-lg bg-white dark:bg-slate-800/70 border border-slate-200/70 dark:border-slate-800">
                                <span className="text-slate-400 block text-[10px]">
                                  Admission Window
                                </span>
                                <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block">
                                  {deadlineLabel}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200/70 dark:border-slate-800">
                            <button
                              type="button"
                              onClick={() =>
                                navigate(`/universities/${getUniversitySlug(uni)}`)
                              }
                              className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-blue-600"
                            >
                              View Details
                              <ExternalLink className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => openApplicationModalForUni(uni)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition"
                            >
                              Apply with Profile
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* ================================================================= */}
            {/* SECTION 4: ACCOUNT SETTINGS                                       */}
            {/* ================================================================= */}
            {activeSection === 'settings' && (
              <div className="space-y-6">
                <div className="ekr-glass-panel rounded-2xl overflow-hidden">
                  <div className="p-6 border-b border-slate-200/60 dark:border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <Bell className="w-5 h-5 text-[#0754B8] dark:text-[#60A5FA]" />
                      <div>
                        <h2 className="text-base font-bold text-[#10213D] dark:text-white">
                          Portal Notifications
                        </h2>
                        <p className="text-xs text-[#526685] dark:text-[#B8C9E5]">
                          Real-time updates on your applications and document verification.
                        </p>
                      </div>
                    </div>
                  </div>

                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-xs text-[#526685] dark:text-[#B8C9E5]">
                      No new notifications yet. You will be notified here whenever your application or document status changes.
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-200/60 dark:divide-white/10 max-h-72 overflow-y-auto">
                      {notifications.map(n => (
                        <div key={n.id} className="p-4 flex items-start justify-between gap-3">
                          <div>
                            <p className="text-xs font-bold text-[#10213D] dark:text-white">
                              {n.title}
                            </p>
                            <p className="text-xs text-[#526685] dark:text-[#B8C9E5] mt-0.5">
                              {n.message}
                            </p>
                          </div>
                          <span className="text-[11px] text-[#526685] dark:text-[#B8C9E5] tabular-nums shrink-0">
                            {new Date(n.timestamp).toLocaleDateString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="ekr-glass-panel rounded-2xl p-6 space-y-6">
                  <div>
                    <h2 className="text-base font-bold text-slate-900 dark:text-white">
                      Account Settings & Preferences
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Manage your display language, theme, password security, and data privacy.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Globe className="w-4 h-4 text-blue-600" />
                        <div>
                          <p className="text-xs font-bold text-slate-900 dark:text-white">
                            Portal Language
                          </p>
                          <p className="text-[11px] text-slate-500">
                            Choose your preferred display language
                          </p>
                        </div>
                      </div>
                      <select
                        value={language}
                        onChange={e => setLanguage(e.target.value as any)}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white"
                      >
                        {SUPPORTED_LANGUAGES.map(opt => (
                          <option key={opt.code} value={opt.code}>
                            {opt.nativeLabel} ({opt.code.toUpperCase()})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {theme === 'dark' ? (
                          <Moon className="w-4 h-4 text-blue-400" />
                        ) : (
                          <Sun className="w-4 h-4 text-amber-500" />
                        )}
                        <div>
                          <p className="text-xs font-bold text-slate-900 dark:text-white">
                            Display Theme
                          </p>
                          <p className="text-[11px] text-slate-500">
                            Currently {theme === 'dark' ? 'Night (Dark)' : 'Day (Light)'} mode
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={toggleTheme}
                        className="px-3.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                      >
                        Switch Theme
                      </button>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                        Password & Authentication Security
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Send a verified password reset link to {user.email}.
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={sendingResetEmail}
                      onClick={handlePasswordResetRequest}
                      className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 self-start"
                    >
                      {sendingResetEmail ? 'Sending...' : 'Send Password Reset Link'}
                    </button>
                  </div>

                  <form
                    onSubmit={handlePrivacyRequestSubmit}
                    className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3"
                  >
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                      Personal Data & Privacy Request (Korean PIPA / GDPR)
                    </h3>
                    <div className="flex flex-col sm:flex-row gap-2.5">
                      <input
                        type="text"
                        value={privacyRequestText}
                        onChange={e => setPrivacyRequestText(e.target.value)}
                        placeholder="Describe any official record correction or data privacy inquiry..."
                        className="flex-1 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                      />
                      <button
                        type="submit"
                        disabled={submittingPrivacyReq || !privacyRequestText.trim()}
                        className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-semibold disabled:opacity-50"
                      >
                        Submit Request
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* MODAL 1: NEW UNIVERSITY APPLICATION */}
      {showNewAppModal && (
        <div className="fixed inset-0 z-50 bg-[#061B49]/55 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="ekr-glass-modal rounded-2xl max-w-2xl w-full overflow-hidden my-8">
            <div className="p-6 border-b border-slate-200/70 dark:border-white/10 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  University Application Form
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Auto-populated from your saved EveryKR Student Profile & uploaded documents.
                </p>
              </div>
              <button
                onClick={() => setShowNewAppModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
              <div className="p-4 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-blue-800 dark:text-blue-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    Auto-Populated Applicant Profile
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setShowNewAppModal(false);
                      setActiveSection('profile');
                      setIsEditingProfile(true);
                    }}
                    className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Edit Profile Info
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs text-slate-700 dark:text-slate-300">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Applicant</span>
                    <span className="font-semibold">{fullName || user.name}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Nationality</span>
                    <span className="font-semibold">{nationality || 'Not set'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Passport</span>
                    <span className="font-mono font-semibold">{maskedPassportDisplay}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Education / GPA</span>
                    <span className="font-semibold">
                      {highestEducationLevel} {gpaResult ? `(${gpaResult})` : ''}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">English / Korean</span>
                    <span className="font-semibold">
                      {englishProficiency} • {topikLevel}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Attached Docs</span>
                    <span className="font-semibold">{documents.length} uploaded files</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Select Korean University *
                  </label>
                  <select
                    value={selectedUniId}
                    onChange={e => {
                      const nextUni = universities.find(u => u.id === e.target.value);
                      setSelectedUniId(e.target.value);
                      if (nextUni) {
                        setSelectedProgramName(
                          nextUni.programs?.[0] ||
                            nextUni.popularMajors?.[0] ||
                            selectedProgramName
                        );
                      }
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-white"
                  >
                    {universities.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.city || u.region})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Program / Major *
                  </label>
                  <input
                    type="text"
                    value={selectedProgramName}
                    onChange={e => setSelectedProgramName(e.target.value)}
                    placeholder="e.g., Computer Science & Engineering"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-white"
                  />
                  {selectedUniversityObj?.programs &&
                    selectedUniversityObj.programs.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {selectedUniversityObj.programs.slice(0, 4).map(m => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => setSelectedProgramName(m)}
                            className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-blue-950/60"
                          >
                            {m}
                          </button>
                        ))}
                      </div>
                    )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Degree Level *
                  </label>
                  <select
                    value={selectedDegreeLevel}
                    onChange={e => setSelectedDegreeLevel(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-white"
                  >
                    <option value="Korean Language Program (D-4)">
                      Korean Language Program (D-4)
                    </option>
                    <option value="Associate Degree">Associate Degree</option>
                    <option value="Bachelor's Degree">Bachelor's Degree</option>
                    <option value="Master's Degree">Master's Degree</option>
                    <option value="Doctoral Degree (PhD)">Doctoral Degree (PhD)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Preferred Intake / Semester *
                  </label>
                  <select
                    value={selectedIntake}
                    onChange={e => setSelectedIntake(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-white"
                  >
                    <option value="Spring (March) 2027">Spring (March) 2027</option>
                    <option value="Fall (September) 2026">Fall (September) 2026</option>
                    <option value="Fall (September) 2027">Fall (September) 2027</option>
                    <option value="Summer (June) 2027">Summer (June) 2027</option>
                    <option value="Winter (December) 2026">Winter (December) 2026</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Study Plan / Additional Notes (Optional)
                  </label>
                  <textarea
                    rows={3}
                    value={applicantStatement}
                    onChange={e => setApplicantStatement(e.target.value)}
                    placeholder="Briefly mention your academic goals or scholarship interest..."
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3 bg-slate-50/60 dark:bg-slate-900">
              <button
                type="button"
                disabled={isSubmittingApp}
                onClick={() => handleCreateOrSubmitApplication('Draft')}
                className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Save as Draft
              </button>
              <button
                type="button"
                disabled={isSubmittingApp}
                onClick={() => handleCreateOrSubmitApplication('Submitted')}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition"
              >
                {isSubmittingApp ? 'Submitting...' : 'Submit Application'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: APPLICATION STATUS HISTORY */}
      {selectedApplicationDetail && (
        <div className="fixed inset-0 z-50 bg-[#061B49]/55 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="ekr-glass-modal rounded-2xl max-w-lg w-full overflow-hidden">
            <div className="p-5 border-b border-slate-200/70 dark:border-white/10 flex items-center justify-between">
              <div>
                <span className="text-xs font-mono text-slate-500">
                  {selectedApplicationDetail.applicationId}
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {selectedApplicationDetail.universityName}
                </h3>
              </div>
              <button
                onClick={() => setSelectedApplicationDetail(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                  <span className="text-slate-400 block">Program</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {selectedApplicationDetail.programName}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                  <span className="text-slate-400 block">Current Status</span>
                  <span className="font-bold text-blue-600 dark:text-blue-400">
                    {selectedApplicationDetail.status}
                  </span>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                  Application Status History
                </h4>
                <div className="space-y-3">
                  {(selectedApplicationDetail.statusHistory || []).map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 dark:text-white">
                          {item.status}
                        </span>
                        <span className="text-slate-400 tabular-nums">
                          {new Date(item.timestamp).toLocaleString()}
                        </span>
                      </div>
                      {item.note && (
                        <p className="text-slate-600 dark:text-slate-300">{item.note}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: DOCUMENT PREVIEW */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 bg-[#061B49]/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="ekr-glass-modal rounded-2xl max-w-3xl w-full overflow-hidden">
            <div className="p-4 border-b border-slate-200/70 dark:border-white/10 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {previewDoc.category} — {previewDoc.fileName}
                </h3>
                <p className="text-xs text-slate-500">
                  Status: {previewDoc.verificationStatus}
                </p>
              </div>
              <button
                onClick={() => setPreviewDoc(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 bg-slate-100 dark:bg-slate-950 max-h-[75vh] overflow-auto flex items-center justify-center">
              {previewDoc.mimeType.includes('pdf') ? (
                <iframe
                  src={previewDoc.fileUrl || previewDoc.downloadUrl}
                  title={previewDoc.fileName}
                  className="w-full h-[65vh] rounded-lg border-0"
                />
              ) : (
                <img
                  src={previewDoc.fileUrl || previewDoc.downloadUrl}
                  alt={previewDoc.fileName}
                  className="max-h-[65vh] w-auto object-contain rounded-lg"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
