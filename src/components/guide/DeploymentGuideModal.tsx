/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { EveryKrAnimatedLogo } from '../common/EveryKrAnimatedLogo';
import {
  X,
  Copy,
  Check,
  Server,
  Cloud,
  Globe,
  Database,
  ExternalLink,
  Terminal,
  Folder,
  FileText,
} from 'lucide-react';

export const DeploymentGuideModal: React.FC = () => {
  const { showDeploymentModal, setShowDeploymentModal, addToast } = useApp();
  const [activeTab, setActiveTab] = useState<'export' | 'supabase' | 'cloudflare' | 'godaddy'>('cloudflare');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!showDeploymentModal) return null;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(label);
    addToast(`Copied ${label} to clipboard`, 'success');
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const sampleSchema = `-- EveryKR Supabase Tables Quick Sample
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT DEFAULT 'student',
  university TEXT,
  visa_type TEXT DEFAULT 'D-2'
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public profiles are viewable by everyone." ON public.profiles FOR SELECT USING (true);`;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/40 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white/95 backdrop-blur-xl rounded-3xl max-w-3xl w-full shadow-[0_24px_60px_-12px_rgba(15,23,42,0.25)] border border-white/60 overflow-hidden flex flex-col max-h-[90vh] ring-1 ring-slate-900/5">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/60 bg-white/50 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <EveryKrAnimatedLogo
              variant="static"
              isNight={false}
              imgClassName="h-8 sm:h-9"
            />
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Production Deployment & Custom Domain Guide
              </h3>
              <p className="text-xs text-slate-500">
                Free hosting on Cloudflare Pages, Supabase DB & GoDaddy DNS setup
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowDeploymentModal(false)}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 px-6 bg-white overflow-x-auto">
          {[
            { id: 'cloudflare', label: '1. Cloudflare Pages (Free)', icon: Cloud },
            { id: 'godaddy', label: '2. GoDaddy Custom Domain', icon: Globe },
            { id: 'supabase', label: '3. Supabase Database', icon: Database },
            { id: 'export', label: '4. Source Code Export', icon: Terminal },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 py-3 px-3 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
                  isActive
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-4 text-sm text-slate-700">
          {activeTab === 'cloudflare' && (
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                <h4 className="font-bold text-blue-900 text-sm mb-1">
                  Why Cloudflare Pages?
                </h4>
                <p className="text-xs text-blue-700 leading-relaxed">
                  Cloudflare Pages offers unlimited bandwidth, 500 builds per month for free, ultra-low latency edge servers across Seoul and worldwide, and automated free SSL certificates for custom domains.
                </p>
              </div>

              <h4 className="font-bold text-slate-900 text-sm">Step-by-step Free Deployment:</h4>
              <ol className="list-decimal pl-5 space-y-2.5 text-xs text-slate-600">
                <li>
                  <strong className="text-slate-800">Push your code to GitHub:</strong> Create a new GitHub repository (e.g. <code className="bg-slate-100 px-1.5 py-0.5 rounded text-blue-600">everykr-platform</code>) and push the exported project.
                </li>
                <li>
                  <strong className="text-slate-800">Log in to Cloudflare:</strong> Go to{' '}
                  <span className="font-medium text-slate-900">dash.cloudflare.com</span> &rarr; Click{' '}
                  <strong>Workers & Pages</strong> &rarr; <strong>Create application</strong> &rarr; <strong>Pages</strong>.
                </li>
                <li>
                  <strong className="text-slate-800">Connect GitHub:</strong> Select your <code className="bg-slate-100 px-1 rounded">everykr-platform</code> repository.
                </li>
                <li>
                  <strong className="text-slate-800">Configure Build Settings:</strong>
                  <div className="mt-2 grid grid-cols-2 gap-2 p-3 bg-slate-900 text-slate-200 rounded-lg font-mono text-xs">
                    <div>
                      <span className="text-slate-400">Framework preset:</span> Vite
                    </div>
                    <div>
                      <span className="text-slate-400">Build command:</span> npm run build
                    </div>
                    <div>
                      <span className="text-slate-400">Output directory:</span> dist
                    </div>
                    <div>
                      <span className="text-slate-400">Node version:</span> 20 or higher
                    </div>
                  </div>
                </li>
                <li>
                  <strong className="text-slate-800">Add Environment Variables:</strong> Under <em>Environment variables</em>, add your optional Supabase keys (<code className="bg-slate-100 px-1 rounded">VITE_SUPABASE_URL</code>, <code className="bg-slate-100 px-1 rounded">VITE_SUPABASE_ANON_KEY</code>).
                </li>
                <li>
                  <strong className="text-slate-800">Click &ldquo;Save and Deploy&rdquo;:</strong> In ~45 seconds, your site is live at <code className="text-blue-600 font-mono">https://everykr.pages.dev</code>!
                </li>
              </ol>
            </div>
          )}

          {activeTab === 'godaddy' && (
            <div className="space-y-4">
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                <h4 className="font-bold text-emerald-900 text-sm mb-1">
                  Connecting your GoDaddy Domain to Cloudflare Pages
                </h4>
                <p className="text-xs text-emerald-700 leading-relaxed">
                  You can connect your custom domain (e.g. <code className="font-mono font-semibold">everykr.com</code> or <code className="font-mono font-semibold">app.everykr.com</code>) with automatic HTTPS SSL provisioned in minutes.
                </p>
              </div>

              <h4 className="font-bold text-slate-900 text-sm">Step 1: Set Custom Domain in Cloudflare Pages</h4>
              <p className="text-xs text-slate-600">
                In your Cloudflare Pages project dashboard &rarr; click the <strong>Custom domains</strong> tab &rarr; click <strong>Set up a custom domain</strong> &rarr; enter your domain (e.g., <code className="bg-slate-100 px-1.5 py-0.5 rounded text-blue-600">everykr.com</code> or <code className="bg-slate-100 px-1.5 py-0.5 rounded text-blue-600">www.everykr.com</code>).
              </p>

              <h4 className="font-bold text-slate-900 text-sm">Step 2: Add DNS Record in GoDaddy</h4>
              <div className="p-3 bg-slate-900 text-slate-200 rounded-xl space-y-2 text-xs font-mono">
                <div className="text-slate-400">// For a Subdomain (e.g. www.everykr.com or app.everykr.com)</div>
                <div className="flex justify-between items-center py-1 border-b border-slate-800">
                  <span>Type: <strong className="text-white">CNAME</strong></span>
                  <span>Name: <strong className="text-white">www</strong></span>
                  <span>Value: <strong className="text-blue-400">everykr.pages.dev</strong></span>
                  <span>TTL: <strong className="text-white">1 Hour</strong></span>
                </div>
                <div className="text-slate-400 mt-2">// For Apex Domain (everykr.com root)</div>
                <div className="text-slate-300">
                  GoDaddy supports CNAME flattening or URL Forwarding (@ to www.everykr.com). Or switch GoDaddy nameservers to Cloudflare (Free) for instant 1-click proxying.
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2 text-xs text-slate-500">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>DNS propagation typically completes within 5 to 30 minutes. Cloudflare automatically issues and renews your free SSL/TLS certificate.</span>
              </div>
            </div>
          )}

          {activeTab === 'supabase' && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                <h4 className="font-bold text-slate-900 text-sm mb-1">
                  Supabase PostgreSQL Setup
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  EveryKR is built ready for Supabase. Currently, the prototype uses an active realistic mock dataset with localStorage persistence. When you want real cloud database storage and email auth, just plug in your free Supabase credentials!
                </p>
              </div>

              <h4 className="font-bold text-slate-900 text-sm">How to Configure Supabase:</h4>
              <ol className="list-decimal pl-5 space-y-2 text-xs text-slate-600">
                <li>Create a free account and new project at <strong>supabase.com</strong>.</li>
                <li>Go to <strong>SQL Editor</strong> &rarr; click <strong>New Query</strong>.</li>
                <li>Copy and paste the full schema located at <code className="text-blue-600 font-mono">/supabase/schema.sql</code> in this project.</li>
                <li>Click <strong>Run</strong> to create all tables (profiles, universities, housing, market items, posts) with row-level security.</li>
                <li>Copy your <strong>Project URL</strong> and <strong>Anon Public Key</strong> from <em>Project Settings &rarr; API</em>.</li>
                <li>Add them to your <code className="font-mono text-blue-600">.env</code> file:</li>
              </ol>

              <div className="relative p-3 bg-slate-900 text-slate-200 rounded-lg font-mono text-xs">
                <button
                  onClick={() =>
                    copyToClipboard(
                      `VITE_SUPABASE_URL="https://yourproject.supabase.co"\nVITE_SUPABASE_ANON_KEY="your-anon-key-here"`,
                      'Env Variables'
                    )
                  }
                  className="absolute right-3 top-3 p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                  title="Copy snippet"
                >
                  {copiedKey === 'Env Variables' ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
                <pre className="whitespace-pre-wrap">
{`VITE_SUPABASE_URL="https://yourproject.supabase.co"
VITE_SUPABASE_ANON_KEY="your-anon-key-here"`}
                </pre>
              </div>
            </div>
          )}

          {activeTab === 'export' && (
            <div className="space-y-4">
              <h4 className="font-bold text-slate-900 text-sm">How to Export This Project:</h4>
              <p className="text-xs text-slate-600">
                You can download the entire source code directory directly from AI Studio, or git clone if version control is connected.
              </p>

              <div className="p-3 bg-slate-900 text-slate-200 rounded-lg font-mono text-xs space-y-1">
                <div className="text-slate-400"># 1. Install dependencies locally</div>
                <div>npm install</div>
                <div className="text-slate-400 mt-2"># 2. Run local development server</div>
                <div>npm run dev</div>
                <div className="text-slate-400 mt-2"># 3. Build optimized production bundle</div>
                <div>npm run build</div>
                <div className="text-slate-400 mt-2"># 4. Preview production build</div>
                <div>npm run preview</div>
              </div>

              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 text-xs space-y-2">
                <div className="font-semibold text-slate-900">Project Structure Checklist:</div>
                <div className="grid grid-cols-2 gap-2 text-slate-600">
                  <div className="flex items-center gap-1.5"><Folder className="w-3.5 h-3.5 text-[#0754B8] shrink-0" /><span>/src/components - Reusable UI sections</span></div>
                  <div className="flex items-center gap-1.5"><Folder className="w-3.5 h-3.5 text-[#0754B8] shrink-0" /><span>/src/data - Realistic Korean datasets</span></div>
                  <div className="flex items-center gap-1.5"><Folder className="w-3.5 h-3.5 text-[#0754B8] shrink-0" /><span>/src/context - App state &amp; persistence</span></div>
                  <div className="flex items-center gap-1.5"><Folder className="w-3.5 h-3.5 text-[#0754B8] shrink-0" /><span>/src/lib - Supabase client helper</span></div>
                  <div className="flex items-center gap-1.5"><Folder className="w-3.5 h-3.5 text-[#0754B8] shrink-0" /><span>/supabase - Ready-to-run SQL schema</span></div>
                  <div className="flex items-center gap-1.5"><FileText className="w-3.5 h-3.5 text-slate-500 shrink-0" /><span>/dist - Cloudflare Pages deployment target</span></div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            EveryKR is 100% standard Vite + React + TypeScript with zero proprietary locks.
          </span>
          <button
            onClick={() => setShowDeploymentModal(false)}
            className="px-4 py-2 text-xs font-semibold bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};
