"use client";

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase/config';
import { doc, getDoc, updateDoc, serverTimestamp, getDocs, collection, arrayUnion, arrayRemove } from 'firebase/firestore';
import Container from '@/components/ui/Container';
import Button from '@/components/ui/Button';
import { ArrowLeft, Save, Loader2, Plus, Trash2 } from 'lucide-react';

interface VenueFormData {
  name: string;
  shortName: string;
  type: 'cluster' | 'division' | 'final';
  address: string;
  pincode: string;
  district: string;
  state: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  supportedSports: Array<{
    sportId: string;
    sportName: string;
    courtCount: number;
    courtSpecifications: string;
  }>;
  primaryContact: {
    name: string;
    phone: string;
    email: string;
    role: string;
  };
  assignedVolunteers: string[];
  officials: {
    coordinatorId: string;
    referees: string[];
    medicalOfficer: string;
  };
  isActive: boolean;
  currentStatus: 'available' | 'in_use' | 'maintenance' | 'unavailable';
  totalMatchesHosted: number;
  upcomingMatches: number;
  utilizationRate: number;
}

export default function EditVenuePage() {
  const router = useRouter();
  const { lang, venueId } = useParams();
  const { user, userProfile } = useAuth();

  const [formData, setFormData] = useState<VenueFormData>({
    name: '',
    shortName: '',
    type: 'cluster',
    address: '',
    pincode: '',
    district: '',
    state: '',
    coordinates: {
      latitude: 0,
      longitude: 0
    },
    supportedSports: [],
    primaryContact: {
      name: '',
      phone: '',
      email: '',
      role: ''
    },
    assignedVolunteers: [],
    officials: {
      coordinatorId: '',
      referees: [],
      medicalOfficer: ''
    },
    isActive: true,
    currentStatus: 'available',
    totalMatchesHosted: 0,
    upcomingMatches: 0,
    utilizationRate: 0
  });

  const [availableSports, setAvailableSports] = useState<any[]>([]);
  const [availableEvents, setAvailableEvents] = useState<any[]>([]);
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [originalEvents, setOriginalEvents] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadingSports, setLoadingSports] = useState(true);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user || userProfile?.role !== 'admin') {
      router.push(`/${lang}/login`);
      return;
    }

    loadVenue();
    loadSports();
    loadEvents();
  }, [user, userProfile, venueId]);

  const loadVenue = async () => {
    try {
      setLoading(true);
      const venueDoc = doc(db, 'venues', venueId as string);
      const venueSnapshot = await getDoc(venueDoc);
      
      if (venueSnapshot.exists()) {
        const venueData = venueSnapshot.data();
        setFormData({
          name: venueData.name || '',
          shortName: venueData.shortName || '',
          type: venueData.type || 'cluster',
          address: venueData.address || '',
          pincode: venueData.pincode || '',
          district: venueData.district || '',
          state: venueData.state || '',
          coordinates: venueData.coordinates || { latitude: 0, longitude: 0 },
          supportedSports: venueData.supportedSports || [],
          primaryContact: venueData.primaryContact || {
            name: '',
            phone: '',
            email: '',
            role: ''
          },
          assignedVolunteers: venueData.assignedVolunteers || [],
          officials: venueData.officials || {
            coordinatorId: '',
            referees: [],
            medicalOfficer: ''
          },
          isActive: venueData.isActive !== false,
          currentStatus: venueData.currentStatus || 'available',
          totalMatchesHosted: venueData.totalMatchesHosted || 0,
          upcomingMatches: venueData.upcomingMatches || 0,
          utilizationRate: venueData.utilizationRate || 0
        });

        // Load which events currently use this venue
        loadEventsForVenue(venueId as string);
      } else {
        setError('Venue not found');
      }
    } catch (err: any) {
      console.error('Error loading venue:', err);
      setError('Failed to load venue details');
    } finally {
      setLoading(false);
    }
  };

  const loadEventsForVenue = async (currentVenueId: string) => {
    try {
      const eventsCollection = collection(db, 'events');
      const eventsSnapshot = await getDocs(eventsCollection);
      const eventsWithThisVenue: string[] = [];
      
      eventsSnapshot.docs.forEach(doc => {
        const eventData = doc.data();
        if (eventData.venues && eventData.venues.includes(currentVenueId)) {
          eventsWithThisVenue.push(doc.id);
        }
      });
      
      setSelectedEvents(eventsWithThisVenue);
      setOriginalEvents(eventsWithThisVenue);
    } catch (err: any) {
      console.error('Error loading events for venue:', err);
    }
  };

  const loadSports = async () => {
    try {
      setLoadingSports(true);
      const sportsCollection = collection(db, 'sports');
      const sportsSnapshot = await getDocs(sportsCollection);
      const sportsData = sportsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setAvailableSports(sportsData.filter(sport => sport.isActive));
    } catch (err: any) {
      console.error('Error loading sports:', err);
    } finally {
      setLoadingSports(false);
    }
  };

  const loadEvents = async () => {
    try {
      setLoadingEvents(true);
      const eventsCollection = collection(db, 'events');
      const eventsSnapshot = await getDocs(eventsCollection);
      const eventsData = eventsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setAvailableEvents(eventsData.filter(event => event.isActive));
    } catch (err: any) {
      console.error('Error loading events:', err);
    } finally {
      setLoadingEvents(false);
    }
  };

  const handleInputChange = (field: keyof VenueFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  const handleNestedInputChange = (parent: keyof VenueFormData, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [parent]: {
        ...prev[parent as keyof typeof prev],
        [field]: value
      }
    }));
  };

  const handleSupportedSportChange = (index: number, field: string, value: any) => {
    const newSports = [...formData.supportedSports];
    newSports[index] = { ...newSports[index], [field]: value };
    setFormData(prev => ({ ...prev, supportedSports: newSports }));
  };

  const addSupportedSport = () => {
    setFormData(prev => ({
      ...prev,
      supportedSports: [...prev.supportedSports, {
        sportId: '',
        sportName: '',
        courtCount: 1,
        courtSpecifications: ''
      }]
    }));
  };

  const removeSupportedSport = (index: number) => {
    setFormData(prev => ({
      ...prev,
      supportedSports: prev.supportedSports.filter((_, i) => i !== index)
    }));
  };

  const handleArrayChange = (field: 'assignedVolunteers' | 'referees', index: number, value: string) => {
    if (field === 'referees') {
      const newReferees = [...formData.officials.referees];
      newReferees[index] = value;
      setFormData(prev => ({
        ...prev,
        officials: { ...prev.officials, referees: newReferees }
      }));
    } else {
      const newArray = [...formData[field]];
      newArray[index] = value;
      setFormData(prev => ({ ...prev, [field]: newArray }));
    }
  };

  const addArrayItem = (field: 'assignedVolunteers' | 'referees') => {
    if (field === 'referees') {
      setFormData(prev => ({
        ...prev,
        officials: { ...prev.officials, referees: [...prev.officials.referees, ''] }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: [...prev[field], '']
      }));
    }
  };

  const removeArrayItem = (field: 'assignedVolunteers' | 'referees', index: number) => {
    if (field === 'referees') {
      setFormData(prev => ({
        ...prev,
        officials: {
          ...prev.officials,
          referees: prev.officials.referees.filter((_, i) => i !== index)
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: prev[field].filter((_, i) => i !== index)
      }));
    }
  };

  const handleEventChange = (eventId: string, checked: boolean) => {
    if (checked) {
      setSelectedEvents(prev => [...prev, eventId]);
    } else {
      setSelectedEvents(prev => prev.filter(e => e !== eventId));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      setError('Venue name is required');
      return;
    }
    
    if (!formData.shortName.trim()) {
      setError('Short name is required');
      return;
    }
    
    if (!formData.address.trim()) {
      setError('Address is required');
      return;
    }

    if (!formData.district.trim()) {
      setError('District is required');
      return;
    }

    if (!formData.state.trim()) {
      setError('State is required');
      return;
    }

    if (!formData.primaryContact.name.trim()) {
      setError('Primary contact name is required');
      return;
    }

    if (!formData.primaryContact.phone.trim()) {
      setError('Primary contact phone is required');
      return;
    }

    setSaving(true);
    try {
      const venueData = {
        ...formData,
        assignedVolunteers: formData.assignedVolunteers.filter(vol => vol.trim() !== ''),
        officials: {
          ...formData.officials,
          referees: formData.officials.referees.filter(ref => ref.trim() !== '')
        },
        supportedSports: formData.supportedSports.filter(sport => sport.sportId && sport.sportName),
        updatedAt: serverTimestamp()
      };
      
      const venueDoc = doc(db, 'venues', venueId as string);
      await updateDoc(venueDoc, venueData);
      
      // Update event assignments
      const eventsToAdd = selectedEvents.filter(eventId => !originalEvents.includes(eventId));
      const eventsToRemove = originalEvents.filter(eventId => !selectedEvents.includes(eventId));
      
      // Add venue to new events
      await Promise.all(
        eventsToAdd.map(eventId => 
          updateDoc(doc(db, 'events', eventId), {
            venues: arrayUnion(venueId as string),
            updatedAt: serverTimestamp()
          })
        )
      );
      
      // Remove venue from events that were deselected
      await Promise.all(
        eventsToRemove.map(eventId => 
          updateDoc(doc(db, 'events', eventId), {
            venues: arrayRemove(venueId as string),
            updatedAt: serverTimestamp()
          })
        )
      );
      
      router.push(`/${lang}/admin/venues/${venueId}`);
    } catch (err: any) {
      console.error('Error updating venue:', err);
      setError('Failed to update venue. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#3A7F3F]" />
      </div>
    );
  }

  if (error && !formData.name) {
    return (
      <Container>
        <div className="max-w-4xl mx-auto py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Venue Not Found</h1>
            <p className="text-gray-600 mb-6">{error}</p>
            <Button
              onClick={() => router.push(`/${lang}/admin/venues`)}
              className="bg-[#3A7F3F] hover:bg-green-700"
            >
              Back to Venues
            </Button>
          </div>
        </div>
      </Container>
    );
  }

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
            <h1 className="text-2xl font-bold text-gray-900">Edit Venue</h1>
            <p className="text-gray-600 text-sm">Update venue details</p>
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Venue Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3A7F3F] focus:border-[#3A7F3F]"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Short Name *
                </label>
                <input
                  type="text"
                  value={formData.shortName}
                  onChange={(e) => handleInputChange('shortName', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3A7F3F] focus:border-[#3A7F3F]"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type *
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => handleInputChange('type', e.target.value as 'cluster' | 'division' | 'final')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3A7F3F] focus:border-[#3A7F3F]"
                  required
                >
                  <option value="cluster">Cluster</option>
                  <option value="division">Division</option>
                  <option value="final">Final</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Current Status
                </label>
                <select
                  value={formData.currentStatus}
                  onChange={(e) => handleInputChange('currentStatus', e.target.value as 'available' | 'in_use' | 'maintenance' | 'unavailable')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3A7F3F] focus:border-[#3A7F3F]"
                >
                  <option value="available">Available</option>
                  <option value="in_use">In Use</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="unavailable">Unavailable</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => handleInputChange('isActive', e.target.checked)}
                    className="rounded border-gray-300 text-[#3A7F3F] focus:ring-[#3A7F3F]"
                  />
                  <span className="ml-2 text-sm font-medium text-gray-700">Active</span>
                </label>
              </div>
            </div>
          </div>

          {/* Location Information */}
          <div className="bg-white rounded-lg border p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Location Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Address *
                </label>
                <textarea
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3A7F3F] focus:border-[#3A7F3F]"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  District *
                </label>
                <input
                  type="text"
                  value={formData.district}
                  onChange={(e) => handleInputChange('district', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3A7F3F] focus:border-[#3A7F3F]"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  State *
                </label>
                <input
                  type="text"
                  value={formData.state}
                  onChange={(e) => handleInputChange('state', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3A7F3F] focus:border-[#3A7F3F]"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pincode
                </label>
                <input
                  type="text"
                  value={formData.pincode}
                  onChange={(e) => handleInputChange('pincode', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3A7F3F] focus:border-[#3A7F3F]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Latitude
                </label>
                <input
                  type="number"
                  step="any"
                  value={formData.coordinates.latitude}
                  onChange={(e) => handleNestedInputChange('coordinates', 'latitude', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3A7F3F] focus:border-[#3A7F3F]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Longitude
                </label>
                <input
                  type="number"
                  step="any"
                  value={formData.coordinates.longitude}
                  onChange={(e) => handleNestedInputChange('coordinates', 'longitude', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3A7F3F] focus:border-[#3A7F3F]"
                />
              </div>
            </div>
          </div>

          {/* Supported Sports */}
          <div className="bg-white rounded-lg border p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Supported Sports</h3>
              <Button
                type="button"
                onClick={addSupportedSport}
                variant="outline"
                className="text-sm"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Sport
              </Button>
            </div>
            
            {formData.supportedSports.map((sport, index) => (
              <div key={index} className="mb-4 p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium">Sport {index + 1}</h4>
                  <Button
                    type="button"
                    onClick={() => removeSupportedSport(index)}
                    variant="outline"
                    className="text-red-600 text-sm"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Sport</label>
                    <select
                      value={sport.sportId}
                      onChange={(e) => {
                        const selectedSport = availableSports.find(s => s.id === e.target.value);
                        handleSupportedSportChange(index, 'sportId', e.target.value);
                        handleSupportedSportChange(index, 'sportName', selectedSport?.displayName || '');
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3A7F3F] focus:border-[#3A7F3F]"
                    >
                      <option value="">Select a sport</option>
                      {availableSports.map((availableSport) => (
                        <option key={availableSport.id} value={availableSport.id}>
                          {availableSport.displayName}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Court Count</label>
                    <input
                      type="number"
                      min="1"
                      value={sport.courtCount}
                      onChange={(e) => handleSupportedSportChange(index, 'courtCount', parseInt(e.target.value) || 1)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3A7F3F] focus:border-[#3A7F3F]"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Court Specifications</label>
                    <textarea
                      value={sport.courtSpecifications}
                      onChange={(e) => handleSupportedSportChange(index, 'courtSpecifications', e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3A7F3F] focus:border-[#3A7F3F]"
                      placeholder="Specifications and requirements for this sport"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Primary Contact */}
          <div className="bg-white rounded-lg border p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Primary Contact</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Name *</label>
                <input
                  type="text"
                  value={formData.primaryContact.name}
                  onChange={(e) => handleNestedInputChange('primaryContact', 'name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3A7F3F] focus:border-[#3A7F3F]"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Phone *</label>
                <input
                  type="tel"
                  value={formData.primaryContact.phone}
                  onChange={(e) => handleNestedInputChange('primaryContact', 'phone', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3A7F3F] focus:border-[#3A7F3F]"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  value={formData.primaryContact.email}
                  onChange={(e) => handleNestedInputChange('primaryContact', 'email', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3A7F3F] focus:border-[#3A7F3F]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                <input
                  type="text"
                  value={formData.primaryContact.role}
                  onChange={(e) => handleNestedInputChange('primaryContact', 'role', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3A7F3F] focus:border-[#3A7F3F]"
                  placeholder="e.g., Venue Manager"
                />
              </div>
            </div>
          </div>

          {/* Officials */}
          <div className="bg-white rounded-lg border p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Officials</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Coordinator ID</label>
                <input
                  type="text"
                  value={formData.officials.coordinatorId}
                  onChange={(e) => handleNestedInputChange('officials', 'coordinatorId', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3A7F3F] focus:border-[#3A7F3F]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Medical Officer</label>
                <input
                  type="text"
                  value={formData.officials.medicalOfficer}
                  onChange={(e) => handleNestedInputChange('officials', 'medicalOfficer', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3A7F3F] focus:border-[#3A7F3F]"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Referees</label>
              {formData.officials.referees.map((referee, index) => (
                <div key={index} className="flex mb-2">
                  <input
                    type="text"
                    value={referee}
                    onChange={(e) => handleArrayChange('referees', index, e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3A7F3F] focus:border-[#3A7F3F]"
                    placeholder="Enter referee name/ID"
                  />
                  <button
                    type="button"
                    onClick={() => removeArrayItem('referees', index)}
                    className="ml-2 px-3 py-2 text-red-600 hover:text-red-800"
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => addArrayItem('referees')}
                className="text-[#3A7F3F] hover:text-green-700 text-sm"
              >
                + Add Referee
              </button>
            </div>
          </div>

          {/* Assigned Volunteers */}
          <div className="bg-white rounded-lg border p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Assigned Volunteers</h3>
            
            {formData.assignedVolunteers.map((volunteer, index) => (
              <div key={index} className="flex mb-2">
                <input
                  type="text"
                  value={volunteer}
                  onChange={(e) => handleArrayChange('assignedVolunteers', index, e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3A7F3F] focus:border-[#3A7F3F]"
                  placeholder="Enter volunteer name/ID"
                />
                <button
                  type="button"
                  onClick={() => removeArrayItem('assignedVolunteers', index)}
                  className="ml-2 px-3 py-2 text-red-600 hover:text-red-800"
                >
                  Remove
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => addArrayItem('assignedVolunteers')}
              className="text-[#3A7F3F] hover:text-green-700 text-sm"
            >
              + Add Volunteer
            </button>
          </div>

          {/* Assign to Events */}
          <div className="bg-white rounded-lg border p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Assign to Events</h3>
            
            {loadingEvents ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-6 h-6 animate-spin text-[#3A7F3F]" />
                <span className="ml-2">Loading events...</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {availableEvents.map((event) => (
                  <label key={event.id} className="flex items-start p-3 border rounded-lg hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={selectedEvents.includes(event.id)}
                      onChange={(e) => handleEventChange(event.id, e.target.checked)}
                      className="rounded border-gray-300 text-[#3A7F3F] focus:ring-[#3A7F3F] mt-1"
                    />
                    <div className="ml-3 flex-1">
                      <span className="text-sm font-medium text-gray-900">{event.name}</span>
                      <div className="text-xs text-gray-500 mt-1">
                        <div>{event.description}</div>
                        <div>{event.startDate?.toDate ? event.startDate.toDate().toLocaleDateString() : 'TBD'} - {event.endDate?.toDate ? event.endDate.toDate().toLocaleDateString() : 'TBD'}</div>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            )}
            
            {!loadingEvents && availableEvents.length === 0 && (
              <p className="text-gray-500 text-center py-4">No events available to assign.</p>
            )}
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
              disabled={saving}
              className="bg-[#3A7F3F] hover:bg-green-700"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </Container>
  );
}
