'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/server/trpc/react';
import { useAuth } from '@/context/AuthContext';
import { useNotification } from '@/context/NotificationContext';
import { useParams, useRouter } from 'next/navigation';
import { 
  ArrowLeft,
  Clock,
  Calendar,
  Save,
  Loader2,
  AlertCircle
} from 'lucide-react';

interface MatchSchedule {
  matchId: string;
  roundName: string;
  team1Name?: string;
  team2Name?: string;
  currentTime?: Date;
  newTime: string;
}

export default function ScheduleMatchesPage() {
  const { user } = useAuth();
  const { addNotification } = useNotification();
  const params = useParams();
  const router = useRouter();
  
  const venueId = params?.venueId as string;
  const fixtureId = params?.fixtureId as string;
  const lang = params?.lang as string;

  const [schedules, setSchedules] = useState<MatchSchedule[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get fixture details with matches
  const { data: fixture, isLoading } = api.volunteers.fixture.getFixtureDetails.useQuery(
    { fixtureId },
    { enabled: !!user && !!fixtureId }
  );

  // Bulk schedule matches mutation
  const bulkSchedule = api.volunteers.match.bulkScheduleMatches.useMutation({
    onSuccess: () => {
      addNotification('Match schedules updated successfully!', 'success');
      router.push(`/${lang}/volunteer/venues/${venueId}/fixtures/${fixtureId}`);
    },
    onError: (error) => {
      addNotification(error.message, 'error');
      setIsSubmitting(false);
    }
  });

  useEffect(() => {
    if (fixture?.matches) {
      const matchSchedules: MatchSchedule[] = fixture.matches.map(match => ({
        matchId: match.id,
        roundName: match.roundName,
        team1Name: match.team1?.name,
        team2Name: match.team2?.name,
        currentTime: match.scheduledTime,
        newTime: match.scheduledTime 
          ? new Date(match.scheduledTime).toISOString().slice(0, 16)
          : new Date().toISOString().slice(0, 16)
      }));

      setSchedules(matchSchedules);
    }
  }, [fixture]);

  const handleTimeChange = (matchId: string, newTime: string) => {
    setSchedules(prev => 
      prev.map(schedule => 
        schedule.matchId === matchId 
          ? { ...schedule, newTime }
          : schedule
      )
    );
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    
    try {
      const schedulesToUpdate = schedules
        .filter(s => s.newTime)
        .map(s => ({
          matchId: s.matchId,
          scheduledTime: new Date(s.newTime)
        }));

      await bulkSchedule.mutateAsync({
        schedules: schedulesToUpdate
      });
    } catch (error) {
      console.error('Error scheduling matches:', error);
    }
  };

  const generateAutoSchedule = () => {
    const startTime = new Date();
    startTime.setHours(9, 0, 0, 0); // Start at 9 AM
    
    const updatedSchedules = schedules.map((schedule, index) => {
      const matchTime = new Date(startTime);
      matchTime.setMinutes(startTime.getMinutes() + (index * 60)); // 1 hour between matches
      
      return {
        ...schedule,
        newTime: matchTime.toISOString().slice(0, 16)
      };
    });

    setSchedules(updatedSchedules);
    addNotification('Auto-schedule generated with 1-hour intervals', 'success');
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
          
          <h1 className="text-3xl font-bold mb-2">Schedule Matches</h1>
          <p className="text-cream-200">{fixture.name}</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Match Schedule</h2>
              <p className="text-gray-600">Set the date and time for each match</p>
            </div>
            <button
              onClick={generateAutoSchedule}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
            >
              <Clock className="w-4 h-4" />
              <span>Auto Schedule</span>
            </button>
          </div>

          {schedules.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Matches Found</h3>
              <p className="text-gray-500">
                Create the tournament draw first to generate matches for scheduling.
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-4 mb-8">
                {schedules.map((schedule) => (
                  <div key={schedule.matchId} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center space-x-4">
                        <div className="w-2 h-2 bg-[#F28C38] rounded-full"></div>
                        <div>
                          <h3 className="font-medium text-gray-900">{schedule.roundName}</h3>
                          <p className="text-sm text-gray-500">
                            {schedule.team1Name || 'TBD'} vs {schedule.team2Name || 'TBD'}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Clock className="w-4 h-4 text-gray-400" />
                      <input
                        type="datetime-local"
                        value={schedule.newTime}
                        onChange={(e) => handleTimeChange(schedule.matchId, e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F28C38]"
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
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Save Schedule</span>
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
