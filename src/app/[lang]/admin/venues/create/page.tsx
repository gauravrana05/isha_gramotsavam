"use client";

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase/config';
import { collection, addDoc, serverTimestamp, getDocs, query, where, doc, updateDoc } from 'firebase/firestore';
import { pincodeService } from '@/lib/services/pincodeService';
import Container from '@/components/ui/Container';
import Button from '@/components/ui/Button';
import { ArrowLeft, Save, Loader2, MapPin, Plus, Trash2 } from 'lucide-react';
import VenueVolunteerAssignmentModal from './VenueVolunteerAssignmentModal';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/AdvancedSelect';

interface Volunteer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  isActive: boolean;
}

interface VolunteerAssignment {
  volunteerId: string;
  volunteerName: string;
  volunteerEmail: string;
  volunteerType: 'general' | 'technical';
}

interface Sport {
  id: string;
  name?: string;
  displayName?: string;
  isActive: boolean;
}

interface VenueFormData {
  name: string;
  shortName: string;
  type: 'cluster' | 'division' | 'final';
  address: string;
  pincode: string;
  district: string;
  state: string;
  taluk: string;
  panchayat: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  primaryContact: {
    name: string;
    phone: string;
    email: string;
    role: string;
  };
  supportedSports: Array<{
    sportId: string;
    sportName: string;
    courtCount: string;
    courtSpecifications: string;
  }>;
  assignedVolunteers: VolunteerAssignment[];
}

export default function CreateVenuePage() {
  const router = useRouter();
  const { lang } = useParams();
  const { user, userProfile } = useAuth();

  const [formData, setFormData] = useState<VenueFormData>({
    name: '',
    shortName: '',
    type: 'cluster',
    address: '',
    pincode: '',
    district: '',
    state: '',
    taluk: '',
    panchayat: '',
    coordinates: {
      latitude: 0,
      longitude: 0
    },
    primaryContact: {
      name: '',
      phone: '',
      email: '',
      role: ''
    },
    supportedSports: [],
    assignedVolunteers: []
  });

  const [availableVolunteers, setAvailableVolunteers] = useState<Volunteer[]>([]);
  const [availableSports, setAvailableSports] = useState<Sport[]>([]);
  const [districts, setDistricts] = useState<string[]>([]);
  const [taluks, setTaluks] = useState<string[]>([]);
  const [panchayats, setPanchayats] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingVolunteers, setLoadingVolunteers] = useState(true);
  const [loadingSports, setLoadingSports] = useState(true);
  const [addressLoading, setAddressLoading] = useState(false);
  const [addressCaptured, setAddressCaptured] = useState(false);
  const [error, setError] = useState('');
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);

  useEffect(() => {
    if (!user || userProfile?.role !== 'admin') {
      router.push(`/${lang}/login`);
      return;
    }

    loadVolunteers();
    loadSports();
  }, [user, userProfile, lang, router]);

  const loadVolunteers = async () => {
    try {
      setLoadingVolunteers(true);
      const usersCollection = collection(db, 'users');
      
      // Only get general_volunteer users (available for assignment)
      const volunteersQuery = query(usersCollection, where('role', '==', 'general_volunteer'));
      const volunteersSnapshot = await getDocs(volunteersQuery);
      const volunteersData = volunteersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as Volunteer));
      
      const activeVolunteers = volunteersData.filter(volunteer => volunteer.isActive !== false);
      setAvailableVolunteers(activeVolunteers);
      // Loaded general volunteers
    } catch (err: any) {
      setError('Failed to load volunteers. Please try again.');
    } finally {
      setLoadingVolunteers(false);
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
      const activeSports = sportsData.filter(sport => sport.isActive);
      setAvailableSports(activeSports);
    } catch (err: any) {
      setError('Failed to load sports. Please try again.');
    } finally {
      setLoadingSports(false);
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
        ...(typeof prev[parent] === 'object' && prev[parent] !== null ? prev[parent] : {}),
        [field]: value
      }
    }));
  };

  const handleVolunteerAssign = async (assignment: VolunteerAssignment) => {
    setFormData(prev => ({
      ...prev,
      assignedVolunteers: [...prev.assignedVolunteers, assignment]
    }));

    // If technical role selected, update user's role in users collection
    if (assignment.volunteerType === 'technical') {
      try {
        const userDoc = doc(db, 'users', assignment.volunteerId);
        await updateDoc(userDoc, {
          role: 'technical_volunteer',
          updatedAt: new Date()
        });
      } catch (err: any) {
        setError('Failed to update volunteer role. Please try again.');
      }
    }
  };

  const handleVolunteerRemove = async (volunteerId: string) => {
    // Find the volunteer assignment being removed
    const volunteerAssignment = formData.assignedVolunteers.find(assignment => assignment.volunteerId === volunteerId);
    
    // If the volunteer was assigned as technical, revert their role to general_volunteer
    if (volunteerAssignment && volunteerAssignment.volunteerType === 'technical') {
      try {
        const userDoc = doc(db, 'users', volunteerId);
        await updateDoc(userDoc, {
          role: 'general_volunteer',
          updatedAt: new Date()
        });
      } catch (err: any) {
        setError('Failed to revert volunteer role. Please try again.');
      }
    }
    
    // Remove volunteer from the array
    setFormData(prev => ({
      ...prev,
      assignedVolunteers: prev.assignedVolunteers.filter(assignment => assignment.volunteerId !== volunteerId)
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

    setLoading(true);
    try {
      const venueData = {
        ...formData,
        assignedVolunteers: formData.assignedVolunteers.map(assignment => assignment.volunteerId),
        isActive: true,
        currentStatus: 'available' as const,
        totalMatchesHosted: 0,
        upcomingMatches: 0,
        utilizationRate: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      // Create venue document
      const venueDocRef = await addDoc(collection(db, 'venues'), venueData);
      
      // Create volunteer assignments in separate collection for assign-venues table
      const volunteerAssignmentPromises = formData.assignedVolunteers.map(async (assignment) => {
        const assignmentData = {
          volunteerId: assignment.volunteerId,
          volunteerName: assignment.volunteerName,
          volunteerEmail: assignment.volunteerEmail,
          venueId: venueDocRef.id,
          venueName: formData.name,
          assignmentType: assignment.volunteerType,
          status: 'assigned',
          assignedAt: serverTimestamp(),
          assignedBy: user?.uid || 'admin',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };
        
        return addDoc(collection(db, 'volunteerVenueAssignment'), assignmentData);
      });
      
      // Wait for all volunteer assignments to be created
      await Promise.all(volunteerAssignmentPromises);
      
      router.push(`/${lang}/admin/venues`);
    } catch (err: any) {
      setError('Failed to create venue. Please try again.');
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
            <h1 className="text-2xl font-bold text-gray-900">Create New Venue</h1>
            <p className="text-gray-600 text-sm">Add a new venue to the system</p>
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
                  placeholder="e.g., Isha Sports Complex - Main Ground"
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
                  placeholder="e.g., ISC Main"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type *
                </label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => handleInputChange('type', value as 'cluster' | 'division' | 'final')}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cluster">Cluster</SelectItem>
                    <SelectItem value="division">Division</SelectItem>
                    <SelectItem value="final">Final</SelectItem>
                  </SelectContent>
                </Select>
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
                  placeholder="Full address of the venue"
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
                <Select
                  value={formData.district}
                  onValueChange={(value) => handleInputChange('district', value)}
                  disabled={!formData.state || !districts.length}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select District" />
                  </SelectTrigger>
                  <SelectContent>
                    {districts.map(district => (
                      <SelectItem key={district} value={district}>{district}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Taluk</label>
                <Select
                  value={formData.taluk}
                  onValueChange={(value) => handleInputChange('taluk', value)}
                  disabled={!formData.district || !taluks.length}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select Taluk" />
                  </SelectTrigger>
                  <SelectContent>
                    {taluks.map(taluk => (
                      <SelectItem key={taluk} value={taluk}>{taluk}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Panchayat</label>
                <Select
                  value={formData.panchayat}
                  onValueChange={(value) => handleInputChange('panchayat', value)}
                  disabled={!formData.taluk || !panchayats.length}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select Panchayat" />
                  </SelectTrigger>
                  <SelectContent>
                    {panchayats.map(panchayat => (
                      <SelectItem key={panchayat} value={panchayat}>{panchayat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
            <h3 className="text-lg font-medium text-gray-900 mb-4">Primary Contact (Optional)</h3>
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
                onClick={() => setIsAssignModalOpen(true)}
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
                {formData.assignedVolunteers.map((assignment) => (
                  <div key={assignment.volunteerId} className="flex items-center justify-between p-3 border rounded-lg bg-gray-50">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <div>
                          <p className="font-medium text-gray-900">{assignment.volunteerName}</p>
                          <p className="text-sm text-gray-500">{assignment.volunteerEmail}</p>
                        </div>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          assignment.volunteerType === 'technical' 
                            ? 'bg-purple-100 text-purple-800' 
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {assignment.volunteerType === 'technical' ? 'Technical' : 'General'}
                        </span>
                      </div>
                    </div>
                    <Button
                      type="button"
                      onClick={() => handleVolunteerRemove(assignment.volunteerId)}
                      variant="danger"
                      size="sm"
                      leftIcon={Trash2}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>No volunteers assigned yet.</p>
                <p className="text-sm">Click &quot;Assign Volunteer&quot; to add volunteers to this venue.</p>
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
                  Create Venue
                </>
              )}
            </Button>
          </div>
        </form>

        {/* Volunteer Assignment Modal */}
        <VenueVolunteerAssignmentModal
          isOpen={isAssignModalOpen}
          onClose={() => setIsAssignModalOpen(false)}
          onAssign={handleVolunteerAssign}
          currentAssignments={formData.assignedVolunteers}
          venueName={formData.name}
        />
      </div>
    </Container>
  );
}