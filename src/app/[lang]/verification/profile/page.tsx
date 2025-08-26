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
  Calendar,
  Globe,
  Loader2,
  UserCheck,
  Edit3,
  Shield
} from "lucide-react";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useTranslation } from "@/lib/utils/i18n";
import Image from "next/image";
import {
  User,
  Phone,
  Mail,
  Calendar,
  Globe,
  Loader2,
  UserCheck,
  Edit3,
  Shield
} from "lucide-react";
import { api } from "@/server/trpc/react";

export default function VerificationProfilePage() {
  const router = useRouter();
  const { lang } = useParams();
  const { t } = useTranslation();

  const { data: userProfile, isLoading, error } = api.users.getVerificationProfile.useQuery();

  const languages = [
    { code: "en", name: "English" },
    { code: "ta", name: "Tamil" },
    { code: "hi", name: "Hindi" },
    { code: "ml", name: "Malayalam" },
    { code: "te", name: "Telugu" },
    { code: "kn", name: "Kannada" },
    { code: "or", name: "Odia" },
  ];

  const phoneNumber = userProfile?.phone?.replace(/^\+91/, '') || '';
  const whatsappNumber = userProfile?.whatsappNumber?.replace(/^\+91/, '') || '';

  useEffect(() => {
    if (!isLoading && !userProfile) {
      router.push(`/${lang}/login`);
    }
  }, [userProfile, isLoading, router, lang]);

  const isProfileComplete = userProfile?.profileComplete || false;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#F28C38]" />
      </div>
    );
  }

  if (error || !userProfile) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
            Verification Volunteer Profile
          </h1>
          <p className="text-gray-600">
            Your personal information and verification details
          </p>
        </div>

        {/* Profile Status */}
        {!isProfileComplete && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-center space-x-2">
              <UserCheck className="w-5 h-5 text-yellow-600" />
              <p className="text-yellow-800">Your profile is incomplete. Please complete it to perform verification tasks effectively.</p>
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
            <div className="flex items-center justify-center mt-2">
              <Shield className="w-4 h-4 mr-1 text-[#F28C38]" />
              <p className="text-gray-600 capitalize">Verification Volunteer</p>
            </div>
          </div>
        </div>

        {/* Personal Details */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold text-[#4A2F1D] flex items-center">
              <User className="w-5 h-5 mr-2" />
              Personal Details
            </h3>
            <button
              onClick={() => router.push(`/${lang}/profile`)}
              className="flex items-center text-[#F28C38] hover:text-[#E67A26] text-sm font-medium transition-colors"
            >
              <Edit3 className="w-4 h-4 mr-1" />
              Edit Profile
            </button>
          </div>
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
              <div className="text-gray-900 flex items-center">
                <Shield className="w-4 h-4 mr-1 text-[#F28C38]" />
                Verification Volunteer
              </div>
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h3 className="text-xl font-semibold text-[#4A2F1D] mb-4 flex items-center">
            <Mail className="w-5 h-5 mr-2" />
            Contact Information
          </h3>
          <hr className="mb-6" />
          
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <div className="text-sm font-medium text-gray-700 mb-1">Email</div>
              <div className="text-gray-900">{user?.email || 'Not Available'}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-700 mb-1">Instagram Handle</div>
              <div className="text-gray-900">{userProfile.instagramHandle || 'Not Available'}</div>
            </div>
          </div>
        </div>

        {/* Verification Responsibilities */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h3 className="text-xl font-semibold text-[#4A2F1D] mb-4 flex items-center">
            <Shield className="w-5 h-5 mr-2" />
            Verification Responsibilities
          </h3>
          <hr className="mb-6" />
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="space-y-2 text-sm text-blue-800">
              <p className="font-medium">As a Verification Volunteer, you are responsible for:</p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Reviewing and verifying team player documents</li>
                <li>Approving or rejecting player registrations based on document authenticity</li>
                <li>Ensuring all team members meet eligibility criteria</li>
                <li>Maintaining accurate verification records and audit trails</li>
                <li>Following verification guidelines and standards</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Profile Status Summary */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-xl font-semibold text-[#4A2F1D] mb-4">Profile Summary</h3>
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
                isProfileComplete ? 'bg-green-100' : 'bg-yellow-100'
              }`}>
                <UserCheck className={`w-8 h-8 ${
                  isProfileComplete ? 'text-green-600' : 'text-yellow-600'
                }`} />
              </div>
              <p className="text-sm font-medium">Profile Status</p>
              <p className={`text-xs ${
                isProfileComplete ? 'text-green-600' : 'text-yellow-600'
              }`}>
                {isProfileComplete ? 'Complete' : 'Needs Completion'}
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-2 bg-blue-100">
                <Shield className="w-8 h-8 text-blue-600" />
              </div>
              <p className="text-sm font-medium">Verification Access</p>
              <p className="text-xs text-blue-600">Active</p>
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