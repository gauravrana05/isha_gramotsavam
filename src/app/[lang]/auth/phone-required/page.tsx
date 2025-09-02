"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Phone, CheckCircle, ArrowRight, Globe } from 'lucide-react';

export default function PhoneRequiredPage() {
  const router = useRouter();
  const { lang } = useParams();
  
  const [phoneNumber, setPhoneNumber] = useState('');
  const [languagePreference, setLanguagePreference] = useState('english');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ phone?: string; language?: string; general?: string }>({});
  const [tempUserData, setTempUserData] = useState<any>(null);

  useEffect(() => {
    // Get temp user data from the server
    fetch('/api/auth/temp-user-data')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setTempUserData(data.userData);
          
          // If user has phone from OIDC, pre-fill it
          if (data.userData.hasPhoneFromOIDC && data.userData.phoneFromOIDC) {
            setPhoneNumber(data.userData.phoneFromOIDC);
          }
          
          // If user has existing language preference, pre-select it
          if (data.userData.hasLanguageFromDB && data.userData.existingLanguage) {
            const langMap: { [key: string]: string } = {
              'en': 'english',
              'ta': 'tamil', 
              'kn': 'kannada',
              'te': 'telugu',
              'hi': 'hindi'
            };
            setLanguagePreference(langMap[data.userData.existingLanguage] || 'english');
          }
        }
      })
      .catch(err => {
        console.error('Failed to fetch temp user data:', err);
        setErrors({ general: 'Session expired. Please login again.' });
      });
  }, []);

  const validatePhone = (phone: string): boolean => {
    const phoneRegex = /^[6-9]\d{9}$/;
    return phoneRegex.test(phone);
  };

  const languageOptions = [
    { value: 'english', label: 'English', native: 'English' },
    { value: 'tamil', label: 'Tamil', native: 'தமிழ்' },
    { value: 'kannada', label: 'Kannada', native: 'ಕನ್ನಡ' },
    { value: 'telugu', label: 'Telugu', native: 'తెలుగు' },
    { value: 'hindi', label: 'Hindi', native: 'हिंदी' },
  ];

  // Determine what to show based on temp user data
  const showPhoneInput = !tempUserData?.hasPhoneFromOIDC;
  const showLanguageInput = true; // Always show language selection
  const phoneFromOIDC = tempUserData?.phoneFromOIDC;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    // Validate phone number (only if not pre-filled from OIDC)
    if (!tempUserData?.hasPhoneFromOIDC && !phoneNumber) {
      setErrors({ phone: 'Phone number is required' });
      setLoading(false);
      return;
    }

    if (!tempUserData?.hasPhoneFromOIDC && !validatePhone(phoneNumber)) {
      setErrors({ phone: 'Please enter a valid 10-digit phone number' });
      setLoading(false);
      return;
    }

    // Validate language preference
    if (!languagePreference) {
      setErrors({ language: 'Please select a language preference' });
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/complete-registration', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: phoneNumber,
          languagePreference: languagePreference,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Redirect to the path provided by the server or default to public
        const redirectPath = data.redirectPath || `/en/public`;
        router.push(redirectPath);
      } else {
        setErrors({ general: data.error || 'Failed to complete registration. Please try again.' });
      }
    } catch (error) {
      console.error('Registration error:', error);
      setErrors({ general: 'Network error. Please check your connection and try again.' });
    }

    setLoading(false);
  };


  if (errors.general && errors.general.includes('Session expired')) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50 flex items-center justify-center p-0 md:p-4">
        <div className="max-w-md w-full bg-white md:rounded-2xl md:shadow-xl p-8 text-center min-h-screen md:min-h-0 flex flex-col justify-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Phone className="h-8 w-8 text-red-600" />
          </div>
          <h1 className="font-fira text-2xl font-bold text-gray-900 mb-4">Session Expired</h1>
          <p className="font-fira text-gray-600 mb-6">Your login session has expired. Please sign in again to continue.</p>
          <button
            onClick={() => router.push(`/${lang}/login`)}
            className="font-fira w-full bg-gradient-to-r from-[#F28C38] to-[#E67A26] text-white font-semibold py-3 px-4 rounded-xl hover:shadow-lg transform hover:scale-[1.02] transition-all duration-200"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50 flex items-center justify-center p-0 md:p-4">
      <div className="max-w-md w-full bg-white md:rounded-2xl md:shadow-xl overflow-hidden min-h-screen md:min-h-0">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-[#F28C38] to-[#E67A26] px-8 py-6 text-center">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-8 w-8 text-white" />
          </div>
          <h1 className="font-fira text-2xl font-bold text-white mb-2">Complete Registration</h1>
          <p className="font-fira text-orange-100">Just a couple more details to get started</p>
        </div>

        {/* Form */}
        <div className="px-8 py-6 flex-1 flex flex-col justify-center md:block">
          {tempUserData && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="font-fira text-sm text-green-800">
                Welcome, <strong>{tempUserData.firstName} {tempUserData.lastName}</strong>!
              </p>
              {tempUserData.email && (
                <p className="font-fira text-xs text-green-600 mt-1">{tempUserData.email}</p>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Phone Number - Show only if not from OIDC */}
            {showPhoneInput && (
              <div>
                <label htmlFor="phone" className="font-fira block text-sm font-medium text-gray-700 mb-2">
                  <Phone className="h-4 w-4 inline mr-1" />
                  Phone Number *
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    id="phone"
                    value={phoneNumber}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                      setPhoneNumber(value);
                      if (errors.phone) setErrors({ ...errors, phone: undefined });
                    }}
                    placeholder="9876543210"
                    className={`font-fira w-full px-4 py-3 pl-12 border rounded-xl focus:ring-2 focus:ring-[#F28C38] focus:border-[#F28C38] transition-colors ${
                      errors.phone ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                    maxLength={10}
                  />
                  <div className="font-fira absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">
                    +91
                  </div>
                </div>
                {errors.phone && (
                  <p className="font-fira mt-1 text-sm text-red-600">{errors.phone}</p>
                )}
                <p className="font-fira mt-1 text-xs text-gray-500">
                  Enter your 10-digit mobile number without country code
                </p>
              </div>
            )}

            {/* Phone Number - Show as read-only if from OIDC */}
            {!showPhoneInput && phoneFromOIDC && (
              <div>
                <label className="font-fira block text-sm font-medium text-gray-700 mb-2">
                  <Phone className="h-4 w-4 inline mr-1" />
                  Phone Number
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    value={`+91 ${phoneFromOIDC}`}
                    disabled
                    className="font-fira w-full px-4 py-3 pl-12 border rounded-xl bg-gray-100 text-gray-600"
                  />
                  <div className="font-fira absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">
                    ✓
                  </div>
                </div>
                <p className="font-fira mt-1 text-xs text-gray-500">
                  Phone number verified from your Isha account
                </p>
              </div>
            )}

            {/* Language Preference - Always shown */}
            <div>
              <label htmlFor="language" className="font-fira block text-sm font-medium text-gray-700 mb-2">
                <Globe className="h-4 w-4 inline mr-1" />
                Preferred Language *
              </label>
              <div className="grid grid-cols-1 gap-2">
                {languageOptions.map((option) => (
                  <label
                    key={option.value}
                    className={`flex items-center p-3 border rounded-xl cursor-pointer transition-all ${
                      languagePreference === option.value
                        ? 'border-[#F28C38] bg-orange-50 text-[#E67A26]'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="language"
                      value={option.value}
                      checked={languagePreference === option.value}
                      onChange={(e) => {
                        setLanguagePreference(e.target.value);
                        if (errors.language) setErrors({ ...errors, language: undefined });
                      }}
                      className="sr-only"
                    />
                    <div className={`w-4 h-4 rounded-full border-2 mr-3 flex items-center justify-center ${
                      languagePreference === option.value
                        ? 'border-[#F28C38] bg-[#F28C38]'
                        : 'border-gray-300'
                    }`}>
                      {languagePreference === option.value && (
                        <div className="w-2 h-2 bg-white rounded-full" />
                      )}
                    </div>
                    <div className="flex-1">
                      <span className="font-fira font-medium">{option.native}</span>
                      {option.label !== option.native && (
                        <span className="font-fira text-sm text-gray-500 ml-2">({option.label})</span>
                      )}
                    </div>
                  </label>
                ))}
              </div>
              {errors.language && (
                <p className="font-fira mt-1 text-sm text-red-600">{errors.language}</p>
              )}
            </div>

            {/* General Error */}
            {errors.general && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="font-fira text-sm text-red-800">{errors.general}</p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || (!showPhoneInput ? !languagePreference : !phoneNumber || !languagePreference)}
              className="font-fira w-full bg-gradient-to-r from-[#F28C38] to-[#E67A26] text-white font-semibold py-3 px-4 rounded-xl hover:shadow-lg transform hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none flex items-center justify-center"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  Save
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Help Text */}
          <div className="mt-6 text-center">
            <p className="font-fira text-xs text-gray-500">
              By continuing, you agree to our Terms of Service and Privacy Policy
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
