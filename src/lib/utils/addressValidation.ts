// src/lib/utils/addressValidation.ts
import { AddressData } from '@/lib/services/pincodeService';

// Define the ProfileFormData interface based on the CompleteProfilePage state
export interface ProfileFormData {
  name: string;
  pincode: string;
  village: string;
  panchayat: string;
  district: string;
  state: string;
  language: string;
  aadharPhotoFront: File | null;
  aadharPhotoBack: File | null;
  profilePhoto: File | null;
}

export interface AddressValidationError {
  field: keyof ProfileFormData; // Ensures field names match form data keys
  message: string;
}

export const validateAddress = (formData: ProfileFormData): AddressValidationError[] => {
  const errors: AddressValidationError[] = [];

  // Required field validations
  if (!formData.name.trim()) {
    errors.push({ field: 'name', message: 'Name is required' });
  }

  if (!formData.pincode.trim()) {
    errors.push({ field: 'pincode', message: 'Pincode is required' });
  } else if (!/^\d{6}$/.test(formData.pincode)) {
    errors.push({ field: 'pincode', message: 'Pincode must be 6 digits' });
  }

  if (!formData.village.trim()) {
    errors.push({ field: 'village', message: 'Village is required' });
  }

  if (!formData.district.trim()) {
    errors.push({ field: 'district', message: 'District is required' });
  }

  if (!formData.state.trim()) {
    errors.push({ field: 'state', message: 'State is required' });
  }

  // Ensure both Aadhaar photos are uploaded if one is
  if ((formData.aadharPhotoFront && !formData.aadharPhotoBack) ||
    (!formData.aadharPhotoFront && formData.aadharPhotoBack)) {
    errors.push({ field: 'aadharPhotoFront', message: 'Please upload both front and back of Aadhaar' }); // Adjust message key as needed
    errors.push({ field: 'aadharPhotoBack', message: 'Please upload both front and back of Aadhaar' }); // Adjust message key as needed
  }


  return errors;
};

export const formatAddressForDisplay = (addressData: AddressData | null): string => {
  if (!addressData) return '';

  const parts = [
    addressData.name,
    addressData.district,
    addressData.state,
    addressData.pincode
  ].filter(Boolean);

  return parts.join(', ');
};

export const normalizeAddressData = (addressData: AddressData): Partial<ProfileFormData> => {
  return {
    district: addressData.district || '',
    state: addressData.state || '',
    panchayat: addressData.panchayat || '',
  };
};

export const isValidPincode = (pincode: string): boolean => {
  return /^\d{6}$/.test(pincode.trim());
};

export const formatPincode = (pincode: string): string => {
  return pincode.replace(/\D/g, '').slice(0, 6);
};