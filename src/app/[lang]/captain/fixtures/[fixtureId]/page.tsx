"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { api } from '@/lib/trpc/react';
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

interface CaptainFixtureDetail {
  id: string;
  name: string;
  sportName: string;
  genderCategory: string;
  venue: {
    id: string;
    name: string;
    address: string;
    district: string;
    state: string;
  };
  status: string;
  level: string;
  assignedTeams: Array<{
    id: string;
    name: string;
    tournamentNumber?: number;
  }>;
  totalMatches: number;
  completedMatches: number;
  createdAt: string;
  updatedAt: string;
  bracket?: {
    matches: Array<{
      id: string;
      roundName: string;
      matchNumber: number;
      status: string;
      team1?: {
        id: string;
        name: string;
        tournamentNumber?: number;
      };
      team2?: {
        id: string;
        name: string;
        tournamentNumber?: number;
      };
      result?: {
        winnerName: string;
        winnerTeamId: string;
        team1Score?: number;
        team2Score?: number;
      };
    }>;
    winners?: Array<{
      teamId: string;
      teamName: string;
      position: number;
    }>;
  };
  hasCaptainTeam?: boolean;
  captainTeamNames?: string[];
}

export default function CaptainFixtureDetailPage() {
  const router = useRouter();
  const { lang, fixtureId } = useParams();
  const { user, userProfile, loading: authLoading } = useAuth();

  // Get fixture details using tRPC
  const { data: fixture, isLoading: fixtureLoading, error: fixtureError } = api.teams.getMyTeamFixtures.useQuery(
    undefined,
    {
      enabled: !authLoading && !!user && userProfile?.profile_complete && user.role === 'captain',
      select: (fixtures) => fixtures.find(f => f.id === fixtureId) as CaptainFixtureDetail | undefined
    }
  );

  const loading = authLoading || fixtureLoading;
  const error = fixtureError?.message;

  // Get unique team IDs that captain manages
  const captainTeamIds = useMemo(() => {
    if (!fixture?.assignedTeams) return [];
    return fixture.assignedTeams
      .filter(team => fixture.captainTeamNames?.includes(team.name))
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

  if (!fixture) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-gray-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Fixture Not Found</h1>
          <p className="text-gray-600 mb-4">The tournament fixture you're looking for doesn't exist or you don't have access to it.</p>
          <Link
            href={`/${lang}/captain/fixtures`}
            className="bg-[#F28C38] text-white px-6 py-2 rounded-lg hover:bg-[#E67A26] transition-colors inline-flex items-center"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Fixtures
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center">
            <Link
              href={`/${lang}/captain/fixtures`}
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
                {fixture.hasCaptainTeam && (
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

        {/* Fixture Info Cards */}
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
              {fixture.hasCaptainTeam && (
                <div className="mt-2">
                  <p className="text-sm text-blue-600 font-medium">
                    Your teams: {fixture.captainTeamNames?.join(', ')}
                  </p>
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

        {/* Tournament Bracket */}
        {fixture.bracket?.matches && fixture.bracket.matches.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
            <div className="flex items-center mb-6">
              <Target className="w-5 h-5 text-[#F28C38] mr-2" />
              <h3 className="text-lg font-semibold text-[#4A2F1D]">Tournament Matches</h3>
            </div>
            
            <div className="space-y-4">
              {fixture.bracket.matches.map((match) => {
                const isCaptainMatch = 
                  (match.team1 && captainTeamIds.includes(match.team1.id)) ||
                  (match.team2 && captainTeamIds.includes(match.team2.id));
                  
                return (
                  <div key={match.id} className={`border rounded-lg p-4 ${isCaptainMatch ? 'border-blue-200 bg-blue-50' : 'border-gray-200'}`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center">
                        <Hash className="w-4 h-4 text-gray-400 mr-1" />
                        <span className="font-medium text-gray-900">Match {match.matchNumber}</span>
                        <span className="mx-2 text-gray-400">•</span>
                        <span className="text-sm text-gray-600">{match.roundName}</span>
                        {isCaptainMatch && (
                          <Star className="w-4 h-4 text-blue-500 ml-2" />
                        )}
                      </div>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(match.status)}`}>
                        {getStatusIcon(match.status)}
                        <span className="ml-1 capitalize">{match.status.replace('_', ' ')}</span>
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                      {/* Team 1 */}
                      <div className="text-center">
                        <div className={`font-medium ${
                          match.team1 && captainTeamIds.includes(match.team1.id) ? 'text-blue-600' : 'text-gray-900'
                        }`}>
                          {match.team1?.name || 'TBD'}
                          {match.team1?.tournamentNumber && (
                            <span className="ml-1 text-gray-500 text-sm">#{match.team1.tournamentNumber}</span>
                          )}
                        </div>
                        {match.team1 && captainTeamIds.includes(match.team1.id) && (
                          <span className="text-xs text-blue-600 font-medium">Your Team</span>
                        )}
                      </div>
                      
                      {/* VS / Result */}
                      <div className="text-center">
                        {match.result ? (
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              Winner: {match.result.winnerName}
                            </div>
                            {match.result.team1Score !== undefined && match.result.team2Score !== undefined && (
                              <div className="text-sm text-gray-600">
                                {match.result.team1Score} - {match.result.team2Score}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400 font-medium">VS</span>
                        )}
                      </div>
                      
                      {/* Team 2 */}
                      <div className="text-center">
                        <div className={`font-medium ${
                          match.team2 && captainTeamIds.includes(match.team2.id) ? 'text-blue-600' : 'text-gray-900'
                        }`}>
                          {match.team2?.name || 'TBD'}
                          {match.team2?.tournamentNumber && (
                            <span className="ml-1 text-gray-500 text-sm">#{match.team2.tournamentNumber}</span>
                          )}
                        </div>
                        {match.team2 && captainTeamIds.includes(match.team2.id) && (
                          <span className="text-xs text-blue-600 font-medium">Your Team</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Winners */}
        {fixture.bracket?.winners && fixture.bracket.winners.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center mb-6">
              <Award className="w-5 h-5 text-[#F28C38] mr-2" />
              <h3 className="text-lg font-semibold text-[#4A2F1D]">Tournament Results</h3>
            </div>
            
            <div className="space-y-3">
              {fixture.bracket.winners.map((winner, index) => {
                const isCaptainTeam = captainTeamIds.includes(winner.teamId);
                
                return (
                  <div key={winner.teamId} className={`flex items-center justify-between p-3 rounded-lg ${
                    isCaptainTeam ? 'bg-yellow-50 border border-yellow-200' : 'bg-gray-50'
                  }`}>
                    <div className="flex items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white mr-3 ${
                        winner.position === 1 ? 'bg-yellow-500' : 
                        winner.position === 2 ? 'bg-gray-400' : 'bg-yellow-600'
                      }`}>
                        {winner.position}
                      </div>
                      <span className={`font-medium ${isCaptainTeam ? 'text-yellow-800' : 'text-gray-900'}`}>
                        {winner.teamName}
                      </span>
                      {isCaptainTeam && (
                        <Star className="w-4 h-4 text-yellow-600 ml-2" />
                      )}
                    </div>
                    <span className="text-sm text-gray-600">
                      {winner.position === 1 ? '🏆 Champion' : 
                       winner.position === 2 ? '🥈 Runner-up' : 
                       winner.position === 3 ? '🥉 Third Place' : `${winner.position}th Place`}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}