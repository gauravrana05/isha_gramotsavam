"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { getVolunteerAssignments } from '@/lib/actions/admin/volunteerAssignment';
import { 
  MapPin, 
  Users, 
  Trophy, 
  Calendar, 
  CheckCircle, 
  Clock,
  AlertCircle,
  Loader2,
  Camera,
  Building,
  Tag
} from 'lucide-react';

interface VenueAssignment {
  id: string;
  assignmentId: string;
  volunteerId: string;
  volunteerName: string;
  volunteerType: string;
  venueId: string;
  venueName: string;
  venueAddress: string;
  venueDistrict: string;
  venueType: string;
  supportedSports: string[];
  status: string;
  assignedAt: string | null;
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
      
      if (!user?.uid) {
        setAssignments([]);
        return;
      }

      const result = await getVolunteerAssignments(user.uid);
      
      if (result.success) {
        setAssignments(result.assignments || []);
        setError('');
      } else {
        setError(result.error || 'Failed to load venue assignments');
        setAssignments([]);
      }
    } catch (err) {
      // Error handling removed
      setError('Failed to load venue assignments');
      setAssignments([]);
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
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h2 className="text-xl font-semibold text-gray-900">{assignment.venueName}</h2>
                        <div className="flex items-center mt-2 text-sm text-gray-600">
                          <MapPin className="w-4 h-4 mr-1" />
                          <span>{assignment.venueAddress}</span>
                          {assignment.venueDistrict && (
                            <>
                              <span className="mx-2">•</span>
                              <span>{assignment.venueDistrict}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 items-end">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleColor(assignment.volunteerType === 'technical' ? 'technical_volunteer' : assignment.volunteerType === 'general' ? 'general_volunteer' : 'verification_volunteer')}`}>
                          {assignment.volunteerType === 'technical' ? 'Technical Volunteer' : assignment.volunteerType === 'general' ? 'General Volunteer' : 'Verification Volunteer'}
                        </span>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize">
                          <Building className="w-3 h-3 mr-1" />
                          {assignment.venueType}
                        </span>
                      </div>
                    </div>

                    {/* Supported Sports */}
                    {assignment.supportedSports.length > 0 && (
                      <div className="mb-4">
                        <div className="flex items-center mb-2">
                          <Trophy className="w-4 h-4 text-[#3A7F3F] mr-1" />
                          <span className="text-sm font-medium text-gray-700">Supported Sports:</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {assignment.supportedSports.map((sport, index) => (
                            <span key={index} className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                              <Tag className="w-3 h-3 mr-1" />
                              {sport}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Enter Venue Button */}
                <div className="mt-4">
                  <Link href={`/${lang}/volunteer/venues/${assignment.venueId}`}>
                    <button className="bg-[#F28C38] text-white px-6 py-2 rounded-lg hover:bg-[#E67A26] transition-colors">
                      Enter Venue
                    </button>
                  </Link>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <Link href={`/${lang}/volunteer/venues/${assignment.venueId}/teams`}>
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

                  <Link href={`/${lang}/volunteer/venues/${assignment.venueId}/fixtures`}>
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

                  <Link href={`/${lang}/volunteer/venues/${assignment.venueId}/matches`}>
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

                  <Link href={`/${lang}/volunteer/venues/${assignment.venueId}/media`}>
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
