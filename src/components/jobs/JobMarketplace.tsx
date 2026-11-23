/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { JobListing } from '../../types';
import {
  Briefcase,
  Search,
  MapPin,
  Clock,
  DollarSign,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Bookmark,
  X,
  Send,
  Building,
} from 'lucide-react';

export const JobMarketplace: React.FC = () => {
  const { jobs, savedJobIds, toggleFavoriteJob, applyToJob, formatKrw, currentUser, addToast } = useApp();

  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [koreanLevelFilter, setKoreanLevelFilter] = useState<string>('all');
  const [selectedJob, setSelectedJob] = useState<JobListing | null>(null);

  // Application modal state
  const [applyingJob, setApplyingJob] = useState<JobListing | null>(null);
  const [resumeSummary, setResumeSummary] = useState('');

  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      const q = search.toLowerCase();
      const matchesSearch =
        job.title.toLowerCase().includes(q) ||
        job.companyName.toLowerCase().includes(q) ||
        job.location.toLowerCase().includes(q);

      const matchesType = selectedType === 'all' || job.jobType === selectedType;
      const matchesKorean =
        koreanLevelFilter === 'all' || job.koreanLevelRequired.toLowerCase().includes(koreanLevelFilter.toLowerCase());

      return matchesSearch && matchesType && matchesKorean;
    });
  }, [jobs, search, selectedType, koreanLevelFilter]);

  const handleApplySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!applyingJob) return;
    if (!resumeSummary.trim()) {
      addToast('Please provide a brief student resume summary or self-introduction.', 'warning');
      return;
    }

    applyToJob(applyingJob.id, resumeSummary);
    setResumeSummary('');
    setApplyingJob(null);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="border-b border-slate-200 pb-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-emerald-600 mb-1">
              Legal S-3 Work Authorization Verified
            </div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              International Student Job Marketplace
            </h1>
            <p className="text-sm text-slate-600 mt-1 max-w-2xl">
              Curated part-time jobs, campus assistantships, and bilingual tech internships meeting Korean statutory minimum wage (₩10,030+/hr) with S-3 contract documentation.
            </p>
          </div>
          <div className="text-xs text-slate-500 font-mono">
            <strong>{filteredJobs.length}</strong> active student positions available
          </div>
        </div>
      </div>

      {/* S-3 Legal Warning Notice */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl flex items-start gap-3 text-xs text-blue-900">
        <AlertTriangle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <span className="font-bold">Legal Compliance Reminder for D-2 / D-4 Students:</span>
          <p className="text-blue-800 leading-relaxed text-[11px]">
            International students must obtain approval from their university international student advisor and file an online Part-time Work Permit (S-3) via HiKorea <strong>before</strong> their first day of work. Working in manufacturing factories, delivery logistics hubs, or entertainment establishments is strictly forbidden by immigration law.
          </p>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3 text-xs">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          <div className="md:col-span-5 relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by job title, company, or subway station (e.g. Barista, Sinchon, AI)..."
              className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="md:col-span-3">
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full py-1.5 px-2 bg-white border border-slate-200 rounded-lg focus:outline-none"
            >
              <option value="all">All Employment Types</option>
              <option value="Part-time">Part-time (시간제)</option>
              <option value="Internship">Internship (인턴십)</option>
              <option value="On-Campus">On-Campus (교내 근로)</option>
            </select>
          </div>

          <div className="md:col-span-4">
            <select
              value={koreanLevelFilter}
              onChange={(e) => setKoreanLevelFilter(e.target.value)}
              className="w-full py-1.5 px-2 bg-white border border-slate-200 rounded-lg focus:outline-none"
            >
              <option value="all">Any Korean Language Level</option>
              <option value="None">No Korean Required (English Only)</option>
              <option value="Basic">Basic Korean (TOPIK 2)</option>
              <option value="Intermediate">Intermediate (TOPIK 3-4)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Job Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredJobs.map((job) => {
          const isSaved = savedJobIds.includes(job.id);
          return (
            <div
              key={job.id}
              className="bg-white rounded-2xl border border-slate-200 hover:border-emerald-400 hover:shadow-lg transition-all p-6 flex flex-col justify-between"
            >
              <div>
                {/* Header */}
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-500 uppercase">
                        {job.companyName}
                      </span>
                      {job.verifiedEmployer && (
                        <span className="text-emerald-600 inline-flex items-center gap-0.5 text-[11px] font-semibold">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>Verified</span>
                        </span>
                      )}
                    </div>
                    <h3 className="font-bold text-slate-900 text-base mt-0.5 leading-snug">
                      {job.title}
                    </h3>
                  </div>

                  <button
                    onClick={() => toggleFavoriteJob(job.id)}
                    className="p-2 text-slate-400 hover:text-blue-600 transition-colors"
                    title={isSaved ? 'Remove from saved' : 'Save job'}
                  >
                    <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-blue-600 text-blue-600' : ''}`} />
                  </button>
                </div>

                {/* Wage and Hours Highlight */}
                <div className="flex items-center gap-3 my-3 p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">HOURLY WAGE</span>
                    <span className="font-bold text-blue-600 font-mono text-sm">
                      {formatKrw(job.hourlyWageKrw)}/hr
                    </span>
                  </div>
                  <span className="text-slate-300">|</span>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">SCHEDULE</span>
                    <span className="font-medium text-slate-800">
                      {job.hoursPerWeek} hrs/week
                    </span>
                  </div>
                  <span className="text-slate-300">|</span>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">KOREAN LEVEL</span>
                    <span className="font-medium text-slate-800 truncate">
                      {job.koreanLevelRequired}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed mb-3">
                  {job.description}
                </p>

                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{job.location}</span>
                  <span>·</span>
                  <span>{job.nearestStation}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center gap-2">
                <button
                  onClick={() => setApplyingJob(job)}
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Apply with Student Profile</span>
                </button>
                <button
                  onClick={() => setSelectedJob(job)}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                >
                  Details
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Apply Modal with Glassmorphism */}
      {applyingJob && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/40 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl max-w-lg w-full shadow-[0_24px_60px_-12px_rgba(15,23,42,0.25)] border border-white/60 overflow-hidden ring-1 ring-slate-900/5">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/60 bg-white/50 backdrop-blur-sm">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Apply for {applyingJob.title}
                </h3>
                <p className="text-xs text-slate-500">{applyingJob.companyName}</p>
              </div>
              <button
                onClick={() => setApplyingJob(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleApplySubmit} className="p-6 space-y-4 text-xs">
              <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-200 space-y-1">
                <div className="text-[11px] font-bold text-blue-900">Applicant Details (From Profile):</div>
                <div className="text-slate-700">
                  {currentUser?.name || 'International Student'} · {currentUser?.university || 'Yonsei University'}
                </div>
                <div className="text-slate-500 text-[11px]">
                  Visa: {currentUser?.visaType || 'D-2'} · Email: {currentUser?.email}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Brief Cover Message & Language Skills
                </label>
                <textarea
                  rows={4}
                  required
                  value={resumeSummary}
                  onChange={(e) => setResumeSummary(e.target.value)}
                  placeholder="Introduce yourself, your availability hours, past experience, and Korean/English language confidence..."
                  className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center gap-2 text-slate-600 text-[11px]">
                <input type="checkbox" required id="confirmS3" className="rounded text-blue-600" />
                <label htmlFor="confirmS3">
                  I understand this job requires standard university S-3 approval before commencement.
                </label>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors cursor-pointer"
              >
                Submit Application
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Detail Modal with Glassmorphism */}
      {selectedJob && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/40 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl max-w-lg w-full shadow-[0_24px_60px_-12px_rgba(15,23,42,0.25)] border border-white/60 overflow-hidden ring-1 ring-slate-900/5">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/60 bg-white/50 backdrop-blur-sm">
              <div>
                <h3 className="text-sm font-bold text-slate-900">{selectedJob.title}</h3>
                <p className="text-xs text-slate-500">{selectedJob.companyName}</p>
              </div>
              <button
                onClick={() => setSelectedJob(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs text-slate-700">
              <div className="space-y-1">
                <h4 className="font-bold text-slate-900">Job Description</h4>
                <p className="leading-relaxed text-slate-600">{selectedJob.description}</p>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 mb-1">Key Responsibilities</h4>
                <ul className="space-y-1 pl-4 list-disc text-slate-600">
                  {selectedJob.responsibilities.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 mb-1">Benefits</h4>
                <ul className="space-y-1 pl-4 list-disc text-slate-600">
                  {selectedJob.benefits.map((b, i) => (
                    <li key={i}>{b}</li>
                  ))}
                </ul>
              </div>

              <div className="pt-2 border-t border-slate-100 flex justify-end gap-2">
                <button
                  onClick={() => {
                    const target = selectedJob;
                    setSelectedJob(null);
                    setApplyingJob(target);
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-xs"
                >
                  Apply Now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
