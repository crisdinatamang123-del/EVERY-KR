import React from 'react';
import { useApp } from '../context/AppContext';
import { EMERGENCY_CONTACTS } from '../data/mockData';
import {
  PhoneCall,
  X,
  AlertOctagon,
  HeartPulse,
  Shield,
  Copy,
  ExternalLink,
  Check
} from 'lucide-react';

export const GetHelpModal: React.FC = () => {
  const { isGetHelpModalOpen, setIsGetHelpModalOpen, showToast } = useApp();

  if (!isGetHelpModalOpen) return null;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    showToast(`Copied ${label} (${text}) to clipboard`);
  };

  const emergencyPhrases = [
    {
      korean: '구급차를 불러주세요! 긴급 상황입니다.',
      romaja: 'Gugeupchareul bulleo-juseyo! Gingeup sanghwang-imnida.',
      english: 'Please call an ambulance! It is an emergency.'
    },
    {
      korean: '여기는 [위치]입니다. 외국인 유학생입니다.',
      romaja: 'Yeogineun [wichi]-imnida. Oegukin yuhaksaeng-imnida.',
      english: 'I am at [location]. I am an international student.'
    },
    {
      korean: '영어나 제 모국어 통역을 연결해 주세요.',
      romaja: 'Yeongeona je moguk-eo tong-yeog-eul yeongyeol-hae juseyo.',
      english: 'Please connect an English or native language interpreter.'
    }
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#061B49]/55 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative w-full max-w-2xl ekr-glass-modal rounded-2xl border border-rose-300/60 dark:border-rose-500/35 overflow-hidden my-8 animate-fade-in flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-5 bg-rose-600/90 backdrop-blur-md text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
              <PhoneCall className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-white">
                Emergency & 24/7 Crisis Support
              </h2>
              <p className="text-xs text-rose-100">
                Official South Korean national emergency hotlines and student assistance
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsGetHelpModalOpen(false)}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          
          {/* Main Hotlines Grid */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-[#526685] dark:text-[#B8C9E5] uppercase tracking-wider">
              Immediate Assistance Hotlines
            </h3>

            {EMERGENCY_CONTACTS.map((item, idx) => (
              <div
                key={idx}
                className="p-4 ekr-glass-subtle rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-base font-extrabold text-rose-700 dark:text-rose-300 bg-rose-50/80 dark:bg-rose-950/50 px-2 py-0.5 rounded-md border border-rose-200 dark:border-rose-500/40">
                      {item.number}
                    </span>
                    <h4 className="text-xs font-bold text-[#10213D] dark:text-white">{item.title}</h4>
                  </div>
                  <p className="text-xs text-[#526685] dark:text-[#B8C9E5] mt-1.5 leading-relaxed">{item.description}</p>
                  <div className="text-[11px] text-[#526685]/80 dark:text-[#B8C9E5]/80 mt-1">
                    <strong>Languages:</strong> {item.languages}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => copyToClipboard(item.number, item.title)}
                    className="p-2 text-[#526685] dark:text-[#B8C9E5] hover:text-[#10213D] dark:hover:text-white ekr-glass-subtle rounded-lg cursor-pointer transition-colors"
                    title="Copy number"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <a
                    href={`tel:${item.number}`}
                    className="px-3.5 py-2 text-xs font-semibold text-white bg-rose-600/90 hover:bg-rose-600 rounded-xl transition-colors flex items-center gap-1.5 shadow-xs"
                  >
                    <PhoneCall className="w-3.5 h-3.5" />
                    <span>Dial Now</span>
                  </a>
                </div>
              </div>
            ))}
          </div>

          {/* Urgent Medical Phrases */}
          <div className="border-t border-slate-200/60 dark:border-white/12 pt-5">
            <h3 className="text-xs font-bold text-[#526685] dark:text-[#B8C9E5] uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <HeartPulse className="w-4 h-4 text-rose-600 dark:text-rose-400" />
              <span>Urgent Medical Phrases (Show to Paramedics / Police)</span>
            </h3>

            <div className="space-y-2">
              {emergencyPhrases.map((phrase, i) => (
                <div key={i} className="p-3 bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200/70 dark:border-rose-500/30 rounded-xl text-xs space-y-0.5">
                  <div className="font-bold text-[#10213D] dark:text-white text-sm">{phrase.korean}</div>
                  <div className="text-[11px] text-[#526685] dark:text-[#B8C9E5] font-mono italic">{phrase.romaja}</div>
                  <div className="text-xs text-[#10213D] dark:text-[#DCE8FA] font-medium pt-1">{phrase.english}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Mental Health & University Counseling */}
          <div className="p-4 bg-blue-50/70 dark:bg-[#0875E8]/15 border border-blue-200/70 dark:border-[#60A5FA]/30 rounded-xl text-xs text-[#10213D] dark:text-[#DCE8FA] space-y-1">
            <strong>Mental Health & Student Wellbeing: </strong>
            <p className="leading-relaxed">
              Struggling with culture shock, anxiety, or academic stress? Every Korean university operates an on-campus Student Counseling Center (학생상담센터) offering confidential English psychological support. You can also contact the Korea Mental Health Hotline at <strong>1577-0199</strong>.
            </p>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200/60 dark:border-white/12 bg-white/40 dark:bg-white/5 flex items-center justify-between text-xs text-[#526685] dark:text-[#B8C9E5]">
          <span>Official 119 and 112 calls in Korea are free of charge.</span>
          <button
            onClick={() => setIsGetHelpModalOpen(false)}
            className="px-4 py-2 font-semibold text-[#10213D] dark:text-white ekr-glass-subtle rounded-xl hover:bg-white/80 dark:hover:bg-white/15 cursor-pointer transition-colors"
          >
            Close Support
          </button>
        </div>

      </div>
    </div>
  );
};
