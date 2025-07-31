"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { 
  Users, 
  Trophy, 
  MapPin, 
  Calendar,
  UserCheck,
  Shield,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  BarChart3,
  Activity
} from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

interface DashboardStats {
  totalUsers: number;
  totalTeams: number;
  totalSports: number;
  totalVenues: number;
  pendingVerifications: number;
  activeVolunteers: number;
  todayRegistrations: number;
  systemHealth: 'healthy' | 'warning' | 'error';
}

interface QuickAction {
  title: string;
  description: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

interface RecentActivity {
  id: string;
  type: 'registration' | 'verification' | 'system';
  title: string;
  description: string;
  timestamp: Date;
  status: 'success' | 'warning' | 'error';
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalTeams: 0,
    totalSports: 0,
    totalVenues: 0,
    pendingVerifications: 0,
    activeVolunteers: 0,
    todayRegistrations: 0,
    systemHealth: 'healthy'
  });
  const [loading, setLoading] = useState(true);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);

  const { userProfile } = useAuth();
  const { lang } = useParams();

  const quickActions: QuickAction[] = [
    {
      title: 'Create New Sport',
      description: 'Add a new sport to the system',
      href: `/${lang}/admin/sports/create`,
      icon: Trophy,
      color: 'bg-blue-500 hover:bg-blue-600'
    },
    {
      title: 'Add Venue',
      description: 'Register a new venue',
      href: `/${lang}/admin/venues/create`,
      icon: MapPin,
      color: 'bg-green-500 hover:bg-green-600'
    },
    {
      title: 'Manage Users',
      description: 'View and manage user accounts',
      href: `/${lang}/admin/users`,
      icon: Users,
      color: 'bg-purple-500 hover:bg-purple-600'
    },
    {
      title: 'Team Verification',
      description: 'Review pending team verifications',
      href: `/${lang}/admin/teams/verification`,
      icon: UserCheck,
      color: 'bg-orange-500 hover:bg-orange-600'
    },
    {
      title: 'View Reports',
      description: 'Access analytics and reports',
      href: `/${lang}/admin/reports`,
      icon: BarChart3,
      color: 'bg-indigo-500 hover:bg-indigo-600'
    },
    {
      title: 'System Settings',
      description: 'Configure system parameters',
      href: `/${lang}/admin/system/config`,
      icon: Shield,
      color: 'bg-gray-500 hover:bg-gray-600'
    }
  ];

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      // Simulate API calls - replace with actual data fetching
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setStats({
        totalUsers: 1247,
        totalTeams: 156,
        totalSports: 2,
        totalVenues: 8,
        pendingVerifications: 23,
        activeVolunteers: 45,
        todayRegistrations: 12,
        systemHealth: 'healthy'
      });

      setRecentActivity([
        {
          id: '1',
          type: 'registration',
          title: 'New Team Registration',
          description: 'Team "Thunder Bolts" registered for Volleyball',
          timestamp: new Date(Date.now() - 30 * 60 * 1000),
          status: 'success'
        },
        {
          id: '2',
          type: 'verification',
          title: 'Team Verified',
          description: 'Team "Lightning Strikers" verification completed',
          timestamp: new Date(Date.now() - 45 * 60 * 1000),
          status: 'success'
        },
        {
          id: '3',
          type: 'system',
          title: 'Database Backup',
          description: 'Scheduled backup completed successfully',
          timestamp: new Date(Date.now() - 60 * 60 * 1000),
          status: 'success'
        },
        {
          id: '4',
          type: 'verification',
          title: 'Verification Pending',
          description: '5 teams awaiting document verification',
          timestamp: new Date(Date.now() - 90 * 60 * 1000),
          status: 'warning'
        }
      ]);

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (type: string, status: string) => {
    if (status === 'error') return <AlertCircle className="w-4 h-4 text-red-500" />;
    if (status === 'warning') return <Clock className="w-4 h-4 text-yellow-500" />;
    
    switch (type) {
      case 'registration':
        return <Users className="w-4 h-4 text-blue-500" />;
      case 'verification':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'system':
        return <Activity className="w-4 h-4 text-gray-500" />;
      default:
        return <CheckCircle className="w-4 h-4 text-green-500" />;
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - timestamp.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    
    if (diffMins < 60) {
      return `${diffMins} minutes ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hours ago`;
    } else {
      return timestamp.toLocaleDateString();
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-8">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="h-96 bg-gray-200 rounded-lg"></div>
            <div className="h-96 bg-gray-200 rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome back, {userProfile?.firstName}!
        </h1>
        <p className="text-gray-600 mt-2">
          Here's what's happening with Isha Gramotsavam today.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Users</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalUsers.toLocaleString()}</p>
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
            <span className="text-green-600">+12%</span>
            <span className="text-gray-500 ml-2">from last week</span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <Users className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Teams</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalTeams}</p>
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
            <span className="text-green-600">+8%</span>
            <span className="text-gray-500 ml-2">from last week</span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <UserCheck className="w-6 h-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pending Verifications</p>
              <p className="text-2xl font-bold text-gray-900">{stats.pendingVerifications}</p>
            </div>
          </div>
          <div className="mt-4">
            <Link 
              href={`/${lang}/admin/teams/verification`}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Review pending →
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Activity className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Today's Registrations</p>
              <p className="text-2xl font-bold text-gray-900">{stats.todayRegistrations}</p>
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <CheckCircle className="w-4 h-4 text-green-500 mr-1" />
            <span className="text-gray-500">All systems operational</span>
          </div>
        </div>
      </div>

      {/* Quick Actions and Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {quickActions.map((action, index) => (
              <Link
                key={index}
                href={action.href}
                className={`p-4 rounded-lg text-white transition-colors ${action.color}`}
              >
                <action.icon className="w-6 h-6 mb-2" />
                <h3 className="font-medium mb-1">{action.title}</h3>
                <p className="text-sm opacity-90">{action.description}</p>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
          <div className="space-y-4">
            {recentActivity.map((activity) => (
              <div key={activity.id} className="flex items-start space-x-3">
                <div className="flex-shrink-0 mt-0.5">
                  {getActivityIcon(activity.type, activity.status)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                  <p className="text-sm text-gray-600">{activity.description}</p>
                  <p className="text-xs text-gray-500 mt-1">{formatTimestamp(activity.timestamp)}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 pt-4 border-t border-gray-200">
            <Link
              href={`/${lang}/admin/system/audit-logs`}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              View all activity →
            </Link>
          </div>
        </div>
      </div>

      {/* System Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Sports Available</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalSports}</p>
            </div>
            <Trophy className="w-8 h-8 text-gray-400" />
          </div>
          <div className="mt-4">
            <Link
              href={`/${lang}/admin/sports`}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Manage sports →
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Venues</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalVenues}</p>
            </div>
            <MapPin className="w-8 h-8 text-gray-400" />
          </div>
          <div className="mt-4">
            <Link
              href={`/${lang}/admin/venues`}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Manage venues →
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Volunteers</p>
              <p className="text-2xl font-bold text-gray-900">{stats.activeVolunteers}</p>
            </div>
            <UserCheck className="w-8 h-8 text-gray-400" />
          </div>
          <div className="mt-4">
            <Link
              href={`/${lang}/admin/volunteers`}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Manage volunteers →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}