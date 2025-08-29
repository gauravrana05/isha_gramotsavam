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

interface CaptainMatchDetail {
  matchId: string;
  fixtureId: string;
  fixtureName: string;
  sportName?: string;
  genderCategory?: string;
  venue: {
    id: string;
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
  } | null;
  team2?: {
    teamId: string;
    teamName: string;
    tournamentNumber?: number;
  } | null;
  result?: {
    winnerName: string;
    winnerTeamId: string;
    score: {
      team1Score: number;
      team2Score: number;
    };
  } | null;
  createdAt: string;
  updatedAt: string;
  isCaptainInvolved?: boolean;
  captainTeamSide?: 'team1' | 'team2' | null;
  isCaptainTeamWinner?: boolean;
}

export default function CaptainMatchDetailPage() {
  const router = useRouter();
  const { lang, matchId } = useParams();
  const { user, userProfile, loading: authLoading } = useAuth();

  // Get match details using tRPC
  const { data: match, isLoading: matchLoading, error: matchError } = api.teams.getMyTeamMatches.useQuery(
    undefined,
    {
      enabled: !authLoading && !!user && userProfile?.profileComplete && user.role === 'captain',
      select: (matches) => matches.find(m => m.matchId === matchId) as CaptainMatchDetail | undefined
    }
  );

  const loading = authLoading || matchLoading;
  const error = matchError?.message;

  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      router.push(`/${lang}/login`);
      return;
    }

    if (!userProfile?.profileComplete) {
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

  if (!match) {
    return (
      <div className="lg:min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-gray-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Match Not Found</h1>
          <p className="text-gray-600 mb-4">The match you&apos;re looking for doesn&apos;t exist or you don&apos;t have access to it.</p>
          <Link
            href={`/${lang}/captain/matches`}
            className="bg-[#F28C38] text-white px-6 py-2 rounded-lg hover:bg-[#E67A26] transition-colors inline-flex items-center"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Matches
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="lg:min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center">
            <Link
              href={`/${lang}/captain/matches`}
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
                <div>
                  <div className="flex items-center">
                    <Hash className="w-5 h-5 text-gray-400 mr-1" />
                    <h1 className="text-2xl font-bold text-[#4A2F1D]">Match {match.matchNumber}</h1>
                    {match.isCaptainInvolved && (
                      <Star className="w-5 h-5 text-yellow-500 ml-2" />
                    )}
                  </div>
                  <p className="text-gray-600">
                    {match.fixtureName} • {match.roundName}
                  </p>
                  {match.sportName && (
                    <p className="text-sm text-gray-500">
                      {match.sportName} • {match.genderCategory}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
          <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium ${getStatusColor(match.status)}`}>
            {getStatusIcon(match.status)}
            <span className="ml-2 capitalize">{match.status.replace('_', ' ')}</span>
          </span>
        </div>

        {/* Match Overview */}
        <div className="bg-white rounded-lg shadow-sm border p-8 mb-8">
          <div className="text-center mb-6">
            <h2 className="text-lg font-semibold text-[#4A2F1D] mb-4">Match Details</h2>
            
            {/* Teams Display */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
              {/* Team 1 */}
              <div className={`p-6 rounded-lg border-2 ${
                match.captainTeamSide === 'team1' ? 'border-blue-200 bg-blue-50' : 'border-gray-200 bg-gray-50'
              }`}>
                <div className="text-center">
                  <div className={`text-lg font-bold mb-2 ${
                    match.captainTeamSide === 'team1' ? 'text-blue-600' : 'text-gray-900'
                  }`}>
                    {match.team1?.teamName || 'TBD'}
                  </div>
                  {match.team1?.tournamentNumber && (
                    <div className="text-sm text-gray-600 mb-2">
                      Tournament #{match.team1.tournamentNumber}
                    </div>
                  )}
                  {match.captainTeamSide === 'team1' && (
                    <div className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                      <Star className="w-4 h-4 mr-1" />
                      Your Team
                    </div>
                  )}
                  {match.result && match.result.winnerTeamId === match.team1?.teamId && (
                    <div className="mt-2">
                      <Award className="w-6 h-6 text-yellow-500 mx-auto" />
                      <div className="text-sm text-yellow-600 font-medium mt-1">Winner!</div>
                    </div>
                  )}
                </div>
              </div>

              {/* VS / Score */}
              <div className="text-center">
                {match.result ? (
                  <div>
                    <div className="text-3xl font-bold text-gray-900 mb-2">
                      {match.result.score.team1Score} - {match.result.score.team2Score}
                    </div>
                    <div className="text-sm text-gray-600">Final Score</div>
                  </div>
                ) : (
                  <div>
                    <div className="text-3xl font-bold text-gray-400 mb-2">VS</div>
                    <div className="text-sm text-gray-500">
                      {match.status === 'scheduled' ? 'Scheduled' : 
                       match.status === 'ready' ? 'Ready to Start' : 
                       match.status === 'in_progress' ? 'In Progress' : 'Pending'}
                    </div>
                  </div>
                )}
              </div>

              {/* Team 2 */}
              <div className={`p-6 rounded-lg border-2 ${
                match.captainTeamSide === 'team2' ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-gray-50'
              }`}>
                <div className="text-center">
                  <div className={`text-lg font-bold mb-2 ${
                    match.captainTeamSide === 'team2' ? 'text-red-600' : 'text-gray-900'
                  }`}>
                    {match.team2?.teamName || 'TBD'}
                  </div>
                  {match.team2?.tournamentNumber && (
                    <div className="text-sm text-gray-600 mb-2">
                      Tournament #{match.team2.tournamentNumber}
                    </div>
                  )}
                  {match.captainTeamSide === 'team2' && (
                    <div className="inline-flex items-center px-3 py-1 bg-red-100 text-red-800 text-sm rounded-full">
                      <Star className="w-4 h-4 mr-1" />
                      Your Team
                    </div>
                  )}
                  {match.result && match.result.winnerTeamId === match.team2?.teamId && (
                    <div className="mt-2">
                      <Award className="w-6 h-6 text-yellow-500 mx-auto" />
                      <div className="text-sm text-yellow-600 font-medium mt-1">Winner!</div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Result Message for Captain */}
            {match.result && match.isCaptainInvolved && (
              <div className={`mt-6 p-4 rounded-lg ${
                match.isCaptainTeamWinner ? 'bg-green-100 border border-green-200' : 'bg-red-100 border border-red-200'
              }`}>
                <div className={`text-lg font-bold ${
                  match.isCaptainTeamWinner ? 'text-green-800' : 'text-red-800'
                }`}>
                  {match.isCaptainTeamWinner ? '🎉 Congratulations! Your team won!' : '😔 Your team lost this match.'}
                </div>
                <div className={`text-sm mt-1 ${
                  match.isCaptainTeamWinner ? 'text-green-600' : 'text-red-600'
                }`}>
                  Winner: {match.result.winnerName}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Match Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Venue Info */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center mb-4">
              <MapPin className="w-5 h-5 text-[#F28C38] mr-2" />
              <h3 className="text-lg font-semibold text-[#4A2F1D]">Venue</h3>
            </div>
            <div>
              <p className="font-medium text-gray-900">{match.venue.name}</p>
              <p className="text-sm text-gray-600 mt-1">{match.venue.address}</p>
            </div>
          </div>

          {/* Tournament Info */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center mb-4">
              <Trophy className="w-5 h-5 text-[#F28C38] mr-2" />
              <h3 className="text-lg font-semibold text-[#4A2F1D]">Tournament</h3>
            </div>
            <div>
              <p className="font-medium text-gray-900">{match.fixtureName}</p>
              <p className="text-sm text-gray-600 mt-1">Round: {match.roundName}</p>
              {match.sportName && (
                <p className="text-sm text-gray-600">{match.sportName} • {match.genderCategory}</p>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center space-x-4">
          <Link
            href={`/${lang}/captain/fixtures/${match.fixtureId}`}
            className="bg-[#F28C38] text-white px-6 py-2 rounded-lg hover:bg-[#E67A26] transition-colors inline-flex items-center"
          >
            <Trophy className="w-4 h-4 mr-2" />
            View Tournament
          </Link>
          <Link
            href={`/${lang}/captain/teams`}
            className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700 transition-colors inline-flex items-center"
          >
            <Users className="w-4 h-4 mr-2" />
            Manage Teams
          </Link>
        </div>
      </div>
    </div>
  );
}