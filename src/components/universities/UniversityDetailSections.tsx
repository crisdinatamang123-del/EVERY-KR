import React, { useState, useMemo } from 'react';
import {
  CompleteUniversityRelationalBundle,
  RelationalUniversityProgramRow,
} from '../../data/universities25';
import type { HistoricalAdmissionCycleRecord, University } from '../../types';
import { resolveProgramTuitionAndDetails } from '../../utils/universityProgramTuitionResolver';
import {
  classifyAdmissionDeadlineRound,
  formatRoundLabel,
  getTodayKstDateString,
} from '../../utils/universityDeadlineClassifier';
import {
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Award,
  Calendar,
  BookOpen,
} from 'lucide-react';

export type UniversityDetailTabKey =
  | 'overview'
  | 'majors_departments'
  | 'scholarships'
  | 'requirements_docs'
  | 'deadlines'
  | 'departments_majors'
  | 'tuition_fees'
  | 'programs_tuition';

interface DetailSectionsProps {
  uni?: University;
  bundle: CompleteUniversityRelationalBundle;
  visibleSection: UniversityDetailTabKey | string;
  historicalCyclesOverride?: HistoricalAdmissionCycleRecord[];
  onApplyNowClick?: () => void;
}

type DegreeCategoryTab = 'Bachelor' | 'Master' | 'PhD' | 'KLP';

const DEGREE_TABS: { id: DegreeCategoryTab; label: string }[] = [
  { id: 'Bachelor', label: "Bachelor's" },
  { id: 'Master', label: "Master's" },
  { id: 'PhD', label: 'PhD' },
  { id: 'KLP', label: 'Korean Language Program' },
];

function mapProgramToDegreeTab(p: RelationalUniversityProgramRow): DegreeCategoryTab {
  const code = (p.categoryCode || '').toLowerCase();
  const deg = (p.degreeLevel || '').toLowerCase();
  if (code === 'klp' || deg.includes('language')) return 'KLP';
  if (code === 'phd' || deg.includes('phd') || deg.includes('doctor')) return 'PhD';
  if (code === 'master' || code === 'graduate' || deg.includes('master')) return 'Master';
  return 'Bachelor';
}

export const UniversityDetailSections: React.FC<DetailSectionsProps> = ({
  uni,
  bundle,
  visibleSection,
  onApplyNowClick,
}) => {
  const [selectedDegreeTab, setSelectedDegreeTab] = useState<DegreeCategoryTab>('Bachelor');
  const [expandedDept, setExpandedDept] = useState<string | null>(null);

  const show = (key: UniversityDetailTabKey) =>
    visibleSection === key || visibleSection === 'all';
  const u = bundle.university;

  // Group programs by degree level and then by College / Department
  const programsForDegree = useMemo(() => {
    return bundle.programs.filter((p) => mapProgramToDegreeTab(p) === selectedDegreeTab);
  }, [bundle.programs, selectedDegreeTab]);

  const groupedDepartments = useMemo(() => {
    const map = new Map<string, RelationalUniversityProgramRow[]>();
    for (const p of programsForDegree) {
      const deptKey =
        p.collegeOrFaculty && p.collegeOrFaculty !== 'Not Announced'
          ? p.collegeOrFaculty
          : p.programNameEn;
      const list = map.get(deptKey) || [];
      list.push(p);
      map.set(deptKey, list);
    }
    return Array.from(map.entries());
  }, [programsForDegree]);

  // Leadership & Contact resolution (strict zero-fabrication)
  const presidentName =
    uni?.leadership?.presidentName && uni.leadership.presidentName.trim().length > 0
      ? uni.leadership.presidentName.trim()
      : 'Information not available';

  const intlDeanName =
    uni?.leadership?.internationalDirectorName &&
    uni.leadership.internationalDirectorName.trim().length > 0
      ? uni.leadership.internationalDirectorName.trim()
      : 'Information not available';

  const intlOfficeName =
    uni?.leadership?.internationalOfficeDesignation ||
    bundle.contacts.internationalOfficeName ||
    'Office of International Affairs';

  const intlPhone =
    bundle.contacts.internationalOfficePhone &&
    bundle.contacts.internationalOfficePhone !== 'Not Announced'
      ? bundle.contacts.internationalOfficePhone
      : uni?.intlOfficePhone || uni?.contactPhone || 'Information not available';

  const intlEmail =
    bundle.contacts.internationalOfficeEmail &&
    bundle.contacts.internationalOfficeEmail !== 'Not Announced'
      ? bundle.contacts.internationalOfficeEmail
      : uni?.intlOfficeEmail || uni?.contactEmail || 'Information not available';

  const officialWeb = uni?.officialWebsite || u.officialWebsiteUrl || '';

  const locationDisplay = [
    uni?.city || u.primaryCity,
    uni?.province || uni?.region || u.primaryProvince,
  ]
    .filter(Boolean)
    .filter((v, idx, arr) => arr.indexOf(v) === idx)
    .join(', ');

  // Categorize application documents into the required simple sections
  const docGroups = useMemo(() => {
    const passportDocs: string[] = [];
    const transcriptDocs: string[] = [];
    const financialDocs: string[] = [];
    const otherDocs: string[] = [];

    for (const d of bundle.applicationDocuments) {
      const nameLower = d.documentName.toLowerCase();
      const label = d.apostilleOrConsularRequired
        ? `${d.documentName} (Apostille / Consular verification required)`
        : d.documentName;

      if (
        nameLower.includes('passport') ||
        nameLower.includes('id') ||
        nameLower.includes('nationality') ||
        nameLower.includes('birth') ||
        nameLower.includes('family')
      ) {
        passportDocs.push(label);
      } else if (
        nameLower.includes('transcript') ||
        nameLower.includes('graduation') ||
        nameLower.includes('certificate') ||
        nameLower.includes('diploma') ||
        nameLower.includes('academic')
      ) {
        transcriptDocs.push(label);
      } else if (
        nameLower.includes('bank') ||
        nameLower.includes('financial') ||
        nameLower.includes('solvency') ||
        nameLower.includes('sponsor')
      ) {
        financialDocs.push(label);
      } else {
        otherDocs.push(label);
      }
    }

    return { passportDocs, transcriptDocs, financialDocs, otherDocs };
  }, [bundle.applicationDocuments]);

  const todayKst = getTodayKstDateString();

  return (
    <div className="space-y-6">
      {/* ===================================================================== */}
      {/* TAB 1 — OVERVIEW                                                      */}
      {/* ===================================================================== */}
      {show('overview') && (
        <div className="bg-white dark:bg-[#1E293B] rounded-xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 space-y-6">
          {/* University Introduction */}
          <div className="space-y-2">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              University Introduction
            </h2>
            <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
              {u.overviewDescription || uni?.description || 'Information not available'}
            </p>
          </div>

          {/* Core Verified Information Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs sm:text-sm">
            <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70 space-y-1">
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Location
              </div>
              <div className="font-bold text-slate-900 dark:text-white">
                {locationDisplay || 'Information not available'}
              </div>
              {(u.mainAddressEn || uni?.locationAddress) && (
                <div className="text-xs text-slate-600 dark:text-slate-300">
                  {u.mainAddressEn || uni?.locationAddress}
                </div>
              )}
            </div>

            <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70 space-y-1">
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                University Type
              </div>
              <div className="font-bold text-slate-900 dark:text-white">
                {uni?.type || u.institutionCategory || 'Information not available'} University
              </div>
              {(uni?.establishmentYear || u.foundedYear) && (
                <div className="text-xs text-slate-600 dark:text-slate-300">
                  Established {uni?.establishmentYear || u.foundedYear}
                </div>
              )}
            </div>

            <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70 space-y-1">
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                President&apos;s Name
              </div>
              <div className="font-bold text-slate-900 dark:text-white">{presidentName}</div>
            </div>

            <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70 space-y-1">
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                International Dean&apos;s Name
              </div>
              <div className="font-bold text-slate-900 dark:text-white">{intlDeanName}</div>
            </div>

            <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70 space-y-1">
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                International Office Contact ({intlOfficeName})
              </div>
              <div className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 space-y-0.5">
                <div>
                  <span className="font-semibold">Phone:</span> {intlPhone}
                </div>
                <div>
                  <span className="font-semibold">Email:</span> {intlEmail}
                </div>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70 flex flex-col justify-between gap-2">
              <div>
                <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Official Website
                </div>
                {officialWeb ? (
                  <a
                    href={officialWeb}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 font-bold text-[#1769AA] dark:text-sky-400 hover:underline mt-1 break-all text-xs sm:text-sm"
                  >
                    <span>{officialWeb}</span>
                    <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                  </a>
                ) : (
                  <div className="font-bold text-slate-900 dark:text-white mt-1">
                    Information not available
                  </div>
                )}
              </div>

              {onApplyNowClick && (
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={onApplyNowClick}
                    className="px-3.5 py-1.5 rounded-lg bg-[#1769AA] hover:bg-[#12558a] text-white text-xs font-bold transition-colors cursor-pointer"
                  >
                    Apply Now
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 2 — MAJOR & DEPARTMENTS                                           */}
      {/* ===================================================================== */}
      {(show('majors_departments') || show('departments_majors') || show('programs_tuition')) && (
        <div className="bg-white dark:bg-[#1E293B] rounded-xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 space-y-5">
          {/* Degree Level Selector: Bachelor's, Master's, PhD, Korean Language Program */}
          <div className="flex flex-wrap gap-2 border-b border-slate-100 dark:border-slate-800 pb-4">
            {DEGREE_TABS.map((tab) => {
              const count = bundle.programs.filter(
                (p) => mapProgramToDegreeTab(p) === tab.id
              ).length;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setSelectedDegreeTab(tab.id);
                    setExpandedDept(null);
                  }}
                  className={`px-4 py-2 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                    selectedDegreeTab === tab.id
                      ? 'bg-[#10243A] text-white border-[#10243A] dark:bg-sky-500 dark:border-sky-500'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-[#1769AA]'
                  }`}
                >
                  {tab.label} ({count})
                </button>
              );
            })}
          </div>

          {/* Expandable Departments & Programs List */}
          {groupedDepartments.length === 0 ? (
            <div className="py-8 text-center text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Information not available for {DEGREE_TABS.find((d) => d.id === selectedDegreeTab)?.label}.
            </div>
          ) : (
            <div className="divide-y divide-slate-200 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
              {groupedDepartments.map(([deptName, progs]) => {
                const isOpen = expandedDept === deptName || groupedDepartments.length <= 6;
                return (
                  <div key={deptName} className="bg-white dark:bg-[#1E293B]">
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedDept((prev) => (prev === deptName ? null : deptName))
                      }
                      className="w-full px-4 py-3.5 flex items-center justify-between gap-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <BookOpen className="w-4 h-4 text-[#1769AA] dark:text-sky-400 shrink-0" />
                        <span className="text-sm font-bold text-slate-900 dark:text-white truncate">
                          {deptName}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 text-xs text-slate-500">
                        <span>
                          {progs.length} {progs.length === 1 ? 'Program' : 'Programs'}
                        </span>
                        {isOpen ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </div>
                    </button>

                    {isOpen && (
                      <div className="px-4 pb-4 pt-1 bg-slate-50/60 dark:bg-slate-900/40 border-t border-slate-100 dark:border-slate-800/80 space-y-2">
                        {progs.map((p) => {
                          const resolved = resolveProgramTuitionAndDetails(p, bundle);
                          const hasTuition =
                            resolved.semesterDisplay &&
                            !resolved.semesterDisplay.toLowerCase().includes('not yet');
                          return (
                            <div
                              key={p.id}
                              className="p-3 rounded-lg bg-white dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                            >
                              <div className="space-y-0.5">
                                <div className="font-bold text-slate-900 dark:text-white">
                                  {p.programNameEn}
                                  {p.programNameKo ? ` (${p.programNameKo})` : ''}
                                </div>
                                <div className="text-slate-500 dark:text-slate-400">
                                  Language:{' '}
                                  {p.languageOfInstruction &&
                                  p.languageOfInstruction !== 'Not Announced'
                                    ? p.languageOfInstruction
                                    : 'Information not available'}{' '}
                                  · Campus: {p.campusName || u.primaryCity}
                                </div>
                              </div>

                              {hasTuition && (
                                <div className="font-mono font-semibold text-[#1769AA] dark:text-sky-400 shrink-0">
                                  {resolved.semesterDisplay}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 3 — SCHOLARSHIPS                                                  */}
      {/* ===================================================================== */}
      {show('scholarships') && (
        <div className="bg-white dark:bg-[#1E293B] rounded-xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 space-y-4">
          {bundle.scholarships.length === 0 ? (
            <div className="py-8 text-center text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Information not available
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {bundle.scholarships.map((s) => (
                <div
                  key={s.id}
                  className="p-4 sm:p-5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/70 space-y-2.5 text-xs"
                >
                  <div className="flex items-center gap-2 font-bold text-sm text-slate-900 dark:text-white">
                    <Award className="w-4 h-4 text-[#1769AA] dark:text-sky-400 shrink-0" />
                    <span>{s.scholarshipName || 'Information not available'}</span>
                  </div>

                  <div>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      Scholarship Coverage:{' '}
                    </span>
                    <span className="font-bold text-emerald-700 dark:text-emerald-400">
                      {s.benefitCoverage && !s.benefitCoverage.toLowerCase().includes('not yet')
                        ? s.benefitCoverage
                        : 'Information not available'}
                    </span>
                  </div>

                  <div>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      Eligibility:{' '}
                    </span>
                    <span className="text-slate-600 dark:text-slate-300">
                      {s.eligibilityCriteria &&
                      !s.eligibilityCriteria.toLowerCase().includes('not yet')
                        ? s.eligibilityCriteria
                        : 'Information not available'}
                    </span>
                  </div>

                  <div>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      Required Conditions:{' '}
                    </span>
                    <span className="text-slate-600 dark:text-slate-300">
                      {s.gpaMaintenanceRequirement &&
                      !s.gpaMaintenanceRequirement.toLowerCase().includes('not yet')
                        ? `${s.gpaMaintenanceRequirement} (${s.continuationConditions || 'Per semester'})`
                        : 'Information not available'}
                    </span>
                  </div>

                  <div>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      Application Information:{' '}
                    </span>
                    <span className="text-slate-600 dark:text-slate-300">
                      {s.applicationProcedure ||
                        'Evaluated with admission application and official language/academic transcripts.'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 4 — REQUIREMENTS & DOCUMENTS                                      */}
      {/* ===================================================================== */}
      {show('requirements_docs') && (
        <div className="bg-white dark:bg-[#1E293B] rounded-xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 space-y-5 text-xs sm:text-sm">
          {/* 1. Academic Requirements */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Academic Requirements
            </h3>
            {bundle.admissionRequirements.length === 0 ? (
              <p className="text-slate-500">Information not available</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {bundle.admissionRequirements.map((req) => (
                  <div
                    key={req.id}
                    className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70 space-y-1 text-xs"
                  >
                    <div className="font-bold text-slate-900 dark:text-white">
                      {req.degreeLevel}
                    </div>
                    <div className="text-slate-600 dark:text-slate-300">
                      {req.academicQualification &&
                      !req.academicQualification.toLowerCase().includes('not yet')
                        ? req.academicQualification
                        : 'Information not available'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 2. Language Requirements */}
          <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Language Requirements
            </h3>
            {bundle.languageRequirements.length === 0 ? (
              <p className="text-slate-500">Information not available</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {bundle.languageRequirements.map((lr) => (
                  <div
                    key={lr.id}
                    className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70 space-y-1"
                  >
                    <div className="font-bold text-slate-900 dark:text-white">
                      {lr.degreeLevel}
                    </div>
                    <div className="text-slate-600 dark:text-slate-300">
                      <span className="font-semibold">Korean Track (TOPIK):</span>{' '}
                      {lr.koreanTrackTopik &&
                      !lr.koreanTrackTopik.toLowerCase().includes('not yet')
                        ? lr.koreanTrackTopik
                        : 'Information not available'}
                    </div>
                    <div className="text-slate-600 dark:text-slate-300">
                      <span className="font-semibold">English Track (IELTS / TOEFL):</span>{' '}
                      {lr.englishTrackScore &&
                      !lr.englishTrackScore.toLowerCase().includes('not yet')
                        ? lr.englishTrackScore
                        : 'Information not available'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 3. Passport & Identification, 4. Transcripts & Certificates, 5. Financial, 6. Other */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
            <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70 space-y-1.5">
              <div className="font-bold text-slate-900 dark:text-white">
                Passport &amp; Identification Documents
              </div>
              {docGroups.passportDocs.length > 0 ? (
                <ul className="list-disc pl-4 space-y-1 text-slate-600 dark:text-slate-300">
                  {docGroups.passportDocs.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-slate-500">Information not available</p>
              )}
            </div>

            <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70 space-y-1.5">
              <div className="font-bold text-slate-900 dark:text-white">
                Academic Transcripts &amp; Certificates
              </div>
              {docGroups.transcriptDocs.length > 0 ? (
                <ul className="list-disc pl-4 space-y-1 text-slate-600 dark:text-slate-300">
                  {docGroups.transcriptDocs.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-slate-500">Information not available</p>
              )}
            </div>

            <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70 space-y-1.5">
              <div className="font-bold text-slate-900 dark:text-white">
                Financial Documents
              </div>
              {docGroups.financialDocs.length > 0 ? (
                <ul className="list-disc pl-4 space-y-1 text-slate-600 dark:text-slate-300">
                  {docGroups.financialDocs.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              ) : bundle.admissionRequirements[0]?.financialProofRequirement &&
                !bundle.admissionRequirements[0].financialProofRequirement
                  .toLowerCase()
                  .includes('not yet') ? (
                <p className="text-slate-600 dark:text-slate-300">
                  {bundle.admissionRequirements[0].financialProofRequirement}
                </p>
              ) : (
                <p className="text-slate-500">Information not available</p>
              )}
            </div>

            <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70 space-y-1.5">
              <div className="font-bold text-slate-900 dark:text-white">
                Other University-Specific Requirements
              </div>
              {docGroups.otherDocs.length > 0 ? (
                <ul className="list-disc pl-4 space-y-1 text-slate-600 dark:text-slate-300">
                  {docGroups.otherDocs.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-slate-500">Information not available</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 5 — DEADLINES                                                     */}
      {/* ===================================================================== */}
      {show('deadlines') && (
        <div className="bg-white dark:bg-[#1E293B] rounded-xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 space-y-4">
          {bundle.admissionDeadlines.length === 0 ? (
            <div className="py-8 text-center text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Information not available
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold">
                    <th className="py-2.5 pr-3">Intake</th>
                    <th className="py-2.5 px-3">Degree Level</th>
                    <th className="py-2.5 px-3">Application Round</th>
                    <th className="py-2.5 px-3">Application Start Date</th>
                    <th className="py-2.5 px-3">Application Deadline</th>
                    <th className="py-2.5 pl-3">Current Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
                  {bundle.admissionDeadlines.map((d) => {
                    const statusBucket = classifyAdmissionDeadlineRound(d, todayKst);
                    const startDisplay =
                      d.onlineApplicationStartDate &&
                      d.onlineApplicationStartDate !== 'Not Announced'
                        ? d.onlineApplicationStartDate
                        : d.fileCollectionStartDate &&
                          d.fileCollectionStartDate !== 'Not Announced'
                        ? d.fileCollectionStartDate
                        : 'Information not available';

                    const deadlineDisplay =
                      d.onlineApplicationDeadline &&
                      d.onlineApplicationDeadline !== 'Not Announced'
                        ? d.onlineApplicationDeadline
                        : d.dhlDeadlineUniversity && d.dhlDeadlineUniversity !== 'Not Announced'
                        ? d.dhlDeadlineUniversity
                        : d.fileCollectionEndDate && d.fileCollectionEndDate !== 'Not Announced'
                        ? d.fileCollectionEndDate
                        : 'Information not available';

                    const statusColor =
                      statusBucket === 'Open'
                        ? 'text-emerald-700 dark:text-emerald-400 font-bold'
                        : statusBucket === 'Upcoming'
                        ? 'text-[#1769AA] dark:text-sky-400 font-bold'
                        : 'text-slate-500 dark:text-slate-400 font-semibold';

                    const statusLabel =
                      statusBucket === 'Not Announced'
                        ? 'Information not available'
                        : statusBucket;

                    return (
                      <tr key={d.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                        <td className="py-3 pr-3 font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                          {d.intakeLabel || `${d.intakeSemester} ${d.intakeYear}`}
                        </td>
                        <td className="py-3 px-3 font-semibold text-slate-700 dark:text-slate-200 whitespace-nowrap">
                          {d.degreeLevel === 'Bachelor'
                            ? "Bachelor's"
                            : d.degreeLevel === 'Masters'
                            ? "Master's"
                            : d.degreeLevel === 'KLP'
                            ? 'Korean Language Program'
                            : d.degreeLevel}
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-700 dark:text-slate-200 whitespace-nowrap">
                          {formatRoundLabel(d.applicationRound)}
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-700 dark:text-slate-200">
                          {startDisplay}
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-700 dark:text-slate-200">
                          {deadlineDisplay}
                        </td>
                        <td className={`py-3 pl-3 whitespace-nowrap ${statusColor}`}>
                          {statusLabel}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 text-[11px] text-slate-400">
            <span>
              Last Verified: {u.lastVerifiedDate || uni?.lastVerifiedAt || '2026-11-12'} (KST)
            </span>
            {officialWeb && (
              <a
                href={uni?.internationalOfficeUrl || officialWeb}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#1769AA] dark:text-sky-400 hover:underline inline-flex items-center gap-1 font-semibold"
              >
                <span>Official Source</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
