"use client";

import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
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
  UserCheck,
  Loader2
} from "lucide-react";
import { api } from "@/server/trpc/react";

// Interfaces to match the tRPC procedure's return type
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
  joinedAt: string; // Changed to string as Date objects are serialized as strings
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

export default function PlayerTeamDetailsPage() {
  const router = useRouter();
  const { lang, teamId } = useParams();
  const { user, loading: authLoading } = useAuth();
  const { t } = useTranslation();

  if (!teamId || (Array.isArray(teamId) && teamId.length === 0)) {
    return (
      <div className="lg:min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{t('error', 'Error')}</h1>
          <p className="text-gray-600 mb-4">{t('team_id_missing', 'Team ID is missing or invalid.')}</p>
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

  const teamIdStr: string = Array.isArray(teamId) ? teamId[0] : teamId;

  // Use tRPC to fetch specific team data for the player
  const { data: teamData, isLoading, error } = api.teams.players.getPlayerTeamById.useQuery(
    { id: teamIdStr },
    { enabled: !!user?.id }
  );

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
        title={t('loading_team_details', 'Loading Team Details...')}
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

  if (!teamData) {
    return (
      <div className="lg:min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{t('team_not_found', 'Team Not Found')}</h1>
          <p className="text-gray-600 mb-4">{t('team_not_found_message', 'The team you are looking for does not exist or you do not have access.')}</p>
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
            {teamData.name}
          </h1>
          <p className="text-gray-600">
            {t('team_details_for', 'Details for {sportName} Team').replace('{sportName}', teamData.sportName)}
          </p>
        </div>

        {/* Team Status */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-[#4A2F1D] mb-2">{t('team_status', 'Team Status')}</h3>
              <p className={`text-xl font-semibold ${getStatusColor(teamData)}`}>
                {getTeamDisplayStatus(teamData)}
              </p>
              <p className={`text-md font-semibold ${getVerificationStatusColor(teamData.verificationStatus)} mt-1`}>
                {t('your_status', 'Your Status')}: {getVerificationStatusText(teamData.verificationStatus)}
              </p>
            </div>
            <div className={`w-4 h-4 rounded-full ${getStatusColor(teamData).replace('bg-', 'bg-').replace('text-', '')}`}></div>
          </div>
        </div>

        {/* Venue Assignment Info */}
        {teamData.assignedVenue && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <MapPin className="w-5 h-5 text-green-600" />
                <div>
                  <p className="font-semibold text-green-800">{t('venue_assigned', 'Venue Assigned')}</p>
                  <p className="text-green-700">{teamData.assignedVenue.venueName}</p>
                </div>
              </div>
              <div className="px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-full">
                {teamData.assignedVenue.assignmentLevel}
              </div>
            </div>
            {teamData.checkedIn && teamData.checkedInAt && (
              <div className="mt-2 text-sm text-green-600">
                {t('checked_in_on', 'Checked in on')} {new Date(teamData.checkedInAt).toLocaleDateString()} {t('at', 'at')} {new Date(teamData.checkedInAt).toLocaleTimeString()}
              </div>
            )}
          </div>
        )}

        {/* Team Details */}
        <div className="bg-white rounded-lg shadow-lg p-6">
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
                  <div className="text-gray-900">{teamData.captainProfile.name || 'Not Available'}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-700 mb-1 flex items-center">
                    <Phone className="w-4 h-4 mr-1" />
                    {t('phone_number', 'Phone Number')}
                  </div>
                  <div className="text-gray-900">+91 {teamData.captainProfile.phone || 'Not Available'}</div>
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
                  <div className="text-2xl font-bold text-blue-600">{teamData.currentPlayers}</div>
                  <div className="text-sm text-gray-600">{t('currentPlayers', 'Current Players')}</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">{teamData.maxPlayers}</div>
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
                <p className="text-blue-700 capitalize">{teamData.position} {t('player', 'Player')}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-blue-600">{t('joined_on', 'Joined On')}</p>
                <p className="font-medium text-blue-900">
                  {teamData.joinedAt ? 
                    new Date(teamData.joinedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 
                    'Unknown'
                  }
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
