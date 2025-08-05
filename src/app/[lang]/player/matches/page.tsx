"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase/config";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import Image from "next/image";
import { 
  Zap, 
  Loader2, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  Play,
  Trophy,
  MapPin,
  Users,
  Target,
  Calendar
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

interface Match {
  matchId: string;
  fixtureId: string;
  fixtureName: string;
  venueId: string;
  venue?: {
    name: string;
    address: string;
  };
  roundName: string;
  matchNumber: number;
  status: string;
  team1?: {
    teamId: string;
    teamName: string;
    tournamentNumber?: number;
  };
  team2?: {
    teamId: string;
    teamName: string;
    tournamentNumber?: number;
  };
  result?: {
    winnerName: string;
    winnerTeamId: string;
    score?: {
      team1Score: number;
      team2Score: number;
    };
  };
  createdAt: any;
  scheduledTime?: any;
}

export default function PlayerMatchesPage() {
  const [teams, setTeams] = useState<TeamMembership[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
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

    loadPlayerMatches();
  }, [user, userProfile, authLoading, router, lang]);

  const loadPlayerMatches = async () => {
    if (!user) return;

    try {
      // First, load teams where current user is a player
      const teamsQuery = query(collection(db, "teams"));
      const querySnapshot = await getDocs(teamsQuery);
      
      const playerTeams: TeamMembership[] = [];
      const playerTeamIds = new Set<string>();
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
          
          playerTeamIds.add(docSnapshot.id);
          if (teamData.venueId) {
            venueIds.add(teamData.venueId);
          }
          
          playerTeams.push(team);
        }
      }

      setTeams(playerTeams);

      // Load matches for the venues where player's teams are assigned
      if (venueIds.size > 0) {
        const matchesPromises = Array.from(venueIds).map(async (venueId) => {
          const matchesQuery = query(
            collection(db, "matches"),
            where("venueId", "==", venueId)
          );
          const matchesSnapshot = await getDocs(matchesQuery);
          
          const venueMatches: Match[] = [];
          
          for (const matchDoc of matchesSnapshot.docs) {
            const matchData = matchDoc.data();
            
            // Check if this match involves any of the player's teams
            const involvesPlayerTeam = 
              (matchData.team1?.teamId && playerTeamIds.has(matchData.team1.teamId)) ||
              (matchData.team2?.teamId && playerTeamIds.has(matchData.team2.teamId));
            
            if (involvesPlayerTeam) {
              // Load venue details
              let venue = null;
              if (matchData.venueId) {
                try {
                  const venueDoc = await getDoc(doc(db, "venues", matchData.venueId));
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

              // Load fixture name
              let fixtureName = 'Tournament Match';
              if (matchData.fixtureId) {
                try {
                  const fixtureDoc = await getDoc(doc(db, "fixtures", matchData.fixtureId));
                  if (fixtureDoc.exists()) {
                    const fixtureData = fixtureDoc.data();
                    fixtureName = fixtureData.name || `${fixtureData.sportId} Tournament`;
                  }
                } catch (error) {
                  console.warn("Could not load fixture details:", error);
                }
              }
              
              venueMatches.push({
                matchId: matchDoc.id,
                fixtureId: matchData.fixtureId || '',
                fixtureName,
                venueId: matchData.venueId || '',
                venue: venue ?? undefined,
                roundName: matchData.roundName || 'Round',
                matchNumber: matchData.matchNumber || 0,
                status: matchData.status || 'scheduled',
                team1: matchData.team1 || null,
                team2: matchData.team2 || null,
                result: matchData.result || null,
                createdAt: matchData.createdAt || null,
                scheduledTime: matchData.scheduledTime || null
              });
            }
          }
          
          return venueMatches;
        });

        const allMatches = await Promise.all(matchesPromises);
        const flatMatches = allMatches.flat();
        
        // Sort matches by scheduled time or creation date
        flatMatches.sort((a, b) => {
          const aTime = a.scheduledTime?.toDate?.() || a.createdAt?.toDate?.() || new Date(0);
          const bTime = b.scheduledTime?.toDate?.() || b.createdAt?.toDate?.() || new Date(0);
          return bTime.getTime() - aTime.getTime();
        });
        
        setMatches(flatMatches);
      }

    } catch (err: any) {
      console.error("Error loading player matches:", err);
      setError("Failed to load matches data");
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'ready': return 'bg-yellow-100 text-yellow-800';
      case 'scheduled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'in_progress': return <Play className="w-4 h-4" />;
      case 'ready': return <Clock className="w-4 h-4" />;
      case 'scheduled': return <AlertCircle className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  // Group matches by round
  const matchesByRound = matches.reduce((acc, match) => {
    const round = match.roundName;
    if (!acc[round]) {
      acc[round] = [];
    }
    acc[round].push(match);
    return acc;
  }, {} as Record<string, Match[]>);

  // Sort rounds in proper tournament order
  const roundOrder = ['Final', 'Semi Final', 'Quarter Final', 'Round of 16', 'Round of 32', 'Round of 64'];
  const sortedRounds = Object.keys(matchesByRound).sort((a, b) => {
    const aIndex = roundOrder.indexOf(a);
    const bIndex = roundOrder.indexOf(b);
    if (aIndex === -1 && bIndex === -1) return a.localeCompare(b);
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    return aIndex - bIndex;
  });

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
            Your Matches
          </h1>
          <p className="text-gray-600">
            Live matches and results for your teams
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

        {/* Stats Cards */}
        {matches.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg p-4 shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Total Matches</p>
                  <p className="text-2xl font-bold text-gray-900">{matches.length}</p>
                </div>
                <Calendar className="w-8 h-8 text-gray-400" />
              </div>
            </div>
            
            <div className="bg-white rounded-lg p-4 shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Ready to Play</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {matches.filter(m => m.status === 'ready').length}
                  </p>
                </div>
                <Clock className="w-8 h-8 text-yellow-400" />
              </div>
            </div>
            
            <div className="bg-white rounded-lg p-4 shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">In Progress</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {matches.filter(m => m.status === 'in_progress').length}
                  </p>
                </div>
                <Play className="w-8 h-8 text-blue-400" />
              </div>
            </div>
            
            <div className="bg-white rounded-lg p-4 shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Completed</p>
                  <p className="text-2xl font-bold text-green-600">
                    {matches.filter(m => m.status === 'completed').length}
                  </p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-400" />
              </div>
            </div>
          </div>
        )}

        {/* Matches by Round */}
        {matches.length > 0 ? (
          <div className="space-y-6">
            {sortedRounds.map(roundName => (
              <div key={roundName} className="bg-white rounded-lg border shadow-sm p-6">
                <div className="flex items-center mb-4">
                  <Target className="w-5 h-5 text-[#F28C38] mr-2" />
                  <h3 className="text-lg font-semibold text-gray-900">{roundName}</h3>
                  <span className="ml-auto text-sm text-gray-500">
                    {matchesByRound[roundName].length} matches
                  </span>
                </div>
                
                <div className="space-y-4">
                  {matchesByRound[roundName].map((match) => (
                    <div key={match.matchId} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h4 className="font-medium text-gray-900">Match #{match.matchNumber}</h4>
                          <p className="text-sm text-gray-500">{match.fixtureName}</p>
                          {match.venue && (
                            <p className="text-xs text-blue-600">{match.venue.name}</p>
                          )}
                        </div>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(match.status)}`}>
                          {getStatusIcon(match.status)}
                          <span className="ml-1 capitalize">{match.status.replace('_', ' ')}</span>
                        </span>
                      </div>
                      
                      <div className="space-y-2 mb-4">
                        <div className="flex items-center">
                          <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                          {match.team1 ? (
                            <span className="font-medium">
                              {match.team1.teamName}
                              {match.team1.tournamentNumber && (
                                <span className="ml-1 text-gray-500">#{match.team1.tournamentNumber}</span>
                              )}
                              {teams.some(t => t.teamId === match.team1?.teamId) && (
                                <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">Your Team</span>
                              )}
                            </span>
                          ) : (
                            <span className="text-gray-400 italic">TBD</span>
                          )}
                        </div>
                        <div className="flex items-center">
                          <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
                          {match.team2 ? (
                            <span className="font-medium">
                              {match.team2.teamName}
                              {match.team2.tournamentNumber && (
                                <span className="ml-1 text-gray-500">#{match.team2.tournamentNumber}</span>
                              )}
                              {teams.some(t => t.teamId === match.team2?.teamId) && (
                                <span className="ml-2 px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">Your Team</span>
                              )}
                            </span>
                          ) : (
                            <span className="text-gray-400 italic">TBD</span>
                          )}
                        </div>
                      </div>

                      {match.result && (
                        <div className="p-3 bg-green-50 border border-green-200 rounded">
                          <div className="text-sm text-green-800">
                            <div className="font-medium flex items-center">
                              <Trophy className="w-4 h-4 mr-1" />
                              Winner: {match.result.winnerName}
                              {teams.some(t => t.teamId === match.result?.winnerTeamId) && (
                                <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">🎉 Your Team Won!</span>
                              )}
                            </div>
                            {match.result.score && (
                              <div className="mt-1">Score: {match.result.score.team1Score} - {match.result.score.team2Score}</div>
                            )}
                          </div>
                        </div>
                      )}

                      {match.scheduledTime && (
                        <div className="mt-2 text-xs text-gray-500 flex items-center">
                          <Clock className="w-3 h-3 mr-1" />
                          Scheduled: {match.scheduledTime.toDate?.() ? 
                            match.scheduledTime.toDate().toLocaleString('en-IN', { 
                              day: '2-digit', 
                              month: 'short', 
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            }) : 'Time TBD'
                          }
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : teams.length > 0 ? (
          <div className="bg-white rounded-lg border p-8 text-center">
            <Zap className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Matches Available</h3>
            <p className="text-gray-600">No matches have been scheduled for your teams yet.</p>
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