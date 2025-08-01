"use client";

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase/config';
import { collection, getDocs, doc, updateDoc, query, orderBy } from 'firebase/firestore';
import Container from '@/components/ui/Container';
import Button from '@/components/ui/Button';
import { 
  Plus, 
  MapPin,
  Users,
  Phone,
  Edit,
  Eye,
  Trash2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  Search,
  ChevronDown
} from 'lucide-react';

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

export default function VenuesManagement() {
  const [venues, setVenues] = useState<SimplifiedVenue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingVenue, setDeletingVenue] = useState<string | null>(null);

  const { lang } = useParams();
  const router = useRouter();
  const { user, userProfile, loading: authLoading } = useAuth();

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

    loadVenues();
  }, [user, userProfile, authLoading, lang, router]);

  const loadVenues = async () => {
    try {
      setLoading(true);
      const venuesCollection = collection(db, 'venues');
      const venuesQuery = query(venuesCollection, orderBy('createdAt', 'desc'));
      const venuesSnapshot = await getDocs(venuesQuery);
      
      const venuesData: SimplifiedVenue[] = venuesSnapshot.docs.map(doc => ({
        venueId: doc.id,
        ...doc.data()
      })) as SimplifiedVenue[];
      
      setVenues(venuesData);
    } catch (err: any) {
      console.error('Error loading venues:', err);
      setError('Failed to load venues. Please check your permissions.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteVenue = async (venueId: string) => {
    if (!confirm('Are you sure you want to deactivate this venue?')) {
      return;
    }

    setDeletingVenue(venueId);
    try {
      const venueDoc = doc(db, 'venues', venueId);
      await updateDoc(venueDoc, {
        isActive: false,
        updatedAt: new Date()
      });
      
      // Update local state
      setVenues(prevVenues => 
        prevVenues.map(venue => 
          venue.venueId === venueId 
            ? { ...venue, isActive: false, updatedAt: new Date() }
            : venue
        )
      );
      
    } catch (err: any) {
      console.error('Error deactivating venue:', err);
      setError('Failed to deactivate venue. Please try again.');
    } finally {
      setDeletingVenue(null);
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

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#3A7F3F]" />
      </div>
    );
  }

  if (!user || userProfile?.role !== 'admin') {
    return null;
  }

  return (
    <Container>
      <div className="max-w-7xl mx-auto py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Venues Management</h1>
            <p className="text-gray-600 text-sm">Manage sports venues and facilities</p>
          </div>
          
          <Button
            onClick={() => router.push(`/${lang}/admin/venues/create`)}
            className="bg-[#3A7F3F] hover:bg-green-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Venue
          </Button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {/* Venues Table - Desktop */}
        {venues.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border">
            <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No venues found</h3>
            <p className="text-gray-600 mb-4">Create your first venue to get started.</p>
            <Button
              onClick={() => router.push(`/${lang}/admin/venues/create`)}
              className="bg-[#3A7F3F] hover:bg-green-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Venue
            </Button>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block bg-white rounded-lg border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Venue</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sports</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {venues.map((venue) => (
                      <tr key={venue.venueId} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{venue.name}</div>
                            <div className="text-sm text-gray-500">{venue.shortName}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeColor(venue.type)}`}>
                            {venue.type}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          <div>
                            <div>{venue.district}, {venue.state}</div>
                            <div className="text-xs text-gray-500">{venue.pincode}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {venue.supportedSports?.length || 0} sport{(venue.supportedSports?.length || 0) !== 1 ? 's' : ''}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          <div>
                            <div>{venue.primaryContact.name}</div>
                            <div className="text-xs text-gray-500">{venue.primaryContact.phone}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(venue)}`}>
                            {getStatusIcon(venue)}
                            <span className="ml-1">{getStatusText(venue)}</span>
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm font-medium">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => router.push(`/${lang}/admin/venues/${venue.venueId}`)}
                              className="text-indigo-600 hover:text-indigo-900"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => router.push(`/${lang}/admin/venues/${venue.venueId}/edit`)}
                              className="text-yellow-600 hover:text-yellow-900"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteVenue(venue.venueId)}
                              disabled={deletingVenue === venue.venueId}
                              className="text-red-600 hover:text-red-900 disabled:opacity-50"
                            >
                              {deletingVenue === venue.venueId ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-4">
              {venues.map((venue) => (
                <div key={venue.venueId} className="bg-white rounded-lg border p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="text-lg font-medium text-gray-900">{venue.name}</h3>
                      <p className="text-sm text-gray-500 mt-1">{venue.shortName}</p>
                    </div>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(venue)} ml-2`}>
                      {getStatusIcon(venue)}
                      <span className="ml-1">{getStatusText(venue)}</span>
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <span className="text-xs text-gray-500">Type</span>
                      <div className="mt-1">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(venue.type)}`}>
                          {venue.type}
                        </span>
                      </div>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500">Location</span>
                      <p className="text-sm font-medium text-gray-900 mt-1">{venue.district}, {venue.state}</p>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500">Sports</span>
                      <p className="text-sm font-medium text-gray-900 mt-1">{venue.supportedSports?.length || 0} sport{(venue.supportedSports?.length || 0) !== 1 ? 's' : ''}</p>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500">Contact</span>
                      <div className="mt-1">
                        <div className="text-sm font-medium text-gray-900">{venue.primaryContact.name}</div>
                        <div className="text-xs text-gray-500">{venue.primaryContact.phone}</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex space-x-2 pt-3 border-t">
                    <button
                      onClick={() => router.push(`/${lang}/admin/venues/${venue.venueId}`)}
                      className="flex items-center justify-center px-3 py-2 text-sm text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50 rounded-md flex-1"
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      View
                    </button>
                    <button
                      onClick={() => router.push(`/${lang}/admin/venues/${venue.venueId}/edit`)}
                      className="flex items-center justify-center px-3 py-2 text-sm text-yellow-600 hover:text-yellow-900 hover:bg-yellow-50 rounded-md flex-1"
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteVenue(venue.venueId)}
                      disabled={deletingVenue === venue.venueId}
                      className="flex items-center justify-center px-3 py-2 text-sm text-red-600 hover:text-red-900 hover:bg-red-50 rounded-md disabled:opacity-50"
                    >
                      {deletingVenue === venue.venueId ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Trash2 className="w-4 h-4 mr-1" />
                          Delete
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}


        {/* Simple Stats */}
        {venues.length > 0 && (
          <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-lg border text-center">
              <div className="text-2xl font-bold text-green-600">{venues.filter(v => v.isActive).length}</div>
              <div className="text-sm text-gray-600">Active</div>
            </div>
            <div className="bg-white p-4 rounded-lg border text-center">
              <div className="text-2xl font-bold text-blue-600">{venues.filter(v => v.currentStatus === 'available').length}</div>
              <div className="text-sm text-gray-600">Available</div>
            </div>
            <div className="bg-white p-4 rounded-lg border text-center">
              <div className="text-2xl font-bold text-yellow-600">{venues.filter(v => v.currentStatus === 'maintenance').length}</div>
              <div className="text-sm text-gray-600">Maintenance</div>
            </div>
            <div className="bg-white p-4 rounded-lg border text-center">
              <div className="text-2xl font-bold text-red-600">{venues.filter(v => !v.isActive).length}</div>
              <div className="text-sm text-gray-600">Inactive</div>
            </div>
          </div>
        )}
      </div>
    </Container>
  );
}
