import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { LanguageCode } from '../types';
import { OFFICIAL_EVERYKR_SETTINGS_URL } from '../lib/firebase';
import { updateAuthenticatedUserPasswordClient } from '../services/firebaseService';
import {
  Settings,
  ShieldCheck,
  Sun,
  Moon,
  Globe,
  Bell,
  Lock,
  KeyRound,
  Mail,
  Eye,
  EyeOff,
  Loader2,
  ShieldAlert,
  LogOut,
  CheckCircle2,
  ChevronRight
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const {
    currentUser,
    theme,
    setTheme,
    language,
    setLanguage,
    updateProfile,
    logout,
    showToast
  } = useApp();

  const [emailAlerts, setEmailAlerts] = useState(true);
  const [visaDeadlineAlerts, setVisaDeadlineAlerts] = useState(true);
  const [jobMatchAlerts, setJobMatchAlerts] = useState(true);
  const [displayName, setDisplayName] = useState(currentUser?.name || '');

  // Password Update Form State (autocomplete="username" + "current-password" + "new-password")
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordUpdateError, setPasswordUpdateError] = useState<string | null>(null);
  const [passwordUpdateSuccess, setPasswordUpdateSuccess] = useState<string | null>(null);

  if (!currentUser) {
    return null;
  }

  const registeredEmail = String(currentUser.email || '').trim().toLowerCase();

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    if (displayName.trim()) {
      updateProfile({
        name: displayName.trim(),
        fullName: displayName.trim(),
        preferredLanguage: language
      });
    }
    showToast('Account settings and preferences saved');
  };

  const handlePasswordUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isUpdatingPassword) return;

    setPasswordUpdateError(null);
    setPasswordUpdateSuccess(null);

    if (!currentPassword) {
      setPasswordUpdateError('Please enter your current password.');
      return;
    }
    if (newPassword.length < 8) {
      setPasswordUpdateError('Your new password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordUpdateError('New password and confirmation do not match.');
      return;
    }

    // Ensure password inputs are type="password" during submission for Chrome Password Manager detection
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    setIsUpdatingPassword(true);

    try {
      const res = await updateAuthenticatedUserPasswordClient({
        email: registeredEmail,
        currentPassword,
        newPassword
      });

      if (!res.ok) {
        setPasswordUpdateError(res.message);
        return;
      }

      setPasswordUpdateSuccess(res.message);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      showToast('Password updated for everykr.com');
    } catch {
      setPasswordUpdateError('Unable to update password right now. Please try again.');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleSignOut = async () => {
    await logout();
  };

  return (
    <section className="py-10 bg-transparent min-h-[80vh] transition-colors">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-[#526685] dark:text-[#B8C9E5]">
          <Link to="/" className="hover:text-[#0754B8] dark:hover:text-white transition-colors">
            Home
          </Link>
          <ChevronRight className="w-3.5 h-3.5 opacity-60" />
          <Link to="/dashboard" className="hover:text-[#0754B8] dark:hover:text-white transition-colors">
            Dashboard
          </Link>
          <ChevronRight className="w-3.5 h-3.5 opacity-60" />
          <span className="font-semibold text-[#0754B8] dark:text-[#60A5FA]">Account Settings</span>
        </nav>

        {/* Header */}
        <div className="ekr-glass-panel rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl ekr-glass-btn-primary flex items-center justify-center">
              <Settings className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-[#061B49] dark:text-white">
                Account &amp; Security Settings
              </h1>
              <p className="text-xs text-[#526685] dark:text-[#B8C9E5] mt-0.5">
                Manage preferences and security for <span className="font-mono font-semibold">{registeredEmail}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/profile"
              className="ekr-btn-secondary px-3.5 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap"
            >
              Edit Academic Profile
            </Link>
            <Link
              to="/dashboard"
              className="ekr-glass-btn-primary px-3.5 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>

        {/* Dedicated Password Update Form for Chrome Password Manager (https://everykr.com/settings) */}
        <form
          id="everykr-password-update-form"
          name="everykr-password-update"
          action={OFFICIAL_EVERYKR_SETTINGS_URL}
          method="post"
          onSubmit={handlePasswordUpdateSubmit}
          className="ekr-glass-panel rounded-2xl p-6 space-y-4"
          noValidate
        >
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 text-sm font-extrabold text-[#061B49] dark:text-white">
              <KeyRound className="w-4 h-4 text-[#0754B8] dark:text-[#60A5FA]" />
              <h2>Update EveryKR Password</h2>
            </div>
            <Link
              to="/reset-password"
              className="text-xs font-bold text-[#0754B8] dark:text-[#60A5FA] hover:underline"
            >
              Forgot current password? Reset via email
            </Link>
          </div>

          {passwordUpdateError && (
            <div
              role="alert"
              className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-950 dark:text-amber-200 text-xs flex items-start gap-2.5"
            >
              <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <span>{passwordUpdateError}</span>
            </div>
          )}

          {passwordUpdateSuccess && (
            <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/35 border border-emerald-200 dark:border-emerald-800 text-emerald-950 dark:text-emerald-200 text-xs flex items-center gap-2 font-semibold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{passwordUpdateSuccess}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label
                htmlFor="everykr-update-password-username"
                className="block font-semibold text-slate-600 dark:text-slate-300 mb-1"
              >
                Registered EveryKR Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="everykr-update-password-username"
                  name="username"
                  type="email"
                  autoComplete="username"
                  value={registeredEmail}
                  readOnly
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-100 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-600 dark:text-slate-300 font-mono cursor-not-allowed"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="everykr-update-current-password"
                className="block font-semibold text-slate-600 dark:text-slate-300 mb-1"
              >
                Current Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="everykr-update-current-password"
                  name="current-password"
                  type={showCurrentPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  disabled={isUpdatingPassword}
                  placeholder="Enter current password"
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword((prev) => !prev)}
                  aria-label={showCurrentPassword ? 'Hide current password' : 'Show current password'}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                >
                  {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label
                htmlFor="everykr-update-new-password"
                className="block font-semibold text-slate-600 dark:text-slate-300 mb-1"
              >
                New Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="everykr-update-new-password"
                  name="new-password"
                  type={showNewPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={isUpdatingPassword}
                  placeholder="At least 8 characters"
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword((prev) => !prev)}
                  aria-label={showNewPassword ? 'Hide new password' : 'Show new password'}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label
                htmlFor="everykr-update-confirm-password"
                className="block font-semibold text-slate-600 dark:text-slate-300 mb-1"
              >
                Confirm New Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="everykr-update-confirm-password"
                  name="confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  minLength={8}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isUpdatingPassword}
                  placeholder="Re-enter new password"
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={isUpdatingPassword}
              className="ekr-glass-btn-primary inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer disabled:opacity-50"
            >
              {isUpdatingPassword ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Updating Password...</span>
                </>
              ) : (
                <>
                  <KeyRound className="w-4 h-4" />
                  <span>Update Password</span>
                </>
              )}
            </button>
          </div>
        </form>

        <form onSubmit={handleSaveSettings} className="space-y-6">
          {/* 1. Identity & Session Isolation Card */}
          <div className="ekr-glass-panel rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold text-[#10213D] dark:text-white">
              <Lock className="w-4 h-4 text-[#0754B8] dark:text-[#60A5FA]" />
              <h2>01. Authenticated Account &amp; Session Security</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-[#526685] dark:text-[#B8C9E5] mb-1">
                  Display Name
                </label>
                <input
                  type="text"
                  autoComplete="name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="ekr-glass-input w-full px-3.5 py-2.5 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#526685] dark:text-[#B8C9E5] mb-1">
                  Verified Email Address
                </label>
                <input
                  type="email"
                  value={registeredEmail}
                  disabled
                  className="ekr-glass-subtle w-full px-3.5 py-2.5 rounded-xl text-[#526685] dark:text-[#B8C9E5] font-mono cursor-not-allowed opacity-80"
                />
              </div>
            </div>

            <div className="p-4 rounded-xl ekr-glass-subtle grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-[#526685] dark:text-[#B8C9E5]">Unique Firebase UID</span>
                <div className="font-mono font-bold text-[#10213D] dark:text-white mt-0.5 truncate" title={currentUser.id}>
                  {currentUser.id}
                </div>
              </div>
              <div>
                <span className="text-[#526685] dark:text-[#B8C9E5]">Account Role</span>
                <div className="font-bold uppercase text-[#0754B8] dark:text-[#60A5FA] mt-0.5">
                  {currentUser.role}
                </div>
              </div>
              <div>
                <span className="text-[#526685] dark:text-[#B8C9E5]">Verification &amp; Provider</span>
                <div className="font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1 mt-0.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>
                    {currentUser.authProvider === 'google' ? 'Google OAuth Verified' : 'Email OTP Verified'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Interface Theme & Language */}
          <div className="ekr-glass-panel rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold text-[#10213D] dark:text-white">
              <Globe className="w-4 h-4 text-[#0754B8] dark:text-[#60A5FA]" />
              <h2>02. Appearance &amp; Language Preferences</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-[#526685] dark:text-[#B8C9E5] mb-2">
                  Color Theme
                </label>
                <button
                  type="button"
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                  className="ekr-glass-subtle w-full flex items-center justify-between gap-2 py-2.5 px-3.5 rounded-xl font-bold cursor-pointer transition-all text-[#10213D] dark:text-white"
                >
                  <span className="flex items-center gap-2">
                    {theme === 'dark' ? (
                      <Sun className="w-4 h-4 text-amber-400" />
                    ) : (
                      <Moon className="w-4 h-4 text-[#0754B8]" />
                    )}
                    <span>{theme === 'dark' ? 'Switch to Day Mode' : 'Switch to Night Mode'}</span>
                  </span>
                </button>
              </div>

              <div>
                <label className="block font-semibold text-[#526685] dark:text-[#B8C9E5] mb-2">
                  Portal Display Language
                </label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as LanguageCode)}
                  className="ekr-glass-input w-full px-3.5 py-2.5 rounded-xl"
                >
                  <option className="bg-white dark:bg-[#0B204A]" value="en">🇺🇸 English (EN)</option>
                  <option className="bg-white dark:bg-[#0B204A]" value="ko">🇰🇷 한국어 (Korean)</option>
                  <option className="bg-white dark:bg-[#0B204A]" value="bn">🇧🇩 বাংলা (Bengali)</option>
                  <option className="bg-white dark:bg-[#0B204A]" value="ne">🇳🇵 नेपाली (Nepali)</option>
                  <option className="bg-white dark:bg-[#0B204A]" value="ur">🇵🇰 اردو (Urdu)</option>
                </select>
              </div>
            </div>
          </div>

          {/* 3. Notification Preferences */}
          <div className="ekr-glass-panel rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold text-[#10213D] dark:text-white">
              <Bell className="w-4 h-4 text-[#0754B8] dark:text-[#60A5FA]" />
              <h2>03. Notification &amp; Alert Channels</h2>
            </div>

            <div className="space-y-3 text-xs">
              <label className="flex items-center justify-between p-3.5 rounded-xl ekr-glass-subtle cursor-pointer">
                <div>
                  <div className="font-bold text-[#10213D] dark:text-white">HiKorea Visa &amp; ARC Expiration Reminders</div>
                  <div className="text-[#526685] dark:text-[#B8C9E5] mt-0.5">Receive alerts 30 days before your D-2/D-4 visa or address reporting deadline</div>
                </div>
                <input
                  type="checkbox"
                  checked={visaDeadlineAlerts}
                  onChange={(e) => setVisaDeadlineAlerts(e.target.checked)}
                  className="h-4 w-4 accent-[#0875E8]"
                />
              </label>

              <label className="flex items-center justify-between p-3.5 rounded-xl ekr-glass-subtle cursor-pointer">
                <div>
                  <div className="font-bold text-[#10213D] dark:text-white">University Admission &amp; GKS Scholarship Alerts</div>
                  <div className="text-[#526685] dark:text-[#B8C9E5] mt-0.5">Get notified when saved universities open Spring/Fall admission intakes</div>
                </div>
                <input
                  type="checkbox"
                  checked={emailAlerts}
                  onChange={(e) => setEmailAlerts(e.target.checked)}
                  className="h-4 w-4 accent-[#0875E8]"
                />
              </label>

              <label className="flex items-center justify-between p-3.5 rounded-xl ekr-glass-subtle cursor-pointer">
                <div>
                  <div className="font-bold text-[#10213D] dark:text-white">Student Job &amp; Application Status Updates</div>
                  <div className="text-[#526685] dark:text-[#B8C9E5] mt-0.5">Notifications when employers review your part-time or internship applications</div>
                </div>
                <input
                  type="checkbox"
                  checked={jobMatchAlerts}
                  onChange={(e) => setJobMatchAlerts(e.target.checked)}
                  className="h-4 w-4 accent-[#0875E8]"
                />
              </label>
            </div>
          </div>

          {/* Save & Session Actions */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <button
              type="button"
              onClick={handleSignOut}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-500/10 border border-rose-300/60 dark:border-rose-500/30 rounded-xl hover:bg-rose-500/20 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out of EveryKR</span>
            </button>

            <button
              type="submit"
              className="ekr-glass-btn-primary inline-flex items-center gap-2 px-6 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Save Account Settings</span>
            </button>
          </div>
        </form>
      </div>
    </section>
  );
};

