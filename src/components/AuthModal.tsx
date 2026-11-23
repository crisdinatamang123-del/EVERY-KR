import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { UserRole } from '../types';
import {
  isAndroidOrMobileBrowser,
  OFFICIAL_EVERYKR_LOGIN_URL
} from '../lib/firebase';
import {
  deriveUniqueUidFromEmail,
  syncOtpVerificationMetadataDoc,
  requestPasswordResetClient,
  PASSWORD_RESET_SUCCESS_MESSAGE
} from '../services/firebaseService';
import { RegistrationWizard } from './RegistrationWizard';
import { RecaptchaCheckbox } from './security/RecaptchaCheckbox';
import { EveryKrAnimatedLogo } from './common/EveryKrAnimatedLogo';
import {
  X,
  User,
  Briefcase,
  Home,
  GraduationCap,
  Lock,
  Mail,
  Copy,
  Check,
  ArrowRight,
  ShieldAlert,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Clock,
  ArrowLeft,
  KeyRound,
  CheckCircle2
} from 'lucide-react';

export const AuthModal: React.FC = () => {
  const {
    currentUser,
    isAuthModalOpen,
    setIsAuthModalOpen,
    authModalMode,
    setAuthModalMode,
    login,
    loginWithGoogle,
    showToast,
    t
  } = useApp();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('student');
  const [forgotPasswordMode, setForgotPasswordMode] = useState(false);
  const [forgotPasswordSent, setForgotPasswordSent] = useState(false);
  const [forgotPasswordMessage, setForgotPasswordMessage] = useState<string | null>(null);
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [resetCooldown, setResetCooldown] = useState(0);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authError, setAuthError] = useState<{
    code: string;
    message: string;
    domain?: string;
  } | null>(null);
  const [copiedDomain, setCopiedDomain] = useState(false);

  // Email OTP Verification State
  const [signupStep, setSignupStep] = useState<'form' | 'otp_verify'>('form');
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [resendCooldown, setResendCooldown] = useState<number>(0);
  const [otpExpirySeconds, setOtpExpirySeconds] = useState<number>(300);
  const [attemptsRemaining, setAttemptsRemaining] = useState<number>(5);
  const [isResendingOtp, setIsResendingOtp] = useState<boolean>(false);
  const [otpStatusBanner, setOtpStatusBanner] = useState<string | null>(null);
  const [honeypot, setHoneypot] = useState<string>('');
  const [recaptchaToken, setRecaptchaToken] = useState<string>('');
  const [recaptchaError, setRecaptchaError] = useState<string | null>(null);
  const [recaptchaResetSignal, setRecaptchaResetSignal] = useState<number>(0);

  const otpInputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const googleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sendingResetRef = useRef<boolean>(false);

  // Immediately clear loading states and close modal once currentUser is authenticated and verified
  useEffect(() => {
    if (
      currentUser &&
      currentUser.emailVerified !== false &&
      currentUser.accountStatus !== 'unverified' &&
      isAuthModalOpen
    ) {
      if (googleTimeoutRef.current) {
        clearTimeout(googleTimeoutRef.current);
        googleTimeoutRef.current = null;
      }
      setIsGoogleLoading(false);
      setIsSubmitting(false);
      setAuthError(null);
      setSignupStep('form');
      setOtpDigits(['', '', '', '', '', '']);
      setIsAuthModalOpen(false);
    }
  }, [currentUser, isAuthModalOpen, setIsAuthModalOpen]);

  // Reset OTP and Forgot Password screen when switching between login and signup
  useEffect(() => {
    setSignupStep('form');
    setForgotPasswordMode(false);
    setForgotPasswordSent(false);
    setForgotPasswordMessage(null);
    setOtpDigits(['', '', '', '', '', '']);
    setAuthError(null);
    setOtpStatusBanner(null);
    setRecaptchaToken('');
    setRecaptchaError(null);
    setRecaptchaResetSignal((prev) => prev + 1);
  }, [authModalMode]);

  // 60-second Resend Cooldown & 5-minute OTP Expiry Countdown timers
  useEffect(() => {
    if (!isAuthModalOpen) return;

    const timer = setInterval(() => {
      setResendCooldown(prev => (prev > 0 ? prev - 1 : 0));
      setResetCooldown(prev => (prev > 0 ? prev - 1 : 0));
      if (signupStep === 'otp_verify') {
        setOtpExpirySeconds(prev => (prev > 0 ? prev - 1 : 0));
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [signupStep, isAuthModalOpen]);

  // Clean up timeout on unmount or modal close
  useEffect(() => {
    if (!isAuthModalOpen) {
      if (googleTimeoutRef.current) {
        clearTimeout(googleTimeoutRef.current);
        googleTimeoutRef.current = null;
      }
      setIsGoogleLoading(false);
      setIsSubmitting(false);
    }
    return () => {
      if (googleTimeoutRef.current) {
        clearTimeout(googleTimeoutRef.current);
      }
    };
  }, [isAuthModalOpen]);

  if (!isAuthModalOpen) return null;

  const currentDomain = typeof window !== 'undefined' ? window.location.hostname : 'everykr.com';
  const isMobileBrowser = isAndroidOrMobileBrowser();

  const roles: { id: UserRole; label: string; icon: React.ReactNode }[] = [
    { id: 'student', label: 'International Student', icon: <GraduationCap className="w-4 h-4" /> },
    { id: 'employer', label: 'Korean Employer', icon: <Briefcase className="w-4 h-4" /> },
    { id: 'landlord', label: 'Housing Provider', icon: <Home className="w-4 h-4" /> },
    { id: 'university', label: 'University Partner', icon: <User className="w-4 h-4" /> }
  ];

  const selectedRoleLabel = roles.find(r => r.id === role)?.label || 'International Student';

  // Client-side password & email validation helpers
  const isValidEmailFormat = (val: string) =>
    /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(val.trim());

  const hasMinLength = password.length >= 8;
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumberOrSymbol = /[0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password);
  const isPasswordStrong = hasMinLength && hasLetter && hasNumberOrSymbol;

  const formatCountdown = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const cancelGoogleSignInAttempt = () => {
    if (googleTimeoutRef.current) {
      clearTimeout(googleTimeoutRef.current);
      googleTimeoutRef.current = null;
    }
    setIsGoogleLoading(false);
    setAuthError({
      code: 'auth/cancelled-by-user',
      message: 'Google sign-in was cancelled. You can retry with Popup or Redirect mode below.',
      domain: currentDomain
    });
  };

  const handleGoogleSignIn = async (useRedirect: boolean = false) => {
    if (googleTimeoutRef.current) {
      clearTimeout(googleTimeoutRef.current);
    }

    setIsGoogleLoading(true);
    setAuthError(null);

    // Guard so the button NEVER stays on "Connecting Google Account..." indefinitely
    let didTimeout = false;
    googleTimeoutRef.current = setTimeout(() => {
      didTimeout = true;
      setIsGoogleLoading(false);
      setAuthError({
        code: 'auth/timeout',
        message: isMobileBrowser
          ? 'Google sign-in popup did not respond on your mobile browser. Tap "Continue via Redirect Mode" below to complete Google sign-in.'
          : 'Google sign-in window timed out or was blocked by your browser. Please check if a popup window is hidden behind your browser or try Redirect Mode.',
        domain: currentDomain
      });
    }, 25000);

    try {
      const selectedRoleForAuth = authModalMode === 'signup' ? role : undefined;
      await loginWithGoogle(useRedirect, selectedRoleForAuth);
    } catch (err: any) {
      if (didTimeout) return;
      const code = err?.code || 'auth/error';
      let message = err?.message || 'Failed to sign in with Google.';

      if (code === 'auth/configuration-not-found' || code === 'auth/operation-not-allowed') {
        message =
          'Firebase Authentication or the Google Sign-In provider is not enabled yet in the "everykr" Firebase Console. Go to Firebase Console -> Authentication -> Sign-in method -> Enable Google.';
      } else if (code === 'auth/unauthorized-domain') {
        message = 'This domain has not been added to Authorized Domains in the EveryKR Firebase Console.';
      } else if (code === 'auth/popup-blocked') {
        message = 'Google popup was blocked by your browser. Please use Redirect Mode below.';
      } else if (code === 'auth/popup-closed-by-user') {
        message = 'The Google sign-in window was closed before completing authentication. Please try again.';
      } else if (code === 'auth/cancelled-popup-request') {
        message = 'A previous Google sign-in popup was replaced. Please click Continue with Google again.';
      } else if (code === 'auth/network-request-failed') {
        message = 'Network error while connecting to Google Authentication servers. Check your internet connection.';
      }

      setAuthError({
        code,
        message,
        domain: currentDomain
      });
    } finally {
      if (googleTimeoutRef.current) {
        clearTimeout(googleTimeoutRef.current);
        googleTimeoutRef.current = null;
      }
      setIsGoogleLoading(false);
    }
  };

  const copyDomainToClipboard = (text: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedDomain(true);
      showToast(`Copied domain to clipboard: ${text}`);
      setTimeout(() => setCopiedDomain(false), 2500);
    }
  };

  // Request or Resend 6-Digit OTP via Backend Resend API
  const requestOtpFromServer = async (isResend: boolean = false) => {
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedName = name.trim();

    if (!trimmedName || trimmedName.length < 2) {
      setAuthError({
        code: 'auth/invalid-name',
        message: 'Please enter your full name (at least 2 characters).'
      });
      return;
    }

    if (!isValidEmailFormat(trimmedEmail)) {
      setAuthError({
        code: 'auth/invalid-email',
        message: 'Please enter a valid email address (e.g. name@university.ac.kr).'
      });
      return;
    }

    if (!isPasswordStrong) {
      setAuthError({
        code: 'auth/weak-password',
        message: 'Password must be at least 8 characters long and include both letters and numbers/symbols.'
      });
      return;
    }

    if (!recaptchaToken) {
      const msg = t('recaptcha_required_error');
      setRecaptchaError(msg);
      setAuthError({
        code: 'recaptcha/missing_token',
        message: msg
      });
      return;
    }

    if (isResend) {
      setIsResendingOtp(true);
    } else {
      setIsSubmitting(true);
    }
    setAuthError(null);
    setRecaptchaError(null);
    setOtpStatusBanner(null);

    try {
      const response = await fetch('/api/auth/otp/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: trimmedName,
          email: trimmedEmail,
          password,
          role,
          isResend,
          honeypot,
          recaptchaToken
        })
      });

      const data = await response.json().catch(() => ({
        ok: false,
        status: 'server_error',
        message: 'Could not reach verification server.'
      }));

      if (!response.ok || !data.ok) {
        if (data.resendCooldownSeconds) {
          setResendCooldown(data.resendCooldownSeconds);
        }
        setAuthError({
          code: `otp/${data.status || 'request_failed'}`,
          message: data.message || 'Unable to send verification code.'
        });
        return;
      }

      // Persist non-sensitive OTP verification metadata to Firestore `otp_verifications` (never stores plaintext OTP)
      const nowIso = new Date().toISOString();
      const expIso = new Date(Date.now() + (data.expiresInSeconds || 300) * 1000).toISOString();
      const targetUid = deriveUniqueUidFromEmail(trimmedEmail);
      syncOtpVerificationMetadataDoc({
        id: `otp_${targetUid}`,
        uid: targetUid,
        email: trimmedEmail,
        fullName: trimmedName,
        role,
        status: 'pending_otp',
        emailVerified: false,
        attemptsUsed: 0,
        maxAttempts: 5,
        requestedAt: nowIso,
        expiresAt: expIso
      }).catch(() => {});

      // Transition to OTP Verification Screen — account is NOT activated yet
      setSignupStep('otp_verify');
      setOtpDigits(['', '', '', '', '', '']);
      setResendCooldown(data.resendCooldownSeconds || 60);
      setOtpExpirySeconds(data.expiresInSeconds || 300);
      setAttemptsRemaining(5);
      setOtpStatusBanner(
        isResend
          ? `A new 6-digit verification code was sent to ${trimmedEmail}. Previous codes have been invalidated.`
          : `We sent a 6-digit verification code to ${trimmedEmail} from EveryKR <newsletter@everykr.com>.`
      );
      showToast(`6-digit OTP sent to ${trimmedEmail}`);

      setTimeout(() => {
        otpInputRefs.current[0]?.focus();
      }, 80);
    } catch (err: any) {
      setAuthError({
        code: 'otp/network-error',
        message: err?.message || 'Network error while requesting verification code.'
      });
    } finally {
      setIsSubmitting(false);
      setIsResendingOtp(false);
      setRecaptchaToken('');
      setRecaptchaResetSignal((prev) => prev + 1);
    }
  };

  // Handle typing or pasting in the 6-digit OTP boxes
  const handleOtpDigitChange = (index: number, rawValue: string) => {
    const digitsOnly = rawValue.replace(/\D/g, '');
    if (!digitsOnly) {
      const updated = [...otpDigits];
      updated[index] = '';
      setOtpDigits(updated);
      return;
    }

    // Support pasting multiple digits or full 6-digit code
    if (digitsOnly.length > 1) {
      const chars = digitsOnly.slice(0, 6).split('');
      const updated = [...otpDigits];
      for (let i = 0; i < 6; i++) {
        if (index + i < 6 && chars[i]) {
          updated[index + i] = chars[i];
        }
      }
      setOtpDigits(updated);
      const nextFocusIndex = Math.min(5, index + chars.length);
      otpInputRefs.current[nextFocusIndex]?.focus();
      return;
    }

    const updated = [...otpDigits];
    updated[index] = digitsOnly;
    setOtpDigits(updated);

    if (index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    const nextDigits = ['', '', '', '', '', ''];
    for (let i = 0; i < pasted.length; i++) {
      nextDigits[i] = pasted[i];
    }
    setOtpDigits(nextDigits);
    const focusIdx = Math.min(5, pasted.length);
    otpInputRefs.current[focusIdx]?.focus();
  };

  // Verify the 6-digit OTP on the backend, then create Firebase Auth account & Firestore user profile
  const handleVerifyOtpAndCompleteSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    const enteredOtp = otpDigits.join('');
    if (enteredOtp.length !== 6) {
      setAuthError({
        code: 'otp/incomplete',
        message: 'Please enter all 6 digits of your verification code.'
      });
      return;
    }

    setIsSubmitting(true);
    setAuthError(null);

    try {
      const verifyRes = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          otp: enteredOtp
        })
      });

      const verifyData = await verifyRes.json().catch(() => ({
        ok: false,
        status: 'server_error',
        message: 'Could not verify code.'
      }));

      const normalizedTargetEmail = email.trim().toLowerCase();
      const targetUid = deriveUniqueUidFromEmail(normalizedTargetEmail);

      if (!verifyRes.ok || !verifyData.ok || !verifyData.verificationProofToken) {
        if (typeof verifyData.attemptsRemaining === 'number') {
          setAttemptsRemaining(verifyData.attemptsRemaining);
          syncOtpVerificationMetadataDoc({
            id: `otp_${targetUid}`,
            uid: targetUid,
            email: normalizedTargetEmail,
            fullName: name.trim(),
            role,
            status: verifyData.attemptsRemaining === 0 ? 'locked' : 'pending_otp',
            emailVerified: false,
            attemptsUsed: 5 - verifyData.attemptsRemaining,
            maxAttempts: 5,
            requestedAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + otpExpirySeconds * 1000).toISOString()
          }).catch(() => {});
        }
        setAuthError({
          code: `otp/${verifyData.status || 'verification_failed'}`,
          message: verifyData.message || 'Invalid or expired verification code.'
        });
        return;
      }

      // Sync verified metadata to Firestore `otp_verifications` (metadata only, zero OTP code)
      syncOtpVerificationMetadataDoc({
        id: `otp_${targetUid}`,
        uid: targetUid,
        email: normalizedTargetEmail,
        fullName: name.trim(),
        role,
        status: 'verified',
        emailVerified: true,
        attemptsUsed: 5 - attemptsRemaining,
        maxAttempts: 5,
        requestedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + otpExpirySeconds * 1000).toISOString(),
        verifiedAt: verifyData.verifiedUser?.verifiedAt || new Date().toISOString()
      }).catch(() => {});

      // OTP verified on backend! Now create/activate the Firebase account with the signed proof token
      await login(
        normalizedTargetEmail,
        role,
        name.trim(),
        true,
        password,
        verifyData.verificationProofToken
      );

      // Clear sensitive form fields after successful activation
      setEmail('');
      setPassword('');
      setName('');
      setOtpDigits(['', '', '', '', '', '']);
      setSignupStep('form');
    } catch (err: any) {
      const code = err?.code || 'auth/error';
      let message = err?.message || 'Could not complete account registration.';
      if (code === 'auth/email-already-in-use') {
        message = 'This email is already registered in Firebase. Please switch to Sign In.';
      }
      setAuthError({ code, message, domain: currentDomain });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      showToast('Please fill in your email and password');
      return;
    }

    // For Sign-Up: Step 1 always sends the 6-digit OTP and does NOT activate the account yet
    if (authModalMode === 'signup') {
      await requestOtpFromServer(false);
      return;
    }

    // For Sign-In: Existing verified user sign-in (Protected by Google reCAPTCHA v2 Checkbox)
    if (!recaptchaToken) {
      const msg = t('recaptcha_required_error');
      setRecaptchaError(msg);
      setAuthError({
        code: 'recaptcha/missing_token',
        message: msg,
        domain: currentDomain
      });
      return;
    }

    setIsSubmitting(true);
    setAuthError(null);
    setRecaptchaError(null);
    try {
      await login(
        email.trim(),
        role,
        undefined,
        false,
        password,
        undefined,
        undefined,
        recaptchaToken
      );
      setEmail('');
      setPassword('');
      setName('');
    } catch (err: any) {
      const code = err?.code || 'auth/error';
      let message = err?.message || 'Could not complete authentication.';
      if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        message = 'Incorrect email or password. Please try again.';
      }
      setAuthError({ code, message, domain: currentDomain });
    } finally {
      setIsSubmitting(false);
      setRecaptchaToken('');
      setRecaptchaResetSignal((prev) => prev + 1);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#061B49]/55 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div
        className={`relative w-full ${
          authModalMode === 'signup' ? 'max-w-2xl' : 'max-w-md'
        } ekr-glass-modal rounded-2xl overflow-hidden my-4 sm:my-8 animate-fade-in transition-colors`}
      >
        {/* Header with Official EVERYKR Logo */}
        <div className="p-5 sm:p-6 pb-4 border-b border-slate-200/60 dark:border-white/12 flex items-center justify-between bg-white/40 dark:bg-white/5">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2.5 flex-wrap">
              <EveryKrAnimatedLogo variant="compact" imgClassName="h-7 sm:h-8" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#0754B8] dark:text-[#60A5FA] ekr-glass-subtle px-2 py-0.5 rounded-md">
                {authModalMode === 'login' ? 'Sign In' : 'Multi-Step Registration'}
              </span>
            </div>
            <h3 className="text-xs sm:text-sm font-semibold text-[#526685] dark:text-[#B8C9E5]">
              {authModalMode === 'login'
                ? 'Sign in to access your EveryKR dashboard'
                : 'Create your verified EveryKR account'}
            </h3>
          </div>
          <button
            type="button"
            onClick={() => {
              setIsAuthModalOpen(false);
              setAuthError(null);
            }}
            className="p-1.5 text-[#526685] dark:text-[#B8C9E5] hover:text-[#10213D] dark:hover:text-white rounded-lg cursor-pointer transition-colors"
            aria-label="Close authentication modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-4 max-h-[82vh] overflow-y-auto">
          {authModalMode === 'signup' ? (
            <RegistrationWizard
              compactModal
              onSwitchToLogin={() => {
                setAuthModalMode('login');
                setAuthError(null);
              }}
              onSuccessClose={() => {
                setIsAuthModalOpen(false);
                setAuthError(null);
              }}
            />
          ) : (
            <>
              {/* Role Selector at Top when Registering (Step 1) */}
              {false && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    1. Select Your Registration Role:
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {roles.map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => setRole(r.id)}
                        className={`flex items-center gap-2 p-2.5 rounded-xl text-xs font-medium border text-left cursor-pointer transition-colors ${
                          role === r.id
                            ? 'bg-blue-50/90 dark:bg-blue-950/50 border-[#1769AA] dark:border-blue-500 text-[#10243A] dark:text-blue-200 font-bold shadow-2xs'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-750'
                        }`}
                      >
                        {r.icon}
                        <span className="truncate">{r.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

          {/* Diagnostic Error Banner if Google, Email, or OTP verification fails */}
          {authError && (
            <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs space-y-2">
              <div className="flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="font-bold flex items-center justify-between">
                    <span>Verification Notice ({authError.code})</span>
                    <button
                      type="button"
                      onClick={() => setAuthError(null)}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs cursor-pointer"
                    >
                      Dismiss
                    </button>
                  </div>
                  <p className="mt-1 leading-relaxed text-[11px] text-amber-800 dark:text-amber-300">
                    {authError.message}
                  </p>
                </div>
              </div>

              {authError.code === 'auth/unauthorized-domain' && (
                <div className="pt-2 border-t border-amber-200 dark:border-amber-900/60 space-y-1.5 text-[11px]">
                  <p className="font-semibold text-amber-950 dark:text-amber-100">
                    To enable Google Login on this domain:
                  </p>
                  <ol className="list-decimal list-inside space-y-1 text-slate-700 dark:text-slate-300 pl-1">
                    <li>Open <strong>Firebase Console (everykr)</strong> &gt; <strong>Authentication</strong> &gt; <strong>Settings</strong></li>
                    <li>Click <strong>Authorized domains</strong> &gt; <strong>Add domain</strong></li>
                    <li>Paste your current domain:</li>
                  </ol>
                  <div className="flex items-center gap-2 mt-1.5">
                    <code className="flex-1 bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-800 px-2 py-1.5 rounded font-mono text-[11px] select-all break-all text-slate-800 dark:text-slate-200">
                      {currentDomain}
                    </code>
                    <button
                      type="button"
                      onClick={() => copyDomainToClipboard(currentDomain)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded font-medium cursor-pointer transition-colors shrink-0 text-xs shadow-xs"
                    >
                      {copiedDomain ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedDomain ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>
              )}

              {(authError.code === 'auth/popup-blocked' || authError.code === 'auth/timeout') && (
                <div className="pt-2 border-t border-amber-200 dark:border-amber-900/60">
                  <button
                    type="button"
                    onClick={() => handleGoogleSignIn(true)}
                    className="w-full py-2 px-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <span>Continue via Redirect Mode</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {authError.code === 'auth/operation-not-allowed' && (
                <div className="pt-2 border-t border-amber-200 dark:border-amber-900/60 space-y-1 text-[11px]">
                  <p className="font-semibold text-amber-950 dark:text-amber-100">
                    To enable Firebase Password Reset emails:
                  </p>
                  <ol className="list-decimal list-inside space-y-0.5 text-slate-700 dark:text-slate-300 pl-1">
                    <li>Open <strong>Firebase Console (everykr)</strong> &gt; <strong>Authentication</strong> &gt; <strong>Sign-in method</strong></li>
                    <li>Select <strong>Email/Password</strong>, toggle <strong>Enable</strong> ON, and click <strong>Save</strong></li>
                  </ol>
                </div>
              )}
            </div>
          )}

          {/* Dedicated Google Authentication Active State */}
          {isGoogleLoading ? (
            <div className="py-8 px-4 rounded-2xl ekr-glass-subtle text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-50/80 dark:bg-[#0875E8]/20 border border-blue-200/70 dark:border-[#60A5FA]/30 flex items-center justify-center mx-auto text-[#0754B8] dark:text-[#60A5FA]">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>

              <div className="space-y-1">
                <h4 className="text-sm font-bold text-[#10213D] dark:text-white">
                  Connecting Google Account...
                </h4>
                <p className="text-xs text-[#526685] dark:text-[#B8C9E5] max-w-xs mx-auto leading-relaxed">
                  Please select your Google account in the sign-in window to continue.
                </p>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => handleGoogleSignIn(true)}
                  className="ekr-glass-btn-primary w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold text-white rounded-xl transition-all cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Use Redirect Mode Instead</span>
                </button>
                <button
                  type="button"
                  onClick={cancelGoogleSignInAttempt}
                  className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-[#526685] dark:text-[#B8C9E5] hover:text-rose-600 ekr-glass-subtle rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : signupStep === 'otp_verify' ? (
            /* ========================================================= */
            /* STEP 2: 6-DIGIT EMAIL OTP VERIFICATION SCREEN             */
            /* ========================================================= */
            <form onSubmit={handleVerifyOtpAndCompleteSignup} className="space-y-4">
              <div className="p-3.5 rounded-xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/80 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-[#1769AA] dark:text-blue-400 shrink-0" />
                    <span className="text-xs font-bold text-[#10243A] dark:text-white">
                      Verify Your Email Address
                    </span>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#10243A] text-[#19B6A4]">
                    {selectedRoleLabel}
                  </span>
                </div>

                <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                  {otpStatusBanner ||
                    `Enter the 6-digit verification code sent to ${email.trim().toLowerCase()} to activate your EveryKR account.`}
                </p>

                <div className="flex items-center justify-between pt-1 text-[11px] border-t border-blue-200/60 dark:border-blue-800/60">
                  <span className="font-mono font-semibold text-[#10243A] dark:text-blue-200 truncate max-w-[210px]">
                    {email.trim().toLowerCase()}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setSignupStep('form');
                      setAuthError(null);
                      setOtpDigits(['', '', '', '', '', '']);
                    }}
                    className="inline-flex items-center gap-1 text-[#1769AA] dark:text-blue-400 hover:underline font-bold cursor-pointer shrink-0"
                  >
                    <ArrowLeft className="w-3 h-3" />
                    <span>Change Email</span>
                  </button>
                </div>
              </div>

              {/* 6-Digit OTP Input Boxes */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-[#1769AA]" />
                    <span>6-Digit Verification Code</span>
                  </label>
                  <span
                    className={`text-[11px] font-mono font-semibold flex items-center gap-1 ${
                      otpExpirySeconds <= 60
                        ? 'text-rose-600 dark:text-rose-400'
                        : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    <Clock className="w-3 h-3" />
                    <span>
                      {otpExpirySeconds > 0
                        ? `Expires in ${formatCountdown(otpExpirySeconds)}`
                        : 'Code Expired'}
                    </span>
                  </span>
                </div>

                <div className="grid grid-cols-6 gap-2 sm:gap-2.5">
                  {otpDigits.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={el => {
                        otpInputRefs.current[idx] = el;
                      }}
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={6}
                      value={digit}
                      onChange={e => handleOtpDigitChange(idx, e.target.value)}
                      onKeyDown={e => handleOtpKeyDown(idx, e)}
                      onPaste={handleOtpPaste}
                      aria-label={`Verification code digit ${idx + 1}`}
                      className="w-full h-12 text-center font-mono text-lg font-black rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-[#10243A] dark:text-white focus:outline-none focus:border-[#1769AA] dark:focus:border-[#19B6A4] focus:bg-white dark:focus:bg-slate-900 transition-colors"
                    />
                  ))}
                </div>

                <div className="flex items-center justify-between mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                  <span>Sender: EveryKR &lt;newsletter@everykr.com&gt;</span>
                  <span>Attempts remaining: <strong>{attemptsRemaining}/5</strong></span>
                </div>
              </div>

              {/* Verify & Activate Button */}
              <button
                type="submit"
                disabled={isSubmitting || otpDigits.join('').length !== 6 || otpExpirySeconds === 0 || attemptsRemaining === 0}
                className="w-full py-3 px-4 text-xs font-bold text-white bg-[#10243A] hover:bg-[#1769AA] dark:bg-[#19B6A4] dark:text-[#10243A] dark:hover:bg-[#19B6A4]/90 rounded-xl transition-colors cursor-pointer shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verifying OTP &amp; Activating Account...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Verify Code &amp; Activate Account</span>
                  </>
                )}
              </button>

              {/* Resend OTP with 60-Second Countdown & Change Email */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => requestOtpFromServer(true)}
                  disabled={resendCooldown > 0 || isResendingOtp || isSubmitting}
                  className="inline-flex items-center gap-1.5 font-bold text-[#1769AA] dark:text-blue-400 hover:underline disabled:text-slate-400 dark:disabled:text-slate-600 disabled:no-underline cursor-pointer disabled:cursor-not-allowed"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isResendingOtp ? 'animate-spin' : ''}`} />
                  <span>
                    {isResendingOtp
                      ? 'Sending new OTP...'
                      : resendCooldown > 0
                      ? `Resend OTP in ${resendCooldown}s`
                      : 'Resend OTP Code'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSignupStep('form');
                    setAuthError(null);
                    setOtpDigits(['', '', '', '', '', '']);
                  }}
                  className="text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-semibold cursor-pointer"
                >
                  Change Email Address
                </button>
              </div>
            </form>
          ) : (
            /* ========================================================= */
            /* STEP 1: SIGN IN OR REGISTRATION DETAILS FORM              */
            /* ========================================================= */
            <>
              {/* Primary Google OAuth Sign-in Button (Does not require additional Email OTP) */}
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => handleGoogleSignIn(false)}
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center gap-2.5 py-3 px-4 ekr-glass-subtle hover:bg-white/85 dark:hover:bg-white/15 text-[#10213D] dark:text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer disabled:opacity-50"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  <span>Continue with Google</span>
                </button>

                {/* Mobile & Redirect fallback trigger */}
                <div className="flex items-center justify-between px-1 text-[11px] text-[#526685] dark:text-[#B8C9E5]">
                  <span>{isMobileBrowser ? 'On Android / mobile browser?' : 'Popup blocked by browser?'}</span>
                  <button
                    type="button"
                    onClick={() => handleGoogleSignIn(true)}
                    disabled={isSubmitting}
                    className="text-[#0754B8] dark:text-[#60A5FA] hover:underline font-semibold cursor-pointer"
                  >
                    Use Redirect Mode
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex-1 border-t border-slate-200/60 dark:border-white/12"></div>
                <span className="text-[11px] text-[#526685] dark:text-[#B8C9E5] font-medium">
                  or sign in with email
                </span>
                <div className="flex-1 border-t border-slate-200/60 dark:border-white/12"></div>
              </div>

              {forgotPasswordMode ? (
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (sendingResetRef.current || isSendingReset || resetCooldown > 0) {
                      return;
                    }

                    setAuthError(null);
                    setRecaptchaError(null);
                    setForgotPasswordSent(false);
                    setForgotPasswordMessage(null);

                    if (honeypot.trim().length > 0) {
                      setAuthError({
                        code: 'auth/spam-blocked',
                        message: 'Automated submission blocked.'
                      });
                      return;
                    }

                    const trimmedEmail = email.trim().toLowerCase();
                    if (!trimmedEmail || !isValidEmailFormat(trimmedEmail)) {
                      setAuthError({
                        code: 'auth/invalid-email',
                        message: 'Please enter a valid email address.'
                      });
                      return;
                    }

                    sendingResetRef.current = true;
                    setIsSendingReset(true);
                    try {
                      const res = await requestPasswordResetClient(trimmedEmail);
                      if (!res.ok) {
                        if (res.cooldownSeconds) {
                          setResetCooldown(res.cooldownSeconds);
                        }
                        setForgotPasswordSent(false);
                        setForgotPasswordMessage(null);
                        setAuthError({
                          code: res.code || res.status || 'auth/reset-failed',
                          message: res.message
                        });
                      } else {
                        setForgotPasswordSent(true);
                        setForgotPasswordMessage(PASSWORD_RESET_SUCCESS_MESSAGE);
                        setResetCooldown(res.cooldownSeconds || 60);
                        showToast(PASSWORD_RESET_SUCCESS_MESSAGE);
                      }
                    } catch (err: any) {
                      setForgotPasswordSent(false);
                      setForgotPasswordMessage(null);
                      setAuthError({
                        code: err?.code || 'auth/network-request-failed',
                        message: err?.message || 'Unable to send password reset request right now.'
                      });
                    } finally {
                      sendingResetRef.current = false;
                      setIsSendingReset(false);
                    }
                  }}
                  className="space-y-3.5"
                >
                  <div className="p-3.5 rounded-xl ekr-glass-subtle space-y-1">
                    <div className="flex items-center gap-2 text-xs font-bold text-[#10213D] dark:text-white">
                      <KeyRound className="w-4 h-4 text-[#0754B8] dark:text-[#60A5FA]" />
                      <span>Reset Your EveryKR Password</span>
                    </div>
                    <p className="text-[11px] text-[#526685] dark:text-[#B8C9E5] leading-relaxed">
                      Enter the registered email address for your EveryKR account to receive password reset instructions.
                    </p>
                  </div>

                  <div>
                    <label htmlFor="everykr-reset-email" className="block text-xs font-semibold text-[#10213D] dark:text-[#DCE8FA] mb-1">
                      Registered Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-[#526685] dark:text-[#B8C9E5] absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        id="everykr-reset-email"
                        name="username"
                        type="email"
                        autoComplete="username"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={isSendingReset}
                        placeholder="name@university.ac.kr"
                        className="ekr-glass-input w-full pl-9 pr-3 py-2 text-xs rounded-xl disabled:opacity-60"
                        required
                      />
                    </div>
                  </div>

                  {forgotPasswordSent && forgotPasswordMessage && (
                    <div className="p-3.5 bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 text-xs rounded-xl border border-emerald-200 dark:border-emerald-500/40 space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-emerald-800 dark:text-emerald-300">
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span>Check Your Email</span>
                      </div>
                      <p className="text-[11px] leading-relaxed">
                        {forgotPasswordMessage}
                      </p>
                    </div>
                  )}

                  <input
                    type="text"
                    name="website_hp"
                    value={honeypot}
                    onChange={(e) => setHoneypot(e.target.value)}
                    tabIndex={-1}
                    autoComplete="off"
                    className="hidden"
                    aria-hidden="true"
                  />

                  <button
                    type="submit"
                    disabled={isSendingReset || resetCooldown > 0}
                    className="ekr-glass-btn-primary w-full py-2.5 text-xs font-bold text-white rounded-xl transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isSendingReset ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Sending Reset Instructions...</span>
                      </>
                    ) : resetCooldown > 0 ? (
                      <span>Resend Reset Email in {resetCooldown}s</span>
                    ) : (
                      <span>Send Password Reset Email</span>
                    )}
                  </button>

                  <div className="text-center pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setForgotPasswordMode(false);
                        setForgotPasswordSent(false);
                        setForgotPasswordMessage(null);
                        setAuthError(null);
                        setRecaptchaToken('');
                        setRecaptchaError(null);
                      }}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0754B8] dark:text-[#60A5FA] hover:underline cursor-pointer"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Back to Sign In</span>
                    </button>
                  </div>
                </form>
              ) : (
                <form
                  id="everykr-login-form"
                  name="everykr-login"
                  action={OFFICIAL_EVERYKR_LOGIN_URL}
                  method="post"
                  onSubmit={handleSubmit}
                  className="space-y-3.5"
                >
                  <div>
                    <label htmlFor="everykr-login-email" className="block text-xs font-semibold text-[#10213D] dark:text-[#DCE8FA] mb-1">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-[#526685] dark:text-[#B8C9E5] absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        id="everykr-login-email"
                        name="username"
                        type="email"
                        autoComplete="username"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="name@university.ac.kr"
                        className="ekr-glass-input w-full pl-9 pr-3 py-2 text-xs rounded-xl"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label htmlFor="everykr-login-password" className="text-xs font-semibold text-[#10213D] dark:text-[#DCE8FA]">Password</label>
                      <button
                        type="button"
                        onClick={() => {
                          setForgotPasswordMode(true);
                          setForgotPasswordSent(false);
                          setForgotPasswordMessage(null);
                          setAuthError(null);
                          setRecaptchaToken('');
                          setRecaptchaError(null);
                        }}
                        className="text-[11px] text-[#0754B8] dark:text-[#60A5FA] hover:underline cursor-pointer font-semibold"
                      >
                        Forgot Password?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-[#526685] dark:text-[#B8C9E5] absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        id="everykr-login-password"
                        name="password"
                        type="password"
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="ekr-glass-input w-full pl-9 pr-3 py-2 text-xs rounded-xl"
                        required
                      />
                    </div>
                  </div>

                  <input
                    type="text"
                    name="website_hp"
                    value={honeypot}
                    onChange={(e) => setHoneypot(e.target.value)}
                    tabIndex={-1}
                    autoComplete="off"
                    className="hidden"
                    aria-hidden="true"
                  />

                  <RecaptchaCheckbox
                    idPrefix="everykr-auth-login"
                    onTokenChange={(tok) => {
                      setRecaptchaToken(tok);
                      if (tok) setRecaptchaError(null);
                    }}
                    errorMessage={recaptchaError}
                    resetSignal={recaptchaResetSignal}
                  />

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="ekr-glass-btn-primary w-full py-2.5 text-xs font-bold text-white rounded-xl transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Authenticating...</span>
                      </>
                    ) : (
                      <span>Sign In to EveryKR</span>
                    )}
                  </button>

                {/* Mode Switch */}
                <div className="text-center text-xs text-[#526685] dark:text-[#B8C9E5] pt-1">
                  {authModalMode === 'login' ? (
                    <span>
                      New to EveryKR?{' '}
                      <button
                        type="button"
                        onClick={() => {
                          setAuthModalMode('signup');
                          setAuthError(null);
                        }}
                        className="font-bold text-[#0754B8] dark:text-[#60A5FA] hover:underline cursor-pointer"
                      >
                        Create free account
                      </button>
                    </span>
                  ) : (
                    <span>
                      Already registered?{' '}
                      <button
                        type="button"
                        onClick={() => {
                          setAuthModalMode('login');
                          setAuthError(null);
                        }}
                        className="font-bold text-[#0754B8] dark:text-[#60A5FA] hover:underline cursor-pointer"
                      >
                        Sign in here
                      </button>
                    </span>
                  )}
                </div>
                </form>
              )}
            </>
          )}
            </>
          )}
        </div>

      </div>
    </div>
  );
};
