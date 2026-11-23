import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { getUniversitySlug } from '../utils/seoRoutes';
import {
  RELATIONAL_BUNDLE_BY_ID,
  buildArchiveUniversityRelationalBundle,
} from '../data/universities25';
import {
  getUniversityOverallFiveTierStatus,
  getUniversityTuitionFiveTierStatus,
  getUniversityDeadlinesFiveTierStatus,
} from '../utils/fiveTierVerification';
import { VerificationStatusInline } from './universities/VerificationStatusInline';
import { X, Scale, Trash2, Building2, Plus } from 'lucide-react';

interface UniversityCompareModalProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const UniversityCompareModal: React.FC<UniversityCompareModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    universitiesList,
    isCompareModalOpen,
    setIsCompareModalOpen,
    comparedUniversityIds,
    toggleCompareUniversity,
    clearComparison,
  } = useApp();

  const [addUniId, setAddUniId] = useState<string>('');

  const modalVisible = isOpen !== undefined ? isOpen : isCompareModalOpen;
  const handleClose = () => {
    if (onClose) onClose();
    setIsCompareModalOpen(false);
  };

  const unis = useMemo(
    () => universitiesList.filter((u) => comparedUniversityIds.includes(u.id)),
    [universitiesList, comparedUniversityIds]
  );

  const availableToAdd = useMemo(
    () =>
      universitiesList
        .filter((u) => !comparedUniversityIds.includes(u.id))
        .sort((a, b) => (a.officialName || a.name).localeCompare(b.officialName || b.name)),
    [universitiesList, comparedUniversityIds]
  );

  if (!modalVisible) return null;

  const handleAddSelectedUni = () => {
    if (!addUniId) return;
    toggleCompareUniversity(addUniId);
    setAddUniId('');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#061B49]/55 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative w-full max-w-6xl ekr-glass-modal rounded-2xl overflow-hidden my-8 animate-fade-in flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200/60 dark:border-white/12 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/40 dark:bg-white/5">
          <div className="flex items-center gap-2.5">
            <Scale className="w-5 h-5 text-[#0754B8] dark:text-[#60A5FA] shrink-0" />
            <div>
              <h2 className="text-base sm:text-lg font-bold text-[#10213D] dark:text-white">
                University Side-by-Side Comparison
              </h2>
              <p className="text-xs text-[#526685] dark:text-[#B8C9E5]">
                Comparing {unis.length} selected Korean universities across 10 core academic &amp; admission criteria
              </p>
            </div>
          </div>

          {/* Add More Universities & Clear Controls */}
          <div className="flex items-center gap-2 flex-wrap">
            {unis.length < 4 && availableToAdd.length > 0 && (
              <div className="flex items-center gap-1.5">
                <select
                  value={addUniId}
                  onChange={(e) => setAddUniId(e.target.value)}
                  aria-label="Add university to comparison"
                  className="ekr-glass-input px-2.5 py-1.5 rounded-lg text-xs max-w-[210px]"
                >
                  <option value="" className="bg-white dark:bg-[#0B204A]">+ Add university to compare...</option>
                  {availableToAdd.map((item) => (
                    <option key={item.id} value={item.id} className="bg-white dark:bg-[#0B204A]">
                      {item.officialName || item.name} ({item.city})
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={!addUniId}
                  onClick={handleAddSelectedUni}
                  className="ekr-glass-btn-primary inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg disabled:opacity-40 text-white text-xs font-bold cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add</span>
                </button>
              </div>
            )}

            {unis.length > 0 && (
              <button
                type="button"
                onClick={clearComparison}
                className="text-xs text-[#526685] dark:text-[#B8C9E5] hover:text-rose-600 flex items-center gap-1 px-2 py-1.5 cursor-pointer transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear All</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleClose}
              className="p-1.5 rounded-lg text-[#526685] dark:text-[#B8C9E5] hover:text-[#10213D] dark:hover:text-white hover:bg-white/60 dark:hover:bg-white/10 cursor-pointer transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Comparison Table Content */}
        <div className="p-6 overflow-y-auto">
          {unis.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <Scale className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                No universities selected for comparison
              </p>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Use the dropdown above to add universities or click &ldquo;Compare&rdquo; on any university card in the directory.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800">
                    <th className="p-3 w-48 text-slate-500 dark:text-slate-400 font-semibold">
                      Comparison Criteria
                    </th>
                    {unis.map((u) => {
                      const bundle =
                        u.relationalBundle ||
                        RELATIONAL_BUNDLE_BY_ID[u.id] ||
                        buildArchiveUniversityRelationalBundle(u);
                      const logoSrc =
                        bundle.logo.localAssetPath ||
                        u.logoVerification?.logoUrl ||
                        u.logoUrl;
                      const hasLogo = Boolean(
                        logoSrc &&
                          (bundle.logo.verified ||
                            u.logoVerification?.verified ||
                            u.logoVerified)
                      );
                      return (
                        <th
                          key={u.id}
                          className="p-3 min-w-[235px] font-bold text-slate-900 dark:text-white align-top"
                        >
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center p-1 shrink-0">
                                {hasLogo ? (
                                  <img
                                    src={logoSrc}
                                    alt={`${u.name} official logo`}
                                    className="w-full h-full object-contain"
                                  />
                                ) : (
                                  <Building2 className="w-4 h-4 text-slate-400" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <span className="font-extrabold text-sm text-[#10243A] dark:text-white block leading-snug">
                                  {u.officialName || u.name}
                                </span>
                                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-normal block">
                                  {u.koreanName || 'Not available'}
                                </span>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => toggleCompareUniversity(u.id)}
                              className="text-slate-400 hover:text-rose-600 cursor-pointer p-1 shrink-0"
                              title="Remove university from comparison"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <VerificationStatusInline
                            status={getUniversityOverallFiveTierStatus(u)}
                            compact
                          />
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {/* 1. University Name and Location */}
                  <tr>
                    <td className="p-3 font-semibold text-slate-600 dark:text-slate-300 bg-slate-50/50 dark:bg-slate-900/40">
                      1. University Name &amp; Location
                    </td>
                    {unis.map((u) => (
                      <td key={u.id} className="p-3 text-slate-800 dark:text-slate-200">
                        <div className="font-bold">{u.officialName || u.name}</div>
                        <div className="text-slate-600 dark:text-slate-300 mt-0.5">
                          {u.city
                            ? `${u.city}, ${u.province || u.region || 'South Korea'}`
                            : 'Not available'}
                        </div>
                      </td>
                    ))}
                  </tr>

                  {/* 2. University Type */}
                  <tr>
                    <td className="p-3 font-semibold text-slate-600 dark:text-slate-300 bg-slate-50/50 dark:bg-slate-900/40">
                      2. University Type
                    </td>
                    {unis.map((u) => (
                      <td key={u.id} className="p-3 font-semibold text-slate-800 dark:text-slate-200">
                        {u.type ? `${u.type} University` : 'Not available'}
                        {u.establishmentYear ? ` · Est. ${u.establishmentYear}` : ''}
                      </td>
                    ))}
                  </tr>

                  {/* 3. Available Academic Programs */}
                  <tr>
                    <td className="p-3 font-semibold text-slate-600 dark:text-slate-300 bg-slate-50/50 dark:bg-slate-900/40">
                      3. Available Academic Programs
                    </td>
                    {unis.map((u) => (
                      <td key={u.id} className="p-3 text-slate-700 dark:text-slate-300">
                        {u.programs && u.programs.length > 0 ? (
                          <div className="text-[11px] leading-relaxed">
                            {u.programs.slice(0, 6).join(' · ')}
                            {u.programs.length > 6 ? ` (+${u.programs.length - 6} more)` : ''}
                          </div>
                        ) : (
                          <span className="text-slate-400">Not available</span>
                        )}
                      </td>
                    ))}
                  </tr>

                  {/* 4. Undergraduate Tuition */}
                  <tr>
                    <td className="p-3 font-semibold text-slate-600 dark:text-slate-300 bg-slate-50/50 dark:bg-slate-900/40">
                      4. Undergraduate Tuition
                    </td>
                    {unis.map((u) => {
                      const bundle =
                        u.relationalBundle ||
                        RELATIONAL_BUNDLE_BY_ID[u.id] ||
                        buildArchiveUniversityRelationalBundle(u);
                      const ugRow = bundle.tuitionFees.find(
                        (t) =>
                          t.degreeOrProgramType === 'Bachelor' ||
                          t.degreeOrProgramType === 'Associate' ||
                          t.departmentTrackLabel.toLowerCase().includes('undergrad')
                      );
                      const min =
                        ugRow?.tuitionPerSemesterKrwMin ?? u.tuitionPerSemesterKRW?.min ?? null;
                      const max =
                        ugRow?.tuitionPerSemesterKrwMax ?? u.tuitionPerSemesterKRW?.max ?? null;
                      const tTier = getUniversityTuitionFiveTierStatus(u);
                      return (
                        <td key={u.id} className="p-3 text-slate-900 dark:text-white">
                          {min !== null && min > 0 ? (
                            <div className="space-y-1">
                              <div className="font-mono font-bold tabular-nums text-[#1769AA] dark:text-[#19B6A4]">
                                {max && max !== min
                                  ? `₩${min.toLocaleString()} – ₩${max.toLocaleString()} / sem`
                                  : `₩${min.toLocaleString()} / sem`}
                              </div>
                              <VerificationStatusInline status={tTier} compact />
                            </div>
                          ) : (
                            <span className="text-slate-400">Not available</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>

                  {/* 5. Graduate Tuition */}
                  <tr>
                    <td className="p-3 font-semibold text-slate-600 dark:text-slate-300 bg-slate-50/50 dark:bg-slate-900/40">
                      5. Graduate Tuition
                    </td>
                    {unis.map((u) => {
                      const bundle =
                        u.relationalBundle ||
                        RELATIONAL_BUNDLE_BY_ID[u.id] ||
                        buildArchiveUniversityRelationalBundle(u);
                      const gradRow = bundle.tuitionFees.find(
                        (t) =>
                          t.degreeOrProgramType === 'Master' ||
                          t.degreeOrProgramType === 'PhD' ||
                          t.degreeOrProgramType === 'Graduate' ||
                          t.departmentTrackLabel.toLowerCase().includes('grad')
                      );
                      const min =
                        gradRow?.tuitionPerSemesterKrwMin ?? u.tuitionPerSemesterKRW?.min ?? null;
                      const max =
                        gradRow?.tuitionPerSemesterKrwMax ?? u.tuitionPerSemesterKRW?.max ?? null;
                      return (
                        <td key={u.id} className="p-3 text-slate-900 dark:text-white">
                          {min !== null && min > 0 ? (
                            <div className="font-mono font-bold tabular-nums">
                              {max && max !== min
                                ? `₩${min.toLocaleString()} – ₩${max.toLocaleString()} / sem`
                                : `₩${min.toLocaleString()} / sem`}
                            </div>
                          ) : (
                            <span className="text-slate-400">Not available</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>

                  {/* 6. Scholarships */}
                  <tr>
                    <td className="p-3 font-semibold text-slate-600 dark:text-slate-300 bg-slate-50/50 dark:bg-slate-900/40">
                      6. Scholarships
                    </td>
                    {unis.map((u) => (
                      <td key={u.id} className="p-3 text-slate-700 dark:text-slate-300">
                        {u.scholarships && u.scholarships.length > 0 ? (
                          <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                            {u.scholarships.slice(0, 3).map((s, i) => (
                              <li key={i}>{s}</li>
                            ))}
                          </ul>
                        ) : (
                          <span className="text-slate-400">Not available</span>
                        )}
                      </td>
                    ))}
                  </tr>

                  {/* 7. TOPIK Requirements */}
                  <tr>
                    <td className="p-3 font-semibold text-slate-600 dark:text-slate-300 bg-slate-50/50 dark:bg-slate-900/40">
                      7. TOPIK Requirements
                    </td>
                    {unis.map((u) => {
                      const bundle =
                        u.relationalBundle ||
                        RELATIONAL_BUNDLE_BY_ID[u.id] ||
                        buildArchiveUniversityRelationalBundle(u);
                      const topik =
                        bundle.languageRequirements[0]?.koreanTrackTopik ||
                        u.admissionRequirements?.topikLevel;
                      const isMissing =
                        !topik ||
                        topik.toLowerCase().includes('not yet') ||
                        topik.toLowerCase().includes('not officially');
                      return (
                        <td key={u.id} className="p-3 text-slate-700 dark:text-slate-300 text-[11px]">
                          {isMissing ? <span className="text-slate-400">Not available</span> : topik}
                        </td>
                      );
                    })}
                  </tr>

                  {/* 8. English Language Requirements */}
                  <tr>
                    <td className="p-3 font-semibold text-slate-600 dark:text-slate-300 bg-slate-50/50 dark:bg-slate-900/40">
                      8. English Language Requirements
                    </td>
                    {unis.map((u) => {
                      const bundle =
                        u.relationalBundle ||
                        RELATIONAL_BUNDLE_BY_ID[u.id] ||
                        buildArchiveUniversityRelationalBundle(u);
                      const eng =
                        bundle.languageRequirements[0]?.englishTrackScore ||
                        u.admissionRequirements?.englishTest;
                      const isMissing =
                        !eng ||
                        eng.toLowerCase().includes('not yet') ||
                        eng.toLowerCase().includes('not officially');
                      return (
                        <td key={u.id} className="p-3 text-slate-700 dark:text-slate-300 text-[11px]">
                          {isMissing ? (
                            u.englishTaughtAvailable ? (
                              'IELTS 5.5+ / TOEFL iBT 71+ (Confirm by department)'
                            ) : (
                              <span className="text-slate-400">Not available</span>
                            )
                          ) : (
                            eng
                          )}
                        </td>
                      );
                    })}
                  </tr>

                  {/* 9. Admission Deadlines */}
                  <tr>
                    <td className="p-3 font-semibold text-slate-600 dark:text-slate-300 bg-slate-50/50 dark:bg-slate-900/40">
                      9. Admission Deadlines (2027)
                    </td>
                    {unis.map((u) => {
                      const dTier = u.relationalBundle
                        ? getUniversityDeadlinesFiveTierStatus(
                            u.relationalBundle.admissionDeadlines
                          )
                        : u.deadlines?.verified
                        ? 'Officially verified'
                        : 'Not announced';
                      const springText = u.deadlines?.springSemester;
                      const hasSpring =
                        springText &&
                        !springText.toLowerCase().includes('not announced') &&
                        !springText.toLowerCase().includes('not officially');
                      return (
                        <td
                          key={u.id}
                          className="p-3 text-[11px] text-slate-800 dark:text-slate-200 space-y-1"
                        >
                          <div>
                            {hasSpring ? (
                              springText
                            ) : (
                              <span className="text-slate-400">Not available</span>
                            )}
                          </div>
                          <VerificationStatusInline status={dTier} compact />
                        </td>
                      );
                    })}
                  </tr>

                  {/* 10. International Student Support */}
                  <tr>
                    <td className="p-3 font-semibold text-slate-600 dark:text-slate-300 bg-slate-50/50 dark:bg-slate-900/40">
                      10. International Student Support
                    </td>
                    {unis.map((u) => {
                      const bundle =
                        u.relationalBundle ||
                        RELATIONAL_BUNDLE_BY_ID[u.id] ||
                        buildArchiveUniversityRelationalBundle(u);
                      const supportList = u.studentSupport || [];
                      return (
                        <td
                          key={u.id}
                          className="p-3 text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed"
                        >
                          {supportList.length > 0 ? (
                            supportList.slice(0, 4).join(' · ')
                          ) : bundle.internationalStudentServices?.orientationProgram &&
                            bundle.internationalStudentServices.orientationProgram !==
                              'Not yet verified' ? (
                            `${bundle.internationalStudentServices.orientationProgram} · ${bundle.internationalStudentServices.buddyMentoringProgram}`
                          ) : (
                            <span className="text-slate-400">Not available</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>

                  {/* Action row */}
                  <tr>
                    <td className="p-3 font-semibold text-slate-600 dark:text-slate-300 bg-slate-50/50 dark:bg-slate-900/40">
                      University Details
                    </td>
                    {unis.map((u) => (
                      <td key={u.id} className="p-3">
                        <Link
                          to={`/universities/${getUniversitySlug(u)}`}
                          onClick={handleClose}
                          className="ekr-glass-btn-primary block text-center w-full py-2 px-3 text-white rounded-xl text-xs font-bold transition-all"
                        >
                          Open Full Details
                        </Link>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200/60 dark:border-white/12 bg-white/40 dark:bg-white/5 flex items-center justify-end">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 text-xs font-semibold text-[#10213D] dark:text-white ekr-glass-subtle rounded-xl hover:bg-white/80 dark:hover:bg-white/15 cursor-pointer transition-colors"
          >
            Close Comparison
          </button>
        </div>
      </div>
    </div>
  );
};
