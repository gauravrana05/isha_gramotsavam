'use client';

import { useState } from 'react';
import { User, Edit, Camera, Phone, Mail, MapPin, Calendar, Shield, Crown, Users } from 'lucide-react';
import { MobileCard } from '../ui/MobileCard';
import { MobileButton } from '../ui/MobileButton';
import { useAuth } from '@/context/AuthContext';

export function MobileProfilePage() {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);

  if (!user) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500">Please log in to view your profile</p>
      </div>
    );
  }

  const getRoleIcon = () => {
    switch (user.role) {
      case 'captain':
        return <Crown size={20} className="text-yellow-600" />;
      case 'volunteer':
        return <Shield size={20} className="text-green-600" />;
      case 'player':
        return <Users size={20} className="text-blue-600" />;
      default:
        return <User size={20} className="text-gray-600" />;
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

  return (
    <div className="space-y-4">
      {/* Profile Header */}
      <MobileCard>
        <div className="text-center">
          {/* Profile Image */}
          <div className="relative inline-block mb-4">
            {user.profileImages?.profilePhotoPath ? (
              <img
                src={user.profileImages.profilePhotoPath}
                alt="Profile"
                className="w-24 h-24 rounded-full object-cover mx-auto border-4 border-white shadow-lg"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center mx-auto border-4 border-white shadow-lg">
                <User size={32} className="text-gray-600" />
              </div>
            )}
            
            <button className="absolute bottom-0 right-0 w-8 h-8 bg-[#2C5282] rounded-full flex items-center justify-center shadow-lg">
              <Camera size={16} className="text-white" />
            </button>
          </div>

          {/* Name and Role */}
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            {user.firstName} {user.lastName}
          </h2>
          
          <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getRoleColor()}`}>
            {getRoleIcon()}
            <span className="ml-2 capitalize">{user.role}</span>
          </div>
        </div>
      </MobileCard>

      {/* Contact Information */}
      <MobileCard>
        <div className="flex items-center justify-between mb-3">
          <h3 className="mobile-card-title">Contact Information</h3>
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="p-2 text-gray-500 hover:text-gray-700"
          >
            <Edit size={16} />
          </button>
        </div>

        <div className="space-y-3">
          <div className="flex items-center">
            <Phone size={16} className="text-gray-500 mr-3" />
            <div>
              <p className="text-sm text-gray-600">Phone</p>
              <p className="font-medium">{user.phone || 'Not provided'}</p>
            </div>
          </div>

          <div className="flex items-center">
            <Mail size={16} className="text-gray-500 mr-3" />
            <div>
              <p className="text-sm text-gray-600">Email</p>
              <p className="font-medium">{user.email || 'Not provided'}</p>
            </div>
          </div>

          {user.whatsappNumber && (
            <div className="flex items-center">
              <Phone size={16} className="text-green-500 mr-3" />
              <div>
                <p className="text-sm text-gray-600">WhatsApp</p>
                <p className="font-medium">{user.whatsappNumber}</p>
              </div>
            </div>
          )}
        </div>
      </MobileCard>

      {/* Personal Information */}
      <MobileCard>
        <h3 className="mobile-card-title mb-3">Personal Information</h3>
        
        <div className="space-y-3">
          {user.dateOfBirth && (
            <div className="flex items-center">
              <Calendar size={16} className="text-gray-500 mr-3" />
              <div>
                <p className="text-sm text-gray-600">Date of Birth</p>
                <p className="font-medium">
                  {new Date(user.dateOfBirth).toLocaleDateString()}
                </p>
              </div>
            </div>
          )}

          {user.gender && (
            <div className="flex items-center">
              <User size={16} className="text-gray-500 mr-3" />
              <div>
                <p className="text-sm text-gray-600">Gender</p>
                <p className="font-medium">
                  {user.gender === 'M' ? 'Male' : user.gender === 'F' ? 'Female' : 'Other'}
                </p>
              </div>
            </div>
          )}
        </div>
      </MobileCard>

      {/* Location Information */}
      <MobileCard>
        <h3 className="mobile-card-title mb-3">Location</h3>
        
        <div className="space-y-3">
          <div className="flex items-start">
            <MapPin size={16} className="text-gray-500 mr-3 mt-1" />
            <div>
              <p className="text-sm text-gray-600">Address</p>
              <div className="font-medium">
                {user.panchayat && <p>{user.panchayat}</p>}
                {user.taluk && <p>{user.taluk}</p>}
                {user.district && <p>{user.district}</p>}
                {user.state && <p>{user.state}</p>}
                {user.pincode && <p>{user.pincode}</p>}
              </div>
            </div>
          </div>
        </div>
      </MobileCard>

      {/* Account Information */}
      <MobileCard>
        <h3 className="mobile-card-title mb-3">Account</h3>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Member since</span>
            <span className="font-medium">
              {new Date(user.createdAt).toLocaleDateString()}
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Profile status</span>
            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
              Active
            </span>
          </div>
        </div>
      </MobileCard>

      {/* Action Buttons */}
      <div className="space-y-3">
        <MobileButton
          variant="primary"
          fullWidth
          onClick={() => setIsEditing(true)}
        >
          Edit Profile
        </MobileButton>
        
        <MobileButton
          variant="secondary"
          fullWidth
          onClick={() => console.log('Change password')}
        >
          Change Password
        </MobileButton>
      </div>

      {/* App Information */}
      <MobileCard>
        <h3 className="mobile-card-title mb-3">App Information</h3>
        
        <div className="space-y-2 text-sm text-gray-600">
          <div className="flex justify-between">
            <span>Version</span>
            <span>1.0.0</span>
          </div>
          <div className="flex justify-between">
            <span>Last sync</span>
            <span>Just now</span>
          </div>
          <div className="flex justify-between">
            <span>Storage used</span>
            <span>2.3 MB</span>
          </div>
        </div>
      </MobileCard>
    </div>
  );
}
