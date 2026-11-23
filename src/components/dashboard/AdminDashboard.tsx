/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { isSupabaseConfigured } from '../../lib/supabase';
import { EveryKrAnimatedLogo } from '../common/EveryKrAnimatedLogo';
import {
  ShieldCheck,
  Users,
  Building2,
  GraduationCap,
  ShoppingBag,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Database,
  FileCode2,
  Briefcase,
  Flag,
  Trash2,
  Check,
  CheckCircle2,
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const {
    currentUser,
    loginAs,
    universities,
    housing,
    marketItems,
    communityPosts,
    studentJobs,
    setShowDeploymentModal,
    addToast,
    formatKrw,
  } = useApp();

  const [activeAdminTab, setActiveAdminTab] = useState<'overview' | 'jobs' | 'housing' | 'community'>('overview');

  const [verifiedLandlords, setVerifiedLandlords] = useState<Record<string, boolean>>({
    'house-1': true,
    'house-2': true,
    'house-3': true,
    'house-4': true,
    'house-5': false,
    'house-6': true,
  });

  const [jobApprovals, setJobApprovals] = useState<Record<string, boolean>>({
    'job-1': true,
    'job-2': true,
    'job-3': true,
    'job-4': true,
  });

  const toggleVerification = (id: string) => {
    setVerifiedLandlords((prev) => {
      const next = !prev[id];
      addToast(`Housing listing #${id} verification set to: ${next ? 'Verified' : 'Unverified'}`, 'info');
      return { ...prev, [id]: next };
    });
  };

  const toggleJobApproval = (id: string) => {
    setJobApprovals((prev) => {
      const next = !prev[id];
      addToast(`Student Job #${id} set to: ${next ? 'Approved & Listed' : 'Hidden for Audit'}`, next ? 'success' : 'warning');
      return { ...prev, [id]: next };
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Banner */}
      <div className="bg-slate-900 rounded-3xl p-6 lg:p-8 text-white relative overflow-hidden shadow-lg border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white font-extrabold text-xl flex items-center justify-center shrink-0">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <div>
              <div className="mb-1.5">
                <EveryKrAnimatedLogo variant="static" isNight={true} imgClassName="h-6 sm:h-7" />
              </div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold">EveryKR Operations Console</h1>
                <span className="text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded">
                  Super Admin
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Moderation, verified housing audit, S-3 job wage compliance, and Supabase telemetry.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => loginAs('student')}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
            >
              Switch to Student View
            </button>
            <button
              onClick={() => setShowDeploymentModal(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <FileCode2 className="w-3.5 h-3.5" />
              <span>Deployment & DB Guide</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-white rounded-2xl border border-slate-200">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Active Students</span>
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 font-mono">24,810</div>
          <div className="text-[11px] text-emerald-600 font-medium mt-1">
            Across 340+ campuses in Korea
          </div>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-slate-200">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">S-3 Student Jobs</span>
            <Briefcase className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 font-mono">
            {studentJobs.length} Verified
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Min ₩10,030/hr Korean law
          </div>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-slate-200">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Housing Units</span>
            <Building2 className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 font-mono">
            {housing.length}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Goshiwons & Studios
          </div>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-slate-200">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Persistence Layer</span>
            <Database className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-sm font-bold text-slate-900 truncate">
            {isSupabaseConfigured ? 'Supabase Live' : 'Firebase + Local'}
          </div>
          <div className="text-[11px] text-blue-600 font-medium mt-1">
            Ready for Cloudflare Pages
          </div>
        </div>
      </div>

      {/* Admin Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 text-xs font-semibold">
        <button
          onClick={() => setActiveAdminTab('overview')}
          className={`px-3 py-2 rounded-lg cursor-pointer transition-colors ${
            activeAdminTab === 'overview' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Overview & System Status
        </button>
        <button
          onClick={() => setActiveAdminTab('jobs')}
          className={`px-3 py-2 rounded-lg cursor-pointer transition-colors flex items-center gap-1.5 ${
            activeAdminTab === 'jobs' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Briefcase className="w-3.5 h-3.5" />
          <span>S-3 Job Postings ({studentJobs.length})</span>
        </button>
        <button
          onClick={() => setActiveAdminTab('housing')}
          className={`px-3 py-2 rounded-lg cursor-pointer transition-colors flex items-center gap-1.5 ${
            activeAdminTab === 'housing' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>Housing Audits ({housing.length})</span>
        </button>
        <button
          onClick={() => setActiveAdminTab('community')}
          className={`px-3 py-2 rounded-lg cursor-pointer transition-colors flex items-center gap-1.5 ${
            activeAdminTab === 'community' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Flag className="w-3.5 h-3.5" />
          <span>Content Moderation ({communityPosts.length})</span>
        </button>
      </div>

      {/* Tab: Overview */}
      {activeAdminTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Immigration & Legal Guardrails</span>
            </h3>
            <ul className="space-y-2.5 text-xs text-slate-600">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <span>All part-time job postings strictly enforce ₩10,030/hr statutory minimum wage.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <span>Prohibited industries (bars, karaoke, manufacturing without S-3 waiver) are automatically blacklisted.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <span>Housing listings require explicit landlord contact and deposit transparency.</span>
              </li>
            </ul>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <FileCode2 className="w-4 h-4 text-blue-600" />
              <span>Deployment & Custom Domain Readiness</span>
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              EveryKR is architected for zero-cost static deployment via Cloudflare Pages with full client-side routing, automated Firebase/Supabase fallbacks, and GoDaddy DNS CNAME record mapping.
            </p>
            <button
              onClick={() => setShowDeploymentModal(true)}
              className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1"
            >
              <span>View GoDaddy & Cloudflare Setup Instructions</span>
            </button>
          </div>
        </div>
      )}

      {/* Tab: S-3 Jobs */}
      {activeAdminTab === 'jobs' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
            <div>
              <h3 className="text-sm font-bold text-slate-900">S-3 Part-Time Student Jobs Audit</h3>
              <p className="text-xs text-slate-500">Ensure employers meet Korean legal minimum wage requirements.</p>
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {studentJobs.map((job: any) => {
              const isApproved = jobApprovals[job.id] !== false;
              return (
                <div key={job.id} className="p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-slate-900">{job.title}</h4>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                        {job.category || job.jobType}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {job.companyName || job.company} · {job.locationStation || job.location} · {job.hoursPerWeek} hrs/wk
                    </div>
                    <div className="text-xs font-bold text-emerald-600 font-mono mt-1">
                      {formatKrw(job.hourlyWageKrw)}/hr (Legal check: {job.hourlyWageKrw >= 10030 ? 'PASS' : 'FAIL'})
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleJobApproval(job.id)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                        isApproved
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                          : 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
                      }`}
                    >
                      {isApproved ? 'Approved & Listed' : 'Hidden for Audit'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab: Housing */}
      {activeAdminTab === 'housing' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Student Housing Landlord Verification</h3>
              <p className="text-xs text-slate-500">Verify deposit safety and physical room inspections.</p>
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {housing.map((room) => {
              const isVerified = verifiedLandlords[room.id] !== false;
              return (
                <div key={room.id} className="p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <img
                      src={room.image}
                      alt={room.title}
                      className="w-12 h-12 rounded-lg object-cover shrink-0 border border-slate-200"
                      referrerPolicy="no-referrer"
                    />
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">{room.title}</h4>
                      <p className="text-[11px] text-slate-500">
                        {room.neighborhood} · {formatKrw(room.monthlyRentKrw)}/mo (Deposit: {formatKrw(room.depositKrw)})
                      </p>
                      <p className="text-[10px] text-slate-400">Host Contact: {room.contactNumber}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => toggleVerification(room.id)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                      isVerified
                        ? 'bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100'
                        : 'bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200'
                    }`}
                  >
                    {isVerified ? 'Verified Listing' : 'Mark as Verified'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab: Community Moderation */}
      {activeAdminTab === 'community' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
            <h3 className="text-sm font-bold text-slate-900">Community Discussion Threads</h3>
            <p className="text-xs text-slate-500">Monitor international student questions and discussions.</p>
          </div>

          <div className="divide-y divide-slate-100">
            {communityPosts.map((post) => (
              <div key={post.id} className="p-4 sm:px-6 flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                      {post.category}
                    </span>
                    <h4 className="text-xs font-bold text-slate-900">{post.title}</h4>
                  </div>
                  <p className="text-xs text-slate-600 mt-1 line-clamp-2">{post.content}</p>
                  <div className="text-[10px] text-slate-400 mt-1">
                    By {post.authorName} ({post.authorUniversity}) · {post.repliesCount} replies · {post.likes} likes
                  </div>
                </div>

                <button
                  onClick={() => addToast(`Post #${post.id} reviewed and approved`, 'success')}
                  className="px-2.5 py-1 text-[11px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer shrink-0"
                >
                  Approve
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
