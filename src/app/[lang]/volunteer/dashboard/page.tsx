"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { 
  MapPin, 
  Users, 
  Trophy, 
  Calendar, 
  CheckCircle, 
  Clock,
  AlertCircle,
  Loader2,
  Camera
} from 'lucide-react';

interface VenueAssignment {
  id: string;
  name: string;
  location: string;
  assignedRole: 'technical_volunteer' | 'general_volunteer' | 'verification_volunteer';
  teamsCount: number;
  matchesCount: number;
  fixturesCount: number;
}

export default function VolunteerDashboard() {
  const [assignments, setAssignments] = useState<VenueAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const { user, userProfile, loading: authLoading } = useAuth();
  const router = useRouter();
  const { lang } = useParams();

  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      router.push(`/${lang}/login`);
      return;
    }

    if (!['general_volunteer', 'technical_volunteer', 'verification_volunteer'].includes(userProfile?.role || '')) {
      router.push(`/${lang}/player/dashboard`);
      return;
    }

    loadVenueAssignments();
  }, [user, userProfile, authLoading, lang, router]);

  const loadVenueAssignments = async () => {
    try {
      setLoading(true);
      // TODO: Implement API call to get volunteer venue assignments
      // For now, using mock data
      setAssignments([
        {
          id: 'AsyteU6KNh7b9YehSkYy',
          name: 'Main Sports Complex',
          location: 'Block A, Sports Arena',
          assignedRole: userProfile?.role as any || 'technical_volunteer',
          teamsCount: 12,
          matchesCount: 8,
          fixturesCount: 3
        }
      ]);
    } catch (err) {
      console.error('Error loading venue assignments:', err);
      setError('Failed to load venue assignments');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#F28C38] mx-auto mb-4" />
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user || !['general_volunteer', 'technical_volunteer', 'verification_volunteer'].includes(userProfile?.role || '')) {
    return null;
  }

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'technical_volunteer':
        return 'Technical Volunteer';
      case 'general_volunteer':
        return 'General Volunteer';
      case 'verification_volunteer':
        return 'Verification Volunteer';
      default:
        return 'Volunteer';
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'technical_volunteer':
        return 'bg-blue-100 text-blue-800';
      case 'general_volunteer':
        return 'bg-green-100 text-green-800';
      case 'verification_volunteer':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900 mb-2">
          Volunteer Dashboard
        </h1>
        <div className="flex items-center space-x-2">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleColor(userProfile?.role || '')}`}>
            {getRoleDisplayName(userProfile?.role || '')}
          </span>
          <span className="text-gray-600">•</span>
          <span className="text-gray-600">Isha Gramotsavam 2025</span>
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
            <p className="text-red-600">{error}</p>
          </div>
        </div>
      )}

      {/* Venue Assignments */}
      {assignments.length === 0 ? (
        <div className="bg-white rounded-lg border p-8 text-center">
          <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No venue assignments</h3>
          <p className="text-gray-600">You haven&apos;t been assigned to any venues yet. Please contact the admin.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {assignments.map((assignment) => (
            <div key={assignment.id} className="bg-white rounded-lg border shadow-sm overflow-hidden">
              {/* Venue Header */}
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">{assignment.name}</h2>
                    <p className="text-gray-600 mt-1">{assignment.location}</p>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-2 ${getRoleColor(assignment.assignedRole)}`}>
                      {getRoleDisplayName(assignment.assignedRole)}
                    </span>
                  </div>
                  <Link href={`/${lang}/volunteer/venues/${assignment.id}`}>
                    <button className="bg-[#F28C38] text-white px-4 py-2 rounded-lg hover:bg-[#E67A26] transition-colors">
                      Enter Venue
                    </button>
                  </Link>
                </div>
              </div>

              {/* Stats */}
              <div className="p-6">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <Users className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-gray-900">{assignment.teamsCount}</div>
                    <div className="text-sm text-gray-600">Teams</div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <Trophy className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-gray-900">{assignment.fixturesCount}</div>
                    <div className="text-sm text-gray-600">Fixtures</div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <Calendar className="w-8 h-8 text-green-600 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-gray-900">{assignment.matchesCount}</div>
                    <div className="text-sm text-gray-600">Matches</div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <CheckCircle className="w-8 h-8 text-orange-600 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-gray-900">-</div>
                    <div className="text-sm text-gray-600">Status</div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <Link href={`/${lang}/volunteer/venues/${assignment.id}/teams`}>
                    <button className="w-full p-3 text-left bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-lg hover:from-blue-100 hover:to-blue-200 transition-all">
                      <div className="flex items-center">
                        <Users className="w-6 h-6 text-blue-600 mr-3" />
                        <div>
                          <div className="font-medium text-blue-700">Teams</div>
                          <div className="text-xs text-blue-600">Manage & Verify</div>
                        </div>
                      </div>
                    </button>
                  </Link>

                  <Link href={`/${lang}/volunteer/venues/${assignment.id}/fixtures`}>
                    <button className="w-full p-3 text-left bg-gradient-to-r from-purple-50 to-purple-100 border border-purple-200 rounded-lg hover:from-purple-100 hover:to-purple-200 transition-all">
                      <div className="flex items-center">
                        <Trophy className="w-6 h-6 text-purple-600 mr-3" />
                        <div>
                          <div className="font-medium text-purple-700">Fixtures</div>
                          <div className="text-xs text-purple-600">Tournament Brackets</div>
                        </div>
                      </div>
                    </button>
                  </Link>

                  <Link href={`/${lang}/volunteer/venues/${assignment.id}/matches`}>
                    <button className="w-full p-3 text-left bg-gradient-to-r from-green-50 to-green-100 border border-green-200 rounded-lg hover:from-green-100 hover:to-green-200 transition-all">
                      <div className="flex items-center">
                        <Calendar className="w-6 h-6 text-green-600 mr-3" />
                        <div>
                          <div className="font-medium text-green-700">Matches</div>
                          <div className="text-xs text-green-600">Live Scoring</div>
                        </div>
                      </div>
                    </button>
                  </Link>

                  <Link href={`/${lang}/volunteer/venues/${assignment.id}/media`}>
                    <button className="w-full p-3 text-left bg-gradient-to-r from-orange-50 to-orange-100 border border-orange-200 rounded-lg hover:from-orange-100 hover:to-orange-200 transition-all">
                      <div className="flex items-center">
                        <Camera className="w-6 h-6 text-orange-600 mr-3" />
                        <div>
                          <div className="font-medium text-orange-700">Media</div>
                          <div className="text-xs text-orange-600">Photos & Videos</div>
                        </div>
                      </div>
                    </button>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Recent Activity */}
      <div className="mt-8 bg-white rounded-lg border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
        <div className="space-y-3">
          <div className="flex items-center p-3 bg-gray-50 rounded-lg">
            <Clock className="w-5 h-5 text-gray-400 mr-3" />
            <div className="flex-1">
              <p className="text-sm text-gray-600">No recent activity</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
