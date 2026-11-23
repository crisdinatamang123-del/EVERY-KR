import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { X, Briefcase, AlertCircle } from 'lucide-react';
import { JobListing } from '../types';

export const PostJobModal: React.FC = () => {
  const { isPostJobModalOpen, setIsPostJobModalOpen, addJob, currentUser, showToast } = useApp();

  const [title, setTitle] = useState('');
  const [company, setCompany] = useState('');
  const [city, setCity] = useState('Seoul');
  const [location, setLocation] = useState('Seoul (Sinchon)');
  const [salaryKRW, setSalaryKRW] = useState('₩10,500 / hr');
  const [jobType, setJobType] = useState<JobListing['jobType']>('Part-time');
  const [category, setCategory] = useState<JobListing['category']>('Restaurant & Cafe');
  const [hoursPerWeek, setHoursPerWeek] = useState<number>(15);
  const [languageRequirements, setLanguageRequirements] = useState('Korean (Basic conversational) + English');
  const [visaRequirements, setVisaRequirements] = useState('D-2 Student Visa (with Part-time Work Permit)');
  const [deadline, setDeadline] = useState('2026-12-15');
  const [employerEmail, setEmployerEmail] = useState(currentUser?.email || 'hiring@company.kr');
  const [description, setDescription] = useState('');

  if (!isPostJobModalOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !company.trim()) {
      showToast('Please provide job title and company name');
      return;
    }

    addJob({
      title: title.trim(),
      company: company.trim(),
      city,
      location: location.trim(),
      salaryKRW: salaryKRW.trim(),
      jobType,
      category,
      hoursPerWeek: Number(hoursPerWeek) || 15,
      languageRequirements: languageRequirements.trim(),
      visaRequirements: visaRequirements.trim(),
      deadline,
      employerEmail: employerEmail.trim(),
      description: description.trim() || 'Exciting student opportunity with legal part-time visa authorization.',
      responsibilities: ['Assist team with day-to-day operations', 'Provide customer service in English/Korean', 'Maintain workplace cleanliness and reports']
    });

    setTitle('');
    setCompany('');
    setDescription('');
    setIsPostJobModalOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8 animate-fade-in">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#10243A] text-white flex items-center justify-center">
              <Briefcase className="w-4 h-4 text-[#19B6A4]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Post a Job Opening for International Students</h3>
              <p className="text-xs text-slate-500">Reach thousands of qualified bilingual foreign scholars across Korea</p>
            </div>
          </div>

          <button
            onClick={() => setIsPostJobModalOpen(false)}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Job Title</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Bilingual Student Cafe Barista"
                className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:border-[#1769AA]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Company / Organization</label>
              <input
                type="text"
                required
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="e.g. Sinchon Global Coffee Co."
                className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:border-[#1769AA]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">City</label>
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:border-[#1769AA]"
              >
                <option value="Seoul">Seoul</option>
                <option value="Busan">Busan</option>
                <option value="Incheon">Incheon</option>
                <option value="Daejeon">Daejeon</option>
                <option value="Daegu">Daegu</option>
                <option value="Suwon">Suwon</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Job Type</label>
              <select
                value={jobType}
                onChange={(e) => setJobType(e.target.value as any)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:border-[#1769AA]"
              >
                <option value="Part-time">Part-time (시간제)</option>
                <option value="Full-time">Full-time (E-7 eligible)</option>
                <option value="Internship">Internship</option>
                <option value="Campus Assistant">Campus Assistant</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:border-[#1769AA]"
              >
                <option value="Restaurant & Cafe">Restaurant &amp; Cafe</option>
                <option value="Office & Admin">Office &amp; Admin</option>
                <option value="Translation">Translation</option>
                <option value="Education & Tutoring">Education &amp; Tutoring</option>
                <option value="IT & Tech">IT &amp; Tech</option>
                <option value="Factory & Logistics">Factory &amp; Logistics</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Salary / Hourly Wage</label>
              <input
                type="text"
                required
                value={salaryKRW}
                onChange={(e) => setSalaryKRW(e.target.value)}
                placeholder="e.g. ₩10,500 / hr"
                className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-800 font-mono focus:outline-none focus:border-[#1769AA]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Hours per Week (Max 20/30)</label>
              <input
                type="number"
                required
                min={1}
                max={40}
                value={hoursPerWeek}
                onChange={(e) => setHoursPerWeek(Number(e.target.value))}
                className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-800 font-mono focus:outline-none focus:border-[#1769AA]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Language Requirements</label>
              <input
                type="text"
                value={languageRequirements}
                onChange={(e) => setLanguageRequirements(e.target.value)}
                placeholder="e.g. English fluent, Korean conversational"
                className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:border-[#1769AA]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Application Deadline</label>
              <input
                type="date"
                required
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:border-[#1769AA]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Job Description &amp; Requirements</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe shifts, duties, working atmosphere, and application instructions..."
              className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:border-[#1769AA]"
            ></textarea>
          </div>

          <div className="p-3 bg-blue-50/70 border border-blue-200/80 rounded-xl text-[11px] text-blue-900 leading-relaxed flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
            <div>
              <strong>Legal Notice: </strong>
              Employers must comply with South Korean minimum wage laws (₩10,030+ in 2025/2026) and sign the Standard Part-Time Work Confirmation Form (시간제취업 확인서).
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3 text-xs">
            <button
              type="button"
              onClick={() => setIsPostJobModalOpen(false)}
              className="px-4 py-2 font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 font-bold text-white bg-[#10243A] hover:bg-[#1769AA] rounded-lg transition-colors cursor-pointer shadow-xs"
            >
              Submit for Verification
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
