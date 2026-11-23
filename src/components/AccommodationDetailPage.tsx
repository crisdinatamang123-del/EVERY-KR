import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import {
  fetchAdminAllAccommodations,
  submitAccommodationInquiryDoc
} from '../services/firebaseService';
import { AccommodationListing } from '../types';
import {
  ArrowLeft,
  MapPin,
  Home,
  CheckCircle2,
  Phone,
  Mail,
  Send,
  Lock,
  LogIn,
  UserPlus,
  ExternalLink,
  ShieldAlert
} from 'lucide-react';
import { EveryKrAnimatedLogo } from './common/EveryKrAnimatedLogo';
import { isSuperAdmin } from '../utils/seoRoutes';

export const AccommodationDetailPage: React.FC = () => {
  const { propertyId } = useParams<{ propertyId: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const {
    accommodationList,
    refreshAccommodations,
    currentUser,
    isAuthReady,
    isServerVerifiedAdmin,
    setAuthModalMode,
    setIsAuthModalOpen,
    showToast
  } = useApp();

  const [adminLoadedListing, setAdminLoadedListing] = useState<AccommodationListing | null>(null);
  const [selectedPhotoIdx, setSelectedPhotoIdx] = useState<number>(0);

  // Inquiry form state
  const [inquiryName, setInquiryName] = useState<string>('');
  const [inquiryEmail, setInquiryEmail] = useState<string>('');
  const [inquiryPhone, setInquiryPhone] = useState<string>('');
  const [moveInDate, setMoveInDate] = useState<string>('');
  const [inquiryMessage, setInquiryMessage] = useState<string>('');
  const [isSendingInquiry, setIsSendingInquiry] = useState<boolean>(false);
  const [inquirySubmitted, setInquirySubmitted] = useState<boolean>(false);

  const intendedDestination = `${location.pathname}${location.search}`;
  const isAdminUser = isSuperAdmin(currentUser, isServerVerifiedAdmin);

  const isAuthenticated =
    isAuthReady &&
    Boolean(currentUser) &&
    currentUser?.emailVerified !== false &&
    currentUser?.accountStatus !== 'unverified' &&
    currentUser?.accountStatus !== 'suspended';

  useEffect(() => {
    refreshAccommodations();
  }, []);

  useEffect(() => {
    if (currentUser) {
      setInquiryName(currentUser.fullName || currentUser.name || '');
      setInquiryEmail(currentUser.email || '');
      setInquiryPhone(currentUser.phone || '');
    }
  }, [currentUser]);

  // If Admin is viewing a Pending/Unavailable/Archived listing for preview, allow loading from admin store
  useEffect(() => {
    if (!propertyId || !isAdminUser) return;
    fetchAdminAllAccommodations()
      .then(all => {
        const match = all.find(
          item => item.propertyId === propertyId || item.id === propertyId
        );
        if (match) setAdminLoadedListing(match);
      })
      .catch(() => {
        // ignore
      });
  }, [propertyId, isAdminUser]);

  const listing = useMemo(() => {
    if (!propertyId) return null;
    const decoded = decodeURIComponent(propertyId);
    const fromPublic = accommodationList.find(
      item =>
        (item.propertyId === decoded || item.id === decoded) &&
        (item.approvalStatus || 'Approved') === 'Approved' &&
        (item.availability || 'Available') === 'Available'
    );
    if (fromPublic) return fromPublic;
    if (isAdminUser && adminLoadedListing) return adminLoadedListing;
    return null;
  }, [propertyId, accommodationList, isAdminUser, adminLoadedListing]);

  useEffect(() => {
    setSelectedPhotoIdx(0);
  }, [listing?.id]);

  if (!isAuthReady) {
    return (
      <section className="py-20 min-h-[75vh] flex items-center justify-center bg-transparent px-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-[#0875E8] border-t-transparent animate-spin" />
          <p className="text-xs font-medium text-[#526685] dark:text-[#B8C9E5]">
            Checking account session...
          </p>
        </div>
      </section>
    );
  }

  // 1. Authentication Gate (Preserves exact property detail URL)
  if (!isAuthenticated) {
    return (
      <section className="py-12 sm:py-20 min-h-[80vh] flex items-center justify-center bg-transparent px-4">
        <div className="max-w-md w-full ekr-glass-panel rounded-2xl p-6 sm:p-8 text-center space-y-6">
          <div className="flex justify-center">
            <EveryKrAnimatedLogo variant="compact" imgClassName="h-8 sm:h-9" />
          </div>

          <div className="w-12 h-12 rounded-2xl ekr-glass-subtle text-[#0754B8] dark:text-[#60A5FA] flex items-center justify-center mx-auto">
            <Lock className="w-5 h-5" />
          </div>

          <div className="space-y-2">
            <h1 className="text-xl sm:text-2xl font-bold text-[#10213D] dark:text-white tracking-tight">
              Sign In to View Property Details
            </h1>
            <p className="text-xs sm:text-sm text-[#526685] dark:text-[#B8C9E5] leading-relaxed">
              Please log in or register an account to view full property details, photographs, address map, and inquiry options.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-1">
            <button
              type="button"
              onClick={() => {
                setAuthModalMode('login');
                setIsAuthModalOpen(true);
              }}
              className="ekr-glass-btn-primary flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              <span>Login</span>
            </button>

            <button
              type="button"
              onClick={() => {
                navigate(`/register?redirect=${encodeURIComponent(intendedDestination)}`);
              }}
              className="ekr-glass-subtle flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-xs font-bold text-[#10213D] dark:text-white transition-all cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Register</span>
            </button>
          </div>
        </div>
      </section>
    );
  }

  // Not found or unapproved listing guard
  if (!listing) {
    return (
      <section className="py-16 min-h-[75vh] bg-transparent px-4">
        <div className="max-w-xl mx-auto ekr-glass-panel rounded-2xl p-8 text-center space-y-4">
          <Home className="w-8 h-8 text-[#526685] dark:text-[#B8C9E5] mx-auto" />
          <h1 className="text-lg font-bold text-[#10213D] dark:text-white">
            Property Not Available
          </h1>
          <p className="text-xs text-[#526685] dark:text-[#B8C9E5] leading-relaxed">
            This accommodation listing does not exist, is awaiting administrator approval, or is no longer available.
          </p>
          <button
            type="button"
            onClick={() => navigate('/housing')}
            className="ekr-glass-btn-primary inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Accommodation</span>
          </button>
        </div>
      </section>
    );
  }

  const photos =
    Array.isArray(listing.photos) && listing.photos.length > 0
      ? listing.photos
      : ['/src/assets/images/korea_student_housing_1794049412879.jpg'];

  const activePhoto = photos[selectedPhotoIdx] || photos[0];
  const monthlyRent = Number(listing.monthlyRent ?? listing.monthlyRentKRW ?? 0);
  const securityDeposit = Number(listing.securityDeposit ?? listing.depositKRW ?? 0);
  const accommodationType = listing.accommodationType || listing.roomType;
  const availabilityStatus = listing.availability || 'Available';
  const approvalStatus = listing.approvalStatus || 'Approved';
  const facilities =
    Array.isArray(listing.facilities) && listing.facilities.length > 0
      ? listing.facilities
      : Array.isArray(listing.amenities) && listing.amenities.length > 0
      ? listing.amenities
      : [];

  const fullAddress =
    listing.address && listing.address.trim().length > 0
      ? listing.address.trim()
      : listing.district && listing.district.trim().length > 0
      ? `${listing.district}, ${listing.city}, South Korea`
      : `${listing.city}, South Korea`;

  const hasCoordinates =
    typeof listing.latitude === 'number' &&
    !Number.isNaN(listing.latitude) &&
    typeof listing.longitude === 'number' &&
    !Number.isNaN(listing.longitude);

  const mapQuery = hasCoordinates
    ? `${listing.latitude},${listing.longitude}`
    : `${fullAddress}`;

  const mapEmbedUrl = `https://maps.google.com/maps?q=${encodeURIComponent(mapQuery)}&t=&z=15&ie=UTF8&iwloc=&output=embed`;
  const googleMapsExternalUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`;

  const handleInquirySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inquiryMessage.trim() || !currentUser) return;

    setIsSendingInquiry(true);
    try {
      await submitAccommodationInquiryDoc({
        propertyId: listing.propertyId || listing.id,
        propertyTitle: listing.title,
        userId: currentUser.id,
        userName: inquiryName.trim() || currentUser.name,
        userEmail: inquiryEmail.trim() || currentUser.email,
        userPhone: inquiryPhone.trim(),
        moveInDate: moveInDate.trim(),
        message: inquiryMessage.trim()
      });
      setInquirySubmitted(true);
      setInquiryMessage('');
      showToast('Your accommodation inquiry has been sent.');
    } catch {
      showToast('Could not submit inquiry. Please try again.');
    } finally {
      setIsSendingInquiry(false);
    }
  };

  return (
    <section className="py-8 sm:py-12 min-h-[82vh] bg-transparent transition-colors duration-200">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Top Back Navigation */}
        <div className="flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => navigate('/housing')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#526685] dark:text-[#B8C9E5] hover:text-[#0754B8] dark:hover:text-white cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Accommodation Listings</span>
          </button>

          {isAdminUser && approvalStatus !== 'Approved' && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-100/90 text-amber-900 text-xs font-bold">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Admin Preview — Status: {approvalStatus}</span>
            </div>
          )}
        </div>

        {/* Property Photographs Gallery */}
        <div className="ekr-glass-panel rounded-2xl overflow-hidden">
          <div className="aspect-16/9 w-full bg-slate-900/10 dark:bg-slate-950/40 overflow-hidden">
            <img
              src={activePhoto}
              alt={listing.title}
              className="w-full h-full object-cover"
            />
          </div>

          {photos.length > 1 && (
            <div className="p-3 border-t border-white/40 dark:border-white/10 flex items-center gap-2.5 overflow-x-auto">
              {photos.map((photoUrl, idx) => (
                <button
                  key={`${photoUrl}-${idx}`}
                  type="button"
                  onClick={() => setSelectedPhotoIdx(idx)}
                  className={`w-20 h-14 rounded-lg overflow-hidden border-2 shrink-0 transition-all cursor-pointer ${
                    selectedPhotoIdx === idx
                      ? 'border-[#0875E8] dark:border-[#60A5FA] opacity-100'
                      : 'border-transparent opacity-65 hover:opacity-100'
                  }`}
                >
                  <img
                    src={photoUrl}
                    alt={`${listing.title} photo ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left 7 Columns: Property Details, Facilities, Description, Map */}
          <div className="lg:col-span-7 space-y-6">
            {/* Title, Key Pricing & Core Metadata */}
            <div className="ekr-glass-panel rounded-2xl p-6 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold text-[#0754B8] dark:text-[#60A5FA] bg-blue-500/10 dark:bg-blue-400/15 px-2.5 py-1 rounded-md">
                  {accommodationType}
                </span>

                <span
                  className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-md ${
                    availabilityStatus === 'Available'
                      ? 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-300'
                      : 'ekr-glass-subtle text-[#526685] dark:text-[#B8C9E5]'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{availabilityStatus}</span>
                </span>
              </div>

              <h1 className="text-xl sm:text-2xl font-bold text-[#10213D] dark:text-white tracking-tight">
                {listing.title}
              </h1>

              <div className="flex items-start gap-2 text-xs sm:text-sm text-[#526685] dark:text-[#B8C9E5]">
                <MapPin className="w-4 h-4 text-[#0754B8] dark:text-[#60A5FA] shrink-0 mt-0.5" />
                <span>{fullAddress}</span>
              </div>

              {/* Rent & Deposit Summary */}
              <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-200/60 dark:border-white/10">
                <div className="p-3.5 rounded-xl ekr-glass-subtle">
                  <div className="text-[11px] font-medium text-[#526685] dark:text-[#B8C9E5]">
                    Monthly Rent
                  </div>
                  <div className="text-lg font-bold text-[#10213D] dark:text-white tabular-nums mt-0.5">
                    ₩{monthlyRent.toLocaleString()}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl ekr-glass-subtle">
                  <div className="text-[11px] font-medium text-[#526685] dark:text-[#B8C9E5]">
                    Security Deposit
                  </div>
                  <div className="text-lg font-bold text-[#10213D] dark:text-white tabular-nums mt-0.5">
                    ₩{securityDeposit.toLocaleString()}
                  </div>
                </div>
              </div>
            </div>

            {/* Room Information & Property Description */}
            <div className="ekr-glass-panel rounded-2xl p-6 space-y-5">
              {listing.roomDetails && listing.roomDetails.trim().length > 0 && (
                <div className="space-y-1.5">
                  <h2 className="text-sm font-bold text-[#10213D] dark:text-white">
                    Available Room Information
                  </h2>
                  <p className="text-xs sm:text-sm text-[#526685] dark:text-[#B8C9E5] leading-relaxed">
                    {listing.roomDetails}
                  </p>
                </div>
              )}

              {listing.description && listing.description.trim().length > 0 && (
                <div className="space-y-1.5">
                  <h2 className="text-sm font-bold text-[#10213D] dark:text-white">
                    Property Description
                  </h2>
                  <p className="text-xs sm:text-sm text-[#526685] dark:text-[#B8C9E5] leading-relaxed whitespace-pre-line">
                    {listing.description}
                  </p>
                </div>
              )}

              {/* Facilities & Included Utilities (Shown only if provided) */}
              {facilities.length > 0 && (
                <div className="space-y-2.5 pt-2 border-t border-slate-200/60 dark:border-white/10">
                  <h2 className="text-sm font-bold text-[#10213D] dark:text-white">
                    Facilities &amp; Included Utilities
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {facilities.map(item => (
                      <div
                        key={item}
                        className="flex items-center gap-2 text-xs text-[#10213D] dark:text-slate-200 ekr-glass-subtle px-3 py-2 rounded-lg"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Clean Location Map Using Verified Address or Coordinates */}
            <div className="ekr-glass-panel rounded-2xl p-6 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-bold text-[#10213D] dark:text-white">
                    Location Map
                  </h2>
                  <p className="text-xs text-[#526685] dark:text-[#B8C9E5] mt-0.5">
                    {fullAddress}
                  </p>
                </div>
                <a
                  href={googleMapsExternalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#0754B8] dark:text-[#60A5FA] hover:underline shrink-0"
                >
                  <span>Open Map</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              <div className="w-full h-64 rounded-xl overflow-hidden border border-white/50 dark:border-white/10 bg-slate-100/60 dark:bg-slate-900/50">
                <iframe
                  title={`Map for ${listing.title}`}
                  src={mapEmbedUrl}
                  className="w-full h-full border-0"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
            </div>
          </div>

          {/* Right 5 Columns: Contact & Inquiry Option */}
          <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-24">
            <div className="ekr-glass-panel rounded-2xl p-6 space-y-5">
              <div>
                <h2 className="text-base font-bold text-[#10213D] dark:text-white">
                  Contact &amp; Property Inquiry
                </h2>
                <p className="text-xs text-[#526685] dark:text-[#B8C9E5] mt-1">
                  Inquire directly about room availability, viewing schedule, or lease terms.
                </p>
              </div>

              {/* Direct Contact Info if provided */}
              {(listing.landlordPhone || listing.contactEmail) && (
                <div className="p-3.5 rounded-xl ekr-glass-subtle space-y-2 text-xs">
                  {listing.landlordPhone && (
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                        <Phone className="w-3.5 h-3.5" />
                        <span>Contact Phone</span>
                      </span>
                      <a
                        href={`tel:${listing.landlordPhone}`}
                        className="font-mono font-bold text-[#10243A] dark:text-white hover:underline"
                      >
                        {listing.landlordPhone}
                      </a>
                    </div>
                  )}
                  {listing.contactEmail && (
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                        <Mail className="w-3.5 h-3.5" />
                        <span>Contact Email</span>
                      </span>
                      <a
                        href={`mailto:${listing.contactEmail}?subject=${encodeURIComponent(`Accommodation Inquiry: ${listing.title}`)}`}
                        className="font-semibold text-[#1769AA] dark:text-blue-400 hover:underline truncate max-w-[180px]"
                      >
                        {listing.contactEmail}
                      </a>
                    </div>
                  )}
                </div>
              )}

              {inquirySubmitted ? (
                <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/70 space-y-2 text-xs">
                  <div className="flex items-center gap-2 font-bold text-emerald-800 dark:text-emerald-300">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Inquiry Sent Successfully</span>
                  </div>
                  <p className="text-emerald-700 dark:text-emerald-300/90 leading-relaxed">
                    Your inquiry for <strong>{listing.title}</strong> has been recorded.
                  </p>
                  <button
                    type="button"
                    onClick={() => setInquirySubmitted(false)}
                    className="text-xs font-bold text-emerald-800 dark:text-emerald-300 underline cursor-pointer pt-1"
                  >
                    Send another message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleInquirySubmit} className="space-y-3.5 text-xs">
                  <div>
                    <label className="block font-semibold text-[#10213D] dark:text-slate-200 mb-1">
                      Your Name
                    </label>
                    <input
                      type="text"
                      required
                      value={inquiryName}
                      onChange={e => setInquiryName(e.target.value)}
                      className="ekr-glass-input w-full px-3 py-2 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-[#10213D] dark:text-slate-200 mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      required
                      value={inquiryEmail}
                      onChange={e => setInquiryEmail(e.target.value)}
                      className="ekr-glass-input w-full px-3 py-2 rounded-lg"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block font-semibold text-[#10213D] dark:text-slate-200 mb-1">
                        Phone (Optional)
                      </label>
                      <input
                        type="text"
                        value={inquiryPhone}
                        onChange={e => setInquiryPhone(e.target.value)}
                        placeholder="010-XXXX-XXXX"
                        className="ekr-glass-input w-full px-3 py-2 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-[#10213D] dark:text-slate-200 mb-1">
                        Preferred Move-In
                      </label>
                      <input
                        type="date"
                        value={moveInDate}
                        onChange={e => setMoveInDate(e.target.value)}
                        className="ekr-glass-input w-full px-3 py-2 rounded-lg"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-[#10213D] dark:text-slate-200 mb-1">
                      Message
                    </label>
                    <textarea
                      rows={3}
                      required
                      value={inquiryMessage}
                      onChange={e => setInquiryMessage(e.target.value)}
                      placeholder="Ask about availability, lease duration, or viewing times..."
                      className="ekr-glass-input w-full px-3 py-2 rounded-lg"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSendingInquiry}
                    className="ekr-glass-btn-primary w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg font-bold transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isSendingInquiry ? 'Sending Inquiry...' : 'Send Inquiry'}</span>
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
