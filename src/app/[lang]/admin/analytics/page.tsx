"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  BarChart3,
  TrendingUp,
  Users,
  Trophy,
  Calendar,
  MapPin,
  Download,
  RefreshCw,
  Activity,
  Eye,
  UserCheck,
  Clock,
  Target,
  Award,
  Zap
} from 'lucide-react';
import Button from '@/components/ui/Button';

interface AnalyticsData {
  overview: {
    totalUsers: number;
    totalTeams: number;
    totalRegistrations: number;
    totalEvents: number;
    growthRate: number;
    activeUsers: number;
  };
  registrationTrends: {
    date: string;
    registrations: number;
    teams: number;
  }[];
  sportPopularity: {
    sport: string;
    teams: number;
    players: number;
    percentage: number;
  }[];
  userEngagement: {
    dailyActive: number;
    weeklyActive: number;
    monthlyActive: number;
    averageSessionTime: number;
    bounceRate: number;
    returnRate: number;
  };
  geographicDistribution: {
    state: string;
    users: number;
    teams: number;
    percentage: number;
  }[];
  verificationMetrics: {
    pendingVerifications: number;
    completedVerifications: number;
    rejectedVerifications: number;
    averageVerificationTime: number;
  };
  systemPerformance: {
    serverUptime: number;
    responseTime: number;
    errorRate: number;
    dbQueries: number;
  };
}

export default function AnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('7d');
  const [refreshing, setRefreshing] = useState(false);

  const { lang } = useParams();
  const router = useRouter();

  useEffect(() => {
    loadAnalyticsData();
  }, [dateRange]);

  const loadAnalyticsData = async () => {
    try {
      setLoading(true);
      // Simulate API call - replace with actual data fetching
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const mockData: AnalyticsData = {
        overview: {
          totalUsers: 1247,
          totalTeams: 156,
          totalRegistrations: 1403,
          totalEvents: 3,
          growthRate: 12.5,
          activeUsers: 892
        },
        registrationTrends: [
          { date: '2025-01-24', registrations: 45, teams: 8 },
          { date: '2025-01-25', registrations: 62, teams: 12 },
          { date: '2025-01-26', registrations: 38, teams: 6 },
          { date: '2025-01-27', registrations: 71, teams: 14 },
          { date: '2025-01-28', registrations: 54, teams: 9 },
          { date: '2025-01-29', registrations: 89, teams: 18 },
          { date: '2025-01-30', registrations: 67, teams: 11 }
        ],
        sportPopularity: [
          { sport: 'Volleyball', teams: 89, players: 712, percentage: 57.1 },
          { sport: 'Throwball', teams: 67, players: 536, percentage: 42.9 }
        ],
        userEngagement: {
          dailyActive: 245,
          weeklyActive: 567,
          monthlyActive: 892,
          averageSessionTime: 18.5,
          bounceRate: 23.4,
          returnRate: 76.6
        },
        geographicDistribution: [
          { state: 'Tamil Nadu', users: 678, teams: 89, percentage: 54.4 },
          { state: 'Karnataka', users: 234, teams: 31, percentage: 18.8 },
          { state: 'Andhra Pradesh', users: 156, teams: 21, percentage: 12.5 },
          { state: 'Kerala', users: 123, teams: 15, percentage: 9.9 },
          { state: 'Others', users: 56, teams: 0, percentage: 4.4 }
        ],
        verificationMetrics: {
          pendingVerifications: 23,
          completedVerifications: 134,
          rejectedVerifications: 8,
          averageVerificationTime: 2.3
        },
        systemPerformance: {
          serverUptime: 99.8,
          responseTime: 245,
          errorRate: 0.12,
          dbQueries: 15678
        }
      };

      setData(mockData);
    } catch (error) {
      console.error('Error loading analytics data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const refreshData = async () => {
    setRefreshing(true);
    await loadAnalyticsData();
  };

  const exportAnalytics = () => {
    if (!data) return;
    
    const reportData = {
      generatedAt: new Date().toISOString(),
      dateRange,
      overview: data.overview,
      sportPopularity: data.sportPopularity,
      geographicDistribution: data.geographicDistribution,
      verificationMetrics: data.verificationMetrics
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-report-${dateRange}-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    window.URL.revokeObjectURL(url);
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

  if (!data) {
    return (
      <div className="p-8 text-center">
        <Activity className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Unable to load analytics</h3>
        <p className="text-gray-600 mb-6">There was an error loading the analytics data.</p>
        <Button onClick={loadAnalyticsData} className="bg-[#3A7F3F] hover:bg-green-700">
          <RefreshCw className="w-4 h-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics & Reports</h1>
          <p className="text-gray-600 mt-2">Comprehensive insights and performance metrics</p>
        </div>
        
        <div className="mt-4 sm:mt-0 flex gap-3">
          <div className="relative">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-8 focus:ring-2 focus:ring-[#F28C38] focus:border-transparent"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="1y">Last year</option>
            </select>
          </div>
          
          <Button
            onClick={exportAnalytics}
            variant="outline"
            className="flex items-center"
          >
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
          
          <Button
            onClick={refreshData}
            disabled={refreshing}
            className="bg-[#3A7F3F] hover:bg-green-700 flex items-center"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Users</p>
              <p className="text-2xl font-bold text-gray-900">{data.overview.totalUsers.toLocaleString()}</p>
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
            <span className="text-green-600">+{data.overview.growthRate}%</span>
            <span className="text-gray-500 ml-2">vs last period</span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <Trophy className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Teams</p>
              <p className="text-2xl font-bold text-gray-900">{data.overview.totalTeams}</p>
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <Activity className="w-4 h-4 text-blue-500 mr-1" />
            <span className="text-blue-600">{data.overview.activeUsers} active</span>
            <span className="text-gray-500 ml-2">players</span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <UserCheck className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Registrations</p>
              <p className="text-2xl font-bold text-gray-900">{data.overview.totalRegistrations.toLocaleString()}</p>
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <Clock className="w-4 h-4 text-yellow-500 mr-1" />
            <span className="text-yellow-600">{data.verificationMetrics.pendingVerifications} pending</span>
            <span className="text-gray-500 ml-2">verification</span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Calendar className="w-6 h-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Events</p>
              <p className="text-2xl font-bold text-gray-900">{data.overview.totalEvents}</p>
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <Target className="w-4 h-4 text-green-500 mr-1" />
            <span className="text-green-600">All active</span>
            <span className="text-gray-500 ml-2">and running</span>
          </div>
        </div>
      </div>

      {/* Main Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Registration Trends */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Registration Trends</h3>
            <Button
              onClick={() => router.push(`/${lang}/admin/analytics/reports/registrations`)}
              variant="outline"
              className="text-xs py-1 px-3"
            >
              <Eye className="w-3 h-3 mr-1" />
              View Details
            </Button>
          </div>
          
          <div className="space-y-4">
            {data.registrationTrends.slice(-5).map((trend, index) => (
              <div key={trend.date} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="text-sm font-medium text-gray-900">
                    {new Date(trend.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-sm text-gray-600">{trend.registrations} users</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm text-gray-600">{trend.teams} teams</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-900">{trend.registrations}</div>
                  <div className="w-24 bg-gray-200 rounded-full h-2 mt-1">
                    <div 
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(trend.registrations / 100) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sport Popularity */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Sport Popularity</h3>
            <Button
              onClick={() => router.push(`/${lang}/admin/analytics/reports/participation`)}
              variant="outline"
              className="text-xs py-1 px-3"
            >
              <Eye className="w-3 h-3 mr-1" />
              View Details
            </Button>
          </div>
          
          <div className="space-y-6">
            {data.sportPopularity.map((sport, index) => (
              <div key={sport.sport}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-3">
                    <Trophy className="w-5 h-5 text-orange-500" />
                    <span className="font-medium text-gray-900">{sport.sport}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-900">{sport.teams} teams</div>
                    <div className="text-xs text-gray-600">{sport.players} players</div>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className={`h-3 rounded-full transition-all duration-500 ${
                      index === 0 ? 'bg-blue-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${sport.percentage}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-xs text-gray-600 mt-1">
                  <span>{sport.percentage}% of total</span>
                  <span>{sport.players} participants</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* User Engagement */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">User Engagement</h3>
            <Button
              onClick={() => router.push(`/${lang}/admin/analytics/reports/engagement`)}
              variant="outline"
              className="text-xs py-1 px-3"
            >
              <Eye className="w-3 h-3 mr-1" />
              View Details
            </Button>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{data.userEngagement.dailyActive}</div>
              <div className="text-sm text-gray-600">Daily Active</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{data.userEngagement.weeklyActive}</div>
              <div className="text-sm text-gray-600">Weekly Active</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{data.userEngagement.averageSessionTime}m</div>
              <div className="text-sm text-gray-600">Avg Session</div>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">{data.userEngagement.returnRate}%</div>
              <div className="text-sm text-gray-600">Return Rate</div>
            </div>
          </div>
        </div>

        {/* Geographic Distribution */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Geographic Distribution</h3>
            <Button
              variant="outline"
              className="text-xs py-1 px-3"
            >
              <MapPin className="w-3 h-3 mr-1" />
              View Map
            </Button>
          </div>
          
          <div className="space-y-4">
            {data.geographicDistribution.map((location, index) => (
              <div key={location.state} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${
                    index === 0 ? 'bg-blue-500' : 
                    index === 1 ? 'bg-green-500' : 
                    index === 2 ? 'bg-yellow-500' : 
                    index === 3 ? 'bg-purple-500' : 'bg-gray-500'
                  }`}></div>
                  <span className="font-medium text-gray-900">{location.state}</span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-900">{location.users} users</div>
                  <div className="text-xs text-gray-600">{location.teams} teams</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* System Performance & Verification Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Verification Metrics */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Verification Metrics</h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Clock className="w-4 h-4 text-yellow-600" />
                </div>
                <span className="text-gray-700">Pending Verifications</span>
              </div>
              <span className="text-xl font-bold text-yellow-600">{data.verificationMetrics.pendingVerifications}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <UserCheck className="w-4 h-4 text-green-600" />
                </div>
                <span className="text-gray-700">Completed</span>
              </div>
              <span className="text-xl font-bold text-green-600">{data.verificationMetrics.completedVerifications}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <XCircle className="w-4 h-4 text-red-600" />
                </div>
                <span className="text-gray-700">Rejected</span>
              </div>
              <span className="text-xl font-bold text-red-600">{data.verificationMetrics.rejectedVerifications}</span>
            </div>
            
            <div className="pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Average Verification Time</span>
                <span className="text-sm font-medium text-gray-900">{data.verificationMetrics.averageVerificationTime} days</span>
              </div>
            </div>
          </div>
        </div>

        {/* System Performance */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">System Performance</h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Zap className="w-4 h-4 text-green-600" />
                </div>
                <span className="text-gray-700">Server Uptime</span>
              </div>
              <span className="text-xl font-bold text-green-600">{data.systemPerformance.serverUptime}%</span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Activity className="w-4 h-4 text-blue-600" />
                </div>
                <span className="text-gray-700">Response Time</span>
              </div>
              <span className="text-xl font-bold text-blue-600">{data.systemPerformance.responseTime}ms</span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-red-600" />
                </div>
                <span className="text-gray-700">Error Rate</span>
              </div>
              <span className="text-xl font-bold text-red-600">{data.systemPerformance.errorRate}%</span>
            </div>
            
            <div className="pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">DB Queries Today</span>
                <span className="text-sm font-medium text-gray-900">{data.systemPerformance.dbQueries.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
