"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { api } from '@/server/trpc/react';
import Link from "next/link";
import Image from "next/image";
import { 
  ArrowLeft,
  Loader2, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  Play,
  Trophy,
  MapPin,
  Users,
  Target,
  Calendar,
  Hash,
  Star,
  Award
} from "lucide-react";
import PostFeed from "@/components/posts/PostFeed";

interface PlayerFixtureDetail {
  id: string;
  name: string;
  status: string;
  genderCategory: string;
  level: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  event: {
    id: string;
    name: string;
    status: string;
  } | null;
  fixtureTeams: {
    team: {
      id: string;
      name: string;
      captainUser: {
        firstName: string | null;
        lastName: string | null;
      };
    };
  }[];
  // Computed properties for backward compatibility
  assignedTeams?: Array<{
    id: string;
    name: string;
    tournamentNumber?: number;
  }>;
  sportName?: string;
  venue?: {
    id: string;
    name: string;
    address: string;
    district: string;
    state: string;
  };
  totalMatches?: number;
  completedMatches?: number;
  hasPlayerTeam?: boolean;
  playerTeamNames?: string[];
}

export default function PlayerFixtureDetailPage() {
  const router = useRouter();
  const { lang, fixtureId } = useParams();
  const { user, userProfile, loading: authLoading } = useAuth();

  // Get fixture details using tRPC
  const { data: fixture, isLoading: fixtureLoading, error: fixtureError } = api.teams.management.getMyTeamFixtures.useQuery(
    undefined,
    {
      enabled: !authLoading && !!user && userProfile?.profile_complete && user.role === 'player',
      select: (fixtures) => {
        const foundFixture = fixtures.find(f => f.id === fixtureId);
        if (foundFixture) {
          return {
            ...foundFixture,
            assignedTeams: foundFixture.fixtureTeams.map(ft => ({
              id: ft.team.id,
              name: ft.team.name,
              tournamentNumber: undefined
            })),
            sportName: foundFixture.genderCategory,
            totalMatches: foundFixture.fixtureTeams.length,
            completedMatches: foundFixture.status === 'completed' ? foundFixture.fixtureTeams.length : 0,
            hasPlayerTeam: foundFixture.fixtureTeams.length > 0,
            playerTeamNames: foundFixture.fixtureTeams.map(ft => ft.team.name)
          } as PlayerFixtureDetail;
        }
        return undefined;
      }
    }
  );

  const loading = authLoading || fixtureLoading;
  const error = fixtureError?.message;

  // Get player team IDs
  const playerTeamIds = useMemo(() => {
    if (!fixture?.assignedTeams) return [];
    return fixture.assignedTeams
      .filter(team => fixture.playerTeamNames?.includes(team.name))
      .map(team => team.id);
  }, [fixture]);

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
  }, [user, userProfile, authLoading, router, lang]);

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

  if (authLoading || loading) {
    return (
      <div className="lg:min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#F28C38]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="lg:min-h-screen bg-gray-50 flex items-center justify-center">
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

  if (!fixture) {
    return (
      <div className="lg:min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-gray-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Tournament Not Found</h1>
          <p className="text-gray-600 mb-4">The tournament you&apos;re looking for doesn&apos;t exist or you don&apos;t have access to it.</p>
          <Link
            href={`/${lang}/player/fixtures`}
            className="bg-[#F28C38] text-white px-6 py-2 rounded-lg hover:bg-[#E67A26] transition-colors inline-flex items-center"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Tournaments
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="lg:min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center">
            <Link
              href={`/${lang}/player/fixtures`}
              className="mr-4 p-2 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </Link>
            <div>
              <div className="flex items-center mb-2">
                <Image 
                  src="https://ishalogin.sadhguru.org/app/images/3e8fd38d1d957c44372b.svg" 
                  alt="Isha Logo" 
                  width={40} 
                  height={40} 
                  className="mr-3"
                />
                <h1 className="text-2xl font-bold text-[#4A2F1D]">{fixture.name}</h1>
                {fixture.hasPlayerTeam && (
                  <Star className="w-5 h-5 text-yellow-500 ml-2" />
                )}
              </div>
              <p className="text-gray-600">
                {fixture.sportName} • {fixture.genderCategory} • Level: {fixture.level}
              </p>
            </div>
          </div>
          <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium ${getStatusColor(fixture.status)}`}>
            {getStatusIcon(fixture.status)}
            <span className="ml-2 capitalize">{fixture.status.replace('_', ' ')}</span>
          </span>
        </div>

        {/* Player Participation Notice */}
        {fixture.hasPlayerTeam && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
            <div className="flex items-center">
              <Star className="w-5 h-5 text-blue-600 mr-2" />
              <div>
                <h3 className="text-blue-800 font-semibold">You&apos;re participating in this tournament!</h3>
                <p className="text-blue-600 text-sm mt-1">
                  Your teams: {fixture.playerTeamNames?.join(', ')}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tournament Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Venue Info */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center mb-4">
              <MapPin className="w-5 h-5 text-[#F28C38] mr-2" />
              <h3 className="text-lg font-semibold text-[#4A2F1D]">Venue</h3>
            </div>
            <div>
              <p className="font-medium text-gray-900">{fixture.venue.name}</p>
              <p className="text-sm text-gray-600 mt-1">{fixture.venue.address}</p>
              <p className="text-sm text-gray-600">{fixture.venue.district}, {fixture.venue.state}</p>
            </div>
          </div>

          {/* Teams Info */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center mb-4">
              <Users className="w-5 h-5 text-[#F28C38] mr-2" />
              <h3 className="text-lg font-semibold text-[#4A2F1D]">Teams</h3>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{fixture.assignedTeams.length}</p>
              <p className="text-sm text-gray-600">Total Teams</p>
              {fixture.hasPlayerTeam && (
                <div className="mt-2">
                  <span className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                    <Star className="w-3 h-3 mr-1" />
                    You&apos;re participating
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Progress Info */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center mb-4">
              <Trophy className="w-5 h-5 text-[#F28C38] mr-2" />
              <h3 className="text-lg font-semibold text-[#4A2F1D]">Progress</h3>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {fixture.completedMatches} / {fixture.totalMatches}
              </p>
              <p className="text-sm text-gray-600">Matches Completed</p>
              <div className="mt-2">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-[#F28C38] h-2 rounded-full" 
                    style={{ width: `${fixture.totalMatches > 0 ? (fixture.completedMatches / fixture.totalMatches) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Participating Teams */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
          <div className="flex items-center mb-6">
            <Users className="w-5 h-5 text-[#F28C38] mr-2" />
            <h3 className="text-lg font-semibold text-[#4A2F1D]">Participating Teams</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {fixture.assignedTeams.map((team) => {
              const isPlayerTeam = fixture.playerTeamNames?.includes(team.name);
              
              return (
                <div key={team.id} className={`p-4 rounded-lg border ${
                  isPlayerTeam ? 'border-blue-200 bg-blue-50' : 'border-gray-200 bg-gray-50'
                }`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`font-medium ${isPlayerTeam ? 'text-blue-800' : 'text-gray-900'}`}>
                        {team.name}
                      </p>
                      {team.tournamentNumber && (
                        <p className="text-sm text-gray-600">#{team.tournamentNumber}</p>
                      )}
                    </div>
                    {isPlayerTeam && (
                      <Star className="w-4 h-4 text-blue-500" />
                    )}
                  </div>
                  {isPlayerTeam && (
                    <div className="mt-2">
                      <span className="text-xs text-blue-600 font-medium">Your Team</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Tournament Status */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center mb-6">
            <Target className="w-5 h-5 text-[#F28C38] mr-2" />
            <h3 className="text-lg font-semibold text-[#4A2F1D]">Tournament Status</h3>
          </div>
          
          <div className="text-center py-8">
            <div className={`inline-flex items-center px-6 py-3 rounded-full text-lg font-medium ${getStatusColor(fixture.status)}`}>
              {getStatusIcon(fixture.status)}
              <span className="ml-3 capitalize">{fixture.status.replace('_', ' ')}</span>
            </div>
            
            <div className="mt-6 text-gray-600">
              {fixture.status === 'scheduled' && 'Tournament is scheduled and teams are being assigned.'}
              {fixture.status === 'in_progress' && 'Tournament is currently in progress. Matches are being played.'}
              {fixture.status === 'completed' && 'Tournament has been completed. Check match results for final standings.'}
            </div>
            
            {fixture.hasPlayerTeam && (
              <div className="mt-4">
                <Link
                  href={`/${lang}/player/matches`}
                  className="bg-[#F28C38] text-white px-6 py-2 rounded-lg hover:bg-[#E67A26] transition-colors inline-flex items-center"
                >
                  <Target className="w-4 h-4 mr-2" />
                  View Your Matches
                </Link>
              </div>
            )}
          </div>
        </div>

        <div className="mt-8">
          <PostFeed entityType="fixture" entityId={fixtureId as string} />
        </div>

      </div>
    </div>
  );
}