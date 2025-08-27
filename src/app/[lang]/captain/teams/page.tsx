'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  UserPlus,
  Users,
  CheckCircle,
  X,
  Edit,
  Trash2,
  Search,
  Eye,
  AlertCircle,
  Clock,
  Loader2,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { AlertModal } from '@/components/ui/Modal';
import { useAlert } from '@/hooks/useAlert';
import { api } from '@/server/trpc/react';
import Image from 'next/image';
import { PlayerDocumentUpload } from '@/components/players';
import DocumentPreview from '@/components/documents/DocumentPreview';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/AdvancedSelect';

// Keep the detailed interfaces from the reference file
interface TeamPlayer {
  id: string;
  userId: string;
  teamId: string;
  first_name: string;
  last_name: string;
  phone: string;
  whatsapp_number: string | null;
  date_of_birth: Date;
  age: number;
  gender: string;
  position: 'main' | 'substitute';
  verification_status: 'pending' | 'verified' | 'rejected';
  panchayat: string;
  taluk: string;
  district: string;
  state: string;
  pincode: string;
  added_by: string;
  createdAt: Date;
  users?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    phone: string;
    role: string;
    profile_complete: boolean;
    user_profile_images_user_profile_images_user_idTousers: {
      userId: string;
      profile_photo_path: string | null;
      aadhaar_front_path: string | null;
      aadhaar_back_path: string | null;
      all_images_uploaded: boolean;
      verified_by: string | null;
      verified_at: Date | null;
      createdAt: Date;
      updatedAt: Date;
    } | null;
  };
}

interface TeamData {
  id: string;
  name: string;
  sport_id: string;
  captain_id: string;
  captain_name: string;
  gender_category: string;
  status: string;
  panchayat: string;
  taluk: string;
  district: string;
  state: string;
  pincode: string | null;
  current_players: number;
  current_substitutes: number;
  createdAt: Date;
  updatedAt: Date;
  sports: {
    id: string;
    name: string;
    main_players_count: number;
    max_substitutes: number;
  };
  users_teams_captain_idTousers: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    phone: string;
  };
  team_players: TeamPlayer[];
}

export default function MyTeamPage() {
  const router = useRouter();
  const { lang } = useParams();
  const { user } = useAuth();
  const { alertState, showError, showSuccess, showInfo, hideAlert } = useAlert();

  const [selectedPlayer, setSelectedPlayer] = useState<TeamPlayer | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // tRPC query to fetch the captain's team
  const { data: teamData, isLoading: loading, error, refetch: refetchTeamData } = api.teams.getMyTeam.useQuery(undefined, {
    enabled: !!user,
  });

  const removePlayerMutation = api.teams.removePlayer.useMutation();

  const handleRemovePlayer = async (playerId: string) => {
    if (!teamData || !user) return;

    if (!confirm('Are you sure you want to remove this player from the team?')) {
      return;
    }

    try {
      await removePlayerMutation.mutateAsync({ teamId: teamData.id, userId: playerId });
      await refetchTeamData();
      setSelectedPlayer(null); // Close modal on success
      showSuccess('Player removed successfully!');
    } catch (error: any) {
      showError(`Failed to remove player: ${error.message || 'Unknown error'}`);
    }
  };

  const players = teamData?.team_players || [];
  const sportConfig = teamData?.sports || { main_players_count: 0, max_substitutes: 0 };
  const totalSlotsNeeded = sportConfig.main_players_count + sportConfig.max_substitutes;
  const mainPlayersCount = players.filter(p => p.position === 'main').length;
  const substitutesCount = players.filter(p => p.position === 'substitute').length;

  const isReadOnly = teamData?.status && teamData.status !== 'draft';

  const getPlayerStatusColor = (player: TeamPlayer) => {
    if (player.verification_status === 'verified') return 'text-[#3A7F3F] bg-green-50';
    if (player.verification_status === 'rejected') return 'text-red-600 bg-red-50';
    if (player.users?.profile_complete) return 'text-[#C79016] bg-yellow-50';
    return 'text-gray-600 bg-gray-50';
  };

  const getPlayerStatusIcon = (player: TeamPlayer) => {
    if (player.verification_status === 'verified') return <CheckCircle className="w-4 h-4" />;
    if (player.verification_status === 'rejected') return <X className="w-4 h-4" />;
    if (player.users?.profile_complete) return <Clock className="w-4 h-4" />;
    return <AlertCircle className="w-4 h-4" />;
  };

  const getPlayerStatusText = (player: TeamPlayer) => {
    if (player.verification_status === 'verified') return 'Verified';
    if (player.verification_status === 'rejected') return 'Rejected';
    if (player.users?.profile_complete) return 'Pending Review';
    return 'Docs Incomplete';
  };

  const filteredPlayers = players.filter(player =>
    `${player.first_name} ${player.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    player.phone.includes(searchTerm)
  );

  if (loading) {
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
          <p className="text-gray-600 mb-4">{error.message}</p>
          <button
            onClick={() => router.push(`/${lang}/captain/dashboard`)}
            className="bg-[#F28C38] text-white px-6 py-2 rounded-lg hover:bg-[#E67A26] transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!teamData) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center mb-8">
            <Image
              src="https://ishalogin.sadhguru.org/app/images/3e8fd38d1d957c44372b.svg"
              alt="Isha Logo"
              width={80}
              height={80}
              className="mx-auto"
            />
          </div>
          <h1 className="text-3xl font-bold text-[#4A2F1D] mb-2">My Team</h1>
          <p className="text-gray-600">Manage your team and players</p>
          <div className="bg-white rounded-lg shadow-lg p-8 text-center mt-8">
            <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Team Found</h3>
            <p className="text-gray-600 mb-6">You don&apos;t have a team registered yet.</p>
            <button
              onClick={() => router.push(`/${lang}/captain/dashboard`)}
              className="bg-[#F28C38] text-white px-6 py-2 rounded-lg hover:bg-[#E67A26] transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-8">
          <Image
            src="https://ishalogin.sadhguru.org/app/images/3e8fd38d1d957c44372b.svg"
            alt="Isha Logo"
            width={80}
            height={80}
            className="mx-auto"
          />
          <h1 className="text-3xl font-bold text-[#4A2F1D] mb-2">{teamData.name}</h1>
          <p className="text-gray-600">Manage your team and players for {teamData.sports.name}</p>
        </div>

        {isReadOnly && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-blue-600 mr-3" />
              <div>
                <h3 className="text-sm font-medium text-blue-800">Team Submitted for Verification</h3>
                <p className="text-sm text-blue-700 mt-1">
                  This team is read-only. Status: <span className="font-semibold">{teamData.status}</span>
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg p-6 shadow-lg">
                <p className="text-gray-600 text-sm">Total Players</p>
                <p className="text-2xl font-bold text-[#4A2F1D]">{players.length}/{totalSlotsNeeded}</p>
            </div>
            <div className="bg-white rounded-lg p-6 shadow-lg">
                <p className="text-gray-600 text-sm">Main Players</p>
                <p className="text-2xl font-bold text-[#4A2F1D]">{mainPlayersCount}/{sportConfig.main_players_count}</p>
            </div>
            <div className="bg-white rounded-lg p-6 shadow-lg">
                <p className="text-gray-600 text-sm">Substitutes</p>
                <p className="text-2xl font-bold text-[#4A2F1D]">{substitutesCount}/{sportConfig.max_substitutes}</p>
            </div>
            <div className="bg-white rounded-lg p-6 shadow-lg">
                <p className="text-gray-600 text-sm">Profiles Complete</p>
                <p className="text-2xl font-bold text-[#4A2F1D]">{players.filter(p => p.users?.profile_complete).length}</p>
            </div>
        </div>

        <div className="flex justify-end items-center gap-4 mb-6">
            <div className="relative">
                <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                    type="text"
                    placeholder="Search players..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F28C38] focus:border-transparent"
                />
            </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-8">
          <div className="px-4 sm:px-6 py-4 bg-[#4A2F1D] text-white">
            <h2 className="text-lg sm:text-xl font-bold">Team Players</h2>
          </div>
          {filteredPlayers.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-600">No Players Added Yet</h3>
               <button
                 onClick={() => router.push(`/${lang}/captain/teams/${teamData.id}/players/invite`)}
                 className="mt-4 bg-[#F28C38] hover:bg-[#E67A26] text-white px-6 py-3 rounded-lg font-semibold flex items-center space-x-2 transition-colors mx-auto"
                >
                 <UserPlus className="w-5 h-5" />
                 <span>Add First Player</span>
                </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Player</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Position</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Age</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Documents</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredPlayers.map((player) => (
                    <tr key={player.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-semibold text-[#4A2F1D]">{player.first_name} {player.last_name}</div>
                        <div className="text-sm text-gray-500">{player.phone}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${player.position === 'main' ? 'bg-[#3A7F3F] text-white' : 'bg-[#C79016] text-white'}`}>
                          {player.position}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">{player.age}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex space-x-1">
                          <div className={`w-4 h-4 rounded-full ${player.users?.user_profile_images_user_profile_images_user_idTousers?.profile_photo_path ? 'bg-green-500' : 'bg-gray-300'}`} title="Profile"></div>
                          <div className={`w-4 h-4 rounded-full ${player.users?.user_profile_images_user_profile_images_user_idTousers?.aadhaar_front_path ? 'bg-green-500' : 'bg-gray-300'}`} title="Aadhaar Front"></div>
                          <div className={`w-4 h-4 rounded-full ${player.users?.user_profile_images_user_profile_images_user_idTousers?.aadhaar_back_path ? 'bg-green-500' : 'bg-gray-300'}`} title="Aadhaar Back"></div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`inline-flex items-center space-x-1 px-2 py-1 text-xs font-semibold rounded-full ${getPlayerStatusColor(player)}`}>
                          {getPlayerStatusIcon(player)}
                          <span>{getPlayerStatusText(player)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                         <div className="flex space-x-2">
                            <button onClick={() => setSelectedPlayer(player)} className="text-[#F28C38] hover:text-[#E67A26]"><Eye className="w-5 h-5" /></button>
                            {player.userId !== teamData.captain_id && !isReadOnly && (
                                <button onClick={() => handleRemovePlayer(player.id)} className="text-red-600 hover:text-red-800"><Trash2 className="w-5 h-5" /></button>
                            )}
                         </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Player Detail Modal */}
      {selectedPlayer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-bold text-[#4A2F1D]">{selectedPlayer.first_name} {selectedPlayer.last_name}</h2>
                  <p className="text-gray-600">{selectedPlayer.phone}</p>
                </div>
                <button onClick={() => setSelectedPlayer(null)} className="text-gray-500 hover:text-gray-700">
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div>
                        <h3 className="text-lg font-bold text-[#4A2F1D] mb-4">Player Information</h3>
                        <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="text-sm text-gray-600">Age</label><p className="font-semibold">{selectedPlayer.age} years</p></div>
                                <div><label className="text-sm text-gray-600">Position</label><p className="font-semibold capitalize">{selectedPlayer.position}</p></div>
                            </div>
                            <div><label className="text-sm text-gray-600">WhatsApp Number</label><p className="font-semibold">{selectedPlayer.whatsapp_number}</p></div>
                            <div><label className="text-sm text-gray-600">Panchayat</label><p className="font-semibold">{selectedPlayer.panchayat}</p></div>
                            <div><label className="text-sm text-gray-600">District</label><p className="font-semibold">{selectedPlayer.district}</p></div>
                        </div>
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-[#4A2F1D] mb-4">Identity Documents</h3>
                        <p className="text-sm text-gray-600">Manage player documents on the <button onClick={() => router.push(`/${lang}/captain/teams/${teamData.id}/players/invite`)} className="text-blue-600 hover:underline">Add/Manage Players</button> page.</p>
                    </div>
                </div>
                <div className="mt-8 flex justify-end space-x-4">
                    <button onClick={() => setSelectedPlayer(null)} className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">Close</button>
                    {selectedPlayer.userId !== teamData.captain_id && !isReadOnly && (
                        <button onClick={() => handleRemovePlayer(selectedPlayer.id)} className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">Remove Player</button>
                    )}
                </div>
            </div>
          </div>
        </div>
      )}

      <AlertModal isOpen={alertState.isOpen} onClose={hideAlert} message={alertState.message} type={alertState.type} title={alertState.title} />
    </div>
  );
}
