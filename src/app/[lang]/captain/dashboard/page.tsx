"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase/config";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
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

interface TeamData {
  id: string;
  name: string;
  sportId: string;
  captainName: string;
  captainPhone: string;
  panchayat: string;
  district: string;
  state: string;
  players: number;
  maxPlayers: number;
  currentPlayers: number;
  status: string;
  submittedAt: string;
  createdAt: string;
  gender: string;
  eventId: string;
  sportName: string;
}


export default function CaptainDashboard() {
  const [teams, setTeams] = useState<TeamData[]>([]);

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
      router.push(`/${lang}/complete-profile`);
      return;
    }

    loadCaptainData();
  }, [user, userProfile, authLoading, router, lang]);

  const loadCaptainData = async () => {
    if (!user) return;

    try {
      // Load teams where current user is the captain
      const teamsQuery = query(
        collection(db, "teams"),
        where("captainId", "==", user.uid)
      );
      
      const querySnapshot = await getDocs(teamsQuery);
      const teamsData: TeamData[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        teamsData.push({
          id: doc.id,
          name: data.name || '',
          sportId: data.sportId || data.sport || '',
          captainName: data.captainName || '',
          captainPhone: data.captainPhone || '',
          panchayat: data.panchayat || '',
          district: data.district || '',
          state: data.state || '',
          players: data.players?.length || 0,
          maxPlayers: data.maxPlayers || 12,
          currentPlayers: data.currentPlayers,
          status: data.status || 'draft',
          submittedAt: data.submittedAt || '',
          createdAt: data.createdAt || '',
          gender: data.gender || 'M',
          eventId: data.eventId || 'gramotsavam_2025',
          sportName: data.sportName
        });
      });

      setTeams(teamsData);
      
      
    } catch (err: any) {
      console.error("Error loading captain data:", err);
      setError("Failed to load dashboard data");
    } finally {
      setLoading(false);
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
            Captain Dashboard
          </h1>
          <p className="text-gray-600">
            Welcome back, {userProfile?.firstName || 'Captain'}! Manage your teams and players.
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
                  {teams[0].gender === 'F' ? <UserRound className='w-4 h-4'/> : <User className='w-4 h-4'/>} 
                    {teams[0].gender === 'F' ? 'Women' : 'Men'}</span>
                    
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
                  teams[0].status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {teams[0].status.charAt(0).toUpperCase() + teams[0].status.slice(1)}
                </div>
              </div>
            </div>

            {/* Team Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg border p-4 text-center">
                <div className="text-2xl font-bold text-blue-600">{teams[0].currentPlayers || 0}</div>
                <div className="text-sm text-gray-600">Players Registered</div>
              </div>
              <div className="bg-white rounded-lg border p-4 text-center">
                <div className="text-2xl font-bold text-purple-600">{teams[0].maxPlayers}</div>
                <div className="text-sm text-gray-600">Main Players</div>
              </div>
              <div className="bg-white rounded-lg border p-4 text-center">
                <div className="text-2xl font-bold text-orange-600">🏟️</div>
                <div className="text-sm text-gray-600">Venue TBD</div>
              </div>
              <div className="bg-white rounded-lg border p-4 text-center">
                <div className="text-2xl font-bold text-green-600">📅</div>
                <div className="text-sm text-gray-600">Fixtures Soon</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg border p-8 text-center">
            <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Team Found</h3>
            <p className="text-gray-600">You don&apos;t have any team registered yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
