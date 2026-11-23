/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Sparkles,
  Send,
  MessageSquare,
  Copy,
  Check,
  Bot,
  User,
  HelpCircle,
  Volume2,
  BookOpen,
  Building,
  GraduationCap,
  Home,
  Briefcase,
  Utensils,
  AlertCircle,
} from 'lucide-react';

interface PhrasebookCategory {
  id: string;
  name: string;
  icon: React.FC<{ className?: string }>;
  scenarios: {
    title: string;
    hangul: string;
    romanization: string;
    meaning: string;
    politeness: string;
    tip: string;
  }[];
}

const curatedPhrasebooks: PhrasebookCategory[] = [
  {
    id: 'housing',
    name: 'Landlord & Housing',
    icon: Home,
    scenarios: [
      {
        title: 'Asking to inspect or repair the boiler/heating',
        hangul: '사장님, 안녕하세요. 방 보일러가 작동을 안 해서 온수가 안 나오는데 한번 확인해 주실 수 있으실까요?',
        romanization: 'Sajangnim, annyeonghaseyo. Bang boileoga jakdongeul an haeseo onsuga an naoneunde hanbeon hwaginhae jusil su isseusilkkayo?',
        meaning: 'Hello Landlord. The boiler in my room isn’t working and there’s no hot water. Could you please check it?',
        politeness: 'Polite / 존댓말',
        tip: 'Send this via KakaoTalk with a photo or video of the temperature controller screen.',
      },
      {
        title: 'Asking for rent receipt for Alien Registration proof',
        hangul: '출입국사무소 비자 서류 제출용으로 월세 납부 영수증(입금확인서)을 발급받을 수 있을까요?',
        romanization: 'Churibguk-samuso bija seoryu jechulyongeuro wolse napbu yeongsujeungeul balgeupbadeul su isseulkkayo?',
        meaning: 'Could I receive a monthly rent payment receipt to submit for immigration visa paperwork?',
        politeness: 'Formal / 격식체',
        tip: 'Essential when renewing your D-2 visa without an official real estate contract.',
      },
    ],
  },
  {
    id: 'immigration',
    name: 'Immigration & ARC',
    icon: Building,
    scenarios: [
      {
        title: 'Reporting address change within 14 days',
        hangul: '이사 후 14일 이내 체류지 변경 신고를 하러 왔습니다. 여기 임대차 계약서입니다.',
        romanization: 'Isa hu sibsail inae cheryuji byeongyeong sin-goreul hareo watseumnida. Yeogi imdaecha gyeyakseo-imnida.',
        meaning: 'I came to report my change of address within 14 days of moving. Here is my lease contract.',
        politeness: 'Formal / 격식체',
        tip: 'Can also be submitted at your local Community Service Center (주민센터) without visiting immigration.',
      },
      {
        title: 'Inquiring about S-3 Part-Time Work Permit',
        hangul: 'D-2 유학생 시간제 취업 허가(S-3) 신청 서류를 제출하러 왔습니다.',
        romanization: 'D-2 yuhaksaeng siganje chwieop heoga sincheong seoryureul jechulhareo watseumnida.',
        meaning: 'I am here to submit documents for my D-2 international student part-time work permit (S-3).',
        politeness: 'Formal / 격식체',
        tip: 'Must have your university coordinator’s signature on the confirmation form beforehand.',
      },
    ],
  },
  {
    id: 'campus',
    name: 'University & Professors',
    icon: GraduationCap,
    scenarios: [
      {
        title: 'Politely requesting an office hour consultation',
        hangul: '교수님, 안녕하십니까. 이번 학기 수업 과제와 관련하여 상담을 받고자 연구실 면담을 요청드려도 괜찮으실까요?',
        romanization: 'Gyosunim, annyeonghasimnikka. Ibeon hakgi sueop gwajewa gwanlyeonhayeo sangdameul batgoja yeongusil myeondameul yocheongdeuryeodo gwaenchaneusikkayo?',
        meaning: 'Dear Professor, hello. May I request an office meeting to receive advice regarding this semester’s assignment?',
        politeness: 'High Honorific / 극존칭',
        tip: 'Always email professors from your university @ac.kr account with student ID and full name in signature.',
      },
    ],
  },
  {
    id: 'food',
    name: 'Dining & Halal / Diet',
    icon: Utensils,
    scenarios: [
      {
        title: 'Requesting no pork or lard (Halal / Muslim friendly)',
        hangul: '죄송하지만 종교적인 이유로 돼지고기를 못 먹습니다. 돼지고기나 햄, 돈골 육수가 안 들어간 메뉴가 있을까요?',
        romanization: 'Joesonghajiman jong-gyojeogin iyuro dwaejigogireul mot meokseumnida. Dwaejigogina haem, dongol yuksuga an deureogan menyuga isseulkkayo?',
        meaning: 'Excuse me, but for religious reasons I cannot eat pork. Is there a dish without pork, ham, or pork bone broth?',
        politeness: 'Polite / 존댓말',
        tip: 'Many Korean soups use pork bone broth (돈골); asking explicitly ensures safe dining.',
      },
      {
        title: 'Asking for less spicy level',
        hangul: '제가 매운 음식을 잘 못 먹어서 그런데, 덜 맵게(순한 맛으로) 조리해 주실 수 있을까요?',
        romanization: 'Jega maeun eumsigeul jal mot meogeoseo geureonde, deol maepge jorihae jusil su isseulkkayo?',
        meaning: 'I am not very good with spicy food. Could you please prepare it less spicy (mild flavor)?',
        politeness: 'Polite / 존댓말',
        tip: 'Ask for "sun-han mat" (순한맛) for children/mild level.',
      },
    ],
  },
];

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  details?: {
    hangul?: string;
    romanization?: string;
    translation?: string;
    tip?: string;
  };
}

export const KoreanAssistantSection: React.FC = () => {
  const { language, showToast } = useApp();
  const addToast = (msg: any, _type?: any) => showToast(typeof msg === 'string' ? msg : msg?.message || 'Updated');

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedScenario, setSelectedScenario] = useState<string>('housing');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: `Hello! I am your EveryKR Korean Language & Living Assistant. You can ask me in ${language.toUpperCase()} or any language on how to talk with Korean landlords, professors, immigration officers, or order dietary-specific food.`,
    },
  ]);

  const activeCategory = curatedPhrasebooks.find((c) => c.id === selectedScenario) || curatedPhrasebooks[0];

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    addToast('Korean expression copied to clipboard!', 'success');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userText = input;
    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: userText,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/assistant/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userText,
          language,
          scenario: activeCategory.name,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => [
          ...prev,
          {
            id: `ast-${Date.now()}`,
            sender: 'assistant',
            text: data.reply || 'Here is your Korean expression guide.',
          },
        ]);
      } else {
        // Fallback to phrasebook contextual recommendation
        setMessages((prev) => [
          ...prev,
          {
            id: `ast-${Date.now()}`,
            sender: 'assistant',
            text: `[Offline Phrasebook Engine] For inquiries related to "${userText}", see the recommended dialogue patterns below. You can copy the exact Hangul directly to send to your landlord or advisor.`,
          },
        ]);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `ast-${Date.now()}`,
          sender: 'assistant',
          text: `[Offline Guide] Please refer to our curated Situational Korean Phrasebook on the right. Tap any card to copy the native Hangul directly!`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="border-b border-slate-200 pb-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-blue-600 mb-1">
              <Sparkles className="w-4 h-4" />
              <span>Gemini 2.5 AI & Situational Phrasebook</span>
            </div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Korean Language & Daily Living Assistant
            </h1>
            <p className="text-sm text-slate-600 mt-1 max-w-2xl">
              Get natural Korean phrases with romanization and cultural etiquette tips for campus, housing, and immigration.
            </p>
          </div>
          <div className="text-xs text-slate-500 font-mono">
            Supported across all 15 languages
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Interactive Chat Interface */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[640px]">
          {/* Chat Header */}
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900">EveryKR Korean AI Tutor</div>
                <div className="text-[11px] text-emerald-600 font-medium">Active Assistant</div>
              </div>
            </div>
            <span className="text-[11px] text-slate-500 bg-white px-2.5 py-1 rounded-md border border-slate-200">
              Scenario: {activeCategory.name}
            </span>
          </div>

          {/* Messages Log */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4 text-xs">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.sender === 'assistant' && (
                  <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-200">
                    <Bot className="w-4 h-4" />
                  </div>
                )}
                <div
                  className={`p-3.5 rounded-2xl max-w-[85%] leading-relaxed whitespace-pre-line ${
                    msg.sender === 'user'
                      ? 'bg-blue-600 text-white rounded-br-none'
                      : 'bg-slate-50 border border-slate-200 text-slate-800 rounded-bl-none'
                  }`}
                >
                  {msg.text}
                </div>
                {msg.sender === 'user' && (
                  <div className="w-7 h-7 rounded-lg bg-slate-900 text-white flex items-center justify-center shrink-0">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex gap-2 items-center text-slate-500 text-xs p-2">
                <div className="w-2 h-2 rounded-full bg-blue-600 animate-ping"></div>
                <span>Translating and formulating Korean cultural response...</span>
              </div>
            )}
          </div>

          {/* Input Bar */}
          <form onSubmit={handleSend} className="p-3 border-t border-slate-200 bg-white flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything in English, Bengali, or your language..."
              className="flex-1 px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
            >
              <span>Send</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>

        {/* Right Column: Curated Situational Phrasebooks */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-sm">
              Situational Korean Dialogues
            </h3>
            <span className="text-[11px] text-slate-400">Offline & Immediate</span>
          </div>

          {/* Category Toggle Tabs */}
          <div className="flex gap-1.5 overflow-x-auto text-xs pb-1">
            {curatedPhrasebooks.map((cat) => {
              const Icon = cat.icon;
              const isSelected = selectedScenario === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedScenario(cat.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-blue-600 text-white font-semibold'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{cat.name}</span>
                </button>
              );
            })}
          </div>

          {/* Scenario Cards */}
          <div className="space-y-3">
            {activeCategory.scenarios.map((item, idx) => (
              <div
                key={idx}
                className="p-4 bg-white rounded-2xl border border-slate-200 hover:border-blue-300 hover:shadow-sm transition-all space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">
                    {item.title}
                  </span>
                  <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                    {item.politeness}
                  </span>
                </div>

                {/* Hangul text with copy action */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-xs space-y-1 relative group">
                  <div className="font-bold text-slate-900 text-sm font-sans leading-relaxed">
                    {item.hangul}
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono italic">
                    {item.romanization}
                  </div>
                  <button
                    onClick={() => handleCopy(item.hangul, `${activeCategory.id}-${idx}`)}
                    className="absolute top-2.5 right-2.5 p-1.5 rounded-md bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
                    title="Copy Korean to clipboard"
                  >
                    {copiedId === `${activeCategory.id}-${idx}` ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>

                <div className="text-xs text-slate-600">
                  <strong className="text-slate-800">English: </strong>
                  {item.meaning}
                </div>

                <div className="text-[11px] text-amber-900 bg-amber-50/70 border border-amber-200/60 p-2 rounded-lg">
                  <span className="font-semibold text-amber-950">Cultural Tip: </span>
                  {item.tip}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
