'use client';

import React, { useState, useEffect } from 'react';
import { X, Users, Plus, Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/AdvancedSelect';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useNotification } from '@/context/NotificationContext';
import { api } from '@/server/trpc/react';
import { normalizePhoneNumber } from '@/lib/utils/phone';

interface CreateTeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  venueLocation?: {
    panchayat: string;
    district: string;
    state: string;
    taluk?: string;
  };
  venueId: string;
  onTeamCreated: () => void;
}

interface FormData {
  name: string;
  description: string;
  sportId: string;
  panchayat: string;
  district: string;
  state: string;
  taluk: string;
  captainPhone: string;
  captainFirstName: string;
  captainLastName: string;
  captainDob: string;
  captainGender: 'M' | 'F' | '';
}

const CreateTeamModal: React.FC<CreateTeamModalProps> = ({
  isOpen,
  onClose,
  venueLocation,
  venueId,
  onTeamCreated
}) => {
  const router = useRouter();
  const { lang } = useParams();
  const { user } = useAuth();
  const { addNotification } = useNotification();

  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    sportId: '',
    panchayat: venueLocation?.panchayat || '',
    district: venueLocation?.district || '',
    state: venueLocation?.state || '',
    taluk: venueLocation?.taluk || '',
    captainPhone: '',
    captainFirstName: '',
    captainLastName: '',
    captainDob: '',
    captainGender: ''
  });

  const [error, setError] = useState('');
  const [playerExists, setPlayerExists] = useState(false);

  // Get sports data
  const { data: sports = [], isLoading: sportsLoading } = api.volunteers.venue.getAllSports.useQuery();

  // Search for existing user by phone
  const { data: existingUser, refetch: searchUser } = api.volunteers.venue.searchUserByPhone.useQuery(
    { phone: formData.captainPhone },
    { enabled: false }
  );

  // Create team mutation
  const createTeamMutation = api.volunteers.venue.createTeam.useMutation({
    onSuccess: (result) => {
      addNotification('Team created successfully!', 'success');
      onTeamCreated();
      onClose();
      
      if (result.teamId) {
        router.push(`/${lang}/volunteer/venues/${venueId}/teams/${result.teamId}`);
      }
      
      resetForm();
    },
    onError: (error) => {
      setError(error.message || 'Failed to create team');
    }
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      sportId: '',
      panchayat: venueLocation?.panchayat || '',
      district: venueLocation?.district || '',
      state: venueLocation?.state || '',
      taluk: venueLocation?.taluk || '',
      captainPhone: '',
      captainFirstName: '',
      captainLastName: '',
      captainDob: '',
      captainGender: ''
    });
    setPlayerExists(false);
    setError('');
  };

  // Handle phone search
  const handlePhoneSearch = async (phone: string) => {
    setFormData(prev => ({ ...prev, captainPhone: phone }));
    setPlayerExists(false);
    
    if (phone.length === 10) {
      try {
        const result = await searchUser();
        if (result.data) {
          setPlayerExists(true);
          setFormData(prev => ({
            ...prev,
            captainFirstName: result.data.firstName || '',
            captainLastName: result.data.lastName || '',
            captainDob: result.data.dateOfBirth ? new Date(result.data.dateOfBirth).toISOString().split('T')[0] : '',
            captainGender: result.data.gender || ''
          }));
        } else {
          setFormData(prev => ({
            ...prev,
            captainFirstName: '',
            captainLastName: '',
            captainDob: '',
            captainGender: ''
          }));
        }
      } catch (error) {
        console.error('Failed to search for player:', error);
      }
    }
  };

  useEffect(() => {
    if (isOpen) {
      resetForm();
    }
  }, [isOpen]);

  useEffect(() => {
    if (venueLocation) {
      setFormData(prev => ({
        ...prev,
        panchayat: venueLocation.panchayat,
        district: venueLocation.district,
        state: venueLocation.state,
        taluk: venueLocation.taluk || ''
      }));
    }
  }, [venueLocation]);

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  const handleSubmit = async () => {
    if (!user) {
      setError('You must be logged in to create a team');
      return;
    }

    // Validation
    if (!formData.name.trim()) {
      setError('Team name is required');
      return;
    }

    if (!formData.sportId) {
      setError('Please select a sport');
      return;
    }

    if (!formData.captainPhone.trim() || formData.captainPhone.length !== 10) {
      setError('Captain phone number must be 10 digits');
      return;
    }

    if (!formData.captainFirstName.trim() || !formData.captainLastName.trim()) {
      setError('Captain name is required');
      return;
    }

    if (!formData.captainDob.trim()) {
      setError('Captain date of birth is required');
      return;
    }

    if (!formData.captainGender) {
      setError('Captain gender is required');
      return;
    }

    if (!formData.panchayat || !formData.district || !formData.state) {
      setError('Location information is required');
      return;
    }

    // Create team
    createTeamMutation.mutate({
      name: formData.name.trim(),
      description: formData.description.trim(),
      sportId: formData.sportId,
      captainPhone: normalizePhoneNumber(formData.captainPhone) || formData.captainPhone,
      captainDetails: {
        firstName: formData.captainFirstName.trim(),
        lastName: formData.captainLastName.trim(),
        dateOfBirth: formData.captainDob,
        gender: formData.captainGender as 'M' | 'F'
      },
      location: {
        panchayat: formData.panchayat,
        district: formData.district,
        state: formData.state,
        taluk: formData.taluk
      },
      venueId: venueId
    });
  };

  if (!isOpen) return null;

  const selectedSport = sports.find(sport => sport.id === formData.sportId);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[95vh] flex flex-col">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <Plus className="w-5 h-5 text-[#F28C38]" />
              Create New Team
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Register a new team for the tournament
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto">
          <div className="space-y-6">
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F28C38] focus:border-[#F28C38]"
                    placeholder="Enter team name"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    maxLength={50}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sport <span className="text-red-500">*</span>
                  </label>
                  <Select 
                    value={formData.sportId} 
                    onValueChange={(value) => handleInputChange('sportId', value)}
                    disabled={sportsLoading}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={sportsLoading ? 'Loading sports...' : 'Select a sport'} />
                    </SelectTrigger>
                    <SelectContent>
                      {sports.map((sport) => (
                        <SelectItem key={sport.id} value={sport.id}>
                          {sport.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                />
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
                />
                {playerExists && (
                  <p className="mt-1 text-sm text-green-600">
                    ✓ Captain found - details populated
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
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Gender <span className="text-red-500">*</span>
                  </label>
                  <Select 
                    value={formData.captainGender} 
                    onValueChange={(value) => handleInputChange('captainGender', value)}
                    disabled={playerExists}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="M">Male</SelectItem>
                      <SelectItem value="F">Female</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>

          {error && (
            <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3 flex-shrink-0">
          <button
            onClick={onClose}
            disabled={createTeamMutation.isPending}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={createTeamMutation.isPending}
            className="px-6 py-2 bg-[#F28C38] text-white rounded-lg hover:bg-[#E67A26] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {createTeamMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creating Team...
              </>
            ) : (
              'Create Team'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateTeamModal;
