/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * EVERYKR Admin Student Application Analytics Charts
 * Computes all 6 admissions charts strictly from real Firestore SmartApplicationRecord data.
 * Zero dummy or fabricated metrics.
 */

import React, { useMemo } from 'react';
import {
  BarChart3,
  Building2,
  Calendar,
  Globe,
  GraduationCap,
  PieChart,
  TrendingUp,
} from 'lucide-react';
import type { SmartApplicationRecord, SmartApplicationStatus } from '../../types/smartApplication';
import {
  SMART_APPLICATION_STATUS_META,
  normalizeSmartApplicationStatus,
} from '../../types/smartApplication';

interface AdminApplicationChartsProps {
  applications: SmartApplicationRecord[];
  onFilterByStatus?: (status: SmartApplicationStatus) => void;
  onFilterByUniversity?: (universityId: string) => void;
  onFilterByNationality?: (nationality: string) => void;
  onFilterByIntake?: (intake: string) => void;
  onFilterByDegree?: (degree: string) => void;
}

interface RankedBucket {
  key: string;
  label: string;
  count: number;
  percent: number;
}

const STATUS_BAR_COLORS: Record<SmartApplicationStatus, string> = {
  draft: '#94A3B8',
  submitted: '#2563EB',
  under_review: '#4F46E5',
  documents_missing: '#D97706',
  sent_to_university: '#0284C7',
  interview: '#7C3AED',
  admitted: '#059669',
  rejected: '#E11D48',
  visa_processing: '#0D9488',
  completed: '#047857',
  withdrawn: '#64748B',
};

function buildRankedBuckets(
  items: SmartApplicationRecord[],
  extractor: (app: SmartApplicationRecord) => { key: string; label: string } | null,
  maxItems = 8
): RankedBucket[] {
  const counts = new Map<string, { label: string; count: number }>();
  for (const app of items) {
    const res = extractor(app);
    if (!res || !res.key) continue;
    const prev = counts.get(res.key);
    if (prev) {
      prev.count += 1;
    } else {
      counts.set(res.key, { label: res.label, count: 1 });
    }
  }
  const total = Math.max(1, items.length);
  return Array.from(counts.entries())
    .map(([key, val]) => ({
      key,
      label: val.label,
      count: val.count,
      percent: Math.round((val.count / total) * 100),
    }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, maxItems);
}

function formatMonthLabel(ym: string): string {
  const [y, m] = ym.split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const idx = Number(m) - 1;
  if (idx >= 0 && idx < 12 && y) {
    return `${months[idx]} ${y.slice(-2)}`;
  }
  return ym;
}

const RankedBarCard: React.FC<{
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  buckets: RankedBucket[];
  barColorClass: string;
  emptyText: string;
  onSelect?: (key: string) => void;
}> = ({ title, subtitle, icon, buckets, barColorClass, emptyText, onSelect }) => {
  const maxCount = Math.max(1, ...buckets.map((b) => b.count));

  return (
    <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0B172B] p-4 flex flex-col justify-between">
      <div className="flex items-center justify-between gap-2 mb-3.5">
        <div className="min-w-0">
          <h4 className="text-xs font-extrabold text-[#081426] dark:text-white tracking-tight truncate">
            {title}
          </h4>
          <p className="text-[11px] text-[#526685] dark:text-[#93A9CB] truncate">{subtitle}</p>
        </div>
        <div className="w-8 h-8 rounded-lg bg-[#F4F8FD] dark:bg-white/5 border border-slate-200/70 dark:border-white/10 flex items-center justify-center shrink-0 text-[#2563EB] dark:text-[#4BA3FF]">
          {icon}
        </div>
      </div>

      {buckets.length === 0 ? (
        <div className="py-8 text-center text-xs text-[#526685] dark:text-[#93A9CB]">
          {emptyText}
        </div>
      ) : (
        <div className="space-y-2.5">
          {buckets.map((bucket) => {
            const widthPct = Math.max(6, Math.round((bucket.count / maxCount) * 100));
            return (
              <button
                key={bucket.key}
                type="button"
                onClick={() => onSelect?.(bucket.key)}
                disabled={!onSelect}
                className={`w-full text-left group ${
                  onSelect ? 'cursor-pointer' : 'cursor-default'
                }`}
              >
                <div className="flex items-center justify-between gap-2 text-xs mb-1">
                  <span className="font-semibold text-[#081426] dark:text-slate-200 truncate group-hover:text-[#2563EB] dark:group-hover:text-[#4BA3FF] transition-colors">
                    {bucket.label}
                  </span>
                  <span className="font-bold text-[#081426] dark:text-white tabular-nums shrink-0">
                    {bucket.count}{' '}
                    <span className="text-[10px] font-medium text-[#526685] dark:text-[#93A9CB]">
                      ({bucket.percent}%)
                    </span>
                  </span>
                </div>
                <div className="h-2 rounded-full bg-[#F4F8FD] dark:bg-white/10 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${barColorClass}`}
                    style={{ width: `${widthPct}%` }}
                  />
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export const AdminApplicationCharts: React.FC<AdminApplicationChartsProps> = ({
  applications,
  onFilterByStatus,
  onFilterByUniversity,
  onFilterByNationality,
  onFilterByIntake,
  onFilterByDegree,
}) => {
  const byCountry = useMemo(
    () =>
      buildRankedBuckets(applications, (app) => {
        const nat = (app.personal?.nationality || '').trim();
        return { key: nat || 'Unspecified', label: nat || 'Unspecified' };
      }),
    [applications]
  );

  const byUniversity = useMemo(
    () =>
      buildRankedBuckets(applications, (app) => ({
        key: app.universityId || app.universityName || 'unknown',
        label: app.universityName || app.universityId || 'Unknown University',
      })),
    [applications]
  );

  const byIntake = useMemo(
    () =>
      buildRankedBuckets(applications, (app) => {
        const intake = (app.intake || '').trim();
        return { key: intake || 'Unspecified', label: intake || 'Unspecified' };
      }),
    [applications]
  );

  const byDegree = useMemo(
    () =>
      buildRankedBuckets(applications, (app) => {
        const degree = (app.degreeLevel || '').trim();
        return { key: degree || 'Unspecified', label: degree || 'Unspecified' };
      }),
    [applications]
  );

  const monthlyTrend = useMemo(() => {
    const map = new Map<string, number>();
    for (const app of applications) {
      const iso = app.submittedAt || app.createdAt || '';
      const ym = iso.slice(0, 7);
      if (/^\d{4}-\d{2}$/.test(ym)) {
        map.set(ym, (map.get(ym) || 0) + 1);
      }
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([ym, count]) => ({
        ym,
        label: formatMonthLabel(ym),
        count,
      }));
  }, [applications]);

  const statusDistribution = useMemo(() => {
    const counts = new Map<SmartApplicationStatus, number>();
    for (const app of applications) {
      const s = normalizeSmartApplicationStatus(app.status);
      counts.set(s, (counts.get(s) || 0) + 1);
    }
    const total = Math.max(1, applications.length);
    return Array.from(counts.entries())
      .map(([status, count]) => ({
        status,
        label: SMART_APPLICATION_STATUS_META[status]?.label || status,
        count,
        percent: Math.round((count / total) * 100),
        color: STATUS_BAR_COLORS[status] || '#2563EB',
      }))
      .sort((a, b) => b.count - a.count);
  }, [applications]);

  const maxMonthly = Math.max(1, ...monthlyTrend.map((m) => m.count));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {/* 1. Applications by Country */}
        <RankedBarCard
          title="Applications by Country"
          subtitle="Applicant nationalities from live records"
          icon={<Globe className="w-4 h-4" />}
          buckets={byCountry}
          barColorClass="bg-[#2563EB]"
          emptyText="No country data yet."
          onSelect={
            onFilterByNationality
              ? (key) => {
                  if (key !== 'Unspecified') onFilterByNationality(key);
                }
              : undefined
          }
        />

        {/* 2. Applications by University */}
        <RankedBarCard
          title="Applications by University"
          subtitle="Top destination institutions"
          icon={<Building2 className="w-4 h-4" />}
          buckets={byUniversity}
          barColorClass="bg-[#081426] dark:bg-[#4BA3FF]"
          emptyText="No university data yet."
          onSelect={onFilterByUniversity}
        />

        {/* 3. Applications by Intake */}
        <RankedBarCard
          title="Applications by Intake"
          subtitle="Semester intake distribution"
          icon={<Calendar className="w-4 h-4" />}
          buckets={byIntake}
          barColorClass="bg-[#4BA3FF]"
          emptyText="No intake data yet."
          onSelect={
            onFilterByIntake
              ? (key) => {
                  if (key !== 'Unspecified') onFilterByIntake(key);
                }
              : undefined
          }
        />

        {/* 4. Applications by Degree */}
        <RankedBarCard
          title="Applications by Degree"
          subtitle="Bachelor, Master, PhD & KLP split"
          icon={<GraduationCap className="w-4 h-4" />}
          buckets={byDegree}
          barColorClass="bg-[#D6B875]"
          emptyText="No degree data yet."
          onSelect={
            onFilterByDegree
              ? (key) => {
                  if (key !== 'Unspecified') onFilterByDegree(key);
                }
              : undefined
          }
        />

        {/* 5. Monthly Application Trends */}
        <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0B172B] p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2 mb-3.5">
            <div className="min-w-0">
              <h4 className="text-xs font-extrabold text-[#081426] dark:text-white tracking-tight truncate">
                Monthly Application Trends
              </h4>
              <p className="text-[11px] text-[#526685] dark:text-[#93A9CB] truncate">
                Volume by submission / creation month
              </p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-[#F4F8FD] dark:bg-white/5 border border-slate-200/70 dark:border-white/10 flex items-center justify-center shrink-0 text-[#2563EB] dark:text-[#4BA3FF]">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>

          {monthlyTrend.length === 0 ? (
            <div className="py-8 text-center text-xs text-[#526685] dark:text-[#93A9CB]">
              No monthly trend data yet.
            </div>
          ) : (
            <div className="space-y-2">
              <div className="h-36 flex items-end gap-2 pt-4 px-1">
                {monthlyTrend.map((m) => {
                  const pct = Math.max(10, Math.round((m.count / maxMonthly) * 100));
                  return (
                    <div
                      key={m.ym}
                      className="flex-1 min-w-0 flex flex-col items-center justify-end h-full gap-1"
                    >
                      <span className="text-[10px] font-bold text-[#081426] dark:text-white tabular-nums">
                        {m.count}
                      </span>
                      <div className="w-full flex-1 flex items-end">
                        <div
                          className="w-full rounded-t-md bg-gradient-to-t from-[#2563EB] to-[#4BA3FF] transition-all"
                          style={{ height: `${pct}%` }}
                          title={`${m.label}: ${m.count} application${m.count === 1 ? '' : 's'}`}
                        />
                      </div>
                      <span className="text-[10px] text-[#526685] dark:text-[#93A9CB] truncate max-w-full">
                        {m.label}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="pt-2 border-t border-slate-100 dark:border-white/10 flex items-center justify-between text-[11px] text-[#526685] dark:text-[#93A9CB]">
                <span className="inline-flex items-center gap-1">
                  <BarChart3 className="w-3.5 h-3.5 text-[#2563EB]" />
                  <span>{monthlyTrend.length} active month(s)</span>
                </span>
                <span className="font-bold text-[#081426] dark:text-white tabular-nums">
                  {applications.length} total
                </span>
              </div>
            </div>
          )}
        </div>

        {/* 6. Application Status Distribution */}
        <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0B172B] p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2 mb-3.5">
            <div className="min-w-0">
              <h4 className="text-xs font-extrabold text-[#081426] dark:text-white tracking-tight truncate">
                Application Status Distribution
              </h4>
              <p className="text-[11px] text-[#526685] dark:text-[#93A9CB] truncate">
                Pipeline stage breakdown
              </p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-[#F4F8FD] dark:bg-white/5 border border-slate-200/70 dark:border-white/10 flex items-center justify-center shrink-0 text-[#2563EB] dark:text-[#4BA3FF]">
              <PieChart className="w-4 h-4" />
            </div>
          </div>

          {statusDistribution.length === 0 ? (
            <div className="py-8 text-center text-xs text-[#526685] dark:text-[#93A9CB]">
              No status records yet.
            </div>
          ) : (
            <div className="space-y-3">
              {/* Segmented horizontal bar */}
              <div className="h-3.5 w-full rounded-full overflow-hidden flex bg-slate-100 dark:bg-white/10">
                {statusDistribution.map((item) => (
                  <button
                    key={item.status}
                    type="button"
                    onClick={() => onFilterByStatus?.(item.status)}
                    title={`${item.label}: ${item.count} (${item.percent}%)`}
                    style={{
                      width: `${Math.max(2, (item.count / Math.max(1, applications.length)) * 100)}%`,
                      backgroundColor: item.color,
                    }}
                    className="h-full transition-opacity hover:opacity-85 cursor-pointer"
                  />
                ))}
              </div>

              {/* Compact legend list */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1.5">
                {statusDistribution.map((item) => (
                  <button
                    key={item.status}
                    type="button"
                    onClick={() => onFilterByStatus?.(item.status)}
                    className="flex items-center justify-between gap-2 text-left py-0.5 rounded hover:bg-[#F4F8FD] dark:hover:bg-white/5 px-1 transition-colors cursor-pointer"
                  >
                    <span className="inline-flex items-center gap-1.5 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-sm shrink-0"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-[11px] font-semibold text-[#081426] dark:text-slate-200 truncate">
                        {item.label}
                      </span>
                    </span>
                    <span className="text-[11px] font-bold text-[#081426] dark:text-white tabular-nums shrink-0">
                      {item.count} ({item.percent}%)
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
