'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/server/trpc/react';
import { useAuth } from '@/context/AuthContext';
import { useNotification } from '@/context/NotificationContext';
import { useParams, useRouter } from 'next/navigation';
import { 
  ArrowLeft,
  Users,
  Hash,
  Save,
  Loader2,
  AlertCircle
} from 'lucide-react';

interface TeamAssignment {
  teamId: string;
  teamName: string;
  currentNumber?: number;
  newNumber: number;
}

export default function AssignTeamNumbersPage() {
  const { user } = useAuth();
  const { addNotification } = useNotification();
  const params = useParams();
  const router = useRouter();
  
  const venueId = params?.venueId as string;
  const fixtureId = params?.fixtureId as string;
  const lang = params?.lang as string;

  const [assignments, setAssignments] = useState<TeamAssignment[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get fixture details
  const { data: fixture, isLoading } = api.volunteers.fixture.getFixtureDetails.useQuery(
    { fixtureId },
    { enabled: !!user && !!fixtureId }
  );

  // Get teams for this fixture
  const { data: teams } = api.volunteers.venue.getVenueTeams.useQuery(
    { venueId },
    { enabled: !!user && !!venueId }
  );

  // Assign team numbers mutation
  const assignNumbers = api.volunteers.fixture.assignTeamNumbers.useMutation({
    onSuccess: () => {
      addNotification('Team numbers assigned successfully!', 'success');
      router.push(`/${lang}/volunteer/venues/${venueId}/fixtures/${fixtureId}`);
    },
    onError: (error) => {
      addNotification(error.message, 'error');
      setIsSubmitting(false);
    }
  });

  useEffect(() => {
    if (teams && fixture) {
      // Filter teams for this fixture's sport and gender
      const fixtureTeams = teams.filter(team => 
        team.sport?.id === fixture.sportId && 
        team.genderCategory === fixture.genderCategory &&
        team.status === 'checked_in'
      );

      const teamAssignments: TeamAssignment[] = fixtureTeams.map((team, index) => ({
        teamId: team.id,
        teamName: team.name,
        currentNumber: team.tournamentNumber || undefined,
        newNumber: team.tournamentNumber || (index + 1)
      }));

      setAssignments(teamAssignments);
    }
  }, [teams, fixture]);

  const handleNumberChange = (teamId: string, newNumber: number) => {
    setAssignments(prev => 
      prev.map(assignment => 
        assignment.teamId === teamId 
          ? { ...assignment, newNumber }
          : assignment
      )
    );
  };

  const handleSubmit = async () => {
    if (!fixture) return;

    // Validate unique numbers
    const numbers = assignments.map(a => a.newNumber);
    const uniqueNumbers = new Set(numbers);
    
    if (numbers.length !== uniqueNumbers.size) {
      addNotification('Each team must have a unique tournament number', 'error');
      return;
    }

    setIsSubmitting(true);
    
    try {
      await assignNumbers.mutateAsync({
        venueLevelMappingId: fixture.venueLevelMappingId,
        assignments: assignments.map(a => ({
          teamId: a.teamId,
          number: a.newNumber
        }))
      });
    } catch (error) {
      console.error('Error assigning numbers:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F3F0E5] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#F28C38]" />
      </div>
    );
  }

  if (!fixture) {
    return (
      <div className="min-h-screen bg-[#F3F0E5] flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600">Fixture not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F3F0E5] font-fira">
      {/* Header */}
      <div className="bg-[#4A2F1D] text-white py-6">
        <div className="max-w-7xl mx-auto px-4">
          <button
            onClick={() => router.push(`/${lang}/volunteer/venues/${venueId}/fixtures/${fixtureId}`)}
            className="flex items-center space-x-2 text-cream-200 hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Fixture</span>
          </button>
          
          <h1 className="text-3xl font-bold mb-2">Assign Team Numbers</h1>
          <p className="text-cream-200">{fixture.name}</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Tournament Numbers</h2>
              <p className="text-gray-600">Assign unique numbers to each team for the tournament bracket</p>
            </div>
            <div className="flex items-center text-gray-500">
              <Users className="w-5 h-5 mr-2" />
              <span>{assignments.length} teams</span>
            </div>
          </div>

          {assignments.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Teams Found</h3>
              <p className="text-gray-500">
                No checked-in teams found for this fixture. Make sure teams are checked in first.
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-4 mb-8">
                {assignments.map((assignment) => (
                  <div key={assignment.teamId} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-[#F28C38] rounded-full flex items-center justify-center text-white font-bold mr-4">
                        {assignment.newNumber}
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">{assignment.teamName}</h3>
                        {assignment.currentNumber && (
                          <p className="text-sm text-gray-500">
                            Current number: {assignment.currentNumber}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Hash className="w-4 h-4 text-gray-400" />
                      <input
                        type="number"
                        min="1"
                        max="99"
                        value={assignment.newNumber}
                        onChange={(e) => handleNumberChange(assignment.teamId, parseInt(e.target.value) || 1)}
                        className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F28C38] text-center"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end space-x-4">
                <button
                  onClick={() => router.push(`/${lang}/volunteer/venues/${venueId}/fixtures/${fixtureId}`)}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="px-6 py-3 bg-[#F28C38] text-white rounded-lg hover:bg-[#E07B2A] disabled:opacity-50 transition-colors flex items-center space-x-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Assigning...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Assign Numbers</span>
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
