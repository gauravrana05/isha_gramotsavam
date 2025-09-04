'use client';

import { useState } from 'react';
import { User, Camera, Phone, Mail, MapPin, Calendar, Shield, Crown, Users, Globe, CreditCard } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useMobileDetection } from '@/hooks/useMobileDetection';
import { api } from '@/server/trpc/react';
import { DocumentUpload } from '@/components/documents';

export function ProfilePage() {
  const { user, userProfile } = useAuth();
  const { isMobile } = useMobileDetection();
  const [error, setError] = useState('');

  // Fetch profile data with documents
  const { data: profileData, refetch } = api.profile.checkCompletion.useQuery(
    { userId: user?.id || '' },
    { 
      enabled: !!user?.id,
      staleTime: 2 * 60 * 1000,
      gcTime: 5 * 60 * 1000,
    }
  );

  if (!user || !userProfile) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500">Please log in to view your profile</p>
      </div>
    );
  }

  const getRoleIcon = () => {
    switch (user.role) {
      case 'captain':
        return <Crown size={isMobile ? 20 : 24} className="text-yellow-600" />;
      case 'volunteer':
        return <Shield size={isMobile ? 20 : 24} className="text-green-600" />;
      case 'player':
        return <Users size={isMobile ? 20 : 24} className="text-blue-600" />;
      default:
        return <User size={isMobile ? 20 : 24} className="text-gray-600" />;
    }
  };

  const getRoleColor = () => {
    switch (user.role) {
      case 'captain':
        return 'bg-yellow-100 text-yellow-800';
      case 'volunteer':
        return 'bg-green-100 text-green-800';
      case 'player':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const CardComponent = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => {
    if (isMobile) {
      return (
        <div className={`bg-white rounded-lg border border-gray-200 p-4 ${className}`}>
          {children}
        </div>
      );
    }
    return (
      <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${className}`}>
        {children}
      </div>
    );
  };

  const phoneNumber = user?.phone?.replace(/^\+91/, '') || '';
  const whatsappNumber = userProfile?.whatsappNumber?.replace(/^\+91/, '') || '';

  return (
    <div className={`${isMobile ? 'space-y-4' : 'max-w-4xl mx-auto space-y-6'}`}>
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      {/* Profile Header with Photo */}
      <CardComponent>
        <div className={`${isMobile ? 'text-center' : 'flex items-center space-x-6'}`}>
          {/* Profile Image */}
          <div className={`${isMobile ? 'inline-block mb-4' : 'flex-shrink-0'}`}>
            <DocumentUpload
              type="profilePhoto"
              label="Profile Photo"
              currentUrl={profileData?.userProfileImages?.profilePhotoPath}
              variant="profile"
              className="flex flex-col justify-center items-center"
              onSuccess={async () => {
                setError("");
                await refetch();
              }}
              onError={(error) => setError(error)}
            />
          </div>

          {/* Name and Role */}
          <div className={isMobile ? '' : 'flex-1'}>
            <h2 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-gray-900 mb-2`}>
              {user.firstName} {user.lastName}
            </h2>
            
            <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getRoleColor()}`}>
              {getRoleIcon()}
              <span className="ml-2 capitalize">{user.role}</span>
            </div>
          </div>
        </div>
      </CardComponent>

      {/* Personal Details */}
      <CardComponent>
        <h3 className={`${isMobile ? 'text-lg' : 'text-xl'} font-semibold mb-4`}>Personal Details</h3>
        
        <div className={`${isMobile ? 'space-y-4' : 'grid grid-cols-2 gap-6'}`}>
          <div>
            <p className="text-sm font-medium text-gray-700 mb-1">First Name</p>
            <p className="text-gray-900">{user.firstName || 'Not Available'}</p>
          </div>
          
          <div>
            <p className="text-sm font-medium text-gray-700 mb-1">Last Name</p>
            <p className="text-gray-900">{user.lastName || 'Not Available'}</p>
          </div>
          
          <div>
            <p className="text-sm font-medium text-gray-700 mb-1">Date of Birth</p>
            <p className="text-gray-900">
              {userProfile.dateOfBirth ? new Date(userProfile.dateOfBirth).toLocaleDateString() : 'Not Available'}
            </p>
          </div>
          
          <div>
            <p className="text-sm font-medium text-gray-700 mb-1">Gender</p>
            <p className="text-gray-900">
              {userProfile.gender === 'M' ? 'Male' : 
               userProfile.gender === 'F' ? 'Female' : 
               userProfile.gender === 'O' ? 'Others' : 'Not Available'}
            </p>
          </div>
          
          <div>
            <p className="text-sm font-medium text-gray-700 mb-1">Role</p>
            <p className="text-gray-900 capitalize">{user.role}</p>
          </div>
          
          <div>
            <p className="text-sm font-medium text-gray-700 mb-1">Preferred Language</p>
            <p className="text-gray-900">
              {userProfile.languagePreference === 'en' ? 'English' :
               userProfile.languagePreference === 'ta' ? 'Tamil' :
               userProfile.languagePreference === 'hi' ? 'Hindi' :
               userProfile.languagePreference === 'ml' ? 'Malayalam' :
               userProfile.languagePreference === 'te' ? 'Telugu' :
               userProfile.languagePreference === 'kn' ? 'Kannada' :
               userProfile.languagePreference === 'or' ? 'Odia' : 'English'}
            </p>
          </div>
        </div>
      </CardComponent>

      {/* Contact Information */}
      <CardComponent>
        <h3 className={`${isMobile ? 'text-lg' : 'text-xl'} font-semibold mb-4`}>Contact Information</h3>
        
        <div className={`${isMobile ? 'space-y-4' : 'grid grid-cols-2 gap-6'}`}>
          <div className="flex items-center">
            <Phone size={16} className="text-gray-500 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-700 mb-1">Phone Number</p>
              <p className="text-gray-900">+91 {phoneNumber || 'Not Available'}</p>
            </div>
          </div>

          <div className="flex items-center">
            <Phone size={16} className="text-green-500 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-700 mb-1">WhatsApp Number</p>
              <p className="text-gray-900">+91 {whatsappNumber || phoneNumber || 'Not Available'}</p>
            </div>
          </div>

          <div className="flex items-center">
            <Mail size={16} className="text-gray-500 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-700 mb-1">Email</p>
              <p className="text-gray-900">{user.email || 'Not Available'}</p>
            </div>
          </div>

          {userProfile.instagramHandle && (
            <div className="flex items-center">
              <Globe size={16} className="text-purple-500 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">Instagram</p>
                <p className="text-gray-900">{userProfile.instagramHandle}</p>
              </div>
            </div>
          )}
        </div>
      </CardComponent>

      {/* Address Information */}
      <CardComponent>
        <h3 className={`${isMobile ? 'text-lg' : 'text-xl'} font-semibold mb-4`}>Address Details</h3>
        
        {userProfile.pincode ? (
          <div className={`${isMobile ? 'space-y-4' : 'grid grid-cols-2 gap-6'}`}>
            <div className="flex items-start">
              <MapPin size={16} className="text-gray-500 mr-3 mt-1" />
              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">Pincode</p>
                <p className="text-gray-900">{userProfile.pincode}</p>
              </div>
            </div>
            
            <div>
              <p className="text-sm font-medium text-gray-700 mb-1">State</p>
              <p className="text-gray-900">{userProfile.state || 'Not Available'}</p>
            </div>
            
            <div>
              <p className="text-sm font-medium text-gray-700 mb-1">District</p>
              <p className="text-gray-900">{userProfile.district || 'Not Available'}</p>
            </div>
            
            <div>
              <p className="text-sm font-medium text-gray-700 mb-1">Taluk</p>
              <p className="text-gray-900">{userProfile.taluk || 'Not Available'}</p>
            </div>
            
            <div>
              <p className="text-sm font-medium text-gray-700 mb-1">Panchayat</p>
              <p className="text-gray-900">{userProfile.panchayat || 'Not Available'}</p>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No address information available</p>
          </div>
        )}
      </CardComponent>

      {/* Identity Verification */}
      <CardComponent>
        <h3 className={`${isMobile ? 'text-lg' : 'text-xl'} font-semibold mb-4`}>Identity Verification</h3>
        
        <div className={`${isMobile ? 'space-y-4' : 'grid grid-cols-2 gap-6'}`}>
          {/* Aadhaar Front */}
          <div>
            <div className="flex items-center mb-2">
              <CreditCard size={16} className="text-gray-500 mr-2" />
              <p className="text-sm font-medium text-gray-700">Aadhaar Card Front</p>
            </div>
            <DocumentUpload
              type="aadhaarFront"
              label="Aadhaar Front"
              currentUrl={profileData?.userProfileImages?.aadhaarFrontPath}
              variant="card"
              className="w-full"
              onSuccess={async () => {
                setError("");
                await refetch();
              }}
              onError={(error) => setError(error)}
            />
          </div>

          {/* Aadhaar Back */}
          <div>
            <div className="flex items-center mb-2">
              <CreditCard size={16} className="text-gray-500 mr-2" />
              <p className="text-sm font-medium text-gray-700">Aadhaar Card Back</p>
            </div>
            <DocumentUpload
              type="aadhaarBack"
              label="Aadhaar Back"
              currentUrl={profileData?.userProfileImages?.aadhaarBackPath}
              variant="card"
              className="w-full"
              onSuccess={async () => {
                setError("");
                await refetch();
              }}
              onError={(error) => setError(error)}
            />
          </div>
        </div>
      </CardComponent>

      {/* Account Information */}
      <CardComponent>
        <h3 className={`${isMobile ? 'text-lg' : 'text-xl'} font-semibold mb-4`}>Account Information</h3>
        
        <div className={`${isMobile ? 'space-y-3' : 'grid grid-cols-2 gap-6'}`}>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Member since</span>
            <span className="text-gray-900">
              {new Date(user.createdAt).toLocaleDateString()}
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Profile status</span>
            <span className={`px-2 py-1 text-xs rounded-full ${
              userProfile.profileComplete 
                ? 'bg-green-100 text-green-800' 
                : 'bg-yellow-100 text-yellow-800'
            }`}>
              {userProfile.profileComplete ? 'Complete' : 'Incomplete'}
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">User ID</span>
            <span className="text-gray-900 text-xs font-mono">{user.id.slice(0, 8)}...</span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Last updated</span>
            <span className="text-gray-900">
              {userProfile.updatedAt ? new Date(userProfile.updatedAt).toLocaleDateString() : 'N/A'}
            </span>
          </div>
        </div>
      </CardComponent>
    </div>
  );
}
