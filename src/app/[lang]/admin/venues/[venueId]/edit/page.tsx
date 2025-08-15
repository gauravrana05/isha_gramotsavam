"use client";

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase/config';
import { doc, getDoc, updateDoc, serverTimestamp, getDocs, collection } from 'firebase/firestore';
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
    courtCount: string;
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
    supportedSports: [], // Array of sport objects
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
  const [volunteersData, setVolunteersData] = useState<any[]>([]);
  const [districts, setDistricts] = useState<string[]>([]);
  const [taluks, setTaluks] = useState<string[]>([]);
  const [panchayats, setPanchayats] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadingSports, setLoadingSports] = useState(true);
  const [addressLoading, setAddressLoading] = useState(false);
  const [addressCaptured, setAddressCaptured] = useState(false);
  const [error, setError] = useState('');
  const [volunteerModal, setVolunteerModal] = useState(false);

  useEffect(() => {
    if (!user || userProfile?.role !== 'admin') {
      router.push(`/${lang}/login`);
      return;
    }

    loadVenue();
    loadSports();
    loadVolunteersData();
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
          assignedVolunteers: Array.isArray(venueData.assignedVolunteers) 
            ? venueData.assignedVolunteers.map(vol => 
                typeof vol === 'string' ? vol : vol.volunteerId || vol.id
              ).filter(Boolean)
            : [],
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

        // Normalize supported sports data after venue is loaded
        if (availableSports.length > 0) {
          normalizeSupportedSports(availableSports);
        }

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
      setAvailableSports(activeSports);
      
      // Normalize supported sports data after sports are loaded
      if (formData.name) { // Only if venue is already loaded
        normalizeSupportedSports(activeSports);
      }
    } catch (err: any) {
      console.error('Error loading sports:', err);
      setError('Failed to load sports. Please try again.');
    } finally {
      setLoadingSports(false);
    }
  };

  const normalizeSupportedSports = (sportsData: Sport[]) => {
    setFormData(prev => ({
      ...prev,
      supportedSports: Array.isArray(prev.supportedSports) 
        ? prev.supportedSports.map(sport => {
            if (typeof sport === 'string') {
              // Convert old string format to new object format
              const foundSport = sportsData.find(s => s.id === sport);
              return {
                sportId: sport,
                sportName: foundSport?.displayName || foundSport?.name || sport,
                courtCount: "",
                courtSpecifications: ""
              };
            } else if (sport && typeof sport === 'object') {
              // Already in object format, ensure all fields exist
              return {
                sportId: sport.sportId || sport.id,
                sportName: sport.sportName || sport.name || sport.sportId || sport.id,
                courtCount: sport.courtCount || "",
                courtSpecifications: sport.courtSpecifications || ""
              };
            }
            return null;
          }).filter(Boolean)
        : []
    }));
  };

  const loadVolunteersData = async () => {
    try {
      const usersCollection = collection(db, 'users');
      const volunteersSnapshot = await getDocs(usersCollection);
      const volunteersMap = volunteersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setVolunteersData(volunteersMap);
    } catch (err: any) {
      console.error('Error loading volunteers:', err);
    }
  };

  const getVolunteerInfo = (volunteerId: string) => {
    const volunteer = volunteersData.find(v => v.id === volunteerId);
    if (!volunteer) return { name: volunteerId, email: 'Unknown' };
    return {
      name: `${volunteer.firstName || ''} ${volunteer.lastName || ''}`.trim() || volunteer.email || volunteerId,
      email: volunteer.email || 'No email',
      role: volunteer.role || 'general_volunteer'
    };
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
        ...(prev[parent] && typeof prev[parent] === 'object' ? prev[parent] : {}),
        [field]: value
      }
    }));
  };

  const handleSportChange = (sportId: string, checked: boolean) => {
    if (checked) {
      const selectedSport = availableSports.find(s => s.id === sportId);
      const sportObject = {
        sportId: sportId,
        sportName: selectedSport?.displayName || selectedSport?.name || sportId,
        courtCount: "",
        courtSpecifications: ""
      };
      
      setFormData(prev => ({
        ...prev,
        supportedSports: [...prev.supportedSports, sportObject]
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        supportedSports: prev.supportedSports.filter(sport => sport.sportId !== sportId)
      }));
    }
  };

  const handleVolunteerAssign = async (assignment: any) => {
    try {
      // Add volunteer ID to the assignedVolunteers array
      setFormData(prev => ({
        ...prev,
        assignedVolunteers: [...prev.assignedVolunteers, assignment.volunteerId]
      }));
      
      // If technical role selected, update user's role in users collection
      if (assignment.volunteerRole === 'technical') {
        const userDoc = doc(db, 'users', assignment.volunteerId);
        await updateDoc(userDoc, {
          role: 'technical_volunteer',
          updatedAt: new Date()
        });
        
        // Update local volunteersData state to reflect the change
        setVolunteersData(prev => prev.map(v => 
          v.id === assignment.volunteerId 
            ? {...v, role: 'technical_volunteer'}
            : v
        ));
      }
    } catch (err: any) {
      console.error('Error assigning volunteer:', err);
      setError('Failed to assign volunteer. Please try again.');
    }
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

  const removeArrayItem = async (field: 'assignedVolunteers' | 'referees', index: number) => {
    if (field === 'referees') {
      setFormData(prev => ({
        ...prev,
        officials: {
          ...prev.officials,
          referees: prev.officials.referees.filter((_, i) => i !== index)
        }
      }));
    } else if (field === 'assignedVolunteers') {
      const volunteerToRemove = formData.assignedVolunteers[index];
      
      // Check if the volunteer is technical_volunteer and revert to general_volunteer
      const volunteerInfo = getVolunteerInfo(volunteerToRemove);
      if (volunteerInfo.role === 'technical_volunteer') {
        try {
          const userDoc = doc(db, 'users', volunteerToRemove);
          await updateDoc(userDoc, {
            role: 'general_volunteer',
            updatedAt: new Date()
          });
          
          // Update local volunteersData state to reflect the change
          setVolunteersData(prev => prev.map(v => 
            v.id === volunteerToRemove 
              ? {...v, role: 'general_volunteer'}
              : v
          ));
        } catch (err: any) {
          console.error('Error reverting volunteer role:', err);
          setError('Failed to revert volunteer role. Please try again.');
        }
      }
      
      // Remove volunteer from the array
      setFormData(prev => ({
        ...prev,
        [field]: prev[field].filter((_, i) => i !== index)
      }));
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


    setSaving(true);
    try {
      // Ensure we completely replace supportedSports with clean format
      const venueData = {
        name: formData.name,
        shortName: formData.shortName,
        type: formData.type,
        address: formData.address,
        pincode: formData.pincode,
        state: formData.state,
        district: formData.district,
        taluk: formData.taluk,
        panchayat: formData.panchayat,
        coordinates: formData.coordinates,
        supportedSports: formData.supportedSports, // Clean array of sport IDs
        primaryContact: formData.primaryContact,
        assignedVolunteers: formData.assignedVolunteers.filter(vol => vol && vol.trim() !== ''),
        updatedAt: serverTimestamp()
      };
      
      console.log('Submitting venueData:', venueData); // Debug: Verify submitted data

      const venueDoc = doc(db, 'venues', venueId as string);
      await updateDoc(venueDoc, venueData);
      
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
            <h3 className="text-lg font-medium text-gray-900 mb-4">Supported Sports</h3>
            {loadingSports ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-6 h-6 animate-spin text-[#3A7F3F]" />
                <span className="ml-2">Loading sports...</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {availableSports.map((sport) => (
                  <label key={sport.id} className="flex items-start p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.supportedSports.some(s => s.sportId === sport.id)}
                      onChange={(e) => handleSportChange(sport.id, e.target.checked)}
                      className="rounded border-gray-300 text-[#3A7F3F] focus:ring-[#3A7F3F] mt-1"
                    />
                    <div className="ml-3 flex-1">
                      <span className="text-sm font-medium text-gray-900">
                        {sport.displayName || sport.name || sport.id}
                      </span>
                    </div>
                  </label>
                ))}
              </div>
            )}
            {!loadingSports && availableSports.length === 0 && (
              <p className="text-gray-500 text-center py-4">No sports available to select.</p>
            )}
          </div>

          <div className="bg-white rounded-lg border p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Primary Contact</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                <input
                  type="text"
                  value={formData.primaryContact.name}
                  onChange={(e) => handleNestedInputChange('primaryContact', 'name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3A7F3F] focus:border-[#3A7F3F]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                <input
                  type="tel"
                  value={formData.primaryContact.phone}
                  onChange={(e) => handleNestedInputChange('primaryContact', 'phone', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3A7F3F] focus:border-[#3A7F3F]"
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
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Assign Volunteers</h3>
              <Button
                type="button"
                onClick={() => setVolunteerModal(true)}
                leftIcon={Plus}
                variant="primary"
                size="sm"
              >
                Assign Volunteer
              </Button>
            </div>

            {/* Current Assignments */}
            {formData.assignedVolunteers.length > 0 ? (
              <div className="space-y-3">
                {formData.assignedVolunteers.map((volunteerId, index) => {
                  const volunteerInfo = getVolunteerInfo(volunteerId);
                  return (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg bg-gray-50">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <div>
                            <p className="font-medium text-gray-900">{volunteerInfo.name}</p>
                            <p className="text-sm text-gray-500">{volunteerInfo.email}</p>
                          </div>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            volunteerInfo.role === 'technical_volunteer' 
                              ? 'bg-purple-100 text-purple-800' 
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {volunteerInfo.role === 'technical_volunteer' ? 'Technical' : 'General'}
                          </span>
                        </div>
                      </div>
                      <Button
                        type="button"
                        onClick={() => removeArrayItem('assignedVolunteers', index)}
                        variant="danger"
                        size="sm"
                        leftIcon={Trash2}
                      >
                        Remove
                      </Button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>No volunteers assigned yet.</p>
                <p className="text-sm">Click "Assign Volunteer" to add volunteers to this venue.</p>
              </div>
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

        {/* Volunteer Assignment Modal */}
        {volunteerModal && (
          <VolunteerAssignmentModal
            isOpen={volunteerModal}
            onClose={() => setVolunteerModal(false)}
            onAssign={handleVolunteerAssign}
            venueName={formData.name}
          />
        )}
      </Container>
    );
  }

  // Simplified Volunteer Assignment Modal Component
  const VolunteerAssignmentModal = ({
    isOpen,
    onClose,
    onAssign,
    venueName
  }: {
    isOpen: boolean;
    onClose: () => void;
    onAssign: (assignment: any) => void;
    venueName: string;
  }) => {
    const [volunteers, setVolunteers] = useState<any[]>([]);
    const [selectedVolunteer, setSelectedVolunteer] = useState('');
    const [volunteerRole, setVolunteerRole] = useState<'general' | 'technical'>('general');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [loadingVolunteers, setLoadingVolunteers] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
      if (isOpen) {
        loadVolunteers();
      }
    }, [isOpen]);

    const loadVolunteers = async () => {
      try {
        setLoadingVolunteers(true);
        const usersCollection = collection(db, 'users');
        const volunteersSnapshot = await getDocs(usersCollection);
        const volunteersData = volunteersSnapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(user => user.role === 'general_volunteer' && user.isActive !== false);
        
        setVolunteers(volunteersData);
      } catch (err: any) {
        setError('Failed to load volunteers.');
      } finally {
        setLoadingVolunteers(false);
      }
    };

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedVolunteer) {
        setError('Please select a volunteer');
        return;
      }

      setIsSubmitting(true);
      try {
        const volunteer = volunteers.find(v => v.id === selectedVolunteer);
        if (!volunteer) {
          setError('Selected volunteer not found');
          return;
        }

        const assignment = {
          volunteerId: selectedVolunteer,
          volunteerName: `${volunteer.firstName} ${volunteer.lastName}`,
          volunteerEmail: volunteer.email,
          volunteerRole: volunteerRole
        };

        await onAssign(assignment);
        setSelectedVolunteer('');
        setVolunteerRole('general');
        onClose();
      } catch (err: any) {
        setError('Failed to assign volunteer.');
      } finally {
        setIsSubmitting(false);
      }
    };

    if (!isOpen) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Assign Volunteer</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">
              ×
            </button>
          </div>
          
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Volunteer</label>
              {loadingVolunteers ? (
                <div className="flex items-center justify-center py-3">
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Loading volunteers...
                </div>
              ) : (
                <select 
                  value={selectedVolunteer}
                  onChange={(e) => setSelectedVolunteer(e.target.value)}
                  required 
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3A7F3F] focus:border-[#3A7F3F]"
                >
                  <option value="">Select Volunteer</option>
                  {volunteers.map(volunteer => (
                    <option key={volunteer.id} value={volunteer.id}>
                      {volunteer.firstName} {volunteer.lastName} - {volunteer.email}
                    </option>
                  ))}
                </select>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Role</label>
              <select 
                value={volunteerRole}
                onChange={(e) => setVolunteerRole(e.target.value as 'general' | 'technical')}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3A7F3F] focus:border-[#3A7F3F]"
              >
                <option value="general">General</option>
                <option value="technical">Technical</option>
              </select>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || !selectedVolunteer}
                className="flex-1 bg-[#3A7F3F] hover:bg-green-700"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Assign
              </Button>
            </div>
          </form>
        </div>
      </div>
    );
  };