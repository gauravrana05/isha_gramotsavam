"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase/config';
import { collection, addDoc, serverTimestamp, getDocs } from 'firebase/firestore';
import Container from '@/components/ui/Container';
import Button from '@/components/ui/Button';
import { ArrowLeft, Save, Loader2, Plus, Trash2, IndianRupee } from 'lucide-react';

interface EventFormData {
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  registrationStartDate: string;
  registrationEndDate: string;
  sports: string[];
  venues: string[];
  maxTeams: number;
  prizes: {
    [level: string]: {
      first: number;
      second: number;
      third: number;
      participation: number;
    };
  };
  rules: string[];
  eligibilityCriteria: string[];
  contactInfo: {
    email: string;
    phone: string;
    address: string;
  };
  isActive: boolean;
  isRegistrationOpen: boolean;
  bannerImageURL: string;
}

export default function CreateEventPage() {
  const router = useRouter();
  const { lang } = useParams();
  const { user, userProfile } = useAuth();

  const [formData, setFormData] = useState<EventFormData>({
    name: '',
    description: '',
    startDate: '',
    endDate: '',
    registrationStartDate: '',
    registrationEndDate: '',
    sports: [],
    venues: [],
    maxTeams: 16,
    prizes: {
      'district': {
        first: 5000,
        second: 3000,
        third: 2000,
        participation: 500
      }
    },
    rules: [],
    eligibilityCriteria: [],
    contactInfo: {
      email: '',
      phone: '',
      address: ''
    },
    isActive: true,
    isRegistrationOpen: false,
    bannerImageURL: ''
  });

  const [availableSports, setAvailableSports] = useState<any[]>([]);
  const [availableVenues, setAvailableVenues] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingSports, setLoadingSports] = useState(true);
  const [loadingVenues, setLoadingVenues] = useState(true);
  const [error, setError] = useState('');

  // Calculate if registration should be open based on dates
  const calculateRegistrationStatus = useCallback(() => {
    const now = new Date();
    const regStart = formData.registrationStartDate ? new Date(formData.registrationStartDate) : null;
    const regEnd = formData.registrationEndDate ? new Date(formData.registrationEndDate) : null;
    
    // If no registration dates are set, use manual flag (default false for new events)
    if (!regStart && !regEnd) {
      return false;
    }
    
    // If only end date is set, registration is open until that date
    if (!regStart && regEnd) {
      return now <= regEnd;
    }
    
    // If only start date is set, registration is open from that date
    if (regStart && !regEnd) {
      return now >= regStart;
    }
    
    // If both dates are set, registration is open between them
    if (regStart !== null && regEnd !== null) {
      return now >= regStart && now <= regEnd;
    }
    return false;
  }, [formData.registrationEndDate, formData.registrationStartDate]);

  // Update registration status whenever dates change
  useEffect(() => {
    const newStatus = calculateRegistrationStatus();
    if (newStatus !== formData.isRegistrationOpen) {
      setFormData(prev => ({ ...prev, isRegistrationOpen: newStatus }));
    }
  }, [formData.registrationStartDate, formData.registrationEndDate, calculateRegistrationStatus, formData.isRegistrationOpen]);

  useEffect(() => {
    if (!user || userProfile?.role !== 'admin') {
      router.push(`/${lang}/login`);
      return;
    }

    loadSports();
    loadVenues();
  }, [user, userProfile, lang, router]);

  const loadSports = async () => {
    try {
      setLoadingSports(true);
      const sportsCollection = collection(db, 'sports');
      const sportsSnapshot = await getDocs(sportsCollection);
      const sportsData = sportsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setAvailableSports(sportsData.filter(sport => (sport as any).isActive))
    } catch (err: any) {
      console.error('Error loading sports:', err);
    } finally {
      setLoadingSports(false);
    }
  };

  const loadVenues = async () => {
    try {
      setLoadingVenues(true);
      const venuesCollection = collection(db, 'venues');
      const venuesSnapshot = await getDocs(venuesCollection);
      const venuesData = venuesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setAvailableVenues(venuesData.filter(venue => (venue as any).isActive));
    } catch (err: any) {
      console.error('Error loading venues:', err);
    } finally {
      setLoadingVenues(false);
    }
  };

  const handleInputChange = (field: keyof EventFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  const handleNestedInputChange = (parent: keyof EventFormData, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [parent]: {
        ...(prev[parent] && typeof prev[parent] === 'object' ? prev[parent] : {}),
        [field]: value
      }
    }));
  };

  const handleSportChange = (sportId: string, checked: boolean) => {
    if (checked) {
      setFormData(prev => ({
        ...prev,
        sports: [...prev.sports, sportId]
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        sports: prev.sports.filter(s => s !== sportId)
      }));
    }
  };

  const handleVenueChange = (venueId: string, checked: boolean) => {
    if (checked) {
      setFormData(prev => ({
        ...prev,
        venues: [...prev.venues, venueId]
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        venues: prev.venues.filter(v => v !== venueId)
      }));
    }
  };

  const handleArrayChange = (field: 'rules' | 'eligibilityCriteria', index: number, value: string) => {
    const newArray = [...formData[field]];
    newArray[index] = value;
    setFormData(prev => ({ ...prev, [field]: newArray }));
  };

  const addArrayItem = (field: 'rules' | 'eligibilityCriteria') => {
    setFormData(prev => ({
      ...prev,
      [field]: [...prev[field], '']
    }));
  };

  const removeArrayItem = (field: 'rules' | 'eligibilityCriteria', index: number) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index)
    }));
  };

  const handlePrizeChange = (level: string, position: string, value: number) => {
    setFormData(prev => ({
      ...prev,
      prizes: {
        ...prev.prizes,
        [level]: {
          ...prev.prizes[level],
          [position]: value
        }
      }
    }));
  };

  const addPrizeLevel = () => {
    const newLevel = `level_${Object.keys(formData.prizes).length + 1}`;
    setFormData(prev => ({
      ...prev,
      prizes: {
        ...prev.prizes,
        [newLevel]: {
          first: 5000,
          second: 3000,
          third: 2000,
          participation: 500
        }
      }
    }));
  };

  const removePrizeLevel = (level: string) => {
    const newPrizes = { ...formData.prizes };
    delete newPrizes[level];
    setFormData(prev => ({ ...prev, prizes: newPrizes }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      setError('Event name is required');
      return;
    }
    
    if (!formData.description.trim()) {
      setError('Description is required');
      return;
    }
    
    if (formData.sports.length === 0) {
      setError('At least one sport is required');
      return;
    }

    if (!formData.startDate || !formData.endDate) {
      setError('Start and end dates are required');
      return;
    }

    setLoading(true);
    try {
      const eventData = {
        ...formData,
        startDate: new Date(formData.startDate),
        endDate: new Date(formData.endDate),
        registrationStartDate: formData.registrationStartDate ? new Date(formData.registrationStartDate) : null,
        registrationEndDate: formData.registrationEndDate ? new Date(formData.registrationEndDate) : null,
        rules: formData.rules.filter(rule => rule.trim() !== ''),
        eligibilityCriteria: formData.eligibilityCriteria.filter(criteria => criteria.trim() !== ''),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      await addDoc(collection(db, 'events'), eventData);
      router.push(`/${lang}/admin/events`);
    } catch (err: any) {
      console.error('Error creating event:', err);
      setError('Failed to create event. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!user || userProfile?.role !== 'admin') {
    return null;
  }

  return (
    <Container>
      <div className="max-w-4xl mx-auto py-8">
        {/* Header */}
        <div className="flex items-center mb-6">
          <Button
            onClick={() => router.back()}
            variant="outline"
            className="mr-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Create New Event</h1>
            <p className="text-gray-600 text-sm">Add a new event to the system</p>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="bg-white rounded-lg border p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Event Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3A7F3F] focus:border-[#3A7F3F]"
                  placeholder="e.g., Isha Gramotsavam 2024"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description *
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3A7F3F] focus:border-[#3A7F3F]"
                  placeholder="Brief description of the event"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Date *
                </label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => handleInputChange('startDate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3A7F3F] focus:border-[#3A7F3F]"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  End Date *
                </label>
                <input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => handleInputChange('endDate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3A7F3F] focus:border-[#3A7F3F]"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Registration Start Date
                </label>
                <input
                  type="date"
                  value={formData.registrationStartDate}
                  onChange={(e) => handleInputChange('registrationStartDate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3A7F3F] focus:border-[#3A7F3F]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Registration End Date
                </label>
                <input
                  type="date"
                  value={formData.registrationEndDate}
                  onChange={(e) => handleInputChange('registrationEndDate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3A7F3F] focus:border-[#3A7F3F]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Teams
                </label>
                <input
                  type="number"
                  value={formData.maxTeams}
                  onChange={(e) => handleInputChange('maxTeams', parseInt(e.target.value))}
                  min="1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3A7F3F] focus:border-[#3A7F3F]"
                />
              </div>


              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => handleInputChange('isActive', e.target.checked)}
                    className="rounded border-gray-300 text-[#3A7F3F] focus:ring-[#3A7F3F]"
                  />
                  <span className="ml-2 text-sm font-medium text-gray-700">Active</span>
                </label>
                <div className="flex items-center">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.isRegistrationOpen}
                      readOnly
                      className="rounded border-gray-300 text-[#3A7F3F] focus:ring-[#3A7F3F] opacity-75 cursor-not-allowed"
                    />
                    <span className="ml-2 text-sm font-medium text-gray-700">Registration Open</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Sports Selection */}
          <div className="bg-white rounded-lg border p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Sports Selection *</h3>
            
            {loadingSports ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-6 h-6 animate-spin text-[#3A7F3F]" />
                <span className="ml-2">Loading sports...</span>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {availableSports.map((sport) => (
                  <label key={sport.id} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.sports.includes(sport.id)}
                      onChange={(e) => handleSportChange(sport.id, e.target.checked)}
                      className="rounded border-gray-300 text-[#3A7F3F] focus:ring-[#3A7F3F]"
                    />
                    <span className="ml-2 text-sm">{sport.displayName}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Prizes by Level */}
          <div className="bg-white rounded-lg border p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Prize Distribution by Level</h3>
              <Button
                type="button"
                onClick={addPrizeLevel}
                variant="outline"
                className="text-sm"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Level
              </Button>
            </div>
            
            {Object.entries(formData.prizes).map(([level, prizes]) => (
              <div key={level} className="mb-6 p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <input
                    type="text"
                    value={level}
                    onChange={(e) => {
                      const newPrizes = { ...formData.prizes };
                      newPrizes[e.target.value] = newPrizes[level];
                      delete newPrizes[level];
                      setFormData(prev => ({ ...prev, prizes: newPrizes }));
                    }}
                    className="text-lg font-medium bg-transparent border-none outline-none"
                    placeholder="Level name (e.g., District, State)"
                  />
                  {Object.keys(formData.prizes).length > 1 && (
                    <Button
                      type="button"
                      onClick={() => removePrizeLevel(level)}
                      variant="outline"
                      className="text-red-600 text-sm"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">First Prize</label>
                    <div className="relative">
                      <IndianRupee className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        type="number"
                        value={prizes.first}
                        onChange={(e) => handlePrizeChange(level, 'first', parseInt(e.target.value))}
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3A7F3F] focus:border-[#3A7F3F]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Second Prize</label>
                    <div className="relative">
                      <IndianRupee className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        type="number"
                        value={prizes.second}
                        onChange={(e) => handlePrizeChange(level, 'second', parseInt(e.target.value))}
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3A7F3F] focus:border-[#3A7F3F]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Third Prize</label>
                    <div className="relative">
                      <IndianRupee className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        type="number"
                        value={prizes.third}
                        onChange={(e) => handlePrizeChange(level, 'third', parseInt(e.target.value))}
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3A7F3F] focus:border-[#3A7F3F]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Participation</label>
                    <div className="relative">
                      <IndianRupee className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        type="number"
                        value={prizes.participation}
                        onChange={(e) => handlePrizeChange(level, 'participation', parseInt(e.target.value))}
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3A7F3F] focus:border-[#3A7F3F]"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Contact Information */}
          <div className="bg-white rounded-lg border p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Contact Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  value={formData.contactInfo.email}
                  onChange={(e) => handleNestedInputChange('contactInfo', 'email', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3A7F3F] focus:border-[#3A7F3F]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                <input
                  type="tel"
                  value={formData.contactInfo.phone}
                  onChange={(e) => handleNestedInputChange('contactInfo', 'phone', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3A7F3F] focus:border-[#3A7F3F]"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                <textarea
                  value={formData.contactInfo.address}
                  onChange={(e) => handleNestedInputChange('contactInfo', 'address', e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3A7F3F] focus:border-[#3A7F3F]"
                />
              </div>
            </div>
          </div>

          {/* Venues Selection */}
          <div className="bg-white rounded-lg border p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Venues Selection</h3>
            
            {loadingVenues ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-6 h-6 animate-spin text-[#3A7F3F]" />
                <span className="ml-2">Loading venues...</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {availableVenues.map((venue) => (
                  <label key={venue.id} className="flex items-start p-3 border rounded-lg hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={formData.venues.includes(venue.id)}
                      onChange={(e) => handleVenueChange(venue.id, e.target.checked)}
                      className="rounded border-gray-300 text-[#3A7F3F] focus:ring-[#3A7F3F] mt-1"
                    />
                    <div className="ml-3 flex-1">
                      <span className="text-sm font-medium text-gray-900">{venue.name}</span>
                      <div className="text-xs text-gray-500 mt-1">
                        <div>{venue.shortName} • {venue.type}</div>
                        <div>{venue.district}, {venue.state}</div>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            )}
            
            {!loadingVenues && availableVenues.length === 0 && (
              <p className="text-gray-500 text-center py-4">No venues available. Create venues first.</p>
            )}
          </div>

          {/* Rules */}
          <div className="bg-white rounded-lg border p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Rules</h3>
            
            {formData.rules.map((rule, index) => (
              <div key={index} className="flex mb-2">
                <input
                  type="text"
                  value={rule}
                  onChange={(e) => handleArrayChange('rules', index, e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3A7F3F] focus:border-[#3A7F3F]"
                  placeholder="Enter a rule"
                />
                <button
                  type="button"
                  onClick={() => removeArrayItem('rules', index)}
                  className="ml-2 px-3 py-2 text-red-600 hover:text-red-800"
                >
                  Remove
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => addArrayItem('rules')}
              className="text-[#3A7F3F] hover:text-green-700 text-sm"
            >
              + Add Rule
            </button>
          </div>

          {/* Eligibility Criteria */}
          <div className="bg-white rounded-lg border p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Eligibility Criteria</h3>
            
            {formData.eligibilityCriteria.map((criteria, index) => (
              <div key={index} className="flex mb-2">
                <input
                  type="text"
                  value={criteria}
                  onChange={(e) => handleArrayChange('eligibilityCriteria', index, e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3A7F3F] focus:border-[#3A7F3F]"
                  placeholder="Enter eligibility criteria"
                />
                <button
                  type="button"
                  onClick={() => removeArrayItem('eligibilityCriteria', index)}
                  className="ml-2 px-3 py-2 text-red-600 hover:text-red-800"
                >
                  Remove
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => addArrayItem('eligibilityCriteria')}
              className="text-[#3A7F3F] hover:text-green-700 text-sm"
            >
              + Add Criteria
            </button>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end space-x-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-[#3A7F3F] hover:bg-green-700"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Create Event
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </Container>
  );
}
