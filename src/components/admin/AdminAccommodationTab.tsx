import React, { useState, useEffect, useMemo } from 'react';
import {
  AccommodationListing,
  AccommodationApprovalStatus,
  AccommodationAvailabilityStatus,
  AccommodationTypeOption
} from '../../types';
import {
  fetchAdminAllAccommodations,
  createAccommodationDoc,
  updateAccommodationDoc,
  adminSetAccommodationStatusDoc,
  deleteAccommodationDoc,
  uploadAccommodationPhoto,
  createAuditLogDoc
} from '../../services/firebaseService';
import { useApp } from '../../context/AppContext';
import { isSuperAdmin } from '../../utils/seoRoutes';
import {
  Plus,
  Edit3,
  Eye,
  Check,
  X,
  Archive,
  EyeOff,
  Trash2,
  Upload,
  MapPin,
  Search,
  RefreshCw,
  ShieldCheck,
  Clock,
  CheckCircle2,
  XCircle,
  ExternalLink
} from 'lucide-react';

const STATUS_TABS: Array<'All' | AccommodationApprovalStatus> = [
  'All',
  'Pending',
  'Approved',
  'Rejected',
  'Unavailable',
  'Archived'
];

const ACCOMMODATION_TYPES: AccommodationTypeOption[] = [
  'Dormitory',
  'One-room',
  'Studio',
  'Shared Room',
  'Goshiwon',
  'Short-term'
];

const CITIES = [
  'Seoul',
  'Busan',
  'Daejeon',
  'Incheon',
  'Suwon',
  'Daegu',
  'Gwangju',
  'Ulsan',
  'Jeonju',
  'Cheonan',
  'Pohang',
  'Chuncheon'
];

interface FormState {
  propertyId: string;
  title: string;
  monthlyRent: number;
  securityDeposit: number;
  city: string;
  address: string;
  latitude: string;
  longitude: string;
  accommodationType: AccommodationTypeOption;
  roomDetails: string;
  facilitiesInput: string;
  facilities: string[];
  description: string;
  availability: AccommodationAvailabilityStatus;
  landlordPhone: string;
  contactEmail: string;
  photos: string[];
  photoUrlInput: string;
  requireReapprovalOnEdit: boolean;
}

const INITIAL_FORM_STATE: FormState = {
  propertyId: '',
  title: '',
  monthlyRent: 450000,
  securityDeposit: 3000000,
  city: 'Seoul',
  address: '',
  latitude: '',
  longitude: '',
  accommodationType: 'One-room',
  roomDetails: '',
  facilitiesInput: '',
  facilities: ['Air Conditioner', 'Washing Machine', 'Wi-Fi', 'Refrigerator'],
  description: '',
  availability: 'Available',
  landlordPhone: '',
  contactEmail: '',
  photos: [],
  photoUrlInput: '',
  requireReapprovalOnEdit: true
};

export const AdminAccommodationTab: React.FC = () => {
  const {
    currentUser,
    isServerVerifiedAdmin,
    refreshAccommodations,
    showToast
  } = useApp();

  const isAuthorizedAdmin = isSuperAdmin(currentUser, isServerVerifiedAdmin);

  const [listings, setListings] = useState<AccommodationListing[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<'All' | AccommodationApprovalStatus>('All');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Form / Modal / Preview states
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [editingListing, setEditingListing] = useState<AccommodationListing | null>(null);
  const [form, setForm] = useState<FormState>(INITIAL_FORM_STATE);
  const [isUploadingPhotos, setIsUploadingPhotos] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [previewListing, setPreviewListing] = useState<AccommodationListing | null>(null);

  const loadAllListings = async () => {
    if (!isAuthorizedAdmin) return;
    setIsLoading(true);
    try {
      const data = await fetchAdminAllAccommodations();
      setListings(data);
    } catch (err) {
      console.warn('Error loading admin accommodations:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAllListings();
  }, [isAuthorizedAdmin]);

  const counts = useMemo(() => {
    const map: Record<'All' | AccommodationApprovalStatus, number> = {
      All: listings.length,
      Pending: 0,
      Approved: 0,
      Rejected: 0,
      Unavailable: 0,
      Archived: 0
    };
    for (const item of listings) {
      const st = (item.approvalStatus || 'Pending') as AccommodationApprovalStatus;
      if (map[st] !== undefined) {
        map[st] += 1;
      }
    }
    return map;
  }, [listings]);

  const filteredListings = useMemo(() => {
    return listings.filter(item => {
      const st = (item.approvalStatus || 'Pending') as AccommodationApprovalStatus;
      const matchesStatus = statusFilter === 'All' || st === statusFilter;
      const q = searchTerm.trim().toLowerCase();
      const matchesSearch =
        !q ||
        item.title.toLowerCase().includes(q) ||
        item.city.toLowerCase().includes(q) ||
        (item.address || item.district || '').toLowerCase().includes(q) ||
        String(item.accommodationType || item.roomType || '').toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [listings, statusFilter, searchTerm]);

  if (!isAuthorizedAdmin) {
    return (
      <div className="bg-white rounded-xl border border-rose-200 p-8 text-center space-y-2">
        <h3 className="text-base font-bold text-rose-700">Unauthorized Access</h3>
        <p className="text-xs text-slate-600">
          Only verified EveryKR administrators are authorized to access Accommodation Management.
        </p>
      </div>
    );
  }

  const openCreateForm = () => {
    setEditingListing(null);
    setForm({
      ...INITIAL_FORM_STATE,
      propertyId: `acc-${Date.now()}`,
      contactEmail: currentUser?.email || 'housing@everykr.com'
    });
    setIsFormOpen(true);
  };

  const openEditForm = (item: AccommodationListing) => {
    setEditingListing(item);
    setForm({
      propertyId: item.propertyId || item.id,
      title: item.title || '',
      monthlyRent: Number(item.monthlyRent ?? item.monthlyRentKRW ?? 0),
      securityDeposit: Number(item.securityDeposit ?? item.depositKRW ?? 0),
      city: item.city || 'Seoul',
      address: item.address || item.district || '',
      latitude:
        typeof item.latitude === 'number' && !Number.isNaN(item.latitude)
          ? String(item.latitude)
          : '',
      longitude:
        typeof item.longitude === 'number' && !Number.isNaN(item.longitude)
          ? String(item.longitude)
          : '',
      accommodationType: (item.accommodationType || item.roomType || 'One-room') as AccommodationTypeOption,
      roomDetails: item.roomDetails || '',
      facilitiesInput: '',
      facilities:
        Array.isArray(item.facilities) && item.facilities.length > 0
          ? [...item.facilities]
          : Array.isArray(item.amenities)
          ? [...item.amenities]
          : [],
      description: item.description || '',
      availability: item.availability || 'Available',
      landlordPhone: item.landlordPhone || '',
      contactEmail: item.contactEmail || '',
      photos: Array.isArray(item.photos) ? [...item.photos] : [],
      photoUrlInput: '',
      requireReapprovalOnEdit: true
    });
    setIsFormOpen(true);
  };

  const handlePhotoFilesUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploadingPhotos(true);
    try {
      const uploadedUrls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const url = await uploadAccommodationPhoto(
          file,
          form.propertyId || `acc-${Date.now()}`
        );
        if (url) uploadedUrls.push(url);
      }
      setForm(prev => ({
        ...prev,
        photos: [...prev.photos, ...uploadedUrls]
      }));
      showToast(`Uploaded ${uploadedUrls.length} photograph(s)`);
    } catch {
      showToast('Could not upload photograph. Please try again.');
    } finally {
      setIsUploadingPhotos(false);
      e.target.value = '';
    }
  };

  const handleAddPhotoUrl = () => {
    const clean = form.photoUrlInput.trim();
    if (!clean) return;
    setForm(prev => ({
      ...prev,
      photos: [...prev.photos, clean],
      photoUrlInput: ''
    }));
  };

  const handleRemovePhoto = (idx: number) => {
    setForm(prev => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== idx)
    }));
  };

  const handleAddFacility = () => {
    const raw = form.facilitiesInput.trim();
    if (!raw) return;
    const parts = raw
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
    setForm(prev => ({
      ...prev,
      facilities: Array.from(new Set([...prev.facilities, ...parts])),
      facilitiesInput: ''
    }));
  };

  const handleRemoveFacility = (fac: string) => {
    setForm(prev => ({
      ...prev,
      facilities: prev.facilities.filter(f => f !== fac)
    }));
  };

  const buildDraftListingFromForm = (): AccommodationListing => {
    const id = form.propertyId || editingListing?.id || `acc-${Date.now()}`;
    const latNum = form.latitude.trim() ? Number(form.latitude.trim()) : null;
    const lngNum = form.longitude.trim() ? Number(form.longitude.trim()) : null;
    const photosList =
      form.photos.length > 0
        ? form.photos
        : ['/src/assets/images/korea_student_housing_1794049412879.jpg'];

    return {
      id,
      propertyId: id,
      title: form.title.trim() || 'Untitled Property',
      description: form.description.trim(),
      photos: photosList,
      monthlyRent: Number(form.monthlyRent) || 0,
      monthlyRentKRW: Number(form.monthlyRent) || 0,
      securityDeposit: Number(form.securityDeposit) || 0,
      depositKRW: Number(form.securityDeposit) || 0,
      maintenanceFeeKRW: 0,
      city: form.city,
      district: form.address.trim() || form.city,
      address: form.address.trim() || `${form.city}, South Korea`,
      latitude: latNum !== null && !Number.isNaN(latNum) ? latNum : null,
      longitude: lngNum !== null && !Number.isNaN(lngNum) ? lngNum : null,
      accommodationType: form.accommodationType,
      roomType: form.accommodationType,
      facilities: form.facilities,
      amenities: form.facilities,
      roomDetails: form.roomDetails.trim(),
      availability: form.availability,
      approvalStatus: editingListing
        ? form.requireReapprovalOnEdit
          ? 'Pending'
          : editingListing.approvalStatus || 'Pending'
        : 'Pending',
      createdBy: editingListing?.createdBy || currentUser?.id || 'admin',
      createdAt: editingListing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      approvedBy: editingListing?.approvedBy || null,
      approvedAt: editingListing?.approvedAt || null,
      furnished: true,
      availableDate: 'Immediate',
      nearUniversities: editingListing?.nearUniversities || [],
      landlordType: editingListing?.landlordType || 'Direct Owner',
      landlordPhone: form.landlordPhone.trim(),
      contactEmail: form.contactEmail.trim(),
      verified: false
    };
  };

  const handleSaveListing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.city.trim()) {
      showToast('Property title and city are required.');
      return;
    }

    setIsSaving(true);
    try {
      const draft = buildDraftListingFromForm();
      if (editingListing) {
        const updated = await updateAccommodationDoc(
          draft.id,
          draft,
          form.requireReapprovalOnEdit
        );
        setListings(prev => prev.map(item => (item.id === updated.id ? updated : item)));
        await createAuditLogDoc({
          timestamp: new Date().toISOString(),
          adminName: currentUser?.name || 'Administrator',
          adminEmail: currentUser?.email || 'admin@everykr.com',
          actionType: 'EDIT',
          targetEntity: 'Accommodation',
          targetId: updated.id,
          targetName: updated.title,
          details: `Edited accommodation listing (${updated.city}) — Status: ${updated.approvalStatus}`
        });
        showToast(
          form.requireReapprovalOnEdit
            ? `Updated "${updated.title}" and reset status to Pending for re-approval`
            : `Updated "${updated.title}"`
        );
      } else {
        const created = await createAccommodationDoc(draft, currentUser?.id || 'admin');
        setListings(prev => [created, ...prev]);
        await createAuditLogDoc({
          timestamp: new Date().toISOString(),
          adminName: currentUser?.name || 'Administrator',
          adminEmail: currentUser?.email || 'admin@everykr.com',
          actionType: 'CREATE',
          targetEntity: 'Accommodation',
          targetId: created.id,
          targetName: created.title,
          details: `Submitted new accommodation listing (${created.city}) for approval [Status: Pending]`
        });
        showToast(`Created "${created.title}" (Status: Pending Approval)`);
      }

      await refreshAccommodations();
      setIsFormOpen(false);
      setEditingListing(null);
    } catch {
      showToast('Could not save accommodation listing.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleStatusChange = async (
    item: AccommodationListing,
    nextStatus: AccommodationApprovalStatus,
    nextAvailability?: AccommodationAvailabilityStatus
  ) => {
    try {
      const updated = await adminSetAccommodationStatusDoc({
        propertyId: item.propertyId || item.id,
        approvalStatus: nextStatus,
        availability: nextAvailability,
        adminEmail: currentUser?.email || 'admin@everykr.com',
        listingSnapshot: item
      });

      setListings(prev => prev.map(x => (x.id === updated.id ? updated : x)));
      await refreshAccommodations();

      await createAuditLogDoc({
        timestamp: new Date().toISOString(),
        adminName: currentUser?.name || 'Administrator',
        adminEmail: currentUser?.email || 'admin@everykr.com',
        actionType:
          nextStatus === 'Approved'
            ? 'APPROVE'
            : nextStatus === 'Rejected'
            ? 'REJECT'
            : 'EDIT',
        targetEntity: 'Accommodation',
        targetId: updated.id,
        targetName: updated.title,
        details: `Changed accommodation status to ${nextStatus} (Availability: ${updated.availability})`
      });

      showToast(`"${updated.title}" marked as ${nextStatus}`);
    } catch {
      showToast('Failed to update listing status.');
    }
  };

  const handleDelete = async (item: AccommodationListing) => {
    try {
      await deleteAccommodationDoc(item.propertyId || item.id);
      setListings(prev => prev.filter(x => x.id !== item.id));
      await refreshAccommodations();
      await createAuditLogDoc({
        timestamp: new Date().toISOString(),
        adminName: currentUser?.name || 'Administrator',
        adminEmail: currentUser?.email || 'admin@everykr.com',
        actionType: 'DELETE',
        targetEntity: 'Accommodation',
        targetId: item.id,
        targetName: item.title,
        details: `Deleted accommodation listing (${item.city})`
      });
      showToast(`Deleted "${item.title}"`);
    } catch {
      showToast('Failed to delete listing.');
    }
  };

  const renderStatusBadge = (status: AccommodationApprovalStatus = 'Pending') => {
    switch (status) {
      case 'Approved':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-emerald-100 text-emerald-800">
            <CheckCircle2 className="w-3 h-3" />
            <span>Approved</span>
          </span>
        );
      case 'Pending':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-amber-100 text-amber-800">
            <Clock className="w-3 h-3" />
            <span>Pending</span>
          </span>
        );
      case 'Rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-rose-100 text-rose-800">
            <XCircle className="w-3 h-3" />
            <span>Rejected</span>
          </span>
        );
      case 'Unavailable':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-slate-200 text-slate-700">
            <EyeOff className="w-3 h-3" />
            <span>Unavailable</span>
          </span>
        );
      case 'Archived':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 text-slate-500">
            <Archive className="w-3 h-3" />
            <span>Archived</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#1769AA] mb-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Strict Admin Approval System</span>
          </div>
          <h2 className="text-lg font-bold text-[#10243A]">
            Accommodation Management
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Newly created listings default to <strong>Pending</strong>. Only <strong>Approved</strong> &amp; <strong>Available</strong> properties are visible on the public Accommodation page.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={loadAllListings}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={openCreateForm}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#10243A] hover:bg-[#1769AA] rounded-lg shadow-2xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Accommodation Listing</span>
          </button>
        </div>
      </div>

      {/* Status Filter Tabs & Search */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-1.5">
          {STATUS_TABS.map(tab => (
            <button
              key={tab}
              type="button"
              onClick={() => setStatusFilter(tab)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                statusFilter === tab
                  ? 'bg-[#10243A] text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span>{tab}</span>
              <span className="ml-1.5 px-1.5 py-0.2 rounded bg-black/10 text-[10px] tabular-nums">
                {counts[tab]}
              </span>
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search title, city, address..."
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#1769AA]"
          />
        </div>
      </div>

      {/* Add / Edit Form Panel */}
      {isFormOpen && (
        <div className="bg-white rounded-xl border border-slate-300 shadow-lg overflow-hidden">
          <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-[#10243A]">
                {editingListing
                  ? `Edit Listing: ${editingListing.title}`
                  : 'Add New Accommodation Listing (Defaults to Pending)'}
              </h3>
              <p className="text-[11px] text-slate-500">
                Enter verified property details, upload photographs, preview, and submit for approval.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="p-1 text-slate-400 hover:text-slate-700 rounded cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSaveListing} className="p-6 space-y-5 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block font-bold text-slate-700 mb-1">
                  Property Title *
                </label>
                <input
                  type="text"
                  required
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g., Busan Student Shared Room"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#1769AA]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Accommodation Type *
                </label>
                <select
                  value={form.accommodationType}
                  onChange={e =>
                    setForm({
                      ...form,
                      accommodationType: e.target.value as AccommodationTypeOption
                    })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#1769AA]"
                >
                  {ACCOMMODATION_TYPES.map(t => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Pricing & Availability */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Monthly Rent (KRW) *
                </label>
                <input
                  type="number"
                  min={0}
                  step={10000}
                  required
                  value={form.monthlyRent}
                  onChange={e => setForm({ ...form, monthlyRent: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono focus:outline-none focus:border-[#1769AA]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Security Deposit (KRW) *
                </label>
                <input
                  type="number"
                  min={0}
                  step={10000}
                  required
                  value={form.securityDeposit}
                  onChange={e => setForm({ ...form, securityDeposit: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono focus:outline-none focus:border-[#1769AA]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Availability *
                </label>
                <select
                  value={form.availability}
                  onChange={e =>
                    setForm({
                      ...form,
                      availability: e.target.value as AccommodationAvailabilityStatus
                    })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#1769AA]"
                >
                  <option value="Available">Available</option>
                  <option value="Unavailable">Unavailable</option>
                </select>
              </div>
            </div>

            {/* Location & Coordinates */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  City *
                </label>
                <select
                  value={form.city}
                  onChange={e => setForm({ ...form, city: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#1769AA]"
                >
                  {CITIES.map(c => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-3">
                <label className="block font-bold text-slate-700 mb-1">
                  Full Address *
                </label>
                <input
                  type="text"
                  required
                  value={form.address}
                  onChange={e => setForm({ ...form, address: e.target.value })}
                  placeholder="e.g., Jangjeon-dong, Geumjeong-gu, Busan, South Korea"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#1769AA]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Latitude (Optional)
                </label>
                <input
                  type="text"
                  value={form.latitude}
                  onChange={e => setForm({ ...form, latitude: e.target.value })}
                  placeholder="e.g., 35.2316"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono focus:outline-none focus:border-[#1769AA]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Longitude (Optional)
                </label>
                <input
                  type="text"
                  value={form.longitude}
                  onChange={e => setForm({ ...form, longitude: e.target.value })}
                  placeholder="e.g., 129.0842"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono focus:outline-none focus:border-[#1769AA]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Contact Phone
                </label>
                <input
                  type="text"
                  value={form.landlordPhone}
                  onChange={e => setForm({ ...form, landlordPhone: e.target.value })}
                  placeholder="e.g., 051-510-1800"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono focus:outline-none focus:border-[#1769AA]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Contact Email
                </label>
                <input
                  type="email"
                  value={form.contactEmail}
                  onChange={e => setForm({ ...form, contactEmail: e.target.value })}
                  placeholder="housing@everykr.com"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#1769AA]"
                />
              </div>
            </div>

            {/* Room Details & Description */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Room Information (Room Details)
                </label>
                <textarea
                  rows={3}
                  value={form.roomDetails}
                  onChange={e => setForm({ ...form, roomDetails: e.target.value })}
                  placeholder="e.g., 2-person shared room with individual study desks, beds, and shared kitchen."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#1769AA]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Property Description
                </label>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  placeholder="Short factual description of the property and surrounding access."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#1769AA]"
                />
              </div>
            </div>

            {/* Facilities */}
            <div className="space-y-2">
              <label className="block font-bold text-slate-700">
                Facilities &amp; Included Utilities
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={form.facilitiesInput}
                  onChange={e => setForm({ ...form, facilitiesInput: e.target.value })}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddFacility();
                    }
                  }}
                  placeholder="Add facility (e.g., Wi-Fi, Washing Machine, Air Conditioner)..."
                  className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#1769AA]"
                />
                <button
                  type="button"
                  onClick={handleAddFacility}
                  className="px-3.5 py-2 bg-slate-800 text-white font-bold rounded-lg hover:bg-slate-700 cursor-pointer"
                >
                  Add Facility
                </button>
              </div>
              {form.facilities.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {form.facilities.map(fac => (
                    <span
                      key={fac}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 text-[11px] font-medium"
                    >
                      <span>{fac}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveFacility(fac)}
                        className="text-slate-400 hover:text-rose-600 cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Multiple Property Photographs Upload */}
            <div className="space-y-2.5 pt-2 border-t border-slate-200">
              <label className="block font-bold text-slate-700">
                Property Photographs (Upload Multiple Files or Add Image URL)
              </label>

              <div className="flex flex-col sm:flex-row gap-2.5">
                <label className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-[#1769AA] font-bold rounded-lg border border-blue-200 cursor-pointer shrink-0">
                  <Upload className="w-4 h-4" />
                  <span>{isUploadingPhotos ? 'Uploading...' : 'Upload Photos'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handlePhotoFilesUpload}
                    className="hidden"
                  />
                </label>

                <div className="flex-1 flex gap-2">
                  <input
                    type="text"
                    value={form.photoUrlInput}
                    onChange={e => setForm({ ...form, photoUrlInput: e.target.value })}
                    placeholder="Or paste image URL..."
                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#1769AA]"
                  />
                  <button
                    type="button"
                    onClick={handleAddPhotoUrl}
                    className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg cursor-pointer"
                  >
                    Add URL
                  </button>
                </div>
              </div>

              {form.photos.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3 pt-2">
                  {form.photos.map((photo, index) => (
                    <div
                      key={`${photo}-${index}`}
                      className="relative group aspect-16/10 rounded-lg overflow-hidden border border-slate-200 bg-slate-100"
                    >
                      <img
                        src={photo}
                        alt={`Property photo ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                      {index === 0 && (
                        <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-[#10243A]/85 text-white text-[9px] font-bold">
                          Main
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemovePhoto(index)}
                        className="absolute top-1 right-1 p-1 rounded bg-rose-600 text-white opacity-90 hover:opacity-100 cursor-pointer"
                        title="Remove photo"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {editingListing && (
              <div className="pt-2">
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.requireReapprovalOnEdit}
                    onChange={e =>
                      setForm({ ...form, requireReapprovalOnEdit: e.target.checked })
                    }
                    className="rounded border-slate-300"
                  />
                  <span className="text-xs font-semibold text-slate-700">
                    Reset status to <strong>Pending</strong> so edited property information requires re-approval before public display
                  </span>
                </label>
              </div>
            )}

            {/* Form Actions: Preview & Submit */}
            <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="px-4 py-2 rounded-lg font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => setPreviewListing(buildDraftListingFromForm())}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg font-bold text-[#1769AA] bg-blue-50 hover:bg-blue-100 border border-blue-200 cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Preview Listing</span>
              </button>

              <button
                type="submit"
                disabled={isSaving || isUploadingPhotos}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg font-bold text-white bg-[#10243A] hover:bg-[#1769AA] cursor-pointer disabled:opacity-50"
              >
                <Check className="w-3.5 h-3.5" />
                <span>
                  {isSaving
                    ? 'Saving...'
                    : editingListing
                    ? 'Save Changes'
                    : 'Submit for Approval (Pending)'}
                </span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Listings Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
              <tr>
                <th className="p-4">Property</th>
                <th className="p-4">Location &amp; Type</th>
                <th className="p-4">Monthly Rent / Deposit</th>
                <th className="p-4">Availability</th>
                <th className="p-4">Approval Status</th>
                <th className="p-4 text-right">Admin Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredListings.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    No accommodation listings found for the selected filter.
                  </td>
                </tr>
              ) : (
                filteredListings.map(acc => {
                  const status = (acc.approvalStatus || 'Pending') as AccommodationApprovalStatus;
                  const availability = acc.availability || 'Available';
                  const rent = Number(acc.monthlyRent ?? acc.monthlyRentKRW ?? 0);
                  const deposit = Number(acc.securityDeposit ?? acc.depositKRW ?? 0);
                  const thumb =
                    Array.isArray(acc.photos) && acc.photos.length > 0
                      ? acc.photos[0]
                      : '/src/assets/images/korea_student_housing_1794049412879.jpg';

                  return (
                    <tr key={acc.id} className="hover:bg-slate-50/70">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={thumb}
                            alt={acc.title}
                            className="w-14 h-10 rounded-lg object-cover border border-slate-200 shrink-0"
                          />
                          <div>
                            <div className="font-bold text-[#10243A]">{acc.title}</div>
                            <div className="text-[11px] text-slate-500">
                              ID: <span className="font-mono">{acc.propertyId || acc.id}</span> ·{' '}
                              {Array.isArray(acc.photos) ? acc.photos.length : 1} photo(s)
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="p-4">
                        <div className="font-semibold text-slate-800">
                          {acc.city}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {acc.accommodationType || acc.roomType} · {acc.address || acc.district}
                        </div>
                      </td>

                      <td className="p-4 font-mono tabular-nums">
                        <div className="font-bold text-[#10243A]">
                          ₩{rent.toLocaleString()} / mo
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Deposit: ₩{deposit.toLocaleString()}
                        </div>
                      </td>

                      <td className="p-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                            availability === 'Available'
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {availability}
                        </span>
                      </td>

                      <td className="p-4">{renderStatusBadge(status)}</td>

                      <td className="p-4 text-right">
                        <div className="inline-flex flex-wrap items-center justify-end gap-1.5">
                          {/* Preview */}
                          <button
                            type="button"
                            onClick={() => setPreviewListing(acc)}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-semibold cursor-pointer"
                            title="Preview Listing"
                          >
                            Preview
                          </button>

                          {/* Edit */}
                          <button
                            type="button"
                            onClick={() => openEditForm(acc)}
                            className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-[#1769AA] rounded font-semibold cursor-pointer"
                            title="Edit Listing"
                          >
                            Edit
                          </button>

                          {/* Approve */}
                          {status !== 'Approved' && (
                            <button
                              type="button"
                              onClick={() => handleStatusChange(acc, 'Approved', 'Available')}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold cursor-pointer"
                            >
                              Approve
                            </button>
                          )}

                          {/* Reject */}
                          {status !== 'Rejected' && (
                            <button
                              type="button"
                              onClick={() => handleStatusChange(acc, 'Rejected', 'Unavailable')}
                              className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded font-semibold cursor-pointer"
                            >
                              Reject
                            </button>
                          )}

                          {/* Mark Unavailable (Unpublish) */}
                          {status === 'Approved' && (
                            <button
                              type="button"
                              onClick={() => handleStatusChange(acc, 'Unavailable', 'Unavailable')}
                              className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded font-semibold cursor-pointer"
                            >
                              Unpublish
                            </button>
                          )}

                          {/* Archive */}
                          {status !== 'Archived' && (
                            <button
                              type="button"
                              onClick={() => handleStatusChange(acc, 'Archived', 'Unavailable')}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded font-semibold cursor-pointer"
                            >
                              Archive
                            </button>
                          )}

                          {/* Delete */}
                          <button
                            type="button"
                            onClick={() => handleDelete(acc)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                            title="Delete Listing"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Admin Listing Preview Modal (Shows both Public Card Preview & Full Details Preview) */}
      {previewListing && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-3xl w-full overflow-hidden shadow-2xl my-8">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <h3 className="text-sm font-bold text-[#10243A]">
                  Listing Preview: {previewListing.title}
                </h3>
                {renderStatusBadge(previewListing.approvalStatus || 'Pending')}
              </div>
              <button
                type="button"
                onClick={() => setPreviewListing(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                {/* Left: Public Card Preview */}
                <div className="space-y-2">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Public Main Page Card Preview
                  </div>
                  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                    <div className="aspect-16/10 bg-slate-100">
                      <img
                        src={
                          previewListing.photos?.[0] ||
                          '/src/assets/images/korea_student_housing_1794049412879.jpg'
                        }
                        alt={previewListing.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="p-4 space-y-3">
                      <h4 className="text-sm font-bold text-[#10243A]">
                        {previewListing.title}
                      </h4>
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Monthly Rent:</span>
                          <span className="font-bold tabular-nums">
                            ₩{Number(previewListing.monthlyRent ?? previewListing.monthlyRentKRW ?? 0).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Deposit:</span>
                          <span className="font-semibold tabular-nums">
                            ₩{Number(previewListing.securityDeposit ?? previewListing.depositKRW ?? 0).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Location:</span>
                          <span className="font-medium">
                            {previewListing.city}, South Korea
                          </span>
                        </div>
                      </div>
                      <div className="w-full py-2 text-center rounded-lg bg-[#10243A] text-white font-bold">
                        View Details
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right: Details Summary */}
                <div className="space-y-3">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Full Details Page Summary
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                    <div>
                      <span className="text-slate-400 block">Accommodation Type</span>
                      <span className="font-bold text-slate-800">
                        {previewListing.accommodationType || previewListing.roomType}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Full Address</span>
                      <span className="font-semibold text-slate-800">
                        {previewListing.address || previewListing.district || previewListing.city}
                      </span>
                    </div>
                    {previewListing.roomDetails && (
                      <div>
                        <span className="text-slate-400 block">Room Information</span>
                        <span className="text-slate-700">{previewListing.roomDetails}</span>
                      </div>
                    )}
                    {previewListing.description && (
                      <div>
                        <span className="text-slate-400 block">Description</span>
                        <span className="text-slate-700">{previewListing.description}</span>
                      </div>
                    )}
                    {(previewListing.facilities || previewListing.amenities || []).length > 0 && (
                      <div>
                        <span className="text-slate-400 block mb-1">Facilities</span>
                        <div className="flex flex-wrap gap-1">
                          {(previewListing.facilities || previewListing.amenities || []).map(f => (
                            <span
                              key={f}
                              className="px-2 py-0.5 rounded bg-white border border-slate-200 text-[11px]"
                            >
                              {f}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <a
                    href={`/housing/${encodeURIComponent(previewListing.propertyId || previewListing.id)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1769AA] hover:underline"
                  >
                    <span>Open Dedicated Property Details Page</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
              {previewListing.approvalStatus !== 'Approved' && (
                <button
                  type="button"
                  onClick={() => {
                    handleStatusChange(previewListing, 'Approved', 'Available');
                    setPreviewListing(null);
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs cursor-pointer"
                >
                  Approve &amp; Publish Listing
                </button>
              )}
              <button
                type="button"
                onClick={() => setPreviewListing(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-lg text-xs cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
