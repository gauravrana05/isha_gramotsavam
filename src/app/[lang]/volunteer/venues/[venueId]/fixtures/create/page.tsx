'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/server/trpc/react';
import { useAlert } from '@/hooks/useAlert';
import { AlertModal } from '@/components/ui/Modal';
import { 
  ArrowLeft, 
  Trophy, 
  Users, 
  Calendar,
  Loader2,
  Plus
} from 'lucide-react';

export default function CreateFixturePage() {
  const router = useRouter();
  const { venueId, lang } = useParams() as { venueId: string; lang: string };
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { alertState, showError, showSuccess, hideAlert } = useAlert();

  const [formData, setFormData] = useState({
    name: '',
    sportId: searchParams.get('sport') || '',
    genderCategory: searchParams.get('gender') || '',
    level: 'cluster' as 'cluster' | 'division' | 'final',
    maxTeams: 8,
    description: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get available sports with checked-in teams
  const { data: availableSports, isLoading } = api.volunteers.fixture.getAvailableSportsForFixture.useQuery(
    { venueId },
    { enabled: !!user && !!venueId }
  );

  const createFixtureMutation = api.volunteers.fixture.createFixture.useMutation({
    onSuccess: (data) => {
      showSuccess('Tournament created successfully!');
      router.push(`/${lang}/volunteer/venues/${venueId}/fixtures/${data.fixtureId}`);
    },
    onError: (error) => {
      showError(`Failed to create tournament: ${error.message}`);
      setIsSubmitting(false);
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.sportId || !formData.genderCategory) {
      showError('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    createFixtureMutation.mutate({
      venueId,
      ...formData,
      genderCategory: formData.genderCategory as 'men' | 'women' | 'mixed'
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#F28C38] mx-auto mb-4" />
          <p className="text-gray-600">Loading available sports...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => router.back()}
          className="flex items-center text-[#F28C38] hover:text-[#E67A26] mb-4"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back to Fixtures
        </button>
        <h1 className="text-3xl font-bold text-gray-900">Create Tournament</h1>
        <p className="text-gray-600 mt-2">Set up a new tournament for checked-in teams</p>
      </div>

      {/* Available Sports Info */}
      {availableSports && availableSports.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="text-sm font-medium text-blue-800 mb-2">Available Sports</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {availableSports.map((sport: any) => (
              <div key={`${sport.sportId}_${sport.genderCategory}`} className="text-sm text-blue-700">
                <span className="font-medium">{sport.sportName}</span> ({sport.genderCategory}) - {sport.teamCount} teams
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Form */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Tournament Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tournament Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., Volleyball Championship 2024"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F28C38] focus:border-transparent"
              required
            />
          </div>

          {/* Sport Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sport *
              </label>
              <select
                value={formData.sportId}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, sportId: e.target.value, genderCategory: '' }));
                }}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F28C38] focus:border-transparent"
                required
              >
                <option value="">Select Sport</option>
                {Array.from(new Set(availableSports?.map((s: any) => s.sportId) || [])).map(sportId => {
                  const sport = availableSports?.find((s: any) => s.sportId === sportId);
                  return (
                    <option key={sportId} value={sportId}>
                      {sport?.sportName}
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Gender Category *
              </label>
              <select
                value={formData.genderCategory}
                onChange={(e) => setFormData(prev => ({ ...prev, genderCategory: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F28C38] focus:border-transparent"
                required
                disabled={!formData.sportId}
              >
                <option value="">Select Category</option>
                {availableSports
                  ?.filter((s: any) => s.sportId === formData.sportId)
                  .map((sport: any) => (
                    <option key={sport.genderCategory} value={sport.genderCategory}>
                      {sport.genderCategory} ({sport.teamCount} teams)
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {/* Level and Max Teams */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Competition Level
              </label>
              <select
                value={formData.level}
                onChange={(e) => setFormData(prev => ({ ...prev, level: e.target.value as any }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F28C38] focus:border-transparent"
              >
                <option value="cluster">Cluster Level</option>
                <option value="division">Division Level</option>
                <option value="final">Final Level</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Maximum Teams
              </label>
              <select
                value={formData.maxTeams}
                onChange={(e) => setFormData(prev => ({ ...prev, maxTeams: parseInt(e.target.value) }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F28C38] focus:border-transparent"
              >
                <option value={4}>4 Teams</option>
                <option value={8}>8 Teams</option>
                <option value={16}>16 Teams</option>
                <option value={32}>32 Teams</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description (Optional)
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Tournament description, rules, or additional information..."
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F28C38] focus:border-transparent"
            />
          </div>

          {/* Submit Button */}
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !formData.name || !formData.sportId || !formData.genderCategory}
              className="px-6 py-3 bg-[#F28C38] text-white rounded-lg hover:bg-[#E67A26] disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Creating...
                </>
              ) : (
                <>
                  <Trophy className="w-4 h-4 mr-2" />
                  Create Tournament
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      <AlertModal
        isOpen={alertState.isOpen}
        onClose={hideAlert}
        message={alertState.message}
        type={alertState.type}
        title={alertState.title}
      />
    </div>
  );
}
