"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase/config";
import { collection, query, where, getDocs, doc, getDoc, orderBy, limit } from "firebase/firestore";
import { AdvancedTable } from '@/components/ui/AdvancedTable';
import type { Column } from '@/components/ui/Table';
import type { FilterField } from '@/components/ui/FilterSidebar';
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
  Target,
  Eye,
  Star
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

interface PlayerFixture {
  id: string;
  name: string;
  sportId: string;
  sportName?: string;
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
  hasPlayerTeam?: boolean;
  playerTeamNames?: string[];
}

export default function PlayerFixturesPage() {
  const [teams, setTeams] = useState<TeamMembership[]>([]);
  const [fixtures, setFixtures] = useState<PlayerFixture[]>([]);
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

    if (!userProfile?.profile_complete) {
      router.push(`/${lang}/profile/complete`);
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
      const playerTeamIds = new Set<string>();
      
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
        
        // Load venue assignments from teamVenueAssignment collection (get ALL assignments)
        let venueAssignment: { venueId: string; venueName: string; assignmentLevel: string } | null = null;
        
        if (playerData) {
          try {
            const venueAssignmentQuery = query(
              collection(db, "teamVenueAssignment"),
              where("teamId", "==", docSnapshot.id)
            );
            const venueAssignmentSnapshot = await getDocs(venueAssignmentQuery);
            
            // Process all venue assignments for this team
            venueAssignmentSnapshot.docs.forEach(assignDoc => {
              const assignmentData = assignDoc.data();
              const venueId = assignmentData.venueId || assignmentData.clusterVenueId || assignmentData.divisionVenueId;
              const venueName = assignmentData.venueName || assignmentData.clusterVenueName || assignmentData.divisionVenueName || 'Unknown Venue';
              
              if (venueId) {
                venueIds.add(venueId);
                
                // Use the first valid venue assignment for the team display
                if (!venueAssignment) {
                  venueAssignment = {
                    venueId: venueId,
                    venueName: venueName,
                    assignmentLevel: assignmentData.assignmentLevel || assignmentData.currentLevel || 'cluster'
                  };
                }
              }
            });
          } catch (venueError) {
            console.error('Error loading venue assignments:', venueError);
          }
          
          const team: TeamMembership = {
            teamId: docSnapshot.id,
            name: teamData.teamName || teamData.name || '',
            sportName: teamData.sportName || teamData.sportId || '',
            panchayat: teamData.panchayat || '',
            district: teamData.district || '',
            state: teamData.state || '',
            venueId: (venueAssignment as { venueId: string; venueName: string; assignmentLevel: string } | null)?.venueId,
            venue: venueAssignment ? {
              name: (venueAssignment as any).venueName,
              address: ''
            } : undefined
          };
          
          playerTeamIds.add(docSnapshot.id);
          
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
          
          const venueFixtures: PlayerFixture[] = [];
          
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
                // Warning removed
              }
            }
            
            // Check if any player teams are in this fixture
            const assignedTeams = fixtureData.assignedTeams || [];
            const hasPlayerTeam = assignedTeams.some((team: any) => playerTeamIds.has(team.teamId));
            const playerTeamNames = assignedTeams
              .filter((team: any) => playerTeamIds.has(team.teamId))
              .map((team: any) => team.teamName || team.name);
            
            venueFixtures.push({
              id: fixtureDoc.id,
              name: fixtureData.name || `${fixtureData.sportId} Tournament`,
              sportId: fixtureData.sportId || '',
              sportName: fixtureData.sportName || fixtureData.sportId || '',
              genderCategory: fixtureData.genderCategory || '',
              venueId: fixtureData.venueId || '',
              venue: venue ?? undefined,
              status: fixtureData.status || 'scheduled',
              level: fixtureData.level || 'Panchayat',
              assignedTeams: assignedTeams,
              bracket: fixtureData.bracket || {},
              createdAt: fixtureData.createdAt || null,
              hasPlayerTeam,
              playerTeamNames
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
      // Error handling removed
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

  // AdvancedTable configuration
  const columns: Column<PlayerFixture>[] = [
    {
      key: 'name',
      header: 'Tournament',
      render: (value, item, index) => {
        if (!item) return null;
        return (
          <div className="flex items-center">
            <Trophy className="w-5 h-5 text-gray-400 mr-3" />
            <div>
              <div className="text-sm font-medium text-gray-900">
                {item.name}
                {item.hasPlayerTeam && (
                  <Star className="w-4 h-4 text-yellow-500 ml-2 inline" />
                )}
              </div>
              <div className="text-sm text-gray-500">{item.sportName} • {item.genderCategory}</div>
              <div className="text-sm text-gray-500">Level: {item.level}</div>
              {item.hasPlayerTeam && item.playerTeamNames && (
                <div className="text-xs text-blue-600 mt-1">
                  Your teams: {item.playerTeamNames.join(', ')}
                </div>
              )}
            </div>
          </div>
        );
      },
      sortable: true
    },
    {
      key: 'venue',
      header: 'Venue',
      render: (value, item, index) => {
        if (!item) return null;
        return (
          <div>
            {item.venue ? (
              <div>
                <div className="text-sm font-medium text-gray-900 flex items-center">
                  <MapPin className="w-4 h-4 text-gray-400 mr-1" />
                  {item.venue.name}
                </div>
                <div className="text-xs text-gray-500">{item.venue.address}</div>
              </div>
            ) : (
              <span className="text-sm text-gray-500">Venue TBD</span>
            )}
          </div>
        );
      },
      sortable: true
    },
    {
      key: 'assignedTeams',
      header: 'Teams',
      render: (value, item, index) => {
        if (!item) return null;
        return (
          <div className="flex items-center">
            <Users className="w-4 h-4 text-gray-400 mr-1" />
            <span className="text-sm text-gray-900">{item.assignedTeams?.length || 0}</span>
          </div>
        );
      }
    },
    {
      key: 'progress',
      header: 'Progress',
      render: (value, item, index) => {
        if (!item) return null;
        const completed = item.bracket?.matches?.filter(m => m.status === 'completed').length || 0;
        const total = item.bracket?.matches?.length || 0;
        return (
          <div>
            <div className="text-sm text-gray-900">{completed} / {total}</div>
            <div className="text-xs text-gray-500">matches completed</div>
          </div>
        );
      }
    },
    {
      key: 'status',
      header: 'Status',
      render: (value, item, index) => {
        if (!item) return null;
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
            {getStatusIcon(item.status)}
            <span className="ml-1 capitalize">{item.status.replace('_', ' ')}</span>
          </span>
        );
      },
      sortable: true
    }
  ];

  const filters: FilterField[] = [
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      options: [
        { label: 'All', value: '' },
        { label: 'Scheduled', value: 'scheduled' },
        { label: 'In Progress', value: 'in_progress' },
        { label: 'Completed', value: 'completed' }
      ]
    },
    {
      key: 'level',
      label: 'Level',
      type: 'select',
      options: [
        { label: 'All Levels', value: '' },
        ...Array.from(new Set(fixtures.map(f => f.level))).map(level => ({
          label: level,
          value: level
        }))
      ]
    },
    {
      key: 'hasPlayerTeam',
      label: 'My Teams Only',
      type: 'select',
      options: [
        { label: 'All Tournaments', value: '' },
        { label: 'My Teams Only', value: 'true' }
      ]
    },
    {
      key: 'sportName',
      label: 'Sport',
      type: 'text'
    }
  ];

  // Custom filter function for hasPlayerTeam
  const customFilterFunction = (item: PlayerFixture, filters: Record<string, any>): boolean => {
    if (filters.hasPlayerTeam === 'true') {
      return item.hasPlayerTeam === true;
    }
    return true;
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

        {/* Tournament Fixtures Table */}
        <AdvancedTable
          title="Tournament Fixtures"
          subtitle="View tournaments and fixture schedules for your teams"
          data={fixtures}
          columns={columns}
          loading={loading}
          
          searchable={true}
          searchPlaceholder="Search tournaments, sports, venues..."
          searchFields={['name', 'sportName']}
          
          filterable={true}
          filters={filters}
          
          sortable={true}
          defaultSort={[{ key: 'createdAt', direction: 'desc' }]}
          
          pagination={{ enabled: true, pageSize: 10 }}
          
          persistState={true}
          stateKey="player-fixtures"
          
          emptyState={{
            icon: Calendar,
            title: teams.length > 0 ? 'No Fixtures Available' : 'No Team Memberships',
            description: teams.length > 0 
              ? 'No tournament fixtures have been created for your team venues yet.'
              : "You haven't joined any teams yet. Contact team captains to get added to teams."
          }}
        />
      </div>
    </div>
  );
}