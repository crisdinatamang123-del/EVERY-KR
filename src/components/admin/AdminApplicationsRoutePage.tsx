/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Protected standalone `/admin/applications` route wrapper supporting Firebase Auth custom claims
 * (`admin`, `counsellor`, `viewer`) as well as existing verified EVERYKR administrators.
 */

import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, ShieldAlert, ShieldCheck } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { resolveSmartApplicationAdminRole } from '../../services/smartApplicationService';
import { AdminSmartApplicationsPanel } from './AdminSmartApplicationsPanel';
import type { SmartApplicationAdminRole } from '../../types/smartApplication';

export const AdminApplicationsRoutePage: React.FC = () => {
  const { applicationId } = useParams<{ applicationId?: string }>();
  const { currentUser, isServerVerifiedAdmin, isAuthReady } = useApp();
  const [role, setRole] = useState<SmartApplicationAdminRole>(null);
  const [resolvingRole, setResolvingRole] = useState(true);

  useEffect(() => {
    let active = true;
    if (!isAuthReady) return;
    setResolvingRole(true);
    resolveSmartApplicationAdminRole({
      userRole: currentUser?.role,
      isServerVerifiedAdmin,
    })
      .then((resolved) => {
        if (active) {
          setRole(resolved);
          setResolvingRole(false);
        }
      })
      .catch(() => {
        if (active) {
          setRole(null);
          setResolvingRole(false);
        }
      });
    return () => {
      active = false;
    };
  }, [isAuthReady, currentUser?.uid, currentUser?.role, isServerVerifiedAdmin]);

  if (!isAuthReady || resolvingRole) {
    return (
      <section className="min-h-screen bg-[#F4F8FD] dark:bg-[#081426] flex items-center justify-center px-4">
        <div className="flex items-center gap-2.5 text-sm font-bold text-[#526685] dark:text-[#B8C9E5]">
          <Loader2 className="w-5 h-5 animate-spin text-[#2563EB]" />
          <span>Verifying admissions permissions…</span>
        </div>
      </section>
    );
  }

  if (!role) {
    return (
      <section className="min-h-screen bg-[#F4F8FD] dark:bg-[#081426] flex items-center justify-center px-4">
        <div className="max-w-md w-full rounded-2xl border border-rose-200 dark:border-rose-900 bg-white dark:bg-[#0B172B] p-8 text-center space-y-3 shadow-sm">
          <ShieldAlert className="w-10 h-10 text-rose-500 mx-auto" />
          <h1 className="text-lg font-extrabold text-[#081426] dark:text-white">
            Admissions Access Restricted
          </h1>
          <p className="text-xs sm:text-sm text-[#526685] dark:text-[#B8C9E5]">
            This workspace requires an authorized EVERYKR admin, counsellor, or viewer role.
          </p>
          <div className="pt-2">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-[#2563EB] text-white"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Return Home</span>
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="min-h-screen bg-[#F4F8FD] dark:bg-[#081426] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-bold text-[#2563EB] dark:text-[#4BA3FF]">
            <ShieldCheck className="w-4 h-4" />
            <span>EVERYKR Admissions Operations</span>
          </div>
          <div className="flex items-center gap-2">
            {role === 'admin' && (
              <Link
                to="/admin"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-white/15 bg-white dark:bg-[#0B172B] text-[#081426] dark:text-white hover:bg-slate-50"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Full Admin Panel</span>
              </Link>
            )}
          </div>
        </div>

        <AdminSmartApplicationsPanel
          adminRole={role}
          initialApplicationId={applicationId}
          standaloneMode
        />
      </div>
    </section>
  );
};
