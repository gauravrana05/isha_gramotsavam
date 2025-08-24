"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase/config";
import { collection, query, where, getDocs, doc, getDoc, orderBy, limit } from "firebase/firestore";
import { useTranslation } from "@/lib/utils/i18n";
import Image from "next/image";
import { PageLoader } from "@/components/ui/loaders";
import { 
  Users, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  User,
  Trophy,
  MapPin,
  Phone,
  Calendar,
  Edit,
  FileText,
  Upload,
  Eye,
  UserCheck,
  Loader2
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
  // Venue assignment info
  assignedVenue?: {
    venueId: string;
    venueName: string;
    assignmentLevel: string;
  };
  // Check-in status info
  checkedIn?: boolean;
  checkedInAt?: Date;
  checkedInVenue?: string;
  matchDayStatus?: string;
}

interface PlayerStats {
  totalTeams: number;
  verifiedTeams: number;
  pendingTeams: number;
  documentsComplete: boolean;
}

export default function PlayerDashboard() {
  const [teams, setTeams] = useState<TeamMembership[]>([]);
  const [stats, setStats] = useState<PlayerStats>({
    totalTeams: 0,
    verifiedTeams: 0,
    pendingTeams: 0,
    documentsComplete: false
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const router = useRouter();
  const { lang } = useParams();
  const { user, userProfile, loading: authLoading } = useAuth();
  const { t } = useTranslation();

  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      router.push(`/${lang}/login`);
      return;
    }

    if (!userProfile?.isProfileComplete) {
      router.push(`/${lang}/profile/complete`);
      return;
    }

    loadPlayerData();
  }, [user, userProfile, authLoading, router, lang]);

  const loadPlayerData = async () => {
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
              // Warning removed
            }
          }
          
          // Load venue assignment if exists
          let venueAssignment = null;
          try {
            const venueAssignmentQuery = query(
              collection(db, "teamVenueAssignment"),
              where("teamId", "==", docSnapshot.id),
              orderBy("assignedAt", "desc"),
              limit(1)
            );
            const venueAssignmentSnapshot = await getDocs(venueAssignmentQuery);
            if (!venueAssignmentSnapshot.empty) {
              const assignmentData = venueAssignmentSnapshot.docs[0].data();
              venueAssignment = {
                venueId: assignmentData.venueId || assignmentData.clusterVenueId || assignmentData.divisionVenueId,
                venueName: assignmentData.venueName || assignmentData.clusterVenueName || assignmentData.divisionVenueName,
                assignmentLevel: assignmentData.assignmentLevel || 'cluster'
              };
            }
          } catch (venueError) {
            // Venue assignment loading failed, continue without it
          }
          
          playerTeams.push({
            teamId: docSnapshot.id,
            name: teamData.teamName || teamData.name || '',
            sportName: teamData.sportName || teamData.sportId || '',
            captainProfile,
            position: (playerData as any)?.position || 'main',
            status: teamData.status || 'draft',
            verificationStatus: (playerData as any)?.verificationStatus || 'pending',
            joinedAt: (playerData as any)?.addedAt || teamData.createdAt || '',
            panchayat: teamData.panchayat || '',
            district: teamData.district || '',
            state: teamData.state || '',
            genderCategory: teamData.genderCategory || teamData.gender || 'mixed',
            maxPlayers: teamData.maxPlayers || 12,
            currentPlayers: teamPlayers.length,
            players: teamPlayers,
            assignedVenue: venueAssignment || undefined,
            checkedIn: teamData.checkedIn || false,
            checkedInAt: teamData.checkedInAt?.toDate ? teamData.checkedInAt.toDate() : null,
            checkedInVenue: teamData.checkedInVenue || null,
            matchDayStatus: teamData.matchDayStatus || 'pending'
          });
        }
      }

      setTeams(playerTeams);
      
      // Check document completeness
      const userDoc = await getDoc(doc(db, "users", user.uid));
      const userData = userDoc.data();
      const documents = userData?.documents || {};
      const documentsComplete = !!(
        documents.profilePhoto?.url && 
        documents.aadhaarFront?.url && 
        documents.aadhaarBack?.url
      );
      
      // Calculate stats
      const newStats: PlayerStats = {
        totalTeams: playerTeams.length,
        verifiedTeams: playerTeams.filter(t => t.verificationStatus === 'approved').length,
        pendingTeams: playerTeams.filter(t => t.verificationStatus === 'pending').length,
        documentsComplete
      };
      
      setStats(newStats);
    } catch (err: any) {
      // Error handling removed
      setError("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const handleViewTeam = (teamId: string) => {
    router.push(`/${lang}/player/teams/${teamId}`);
  };

  const handleUpdateProfile = () => {
    router.push(`/${lang}/profile/edit`);
  };

  const handleUploadDocuments = () => {
    router.push(`/${lang}/profile`);
  };

  const getTeamDisplayStatus = (team: TeamMembership) => {
    // Check if team is checked in (highest priority)
    if (team.checkedIn || team.matchDayStatus === 'checked_in') {
      return 'Checked In';
    }
    
    // Check match day status
    if (team.matchDayStatus === 'verified') {
      return 'Match Day Verified';
    }
    
    // Fall back to regular status
    switch (team.status) {
      case 'draft': return 'Draft';
      case 'submitted': return 'Submitted';
      case 'verified': return 'Verified';
      case 'rejected': return 'Rejected';
      default: return team.status || 'Unknown';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'draft':
        return <Edit className="w-5 h-5 text-gray-600" />;
      case 'submitted':
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-600" />;
      case 'verified':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'rejected':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      default:
        return <Clock className="w-5 h-5 text-gray-600" />;
    }
  };

  const getStatusColor = (team: TeamMembership) => {
    // Check if team is checked in (highest priority)
    if (team.checkedIn || team.matchDayStatus === 'checked_in') {
      return 'bg-green-100 text-green-800';
    }
    
    // Check match day status
    if (team.matchDayStatus === 'verified') {
      return 'bg-blue-100 text-blue-800';
    }
    
    // Fall back to regular status
    switch (team.status) {
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
      case 'verified':
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const getVerificationStatusText = (status: string) => {
    switch (status) {
      case 'verified':
      case 'approved':
        return 'Verified';
      case 'rejected':
        return 'Rejected';
      case 'pending':
        return 'Pending Review';
      default:
        return status || 'Pending';
    }
  };

  if (authLoading || loading) {
    return (
      <PageLoader 
        title={t('loading_player_dashboard', 'Loading Player Dashboard...')}
        variant="brand"
        size="lg"
      />
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{t('error', 'Error')}</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="bg-[#F28C38] text-white px-6 py-2 rounded-lg hover:bg-[#E67A26] transition-colors"
          >
            {t('retry', 'Retry')}
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
            {t('player_dashboard', 'Player Dashboard')}
          </h1>
          <p className="text-gray-600">
            {t('welcome_back_player', 'Welcome back, {name}! Track your team memberships and profile.').replace('{name}', userProfile?.firstName || 'Player')}
          </p>
        </div>

        {/* Alert for incomplete documents */}
        {!stats.documentsComplete && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="text-sm font-medium text-yellow-800 font-fira">
                  {t('complete_your_profile', 'Complete Your Profile')}
                </h3>
                <p className="text-sm text-yellow-700 mt-1 font-fira">
                  {t('upload_documents_message', 'Upload your documents (Profile Photo, Aadhaar Front & Back) to participate in teams.')}
                </p>
              </div>
              <button
                onClick={handleUploadDocuments}
                className="w-full sm:w-auto bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                {t('upload_documents', 'Upload Documents')}
              </button>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-gray-600 text-sm">{t('teams', 'Teams')}</p>
                <p className="text-lg font-bold text-[#4A2F1D] truncate">
                  {teams.length === 0 ? 'No Team' : 
                   teams.length === 1 ? teams[0].name : 
                   `${teams.length} Teams`}
                </p>
              </div>
              <Users className="w-8 h-8 text-gray-400 flex-shrink-0" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">{t('verified', 'Verified')}</p>
                <p className="text-2xl font-bold text-green-600">{stats.verifiedTeams}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">{t('pending', 'Pending')}</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.pendingTeams}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-400" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">{t('documents', 'Documents')}</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.documentsComplete ? '✓' : '✗'}
                </p>
              </div>
              <FileText className={`w-8 h-8 ${stats.documentsComplete ? 'text-green-400' : 'text-red-400'}`} />
            </div>
          </div>
        </div>


        {/* Teams Section */}
        {teams.length === 0 ? (
          <div className="bg-white rounded-lg border p-8 text-center">
            <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Team Memberships</h3>
            <p className="text-gray-600">You haven&apos;t joined any teams yet. Contact team captains to get added to teams.</p>
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
                      <div className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(team)}`}>
                        {getTeamDisplayStatus(team)}
                      </div>
                      <div className={`px-3 py-1 rounded-full text-sm font-medium ${getVerificationStatusColor(team.verificationStatus)}`}>
                        Your Status: {getVerificationStatusText(team.verificationStatus)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Venue Assignment Info */}
                {team.assignedVenue && (
                  <div className="px-6 py-4 bg-green-50 border-t border-green-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <MapPin className="w-5 h-5 text-green-600" />
                        <div>
                          <p className="font-semibold text-green-800">Venue Assigned</p>
                          <p className="text-green-700">{team.assignedVenue.venueName}</p>
                        </div>
                      </div>
                      <div className="px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-full">
                        {team.assignedVenue.assignmentLevel}
                      </div>
                    </div>
                    {team.checkedIn && team.checkedInAt && (
                      <div className="mt-2 text-sm text-green-600">
                        Checked in on {team.checkedInAt.toLocaleDateString()} at {team.checkedInAt.toLocaleTimeString()}
                      </div>
                    )}
                  </div>
                )}

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