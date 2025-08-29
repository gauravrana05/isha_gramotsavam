'use client';

import React, { useState, useEffect } from 'react';
import { X, Users, Plus, Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/AdvancedSelect';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
// import { createTeamByVolunteer } from '@/lib/actions/volunteer/teamManagement';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

interface Sport {
  id: string;
  name: string;
  displayName?: string;
  maxPlayers: number;
  genderRestriction?: 'M' | 'F' | null;
  isActive?: boolean;
}

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
  onTeamCreated: () => Promise<void>;
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

export const CreateTeamModal: React.FC<CreateTeamModalProps> = ({
  isOpen,
  onClose,
  venueLocation,
  venueId,
  onTeamCreated
}) => {
  const router = useRouter();
  const { lang } = useParams();
  const { user } = useAuth();

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

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sports, setSports] = useState<Sport[]>([]);
  const [sportsLoading, setSportsLoading] = useState(true);
  const [playerExists, setPlayerExists] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  const selectedSport = sports.find(sport => sport.id === formData.sportId);

  // Phone search functionality
  const handlePhoneSearch = async (phone: string) => {
    setFormData(prev => ({ ...prev, captainPhone: phone }));
    setPlayerExists(false);
    
    if (phone.length === 10) {
      setIsSearching(true);
      try {
        const usersRef = collection(db, 'users');
        const queries = [
          query(usersRef, where('phone', '==', phone)),
          query(usersRef, where('phoneNumber', '==', phone)),
          query(usersRef, where('phoneNumber', '==', `+91${phone}`)),
          query(usersRef, where('phone', '==', `+91${phone}`))
        ];
        
        let existingUser: any = null;
        for (const q of queries) {
          try {
            const snap = await getDocs(q);
            if (!snap.empty) {
              existingUser = snap.docs[0].data();
              break;
            }
          } catch (err) {
            console.error('Search query failed:', err);
          }
        }
        
        if (existingUser) {
          setPlayerExists(true);
          setFormData(prev => ({
            ...prev,
            captainFirstName: existingUser.firstName || '',
            captainLastName: existingUser.lastName || '',
            captainDob: existingUser.dob || '',
            captainGender: existingUser.gender || ''
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
      } finally {
        setIsSearching(false);
      }
    }
  };

  // Load sports from database
  const loadSports = async () => {
    try {
      setSportsLoading(true);
      const sportsRef = collection(db, 'sports');
      const sportsSnapshot = await getDocs(sportsRef);
      const sportsData = sportsSnapshot.docs
        .filter(doc => doc.data().isActive !== false)
        .map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            name: data.name || doc.id,
            displayName: data.displayName,
            maxPlayers: data.maxPlayers || 12,
            genderRestriction: data.genderRestriction || null,
            isActive: data.isActive
          };
        })
        .sort((a, b) => (a.displayName || a.name).localeCompare(b.displayName || b.name));
      
      setSports(sportsData);
    } catch (error) {
      console.error('Failed to load sports:', error);
      // Fallback to basic sports list
      setSports([
        { id: 'volleyball', name: 'Volleyball', maxPlayers: 12 },
        { id: 'throwball', name: 'Throwball', maxPlayers: 12, genderRestriction: 'F' }
      ]);
    } finally {
      setSportsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadSports();
      // Reset form when modal opens
      setPlayerExists(false);
      setIsSearching(false);
      setError('');
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

    if (!formData.name.trim()) {
      setError('Team name is required');
      return;
    }

    if (!formData.sportId) {
      setError('Please select a sport');
      return;
    }

    if (!formData.captainPhone.trim()) {
      setError('Captain phone number is required');
      return;
    }

    if (formData.captainPhone.length !== 10) {
      setError('Captain phone number must be 10 digits');
      return;
    }

    if (!formData.captainFirstName.trim()) {
      setError('Captain first name is required');
      return;
    }

    if (!formData.captainLastName.trim()) {
      setError('Captain last name is required');
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

    setLoading(true);
    setError('');

    try {
      // Normalize phone
      const digits = formData.captainPhone.replace(/\D/g, '');
      const normalizedPhone = digits.length === 10 ? digits : formData.captainPhone.replace(/\D/g, '').slice(-10);
      
      // Update or create captain user first if needed
      const usersRef = collection(db, 'users');
      const phoneQueries = [
        query(usersRef, where('phoneNumber', '==', normalizedPhone)),
        query(usersRef, where('phoneNumber', '==', `+91${normalizedPhone}`)),
        query(usersRef, where('phone', '==', normalizedPhone)),
        query(usersRef, where('phone', '==', `+91${normalizedPhone}`))
      ];
      
      let existingUser: any = null;
      for (const qy of phoneQueries) {
        try {
          const snap = await getDocs(qy);
          if (!snap.empty) { 
            existingUser = { id: snap.docs[0].id, ...snap.docs[0].data() }; 
            break; 
          }
        } catch {}
      }

      // If user exists but missing required fields, update them
      if (existingUser && (!existingUser.firstName || !existingUser.lastName || !existingUser.dob || !existingUser.gender)) {
        const userDocRef = doc(db, 'users', existingUser.id);
        const updateData: any = {};
        if (!existingUser.firstName && formData.captainFirstName.trim()) {
          updateData.firstName = formData.captainFirstName.trim();
        }
        if (!existingUser.lastName && formData.captainLastName.trim()) {
          updateData.lastName = formData.captainLastName.trim();
        }
        if (!existingUser.dob && formData.captainDob) {
          updateData.dob = formData.captainDob;
        }
        if (!existingUser.gender && formData.captainGender) {
          updateData.gender = formData.captainGender;
        }
        if (Object.keys(updateData).length > 0) {
          updateData.updatedAt = new Date();
          await updateDoc(userDocRef, updateData);
        }
      }

      const result = await createTeamByVolunteer({
        name: formData.name.trim(),
        description: formData.description.trim(),
        sport: formData.sportId,
        captainPhone: normalizedPhone,
        captainDetails: {
          firstName: formData.captainFirstName.trim(),
          lastName: formData.captainLastName.trim(),
          dob: formData.captainDob,
          gender: formData.captainGender
        },
        location: {
          panchayat: formData.panchayat,
          district: formData.district,
          state: formData.state,
          taluk: formData.taluk
        },
        createdBy: user.uid
      });

      if (result.success) {
        await onTeamCreated();
        onClose();
        
        // Redirect to the team page
        if (result.teamId) {
          router.push(`/${lang}/volunteer/venues/${venueId}/teams/${result.teamId}`);
        }
        
        // Reset form
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
        setIsSearching(false);
      } else {
        setError(result.message || 'Failed to create team');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

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
                    <SelectTrigger className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F28C38] focus:border-[#F28C38]">
                      <SelectValue placeholder={sportsLoading ? 'Loading sports...' : 'Select a sport'} />
                    </SelectTrigger>
                    <SelectContent>
                      {sports.map((sport) => (
                        <SelectItem key={sport.id} value={sport.id}>
                          {sport.displayName || sport.name} {sport.genderRestriction === 'F' ? '(Women Only)' : ''}
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

              {selectedSport && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-blue-700 text-sm">
                    <strong>{selectedSport.name}:</strong> Maximum {selectedSport.maxPlayers} players per team
                    {selectedSport.genderRestriction === 'F' && ' (Women only)'}
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
                />
                {isSearching && (
                  <p className="mt-1 text-sm text-gray-500 flex items-center">
                    <Loader2 className="w-4 h-4 animate-spin mr-1" />
                    Searching for captain...
                  </p>
                )}
                {!isSearching && playerExists && (
                  <p className="mt-1 text-sm text-green-600">
                    ✓ Captain found - details populated
                  </p>
                )}
                {!isSearching && formData.captainPhone.length === 10 && !playerExists && (
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
                    max={new Date(new Date().setFullYear(new Date().getFullYear() - 16)).toISOString().split('T')[0]}
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
            disabled={loading}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-6 py-2 bg-[#F28C38] text-white rounded-lg hover:bg-[#E67A26] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
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