import React, { useEffect, useState } from 'react';
import { Navigate, useLocation, Link } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { ShieldAlert, ArrowRight, Home, Loader2 } from 'lucide-react';
import { EveryKrAnimatedLogo } from '../common/EveryKrAnimatedLogo';
import { resolveSmartApplicationAdminRole } from '../../services/smartApplicationService';
import type { SmartApplicationAdminRole } from '../../types/smartApplication';

export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, isAuthReady } = useApp();
  const location = useLocation();

  if (!isAuthReady) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 px-4 py-16 bg-transparent">
        <EveryKrAnimatedLogo variant="compact" imgClassName="h-9 sm:h-11" />
        <Loader2 className="w-6 h-6 animate-spin text-[#1769AA] dark:text-[#19B6A4]" />
        <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
          Verifying EveryKR authentication session...
        </p>
      </div>
    );
  }

  const isAuthenticatedAndVerified =
    Boolean(currentUser) &&
    currentUser?.emailVerified !== false &&
    currentUser?.accountStatus !== 'unverified' &&
    currentUser?.accountStatus !== 'suspended';

  if (!isAuthenticatedAndVerified) {
    const redirectTarget = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?redirect=${redirectTarget}`} replace />;
  }

  return <>{children}</>;
};

export const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, isAuthReady, isServerVerifiedAdmin } = useApp();
  const location = useLocation();

  if (!isAuthReady) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 px-4 py-16 bg-transparent">
        <EveryKrAnimatedLogo variant="compact" imgClassName="h-9 sm:h-11" />
        <Loader2 className="w-6 h-6 animate-spin text-[#1769AA] dark:text-[#19B6A4]" />
        <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
          Verifying administrator security credentials...
        </p>
      </div>
    );
  }

  const isAuthenticatedAndVerified =
    Boolean(currentUser) &&
    currentUser?.emailVerified !== false &&
    currentUser?.accountStatus !== 'unverified' &&
    currentUser?.accountStatus !== 'suspended';

  if (!isAuthenticatedAndVerified) {
    const redirectTarget = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?redirect=${redirectTarget}`} replace />;
  }

  // Strictly enforce BOTH server-verified admin status AND role === 'admin'
  // Never trust a frontend-only role flag
  if (currentUser?.role !== 'admin' || !isServerVerifiedAdmin) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4 py-16 bg-[#F5F7FA] dark:bg-[#0B1523]">
        <div className="max-w-lg w-full bg-white dark:bg-[#10243A] rounded-2xl border border-slate-200 dark:border-slate-800 p-8 text-center shadow-sm space-y-5">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 flex items-center justify-center text-rose-600 dark:text-rose-400 mx-auto">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <div className="space-y-2">
            <div className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
              Restricted Security Zone · HTTP 403
            </div>
            <h1 className="text-2xl font-extrabold text-[#10243A] dark:text-white">
              Administrator Privileges Required
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Your account (<span className="font-mono font-semibold">{currentUser?.email}</span>) is signed in with the{' '}
              <span className="font-bold uppercase">{currentUser?.role}</span> role. Only server-verified EveryKR administrators can access{' '}
              <span className="font-mono">/admin</span>.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link
              to="/dashboard"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-[#10243A] hover:bg-[#1769AA] dark:bg-[#19B6A4] dark:text-[#10243A] rounded-xl transition-colors"
            >
              <span>Go to My Dashboard</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <Link
              to="/"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors"
            >
              <Home className="w-3.5 h-3.5" />
              <span>Return Homepage</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export const ApplicationsAdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, isAuthReady, isServerVerifiedAdmin } = useApp();
  const location = useLocation();
  const [resolvedRole, setResolvedRole] = useState<SmartApplicationAdminRole>(null);
  const [checkingClaims, setCheckingClaims] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (!isAuthReady) return;
    setCheckingClaims(true);
    resolveSmartApplicationAdminRole({
      userRole: currentUser?.role,
      isServerVerifiedAdmin,
    })
      .then((r) => {
        if (!cancelled) {
          setResolvedRole(r);
          setCheckingClaims(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setResolvedRole(null);
          setCheckingClaims(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [isAuthReady, currentUser?.uid, currentUser?.role, isServerVerifiedAdmin]);

  if (!isAuthReady || checkingClaims) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 px-4 py-16 bg-transparent">
        <EveryKrAnimatedLogo variant="compact" imgClassName="h-9 sm:h-11" />
        <Loader2 className="w-6 h-6 animate-spin text-[#2563EB]" />
        <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
          Verifying admissions portal access permissions...
        </p>
      </div>
    );
  }

  const isAuthenticatedAndVerified =
    Boolean(currentUser) &&
    currentUser?.emailVerified !== false &&
    currentUser?.accountStatus !== 'unverified' &&
    currentUser?.accountStatus !== 'suspended';

  if (!isAuthenticatedAndVerified) {
    const redirectTarget = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?redirect=${redirectTarget}`} replace />;
  }

  if (!resolvedRole) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4 py-16 bg-[#F4F8FD] dark:bg-[#081426]">
        <div className="max-w-lg w-full bg-white dark:bg-[#0B172B] rounded-2xl border border-slate-200 dark:border-white/10 p-8 text-center shadow-sm space-y-5">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 flex items-center justify-center text-rose-600 dark:text-rose-400 mx-auto">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-extrabold text-[#081426] dark:text-white">
              Admissions Staff Access Required
            </h1>
            <p className="text-xs sm:text-sm text-[#526685] dark:text-[#B8C9E5] leading-relaxed">
              This view is restricted to accounts with <span className="font-mono">admin</span>,{' '}
              <span className="font-mono">counsellor</span>, or{' '}
              <span className="font-mono">viewer</span> permissions.
            </p>
          </div>
          <div className="flex justify-center gap-3">
            <Link
              to="/my-applications"
              className="px-4 py-2 rounded-xl text-xs font-bold bg-[#2563EB] text-white"
            >
              My Applications
            </Link>
            <Link
              to="/"
              className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-white/15 text-[#081426] dark:text-white"
            >
              Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
