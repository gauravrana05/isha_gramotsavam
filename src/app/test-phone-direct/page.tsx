"use client";

import { useEffect, useState } from 'react';

export default function TestPhoneDirectPage() {
  const [testType, setTestType] = useState<string>('');

  useEffect(() => {
    // Set test data based on URL parameter
    const params = new URLSearchParams(window.location.search);
    const scenario = params.get('scenario') || 'no-phone-no-language';
    setTestType(scenario);

    if (scenario === 'no-phone-with-language') {
      // User with existing language preference but missing phone
      const tempUserData = {
        email: "ravi.existing@example.com",
        firstName: "Ravi",
        lastName: "Kumar", 
        sub: "isha_user_11111",
        birthdate: "1988-03-10",
        gender: "male",
        hasPhoneFromOIDC: false,
        hasLanguageFromDB: true,
        existingLanguage: "ta", // Has existing language preference in our DB
        address: {
          locality: "Chennai",
          region: "Tamil Nadu",
          postal_code: "600001"
        }
      };

      // Set temp user data cookie
      document.cookie = `temp_user_data=${JSON.stringify(tempUserData)}; max-age=600; path=/`;
      
      // Redirect to phone-required page
      setTimeout(() => {
        window.location.href = '/en/auth/phone-required';
      }, 100);

    } else if (scenario === 'no-phone-no-language') {
      // User without phone or language preference
      const tempUserData = {
        email: "priya.new@example.com",
        firstName: "Priya",
        lastName: "Sharma", 
        sub: "isha_user_67890",
        birthdate: "1985-12-20",
        gender: "female",
        hasPhoneFromOIDC: false,
        hasLanguageFromDB: false,
        address: {
          locality: "Bangalore",
          region: "Karnataka",
          postal_code: "560001"
        }
      };

      // Set temp user data cookie
      document.cookie = `temp_user_data=${JSON.stringify(tempUserData)}; max-age=600; path=/`;
      
      // Redirect to phone-required page
      setTimeout(() => {
        window.location.href = '/en/auth/phone-required';
      }, 100);

    } else if (scenario === 'with-phone-with-language') {
      // Direct redirect to Tamil public page
      setTimeout(() => {
        window.location.href = '/ta/public?test=success&message=User with phone and Tamil preference logged in directly';
      }, 100);

    } else if (scenario === 'with-phone-no-language') {
      // User with phone from OIDC but no language preference in our DB
      const tempUserData = {
        email: "rakesh.patel@example.com",
        firstName: "Rakesh",
        lastName: "Patel", 
        sub: "isha_user_22222",
        birthdate: "1992-07-25",
        gender: "male",
        hasPhoneFromOIDC: true,
        phoneFromOIDC: "9123456789", // Phone from OIDC
        hasLanguageFromDB: false,
        address: {
          locality: "Mumbai",
          region: "Maharashtra",
          postal_code: "400001"
        }
      };

      // Set temp user data cookie
      document.cookie = `temp_user_data=${JSON.stringify(tempUserData)}; max-age=600; path=/`;
      
      // Redirect to phone-required page (will show language selection only)
      setTimeout(() => {
        window.location.href = '/en/auth/phone-required';
      }, 100);
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-8">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-6">
          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
        </div>
        <h1 className="font-fira text-2xl font-bold text-gray-900 mb-4">Setting Up Test</h1>
        <p className="font-fira text-gray-600 mb-2">
          Testing scenario: <strong>{testType.replace(/-/g, ' ')}</strong>
        </p>
        <p className="font-fira text-xs text-gray-500">
          Redirecting to appropriate page...
        </p>
      </div>
    </div>
  );
}