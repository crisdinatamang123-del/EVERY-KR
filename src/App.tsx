import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AppProvider, useApp } from './context/AppContext';
import { GlobalHeader } from './components/GlobalHeader';
import { Footer } from './components/Footer';
import { DeveloperProfilePageView } from './components/DeveloperProfileBar';
import { UniversityFinder } from './components/UniversityFinder';
import { UniversityDetailPage } from './components/UniversityDetailPage';
import { UniversityDetailModal } from './components/UniversityDetailModal';
import { UniversityCompareModal } from './components/UniversityCompareModal';
import { ScholarshipsModule } from './components/ScholarshipsModule';
import { VisaModule } from './components/VisaModule';
import { JobsModule } from './components/JobsModule';
import { AccommodationModule } from './components/AccommodationModule';
import { AccommodationDetailPage } from './components/AccommodationDetailPage';
import { CommunityModule } from './components/CommunityModule';
import { MarketplaceModule } from './components/MarketplaceModule';
import { DailyLifeHub } from './components/DailyLifeHub';
import { OtherServicesHub } from './components/OtherServicesHub';
import { StudyLanguageModule } from './components/StudyLanguageModule';
import { KoreanLearningAcademy } from './components/academy/KoreanLearningAcademy';
import { EveryKRLearnHangulPage } from './components/hangul/EveryKRLearnHangulPage';
import { ExploreKoreaModule } from './components/ExploreKoreaModule';
import { NewsEventsModule } from './components/NewsEventsModule';
import { DashboardView } from './components/DashboardView';
import { SettingsView } from './components/SettingsView';
import { AdminView } from './components/AdminView';
import { ContactView } from './components/ContactView';
import { LegalViews } from './components/LegalViews';
import { AuthPageView } from './components/AuthPageView';
import { ResetPasswordView } from './components/ResetPasswordView';
import { NotFoundView } from './components/NotFoundView';
import { GlobalSearchModal } from './components/GlobalSearchModal';
import { GetHelpModal } from './components/GetHelpModal';
import { AuthModal } from './components/AuthModal';
import { CreatePostModal } from './components/CreatePostModal';
import { CreateMarketplaceModal } from './components/CreateMarketplaceModal';
import { PostJobModal } from './components/PostJobModal';
import { AddHousingModal } from './components/AddHousingModal';
import { EveryKrAIAssistant } from './components/ai/EveryKrAIAssistant';
import { CategoryHomePage } from './components/home/CategoryHomePage';
import { TransportationModule } from './components/TransportationModule';
import { ShoppingModule } from './components/ShoppingModule';
import { RouteSeoManager } from './components/routing/RouteSeoManager';
import {
  ProtectedRoute,
  AdminRoute,
  ApplicationsAdminRoute
} from './components/routing/RouteGuards';
import { ApplicationWizardPage } from './components/applications/ApplicationWizardPage';
import { MyApplicationsPage } from './components/applications/MyApplicationsPage';
import { AdminApplicationsRoutePage } from './components/admin/AdminApplicationsRoutePage';
import {
  ProgramsPage,
  ApplicationGuidePage,
  AboutEveryKRPage
} from './components/EducationPages';
import { GlobalPageTranslator } from './i18n/domTranslator';
import { EveryKrInitialSplashLoader } from './components/common/EveryKrAnimatedLogo';

import { Scale, X } from 'lucide-react';
import {
  buildCanonicalEveryKrUrl,
  isNonCanonicalProductionHostname,
  isInternalPortalHostname
} from './lib/firebase';
import { InternalPortalApp } from './components/internal/InternalPortalApp';

const OpenFloatingAIRedirect: React.FC = () => {
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('open-everykr-ai'));
  }, []);
  return <Navigate to="/" replace />;
};

const MainContent: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    comparedUniversityIds,
    setIsCompareModalOpen,
    clearComparison,
    toastMessage
  } = useApp();

  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      isNonCanonicalProductionHostname(window.location.hostname)
    ) {
      const targetCanonicalUrl = buildCanonicalEveryKrUrl(
        `${window.location.pathname}${window.location.search}${window.location.hash}`
      );
      window.location.replace(targetCanonicalUrl);
      return;
    }

    if (
      location.pathname !== '/reset-password' &&
      location.pathname !== '/__/auth/action' &&
      location.search
    ) {
      const params = new URLSearchParams(location.search);
      const oobCode = (params.get('oobCode') || '').trim();
      const mode = params.get('mode');
      if (oobCode && mode === 'resetPassword') {
        navigate(`/reset-password?oobCode=${encodeURIComponent(oobCode)}`, { replace: true });
      }
    }
  }, [location.pathname, location.search, navigate]);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [location.pathname]);

  const isInternalDomainOrRoute =
    (typeof window !== 'undefined' && isInternalPortalHostname(window.location.hostname)) ||
    location.pathname === '/internal' ||
    location.pathname.startsWith('/internal/');

  if (isInternalDomainOrRoute) {
    return (
      <>
        {toastMessage && (
          <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-[#081426] text-white px-4 py-2.5 rounded-xl shadow-2xl border border-[#DCE5F0]/20 text-xs font-semibold">
            {toastMessage}
          </div>
        )}
        <InternalPortalApp />
      </>
    );
  }

  const isAuthPage =
    location.pathname === '/login' ||
    location.pathname === '/register' ||
    location.pathname === '/reset-password' ||
    location.pathname === '/__/auth/action';
  const isHomePage = location.pathname === '/';

  return (
    <div
      className={`${
        isHomePage ? '' : 'min-h-screen '
      }relative w-full max-w-full overflow-x-clip flex flex-col bg-transparent text-[#10213D] dark:text-white transition-colors duration-300`}
    >
      {/* Global Continuous Atmospheric Background Layer (Day & Night) */}
      <div className="ekr-global-atmosphere" aria-hidden="true" />

      <div className="relative z-10 flex flex-col flex-1 w-full max-w-full">
        <EveryKrInitialSplashLoader />
        <RouteSeoManager />
        <GlobalPageTranslator />
        <GlobalHeader />

        {/* Global Toast Notification */}
        {toastMessage && (
          <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 ekr-glass-modal text-[#10213D] dark:text-white px-4 py-2.5 rounded-xl text-xs font-semibold">
            {toastMessage}
          </div>
        )}

        <main className={`${isHomePage ? '' : 'flex-1 '}w-full max-w-full overflow-x-clip`}>
        <Routes>
          {/* Public Core Routes */}
          <Route path="/" element={<CategoryHomePage />} />
          <Route path="/login" element={<AuthPageView mode="login" />} />
          <Route path="/register" element={<AuthPageView mode="signup" />} />
          <Route path="/signup" element={<Navigate to="/register" replace />} />
          <Route path="/reset-password" element={<ResetPasswordView />} />
          <Route path="/__/auth/action" element={<ResetPasswordView />} />
          <Route path="/internal/*" element={<InternalPortalApp />} />

          {/* Academic, Programs, Deadlines, Application Guide & Scholarships Routes */}
          <Route path="/universities" element={<UniversityFinder isFullPage={true} />} />
          <Route path="/universities/:slug" element={<UniversityDetailPage />} />
          <Route path="/programs" element={<ProgramsPage />} />
          <Route path="/deadlines" element={<UniversityFinder isFullPage={true} initialOption="deadlines" />} />
          <Route path="/application-guide" element={<ApplicationGuidePage />} />
          <Route path="/scholarships" element={<ScholarshipsModule />} />

          {/* Work, Housing, Community & Visa Routes */}
          <Route path="/jobs" element={<JobsModule isFullPage={true} />} />
          <Route path="/housing" element={<AccommodationModule isFullPage={true} />} />
          <Route path="/housing/:propertyId" element={<AccommodationDetailPage />} />
          <Route path="/accommodation" element={<AccommodationModule isFullPage={true} />} />
          <Route path="/accommodation/:propertyId" element={<AccommodationDetailPage />} />
          <Route path="/find-accommodation" element={<Navigate to="/housing" replace />} />
          <Route path="/community" element={<CommunityModule isFullPage={true} />} />
          <Route path="/visa" element={<VisaModule isFullPage={true} />} />

          {/* News & Events Routes */}
          <Route path="/news" element={<NewsEventsModule mode="news" />} />
          <Route path="/events" element={<NewsEventsModule mode="events" />} />

          {/* Flight Search & Price Comparison Engine Routes */}
          <Route path="/transportation" element={<TransportationModule />} />
          <Route path="/flights" element={<TransportationModule />} />
          <Route path="/tickets-transport" element={<Navigate to="/transportation" replace />} />
          <Route
            path="/sim"
            element={
              <ProtectedRoute>
                <ShoppingModule />
              </ProtectedRoute>
            }
          />
          <Route path="/shopping" element={<Navigate to="/sim" replace />} />
          <Route path="/sim-shopping" element={<Navigate to="/sim" replace />} />
          <Route path="/marketplace" element={<MarketplaceModule isFullPage={true} />} />
          <Route path="/daily-life" element={<DailyLifeHub isFullPage={true} />} />
          <Route path="/services" element={<OtherServicesHub />} />
          <Route path="/others" element={<Navigate to="/services" replace />} />
          <Route path="/study-in-korea" element={<StudyLanguageModule />} />
          <Route path="/study-language" element={<StudyLanguageModule />} />
          <Route path="/korean-academy" element={<KoreanLearningAcademy />} />
          <Route path="/learn-korean" element={<Navigate to="/korean-academy" replace />} />
          <Route path="/learn-hangul" element={<EveryKRLearnHangulPage />} />
          <Route path="/discover-korea" element={<ExploreKoreaModule />} />
          <Route path="/explore-korea" element={<ExploreKoreaModule />} />
          <Route path="/ai-chat" element={<OpenFloatingAIRedirect />} />
          <Route path="/workspace" element={<OpenFloatingAIRedirect />} />
          <Route path="/everykr-ai" element={<OpenFloatingAIRedirect />} />
          <Route path="/about" element={<AboutEveryKRPage />} />
          <Route path="/developer" element={<DeveloperProfilePageView />} />
          <Route path="/contact" element={<ContactView />} />
          <Route path="/privacy" element={<LegalViews type="privacy" />} />
          <Route path="/terms" element={<LegalViews type="terms" />} />
          <Route path="/disclaimer" element={<LegalViews type="disclaimer" />} />

          {/* Protected User Routes */}
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <DashboardView initialTab="profile" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardView initialTab="profile" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student-portal"
            element={
              <ProtectedRoute>
                <DashboardView initialTab="profile" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <SettingsView />
              </ProtectedRoute>
            }
          />
          <Route
            path="/apply/:universityId"
            element={
              <ProtectedRoute>
                <ApplicationWizardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/my-applications"
            element={
              <ProtectedRoute>
                <MyApplicationsPage />
              </ProtectedRoute>
            }
          />

          {/* Protected Administrator Routes */}
          <Route
            path="/admin/applications"
            element={
              <ApplicationsAdminRoute>
                <AdminApplicationsRoutePage />
              </ApplicationsAdminRoute>
            }
          />
          <Route
            path="/admin/applications/:applicationId"
            element={
              <ApplicationsAdminRoute>
                <AdminApplicationsRoutePage />
              </ApplicationsAdminRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AdminView />
              </AdminRoute>
            }
          />

          {/* 404 Not Found Catch-All Route */}
          <Route path="*" element={<NotFoundView />} />
        </Routes>
      </main>

      {/* Floating University Comparison Bar (When 1+ universities selected) */}
      {comparedUniversityIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 ekr-glass-modal text-[#10213D] dark:text-white px-5 py-3 rounded-2xl flex items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <Scale className="w-4 h-4 text-[#0754B8] dark:text-[#60A5FA]" />
            <span className="font-semibold tabular-nums">
              {comparedUniversityIds.length} of 3 universities selected
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsCompareModalOpen(true)}
              className="ekr-glass-btn-primary px-3.5 py-1.5 font-bold rounded-lg cursor-pointer whitespace-nowrap"
            >
              Compare Now
            </button>
            <button
              type="button"
              onClick={clearComparison}
              className="p-1 text-[#526685] dark:text-[#B8C9E5] hover:text-[#10213D] dark:hover:text-white rounded cursor-pointer"
              title="Clear selection"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Global Modals */}
      <UniversityDetailModal />
      <UniversityCompareModal />
      <GlobalSearchModal />
      <GetHelpModal />
      {!isAuthPage && <AuthModal />}
      <CreatePostModal />
      <CreateMarketplaceModal />
      <PostJobModal />
      <AddHousingModal />

      {/* Floating Global AI Guide (Collapsed by default) */}
      <EveryKrAIAssistant />

      {/* Footer */}
      <Footer />
      </div>
    </div>
  );
};

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppProvider>
          <MainContent />
        </AppProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
