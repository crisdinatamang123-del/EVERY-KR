import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import {
  SimApplicationAirport,
  SimApplicationRecord,
  SimApplicationStatus
} from '../types';
import {
  SIM_APPLICATION_CONSENT_VERSION,
  validateSimDocumentFile,
  uploadSimApplicationDocument,
  generateUniqueSimApplicationId,
  submitSimApplicationDoc,
  fetchUserSimApplications
} from '../services/firebaseService';
import {
  Smartphone,
  Plane,
  Calendar,
  Clock,
  Building2,
  User,
  Phone,
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Search,
  ChevronDown,
  X,
  Loader2,
  Lock,
  Sparkles,
  RefreshCw
} from 'lucide-react';

export const ARRIVAL_AIRPORT_OPTIONS: SimApplicationAirport[] = [
  'Incheon International Airport (ICN)',
  'Gimhae International Airport (PUS)',
  'Gimpo International Airport (GMP)',
  'Jeju International Airport (CJU)',
  'Daegu International Airport (TAE)',
  'Cheongju International Airport (CJJ)',
  'Other'
];

const WHATSAPP_COUNTRY_CODES = [
  { code: '+880', label: '+880 (Bangladesh)' },
  { code: '+82', label: '+82 (South Korea)' },
  { code: '+977', label: '+977 (Nepal)' },
  { code: '+92', label: '+92 (Pakistan)' },
  { code: '+91', label: '+91 (India)' },
  { code: '+94', label: '+94 (Sri Lanka)' },
  { code: '+84', label: '+84 (Vietnam)' },
  { code: '+62', label: '+62 (Indonesia)' },
  { code: '+60', label: '+60 (Malaysia)' },
  { code: '+63', label: '+63 (Philippines)' },
  { code: '+86', label: '+86 (China)' },
  { code: '+998', label: '+998 (Uzbekistan)' },
  { code: '+7', label: '+7 (Kazakhstan)' },
  { code: '+976', label: '+976 (Mongolia)' },
  { code: '+1', label: '+1 (USA / Canada)' },
  { code: '+44', label: '+44 (United Kingdom)' }
];

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function getStatusBadgeClass(status: SimApplicationStatus): string {
  switch (status) {
    case 'Pending':
      return 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60';
    case 'Under Review':
      return 'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/60';
    case 'Contacted':
      return 'bg-indigo-50 text-indigo-800 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800/60';
    case 'SIM Arranged':
      return 'bg-teal-50 text-teal-800 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800/60';
    case 'Completed':
      return 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60';
    case 'Rejected':
      return 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/60';
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200';
  }
}

export const ShoppingModule: React.FC = () => {
  const { currentUser, universitiesList, approvedUniversitiesList, showToast } = useApp();

  // Personal & University Information State
  const [fullName, setFullName] = useState<string>('');
  const [universityName, setUniversityName] = useState<string>('');
  const [uniSearchQuery, setUniSearchQuery] = useState<string>('');
  const [isUniDropdownOpen, setIsUniDropdownOpen] = useState<boolean>(false);
  const [whatsappCountryCode, setWhatsappCountryCode] = useState<string>('+880');
  const [whatsappLocalNumber, setWhatsappLocalNumber] = useState<string>('');

  // Arrival Information State
  const [arrivalDate, setArrivalDate] = useState<string>('');
  const [arrivalTime, setArrivalTime] = useState<string>('');
  const [flightNumber, setFlightNumber] = useState<string>('');
  const [arrivalAirport, setArrivalAirport] = useState<SimApplicationAirport | ''>('');

  // Document Upload State
  const [passportFile, setPassportFile] = useState<File | null>(null);
  const [passportPreviewUrl, setPassportPreviewUrl] = useState<string | null>(null);
  const [passportUploadState, setPassportUploadState] = useState<
    'idle' | 'ready' | 'uploading' | 'uploaded' | 'error'
  >('idle');
  const [passportError, setPassportError] = useState<string>('');

  const [flightTicketFile, setFlightTicketFile] = useState<File | null>(null);
  const [flightTicketPreviewUrl, setFlightTicketPreviewUrl] = useState<string | null>(null);
  const [flightTicketUploadState, setFlightTicketUploadState] = useState<
    'idle' | 'ready' | 'uploading' | 'uploaded' | 'error'
  >('idle');
  const [flightTicketError, setFlightTicketError] = useState<string>('');

  // Mandatory Privacy Consent State (Unchecked by default)
  const [consentAccepted, setConsentAccepted] = useState<boolean>(false);

  // Submission & Modal State
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submissionStepText, setSubmissionStepText] = useState<string>('');
  const [formError, setFormError] = useState<string>('');
  const [submittedApplication, setSubmittedApplication] = useState<SimApplicationRecord | null>(
    null
  );
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState<boolean>(false);

  // User's Previous SIM Applications
  const [myApplications, setMyApplications] = useState<SimApplicationRecord[]>([]);
  const [isLoadingMyApps, setIsLoadingMyApps] = useState<boolean>(false);

  const uniDropdownRef = useRef<HTMLDivElement | null>(null);
  const passportInputRef = useRef<HTMLInputElement | null>(null);
  const ticketInputRef = useRef<HTMLInputElement | null>(null);

  // Auto-populate Full Name, University, and Phone from logged-in user profile when available
  useEffect(() => {
    if (!currentUser) return;
    const resolvedName = (currentUser.fullName || currentUser.name || '').trim();
    if (resolvedName && !fullName) {
      setFullName(resolvedName);
    }
    const resolvedUni = (
      currentUser.university ||
      currentUser.preferredUniversity ||
      currentUser.studentAcademicProfile?.currentUniversity ||
      currentUser.studentAcademicProfile?.preferredUniversity ||
      ''
    ).trim();
    if (resolvedUni && !universityName) {
      setUniversityName(resolvedUni);
      setUniSearchQuery(resolvedUni);
    }
    if (currentUser.countryCode && WHATSAPP_COUNTRY_CODES.some(c => c.code === currentUser.countryCode)) {
      setWhatsappCountryCode(currentUser.countryCode);
    }
    const existingPhone = (currentUser.phoneNumber || currentUser.phone || '').trim();
    if (existingPhone && !whatsappLocalNumber) {
      const stripped = existingPhone.replace(/^\+\d{1,4}\s*/, '');
      setWhatsappLocalNumber(stripped);
    }
  }, [currentUser]);

  // Load user's existing SIM applications
  const loadMyApplications = async () => {
    if (!currentUser?.id && !currentUser?.uid) return;
    const uid = currentUser.uid || currentUser.id;
    setIsLoadingMyApps(true);
    try {
      const list = await fetchUserSimApplications(uid);
      setMyApplications(list);
    } finally {
      setIsLoadingMyApps(false);
    }
  };

  useEffect(() => {
    loadMyApplications();
  }, [currentUser?.id, currentUser?.uid]);

  // Close university dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (uniDropdownRef.current && !uniDropdownRef.current.contains(event.target as Node)) {
        setIsUniDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      if (passportPreviewUrl && passportPreviewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(passportPreviewUrl);
      }
      if (flightTicketPreviewUrl && flightTicketPreviewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(flightTicketPreviewUrl);
      }
    };
  }, [passportPreviewUrl, flightTicketPreviewUrl]);

  // Build deduplicated searchable Korean university options
  const universityOptions = useMemo(() => {
    const combined = [
      ...(approvedUniversitiesList || []),
      ...(universitiesList || [])
    ];
    const map = new Map<string, { name: string; koreanName?: string; city?: string }>();
    for (const u of combined) {
      if (!u?.name) continue;
      const key = u.name.trim().toLowerCase();
      if (!map.has(key)) {
        map.set(key, {
          name: u.name.trim(),
          koreanName: u.koreanName,
          city: u.city
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [approvedUniversitiesList, universitiesList]);

  const filteredUniversities = useMemo(() => {
    const q = uniSearchQuery.trim().toLowerCase();
    if (!q) return universityOptions.slice(0, 60);
    return universityOptions
      .filter(
        u =>
          u.name.toLowerCase().includes(q) ||
          (u.koreanName && u.koreanName.toLowerCase().includes(q)) ||
          (u.city && u.city.toLowerCase().includes(q))
      )
      .slice(0, 60);
  }, [universityOptions, uniSearchQuery]);

  // Enforce authentication redirect to /login?redirect=/sim if not logged in
  if (!currentUser) {
    return <Navigate to="/login?redirect=%2Fsim" replace />;
  }

  const handlePassportFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setPassportError('');
    if (!file) {
      setPassportFile(null);
      setPassportPreviewUrl(null);
      setPassportUploadState('idle');
      return;
    }

    const check = validateSimDocumentFile(file, 'Passport');
    if (!check.valid) {
      setPassportFile(null);
      setPassportPreviewUrl(null);
      setPassportUploadState('error');
      setPassportError(check.error || 'Invalid passport file.');
      if (passportInputRef.current) passportInputRef.current.value = '';
      return;
    }

    if (passportPreviewUrl && passportPreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(passportPreviewUrl);
    }
    const nextPreview = file.type.startsWith('image/') ? URL.createObjectURL(file) : null;
    setPassportFile(file);
    setPassportPreviewUrl(nextPreview);
    setPassportUploadState('ready');
  };

  const handleTicketFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setFlightTicketError('');
    if (!file) {
      setFlightTicketFile(null);
      setFlightTicketPreviewUrl(null);
      setFlightTicketUploadState('idle');
      return;
    }

    const check = validateSimDocumentFile(file, 'Air Ticket');
    if (!check.valid) {
      setFlightTicketFile(null);
      setFlightTicketPreviewUrl(null);
      setFlightTicketUploadState('error');
      setFlightTicketError(check.error || 'Invalid air ticket file.');
      if (ticketInputRef.current) ticketInputRef.current.value = '';
      return;
    }

    if (flightTicketPreviewUrl && flightTicketPreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(flightTicketPreviewUrl);
    }
    const nextPreview = file.type.startsWith('image/') ? URL.createObjectURL(file) : null;
    setFlightTicketFile(file);
    setFlightTicketPreviewUrl(nextPreview);
    setFlightTicketUploadState('ready');
  };

  const clearPassportFile = () => {
    if (passportPreviewUrl && passportPreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(passportPreviewUrl);
    }
    setPassportFile(null);
    setPassportPreviewUrl(null);
    setPassportUploadState('idle');
    setPassportError('');
    if (passportInputRef.current) passportInputRef.current.value = '';
  };

  const clearTicketFile = () => {
    if (flightTicketPreviewUrl && flightTicketPreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(flightTicketPreviewUrl);
    }
    setFlightTicketFile(null);
    setFlightTicketPreviewUrl(null);
    setFlightTicketUploadState('idle');
    setFlightTicketError('');
    if (ticketInputRef.current) ticketInputRef.current.value = '';
  };

  const handleSubmitApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setFormError('');

    const cleanFullName = fullName.trim();
    const cleanUniversity = (universityName || uniSearchQuery).trim();
    const cleanLocalPhone = whatsappLocalNumber.replace(/[^\d]/g, '');
    const combinedWhatsapp = `${whatsappCountryCode} ${whatsappLocalNumber.trim()}`.trim();
    const cleanFlight = flightNumber.trim().toUpperCase();

    // 1. Validate all required fields
    if (!cleanFullName || cleanFullName.length < 2) {
      setFormError('Please enter your Full Name.');
      return;
    }
    if (!cleanUniversity || cleanUniversity.length < 2) {
      setFormError('Please select or enter your University Name in South Korea.');
      return;
    }
    if (!cleanLocalPhone || cleanLocalPhone.length < 6) {
      setFormError('Please enter a valid WhatsApp phone number so our team can contact you.');
      return;
    }
    if (!arrivalDate) {
      setFormError('Please select your Arrival Date in South Korea.');
      return;
    }
    if (!arrivalTime) {
      setFormError('Please select your scheduled Arrival Time.');
      return;
    }
    if (!cleanFlight || cleanFlight.length < 2) {
      setFormError('Please enter your Flight Number (e.g., KE604, OZ762).');
      return;
    }
    if (!arrivalAirport) {
      setFormError('Please select your Arrival Airport.');
      return;
    }

    const passportValidation = validateSimDocumentFile(passportFile, 'Passport');
    if (!passportValidation.valid || !passportFile) {
      setFormError(passportValidation.error || 'Please upload a valid Passport copy (PDF, JPG, JPEG, PNG up to 10 MB).');
      return;
    }

    const ticketValidation = validateSimDocumentFile(flightTicketFile, 'Air Ticket');
    if (!ticketValidation.valid || !flightTicketFile) {
      setFormError(ticketValidation.error || 'Please upload a valid Air Ticket copy (PDF, JPG, JPEG, PNG up to 10 MB).');
      return;
    }

    // 2. Verify mandatory privacy consent
    if (!consentAccepted) {
      setFormError('You must accept the mandatory privacy consent checkbox before submitting your application.');
      return;
    }

    // 3. Prevent duplicate submissions while processing
    setIsSubmitting(true);
    const applicationId = generateUniqueSimApplicationId();
    const userId = currentUser.uid || currentUser.id;
    const consentTimestamp = new Date().toISOString();

    try {
      // Upload Passport to Firebase Storage
      setPassportUploadState('uploading');
      setSubmissionStepText('Securely uploading Passport document...');
      const uploadedPassport = await uploadSimApplicationDocument({
        file: passportFile,
        userId,
        applicationId,
        docType: 'passport'
      });
      setPassportUploadState('uploaded');

      // Upload Air Ticket to Firebase Storage
      setFlightTicketUploadState('uploading');
      setSubmissionStepText('Securely uploading Air Ticket document...');
      const uploadedTicket = await uploadSimApplicationDocument({
        file: flightTicketFile,
        userId,
        applicationId,
        docType: 'flight_ticket'
      });
      setFlightTicketUploadState('uploaded');

      // Save application to Firestore `sim_applications` & Backend
      setSubmissionStepText('Saving your Free SIM Application...');
      const savedRecord = await submitSimApplicationDoc({
        applicationId,
        userId,
        userEmail: currentUser.email,
        fullName: cleanFullName,
        universityName: cleanUniversity,
        whatsappNumber: combinedWhatsapp,
        whatsappCountryCode,
        whatsappLocalNumber: whatsappLocalNumber.trim(),
        arrivalDate,
        arrivalTime,
        flightNumber: cleanFlight,
        arrivalAirport,
        passportDocumentURL: uploadedPassport.downloadUrl,
        passportFileName: uploadedPassport.fileName,
        passportMimeType: uploadedPassport.mimeType,
        passportFileSize: uploadedPassport.sizeBytes,
        passportStoragePath: uploadedPassport.storagePath,
        flightTicketDocumentURL: uploadedTicket.downloadUrl,
        flightTicketFileName: uploadedTicket.fileName,
        flightTicketMimeType: uploadedTicket.mimeType,
        flightTicketFileSize: uploadedTicket.sizeBytes,
        flightTicketStoragePath: uploadedTicket.storagePath,
        consentAccepted: true,
        consentVersion: SIM_APPLICATION_CONSENT_VERSION,
        consentTimestamp
      });

      setSubmittedApplication(savedRecord);
      setIsSuccessModalOpen(true);
      setMyApplications(prev => [
        savedRecord,
        ...prev.filter(item => item.applicationId !== savedRecord.applicationId)
      ]);
      showToast(`SIM Application ${savedRecord.applicationId} submitted!`);

      // Reset sensitive document & flight fields after successful submission
      setArrivalDate('');
      setArrivalTime('');
      setFlightNumber('');
      setArrivalAirport('');
      clearPassportFile();
      clearTicketFile();
      setConsentAccepted(false);
    } catch (err: any) {
      setFormError(
        err?.message ||
          'An unexpected error occurred while submitting your SIM application. Please try again.'
      );
      if (passportUploadState === 'uploading') setPassportUploadState('ready');
      if (flightTicketUploadState === 'uploading') setFlightTicketUploadState('ready');
    } finally {
      setIsSubmitting(false);
      setSubmissionStepText('');
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-transparent text-[#10213D] dark:text-white py-10 sm:py-14 transition-colors">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        {/* Hero Header */}
        <div className="bg-gradient-to-br from-[#061B49]/94 via-[#0A255E]/90 to-[#0754B8]/86 backdrop-blur-xl rounded-3xl p-7 sm:p-10 text-white shadow-xl border border-white/18 relative overflow-hidden">
          <div className="relative z-10 max-w-2xl space-y-3.5">
            <div className="inline-flex items-center gap-2">
              <span className="w-4 h-0.5 rounded-full bg-[#FFB800]" aria-hidden="true" />
              <Smartphone className="w-3.5 h-3.5 text-[#FFB800]" />
              <span className="text-[11px] font-extrabold tracking-[0.2em] uppercase text-[#93C5FD]">
                EveryKR Free SIM &amp; Arrival Portal
              </span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
              Will You Arrive in Korea Soon?
            </h1>

            <p className="text-sm sm:text-base text-[#DCE8FA] leading-relaxed">
              Have you applied for your FREE SIM card? Complete your arrival information below, and our team will contact you through WhatsApp.
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-4 text-xs text-[#B8C9E5]">
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#FFB800]" />
                <span>Encrypted Document Upload</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Phone className="w-4 h-4 text-[#93C5FD]" />
                <span>Direct WhatsApp Arrival Coordination</span>
              </span>
            </div>
          </div>
        </div>

        {/* Free SIM Application Form Card */}
        <div className="ekr-glass-panel rounded-3xl overflow-hidden">
          <div className="px-6 py-5 sm:px-8 sm:py-6 border-b border-slate-200/60 dark:border-white/12 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white/40 dark:bg-white/5">
            <div>
              <h2 className="text-lg sm:text-xl font-extrabold text-[#10213D] dark:text-white tracking-tight">
                Free SIM Application
              </h2>
              <p className="text-xs text-[#526685] dark:text-[#B8C9E5] mt-0.5">
                All fields marked with <span className="text-rose-500 font-bold">*</span> are mandatory for SIM reservation and airport coordination.
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50/80 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-500/40 px-3 py-1.5 rounded-xl shrink-0">
              <Lock className="w-3.5 h-3.5" />
              <span>Authenticated as {currentUser.email}</span>
            </span>
          </div>

          <form onSubmit={handleSubmitApplication} className="p-6 sm:p-8 space-y-8" noValidate>
            {formError && (
              <div
                role="alert"
                className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/70 flex items-start gap-3 text-rose-800 dark:text-rose-200 text-xs sm:text-sm"
              >
                <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                <div className="flex-1 font-medium">{formError}</div>
              </div>
            )}

            {/* SECTION A: Personal & University Information */}
            <div className="space-y-5">
              <div className="flex items-center gap-2.5 pb-2 border-b border-slate-200/60 dark:border-white/10">
                <div className="w-7 h-7 rounded-lg ekr-glass-btn-primary text-white flex items-center justify-center text-xs font-extrabold">
                  1
                </div>
                <h3 className="text-sm sm:text-base font-bold text-[#10213D] dark:text-white">
                  Personal &amp; University Information
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* 1. Full Name */}
                <div>
                  <label
                    htmlFor="sim-full-name"
                    className="block text-xs font-bold text-[#10213D] dark:text-[#DCE8FA] mb-1.5"
                  >
                    1. Full Name (As shown on Passport) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-[#526685] dark:text-[#B8C9E5] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="sim-full-name"
                      type="text"
                      required
                      value={fullName}
                      onChange={e => setFullName(e.target.value)}
                      placeholder="Enter your full legal name"
                      className="ekr-glass-input w-full h-11 pl-10 pr-4 rounded-xl text-sm"
                    />
                  </div>
                </div>

                {/* 2. University Name (Searchable university dropdown) */}
                <div ref={uniDropdownRef} className="relative">
                  <label
                    htmlFor="sim-university-search"
                    className="block text-xs font-bold text-[#10213D] dark:text-[#DCE8FA] mb-1.5"
                  >
                    2. University Name <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 text-[#526685] dark:text-[#B8C9E5] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="sim-university-search"
                      type="text"
                      required
                      value={uniSearchQuery}
                      onFocus={() => setIsUniDropdownOpen(true)}
                      onChange={e => {
                        setUniSearchQuery(e.target.value);
                        setUniversityName(e.target.value);
                        setIsUniDropdownOpen(true);
                      }}
                      placeholder="Search or select your Korean university..."
                      className="ekr-glass-input w-full h-11 pl-10 pr-9 rounded-xl text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setIsUniDropdownOpen(prev => !prev)}
                      aria-label="Toggle university list"
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[#526685] dark:text-[#B8C9E5] hover:text-[#10213D] dark:hover:text-white cursor-pointer"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </div>

                  {isUniDropdownOpen && (
                    <div className="ekr-glass-dropdown absolute z-30 mt-1.5 w-full max-h-60 overflow-y-auto rounded-2xl divide-y divide-slate-200/50 dark:divide-white/10">
                      {filteredUniversities.length > 0 ? (
                        filteredUniversities.map(uni => (
                          <button
                            key={uni.name}
                            type="button"
                            onClick={() => {
                              setUniversityName(uni.name);
                              setUniSearchQuery(uni.name);
                              setIsUniDropdownOpen(false);
                            }}
                            className="w-full text-left px-4 py-2.5 hover:bg-white/60 dark:hover:bg-white/10 transition-colors flex items-center justify-between gap-2 cursor-pointer"
                          >
                            <div>
                              <div className="text-xs sm:text-sm font-semibold text-[#10213D] dark:text-white">
                                {uni.name}
                              </div>
                              {(uni.koreanName || uni.city) && (
                                <div className="text-[11px] text-[#526685] dark:text-[#B8C9E5]">
                                  {[uni.koreanName, uni.city].filter(Boolean).join(' · ')}
                                </div>
                              )}
                            </div>
                            {universityName === uni.name && (
                              <CheckCircle2 className="w-4 h-4 text-[#0754B8] dark:text-[#60A5FA] shrink-0" />
                            )}
                          </button>
                        ))
                      ) : (
                        <div className="px-4 py-3 text-xs text-[#526685] dark:text-[#B8C9E5]">
                          Using custom university name: <strong className="text-[#10213D] dark:text-white">"{uniSearchQuery}"</strong>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* 3. WhatsApp Number (Country code selector + phone number) */}
              <div>
                <label
                  htmlFor="sim-whatsapp-number"
                  className="block text-xs font-bold text-[#10213D] dark:text-[#DCE8FA] mb-1.5"
                >
                  3. WhatsApp Number (With Country Code) <span className="text-rose-500">*</span>
                </label>
                <div className="flex flex-col sm:flex-row gap-2.5">
                  <select
                    aria-label="WhatsApp Country Code"
                    value={whatsappCountryCode}
                    onChange={e => setWhatsappCountryCode(e.target.value)}
                    className="ekr-glass-input h-11 sm:w-56 px-3.5 rounded-xl text-sm font-semibold"
                  >
                    {WHATSAPP_COUNTRY_CODES.map(c => (
                      <option key={c.code} value={c.code} className="bg-white dark:bg-[#0B204A]">
                        {c.label}
                      </option>
                    ))}
                  </select>

                  <div className="relative flex-1">
                    <Phone className="w-4 h-4 text-[#526685] dark:text-[#B8C9E5] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="sim-whatsapp-number"
                      type="tel"
                      required
                      value={whatsappLocalNumber}
                      onChange={e => setWhatsappLocalNumber(e.target.value)}
                      placeholder="1712345678"
                      className="ekr-glass-input w-full h-11 pl-10 pr-4 rounded-xl text-sm"
                    />
                  </div>
                </div>
                <p className="text-[11px] text-[#526685] dark:text-[#B8C9E5] mt-1">
                  Ensure this number is active on WhatsApp so our Korea arrival team can reach you directly.
                </p>
              </div>
            </div>

            {/* SECTION B: Arrival Information */}
            <div className="space-y-5">
              <div className="flex items-center gap-2.5 pb-2 border-b border-slate-200/60 dark:border-white/10">
                <div className="w-7 h-7 rounded-lg ekr-glass-btn-primary text-white flex items-center justify-center text-xs font-extrabold">
                  2
                </div>
                <h3 className="text-sm sm:text-base font-bold text-[#10213D] dark:text-white">
                  Arrival Information
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* 4. Arrival Date */}
                <div>
                  <label
                    htmlFor="sim-arrival-date"
                    className="block text-xs font-bold text-[#10213D] dark:text-[#DCE8FA] mb-1.5"
                  >
                    4. Arrival Date <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Calendar className="w-4 h-4 text-[#526685] dark:text-[#B8C9E5] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="sim-arrival-date"
                      type="date"
                      required
                      value={arrivalDate}
                      onChange={e => setArrivalDate(e.target.value)}
                      className="ekr-glass-input w-full h-11 pl-10 pr-4 rounded-xl text-sm"
                    />
                  </div>
                </div>

                {/* 5. Arrival Time */}
                <div>
                  <label
                    htmlFor="sim-arrival-time"
                    className="block text-xs font-bold text-[#10213D] dark:text-[#DCE8FA] mb-1.5"
                  >
                    5. Arrival Time (Korea Local Time) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Clock className="w-4 h-4 text-[#526685] dark:text-[#B8C9E5] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="sim-arrival-time"
                      type="time"
                      required
                      value={arrivalTime}
                      onChange={e => setArrivalTime(e.target.value)}
                      className="ekr-glass-input w-full h-11 pl-10 pr-4 rounded-xl text-sm"
                    />
                  </div>
                </div>

                {/* 6. Flight Number */}
                <div>
                  <label
                    htmlFor="sim-flight-number"
                    className="block text-xs font-bold text-[#10213D] dark:text-[#DCE8FA] mb-1.5"
                  >
                    6. Flight Number <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Plane className="w-4 h-4 text-[#526685] dark:text-[#B8C9E5] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="sim-flight-number"
                      type="text"
                      required
                      value={flightNumber}
                      onChange={e => setFlightNumber(e.target.value.toUpperCase())}
                      placeholder="e.g. KE604, OZ762, BG4092"
                      className="ekr-glass-input w-full h-11 pl-10 pr-4 rounded-xl text-sm font-mono uppercase"
                    />
                  </div>
                </div>

                {/* 7. Arrival Airport */}
                <div>
                  <label
                    htmlFor="sim-arrival-airport"
                    className="block text-xs font-bold text-[#10213D] dark:text-[#DCE8FA] mb-1.5"
                  >
                    7. Arrival Airport <span className="text-rose-500">*</span>
                  </label>
                  <select
                    id="sim-arrival-airport"
                    required
                    value={arrivalAirport}
                    onChange={e => setArrivalAirport(e.target.value as SimApplicationAirport)}
                    className="ekr-glass-input w-full h-11 px-3.5 rounded-xl text-sm"
                  >
                    <option value="" className="bg-white dark:bg-[#0B204A]">Select Arrival Airport...</option>
                    {ARRIVAL_AIRPORT_OPTIONS.map(airport => (
                      <option key={airport} value={airport} className="bg-white dark:bg-[#0B204A]">
                        {airport}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* SECTION C: Document Upload (Passport & Air Ticket) */}
            <div className="space-y-5">
              <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-200/60 dark:border-white/10">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg ekr-glass-btn-primary text-white flex items-center justify-center text-xs font-extrabold">
                    3
                  </div>
                  <h3 className="text-sm sm:text-base font-bold text-[#10213D] dark:text-white">
                    Document Upload
                  </h3>
                </div>
                <span className="text-[11px] font-medium text-[#526685] dark:text-[#B8C9E5]">
                  Accepted: PDF, JPG, JPEG, PNG · Max 10 MB per file
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* 8. Passport Upload */}
                <div className="rounded-2xl ekr-glass-subtle p-4 sm:p-5 flex flex-col justify-between space-y-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <label
                        htmlFor="sim-passport-upload"
                        className="block text-xs sm:text-sm font-bold text-[#10213D] dark:text-white"
                      >
                        8. Passport Upload <span className="text-rose-500">*</span>
                      </label>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Passport biographical page (PDF, JPG, JPEG, PNG · Max 10 MB)
                      </p>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border shrink-0 ${
                        passportUploadState === 'uploaded'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800'
                          : passportUploadState === 'uploading'
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : passportUploadState === 'ready'
                          ? 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/50 dark:text-teal-300 dark:border-teal-800'
                          : passportUploadState === 'error'
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                      }`}
                    >
                      {passportUploadState === 'uploaded'
                        ? 'Uploaded'
                        : passportUploadState === 'uploading'
                        ? 'Uploading...'
                        : passportUploadState === 'ready'
                        ? 'Ready to Submit'
                        : passportUploadState === 'error'
                        ? 'Invalid File'
                        : 'Required'}
                    </span>
                  </div>

                  <input
                    ref={passportInputRef}
                    id="sim-passport-upload"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                    onChange={handlePassportFileSelect}
                    className="hidden"
                  />

                  {passportFile ? (
                    <div className="rounded-xl bg-white dark:bg-[#0F1E36] border border-slate-200 dark:border-slate-700 p-3.5 space-y-3">
                      {passportPreviewUrl ? (
                        <div className="relative w-full h-36 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800">
                          <img
                            src={passportPreviewUrl}
                            alt="Passport Preview"
                            className="w-full h-full object-contain"
                          />
                        </div>
                      ) : (
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/70">
                          <FileText className="w-8 h-8 text-[#1769AA] dark:text-[#19B6A4] shrink-0" />
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-bold text-[#10243A] dark:text-white truncate">
                              PDF Document Attached
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400">
                              Ready for encrypted upload
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-between gap-2 pt-1">
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-[#10243A] dark:text-white truncate">
                            {passportFile.name}
                          </div>
                          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                            {formatFileSize(passportFile.size)} · Verified format
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => passportInputRef.current?.click()}
                            className="px-2.5 py-1 text-xs font-semibold text-[#1769AA] dark:text-[#19B6A4] bg-blue-50 dark:bg-slate-800 rounded-lg hover:opacity-90 cursor-pointer"
                          >
                            Change
                          </button>
                          <button
                            type="button"
                            onClick={clearPassportFile}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded-lg cursor-pointer"
                            title="Remove file"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => passportInputRef.current?.click()}
                      className="w-full py-7 px-4 rounded-xl border-2 border-dashed border-slate-300/80 dark:border-white/20 hover:border-[#0754B8] dark:hover:border-[#60A5FA] bg-white/50 dark:bg-white/5 transition-colors flex flex-col items-center justify-center gap-2 cursor-pointer text-center"
                    >
                      <div className="w-10 h-10 rounded-xl bg-blue-50/80 dark:bg-[#0875E8]/20 text-[#0754B8] dark:text-[#60A5FA] flex items-center justify-center">
                        <Upload className="w-5 h-5" />
                      </div>
                      <div className="text-xs font-bold text-[#10213D] dark:text-white">
                        Click to Upload Passport Copy
                      </div>
                      <div className="text-[11px] text-[#526685] dark:text-[#B8C9E5]">
                        PDF, JPG, JPEG, or PNG (Max 10 MB)
                      </div>
                    </button>
                  )}

                  {passportError && (
                    <p className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                      {passportError}
                    </p>
                  )}
                </div>

                {/* 9. Air Ticket Upload */}
                <div className="rounded-2xl ekr-glass-subtle p-4 sm:p-5 flex flex-col justify-between space-y-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <label
                        htmlFor="sim-ticket-upload"
                        className="block text-xs sm:text-sm font-bold text-[#10213D] dark:text-white"
                      >
                        9. Air Ticket Upload <span className="text-rose-500">*</span>
                      </label>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Confirmed flight e-ticket or itinerary (PDF, JPG, JPEG, PNG · Max 10 MB)
                      </p>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border shrink-0 ${
                        flightTicketUploadState === 'uploaded'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800'
                          : flightTicketUploadState === 'uploading'
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : flightTicketUploadState === 'ready'
                          ? 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/50 dark:text-teal-300 dark:border-teal-800'
                          : flightTicketUploadState === 'error'
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                      }`}
                    >
                      {flightTicketUploadState === 'uploaded'
                        ? 'Uploaded'
                        : flightTicketUploadState === 'uploading'
                        ? 'Uploading...'
                        : flightTicketUploadState === 'ready'
                        ? 'Ready to Submit'
                        : flightTicketUploadState === 'error'
                        ? 'Invalid File'
                        : 'Required'}
                    </span>
                  </div>

                  <input
                    ref={ticketInputRef}
                    id="sim-ticket-upload"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                    onChange={handleTicketFileSelect}
                    className="hidden"
                  />

                  {flightTicketFile ? (
                    <div className="rounded-xl bg-white dark:bg-[#0F1E36] border border-slate-200 dark:border-slate-700 p-3.5 space-y-3">
                      {flightTicketPreviewUrl ? (
                        <div className="relative w-full h-36 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800">
                          <img
                            src={flightTicketPreviewUrl}
                            alt="Air Ticket Preview"
                            className="w-full h-full object-contain"
                          />
                        </div>
                      ) : (
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/70">
                          <FileText className="w-8 h-8 text-[#1769AA] dark:text-[#19B6A4] shrink-0" />
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-bold text-[#10243A] dark:text-white truncate">
                              PDF E-Ticket Attached
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400">
                              Ready for encrypted upload
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-between gap-2 pt-1">
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-[#10243A] dark:text-white truncate">
                            {flightTicketFile.name}
                          </div>
                          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                            {formatFileSize(flightTicketFile.size)} · Verified format
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => ticketInputRef.current?.click()}
                            className="px-2.5 py-1 text-xs font-semibold text-[#1769AA] dark:text-[#19B6A4] bg-blue-50 dark:bg-slate-800 rounded-lg hover:opacity-90 cursor-pointer"
                          >
                            Change
                          </button>
                          <button
                            type="button"
                            onClick={clearTicketFile}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded-lg cursor-pointer"
                            title="Remove file"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => ticketInputRef.current?.click()}
                      className="w-full py-7 px-4 rounded-xl border-2 border-dashed border-slate-300/80 dark:border-white/20 hover:border-[#0754B8] dark:hover:border-[#60A5FA] bg-white/50 dark:bg-white/5 transition-colors flex flex-col items-center justify-center gap-2 cursor-pointer text-center"
                    >
                      <div className="w-10 h-10 rounded-xl bg-blue-50/80 dark:bg-[#0875E8]/20 text-[#0754B8] dark:text-[#60A5FA] flex items-center justify-center">
                        <Upload className="w-5 h-5" />
                      </div>
                      <div className="text-xs font-bold text-[#10213D] dark:text-white">
                        Click to Upload Air Ticket
                      </div>
                      <div className="text-[11px] text-[#526685] dark:text-[#B8C9E5]">
                        PDF, JPG, JPEG, or PNG (Max 10 MB)
                      </div>
                    </button>
                  )}

                  {flightTicketError && (
                    <p className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                      {flightTicketError}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* SECTION D: Mandatory Privacy Consent */}
            <div className="rounded-2xl ekr-glass-subtle p-5 sm:p-6 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-[#10213D] dark:text-[#60A5FA]">
                  <ShieldCheck className="w-4 h-4 text-[#0754B8] dark:text-[#60A5FA]" />
                  <span>Mandatory Privacy &amp; Personal Information Consent</span>
                </div>
                <span className="text-[11px] font-mono text-[#526685] dark:text-[#B8C9E5]">
                  {SIM_APPLICATION_CONSENT_VERSION}
                </span>
              </div>

              <label
                htmlFor="sim-mandatory-consent"
                className="flex items-start gap-3.5 cursor-pointer select-none"
              >
                <input
                  id="sim-mandatory-consent"
                  type="checkbox"
                  required
                  checked={consentAccepted}
                  onChange={e => setConsentAccepted(e.target.checked)}
                  className="mt-1 w-5 h-5 rounded border-slate-300 dark:border-white/30 text-[#0754B8] focus:ring-[#0754B8] cursor-pointer shrink-0"
                />
                <div className="text-xs sm:text-[13px] text-[#526685] dark:text-[#B8C9E5] space-y-2.5 leading-relaxed">
                  <p>
                    I consent to EveryKR collecting and securely processing my personal information, passport copy, flight ticket, and arrival details for the purpose of free SIM card registration and arrival coordination in South Korea.
                  </p>
                  <p>
                    I understand that an authorized EveryKR team member may contact me through WhatsApp regarding my SIM application and arrival arrangements.
                  </p>
                  <p>
                    I understand that my submitted documents will be accessible only to authorized personnel for this specific purpose and handled according to EveryKR&apos;s{' '}
                    <Link
                      to="/privacy"
                      className="font-bold text-[#0754B8] dark:text-[#60A5FA] underline hover:opacity-80"
                    >
                      Privacy Policy
                    </Link>
                    .
                  </p>
                  <p className="font-bold text-[#10213D] dark:text-white">
                    I agree to the collection and processing of my personal information for the purposes stated above. <span className="text-rose-500">*</span>
                  </p>
                </div>
              </label>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full py-4 px-6 rounded-2xl font-extrabold text-sm sm:text-base tracking-wide uppercase transition-all flex items-center justify-center gap-2.5 shadow-lg ${
                  isSubmitting
                    ? 'bg-slate-400/70 dark:bg-slate-700/70 text-white cursor-not-allowed'
                    : 'ekr-glass-btn-primary text-white cursor-pointer'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>{submissionStepText || 'Submitting Application...'}</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5" />
                    <span>SUBMIT SIM APPLICATION</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* User's Submitted SIM Applications History */}
        {myApplications.length > 0 && (
          <div className="ekr-glass-panel rounded-3xl p-6 sm:p-8 space-y-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base sm:text-lg font-extrabold text-[#10213D] dark:text-white">
                  My Free SIM Applications ({myApplications.length})
                </h2>
                <p className="text-xs text-[#526685] dark:text-[#B8C9E5]">
                  Track your submitted arrival details and SIM card arrangement status.
                </p>
              </div>
              <button
                type="button"
                onClick={loadMyApplications}
                disabled={isLoadingMyApps}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold ekr-glass-subtle text-[#10213D] dark:text-white hover:bg-white/80 dark:hover:bg-white/15 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingMyApps ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>

            <div className="divide-y divide-slate-200/60 dark:divide-white/10">
              {myApplications.map(app => (
                <div
                  key={app.applicationId}
                  className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-extrabold text-[#0754B8] dark:text-[#60A5FA] ekr-glass-subtle px-2.5 py-0.5 rounded-lg">
                        {app.applicationId}
                      </span>
                      <span className="text-sm font-bold text-[#10213D] dark:text-white">
                        {app.universityName}
                      </span>
                      <span
                        className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${getStatusBadgeClass(
                          app.applicationStatus
                        )}`}
                      >
                        {app.applicationStatus}
                      </span>
                    </div>
                    <div className="text-xs text-[#526685] dark:text-[#B8C9E5] flex flex-wrap items-center gap-x-4 gap-y-1">
                      <span>
                        Flight: <strong className="font-mono">{app.flightNumber}</strong>
                      </span>
                      <span>
                        Arrival: <strong>{app.arrivalDate}</strong> at <strong>{app.arrivalTime}</strong>
                      </span>
                      <span>Airport: {app.arrivalAirport}</span>
                      <span>WhatsApp: {app.whatsappNumber}</span>
                    </div>
                    <div className="text-[11px] text-[#526685]/80 dark:text-[#B8C9E5]/70">
                      Submitted on{' '}
                      {new Date(app.submissionTimestamp).toLocaleString([], {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* SECTION 6: Success Popup Modal */}
      {isSuccessModalOpen && submittedApplication && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="sim-success-heading"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#061B49]/55 backdrop-blur-sm animate-fadeIn"
        >
          <div className="ekr-glass-modal rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-6 text-center relative">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-500/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div className="space-y-2.5">
              <h2
                id="sim-success-heading"
                className="text-xl sm:text-2xl font-extrabold text-[#10213D] dark:text-white"
              >
                Application Submitted Successfully!
              </h2>

              <p className="text-xs sm:text-sm font-semibold text-[#0754B8] dark:text-[#60A5FA]">
                Thank you for registering with EveryKR.
              </p>

              <p className="text-xs sm:text-sm text-[#526685] dark:text-[#B8C9E5] leading-relaxed">
                Our team will review your application and one of our representatives will contact you through WhatsApp regarding your FREE SIM card and arrival arrangements in South Korea.
              </p>
            </div>

            {/* Application ID & Confirmation Box */}
            <div className="rounded-2xl ekr-glass-subtle p-4 text-left space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[#526685] dark:text-[#B8C9E5]">Application ID:</span>
                <span className="font-mono font-extrabold text-sm text-[#10213D] dark:text-[#60A5FA]">
                  {submittedApplication.applicationId}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#526685] dark:text-[#B8C9E5]">Submission Status:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  Confirmed ({submittedApplication.applicationStatus})
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#526685] dark:text-[#B8C9E5]">Applicant Name:</span>
                <span className="font-semibold text-[#10213D] dark:text-white">
                  {submittedApplication.fullName}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#526685] dark:text-[#B8C9E5]">WhatsApp Contact:</span>
                <span className="font-mono font-semibold text-[#10213D] dark:text-white">
                  {submittedApplication.whatsappNumber}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#526685] dark:text-[#B8C9E5]">Arrival Flight:</span>
                <span className="font-semibold text-[#10213D] dark:text-white">
                  {submittedApplication.flightNumber} · {submittedApplication.arrivalDate} ({submittedApplication.arrivalTime})
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsSuccessModalOpen(false)}
              className="ekr-glass-btn-primary w-full py-3.5 px-6 rounded-xl text-white text-xs sm:text-sm font-extrabold uppercase tracking-wider transition-all cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
