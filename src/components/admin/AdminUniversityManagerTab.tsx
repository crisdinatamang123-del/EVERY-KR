import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  RELATIONAL_BUNDLES_25,
  RELATIONAL_TABLES_25,
  RelationalAdmissionDeadlineRecord,
  ProgramCategoryCode,
} from '../../data/universities25';
import { isApprovedPriorityUniversity } from '../../data/universitiesMaster';
import {
  ALL_FIVE_VERIFICATION_TIERS,
  evaluateEightPartChecklistFromUniversity,
  getDeadlineRoundFiveTierStatus,
  getUniversityDeadlinesFiveTierStatus,
  getUniversityOverallFiveTierStatus,
  getUniversityTuitionFiveTierStatus,
  FiveTierVerificationStatus,
} from '../../utils/fiveTierVerification';
import {
  VerificationStatusInline,
  EightPartChecklistGrid,
} from '../universities/VerificationStatusInline';
import {
  ShieldCheck,
  Search,
  Database,
  Download,
  Edit3,
  Plus,
  AlertCircle,
  ExternalLink,
  Building2,
  Calendar,
  X,
  Save,
} from 'lucide-react';

type AdminScopeFilter = 'priority_25' | 'preserved_archive' | 'all_138';
type AuditFilter =
  | 'all'
  | 'missing_logo'
  | 'missing_photo'
  | 'estimated_tuition'
  | 'not_announced'
  | 'manual_verify';
type RoundStatusOption = RelationalAdmissionDeadlineRecord['roundActiveStatus'];

export const AdminUniversityManagerTab: React.FC = () => {
  const {
    universitiesList,
    updateUniversity,
    saveUniversityDeadlineRound,
    deleteUniversityDeadlineRound,
    syncRelationalUniversityDatabase,
    showToast,
  } = useApp();

  const [scopeTab, setScopeTab] = useState<AdminScopeFilter>('priority_25');
  const [query, setQuery] = useState('');
  const [auditFilter, setAuditFilter] = useState<AuditFilter>('all');
  const [selectedUniId, setSelectedUniId] = useState<string | null>(null);
  const [editorSubTab, setEditorSubTab] = useState<'profile' | 'deadlines' | 'academics'>('deadlines');
  const [isSyncing, setIsSyncing] = useState(false);

  // Profile form states
  const [officialWeb, setOfficialWeb] = useState('');
  const [oiaWeb, setOiaWeb] = useState('');
  const [oiaEmail, setOiaEmail] = useState('');
  const [logoUrlInput, setLogoUrlInput] = useState('');
  const [logoSourceInput, setLogoSourceInput] = useState('');
  const [campusImgInput, setCampusImgInput] = useState('');
  const [verStatusInput, setVerStatusInput] = useState<'VERIFIED' | 'PARTIALLY VERIFIED' | 'PENDING VERIFICATION'>('PARTIALLY VERIFIED');
  const [fiveTierStatusInput, setFiveTierStatusInput] = useState<FiveTierVerificationStatus>(
    'Available, not independently verified'
  );
  const [minTuitionInput, setMinTuitionInput] = useState('');
  const [maxTuitionInput, setMaxTuitionInput] = useState('');
  const [newProgramInput, setNewProgramInput] = useState('');
  const [newScholarshipInput, setNewScholarshipInput] = useState('');
  const [presidentNameInput, setPresidentNameInput] = useState('');
  const [intlOfficeDesignationInput, setIntlOfficeDesignationInput] = useState('');
  const [intlDirectorNameInput, setIntlDirectorNameInput] = useState('');
  const [applyNowUrlInput, setApplyNowUrlInput] = useState('');

  // New / Editing Deadline Round form state
  const [editingRoundId, setEditingRoundId] = useState<string | null>(null);
  const [intakeYear, setIntakeYear] = useState<2026 | 2027>(2027);
  const [semester, setSemester] = useState<RelationalAdmissionDeadlineRecord['intakeSemester']>('Spring (March)');
  const [degreeLevel, setDegreeLevel] = useState<RelationalAdmissionDeadlineRecord['degreeLevel']>('Bachelor');
  const [roundName, setRoundName] = useState<RelationalAdmissionDeadlineRecord['applicationRound']>('Round 1');
  const [roundStatus, setRoundStatus] = useState<RoundStatusOption>('Open / Upcoming');
  const [isApproximate, setIsApproximate] = useState(false);
  const [onlineWindow, setOnlineWindow] = useState('');
  const [bdCutoff, setBdCutoff] = useState('');
  const [dhlUni, setDhlUni] = useState('');
  const [dhlBd, setDhlBd] = useState('');
  const [interviewDate, setInterviewDate] = useState('');
  const [resultDate, setResultDate] = useState('');
  const [paymentDate, setPaymentDate] = useState('');
  const [verifyNote, setVerifyNote] = useState('');

  const enrichedRows = useMemo(() => {
    return universitiesList
      .map((uni) => {
        const isPriority = isApprovedPriorityUniversity(uni);
        const bundle =
          uni.relationalBundle || RELATIONAL_BUNDLES_25.find((b) => b.university.id === uni.id);
        const hasLogo = Boolean(
          (bundle?.logo?.verified && bundle.logo.localAssetPath) || (uni.logoVerified && uni.logoUrl)
        );
        const hasPhoto = Boolean(
          (bundle?.images && bundle.images.some((i) => i.verified && i.localOrOfficialUrl)) ||
            (uni.campusImage &&
              !uni.campusImage.includes('unsplash.com') &&
              !uni.campusImage.includes('university_campus_seoul_'))
        );
        const rounds = bundle?.admissionDeadlines || [];
        const hasAnnounced = rounds.some((r) => r.roundActiveStatus !== 'Not Announced');
        const hasManualFlag = rounds.some((r) => r.flaggedForManualVerification);
        const completeness = bundle?.completeness.overallPercentage ?? uni.completenessPercentage ?? 0;
        const checklist = evaluateEightPartChecklistFromUniversity(uni, bundle);
        const fiveTierStatus = getUniversityOverallFiveTierStatus(uni);
        const tuitionTier = getUniversityTuitionFiveTierStatus(uni);
        const deadlinesTier = getUniversityDeadlinesFiveTierStatus(rounds);
        return {
          uni,
          isPriority,
          bundle,
          hasLogo,
          hasPhoto,
          rounds,
          hasAnnounced,
          hasManualFlag,
          completeness,
          checklist,
          fiveTierStatus,
          tuitionTier,
          deadlinesTier,
        };
      })
      .sort((a, b) => {
        if (a.isPriority !== b.isPriority) return a.isPriority ? -1 : 1;
        if (a.isPriority && b.isPriority) return (a.uni.whitelistOrder || 99) - (b.uni.whitelistOrder || 99);
        return a.uni.name.localeCompare(b.uni.name);
      });
  }, [universitiesList]);

  const stats = useMemo(() => {
    const priorityRows = enrichedRows.filter((r) => r.isPriority);
    const archiveRows = enrichedRows.filter((r) => !r.isPriority);
    const priorityTotal = priorityRows.length;
    const archiveTotal = archiveRows.length;
    const logos = priorityRows.filter((r) => r.hasLogo).length;
    const photos = priorityRows.filter((r) => r.hasPhoto).length;
    const announced = priorityRows.filter((r) => r.hasAnnounced).length;
    const exactTuition = priorityRows.filter((r) => r.tuitionTier === 'Officially verified').length;
    const estimatedTuition = priorityRows.filter((r) => r.tuitionTier === 'Estimated').length;
    const fullEightGates = priorityRows.filter((r) => r.checklist.passedCount === 8).length;
    const avgComp =
      priorityTotal > 0 ? Math.round(priorityRows.reduce((s, r) => s + r.completeness, 0) / priorityTotal) : 0;
    return {
      priorityTotal,
      archiveTotal,
      totalAll: enrichedRows.length,
      logos,
      photos,
      announced,
      exactTuition,
      estimatedTuition,
      fullEightGates,
      avgComp,
    };
  }, [enrichedRows]);

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return enrichedRows.filter((row) => {
      if (scopeTab === 'priority_25' && !row.isPriority) return false;
      if (scopeTab === 'preserved_archive' && row.isPriority) return false;
      if (auditFilter === 'missing_logo' && row.hasLogo) return false;
      if (auditFilter === 'missing_photo' && row.hasPhoto) return false;
      if (auditFilter === 'estimated_tuition' && row.tuitionTier !== 'Estimated') return false;
      if (auditFilter === 'not_announced' && row.hasAnnounced) return false;
      if (auditFilter === 'manual_verify' && !row.hasManualFlag) return false;
      if (!q) return true;
      return (
        row.uni.name.toLowerCase().includes(q) ||
        row.uni.koreanName.toLowerCase().includes(q) ||
        row.uni.id.toLowerCase().includes(q) ||
        row.uni.city.toLowerCase().includes(q)
      );
    });
  }, [enrichedRows, scopeTab, query, auditFilter]);

  const selectedEntry = useMemo(
    () => enrichedRows.find((r) => r.uni.id === selectedUniId) || null,
    [enrichedRows, selectedUniId]
  );

  const resetRoundForm = () => {
    setEditingRoundId(null);
    setIntakeYear(2027);
    setSemester('Spring (March)');
    setDegreeLevel('Bachelor');
    setRoundName('Round 1');
    setRoundStatus('Open / Upcoming');
    setIsApproximate(false);
    setOnlineWindow('');
    setBdCutoff('');
    setDhlUni('');
    setDhlBd('');
    setInterviewDate('');
    setResultDate('');
    setPaymentDate('');
    setVerifyNote('');
  };

  const openEditor = (uniId: string, defaultTab: 'profile' | 'deadlines' | 'academics' = 'deadlines') => {
    const found = enrichedRows.find((r) => r.uni.id === uniId);
    if (!found) return;
    setSelectedUniId(uniId);
    setEditorSubTab(defaultTab);
    setOfficialWeb(found.uni.officialWebsite || '');
    setOiaWeb(found.uni.internationalOfficeUrl || '');
    setOiaEmail(found.uni.contactEmail || '');
    setLogoUrlInput(found.uni.logoUrl || '');
    setLogoSourceInput(found.uni.logoSourceUrl || '');
    setCampusImgInput(found.uni.campusImage || '');
    setVerStatusInput((found.uni.verificationStatus as any) || 'PARTIALLY VERIFIED');
    setFiveTierStatusInput(found.fiveTierStatus);
    setMinTuitionInput(found.uni.tuitionPerSemesterKRW?.min ? String(found.uni.tuitionPerSemesterKRW.min) : '');
    setMaxTuitionInput(found.uni.tuitionPerSemesterKRW?.max ? String(found.uni.tuitionPerSemesterKRW.max) : '');
    setPresidentNameInput(found.uni.leadership?.presidentName || '');
    setIntlOfficeDesignationInput(
      found.uni.leadership?.internationalOfficeDesignation ||
        found.bundle?.contacts?.internationalOfficeName ||
        ''
    );
    setIntlDirectorNameInput(found.uni.leadership?.internationalDirectorName || '');
    setApplyNowUrlInput(found.uni.applyNowUrl || found.uni.internationalOfficeUrl || '');
    resetRoundForm();
  };

  const loadRoundForEdit = (r: RelationalAdmissionDeadlineRecord) => {
    setEditingRoundId(r.id);
    setIntakeYear(r.intakeYear);
    setSemester(r.intakeSemester);
    setDegreeLevel(r.degreeLevel);
    setRoundName(r.applicationRound);
    setRoundStatus(r.roundActiveStatus);
    setIsApproximate(r.isApproximate);
    setOnlineWindow(r.onlineApplicationRaw || '');
    setBdCutoff(r.bangladeshTimeDeadline || '');
    setDhlUni(r.dhlDeadlineUniversity || '');
    setDhlBd(r.dhlDeadlineBangladeshOffice || '');
    setInterviewDate(r.interviewDate || '');
    setResultDate(r.admissionResultDate || '');
    setPaymentDate(r.paymentDeadline || '');
    setVerifyNote(r.manualVerificationNote || '');
  };

  const handleSaveProfile = async () => {
    if (!selectedEntry) return;
    const { uni } = selectedEntry;
    const minKrw = Number(minTuitionInput) || uni.tuitionPerSemesterKRW?.min || 0;
    const maxKrw = Number(maxTuitionInput) || uni.tuitionPerSemesterKRW?.max || minKrw;
    const hasLogoNow = Boolean(logoUrlInput.trim());

    await updateUniversity(uni.id, {
      officialWebsite: officialWeb.trim(),
      officialWebsiteVerified: Boolean(officialWeb.trim()),
      internationalOfficeUrl: oiaWeb.trim(),
      internationalAdmissionsVerified: Boolean(oiaWeb.trim()),
      contactEmail: oiaEmail.trim(),
      contactVerified: Boolean(oiaEmail.trim()),
      logoUrl: logoUrlInput.trim() || undefined,
      logoSourceUrl: logoSourceInput.trim() || undefined,
      logoVerified: hasLogoNow,
      logoVerification: {
        logoUrl: logoUrlInput.trim(),
        officialSourceUrl: logoSourceInput.trim() || officialWeb.trim(),
        sourcePageUrl: officialWeb.trim(),
        retrievalDate: new Date().toISOString().slice(0, 10),
        verified: hasLogoNow,
        verificationStatus: hasLogoNow ? 'VERIFIED' : 'NOT OFFICIALLY VERIFIED',
      },
      campusImage: campusImgInput.trim(),
      verificationStatus: verStatusInput,
      fiveTierVerificationStatus: fiveTierStatusInput,
      verified: verStatusInput === 'VERIFIED' || fiveTierStatusInput === 'Officially verified',
      tuitionPerSemesterKRW: minKrw > 0 ? { min: minKrw, max: Math.max(minKrw, maxKrw) } : uni.tuitionPerSemesterKRW,
      tuitionVerified: minKrw > 0 ? true : uni.tuitionVerified,
      applyNowUrl: applyNowUrlInput.trim() || undefined,
      leadership: {
        presidentName: presidentNameInput.trim() || undefined,
        presidentTitle: 'University President (총장)',
        internationalOfficeDesignation: intlOfficeDesignationInput.trim() || undefined,
        internationalDirectorName: intlDirectorNameInput.trim() || undefined,
        internationalDirectorTitle: 'Dean / Director of International Affairs',
        verified: Boolean(presidentNameInput.trim() || intlDirectorNameInput.trim()),
        sourceUrl: oiaWeb.trim() || officialWeb.trim(),
      },
      lastVerifiedAt: new Date().toISOString().slice(0, 10),
    });
    showToast(`Saved profile, leadership & 5-tier verification updates for ${uni.officialName || uni.name}`);
  };

  const mapLevelToCategory = (lvl: RelationalAdmissionDeadlineRecord['degreeLevel']): ProgramCategoryCode => {
    if (lvl === 'Masters') return 'Master';
    return lvl;
  };

  const handleSaveRound = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEntry) return;
    const id = editingRoundId || `${selectedEntry.uni.id}-${intakeYear}-${Date.now()}`;
    const row: RelationalAdmissionDeadlineRecord = {
      id,
      universityId: selectedEntry.uni.id,
      intakeYear,
      intakeSemester: semester,
      intakeLabel: `${semester} ${intakeYear}`,
      degreeLevel,
      programCategory: mapLevelToCategory(degreeLevel),
      applicationRound: roundName,
      roundActiveStatus: roundStatus,
      isApproximate,
      flaggedForManualVerification: Boolean(verifyNote.trim()),
      manualVerificationNote: verifyNote.trim() || undefined,
      fileCollectionStartDate: 'Not Announced',
      fileCollectionEndDate: 'Not Announced',
      fileCollectionRaw: 'Not Announced',
      onlineApplicationStartDate: onlineWindow.trim() || 'Not Announced',
      onlineApplicationDeadline: onlineWindow.trim() || 'Not Announced',
      onlineApplicationRaw: onlineWindow.trim() || 'Not Announced',
      bangladeshTimeDeadline: bdCutoff.trim() || 'Not Announced',
      dhlDeadlineUniversity: dhlUni.trim() || 'Not Announced',
      dhlDeadlineBangladeshOffice: dhlBd.trim() || 'Not Announced',
      interviewDate: interviewDate.trim() || 'Not Announced',
      interviewFormat: 'Confirm via Official Prospectus',
      documentScreeningDate: 'Not Announced',
      admissionResultDate: resultDate.trim() || 'Not Announced',
      additionalDocumentDeadline: 'Not Announced',
      paymentDeadline: paymentDate.trim() || 'Not Announced',
      semesterStartingDate: semester === 'Spring (March)' ? `March ${intakeYear}` : `September ${intakeYear}`,
      sourceDocument: 'Admin Verified Schedule Update',
      sourceUrl: selectedEntry.uni.internationalOfficeUrl || selectedEntry.uni.officialWebsite || '',
      verificationStatus: roundStatus === 'Not Announced' ? 'Needs Verification' : 'Verified',
      lastVerifiedDate: new Date().toISOString().slice(0, 10),
    };
    await saveUniversityDeadlineRound(row);
    resetRoundForm();
  };

  const handleAddProgramOrScholarship = async (kind: 'program' | 'scholarship') => {
    if (!selectedEntry) return;
    const { uni } = selectedEntry;
    if (kind === 'program' && newProgramInput.trim()) {
      const updatedPrograms = Array.from(new Set([...(uni.programs || []), newProgramInput.trim()]));
      await updateUniversity(uni.id, { programs: updatedPrograms, programsVerified: true });
      setNewProgramInput('');
      showToast(`Added program to ${uni.name}`);
    } else if (kind === 'scholarship' && newScholarshipInput.trim()) {
      const updatedSch = Array.from(new Set([...(uni.scholarships || []), newScholarshipInput.trim()]));
      await updateUniversity(uni.id, { scholarships: updatedSch, scholarshipVerified: true, scholarshipsVerified: true });
      setNewScholarshipInput('');
      showToast(`Added scholarship to ${uni.name}`);
    }
  };

  const handleExportRelationalDb = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      whitelistCount: 25,
      tables: RELATIONAL_TABLES_25,
      liveUniversitiesSnapshot: universitiesList,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `everykr-25-universities-15-tables-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    showToast('Exported 15-table relational database JSON');
  };

  return (
    <div className="space-y-6">
      {/* Header & Cloud Sync Controls */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              <span>25-University Priority Directory &amp; Preserved 136-Backup Store</span>
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Non-destructive store: 25 Approved Priority Universities managed across 15 relational tables + {stats.archiveTotal} Historical Archive records preserved intact (0 deleted).
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              disabled={isSyncing}
              onClick={async () => {
                setIsSyncing(true);
                try {
                  await syncRelationalUniversityDatabase();
                } finally {
                  setIsSyncing(false);
                }
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-[#10243A] hover:bg-[#1769AA] rounded-lg cursor-pointer disabled:opacity-50"
            >
              <Database className="w-3.5 h-3.5" />
              <span>{isSyncing ? 'Syncing 15 Tables...' : 'Sync 15 Tables to Firestore'}</span>
            </button>

            <button
              type="button"
              onClick={handleExportRelationalDb}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Full Backup &amp; 15-Table JSON</span>
            </button>
          </div>
        </div>

        {/* KPI Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <div className="text-slate-500">Priority Directory</div>
            <div className="text-lg font-extrabold text-[#10243A] font-mono tabular-nums mt-0.5">{stats.priorityTotal} / 25</div>
            <div className="text-[11px] text-emerald-700 mt-0.5">{stats.archiveTotal} preserved in archive (0 deleted)</div>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <div className="text-slate-500">Official Logos (Priority 25)</div>
            <div className="text-lg font-extrabold text-[#1769AA] font-mono tabular-nums mt-0.5">{stats.logos} / 25</div>
            <div className="text-[11px] text-amber-700 mt-0.5">{25 - stats.logos} missing verified logo</div>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <div className="text-slate-500">Verified Campus Photos</div>
            <div className="text-lg font-extrabold text-teal-700 font-mono tabular-nums mt-0.5">{stats.photos} / 25</div>
            <div className="text-[11px] text-amber-700 mt-0.5">{25 - stats.photos} missing campus photo</div>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <div className="text-slate-500">Verified Tuition Schedules</div>
            <div className="text-lg font-extrabold text-sky-700 font-mono tabular-nums mt-0.5">{stats.exactTuition} / 25</div>
            <div className="text-[11px] text-slate-600 mt-0.5">{stats.estimatedTuition} Estimated reference range</div>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <div className="text-slate-500">March 2027 Schedules</div>
            <div className="text-lg font-extrabold text-indigo-700 font-mono tabular-nums mt-0.5">{stats.announced} / 25</div>
            <div className="text-[11px] text-slate-500 mt-0.5">{25 - stats.announced} Not announced</div>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <div className="text-slate-500">Priority Avg. Completeness</div>
            <div className="text-lg font-extrabold text-emerald-700 font-mono tabular-nums mt-0.5">{stats.avgComp}%</div>
            <div className="text-[11px] text-slate-500 mt-0.5">{stats.fullEightGates}/25 pass all 8/8 gates</div>
          </div>
        </div>

        {/* Scope Selector + Search & Audit Filter Tabs */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            {[
              { id: 'priority_25', label: `Approved 25 Priority (${stats.priorityTotal})` },
              { id: 'preserved_archive', label: `Preserved Historical Archive (${stats.archiveTotal})` },
              { id: 'all_138', label: `All Preserved Records (${stats.totalAll})` },
            ].map((sc) => (
              <button
                key={sc.id}
                type="button"
                onClick={() => setScopeTab(sc.id as AdminScopeFilter)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors whitespace-nowrap shrink-0 ${
                  scopeTab === sc.id
                    ? 'bg-[#1769AA] text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {sc.label}
              </button>
            ))}
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by English/Korean name, slug, or city..."
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:border-[#1769AA]"
              />
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              {[
                { id: 'all', label: 'All in Scope' },
                { id: 'missing_logo', label: `Missing Logo (${25 - stats.logos} in P25)` },
                { id: 'missing_photo', label: `Missing Photo (${25 - stats.photos} in P25)` },
                { id: 'estimated_tuition', label: `Estimated Tuition (${stats.estimatedTuition} in P25)` },
                { id: 'not_announced', label: `Not Announced (${25 - stats.announced} in P25)` },
                { id: 'manual_verify', label: 'Manual Check Flagged' },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setAuditFilter(f.id as AuditFilter)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors whitespace-nowrap shrink-0 ${
                    auditFilter === f.id
                      ? 'bg-[#10243A] text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Selected University Drawer / Inline Editor */}
      {selectedEntry && (
        <div className="bg-white rounded-xl border-2 border-[#1769AA] shadow-md overflow-hidden">
          <div className="px-6 py-4 bg-[#10243A] text-white flex items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-[11px] text-teal-300 font-mono tabular-nums flex-wrap">
                <span>
                  Editing {selectedEntry.isPriority ? `Whitelist #${selectedEntry.uni.whitelistOrder}` : 'Preserved Archive'} · {selectedEntry.uni.id}
                </span>
                <span aria-hidden="true">·</span>
                <VerificationStatusInline status={selectedEntry.fiveTierStatus} compact inverseOnDarkHero />
                <span aria-hidden="true">·</span>
                <span>
                  {selectedEntry.completeness}% ({selectedEntry.checklist.passedCount}/8 gates)
                </span>
              </div>
              <h3 className="text-base font-bold mt-0.5">
                {selectedEntry.uni.officialName || selectedEntry.uni.name} ({selectedEntry.uni.koreanName})
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setSelectedUniId(null)}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="px-6 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
            {[
              { id: 'deadlines', label: `1. Admission Deadlines (${selectedEntry.rounds.length} Rounds)` },
              { id: 'profile', label: '2. Branding, Media & Verification' },
              { id: 'academics', label: '3. Programs, Tuition & Scholarships' },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setEditorSubTab(t.id as any)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                  editorSubTab === t.id ? 'bg-[#1769AA] text-white' : 'text-slate-600 hover:bg-slate-200'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="p-6 space-y-6 text-xs">
            {editorSubTab === 'deadlines' && (
              <div className="space-y-6">
                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                      <tr>
                        <th className="p-3 font-semibold">Intake &amp; Track</th>
                        <th className="p-3 font-semibold">Round</th>
                        <th className="p-3 font-semibold">Online Window &amp; BD Cutoff</th>
                        <th className="p-3 font-semibold">DHL / Interview / Result</th>
                        <th className="p-3 font-semibold">Round Status</th>
                        <th className="p-3 font-semibold">5-Tier Verification</th>
                        <th className="p-3 font-semibold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedEntry.rounds.map((r) => (
                        <tr key={r.id} className="hover:bg-slate-50/70">
                          <td className="p-3 font-semibold text-slate-900">
                            {r.intakeSemester} {r.intakeYear} · {r.degreeLevel}
                          </td>
                          <td className="p-3 font-mono tabular-nums">
                            {r.applicationRound} {r.isApproximate ? '(Approx.)' : ''}
                          </td>
                          <td className="p-3 font-mono tabular-nums">
                            <div>{r.onlineApplicationRaw}</div>
                            {r.bangladeshTimeDeadline && (
                              <div className="text-[11px] text-slate-500">BD: {r.bangladeshTimeDeadline}</div>
                            )}
                          </td>
                          <td className="p-3 text-slate-600 font-mono tabular-nums">
                            DHL: {r.dhlDeadlineUniversity || '—'} · Int: {r.interviewDate || '—'} · Res: {r.admissionResultDate || '—'}
                          </td>
                          <td className="p-3 font-semibold text-slate-700">{r.roundActiveStatus}</td>
                          <td className="p-3">
                            <VerificationStatusInline status={getDeadlineRoundFiveTierStatus(r)} compact />
                          </td>
                          <td className="p-3 text-right space-x-2 whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => loadRoundForEdit(r)}
                              className="text-[#1769AA] font-semibold hover:underline cursor-pointer"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteUniversityDeadlineRound(r.id, selectedEntry.uni.id)}
                              className="text-rose-600 font-semibold hover:underline cursor-pointer"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Add / Update Round Form */}
                <form onSubmit={handleSaveRound} className="p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-[#1769AA]" />
                      <span>{editingRoundId ? `Updating Round (${editingRoundId})` : 'Add Independent Admission Round (2027 / 2026 Separated)'}</span>
                    </h4>
                    {editingRoundId && (
                      <button type="button" onClick={resetRoundForm} className="text-slate-500 underline cursor-pointer">
                        Cancel Edit
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Intake Year</label>
                      <select
                        value={intakeYear}
                        onChange={(e) => setIntakeYear(Number(e.target.value) as 2026 | 2027)}
                        className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300"
                      >
                        <option value={2027}>2027 (Spring/Fall 2027)</option>
                        <option value={2026}>2026 (Historical/Prior)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Semester</label>
                      <select
                        value={semester}
                        onChange={(e) => setSemester(e.target.value as any)}
                        className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300"
                      >
                        <option value="Spring (March)">Spring (March)</option>
                        <option value="Fall (September)">Fall (September)</option>
                        <option value="Summer / Winter (Language)">Summer / Winter (Language)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Degree Level</label>
                      <select
                        value={degreeLevel}
                        onChange={(e) => setDegreeLevel(e.target.value as any)}
                        className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300"
                      >
                        <option value="Bachelor">Bachelor</option>
                        <option value="Masters">Masters</option>
                        <option value="PhD">PhD</option>
                        <option value="EAP">EAP (English Track)</option>
                        <option value="Associate">Associate</option>
                        <option value="KLP">KLP (Language)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Round</label>
                      <select
                        value={roundName}
                        onChange={(e) => setRoundName(e.target.value as any)}
                        className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300"
                      >
                        <option value="Round 1">Round 1</option>
                        <option value="Round 2">Round 2</option>
                        <option value="Round 3">Round 3</option>
                        <option value="General Recruitment">General Recruitment</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Status</label>
                      <select
                        value={roundStatus}
                        onChange={(e) => setRoundStatus(e.target.value as RoundStatusOption)}
                        className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300"
                      >
                        <option value="Open / Upcoming">Open / Upcoming</option>
                        <option value="Closed in Sheet (Strikethrough)">Closed in Sheet (Strikethrough)</option>
                        <option value="No Recruitment (X)">No Recruitment (X)</option>
                        <option value="Not Announced">Not Announced</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Online Application Window</label>
                      <input
                        type="text"
                        value={onlineWindow}
                        onChange={(e) => setOnlineWindow(e.target.value)}
                        placeholder="e.g., 2026.10.05 – 2026.11.12"
                        className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">BD Time Cutoff</label>
                      <input
                        type="text"
                        value={bdCutoff}
                        onChange={(e) => setBdCutoff(e.target.value)}
                        placeholder="e.g., 2:00 PM BD Time"
                        className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">DHL University Deadline</label>
                      <input
                        type="text"
                        value={dhlUni}
                        onChange={(e) => setDhlUni(e.target.value)}
                        placeholder="e.g., 2026.11.20"
                        className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">DHL BD Office Deadline</label>
                      <input
                        type="text"
                        value={dhlBd}
                        onChange={(e) => setDhlBd(e.target.value)}
                        placeholder="e.g., 2026.11.14"
                        className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Interview Date</label>
                      <input
                        type="text"
                        value={interviewDate}
                        onChange={(e) => setInterviewDate(e.target.value)}
                        placeholder="e.g., 2026.12.03"
                        className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Result Date</label>
                      <input
                        type="text"
                        value={resultDate}
                        onChange={(e) => setResultDate(e.target.value)}
                        placeholder="e.g., 2026.12.18"
                        className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Tuition Payment Window</label>
                      <input
                        type="text"
                        value={paymentDate}
                        onChange={(e) => setPaymentDate(e.target.value)}
                        placeholder="e.g., Jan 2027"
                        className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                    <div className="flex items-center gap-4 flex-wrap">
                      <label className="inline-flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isApproximate}
                          onChange={(e) => setIsApproximate(e.target.checked)}
                        />
                        <span>Mark dates as (Approx.)</span>
                      </label>
                      <input
                        type="text"
                        value={verifyNote}
                        onChange={(e) => setVerifyNote(e.target.value)}
                        placeholder="Optional manual verification note..."
                        className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 w-72"
                      />
                    </div>
                    <button
                      type="submit"
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#10243A] hover:bg-[#1769AA] text-white font-bold cursor-pointer"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{editingRoundId ? 'Update Deadline Round' : 'Save New Round'}</span>
                    </button>
                  </div>
                </form>
              </div>
            )}

            {editorSubTab === 'profile' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Official University Website</label>
                    <input
                      type="url"
                      value={officialWeb}
                      onChange={(e) => setOfficialWeb(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-300"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Official OIA / Admissions Portal</label>
                    <input
                      type="url"
                      value={oiaWeb}
                      onChange={(e) => setOiaWeb(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-300"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Official OIA Contact Email</label>
                    <input
                      type="email"
                      value={oiaEmail}
                      onChange={(e) => setOiaEmail(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-300"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Verified Official Logo URL / Path</label>
                    <input
                      type="text"
                      value={logoUrlInput}
                      onChange={(e) => setLogoUrlInput(e.target.value)}
                      placeholder="/assets/university-logos/..."
                      className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-300"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Logo Official Source URL</label>
                    <input
                      type="text"
                      value={logoSourceInput}
                      onChange={(e) => setLogoSourceInput(e.target.value)}
                      placeholder="https://...ac.kr"
                      className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-300"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Verified Campus Photo Path (No Stock Photos)</label>
                    <input
                      type="text"
                      value={campusImgInput}
                      onChange={(e) => setCampusImgInput(e.target.value)}
                      placeholder="/assets/university-media/..."
                      className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-300"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Publication Gate Status</label>
                    <select
                      value={verStatusInput}
                      onChange={(e) => setVerStatusInput(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-300"
                    >
                      <option value="VERIFIED">VERIFIED</option>
                      <option value="PARTIALLY VERIFIED">PARTIALLY VERIFIED</option>
                      <option value="PENDING VERIFICATION">PENDING VERIFICATION</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">5-Tier Verification Classification</label>
                    <select
                      value={fiveTierStatusInput}
                      onChange={(e) => setFiveTierStatusInput(e.target.value as FiveTierVerificationStatus)}
                      className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-300"
                    >
                      {ALL_FIVE_VERIFICATION_TIERS.map((tier) => (
                        <option key={tier} value={tier}>
                          {tier}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Official Apply Now Portal URL</label>
                    <input
                      type="url"
                      value={applyNowUrlInput}
                      onChange={(e) => setApplyNowUrlInput(e.target.value)}
                      placeholder="https://oia...ac.kr"
                      className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-300"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">University President (Verified Name Only)</label>
                    <input
                      type="text"
                      value={presidentNameInput}
                      onChange={(e) => setPresidentNameInput(e.target.value)}
                      placeholder="Leave blank if not verified on official portal"
                      className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-300"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Official International Office Designation</label>
                    <input
                      type="text"
                      value={intlOfficeDesignationInput}
                      onChange={(e) => setIntlOfficeDesignationInput(e.target.value)}
                      placeholder="e.g., Office of International Affairs (국제처)"
                      className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-300"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">International Dean / Director (Verified Name Only)</label>
                    <input
                      type="text"
                      value={intlDirectorNameInput}
                      onChange={(e) => setIntlDirectorNameInput(e.target.value)}
                      placeholder="Leave blank if not verified on official portal"
                      className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-300"
                    />
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-slate-900">
                      8-Part Verification Completeness Checklist ({selectedEntry.checklist.passedCount}/8 Verified)
                    </span>
                    <span className="font-mono tabular-nums font-bold text-[#1769AA]">
                      {selectedEntry.completeness}% Overall Score
                    </span>
                  </div>
                  <EightPartChecklistGrid
                    checklist={selectedEntry.checklist}
                    tuitionTier={selectedEntry.tuitionTier}
                    deadlinesTier={selectedEntry.deadlinesTier}
                  />
                </div>

                {selectedEntry.bundle?.completeness.missingFields.length ? (
                  <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900">
                    <div className="font-bold mb-1">Remaining Completeness Gaps ({selectedEntry.completeness}% Complete):</div>
                    <ul className="list-disc pl-5 space-y-0.5">
                      {selectedEntry.bundle.completeness.missingFields.map((m: string, i: number) => (
                        <li key={i}>{m}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleSaveProfile}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#10243A] hover:bg-[#1769AA] text-white font-bold cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Save Branding &amp; Verification Updates</span>
                  </button>
                </div>
              </div>
            )}

            {editorSubTab === 'academics' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                    <label className="block font-bold text-slate-800">Semester Tuition Range (KRW)</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={minTuitionInput}
                        onChange={(e) => setMinTuitionInput(e.target.value)}
                        placeholder="Min KRW"
                        className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300"
                      />
                      <span>–</span>
                      <input
                        type="number"
                        value={maxTuitionInput}
                        onChange={(e) => setMaxTuitionInput(e.target.value)}
                        placeholder="Max KRW"
                        className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300"
                      />
                      <button
                        type="button"
                        onClick={handleSaveProfile}
                        className="px-3.5 py-2 rounded-lg bg-[#10243A] text-white font-bold shrink-0 cursor-pointer"
                      >
                        Update
                      </button>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                    <label className="block font-bold text-slate-800">Append Verified Department / Major</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={newProgramInput}
                        onChange={(e) => setNewProgramInput(e.target.value)}
                        placeholder="e.g., AI & Robotics Engineering (B.S.)"
                        className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300"
                      />
                      <button
                        type="button"
                        onClick={() => handleAddProgramOrScholarship('program')}
                        className="px-3.5 py-2 rounded-lg bg-[#1769AA] text-white font-bold shrink-0 cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <label className="block font-bold text-slate-800">Append Verified International Scholarship Tier</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newScholarshipInput}
                      onChange={(e) => setNewScholarshipInput(e.target.value)}
                      placeholder="e.g., TOPIK Level 4 Entrance Scholarship — 50% First Semester Tuition Reduction"
                      className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300"
                    />
                    <button
                      type="button"
                      onClick={() => handleAddProgramOrScholarship('scholarship')}
                      className="px-4 py-2 rounded-lg bg-emerald-700 text-white font-bold shrink-0 cursor-pointer"
                    >
                      Add Scholarship
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 25-University Master Whitelist Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
              <tr>
                <th className="p-4">#</th>
                <th className="p-4">Logo &amp; Approved Institution</th>
                <th className="p-4">5-Tier Verification</th>
                <th className="p-4">Media &amp; Tuition</th>
                <th className="p-4">March 2027 Intake</th>
                <th className="p-4">Completeness &amp; Gates</th>
                <th className="p-4 text-right">Manage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRows.map(
                ({
                  uni,
                  isPriority,
                  bundle,
                  hasLogo,
                  hasPhoto,
                  rounds,
                  hasAnnounced,
                  hasManualFlag,
                  completeness,
                  checklist,
                  fiveTierStatus,
                  tuitionTier,
                  deadlinesTier,
                }) => (
                  <tr key={uni.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="p-4 font-mono tabular-nums font-bold text-slate-400">
                      {isPriority ? String(uni.whitelistOrder || 0).padStart(2, '0') : 'ARC'}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center p-1 shrink-0">
                          {hasLogo ? (
                            <img
                              src={bundle?.logo?.localAssetPath || uni.logoUrl}
                              alt={`${uni.name} logo`}
                              className="w-full h-full object-contain"
                            />
                          ) : (
                            <Building2 className="w-4 h-4 text-amber-500" />
                          )}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 text-sm">{uni.officialName || uni.name}</div>
                          <div className="text-[11px] text-slate-500">
                            {uni.koreanName} · {uni.city} · <span className="font-mono">{uni.id}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <VerificationStatusInline status={fiveTierStatus} compact />
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {bundle?.campuses.length || 1} Campus(es) · {uni.type}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col gap-0.5 text-[11px]">
                        <span className={hasLogo ? 'text-emerald-700 font-medium' : 'text-amber-700 font-medium'}>
                          {hasLogo ? 'Official logo verified' : 'Missing verified logo'}
                        </span>
                        <span className={hasPhoto ? 'text-emerald-700 font-medium' : 'text-amber-700 font-medium'}>
                          {hasPhoto ? `${bundle?.images.length || 1} Campus photo(s)` : 'Missing campus photo'}
                        </span>
                        <span className="text-slate-600">
                          Tuition: <span className="font-semibold">{tuitionTier}</span>
                        </span>
                      </div>
                    </td>
                    <td className="p-4">
                      <VerificationStatusInline status={deadlinesTier} compact />
                      <div className="text-[11px] text-slate-600 mt-0.5 font-mono tabular-nums">
                        {hasAnnounced ? `${rounds.length} Round(s) Recorded` : '0 Announced'}
                      </div>
                      {hasManualFlag && (
                        <div className="text-[10px] text-amber-700 flex items-center gap-1 mt-0.5">
                          <AlertCircle className="w-3 h-3" />
                          <span>Manual check flagged</span>
                        </div>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#1769AA] rounded-full"
                            style={{ width: `${completeness}%` }}
                          />
                        </div>
                        <span className="font-mono tabular-nums font-bold text-slate-800">{completeness}%</span>
                      </div>
                      <div className="text-[11px] font-mono tabular-nums text-slate-500 mt-0.5">
                        {checklist.passedCount}/8 gates passed
                      </div>
                    </td>
                    <td className="p-4 text-right space-x-2 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => openEditor(uni.id, 'deadlines')}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#10243A] hover:bg-[#1769AA] text-white font-semibold cursor-pointer"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>Manage</span>
                      </button>
                      {uni.officialWebsite && (
                        <a
                          href={uni.officialWebsite}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center p-1.5 text-slate-400 hover:text-[#1769AA]"
                          title="Open Official Website"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
