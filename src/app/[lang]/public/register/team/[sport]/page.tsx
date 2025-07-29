"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { getFunctions, httpsCallable } from "firebase/functions";
import { useTranslation } from "@/lib/utils/i18n";
import Image from "next/image";
import { Users, ArrowRight, Loader2, AlertCircle } from "lucide-react";

interface TeamFormData {
  teamName: string;
  captainName: string;
  captainPhone: string;
  captainWhatsapp: string;
  teamDescription: string;
  panchayat: string;
  district: string;
  state: string;
}

export default function TeamRegistrationPage() {
  const [formData, setFormData] = useState<TeamFormData>({
    teamName: "",
    captainName: "",
    captainPhone: "",
    captainWhatsapp: "",
    teamDescription: "",
    panchayat: "",
    district: "",
    state: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isWhatsAppSame, setIsWhatsAppSame] = useState(true);

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
    // Redirect if profile incomplete
    if (!userProfile?.isProfileComplete) {
      router.push(`/${lang}/complete-profile`);
      return;
    }

    // Validate sport
    if (!validSports.includes(sportName)) {
      router.push(`/${lang}/public/sports`);
      return;
    }

    // Validate gender-sport eligibility
    if (sportName === 'throwball' && userProfile.gender !== 'F') {
      setError("Throwball registration is only available for women.");
      return;
    }

    // Pre-fill form with user data
    if (userProfile) {
      setFormData(prev => ({
        ...prev,
        captainName: `${userProfile.firstName} ${userProfile.lastName}`.trim(),
        captainPhone: userProfile.phoneNumber || "",
        captainWhatsapp: userProfile.whatsappNumber || userProfile.phoneNumber || "",
        panchayat: userProfile.panchayat || "",
        district: userProfile.district || "",
        state: userProfile.state || "",
      }));

      if (userProfile.whatsappNumber === userProfile.phoneNumber) {
        setIsWhatsAppSame(true);
      } else {
        setIsWhatsAppSame(false);
      }
    }
  }, [user, userProfile, authLoading, router, lang, sportName]);

  const handleInputChange = (field: keyof TeamFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError("");
  };

  const handleWhatsAppSameChange = (checked: boolean) => {
    setIsWhatsAppSame(checked);
    if (checked) {
      setFormData(prev => ({ ...prev, captainWhatsapp: prev.captainPhone }));
    } else {
      setFormData(prev => ({ ...prev, captainWhatsapp: "" }));
    }
  };

  const validateForm = () => {
    if (!formData.teamName.trim()) return "Please enter team name";
    if (formData.teamName.length < 3) return "Team name must be at least 3 characters";
    if (!formData.captainName.trim()) return "Please enter captain name";
    if (!formData.captainPhone.trim()) return "Please enter captain phone number";
    if (!formData.captainWhatsapp.trim()) return "Please enter WhatsApp number";
    if (!formData.panchayat.trim()) return "Please enter panchayat";
    if (!formData.district.trim()) return "Please enter district";
    if (!formData.state.trim()) return "Please enter state";
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
      const functions = getFunctions();
      console.log("I am initializing the function now");
      const createTeam = httpsCallable(functions, 'createTeamWithCompleteSchema');
      
      const teamData = {
        name: formData.teamName,
        sportName: sportName.charAt(0).toUpperCase() + sportName.slice(1),
        description: formData.teamDescription,
        panchayat: formData.panchayat,
        district: formData.district,
        state: formData.state,
      };
      
      console.log("I am calling the function now");
      const result: any = await createTeam({ teamData });
      console.log("ran successfully");
      if (result.data.success) {
        router.push(`/${lang}/captain/teams/${result.data.teamId}/players/invite`);
      } else {
        throw new Error(result.data.message || "Failed to create team.");
      }

    } catch (err: any) {
      console.error("Error creating team:", err);
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

  if (!validSports.includes(sportName)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Invalid Sport</h1>
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
    <div className="min-h-screen bg-isha">
      <div className="max-w-4xl mx-auto p-4 py-8">
        <div className="text-center mb-8">
          <div className="mb-4">
            <Image 
              src="https://ishalogin.sadhguru.org/app/images/3e8fd38d1d957c44372b.svg" 
              alt="Isha Logo" 
              width={80} 
              height={80} 
              className="mx-auto"
            />
          </div>
          <h1 className="text-3xl font-semibold font-fira mb-2 capitalize">
            Register Team for {sportName}
          </h1>
          <p className="text-gray-600 font-fira">
            {sportName === 'throwball' ? 'For Women' : 'For Men and Women'}
          </p>
          <p className="text-gray-600 font-fira">Step 1 of 2: Team Details</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center mb-6">
            <Users className="w-6 h-6 text-[#CE4520] mr-3" />
            <h3 className="text-xl font-semibold font-fira">Team Information</h3>
          </div>
          <hr className="mb-6" />
          
          <div className="grid md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2 font-fira">
                Team Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#CE4520] focus:border-[#CE4520] font-fira"
                placeholder="Enter your team name"
                value={formData.teamName}
                onChange={(e) => handleInputChange('teamName', e.target.value)}
                maxLength={50}
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2 font-fira">
                Team Description (Optional)
              </label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#CE4520] focus:border-[#CE4520] font-fira"
                placeholder="Brief description about your team"
                value={formData.teamDescription}
                onChange={(e) => handleInputChange('teamDescription', e.target.value)}
                rows={3}
                maxLength={200}
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center mb-6">
            <Users className="w-6 h-6 text-[#CE4520] mr-3" />
            <h3 className="text-xl font-semibold font-fira">Captain Details</h3>
          </div>
          <hr className="mb-6" />
          
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 font-fira">
                Captain Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 font-fira"
                value={formData.captainName}
                readOnly
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 font-fira">
                Phone Number <span className="text-red-500">*</span>
              </label>
              <div className="flex">
                <div className="flex items-center bg-gray-50 border border-gray-300 border-r-0 rounded-l-lg px-3">
                  <span className="text-sm font-fira">+91</span>
                </div>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-r-lg bg-gray-50 font-fira"
                  value={formData.captainPhone}
                  readOnly
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 font-fira">
                WhatsApp Number <span className="text-red-500">*</span>
              </label>
              <div className="space-y-2">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isWhatsAppSame"
                    className="mr-2"
                    checked={isWhatsAppSame}
                    onChange={(e) => handleWhatsAppSameChange(e.target.checked)}
                  />
                  <label htmlFor="isWhatsAppSame" className="text-sm font-fira">
                    Same as phone number
                  </label>
                </div>
                <div className="flex">
                  <div className="flex items-center bg-gray-50 border border-gray-300 border-r-0 rounded-l-lg px-3">
                    <span className="text-sm font-fira">+91</span>
                  </div>
                  <input
                    type="tel"
                    className={`w-full px-3 py-2 border border-gray-300 rounded-r-lg font-fira ${
                      isWhatsAppSame ? 'bg-gray-50' : ''
                    }`}
                    placeholder="Enter WhatsApp number"
                    value={formData.captainWhatsapp}
                    onChange={(e) => handleInputChange('captainWhatsapp', e.target.value.replace(/\D/g, ''))}
                    maxLength={10}
                    readOnly={isWhatsAppSame}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center mb-6">
            <Users className="w-6 h-6 text-[#CE4520] mr-3" />
            <h3 className="text-xl font-semibold font-fira">Team Location</h3>
          </div>
          <hr className="mb-6" />
          
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 font-fira">
                Panchayat <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#CE4520] focus:border-[#CE4520] font-fira"
                placeholder="Enter panchayat"
                value={formData.panchayat}
                onChange={(e) => handleInputChange('panchayat', e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 font-fira">
                District <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#CE4520] focus:border-[#CE4520] font-fira"
                placeholder="Enter district"
                value={formData.district}
                onChange={(e) => handleInputChange('district', e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 font-fira">
                State <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#CE4520] focus:border-[#CE4520] font-fira"
                placeholder="Enter state"
                value={formData.state}
                onChange={(e) => handleInputChange('state', e.target.value)}
              />
            </div>
          </div>

          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-blue-600 text-sm font-fira">
              <strong>Important:</strong> All team members must be from the same panchayat. 
              This will be verified during the approval process.
            </p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-600 text-sm font-fira">{error}</p>
          </div>
        )}

        <div className="text-center mb-8">
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="bg-[#CE4520] hover:bg-[#1565C0] text-white px-8 py-3 rounded-lg font-fira text-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors inline-flex items-center"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                Creating Team...
              </>
            ) : (
              <>
                Save & Continue
                <ArrowRight className="w-5 h-5 ml-2" />
              </>
            )}
          </button>
        </div>

        <div className="text-center mb-6">
          <p className="text-sm font-fira text-gray-600">
            Next: Add team members and complete registration
          </p>
        </div>
      </div>
    </div>
  );
}