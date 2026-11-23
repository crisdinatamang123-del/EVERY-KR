import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { AccommodationListing, AccommodationTypeOption } from '../types';
import { uploadAccommodationPhoto } from '../services/firebaseService';
import { X, Home, Upload, ShieldCheck } from 'lucide-react';

export const AddHousingModal: React.FC = () => {
  const { isAddHousingModalOpen, setIsAddHousingModalOpen, addAccommodation } = useApp();

  const [title, setTitle] = useState('');
  const [city, setCity] = useState('Seoul');
  const [address, setAddress] = useState('');
  const [accommodationType, setAccommodationType] = useState<AccommodationTypeOption>('One-room');
  const [monthlyRent, setMonthlyRent] = useState('450000');
  const [securityDeposit, setSecurityDeposit] = useState('3000000');
  const [roomDetails, setRoomDetails] = useState('');
  const [facilitiesText, setFacilitiesText] = useState('Air Conditioner, Washing Machine, Refrigerator, Wi-Fi');
  const [landlordPhone, setLandlordPhone] = useState('');
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  if (!isAddHousingModalOpen) return null;

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setIsUploading(true);
    try {
      const urls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const url = await uploadAccommodationPhoto(files[i], `draft-${Date.now()}`);
        if (url) urls.push(url);
      }
      setPhotos(prev => [...prev, ...urls]);
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !address.trim()) return;

    const rentNum = parseInt(monthlyRent, 10) || 450000;
    const depNum = parseInt(securityDeposit, 10) || 0;
    const facList = facilitiesText
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    const payload: Omit<AccommodationListing, 'id' | 'verified'> = {
      title: title.trim(),
      city,
      district: address.trim(),
      address: address.trim(),
      accommodationType,
      roomType: accommodationType,
      monthlyRent: rentNum,
      monthlyRentKRW: rentNum,
      securityDeposit: depNum,
      depositKRW: depNum,
      maintenanceFeeKRW: 0,
      furnished: true,
      availableDate: 'Immediate',
      photos:
        photos.length > 0
          ? photos
          : ['/src/assets/images/korea_student_housing_1794049412879.jpg'],
      facilities: facList,
      amenities: facList,
      roomDetails: roomDetails.trim(),
      availability: 'Available',
      approvalStatus: 'Pending',
      nearUniversities: [],
      landlordType: 'Direct Owner',
      landlordPhone: landlordPhone.trim(),
      description: description.trim()
    };

    await addAccommodation(payload);

    setTitle('');
    setAddress('');
    setRoomDetails('');
    setDescription('');
    setPhotos([]);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative w-full max-w-xl bg-white dark:bg-[#081426] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-8">
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#10243A] text-white flex items-center justify-center">
              <Home className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#10243A] dark:text-white">
                Submit Accommodation Listing
              </h3>
              <p className="text-xs text-slate-500">
                All new submissions default to Pending until approved by an EveryKR Administrator
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsAddHousingModalOpen(false)}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Property Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g., Busan Student Shared Room"
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-[#1769AA]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                City *
              </label>
              <select
                value={city}
                onChange={e => setCity(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none"
              >
                <option value="Seoul">Seoul</option>
                <option value="Busan">Busan</option>
                <option value="Daejeon">Daejeon</option>
                <option value="Incheon">Incheon</option>
                <option value="Suwon">Suwon</option>
                <option value="Daegu">Daegu</option>
                <option value="Gwangju">Gwangju</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Full Address *
              </label>
              <input
                type="text"
                required
                value={address}
                onChange={e => setAddress(e.target.value)}
                placeholder="e.g., Geumjeong-gu, Busan"
                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Accommodation Type *
              </label>
              <select
                value={accommodationType}
                onChange={e => setAccommodationType(e.target.value as AccommodationTypeOption)}
                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none"
              >
                <option value="One-room">One-room</option>
                <option value="Studio">Studio</option>
                <option value="Goshiwon">Goshiwon</option>
                <option value="Shared Room">Shared Room</option>
                <option value="Dormitory">Dormitory</option>
                <option value="Short-term">Short-term</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Monthly Rent (KRW) *
              </label>
              <input
                type="number"
                required
                value={monthlyRent}
                onChange={e => setMonthlyRent(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-mono focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Security Deposit (KRW) *
              </label>
              <input
                type="number"
                required
                value={securityDeposit}
                onChange={e => setSecurityDeposit(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-mono focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Contact Phone
              </label>
              <input
                type="text"
                value={landlordPhone}
                onChange={e => setLandlordPhone(e.target.value)}
                placeholder="010-XXXX-XXXX"
                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-mono focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Room Details
              </label>
              <input
                type="text"
                value={roomDetails}
                onChange={e => setRoomDetails(e.target.value)}
                placeholder="e.g., Single room, private bathroom"
                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Facilities (Comma separated)
            </label>
            <input
              type="text"
              value={facilitiesText}
              onChange={e => setFacilitiesText(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Property Photographs
            </label>
            <label className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-bold rounded-xl cursor-pointer">
              <Upload className="w-4 h-4" />
              <span>{isUploading ? 'Uploading...' : `Upload Photos (${photos.length} added)`}</span>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handlePhotoUpload}
                className="hidden"
              />
            </label>
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Property Description *
            </label>
            <textarea
              rows={3}
              required
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Describe the room, building access, and utilities..."
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none"
            />
          </div>

          <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/60 rounded-xl flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-[#1769AA] shrink-0 mt-0.5" />
            <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
              Newly submitted listings are saved with status <strong>Pending</strong> and will only appear publicly after administrator verification and approval.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsAddHousingModalOpen(false)}
              className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isUploading}
              className="px-6 py-2.5 text-xs font-bold text-white bg-[#10243A] hover:bg-[#1769AA] rounded-xl transition-colors cursor-pointer"
            >
              Submit for Approval
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
