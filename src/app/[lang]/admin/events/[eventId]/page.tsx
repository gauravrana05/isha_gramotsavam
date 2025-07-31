"use client";

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase/config';
import { doc, getDoc, getDocs, collection } from 'firebase/firestore';
import Container from '@/components/ui/Container';
import Button from '@/components/ui/Button';
import { ArrowLeft, Edit, Calendar, MapPin, Users, Trophy, CheckCircle, XCircle, AlertCircle, Loader2, IndianRupee } from 'lucide-react';

interface Event {
  eventId: string;
  name: string;
  description: string;
  startDate: any;
  endDate: any;
  registrationStartDate: any;
  registrationEndDate: any;
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
  createdAt: any;
  updatedAt: any;
}

export default function EventDetailPage() {
  const [event, setEvent] = useState<Event | null>(null);
  const [sportsData, setSportsData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const router = useRouter();
  const { lang, eventId } = useParams();
  const { user, userProfile } = useAuth();

  useEffect(() => {
    if (!user || userProfile?.role !== 'admin') {
      router.push(`/${lang}/login`);
      return;
    }

    loadEvent();
  }, [user, userProfile, eventId]);

  const loadEvent = async () => {
    try {
      setLoading(true);
      
      // Load event data
      const eventDoc = doc(db, 'events', eventId as string);
      const eventSnapshot = await getDoc(eventDoc);
      
      if (eventSnapshot.exists()) {
        const eventData = {
          eventId: eventSnapshot.id,
          ...eventSnapshot.data()
        } as Event;
        setEvent(eventData);

        // Load sports data for sport names
        const sportsCollection = collection(db, 'sports');
        const sportsSnapshot = await getDocs(sportsCollection);
        const sportsMap = sportsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setSportsData(sportsMap);
      } else {
        setError('Event not found');
      }
    } catch (err: any) {
      console.error('Error loading event:', err);
      setError('Failed to load event details');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (isActive: boolean, isRegistrationOpen: boolean) => {
    if (!isActive) return 'bg-red-100 text-red-800';
    if (isRegistrationOpen) return 'bg-green-100 text-green-800';
    return 'bg-yellow-100 text-yellow-800';
  };

  const getStatusIcon = (isActive: boolean, isRegistrationOpen: boolean) => {
    if (!isActive) return <XCircle className="w-4 h-4" />;
    if (isRegistrationOpen) return <CheckCircle className="w-4 h-4" />;
    return <AlertCircle className="w-4 h-4" />;
  };

  const getStatusText = (isActive: boolean, isRegistrationOpen: boolean) => {
    if (!isActive) return 'Inactive';
    if (isRegistrationOpen) return 'Registration Open';
    return 'Registration Closed';
  };

  const getSportName = (sportId: string) => {
    const sport = sportsData.find(s => s.id === sportId);
    return sport?.displayName || sportId;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#3A7F3F]" />
      </div>
    );
  }

  if (error || !event) {
    return (
      <Container>
        <div className="max-w-4xl mx-auto py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Event Not Found</h1>
            <p className="text-gray-600 mb-6">{error || 'The requested event could not be found.'}</p>
            <Button
              onClick={() => router.push(`/${lang}/admin/events`)}
              className="bg-[#3A7F3F] hover:bg-green-700"
            >
              Back to Events
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
              <h1 className="text-2xl font-bold text-gray-900">{event.name}</h1>
              <p className="text-gray-600 text-sm">Event Details</p>
            </div>
          </div>
          
          <Button
            onClick={() => router.push(`/${lang}/admin/events/${eventId}/edit`)}
            className="bg-[#3A7F3F] hover:bg-green-700"
          >
            <Edit className="w-4 h-4 mr-2" />
            Edit Event
          </Button>
        </div>

        {/* Status Badge */}
        <div className="mb-6">
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(event.isActive, event.isRegistrationOpen)}`}>
            {getStatusIcon(event.isActive, event.isRegistrationOpen)}
            <span className="ml-2">{getStatusText(event.isActive, event.isRegistrationOpen)}</span>
          </span>
        </div>

        <div className="grid gap-6">
          {/* Basic Information */}
          <div className="bg-white rounded-lg border p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-medium text-gray-500">Event Name</label>
                <p className="text-gray-900 mt-1">{event.name}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500">Max Teams</label>
                <p className="text-gray-900 mt-1">{event.maxTeams}</p>
              </div>
              
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-gray-500">Description</label>
                <p className="text-gray-900 mt-1">{event.description || 'No description provided'}</p>
              </div>
            </div>
          </div>

          {/* Event Dates */}
          <div className="bg-white rounded-lg border p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Event Schedule</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-medium text-gray-500">Event Start Date</label>
                <div className="flex items-center mt-1">
                  <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                  <p className="text-gray-900">{event.startDate?.toDate ? event.startDate.toDate().toLocaleDateString() : 'Not set'}</p>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500">Event End Date</label>
                <div className="flex items-center mt-1">
                  <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                  <p className="text-gray-900">{event.endDate?.toDate ? event.endDate.toDate().toLocaleDateString() : 'Not set'}</p>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500">Registration Start</label>
                <div className="flex items-center mt-1">
                  <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                  <p className="text-gray-900">{event.registrationStartDate?.toDate ? event.registrationStartDate.toDate().toLocaleDateString() : 'Not set'}</p>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500">Registration End</label>
                <div className="flex items-center mt-1">
                  <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                  <p className="text-gray-900">{event.registrationEndDate?.toDate ? event.registrationEndDate.toDate().toLocaleDateString() : 'Not set'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Sports */}
          <div className="bg-white rounded-lg border p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Sports</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {event.sports.map((sportId, index) => (
                <div key={index} className="flex items-center p-3 bg-gray-50 rounded-lg">
                  <Trophy className="w-4 h-4 text-[#3A7F3F] mr-2" />
                  <span className="text-sm font-medium text-gray-900">{getSportName(sportId)}</span>
                </div>
              ))}
            </div>
            
            {event.sports.length === 0 && (
              <p className="text-gray-500">No sports selected</p>
            )}
          </div>

          {/* Venues */}
          {event.venues.length > 0 && (
            <div className="bg-white rounded-lg border p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Venues</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {event.venues.map((venue, index) => (
                  <div key={index} className="flex items-center p-3 bg-gray-50 rounded-lg">
                    <MapPin className="w-4 h-4 text-[#3A7F3F] mr-2" />
                    <span className="text-sm font-medium text-gray-900">{venue}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Prize Distribution */}
          <div className="bg-white rounded-lg border p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Prize Distribution by Level</h3>
            
            {Object.entries(event.prizes).map(([level, prizes]) => (
              <div key={level} className="mb-6 last:mb-0">
                <h4 className="text-md font-semibold text-gray-800 mb-3 capitalize">{level}</h4>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-3 bg-yellow-50 rounded-lg">
                    <div className="text-sm text-gray-500">First Prize</div>
                    <div className="flex items-center justify-center mt-1">
                      <IndianRupee className="w-4 h-4 text-yellow-600 mr-1" />
                      <span className="text-lg font-bold text-yellow-600">{prizes.first.toLocaleString()}</span>
                    </div>
                  </div>
                  
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="text-sm text-gray-500">Second Prize</div>
                    <div className="flex items-center justify-center mt-1">
                      <IndianRupee className="w-4 h-4 text-gray-600 mr-1" />
                      <span className="text-lg font-bold text-gray-600">{prizes.second.toLocaleString()}</span>
                    </div>
                  </div>
                  
                  <div className="text-center p-3 bg-orange-50 rounded-lg">
                    <div className="text-sm text-gray-500">Third Prize</div>
                    <div className="flex items-center justify-center mt-1">
                      <IndianRupee className="w-4 h-4 text-orange-600 mr-1" />
                      <span className="text-lg font-bold text-orange-600">{prizes.third.toLocaleString()}</span>
                    </div>
                  </div>
                  
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <div className="text-sm text-gray-500">Participation</div>
                    <div className="flex items-center justify-center mt-1">
                      <IndianRupee className="w-4 h-4 text-green-600 mr-1" />
                      <span className="text-lg font-bold text-green-600">{prizes.participation.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Rules */}
          {event.rules.length > 0 && (
            <div className="bg-white rounded-lg border p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Rules</h3>
              
              <ul className="space-y-2">
                {event.rules.map((rule, index) => (
                  <li key={index} className="flex items-start">
                    <span className="text-[#3A7F3F] mr-2">•</span>
                    <span className="text-gray-900">{rule}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Eligibility Criteria */}
          {event.eligibilityCriteria.length > 0 && (
            <div className="bg-white rounded-lg border p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Eligibility Criteria</h3>
              
              <ul className="space-y-2">
                {event.eligibilityCriteria.map((criteria, index) => (
                  <li key={index} className="flex items-start">
                    <span className="text-[#3A7F3F] mr-2">•</span>
                    <span className="text-gray-900">{criteria}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Contact Information */}
          <div className="bg-white rounded-lg border p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Contact Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-medium text-gray-500">Email</label>
                <p className="text-gray-900 mt-1">{event.contactInfo.email || 'Not provided'}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500">Phone</label>
                <p className="text-gray-900 mt-1">{event.contactInfo.phone || 'Not provided'}</p>
              </div>
              
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-gray-500">Address</label>
                <p className="text-gray-900 mt-1">{event.contactInfo.address || 'Not provided'}</p>
              </div>
            </div>
          </div>

          {/* Additional Information */}
          <div className="bg-white rounded-lg border p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Additional Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-medium text-gray-500">Created At</label>
                <p className="text-gray-900 mt-1">
                  {event.createdAt?.toDate ? event.createdAt.toDate().toLocaleDateString() : 'Unknown'}
                </p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500">Last Updated</label>
                <p className="text-gray-900 mt-1">
                  {event.updatedAt?.toDate ? event.updatedAt.toDate().toLocaleDateString() : 'Unknown'}
                </p>
              </div>
              
              {event.bannerImageURL && (
                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-gray-500">Banner Image URL</label>
                  <p className="text-gray-900 mt-1 truncate">{event.bannerImageURL}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Container>
  );
}
