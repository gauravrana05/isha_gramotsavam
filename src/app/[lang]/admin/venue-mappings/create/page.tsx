"use client";

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/server/trpc/react';
import { 
  PageLoader,
  Button,
} from '@/components/ui';
import { 
  ArrowLeft,
  MapPin,
  Building2,
  Calendar,
  Target,
  Trophy,
  Users,
  CheckCircle,
  AlertCircle,
  Loader2
} from 'lucide-react';

interface FormData {
  eventId: string;
  venueId: string;
  level: 'cluster' | 'division' | 'final';
  maxTeams: number;
  isActive: boolean;
}

export default function CreateVenueMappingPage() {
  const router = useRouter();
  const { lang } = useParams();
  const { user, userProfile, loading: authLoading } = useAuth();

  const [formData, setFormData] = useState<FormData>({
    eventId: '',
    venueId: '',
    level: 'cluster',
    maxTeams: 64,
    isActive: true,
  });

  const [errors, setErrors] = useState<Partial<FormData>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // tRPC queries
  const {
    data: eventsData,
    isLoading: eventsLoading
  } = api.admin.events.getEvents.useQuery({
    limit: 100,
    status: 'all',
    includeStats: false
  }, {
    enabled: !!user && userProfile?.role === 'admin'
  });

  const {
    data: venuesData,
    isLoading: venuesLoading
  } = api.admin.venues.getVenues.useQuery({
    limit: 200,
    status: 'all'
  }, {
    enabled: !!user && userProfile?.role === 'admin'
  });

  // Create mapping mutation
  const createMappingMutation = api.admin.venues.createVenueLocationMapping.useMutation({
    onSuccess: (result) => {
      alert(`Successfully created venue mapping for ${result.mapping.venueName}!`);
      router.push(`/${lang}/admin/venue-mappings`);
    },
    onError: (error) => {
      alert(error.message || 'Failed to create venue mapping');
      setIsSubmitting(false);
    }
  });

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
  }, [user, userProfile, authLoading, lang, router]);

  const loading = eventsLoading || venuesLoading;
  const events = eventsData?.events || [];
  const venues = venuesData?.venues || [];

  const validateForm = (): boolean => {
    const newErrors: Partial<FormData> = {};

    if (!formData.eventId) {
      newErrors.eventId = 'Event is required';
    }

    if (!formData.venueId) {
      newErrors.venueId = 'Venue is required';
    }

    if (!formData.level) {
      newErrors.level = 'Tournament level is required';
    }

    if (!formData.maxTeams || formData.maxTeams < 1 || formData.maxTeams > 100) {
      newErrors.maxTeams = 'Max teams must be between 1 and 100';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      await createMappingMutation.mutateAsync({
        eventId: formData.eventId,
        venueId: formData.venueId,
        level: formData.level,
        maxTeams: formData.maxTeams,
        isActive: formData.isActive,
      });
    } catch (error) {
      // Error handled in onError callback
      console.error('Create venue mapping error:', error);
    }
  };

  const handleInputChange = (field: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'cluster': return <Target className="w-4 h-4" />;
      case 'division': return <Trophy className="w-4 h-4" />;
      case 'final': return <Trophy className="w-4 h-4" />;
      default: return <Target className="w-4 h-4" />;
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'cluster': return 'text-blue-600';
      case 'division': return 'text-green-600';
      case 'final': return 'text-purple-600';
      default: return 'text-blue-600';
    }
  };

  if (authLoading || loading) {
    return <PageLoader title="Loading venue mapping form..." />;
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Venue Mappings
        </button>
        
        <div className="flex items-center">
          <MapPin className="w-8 h-8 text-blue-600 mr-3" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Create Venue Location Mapping</h1>
            <p className="text-gray-600 text-sm">Map a venue to a tournament level with capacity settings</p>
          </div>
        </div>
      </div>

      {/* Info Box */}
      <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <CheckCircle className="w-5 h-5 text-blue-500 mt-0.5 mr-3" />
          <div>
            <h3 className="font-semibold text-blue-900">Multi-Level Venue System</h3>
            <div className="text-sm text-blue-700 mt-1">
              <p>The same physical venue can be mapped to multiple tournament levels (cluster, division, final) with different team capacities.</p>
              <p className="mt-1">Each mapping is independent and allows for optimal tournament logistics management.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Mapping Configuration</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Event Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="w-4 h-4 inline mr-2" />
              Event *
            </label>
            <select
              value={formData.eventId}
              onChange={(e) => handleInputChange('eventId', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.eventId ? 'border-red-300' : 'border-gray-300'
              }`}
            >
              <option value="">Select an event...</option>
              {events.map(event => (
                <option key={event.id} value={event.id}>
                  {event.name} - {event.status}
                </option>
              ))}
            </select>
            {errors.eventId && (
              <p className="text-red-600 text-sm mt-1 flex items-center">
                <AlertCircle className="w-4 h-4 mr-1" />
                {errors.eventId}
              </p>
            )}
          </div>

          {/* Venue Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Building2 className="w-4 h-4 inline mr-2" />
              Venue *
            </label>
            <select
              value={formData.venueId}
              onChange={(e) => handleInputChange('venueId', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.venueId ? 'border-red-300' : 'border-gray-300'
              }`}
            >
              <option value="">Select a venue...</option>
              {venues.map(venue => (
                <option key={venue.id} value={venue.id}>
                  {venue.name} - {venue.district}, {venue.state}
                </option>
              ))}
            </select>
            {errors.venueId && (
              <p className="text-red-600 text-sm mt-1 flex items-center">
                <AlertCircle className="w-4 h-4 mr-1" />
                {errors.venueId}
              </p>
            )}
          </div>

          {/* Tournament Level */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tournament Level *
            </label>
            <div className="grid grid-cols-3 gap-4">
              {(['cluster', 'division', 'final'] as const).map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => handleInputChange('level', level)}
                  className={`p-4 border rounded-lg transition-colors ${
                    formData.level === level
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <div className="flex items-center justify-center mb-2">
                    <span className={formData.level === level ? getLevelColor(level) : 'text-gray-400'}>
                      {getLevelIcon(level)}
                    </span>
                  </div>
                  <div className={`font-medium capitalize ${formData.level === level ? 'text-blue-700' : 'text-gray-700'}`}>
                    {level}
                  </div>
                </button>
              ))}
            </div>
            {errors.level && (
              <p className="text-red-600 text-sm mt-1 flex items-center">
                <AlertCircle className="w-4 h-4 mr-1" />
                {errors.level}
              </p>
            )}
          </div>

          {/* Max Teams */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Users className="w-4 h-4 inline mr-2" />
              Maximum Teams *
            </label>
            <input
              type="number"
              min="1"
              max="100"
              value={formData.maxTeams}
              onChange={(e) => handleInputChange('maxTeams', parseInt(e.target.value) || 0)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.maxTeams ? 'border-red-300' : 'border-gray-300'
              }`}
            />
            <p className="text-gray-500 text-sm mt-1">
              Default is 64 teams. Adjust based on venue capacity and tournament level requirements.
            </p>
            {errors.maxTeams && (
              <p className="text-red-600 text-sm mt-1 flex items-center">
                <AlertCircle className="w-4 h-4 mr-1" />
                {errors.maxTeams}
              </p>
            )}
          </div>

          {/* Active Status */}
          <div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => handleInputChange('isActive', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="isActive" className="ml-2 block text-sm text-gray-700">
                Active mapping (teams can be assigned to this venue)
              </label>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end space-x-4 pt-4 border-t border-gray-200">
            <Button
              type="button"
              variant="secondary"
              onClick={() => router.back()}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting}
              className="flex items-center"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Creating...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Create Mapping
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}