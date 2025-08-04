"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useTranslation } from "@/lib/utils/i18n";
import Image from "next/image";
import {
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Globe,
  Loader2,
  UserCheck,
  CreditCard
} from "lucide-react";

export default function PlayerProfilePage() {
  const { user, userProfile, loading } = useAuth();
  const router = useRouter();
  const { lang } = useParams();
  const { t } = useTranslation();

  const languages = [
    { code: "en", name: "English" },
    { code: "ta", name: "Tamil" },
    { code: "hi", name: "Hindi" },
    { code: "ml", name: "Malayalam" },
    { code: "te", name: "Telugu" },
    { code: "kn", name: "Kannada" },
    { code: "or", name: "Odia" },
  ];

  const phoneNumber = user?.phoneNumber?.replace(/^\+91/, '') || '';
  const whatsappNumber = userProfile?.whatsappNumber?.replace(/^\+91/, '') || '';

  useEffect(() => {
    if (!loading && !user) {
      router.push(`/${lang}/login`);
    }
  }, [user, loading, router, lang]);

  const isProfileComplete = userProfile?.isProfileComplete || false;
  const hasAddress = userProfile?.pincode && userProfile?.state && userProfile?.district;
  const hasDocuments = userProfile?.documents?.aadhaarFront?.url && userProfile?.documents?.aadhaarBack?.url;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#F28C38]" />
      </div>
    );
  }

  if (!user || !userProfile) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mb-4">
            <Image
              src="https://ishalogin.sadhguru.org/app/images/3e8fd38d1d957c44372b.svg"
              alt="Isha Logo"
              width={80}
              height={80}
              className="mx-auto"
            />
          </div>
          <h1 className="text-3xl font-bold text-[#4A2F1D] mb-2">
            Player Profile
          </h1>
          <p className="text-gray-600">
            Your profile information
          </p>
        </div>

        {/* Profile Status */}
        {!isProfileComplete && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-center space-x-2">
              <UserCheck className="w-5 h-5 text-yellow-600" />
              <p className="text-yellow-800">Your profile is incomplete. Please complete it to participate fully.</p>
            </div>
          </div>
        )}

        {/* Profile Photo */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="text-center">
            <div className="mx-auto mb-4">
              {userProfile?.documents?.profilePhoto?.url ? (
                <img
                  src={userProfile.documents.profilePhoto.url}
                  alt="Profile"
                  className="w-24 h-24 rounded-full object-cover mx-auto border-4 border-[#F28C38]"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center mx-auto border-4 border-gray-300">
                  <User className="w-12 h-12 text-gray-400" />
                </div>
              )}
            </div>
            <h2 className="text-xl font-semibold text-[#4A2F1D]">
              {userProfile.firstName} {userProfile.lastName}
            </h2>
            <p className="text-gray-600 capitalize">{userProfile.role || 'Player'}</p>
          </div>
        </div>

        {/* Personal Details */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h3 className="text-xl font-semibold text-[#4A2F1D] mb-4 flex items-center">
            <User className="w-5 h-5 mr-2" />
            Personal Details
          </h3>
          <hr className="mb-6" />
          
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <div className="text-sm font-medium text-gray-700 mb-1">First Name</div>
              <div className="text-gray-900">{userProfile.firstName || 'Not Available'}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-700 mb-1">Last Name</div>
              <div className="text-gray-900">{userProfile.lastName || 'Not Available'}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-700 mb-1 flex items-center">
                <Phone className="w-4 h-4 mr-1" />
                Phone Number
              </div>
              <div className="text-gray-900">+91 {phoneNumber || 'Not Available'}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-700 mb-1 flex items-center">
                <Phone className="w-4 h-4 mr-1" />
                WhatsApp Number
              </div>
              <div className="text-gray-900">+91 {whatsappNumber || 'Not Available'}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-700 mb-1 flex items-center">
                <Calendar className="w-4 h-4 mr-1" />
                Date of Birth
              </div>
              <div className="text-gray-900">{userProfile.dob || 'Not Available'}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-700 mb-1">Gender</div>
              <div className="text-gray-900">
                {userProfile.gender === 'M' ? 'Male' : 
                 userProfile.gender === 'F' ? 'Female' : 
                 userProfile.gender === 'O' ? 'Others' : 'Not Available'}
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-700 mb-1 flex items-center">
                <Globe className="w-4 h-4 mr-1" />
                Preferred Language
              </div>
              <div className="text-gray-900">
                {languages.find(lang => lang.code === userProfile.preferredLanguage)?.name || 'Not Available'}
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-700 mb-1">Role</div>
              <div className="text-gray-900 capitalize">{userProfile.role || "Player"}</div>
            </div>
          </div>
        </div>

        {/* Address Details */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h3 className="text-xl font-semibold text-[#4A2F1D] mb-4 flex items-center">
            <MapPin className="w-5 h-5 mr-2" />
            Address Details
          </h3>
          <hr className="mb-6" />
          
          {hasAddress ? (
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <div className="text-sm font-medium text-gray-700 mb-1">Pincode</div>
                <div className="text-gray-900">{userProfile.pincode || 'Not Available'}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-700 mb-1">State</div>
                <div className="text-gray-900">{userProfile.state || 'Not Available'}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-700 mb-1">District</div>
                <div className="text-gray-900">{userProfile.district || 'Not Available'}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-700 mb-1">Taluk</div>
                <div className="text-gray-900">{userProfile.taluk || 'Not Available'}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-700 mb-1">Panchayat</div>
                <div className="text-gray-900">{userProfile.panchayat || 'Not Available'}</div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No address information available</p>
            </div>
          )}
        </div>

        {/* Identity Verification */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h3 className="text-xl font-semibold text-[#4A2F1D] mb-4 flex items-center">
            <CreditCard className="w-5 h-5 mr-2" />
            Identity Verification
          </h3>
          <hr className="mb-6" />
          
          <div className="grid md:grid-cols-2 gap-6">
            <div className="border rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">Aadhaar Card Front</h4>
              {userProfile?.documents?.aadhaarFront?.url ? (
                <div className="space-y-2">
                  <img
                    src={userProfile.documents.aadhaarFront.url}
                    alt="Aadhaar Front"
                    className="w-full h-32 object-cover rounded border"
                  />
                  <div className="flex items-center text-sm text-green-600">
                    <UserCheck className="w-4 h-4 mr-1" />
                    Document uploaded
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <CreditCard className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500 text-sm">No document uploaded</p>
                </div>
              )}
            </div>
            
            <div className="border rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">Aadhaar Card Back</h4>
              {userProfile?.documents?.aadhaarBack?.url ? (
                <div className="space-y-2">
                  <img
                    src={userProfile.documents.aadhaarBack.url}
                    alt="Aadhaar Back"
                    className="w-full h-32 object-cover rounded border"
                  />
                  <div className="flex items-center text-sm text-green-600">
                    <UserCheck className="w-4 h-4 mr-1" />
                    Document uploaded
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <CreditCard className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500 text-sm">No document uploaded</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Other Information */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h3 className="text-xl font-semibold text-[#4A2F1D] mb-4">Other Information</h3>
          <hr className="mb-6" />
          
          <div>
            <div className="text-sm font-medium text-gray-700 mb-1">Instagram Handle</div>
            <div className="text-gray-900">{userProfile.instagramHandle || 'Not Available'}</div>
          </div>
        </div>

        {/* Profile Completion Status */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-xl font-semibold text-[#4A2F1D] mb-4">Profile Status</h3>
          <hr className="mb-6" />
          
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-2 ${
                userProfile.firstName && userProfile.lastName ? 'bg-green-100' : 'bg-gray-100'
              }`}>
                <User className={`w-8 h-8 ${
                  userProfile.firstName && userProfile.lastName ? 'text-green-600' : 'text-gray-400'
                }`} />
              </div>
              <p className="text-sm font-medium">Basic Details</p>
              <p className={`text-xs ${
                userProfile.firstName && userProfile.lastName ? 'text-green-600' : 'text-gray-500'
              }`}>
                {userProfile.firstName && userProfile.lastName ? 'Complete' : 'Incomplete'}
              </p>
            </div>
            
            <div className="text-center">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-2 ${
                hasAddress ? 'bg-green-100' : 'bg-gray-100'
              }`}>
                <MapPin className={`w-8 h-8 ${
                  hasAddress ? 'text-green-600' : 'text-gray-400'
                }`} />
              </div>
              <p className="text-sm font-medium">Address</p>
              <p className={`text-xs ${
                hasAddress ? 'text-green-600' : 'text-gray-500'
              }`}>
                {hasAddress ? 'Complete' : 'Incomplete'}
              </p>
            </div>
            
            <div className="text-center">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-2 ${
                hasDocuments ? 'bg-green-100' : 'bg-gray-100'
              }`}>
                <CreditCard className={`w-8 h-8 ${
                  hasDocuments ? 'text-green-600' : 'text-gray-400'
                }`} />
              </div>
              <p className="text-sm font-medium">Documents</p>
              <p className={`text-xs ${
                hasDocuments ? 'text-green-600' : 'text-gray-500'
              }`}>
                {hasDocuments ? 'Complete' : 'Incomplete'}
              </p>
            </div>
          </div>

          {!isProfileComplete && (
            <div className="mt-6 text-center">
              <button
                onClick={() => router.push(`/${lang}/profile`)}
                className="bg-[#F28C38] text-white px-6 py-2 rounded-lg hover:bg-[#E67A26] transition-colors"
              >
                Complete Profile
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}