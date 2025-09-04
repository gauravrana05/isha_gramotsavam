'use client';

import { useState } from 'react';
import { User, Edit, Camera, Phone, Mail, MapPin, Calendar, Shield, Crown, Users, Save, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useMobileDetection } from '@/hooks/useMobileDetection';

export function ProfilePage() {
  const { user } = useAuth();
  const { isMobile } = useMobileDetection();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    phone: user?.phone || '',
    whatsappNumber: user?.whatsappNumber || '',
    email: user?.email || '',
    dateOfBirth: user?.dateOfBirth ? new Date(user.dateOfBirth).toISOString().split('T')[0] : '',
    gender: user?.gender || '',
    panchayat: user?.panchayat || '',
    taluk: user?.taluk || '',
    district: user?.district || '',
    state: user?.state || '',
    pincode: user?.pincode || ''
  });

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

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    try {
      console.log('Saving profile data:', formData);
      // TODO: Implement profile update API call
      setIsEditing(false);
    } catch (error) {
      console.error('Error saving profile:', error);
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

  const ButtonComponent = ({ 
    children, 
    onClick, 
    variant = 'primary', 
    className = '' 
  }: { 
    children: React.ReactNode; 
    onClick: () => void; 
    variant?: 'primary' | 'secondary';
    className?: string;
  }) => {
    const baseClasses = isMobile 
      ? 'w-full py-3 px-4 rounded-lg font-medium text-sm transition-colors'
      : 'px-6 py-2 rounded-lg font-medium text-sm transition-colors';
    
    const variantClasses = variant === 'primary'
      ? 'bg-[#2C5282] text-white hover:bg-[#2D3748]'
      : 'bg-gray-100 text-gray-700 hover:bg-gray-200';

    return (
      <button
        onClick={onClick}
        className={`${baseClasses} ${variantClasses} ${className}`}
      >
        {children}
      </button>
    );
  };

  const InputComponent = ({ 
    label, 
    value, 
    onChange, 
    type = 'text',
    className = ''
  }: { 
    label: string; 
    value: string; 
    onChange: (value: string) => void; 
    type?: string;
    className?: string;
  }) => (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      {type === 'select' ? (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Select Gender</option>
          <option value="M">Male</option>
          <option value="F">Female</option>
          <option value="O">Other</option>
        </select>
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      )}
    </div>
  );

  return (
    <div className={`${isMobile ? 'space-y-4' : 'max-w-4xl mx-auto space-y-6'}`}>
      {/* Profile Header */}
      <CardComponent>
        <div className={`${isMobile ? 'text-center' : 'flex items-center space-x-6'}`}>
          {/* Profile Image */}
          <div className={`relative ${isMobile ? 'inline-block mb-4' : 'flex-shrink-0'}`}>
            {user.profileImages?.profilePhotoPath ? (
              <img
                src={user.profileImages.profilePhotoPath}
                alt="Profile"
                className={`${isMobile ? 'w-24 h-24' : 'w-32 h-32'} rounded-full object-cover ${isMobile ? 'mx-auto border-4 border-white shadow-lg' : 'border-4 border-gray-200'}`}
              />
            ) : (
              <div className={`${isMobile ? 'w-24 h-24' : 'w-32 h-32'} rounded-full bg-gray-200 flex items-center justify-center ${isMobile ? 'mx-auto border-4 border-white shadow-lg' : 'border-4 border-gray-200'}`}>
                <User size={isMobile ? 32 : 48} className="text-gray-600" />
              </div>
            )}
            
            <button className={`absolute bottom-0 right-0 ${isMobile ? 'w-8 h-8' : 'w-10 h-10'} bg-[#2C5282] rounded-full flex items-center justify-center shadow-lg`}>
              <Camera size={isMobile ? 16 : 20} className="text-white" />
            </button>
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

            {!isMobile && (
              <div className="mt-4">
                <ButtonComponent
                  onClick={() => setIsEditing(!isEditing)}
                  variant="secondary"
                >
                  <Edit size={16} className="mr-2" />
                  {isEditing ? 'Cancel Edit' : 'Edit Profile'}
                </ButtonComponent>
              </div>
            )}
          </div>
        </div>
      </CardComponent>

      {/* Edit Mode */}
      {isEditing && (
        <CardComponent>
          <div className="flex items-center justify-between mb-4">
            <h3 className={`${isMobile ? 'text-lg' : 'text-xl'} font-semibold`}>Edit Profile</h3>
            {!isMobile && (
              <button
                onClick={() => setIsEditing(false)}
                className="p-2 text-gray-500 hover:text-gray-700"
              >
                <X size={20} />
              </button>
            )}
          </div>

          <div className={`${isMobile ? 'space-y-4' : 'grid grid-cols-2 gap-6'}`}>
            <InputComponent
              label="First Name"
              value={formData.firstName}
              onChange={(value) => handleInputChange('firstName', value)}
            />
            
            <InputComponent
              label="Last Name"
              value={formData.lastName}
              onChange={(value) => handleInputChange('lastName', value)}
            />
            
            <InputComponent
              label="Phone Number"
              value={formData.phone}
              onChange={(value) => handleInputChange('phone', value)}
              type="tel"
            />
            
            <InputComponent
              label="WhatsApp Number"
              value={formData.whatsappNumber}
              onChange={(value) => handleInputChange('whatsappNumber', value)}
              type="tel"
            />
            
            <InputComponent
              label="Email"
              value={formData.email}
              onChange={(value) => handleInputChange('email', value)}
              type="email"
            />
            
            <InputComponent
              label="Date of Birth"
              value={formData.dateOfBirth}
              onChange={(value) => handleInputChange('dateOfBirth', value)}
              type="date"
            />
            
            <InputComponent
              label="Gender"
              value={formData.gender}
              onChange={(value) => handleInputChange('gender', value)}
              type="select"
            />
            
            <InputComponent
              label="Panchayat"
              value={formData.panchayat}
              onChange={(value) => handleInputChange('panchayat', value)}
            />
            
            <InputComponent
              label="Taluk"
              value={formData.taluk}
              onChange={(value) => handleInputChange('taluk', value)}
            />
            
            <InputComponent
              label="District"
              value={formData.district}
              onChange={(value) => handleInputChange('district', value)}
            />
            
            <InputComponent
              label="State"
              value={formData.state}
              onChange={(value) => handleInputChange('state', value)}
            />
            
            <InputComponent
              label="Pincode"
              value={formData.pincode}
              onChange={(value) => handleInputChange('pincode', value)}
            />
          </div>

          <div className={`${isMobile ? 'mt-6 space-y-3' : 'mt-6 flex justify-end space-x-3'}`}>
            <ButtonComponent
              onClick={() => setIsEditing(false)}
              variant="secondary"
            >
              Cancel
            </ButtonComponent>
            
            <ButtonComponent
              onClick={handleSave}
              variant="primary"
            >
              <Save size={16} className="mr-2" />
              Save Changes
            </ButtonComponent>
          </div>
        </CardComponent>
      )}

      {/* Contact Information */}
      {!isEditing && (
        <CardComponent>
          <h3 className={`${isMobile ? 'text-lg' : 'text-xl'} font-semibold mb-4`}>Contact Information</h3>
          
          <div className={`${isMobile ? 'space-y-3' : 'grid grid-cols-2 gap-6'}`}>
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
        </CardComponent>
      )}

      {/* Mobile Edit Button */}
      {isMobile && !isEditing && (
        <div className="space-y-3">
          <ButtonComponent
            onClick={() => setIsEditing(true)}
            variant="primary"
          >
            Edit Profile
          </ButtonComponent>
        </div>
      )}
    </div>
  );
}
