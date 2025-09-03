'use client';

import { use } from 'react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/server/trpc/react';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/lib/utils/i18n';
import { 
  MapPin, 
  Clock, 
  Users, 
  Trophy, 
  Calendar,
  Phone,
  Mail,
  Globe,
  Star,
  Info,
  Loader2
} from 'lucide-react';

interface PageProps {
  params: Promise<{
    venueId: string;
    lang: string;
  }>;
}

export default function VenueDetailsPage({ params }: PageProps) {
  const { venueId, lang } = use(params);
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { t } = useTranslation();

  // Check if user is a volunteer
  const isVolunteer = user && ['general_volunteer', 'technical_volunteer', 'verification_volunteer'].includes(user.role);

  // Auth check - redirect if not loading and not authorized
  if (!authLoading && (!user || !isVolunteer)) {
    router.replace(`/${lang}/login`);
    return null;
  }

  // Fetch venue data - only when authenticated as volunteer
  const { 
    data: venueData, 
    isLoading: venueLoading,
    error: venueError 
  } = api.volunteers.venue.getVenueDetails.useQuery(
    { venueId },
    { enabled: !authLoading && !!venueId && !!isVolunteer }
  );

  // Fetch venue stats - only when authenticated as volunteer
  const { 
    data: venueStats,
    isLoading: statsLoading 
  } = api.volunteers.venue.getVenueStats.useQuery(
    { venueId },
    { enabled: !authLoading && !!venueId && !!isVolunteer }
  );

  // Show loading for auth or data loading
  if (authLoading || venueLoading || statsLoading) {
    return (
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-[#F28C38]" />
        </div>
      </div>
    );
  }

  if (venueError) {
    return (
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">Error Loading Venue</h1>
          <p className="mt-2 text-gray-600">{venueError.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center mb-2">
          <MapPin className="w-6 h-6 text-[#F28C38] mr-2" />
          <h1 className="text-3xl font-bold text-gray-900">
            {venueData?.name || 'Venue Details'}
          </h1>
        </div>
        <p className="text-lg text-gray-600">
          Venue information and management overview
        </p>
      </div>

      {/* Venue Information Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Basic Information */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <Info className="w-5 h-5 mr-2 text-[#F28C38]" />
            Basic Information
          </h2>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Venue Name</label>
              <p className="text-lg font-medium text-gray-900">
                {venueData?.name || 'N/A'}
              </p>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-500">Address</label>
              <p className="text-gray-700">
                {venueData?.address || 'Address not available'}
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-500">City</label>
              <p className="text-gray-700">
                {venueData?.city || 'N/A'}
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-500">State</label>
              <p className="text-gray-700">
                {venueData?.state || 'N/A'}
              </p>
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <Phone className="w-5 h-5 mr-2 text-[#F28C38]" />
            Contact Information
          </h2>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Coordinator</label>
              <p className="text-lg font-medium text-gray-900">
                {venueData?.coordinator || 'Not assigned'}
              </p>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-500">Phone</label>
              <p className="text-gray-700">
                {venueData?.phone || 'Not available'}
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-500">Email</label>
              <p className="text-gray-700">
                {venueData?.email || 'Not available'}
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-500">Capacity</label>
              <p className="text-gray-700">
                {venueData?.capacity ? `${venueData.capacity} people` : 'Not specified'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Teams</p>
              <p className="text-2xl font-bold text-gray-900">
                {venueStats?.totalTeams || 0}
              </p>
            </div>
            <Users className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Verified Teams</p>
              <p className="text-2xl font-bold text-gray-900">
                {venueStats?.verifiedTeams || 0}
              </p>
            </div>
            <Star className="w-8 h-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Fixtures</p>
              <p className="text-2xl font-bold text-gray-900">
                {venueStats?.activeFixtures || 0}
              </p>
            </div>
            <Trophy className="w-8 h-8 text-yellow-500" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Matches</p>
              <p className="text-2xl font-bold text-gray-900">
                {venueStats?.totalMatches || 0}
              </p>
            </div>
            <Calendar className="w-8 h-8 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Sports Available */}
      {venueData?.sports && venueData.sports.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <Trophy className="w-5 h-5 mr-2 text-[#F28C38]" />
            Sports Available
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {venueData.sports.map((sport: any) => (
              <div 
                key={sport.id}
                className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-3 border border-blue-200"
              >
                <p className="font-medium text-blue-900">{sport.name}</p>
                {sport.category && (
                  <p className="text-xs text-blue-600">{sport.category}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Additional Information */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center">
          <Globe className="w-5 h-5 mr-2 text-[#F28C38]" />
          Additional Information
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="text-sm font-medium text-gray-500">Status</label>
            <p className="text-lg font-medium text-green-600">
              Active
            </p>
          </div>
          
          <div>
            <label className="text-sm font-medium text-gray-500">Last Updated</label>
            <p className="text-gray-700">
              {venueData?.updatedAt 
                ? new Date(venueData.updatedAt).toLocaleDateString()
                : 'N/A'
              }
            </p>
          </div>

          {venueData?.description && (
            <div className="md:col-span-2">
              <label className="text-sm font-medium text-gray-500">Description</label>
              <p className="text-gray-700 mt-1">
                {venueData.description}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}