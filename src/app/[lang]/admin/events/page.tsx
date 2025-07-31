"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase/config';
import { collection, getDocs, doc, updateDoc, query, orderBy } from 'firebase/firestore';
import Container from '@/components/ui/Container';
import Button from '@/components/ui/Button';
import { 
  Plus, 
  Calendar,
  MapPin,
  Users,
  Trophy,
  Edit,
  Eye,
  Trash2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  IndianRupee
} from 'lucide-react';

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
  registrationFee: number;
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

export default function EventsManagement() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingEvent, setDeletingEvent] = useState<string | null>(null);

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

    loadEvents();
  }, [user, userProfile, authLoading, lang, router]);

  const loadEvents = async () => {
    try {
      setLoading(true);
      const eventsCollection = collection(db, 'events');
      const eventsQuery = query(eventsCollection, orderBy('createdAt', 'desc'));
      const eventsSnapshot = await getDocs(eventsQuery);
      
      const eventsData: Event[] = eventsSnapshot.docs.map(doc => ({
        eventId: doc.id,
        ...doc.data()
      })) as Event[];
      
      setEvents(eventsData);
    } catch (err: any) {
      console.error('Error loading events:', err);
      setError('Failed to load events. Please check your permissions.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm('Are you sure you want to deactivate this event?')) {
      return;
    }

    setDeletingEvent(eventId);
    try {
      const eventDoc = doc(db, 'events', eventId);
      await updateDoc(eventDoc, {
        isActive: false,
        updatedAt: new Date()
      });
      
      // Update local state
      setEvents(prevEvents => 
        prevEvents.map(event => 
          event.eventId === eventId 
            ? { ...event, isActive: false, updatedAt: new Date() }
            : event
        )
      );
      
    } catch (err: any) {
      console.error('Error deactivating event:', err);
      setError('Failed to deactivate event. Please try again.');
    } finally {
      setDeletingEvent(null);
    }
  };

  const isRegistrationCurrentlyOpen = (event: Event) => {
    if (!event.isActive) return false;
    
    const now = new Date();
    const regStart = event.registrationStartDate?.toDate ? event.registrationStartDate.toDate() : null;
    const regEnd = event.registrationEndDate?.toDate ? event.registrationEndDate.toDate() : null;
    
    // If no registration dates are set, use manual flag
    if (!regStart && !regEnd) {
      return event.isRegistrationOpen;
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
    return now >= regStart && now <= regEnd;
  };

  const getStatusColor = (event: Event) => {
    if (!event.isActive) return 'bg-red-100 text-red-800';
    if (isRegistrationCurrentlyOpen(event)) return 'bg-green-100 text-green-800';
    return 'bg-yellow-100 text-yellow-800';
  };

  const getStatusIcon = (event: Event) => {
    if (!event.isActive) return <XCircle className="w-4 h-4" />;
    if (isRegistrationCurrentlyOpen(event)) return <CheckCircle className="w-4 h-4" />;
    return <AlertCircle className="w-4 h-4" />;
  };

  const getStatusText = (event: Event) => {
    if (!event.isActive) return 'Inactive';
    if (isRegistrationCurrentlyOpen(event)) return 'Registration Open';
    return 'Registration Closed';
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
            <h1 className="text-2xl font-bold text-gray-900">Events Management</h1>
            <p className="text-gray-600 text-sm">Manage tournaments, exhibitions, and ceremonies</p>
          </div>
          
          <Button
            onClick={() => router.push(`/${lang}/admin/events/create`)}
            className="bg-[#3A7F3F] hover:bg-green-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Event
          </Button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {/* Events Table - Desktop */}
        {events.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border">
            <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No events found</h3>
            <p className="text-gray-600 mb-4">Create your first event to get started.</p>
            <Button
              onClick={() => router.push(`/${lang}/admin/events/create`)}
              className="bg-[#3A7F3F] hover:bg-green-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Event
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
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Event</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dates</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Teams</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sports</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {events.map((event) => (
                      <tr key={event.eventId} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{event.name}</div>
                            <div className="text-sm text-gray-500">{event.description}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          <div>
                            <div>{event.startDate?.toDate ? event.startDate.toDate().toLocaleDateString() : 'TBD'}</div>
                            <div className="text-xs text-gray-500">to {event.endDate?.toDate ? event.endDate.toDate().toLocaleDateString() : 'TBD'}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {event.maxTeams}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {event.sports?.length || 0} sport{(event.sports?.length || 0) !== 1 ? 's' : ''}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(event)}`}>
                            {getStatusIcon(event)}
                            <span className="ml-1">{getStatusText(event)}</span>
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm font-medium">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => router.push(`/${lang}/admin/events/${event.eventId}`)}
                              className="text-indigo-600 hover:text-indigo-900"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => router.push(`/${lang}/admin/events/${event.eventId}/edit`)}
                              className="text-yellow-600 hover:text-yellow-900"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteEvent(event.eventId)}
                              disabled={deletingEvent === event.eventId}
                              className="text-red-600 hover:text-red-900 disabled:opacity-50"
                            >
                              {deletingEvent === event.eventId ? (
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
              {events.map((event) => (
                <div key={event.eventId} className="bg-white rounded-lg border p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="text-lg font-medium text-gray-900">{event.name}</h3>
                      <p className="text-sm text-gray-500 mt-1">{event.description}</p>
                    </div>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(event)} ml-2`}>
                      {getStatusIcon(event)}
                      <span className="ml-1">{getStatusText(event)}</span>
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <span className="text-xs text-gray-500">Dates</span>
                      <div className="mt-1">
                        <div className="text-sm font-medium text-gray-900">{event.startDate?.toDate ? event.startDate.toDate().toLocaleDateString() : 'TBD'}</div>
                        <div className="text-xs text-gray-500">to {event.endDate?.toDate ? event.endDate.toDate().toLocaleDateString() : 'TBD'}</div>
                      </div>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500">Max Teams</span>
                      <p className="text-sm font-medium text-gray-900 mt-1">{event.maxTeams}</p>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500">Sports</span>
                      <p className="text-sm font-medium text-gray-900 mt-1">{event.sports?.length || 0} sport{(event.sports?.length || 0) !== 1 ? 's' : ''}</p>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500">Venues</span>
                      <p className="text-sm font-medium text-gray-900 mt-1">{event.venues?.length || 0} venue{(event.venues?.length || 0) !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  
                  <div className="flex space-x-2 pt-3 border-t">
                    <button
                      onClick={() => router.push(`/${lang}/admin/events/${event.eventId}`)}
                      className="flex items-center justify-center px-3 py-2 text-sm text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50 rounded-md flex-1"
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      View
                    </button>
                    <button
                      onClick={() => router.push(`/${lang}/admin/events/${event.eventId}/edit`)}
                      className="flex items-center justify-center px-3 py-2 text-sm text-yellow-600 hover:text-yellow-900 hover:bg-yellow-50 rounded-md flex-1"
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteEvent(event.eventId)}
                      disabled={deletingEvent === event.eventId}
                      className="flex items-center justify-center px-3 py-2 text-sm text-red-600 hover:text-red-900 hover:bg-red-50 rounded-md disabled:opacity-50"
                    >
                      {deletingEvent === event.eventId ? (
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
        {events.length > 0 && (
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-lg border text-center">
              <div className="text-2xl font-bold text-green-600">{events.filter(e => e.isActive).length}</div>
              <div className="text-sm text-gray-600">Active</div>
            </div>
            <div className="bg-white p-4 rounded-lg border text-center">
              <div className="text-2xl font-bold text-blue-600">{events.filter(e => isRegistrationCurrentlyOpen(e)).length}</div>
              <div className="text-sm text-gray-600">Registration Open</div>
            </div>
            <div className="bg-white p-4 rounded-lg border text-center">
              <div className="text-2xl font-bold text-red-600">{events.filter(e => !e.isActive).length}</div>
              <div className="text-sm text-gray-600">Inactive</div>
            </div>
          </div>
        )}
      </div>
    </Container>
  );
}