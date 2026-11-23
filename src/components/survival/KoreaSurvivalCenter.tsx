/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  ShieldAlert,
  Plane,
  CreditCard,
  Smartphone,
  Trash2,
  HeartPulse,
  DollarSign,
  CheckCircle2,
  ExternalLink,
  HelpCircle,
  AlertTriangle,
  Clock,
  Sparkles,
} from 'lucide-react';

export const KoreaSurvivalCenter: React.FC = () => {
  const { survivalGuides, formatKrw } = useApp();
  const [selectedArticleId, setSelectedArticleId] = useState<string>('survival-1');

  // Interactive Monthly Budget Calculator State
  const [roomCost, setRoomCost] = useState<number>(500000);
  const [foodCost, setFoodCost] = useState<number>(400000);
  const [transitPass, setTransitPass] = useState<number>(55000); // Climate Card Youth
  const [phoneBill, setPhoneBill] = useState<number>(30000);
  const [nhisInsurance, setNhisInsurance] = useState<number>(75000);
  const [personalFun, setPersonalFun] = useState<number>(150000);

  const totalMonthlyBudget = roomCost + foodCost + transitPass + phoneBill + nhisInsurance + personalFun;

  const activeArticle = survivalGuides.find((a) => a.id === selectedArticleId) || survivalGuides[0];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      {/* Header */}
      <div className="border-b border-slate-200 pb-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-blue-600 mb-1">
              Practical Newcomer Roadmap
            </div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Korea Survival Center & Living Handbook
            </h1>
            <p className="text-sm text-slate-600 mt-1 max-w-2xl">
              Verified step-by-step procedures for arrival, banking without ARC, mobile SIM cards, waste disposal, and Korean health insurance compliance.
            </p>
          </div>
          <div className="text-xs text-slate-500 font-mono">
            Last Updated: <strong className="text-slate-900">February 2026</strong>
          </div>
        </div>
      </div>

      {/* Guide Category Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {survivalGuides.map((guide) => {
          const isSelected = guide.id === selectedArticleId;
          return (
            <button
              key={guide.id}
              onClick={() => setSelectedArticleId(guide.id)}
              className={`p-3 rounded-xl text-left border transition-all cursor-pointer ${
                isSelected
                  ? 'bg-blue-50 border-blue-600 shadow-sm'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="text-[11px] font-bold text-blue-600 uppercase tracking-tight capitalize">
                {guide.category.replace('_', ' ')}
              </div>
              <div className="text-xs font-bold text-slate-900 mt-0.5 line-clamp-2">
                {guide.title.split(':')[0]}
              </div>
            </button>
          );
        })}
      </div>

      {/* Active Guide Article View */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        {/* Banner */}
        <div className="p-6 bg-slate-900 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="text-xs font-semibold text-blue-400 uppercase tracking-wider">
              Official Newcomer Procedure
            </div>
            <h2 className="text-xl font-bold mt-1 text-white">
              {activeArticle.title}
            </h2>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl">
              {activeArticle.summary}
            </p>
          </div>

          {activeArticle.sourceUrl && (
            <a
              href={activeArticle.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition-colors shrink-0"
            >
              <span>Official Authority Source</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>

        {/* Steps and Details */}
        <div className="p-6 lg:p-8 space-y-6 text-xs text-slate-700">
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
              Action Plan & Verification
            </h3>
            <div className="space-y-3">
              {activeArticle.keySteps.map((step) => (
                <div
                  key={step.step}
                  className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-start gap-3.5"
                >
                  <div className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-xs shrink-0 mt-0.5">
                    {step.step}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-xs mb-1">
                      {step.title}
                    </h4>
                    <p className="text-slate-600 leading-relaxed text-[11px]">
                      {step.detail}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Pro Tips Box */}
          {activeArticle.proTips && activeArticle.proTips.length > 0 && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>Crucial Real-World Advice from Senior International Students</span>
              </div>
              <ul className="space-y-1.5 text-amber-900 text-xs pl-5 list-disc">
                {activeArticle.proTips.map((tip, idx) => (
                  <li key={idx}>{tip}</li>
                ))}
              </ul>
            </div>
          )}

          {activeArticle.officialHelpline && (
            <div className="text-xs text-slate-500 pt-2 border-t border-slate-100 flex items-center justify-between">
              <span>Direct Support Helpline: <strong className="text-slate-900">{activeArticle.officialHelpline}</strong></span>
              <span>English & Multilingual</span>
            </div>
          )}
        </div>
      </div>

      {/* Interactive Seoul Student Monthly Budget Estimator */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 lg:p-8 space-y-6">
        <div>
          <h3 className="text-lg font-bold text-slate-900 tracking-tight">
            Interactive Seoul Monthly Living Cost Calculator
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Adjust sliders to estimate realistic student expenses across rent, meals, subway pass, and health insurance.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-xs">
          {/* Housing */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2">
            <div className="flex justify-between font-semibold">
              <span className="text-slate-700">Housing / Goshiwon / Studio</span>
              <span className="text-blue-600 font-mono">{formatKrw(roomCost)}</span>
            </div>
            <input
              type="range"
              min="350000"
              max="900000"
              step="25000"
              value={roomCost}
              onChange={(e) => setRoomCost(Number(e.target.value))}
              className="w-full accent-blue-600"
            />
            <div className="text-[10px] text-slate-400">₩350k (budget goshiwon) to ₩850k (officetel)</div>
          </div>

          {/* Food */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2">
            <div className="flex justify-between font-semibold">
              <span className="text-slate-700">Food & University Cafeteria</span>
              <span className="text-blue-600 font-mono">{formatKrw(foodCost)}</span>
            </div>
            <input
              type="range"
              min="250000"
              max="700000"
              step="25000"
              value={foodCost}
              onChange={(e) => setFoodCost(Number(e.target.value))}
              className="w-full accent-blue-600"
            />
            <div className="text-[10px] text-slate-400">University meals (학식) ₩5,000 + groceries</div>
          </div>

          {/* Transit */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2">
            <div className="flex justify-between font-semibold">
              <span className="text-slate-700">Transit (Climate Card Youth)</span>
              <span className="text-blue-600 font-mono">{formatKrw(transitPass)}</span>
            </div>
            <input
              type="range"
              min="55000"
              max="95000"
              step="10000"
              value={transitPass}
              onChange={(e) => setTransitPass(Number(e.target.value))}
              className="w-full accent-blue-600"
            />
            <div className="text-[10px] text-slate-400">Unlimited 30-day metro & bus pass in Seoul</div>
          </div>

          {/* Mobile Phone */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2">
            <div className="flex justify-between font-semibold">
              <span className="text-slate-700">Mobile SIM & Unlimited Data</span>
              <span className="text-blue-600 font-mono">{formatKrw(phoneBill)}</span>
            </div>
            <input
              type="range"
              min="15000"
              max="60000"
              step="5000"
              value={phoneBill}
              onChange={(e) => setPhoneBill(Number(e.target.value))}
              className="w-full accent-blue-600"
            />
            <div className="text-[10px] text-slate-400">Chingu Mobile / Woori MVNO prepaid plans</div>
          </div>

          {/* NHIS Health Insurance */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2">
            <div className="flex justify-between font-semibold">
              <span className="text-slate-700">National Health Insurance (NHIS)</span>
              <span className="text-blue-600 font-mono">{formatKrw(nhisInsurance)}</span>
            </div>
            <input
              type="range"
              min="70000"
              max="80000"
              step="5000"
              value={nhisInsurance}
              onChange={(e) => setNhisInsurance(Number(e.target.value))}
              className="w-full accent-blue-600"
            />
            <div className="text-[10px] text-slate-400">Statutory student discounted rate</div>
          </div>

          {/* Personal Entertainment */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2">
            <div className="flex justify-between font-semibold">
              <span className="text-slate-700">Coffee, Hangang & Social</span>
              <span className="text-blue-600 font-mono">{formatKrw(personalFun)}</span>
            </div>
            <input
              type="range"
              min="50000"
              max="350000"
              step="25000"
              value={personalFun}
              onChange={(e) => setPersonalFun(Number(e.target.value))}
              className="w-full accent-blue-600"
            />
            <div className="text-[10px] text-slate-400">Coffee shops, study cafes, leisure</div>
          </div>
        </div>

        {/* Calculated Total Bar */}
        <div className="p-4 bg-slate-900 rounded-xl text-white flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <div className="text-xs text-slate-300">Total Estimated Monthly Living Cost in Seoul</div>
            <div className="text-2xl font-extrabold font-mono text-blue-400 mt-0.5">
              {formatKrw(totalMonthlyBudget)}
              <span className="text-xs font-normal text-slate-300"> / month (~${(totalMonthlyBudget * 0.00072).toFixed(0)} USD)</span>
            </div>
          </div>
          <div className="text-xs text-slate-400 text-right">
            S-3 Part-time work (20 hrs/wk @ ₩11,000/hr) earns ~₩880,000/month
          </div>
        </div>
      </div>
    </div>
  );
};
