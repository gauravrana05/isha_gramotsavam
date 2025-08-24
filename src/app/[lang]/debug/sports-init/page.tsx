"use client";

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { sportsService } from '@/lib/services/sportsService';
import Button from '@/components/ui/Button';
import Container from '@/components/ui/Container';

export default function SportsInitPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [sports, setSports] = useState<any[]>([]);
  const { user, userProfile } = useAuth();

  const handleInitializeSports = async () => {
    if (!user || userProfile?.role !== 'admin') {
      setMessage('❌ Admin access required');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      await sportsService.initializeDefaultSports();
      setMessage('✅ Sports collection initialized successfully!');
      
      // Fetch the created sports to display
      const allSports = await sportsService.getAllSports();
      setSports(allSports);
      
    } catch (error: any) {
      // Error handling removed
      setMessage(`❌ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleFetchSports = async () => {
    setLoading(true);
    try {
      const allSports = await sportsService.getAllSports();
      setSports(allSports);
      setMessage(`✅ Fetched ${allSports.length} sports from database`);
    } catch (error: any) {
      setMessage(`❌ Error fetching sports: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleTestEligibility = async () => {
    if (sports.length === 0) {
      setMessage('❌ No sports found. Initialize first.');
      return;
    }

    setLoading(true);
    try {
      const testResults = [];
      
      // Test male eligibility for volleyball
      const volleyballEligibility = await sportsService.checkEligibility('volleyball', 25, 'M');
      testResults.push(`Volleyball (Male, 25): ${volleyballEligibility.eligible ? '✅ Eligible' : '❌ Not eligible'}`);
      
      // Test female eligibility for throwball
      const throwballEligibility = await sportsService.checkEligibility('throwball', 28, 'F');
      testResults.push(`Throwball (Female, 28): ${throwballEligibility.eligible ? '✅ Eligible' : '❌ Not eligible'}`);
      
      // Test wrong gender for throwball
      const throwballMaleEligibility = await sportsService.checkEligibility('throwball', 25, 'M');
      testResults.push(`Throwball (Male, 25): ${throwballMaleEligibility.eligible ? '✅ Eligible' : '❌ Not eligible'} - ${throwballMaleEligibility.reasons.join(', ')}`);
      
      setMessage(`🧪 Eligibility Tests:\n${testResults.join('\n')}`);
    } catch (error: any) {
      setMessage(`❌ Error testing eligibility: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <Container>
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Authentication Required</h1>
          <p className="text-gray-600">Please log in to access sports initialization.</p>
        </div>
      </Container>
    );
  }

  if (userProfile?.role !== 'admin') {
    return (
      <Container>
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Admin Access Required</h1>
          <p className="text-gray-600">Only administrators can initialize the sports collection.</p>
        </div>
      </Container>
    );
  }

  return (
    <Container>
      <div className="max-w-4xl mx-auto py-8">
        <div className="bg-white rounded-lg shadow-sm p-8">
          <h1 className="text-3xl font-bold text-[#4A2F1D] mb-8 text-center">
            Sports Database Initialization
          </h1>

          <div className="space-y-6">
            {/* Action Buttons */}
            <div className="flex flex-wrap gap-4 justify-center">
              <Button
                onClick={handleInitializeSports}
                disabled={loading}
                className="bg-[#3A7F3F] hover:bg-green-700"
              >
                {loading ? 'Initializing...' : 'Initialize Sports Collection'}
              </Button>

              <Button
                onClick={handleFetchSports}
                disabled={loading}
                variant="outline"
              >
                {loading ? 'Fetching...' : 'Fetch Current Sports'}
              </Button>

              <Button
                onClick={handleTestEligibility}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {loading ? 'Testing...' : 'Test Eligibility Logic'}
              </Button>
            </div>

            {/* Status Message */}
            {message && (
              <div className={`p-4 rounded-lg whitespace-pre-line ${
                message.includes('❌') 
                  ? 'bg-red-50 text-red-700 border border-red-200'
                  : message.includes('🧪')
                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                  : 'bg-green-50 text-green-700 border border-green-200'
              }`}>
                {message}
              </div>
            )}

            {/* Sports Display */}
            {sports.length > 0 && (
              <div className="mt-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  Sports in Database ({sports.length})
                </h2>
                
                <div className="grid gap-6 md:grid-cols-2">
                  {sports.map((sport) => (
                    <div key={sport.sportId} className="border rounded-lg p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {sport.name}
                        </h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          sport.status === 'active' 
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {sport.status}
                        </span>
                      </div>
                      
                      <div className="space-y-2 text-sm text-gray-600">
                        <p><strong>Category:</strong> {sport.category}</p>
                        <p><strong>Players:</strong> {sport.teamConfig.maxPlayers} + {sport.teamConfig.maxSubstitutes} substitutes</p>
                        <p><strong>Gender:</strong> {sport.eligibility.genderRestriction}</p>
                        <p><strong>Age:</strong> {sport.eligibility.minAge}-{sport.eligibility.maxAge} years</p>
                        <p><strong>Prize Pool:</strong> ₹{sport.eventInfo.prizePool.first.toLocaleString()} (1st)</p>
                        <p><strong>Registration:</strong> {new Date(sport.eventInfo.registrationStart).toLocaleDateString()} - {new Date(sport.eventInfo.registrationEnd).toLocaleDateString()}</p>
                      </div>

                      <div className="mt-4">
                        <p className="text-xs text-gray-500">
                          Created: {new Date(sport.createdAt).toLocaleString()}
                        </p>
                        <p className="text-xs text-gray-500">
                          Updated: {new Date(sport.updatedAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Instructions */}
            <div className="mt-8 p-6 bg-blue-50 rounded-lg border border-blue-200">
              <h3 className="font-semibold text-blue-900 mb-2">Instructions:</h3>
              <ul className="text-blue-700 text-sm space-y-1">
                <li>1. <strong>Initialize Sports Collection:</strong> Creates volleyball and throwball entries in Firestore</li>
                <li>2. <strong>Fetch Current Sports:</strong> Displays all sports currently in the database</li>
                <li>3. <strong>Test Eligibility Logic:</strong> Runs sample eligibility checks to verify the system works</li>
                <li>4. After initialization, other components will automatically use the database sports</li>
              </ul>
            </div>

            {/* Warning */}
            <div className="mt-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <p className="text-yellow-800 text-sm">
                <strong>⚠️ Warning:</strong> Initialization will create new sports documents. 
                Only run this once or you may have duplicate entries.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Container>
  );
}