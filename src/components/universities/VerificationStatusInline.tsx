import React from 'react';
import {
  ShieldCheck,
  AlertCircle,
  Calculator,
  Clock,
  History,
  ExternalLink,
  CheckCircle2,
} from 'lucide-react';
import type {
  FiveTierVerificationStatus,
  EightPartCompletenessChecklist,
} from '../../utils/fiveTierVerification';
import { FIVE_TIER_DEFINITIONS } from '../../utils/fiveTierVerification';

interface VerificationStatusInlineProps {
  status: FiveTierVerificationStatus;
  lastCheckedDate?: string;
  sourceUrl?: string;
  sourceLabel?: string;
  compact?: boolean;
  inverseOnDarkHero?: boolean;
  className?: string;
}

const TIER_VISUAL_CONFIG: Record<
  FiveTierVerificationStatus,
  {
    Icon: React.ComponentType<{ className?: string }>;
    textClass: string;
    heroTextClass: string;
  }
> = {
  'Officially verified': {
    Icon: ShieldCheck,
    textClass: 'text-emerald-700 dark:text-emerald-300',
    heroTextClass: 'text-emerald-300',
  },
  'Available, not independently verified': {
    Icon: AlertCircle,
    textClass: 'text-amber-700 dark:text-amber-300',
    heroTextClass: 'text-amber-200',
  },
  Estimated: {
    Icon: Calculator,
    textClass: 'text-sky-700 dark:text-sky-300',
    heroTextClass: 'text-sky-200',
  },
  'Not announced': {
    Icon: Clock,
    textClass: 'text-slate-600 dark:text-slate-400',
    heroTextClass: 'text-slate-300',
  },
  Outdated: {
    Icon: History,
    textClass: 'text-rose-700 dark:text-rose-300',
    heroTextClass: 'text-rose-300',
  },
};

/**
 * Renders EVERYKR's standardized 5-tier verification status using clean inline typography
 * with explicit icon + text label (never hue-only, never pill-badge clutter).
 */
export const VerificationStatusInline: React.FC<VerificationStatusInlineProps> = ({
  status,
  lastCheckedDate,
  sourceUrl,
  sourceLabel = 'Official Source',
  compact = false,
  inverseOnDarkHero = false,
  className = '',
}) => {
  const cfg = TIER_VISUAL_CONFIG[status] || TIER_VISUAL_CONFIG['Available, not independently verified'];
  const Icon = cfg.Icon;
  const toneClass = inverseOnDarkHero ? cfg.heroTextClass : cfg.textClass;
  const metaToneClass = inverseOnDarkHero
    ? 'text-slate-300'
    : 'text-slate-500 dark:text-slate-400';
  const linkToneClass = inverseOnDarkHero
    ? 'text-teal-300 hover:underline'
    : 'text-[#1769AA] dark:text-[#19B6A4] hover:underline';

  return (
    <span
      className={`inline-flex items-center gap-1.5 flex-wrap text-xs ${className}`}
      data-verification-tier={status}
    >
      <span className={`inline-flex items-center gap-1 font-semibold ${toneClass}`}>
        <Icon className="w-3.5 h-3.5 shrink-0" />
        <span>{status}</span>
      </span>

      {!compact && lastCheckedDate && (
        <>
          <span aria-hidden="true" className={metaToneClass}>
            ·
          </span>
          <span className={`font-mono tabular-nums text-[11px] ${metaToneClass}`}>
            Checked {lastCheckedDate}
          </span>
        </>
      )}

      {!compact && sourceUrl && (
        <>
          <span aria-hidden="true" className={metaToneClass}>
            ·
          </span>
          <a
            href={sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className={`inline-flex items-center gap-1 font-semibold text-[11px] ${linkToneClass}`}
          >
            <span>{sourceLabel}</span>
            <ExternalLink className="w-3 h-3 shrink-0" />
          </a>
        </>
      )}
    </span>
  );
};

interface EightPartChecklistGridProps {
  checklist: EightPartCompletenessChecklist;
  tuitionTier?: FiveTierVerificationStatus;
  deadlinesTier?: FiveTierVerificationStatus;
  compact?: boolean;
}

export const EightPartChecklistGrid: React.FC<EightPartChecklistGridProps> = ({
  checklist,
  tuitionTier,
  deadlinesTier,
  compact = false,
}) => {
  const items: {
    key: string;
    label: string;
    passed: boolean;
    tierNote?: string;
  }[] = [
    {
      key: 'basicInfoComplete',
      label: 'Basic info complete',
      passed: checklist.basicInfoComplete,
      tierNote: checklist.basicInfoComplete ? 'Officially verified' : 'Pending contact field',
    },
    {
      key: 'officialLogoVerified',
      label: 'Official logo verified',
      passed: checklist.officialLogoVerified,
      tierNote: checklist.officialLogoVerified ? 'Officially verified' : 'Pending official CI file',
    },
    {
      key: 'campusImagesVerified',
      label: 'Campus images verified',
      passed: checklist.campusImagesVerified,
      tierNote: checklist.campusImagesVerified ? 'Officially verified' : 'Not yet uploaded',
    },
    {
      key: 'programsVerified',
      label: 'Programs verified',
      passed: checklist.programsVerified,
      tierNote: checklist.programsVerified ? 'Officially verified' : 'Not announced',
    },
    {
      key: 'requirementsVerified',
      label: 'Requirements verified',
      passed: checklist.requirementsVerified,
      tierNote: checklist.requirementsVerified ? 'Officially verified' : 'Available, unverified',
    },
    {
      key: 'tuitionVerified',
      label: 'Tuition verified',
      passed: checklist.tuitionVerified,
      tierNote: tuitionTier || (checklist.tuitionVerified ? 'Officially verified' : 'Estimated'),
    },
    {
      key: 'scholarshipsVerified',
      label: 'Scholarships verified',
      passed: checklist.scholarshipsVerified,
      tierNote: checklist.scholarshipsVerified ? 'Officially verified' : 'Available, unverified',
    },
    {
      key: 'deadlinesVerified',
      label: 'Deadlines verified',
      passed: checklist.deadlinesVerified,
      tierNote: deadlinesTier || (checklist.deadlinesVerified ? 'Officially verified' : 'Not announced'),
    },
  ];

  if (compact) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[11px]">
        {items.map((item) => (
          <div
            key={item.key}
            className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300"
            title={`${item.label}: ${item.tierNote}`}
          >
            {item.passed ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
            )}
            <span className="truncate">{item.label.replace(' verified', '').replace(' complete', '')}</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
      {items.map((item) => (
        <div
          key={item.key}
          className="flex items-center justify-between gap-2 py-2 px-3 rounded-lg bg-white dark:bg-[#10243A] border border-slate-200/80 dark:border-slate-800"
        >
          <div className="flex items-center gap-2 min-w-0">
            {item.passed ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
            )}
            <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">{item.label}</span>
          </div>
          <span
            className={`font-mono text-[11px] shrink-0 ${
              item.passed
                ? 'text-emerald-700 dark:text-emerald-300 font-semibold'
                : 'text-amber-700 dark:text-amber-300'
            }`}
          >
            {item.tierNote}
          </span>
        </div>
      ))}
    </div>
  );
};

export const FiveTierVerificationLegend: React.FC = () => {
  return (
    <div className="rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 p-4 space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h3 className="text-xs font-bold text-[#10243A] dark:text-white">
          EVERYKR 5-Tier Data Verification Standard
        </h3>
        <span className="text-[11px] text-slate-500 dark:text-slate-400">
          Zero-fabrication policy · Every metric carries explicit source provenance
        </span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3 text-xs">
        {FIVE_TIER_DEFINITIONS.map((def) => (
          <div
            key={def.tier}
            className="p-3 rounded-lg bg-white dark:bg-[#10243A] border border-slate-200/70 dark:border-slate-800 space-y-1"
          >
            <VerificationStatusInline status={def.tier} compact />
            <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
              {def.description}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};
