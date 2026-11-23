import React, {
  useEffect,
  useRef,
  useState,
  useId,
  forwardRef,
  useImperativeHandle,
  useCallback
} from 'react';
import { ShieldAlert, ShieldCheck, Loader2 } from 'lucide-react';
import firebaseAppletConfig from '../../../firebase-applet-config.json';
import { useApp } from '../../context/AppContext';

export interface RecaptchaCheckboxHandle {
  reset: () => void;
  getToken: () => string;
}

interface RecaptchaCheckboxProps {
  onTokenChange: (token: string) => void;
  errorMessage?: string | null;
  resetSignal?: number;
  compact?: boolean;
  align?: 'start' | 'center';
  idPrefix?: string;
}

interface PublicRecaptchaRuntimeConfig {
  configured: boolean;
  keyType: 'v2_checkbox' | 'enterprise';
  siteKey: string;
  v2CheckboxEligible: boolean;
  status: 'ready' | 'missing_site_key' | 'missing_server_secret' | 'key_type_conflict';
}

interface GrecaptchaV2Api {
  render: (
    container: HTMLElement,
    parameters: {
      sitekey: string;
      theme?: 'light' | 'dark';
      size?: 'normal' | 'compact';
      callback?: (token: string) => void;
      'expired-callback'?: () => void;
      'error-callback'?: () => void;
    }
  ) => number;
  reset: (widgetId?: number) => void;
  getResponse: (widgetId?: number) => string;
}

declare global {
  interface Window {
    grecaptcha?: GrecaptchaV2Api & {
      ready?: (cb: () => void) => void;
      enterprise?: unknown;
    };
    __everykrRecaptchaOnLoad?: () => void;
  }
}

const viteEnv = (typeof import.meta !== 'undefined' && (import.meta as any).env) || {};

function cleanPublicKey(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  return raw.trim().replace(/^["']+|["']+$/g, '').trim();
}

const BUILD_SITE_KEY =
  cleanPublicKey(viteEnv.VITE_RECAPTCHA_SITE_KEY) ||
  cleanPublicKey((firebaseAppletConfig as { recaptchaSiteKey?: string }).recaptchaSiteKey);

const BUILD_KEY_TYPE: 'v2_checkbox' | 'enterprise' =
  cleanPublicKey(viteEnv.VITE_RECAPTCHA_KEY_TYPE).toLowerCase() === 'enterprise'
    ? 'enterprise'
    : 'v2_checkbox';

let cachedRuntimeConfig: PublicRecaptchaRuntimeConfig | null = null;
let runtimeConfigPromise: Promise<PublicRecaptchaRuntimeConfig | null> | null = null;
let recaptchaScriptPromise: Promise<GrecaptchaV2Api> | null = null;

function fetchPublicRecaptchaRuntimeConfig(): Promise<PublicRecaptchaRuntimeConfig | null> {
  if (cachedRuntimeConfig) {
    return Promise.resolve(cachedRuntimeConfig);
  }
  if (runtimeConfigPromise) {
    return runtimeConfigPromise;
  }
  if (typeof window === 'undefined' || typeof fetch !== 'function') {
    return Promise.resolve(null);
  }

  runtimeConfigPromise = fetch('/api/security/recaptcha-config', {
    method: 'GET',
    headers: { Accept: 'application/json' },
    cache: 'no-store'
  })
    .then(async (res) => {
      if (!res.ok) return null;
      const data = await res.json().catch(() => null);
      if (!data || typeof data !== 'object') return null;
      const resolved: PublicRecaptchaRuntimeConfig = {
        configured: Boolean(data.configured),
        keyType: data.keyType === 'enterprise' ? 'enterprise' : 'v2_checkbox',
        siteKey: cleanPublicKey(data.siteKey),
        v2CheckboxEligible: Boolean(data.v2CheckboxEligible),
        status: data.status || 'missing_site_key'
      };
      cachedRuntimeConfig = resolved;
      return resolved;
    })
    .catch(() => null)
    .finally(() => {
      runtimeConfigPromise = null;
    });

  return runtimeConfigPromise;
}

/**
 * Loads ONLY the standard Google reCAPTCHA v2 script (`https://www.google.com/recaptcha/api.js`).
 * Never mixes `enterprise.js` with standard v2 Checkbox widgets.
 */
function loadStandardRecaptchaV2Script(hl: string): Promise<GrecaptchaV2Api> {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return Promise.reject(new Error('Browser environment required for reCAPTCHA widget.'));
  }

  if (window.grecaptcha && typeof window.grecaptcha.render === 'function') {
    return Promise.resolve(window.grecaptcha);
  }

  if (recaptchaScriptPromise) {
    return recaptchaScriptPromise;
  }

  recaptchaScriptPromise = new Promise<GrecaptchaV2Api>((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      recaptchaScriptPromise = null;
      reject(new Error('Timed out loading Google reCAPTCHA v2 script.'));
    }, 12000);

    window.__everykrRecaptchaOnLoad = () => {
      window.clearTimeout(timeoutId);
      if (window.grecaptcha && typeof window.grecaptcha.render === 'function') {
        resolve(window.grecaptcha);
      } else {
        recaptchaScriptPromise = null;
        reject(new Error('Google reCAPTCHA v2 API initialized without render method.'));
      }
    };

    const existingScript = document.getElementById(
      'everykr-google-recaptcha-v2-script'
    ) as HTMLScriptElement | null;

    if (!existingScript) {
      const script = document.createElement('script');
      script.id = 'everykr-google-recaptcha-v2-script';
      script.src = `https://www.google.com/recaptcha/api.js?onload=__everykrRecaptchaOnLoad&render=explicit&hl=${encodeURIComponent(
        hl || 'en'
      )}`;
      script.async = true;
      script.defer = true;
      script.onerror = () => {
        window.clearTimeout(timeoutId);
        recaptchaScriptPromise = null;
        reject(new Error('Failed to load Google reCAPTCHA v2 script.'));
      };
      document.head.appendChild(script);
    }
  });

  return recaptchaScriptPromise;
}

export const RecaptchaCheckbox = forwardRef<RecaptchaCheckboxHandle, RecaptchaCheckboxProps>(
  (
    {
      onTokenChange,
      errorMessage,
      resetSignal = 0,
      compact = false,
      align = 'start',
      idPrefix = 'everykr-recaptcha'
    },
    ref
  ) => {
    const { theme, language, t } = useApp();
    const reactId = useId();
    const groupLabelId = `${idPrefix}-label-${reactId}`;
    const statusDescId = `${idPrefix}-desc-${reactId}`;

    const widgetHostRef = useRef<HTMLDivElement | null>(null);
    const widgetIdRef = useRef<number | null>(null);
    const currentTokenRef = useRef<string>('');
    const onTokenChangeRef = useRef(onTokenChange);
    onTokenChangeRef.current = onTokenChange;

    const [runtimeCfg, setRuntimeCfg] = useState<PublicRecaptchaRuntimeConfig | null>(
      () => cachedRuntimeConfig
    );
    const [isCheckingConfig, setIsCheckingConfig] = useState<boolean>(
      () => !cachedRuntimeConfig && !BUILD_SITE_KEY
    );
    const [widgetState, setWidgetState] = useState<
      'loading' | 'ready' | 'verified' | 'expired' | 'script_error' | 'unconfigured' | 'enterprise_mismatch'
    >(() => (BUILD_SITE_KEY && BUILD_KEY_TYPE === 'v2_checkbox' ? 'loading' : 'unconfigured'));

    const effectiveKeyType = runtimeCfg?.keyType || BUILD_KEY_TYPE;
    const effectiveSiteKey =
      effectiveKeyType === 'v2_checkbox'
        ? runtimeCfg?.siteKey || BUILD_SITE_KEY
        : '';

    const resetWidget = useCallback(() => {
      currentTokenRef.current = '';
      onTokenChangeRef.current('');
      if (
        widgetIdRef.current !== null &&
        typeof window !== 'undefined' &&
        window.grecaptcha &&
        typeof window.grecaptcha.reset === 'function'
      ) {
        try {
          window.grecaptcha.reset(widgetIdRef.current);
          setWidgetState('ready');
        } catch {
          // Ignore reset errors if iframe was detached
        }
      }
    }, []);

    useImperativeHandle(
      ref,
      () => ({
        reset: resetWidget,
        getToken: () => currentTokenRef.current
      }),
      [resetWidget]
    );

    // Fetch public runtime config once so server-supplied RECAPTCHA_SITE_KEY and keyType are respected
    useEffect(() => {
      let active = true;
      fetchPublicRecaptchaRuntimeConfig().then((cfg) => {
        if (!active) return;
        if (cfg) {
          setRuntimeCfg(cfg);
        }
        setIsCheckingConfig(false);
      });
      return () => {
        active = false;
      };
    }, []);

    // Reset widget whenever parent increments resetSignal (e.g. after form submission or auth failure)
    useEffect(() => {
      if (resetSignal > 0) {
        resetWidget();
      }
    }, [resetSignal, resetWidget]);

    // Render standard Google reCAPTCHA v2 Checkbox ONLY when registered keyType === 'v2_checkbox'
    useEffect(() => {
      if (effectiveKeyType !== 'v2_checkbox') {
        currentTokenRef.current = '';
        onTokenChangeRef.current('');
        setWidgetState('enterprise_mismatch');
        return;
      }

      if (!effectiveSiteKey) {
        if (!isCheckingConfig) {
          currentTokenRef.current = '';
          onTokenChangeRef.current('');
          setWidgetState('unconfigured');
        }
        return;
      }

      let cancelled = false;
      setWidgetState('loading');
      currentTokenRef.current = '';
      onTokenChangeRef.current('');

      loadStandardRecaptchaV2Script(language)
        .then((grecaptcha) => {
          if (cancelled || !widgetHostRef.current) return;

          // Recreate clean mount node when theme or compact size changes because Google v2 widgets are immutable once rendered
          widgetHostRef.current.innerHTML = '';
          const mountEl = document.createElement('div');
          widgetHostRef.current.appendChild(mountEl);

          const widgetId = grecaptcha.render(mountEl, {
            sitekey: effectiveSiteKey,
            theme: theme === 'dark' ? 'dark' : 'light',
            size: compact ? 'compact' : 'normal',
            callback: (token: string) => {
              if (cancelled) return;
              const clean = typeof token === 'string' ? token.trim() : '';
              currentTokenRef.current = clean;
              setWidgetState(clean ? 'verified' : 'ready');
              onTokenChangeRef.current(clean);
            },
            'expired-callback': () => {
              if (cancelled) return;
              currentTokenRef.current = '';
              setWidgetState('expired');
              onTokenChangeRef.current('');
            },
            'error-callback': () => {
              if (cancelled) return;
              currentTokenRef.current = '';
              setWidgetState('script_error');
              onTokenChangeRef.current('');
            }
          });

          widgetIdRef.current = widgetId;
          setWidgetState('ready');
        })
        .catch(() => {
          if (cancelled) return;
          currentTokenRef.current = '';
          onTokenChangeRef.current('');
          setWidgetState('script_error');
        });

      return () => {
        cancelled = true;
        widgetIdRef.current = null;
      };
    }, [effectiveKeyType, effectiveSiteKey, isCheckingConfig, theme, compact, language]);

    const alignmentClasses =
      align === 'center' ? 'flex flex-col items-center text-center' : 'flex flex-col items-start text-start';

    const resolvedInlineStatus = (() => {
      if (errorMessage) return errorMessage;
      if (widgetState === 'expired') return t('recaptcha_expired_error');
      if (widgetState === 'script_error') return t('recaptcha_load_error');
      return null;
    })();

    return (
      <div
        role="group"
        aria-labelledby={groupLabelId}
        aria-describedby={statusDescId}
        data-recaptcha-widget="v2-checkbox"
        data-recaptcha-state={widgetState}
        className={`w-full space-y-1.5 ${alignmentClasses}`}
      >
        <div
          id={groupLabelId}
          className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 dark:text-slate-300"
        >
          <ShieldCheck className="w-3.5 h-3.5 text-[#1769AA] dark:text-[#19B6A4] shrink-0" />
          <span>{t('recaptcha_label')}</span>
        </div>

        {/* Standard v2 Checkbox Container */}
        {effectiveKeyType === 'v2_checkbox' && effectiveSiteKey ? (
          <div className="relative min-h-[78px] flex items-center">
            {widgetState === 'loading' && (
              <div className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/70 text-xs text-slate-500 dark:text-slate-400">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#1769AA] dark:text-[#19B6A4]" />
                <span>Loading Google reCAPTCHA...</span>
              </div>
            )}
            <div
              ref={widgetHostRef}
              className={widgetState === 'loading' ? 'sr-only' : 'overflow-x-auto max-w-full'}
            />
          </div>
        ) : isCheckingConfig ? (
          <div className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/70 text-xs text-slate-500 dark:text-slate-400">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#1769AA] dark:text-[#19B6A4]" />
            <span>Initializing security verification...</span>
          </div>
        ) : widgetState === 'enterprise_mismatch' ? (
          <div className="w-full px-3.5 py-2.5 rounded-xl border border-amber-200 dark:border-amber-800/70 bg-amber-50/90 dark:bg-amber-950/40 text-[11px] text-amber-900 dark:text-amber-200 leading-relaxed flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <span>
              reCAPTCHA Enterprise key mode detected. Standard v2 Checkbox rendering is disabled so SiteVerify and Enterprise CreateAssessment are never mixed.
            </span>
          </div>
        ) : (
          <div className="w-full px-3.5 py-2.5 rounded-xl border border-amber-200 dark:border-amber-800/70 bg-amber-50/90 dark:bg-amber-950/40 text-[11px] text-amber-900 dark:text-amber-200 leading-relaxed flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <span>{t('recaptcha_unconfigured_notice')}</span>
          </div>
        )}

        {/* Accessible Live Status / Validation Error */}
        <div id={statusDescId} aria-live="polite" className="w-full">
          {resolvedInlineStatus && (
            <div
              role="alert"
              className="mt-1 inline-flex items-start gap-1.5 text-[11px] font-medium text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800/60 px-3 py-1.5 rounded-lg text-start"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <span>{resolvedInlineStatus}</span>
            </div>
          )}
        </div>
      </div>
    );
  }
);

RecaptchaCheckbox.displayName = 'RecaptchaCheckbox';
