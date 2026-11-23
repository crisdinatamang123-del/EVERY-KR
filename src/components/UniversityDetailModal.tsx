import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  UNVERIFIED_UNIVERSITY_MESSAGE,
  InternationalAdmissionCategoryKey,
  UniversityCampusRecord
} from '../types';
import {
  evaluateUniversityPublicationGate,
  isStrictlyVerifiedUniversity,
  getUniversityStrictStatus
} from '../utils/universityVerification';
import {
  evaluateEightPartChecklistFromUniversity,
  getUniversityDeadlinesFiveTierStatus,
  getUniversityOverallFiveTierStatus,
  getUniversityTuitionFiveTierStatus,
} from '../utils/fiveTierVerification';
import {
  VerificationStatusInline,
  EightPartChecklistGrid,
} from './universities/VerificationStatusInline';
import {
  X,
  MapPin,
  Calendar,
  GraduationCap,
  Award,
  DollarSign,
  Mail,
  Phone,
  ExternalLink,
  Send,
  FileCheck,
  CheckCircle2,
  Bookmark,
  ShieldCheck,
  AlertCircle,
  Building2,
  BookOpen,
  Globe2,
  Users2,
  Scale,
  Clock
} from 'lucide-react';

const ADMISSION_CATEGORY_LABELS: { key: InternationalAdmissionCategoryKey; label: string }[] = [
  { key: 'undergraduateFreshman', label: 'Undergraduate Freshman (학부 신입)' },
  { key: 'undergraduateTransfer', label: 'Undergraduate Transfer (학부 편입)' },
  { key: 'masters', label: "Master's Degree (석사 과정)" },
  { key: 'doctoral', label: 'Doctoral Degree (박사 과정)' },
  { key: 'integratedMastersDoctoral', label: "Integrated Master's & Doctoral (석·박사 통합)" },
  { key: 'koreanLanguageProgram', label: 'Korean Language Programme (한국어 연수 D-4)' },
  { key: 'exchangeProgram', label: 'Exchange / Visiting Student (교환·방문학생)' }
];

export const UniversityDetailModal: React.FC = () => {
  const {
    currentUser,
    selectedUniversity,
    setSelectedUniversity,
    savedUniversityIds,
    toggleSaveUniversity,
    comparedUniversityIds,
    toggleCompareUniversity,
    showToast
  } = useApp();

  const [activeTab, setActiveTab] = useState<'overview' | 'admissions' | 'programs' | 'tuition' | 'support' | 'inquiry'>('overview');
  const [inquiryName, setInquiryName] = useState(currentUser?.name || '');
  const [inquiryEmail, setInquiryEmail] = useState(currentUser?.email || '');
  const [inquiryProgram, setInquiryProgram] = useState('');
  const [inquiryMsg, setInquiryMsg] = useState('');
  const [inquirySent, setInquirySent] = useState(false);
  const [logoImgError, setLogoImgError] = useState(false);

  useEffect(() => {
    setInquiryName(currentUser?.name || '');
    setInquiryEmail(currentUser?.email || '');
    setLogoImgError(false);
  }, [currentUser, selectedUniversity]);

  if (!selectedUniversity) return null;

  const uni = selectedUniversity;
  const isSaved = savedUniversityIds.includes(uni.id);
  const isCompared = comparedUniversityIds.includes(uni.id);
  const gate = evaluateUniversityPublicationGate(uni);
  const strictlyVerified = isStrictlyVerifiedUniversity(uni);
  const strictStatus = getUniversityStrictStatus(uni);
  const overallFiveTier = getUniversityOverallFiveTierStatus(uni);
  const tuitionTier = getUniversityTuitionFiveTierStatus(uni);
  const deadlinesTier = getUniversityDeadlinesFiveTierStatus(uni.relationalBundle?.admissionDeadlines);
  const checklist = evaluateEightPartChecklistFromUniversity(uni);
  const hasVerifiedLogo = Boolean(
    uni.logoVerification?.verified &&
      (uni.logoVerification?.logoUrl || uni.logoUrl) &&
      !logoImgError
  );
  const logoSrc = uni.logoVerification?.logoUrl || uni.logoUrl || '';

  const handleInquirySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inquiryName || !inquiryEmail) {
      showToast('Please fill in your name and email');
      return;
    }
    setInquirySent(true);
    showToast(`Inquiry saved for ${uni.name}`);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#061B49]/55 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="relative w-full max-w-4xl ekr-glass-modal rounded-2xl overflow-hidden my-6 animate-fade-in max-h-[92vh] flex flex-col text-[#10213D] dark:text-white transition-colors">
        
        {/* Header Hero Banner */}
        <div className="relative h-56 sm:h-64 shrink-0 bg-gradient-to-br from-[#0B1B2D] via-[#10243A] to-[#163758]">
          {uni.campusImage && !uni.campusImage.includes('images.unsplash.com') && (
            <img
              src={uni.campusImage}
              alt={uni.name}
              className="w-full h-full object-cover opacity-75"
              referrerPolicy="no-referrer"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = 'none';
              }}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#10243A] via-[#10243A]/60 to-transparent flex flex-col justify-end p-6 text-white">
            <div className="flex items-end gap-4">
              {/* Official Logo or Neutral Unverified Placeholder (Never Random Initials) */}
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white shadow-md border border-slate-200 flex flex-col items-center justify-center p-2 shrink-0">
                {hasVerifiedLogo ? (
                  <img
                    src={logoSrc}
                    alt={`${uni.officialName || uni.name} official logo`}
                    className="w-full h-full object-contain"
                    onError={() => setLogoImgError(true)}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-center">
                    <Building2 className="w-6 h-6 text-slate-400" />
                    <span className="text-[8px] font-bold uppercase tracking-tight text-amber-700 mt-0.5 leading-tight">
                      Logo Unverified
                    </span>
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-200 flex-wrap">
                  <VerificationStatusInline status={overallFiveTier} compact inverseOnDarkHero />
                  <span aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums text-teal-300">
                    {checklist.passedCount}/8 gates
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{uni.type} University</span>
                  <span aria-hidden="true">·</span>
                  <span>{uni.city} ({uni.province || uni.region || 'South Korea'})</span>
                  {uni.rankingVerified && uni.rankingKR && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="text-[#F0B44D] font-mono tabular-nums">
                        Rank #{uni.rankingKR} ({uni.rankingSource || 'Official'})
                      </span>
                    </>
                  )}
                </div>

                <h2 className="text-xl sm:text-2xl font-extrabold text-white mt-1 tracking-tight truncate">
                  {uni.officialName || uni.name}
                </h2>
                <div className="flex items-center gap-3 text-xs text-slate-300 mt-1 flex-wrap">
                  <span className="font-semibold">{uni.koreanName || UNVERIFIED_UNIVERSITY_MESSAGE}</span>
                  {uni.establishedYearVerified && uni.establishedYear && (
                    <span>Est. {uni.establishedYear}</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="absolute top-4 right-4 flex items-center gap-2">
            <button
              onClick={() => toggleCompareUniversity(uni.id)}
              className={`p-2 rounded-full backdrop-blur-md transition-colors cursor-pointer text-xs font-bold flex items-center gap-1 ${
                isCompared ? 'bg-[#19B6A4] text-[#10243A]' : 'bg-white/80 hover:bg-white text-slate-700'
              }`}
              title={isCompared ? 'Remove from compare' : 'Add to compare'}
            >
              <Scale className="w-4 h-4" />
              <span className="hidden sm:inline">{isCompared ? 'Comparing' : 'Compare'}</span>
            </button>

            <button
              onClick={() => toggleSaveUniversity(uni.id)}
              className={`p-2 rounded-full backdrop-blur-md transition-colors cursor-pointer ${
                isSaved ? 'bg-amber-500 text-white' : 'bg-white/80 hover:bg-white text-slate-700'
              }`}
              title={isSaved ? 'Saved in My Universities' : 'Save to My Universities'}
            >
              <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
            </button>

            <button
              onClick={() => setSelectedUniversity(null)}
              className="p-2 rounded-full bg-white/80 hover:bg-white text-slate-700 backdrop-blur-md transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 px-6 pt-3 border-b border-slate-200/60 dark:border-white/12 bg-white/40 dark:bg-white/5 overflow-x-auto text-xs font-semibold text-[#526685] dark:text-[#B8C9E5] shrink-0">
          {([
            ['overview', '1. Overview & Campus'],
            ['programs', '2. International Admissions & Programs'],
            ['admissions', '3. Eligibility & Deadlines'],
            ['tuition', '4. Tuition & Scholarships'],
            ['support', '5. Sources & Contact'],
            ['inquiry', '6. Inquiry']
          ] as const).map(([tabKey, tabLabel]) => (
            <button
              key={tabKey}
              onClick={() => setActiveTab(tabKey)}
              className={`py-2 px-3 border-b-2 cursor-pointer whitespace-nowrap transition-colors ${
                activeTab === tabKey
                  ? 'border-[#0754B8] dark:border-[#60A5FA] text-[#10213D] dark:text-white font-bold'
                  : 'border-transparent hover:text-[#10213D] dark:hover:text-white'
              }`}
            >
              {tabLabel}
            </button>
          ))}
        </div>

        {/* Scrollable Modal Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-[#10213D] dark:text-white">
          
          {!strictlyVerified && (
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold">Publication Gate Status: {strictStatus}</div>
                <p className="mt-0.5 text-amber-800">
                  Only fields verified directly against official university sources are shown as confirmed facts. Unverified fields display: <strong>&ldquo;{UNVERIFIED_UNIVERSITY_MESSAGE}&rdquo;</strong>
                </p>
              </div>
            </div>
          )}

          {/* TAB 1: OVERVIEW, CAMPUS, LOCATION, OFFICIAL WEBSITE */}
          {activeTab === 'overview' && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">
                  1. University Overview
                </h3>
                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                  {uni.description || UNVERIFIED_UNIVERSITY_MESSAGE}
                </p>
              </div>

              <div className="p-4 ekr-glass-subtle rounded-xl">
                <h3 className="text-xs font-bold text-[#526685] dark:text-[#B8C9E5] uppercase tracking-wider mb-2">
                  2. Official Names &amp; Legal Identification
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-[#526685] dark:text-[#B8C9E5] font-medium">Official English Name:</span>
                    <div className="font-bold text-[#10213D] dark:text-white mt-0.5">{uni.officialName || uni.name}</div>
                  </div>
                  <div>
                    <span className="text-[#526685] dark:text-[#B8C9E5] font-medium">Official Korean Name (Hangul):</span>
                    <div className="font-bold text-[#10213D] dark:text-white mt-0.5">{uni.koreanName || UNVERIFIED_UNIVERSITY_MESSAGE}</div>
                  </div>
                  <div>
                    <span className="text-[#526685] dark:text-[#B8C9E5] font-medium">Institution Category:</span>
                    <div className="font-bold text-[#10213D] dark:text-[#DCE8FA] mt-0.5">{uni.type} University</div>
                  </div>
                  <div>
                    <span className="text-[#526685] dark:text-[#B8C9E5] font-medium">Establishment Year:</span>
                    <div className="font-bold text-[#10213D] dark:text-[#DCE8FA] mt-0.5">
                      {uni.establishedYearVerified && uni.establishedYear
                        ? `${uni.establishedYear}`
                        : UNVERIFIED_UNIVERSITY_MESSAGE}
                    </div>
                  </div>
                </div>
              </div>

              {/* Campuses & Addresses */}
              <div className="p-4 ekr-glass-subtle rounded-xl space-y-3">
                <h3 className="text-xs font-bold text-[#526685] dark:text-[#B8C9E5] uppercase tracking-wider flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#0754B8] dark:text-[#60A5FA]" />
                  <span>3. Verified Campuses &amp; Official Addresses</span>
                </h3>
                {(() => {
                  const campusList: UniversityCampusRecord[] = [
                    ...(uni.mainCampusRecord ? [uni.mainCampusRecord] : []),
                    ...(uni.additionalCampuses || [])
                  ];
                  if (campusList.length === 0) {
                    return (
                      <div className="text-xs text-[#526685] dark:text-[#B8C9E5]">
                        <div>English Address: {uni.englishAddress || uni.locationAddress || UNVERIFIED_UNIVERSITY_MESSAGE}</div>
                        <div className="mt-1">Korean Address: {uni.koreanAddress || UNVERIFIED_UNIVERSITY_MESSAGE}</div>
                      </div>
                    );
                  }
                  return (
                    <div className="space-y-2.5">
                      {campusList.map((camp: UniversityCampusRecord, idx: number) => (
                        <div key={idx} className="p-3 ekr-glass-card rounded-xl text-xs space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-[#10213D] dark:text-white">
                              {camp.campusName} {camp.isMainCampus ? '(Main Campus)' : '(Additional Campus)'}
                            </span>
                            <span className="text-[11px] font-semibold text-[#526685] dark:text-[#B8C9E5]">
                              {camp.city}, {camp.province}
                            </span>
                          </div>
                          <div>
                            <span className="text-[#526685] dark:text-[#B8C9E5]">Korean Address: </span>
                            <span className="font-medium text-[#10213D] dark:text-[#DCE8FA]">{camp.koreanAddress || UNVERIFIED_UNIVERSITY_MESSAGE}</span>
                          </div>
                          <div>
                            <span className="text-[#526685] dark:text-[#B8C9E5]">English Address: </span>
                            <span className="font-medium text-[#10213D] dark:text-[#DCE8FA]">{camp.englishAddress || UNVERIFIED_UNIVERSITY_MESSAGE}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>

              {/* Official Websites */}
              <div className="p-4 ekr-glass-subtle rounded-xl">
                <h3 className="text-xs font-bold text-[#526685] dark:text-[#B8C9E5] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Globe2 className="w-3.5 h-3.5 text-[#0754B8] dark:text-[#60A5FA]" />
                  <span>4. Official University Websites &amp; Portals</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-[#526685] dark:text-[#B8C9E5] font-medium">Official University Website:</span>
                    <div className="mt-1">
                      {uni.officialWebsite ? (
                        <a
                          href={uni.officialWebsite}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#0754B8] dark:text-[#60A5FA] font-bold hover:underline inline-flex items-center gap-1 font-mono break-all"
                        >
                          <span>{uni.officialWebsite}</span>
                          <ExternalLink className="w-3 h-3 shrink-0" />
                        </a>
                      ) : (
                        <span className="text-amber-700 dark:text-amber-300 font-medium">{UNVERIFIED_UNIVERSITY_MESSAGE}</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <span className="text-[#526685] dark:text-[#B8C9E5] font-medium">International Admissions Website:</span>
                    <div className="mt-1">
                      {uni.internationalAdmissionsWebsite || uni.internationalOfficeUrl ? (
                        <a
                          href={uni.internationalAdmissionsWebsite || uni.internationalOfficeUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#0754B8] dark:text-[#60A5FA] font-bold hover:underline inline-flex items-center gap-1 font-mono break-all"
                        >
                          <span>{uni.internationalAdmissionsWebsite || uni.internationalOfficeUrl}</span>
                          <ExternalLink className="w-3 h-3 shrink-0" />
                        </a>
                      ) : (
                        <span className="text-amber-700 dark:text-amber-300 font-medium">{UNVERIFIED_UNIVERSITY_MESSAGE}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: INTERNATIONAL ADMISSIONS & ACADEMIC PROGRAMS */}
          {activeTab === 'programs' && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#1769AA]" />
                  <span>International Admission Categories (외국인 특별전형)</span>
                </h3>
                <div className="space-y-2">
                  {ADMISSION_CATEGORY_LABELS.map(({ key, label }) => {
                    const cat = uni.internationalAdmissions?.[key];
                    const isCatVerified = cat?.verificationStatus === 'VERIFIED';
                    return (
                      <div key={key} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-[#10243A]">{label}</span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              isCatVerified
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {isCatVerified
                              ? cat?.available === true
                                ? 'Verified Available'
                                : 'Verified'
                              : UNVERIFIED_UNIVERSITY_MESSAGE}
                          </span>
                        </div>
                        {isCatVerified && cat && (
                          <div className="mt-1.5 text-slate-600 space-y-0.5">
                            {cat.applicationPeriod && <div><strong>Window:</strong> {cat.applicationPeriod}</div>}
                            {cat.eligibilitySummary && <div><strong>Eligibility:</strong> {cat.eligibilitySummary}</div>}
                            {cat.languageRequirements && <div><strong>Language:</strong> {cat.languageRequirements}</div>}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <GraduationCap className="w-3.5 h-3.5 text-[#1769AA]" />
                  <span>Verified Academic Departments &amp; Degree Programmes</span>
                </h3>
                {uni.programsVerified && uni.programs && uni.programs.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {uni.programs.map((p, i) => (
                      <div key={i} className="text-xs font-medium text-slate-800 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
                        {p}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
                    {UNVERIFIED_UNIVERSITY_MESSAGE}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: ADMISSIONS & REQUIREMENTS */}
          {activeTab === 'admissions' && (
            <div className="space-y-6 animate-fade-in">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#1769AA]" />
                  <span>International Admission Eligibility &amp; Language Requirements</span>
                </h3>
                {uni.admissionRequirements?.verified ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-slate-500 font-medium">TOPIK (Korean Track):</span>
                      <div className="font-bold text-[#10243A] mt-0.5">
                        {uni.admissionRequirements.topikLevel || UNVERIFIED_UNIVERSITY_MESSAGE}
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium">English Test (English Track):</span>
                      <div className="font-bold text-[#10243A] mt-0.5">
                        {uni.admissionRequirements.englishTest || UNVERIFIED_UNIVERSITY_MESSAGE}
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium">Academic Eligibility:</span>
                      <div className="font-bold text-slate-700 mt-0.5">
                        {uni.admissionRequirements.minimumGpa || UNVERIFIED_UNIVERSITY_MESSAGE}
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium">Application Fee:</span>
                      <div className="font-bold text-slate-700 mt-0.5">
                        {uni.admissionRequirements.applicationFeeKRW || UNVERIFIED_UNIVERSITY_MESSAGE}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900">
                    {UNVERIFIED_UNIVERSITY_MESSAGE}
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#1769AA]" />
                  <span>Current International Application Deadlines ({uni.deadlines?.intakeYear || '2026–2027'})</span>
                </h3>
                {uni.deadlines?.verified ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl">
                      <span className="font-bold text-blue-900 block text-sm">Spring Semester (March Intake)</span>
                      <div className="text-blue-800 mt-1">
                        {uni.deadlines.springSemester || UNVERIFIED_UNIVERSITY_MESSAGE}
                      </div>
                    </div>
                    <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl">
                      <span className="font-bold text-amber-900 block text-sm">Fall Semester (September Intake)</span>
                      <div className="text-amber-800 mt-1">
                        {uni.deadlines.fallSemester || UNVERIFIED_UNIVERSITY_MESSAGE}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
                    {UNVERIFIED_UNIVERSITY_MESSAGE}
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <FileCheck className="w-3.5 h-3.5 text-[#1769AA]" />
                  <span>Required Application Documents</span>
                </h3>
                {uni.admissionRequirements?.verified &&
                uni.admissionRequirements.requiredDocuments &&
                uni.admissionRequirements.requiredDocuments.length > 0 ? (
                  <ul className="text-xs text-slate-700 space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-200">
                    {uni.admissionRequirements.requiredDocuments.map((doc, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{doc}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
                    {UNVERIFIED_UNIVERSITY_MESSAGE}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: TUITION & SCHOLARSHIPS */}
          {activeTab === 'tuition' && (
            <div className="space-y-6 animate-fade-in">
              <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <h3 className="text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-[#1769AA] dark:text-[#19B6A4]" />
                    <span>Tuition Fees (Per Semester)</span>
                  </h3>
                  <VerificationStatusInline status={tuitionTier} compact />
                </div>

                {typeof uni.tuitionPerSemesterKRW?.min === 'number' &&
                typeof uni.tuitionPerSemesterKRW?.max === 'number' ? (
                  <div className="space-y-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="p-3 bg-white dark:bg-[#10243A] rounded-lg border border-slate-200 dark:border-slate-800">
                        <span className="text-slate-500 dark:text-slate-400">Minimum (Humanities / Social Sciences)</span>
                        <div className="text-sm font-bold text-[#10243A] dark:text-white font-mono tabular-nums mt-0.5">
                          ₩{uni.tuitionPerSemesterKRW.min.toLocaleString()} / sem
                        </div>
                      </div>
                      <div className="p-3 bg-white dark:bg-[#10243A] rounded-lg border border-slate-200 dark:border-slate-800">
                        <span className="text-slate-500 dark:text-slate-400">Maximum (Engineering / Sciences / Arts)</span>
                        <div className="text-sm font-bold text-[#10243A] dark:text-white font-mono tabular-nums mt-0.5">
                          ₩{uni.tuitionPerSemesterKRW.max.toLocaleString()} / sem
                        </div>
                      </div>
                    </div>
                    {tuitionTier === 'Estimated' && (
                      <p className="text-[11px] text-slate-600 dark:text-slate-400">
                        2026–2027 institutional reference range; exact semester invoice varies by college and major.
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="p-3.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200 rounded-lg text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>{UNVERIFIED_UNIVERSITY_MESSAGE}</span>
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5 text-amber-600" />
                  <span>Verified International Scholarships</span>
                </h3>
                {uni.scholarshipsVerified && uni.scholarships && uni.scholarships.length > 0 ? (
                  <div className="space-y-2">
                    {uni.scholarships.map((sch, i) => (
                      <div key={i} className="flex items-start gap-2.5 text-xs text-slate-700 bg-emerald-50/70 border border-emerald-200/60 p-3 rounded-xl">
                        <Award className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <div className="font-bold text-emerald-950">{sch}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
                    {UNVERIFIED_UNIVERSITY_MESSAGE}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 5: SOURCES, PUBLICATION GATE & CONTACT */}
          {activeTab === 'support' && (
            <div className="space-y-6 animate-fade-in">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-[#1769AA]" />
                  <span>Official International Office Contact Information</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500 font-medium">Admissions Email:</span>
                    <div className="font-bold text-[#10243A] font-mono mt-0.5">
                      {uni.contactVerified && uni.contactEmail ? uni.contactEmail : UNVERIFIED_UNIVERSITY_MESSAGE}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium">Admissions Telephone:</span>
                    <div className="font-bold text-slate-800 font-mono mt-0.5">
                      {uni.contactVerified && uni.contactPhone ? uni.contactPhone : UNVERIFIED_UNIVERSITY_MESSAGE}
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2.5">
                <h3 className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  8-Part Verification Completeness Checklist ({checklist.passedCount}/8 Passed)
                </h3>
                <EightPartChecklistGrid
                  checklist={checklist}
                  tuitionTier={tuitionTier}
                  deadlinesTier={deadlinesTier}
                />
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                <h3 className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  12-Point Data Publication Gate Checklist
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {Object.entries(gate)
                    .filter(([k]) => k !== 'allPassed')
                    .map(([k, passed]) => (
                      <div key={k} className="flex items-center justify-between p-2 bg-white dark:bg-[#10243A] rounded border border-slate-200 dark:border-slate-800">
                        <span className="font-mono text-[11px] text-slate-700 dark:text-slate-300">{k}</span>
                        <span className={`font-bold text-[10px] ${passed ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-700 dark:text-amber-300'}`}>
                          {passed ? 'PASS' : 'PENDING'}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: INQUIRY FORM */}
          {activeTab === 'inquiry' && (
            <div className="animate-fade-in space-y-4">
              <div>
                <h3 className="text-sm font-bold text-[#10213D] dark:text-white mb-1">Admission Advisory Inquiry</h3>
                <p className="text-xs text-[#526685] dark:text-[#B8C9E5] leading-relaxed">
                  Submit questions regarding official admission guidelines for {uni.officialName || uni.name}.
                </p>
              </div>

              {inquirySent ? (
                <div className="bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-500/40 text-emerald-900 dark:text-emerald-100 p-5 rounded-xl text-xs space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span className="font-bold text-sm">Inquiry Recorded</span>
                  </div>
                  <p className="text-emerald-800 dark:text-emerald-200">
                    Your inquiry regarding <strong>{uni.name}</strong> has been recorded.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleInquirySubmit} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-[#10213D] dark:text-[#DCE8FA] mb-1">Your Full Name</label>
                      <input
                        type="text"
                        value={inquiryName}
                        onChange={(e) => setInquiryName(e.target.value)}
                        className="ekr-glass-input w-full px-3 py-2 text-xs rounded-xl"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-[#10213D] dark:text-[#DCE8FA] mb-1">Your Email Address</label>
                      <input
                        type="email"
                        value={inquiryEmail}
                        onChange={(e) => setInquiryEmail(e.target.value)}
                        className="ekr-glass-input w-full px-3 py-2 text-xs rounded-xl"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-[#10213D] dark:text-[#DCE8FA] mb-1">Target Program / Department</label>
                    <input
                      type="text"
                      value={inquiryProgram}
                      onChange={(e) => setInquiryProgram(e.target.value)}
                      className="ekr-glass-input w-full px-3 py-2 text-xs rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-[#10213D] dark:text-[#DCE8FA] mb-1">Inquiry Details</label>
                    <textarea
                      rows={3}
                      value={inquiryMsg}
                      onChange={(e) => setInquiryMsg(e.target.value)}
                      className="ekr-glass-input w-full px-3 py-2 text-xs rounded-xl"
                      required
                    />
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setSelectedUniversity(null)}
                      className="px-4 py-2 text-xs font-semibold text-[#526685] dark:text-[#B8C9E5] hover:text-[#10213D] dark:hover:text-white cursor-pointer"
                    >
                      Close
                    </button>
                    <button
                      type="submit"
                      className="ekr-glass-btn-primary flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white rounded-xl transition-all cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Submit Inquiry</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
