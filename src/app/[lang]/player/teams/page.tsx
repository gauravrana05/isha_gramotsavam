"use client";

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

// Interfaces to match the tRPC procedure's return type from players.ts
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
  joinedAt: string; 
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
  checkedInAt?: string; 
  checkedInVenue?: string;
  matchDayStatus?: string;
}

export default function PlayerTeamsListPage() {
  const router = useRouter();
  const { lang } = useParams();
  const { user, loading: authLoading } = useAuth();
  const { t } = useTranslation();

  // Use tRPC to fetch player dashboard data (which includes all teams)
  const { data, isLoading, error } = api.players.getMyDashboardData.useQuery(undefined, {
    enabled: typeof user === 'object' && user !== null && typeof user.id === 'string' && user.id.length > 0,
  });

  const teams = data?.teams || [];

  const getTeamDisplayStatus = (team: TeamMembership) => {
    if (team.checkedIn || team.matchDayStatus === 'checked_in') {
      return 'Checked In';
    }
    
    if (team.matchDayStatus === 'verified') {
      return 'Match Day Verified';
    }
    
    switch (team.status) {
      case 'draft': return 'Draft';
      case 'submitted': return 'Submitted';
      case 'verified': return 'Verified';
      case 'rejected': return 'Rejected';
      default: return team.status || 'Unknown';
    }
  };

  const getStatusColor = (team: TeamMembership) => {
    if (team.checkedIn || team.matchDayStatus === 'checked_in') {
      return 'bg-green-100 text-green-800';
    }
    
    if (team.matchDayStatus === 'verified') {
      return 'bg-blue-100 text-blue-800';
    }
    
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
        title={t('loading_teams', 'Loading Teams...')}
        variant="brand"
        size="lg"
      />
    );
  }

  if (error) {
    return (
      <div className="lg:min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{t('error', 'Error')}</h1>
          <p className="text-gray-600 mb-4">{error.message}</p>
          <button 
            onClick={() => router.push(`/${lang}/player/dashboard`)}
            className="bg-[#F28C38] text-white px-6 py-2 rounded-lg hover:bg-[#E67A26] transition-colors"
          >
            {t('back_to_dashboard', 'Back to Dashboard')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="lg:min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <Image 
            src="https://ishalogin.sadhguru.org/app/images/3e8fd38d1d957c44372b.svg" 
            alt="Isha Logo" 
            width={80} 
            height={80} 
            className="mx-auto"
          />
          <h1 className="text-3xl font-bold text-[#4A2F1D] mb-2">
            {t('my_teams', 'My Teams')}
          </h1>
          <p className="text-gray-600">
            {t('list_of_teams_joined', 'List of teams you have joined.')}
          </p>
        </div>

        {/* Teams List */}
        {teams.length === 0 ? (
          <div className="bg-white rounded-lg border p-8 text-center">
            <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('no_team_memberships', 'No Team Memberships')}</h3>
            <p className="text-gray-600">{t('contact_captain_to_join', 'You haven&apos;t joined any teams yet. Contact team captains to get added to teams.')}</p>
            <button 
              onClick={() => router.push(`/${lang}/player/dashboard`)}
              className="mt-4 bg-[#F28C38] text-white px-6 py-2 rounded-lg hover:bg-[#E67A26] transition-colors"
            >
              {t('back_to_dashboard', 'Back to Dashboard')}
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {teams.map((team) => (
              <div key={team.teamId} className="bg-white rounded-lg border overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => router.push(`/${lang}/player/teams/${team.teamId}`)}>
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
                          <p className="font-semibold text-green-800">{t('venue_assigned', 'Venue Assigned')}</p>
                          <p className="text-green-700">{team.assignedVenue.venueName}</p>
                        </div>
                      </div>
                      <div className="px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-full">
                        {team.assignedVenue.assignmentLevel}
                      </div>
                    </div>
                    {team.checkedIn && team.checkedInAt && (
                      <div className="mt-2 text-sm text-green-600">
                        {t('checked_in_on', 'Checked in on')} {new Date(team.checkedInAt).toLocaleDateString()} {t('at', 'at')} {new Date(team.checkedInAt).toLocaleTimeString()}
                      </div>
                    )}
                  </div>
                )}

                {/* Team Details (Summary) */}
                <div className="p-6">
                  <div className="grid md:grid-cols-2 gap-8">
                    {/* Captain Information */}
                    <div>
                      <h3 className="text-lg font-semibold text-[#4A2F1D] mb-4 flex items-center">
                        <UserCheck className="w-5 h-5 mr-2" />
                        {t('team_captain', 'Team Captain')}
                      </h3>
                      <div className="space-y-3">
                        <div>
                          <div className="text-sm font-medium text-gray-700 mb-1">{t('name', 'Name')}</div>
                          <div className="text-gray-900">{team.captainProfile.name || 'Not Available'}</div>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-700 mb-1 flex items-center">
                            <Phone className="w-4 h-4 mr-1" />
                            {t('phone_number', 'Phone Number')}
                          </div>
                          <div className="text-gray-900">+91 {team.captainProfile.phone || 'Not Available'}</div>
                        </div>
                      </div>
                    </div>

                    {/* Team Statistics */}
                    <div>
                      <h3 className="text-lg font-semibold text-[#4A2F1D] mb-4 flex items-center">
                        <Users className="w-5 h-5 mr-2" />
                        {t('team_statistics', 'Team Statistics')}
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-4 bg-gray-50 rounded-lg">
                          <div className="text-2xl font-bold text-blue-600">{team.currentPlayers}</div>
                          <div className="text-sm text-gray-600">{t('currentPlayers', 'Current Players')}</div>
                        </div>
                        <div className="text-center p-4 bg-gray-50 rounded-lg">
                          <div className="text-2xl font-bold text-purple-600">{team.maxPlayers}</div>
                          <div className="text-sm text-gray-600">{t('max_players', 'Max Players')}</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Your Position */}
                  <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold text-blue-900">{t('your_position_in_team', 'Your Position in Team')}</h4>
                        <p className="text-blue-700 capitalize">{team.position} {t('player', 'Player')}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-blue-600">{t('joined_on', 'Joined On')}</p>
                        <p className="font-medium text-blue-900">
                          {team.joinedAt ? 
                            new Date(team.joinedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 
                            'Unknown'
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
