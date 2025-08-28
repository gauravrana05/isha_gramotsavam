"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useTranslation } from "@/lib/utils/i18n";
import Image from "next/image";
import { Users, ArrowRight, Loader2, AlertCircle, Phone } from "lucide-react";
import { createTeamAndPromoteCaptain } from "@/lib/actions/captain/createTeamOptimized";

interface TeamFormData {
  name: string;
  description: string;
  panchayat: string;
  district: string;
  state: string;
  captainPhone: string;
}

export default function VolunteerCreateTeamPage() {
  const [formData, setFormData] = useState<TeamFormData>({
    name: "",
    description: "",
    panchayat: "",
    district: "",
    state: "",
    captainPhone: ""
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const router = useRouter();
  const { lang, sport } = useParams();
  const { user, userProfile, loading: authLoading } = useAuth();
  const { t } = useTranslation();

  // Validate sport parameter
  const validSports = ['volleyball', 'throwball'];
  const sportName = Array.isArray(sport) ? sport[0] : sport ?? "sport_name";
  
  useEffect(() => {
    if (authLoading) return;
    
    // Redirect if not authenticated
    if (!user) {
      router.push(`/${lang}/login`);
      return;
    }
    if(!userProfile){
      router.push(`/${lang}/public`);
      return;
    }
    // Check if user is volunteer or admin
    if (!['technical_volunteer', 'admin'].includes(userProfile.role || '')) {
      router.push(`/${lang}/public`);
      return;
    }

    // Validate sport
    if (!validSports.includes(sportName)) {
      router.push(`/${lang}/volunteer/dashboard`);
      return;
    }
  }, [user, userProfile, authLoading, router, lang, sportName]);

  const handleInputChange = (field: keyof TeamFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError("");
  };

  const validateForm = () => {
    if (!formData.name.trim()) return "Please enter team name";
    if (formData.name.length < 3) return "Team name must be at least 3 characters";
    if (!formData.panchayat.trim()) return "Please enter panchayat";
    if (!formData.district.trim()) return "Please enter district";
    if (!formData.state.trim()) return "Please enter state";
    if (!formData.captainPhone.trim()) return "Please enter captain's phone number";
    const cleanPhone = formData.captainPhone.replace(/\D/g, '');
    if (cleanPhone.length !== 10) return "Please enter a valid 10-digit phone number";
    return null;
  };

  const handleSubmit = async () => {
    if (!user || !userProfile) return;

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Clean and format phone number
      const cleanPhone = formData.captainPhone.replace(/\D/g, '');
      
      const teamData = {
        name: formData.name,
        sportName: sportName.charAt(0).toUpperCase() + sportName.slice(1),
        sportId: sport === 'volleyball' ? 'gDZ7zitmogfMCLH5YEzO' : '36o6rT3bTu4cQAm49hrd',
        description: formData.description,
        panchayat: formData.panchayat,
        district: formData.district,
        state: formData.state,
        genderCategory: sportName === 'throwball' ? 'F' : 'M',
      };
      
      // Create team with volunteer as temporary captain (will be changed later)
      const result = await createTeamAndPromoteCaptain({ 
        teamData, 
        captainId: user.uid 
      });
      
      if (result.success) {
        // Redirect to player invite page where the real captain can be added
        router.push(`/${lang}/captain/teams/${result.teamId}/players/invite?captainPhone=${cleanPhone}`);
      } else {
        throw new Error(result.error || "Failed to create team.");
      }

    } catch (err: any) {
      setError(err.message || "Failed to create team. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#CE4520]" />
      </div>
    );
  }

  if (!user || !userProfile) {
    return null;
  }

  if (!['technical_volunteer', 'admin'].includes(userProfile.role || '')) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-4">Only volunteers can create teams.</p>
          <button 
            onClick={() => router.push(`/${lang}/public`)}
            className="bg-[#CE4520] text-white px-6 py-2 rounded-lg hover:bg-[#1565C0] transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!validSports.includes(sportName)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Invalid Sport</h1>
          <p className="text-gray-600 mb-4">The sport you selected is not available.</p>
          <button 
            onClick={() => router.push(`/${lang}/volunteer/dashboard`)}
            className="bg-[#CE4520] text-white px-6 py-2 rounded-lg hover:bg-[#1565C0] transition-colors"
          >
            Back to Dashboard
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
          <h1 className="text-2xl sm:text-3xl font-semibold font-fira mb-2 capitalize">
            Create Team for {sportName}
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
                placeholder="Enter team name"
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
                className="w-full px-3 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F28C38] focus:border-[#F28C38] font-fira text-sm sm:text-base"
                placeholder="Enter panchayat"
                value={formData.panchayat}
                onChange={(e) => handleInputChange('panchayat', e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2 font-fira">
                District <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F28C38] focus:border-[#F28C38] font-fira text-sm sm:text-base"
                placeholder="Enter district"
                value={formData.district}
                onChange={(e) => handleInputChange('district', e.target.value)}
              />
            </div>

            <div className="sm:col-span-2 lg:col-span-1">
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2 font-fira">
                State <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F28C38] focus:border-[#F28C38] font-fira text-sm sm:text-base"
                placeholder="Enter state"
                value={formData.state}
                onChange={(e) => handleInputChange('state', e.target.value)}
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

        <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 mb-4 sm:mb-6">
          <div className="flex items-center mb-4 sm:mb-6">
            <Phone className="w-5 h-5 sm:w-6 sm:h-6 text-[#F28C38] mr-2 sm:mr-3" />
            <h3 className="text-lg sm:text-xl font-semibold font-fira text-[#4A2F1D]">Captain Information</h3>
          </div>
          <hr className="mb-4 sm:mb-6" />
          
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2 font-fira">
              Captain's Phone Number <span className="text-red-500">*</span>
            </label>
            <div className="flex">
              <div className="flex items-center bg-gray-50 border border-gray-300 border-r-0 rounded-l-lg px-3">
                <span className="text-sm font-fira">+91</span>
              </div>
              <input
                type="tel"
                className="w-full px-3 py-2 sm:py-3 border border-gray-300 rounded-r-lg focus:ring-2 focus:ring-[#F28C38] focus:border-[#F28C38] font-fira text-sm sm:text-base"
                placeholder="Enter captain's 10-digit phone number"
                value={formData.captainPhone}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '');
                  handleInputChange('captainPhone', value);
                }}
                maxLength={10}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1 font-fira">
              The person with this phone number will become the team captain and can add players
            </p>
          </div>

          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-yellow-700 text-xs sm:text-sm font-fira">
              <strong>Note:</strong> The captain must have a registered account and complete profile. 
              After team creation, they can add themselves and other players to the team.
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
            Next: Captain can add team members and complete registration
          </p>
        </div>
      </div>
    </div>
  );
}