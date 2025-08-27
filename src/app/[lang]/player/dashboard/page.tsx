"use client";

import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/server/trpc/react";
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
  sportId: string;
  captainProfile: {
    name: string;
    phone: string;
    userId: string;
  };
  position: string;
  status: string;
  verificationStatus: string;
  joinedAt: string; // Changed to string
  panchayat: string;
  district: string;
  state: string;
  genderCategory: string;
  maxPlayers: number;
  currentPlayers: number;
  assignedVenue?: {
    venueId: string;
    venueName: string;
    assignmentLevel: string;
  };
  checkedIn?: boolean;
  checkedInAt?: string; // Changed to string
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
  const router = useRouter();
  const { lang } = useParams();
  const { user, userProfile, loading: authLoading } = useAuth();
  const { t } = useTranslation();

  // Use tRPC to fetch player dashboard data
  const { data, isLoading, error } = api.players.getMyDashboardData.useQuery(undefined, {
    enabled: typeof user === 'object' && user !== null && typeof user.id === 'string' && user.id.length > 0,
  });

  const teams = data?.teams || [];
  const stats = data?.stats || {
    totalTeams: 0,
    verifiedTeams: 0,
    pendingTeams: 0,
    documentsComplete: false,
  };

  // The useEffect for redirection is removed from here.
  // This logic should ideally be handled by a higher-order component or the AuthContext itself.

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

  if (authLoading || isLoading) {
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
          <p className="text-gray-600 mb-4">{error.message}</p>
          <button 
            onClick={() => router.push(`/${lang}/player/dashboard`)}
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

        


        {/* Team Specifications */}
        {teams.length > 0 ? (
          <div className="space-y-6">
            {/* Team Header */}
            <div className="bg-white rounded-lg border p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">{teams[0].name}</h2>
                  <div className="flex flex-col sm:flex-row  sm:items-center gap-4 text-sm text-gray-600">
                  <span className="flex capitalize items-center gap-1">
                  {teams[0].genderCategory === 'F' ? <User className='w-4 h-4'/> : teams[0].genderCategory === 'M' ? <UserRound className='w-4 h-4'/> : <Users className='w-4 h-4'/>}
                    {teams[0].genderCategory === 'F' ? t('women', 'Women') : teams[0].genderCategory === 'M' ? t('men', 'Men') : t('mixed', 'Mixed')}
                  </span>
                    
                    <span className="flex  items-center gap-1">
                      <Trophy className="w-4 h-4" />
                      {teams[0].sportName}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {teams[0].panchayat}, {teams[0].district}
                    </span>
                    
                  </div>
                </div>
                <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                  teams[0].status === 'verified' ? 'bg-green-100 text-green-800' :
                  teams[0].status === 'submitted' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {teams[0].status.charAt(0).toUpperCase() + teams[0].status.slice(1)}
                </div>
              </div>
            </div>

            {/* Team Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg border p-4 text-center">
                <div className="text-2xl font-bold text-blue-600">{teams[0].position === 'main' ? 'Main' : 'Substitute'}</div>
                <div className="text-sm text-gray-600">{t('your_position', 'Your Position')}</div>
              </div>
              <div className="bg-white rounded-lg border p-4 text-center">
                <div className="text-2xl font-bold text-purple-600">{teams[0].maxPlayers}</div>
                <div className="text-sm text-gray-600">{t('main_players', 'Main Players')}</div>
              </div>
              <div className="bg-white rounded-lg border p-4 text-center">
                <div className="text-2xl font-bold text-orange-600">{Math.max(0, teams[0].currentPlayers - teams[0].maxPlayers)}</div>
                <div className="text-sm text-gray-600">{t('substitutes', 'Substitutes')}</div>
              </div>
              <div className="bg-white rounded-lg border p-4 text-center">
                <div className="text-2xl font-bold text-green-600">📅</div>
                <div className="text-sm text-gray-600">{t('fixtures_soon', 'Fixtures Soon')}</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg border p-8 text-center">
            <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('no_team_found', 'No Team Found')}</h3>
            <p className="text-gray-600">{t('no_team_registered_message', "You don't have any team registered yet.")}</p>
          </div>
        )}
      </div>
    </div>
  );
}
