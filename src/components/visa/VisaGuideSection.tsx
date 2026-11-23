/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { visaGuidesData } from '../../data/mockData';
import { VisaCategory } from '../../types';
import {
  FileText,
  ShieldCheck,
  Clock,
  Briefcase,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  PhoneCall,
  Printer,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

export const VisaGuideSection: React.FC = () => {
  const [selectedGuideId, setSelectedGuideId] = useState<string>('d-2-student');
  const [checklistCompleted, setChecklistCompleted] = useState<Record<string, boolean>>({});

  const activeGuide: any =
    (visaGuidesData as any[]).find((g: any) => g.id === selectedGuideId) || visaGuidesData[0];

  const toggleChecklistItem = (doc: string) => {
    setChecklistCompleted((prev) => ({
      ...prev,
      [doc]: !prev[doc],
    }));
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      {/* Header */}
      <div className="border-b border-slate-200 pb-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-purple-600 mb-1">
              Ministry of Justice & HiKorea Immigration
            </div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              South Korea Visa & Immigration Center
            </h1>
            <p className="text-sm text-slate-600 mt-1 max-w-2xl">
              Official regulations and procedures for D-2 Degree, D-4 Language Training, Alien Registration (ARC), and Part-Time Work Permits (S-3).
            </p>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="https://www.hikorea.go.kr"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-colors"
            >
              <span>HiKorea Official Portal</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>

      {/* Visa Type Selector Segmented Controls */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {visaGuidesData.map((guide) => {
          const isSelected = guide.id === selectedGuideId;
          return (
            <button
              key={guide.id}
              onClick={() => setSelectedGuideId(guide.id)}
              className={`p-4 rounded-xl text-left border transition-all cursor-pointer ${
                isSelected
                  ? 'bg-blue-50 border-blue-600 shadow-sm'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="text-xs font-bold text-blue-700 font-mono">
                {guide.visaCode}
              </div>
              <div className="text-sm font-bold text-slate-900 mt-0.5 line-clamp-1">
                {guide.title.split('(')[0]}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                Fee: ₩{guide.feeKrw.toLocaleString()} · {guide.processingTimeDays} Days
              </div>
            </button>
          );
        })}
      </div>

      {/* Active Guide Detail Card */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        {/* Banner */}
        <div className="p-6 bg-slate-900 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="text-xs font-semibold text-blue-400 uppercase tracking-wider">
              Visa Classification: {activeGuide.visaCode}
            </div>
            <h2 className="text-xl font-bold mt-1 text-white">
              {activeGuide.title}
            </h2>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl">
              {activeGuide.targetAudience}
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="p-3 bg-slate-800 rounded-xl text-center">
              <div className="text-[10px] text-slate-400 uppercase">Processing</div>
              <div className="text-sm font-bold text-white font-mono">
                ~{activeGuide.processingTimeDays} Days
              </div>
            </div>
            <div className="p-3 bg-slate-800 rounded-xl text-center">
              <div className="text-[10px] text-slate-400 uppercase">Work Allowed</div>
              <div className="text-sm font-bold text-emerald-400 font-mono">
                {activeGuide.maxPartTimeHoursPerWeek}h / week
              </div>
            </div>
          </div>
        </div>

        {/* Guide Content */}
        <div className="p-6 lg:p-8 space-y-8 text-xs text-slate-700">
          {/* Step by Step Process */}
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">
              Application & Renewal Steps
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {activeGuide.applicationSteps.map((step) => (
                <div
                  key={step.stepNumber}
                  className="p-4 bg-slate-50 rounded-xl border border-slate-200 relative flex flex-col justify-between"
                >
                  <div>
                    <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-xs mb-3">
                      {step.stepNumber}
                    </span>
                    <h4 className="font-bold text-slate-900 text-xs mb-1">
                      {step.title}
                    </h4>
                    <p className="text-slate-600 leading-relaxed text-[11px]">
                      {step.instruction}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Interactive Document Checklist Generator */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Mandatory Document Checklist
                </h3>
                <p className="text-xs text-slate-500">
                  Click each required item as you prepare your physical submission folder.
                </p>
              </div>
              <span className="text-xs font-mono font-semibold text-blue-600">
                {Object.values(checklistCompleted).filter(Boolean).length} / {activeGuide.requiredDocuments.length} checked
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {activeGuide.requiredDocuments.map((doc) => {
                const isChecked = Boolean(checklistCompleted[doc]);
                return (
                  <div
                    key={doc}
                    onClick={() => toggleChecklistItem(doc)}
                    className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition-colors ${
                      isChecked
                        ? 'bg-emerald-50/60 border-emerald-300 text-emerald-950'
                        : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-800'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {}}
                      className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />
                    <span className={`text-xs leading-snug ${isChecked ? 'line-through text-slate-500' : 'font-medium'}`}>
                      {doc}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Legal Compliance & Important Warnings */}
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-2">
            <div className="flex items-center gap-2 text-rose-900 font-bold text-xs">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>Strict Legal Enforcement & Penalty Warning</span>
            </div>
            <ul className="space-y-1 text-rose-800 text-[11px] leading-relaxed pl-5 list-disc">
              {activeGuide.importantNotices.map((notice, idx) => (
                <li key={idx}>{notice}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* 1345 Direct Hotline Banner */}
      <div className="bg-slate-900 rounded-2xl p-6 text-white flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center shrink-0">
            <PhoneCall className="w-6 h-6 text-white" />
          </div>
          <div>
            <h4 className="font-bold text-base">Korea Immigration Service Helpline: 1345</h4>
            <p className="text-xs text-slate-300 mt-0.5">
              Dial 1345 (no area code needed). Available Monday-Friday 09:00 - 18:00 in 20 languages. Press 1 for English.
            </p>
          </div>
        </div>
        <a
          href="tel:1345"
          className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors whitespace-nowrap cursor-pointer shrink-0"
        >
          Call 1345 Now
        </a>
      </div>
    </div>
  );
};
