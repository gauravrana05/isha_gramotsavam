"use client";

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
// import { db } from '@/lib/firebase/config';
// import { doc, getDoc, getDocs, collection } from 'firebase/firestore';
import Container from '@/components/ui/Container';
import Button from '@/components/ui/Button';
import { ArrowLeft, Edit, MapPin, Users, Phone, Mail, Trophy, CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react';

interface SimplifiedVenue {
  venueId: string;
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
    email?: string;
    role: string;
  };
  assignedVolunteers: string[];
  officials: {
    coordinatorId?: string;
    referees: string[];
    medicalOfficer?: string;
  };
  isActive: boolean;
  currentStatus: 'available' | 'in_use' | 'maintenance' | 'unavailable';
  totalMatchesHosted: number;
  upcomingMatches: number;
  utilizationRate: number;
  createdAt: any;
  updatedAt: any;
}

export default function VenueDetailPage() {
  const [venue, setVenue] = useState<SimplifiedVenue | null>(null);
  const [sportsData, setSportsData] = useState<any[]>([]);
  const [volunteersData, setVolunteersData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const router = useRouter();
  const { lang, venueId } = useParams();
  const { user, userProfile } = useAuth();

  useEffect(() => {
    if (!user || userProfile?.role !== 'admin') {
      router.push(`/${lang}/login`);
      return;
    }

    loadVenue();
  }, [user, userProfile, venueId]);

  const loadVenue = async () => {
    try {
      setLoading(true);
      
      // Load venue data
      const venueDoc = doc(db, 'venues', venueId as string);
      const venueSnapshot = await getDoc(venueDoc);
      
      if (venueSnapshot.exists()) {
        const venueData = {
          venueId: venueSnapshot.id,
          ...venueSnapshot.data()
        } as SimplifiedVenue;
        setVenue(venueData);

        // Load sports data and volunteers data in parallel
        const [sportsSnapshot, volunteersSnapshot] = await Promise.all([
          getDocs(collection(db, 'sports')),
          getDocs(collection(db, 'users'))
        ]);
        
        const sportsMap = sportsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setSportsData(sportsMap);

        const volunteersMap = volunteersSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setVolunteersData(volunteersMap);
      } else {
        setError('Venue not found');
      }
    } catch (err: any) {
      // Error handling removed
      setError('Failed to load venue details');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (venue: SimplifiedVenue) => {
    if (!venue.isActive) return 'bg-red-100 text-red-800';
    switch (venue.currentStatus) {
      case 'available': return 'bg-green-100 text-green-800';
      case 'in_use': return 'bg-blue-100 text-blue-800';
      case 'maintenance': return 'bg-yellow-100 text-yellow-800';
      case 'unavailable': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (venue: SimplifiedVenue) => {
    if (!venue.isActive) return <XCircle className="w-4 h-4" />;
    switch (venue.currentStatus) {
      case 'available': return <CheckCircle className="w-4 h-4" />;
      case 'in_use': return <Users className="w-4 h-4" />;
      case 'maintenance': return <AlertCircle className="w-4 h-4" />;
      case 'unavailable': return <XCircle className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  const getStatusText = (venue: SimplifiedVenue) => {
    if (!venue.isActive) return 'Inactive';
    switch (venue.currentStatus) {
      case 'available': return 'Available';
      case 'in_use': return 'In Use';
      case 'maintenance': return 'Maintenance';
      case 'unavailable': return 'Unavailable';
      default: return 'Unknown';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'cluster': return 'bg-blue-100 text-blue-800';
      case 'division': return 'bg-green-100 text-green-800';
      case 'final': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getSportName = (sportId: string) => {
    const sport = sportsData.find(s => s.id === sportId);
    return sport?.displayName || sport?.name || sportId;
  };

  const getSportDisplayName = (sport: any) => {
    if (typeof sport === 'string') {
      // Legacy format - just sport ID
      return getSportName(sport);
    } else if (sport && typeof sport === 'object') {
      // New object format - use sportName if available, otherwise lookup by sportId
      return sport.sportName || getSportName(sport.sportId || sport.id);
    }
    return 'Unknown Sport';
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

  if (loading) {
    return (
      <div className="lg:min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#3A7F3F]" />
      </div>
    );
  }

  if (error || !venue) {
    return (
      <Container>
        <div className="max-w-4xl mx-auto py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Venue Not Found</h1>
            <p className="text-gray-600 mb-6">{error || 'The requested venue could not be found.'}</p>
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

  return (
    <Container>
      <div className="max-w-4xl mx-auto py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Button
              onClick={() => router.back()}
              variant="outline"
              className="mr-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{venue.name}</h1>
              <p className="text-gray-600 text-sm">Venue Details</p>
            </div>
          </div>
          
          <Button
            onClick={() => router.push(`/${lang}/admin/venues/${venueId}/edit`)}
            className="bg-[#3A7F3F] hover:bg-green-700"
          >
            <Edit className="w-4 h-4 mr-2" />
            Edit Venue
          </Button>
        </div>

        {/* Status Badge */}
        <div className="mb-6">
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(venue)}`}>
            {getStatusIcon(venue)}
            <span className="ml-2">{getStatusText(venue)}</span>
          </span>
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ml-2 ${getTypeColor(venue.type)}`}>
            {venue.type.toUpperCase()}
          </span>
        </div>

        <div className="grid gap-6">
          {/* Basic Information */}
          <div className="bg-white rounded-lg border p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-medium text-gray-500">Venue Name</label>
                <p className="text-gray-900 mt-1">{venue.name}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500">Short Name</label>
                <p className="text-gray-900 mt-1">{venue.shortName}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500">Type</label>
                <p className="text-gray-900 mt-1 capitalize">{venue.type}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500">Current Status</label>
                <p className="text-gray-900 mt-1 capitalize">{venue.currentStatus.replace('_', ' ')}</p>
              </div>
            </div>
          </div>

          {/* Location Information */}
          <div className="bg-white rounded-lg border p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Location Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-gray-500">Address</label>
                <div className="flex items-start mt-1">
                  <MapPin className="w-4 h-4 text-gray-400 mr-2 mt-0.5" />
                  <p className="text-gray-900">{venue.address}</p>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500">District</label>
                <p className="text-gray-900 mt-1">{venue.district}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500">State</label>
                <p className="text-gray-900 mt-1">{venue.state}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500">Pincode</label>
                <p className="text-gray-900 mt-1">{venue.pincode || 'Not provided'}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500">Coordinates</label>
                <p className="text-gray-900 mt-1">
                  {venue.coordinates.latitude !== 0 || venue.coordinates.longitude !== 0 
                    ? `${venue.coordinates.latitude}, ${venue.coordinates.longitude}` 
                    : 'Not provided'}
                </p>
              </div>
            </div>
          </div>

          {/* Supported Sports */}
          {venue.supportedSports && venue.supportedSports.length > 0 && (
            <div className="bg-white rounded-lg border p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Supported Sports</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {venue.supportedSports.map((sport, index) => (
                  <div key={index} className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <Trophy className="w-4 h-4 text-[#3A7F3F] mr-2" />
                      <span className="font-medium text-gray-900">
                        {getSportDisplayName(sport)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Primary Contact */}
          <div className="bg-white rounded-lg border p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Primary Contact</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-medium text-gray-500">Name</label>
                <p className="text-gray-900 mt-1">{venue.primaryContact.name}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500">Role</label>
                <p className="text-gray-900 mt-1">{venue.primaryContact.role || 'Not specified'}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500">Phone</label>
                <div className="flex items-center mt-1">
                  <Phone className="w-4 h-4 text-gray-400 mr-2" />
                  <p className="text-gray-900">{venue.primaryContact.phone}</p>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500">Email</label>
                <div className="flex items-center mt-1">
                  <Mail className="w-4 h-4 text-gray-400 mr-2" />
                  <p className="text-gray-900">{venue.primaryContact.email || 'Not provided'}</p>
                </div>
              </div>
            </div>
          </div>


          {/* Assigned Volunteers */}
          {venue.assignedVolunteers && venue.assignedVolunteers.length > 0 && (
            <div className="bg-white rounded-lg border p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Assigned Volunteers</h3>
              <div className="space-y-3">
                {venue.assignedVolunteers.map((volunteerId, index) => {
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
                    </div>
                  );
                })}
              </div>
            </div>
          )}


          {/* Additional Information */}
          <div className="bg-white rounded-lg border p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Additional Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-medium text-gray-500">Created At</label>
                <p className="text-gray-900 mt-1">
                  {venue.createdAt?.toDate ? venue.createdAt.toDate().toLocaleDateString() : 'Unknown'}
                </p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500">Last Updated</label>
                <p className="text-gray-900 mt-1">
                  {venue.updatedAt?.toDate ? venue.updatedAt.toDate().toLocaleDateString() : 'Unknown'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Container>
  );
}
