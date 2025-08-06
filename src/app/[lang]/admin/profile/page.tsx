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
  CreditCard,
  Shield
} from "lucide-react";

export default function AdminProfilePage() {
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
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-[#F28C38]" />
          <p className="text-gray-600 font-fira">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!user || !userProfile) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-2">
            <Shield className="w-8 h-8 text-[#F28C38]" />
            <h1 className="text-3xl font-bold text-gray-900 font-fira">Admin Profile</h1>
          </div>
          <p className="text-gray-600 font-fira">View your profile information</p>
        </div>

        {/* Profile Status */}
        {!isProfileComplete && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-center space-x-2">
              <UserCheck className="w-5 h-5 text-yellow-600" />
              <p className="text-yellow-800 font-fira">Your profile is incomplete</p>
            </div>
          </div>
        )}

        {/* Profile Photo */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 font-fira">Profile Photo</h2>
          <div className="flex justify-center">
            {userProfile?.documents?.profilePhoto?.url ? (
              <img
                src={userProfile.documents.profilePhoto.url}
                alt="Profile"
                className="w-32 h-32 rounded-full object-cover border-4 border-gray-200"
              />
            ) : (
              <div className="w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center">
                <User className="w-16 h-16 text-gray-400" />
              </div>
            )}
          </div>
        </div>

        {/* Personal Information */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 font-fira">Personal Information</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="flex items-center space-x-3">
              <User className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-600 font-fira">Full Name</p>
                <p className="font-medium text-gray-900 font-fira">
                  {userProfile.firstName || 'Not specified'} {userProfile.lastName || ''}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <Phone className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-600 font-fira">Phone Number</p>
                <p className="font-medium text-gray-900 font-fira">
                  +91 {phoneNumber || 'Not specified'}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <Phone className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-600 font-fira">WhatsApp Number</p>
                <p className="font-medium text-gray-900 font-fira">
                  +91 {whatsappNumber || 'Not specified'}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <Mail className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-600 font-fira">Email</p>
                <p className="font-medium text-gray-900 font-fira">
                  {user.email || 'Not specified'}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <Calendar className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-600 font-fira">Date of Birth</p>
                <p className="font-medium text-gray-900 font-fira">
                  {userProfile.dob || 'Not specified'}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <User className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-600 font-fira">Gender</p>
                <p className="font-medium text-gray-900 font-fira">
                  {userProfile.gender === 'M' ? 'Male' : 
                   userProfile.gender === 'F' ? 'Female' : 
                   userProfile.gender === 'O' ? 'Others' : 'Not specified'}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <Globe className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-600 font-fira">Preferred Language</p>
                <p className="font-medium text-gray-900 font-fira">
                  {languages.find(l => l.code === userProfile.preferredLanguage)?.name || 'Not specified'}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <Shield className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-600 font-fira">Role</p>
                <p className="font-medium text-gray-900 font-fira capitalize">
                  {userProfile.role || 'Not specified'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Address Information */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 font-fira">Address Information</h2>
          {hasAddress ? (
            <div className="grid md:grid-cols-2 gap-6">
              <div className="flex items-center space-x-3">
                <MapPin className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-600 font-fira">Pincode</p>
                  <p className="font-medium text-gray-900 font-fira">
                    {userProfile.pincode || 'Not specified'}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <MapPin className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-600 font-fira">State</p>
                  <p className="font-medium text-gray-900 font-fira">
                    {userProfile.state || 'Not specified'}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <MapPin className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-600 font-fira">District</p>
                  <p className="font-medium text-gray-900 font-fira">
                    {userProfile.district || 'Not specified'}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <MapPin className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-600 font-fira">Taluk</p>
                  <p className="font-medium text-gray-900 font-fira">
                    {userProfile.taluk || 'Not specified'}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3 md:col-span-2">
                <MapPin className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-600 font-fira">Panchayat</p>
                  <p className="font-medium text-gray-900 font-fira">
                    {userProfile.panchayat || 'Not specified'}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 font-fira">No address information available</p>
            </div>
          )}
        </div>

        {/* Identity Documents */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 font-fira">Identity Documents</h2>
          {hasDocuments ? (
            <div className="grid md:grid-cols-2 gap-6">
              <div className="text-center">
                <h3 className="text-lg font-medium text-gray-900 mb-4 font-fira">Aadhaar Front</h3>
                {userProfile?.documents?.aadhaarFront?.url ? (
                  <img
                    src={userProfile.documents.aadhaarFront.url}
                    alt="Aadhaar Front"
                    className="w-full h-48 object-cover rounded-lg border border-gray-200"
                  />
                ) : (
                  <div className="w-full h-48 bg-gray-200 rounded-lg flex items-center justify-center">
                    <CreditCard className="w-12 h-12 text-gray-400" />
                  </div>
                )}
              </div>

              <div className="text-center">
                <h3 className="text-lg font-medium text-gray-900 mb-4 font-fira">Aadhaar Back</h3>
                {userProfile?.documents?.aadhaarBack?.url ? (
                  <img
                    src={userProfile.documents.aadhaarBack.url}
                    alt="Aadhaar Back"
                    className="w-full h-48 object-cover rounded-lg border border-gray-200"
                  />
                ) : (
                  <div className="w-full h-48 bg-gray-200 rounded-lg flex items-center justify-center">
                    <CreditCard className="w-12 h-12 text-gray-400" />
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 font-fira">No identity documents uploaded</p>
            </div>
          )}
        </div>

        {/* Additional Information */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 font-fira">Additional Information</h2>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600 font-fira mb-1">Instagram Handle</p>
              <p className="font-medium text-gray-900 font-fira">
                {userProfile.instagramHandle ? `@${userProfile.instagramHandle}` : 'Not specified'}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-600 font-fira mb-1">Account Created</p>
              <p className="font-medium text-gray-900 font-fira">
                {userProfile.createdAt ? new Date(userProfile.createdAt).toLocaleDateString() : 'Not available'}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-600 font-fira mb-1">Last Updated</p>
              <p className="font-medium text-gray-900 font-fira">
                {userProfile.updatedAt ? new Date(userProfile.updatedAt).toLocaleDateString() : 'Not available'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}