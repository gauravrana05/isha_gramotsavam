"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useTranslation } from "@/lib/utils/i18n";
import Image from "next/image";
import { Users, ArrowRight, Loader2, AlertCircle } from "lucide-react";
import { api } from "@/server/trpc/react";

interface TeamFormData {
  name: string;
  description: string;
  panchayat: string;
  taluk: string;
  district: string;
  state: string;
}

export default function TeamRegistrationPage() {
  const [formData, setFormData] = useState<TeamFormData>({
    name: "",
    description: "",
    panchayat: "",
    taluk: "",
    district: "",
    state: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const router = useRouter();
  const { lang, sport } = useParams();
  const { t } = useTranslation();
  const { user } = useAuth();

  // Fetch profile completion data using the new API
  const profileDataQuery = api.profile.checkCompletion.useQuery(
    { userId: user?.id || '' },
    { enabled: !!user?.id }
  );
  
  const userProfileData = profileDataQuery.data;
  const userProfileLoading = profileDataQuery.isLoading;
  const userProfile = profileDataQuery.data; // For backward compatibility with existing code
  
  // tRPC mutations
  const createTeamMutation = api.teams.createAndPromoteCaptain.useMutation();
  
  // Get sport parameter
  const sportName = Array.isArray(sport) ? sport[0] : sport ?? "sport_name";
  
  // Fetch sport data with gender validation
  const sportQuery = api.sports.getByIdOrName.useQuery(
    { 
      identifier: sportName, 
      userGender: userProfileData?.gender as 'M' | 'F' | 'O' | undefined 
    },
    { enabled: !!sportName && !!userProfileData }
  );
  
  // This is now redundant since we're already fetching profile data above
  // const profileDataQuery = api.profile.checkCompletion.useQuery(
  //   { userId: user?.id || '' },
  //   { enabled: !!user?.id }
  // );
  
  useEffect(() => {
    if (userProfileLoading) return;
    
    // Redirect if not authenticated
    if (!userProfileData) {
      router.push(`/${lang}/login`);
      return;
    }
    // Check profile completion using tRPC data
    if (userProfileData && !userProfileData.profileComplete) {
      // Add redirect parameter so user comes back to team registration after profile completion
      const returnUrl = encodeURIComponent(`/${lang}/public/register/team/${sportName}`);
      router.push(`/${lang}/profile/complete?returnTo=${returnUrl}`);
      return;
    }

    // Check sport validity and gender eligibility
    if (sportQuery.data) {
      if (!sportQuery.data.can_register) {
        setError(sportQuery.data.registration_message || 'Registration not available for this sport');
        return;
      }
    } else if (sportQuery.error) {
      router.push(`/${lang}/public/sports`);
      return;
    }

    // Pre-fill form with user data
    if (userProfileData) {
      setFormData(prev => ({
        ...prev,
        panchayat: userProfileData.panchayat || "",
        taluk: userProfileData.taluk || "",
        district: userProfileData.district || "",
        state: userProfileData.state || "",
      }));
    }
  }, [userProfileData, userProfileLoading, router, lang, sportName]);

  const handleInputChange = (field: keyof TeamFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError("");
  };


  const validateForm = () => {
    if (!formData.name.trim()) return "Please enter team name";
    if (formData.name.length < 3) return "Team name must be at least 3 characters";
    if (!formData.panchayat.trim()) return "Please enter panchayat";
    if (!formData.taluk.trim()) return "Please enter taluk";
    if (!formData.district.trim()) return "Please enter district";
    if (!formData.state.trim()) return "Please enter state";
    return null;
  };

  const handleSubmit = async () => {
    if (!userProfileData || !sportQuery.data) return;

    // Check if user can register for this sport
    if (!sportQuery.data.can_register) {
      setError(sportQuery.data.registration_message || 'Registration not available for this sport');
      return;
    }

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const teamData = {
        name: formData.name,
        sportName: sportQuery.data.name,
        sportId: sportQuery.data.id,
        description: formData.description,
        panchayat: formData.panchayat,
        taluk: formData.taluk,
        district: formData.district,
        state: formData.state,
        genderCategory: userProfile?.gender as 'M' | 'F' | 'mixed',
      };
      
      // Use tRPC mutation
      const result = await createTeamMutation.mutateAsync({ 
        teamData, 
        captainId: user?.id 
      });
      
      // Navigate to team invite page
      router.push(`/${lang}/captain/teams/${result.teamId}/players/invite`);

    } catch (err: any) {
      // Error handling removed
      setError(err.message || "Failed to create team. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (userProfileLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#CE4520]" />
      </div>
    );
  }

  if (!user || !userProfile) {
    return null;
  }

  // Handle sport loading states
  if (sportQuery.isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#CE4520] mx-auto mb-4" />
          <p className="text-gray-600">Loading sport details...</p>
        </div>
      </div>
    );
  }

  if (sportQuery.error || !sportQuery.data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Sport Not Found</h1>
          <p className="text-gray-600 mb-4">The sport you selected is not available.</p>
          <button 
            onClick={() => router.push(`/${lang}/public/sports`)}
            className="bg-[#CE4520] text-white px-6 py-2 rounded-lg hover:bg-[#1565C0] transition-colors"
          >
            Back to Sports
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F3F0E5] font-fira">
      <div className="max-w-4xl mx-auto p-3 sm:p-4 py-6 sm:py-8">
        <div className="text-center mb-6 sm:mb-8">
          <div className="mb-3 sm:mb-4">
            <Image 
              src="https://ishalogin.sadhguru.org/app/images/3e8fd38d1d957c44372b.svg" 
              alt="Isha Logo" 
              width={60} 
              height={60} 
              className="mx-auto sm:w-20 sm:h-20"
            />
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold font-fira mb-2">
            Register Team for {sportQuery.data?.name || sportName}
          </h1>
          <p className="text-sm sm:text-base text-gray-600 font-fira">
            {sportName === 'throwball' ? 'For Women' : 'For Men and Women'}
          </p>
          <p className="text-sm sm:text-base text-gray-600 font-fira">Step 1 of 2: Team Details</p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 mb-4 sm:mb-6">
          <div className="flex items-center mb-4 sm:mb-6">
            <Users className="w-5 h-5 sm:w-6 sm:h-6 text-[#F28C38] mr-2 sm:mr-3" />
            <h3 className="text-lg sm:text-xl font-semibold font-fira text-[#4A2F1D]">Team Information</h3>
          </div>
          <hr className="mb-4 sm:mb-6" />
          
          <div className="grid grid-cols-1 gap-4 sm:gap-6">
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2 font-fira">
                Team Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F28C38] focus:border-[#F28C38] font-fira text-sm sm:text-base"
                placeholder="Enter your team name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                maxLength={50}
              />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2 font-fira">
                Team Description (Optional)
              </label>
              <textarea
                className="w-full px-3 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F28C38] focus:border-[#F28C38] font-fira text-sm sm:text-base"
                placeholder="Brief description about your team"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                rows={3}
                maxLength={200}
              />
            </div>
          </div>

          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-700 text-xs sm:text-sm font-fira">
              <strong>Captain Details:</strong> You ({userProfile?.first_name} {userProfile?.last_name}) will automatically be set as the team captain. 
              After team creation, you can add other players to your team.
            </p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 mb-4 sm:mb-6">
          <div className="flex items-center mb-4 sm:mb-6">
            <Users className="w-5 h-5 sm:w-6 sm:h-6 text-[#F28C38] mr-2 sm:mr-3" />
            <h3 className="text-lg sm:text-xl font-semibold font-fira text-[#4A2F1D]">Team Location</h3>
          </div>
          <hr className="mb-4 sm:mb-6" />
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2 font-fira">
                Panchayat <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 sm:py-3 border border-gray-300 rounded-lg bg-gray-50 font-fira text-sm sm:text-base"
                value={formData.panchayat}
                readOnly
              />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2 font-fira">
                Taluk <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 sm:py-3 border border-gray-300 rounded-lg bg-gray-50 font-fira text-sm sm:text-base"
                value={formData.taluk}
                readOnly
              />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2 font-fira">
                District <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 sm:py-3 border border-gray-300 rounded-lg bg-gray-50 font-fira text-sm sm:text-base"
                value={formData.district}
                readOnly
              />
            </div>

            <div className="sm:col-span-2 lg:col-span-1">
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2 font-fira">
                State <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 sm:py-3 border border-gray-300 rounded-lg bg-gray-50 font-fira text-sm sm:text-base"
                value={formData.state}
                readOnly
              />
            </div>
          </div>

          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-blue-600 text-xs sm:text-sm font-fira">
              <strong>Important:</strong> All team members must be from the same panchayat. 
              This will be verified during the approval process.
            </p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6">
            <p className="text-red-600 text-xs sm:text-sm font-fira">{error}</p>
          </div>
        )}

        <div className="text-center mb-6 sm:mb-8">
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="bg-[#F28C38] hover:bg-[#E67A26] text-white px-6 sm:px-8 py-2 sm:py-3 rounded-lg font-fira text-base sm:text-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors inline-flex items-center w-full sm:w-auto justify-center"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin mr-2" />
                Creating Team...
              </>
            ) : (
              <>
                Save & Continue
                <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 ml-2" />
              </>
            )}
          </button>
        </div>

        <div className="text-center mb-4 sm:mb-6">
          <p className="text-xs sm:text-sm font-fira text-gray-600">
            Next: Add team members and complete registration
          </p>
        </div>
      </div>
    </div>
  );
}