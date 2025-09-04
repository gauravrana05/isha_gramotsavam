'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useOfflineTeams, useOfflineVenueData } from "@/hooks/useOfflineTeams";
import { useOfflineActions } from "@/hooks/useOfflineActions";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/Button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/AdvancedSelect';
import { Trophy, Users, Eye, Calendar, MapPin, Play, CheckCircle, Clock, Plus, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

export default function VolunteerFixturesPage() {
  const { lang } = useParams();
  const router = useRouter();
  const { user, userProfile, loading: authLoading } = useAuth();
  const [selectedVenueId, setSelectedVenueId] = useState<string>('all');

  // Get user's venue assignments
  // const { data: userVenues } = api.volunteers.venue.getVenueTeams.useQuery(undefined, {
  //   enabled: !!user
  // });
  const userVenues = undefined; // TODO: Migrate to offline

  // Get all fixtures across user's assigned venues
  // const { data: allFixtures, isLoading: fixturesLoading } = api.volunteers.fixture.getAllUserFixtures.useQuery(
  //   undefined,
  //   { 
  //     enabled: !!user
  //   }
  // );
  const allFixtures = undefined; // TODO: Migrate to offline
  const fixturesLoading = false;

  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      router.push(`/${lang}/login`);
      return;
    }

    if (!userProfile || !['general_volunteer', 'technical_volunteer', 'verification_volunteer'].includes(userProfile.role)) {
      router.push(`/${lang}/player/dashboard`);
      return;
    }

    // Set first venue as default if available
    if (userVenues && userVenues.length > 0 && selectedVenueId === '') {
      setSelectedVenueId(userVenues[0]?.id || 'all');
    }
  }, [user, userProfile, userVenues, authLoading, lang, router, selectedVenueId]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'teams_assigned': return 'bg-yellow-100 text-yellow-800';
      case 'draft': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'in_progress': return <Play className="w-4 h-4" />;
      case 'teams_assigned': return <Users className="w-4 h-4" />;
      case 'draft': return <AlertCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  // Filter fixtures by selected venue if not 'all'
  const filteredFixtures = selectedVenueId === 'all' 
    ? allFixtures || []
    : (allFixtures || []).filter(fixture => fixture.venueId === selectedVenueId);

  // Group fixtures by venue and level
  const fixturesByVenue = filteredFixtures.reduce((acc, fixture) => {
    const venueKey = `${fixture.venueName || 'Unknown Venue'} (${fixture.level})`;
    if (!acc[venueKey]) {
      acc[venueKey] = [];
    }
    acc[venueKey].push(fixture);
    return acc;
  }, {} as Record<string, typeof filteredFixtures>);

  if (authLoading || fixturesLoading) {
    return (
      <div className="min-h-screen bg-[#F3F0E5] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#F28C38] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading fixtures...</p>
        </div>
      </div>
    );
  }

  if (!user || !userProfile || !['general_volunteer', 'technical_volunteer', 'verification_volunteer'].includes(userProfile.role)) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#F3F0E5] font-fira">
      {/* Header */}
      <div className="bg-[#4A2F1D] text-white py-6">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">Tournament Fixtures</h1>
              <p className="text-cream-200">Manage fixtures across your assigned venues</p>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Venue Filter */}
              <div className="w-64">
                <Select value={selectedVenueId} onValueChange={setSelectedVenueId}>
                  <SelectTrigger className="bg-white text-gray-900">
                    <SelectValue placeholder="Select venue" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      <div className="flex items-center gap-2">
                        <Trophy className="w-4 h-4" />
                        All Venues
                      </div>
                    </SelectItem>
                    {userVenues?.map((venue) => (
                      <SelectItem key={venue.id} value={venue.id}>
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4" />
                          {venue.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <Trophy className="w-8 h-8 text-[#F28C38]" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">Total Fixtures</p>
                  <p className="text-2xl font-bold">{filteredFixtures.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <Play className="w-8 h-8 text-blue-500" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">In Progress</p>
                  <p className="text-2xl font-bold">
                    {filteredFixtures.filter(f => f.status === 'in_progress').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <CheckCircle className="w-8 h-8 text-green-500" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">Completed</p>
                  <p className="text-2xl font-bold">
                    {filteredFixtures.filter(f => f.status === 'completed').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <Users className="w-8 h-8 text-yellow-500" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">Draft</p>
                  <p className="text-2xl font-bold">
                    {filteredFixtures.filter(f => f.status === 'draft').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Fixtures by Venue */}
        {selectedVenueId === 'all' ? (
          // Show grouped by venue
          <div className="space-y-6">
            {Object.entries(fixturesByVenue).map(([venueName, fixtures]) => (
              <div key={venueName}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-900 flex items-center">
                    <MapPin className="w-5 h-5 mr-2 text-[#F28C38]" />
                    {venueName}
                  </h2>
                  <Badge variant="outline">{fixtures.length} fixtures</Badge>
                </div>
                
                <div className="grid gap-4">
                  {fixtures.map((fixture) => (
                    <FixtureCard 
                      key={fixture.id} 
                      fixture={fixture} 
                      lang={lang as string}
                      getStatusColor={getStatusColor}
                      getStatusIcon={getStatusIcon}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          // Show all fixtures for selected venue
          <div className="grid gap-4">
            {filteredFixtures.map((fixture) => (
              <FixtureCard 
                key={fixture.id} 
                fixture={fixture} 
                lang={lang as string}
                getStatusColor={getStatusColor}
                getStatusIcon={getStatusIcon}
              />
            ))}
          </div>
        )}

        {/* Empty State */}
        {filteredFixtures.length === 0 && (
          <Card>
            <CardContent className="text-center py-12">
              <Trophy className="h-16 w-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Fixtures Found</h3>
              <p className="text-gray-500 mb-6">
                {selectedVenueId === 'all' 
                  ? 'No fixtures have been created across your assigned venues yet.'
                  : 'No fixtures have been created for the selected venue yet.'
                }
              </p>
              {selectedVenueId !== 'all' && (
                <Button 
                  onClick={() => router.push(`/${lang}/volunteer/venues/${selectedVenueId}/fixtures/create`)}
                  className="bg-[#F28C38] hover:bg-[#E07B2A]"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Fixture
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

// Fixture Card Component
interface FixtureCardProps {
  fixture: any;
  lang: string;
  getStatusColor: (status: string) => string;
  getStatusIcon: (status: string) => React.ReactNode;
}

const FixtureCard = ({ fixture, lang, getStatusColor, getStatusIcon }: FixtureCardProps) => {
  const completedMatches = fixture.matches?.filter((m: any) => m.status === 'completed').length || 0;
  const totalMatches = fixture.matches?.length || 0;
  
  // Use the venue ID from the fixture data
  const venueId = fixture.venueId;
  const venueLevelMappingId = fixture.venueLevelMappingId;
  
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <CardTitle className="text-lg font-semibold">{fixture.name}</CardTitle>
            <div className="flex items-center space-x-4 text-sm text-gray-600 mt-2">
              <span className="flex items-center">
                <Trophy className="w-4 h-4 mr-1" />
                {fixture.sport?.name || 'Unknown Sport'}
              </span>
              <span className="capitalize">{fixture.genderCategory}</span>
              <span className="flex items-center">
                <MapPin className="w-4 h-4 mr-1" />
                {fixture.venueName} - {fixture.level.toUpperCase()}
              </span>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(fixture.status)}`}>
              {getStatusIcon(fixture.status)}
              <span className="ml-1 capitalize">{fixture.status.replace('_', ' ')}</span>
            </span>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4 text-sm">
            <div className="flex items-center space-x-1">
              <Play className="h-4 w-4 text-gray-400" />
              <span>{totalMatches} matches</span>
            </div>
            <div className="flex items-center space-x-1">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>{completedMatches} completed</span>
            </div>
            {fixture.championTeamName && (
              <div className="flex items-center space-x-1 text-yellow-600">
                <Trophy className="h-4 w-4" />
                <span className="font-semibold">Champion: {fixture.championTeamName}</span>
              </div>
            )}
          </div>
          
          <div className="flex space-x-2">
            <Link href={`/${lang}/volunteer/venues/${venueId}/fixtures/${fixture.id}/bracket`}>
              <Button variant="outline" size="sm">
                <Eye className="h-4 w-4 mr-2" />
                View Bracket
              </Button>
            </Link>
            <Link href={`/${lang}/volunteer/venues/${venueId}/fixtures/${fixture.id}`}>
              <Button size="sm" className="bg-[#F28C38] hover:bg-[#E07B2A]">
                <Calendar className="h-4 w-4 mr-2" />
                Manage
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};