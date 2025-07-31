import React, { useState } from 'react';
import Link from 'next/link';
import { Users, MapPin, Trophy, AlertCircle, CheckCircle } from 'lucide-react';
import Button from '@/components/ui/Button';
import { UserProfile } from '@/lib/types/auth';
import { createTeamWithSchema, TeamCreationData } from '@/lib/services/teamsService';

interface PublicTeamRegistrationProps {
  sport: 'volleyball' | 'throwball';
  userProfile: UserProfile;
  onTeamCreated: (teamId: string) => void;
  loading?: boolean;
}

interface TeamFormData {
  name: string;
  description: string;
}

export const PublicTeamRegistration: React.FC<PublicTeamRegistrationProps> = ({
  sport,
  userProfile,
  onTeamCreated,
  loading = false
}) => {
  const [formData, setFormData] = useState<TeamFormData>({
    name: '',
    description: ''
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sport configuration
  const sportConfig = {
    volleyball: {
      displayName: 'Volleyball',
      maxPlayers: 6,
      maxSubstitutes: 6,
      description: 'Mixed gender tournament',
      icon: '🏐',
      color: 'bg-blue-500'
    },
    throwball: {
      displayName: 'Throwball',
      maxPlayers: 7,
      maxSubstitutes: 2,
      description: 'Women only tournament',
      icon: '🤾‍♀️',
      color: 'bg-pink-500'
    }
  };

  if (loadingSport) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-[#F28C38]" />
        <span className="ml-3 text-[#4A2F1D] font-medium">Loading sport information...</span>
      </div>
    );
  }

  if (!sport) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">Sport Not Found</h2>
        <p className="text-gray-600">The requested sport could not be found.</p>
      </div>
    );
  }

  if (!eligible) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center mb-4">
          <AlertCircle className="w-6 h-6 text-red-600 mr-3" />
          <h3 className="text-lg font-semibold text-red-800">Registration Not Available</h3>
        </div>
        <div className="text-red-700">
          <p className="mb-2">You are not eligible to register for {sport.name}:</p>
          <ul className="list-disc list-inside space-y-1">
            {eligibilityReasons.map((reason, index) => (
              <li key={index} className="text-sm">{reason}</li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Team name is required';
    } else if (formData.name.length < 3) {
      newErrors.name = 'Team name must be at least 3 characters';
    } else if (formData.name.length > 50) {
      newErrors.name = 'Team name must be less than 50 characters';
    }

    // Eligibility is already checked in useEffect, no need to re-validate gender here

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof TeamFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    
    try {
      const teamData: TeamCreationData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        sportName: sport.name,
        sportId: sport.sportId,
        captainId: userProfile.uid,
        panchayat: userProfile.panchayat,
        district: userProfile.district,
        state: userProfile.state
      };

      // Create team using client-side service
      const result = await createTeamWithSchema(teamData, userProfile);
      
      if (result.success && result.teamId) {
        onTeamCreated(result.teamId);
      } else {
        throw new Error(result.error || 'Failed to create team');
      }
      
    } catch (error: any) {
      setErrors({ submit: error.message || 'Failed to create team. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Sport Header */}
      <div className="text-center mb-8">
        <div className="relative w-24 h-24 mx-auto mb-4">
          <img 
            src={sport.assets.primaryImage} 
            alt={sport.name}
            className="w-full h-full object-cover rounded-full"
          />
        </div>
        <h1 className="text-2xl md:text-3xl font-bold font-fira text-gray-900 mb-2">
          Register for {sport.displayName}
        </h1>
        <p className="text-gray-600 font-fira">{sport.description}</p>
        <div className="mt-4 flex justify-center space-x-6 text-sm text-gray-600">
          <span>👥 {sport.teamConfig.maxPlayers} + {sport.teamConfig.maxSubstitutes} Players</span>
          <span>🏆 ₹{sport.eventInfo.prizePool.first.toLocaleString()}</span>
        </div>
      </div>

      {/* Progress Indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-center space-x-4">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-[#F28C38] text-white rounded-full flex items-center justify-center text-sm font-semibold">
              1
            </div>
            <span className="ml-2 text-sm font-fira text-[#F28C38] font-semibold">Team Details</span>
          </div>
          <div className="w-8 h-0.5 bg-gray-300"></div>
          <div className="flex items-center">
            <div className="w-8 h-8 bg-gray-300 text-gray-600 rounded-full flex items-center justify-center text-sm font-semibold">
              2
            </div>
            <span className="ml-2 text-sm font-fira text-gray-500">Add Players</span>
          </div>
        </div>
      </div>

      {/* Gender Validation Error */}
      {errors.gender && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
            <p className="text-red-700 text-sm font-fira">{errors.gender}</p>
          </div>
        </div>
      )}

      {/* Team Requirements Card */}
      <div className="bg-[#F3F0E5] rounded-lg p-6 mb-6">
        <div className="flex items-center mb-4">
          <Trophy className="w-5 h-5 text-[#F28C38] mr-2" />
          <h3 className="text-lg font-semibold font-fira text-[#4A2F1D]">Team Requirements</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm font-fira text-[#4A2F1D]">
          <div className="flex items-center">
            <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
            <span>Players: {sport.teamConfig.maxPlayers} main</span>
          </div>
          <div className="flex items-center">
            <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
            <span>Substitutes: {sport.teamConfig.maxSubstitutes} max</span>
          </div>
          <div className="flex items-center">
            <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
            <span>Age: {sport.eligibility.minAge}-{sport.eligibility.maxAge} years</span>
          </div>
          <div className="flex items-center">
            <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
            <span>{sport.eligibility.requireSamePanchayat ? 'Same panchayat required' : 'Any location allowed'}</span>
          </div>
          <div className="flex items-center">
            <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
            <span>Gender: {sport.eligibility.genderRestriction === 'any' ? 'Any' : sport.eligibility.genderRestriction === 'male' ? 'Men only' : 'Women only'}</span>
          </div>
          <div className="flex items-center">
            <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
            <span>Registration: {new Date(sport.eventInfo.registrationStart).toLocaleDateString()} - {new Date(sport.eventInfo.registrationEnd).toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      {/* Captain Information Card */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center mb-4">
          <Users className="w-5 h-5 text-[#F28C38] mr-2" />
          <h3 className="text-lg font-semibold font-fira">Captain Information</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-semibold font-fira text-gray-700">Name:</span>
            <p className="font-fira text-gray-900">{userProfile.firstName} {userProfile.lastName}</p>
          </div>
          <div>
            <span className="font-semibold font-fira text-gray-700">Phone:</span>
            <p className="font-fira text-gray-900">+91 {userProfile.phoneNumber}</p>
          </div>
          <div className="md:col-span-2">
            <span className="font-semibold font-fira text-gray-700">Location:</span>
            <div className="flex items-center mt-1">
              <MapPin className="w-4 h-4 text-gray-500 mr-1" />
              <p className="font-fira text-gray-900">
                {userProfile.panchayat}, {userProfile.district}, {userProfile.state}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Team Details Form */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h3 className="text-lg font-semibold font-fira mb-4">Team Details</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 font-fira">
              Team Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              className={`w-full px-3 py-3 border rounded-lg font-fira text-base focus:ring-2 focus:ring-[#F28C38] focus:border-[#F28C38] ${
                errors.name ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
              placeholder="Enter your team name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              maxLength={50}
              disabled={loading || isSubmitting}
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600 font-fira">{errors.name}</p>
            )}
            <p className="mt-1 text-xs text-gray-500 font-fira">
              {formData.name.length}/50 characters
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 font-fira">
              Team Description (Optional)
            </label>
            <textarea
              className="w-full px-3 py-3 border border-gray-300 rounded-lg font-fira text-base focus:ring-2 focus:ring-[#F28C38] focus:border-[#F28C38]"
              placeholder="Brief description about your team"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={3}
              maxLength={200}
              disabled={loading || isSubmitting}
            />
            <p className="mt-1 text-xs text-gray-500 font-fira">
              {formData.description.length}/200 characters
            </p>
          </div>
        </div>
      </div>

      {/* Important Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-start">
          <AlertCircle className="w-5 h-5 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
          <div className="text-sm font-fira text-blue-800">
            <p className="font-semibold mb-1">Important:</p>
            <ul className="space-y-1 list-disc list-inside">
              <li>All team members must be from the same panchayat: <strong>{userProfile.panchayat}</strong></li>
              <li>You will be able to add players in the next step</li>
              <li>Team registration is free and documents will be verified</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Submit Error */}
      {errors.submit && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
            <p className="text-red-700 text-sm font-fira">{errors.submit}</p>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="space-y-4">
        <Button
          onClick={handleSubmit}
          disabled={loading || isSubmitting || !!errors.gender}
          size="large"
          className="w-full bg-[#F28C38] hover:bg-[#E67E22] text-white py-4 text-lg font-semibold rounded-lg"
        >
          {isSubmitting ? (
            <div className="flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
              Creating Team...
            </div>
          ) : (
            'Save & Continue'
          )}
        </Button>

        <p className="text-center text-sm text-gray-600 font-fira">
          Next: Add team members and complete registration
        </p>
      </div>

      {/* Terms Notice */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <p className="text-xs text-gray-500 font-fira text-center">
          By creating a team, you agree to the{' '}
          <Link href="/terms" className="text-[#F28C38] hover:underline">tournament rules</Link>
          {' '}and{' '}
          <Link href="/privacy" className="text-[#F28C38] hover:underline">privacy policy</Link>
        </p>
      </div>
    </div>
  );
};