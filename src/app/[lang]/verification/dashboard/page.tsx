"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase/config";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { useTranslation } from "@/lib/utils/i18n";
import Image from "next/image";
import { Users, Loader2, AlertCircle } from "lucide-react";
import { VerificationDashboard } from "@/components/verification/VerificationDashboard";
import { TeamVerificationCard } from "@/components/verification/TeamVerificationCard";
import Container from "@/components/ui/Container";
import SearchBar from "@/components/common/SearchBar";

interface TeamData {
  id: string;
  teamName: string;
  sport: string;
  captainName: string;
  captainPhone: string;
  panchayat: string;
  district: string;
  state: string;
  playersCount: number;
  maxPlayers: number;
  status: string;
  submittedAt: string;
  gender: string;
}

interface VerificationStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  partialVerification: number;
}

export default function VerificationDashboardPage() {
  const [teams, setTeams] = useState<TeamData[]>([]);
  const [filteredTeams, setFilteredTeams] = useState<TeamData[]>([]);
  const [stats, setStats] = useState<VerificationStats>({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    partialVerification: 0,
  });
  const [loading, setLoading] = useState(true);
  const [currentFilter, setCurrentFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
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

    if (userProfile.role !== 'verification_volunteer' && userProfile.role !== 'admin') {
      router.push(`/${lang}/player/dashboard`);
      return;
    }

    loadTeams();
  }, [user, userProfile, authLoading, router, lang]);

  const loadTeams = async () => {
    try {
      const teamsQuery = query(
        collection(db, "teams"),
        orderBy("submittedAt", "desc")
      );
      
      const querySnapshot = await getDocs(teamsQuery);
      const teamsData: TeamData[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        teamsData.push({
          id: doc.id,
          teamName: data.teamName || '',
          sport: data.sport || '',
          captainName: data.captainName || '',
          captainPhone: data.captainPhone || '',
          panchayat: data.panchayat || '',
          district: data.district || '',
          state: data.state || '',
          playersCount: data.players?.length || 0,
          maxPlayers: data.maxPlayers || 0,
          status: data.status || 'draft',
          submittedAt: data.submittedAt || data.createdAt || '',
          gender: data.gender || '',
        });
      });

      setTeams(teamsData);
      calculateStats(teamsData);
      applyFilters(teamsData, currentFilter, searchQuery);
    } catch (err: any) {
      console.error("Error loading teams:", err);
      setError("Failed to load teams data");
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (teamsData: TeamData[]) => {
    const newStats = {
      total: teamsData.length,
      pending: teamsData.filter(t => t.status === 'submitted' || t.status === 'pending').length,
      approved: teamsData.filter(t => t.status === 'approved' || t.status === 'verified').length,
      rejected: teamsData.filter(t => t.status === 'rejected').length,
      partialVerification: teamsData.filter(t => t.status === 'partial_verification').length,
    };
    setStats(newStats);
  };

  const applyFilters = (teamsData: TeamData[], filter: string, search: string) => {
    let filtered = [...teamsData];

    // Apply status filter
    if (filter !== 'all') {
      switch (filter) {
        case 'pending':
          filtered = filtered.filter(t => t.status === 'submitted' || t.status === 'pending');
          break;
        case 'approved':
          filtered = filtered.filter(t => t.status === 'approved' || t.status === 'verified');
          break;
        case 'rejected':
          filtered = filtered.filter(t => t.status === 'rejected');
          break;
        case 'partial':
          filtered = filtered.filter(t => t.status === 'partial_verification');
          break;
      }
    }

    // Apply search filter
    if (search.trim()) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(t => 
        t.teamName.toLowerCase().includes(searchLower) ||
        t.captainName.toLowerCase().includes(searchLower) ||
        t.panchayat.toLowerCase().includes(searchLower) ||
        t.district.toLowerCase().includes(searchLower) ||
        t.sport.toLowerCase().includes(searchLower)
      );
    }

    setFilteredTeams(filtered);
  };

  const handleFilterChange = (filter: string) => {
    setCurrentFilter(filter);
    applyFilters(teams, filter, searchQuery);
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    applyFilters(teams, currentFilter, query);
  };

  const handleTeamSelect = (teamId: string) => {
    router.push(`/${lang}/verification/teams/${teamId}`);
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#CE4520]" />
      </div>
    );
  }

  if (error || !user || !userProfile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-4">
            {error || "You don't have permission to access this page."}
          </p>
          <button 
            onClick={() => router.push(`/${lang}/player/dashboard`)}
            className="bg-[#CE4520] text-white px-6 py-2 rounded-lg hover:bg-[#1565C0] transition-colors"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Container>
        <div className="py-8">
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
            <h1 className="text-3xl font-semibold font-fira mb-2">
              Team Verification Dashboard
            </h1>
            <p className="text-gray-600 font-fira">
              Review and verify team registrations
            </p>
          </div>

          {/* Dashboard Stats and Filters */}
          <VerificationDashboard
            stats={stats}
            onFilterChange={handleFilterChange}
            currentFilter={currentFilter}
          />

          {/* Search and Controls */}
          <div className="mt-8 mb-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex-1 max-w-md">
                <SearchBar
                  value={searchQuery}
                  onChange={handleSearchChange}
                  placeholder="Search teams, captains, or locations..."
                />
              </div>
              <div className="text-sm text-gray-600 font-fira">
                Showing {filteredTeams.length} of {stats.total} teams
              </div>
            </div>
          </div>

          {/* Teams List */}
          <div className="space-y-4">
            {filteredTeams.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 font-fira mb-2">
                  No teams found
                </h3>
                <p className="text-gray-600 font-fira">
                  {searchQuery || currentFilter !== 'all' 
                    ? "Try adjusting your search or filter criteria."
                    : "No teams have been submitted for verification yet."
                  }
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredTeams.map((team) => (
                  <TeamVerificationCard
                    key={team.id}
                    team={team}
                    onSelect={handleTeamSelect}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </Container>
    </div>
  );
}