"use client";

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase/config';
import { doc, getDoc, updateDoc, serverTimestamp, getDocs, collection, arrayUnion, arrayRemove } from 'firebase/firestore';
import { pincodeService } from '@/lib/services/pincodeService';
import Container from '@/components/ui/Container';
import Button from '@/components/ui/Button';
import { ArrowLeft, Save, Loader2, Plus, Trash2, MapPin } from 'lucide-react';

interface VenueFormData {
  name: string;
  shortName: string;
  type: 'cluster' | 'division' | 'final';
  address: string;
  pincode: string;
  state: string;
  district: string;
  taluk: string;
  panchayat: string;
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

interface Sport {
  id: string;
  name?: string;
  displayName?: string;
  isActive: boolean;
}

interface Event {
  id: string;
  name: string;
  description?: string;
  startDate?: { toDate: () => Date };
  endDate?: { toDate: () => Date };
  isActive: boolean;
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
    state: '',
    district: '',
    taluk: '',
    panchayat: '',
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

  const [availableSports, setAvailableSports] = useState<Sport[]>([]);
  const [availableEvents, setAvailableEvents] = useState<Event[]>([]);
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [originalEvents, setOriginalEvents] = useState<string[]>([]);
  const [districts, setDistricts] = useState<string[]>([]);
  const [taluks, setTaluks] = useState<string[]>([]);
  const [panchayats, setPanchayats] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadingSports, setLoadingSports] = useState(true);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [addressLoading, setAddressLoading] = useState(false);
  const [addressCaptured, setAddressCaptured] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user || userProfile?.role !== 'admin') {
      router.push(`/${lang}/login`);
      return;
    }

    loadVenue();
    loadSports();
    loadEvents();
  }, [user, userProfile, venueId, lang, router]);

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
          state: venueData.state || '',
          district: venueData.district || '',
          taluk: venueData.taluk || '',
          panchayat: venueData.panchayat || '',
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

        console.log('Loaded venue supportedSports:', venueData.supportedSports); // Debug: Verify loaded sports

        if (venueData.state) {
          await fetchDistricts(venueData.state);
          if (venueData.district) {
            await fetchTaluks(venueData.state, venueData.district);
            if (venueData.taluk) {
              await fetchPanchayats(venueData.state, venueData.district, venueData.taluk);
              if (venueData.panchayat) {
                setAddressCaptured(true);
              }
            }
          }
        }

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
        ...doc.data(),
      } as Sport));
      const activeSports = sportsData.filter(sport => sport.isActive !== false);
      console.log('Loaded sports:', activeSports); // Debug: Verify sports data
      setAvailableSports(activeSports);
      if (activeSports.length === 0) {
        console.warn('No active sports found.');
      }
    } catch (err: any) {
      console.error('Error loading sports:', err);
      setError('Failed to load sports. Please try again.');
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
        ...doc.data(),
        isActive: doc.data().isActive || false
      } as Event));
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

    if (field === 'pincode') {
      setAddressCaptured(false);
      setDistricts([]);
      setTaluks([]);
      setPanchayats([]);
      setFormData(prev => ({
        ...prev,
        state: '',
        district: '',
        taluk: '',
        panchayat: ''
      }));
      if (value.length === 6) {
        fetchState(value);
      }
    } else if (field === 'state') {
      setDistricts([]);
      setTaluks([]);
      setPanchayats([]);
      setFormData(prev => ({
        ...prev,
        district: '',
        taluk: '',
        panchayat: ''
      }));
      if (value) {
        fetchDistricts(value);
      }
    } else if (field === 'district') {
      setTaluks([]);
      setPanchayats([]);
      setFormData(prev => ({
        ...prev,
        taluk: '',
        panchayat: ''
      }));
      if (value && formData.state) {
        fetchTaluks(formData.state, value);
      }
    } else if (field === 'taluk') {
      setPanchayats([]);
      setFormData(prev => ({
        ...prev,
        panchayat: ''
      }));
      if (value && formData.state && formData.district) {
        fetchPanchayats(formData.state, formData.district, value);
      }
    } else if (field === 'panchayat') {
      setAddressCaptured(!!value);
    }
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

  const fetchState = async (pincode: string) => {
    if (pincode.length !== 6) return;

    setAddressLoading(true);
    setError('');

    try {
      const addressData = await pincodeService.getAddressByPincode(pincode);
      setFormData(prev => ({
        ...prev,
        state: addressData.state,
        district: '',
        taluk: '',
        panchayat: ''
      }));
      if (addressData.state) {
        await fetchDistricts(addressData.state);
      }
    } catch (err: any) {
      setError(err.message || 'Invalid pincode. Please check and try again.');
    } finally {
      setAddressLoading(false);
    }
  };

  const fetchDistricts = async (state: string) => {
    setAddressLoading(true);
    try {
      const districtList = await pincodeService.getDistrictsByState(state);
      setDistricts(districtList);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch districts. Please try again.');
    } finally {
      setAddressLoading(false);
    }
  };

  const fetchTaluks = async (state: string, district: string) => {
    setAddressLoading(true);
    try {
      const { taluks } = await pincodeService.getTaluksByDistrict(state, district);
      setTaluks(taluks);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch taluks. Please try again.');
    } finally {
      setAddressLoading(false);
    }
  };

  const fetchPanchayats = async (state: string, district: string, taluk: string) => {
    setAddressLoading(true);
    try {
      const panchayatList = await pincodeService.getPanchayatsByTaluk(state, district, taluk);
      setPanchayats(panchayatList);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch panchayats. Please try again.');
    } finally {
      setAddressLoading(false);
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

    if (!formData.pincode || formData.pincode.length !== 6) {
      setError('Please enter a valid 6-digit pincode');
      return;
    }

    if (!addressCaptured) {
      setError('Please complete the address selection by choosing a panchayat');
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
      
      console.log('Submitting venueData:', venueData); // Debug: Verify submitted data

      const venueDoc = doc(db, 'venues', venueId as string);
      await updateDoc(venueDoc, venueData);
      
      const eventsToAdd = selectedEvents.filter(eventId => !originalEvents.includes(eventId));
      const eventsToRemove = originalEvents.filter(eventId => !selectedEvents.includes(eventId));
      
      await Promise.all(
        eventsToAdd.map(eventId => 
          updateDoc(doc(db, 'events', eventId), {
            venues: arrayUnion(venueId as string),
            updatedAt: serverTimestamp()
          })
        )
      );
      
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

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
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
                  Pincode *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    maxLength={6}
                    value={formData.pincode}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '');
                      handleInputChange('pincode', value);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3A7F3F] focus:border-[#3A7F3F] pr-10"
                    placeholder="Enter 6-digit pincode"
                    required
                  />
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    {addressLoading && <Loader2 className="w-4 h-4 animate-spin text-[#3A7F3F]" />}
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
                <input
                  type="text"
                  value={formData.state}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                  placeholder="Select pincode first"
                  disabled={!formData.pincode}
                  readOnly
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">District</label>
                <select
                  value={formData.district}
                  onChange={(e) => handleInputChange('district', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3A7F3F] focus:border-[#3A7F3F]"
                  disabled={!formData.state || !districts.length}
                >
                  <option value="" disabled>Select District</option>
                  {districts.map(district => (
                    <option key={district} value={district}>{district}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Taluk</label>
                <select
                  value={formData.taluk}
                  onChange={(e) => handleInputChange('taluk', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3A7F3F] focus:border-[#3A7F3F]"
                  disabled={!formData.district || !taluks.length}
                >
                  <option value="" disabled>Select Taluk</option>
                  {taluks.map(taluk => (
                    <option key={taluk} value={taluk}>{taluk}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Panchayat</label>
                <select
                  value={formData.panchayat}
                  onChange={(e) => handleInputChange('panchayat', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3A7F3F] focus:border-[#3A7F3F]"
                  disabled={!formData.taluk || !panchayats.length}
                >
                  <option value="" disabled>Select Panchayat</option>
                  {panchayats.map(panchayat => (
                    <option key={panchayat} value={panchayat}>{panchayat}</option>
                  ))}
                </select>
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
            {addressCaptured && (
              <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center space-x-2">
                  <MapPin className="w-4 h-4 text-green-600" />
                  <p className="text-green-600 text-sm">Address captured successfully</p>
                </div>
              </div>
            )}
          </div>

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
                        console.log('Selected sport:', selectedSport); // Debug: Verify selected sport
                        const newSports = [...formData.supportedSports];
                        newSports[index] = {
                          ...newSports[index],
                          sportId: e.target.value,
                          sportName: selectedSport?.displayName || selectedSport?.name || e.target.value || '',
                        };
                        setFormData(prev => {
                          console.log('Updated supportedSports:', newSports); // Debug: Verify state update
                          return { ...prev, supportedSports: newSports };
                        });
                      }}
                      disabled={loadingSports || availableSports.length === 0}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3A7F3F] focus:border-[#3A7F3F] disabled:bg-gray-100"
                    >
                      <option value="">
                        {loadingSports ? 'Loading sports...' : availableSports.length === 0 ? 'No sports available' : 'Select a sport'}
                      </option>
                      {availableSports.map((availableSport) => (
                        <option key={availableSport.id} value={availableSport.id}>
                          {availableSport.displayName || availableSport.name || availableSport.id}
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
                      onChange={(e) => {
                        const newSports = [...formData.supportedSports];
                        newSports[index] = {
                          ...newSports[index],
                          courtCount: parseInt(e.target.value) || 1
                        };
                        setFormData(prev => ({ ...prev, supportedSports: newSports }));
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3A7F3F] focus:border-[#3A7F3F]"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Court Specifications</label>
                    <textarea
                      value={sport.courtSpecifications}
                      onChange={(e) => {
                        const newSports = [...formData.supportedSports];
                        newSports[index] = {
                          ...newSports[index],
                          courtSpecifications: e.target.value
                        };
                        setFormData(prev => ({ ...prev, supportedSports: newSports }));
                      }}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3A7F3F] focus:border-[#3A7F3F]"
                      placeholder="Specifications and requirements for this sport"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

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