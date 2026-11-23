import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { VISA_CATEGORIES } from '../data/mockData';
import {
  FileText,
  CheckSquare,
  AlertTriangle,
  Building,
  Clock,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  Phone,
  HelpCircle,
  ChevronRight
} from 'lucide-react';

interface VisaModuleProps {
  isFullPage?: boolean;
}

export const VisaModule: React.FC<VisaModuleProps> = ({ isFullPage = false }) => {
  const {
    checkedDocuments,
    toggleDocumentCheck,
    showToast,
    setActivePage
  } = useApp();

  const [searchParams] = useSearchParams();

  const [selectedVisaCode, setSelectedVisaCode] = useState<string>(() => {
    const code = searchParams.get('code');
    return code && VISA_CATEGORIES.some((v) => v.code === code) ? code : 'D-2';
  });
  const [activeTab, setActiveTab] = useState<'checklist' | 'arc' | 'work-permission' | 'offices'>(() => {
    const tab = searchParams.get('tab');
    return tab === 'arc' || tab === 'work-permission' || tab === 'offices' ? tab : 'checklist';
  });

  useEffect(() => {
    const code = searchParams.get('code');
    const tab = searchParams.get('tab');
    if (code && VISA_CATEGORIES.some((v) => v.code === code)) {
      setSelectedVisaCode(code);
    }
    if (tab === 'arc' || tab === 'work-permission' || tab === 'offices' || tab === 'checklist') {
      setActiveTab(tab);
    } else if (!tab) {
      setActiveTab('checklist');
    }
  }, [searchParams]);

  const currentVisa = VISA_CATEGORIES.find(v => v.code === selectedVisaCode) || VISA_CATEGORIES[0];

  // Immigration offices directory
  const immigrationOffices = [
    {
      name: 'Seoul Southern Immigration Office (서울남부출입국)',
      jurisdiction: 'Seodaemun-gu, Mapo-gu, Gangseo-gu, Yangcheon-gu, Guro-gu, Yeongdeungpo-gu (Covers Yonsei, Sogang, Hongik, Ewha)',
      address: '48 Magokseo-1-ro, Gangseo-gu, Seoul',
      subway: 'Magok Station (Line 5), Exit 1 (5 min walk)',
      phone: '1345 (National) / 02-6980-4700'
    },
    {
      name: 'Seoul Immigration Office - Sejongno Branch (서울출입국 세종로출장소)',
      jurisdiction: 'Jongno-gu, Jung-gu, Eunpyeong-gu, Dongdaemun-gu, Seongbuk-gu, Dobong-gu, Gangbuk-gu, Nowon-gu (Covers Korea Univ, SKKU, SNU Yeongeon)',
      address: 'Seoul Global Center 2F-3F, 38 Jong-ro, Jongno-gu, Seoul',
      subway: 'Jonggak Station (Line 1), Exit 6 (Directly connected)',
      phone: '1345 / 02-731-1799'
    },
    {
      name: 'Incheon Immigration Office (인천출입국·외국인청)',
      jurisdiction: 'Incheon Metropolitan City, Bucheon-si (Covers Inha Univ, Incheon National Univ, Songdo IGC)',
      address: '312 Seohae-daero, Jung-gu, Incheon',
      subway: 'Sungui Station (Suin-Bundang Line), Exit 2',
      phone: '1345 / 032-890-6300'
    },
    {
      name: 'Busan Immigration Office (부산출입국·외국인청)',
      jurisdiction: 'Busan Metropolitan City (Covers PNU, Pukyong Univ, Dong-A Univ)',
      address: '16 Chungjang-daero 20beon-gil, Jung-gu, Busan',
      subway: 'Jungang Station (Busan Line 1), Exit 10',
      phone: '1345 / 051-461-3091'
    },
    {
      name: 'Daejeon Immigration Office (대전출입국·외국인사무소)',
      jurisdiction: 'Daejeon Metropolitan City, Sejong-si, Chungnam (Covers KAIST, CNU, SolBridge)',
      address: '16 Jungchon-ro, Jung-gu, Daejeon',
      subway: 'Oryong Station (Daejeon Line 1)',
      phone: '1345 / 042-220-2114'
    }
  ];

  return (
    <section className={`bg-transparent ${isFullPage ? 'py-10' : 'py-16'} border-b border-slate-200/50 dark:border-white/10 transition-colors`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Breadcrumb Navigation when full page */}
        {isFullPage && (
          <nav className="flex items-center gap-2 text-xs text-[#526685] dark:text-[#B8C9E5] mb-4">
            <button
              onClick={() => setActivePage('home')}
              className="hover:text-[#0754B8] dark:hover:text-white transition-colors cursor-pointer"
            >
              Home
            </button>
            <ChevronRight className="w-3.5 h-3.5 opacity-60" />
            <span className="text-[#0754B8] dark:text-[#60A5FA] font-semibold">Category 7 • Visa & Legal Documents</span>
          </nav>
        )}

        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8">
          <div>
            <div className="text-xs font-semibold text-[#0754B8] dark:text-[#60A5FA] uppercase tracking-wider">
              Legal Stay & Compliance
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#10213D] dark:text-white tracking-tight mt-1">
              Visa & Immigration Center
            </h2>
            <p className="text-sm text-[#526685] dark:text-[#B8C9E5] mt-1 max-w-2xl">
              Complete guidance for student visas (D-2/D-4), post-study job seeking (D-10), work authorization (E-7/F-2), and ARC registration.
            </p>
          </div>

          {!isFullPage && (
            <div className="mt-4 md:mt-0">
              <button
                onClick={() => setActivePage('visa')}
                className="text-xs font-semibold text-[#0754B8] dark:text-[#60A5FA] hover:underline underline-offset-4 cursor-pointer"
              >
                View full immigration hub →
              </button>
            </div>
          )}
        </div>

        {/* Mandatory Legal Disclaimer Banner */}
        <div className="bg-amber-500/10 border border-amber-400/35 rounded-xl p-4 mb-8 flex items-start gap-3 backdrop-blur-md">
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-950 dark:text-amber-200 leading-relaxed">
            <strong className="font-bold">Official Disclaimer: </strong>
            EVERYKR is not an immigration authority or legal adviser. Immigration requirements, bank balance criteria, and work quotas change frequently. Always confirm the latest requirements with the Korea Immigration Service (HiKorea.go.kr) or dial <strong>1345</strong> (Immigration Contact Center) for official multilingual guidance. Never engage in unauthorized employment.
          </div>
        </div>

        {/* Visa Category Selector Tabs */}
        <div className="ekr-glass-panel flex items-center gap-1.5 p-1.5 rounded-xl mb-8 overflow-x-auto">
          {VISA_CATEGORIES.map((cat) => (
            <button
              key={cat.code}
              onClick={() => setSelectedVisaCode(cat.code)}
              className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                selectedVisaCode === cat.code
                  ? 'ekr-glass-btn-primary shadow-sm font-bold'
                  : 'text-[#526685] dark:text-[#B8C9E5] hover:text-[#10213D] dark:hover:text-white hover:bg-white/50 dark:hover:bg-white/10'
              }`}
            >
              {cat.code} {cat.code === 'D-2' ? '(Student)' : cat.code === 'D-4' ? '(Language)' : cat.code === 'D-10' ? '(Job Search)' : cat.code === 'E-7' ? '(Work)' : '(Resident)'}
            </button>
          ))}
        </div>

        {/* Visa Overview Strip */}
        <div className="ekr-glass-panel rounded-2xl p-5 mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="text-xs font-bold text-[#0754B8] dark:text-[#60A5FA] uppercase tracking-wider">{currentVisa.code} Qualification</div>
              <h3 className="text-lg font-bold text-[#10213D] dark:text-white mt-0.5">{currentVisa.title}</h3>
              <p className="text-xs text-[#526685] dark:text-[#B8C9E5] mt-1 max-w-2xl">{currentVisa.targetAudience}</p>
            </div>
            
            <div className="flex items-center gap-3 shrink-0">
              <a
                href={currentVisa.officialSourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="ekr-glass-subtle flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#10213D] dark:text-white rounded-lg transition-all"
              >
                <span>HiKorea Portal</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 pt-4 border-t border-slate-200/60 dark:border-white/10 text-xs">
            <div>
              <span className="text-[#526685] dark:text-[#B8C9E5]">Permitted Duration:</span>
              <p className="font-semibold text-[#10213D] dark:text-white mt-0.5">{currentVisa.stayDuration}</p>
            </div>
            <div>
              <span className="text-[#526685] dark:text-[#B8C9E5]">Statutory Application Fee:</span>
              <p className="font-mono font-bold text-[#10213D] dark:text-white mt-0.5 tabular-nums">₩{currentVisa.officialFeeKRW.toLocaleString()} KRW</p>
            </div>
            <div>
              <span className="text-[#526685] dark:text-[#B8C9E5]">Part-Time Work Permission:</span>
              <p className="font-semibold text-[#10213D] dark:text-white mt-0.5 line-clamp-2">{currentVisa.workPermissionSummary}</p>
            </div>
          </div>
        </div>

        {/* Module Sub-Tabs (Checklist, ARC Guide, Work Permission, Offices) */}
        <div className="flex items-center gap-2 border-b border-slate-200/60 dark:border-white/10 pb-3 mb-6 text-xs font-semibold overflow-x-auto">
          <button
            onClick={() => setActiveTab('checklist')}
            className={`pb-1 px-1 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'checklist'
                ? 'text-[#0754B8] dark:text-[#60A5FA] border-b-2 border-[#0875E8] font-bold'
                : 'text-[#526685] dark:text-[#B8C9E5] hover:text-[#10213D] dark:hover:text-white'
            }`}
          >
            Required Document Checklist
          </button>
          <span className="opacity-40">·</span>
          <button
            onClick={() => setActiveTab('arc')}
            className={`pb-1 px-1 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'arc'
                ? 'text-[#0754B8] dark:text-[#60A5FA] border-b-2 border-[#0875E8] font-bold'
                : 'text-[#526685] dark:text-[#B8C9E5] hover:text-[#10213D] dark:hover:text-white'
            }`}
          >
            ARC Registration Steps (90 Days)
          </button>
          <span className="opacity-40">·</span>
          <button
            onClick={() => setActiveTab('work-permission')}
            className={`pb-1 px-1 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'work-permission'
                ? 'text-[#0754B8] dark:text-[#60A5FA] border-b-2 border-[#0875E8] font-bold'
                : 'text-[#526685] dark:text-[#B8C9E5] hover:text-[#10213D] dark:hover:text-white'
            }`}
          >
            Part-Time Work Rules (시간제취업)
          </button>
          <span className="opacity-40">·</span>
          <button
            onClick={() => setActiveTab('offices')}
            className={`pb-1 px-1 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'offices'
                ? 'text-[#0754B8] dark:text-[#60A5FA] border-b-2 border-[#0875E8] font-bold'
                : 'text-[#526685] dark:text-[#B8C9E5] hover:text-[#10213D] dark:hover:text-white'
            }`}
          >
            Immigration Offices Directory
          </button>
        </div>

        {/* Tab 1: Interactive Document Checklist */}
        {activeTab === 'checklist' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-[#526685] dark:text-[#B8C9E5] mb-2">
              <span>Check off items as you gather documents. Progress is saved to your Student Dashboard.</span>
              <button
                onClick={() => showToast('Document checklist saved to student dashboard')}
                className="text-[#0754B8] dark:text-[#60A5FA] font-semibold hover:underline cursor-pointer"
              >
                Save Progress
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {currentVisa.documents.map((doc) => {
                const isChecked = !!checkedDocuments[doc.id];
                return (
                  <div
                    key={doc.id}
                    onClick={() => toggleDocumentCheck(doc.id)}
                    className={`p-4 rounded-xl transition-all cursor-pointer flex items-start gap-3 select-none ${
                      isChecked
                        ? 'ekr-glass-card-active border-emerald-400/50 bg-emerald-500/10'
                        : 'ekr-glass-card'
                    }`}
                  >
                    <div className="mt-0.5">
                      <div className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${
                        isChecked ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-300 dark:border-white/30 bg-white/70 dark:bg-white/10'
                      }`}>
                        {isChecked && <CheckCircle2 className="w-3.5 h-3.5" />}
                      </div>
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-bold ${isChecked ? 'text-emerald-700 dark:text-emerald-300 line-through' : 'text-[#10213D] dark:text-white'}`}>
                          {doc.name}
                        </span>
                        <span className="text-[10px] text-[#526685] dark:text-[#B8C9E5] font-medium">
                          {doc.requiredFor}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#526685] dark:text-[#B8C9E5] mt-1 leading-relaxed">
                        {doc.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 2: ARC Registration Steps */}
        {activeTab === 'arc' && (
          <div className="ekr-glass-panel p-6 rounded-2xl space-y-4">
            <h3 className="text-sm font-bold text-[#10213D] dark:text-white">
              Alien Registration Card (ARC / 외국인등록증) Process
            </h3>
            <p className="text-xs text-[#526685] dark:text-[#B8C9E5] leading-relaxed">
              Every international student staying in South Korea for more than 90 days is required by Article 31 of the Immigration Act to register their residence within 90 days of arrival. Failure results in severe civil fines.
            </p>

            <div className="space-y-3 mt-4">
              {currentVisa.arcSteps.map((step, idx) => (
                <div key={idx} className="flex items-start gap-3 text-xs text-[#10213D] dark:text-slate-200 ekr-glass-subtle p-3.5 rounded-xl">
                  <span className="w-5 h-5 rounded-full ekr-glass-btn-primary flex items-center justify-center font-bold text-[11px] shrink-0 font-mono">
                    {idx + 1}
                  </span>
                  <div className="leading-relaxed">
                    {step}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 p-4 bg-blue-500/10 border border-blue-400/30 rounded-xl text-xs text-[#10213D] dark:text-blue-100 flex items-start gap-3">
              <Building className="w-4 h-4 text-[#0754B8] dark:text-[#60A5FA] shrink-0 mt-0.5" />
              <div>
                <strong>Pro-Tip for Fast Appointment:</strong> HiKorea visit reservations fill up 3–4 weeks in advance during August-September and February-March peak semesters. Book your appointment slot the day after you land in Incheon.
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Part-Time Work Permission Rules */}
        {activeTab === 'work-permission' && (
          <div className="ekr-glass-panel p-6 rounded-2xl space-y-5">
            <div>
              <h3 className="text-sm font-bold text-[#10213D] dark:text-white">
                Official Part-Time Work Permission (시간제취업 허가) Regulations
              </h3>
              <p className="text-xs text-[#526685] dark:text-[#B8C9E5] mt-1">
                Under Korean immigration law, D-2 and D-4 visa holders are permitted to work strictly within approved guidelines after obtaining formal permission.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 ekr-glass-subtle rounded-xl space-y-2">
                <span className="font-bold text-[#10213D] dark:text-white">D-2 Degree Students (Bachelor / Master / PhD)</span>
                <ul className="list-disc list-inside space-y-1 text-[#526685] dark:text-[#B8C9E5] text-[11px]">
                  <li><strong className="text-[#10213D] dark:text-white">Bachelor with TOPIK 3+:</strong> Up to 20 hrs/week (Mon-Fri) during semester.</li>
                  <li><strong className="text-[#10213D] dark:text-white">Bachelor with TOPIK 4+:</strong> Up to 25 hrs/week allowance.</li>
                  <li><strong className="text-[#10213D] dark:text-white">Master/PhD with TOPIK 4+:</strong> Up to 30 hrs/week during semester.</li>
                  <li><strong className="text-[#10213D] dark:text-white">Vacation (Summer/Winter):</strong> Unlimited hours permitted during break periods with prior reporting!</li>
                  <li><strong className="text-[#10213D] dark:text-white">Minimum GPA requirement:</strong> Must have achieved &ge; 2.0 GPA in previous semester.</li>
                </ul>
              </div>

              <div className="p-4 ekr-glass-subtle rounded-xl space-y-2">
                <span className="font-bold text-[#10213D] dark:text-white">D-4 Korean Language Trainees</span>
                <ul className="list-disc list-inside space-y-1 text-[#526685] dark:text-[#B8C9E5] text-[11px]">
                  <li><strong className="text-[#10213D] dark:text-white">Initial 6 Months:</strong> Strictly NO employment permitted.</li>
                  <li><strong className="text-[#10213D] dark:text-white">After 6 Months:</strong> Permitted up to 20 hrs/week if student possesses TOPIK 2+ and maintained &ge; 90% class attendance.</li>
                </ul>
              </div>
            </div>

            <div className="p-4 bg-rose-500/10 border border-rose-400/35 rounded-xl text-xs text-rose-900 dark:text-rose-200">
              <strong>Strict Warning:</strong> Prohibited industries include private tutoring outside certified academies, adult entertainment, construction/heavy manual labor, and freelance dispatch without prior endorsement. Working illegally leads to deportation and a 5-year re-entry ban.
            </div>
          </div>
        )}

        {/* Tab 4: Immigration Offices Directory */}
        {activeTab === 'offices' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {immigrationOffices.map((office, i) => (
                <div key={i} className="p-5 ekr-glass-card rounded-2xl space-y-2 text-xs">
                  <div className="flex items-start justify-between">
                    <h4 className="font-bold text-[#10213D] dark:text-white text-xs sm:text-sm">{office.name}</h4>
                  </div>
                  <div className="text-[#526685] dark:text-[#B8C9E5]">
                    <strong className="text-[#10213D] dark:text-white">Jurisdiction: </strong>
                    {office.jurisdiction}
                  </div>
                  <div className="text-[#526685] dark:text-[#B8C9E5]">
                    <strong className="text-[#10213D] dark:text-white">Address: </strong>
                    {office.address}
                  </div>
                  <div className="text-[#526685] dark:text-[#B8C9E5]">
                    <strong className="text-[#10213D] dark:text-white">Subway: </strong>
                    {office.subway}
                  </div>
                  <div className="pt-2 border-t border-slate-200/60 dark:border-white/10 flex items-center justify-between text-[#0754B8] dark:text-[#60A5FA] font-medium">
                    <span className="flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5" />
                      <span>{office.phone}</span>
                    </span>
                    <a
                      href="https://www.hikorea.go.kr"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline flex items-center gap-1"
                    >
                      <span>Book on HiKorea</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </section>
  );
};
