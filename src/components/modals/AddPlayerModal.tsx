'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Loader2, X } from 'lucide-react';
import { EnhancedModal } from '@/components/ui/EnhancedModal';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/AdvancedSelect';
import { api } from '@/server/trpc/react';

// Types
interface TeamData {
  id: string;
  name: string;
  sportId: string;
  captainId: string;
  captainName: string;
  genderCategory: string;
  status: string;
  panchayat: string;
  taluk: string;
  district: string;
  state: string;
  pincode: string | null;
  currentPlayers: number;
  currentSubstitutes: number;
  createdAt: Date;
  updatedAt: Date;
  sport: {
    id: string;
    name: string;
    mainPlayersCount: number;
    maxSubstitutes: number;
  };
}

interface PlayerFormData {
  phone: string;
  firstName: string;
  lastName: string;
  dob: string;
  whatsappNumber: string;
  position: 'main' | 'substitute';
  gender: 'M' | 'F' | 'O' | '';
}

interface AddPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddPlayer: (playerData: any) => Promise<void>;
  teamData: TeamData | null;
  canAddMain: boolean;
  canAddSubstitute: boolean;
  canAddPlayer: boolean;
  editingPlayer?: any; // Player being edited
}

export const AddPlayerModal: React.FC<AddPlayerModalProps> = ({
  isOpen,
  onClose,
  onAddPlayer,
  teamData,
  canAddMain,
  canAddSubstitute,
  canAddPlayer,
  editingPlayer
}) => {
  // Form state
  const [playerFormData, setPlayerFormData] = useState<PlayerFormData>({
    phone: '',
    firstName: '',
    lastName: '',
    dob: '',
    whatsappNumber: '',
    position: 'main',
    gender: '',
  });

  // UI state
  const [playerExists, setPlayerExists] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchCompleted, setSearchCompleted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [conflictMessage, setConflictMessage] = useState<string>('');

  // tRPC utils for user search
  const utils = api.useUtils();

  // Populate form data when editing player
  useEffect(() => {
    if (editingPlayer) {
      setPlayerFormData({
        phone: editingPlayer.phone || '',
        firstName: editingPlayer.firstName || '',
        lastName: editingPlayer.lastName || '',
        dob: editingPlayer.dateOfBirth ? new Date(editingPlayer.dateOfBirth).toISOString().split('T')[0] : '',
        whatsappNumber: editingPlayer.whatsappNumber || '',
        position: editingPlayer.position || 'main',
        gender: editingPlayer.gender || 'M'
      });
      setPlayerExists(false); // Don't treat as "found player" when editing
      setSearchCompleted(true);
    } else {
      // Reset form for new player
      setPlayerFormData({
        phone: '',
        firstName: '',
        lastName: '',
        dob: '',
        whatsappNumber: '',
        position: 'main',
        gender: 'M'
      });
      setPlayerExists(false);
      setSearchCompleted(false);
    }
  }, [editingPlayer]);

  // Helper functions
  const normalizePhone = (phone: string): string => {
    const digitsOnly = phone.replace(/\D/g, "");

    if (digitsOnly.length === 10) {
      return `+91${digitsOnly}`;
    }

    if (digitsOnly.startsWith("91") && digitsOnly.length === 12) {
      return `+${digitsOnly}`;
    }

    if (phone.startsWith("+91") && digitsOnly.length === 12) {
      return phone;
    }

    if (digitsOnly.length >= 10) {
      const last10Digits = digitsOnly.slice(-10);
      return `+91${last10Digits}`;
    }

    throw new Error(`Invalid phone number format: ${phone}. Please enter a 10-digit mobile number.`);
  };

  const calculateAge = (dob: string): number => {
    const today = new Date();
    const birthDate = new Date(dob);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    return age;
  };

  const resetPlayerForm = () => {
    setPlayerFormData({
      phone: '',
      firstName: '',
      lastName: '',
      dob: '',
      whatsappNumber: '',
      position: 'main',
      gender: '',
    });
    setPlayerExists(false);
    setSearchCompleted(false);
  };

  // Phone search handler
  const handlePhoneSearch = useCallback(async (phone: string) => {
    setPlayerFormData(prev => ({ ...prev, phone }));

    if (phone.length === 10) {
      setIsSearching(true);
      try {
        console.log('Searching for phone:', phone);
        const result = await utils.admin.users.searchUserByPhone.fetch({ phone });
        console.log('Search result:', result);
        
        if (result.success && result.user) {
          // User found and available
          setPlayerExists(true);
          setConflictMessage('');
          setPlayerFormData(prev => ({
            ...prev,
            firstName: result.user.firstName || '',
            lastName: result.user.lastName || '',
            dob: result.user.dateOfBirth ? result.user.dateOfBirth.split('T')[0] : '',
            whatsappNumber: phone,
          }));
        } else if (!result.success && result.conflict) {
          // User found but already in a team - prevent adding
          setPlayerExists(false);
          setConflictMessage(result.conflict.message);
          setPlayerFormData(prev => ({
            ...prev,
            firstName: '',
            lastName: '',
            dob: '',
            whatsappNumber: phone,
          }));
        } else {
          // User doesn't exist - clear form for new user entry
          setPlayerExists(false);
          setConflictMessage('');
          setPlayerFormData(prev => ({
            ...prev,
            firstName: '',
            lastName: '',
            dob: '',
            whatsappNumber: phone,
          }));
        }
        setSearchCompleted(true);
      } catch (error) {
        console.error('User search error:', error);
        setPlayerExists(false);
        setPlayerFormData(prev => ({
          ...prev,
          firstName: '',
          lastName: '',
          dob: '',
          whatsappNumber: phone,
        }));
        setSearchCompleted(true);
      } finally {
        setIsSearching(false);
      }
    } else {
      // Reset when phone number is not complete
      setPlayerExists(false);
      setSearchCompleted(false);
      setConflictMessage('');
      if (phone.length === 0) {
        setPlayerFormData(prev => ({
          ...prev,
          firstName: '',
          lastName: '',
          dob: '',
          whatsappNumber: '',
          gender: ''
        }));
      }
    }
  }, [utils.admin.users.searchUserByPhone]);

  // Handle form submission
  const handleSubmit = async () => {
    if (!teamData) return;
    
    setIsSubmitting(true);
    try {
      // Auto-select correct position based on availability
      let playerPosition = playerFormData.position;
      if (playerPosition === 'main' && !canAddMain) {
        if (canAddSubstitute) {
          playerPosition = 'substitute';
        } else {
          throw new Error('No available positions. Team is full.');
        }
      } else if (playerPosition === 'substitute' && !canAddSubstitute) {
        if (canAddMain) {
          playerPosition = 'main';
        } else {
          throw new Error('No available positions. Team is full.');
        }
      }

      const playerData = {
        teamId: teamData.id,
        firstName: playerFormData.firstName,
        lastName: playerFormData.lastName,
        phone: normalizePhone(playerFormData.phone),
        whatsappNumber: playerFormData.whatsappNumber || playerFormData.phone,
        dateOfBirth: new Date(playerFormData.dob),
        age: calculateAge(playerFormData.dob),
        gender: teamData.genderCategory === 'women' ? 'F' : teamData.genderCategory === 'men' ? 'M' : playerFormData.gender,
        position: playerPosition,
        panchayat: teamData.panchayat,
        taluk: teamData.taluk || '',
        district: teamData.district,
        state: teamData.state,
        pincode: teamData.pincode || '000000',
        verificationStatus: 'pending'
      };

      await onAddPlayer(playerData);
      handleClose();
    } catch (error) {
      console.error('Add player error:', error);
      throw error; // Let parent handle the error display
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    resetPlayerForm();
    onClose();
  };

  // Determine if form is valid
  const isFormValid = searchCompleted && 
    playerFormData.firstName && 
    playerFormData.lastName && 
    playerFormData.dob && 
    (teamData?.genderCategory !== 'mixed' || playerFormData.gender);

  // Footer buttons
  const footer = (
    <div className="flex space-x-3">
      <button
        onClick={handleClose}
        className="flex-1 sm:flex-initial sm:px-4 bg-gray-200 text-gray-800 py-2 sm:py-2 px-6 rounded-lg font-medium hover:bg-gray-300 transition-colors text-sm sm:text-sm"
      >
        Cancel
      </button>
      {searchCompleted && (
        <button
          onClick={handleSubmit}
          disabled={!isFormValid || isSubmitting || !!conflictMessage}
          className="flex-1 sm:flex-initial sm:px-4 bg-[#F28C38] hover:bg-[#E67A26] disabled:bg-gray-400 text-white py-2 sm:py-2 px-6 rounded-lg font-medium transition-colors text-sm sm:text-sm"
        >
          {isSubmitting ? (editingPlayer ? 'Updating...' : 'Adding...') : (editingPlayer ? 'Update Player' : 'Add Player')}
        </button>
      )}
    </div>
  );

  return (
    <EnhancedModal
      isOpen={isOpen}
      onClose={handleClose}
      title={editingPlayer ? "Edit Player" : "Add New Player"}
      size={searchCompleted ? 'lg' : 'base'}
      mobileFullScreen={searchCompleted}
      dynamicHeight={true}
      transition={true}
      footer={footer}
      closeOnOverlayClick={false}
    >
      <div className="space-y-6">
        {/* Phone Number Search */}
        <div>
          <label className="block text-sm font-semibold text-[#4A2F1D] mb-2">
            Mobile Number <span className="text-red-500">*</span>
          </label>
          <input
            type="tel"
            placeholder="Enter 10-digit mobile number"
            value={playerFormData.phone}
            onChange={(e) => {
              if (!editingPlayer) {
                const phone = e.target.value.replace(/[^\d]/g, '').slice(0, 10);
                handlePhoneSearch(phone);
              }
            }}
            disabled={!!editingPlayer}
            className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F28C38] focus:border-transparent ${
              editingPlayer ? 'bg-gray-100 cursor-not-allowed' : ''
            }`}
          />
          {isSearching && (
            <p className="mt-1 text-sm text-gray-500 flex items-center">
              <Loader2 className="w-4 h-4 animate-spin mr-1" />
              Searching for player...
            </p>
          )}
          {!isSearching && playerExists && !editingPlayer && (
            <p className="mt-1 text-sm text-[#3A7F3F]">✓ Player found in system</p>
          )}
          {!isSearching && conflictMessage && !editingPlayer && (
            <p className="mt-1 text-sm text-red-600">⚠️ {conflictMessage}</p>
          )}
          {!isSearching && playerFormData.phone.length === 10 && !playerExists && !conflictMessage && !editingPlayer && (
            <p className="mt-1 text-sm text-gray-600">New player - fill in details below</p>
          )}
        </div>

        {/* Player Details Form - Show only after search is complete */}
        {searchCompleted && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-[#4A2F1D] mb-2">
                  First Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={playerFormData.firstName}
                  onChange={(e) => setPlayerFormData(prev => ({ ...prev, firstName: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F28C38]"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#4A2F1D] mb-2">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={playerFormData.lastName}
                  onChange={(e) => setPlayerFormData(prev => ({ ...prev, lastName: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F28C38]"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-[#4A2F1D] mb-2">
                Date of Birth <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={playerFormData.dob}
                onChange={(e) => setPlayerFormData(prev => ({ ...prev, dob: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F28C38]"
              />
            </div>

            {teamData?.genderCategory === 'mixed' && (
              <div>
                <label className="block text-sm font-semibold text-[#4A2F1D] mb-2">
                  Gender <span className="text-red-500">*</span>
                </label>
                <Select
                  value={playerFormData.gender}
                  onValueChange={(value) => setPlayerFormData(prev => ({ ...prev, gender: value as 'M' | 'F' | 'O' }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select Gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="M">Male</SelectItem>
                    <SelectItem value="F">Female</SelectItem>
                    <SelectItem value="O">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-[#4A2F1D] mb-2">
                Position <span className="text-red-500">*</span>
              </label>
              <Select
                value={playerFormData.position}
                onValueChange={(value) => {
                  if (!editingPlayer) {
                    setPlayerFormData(prev => ({ ...prev, position: value as 'main' | 'substitute' }));
                  }
                }}
                disabled={!!editingPlayer}
              >
                <SelectTrigger className={`w-full ${editingPlayer ? 'bg-gray-100 cursor-not-allowed' : ''}`}>
                  <SelectValue placeholder="Select Position" />
                </SelectTrigger>
                <SelectContent>
                  {canAddMain && <SelectItem value="main">Main Player</SelectItem>}
                  {canAddSubstitute && <SelectItem value="substitute">Substitute</SelectItem>}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </div>
    </EnhancedModal>
  );
};