'use client';

import { useState, useEffect, use } from 'react';
import { getVenueTeamsForMatchDay } from '@/lib/actions/volunteer/matchDayVerification';
import { getVenueCheckedInTeams, getVenueFixtures, getVenueDetails } from '@/lib/actions/tournament/fixtureManagement';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { Loader2, Users, CheckCircle, UserCheck, Trophy, Calendar, Camera, AlertCircle } from 'lucide-react';

interface PageProps {
  params: Promise<{
    venueId: string;
    lang: string;
  }>;
}


export default function TechnicalVolunteerVenueDashboard({ params }: PageProps) {
  const { venueId } = use(params);
  const { user, loading: authLoading } = useAuth();
  
  const [venue, setVenue] = useState<any>(null);
  const [teams, setTeams] = useState<any[]>([]);
  const [fixtures, setFixtures] = useState<any[]>([]);
  const [checkedInTeamsResult, setCheckedInTeamsResult] = useState<any>({ success: false });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      setError('Please log in to access this page');
      setLoading(false);
      return;
    }

    loadVenueData();
  }, [user, authLoading, venueId]);

  const loadVenueData = async () => {
    try {
      setLoading(true);
      
      // Fetch teams for match day verification
      try {
        const teamsResult = await getVenueTeamsForMatchDay(venueId, user!.uid);
        
        if (teamsResult.success) {
          setTeams(teamsResult.teams ?? []);
        } else {
          setError(teamsResult.error || 'Failed to load teams');
        }
      } catch (teamsError) {
        // Error handling removed
        setTeams([]);
      }
      
      // Fetch checked-in teams for sports overview
      try {
        const checkedInResult = await getVenueCheckedInTeams(venueId, 'isha_gramotsavam_2025');
        setCheckedInTeamsResult(checkedInResult);
      } catch (checkedInError) {
        // Error handling removed
        setCheckedInTeamsResult({ success: false, teams: [], teamsBySport: {}, totalTeams: 0 });
      }
      
      // Fetch venue fixtures
      try {
        const fixturesData = await getVenueFixtures(venueId);
        setFixtures(fixturesData);
      } catch (fixturesError) {
        // Error handling removed
        setFixtures([]);
      }
      
      // Fetch real venue details
      try {
        const venueResult = await getVenueDetails(venueId);
        if (venueResult.success && venueResult.venue) {
          setVenue(venueResult.venue);
        } else {
          // Fallback if venue not found
          setVenue({
            id: venueId,
            name: `Venue ${venueId}`,
            location: 'Match Day Verification Center'
          });
        }
      } catch (venueError) {
        // Error handling removed
        // Use fallback venue data
        setVenue({
          id: venueId,
          name: `Venue ${venueId}`,
          location: 'Match Day Verification Center'
        });
      }
      
    } catch (err) {
      // Error handling removed
      setError('Failed to load venue data');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#F28C38] mx-auto mb-4" />
          <p className="text-gray-600">Loading venue data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">Error</h1>
          <p className="mt-2 text-gray-600">{error}</p>
          <button 
            onClick={loadVenueData}
            className="mt-4 bg-[#F28C38] text-white px-6 py-2 rounded-lg hover:bg-[#E67A26] transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const totalTeams = teams.length;
  const checkedInCount = teams.filter(team => team.matchDayStatus === 'checked_in').length;
  const verifiedCount = teams.filter(team => team.matchDayStatus === 'verified').length;
  
  // Also get counts from checked-in teams for sports overview
  const checkedInSportsCount = checkedInTeamsResult.success ? checkedInTeamsResult.totalTeams : 0;

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-semibold font-fira mb-2 text-[#4A2F1D]">
          {venue?.name || 'Match Day Venue'}
        </h1>
        <p className="text-sm sm:text-base text-gray-600 font-fira">
          {venue?.address || venue?.location || 'Technical Volunteer Station'} - Match Day Operations
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Total Teams</p>
              <p className="text-2xl font-bold text-[#4A2F1D]">{totalTeams}</p>
            </div>
            <Users className="w-8 h-8 text-gray-400" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Checked In</p>
              <p className="text-2xl font-bold text-green-600">{checkedInSportsCount}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-400" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Verified</p>
              <p className="text-2xl font-bold text-blue-600">{verifiedCount}</p>
            </div>
            <UserCheck className="w-8 h-8 text-blue-400" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Fixtures</p>
              <p className="text-2xl font-bold text-purple-600">{fixtures.length}</p>
            </div>
            <Trophy className="w-8 h-8 text-purple-400" />
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
        <h3 className="text-lg font-semibold text-[#4A2F1D] mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Link href={`/en/volunteer/venues/${venueId}/teams`}>
            <button className="w-full p-4 text-left bg-gradient-to-r from-green-50 to-green-100 border border-green-200 rounded-lg hover:from-green-100 hover:to-green-200 transition-all">
              <div className="flex items-center">
                <Users className="w-8 h-8 text-green-600 mr-3" />
                <div>
                  <div className="font-semibold text-green-700">Match Day Verification</div>
                  <div className="text-sm text-green-600">Verify Teams</div>
                </div>
              </div>
            </button>
          </Link>

          <Link href={`/en/volunteer/venues/${venueId}/fixtures`}>
            <button className="w-full p-4 text-left bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-lg hover:from-blue-100 hover:to-blue-200 transition-all">
              <div className="flex items-center">
                <Trophy className="w-8 h-8 text-blue-600 mr-3" />
                <div>
                  <div className="font-semibold text-blue-700">Active Fixtures</div>
                  <div className="text-sm text-blue-600">Tournament Brackets</div>
                </div>
              </div>
            </button>
          </Link>

          <Link href={`/en/volunteer/venues/${venueId}/matches`}>
            <button className="w-full p-4 text-left bg-gradient-to-r from-orange-50 to-orange-100 border border-orange-200 rounded-lg hover:from-orange-100 hover:to-orange-200 transition-all">
              <div className="flex items-center">
                <Calendar className="w-8 h-8 text-orange-600 mr-3" />
                <div>
                  <div className="font-semibold text-orange-700">Total Matches</div>
                  <div className="text-sm text-orange-600">Match Management</div>
                </div>
              </div>
            </button>
          </Link>

          <Link href={`/en/volunteer/venues/${venueId}/media`}>
            <button className="w-full p-4 text-left bg-gradient-to-r from-purple-50 to-purple-100 border border-purple-200 rounded-lg hover:from-purple-100 hover:to-purple-200 transition-all">
              <div className="flex items-center">
                <Camera className="w-8 h-8 text-purple-600 mr-3" />
                <div>
                  <div className="font-semibold text-purple-700">Media</div>
                  <div className="text-sm text-purple-600">Photos & Videos</div>
                </div>
              </div>
            </button>
          </Link>
        </div>
        
        {/* Test Data Management (Development Only) */}
        {/* <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h4 className="font-medium text-yellow-800 mb-2">Development Tools</h4>
          <Link href={`/en/volunteer/venues/${venueId}/test-data`}>
            <button className="w-full p-3 text-left bg-yellow-100 border border-yellow-300 rounded-lg hover:bg-yellow-200 transition-all">
              <div className="flex items-center">
                <AlertCircle className="w-6 h-6 text-yellow-600 mr-3" />
                <div>
                  <div className="font-medium text-yellow-700">Test Data Management</div>
                  <div className="text-sm text-yellow-600">Create/delete test teams for testing</div>
                </div>
              </div>
            </button>
          </Link>
        </div> */}
      </div>

      {/* Sports Overview */}
      {checkedInTeamsResult.success && (
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h3 className="text-lg font-semibold text-[#4A2F1D] mb-4">Sports Overview</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(checkedInTeamsResult.teamsBySport).map(([sportKey, sportTeams]) => {
              const [sportId, genderCategory] = sportKey.split('_');
              return (
                <div key={sportKey} className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                  <h4 className="font-medium capitalize text-gray-900">
                    {sportId.replace('_', ' ')} - {genderCategory}
                  </h4>
                  <div className="mt-2 text-sm text-gray-600">
                    {(sportTeams as any)?.length} teams checked in
                  </div>
                  
                  {(sportTeams as any)?.length >= 2 && (() => {
                    const existingFixture = fixtures.find(f => 
                      f.sportId === sportId && f.genderCategory === genderCategory
                    );
                    
                    if (existingFixture) {
                      return (
                        <Link href={`/en/volunteer/venues/${venueId}/fixtures/${existingFixture.id}`}>
                          <button className="mt-3 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors text-sm">
                            View Tournament
                          </button>
                        </Link>
                      );
                    } else {
                      return (
                        <Link href={`/en/volunteer/venues/${venueId}/fixtures/create-draw?sport=${sportId}&gender=${genderCategory}`}>
                          <button className="mt-3 bg-[#F28C38] text-white px-4 py-2 rounded-lg hover:bg-[#E67A26] transition-colors text-sm">
                            Create Tournament
                          </button>
                        </Link>
                      );
                    }
                  })()}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Active Fixtures */}
      {fixtures.length > 0 && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Active Tournaments</h2>
          <div className="space-y-3">
            {fixtures.map(fixture => (
              <div key={fixture.id} className="flex items-center justify-between p-3 border rounded">
                <div>
                  <h3 className="font-medium">{fixture.name}</h3>
                  <p className="text-sm text-gray-600">
                    {fixture.assignedTeams?.length || 0} teams • Status: {fixture.status}
                  </p>
                </div>
                <div className="flex space-x-2">
                  <Link href={`/en/volunteer/venues/${venueId}/fixtures/${fixture.id}`}>
                    <Button size="sm" variant="outline">
                      Manage
                    </Button>
                  </Link>
                  {fixture.status === 'in_progress' && (
                    <Link href={`/en/volunteer/venues/${venueId}/matches?fixture=${fixture.id}`}>
                      <Button size="sm">
                        Live Matches
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Teams Status */}
      {teams.length > 0 && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Team Status</h2>
          <div className="space-y-2">
            {teams.slice(0, 5).map(team => (
              <div key={team.id} className="flex items-center justify-between p-2 border rounded">
                <div>
                  <span className="font-medium">{team.name}</span>
                  <span className="ml-2 text-sm text-gray-600">
                    {team.currentPlayers}/{team.maxPlayers} players
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`w-3 h-3 rounded-full ${
                    team.matchDayStatus === 'checked_in' ? 'bg-green-500' : 
                    team.matchDayStatus === 'verified' ? 'bg-yellow-500' : 'bg-red-500'
                  }`} />
                  <span className="text-sm">
                    {team.matchDayStatus === 'checked_in' ? 'Checked In' : 
                     team.matchDayStatus === 'verified' ? 'Ready' : 'Pending'}
                  </span>
                </div>
              </div>
            ))}
            {teams.length > 5 && (
              <Link href={`/en/volunteer/venues/${venueId}/teams`}>
                <Button variant="outline" size="sm" className="w-full mt-2">
                  View All {teams.length} Teams
                </Button>
              </Link>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
