"use client";

import React from 'react';
import { User, Phone, TestTube } from 'lucide-react';

export default function TestAuthPage() {
  const testScenarios = [
    {
      id: 'with-phone-with-language',
      title: 'Phone + Language Present',
      description: 'Existing user with phone and language preference',
      mockUser: {
        name: 'Arjun Kumar (Existing)',
        email: 'arjun.kumar@example.com', 
        phone: '+919876543210',
        language: 'Tamil (ta)',
        location: 'Coimbatore, Tamil Nadu'
      },
      expectedFlow: [
        'OIDC returns phone_number: "+919876543210"',
        'User has existing languagePreference: "ta"',
        'Phone extracted as "9876543210"', 
        'User updated in database',
        'Redirected directly to /ta/public (Tamil page)'
      ],
      buttonColor: 'from-blue-500 to-blue-600',
      url: '/api/test-auth/demo?scenario=with-phone-with-language'
    },
    {
      id: 'with-phone-no-language',
      title: 'Phone Present, No Language',
      description: 'New user with phone but no language preference',
      mockUser: {
        name: 'Rakesh Patel (New)',
        email: 'rakesh.patel@example.com', 
        phone: '+919123456789',
        language: 'Not set',
        location: 'Mumbai, Maharashtra'
      },
      expectedFlow: [
        'OIDC returns phone_number: "+919123456789"',
        'No existing language preference',
        'Phone extracted as "9123456789"', 
        'User created with languagePreference: "en"',
        'Redirected directly to /en/public'
      ],
      buttonColor: 'from-green-500 to-green-600',
      url: '/api/test-auth/demo?scenario=with-phone-no-language'
    },
    {
      id: 'no-phone-with-language',
      title: 'No Phone, Language Present',
      description: 'Existing user missing phone but has language preference',
      mockUser: {
        name: 'Ravi Kumar (Existing)',
        email: 'ravi.existing@example.com',
        phone: 'Not provided by OIDC',
        language: 'Tamil (ta)',
        location: 'Chennai, Tamil Nadu'
      },
      expectedFlow: [
        'OIDC returns phone_number: null',
        'User has existing languagePreference: "ta"',
        'Temp user data stored in cookie',
        'Redirected to /en/auth/phone-required',
        'User fills phone number',
        'Registration completed → redirect to /ta/public (Tamil page)'
      ],
      buttonColor: 'from-orange-500 to-orange-600',  
      url: '/api/test-auth/demo?scenario=no-phone-with-language'
    },
    {
      id: 'no-phone-no-language',
      title: 'No Phone, No Language',
      description: 'Completely new user without phone or language preference',
      mockUser: {
        name: 'Priya Sharma (New)',
        email: 'priya.new@example.com',
        phone: 'Not provided by OIDC',
        language: 'Not set',
        location: 'Bangalore, Karnataka'
      },
      expectedFlow: [
        'OIDC returns phone_number: null',
        'No existing language preference',
        'Temp user data stored in cookie',
        'Redirected to /en/auth/phone-required',
        'User fills phone number',
        'Registration completed → redirect to /en/public'
      ],
      buttonColor: 'from-red-500 to-red-600',  
      url: '/api/test-auth/demo?scenario=no-phone-no-language'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-8">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="text-center mb-12">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <TestTube className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Authentication Flow Test Suite</h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Test both authentication scenarios with mock users to verify the phone-required flow works correctly
          </p>
        </div>

        {/* Test Scenarios */}
        <div className="grid lg:grid-cols-2 gap-8 mb-12">
          {testScenarios.map((scenario) => (
            <div key={scenario.id} className="bg-white rounded-2xl shadow-xl overflow-hidden">
              
              {/* Card Header */}
              <div className={`bg-gradient-to-r ${scenario.buttonColor} p-6 text-white`}>
                <div className="flex items-center mb-3">
                  {scenario.id === 'with-phone' ? (
                    <Phone className="h-6 w-6 mr-3" />
                  ) : (
                    <User className="h-6 w-6 mr-3" />
                  )}
                  <h2 className="text-2xl font-bold">{scenario.title}</h2>
                </div>
                <p className="text-white/90">{scenario.description}</p>
              </div>

              {/* Mock User Info */}
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Mock User Data</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Name:</span>
                    <span className="font-medium">{scenario.mockUser.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Email:</span>
                    <span className="font-medium">{scenario.mockUser.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Phone:</span>
                    <span className={`font-medium ${scenario.mockUser.phone.includes('Not provided') ? 'text-red-600' : 'text-green-600'}`}>
                      {scenario.mockUser.phone}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Language:</span>
                    <span className={`font-medium ${scenario.mockUser.language === 'Not set' ? 'text-red-600' : 'text-green-600'}`}>
                      {scenario.mockUser.language}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Location:</span>
                    <span className="font-medium">{scenario.mockUser.location}</span>
                  </div>
                </div>
              </div>

              {/* Expected Flow */}
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Expected Flow</h3>
                <ol className="space-y-2">
                  {scenario.expectedFlow.map((step, index) => (
                    <li key={index} className="flex items-start text-sm">
                      <span className="flex-shrink-0 w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center text-xs font-medium text-gray-600 mr-3 mt-0.5">
                        {index + 1}
                      </span>
                      <span className="text-gray-700">{step}</span>
                    </li>
                  ))}
                </ol>
                
                {/* Test Button */}
                <div className="mt-6">
                  <a
                    href={scenario.url}
                    className={`w-full bg-gradient-to-r ${scenario.buttonColor} text-white font-semibold py-3 px-6 rounded-xl hover:shadow-lg transform hover:scale-[1.02] transition-all duration-200 flex items-center justify-center`}
                  >
                    Test This Scenario
                    <TestTube className="ml-2 h-4 w-4" />
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Instructions */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Testing Instructions</h2>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Before Testing</h3>
              <ul className="space-y-2 text-gray-700">
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                  Clear browser cookies to start fresh
                </li>
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                  Make sure your database is running
                </li>
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                  Check that OIDC environment variables are set
                </li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">What to Verify</h3>
              <ul className="space-y-2 text-gray-700">
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                  Proper page redirects occur
                </li>
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                  Phone-required page shows user data
                </li>
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                  Language preference is captured correctly
                </li>
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                  Users are created in database properly
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-blue-800 text-sm">
              <strong>Note:</strong> These are mock scenarios for testing. The actual OIDC flow will be triggered in production 
              when users click "Login with Isha SSO" on the login page.
            </p>
          </div>
        </div>

        {/* Debug Info */}
        <div className="mt-8 bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Debug Information</h3>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Key Files Modified:</h4>
              <ul className="text-gray-600 space-y-1">
                <li>• /api/auth/callback/route.ts</li>
                <li>• /api/auth/complete-registration/route.ts</li>
                <li>• /[lang]/auth/phone-required/page.tsx</li>
                <li>• /api/auth/temp-user-data/route.ts</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Database Tables:</h4>
              <ul className="text-gray-600 space-y-1">
                <li>• User (main user table)</li>
                <li>• Check languagePreference field</li>
                <li>• Verify phone field format (10 digits)</li>
                <li>• Check profileComplete calculation</li>
              </ul>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}