import React from 'react';
import { useApp, ActivePage } from '../context/AppContext';
import {
  GraduationCap,
  FileCheck,
  Briefcase,
  Home,
  Users,
  Compass,
  BookOpen,
  MapPin,
  ArrowRight
} from 'lucide-react';

interface ServiceItem {
  id: ActivePage;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  highlights: string[];
}

export const QuickServices: React.FC = () => {
  const { setActivePage } = useApp();

  const services: ServiceItem[] = [
    {
      id: 'universities',
      title: 'University & Admission',
      subtitle: 'Compare top Korean institutions, tuition rates, English-taught degree programs, and GKS scholarship options.',
      icon: <GraduationCap className="w-6 h-6 text-[#1769AA]" />,
      highlights: ['Degree Search', 'Tuition Comparison', 'Scholarships Guide']
    },
    {
      id: 'visa',
      title: 'Visa & Immigration',
      subtitle: 'Official requirements for D-2, D-4, D-10, and E-7 visas. Interactive document checklist and ARC renewal guides.',
      icon: <FileCheck className="w-6 h-6 text-[#19B6A4]" />,
      highlights: ['ARC Step-by-Step', 'Document Checklist', 'Work Permission Rules']
    },
    {
      id: 'jobs',
      title: 'Jobs & Careers',
      subtitle: 'Verified part-time student jobs, campus assistant roles, translations, and tech internships compliant with Korean law.',
      icon: <Briefcase className="w-6 h-6 text-[#10243A]" />,
      highlights: ['Legal Hours Check', 'Direct Application', 'Employer Verification']
    },
    {
      id: 'accommodation',
      title: 'Accommodation',
      subtitle: 'Verified student housing: dormitories, studios (one-rooms), officetels, and goshiwons with scam protection advice.',
      icon: <Home className="w-6 h-6 text-[#F0B44D]" />,
      highlights: ['No-Scam Guarantee', 'Deposit & Rent Filter', 'Sinchon / Anam / Busan']
    },
    {
      id: 'community',
      title: 'Student Community',
      subtitle: 'Join lively discussions with fellow international students in Seoul, Busan, Daegu, and across university campuses.',
      icon: <Users className="w-6 h-6 text-[#1769AA]" />,
      highlights: ['Campus Q&A', 'City Communities', 'Student Experiences']
    },
    {
      id: 'daily-life',
      title: 'Daily Life in Korea',
      subtitle: 'Essential survival blueprints: opening bank accounts, mobile SIM & eSIM, Climate Card transit, and NHIS health insurance.',
      icon: <Compass className="w-6 h-6 text-[#19B6A4]" />,
      highlights: ['Banking Setup', 'NHIS Insurance', 'Climate Transit Card']
    },
    {
      id: 'study-language',
      title: 'Study & Language',
      subtitle: 'Master the Korean language with TOPIK study plans, everyday survival phrases, grammar guides, and free learning materials.',
      icon: <BookOpen className="w-6 h-6 text-[#10243A]" />,
      highlights: ['TOPIK Prep I & II', 'Audio Phrases', 'Academic Tips']
    },
    {
      id: 'explore-korea',
      title: 'Explore Korea',
      subtitle: 'Discover authentic Korean culture, Muslim-friendly & Halal restaurants, student travel discounts, and weekend city guides.',
      icon: <MapPin className="w-6 h-6 text-[#F0B44D]" />,
      highlights: ['City Itineraries', 'Halal Food Guide', 'Student Discounts']
    }
  ];

  return (
    <section id="quick-services-section" className="py-16 bg-[#F5F7FA] border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10">
          <div>
            <div className="text-xs font-semibold text-[#1769AA] uppercase tracking-wider">
              Comprehensive Student Infrastructure
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#10243A] tracking-tight mt-1">
              Quick Access Services
            </h2>
            <p className="text-sm text-slate-600 mt-1 max-w-xl">
              Navigate all key areas of life and studies in South Korea with reliable, student-tested guides and services.
            </p>
          </div>
        </div>

        {/* 8 Service Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {services.map((svc) => (
            <div
              key={svc.id}
              onClick={() => setActivePage(svc.id)}
              className="bg-white rounded-xl p-6 border border-slate-200 hover:border-slate-300 hover:shadow-md transition-all flex flex-col justify-between group cursor-pointer"
            >
              <div>
                <div className="w-12 h-12 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                  {svc.icon}
                </div>
                
                <h3 className="text-base font-bold text-[#10243A] group-hover:text-[#1769AA] transition-colors">
                  {svc.title}
                </h3>
                
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                  {svc.subtitle}
                </p>

                {/* Key feature bullets */}
                <div className="mt-4 pt-3 border-t border-slate-100 space-y-1">
                  {svc.highlights.map((h, i) => (
                    <div key={i} className="text-[11px] text-slate-600 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#19B6A4]"></span>
                      <span>{h}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Explore Button */}
              <div className="mt-6 pt-3 flex items-center justify-between text-xs font-semibold text-[#1769AA] group-hover:text-[#10243A] transition-colors">
                <span>Explore</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
};
