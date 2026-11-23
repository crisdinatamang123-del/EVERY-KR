import React, { useState, useEffect, useCallback } from 'react';
import {
  Mail,
  Send,
  Calendar,
  Download,
  Search,
  CheckCircle2,
  Clock,
  UserMinus,
  AlertTriangle,
  RefreshCw,
  Smartphone,
  Monitor,
  Sparkles,
  ShieldCheck,
  FileSpreadsheet,
  FileJson,
  Loader2,
  Eye
} from 'lucide-react';
import { EveryKrAnimatedLogo } from '../common/EveryKrAnimatedLogo';
import {
  FirestoreNewsletterSubscriber,
  FirestoreNewsletterCampaign,
  syncSubscriberToFirestore,
  syncCampaignToFirestore,
  fetchFirestoreSubscribers,
  getAdminRequestHeaders
} from '../../services/firebaseService';

interface AdminNewsletterTabProps {
  adminEmail: string;
  adminName: string;
  showToast: (msg: string) => void;
  onRecordAudit: (actionType: 'CREATE' | 'PUBLISH' | 'EDIT' | 'DELETE', targetId: string, targetName: string, details: string) => void;
}

const EMAIL_TEMPLATES: Record<
  'scholar_briefing' | 'scholarship_alert' | 'visa_update',
  {
    label: string;
    badge: string;
    subject: string;
    preheader: string;
    heading: string;
    bodyHtml: string;
    ctaText: string;
    ctaUrl: string;
  }
> = {
  scholar_briefing: {
    label: 'Monthly Scholar Briefing',
    badge: 'EveryKR Monthly Scholar Briefing',
    subject: 'EveryKR Monthly Briefing: Fall Admissions, GKS Updates & Verified Student Jobs',
    preheader: 'Key deadlines for international students in South Korea this month.',
    heading: 'South Korea International Scholar Briefing',
    bodyHtml: `<p style="margin:0 0 14px;">Hello Scholars,</p>
<p style="margin:0 0 14px;">Here is your curated monthly update from <strong>EveryKR</strong> covering university admissions, legal student employment, and daily living across South Korea:</p>
<ul style="margin:0 0 16px;padding-left:20px;color:#334155;">
  <li style="margin-bottom:8px;"><strong>University Admissions:</strong> SKY &amp; KAIST graduate department application windows and English-track guidelines have been updated in the University Finder.</li>
  <li style="margin-bottom:8px;"><strong>TOPIK &amp; KIIP Registration:</strong> Check upcoming test registration dates early to secure your preferred exam center in Seoul, Busan, or Daejeon.</li>
  <li style="margin-bottom:8px;"><strong>Verified Part-Time Jobs:</strong> 15+ new D-2 compliant campus and bilingual roles added this week (minimum wage ₩10,030/hr verified).</li>
</ul>
<p style="margin:0;">Stay focused on your studies and let EveryKR handle the paperwork.</p>`,
    ctaText: 'Explore EveryKR Portal',
    ctaUrl: 'https://everykr.com'
  },
  scholarship_alert: {
    label: 'GKS & Scholarship Alert',
    badge: 'EveryKR Scholarship & Grant Alert',
    subject: '[Scholarship Alert] GKS Global Korea Scholarship & Tuition Waiver Deadlines',
    preheader: 'Embassy and University track quotas and document checklists inside.',
    heading: 'New Scholarship & Grant Deadlines Open',
    bodyHtml: `<p style="margin:0 0 14px;">Dear Future &amp; Current Korea Scholars,</p>
<p style="margin:0 0 14px;">Applications for major full-tuition and stipend scholarships in South Korea are approaching key submission milestones:</p>
<ul style="margin:0 0 16px;padding-left:20px;color:#334155;">
  <li style="margin-bottom:8px;"><strong>Global Korea Scholarship (GKS):</strong> Full tuition, ₩1,000,000+ monthly stipend, round-trip airfare, and Korean language year coverage.</li>
  <li style="margin-bottom:8px;"><strong>STEM &amp; Brain Korea 21 (BK21) Labs:</strong> Graduate research assistantships at KAIST, POSTECH, SNU, and Yonsei.</li>
  <li style="margin-bottom:8px;"><strong>Merit Tuition Waivers (30%–100%):</strong> Automatic TOPIK Level 4–6 tuition discounts for enrolled D-2 students.</li>
</ul>
<p style="margin:0;">Ensure your apostilled transcripts and study plans are prepared ahead of the deadline.</p>`,
    ctaText: 'View Scholarship Directory',
    ctaUrl: 'https://everykr.com/#universities'
  },
  visa_update: {
    label: 'HiKorea Visa & Regulatory Notice',
    badge: 'EveryKR Immigration & Visa Advisory',
    subject: '[Visa Advisory] D-2 Part-Time Work Permit (시간제취업) & ARC Renewal Checklist',
    preheader: 'Important Ministry of Justice compliance rules for international students.',
    heading: 'HiKorea Immigration & Student Visa Update',
    bodyHtml: `<p style="margin:0 0 14px;">Important Immigration Compliance Notice for D-2 &amp; D-4 Visa Holders:</p>
<p style="margin:0 0 14px;">Please review the latest statutory guidelines from the Korea Immigration Service (HiKorea) to keep your legal stay in good standing:</p>
<ul style="margin:0 0 16px;padding-left:20px;color:#334155;">
  <li style="margin-bottom:8px;"><strong>Mandatory Part-Time Work Permission:</strong> Always obtain electronic HiKorea approval <em>before</em> starting any part-time employment or paid internship.</li>
  <li style="margin-bottom:8px;"><strong>Address Change Reporting:</strong> Moving to a new dormitory, Gositel, or One-room requires reporting within <strong>14 days</strong> at your local Gu/Si office or online.</li>
  <li style="margin-bottom:8px;"><strong>NHIS Health Insurance:</strong> Automatic monthly billing occurs on the 25th; keep your Korean bank account funded to avoid visa extension holds.</li>
</ul>`,
    ctaText: 'Open D-2 / D-10 Visa Guide',
    ctaUrl: 'https://everykr.com/#visa'
  }
};

export const AdminNewsletterTab: React.FC<AdminNewsletterTabProps> = ({
  adminEmail,
  adminName,
  showToast,
  onRecordAudit
}) => {
  const [subView, setSubView] = useState<'subscribers' | 'composer' | 'campaigns'>('subscribers');
  const [isLoading, setIsLoading] = useState(true);

  // Overview state from backend + Firestore
  const [providerStatus, setProviderStatus] = useState<{
    providerConfigured: boolean;
    activeProvider: string;
    fromName: string;
    fromEmail: string;
    replyTo: string;
  }>({
    providerConfigured: false,
    activeProvider: 'smtp_ethereal_relay',
    fromName: 'EVERYKR',
    fromEmail: 'newsletter@everykr.com',
    replyTo: 'support@everykr.com'
  });
  const [retryingEmail, setRetryingEmail] = useState<string | null>(null);

  const [subscribers, setSubscribers] = useState<FirestoreNewsletterSubscriber[]>([]);
  const [campaigns, setCampaigns] = useState<FirestoreNewsletterCampaign[]>([]);
  const [suppressionList, setSuppressionList] = useState<string[]>([]);
  const [recentLogs, setRecentLogs] = useState<any[]>([]);

  // Subscriber filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'pending_verification' | 'unsubscribed'>('all');

  // Campaign Composer state
  const [templateId, setTemplateId] = useState<'scholar_briefing' | 'scholarship_alert' | 'visa_update'>('scholar_briefing');
  const [subject, setSubject] = useState(EMAIL_TEMPLATES.scholar_briefing.subject);
  const [preheader, setPreheader] = useState(EMAIL_TEMPLATES.scholar_briefing.preheader);
  const [heading, setHeading] = useState(EMAIL_TEMPLATES.scholar_briefing.heading);
  const [bodyHtml, setBodyHtml] = useState(EMAIL_TEMPLATES.scholar_briefing.bodyHtml);
  const [ctaText, setCtaText] = useState(EMAIL_TEMPLATES.scholar_briefing.ctaText);
  const [ctaUrl, setCtaUrl] = useState(EMAIL_TEMPLATES.scholar_briefing.ctaUrl);
  const [targetTopic, setTargetTopic] = useState('All Subscribers');
  const [scheduledFor, setScheduledFor] = useState('');
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');

  // Test email state
  const [testEmailAddress, setTestEmailAddress] = useState(adminEmail || 'admin@everykr.com');
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [isDispatchingCampaign, setIsDispatchingCampaign] = useState(false);

  const loadNewsletterOverview = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/newsletter/admin/overview', {
        headers: {
          ...getAdminRequestHeaders({ email: adminEmail || 'admin@everykr.com', name: adminName })
        }
      });
      const data = await response.json();
      if (response.ok && data.ok) {
        setProviderStatus(data.provider);
        setCampaigns(data.campaigns || []);
        setSuppressionList(data.suppressionList || []);
        setRecentLogs(data.recentDeliveryLogs || []);

        // Merge server subscribers with any Firestore subscribers
        const serverSubs: FirestoreNewsletterSubscriber[] = data.subscribers || [];
        const firestoreSubs = await fetchFirestoreSubscribers();
        const mergedMap = new Map<string, FirestoreNewsletterSubscriber>();
        for (const s of firestoreSubs) {
          mergedMap.set(s.email.toLowerCase(), s);
        }
        for (const s of serverSubs) {
          mergedMap.set(s.email.toLowerCase(), s);
        }
        setSubscribers(
          Array.from(mergedMap.values()).sort(
            (a, b) => new Date(b.subscribedAt).getTime() - new Date(a.subscribedAt).getTime()
          )
        );
      }
    } catch (err) {
      console.error('Failed to load newsletter overview:', err);
    } finally {
      setIsLoading(false);
    }
  }, [adminEmail]);

  useEffect(() => {
    loadNewsletterOverview();
  }, [loadNewsletterOverview]);

  const handleSelectTemplate = (tplKey: 'scholar_briefing' | 'scholarship_alert' | 'visa_update') => {
    setTemplateId(tplKey);
    const tpl = EMAIL_TEMPLATES[tplKey];
    setSubject(tpl.subject);
    setPreheader(tpl.preheader);
    setHeading(tpl.heading);
    setBodyHtml(tpl.bodyHtml);
    setCtaText(tpl.ctaText);
    setCtaUrl(tpl.ctaUrl);
  };

  // Filtered subscribers
  const filteredSubscribers = subscribers.filter(sub => {
    const matchesStatus = statusFilter === 'all' || sub.status === statusFilter;
    const q = searchQuery.trim().toLowerCase();
    const matchesQuery =
      !q ||
      sub.email.toLowerCase().includes(q) ||
      (sub.topics || []).some(t => t.toLowerCase().includes(q)) ||
      (sub.source || '').toLowerCase().includes(q);
    return matchesStatus && matchesQuery;
  });

  // Export CSV
  const handleExportCsv = () => {
    const headers = [
      'ID',
      'Email',
      'Status',
      'Verified',
      'ConsentGiven',
      'SubscribedAt',
      'VerifiedAt',
      'UnsubscribedAt',
      'LastDeliveryStatus',
      'LastDeliveryProvider',
      'LastEmailSentAt',
      'LastDeliveryError',
      'Topics'
    ];
    const rows = filteredSubscribers.map(s => [
      s.id,
      s.email,
      s.status,
      String(s.verified),
      String(s.consentGiven),
      s.subscribedAt,
      s.verifiedAt || '',
      s.unsubscribedAt || '',
      s.lastDeliveryStatus || '',
      s.lastDeliveryProvider || '',
      s.lastEmailSentAt || '',
      s.lastDeliveryError || '',
      (s.topics || []).join('; ')
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map(r => r.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `everykr-subscribers-${statusFilter}-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    showToast(`Exported ${filteredSubscribers.length} subscribers to CSV`);
  };

  // Admin Retry Welcome Email
  const handleRetryWelcomeEmail = async (email: string) => {
    setRetryingEmail(email);
    try {
      const response = await fetch('/api/newsletter/admin/retry-welcome', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAdminRequestHeaders({ email: adminEmail || 'admin@everykr.com', name: adminName })
        },
        body: JSON.stringify({ email })
      });
      const data = await response.json();
      if (data.subscriber) {
        await syncSubscriberToFirestore(data.subscriber);
      }
      showToast(data.message || `Welcome email retry processed for ${email}`);
      await loadNewsletterOverview();
    } catch {
      showToast('Failed to retry welcome email');
    } finally {
      setRetryingEmail(null);
    }
  };

  // Export JSON
  const handleExportJson = () => {
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(filteredSubscribers, null, 2))}`;
    const link = document.createElement('a');
    link.setAttribute('href', jsonString);
    link.setAttribute('download', `everykr-subscribers-${statusFilter}-${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    showToast(`Exported ${filteredSubscribers.length} subscribers to JSON`);
  };

  // Admin manual unsubscribe / suppress
  const handleAdminUnsubscribe = async (email: string) => {
    try {
      const response = await fetch('/api/newsletter/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          reason: `Unsubscribed by Admin (${adminName})`
        })
      });
      const data = await response.json();
      if (response.ok && data.ok) {
        if (data.subscriber) {
          await syncSubscriberToFirestore(data.subscriber);
        }
        showToast(`${email} unsubscribed and added to suppression list`);
        onRecordAudit('EDIT', email, email, 'Unsubscribed user and added to newsletter suppression list');
        await loadNewsletterOverview();
      }
    } catch {
      showToast('Failed to unsubscribe address');
    }
  };

  // Send Test Email
  const handleSendTestEmail = async () => {
    if (!testEmailAddress || !testEmailAddress.includes('@')) {
      showToast('Enter a valid recipient email for the test briefing');
      return;
    }
    setIsSendingTest(true);
    try {
      const response = await fetch('/api/newsletter/admin/test-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAdminRequestHeaders({ email: adminEmail || 'admin@everykr.com', name: adminName })
        },
        body: JSON.stringify({
          toEmail: testEmailAddress,
          subject,
          preheader,
          heading,
          bodyHtml,
          ctaText,
          ctaUrl
        })
      });
      const data = await response.json();
      showToast(data.message || 'Test email processed');
      await loadNewsletterOverview();
    } catch {
      showToast('Failed to send test email');
    } finally {
      setIsSendingTest(false);
    }
  };

  // Create / Schedule / Send Campaign
  const handleDispatchCampaign = async (action: 'send_now' | 'schedule') => {
    if (!subject.trim() || !heading.trim() || !bodyHtml.trim()) {
      showToast('Subject, heading, and email HTML body are required');
      return;
    }
    if (action === 'schedule' && !scheduledFor) {
      showToast('Please select a scheduled date and time first');
      return;
    }

    setIsDispatchingCampaign(true);
    try {
      const response = await fetch('/api/newsletter/admin/campaigns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAdminRequestHeaders({ email: adminEmail || 'admin@everykr.com', name: adminName })
        },
        body: JSON.stringify({
          subject,
          preheader,
          templateId,
          heading,
          bodyHtml,
          ctaText,
          ctaUrl,
          targetTopic,
          action,
          scheduledFor: action === 'schedule' ? scheduledFor : undefined,
          createdBy: adminName || adminEmail || 'EveryKR Admin'
        })
      });
      const data = await response.json();
      if (response.ok && data.ok) {
        if (data.campaign) {
          await syncCampaignToFirestore(data.campaign);
        }
        showToast(data.message);
        onRecordAudit(
          action === 'schedule' ? 'CREATE' : 'PUBLISH',
          data.campaign?.id || 'campaign',
          subject,
          data.message
        );
        await loadNewsletterOverview();
        setSubView('campaigns');
      } else {
        showToast(data.message || 'Campaign action failed');
      }
    } catch {
      showToast('Error dispatching newsletter campaign');
    } finally {
      setIsDispatchingCampaign(false);
    }
  };

  const activeVerifiedCount = subscribers.filter(s => s.status === 'active' && s.verified).length;
  const pendingCount = subscribers.filter(s => s.status === 'pending_verification').length;
  const unsubscribedCount = subscribers.filter(s => s.status === 'unsubscribed' || s.status === 'suppressed').length;

  return (
    <div className="space-y-6">
      {/* Top KPI & Provider Status Banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-[#10243A] text-[#19B6A4]">
                <ShieldCheck className="w-3.5 h-3.5" />
                ADMIN-ONLY NEWSLETTER COMMAND CENTER
              </span>
              <span
                className={`text-[11px] font-bold px-2.5 py-0.5 rounded-md ${
                  providerStatus.providerConfigured
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {providerStatus.providerConfigured
                  ? `Live Provider Active (${providerStatus.activeProvider.toUpperCase()})`
                  : 'Provider API Key Pending (Queue & Preview Mode)'}
              </span>
            </div>
            <h2 className="text-lg font-bold text-[#10243A] mt-2">
              EveryKR Newsletter Subscribers, Campaigns &amp; Suppression Engine
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Sender Identity: <strong className="text-slate-700">{providerStatus.fromName} &lt;{providerStatus.fromEmail}&gt;</strong> · Reply-To:{' '}
              <span className="font-mono">{providerStatus.replyTo}</span> · Firestore Sync: <span className="font-mono text-emerald-700">everykr</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setSubView('subscribers')}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                subView === 'subscribers'
                  ? 'bg-[#10243A] text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Subscribers ({subscribers.length})
            </button>
            <button
              type="button"
              onClick={() => setSubView('composer')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                subView === 'composer'
                  ? 'bg-[#19B6A4] text-[#10243A]'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Create &amp; Preview Campaign</span>
            </button>
            <button
              type="button"
              onClick={() => setSubView('campaigns')}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                subView === 'campaigns'
                  ? 'bg-[#10243A] text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Campaign Stats &amp; Logs ({campaigns.length})
            </button>
            <button
              type="button"
              onClick={loadNewsletterOverview}
              className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 cursor-pointer"
              title="Refresh subscriber and campaign metrics"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* 4 Summary Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Active &amp; Verified</div>
            <div className="text-2xl font-black text-emerald-700 mt-1 tabular-nums">{activeVerifiedCount}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Double opt-in confirmed</div>
          </div>
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Pending Opt-In</div>
            <div className="text-2xl font-black text-amber-600 mt-1 tabular-nums">{pendingCount}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Awaiting email confirmation</div>
          </div>
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Unsubscribed / Suppressed</div>
            <div className="text-2xl font-black text-rose-600 mt-1 tabular-nums">{unsubscribedCount}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Blocked from future campaigns</div>
          </div>
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Campaigns Dispatched</div>
            <div className="text-2xl font-black text-[#1769AA] mt-1 tabular-nums">{campaigns.length}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">With exponential backoff retry</div>
          </div>
        </div>

        {/* Honest Resend Provider Diagnostic Notice if API key is not yet set */}
        {!providerStatus.providerConfigured && (
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <strong>Resend API Configuration Required for Live Inbox Delivery:</strong>{' '}
                <code className="font-mono bg-amber-100 px-1 py-0.5 rounded">RESEND_API_KEY</code> is not currently set in server environment variables. Subscriptions, double opt-in tokens, Firestore records, and campaign payloads are fully functional in Queue &amp; Preview Mode. Add your <code className="font-mono">RESEND_API_KEY</code> and verify <code className="font-mono">everykr.com</code> DNS records (SPF/DKIM) in Resend to enable live external email delivery.
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* SUB-VIEW 1: SUBSCRIBERS DIRECTORY, SEARCH, FILTER & EXPORT */}
      {/* ========================================================= */}
      {subView === 'subscribers' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-6 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search subscriber by email, topic, or source..."
                  className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#1769AA]"
                />
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                {(['all', 'active', 'pending_verification', 'unsubscribed'] as const).map(st => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setStatusFilter(st)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize cursor-pointer transition-colors ${
                      statusFilter === st
                        ? 'bg-[#10243A] text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {st.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleExportCsv}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
                <span>Export CSV</span>
              </button>
              <button
                type="button"
                onClick={handleExportJson}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
              >
                <FileJson className="w-3.5 h-3.5 text-[#1769AA]" />
                <span>Export JSON</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider">
                <tr>
                  <th className="p-4">Subscriber Email</th>
                  <th className="p-4">Status &amp; Opt-In</th>
                  <th className="p-4">Email Delivery Status</th>
                  <th className="p-4">Subscribed Date</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSubscribers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400">
                      No subscribers match the current search or filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredSubscribers.map(sub => (
                    <tr key={sub.id} className="hover:bg-slate-50/70">
                      <td className="p-4">
                        <div className="font-bold text-[#10243A] font-mono">{sub.email}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          ID: {sub.id} · Source: {sub.source || 'homepage_newsletter'}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              sub.status === 'active'
                                ? 'bg-emerald-100 text-emerald-800'
                                : sub.status === 'pending_verification'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {sub.status.replace('_', ' ')}
                          </span>
                          {sub.verified && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3" /> Verified
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              sub.lastDeliveryStatus === 'delivered'
                                ? 'bg-emerald-100 text-emerald-800'
                                : sub.lastDeliveryStatus === 'smtp_relay_accepted'
                                ? 'bg-blue-100 text-blue-800'
                                : sub.lastDeliveryStatus === 'failed'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {sub.lastDeliveryStatus || 'recorded'}
                          </span>
                          {sub.lastDeliveryProvider && (
                            <span className="text-[10px] font-mono text-slate-500">
                              ({sub.lastDeliveryProvider})
                            </span>
                          )}
                          {sub.lastPreviewUrl && (
                            <a
                              href={sub.lastPreviewUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[10px] font-bold text-[#1769AA] underline"
                            >
                              Preview Email ↗
                            </a>
                          )}
                        </div>
                        {sub.lastDeliveryError && (
                          <div className="text-[10px] text-amber-700 mt-1 max-w-xs truncate" title={sub.lastDeliveryError}>
                            {sub.lastDeliveryError}
                          </div>
                        )}
                      </td>
                      <td className="p-4 font-mono text-[11px] text-slate-500">
                        <div>{new Date(sub.subscribedAt).toLocaleDateString()}</div>
                        {sub.lastEmailSentAt && (
                          <div className="text-[10px] text-emerald-600">
                            Last email: {new Date(sub.lastEmailSentAt).toLocaleDateString()}
                          </div>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          {sub.status === 'active' && (
                            <button
                              type="button"
                              disabled={retryingEmail === sub.email}
                              onClick={() => handleRetryWelcomeEmail(sub.email)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold text-[#1769AA] hover:bg-blue-50 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                            >
                              {retryingEmail === sub.email ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Mail className="w-3.5 h-3.5" />
                              )}
                              <span>Resend Welcome</span>
                            </button>
                          )}
                          {sub.status !== 'unsubscribed' ? (
                            <button
                              type="button"
                              onClick={() => handleAdminUnsubscribe(sub.email)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <UserMinus className="w-3.5 h-3.5" />
                              <span>Unsubscribe</span>
                            </button>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">On Suppression List</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SUB-VIEW 2: CAMPAIGN COMPOSER, TEMPLATES & LIVE PREVIEW   */}
      {/* ========================================================= */}
      {subView === 'composer' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Campaign Form & Controls */}
          <div className="lg:col-span-6 bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-5">
            <div>
              <h3 className="text-base font-bold text-[#10243A]">Compose EveryKR Newsletter Campaign</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Select a branded template, customize content, send a test email, or schedule/send to verified subscribers.
              </p>
            </div>

            {/* Template Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">1. Select EveryKR Email Template</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {(['scholar_briefing', 'scholarship_alert', 'visa_update'] as const).map(key => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleSelectTemplate(key)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      templateId === key
                        ? 'border-[#1769AA] bg-blue-50/60 text-[#10243A]'
                        : 'border-slate-200 hover:border-slate-300 text-slate-600'
                    }`}
                  >
                    <div className="text-xs font-bold">{EMAIL_TEMPLATES[key].label}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">Responsive HTML + Unsubscribe</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Target Segment & Subject */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Target Audience Segment</label>
                <select
                  value={targetTopic}
                  onChange={e => setTargetTopic(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#1769AA]"
                >
                  <option value="All Subscribers">All Active Verified Subscribers ({activeVerifiedCount})</option>
                  <option value="Admissions & Scholarships">Admissions &amp; Scholarships</option>
                  <option value="Visa & Immigration">Visa &amp; Immigration</option>
                  <option value="Student Jobs & Housing">Student Jobs &amp; Housing</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Preheader Preview Text</label>
                <input
                  type="text"
                  value={preheader}
                  onChange={e => setPreheader(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#1769AA]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Email Subject Line</label>
              <input
                type="text"
                value={subject}
                onChange={e => setSubject(e.target.value)}
                className="w-full px-3.5 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#1769AA]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Hero Heading</label>
              <input
                type="text"
                value={heading}
                onChange={e => setHeading(e.target.value)}
                className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#1769AA]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Newsletter Body (HTML Supported)</label>
              <textarea
                rows={7}
                value={bodyHtml}
                onChange={e => setBodyHtml(e.target.value)}
                className="w-full p-3 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#1769AA]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Primary CTA Button Label</label>
                <input
                  type="text"
                  value={ctaText}
                  onChange={e => setCtaText(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Primary CTA Destination URL</label>
                <input
                  type="url"
                  value={ctaUrl}
                  onChange={e => setCtaUrl(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>
            </div>

            {/* Test Email Dispatch Box */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
              <label className="block text-xs font-bold text-[#10243A]">Send Test Email Before Publishing</label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="email"
                  value={testEmailAddress}
                  onChange={e => setTestEmailAddress(e.target.value)}
                  placeholder="Enter test recipient email..."
                  className="flex-1 px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg"
                />
                <button
                  type="button"
                  disabled={isSendingTest}
                  onClick={handleSendTestEmail}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold text-[#10243A] bg-white border border-slate-300 hover:bg-slate-100 rounded-lg cursor-pointer disabled:opacity-50"
                >
                  {isSendingTest ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
                  <span>Send Test Email</span>
                </button>
              </div>
            </div>

            {/* Schedule or Send Campaign Actions */}
            <div className="pt-3 border-t border-slate-200 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-1">
                  <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                  <input
                    type="datetime-local"
                    value={scheduledFor}
                    onChange={e => setScheduledFor(e.target.value)}
                    className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg flex-1"
                  />
                  <button
                    type="button"
                    disabled={isDispatchingCampaign}
                    onClick={() => handleDispatchCampaign('schedule')}
                    className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer whitespace-nowrap"
                  >
                    Schedule Campaign
                  </button>
                </div>

                <button
                  type="button"
                  disabled={isDispatchingCampaign}
                  onClick={() => handleDispatchCampaign('send_now')}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-[#10243A] hover:bg-[#1769AA] rounded-xl transition-colors cursor-pointer shadow-sm disabled:opacity-50"
                >
                  {isDispatchingCampaign ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Dispatching...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Send Campaign Now ({activeVerifiedCount})</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Live Responsive Email Preview */}
          <div className="lg:col-span-6 bg-white rounded-xl border border-slate-200 p-6 shadow-xs flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-[#1769AA]" />
                <h3 className="text-sm font-bold text-[#10243A]">Live Responsive Email Preview</h3>
              </div>
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
                <button
                  type="button"
                  onClick={() => setPreviewDevice('desktop')}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold cursor-pointer ${
                    previewDevice === 'desktop' ? 'bg-white text-[#10243A] shadow-2xs' : 'text-slate-500'
                  }`}
                >
                  <Monitor className="w-3.5 h-3.5" />
                  <span>Desktop</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewDevice('mobile')}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold cursor-pointer ${
                    previewDevice === 'mobile' ? 'bg-white text-[#10243A] shadow-2xs' : 'text-slate-500'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Mobile (375px)</span>
                </button>
              </div>
            </div>

            {/* Simulated Email Client Envelope Header */}
            <div className="bg-slate-50 border border-slate-200 rounded-t-xl p-3 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-400">From:</span>
                <span className="font-semibold text-slate-700">
                  {providerStatus.fromName} &lt;{providerStatus.fromEmail}&gt;
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Subject:</span>
                <span className="font-bold text-[#10243A] truncate max-w-xs sm:max-w-md">{subject}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Preheader:</span>
                <span className="text-slate-500 truncate max-w-xs sm:max-w-md">{preheader}</span>
              </div>
            </div>

            {/* Rendered Branded Email Canvas */}
            <div className="flex-1 bg-slate-100 border-x border-b border-slate-200 rounded-b-xl p-4 flex justify-center overflow-y-auto">
              <div
                className={`bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm transition-all ${
                  previewDevice === 'mobile' ? 'w-[360px]' : 'w-full max-w-[580px]'
                }`}
              >
                {/* Branded Navy Header */}
                <div className="bg-linear-to-br from-[#10243A] to-[#172B3A] px-6 py-6 border-b-4 border-[#19B6A4]">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-[#19B6A4]">
                    {EMAIL_TEMPLATES[templateId].badge}
                  </div>
                  <div className="mt-2.5 inline-flex items-center">
                    <EveryKrAnimatedLogo
                      variant="static"
                      isNight={true}
                      imgClassName="h-7 sm:h-8"
                    />
                  </div>
                  <div className="text-xs text-slate-300 mt-1.5">Everything Korea, One Platform · everykr.com</div>
                </div>

                {/* Email Body */}
                <div className="p-6 space-y-4">
                  <h4 className="text-lg font-extrabold text-[#10243A] leading-snug">{heading}</h4>
                  <div
                    className="text-xs text-slate-700 leading-relaxed space-y-2"
                    dangerouslySetInnerHTML={{ __html: bodyHtml }}
                  />
                  {ctaText && ctaUrl && (
                    <div className="pt-2">
                      <span className="inline-block px-5 py-3 bg-[#19B6A4] text-[#10243A] font-extrabold text-xs rounded-xl">
                        {ctaText}
                      </span>
                    </div>
                  )}
                </div>

                {/* Mandatory Unsubscribe Footer */}
                <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 text-[11px] text-slate-500 space-y-1.5">
                  <p className="font-semibold text-slate-600">
                    EveryKR — Official International Student Ecosystem Portal (Seoul, Republic of Korea)
                  </p>
                  <p>
                    You are receiving this email because you opted in at everykr.com. Want to stop receiving updates?{' '}
                    <span className="text-[#1769AA] underline font-semibold">
                      Unsubscribe instantly with 1 click
                    </span>
                    .
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SUB-VIEW 3: CAMPAIGN DELIVERY STATISTICS & AUDIT LOGS     */}
      {/* ========================================================= */}
      {subView === 'campaigns' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-6 border-b border-slate-200">
              <h3 className="text-base font-bold text-[#10243A]">Campaign Delivery &amp; Engagement Statistics</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Tracks targeted subscribers, sent count, confirmed provider deliveries, bounces, failures, and suppressed skips.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="p-4">Campaign Subject</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Segment</th>
                    <th className="p-4 text-center">Targeted</th>
                    <th className="p-4 text-center">Sent</th>
                    <th className="p-4 text-center">Delivered</th>
                    <th className="p-4 text-center">Bounced / Failed</th>
                    <th className="p-4 text-center">Suppressed Skipped</th>
                    <th className="p-4 text-right">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {campaigns.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-slate-400">
                        No campaigns created yet. Use the &ldquo;Create &amp; Preview Campaign&rdquo; tab to send or schedule your first briefing.
                      </td>
                    </tr>
                  ) : (
                    campaigns.map(camp => (
                      <tr key={camp.id} className="hover:bg-slate-50/70">
                        <td className="p-4">
                          <div className="font-bold text-[#10243A]">{camp.subject}</div>
                          <div className="text-[11px] text-slate-400">
                            Created by {camp.createdBy} · Template: {camp.templateId}
                          </div>
                        </td>
                        <td className="p-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              camp.status === 'sent'
                                ? 'bg-emerald-100 text-emerald-800'
                                : camp.status === 'scheduled'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {camp.status}
                          </span>
                          {camp.scheduledFor && (
                            <div className="text-[10px] text-blue-700 font-mono mt-1">
                              For: {new Date(camp.scheduledFor).toLocaleString()}
                            </div>
                          )}
                        </td>
                        <td className="p-4 font-semibold text-slate-600">{camp.targetTopic}</td>
                        <td className="p-4 text-center font-mono font-bold">{camp.stats.totalTargeted}</td>
                        <td className="p-4 text-center font-mono font-bold text-[#1769AA]">{camp.stats.sent}</td>
                        <td className="p-4 text-center font-mono font-bold text-emerald-700">{camp.stats.delivered}</td>
                        <td className="p-4 text-center font-mono font-bold text-rose-600">
                          {camp.stats.bounced + camp.stats.failed}
                        </td>
                        <td className="p-4 text-center font-mono text-slate-500">{camp.stats.suppressedSkipped}</td>
                        <td className="p-4 text-right font-mono text-[11px] text-slate-400">
                          {new Date(camp.sentAt || camp.createdAt).toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Suppression List & Recent Delivery Logs */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-3">
              <h4 className="text-sm font-bold text-[#10243A] flex items-center gap-2">
                <UserMinus className="w-4 h-4 text-rose-600" />
                <span>Active Unsubscribe &amp; Suppression List ({suppressionList.length})</span>
              </h4>
              <p className="text-xs text-slate-500">
                Addresses on this list are automatically excluded from all marketing campaigns.
              </p>
              <div className="max-h-56 overflow-y-auto divide-y divide-slate-100 border border-slate-100 rounded-lg">
                {suppressionList.length === 0 ? (
                  <div className="p-4 text-xs text-slate-400 text-center">No suppressed email addresses.</div>
                ) : (
                  suppressionList.map(email => (
                    <div key={email} className="px-3.5 py-2 text-xs font-mono text-slate-700 flex items-center justify-between">
                      <span>{email}</span>
                      <span className="text-[10px] font-sans font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded">
                        Suppressed
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-3">
              <h4 className="text-sm font-bold text-[#10243A] flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#1769AA]" />
                <span>Recent Transactional &amp; Campaign Delivery Logs ({recentLogs.length})</span>
              </h4>
              <div className="max-h-56 overflow-y-auto divide-y divide-slate-100 border border-slate-100 rounded-lg">
                {recentLogs.length === 0 ? (
                  <div className="p-4 text-xs text-slate-400 text-center">
                    No delivery events recorded yet in this session.
                  </div>
                ) : (
                  recentLogs.map((log, idx) => (
                    <div key={idx} className="p-3 text-xs flex items-start justify-between gap-3">
                      <div>
                        <div className="font-bold text-[#10243A]">
                          {log.subject}{' '}
                          <span className="font-mono font-normal text-slate-500">→ {log.to}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          Provider: <span className="font-mono uppercase">{log.provider}</span> · Attempts: {log.attempts}
                          {log.errorReason ? ` · Note: ${log.errorReason}` : ''}
                        </div>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase shrink-0 ${
                          log.status === 'delivered'
                            ? 'bg-emerald-100 text-emerald-800'
                            : log.status === 'queued_local'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {log.status}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
