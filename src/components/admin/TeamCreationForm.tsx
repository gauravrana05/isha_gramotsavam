import React, { useState, useEffect, useMemo } from 'react';
import { Users, Plus, Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/AdvancedSelect';
import { api } from '@/server/trpc/react';

export interface TeamCreationFormValues {
  name: string;
  description: string;
  sportId: string;
  genderCategory: 'men' | 'women' | 'mixed';
  panchayat: string;
  district: string;
  state: string;
  taluk: string;
  captainPhone: string;
  captainFirstName: string;
  captainLastName: string;
  captainDob: string;
  captainGender: 'M' | 'F';
}

interface TeamCreationFormProps {
  onSubmit: (values: TeamCreationFormValues) => void;
  isLoading: boolean;
  formRef?: React.RefObject<HTMLFormElement>; // Add formRef prop
}

export const TeamCreationForm: React.FC<TeamCreationFormProps> = ({
  onSubmit,
  isLoading,
  formRef, // Destructure formRef
}) => {
  const [formData, setFormData] = useState<TeamCreationFormValues>({
    name: '',
    description: '',
    sportId: '',
    genderCategory: 'men', // Default to men, will be updated based on sport
    panchayat: '',
    district: '',
    state: '',
    taluk: '',
    captainPhone: '',
    captainFirstName: '',
    captainLastName: '',
    captainDob: '',
    captainGender: 'M',
  });

  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof TeamCreationFormValues, string>>>({});
  const [playerExists, setPlayerExists] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  // tRPC query for sports
  const { data: sportsData, isLoading: sportsLoading } = api.admin.getSports.useQuery({
    includeTeamCounts: false,
    includeGenderCategories: true,
  });

  const sports = useMemo(() => {
    if (!sportsData || !sportsData.sports) return [];
    return sportsData.sports.filter(sport => sport.isActive !== false);
  }, [sportsData]);

  const selectedSport = useMemo(() => {
    return sports.find(sport => sport.id === formData.sportId);
  }, [formData.sportId, sports]);

  // Effect to update genderCategory when sport changes
  useEffect(() => {
    if (selectedSport) {
      // If the sport has specific gender categories, default to the first one
      // Otherwise, keep the current genderCategory or default to 'men'
      if (selectedSport.genderCategories && selectedSport.genderCategories.length > 0) {
        const firstCategory = selectedSport.genderCategories[0] as 'men' | 'women' | 'mixed';
        setFormData(prev => ({ ...prev, genderCategory: firstCategory }));
      } else {
        setFormData(prev => ({ ...prev, genderCategory: 'men' }));
      }
    }
  }, [selectedSport]);

  // tRPC query for captain search
  const { data: captainData, isLoading: captainSearchLoading } = api.admin.searchUserByPhone.useQuery(
    { phone: formData.captainPhone },
    {
      enabled: formData.captainPhone.length === 10 && isSearching,
      onSuccess: (data) => {
        if (data?.user) {
          setPlayerExists(true);
          setFormData(prev => ({
            ...prev,
            captainFirstName: data.user.firstName || '',
            captainLastName: data.user.lastName || '',
            captainDob: data.user.dob || '',
            captainGender: (data.user.gender as 'M' | 'F') || ''
          }));
        } else {
          setPlayerExists(false);
          setFormData(prev => ({
            ...prev,
            captainFirstName: '',
            captainLastName: '',
            captainDob: '',
            captainGender: ''
          }));
        }
        setIsSearching(false);
      },
      onError: () => {
        setPlayerExists(false);
        setIsSearching(false);
        setFormData(prev => ({
          ...prev,
          captainFirstName: '',
          captainLastName: '',
          captainDob: '',
          captainGender: ''
        }));
      }
    }
  );

  const handleInputChange = (field: keyof TeamCreationFormValues, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setFieldErrors(prev => ({ ...prev, [field]: undefined }));
  };

  const handlePhoneSearch = (phone: string) => {
    setFormData(prev => ({ ...prev, captainPhone: phone }));
    setPlayerExists(false);
    if (phone.length === 10) {
      setIsSearching(true);
    } else {
      setIsSearching(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Partial<Record<keyof TeamCreationFormValues, string>> = {};

    // Validation logic
    if (!formData.name.trim()) {
      errors.name = 'Team name is required';
    }
    if (!formData.sportId) {
      errors.sportId = 'Please select a sport';
    }
    if (!formData.captainPhone.trim()) {
      errors.captainPhone = 'Captain phone number is required';
    } else if (formData.captainPhone.length !== 10) {
      errors.captainPhone = 'Captain phone number must be 10 digits';
    }
    if (!formData.captainFirstName.trim()) {
      errors.captainFirstName = 'Captain first name is required';
    }
    if (!formData.captainLastName.trim()) {
      errors.captainLastName = 'Captain last name is required';
    }
    if (!formData.captainDob.trim()) {
      errors.captainDob = 'Captain date of birth is required';
    }
    if (!formData.captainGender) {
      errors.captainGender = 'Captain gender is required';
    }
    if (!formData.panchayat || !formData.district || !formData.state) {
      errors.panchayat = 'Location information is required'; // Assign to panchayat for simplicity
    }

    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      return; // Prevent submission if there are errors
    }

    onSubmit(formData);
  };

  return (
    <form ref={formRef} onSubmit={handleFormSubmit} className="flex flex-col flex-grow overflow-y-auto">
      <div className="space-y-6 p-4 sm:p-6">
      {/* Team Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
          <Users className="w-5 h-5 text-[#F28C38]" />
          Team Information
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Team Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              className={`w-full px-3 py-2 border ${fieldErrors.name ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-[#F28C38] focus:border-[#F28C38]`}
              placeholder="Enter team name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              maxLength={50}
              disabled={isLoading}
            />
            {fieldErrors.name && <p className="mt-1 text-sm text-red-600">{fieldErrors.name}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sport <span className="text-red-500">*</span>
            </label>
            <Select 
              value={formData.sportId} 
              onValueChange={(value) => handleInputChange('sportId', value)}
              disabled={sportsLoading || isLoading}
            >
              <SelectTrigger className={`w-full px-3 py-2 border ${fieldErrors.sportId ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-[#F28C38] focus:border-[#F28C38]`}>
                <SelectValue placeholder={sportsLoading ? 'Loading sports...' : 'Select a sport'} />
              </SelectTrigger>
              <SelectContent>
                {Array.isArray(sports) && sports.map((sport) => (
                  <SelectItem key={sport.id} value={sport.id}>
                    {sport.displayName || sport.name} {sport.genderCategories?.includes('women') && !sport.genderCategories?.includes('men') ? '(Women Only)' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fieldErrors.sportId && <p className="mt-1 text-sm text-red-600">{fieldErrors.sportId}</p>}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description (Optional)
          </label>
          <textarea
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F28C38] focus:border-[#F28C38]"
            placeholder="Brief description about the team"
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            rows={3}
            maxLength={200}
            disabled={isLoading}
          />
        </div>

        {selectedSport && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-blue-700 text-sm">
              <strong>{selectedSport.name}:</strong> Maximum {selectedSport.mainPlayersCount + selectedSport.maxSubstitutes} players per team.
              {selectedSport.genderCategories?.includes('women') && !selectedSport.genderCategories?.includes('men') && ' (Women only)'}
            </p>
          </div>
        )}
      </div>

      {/* Location */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Team Location</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Panchayat <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
              value={formData.panchayat}
              readOnly
              disabled={isLoading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              District <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
              value={formData.district}
              readOnly
              disabled={isLoading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              State <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
              value={formData.state}
              readOnly
              disabled={isLoading}
            />
          </div>
        </div>
      </div>

      {/* Captain Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Team Captain</h3>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Captain Phone Number <span className="text-red-500">*</span>
          </label>
          <input
            type="tel"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F28C38] focus:border-[#F28C38]"
            placeholder="Enter 10-digit mobile number"
            value={formData.captainPhone}
            onChange={(e) => {
              const phone = e.target.value.replace(/\D/g, '').slice(0, 10);
              handlePhoneSearch(phone);
            }}
            disabled={isLoading}
          />
          {(isSearching || captainSearchLoading) && (
            <p className="mt-1 text-sm text-gray-500 flex items-center">
              <Loader2 className="w-4 h-4 animate-spin mr-1" />
              Searching for captain...
            </p>
          )}
          {!isSearching && !captainSearchLoading && playerExists && (
            <p className="mt-1 text-sm text-green-600">
              ✓ Captain found - details populated
            </p>
          )}
          {!isSearching && !captainSearchLoading && formData.captainPhone.length === 10 && !playerExists && (
            <p className="mt-1 text-sm text-blue-600">
              New captain - please fill details below
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              First Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F28C38] focus:border-[#F28C38]"
              placeholder="Enter first name"
              value={formData.captainFirstName}
              onChange={(e) => handleInputChange('captainFirstName', e.target.value)}
              readOnly={playerExists}
              disabled={isLoading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Last Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F28C38] focus:border-[#F28C38]"
              placeholder="Enter last name"
              value={formData.captainLastName}
              onChange={(e) => handleInputChange('captainLastName', e.target.value)}
              readOnly={playerExists}
              disabled={isLoading}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date of Birth <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F28C38] focus:border-[#F28C38]"
              value={formData.captainDob}
              onChange={(e) => handleInputChange('captainDob', e.target.value)}
              readOnly={playerExists}
              disabled={isLoading}
              max={new Date(new Date().setFullYear(new Date().getFullYear() - 16)).toISOString().split('T')[0]}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Gender <span className="text-red-500">*</span>
            </label>
            <Select 
              value={formData.captainGender} 
              onValueChange={(value) => handleInputChange('captainGender', value as 'M' | 'F')}
              disabled={playerExists || isLoading}
            >
              <SelectTrigger className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F28C38] focus:border-[#F28C38]">
                <SelectValue placeholder="Select gender" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="M">Male</SelectItem>
                <SelectItem value="F">Female</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-yellow-700 text-sm">
            <strong>Note:</strong> The captain will be automatically added to the team with approved status. All team members must be from the same panchayat.
          </p>
        </div>
      </div> 
    </form>
  );
};