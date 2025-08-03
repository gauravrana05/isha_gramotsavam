'use client'

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createTestTeams, deleteTestTeams, getTestTeamsCount } from '@/lib/scripts/testData';
import { 
  ArrowLeft,
  Database,
  Plus,
  Trash2,
  Users,
  Loader2,
  AlertTriangle,
  CheckCircle,
  Info
} from 'lucide-react';

export default function TestDataPage() {
  const params = useParams();
  const router = useRouter();
  const { venueId, lang } = params as { venueId: string; lang: string };
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');
  const [teamCount, setTeamCount] = useState(25);

  const showMessage = (msg: string, type: 'success' | 'error' | 'info') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(''), 5000);
  };

  const handleCreateTestTeams = async () => {
    setLoading(true);
    
    try {
      const result = await createTestTeams(venueId, teamCount);
      
      if (result.success) {
        showMessage(`Successfully created ${teamCount} test teams! You can now test tournament creation.`, 'success');
      } else {
        showMessage(`Error creating test teams: ${result.error}`, 'error');
      }
    } catch (error) {
      showMessage(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    }
    
    setLoading(false);
  };

  const handleDeleteTestTeams = async () => {
    if (!confirm('Are you sure you want to delete all test teams and related data? This cannot be undone.')) {
      return;
    }
    
    setLoading(true);
    
    try {
      const result = await deleteTestTeams(venueId);
      
      if (result.success) {
        showMessage(`Successfully deleted ${result.deletedCount} test teams and related data.`, 'success');
      } else {
        showMessage(`Error deleting test teams: ${result.error}`, 'error');
      }
    } catch (error) {
      showMessage(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    }
    
    setLoading(false);
  };

  const handleCheckTestTeams = async () => {
    setLoading(true);
    
    try {
      const result = await getTestTeamsCount(venueId);
      
      if (result.success) {
        showMessage(`Found ${result.count} test teams for this venue.`, 'info');
      } else {
        showMessage(`Error checking test teams: ${result.error}`, 'error');
      }
    } catch (error) {
      showMessage(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    }
    
    setLoading(false);
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center mb-4">
          <button 
            onClick={() => router.back()}
            className="text-[#F28C38] hover:text-[#E67A26] flex items-center mr-4"
          >
            <ArrowLeft className="w-5 h-5 mr-1" />
            Back to Venue
          </button>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Test Data Management</h1>
        <p className="text-gray-600 text-sm">Create and manage test teams for fixture management testing</p>
      </div>

      {/* Warning Notice */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
        <div className="flex items-start">
          <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 mr-3" />
          <div>
            <h3 className="text-sm font-medium text-yellow-800 mb-1">Testing Environment Only</h3>
            <p className="text-sm text-yellow-700">
              This tool creates test data for development and testing purposes. 
              <strong> Do not use in production!</strong> All test teams are clearly marked and can be easily removed.
            </p>
          </div>
        </div>
      </div>

      {/* Message Display */}
      {message && (
        <div className={`rounded-lg p-4 mb-6 ${
          messageType === 'success' ? 'bg-green-50 border border-green-200' :
          messageType === 'error' ? 'bg-red-50 border border-red-200' :
          'bg-blue-50 border border-blue-200'
        }`}>
          <div className="flex items-start">
            {messageType === 'success' && <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 mr-3" />}
            {messageType === 'error' && <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 mr-3" />}
            {messageType === 'info' && <Info className="w-5 h-5 text-blue-600 mt-0.5 mr-3" />}
            <p className={`text-sm ${
              messageType === 'success' ? 'text-green-700' :
              messageType === 'error' ? 'text-red-700' :
              'text-blue-700'
            }`}>
              {message}
            </p>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="space-y-6">
        {/* Create Test Teams */}
        <div className="bg-white rounded-lg border shadow-sm p-6">
          <div className="flex items-center mb-4">
            <Plus className="w-6 h-6 text-green-600 mr-3" />
            <h2 className="text-lg font-semibold text-gray-900">Create Test Teams</h2>
          </div>
          <p className="text-gray-600 mb-4">
            Create checked-in test teams for tournament draw testing. Teams will be distributed across different sports and genders.
          </p>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Number of Teams to Create
            </label>
            <div className="flex items-center space-x-4">
              <input
                type="number"
                min="2"
                max="100"
                value={teamCount}
                onChange={(e) => setTeamCount(parseInt(e.target.value) || 2)}
                className="w-24 px-3 py-2 border border-gray-300 rounded-md focus:ring-[#F28C38] focus:border-[#F28C38]"
              />
              <span className="text-sm text-gray-500">
                (Recommended: 25 teams for comprehensive testing)
              </span>
            </div>
          </div>
          
          <button
            onClick={handleCreateTestTeams}
            disabled={loading}
            className="flex items-center px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating Teams...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 mr-2" />
                Create {teamCount} Test Teams
              </>
            )}
          </button>
        </div>

        {/* Check Test Teams */}
        <div className="bg-white rounded-lg border shadow-sm p-6">
          <div className="flex items-center mb-4">
            <Database className="w-6 h-6 text-blue-600 mr-3" />
            <h2 className="text-lg font-semibold text-gray-900">Check Existing Test Teams</h2>
          </div>
          <p className="text-gray-600 mb-4">
            Check how many test teams currently exist for this venue.
          </p>
          
          <button
            onClick={handleCheckTestTeams}
            disabled={loading}
            className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Checking...
              </>
            ) : (
              <>
                <Users className="w-4 h-4 mr-2" />
                Check Test Teams
              </>
            )}
          </button>
        </div>

        {/* Delete Test Teams */}
        <div className="bg-white rounded-lg border shadow-sm p-6">
          <div className="flex items-center mb-4">
            <Trash2 className="w-6 h-6 text-red-600 mr-3" />
            <h2 className="text-lg font-semibold text-gray-900">Clean Up Test Data</h2>
          </div>
          <p className="text-gray-600 mb-4">
            Remove all test teams, fixtures, and matches created for this venue. This will clean up all test data.
          </p>
          
          <button
            onClick={handleDeleteTestTeams}
            disabled={loading}
            className="flex items-center px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4 mr-2" />
                Delete All Test Data
              </>
            )}
          </button>
        </div>

        {/* Instructions */}
        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Testing Instructions</h3>
          <div className="space-y-2 text-sm text-gray-700">
            <p><strong>1.</strong> Create test teams using the button above</p>
            <p><strong>2.</strong> Go to the Fixtures page and you'll see teams grouped by sport/gender</p>
            <p><strong>3.</strong> Click "Create Draw" for any sport with 2+ teams</p>
            <p><strong>4.</strong> Test the tournament number assignment and draw creation</p>
            <p><strong>5.</strong> View the created fixture and test match management</p>
            <p><strong>6.</strong> Clean up test data when done testing</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg border shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Quick Actions</h3>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => router.push(`/${lang}/volunteer/venues/${venueId}/fixtures`)}
              className="flex items-center px-4 py-2 bg-[#F28C38] text-white rounded-lg hover:bg-[#E67A26] transition-colors"
            >
              <Database className="w-4 h-4 mr-2" />
              Go to Fixtures
            </button>
            
            <button
              onClick={() => router.push(`/${lang}/volunteer/venues/${venueId}/matches`)}
              className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <Users className="w-4 h-4 mr-2" />
              View Matches
            </button>
            
            <button
              onClick={() => router.push(`/${lang}/volunteer/venues/${venueId}/teams`)}
              className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <Users className="w-4 h-4 mr-2" />
              View Teams
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}