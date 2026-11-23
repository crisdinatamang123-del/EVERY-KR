import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  SimApplicationRecord,
  StudentDocumentRecord,
  UniversityApplicationRecord,
  UserProfile
} from '../../types';
import {
  fetchAllFirestoreUsers,
  fetchAdminUniversityApplications,
  fetchAdminSimApplications,
  fetchAdminStudentDocuments,
  exportRecordsToCsvOrExcel,
  getAdminRequestHeaders,
  generateRegistrationId
} from '../../services/firebaseService';
import {
  BarChart3,
  Download,
  FileSpreadsheet,
  RefreshCw,
  Globe,
  GraduationCap,
  Calendar,
  Smartphone,
  Users,
  CheckCircle2
} from 'lucide-react';

type ReportViewKey =
  | 'country_wise'
  | 'university_wise'
  | 'intake_wise'
  | 'status_breakdown'
  | 'student_registrations'
  | 'sim_reports';

export const AdminAnalyticsReportsTab: React.FC = () => {
  const { currentUser, showToast } = useApp();

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [uniApplications, setUniApplications] = useState<UniversityApplicationRecord[]>([]);
  const [simApplications, setSimApplications] = useState<SimApplicationRecord[]>([]);
  const [documents, setDocuments] = useState<StudentDocumentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeReport, setActiveReport] = useState<ReportViewKey>('country_wise');

  const loadAnalyticsData = async () => {
    if (!currentUser) return;
    setIsLoading(true);
    try {
      const [serverUsersRes, fsUsers, apps, sims, docs] = await Promise.all([
        fetch('/api/admin/user-management', {
          headers: { ...getAdminRequestHeaders(currentUser) }
        })
          .then(r => r.json())
          .catch(() => null),
        fetchAllFirestoreUsers(),
        fetchAdminUniversityApplications(),
        fetchAdminSimApplications(),
        fetchAdminStudentDocuments()
      ]);

      const mergedUsers = new Map<string, UserProfile>();
      if (serverUsersRes?.ok && Array.isArray(serverUsersRes.users)) {
        for (const u of serverUsersRes.users) {
          const key = String(u.email || u.uid || u.id || '').toLowerCase();
          if (key) mergedUsers.set(key, u);
        }
      }
      for (const fu of fsUsers) {
        const key = String(fu.email || fu.uid || fu.id || '').toLowerCase();
        if (key && !mergedUsers.has(key)) {
          mergedUsers.set(key, fu);
        }
      }

      setUsers(Array.from(mergedUsers.values()));
      setUniApplications(apps);
      setSimApplications(sims);
      setDocuments(docs);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAnalyticsData();
  }, [currentUser?.id]);

  const studentsOnly = useMemo(
    () => users.filter(u => (u.accountType || u.role || 'student') === 'student'),
    [users]
  );

  // 1. Country-wise Student & Application Report
  const countryRows = useMemo(() => {
    const map = new Map<
      string,
      {
        country: string;
        registeredStudents: number;
        totalApplications: number;
        acceptedApplications: number;
        pendingApplications: number;
      }
    >();

    for (const s of studentsOnly) {
      const c = (s.nationality || s.countryOfResidence || 'International').trim() || 'International';
      const entry = map.get(c) || {
        country: c,
        registeredStudents: 0,
        totalApplications: 0,
        acceptedApplications: 0,
        pendingApplications: 0
      };
      entry.registeredStudents += 1;
      map.set(c, entry);
    }

    for (const app of uniApplications) {
      const c = (app.nationality || app.currentCountry || 'International').trim() || 'International';
      const entry = map.get(c) || {
        country: c,
        registeredStudents: 0,
        totalApplications: 0,
        acceptedApplications: 0,
        pendingApplications: 0
      };
      entry.totalApplications += 1;
      if (app.status === 'Accepted' || app.status === 'Completed') {
        entry.acceptedApplications += 1;
      } else if (
        ['Submitted', 'Under Review', 'Documents Required', 'Processing'].includes(app.status)
      ) {
        entry.pendingApplications += 1;
      }
      map.set(c, entry);
    }

    return Array.from(map.values()).sort(
      (a, b) =>
        b.registeredStudents + b.totalApplications - (a.registeredStudents + a.totalApplications)
    );
  }, [studentsOnly, uniApplications]);

  // 2. University-wise Application Report
  const universityRows = useMemo(() => {
    const map = new Map<
      string,
      {
        universityName: string;
        totalApplications: number;
        submittedOrReview: number;
        documentsRequired: number;
        accepted: number;
        rejected: number;
      }
    >();

    for (const app of uniApplications) {
      const uName = (app.universityName || 'Unspecified University').trim();
      const entry = map.get(uName) || {
        universityName: uName,
        totalApplications: 0,
        submittedOrReview: 0,
        documentsRequired: 0,
        accepted: 0,
        rejected: 0
      };
      entry.totalApplications += 1;
      if (['Submitted', 'Under Review', 'Processing'].includes(app.status)) {
        entry.submittedOrReview += 1;
      } else if (app.status === 'Documents Required') {
        entry.documentsRequired += 1;
      } else if (app.status === 'Accepted' || app.status === 'Completed') {
        entry.accepted += 1;
      } else if (app.status === 'Rejected') {
        entry.rejected += 1;
      }
      map.set(uName, entry);
    }

    return Array.from(map.values()).sort((a, b) => b.totalApplications - a.totalApplications);
  }, [uniApplications]);

  // 3. Intake-wise Application Report
  const intakeRows = useMemo(() => {
    const map = new Map<
      string,
      {
        intake: string;
        totalApplications: number;
        bachelorCount: number;
        masterCount: number;
        phdOrLanguageCount: number;
        acceptedCount: number;
      }
    >();

    for (const app of uniApplications) {
      const intakeKey = (app.intake || app.intendedIntake || 'Spring 2027').trim();
      const entry = map.get(intakeKey) || {
        intake: intakeKey,
        totalApplications: 0,
        bachelorCount: 0,
        masterCount: 0,
        phdOrLanguageCount: 0,
        acceptedCount: 0
      };
      entry.totalApplications += 1;
      const deg = (app.degreeLevel || '').toLowerCase();
      if (deg.includes('bachelor')) entry.bachelorCount += 1;
      else if (deg.includes('master')) entry.masterCount += 1;
      else entry.phdOrLanguageCount += 1;
      if (app.status === 'Accepted' || app.status === 'Completed') entry.acceptedCount += 1;
      map.set(intakeKey, entry);
    }

    return Array.from(map.values()).sort((a, b) => b.totalApplications - a.totalApplications);
  }, [uniApplications]);

  // 4. Application Status Breakdown
  const statusRows = useMemo(() => {
    const statuses = [
      'Draft',
      'Submitted',
      'Under Review',
      'Documents Required',
      'Processing',
      'Accepted',
      'Rejected',
      'Completed',
      'Withdrawn'
    ];
    const total = Math.max(1, uniApplications.length);
    return statuses.map(st => {
      const count = uniApplications.filter(a => a.status === st).length;
      return {
        status: st,
        count,
        sharePercent: `${((count / total) * 100).toFixed(1)}%`
      };
    });
  }, [uniApplications]);

  const handleExportReport = (ReportKey: ReportViewKey, format: 'csv' | 'xlsx') => {
    if (!currentUser) return;
    const dateStamp = new Date().toISOString().slice(0, 10);
    let rows: Record<string, any>[] = [];
    let filename = `EveryKR_Report_${dateStamp}`;
    let sheetName = 'Report';
    let exportCategory = 'Analytics Report';

    if (ReportKey === 'country_wise') {
      filename = `EveryKR_Country_Wise_Report_${dateStamp}`;
      sheetName = 'Country_Wise_Students';
      exportCategory = 'Country-wise Student & Application Report';
      rows = countryRows.map(r => ({
        Country: r.country,
        'Registered Students': r.registeredStudents,
        'University Applications': r.totalApplications,
        'Pending Applications': r.pendingApplications,
        'Accepted Applications': r.acceptedApplications
      }));
    } else if (ReportKey === 'university_wise') {
      filename = `EveryKR_University_Applications_${dateStamp}`;
      sheetName = 'University_Wise';
      exportCategory = 'University-wise Application Report';
      rows = universityRows.map(r => ({
        'University Name': r.universityName,
        'Total Applications': r.totalApplications,
        'Submitted / Under Review': r.submittedOrReview,
        'Documents Required': r.documentsRequired,
        Accepted: r.accepted,
        Rejected: r.rejected
      }));
    } else if (ReportKey === 'intake_wise') {
      filename = `EveryKR_Intake_Applications_${dateStamp}`;
      sheetName = 'Intake_Wise';
      exportCategory = 'Intake-wise Application Report';
      rows = intakeRows.map(r => ({
        'Academic Intake': r.intake,
        'Total Applications': r.totalApplications,
        'Bachelor Applicants': r.bachelorCount,
        'Master Applicants': r.masterCount,
        'PhD / Language Applicants': r.phdOrLanguageCount,
        Accepted: r.acceptedCount
      }));
    } else if (ReportKey === 'status_breakdown') {
      filename = `EveryKR_Application_Status_Breakdown_${dateStamp}`;
      sheetName = 'Status_Breakdown';
      exportCategory = 'Application Status Breakdown';
      rows = statusRows.map(r => ({
        'Application Status': r.status,
        'Applications Count': r.count,
        'Percentage Share': r.sharePercent
      }));
    } else if (ReportKey === 'student_registrations') {
      filename = `EveryKR_Student_Registrations_${dateStamp}`;
      sheetName = 'Student_Registrations';
      exportCategory = 'Student Registration Report';
      rows = studentsOnly.map(s => ({
        'Registration ID':
          s.registrationId ||
          generateRegistrationId(s.uid || s.id, s.accountType || s.role, s.createdAt),
        'Full Name': s.fullName || s.name,
        Email: s.email,
        Phone: s.phoneNumber || s.phone || '',
        Nationality: s.nationality || s.countryOfResidence || '',
        'Preferred University':
          s.studentAcademicProfile?.preferredUniversity || s.preferredUniversity || s.university || '',
        'Preferred Intake': s.studentAcademicProfile?.preferredIntake || s.preferredIntake || '',
        'Account Status': s.accountStatus || 'active',
        'Registered At': s.createdAt ? s.createdAt.slice(0, 10) : ''
      }));
    } else if (ReportKey === 'sim_reports') {
      filename = `EveryKR_SIM_Applications_${dateStamp}`;
      sheetName = 'SIM_Applications';
      exportCategory = 'SIM Application Report';
      rows = simApplications.map(sim => ({
        'SIM Application ID': sim.applicationId,
        'Student Name': sim.fullName,
        Email: sim.userEmail || '',
        University: sim.universityName,
        'WhatsApp Number': sim.whatsappNumber,
        'Arrival Date': sim.arrivalDate,
        'Arrival Time': sim.arrivalTime,
        'Flight Number': sim.flightNumber,
        'Arrival Airport': sim.arrivalAirport,
        Status: sim.applicationStatus,
        'Assigned Staff': sim.assignedStaffName || 'Unassigned',
        'Submitted At': sim.submissionTimestamp ? sim.submissionTimestamp.slice(0, 10) : ''
      }));
    }

    exportRecordsToCsvOrExcel({
      filename,
      sheetName,
      rows,
      format,
      adminUid: currentUser.uid || currentUser.id,
      adminName: currentUser.fullName || currentUser.name || 'Super Admin',
      adminEmail: currentUser.email,
      exportCategory
    });

    showToast(`Exported ${exportCategory} as .${format.toUpperCase()}`);
  };

  return (
    <div className="space-y-6">
      {/* Top Summary & Master Export Header */}
      <div className="bg-white dark:bg-[#10243A] rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#1769AA] dark:text-[#19B6A4]">
              <BarChart3 className="w-4 h-4" />
              <span>Analytics &amp; Audited Reporting Engine</span>
            </div>
            <h2 className="text-lg sm:text-xl font-black text-[#10243A] dark:text-white mt-1">
              Platform Analytics, Admissions Insights &amp; Data Exports
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Analyze live student registrations, country-wise distribution, university demand, intake pipelines, and SIM arrivals with instant CSV and Excel (.xlsx) export.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={loadAnalyticsData}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh Metrics</span>
            </button>

            <button
              type="button"
              onClick={() => handleExportReport(activeReport, 'csv')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-[#10243A] dark:text-white cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Current View (.CSV)</span>
            </button>

            <button
              type="button"
              onClick={() => handleExportReport(activeReport, 'xlsx')}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-xs"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Export Current View (.XLSX)</span>
            </button>
          </div>
        </div>

        {/* High-Level KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#0B1523] border border-slate-200 dark:border-slate-800">
            <div className="text-[10px] font-bold uppercase text-slate-500">Total Users</div>
            <div className="text-xl font-black text-[#10243A] dark:text-white font-mono mt-0.5">
              {users.length}
            </div>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#0B1523] border border-slate-200 dark:border-slate-800">
            <div className="text-[10px] font-bold uppercase text-slate-500">Total Students</div>
            <div className="text-xl font-black text-[#1769AA] dark:text-[#19B6A4] font-mono mt-0.5">
              {studentsOnly.length}
            </div>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#0B1523] border border-slate-200 dark:border-slate-800">
            <div className="text-[10px] font-bold uppercase text-slate-500">Uni Applications</div>
            <div className="text-xl font-black text-[#10243A] dark:text-white font-mono mt-0.5">
              {uniApplications.length}
            </div>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#0B1523] border border-slate-200 dark:border-slate-800">
            <div className="text-[10px] font-bold uppercase text-slate-500">Accepted Offers</div>
            <div className="text-xl font-black text-emerald-600 font-mono mt-0.5">
              {uniApplications.filter(a => a.status === 'Accepted' || a.status === 'Completed').length}
            </div>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#0B1523] border border-slate-200 dark:border-slate-800">
            <div className="text-[10px] font-bold uppercase text-slate-500">Docs Uploaded</div>
            <div className="text-xl font-black text-[#10243A] dark:text-white font-mono mt-0.5">
              {documents.length}
            </div>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#0B1523] border border-slate-200 dark:border-slate-800">
            <div className="text-[10px] font-bold uppercase text-slate-500">SIM Requests</div>
            <div className="text-xl font-black text-[#1769AA] dark:text-[#19B6A4] font-mono mt-0.5">
              {simApplications.length}
            </div>
          </div>
        </div>

        {/* Report Selector Tabs */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          {[
            { id: 'country_wise', label: 'Country-Wise Report', icon: Globe },
            { id: 'university_wise', label: 'University-Wise Report', icon: GraduationCap },
            { id: 'intake_wise', label: 'Intake-Wise Report', icon: Calendar },
            { id: 'status_breakdown', label: 'Application Status Breakdown', icon: CheckCircle2 },
            { id: 'student_registrations', label: 'Student Registration Report', icon: Users },
            { id: 'sim_reports', label: 'SIM Application Report', icon: Smartphone }
          ].map(tab => {
            const Icon = tab.icon;
            const active = activeReport === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveReport(tab.id as ReportViewKey)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                  active
                    ? 'bg-[#10243A] text-white dark:bg-[#19B6A4] dark:text-[#050B18]'
                    : 'bg-slate-50 dark:bg-[#0B1523] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Report Table Body */}
      <div className="bg-white dark:bg-[#10243A] rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
        {activeReport === 'country_wise' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 dark:bg-[#0B1523] border-b border-slate-200 dark:border-slate-800 text-slate-500 font-bold uppercase tracking-wider">
                <tr>
                  <th className="p-4">Nationality / Country</th>
                  <th className="p-4">Registered Students</th>
                  <th className="p-4">University Applications</th>
                  <th className="p-4">Pending Review</th>
                  <th className="p-4">Accepted / Completed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {countryRows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-500">
                      No country-wise student records available yet.
                    </td>
                  </tr>
                ) : (
                  countryRows.map(row => (
                    <tr key={row.country} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                      <td className="p-4 font-bold text-[#10243A] dark:text-white">{row.country}</td>
                      <td className="p-4 font-mono font-bold text-[#1769AA] dark:text-[#19B6A4]">
                        {row.registeredStudents}
                      </td>
                      <td className="p-4 font-mono font-semibold">{row.totalApplications}</td>
                      <td className="p-4 font-mono text-amber-700 dark:text-amber-400">
                        {row.pendingApplications}
                      </td>
                      <td className="p-4 font-mono text-emerald-700 dark:text-emerald-400 font-bold">
                        {row.acceptedApplications}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeReport === 'university_wise' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 dark:bg-[#0B1523] border-b border-slate-200 dark:border-slate-800 text-slate-500 font-bold uppercase tracking-wider">
                <tr>
                  <th className="p-4">Korean University</th>
                  <th className="p-4">Total Applications</th>
                  <th className="p-4">Under Review / Processing</th>
                  <th className="p-4">Documents Required</th>
                  <th className="p-4">Accepted</th>
                  <th className="p-4">Rejected</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {universityRows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500">
                      No university applications submitted yet.
                    </td>
                  </tr>
                ) : (
                  universityRows.map(row => (
                    <tr
                      key={row.universityName}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40"
                    >
                      <td className="p-4 font-bold text-[#10243A] dark:text-white">
                        {row.universityName}
                      </td>
                      <td className="p-4 font-mono font-bold text-[#1769AA] dark:text-[#19B6A4]">
                        {row.totalApplications}
                      </td>
                      <td className="p-4 font-mono">{row.submittedOrReview}</td>
                      <td className="p-4 font-mono text-amber-700">{row.documentsRequired}</td>
                      <td className="p-4 font-mono text-emerald-700 font-bold">{row.accepted}</td>
                      <td className="p-4 font-mono text-rose-600">{row.rejected}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeReport === 'intake_wise' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 dark:bg-[#0B1523] border-b border-slate-200 dark:border-slate-800 text-slate-500 font-bold uppercase tracking-wider">
                <tr>
                  <th className="p-4">Academic Intake</th>
                  <th className="p-4">Total Applications</th>
                  <th className="p-4">Bachelor</th>
                  <th className="p-4">Master</th>
                  <th className="p-4">PhD / Language</th>
                  <th className="p-4">Accepted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {intakeRows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500">
                      No intake application records available yet.
                    </td>
                  </tr>
                ) : (
                  intakeRows.map(row => (
                    <tr key={row.intake} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                      <td className="p-4 font-bold text-[#10243A] dark:text-white">{row.intake}</td>
                      <td className="p-4 font-mono font-bold text-[#1769AA] dark:text-[#19B6A4]">
                        {row.totalApplications}
                      </td>
                      <td className="p-4 font-mono">{row.bachelorCount}</td>
                      <td className="p-4 font-mono">{row.masterCount}</td>
                      <td className="p-4 font-mono">{row.phdOrLanguageCount}</td>
                      <td className="p-4 font-mono text-emerald-700 font-bold">{row.acceptedCount}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeReport === 'status_breakdown' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 dark:bg-[#0B1523] border-b border-slate-200 dark:border-slate-800 text-slate-500 font-bold uppercase tracking-wider">
                <tr>
                  <th className="p-4">Application Status</th>
                  <th className="p-4">Count</th>
                  <th className="p-4">Share of Pipeline</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {statusRows.map(row => (
                  <tr key={row.status} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                    <td className="p-4 font-bold text-[#10243A] dark:text-white">{row.status}</td>
                    <td className="p-4 font-mono font-bold text-[#1769AA] dark:text-[#19B6A4]">
                      {row.count}
                    </td>
                    <td className="p-4 font-mono text-slate-600 dark:text-slate-300">
                      {row.sharePercent}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeReport === 'student_registrations' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 dark:bg-[#0B1523] border-b border-slate-200 dark:border-slate-800 text-slate-500 font-bold uppercase tracking-wider">
                <tr>
                  <th className="p-4">Student</th>
                  <th className="p-4">Country</th>
                  <th className="p-4">Target University &amp; Intake</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Registered Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {studentsOnly.slice(0, 50).map(s => (
                  <tr key={s.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                    <td className="p-4">
                      <div className="font-bold text-[#10243A] dark:text-white">
                        {s.fullName || s.name}
                      </div>
                      <div className="font-mono text-[11px] text-slate-500">{s.email}</div>
                    </td>
                    <td className="p-4">{s.nationality || s.countryOfResidence || '—'}</td>
                    <td className="p-4">
                      <div className="font-semibold text-[#1769AA] dark:text-[#19B6A4]">
                        {s.studentAcademicProfile?.preferredUniversity ||
                          s.preferredUniversity ||
                          s.university ||
                          '—'}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {s.studentAcademicProfile?.preferredIntake || s.preferredIntake || '—'}
                      </div>
                    </td>
                    <td className="p-4 uppercase font-mono text-[10px] font-bold">
                      {s.accountStatus || 'active'}
                    </td>
                    <td className="p-4 font-mono text-slate-500">
                      {s.createdAt ? s.createdAt.slice(0, 10) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeReport === 'sim_reports' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 dark:bg-[#0B1523] border-b border-slate-200 dark:border-slate-800 text-slate-500 font-bold uppercase tracking-wider">
                <tr>
                  <th className="p-4">SIM ID &amp; Student</th>
                  <th className="p-4">University</th>
                  <th className="p-4">Arrival &amp; Flight</th>
                  <th className="p-4">Assigned Staff</th>
                  <th className="p-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {simApplications.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-500">
                      No SIM applications submitted yet.
                    </td>
                  </tr>
                ) : (
                  simApplications.map(sim => (
                    <tr
                      key={sim.applicationId}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40"
                    >
                      <td className="p-4">
                        <div className="font-mono font-bold text-[#1769AA] dark:text-[#19B6A4]">
                          {sim.applicationId}
                        </div>
                        <div className="font-bold text-[#10243A] dark:text-white">
                          {sim.fullName}
                        </div>
                      </td>
                      <td className="p-4">{sim.universityName}</td>
                      <td className="p-4 font-mono text-[11px]">
                        {sim.arrivalDate} · {sim.flightNumber} ({sim.arrivalAirport})
                      </td>
                      <td className="p-4">{sim.assignedStaffName || 'Unassigned'}</td>
                      <td className="p-4 font-bold">{sim.applicationStatus}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
