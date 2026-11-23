import React, { useState, useEffect, useCallback } from 'react';
import {
  Siren,
  Building2,
  ShieldAlert,
  Users,
  Store,
  Compass,
  Plane,
  Newspaper,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  RefreshCw
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  KoreaEmergencyContact,
  KoreaImmigrationOffice,
  KoreaPoliceStation,
  KoreanLifeGuideArticle,
  AirportToCityRoute,
  EssentialNewsItem,
  EMERGENCY_CATEGORIES,
  NEWS_CATEGORIES_10
} from '../../data/essentialHubData';
import {
  ESSENTIAL_HUB_COLLECTIONS,
  EssentialCommunityPost,
  EssentialMarketplaceListing,
  fetchEmergencyContacts,
  fetchImmigrationOffices,
  fetchPoliceStations,
  fetchKoreanLifeGuides,
  fetchAirportTransportRoutes,
  fetchEssentialNewsUpdates,
  fetchEssentialCommunityPosts,
  fetchEssentialMarketplaceListings,
  saveEssentialHubRecord,
  deleteEssentialHubRecord,
  deleteEssentialCommunityPost,
  deleteEssentialMarketplaceListing,
  updateEssentialMarketplaceListingStatus
} from '../../services/essentialHubService';
import { openInNaverMap, openInKakaoMap } from '../../utils/koreaMapService';

type AdminEssentialSubTab =
  | 'emergency'
  | 'immigration'
  | 'police'
  | 'community'
  | 'marketplace'
  | 'lifeguide'
  | 'airport'
  | 'news';

export const AdminEssentialHubTab: React.FC = () => {
  const { currentUser, showToast } = useApp();
  const [subTab, setSubTab] = useState<AdminEssentialSubTab>('emergency');
  const [loading, setLoading] = useState(false);

  const [emergencyContacts, setEmergencyContacts] = useState<KoreaEmergencyContact[]>([]);
  const [immigrationOffices, setImmigrationOffices] = useState<KoreaImmigrationOffice[]>([]);
  const [policeStations, setPoliceStations] = useState<KoreaPoliceStation[]>([]);
  const [lifeGuides, setLifeGuides] = useState<KoreanLifeGuideArticle[]>([]);
  const [airportRoutes, setAirportRoutes] = useState<AirportToCityRoute[]>([]);
  const [newsUpdates, setNewsUpdates] = useState<EssentialNewsItem[]>([]);
  const [communityPosts, setCommunityPosts] = useState<EssentialCommunityPost[]>([]);
  const [marketplaceListings, setMarketplaceListings] = useState<EssentialMarketplaceListing[]>([]);

  // Quick Add Forms
  const [newEmergencyName, setNewEmergencyName] = useState('');
  const [newEmergencyKo, setNewEmergencyKo] = useState('');
  const [newEmergencyPhone, setNewEmergencyPhone] = useState('');
  const [newEmergencyCategory, setNewEmergencyCategory] = useState(EMERGENCY_CATEGORIES[0]);

  const [newNewsTitle, setNewNewsTitle] = useState('');
  const [newNewsCategory, setNewNewsCategory] = useState(NEWS_CATEGORIES_10[0]);
  const [newNewsSummary, setNewNewsSummary] = useState('');
  const [newNewsSource, setNewNewsSource] = useState('Ministry of Justice / Study in Korea');
  const [newNewsOfficial, setNewNewsOfficial] = useState(true);

  const adminUid = currentUser?.id || 'admin';
  const adminName = currentUser?.fullName || currentUser?.name || 'Administrator';
  const adminEmail = currentUser?.email || 'admin@everykr.com';

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [em, imm, pol, lg, air, nw, comm, mkt] = await Promise.all([
        fetchEmergencyContacts(true),
        fetchImmigrationOffices(true),
        fetchPoliceStations(true),
        fetchKoreanLifeGuides(true),
        fetchAirportTransportRoutes(true),
        fetchEssentialNewsUpdates(true),
        fetchEssentialCommunityPosts(),
        fetchEssentialMarketplaceListings()
      ]);
      setEmergencyContacts(em);
      setImmigrationOffices(imm);
      setPoliceStations(pol);
      setLifeGuides(lg);
      setAirportRoutes(air);
      setNewsUpdates(nw);
      setCommunityPosts(comm);
      setMarketplaceListings(mkt);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const handleTogglePublish = async <T extends { id: string; published: boolean }>(
    collectionName: string,
    record: T,
    targetName: string
  ) => {
    await saveEssentialHubRecord({
      collectionName,
      record: { ...record, published: !record.published },
      targetName,
      adminUid,
      adminName,
      adminEmail
    });
    showToast(
      `"${targetName}" ${!record.published ? 'published' : 'archived'}.`
    );
    loadAll();
  };

  const handleDeleteRecord = async (
    collectionName: string,
    recordId: string,
    targetName: string
  ) => {
    await deleteEssentialHubRecord({
      collectionName,
      recordId,
      targetName,
      adminUid,
      adminName,
      adminEmail
    });
    showToast(`Deleted "${targetName}".`);
    loadAll();
  };

  const handleAddEmergencyContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmergencyName.trim() || !newEmergencyPhone.trim()) return;
    const today = new Date().toISOString().slice(0, 10);
    const record: KoreaEmergencyContact = {
      id: `em_custom_${Date.now()}`,
      serviceNameEn: newEmergencyName.trim(),
      serviceNameKo: newEmergencyKo.trim() || newEmergencyName.trim(),
      phoneNumber: newEmergencyPhone.trim(),
      dialHref: `tel:${newEmergencyPhone.replace(/[^0-9+]/g, '')}`,
      category: newEmergencyCategory,
      descriptionEn: 'Official South Korea emergency/support hotline.',
      descriptionKo: '대한민국 공식 긴급 및 외국인 지원 안내 전화',
      languagesSupported: ['Korean', 'English'],
      operatingHours: '24 Hours / 365 Days',
      officialAgency: 'Public Agency',
      officialWebsite: 'https://www.hikorea.go.kr',
      verificationStatus: 'VERIFIED',
      lastVerifiedDate: today,
      published: true
    };
    await saveEssentialHubRecord({
      collectionName: ESSENTIAL_HUB_COLLECTIONS.emergencyContacts,
      record,
      targetName: record.serviceNameEn,
      adminUid,
      adminName,
      adminEmail
    });
    setNewEmergencyName('');
    setNewEmergencyKo('');
    setNewEmergencyPhone('');
    showToast('Emergency hotline added and published.');
    loadAll();
  };

  const handleAddNewsUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNewsTitle.trim() || !newNewsSummary.trim()) return;
    const today = new Date().toISOString().slice(0, 10);
    const record: EssentialNewsItem = {
      id: `news_custom_${Date.now()}`,
      headlineEn: newNewsTitle.trim(),
      headlineKo: newNewsTitle.trim(),
      summaryEn: newNewsSummary.trim(),
      summaryBn: newNewsSummary.trim(),
      summaryKo: newNewsSummary.trim(),
      summaryNe: newNewsSummary.trim(),
      fullDetailsEn: [newNewsSummary.trim()],
      category: newNewsCategory,
      sourceName: newNewsSource.trim(),
      sourceUrl: 'https://www.studyinkorea.go.kr',
      sourceType: newNewsOfficial
        ? 'Official Government / Public Agency'
        : 'Verified Public Information',
      publicationDate: today,
      lastVerifiedDate: today,
      featured: false,
      verificationStatus: 'VERIFIED',
      published: true
    };
    await saveEssentialHubRecord({
      collectionName: ESSENTIAL_HUB_COLLECTIONS.newsUpdates,
      record,
      targetName: record.headlineEn,
      adminUid,
      adminName,
      adminEmail
    });
    setNewNewsTitle('');
    setNewNewsSummary('');
    showToast('Official news announcement published.');
    loadAll();
  };

  const tabs: Array<{ id: AdminEssentialSubTab; label: string; count: number; icon: any }> = [
    { id: 'emergency', label: '1. Emergency Numbers', count: emergencyContacts.length, icon: Siren },
    { id: 'immigration', label: '2. Immigration Offices', count: immigrationOffices.length, icon: Building2 },
    { id: 'police', label: '3. Police Stations', count: policeStations.length, icon: ShieldAlert },
    { id: 'community', label: '4. Community Posts', count: communityPosts.length, icon: Users },
    { id: 'marketplace', label: '5. Marketplace', count: marketplaceListings.length, icon: Store },
    { id: 'lifeguide', label: '6. Korean Life Guide', count: lifeGuides.length, icon: Compass },
    { id: 'airport', label: '7. Airport Transport', count: airportRoutes.length, icon: Plane },
    { id: 'news', label: '8. News & Updates', count: newsUpdates.length, icon: Newspaper }
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-[#10243A] rounded-2xl p-5 border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-extrabold text-[#10243A] dark:text-white">
              Essential Hub — 8-Module Admin Control Center (Naver & Kakao Map Verified)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Create, verify, publish, archive, and moderate all 8 Essential Hub modules with automatic audit logging.
            </p>
          </div>
          <button
            type="button"
            onClick={loadAll}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-[#10243A] dark:text-white cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Records</span>
          </button>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {tabs.map((tItem) => {
            const Icon = tItem.icon;
            const active = subTab === tItem.id;
            return (
              <button
                key={tItem.id}
                type="button"
                onClick={() => setSubTab(tItem.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer border ${
                  active
                    ? 'bg-[#10243A] text-white border-[#10243A] dark:bg-[#19B6A4] dark:text-[#10243A]'
                    : 'bg-slate-50 dark:bg-[#0B1523] text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tItem.label}</span>
                <span className="opacity-75 font-mono">({tItem.count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 1. Emergency Contacts Admin */}
      {subTab === 'emergency' && (
        <div className="space-y-4">
          <form
            onSubmit={handleAddEmergencyContact}
            className="bg-white dark:bg-[#10243A] rounded-2xl p-5 border border-slate-200 dark:border-slate-800 grid grid-cols-1 md:grid-cols-5 gap-3"
          >
            <input
              type="text"
              value={newEmergencyName}
              onChange={(e) => setNewEmergencyName(e.target.value)}
              placeholder="Service Name (English)"
              required
              className="h-10 px-3 text-xs rounded-xl bg-slate-50 dark:bg-[#0B1523] border border-slate-200 dark:border-slate-700"
            />
            <input
              type="text"
              value={newEmergencyKo}
              onChange={(e) => setNewEmergencyKo(e.target.value)}
              placeholder="Korean Name (한국어)"
              className="h-10 px-3 text-xs rounded-xl bg-slate-50 dark:bg-[#0B1523] border border-slate-200 dark:border-slate-700"
            />
            <input
              type="text"
              value={newEmergencyPhone}
              onChange={(e) => setNewEmergencyPhone(e.target.value)}
              placeholder="Phone (e.g., 112, 1345)"
              required
              className="h-10 px-3 text-xs rounded-xl bg-slate-50 dark:bg-[#0B1523] border border-slate-200 dark:border-slate-700"
            />
            <select
              value={newEmergencyCategory}
              onChange={(e) => setNewEmergencyCategory(e.target.value as any)}
              className="h-10 px-3 text-xs rounded-xl bg-slate-50 dark:bg-[#0B1523] border border-slate-200 dark:border-slate-700"
            >
              {EMERGENCY_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="h-10 px-4 rounded-xl text-xs font-extrabold bg-[#1769AA] text-white inline-flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Hotline</span>
            </button>
          </form>

          <div className="bg-white dark:bg-[#10243A] rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {emergencyContacts.map((c) => (
                <div
                  key={c.id}
                  className="p-4 flex flex-wrap items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <span className="font-mono font-black text-sm text-[#1769AA] dark:text-[#19B6A4] mr-2">
                      {c.phoneNumber}
                    </span>
                    <strong className="text-[#10243A] dark:text-white">{c.serviceNameEn}</strong>{' '}
                    <span className="text-slate-400">({c.category})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-lg font-bold bg-emerald-100 text-emerald-800">
                      {c.verificationStatus}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        handleTogglePublish(
                          ESSENTIAL_HUB_COLLECTIONS.emergencyContacts,
                          c,
                          c.serviceNameEn
                        )
                      }
                      className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 cursor-pointer"
                      title={c.published ? 'Archive' : 'Publish'}
                    >
                      {c.published ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        handleDeleteRecord(
                          ESSENTIAL_HUB_COLLECTIONS.emergencyContacts,
                          c.id,
                          c.serviceNameEn
                        )
                      }
                      className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 2. Immigration Offices Admin */}
      {subTab === 'immigration' && (
        <div className="bg-white dark:bg-[#10243A] rounded-2xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
          {immigrationOffices.map((o) => (
            <div
              key={o.id}
              className="p-4 flex flex-wrap items-center justify-between gap-3 text-xs"
            >
              <div>
                <strong className="text-[#10243A] dark:text-white">{o.officeNameEn}</strong>{' '}
                <span className="text-slate-500">
                  ({o.city}, {o.province}) — {o.addressEn}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    openInNaverMap({
                      nameEn: o.officeNameEn,
                      nameKo: o.officeNameKo,
                      addressEn: o.addressEn,
                      addressKo: o.addressKo,
                      city: o.city,
                      province: o.province,
                      lat: o.lat,
                      lng: o.lng
                    })
                  }
                  className="px-2.5 py-1 rounded-lg font-bold bg-[#03C75A] text-white cursor-pointer"
                >
                  Test Naver Map
                </button>
                <button
                  type="button"
                  onClick={() =>
                    openInKakaoMap({
                      nameEn: o.officeNameEn,
                      nameKo: o.officeNameKo,
                      addressEn: o.addressEn,
                      addressKo: o.addressKo,
                      city: o.city,
                      province: o.province,
                      lat: o.lat,
                      lng: o.lng
                    })
                  }
                  className="px-2.5 py-1 rounded-lg font-bold bg-[#FEE500] text-[#191919] cursor-pointer"
                >
                  Test Kakao Map
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleTogglePublish(
                      ESSENTIAL_HUB_COLLECTIONS.immigrationOffices,
                      o,
                      o.officeNameEn
                    )
                  }
                  className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 cursor-pointer"
                >
                  {o.published ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 3. Police Stations Admin */}
      {subTab === 'police' && (
        <div className="bg-white dark:bg-[#10243A] rounded-2xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
          {policeStations.map((p) => (
            <div
              key={p.id}
              className="p-4 flex flex-wrap items-center justify-between gap-3 text-xs"
            >
              <div>
                <strong className="text-[#10243A] dark:text-white">{p.stationNameEn}</strong>{' '}
                <span className="text-slate-500">
                  ({p.district}, {p.city}) — {p.addressEn}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    openInNaverMap({
                      nameEn: p.stationNameEn,
                      nameKo: p.stationNameKo,
                      addressEn: p.addressEn,
                      addressKo: p.addressKo,
                      city: p.city,
                      province: p.province,
                      lat: p.lat,
                      lng: p.lng
                    })
                  }
                  className="px-2.5 py-1 rounded-lg font-bold bg-[#03C75A] text-white cursor-pointer"
                >
                  Naver Map
                </button>
                <button
                  type="button"
                  onClick={() =>
                    openInKakaoMap({
                      nameEn: p.stationNameEn,
                      nameKo: p.stationNameKo,
                      addressEn: p.addressEn,
                      addressKo: p.addressKo,
                      city: p.city,
                      province: p.province,
                      lat: p.lat,
                      lng: p.lng
                    })
                  }
                  className="px-2.5 py-1 rounded-lg font-bold bg-[#FEE500] text-[#191919] cursor-pointer"
                >
                  Kakao Map
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleTogglePublish(
                      ESSENTIAL_HUB_COLLECTIONS.policeStations,
                      p,
                      p.stationNameEn
                    )
                  }
                  className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 cursor-pointer"
                >
                  {p.published ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 4. Community Moderation */}
      {subTab === 'community' && (
        <div className="bg-white dark:bg-[#10243A] rounded-2xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
          {communityPosts.map((post) => (
            <div
              key={post.id}
              className="p-4 flex flex-wrap items-center justify-between gap-3 text-xs"
            >
              <div>
                <span className="font-bold text-[#1769AA] mr-2">[{post.channel}]</span>
                <strong className="text-[#10243A] dark:text-white">{post.title}</strong>
                <span className="text-slate-400 ml-2">
                  by {post.authorName} ({post.city})
                </span>
              </div>
              <button
                type="button"
                onClick={async () => {
                  await deleteEssentialCommunityPost(post.id);
                  showToast('Community post removed by moderator.');
                  loadAll();
                }}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-50 text-rose-600 cursor-pointer"
              >
                Remove Post
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 5. Marketplace Moderation */}
      {subTab === 'marketplace' && (
        <div className="bg-white dark:bg-[#10243A] rounded-2xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
          {marketplaceListings.map((item) => (
            <div
              key={item.id}
              className="p-4 flex flex-wrap items-center justify-between gap-3 text-xs"
            >
              <div>
                <strong className="text-[#10243A] dark:text-white">{item.title}</strong> —{' '}
                <span className="font-mono font-bold text-[#1769AA]">
                  ₩{item.priceKRW.toLocaleString()}
                </span>{' '}
                <span className="text-slate-400">
                  ({item.city} · {item.status})
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    await updateEssentialMarketplaceListingStatus(item.id, 'Sold');
                    loadAll();
                  }}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 font-semibold cursor-pointer"
                >
                  Mark Sold
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await deleteEssentialMarketplaceListing(item.id);
                    showToast('Listing removed.');
                    loadAll();
                  }}
                  className="p-1.5 rounded-lg text-rose-600 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 6. Korean Life Guide Admin */}
      {subTab === 'lifeguide' && (
        <div className="bg-white dark:bg-[#10243A] rounded-2xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
          {lifeGuides.map((g) => (
            <div
              key={g.id}
              className="p-4 flex flex-wrap items-center justify-between gap-3 text-xs"
            >
              <div>
                <span className="font-bold text-[#1769AA] mr-2">
                  [{g.categoryCode}. {g.category}]
                </span>
                <strong className="text-[#10243A] dark:text-white">{g.titleEn}</strong>
              </div>
              <button
                type="button"
                onClick={() =>
                  handleTogglePublish(ESSENTIAL_HUB_COLLECTIONS.lifeGuides, g, g.titleEn)
                }
                className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 cursor-pointer"
              >
                {g.published ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 7. Airport Transport Routes Admin */}
      {subTab === 'airport' && (
        <div className="bg-white dark:bg-[#10243A] rounded-2xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
          {airportRoutes.map((r) => (
            <div
              key={r.id}
              className="p-4 flex flex-wrap items-center justify-between gap-3 text-xs"
            >
              <div>
                <span className="font-mono font-bold text-[#1769AA] mr-2">
                  {r.airportCode} → {r.destinationCity}
                </span>
                <strong className="text-[#10243A] dark:text-white">
                  {r.transportOptions.length} Transport Options Verified
                </strong>
              </div>
              <button
                type="button"
                onClick={() =>
                  handleTogglePublish(
                    ESSENTIAL_HUB_COLLECTIONS.airportRoutes,
                    r,
                    `${r.airportCode} to ${r.destinationCity}`
                  )
                }
                className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 cursor-pointer"
              >
                {r.published ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 8. News & Updates Admin */}
      {subTab === 'news' && (
        <div className="space-y-4">
          <form
            onSubmit={handleAddNewsUpdate}
            className="bg-white dark:bg-[#10243A] rounded-2xl p-5 border border-slate-200 dark:border-slate-800 space-y-3"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input
                type="text"
                value={newNewsTitle}
                onChange={(e) => setNewNewsTitle(e.target.value)}
                placeholder="Announcement Title"
                required
                className="h-10 px-3 text-xs rounded-xl bg-slate-50 dark:bg-[#0B1523] border border-slate-200 dark:border-slate-700"
              />
              <select
                value={newNewsCategory}
                onChange={(e) => setNewNewsCategory(e.target.value as any)}
                className="h-10 px-3 text-xs rounded-xl bg-slate-50 dark:bg-[#0B1523] border border-slate-200 dark:border-slate-700"
              >
                {NEWS_CATEGORIES_10.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={newNewsSource}
                onChange={(e) => setNewNewsSource(e.target.value)}
                placeholder="Source Organization"
                className="h-10 px-3 text-xs rounded-xl bg-slate-50 dark:bg-[#0B1523] border border-slate-200 dark:border-slate-700"
              />
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <input
                type="text"
                value={newNewsSummary}
                onChange={(e) => setNewNewsSummary(e.target.value)}
                placeholder="Summary of policy update or student announcement..."
                required
                className="flex-1 h-10 px-3 text-xs rounded-xl bg-slate-50 dark:bg-[#0B1523] border border-slate-200 dark:border-slate-700"
              />
              <label className="inline-flex items-center gap-2 text-xs font-bold">
                <input
                  type="checkbox"
                  checked={newNewsOfficial}
                  onChange={(e) => setNewNewsOfficial(e.target.checked)}
                />
                <span>Official Notice</span>
              </label>
              <button
                type="submit"
                className="h-10 px-4 rounded-xl text-xs font-extrabold bg-[#1769AA] text-white cursor-pointer"
              >
                Publish News
              </button>
            </div>
          </form>

          <div className="bg-white dark:bg-[#10243A] rounded-2xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
            {newsUpdates.map((n) => (
              <div
                key={n.id}
                className="p-4 flex flex-wrap items-center justify-between gap-3 text-xs"
              >
                <div>
                  <span className="font-bold text-[#1769AA] mr-2">[{n.category}]</span>
                  <strong className="text-[#10243A] dark:text-white">{n.headlineEn}</strong>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      handleTogglePublish(
                        ESSENTIAL_HUB_COLLECTIONS.newsUpdates,
                        n,
                        n.headlineEn
                      )
                    }
                    className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 cursor-pointer"
                  >
                    {n.published ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleDeleteRecord(
                        ESSENTIAL_HUB_COLLECTIONS.newsUpdates,
                        n.id,
                        n.headlineEn
                      )
                    }
                    className="p-1.5 rounded-lg text-rose-600 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
