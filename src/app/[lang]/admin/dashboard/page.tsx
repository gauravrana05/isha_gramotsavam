"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase/config';
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { 
  Users, 
  Trophy, 
  MapPin,
  UserCheck,
  CheckCircle,
  Clock,
  Activity,
  Loader2
} from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';

interface DashboardStats {
  totalUsers: number;
  totalTeams: number;
  totalSports: number;
  totalVenues: number;
  pendingVerifications: number;
  completedVerifications: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalTeams: 0,
    totalSports: 0,
    totalVenues: 0,
    pendingVerifications: 0,
    completedVerifications: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const { user, userProfile, loading: authLoading } = useAuth();
  const { lang } = useParams();
  const router = useRouter();


  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      router.push(`/${lang}/login`);
      return;
    }

    if (userProfile?.role !== 'admin') {
      router.push(`/${lang}/player/dashboard`);
      return;
    }

    loadDashboardData();
  }, [user, userProfile, authLoading, lang, router]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Load users count
      const usersCollection = collection(db, 'users');
      const usersSnapshot = await getDocs(usersCollection);
      const totalUsers = usersSnapshot.size;
      
      // Load teams count and verification status
      const teamsCollection = collection(db, 'teams');
      const teamsSnapshot = await getDocs(teamsCollection);
      const totalTeams = teamsSnapshot.size;
      
      let pendingVerifications = 0;
      let completedVerifications = 0;
      
      teamsSnapshot.docs.forEach(doc => {
        const team = doc.data();
        if (team.status === 'submitted' || team.status === 'pending') {
          pendingVerifications++;
        } else if (team.status === 'verified') {
          completedVerifications++;
        }
      });
      
      // Load sports count
      const sportsCollection = collection(db, 'sports');
      const sportsSnapshot = await getDocs(sportsCollection);
      const totalSports = sportsSnapshot.size;
      
      // Load venues count
      const venuesCollection = collection(db, 'venues');
      const venuesSnapshot = await getDocs(venuesCollection);
      const totalVenues = venuesSnapshot.size;
      
      setStats({
        totalUsers,
        totalTeams,
        totalSports,
        totalVenues,
        pendingVerifications,
        completedVerifications
      });
      
    } catch (err: any) {
      console.error('Error loading dashboard data:', err);
      setError('Failed to load dashboard data. Please check your permissions.');
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
          <div className="text-red-500 mb-4">
            <Activity className="w-16 h-16 mx-auto" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Error Loading Dashboard</h1>
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-semibold font-fira mb-2 text-[#4A2F1D]">
            Admin Dashboard
          </h1>
          <p className="text-sm sm:text-base text-gray-600 font-fira">
            Welcome back, {userProfile?.firstName}! Here's your system overview.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Total Users</p>
                <p className="text-2xl font-bold text-[#4A2F1D]">{stats.totalUsers}</p>
              </div>
              <Users className="w-8 h-8 text-gray-400" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Total Teams</p>
                <p className="text-2xl font-bold text-[#4A2F1D]">{stats.totalTeams}</p>
              </div>
              <Users className="w-8 h-8 text-gray-400" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Pending Verifications</p>
                <p className="text-2xl font-bold text-orange-600">{stats.pendingVerifications}</p>
              </div>
              <Clock className="w-8 h-8 text-orange-400" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Verified Teams</p>
                <p className="text-2xl font-bold text-green-600">{stats.completedVerifications}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Sports</p>
                <p className="text-2xl font-bold text-blue-600">{stats.totalSports}</p>
              </div>
              <Trophy className="w-8 h-8 text-blue-400" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Venues</p>
                <p className="text-2xl font-bold text-purple-600">{stats.totalVenues}</p>
              </div>
              <MapPin className="w-8 h-8 text-purple-400" />
            </div>
          </div>
        </div>

        {/* Quick Access */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-lg font-semibold text-gray-900 font-fira mb-4">Quick Access</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link
              href={`/${lang}/admin/sports`}
              className="p-4 border border-gray-200 rounded-lg hover:border-[#F28C38] hover:bg-orange-50 transition-colors group"
            >
              <Trophy className="w-6 h-6 text-gray-400 group-hover:text-[#F28C38] mb-2" />
              <h3 className="font-medium text-gray-900 group-hover:text-[#F28C38]">Sports</h3>
              <p className="text-sm text-gray-600">Manage sports</p>
            </Link>
            
            <Link
              href={`/${lang}/admin/venues`}
              className="p-4 border border-gray-200 rounded-lg hover:border-[#F28C38] hover:bg-orange-50 transition-colors group"
            >
              <MapPin className="w-6 h-6 text-gray-400 group-hover:text-[#F28C38] mb-2" />
              <h3 className="font-medium text-gray-900 group-hover:text-[#F28C38]">Venues</h3>
              <p className="text-sm text-gray-600">Manage venues</p>
            </Link>
            
            <Link
              href={`/${lang}/admin/teams`}
              className="p-4 border border-gray-200 rounded-lg hover:border-[#F28C38] hover:bg-orange-50 transition-colors group"
            >
              <Users className="w-6 h-6 text-gray-400 group-hover:text-[#F28C38] mb-2" />
              <h3 className="font-medium text-gray-900 group-hover:text-[#F28C38]">Teams</h3>
              <p className="text-sm text-gray-600">View teams</p>
            </Link>
            
            <Link
              href={`/${lang}/admin/users`}
              className="p-4 border border-gray-200 rounded-lg hover:border-[#F28C38] hover:bg-orange-50 transition-colors group"
            >
              <UserCheck className="w-6 h-6 text-gray-400 group-hover:text-[#F28C38] mb-2" />
              <h3 className="font-medium text-gray-900 group-hover:text-[#F28C38]">Users</h3>
              <p className="text-sm text-gray-600">Manage users</p>
            </Link>
          </div>
        </div>
        
        {/* System Status */}
        {stats.pendingVerifications > 0 && (
          <div className="mt-6 bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="flex items-center">
              <Clock className="w-5 h-5 text-orange-500 mr-3" />
              <div>
                <h3 className="text-sm font-medium text-orange-800">
                  {stats.pendingVerifications} teams awaiting verification
                </h3>
                <p className="text-sm text-orange-700 mt-1">
                  Review pending team verifications to keep the system up to date.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}