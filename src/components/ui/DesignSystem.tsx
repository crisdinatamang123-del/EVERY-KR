import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  backTo?: string;
  backLabel?: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  eyebrow,
  backTo,
  backLabel = 'Back',
  icon,
  actions,
  className = '',
}) => {
  return (
    <div className={`space-y-4 ${className}`}>
      {backTo && (
        <div>
          <Link
            to={backTo}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-[#B8C9E5] hover:text-[#0754B8] dark:hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0875E8] rounded-md"
          >
            <ArrowLeft className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>{backLabel}</span>
          </Link>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="flex items-start gap-3.5 min-w-0">
          {icon && (
            <div className="w-11 h-11 rounded-xl bg-[#0754B8]/10 dark:bg-[#0875E8]/20 border border-[#0754B8]/15 dark:border-[#60A5FA]/20 text-[#0754B8] dark:text-[#60A5FA] flex items-center justify-center shrink-0">
              {icon}
            </div>
          )}
          <div className="min-w-0">
            {eyebrow && (
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#0754B8] dark:text-[#60A5FA] mb-1">
                {eyebrow}
              </p>
            )}
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#061B49] dark:text-white text-balance">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-1.5 text-sm sm:text-[15px] text-slate-600 dark:text-[#B8C9E5] max-w-2xl leading-relaxed">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {actions && <div className="flex items-center gap-2.5 shrink-0">{actions}</div>}
      </div>
    </div>
  );
};

export interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className = '',
}) => (
  <div
    className={`ekr-glass-panel rounded-2xl p-10 text-center flex flex-col items-center justify-center ${className}`}
  >
    <div className="w-12 h-12 rounded-xl bg-[#F5F8FD] dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-500 dark:text-[#8FA8CF] flex items-center justify-center mb-3.5">
      {icon}
    </div>
    <h3 className="text-base font-bold text-[#061B49] dark:text-white">{title}</h3>
    {description && (
      <p className="mt-1.5 text-sm text-slate-600 dark:text-[#B8C9E5] max-w-md">{description}</p>
    )}
    {action && <div className="mt-5">{action}</div>}
  </div>
);

export const SectionEyebrow: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => (
  <p
    className={`text-[11px] font-bold uppercase tracking-[0.16em] text-[#0754B8] dark:text-[#60A5FA] ${className}`}
  >
    {children}
  </p>
);
