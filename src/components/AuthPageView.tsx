import React, { useEffect } from 'react';
import { Navigate, useSearchParams, Link, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { getPostLoginRedirectPath } from '../utils/seoRoutes';
import { AuthModal } from './AuthModal';
import { RegistrationWizard } from './RegistrationWizard';
import { EveryKrAnimatedLogo } from './common/EveryKrAnimatedLogo';
import { ShieldCheck, CheckCircle2, GraduationCap, Globe, Building2, Lock } from 'lucide-react';

interface AuthPageViewProps {
  mode: 'login' | 'signup';
}

export const AuthPageView: React.FC<AuthPageViewProps> = ({ mode }) => {
  const { currentUser, isAuthReady, setAuthModalMode, setIsAuthModalOpen } = useApp();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const redirectParam = searchParams.get('redirect');

  useEffect(() => {
    setAuthModalMode(mode);
    // On /login, open the sign-in modal automatically; on /register, render the full-page RegistrationWizard directly
    if (mode === 'login') {
      setIsAuthModalOpen(true);
    } else {
      setIsAuthModalOpen(false);
    }
    return () => {
      setIsAuthModalOpen(false);
    };
  }, [mode, setAuthModalMode, setIsAuthModalOpen]);

  // Only redirect if authentication state is verified and user is actively signed in
  const isAuthenticatedAndVerified =
    isAuthReady &&
    Boolean(currentUser) &&
    currentUser?.emailVerified !== false &&
    currentUser?.accountStatus !== 'unverified' &&
    currentUser?.accountStatus !== 'suspended';

  if (isAuthenticatedAndVerified && currentUser) {
    const destination = getPostLoginRedirectPath(currentUser, redirectParam);
    return <Navigate to={destination} replace />;
  }

  if (mode === 'signup') {
    return (
      <section className="py-8 sm:py-12 bg-transparent min-h-[85vh] px-3 sm:px-6">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Informational Sidebar */}
          <div className="lg:col-span-5 space-y-5 lg:sticky lg:top-24">
            <div className="flex items-center gap-3 flex-wrap">
              <Link
                to="/"
                className="inline-flex items-center rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0875E8]"
                aria-label="EveryKR — Everything Korea, One Platform"
              >
                <EveryKrAnimatedLogo variant="compact" imgClassName="h-8 sm:h-9" />
              </Link>
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0754B8] dark:text-[#60A5FA] uppercase tracking-wider">
                <ShieldCheck className="w-4 h-4" />
                <span>Official Registration Portal</span>
              </div>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#10213D] dark:text-white tracking-tight">
              Create Your Verified EveryKR Account
            </h1>

            <p className="text-xs sm:text-sm text-[#526685] dark:text-[#B8C9E5] leading-relaxed">
              Join South Korea’s verified international platform for students, general visitors, and global education partners. Complete your profile to unlock personalized Korean university admissions, GKS scholarships, visa tracking, and career tools.
            </p>

            <div className="space-y-2.5 text-xs">
              <div className="group p-3.5 rounded-xl ekr-glass-card flex items-start gap-3">
                <GraduationCap className="w-4 h-4 text-[#0754B8] dark:text-[#60A5FA] shrink-0 mt-0.5 ekr-icon-cap-float" />
                <div>
                  <div className="font-bold text-[#10213D] dark:text-white">Student Account</div>
                  <p className="text-[11px] text-[#526685] dark:text-[#B8C9E5] mt-0.5">
                    Full academic profile (SSC/HSC/Bachelor GPA, preferred Korean university &amp; intake, TOPIK/IELTS, and D-2/D-4 visa readiness).
                  </p>
                </div>
              </div>
              <div className="group p-3.5 rounded-xl ekr-glass-card flex items-start gap-3">
                <Globe className="w-4 h-4 text-[#0754B8] dark:text-[#60A5FA] shrink-0 mt-0.5 ekr-icon-compass-spin" />
                <div>
                  <div className="font-bold text-[#10213D] dark:text-white">General User Account</div>
                  <p className="text-[11px] text-[#526685] dark:text-[#B8C9E5] mt-0.5">
                    Explore life in South Korea, housing, news, events, and community forums without student-specific academic forms.
                  </p>
                </div>
              </div>
              <div className="group p-3.5 rounded-xl ekr-glass-card flex items-start gap-3">
                <Building2 className="w-4 h-4 text-[#0754B8] dark:text-[#60A5FA] shrink-0 mt-0.5 ekr-icon-building-lift" />
                <div>
                  <div className="font-bold text-[#10213D] dark:text-white">Education Agent / Partner</div>
                  <p className="text-[11px] text-[#526685] dark:text-[#B8C9E5] mt-0.5">
                    Official partner onboarding for verified study-abroad agencies and institutional representatives (includes Admin review).
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-400/35 space-y-1.5 text-xs backdrop-blur-md">
              <div className="flex items-center gap-1.5 font-bold text-emerald-800 dark:text-emerald-300">
                <Lock className="w-3.5 h-3.5" />
                <span>Korean PIPA &amp; Per-UID Data Protection</span>
              </div>
              <p className="text-[11px] text-emerald-800/90 dark:text-emerald-200/90 leading-relaxed">
                Every account is isolated by Firebase UID, verified via 6-digit Resend OTP or Google OAuth, and optional passport numbers are encrypted with AES-256-GCM.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-1 text-xs">
              <Link
                to={redirectParam ? `/login?redirect=${encodeURIComponent(redirectParam)}` : '/login'}
                className="font-bold text-[#0754B8] dark:text-[#60A5FA] hover:underline"
              >
                Already registered? Sign in at /login →
              </Link>
              <span aria-hidden="true" className="text-[#526685]">·</span>
              <Link to="/" className="text-[#526685] dark:text-[#B8C9E5] hover:underline">
                Continue in Guest Mode
              </Link>
            </div>
          </div>

          {/* Right Multi-Step Registration Wizard Card */}
          <div className="lg:col-span-7 ekr-glass-panel rounded-2xl p-5 sm:p-7">
            <RegistrationWizard
              onSwitchToLogin={() =>
                navigate(redirectParam ? `/login?redirect=${encodeURIComponent(redirectParam)}` : '/login')
              }
            />
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-12 sm:py-16 bg-transparent min-h-[82vh] flex flex-col items-center justify-center px-4">
      <div className="max-w-4xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Left Informational Column (Visible behind/beside auth dialog) */}
        <div className="lg:col-span-6 space-y-5">
          <div className="flex items-center gap-3 flex-wrap">
            <Link
              to="/"
              className="inline-flex items-center rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0875E8]"
              aria-label="EveryKR — Everything Korea, One Platform"
            >
              <EveryKrAnimatedLogo variant="compact" imgClassName="h-8 sm:h-9" />
            </Link>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0754B8] dark:text-[#60A5FA] uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4" />
              <span>Official Identity Portal</span>
            </div>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold text-[#10213D] dark:text-white tracking-tight">
            Sign In to Your EveryKR Account
          </h1>

          <p className="text-xs sm:text-sm text-[#526685] dark:text-[#B8C9E5] leading-relaxed">
            Access your personal Korean university bookmarks, D-2/D-4 visa checklist, academic profile, job applications, and isolated dashboard.
          </p>

          <div className="grid grid-cols-3 gap-2.5 text-xs">
            <div className="p-3 rounded-xl ekr-glass-card flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-[#0754B8] dark:text-[#60A5FA] shrink-0" />
              <span className="font-semibold text-[#10213D] dark:text-white truncate">Student</span>
            </div>
            <div className="p-3 rounded-xl ekr-glass-card flex items-center gap-2">
              <Globe className="w-4 h-4 text-[#0754B8] dark:text-[#60A5FA] shrink-0" />
              <span className="font-semibold text-[#10213D] dark:text-white truncate">General User</span>
            </div>
            <div className="p-3 rounded-xl ekr-glass-card flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#0754B8] dark:text-[#60A5FA] shrink-0" />
              <span className="font-semibold text-[#10213D] dark:text-white truncate">Agent Partner</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2 text-xs">
            <Link
              to={redirectParam ? `/register?redirect=${encodeURIComponent(redirectParam)}` : '/register'}
              className="font-bold text-[#0754B8] dark:text-[#60A5FA] hover:underline"
            >
              Need an account? Go to /register →
            </Link>
            <span aria-hidden="true" className="text-[#526685]">·</span>
            <Link to="/" className="text-[#526685] dark:text-[#B8C9E5] hover:underline">
              Continue browsing in Guest Mode
            </Link>
          </div>
        </div>

        {/* Right Summary Card if Modal is Closed */}
        <div className="lg:col-span-6 ekr-glass-panel rounded-2xl p-6 sm:p-8 space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="w-4 h-4" />
            <span>Per-UID Session Isolation &amp; Resend OTP Security</span>
          </div>
          <h2 className="text-lg font-bold text-[#10213D] dark:text-white">
            Ready to Sign In
          </h2>
          <p className="text-xs text-[#526685] dark:text-[#B8C9E5] leading-relaxed">
            Use the authentication window to sign in with Google or your verified email address and password.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setAuthModalMode('login');
                setIsAuthModalOpen(true);
              }}
              className="ekr-glass-btn-primary px-5 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer"
            >
              Open Sign-In Window
            </button>
            <Link
              to={redirectParam ? `/register?redirect=${encodeURIComponent(redirectParam)}` : '/register'}
              className="ekr-glass-subtle px-5 py-2.5 text-xs font-bold text-[#0754B8] dark:text-[#60A5FA] rounded-xl transition-all"
            >
              Create New Account
            </Link>
            <Link
              to="/reset-password"
              className="px-4 py-2.5 text-xs font-semibold text-[#526685] dark:text-[#B8C9E5] hover:text-[#0754B8] dark:hover:text-white rounded-xl transition-colors"
            >
              Forgot Password?
            </Link>
          </div>
        </div>
      </div>

      <AuthModal />
    </section>
  );
};

