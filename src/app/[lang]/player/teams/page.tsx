"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase/config";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import Image from "next/image";
import { 
  Users, 
  Loader2, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  Trophy,
  MapPin,
  Phone,
  User,
  UserCheck,
  Eye
} from "lucide-react";

interface TeamMembership {
  teamId: string;
  name: string;
  sportName: string;
  captainProfile: {
    name: string;
    phone: string;
    userId: string;
  };
  position: string;
  status: string;
  verificationStatus: string;
  joinedAt: any;
  panchayat: string;
  district: string;
  state: string;
  genderCategory: string;
  maxPlayers: number;
  currentPlayers: number;
  players: any[];
}

export default function PlayerTeamsPage() {
  const [teams, setTeams] = useState<TeamMembership[]>([]);
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

    loadPlayerTeams();
  }, [user, userProfile, authLoading, router, lang]);

  const loadPlayerTeams = async () => {
    if (!user) return;

    try {
      // Load teams where current user is a player
      const teamsQuery = query(collection(db, "teams"));
      const querySnapshot = await getDocs(teamsQuery);
      
      const playerTeams: TeamMembership[] = [];
      
      for (const docSnapshot of querySnapshot.docs) {
        const teamData = docSnapshot.data();
        
        // Load players from subcollection
        const playersCollection = collection(db, "teams", docSnapshot.id, "players");
        const playersSnapshot = await getDocs(playersCollection);
        
        let playerData = null;
        const teamPlayers: any[] = [];
        
        playersSnapshot.forEach((playerDoc) => {
          const player = playerDoc.data();
          if (!player.isDeleted) {
            teamPlayers.push({
              ...player,
              playerId: playerDoc.id
            });
            
            if (player.userId === user.uid) {
              playerData = player;
            }
          }
        });
        
        if (playerData) {
          // Load captain profile details
          let captainProfile = {
            name: teamData.captainProfile?.name || teamData.captainName || '',
            phone: teamData.captainProfile?.phone || teamData.captainPhone || '',
            userId: teamData.captainId || ''
          };
          
          // Try to get more captain details from users collection
          if (teamData.captainId) {
            try {
              const captainDoc = await getDoc(doc(db, "users", teamData.captainId));
              if (captainDoc.exists()) {
                const captainData = captainDoc.data();
                captainProfile = {
                  name: `${captainData.firstName || ''} ${captainData.lastName || ''}`.trim() || captainProfile.name,
                  phone: captainData.phoneNumber?.replace(/^\+91/, '') || captainProfile.phone,
                  userId: teamData.captainId
                };
              }
            } catch (error) {
              console.warn("Could not load captain details:", error);
            }
          }
          
          playerTeams.push({
            teamId: docSnapshot.id,
            name: teamData.teamName || teamData.name || '',
            sportName: teamData.sportName || teamData.sportId || '',
            captainProfile,
            position: playerData.position || 'main',
            status: teamData.status || 'draft',
            verificationStatus: playerData.verificationStatus || 'pending',
            joinedAt: playerData.addedAt || teamData.createdAt || '',
            panchayat: teamData.panchayat || '',
            district: teamData.district || '',
            state: teamData.state || '',
            genderCategory: teamData.genderCategory || teamData.gender || 'mixed',
            maxPlayers: teamData.maxPlayers || 12,
            currentPlayers: teamPlayers.length,
            players: teamPlayers
          });
        }
      }

      setTeams(playerTeams);
    } catch (err: any) {
      console.error("Error loading player teams:", err);
      setError("Failed to load team data");
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'submitted':
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'verified':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getVerificationStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
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
            My Teams
          </h1>
          <p className="text-gray-600">
            Teams you're part of and their details
          </p>
        </div>

        {/* Teams Section */}
        {teams.length === 0 ? (
          <div className="bg-white rounded-lg border p-8 text-center">
            <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Team Memberships</h3>
            <p className="text-gray-600">You haven't joined any teams yet. Contact team captains to get added to teams.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {teams.map((team) => (
              <div key={team.teamId} className="bg-white rounded-lg border overflow-hidden">
                {/* Team Header */}
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 mb-2">{team.name}</h2>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-4 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <Trophy className="w-4 h-4" />
                          {team.sportName}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          {team.panchayat}, {team.district}
                        </span>
                        <span className="capitalize">{team.genderCategory === 'F' ? 'Women' : team.genderCategory === 'M' ? 'Men' : 'Mixed'}</span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <div className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(team.status)}`}>
                        {team.status.charAt(0).toUpperCase() + team.status.slice(1)}
                      </div>
                      <div className={`px-3 py-1 rounded-full text-sm font-medium ${getVerificationStatusColor(team.verificationStatus)}`}>
                        Your Status: {team.verificationStatus === 'approved' ? 'Verified' : team.verificationStatus === 'rejected' ? 'Rejected' : 'Pending'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Team Details */}
                <div className="p-6">
                  <div className="grid md:grid-cols-2 gap-8">
                    {/* Captain Information */}
                    <div>
                      <h3 className="text-lg font-semibold text-[#4A2F1D] mb-4 flex items-center">
                        <UserCheck className="w-5 h-5 mr-2" />
                        Team Captain
                      </h3>
                      <div className="space-y-3">
                        <div>
                          <div className="text-sm font-medium text-gray-700 mb-1">Name</div>
                          <div className="text-gray-900">{team.captainProfile.name || 'Not Available'}</div>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-700 mb-1 flex items-center">
                            <Phone className="w-4 h-4 mr-1" />
                            Phone Number
                          </div>
                          <div className="text-gray-900">+91 {team.captainProfile.phone || 'Not Available'}</div>
                        </div>
                      </div>
                    </div>

                    {/* Team Statistics */}
                    <div>
                      <h3 className="text-lg font-semibold text-[#4A2F1D] mb-4 flex items-center">
                        <Users className="w-5 h-5 mr-2" />
                        Team Statistics
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-4 bg-gray-50 rounded-lg">
                          <div className="text-2xl font-bold text-blue-600">{team.currentPlayers}</div>
                          <div className="text-sm text-gray-600">Current Players</div>
                        </div>
                        <div className="text-center p-4 bg-gray-50 rounded-lg">
                          <div className="text-2xl font-bold text-purple-600">{team.maxPlayers}</div>
                          <div className="text-sm text-gray-600">Max Players</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Your Position */}
                  <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold text-blue-900">Your Position in Team</h4>
                        <p className="text-blue-700 capitalize">{team.position} Player</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-blue-600">Joined On</p>
                        <p className="font-medium text-blue-900">
                          {team.joinedAt ? 
                            (team.joinedAt.toDate?.() ? 
                              team.joinedAt.toDate().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 
                              new Date(team.joinedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                            ) : 'Unknown'
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}