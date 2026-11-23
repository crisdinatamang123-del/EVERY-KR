/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  GraduationCap,
  Calendar,
  Clock,
  Building2,
  ShoppingBag,
  FileText,
  AlertCircle,
  Trash2,
  CheckCircle,
  ExternalLink,
  Plus,
  Briefcase,
  Bell,
  Settings,
  Upload,
  User,
  Heart,
  Save,
} from 'lucide-react';

export const StudentDashboard: React.FC = () => {
  const {
    currentUser,
    updateProfile,
    savedApplications,
    updateApplicationStatus,
    removeApplication,
    housing,
    savedHousingIds,
    toggleFavoriteHousing,
    marketItems,
    updateMarketItemStatus,
    studentJobs,
    jobApplications,
    savedJobIds,
    toggleSaveJob,
    notifications,
    markNotificationRead,
    setActiveSection,
    formatKrw,
    addToast,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'overview' | 'applications' | 'jobs' | 'housing' | 'marketplace' | 'profile'>('overview');

  // Profile editing state
  const [name, setName] = useState(currentUser?.name || '');
  const [university, setUniversity] = useState(currentUser?.university || '');
  const [phoneNumber, setPhoneNumber] = useState(currentUser?.phone || currentUser?.phoneNumber || '');
  const [bio, setBio] = useState(currentUser?.bio || '');
  const [avatarPreview, setAvatarPreview] = useState(currentUser?.avatarUrl || '');

  const savedRooms = housing.filter((h) => savedHousingIds.includes(h.id));
  const myItems = marketItems.filter((m) => m.sellerId === currentUser?.id || m.sellerId === 'user-lucas');
  const mySavedJobs = studentJobs.filter((j: any) => savedJobIds.includes(j.id));

  // Visa Countdown logic
  const daysUntilExpiry = currentUser?.visaExpiryDate
    ? Math.ceil(
        (new Date(currentUser.visaExpiryDate).getTime() - new Date('2026-11-02').getTime()) /
          (1000 * 60 * 60 * 24)
      )
    : 332;

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (uploadEvt) => {
        const result = uploadEvt.target?.result as string;
        setAvatarPreview(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile({
      name,
      university,
      phone: phoneNumber,
      phoneNumber,
      bio,
      avatarUrl: avatarPreview,
    });
    addToast('Profile information successfully updated!', 'success');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Profile & Visa Expiry Header Banner */}
      <div className="bg-slate-900 rounded-3xl p-6 lg:p-8 text-white relative overflow-hidden shadow-lg border border-slate-800">
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          {/* User Info */}
          <div className="md:col-span-7 flex items-center gap-4">
            {currentUser?.avatarUrl || avatarPreview ? (
              <img
                src={currentUser?.avatarUrl || avatarPreview}
                alt={currentUser?.name || 'Student'}
                className="w-16 h-16 rounded-2xl object-cover shrink-0 border-2 border-white/20"
              />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-blue-600 text-white font-extrabold text-2xl flex items-center justify-center shrink-0 border-2 border-white/20">
                {currentUser?.name?.[0] || 'S'}
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold">{currentUser?.name || 'International Student'}</h1>
                <span className="text-[11px] font-semibold bg-blue-500/30 text-blue-300 border border-blue-400/30 px-2 py-0.5 rounded">
                  {currentUser?.visaType || 'D-2'} Degree Visa
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                {currentUser?.university || 'Yonsei University'} · {currentUser?.nationality || 'International Scholar'}
              </p>
              <div className="flex items-center gap-3 text-xs text-slate-400 mt-2 font-mono">
                <span>ID: {currentUser?.id || 'demo-std-01'}</span>
                <span>·</span>
                <span>Enrolled: 2026/2027</span>
              </div>
            </div>
          </div>

          {/* Visa Expiry Countdown Widget */}
          <div className="md:col-span-5 bg-slate-800/80 backdrop-blur-md rounded-2xl p-4 border border-slate-700/80 flex items-center justify-between">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Alien Registration (ARC) Expiry
              </div>
              <div className="text-xs text-slate-200 mt-0.5 font-medium">
                Valid until {currentUser?.visaExpiryDate || '2027-09-30'}
              </div>
              <div className="text-xs text-emerald-400 font-semibold mt-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                <span>{daysUntilExpiry} Days Remaining</span>
              </div>
            </div>
            <button
              onClick={() => setActiveSection('visa')}
              className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer shrink-0"
            >
              Renewal Steps
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto pb-2 scrollbar-none text-xs font-semibold">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-3 py-2 rounded-lg cursor-pointer transition-colors whitespace-nowrap ${
            activeTab === 'overview' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Overview & Admissions
        </button>
        <button
          onClick={() => setActiveTab('jobs')}
          className={`px-3 py-2 rounded-lg cursor-pointer transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'jobs' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Briefcase className="w-3.5 h-3.5" />
          <span>My Jobs ({jobApplications.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('housing')}
          className={`px-3 py-2 rounded-lg cursor-pointer transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'housing' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>Saved Housing ({savedRooms.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('marketplace')}
          className={`px-3 py-2 rounded-lg cursor-pointer transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'marketplace' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <ShoppingBag className="w-3.5 h-3.5" />
          <span>My Listings ({myItems.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('profile')}
          className={`px-3 py-2 rounded-lg cursor-pointer transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'profile' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Settings className="w-3.5 h-3.5" />
          <span>Profile Settings</span>
        </button>
      </div>

      {/* Tab: Overview & University Applications */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          {/* Quick Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <span className="text-[11px] font-semibold text-slate-500">Tracked Universities</span>
              <div className="text-xl font-extrabold text-slate-900 mt-1">{savedApplications.length}</div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <span className="text-[11px] font-semibold text-slate-500">Active Job Applications</span>
              <div className="text-xl font-extrabold text-blue-600 mt-1">{jobApplications.length}</div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <span className="text-[11px] font-semibold text-slate-500">Saved Rooms</span>
              <div className="text-xl font-extrabold text-slate-900 mt-1">{savedRooms.length}</div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <span className="text-[11px] font-semibold text-slate-500">Marketplace Listings</span>
              <div className="text-xl font-extrabold text-slate-900 mt-1">{myItems.length}</div>
            </div>
          </div>

          {/* Section: University Applications Tracker */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                  University Admission Applications
                </h2>
                <p className="text-xs text-slate-500">
                  Track requirements, submission deadlines, and acceptance decisions.
                </p>
              </div>
              <button
                onClick={() => setActiveSection('universities')}
                className="inline-flex items-center gap-1.5 text-xs text-blue-600 font-semibold hover:underline"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add University</span>
              </button>
            </div>

            {savedApplications.length === 0 ? (
              <div className="text-center py-10 bg-slate-50 rounded-2xl border border-slate-200 p-6">
                <GraduationCap className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                <h3 className="text-sm font-bold text-slate-800">No applications tracked yet</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Browse the University Directory to save and monitor target Korean universities.
                </p>
                <button
                  onClick={() => setActiveSection('universities')}
                  className="mt-3 px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg"
                >
                  Browse Universities
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {savedApplications.map((app) => (
                  <div
                    key={app.id}
                    className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3 shadow-sm"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">{app.universityName}</h4>
                        <div className="text-xs text-slate-500">{app.major || app.program}</div>
                      </div>
                      <button
                        onClick={() => removeApplication(app.id)}
                        className="text-slate-400 hover:text-red-600 transition-colors p-1"
                        title="Remove"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                      <span className="text-[11px] font-semibold text-slate-600">Status:</span>
                      <select
                        value={app.status}
                        onChange={(e) => updateApplicationStatus(app.id, e.target.value as any)}
                        className="text-xs font-semibold px-2 py-1 rounded bg-slate-50 border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="saved">Preparing Documents</option>
                        <option value="applied">Application Submitted</option>
                        <option value="interview">Interview Scheduled</option>
                        <option value="accepted">Accepted / Offer</option>
                        <option value="rejected">Not Accepted</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Jobs */}
      {activeTab === 'jobs' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                My S-3 Part-Time Job Applications
              </h2>
              <p className="text-xs text-slate-500">
                Track job applications submitted through EveryKR.
              </p>
            </div>
            <button
              onClick={() => setActiveSection('jobs')}
              className="text-xs text-blue-600 font-semibold hover:underline"
            >
              Browse Student Jobs
            </button>
          </div>

          {jobApplications.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-2xl">
              <Briefcase className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-xs text-slate-500">You haven't submitted any job applications yet.</p>
              <button
                onClick={() => setActiveSection('jobs')}
                className="mt-3 px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg"
              >
                Browse S-3 Student Jobs
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {jobApplications.map((app) => (
                <div key={app.id} className="bg-white rounded-xl border border-slate-200 p-4 flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">{app.jobTitle}</h4>
                    <p className="text-xs text-slate-500">
                      {app.companyName || app.company} · Applied on {(app.submittedAt || app.appliedAt || '2026-11-01').split('T')[0]}
                    </p>
                    <p className="text-[11px] text-slate-600 mt-1 italic">
                      "{app.resumeSummary || app.message}"
                    </p>
                  </div>
                  <span className="text-xs font-bold px-2.5 py-1 rounded bg-blue-50 text-blue-700 border border-blue-200 capitalize">
                    {app.status.replace('_', ' ')}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Saved Jobs */}
          {mySavedJobs.length > 0 && (
            <div className="space-y-3 pt-4 border-t border-slate-200">
              <h3 className="text-sm font-bold text-slate-900">Bookmarked Jobs</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {mySavedJobs.map((j: any) => (
                  <div key={j.id} className="bg-white p-3.5 rounded-xl border border-slate-200 flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">{j.title}</h4>
                      <p className="text-[11px] text-slate-500">{j.companyName || j.company} · {formatKrw(j.hourlyWageKrw)}/hr</p>
                    </div>
                    <button
                      onClick={() => toggleSaveJob(j.id)}
                      className="text-xs text-red-500 hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab: Housing */}
      {activeTab === 'housing' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">Saved Housing Favorites</h2>
              <p className="text-xs text-slate-500">Goshiwon, One-Rooms, and Student Flats</p>
            </div>
            <button
              onClick={() => setActiveSection('housing')}
              className="text-xs text-blue-600 font-semibold hover:underline"
            >
              Find More Housing
            </button>
          </div>

          {savedRooms.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-2xl">
              <Building2 className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-xs text-slate-500">No rooms saved to favorites yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {savedRooms.map((room) => (
                <div key={room.id} className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={room.image}
                      alt={room.title}
                      className="w-14 h-14 rounded-lg object-cover shrink-0 border border-slate-200"
                      referrerPolicy="no-referrer"
                    />
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs font-bold text-slate-900 truncate">{room.title}</h4>
                      <div className="text-[11px] text-slate-500 truncate">
                        {room.neighborhood} · {room.nearestStation}
                      </div>
                      <div className="text-xs font-bold text-blue-600 font-mono mt-0.5">
                        {formatKrw(room.monthlyRentKrw)}/mo
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                    <span className="text-[11px] text-slate-500">Tel: {room.contactNumber}</span>
                    <button
                      onClick={() => toggleFavoriteHousing(room.id)}
                      className="text-red-500 hover:underline text-[11px] font-medium cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Marketplace */}
      {activeTab === 'marketplace' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">My Marketplace Listings</h2>
              <p className="text-xs text-slate-500">Track items you posted for campus trade</p>
            </div>
            <button
              onClick={() => setActiveSection('marketplace')}
              className="text-xs text-blue-600 font-semibold hover:underline"
            >
              Post New Item
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {myItems.map((item) => (
              <div key={item.id} className="bg-white rounded-xl border border-slate-200 p-4 space-y-2.5">
                <div className="flex items-start justify-between">
                  <span className="text-xs font-bold text-blue-600 font-mono">
                    {item.priceKrw === 0 ? 'FREE' : formatKrw(item.priceKrw)}
                  </span>
                  <select
                    value={item.status}
                    onChange={(e) => updateMarketItemStatus(item.id, e.target.value as any)}
                    className="text-[11px] font-semibold px-2 py-0.5 rounded bg-slate-50 border border-slate-200"
                  >
                    <option value="active">Active</option>
                    <option value="reserved">Reserved</option>
                    <option value="sold">Sold</option>
                  </select>
                </div>

                <h4 className="text-xs font-bold text-slate-900 line-clamp-1">{item.title}</h4>
                <p className="text-[11px] text-slate-500 line-clamp-2">{item.description}</p>
                <div className="text-[10px] text-slate-400 font-medium">
                  Meetup: {item.locationStation}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: Profile Settings */}
      {activeTab === 'profile' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 max-w-2xl">
          <h2 className="text-lg font-bold text-slate-900 mb-1">Student Profile & Settings</h2>
          <p className="text-xs text-slate-500 mb-6">
            Keep your university enrollment and contact details up to date for verified applications.
          </p>

          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">Profile Avatar</label>
              <div className="flex items-center gap-4">
                {avatarPreview ? (
                  <img
                    src={avatarPreview}
                    alt="Preview"
                    className="w-16 h-16 rounded-full object-cover border border-slate-200"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                    <User className="w-8 h-8" />
                  </div>
                )}
                <div>
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload New Photo</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      className="hidden"
                    />
                  </label>
                  <p className="text-[10px] text-slate-400 mt-1">PNG, JPG, or WEBP (Max 2MB)</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Legal Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Enrolled University</label>
                <input
                  type="text"
                  value={university}
                  onChange={(e) => setUniversity(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Korean Contact Phone</label>
                <input
                  type="tel"
                  placeholder="010-XXXX-XXXX"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Registered Visa</label>
                <input
                  type="text"
                  disabled
                  value={`${currentUser?.visaType || 'D-2'} (Expires: ${currentUser?.visaExpiryDate || '2027-09-30'})`}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-500 cursor-not-allowed"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Student Bio / Intro</label>
              <textarea
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Brief introduction for housing roommates and student job applications..."
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <button
              type="submit"
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Profile Changes</span>
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
