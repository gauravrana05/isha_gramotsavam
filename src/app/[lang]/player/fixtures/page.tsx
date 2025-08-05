"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase/config";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import Image from "next/image";
import { 
  Calendar, 
  Loader2, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  Play,
  Trophy,
  MapPin,
  Users,
  Target
} from "lucide-react";

interface TeamMembership {
  teamId: string;
  name: string;
  sportName: string;
  panchayat: string;
  district: string;
  state: string;
  venueId?: string;
  venue?: {
    name: string;
    address: string;
  };
}

interface Fixture {
  id: string;
  name: string;
  sportId: string;
  genderCategory: string;
  venueId: string;
  venue?: {
    name: string;
    address: string;
  };
  status: string;
  level: string;
  assignedTeams: any[];
  bracket?: {
    matches?: any[];
    winners?: any[];
  };
  createdAt: any;
}

export default function PlayerFixturesPage() {
  const [teams, setTeams] = useState<TeamMembership[]>([]);
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const router = useRouter();
  const { lang } = useParams();
  const { user, userProfile, loading: authLoading } = useAuth();

  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      router.push(`/${lang}/login`);
      return;
    }

    if (!userProfile?.isProfileComplete) {
      router.push(`/${lang}/complete-profile`);
      return;
    }

    loadPlayerFixtures();
  }, [user, userProfile, authLoading, router, lang]);

  const loadPlayerFixtures = async () => {
    if (!user) return;

    try {
      // First, load teams where current user is a player
      const teamsQuery = query(collection(db, "teams"));
      const querySnapshot = await getDocs(teamsQuery);
      
      const playerTeams: TeamMembership[] = [];
      const venueIds = new Set<string>();
      
      for (const docSnapshot of querySnapshot.docs) {
        const teamData = docSnapshot.data();
        
        // Load players from subcollection
        const playersCollection = collection(db, "teams", docSnapshot.id, "players");
        const playersSnapshot = await getDocs(playersCollection);
        
        let playerData = null;
        playersSnapshot.forEach((playerDoc) => {
          const player = playerDoc.data();
          if (!player.isDeleted && player.userId === user.uid) {
            playerData = player;
          }
        });
        
        if (playerData) {
          const team: TeamMembership = {
            teamId: docSnapshot.id,
            name: teamData.teamName || teamData.name || '',
            sportName: teamData.sportName || teamData.sportId || '',
            panchayat: teamData.panchayat || '',
            district: teamData.district || '',
            state: teamData.state || '',
            venueId: teamData.venueId
          };
          
          if (teamData.venueId) {
            venueIds.add(teamData.venueId);
          }
          
          playerTeams.push(team);
        }
      }

      setTeams(playerTeams);

      // Load fixtures for the venues where player's teams are assigned
      if (venueIds.size > 0) {
        const fixturesPromises = Array.from(venueIds).map(async (venueId) => {
          const fixturesQuery = query(
            collection(db, "fixtures"),
            where("venueId", "==", venueId)
          );
          const fixturesSnapshot = await getDocs(fixturesQuery);
          
          const venueFixtures: Fixture[] = [];
          
          for (const fixtureDoc of fixturesSnapshot.docs) {
            const fixtureData = fixtureDoc.data();
            
            // Load venue details
            let venue = null;
            if (fixtureData.venueId) {
              try {
                const venueDoc = await getDoc(doc(db, "venues", fixtureData.venueId));
                if (venueDoc.exists()) {
                  const venueData = venueDoc.data();
                  venue = {
                    name: venueData.name || 'Unknown Venue',
                    address: venueData.address || ''
                  };
                }
              } catch (error) {
                console.warn("Could not load venue details:", error);
              }
            }
            
            venueFixtures.push({
              id: fixtureDoc.id,
              name: fixtureData.name || `${fixtureData.sportId} Tournament`,
              sportId: fixtureData.sportId || '',
              genderCategory: fixtureData.genderCategory || '',
              venueId: fixtureData.venueId || '',
              venue,
              status: fixtureData.status || 'scheduled',
              level: fixtureData.level || 'Panchayat',
              assignedTeams: fixtureData.assignedTeams || [],
              bracket: fixtureData.bracket || {},
              createdAt: fixtureData.createdAt || null
            });
          }
          
          return venueFixtures;
        });

        const allFixtures = await Promise.all(fixturesPromises);
        const flatFixtures = allFixtures.flat();
        
        // Sort fixtures by creation date
        flatFixtures.sort((a, b) => {
          const aTime = a.createdAt?.toDate?.() || new Date(0);
          const bTime = b.createdAt?.toDate?.() || new Date(0);
          return bTime.getTime() - aTime.getTime();
        });
        
        setFixtures(flatFixtures);
      }

    } catch (err: any) {
      console.error("Error loading player fixtures:", err);
      setError("Failed to load fixtures data");
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'scheduled': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'in_progress': return <Play className="w-4 h-4" />;
      case 'scheduled': return <Clock className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#F28C38]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Error</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="bg-[#F28C38] text-white px-6 py-2 rounded-lg hover:bg-[#E67A26] transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
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
          <h1 className="text-3xl font-bold text-[#4A2F1D] mb-2">
            Tournament Fixtures
          </h1>
          <p className="text-gray-600">
            View tournaments and fixture schedules for your teams
          </p>
        </div>

        {/* Teams Overview */}
        {teams.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
            <h2 className="text-xl font-semibold text-[#4A2F1D] mb-4 flex items-center">
              <Users className="w-5 h-5 mr-2" />
              Your Teams
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {teams.map((team) => (
                <div key={team.teamId} className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-2">{team.name}</h3>
                  <div className="space-y-1 text-sm text-gray-600">
                    <div className="flex items-center">
                      <Trophy className="w-4 h-4 mr-1" />
                      {team.sportName}
                    </div>
                    <div className="flex items-center">
                      <MapPin className="w-4 h-4 mr-1" />
                      {team.panchayat}, {team.district}
                    </div>
                    {team.venue && (
                      <div className="text-xs text-blue-600 mt-2">
                        Venue: {team.venue.name}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Fixtures Section */}
        {fixtures.length > 0 ? (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="p-4 sm:p-6 border-b border-gray-200">
              <h2 className="text-lg sm:text-xl font-semibold text-[#4A2F1D]">Tournament Fixtures</h2>
              <p className="text-gray-600 text-sm mt-1">Tournaments at your team venues</p>
            </div>

            {/* Desktop View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tournament</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Venue</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Teams</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Matches</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {fixtures.map((fixture) => (
                    <tr key={fixture.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <Trophy className="w-5 h-5 text-gray-400 mr-3" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">{fixture.name}</div>
                            <div className="text-sm text-gray-500">Level: {fixture.level}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {fixture.venue ? (
                          <div>
                            <div className="text-sm font-medium text-gray-900">{fixture.venue.name}</div>
                            <div className="text-xs text-gray-500">{fixture.venue.address}</div>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500">Venue TBD</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {fixture.assignedTeams?.length || 0}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {fixture.bracket?.matches?.filter(m => m.status === 'completed').length || 0} / {fixture.bracket?.matches?.length || 0}
                        </div>
                        <div className="text-xs text-gray-500">completed</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(fixture.status)}`}>
                          {getStatusIcon(fixture.status)}
                          <span className="ml-1 capitalize">{fixture.status.replace('_', ' ')}</span>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile View */}
            <div className="md:hidden space-y-4 p-4">
              {fixtures.map((fixture) => (
                <div key={fixture.id} className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center flex-1">
                      <Trophy className="w-5 h-5 text-gray-400 mr-3" />
                      <div className="flex-1">
                        <h3 className="text-lg font-medium text-gray-900">{fixture.name}</h3>
                        <p className="text-sm text-gray-500">Level: {fixture.level}</p>
                      </div>
                    </div>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(fixture.status)} ml-2`}>
                      {getStatusIcon(fixture.status)}
                      <span className="ml-1 capitalize">{fixture.status.replace('_', ' ')}</span>
                    </span>
                  </div>
                  
                  <div className="space-y-2 mb-4">
                    <div>
                      <span className="text-xs text-gray-500">Venue</span>
                      <p className="text-sm font-medium text-gray-900">
                        {fixture.venue ? fixture.venue.name : 'Venue TBD'}
                      </p>
                      {fixture.venue?.address && (
                        <p className="text-xs text-gray-500">{fixture.venue.address}</p>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-xs text-gray-500">Teams</span>
                        <p className="text-sm font-medium text-gray-900">{fixture.assignedTeams?.length || 0}</p>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500">Matches</span>
                        <p className="text-sm font-medium text-gray-900">
                          {fixture.bracket?.matches?.filter(m => m.status === 'completed').length || 0} / {fixture.bracket?.matches?.length || 0}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Winners Display */}
                  {fixture.bracket?.winners && fixture.bracket.winners.length > 0 && (
                    <div className="p-2 bg-green-50 border border-green-200 rounded">
                      <div className="flex items-center text-green-800">
                        <Trophy className="w-4 h-4 mr-1" />
                        <span className="text-sm font-medium">Winners: {fixture.bracket.winners.length} teams advanced</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : teams.length > 0 ? (
          <div className="bg-white rounded-lg border p-8 text-center">
            <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Fixtures Available</h3>
            <p className="text-gray-600">No tournament fixtures have been created for your team venues yet.</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg border p-8 text-center">
            <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Team Memberships</h3>
            <p className="text-gray-600">You haven&apos;t joined any teams yet. Contact team captains to get added to teams.</p>
          </div>
        )}
      </div>
    </div>
  );
}