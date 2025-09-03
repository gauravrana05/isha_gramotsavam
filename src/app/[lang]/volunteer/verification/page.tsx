"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { api } from '@/server/trpc/react';
import { useAuth } from '@/context/AuthContext';
import { useNotification } from '@/context/NotificationContext';
import {
  ArrowLeft,
  Users,
  Check,
  X,
  Search,
  AlertCircle,
  CheckCircle,
  Clock,
  Loader2
} from 'lucide-react';

// Types
interface TeamData {
  id: string;
  name: string;
  status: string;
  captainId: string;
  sportId: string;
  sport?: {
    name: string;
  };
  captain?: {
    firstName: string;
    lastName: string;
    phone: string;
  };
}

interface TeamPlayer {
  id: string;
  playerId: string;
  teamId: string;
  verificationStatus: 'pending' | 'verified' | 'rejected';
  player: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string;
    dateOfBirth: Date;
    gender: 'M' | 'F';
  };
}

export default function VolunteerVerification() {
  const router = useRouter();
  const { lang, teamId } = useParams();
  const { user } = useAuth();
  const { addNotification } = useNotification();
  
  const [searchTerm, setSearchTerm] = useState('');

  // API Queries
  const { data: teamData, isLoading: teamLoading } = api.volunteers.teams.getTeamDetails.useQuery(
    { teamId: teamId as string },
    { enabled: !!teamId }
  );

  const { data: players, isLoading: playersLoading, refetch: refetchPlayers } = api.volunteers.teams.getTeamPlayers.useQuery(
    { teamId: teamId as string },
    { enabled: !!teamId }
  );

  // Mutations
  const verifyPlayerMutation = api.volunteers.teams.verifyPlayer.useMutation({
    onSuccess: () => {
      addNotification('Player verified successfully', 'success');
      refetchPlayers();
    },
    onError: (error) => {
      addNotification(error.message, 'error');
    }
  });

  const rejectPlayerMutation = api.volunteers.teams.rejectPlayer.useMutation({
    onSuccess: () => {
      addNotification('Player rejected', 'success');
      refetchPlayers();
    },
    onError: (error) => {
      addNotification(error.message, 'error');
    }
  });

  // Loading state
  if (teamLoading || playersLoading) {
    return (
      <div className="min-h-screen bg-[#F3F0E5] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#F28C38] mx-auto mb-4" />
          <p className="text-gray-600">Loading team verification...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (!teamData) {
    return (
      <div className="min-h-screen bg-[#F3F0E5] flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600">Team not found</p>
        </div>
      </div>
    );
  }

  const handleVerifyPlayer = (playerId: string) => {
    verifyPlayerMutation.mutate({ playerId });
  };

  const handleRejectPlayer = (playerId: string) => {
    rejectPlayerMutation.mutate({ playerId });
  };

  const filteredPlayers = players?.filter(player =>
    `${player.player.firstName} ${player.player.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    player.player.phone.includes(searchTerm)
  ) || [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'verified': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-yellow-100 text-yellow-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'verified': return <CheckCircle className="w-4 h-4" />;
      case 'rejected': return <X className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-[#F3F0E5] font-fira">
      {/* Header */}
      <div className="bg-[#4A2F1D] text-white py-6">
        <div className="max-w-7xl mx-auto px-4">
          <button
            onClick={() => router.push(`/${lang}/volunteer`)}
            className="flex items-center space-x-2 text-cream-200 hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Dashboard</span>
          </button>
          
          <h1 className="text-3xl font-bold mb-2">{teamData.name}</h1>
          <p className="text-cream-200">Team Verification</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Team Progress */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Players</p>
                <p className="text-2xl font-bold text-gray-900">{players?.length || 0}</p>
              </div>
              <Users className="w-8 h-8 text-[#F28C38]" />
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Verified</p>
                <p className="text-2xl font-bold text-green-600">
                  {players?.filter(p => p.verificationStatus === 'verified').length || 0}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {players?.filter(p => p.verificationStatus === 'pending').length || 0}
                </p>
              </div>
              <Clock className="w-8 h-8 text-yellow-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Rejected</p>
                <p className="text-2xl font-bold text-red-600">
                  {players?.filter(p => p.verificationStatus === 'rejected').length || 0}
                </p>
              </div>
              <X className="w-8 h-8 text-red-500" />
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <div className="relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search players..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F28C38] focus:border-transparent w-full"
            />
          </div>
        </div>

        {/* Players List */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Players ({filteredPlayers.length})</h2>
          </div>

          <div className="divide-y divide-gray-200">
            {filteredPlayers.map((player) => (
              <div key={player.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-4">
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">
                          {player.player.firstName} {player.player.lastName}
                        </h3>
                        <p className="text-sm text-gray-500">{player.player.phone}</p>
                        <p className="text-sm text-gray-500">
                          {player.player.gender} • {new Date(player.player.dateOfBirth).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(player.verificationStatus)}`}>
                      {getStatusIcon(player.verificationStatus)}
                      <span className="ml-2 capitalize">{player.verificationStatus}</span>
                    </span>

                    {player.verificationStatus === 'pending' && (
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleVerifyPlayer(player.id)}
                          disabled={verifyPlayerMutation.isPending}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleRejectPlayer(player.id)}
                          disabled={rejectPlayerMutation.isPending}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {filteredPlayers.length === 0 && (
              <div className="p-12 text-center">
                <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Players Found</h3>
                <p className="text-gray-500">
                  {searchTerm ? 'No players match your search criteria.' : 'No players have been added to this team yet.'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
