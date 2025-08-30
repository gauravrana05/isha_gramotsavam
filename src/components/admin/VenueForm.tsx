'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { z } from 'zod';
import { Edit, X, MapPin } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/AdvancedSelect';
import { api } from '@/server/trpc/react';

const venueSchema = z.object({
  name: z.string().min(1, 'Venue name is required').max(200),
  capacity: z.number().min(1).optional(),
  panchayat: z.string().max(100).optional(),
  taluk: z.string().max(100).optional(),
  district: z.string().min(1, 'District is required').max(100),
  state: z.string().min(1, 'State is required').max(100),
  pincode: z.string().max(10).optional(),
  contactPhone: z.string().max(20).optional(),
  contactEmail: z.string().email('Invalid email').optional(),
  contactPerson: z.string().max(100).optional(),
  facilities: z.string().optional(),
  isActive: z.boolean(),
});

export type VenueFormValues = z.infer<typeof venueSchema>;

interface VenueFormProps {
  initialData?: Partial<VenueFormValues>;
  onSubmit: (values: VenueFormValues) => void;
  onCancel: () => void;
  isLoading?: boolean;
  isEditMode?: boolean;
  onEdit?: () => void;
}

export const VenueForm: React.FC<VenueFormProps> = ({
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
  isEditMode = false,
  onEdit,
}) => {
  const [formData, setFormData] = useState<VenueFormValues>({
    name: '',
    capacity: undefined,
    panchayat: '',
    taluk: '',
    district: '',
    state: '',
    pincode: '',
    contactPhone: '',
    contactEmail: '',
    contactPerson: '',
    facilities: '',
    isActive: true,
    ...initialData,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [locationData, setLocationData] = useState<{
    districts: string[];
    taluks: string[];
    panchayats: string[];
  }>({
    districts: [],
    taluks: [],
    panchayats: []
  });

  // Location queries
  const { data: pincodeData, isLoading: pincodeLoading } = api.location.getLocationByPincode.useQuery(
    { pincode: formData.pincode || '' },
    { enabled: (formData.pincode?.length || 0) === 6 }
  );

  const { data: districtsData } = api.location.getDistricts.useQuery(
    { state: formData.state },
    { enabled: !!formData.state }
  );

  const { data: taluksData } = api.location.getTaluks.useQuery(
    { state: formData.state, district: formData.district },
    { enabled: !!formData.state && !!formData.district }
  );

  const { data: panchayatsData } = api.location.getPanchayats.useQuery(
    { state: formData.state, district: formData.district, taluk: formData.taluk || '' },
    { enabled: !!formData.state && !!formData.district && !!formData.taluk }
  );

  // Update location data when queries return
  useEffect(() => {
    if (districtsData) {
      setLocationData(prev => ({ ...prev, districts: districtsData }));
    }
  }, [districtsData]);

  useEffect(() => {
    if (taluksData) {
      setLocationData(prev => ({ ...prev, taluks: taluksData }));
    }
  }, [taluksData]);

  useEffect(() => {
    if (panchayatsData) {
      setLocationData(prev => ({ ...prev, panchayats: panchayatsData }));
    }
  }, [panchayatsData]);

  // Auto-populate from pincode
  useEffect(() => {
    if (pincodeData && !pincodeLoading) {
      setFormData(prev => ({
        ...prev,
        state: pincodeData.state || '',
        district: pincodeData.district || '',
        taluk: pincodeData.taluk || '',
        panchayat: ''
      }));
    }
  }, [pincodeData, pincodeLoading]);

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: '',
        capacity: undefined,
        panchayat: '',
        taluk: '',
        district: '',
        state: '',
        pincode: '',
        contactPhone: '',
        contactEmail: '',
        contactPerson: '',
        facilities: '',
        isActive: true,
        ...initialData,
      });
    }
  }, [initialData]);

  // Reset dependent fields when parent location changes
  const handleLocationChange = (field: keyof VenueFormValues, value: string) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };
      
      // Reset dependent fields
      if (field === 'district') {
        newData.taluk = '';
        newData.panchayat = '';
      } else if (field === 'taluk') {
        newData.panchayat = '';
      }
      
      return newData;
    });
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const validatedData = venueSchema.parse(formData);
      setErrors({});
      onSubmit(validatedData);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        error.issues.forEach((issue) => {
          if (issue.path[0]) {
            fieldErrors[issue.path[0] as string] = issue.message;
          }
        });
        setErrors(fieldErrors);
      }
    }
  };

  const handleInputChange = (field: keyof VenueFormValues, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const isViewMode = initialData && !isEditMode;
  const formId = isEditMode ? 'venue-edit-form' : 'venue-form';

  return (
    <div className="space-y-8">
      <form id={formId} onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Information */}
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">
              Basic Information
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Venue Name *
                </label>
                {isViewMode ? (
                  <p className="text-gray-900 py-2">{formData.name}</p>
                ) : (
                  <>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#4A2F1D] focus:border-transparent ${
                        errors.name ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Enter venue name"
                    />
                    {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
                  </>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Capacity
                </label>
                {isViewMode ? (
                  <p className="text-gray-900 py-2">{formData.capacity || 'Not specified'}</p>
                ) : (
                  <input
                    type="number"
                    value={formData.capacity || ''}
                    onChange={(e) => handleInputChange('capacity', e.target.value ? parseInt(e.target.value) : undefined)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4A2F1D] focus:border-transparent"
                    placeholder="Enter capacity"
                    min="1"
                  />
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Facilities
              </label>
              {isViewMode ? (
                <p className="text-gray-900 py-2">{formData.facilities || 'No facilities specified'}</p>
              ) : (
                <textarea
                  value={formData.facilities}
                  onChange={(e) => handleInputChange('facilities', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4A2F1D] focus:border-transparent"
                  placeholder="Describe available facilities"
                  rows={3}
                />
              )}
            </div>
          </div>

          {/* Location Information */}
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2 flex items-center">
              <MapPin className="w-5 h-5 mr-2" />
              Location
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pincode
                </label>
                {isViewMode ? (
                  <p className="text-gray-900 py-2">{formData.pincode || 'Not specified'}</p>
                ) : (
                  <input
                    type="text"
                    value={formData.pincode}
                    onChange={(e) => handleInputChange('pincode', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4A2F1D] focus:border-transparent"
                    placeholder="Enter pincode to auto-fill location"
                    maxLength={6}
                  />
                )}
                {pincodeLoading && (
                  <p className="text-sm text-blue-600 mt-1">Loading location...</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  State *
                </label>
                {isViewMode ? (
                  <p className="text-gray-900 py-2">{formData.state}</p>
                ) : (
                  <>
                    <input
                      type="text"
                      value={formData.state}
                      onChange={(e) => handleInputChange('state', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#4A2F1D] focus:border-transparent ${
                        errors.state ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Enter state"
                    />
                    {errors.state && <p className="text-red-500 text-sm mt-1">{errors.state}</p>}
                  </>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  District *
                </label>
                {isViewMode ? (
                  <p className="text-gray-900 py-2">{formData.district}</p>
                ) : (
                  <>
                    <Select
                      value={formData.district}
                      onValueChange={(value) => handleLocationChange('district', value)}
                    >
                      <SelectTrigger className={`w-full ${errors.district ? 'border-red-500' : ''}`}>
                        <SelectValue placeholder="Select district" />
                      </SelectTrigger>
                      <SelectContent>
                        {locationData.districts.map((district) => (
                          <SelectItem key={district} value={district}>
                            {district}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.district && <p className="text-red-500 text-sm mt-1">{errors.district}</p>}
                  </>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Taluk
                </label>
                {isViewMode ? (
                  <p className="text-gray-900 py-2">{formData.taluk || 'Not specified'}</p>
                ) : (
                  <Select
                    value={formData.taluk || ''}
                    onValueChange={(value) => handleLocationChange('taluk', value)}
                    disabled={!formData.district}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select taluk" />
                    </SelectTrigger>
                    <SelectContent>
                      {locationData.taluks.map((taluk) => (
                        <SelectItem key={taluk} value={taluk}>
                          {taluk}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Panchayat
                </label>
                {isViewMode ? (
                  <p className="text-gray-900 py-2">{formData.panchayat || 'Not specified'}</p>
                ) : (
                  <Select
                    value={formData.panchayat || ''}
                    onValueChange={(value) => handleInputChange('panchayat', value)}
                    disabled={!formData.taluk}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select panchayat" />
                    </SelectTrigger>
                    <SelectContent>
                      {locationData.panchayats.map((panchayat) => (
                        <SelectItem key={panchayat} value={panchayat}>
                          {panchayat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">
              Contact Information
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contact Person
                </label>
                {isViewMode ? (
                  <p className="text-gray-900 py-2">{formData.contactPerson || 'Not specified'}</p>
                ) : (
                  <input
                    type="text"
                    value={formData.contactPerson}
                    onChange={(e) => handleInputChange('contactPerson', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4A2F1D] focus:border-transparent"
                    placeholder="Enter contact person name"
                  />
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contact Phone
                </label>
                {isViewMode ? (
                  <p className="text-gray-900 py-2">{formData.contactPhone || 'Not specified'}</p>
                ) : (
                  <input
                    type="tel"
                    value={formData.contactPhone}
                    onChange={(e) => handleInputChange('contactPhone', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4A2F1D] focus:border-transparent"
                    placeholder="Enter phone number"
                    maxLength={20}
                  />
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contact Email
                </label>
                {isViewMode ? (
                  <p className="text-gray-900 py-2">{formData.contactEmail || 'Not specified'}</p>
                ) : (
                  <>
                    <input
                      type="email"
                      value={formData.contactEmail}
                      onChange={(e) => handleInputChange('contactEmail', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#4A2F1D] focus:border-transparent ${
                        errors.contactEmail ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Enter email address"
                    />
                    {errors.contactEmail && <p className="text-red-500 text-sm mt-1">{errors.contactEmail}</p>}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Status */}
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">
              Status
            </h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Venue Status
              </label>
              {isViewMode ? (
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  formData.isActive 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {formData.isActive ? 'Active' : 'Inactive'}
                </span>
              ) : (
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.isActive}
                    onChange={(e) => handleInputChange('isActive', e.target.checked)}
                    className="w-4 h-4 text-[#4A2F1D] border-gray-300 rounded focus:ring-[#4A2F1D]"
                  />
                  <label htmlFor="isActive" className="ml-2 text-sm text-gray-700">
                    Active venue (available for assignments)
                  </label>
                </div>
              )}
            </div>
          </div>
        </form>
    </div>
  );
};
