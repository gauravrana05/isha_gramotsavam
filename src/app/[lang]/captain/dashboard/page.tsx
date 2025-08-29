"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/server/trpc/react";
import { useTranslation } from "@/lib/utils/i18n";
import Image from "next/image";
import { Team } from "@/lib/types/teams";
import { 
  Users, 
  Loader2, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  Plus, 
  Eye, 
  Edit,
  Trophy,
  MapPin,
  Phone,
  Calendar,
  UserCheck,
  User, 
  UserRound
} from "lucide-react";

export default function CaptainDashboard() {
  const router = useRouter();
  const { lang } = useParams();
  const { user, userProfile, loading: authLoading } = useAuth();
  const { t } = useTranslation();

  // Use tRPC to fetch teams for the captain
  const teamsQuery = api.teams.getAll.useQuery(
    { 
      page: 1, 
      limit: 50, 
      captainId: user?.id || '' 
    },
    { enabled: !!user?.id }
  );


  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      router.push(`/${lang}/login`);
      return;
    }

    if (!userProfile?.profileComplete) {
      console.log("Thisis user profile" , userProfile);
      router.push(`/${lang}/profile/complete`);
      return;
    }
  }, [user, userProfile, authLoading, router, lang]);

  // Get teams data from tRPC query
  const teams = teamsQuery.data?.teams || [];
  
  // Player counts are now directly available from the API
  const team = teams[0];
  const mainPlayersCount = team?.mainPlayersCount || 0;
  const substitutePlayersCount = team?.substitutePlayersCount || 0;
  const totalPlayersCount = mainPlayersCount + substitutePlayersCount;
 
  if (authLoading || teamsQuery.isLoading) {
    return (
      <div className="lg:min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#F28C38] mx-auto mb-2" />
          <p className="text-gray-600">{t('loading_captain_dashboard', 'Loading Captain Dashboard...')}</p>
        </div>
      </div>
    );
  }

  if (teamsQuery.error) {
    return (
      <div className="lg:min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{t('error', 'Error')}</h1>
          <p className="text-gray-600 mb-4">{teamsQuery.error.message || 'Failed to load dashboard data'}</p>
          <button 
            onClick={() => teamsQuery.refetch()}
            className="bg-[#F28C38] text-white px-6 py-2 rounded-lg hover:bg-[#E67A26] transition-colors"
          >
            {t('retry', 'Retry')}
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
            {t('captain_dashboard', 'Captain Dashboard')}
          </h1>
          <p className="text-gray-600">
            {t('welcome_back_captain', 'Welcome back, {name}! Manage your teams and players.').replace('{name}', userProfile?.firstName || 'Captain')}
          </p>
        </div>

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
                  {teams[0].genderCategory === 'women' ? <UserRound className='w-4 h-4'/> : <User className='w-4 h-4'/>} 
                    {teams[0].genderCategory === 'women' ? t('women', 'Women') : t('men', 'Men')}</span>
                    
                    <span className="flex  items-center gap-1">
                      <Trophy className="w-4 h-4" />
                      {teams[0].sports?.name}
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
                <div className="text-2xl font-bold text-blue-600">{totalPlayersCount}</div>
                <div className="text-sm text-gray-600">{t('players_registered', 'Players Registered')}</div>
              </div>
              <div className="bg-white rounded-lg border p-4 text-center">
                <div className="text-2xl font-bold text-purple-600">{mainPlayersCount}</div>
                <div className="text-sm text-gray-600">{t('main_players', 'Main Players')}</div>
              </div>
              <div className="bg-white rounded-lg border p-4 text-center">
                <div className="text-2xl font-bold text-orange-600">{substitutePlayersCount}</div>
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
            <p className="text-gray-600">{t('no_team_registered_message', "You don&apos;t have any team registered yet.")}</p>
          </div>
        )}
      </div>
    </div>
  );
}
