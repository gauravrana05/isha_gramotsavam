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
  Loader2
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
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const { lang } = useParams();
  const router = useRouter();

  useEffect(() => {
    loadVenues();
  }, []);

  const loadVenues = async () => {
    try {
      // Simulate API call - replace with actual data fetching
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockVenues: Venue[] = [
        {
          id: '1',
          name: 'Isha Sports Complex - Main Ground',
          description: 'Primary outdoor sports complex with multiple courts and fields',
          type: 'outdoor',
          location: {
            address: 'Isha Yoga Center, Velliangiri Foothills',
            city: 'Coimbatore',
            state: 'Tamil Nadu',
            pincode: '641114',
            coordinates: { lat: 11.0168, lng: 76.9558 }
          },
          capacity: 500,
          facilities: ['Changing Rooms', 'Parking', 'Cafeteria', 'First Aid', 'WiFi'],
          sports: ['volleyball', 'throwball'],
          status: 'active',
          availability: {
            startTime: '06:00',
            endTime: '20:00',
            workingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
          },
          contact: {
            manager: 'Rajesh Kumar',
            phone: '+91 9876543210',
            email: 'rajesh@isha.org'
          },
          pricing: {
            hourlyRate: 1500,
            fullDayRate: 12000
          },
          images: ['/venue1.jpg', '/venue1-2.jpg'],
          createdAt: '2024-12-01T00:00:00Z',
          updatedAt: '2025-01-15T10:30:00Z'
        },
        {
          id: '2',
          name: 'Community Center Indoor Courts',
          description: 'Indoor sports facility with air conditioning and modern amenities',
          type: 'indoor',
          location: {
            address: '123 Community Street',
            city: 'Coimbatore',
            state: 'Tamil Nadu',
            pincode: '641001'
          },
          capacity: 200,
          facilities: ['Air Conditioning', 'Sound System', 'Changing Rooms', 'Parking'],
          sports: ['volleyball'],
          status: 'active',
          availability: {
            startTime: '08:00',
            endTime: '22:00',
            workingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
          },
          contact: {
            manager: 'Priya Sharma',
            phone: '+91 9876543211',
            email: 'priya@community.org'
          },
          pricing: {
            hourlyRate: 2000,
            fullDayRate: 15000
          },
          images: ['/venue2.jpg'],
          createdAt: '2024-12-15T00:00:00Z',
          updatedAt: '2025-01-10T14:20:00Z'
        },
        {
          id: '3',
          name: 'Government Sports Stadium',
          description: 'Large outdoor stadium with professional-grade facilities',
          type: 'outdoor',
          location: {
            address: 'Stadium Road',
            city: 'Coimbatore',
            state: 'Tamil Nadu',
            pincode: '641018'
          },
          capacity: 2000,
          facilities: ['VIP Seating', 'Media Center', 'Parking', 'Security', 'Medical Room'],
          sports: ['volleyball', 'throwball'],
          status: 'maintenance',
          availability: {
            startTime: '07:00',
            endTime: '19:00',
            workingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
          },
          contact: {
            manager: 'Suresh Reddy',
            phone: '+91 9876543212',
            email: 'suresh@gov.tn.in'
          },
          pricing: {
            hourlyRate: 3000,
            fullDayRate: 25000
          },
          images: ['/venue3.jpg', '/venue3-2.jpg', '/venue3-3.jpg'],
          createdAt: '2024-11-01T00:00:00Z',
          updatedAt: '2025-01-20T09:45:00Z'
        }
      ];

      setVenues(mockVenues);
    } catch (error) {
      console.error('Error loading venues:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredVenues = venues.filter(venue => {
    const matchesSearch = venue.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         venue.location.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         venue.location.city.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || venue.status === statusFilter;
    const matchesType = typeFilter === 'all' || venue.type === typeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-red-100 text-red-800';
      case 'maintenance': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="w-4 h-4" />;
      case 'inactive': return <XCircle className="w-4 h-4" />;
      case 'maintenance': return <AlertCircle className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'indoor': return 'bg-blue-100 text-blue-800';
      case 'outdoor': return 'bg-green-100 text-green-800';
      case 'mixed': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getFacilityIcon = (facility: string) => {
    switch (facility.toLowerCase()) {
      case 'wifi': return <Wifi className="w-3 h-3" />;
      case 'parking': return <Car className="w-3 h-3" />;
      case 'cafeteria': 
      case 'cafe':
      case 'restaurant': return <Coffee className="w-3 h-3" />;
      default: return <CheckCircle className="w-3 h-3" />;
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-12 bg-gray-200 rounded"></div>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-48 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Venues Management</h1>
          <p className="text-gray-600 mt-2">Manage sports venues, facilities, and availability</p>
        </div>
        
        <div className="mt-4 sm:mt-0">
          <Button
            onClick={() => router.push(`/${lang}/admin/venues/create`)}
            className="bg-[#3A7F3F] hover:bg-green-700 flex items-center"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add New Venue
          </Button>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0 lg:space-x-4">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search venues..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F28C38] focus:border-transparent"
            />
          </div>

          {/* Filters */}
          <div className="flex space-x-4">
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-8 focus:ring-2 focus:ring-[#F28C38] focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="maintenance">Maintenance</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            </div>

            <div className="relative">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-8 focus:ring-2 focus:ring-[#F28C38] focus:border-transparent"
              >
                <option value="all">All Types</option>
                <option value="indoor">Indoor</option>
                <option value="outdoor">Outdoor</option>
                <option value="mixed">Mixed</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            </div>
          </div>
        </div>
      </div>

      {/* Venues List */}
      {filteredVenues.length === 0 ? (
        <div className="text-center py-12">
          <MapPin className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No venues found</h3>
          <p className="text-gray-600 mb-6">
            {searchTerm || statusFilter !== 'all' || typeFilter !== 'all' 
              ? 'Try adjusting your search or filters' 
              : 'Create your first venue to get started'}
          </p>
          {!searchTerm && statusFilter === 'all' && typeFilter === 'all' && (
            <Button
              onClick={() => router.push(`/${lang}/admin/venues/create`)}
              className="bg-[#3A7F3F] hover:bg-green-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create First Venue
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {filteredVenues.map((venue) => (
            <div key={venue.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{venue.name}</h3>
                    
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(venue.status)}`}>
                      {getStatusIcon(venue.status)}
                      <span className="ml-1 capitalize">{venue.status}</span>
                    </span>
                    
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeColor(venue.type)}`}>
                      {venue.type === 'indoor' && <MapPin className="w-3 h-3 mr-1" />}
                      {venue.type === 'outdoor' && <MapPin className="w-3 h-3 mr-1" />}
                      {venue.type === 'mixed' && <MapPin className="w-3 h-3 mr-1" />}
                      <span className="capitalize">{venue.type}</span>
                    </span>
                  </div>
                  
                  <p className="text-gray-600 mb-3">{venue.description}</p>
                  
                  <div className="flex items-center text-sm text-gray-600 mb-2">
                    <MapPin className="w-4 h-4 mr-2" />
                    <span>{venue.location.address}, {venue.location.city}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-2 ml-4">
                  <Button
                    onClick={() => router.push(`/${lang}/admin/venues/${venue.id}`)}
                    variant="outline"
                    className="text-xs py-1 px-3"
                  >
                    <Eye className="w-3 h-3 mr-1" />
                    View
                  </Button>
                  
                  <Button
                    onClick={() => router.push(`/${lang}/admin/venues/${venue.id}/edit`)}
                    variant="outline"
                    className="text-xs py-1 px-3"
                  >
                    <Edit className="w-3 h-3 mr-1" />
                    Edit
                  </Button>
                  
                  <Button
                    variant="outline"
                    className="text-xs py-1 px-3 text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>

              {/* Venue Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <div className="flex items-center text-sm text-gray-600">
                  <Users className="w-4 h-4 mr-2" />
                  <span>Capacity: {venue.capacity.toLocaleString()}</span>
                </div>
                
                <div className="flex items-center text-sm text-gray-600">
                  <Clock className="w-4 h-4 mr-2" />
                  <span>{venue.availability.startTime} - {venue.availability.endTime}</span>
                </div>
                
                <div className="flex items-center text-sm text-gray-600">
                  <Calendar className="w-4 h-4 mr-2" />
                  <span>₹{venue.pricing.hourlyRate.toLocaleString()}/hour</span>
                </div>
                
                <div className="flex items-center text-sm text-gray-600">
                  <MapPin className="w-4 h-4 mr-2" />
                  <span>{venue.contact.manager}</span>
                </div>
              </div>

              {/* Sports and Facilities */}
              <div className="flex flex-wrap gap-4 mb-4">
                {/* Sports */}
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-700">Sports:</span>
                  <div className="flex flex-wrap gap-1">
                    {venue.sports.map((sport, index) => (
                      <span key={index} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {sport}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Facilities */}
              <div className="flex items-start space-x-2">
                <span className="text-sm font-medium text-gray-700 mt-1">Facilities:</span>
                <div className="flex flex-wrap gap-2">
                  {venue.facilities.map((facility, index) => (
                    <span key={index} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                      {getFacilityIcon(facility)}
                      <span className="ml-1">{facility}</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Summary Stats */}
      {venues.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Venues Overview</h3>
          
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-[#3A7F3F]">
                {venues.length}
              </div>
              <div className="text-sm text-gray-600">Total Venues</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {venues.filter(v => v.status === 'active').length}
              </div>
              <div className="text-sm text-gray-600">Active</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {venues.filter(v => v.status === 'maintenance').length}
              </div>
              <div className="text-sm text-gray-600">Maintenance</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {venues.filter(v => v.status === 'inactive').length}
              </div>
              <div className="text-sm text-gray-600">Inactive</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-[#F28C38]">
                {venues.reduce((total, venue) => total + venue.capacity, 0).toLocaleString()}
              </div>
              <div className="text-sm text-gray-600">Total Capacity</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
