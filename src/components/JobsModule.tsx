import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { JobListing } from '../types';
import {
  Briefcase,
  Search,
  MapPin,
  Clock,
  DollarSign,
  Bookmark,
  Send,
  AlertCircle,
  PlusCircle,
  CheckCircle2,
  X,
  FileCheck,
  Building2,
  ChevronRight
} from 'lucide-react';

interface JobsModuleProps {
  isFullPage?: boolean;
}

export const JobsModule: React.FC<JobsModuleProps> = ({ isFullPage = false }) => {
  const {
    currentUser,
    jobsList,
    savedJobIds,
    toggleSaveJob,
    submitJobApplication,
    setIsPostJobModalOpen,
    showToast,
    setActivePage
  } = useApp();

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCity, setSelectedCity] = useState<string>('All');
  const [selectedType, setSelectedType] = useState<string>('All');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  // Selected job for apply modal
  const [activeJobForModal, setActiveJobForModal] = useState<JobListing | null>(null);
  const [applicantName, setApplicantName] = useState(currentUser?.name || '');
  const [applicantEmail, setApplicantEmail] = useState(currentUser?.email || '');
  const [applicantVisa, setApplicantVisa] = useState(currentUser?.visaType || 'D-2 Student Visa (Approved Work Permit)');
  const [applicantNotes, setApplicantNotes] = useState('');

  useEffect(() => {
    setApplicantName(currentUser?.name || '');
    setApplicantEmail(currentUser?.email || '');
    if (currentUser?.visaType) {
      setApplicantVisa(currentUser.visaType);
    }
  }, [currentUser]);

  const filteredJobs = useMemo(() => {
    return jobsList.filter((job) => {
      const matchSearch =
        job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.description.toLowerCase().includes(searchTerm.toLowerCase());

      const matchCity = selectedCity === 'All' || job.city === selectedCity;
      const matchType = selectedType === 'All' || job.jobType === selectedType;
      const matchCat = selectedCategory === 'All' || job.category === selectedCategory;

      return matchSearch && matchCity && matchType && matchCat;
    });
  }, [jobsList, searchTerm, selectedCity, selectedType, selectedCategory]);

  const handleApplySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeJobForModal) return;
    submitJobApplication(activeJobForModal.id, {
      name: applicantName,
      email: applicantEmail,
      visaStatus: applicantVisa,
      notes: applicantNotes
    });
    setActiveJobForModal(null);
  };

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
            <span className="text-[#0754B8] dark:text-[#60A5FA] font-semibold">Category 5 • Jobs & Career (Part-time & Full-time)</span>
          </nav>
        )}

        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8">
          <div>
            <div className="text-xs font-semibold text-[#0754B8] dark:text-[#60A5FA] uppercase tracking-wider">
              Legal Employment & Internships
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#10213D] dark:text-white tracking-tight mt-1">
              Latest Jobs & Careers
            </h2>
            <p className="text-sm text-[#526685] dark:text-[#B8C9E5] mt-1 max-w-2xl">
              Verified campus positions, cafe hosts, translators, and technology internships tailored to international student schedules and Korean immigration work limits.
            </p>
          </div>

          <div className="mt-4 md:mt-0 flex items-center gap-3">
            <button
              onClick={() => setIsPostJobModalOpen(true)}
              className="ekr-glass-btn-primary flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Post a Job (Employer)</span>
            </button>

            {!isFullPage && (
              <button
                onClick={() => setActivePage('jobs')}
                className="text-xs font-semibold text-[#0754B8] dark:text-[#60A5FA] hover:underline underline-offset-4 cursor-pointer"
              >
                View all jobs →
              </button>
            )}
          </div>
        </div>

        {/* Legal Warning Notice */}
        <div className="p-3.5 bg-blue-500/10 border border-blue-400/30 rounded-xl mb-6 flex items-start gap-3 text-xs text-[#10213D] dark:text-blue-100 backdrop-blur-md">
          <AlertCircle className="w-4 h-4 text-[#0754B8] dark:text-[#60A5FA] shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <strong>Work Authorization Advisory: </strong>
            Under Korean Immigration Law, D-2 student visa holders can work up to 20–25 hours/week during semesters (unlimited during holidays), but <em>must</em> receive prior approval from their university international office and local immigration office. Never accept cash-in-hand unregistered work.
          </div>
        </div>

        {/* Filters */}
        <div className="ekr-glass-panel p-4 rounded-2xl mb-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            <div className="md:col-span-5 relative">
              <Search className="w-4 h-4 text-[#526685] dark:text-[#B8C9E5] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search job title, company, or skills..."
                className="ekr-glass-input w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-lg"
              />
            </div>

            <div className="md:col-span-2">
              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                className="ekr-glass-input w-full px-3 py-2 text-xs sm:text-sm rounded-lg"
              >
                <option className="bg-white dark:bg-[#0B204A]" value="All">All Cities</option>
                <option className="bg-white dark:bg-[#0B204A]" value="Seoul">Seoul</option>
                <option className="bg-white dark:bg-[#0B204A]" value="Busan">Busan</option>
                <option className="bg-white dark:bg-[#0B204A]" value="Daejeon">Daejeon</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="ekr-glass-input w-full px-3 py-2 text-xs sm:text-sm rounded-lg"
              >
                <option className="bg-white dark:bg-[#0B204A]" value="All">All Types</option>
                <option className="bg-white dark:bg-[#0B204A]" value="Part-time">Part-time</option>
                <option className="bg-white dark:bg-[#0B204A]" value="Internship">Internship</option>
                <option className="bg-white dark:bg-[#0B204A]" value="Campus Assistant">Campus Assistant</option>
                <option className="bg-white dark:bg-[#0B204A]" value="Full-time">Full-time</option>
              </select>
            </div>

            <div className="md:col-span-3">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="ekr-glass-input w-full px-3 py-2 text-xs sm:text-sm rounded-lg"
              >
                <option className="bg-white dark:bg-[#0B204A]" value="All">All Categories</option>
                <option className="bg-white dark:bg-[#0B204A]" value="Office & Admin">Office & Admin</option>
                <option className="bg-white dark:bg-[#0B204A]" value="IT & Tech">IT & Tech</option>
                <option className="bg-white dark:bg-[#0B204A]" value="Education & Tutoring">Education & Tutoring</option>
                <option className="bg-white dark:bg-[#0B204A]" value="Translation">Translation</option>
                <option className="bg-white dark:bg-[#0B204A]" value="Restaurant & Cafe">Restaurant & Cafe</option>
              </select>
            </div>
          </div>
        </div>

        {/* Job Listings Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredJobs.map((job) => {
            const isSaved = savedJobIds.includes(job.id);

            return (
              <div
                key={job.id}
                className="ekr-glass-card rounded-2xl p-5 flex flex-col justify-between"
              >
                <div>
                  {/* Top row: Company, Location, Save */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 text-xs text-[#526685] dark:text-[#B8C9E5]">
                        <span className="font-semibold text-[#10213D] dark:text-white">{job.company}</span>
                        <span aria-hidden="true">·</span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 opacity-70" />
                          <span>{job.location}</span>
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-[#10213D] dark:text-white mt-1 leading-snug">
                        {job.title}
                      </h3>
                    </div>

                    <button
                      onClick={() => toggleSaveJob(job.id)}
                      className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                        isSaved ? 'text-amber-500 bg-amber-500/15' : 'text-[#526685] dark:text-[#B8C9E5] hover:text-[#10213D] dark:hover:text-white hover:bg-white/50 dark:hover:bg-white/10'
                      }`}
                      title={isSaved ? 'Saved' : 'Save job'}
                    >
                      <Bookmark className="w-4 h-4" fill={isSaved ? 'currentColor' : 'none'} />
                    </button>
                  </div>

                  {/* Compensation & Job meta */}
                  <div className="flex flex-wrap items-center gap-3 mt-3 text-xs">
                    <span className="font-mono font-bold text-[#0754B8] dark:text-[#60A5FA] tabular-nums">
                      {job.salaryKRW}
                    </span>
                    <span aria-hidden="true" className="opacity-40">·</span>
                    <span className="text-[#526685] dark:text-[#B8C9E5] flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 opacity-70" />
                      <span>{job.hoursPerWeek} hrs/week</span>
                    </span>
                    <span aria-hidden="true" className="opacity-40">·</span>
                    <span className="text-xs text-[#0754B8] dark:text-[#60A5FA] font-medium bg-blue-500/10 px-2 py-0.5 rounded">
                      {job.jobType}
                    </span>
                  </div>

                  {/* Description snippet */}
                  <p className="text-xs text-[#526685] dark:text-[#B8C9E5] mt-3 line-clamp-2 leading-relaxed">
                    {job.description}
                  </p>

                  {/* Requirements unboxed */}
                  <div className="mt-3 text-[11px] text-[#526685] dark:text-[#B8C9E5] space-y-1">
                    <div><strong className="text-[#10213D] dark:text-white">Languages:</strong> {job.languageRequirements}</div>
                    <div><strong className="text-[#10213D] dark:text-white">Visa:</strong> {job.visaRequirements}</div>
                  </div>
                </div>

                {/* Footer action */}
                <div className="pt-4 mt-4 border-t border-slate-200/60 dark:border-white/10 flex items-center justify-between text-xs">
                  <span className="text-[#526685] dark:text-[#B8C9E5]">Deadline: {job.deadline}</span>
                  <button
                    onClick={() => setActiveJobForModal(job)}
                    className="ekr-glass-btn-primary flex items-center gap-1.5 px-4 py-2 font-semibold rounded-lg transition-all cursor-pointer"
                  >
                    <span>View & Apply</span>
                    <Send className="w-3 h-3" />
                  </button>
                </div>

              </div>
            );
          })}
        </div>

        {/* Empty state */}
        {filteredJobs.length === 0 && (
          <div className="ekr-glass-panel text-center py-12 rounded-2xl">
            <Briefcase className="w-10 h-10 text-[#526685] dark:text-[#B8C9E5] mx-auto mb-2" />
            <h3 className="text-sm font-bold text-[#10213D] dark:text-white">No jobs found matching filters</h3>
            <p className="text-xs text-[#526685] dark:text-[#B8C9E5] mt-1">Try resetting city or category preferences.</p>
          </div>
        )}

      </div>

      {/* Apply Modal */}
      {activeJobForModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-[#061B49]/55 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="ekr-glass-modal relative w-full max-w-xl rounded-2xl overflow-hidden my-8 animate-fade-in">
            <div className="px-6 py-4 border-b border-slate-200/70 dark:border-white/10 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[#10213D] dark:text-white">Apply for Job Position</h3>
                <p className="text-xs text-[#526685] dark:text-[#B8C9E5]">{activeJobForModal.title} · {activeJobForModal.company}</p>
              </div>
              <button
                onClick={() => setActiveJobForModal(null)}
                className="p-1.5 text-[#526685] dark:text-[#B8C9E5] hover:text-[#10213D] dark:hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleApplySubmit} className="p-6 space-y-4">
              <div className="p-3 bg-blue-500/10 border border-blue-400/30 rounded-lg text-xs text-[#10213D] dark:text-blue-100">
                <strong>Notice:</strong> Your application will be sent directly to <strong>{activeJobForModal.employerEmail}</strong>. You can monitor interview invitations inside your Student Dashboard.
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#10213D] dark:text-slate-200 mb-1">Your Full Name</label>
                <input
                  type="text"
                  value={applicantName}
                  onChange={(e) => setApplicantName(e.target.value)}
                  className="ekr-glass-input w-full px-3 py-2 text-xs rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#10213D] dark:text-slate-200 mb-1">Email Address</label>
                <input
                  type="email"
                  value={applicantEmail}
                  onChange={(e) => setApplicantEmail(e.target.value)}
                  className="ekr-glass-input w-full px-3 py-2 text-xs rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#10213D] dark:text-slate-200 mb-1">Current Visa & Work Permission Status</label>
                <input
                  type="text"
                  value={applicantVisa}
                  onChange={(e) => setApplicantVisa(e.target.value)}
                  placeholder="e.g. D-2-3 (Master) with approved work permit, or D-10"
                  className="ekr-glass-input w-full px-3 py-2 text-xs rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#10213D] dark:text-slate-200 mb-1">Introduction & Relevant Experience</label>
                <textarea
                  rows={4}
                  value={applicantNotes}
                  onChange={(e) => setApplicantNotes(e.target.value)}
                  placeholder="Briefly state your available work hours, Korean/English fluency level, and why you are suitable for this position..."
                  className="ekr-glass-input w-full px-3 py-2 text-xs rounded-lg"
                  required
                />
              </div>

              <div className="pt-3 border-t border-slate-200/60 dark:border-white/10 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setActiveJobForModal(null)}
                  className="px-4 py-2 text-xs font-semibold text-[#526685] dark:text-[#B8C9E5] hover:text-[#10213D] dark:hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="ekr-glass-btn-primary px-5 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer"
                >
                  Submit Application
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};
