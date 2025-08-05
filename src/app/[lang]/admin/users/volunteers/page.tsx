import { adminDb } from '@/lib/firebase/admin';
import { 
  Plus, 
  UserCheck,
  MapPin,
  Users,
  Calendar,
  CheckCircle,
  Clock,
  Edit,
  Eye,
  Trash2,
  Phone,
  Mail,
  Shield,
  XCircle
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import Link from 'next/link';
import { serializeFirestoreDocs } from '@/lib/utils/firestore';

interface PageProps {
  params: {
    lang: string;
  };
}

async function getVolunteers() {
  try {
    const volunteersSnapshot = await adminDb.collection('users')
      .where('role', 'in', ['verification_volunteer', 'general_volunteer', 'technical_volunteer'])
      .get();
    return serializeFirestoreDocs(volunteersSnapshot.docs);
  } catch (error) {
    console.error('Error fetching volunteers:', error);
    return [];
  }
}

async function getVolunteerAssignments() {
  try {
    const assignmentsSnapshot = await adminDb.collection('volunteerVenueAssignment').get();
    return serializeFirestoreDocs(assignmentsSnapshot.docs);
  } catch (error) {
    console.error('Error fetching assignments:', error);
    return [];
  }
}

export default async function VolunteersManagement({ params }: PageProps) {
  const { lang } = await params;
  const volunteers = await getVolunteers();
  const assignments = await getVolunteerAssignments();

  // Group assignments by volunteer
  const volunteerAssignments = assignments.reduce((acc, assignment) => {
    if (!acc[assignment.volunteerId]) {
      acc[assignment.volunteerId] = [];
    }
    acc[assignment.volunteerId].push(assignment);
    return acc;
  }, {} as Record<string, any[]>);

  const getStatusColor = (isActive: boolean) => {
    return isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
  };

  const getStatusIcon = (isActive: boolean) => {
    return isActive ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />;
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'technical_volunteer': return 'bg-purple-100 text-purple-800';
      case 'general_volunteer': return 'bg-blue-100 text-blue-800';
      case 'verification_volunteer': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'technical_volunteer': return <Users className="w-3 h-3 mr-1" />;
      case 'general_volunteer': return <UserCheck className="w-3 h-3 mr-1" />;
      case 'verification_volunteer': return <Shield className="w-3 h-3 mr-1" />;
      default: return <Users className="w-3 h-3 mr-1" />;
    }
  };

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Volunteers Management</h1>
          <p className="text-gray-600 mt-2">Manage volunteers, assignments, and coordination</p>
        </div>
        
        <div className="mt-4 sm:mt-0 flex gap-3">
          <Link href={`/${lang}/admin/users/volunteers/assign-venues`}>
            <Button variant="outline" className="flex items-center">
              <MapPin className="w-4 h-4 mr-2" />
              Assign Venues
            </Button>
          </Link>
          <Link href={`/${lang}/admin/users/volunteers/add`}>
            <Button className="bg-[#3A7F3F] hover:bg-green-700 flex items-center">
              <Plus className="w-4 h-4 mr-2" />
              Add Volunteer
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-500">Total Volunteers</h3>
              <p className="text-2xl font-semibold text-gray-900">{volunteers.length}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-500">Active</h3>
              <p className="text-2xl font-semibold text-gray-900">
                {volunteers.filter(v => v.isActive).length}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <MapPin className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-500">Assigned</h3>
              <p className="text-2xl font-semibold text-gray-900">
                {Object.keys(volunteerAssignments).length}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-500">Venues</h3>
              <p className="text-2xl font-semibold text-gray-900">
                {new Set(assignments.map(a => a.venueId)).size}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Volunteers List */}
      {volunteers.length === 0 ? (
        <Card className="p-12 text-center">
          <UserCheck className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No volunteers found</h3>
          <p className="text-gray-600 mb-6">
            Add your first volunteer to get started
          </p>
          <Link href={`/${lang}/admin/users/volunteers/add`}>
            <Button className="bg-[#3A7F3F] hover:bg-green-700">
              <Plus className="w-4 h-4 mr-2" />
              Add First Volunteer
            </Button>
          </Link>
        </Card>
      ) : (
        <div className="space-y-4">
          {volunteers.map((volunteer) => {
            const assignments = volunteerAssignments[volunteer.id] || [];
            
            return (
              <Card key={volunteer.id} className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {volunteer.firstName} {volunteer.lastName}
                      </h3>
                      
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(volunteer.isActive)}`}>
                        {getStatusIcon(volunteer.isActive)}
                        <span className="ml-1">{volunteer.isActive ? 'Active' : 'Inactive'}</span>
                      </span>
                      
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleColor(volunteer.role)}`}>
                        {getRoleIcon(volunteer.role)}
                        <span className="capitalize">{volunteer.role.replace('_', ' ')}</span>
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-4 text-sm text-gray-600 mb-3">
                      {volunteer.email && (
                        <div className="flex items-center">
                          <Mail className="w-4 h-4 mr-2" />
                          <span>{volunteer.email}</span>
                        </div>
                      )}
                      {volunteer.phoneNumber && (
                        <div className="flex items-center">
                          <Phone className="w-4 h-4 mr-2" />
                          <span>{volunteer.phoneNumber}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 ml-4">
                    <Link href={`/${lang}/admin/users/${volunteer.id}`}>
                      <Button variant="outline" size="sm">
                        <Eye className="w-3 h-3 mr-1" />
                        View
                      </Button>
                    </Link>
                    
                    <Link href={`/${lang}/admin/users/${volunteer.id}/edit`}>
                      <Button variant="outline" size="sm">
                        <Edit className="w-3 h-3 mr-1" />
                        Edit
                      </Button>
                    </Link>
                  </div>
                </div>

                {/* Volunteer Details */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="flex items-center text-sm text-gray-600">
                    <Calendar className="w-4 h-4 mr-2" />
                    <span>Joined: {volunteer.createdAt ? new Date(volunteer.createdAt).toLocaleDateString() : 'N/A'}</span>
                  </div>
                  
                  <div className="flex items-center text-sm text-gray-600">
                    <MapPin className="w-4 h-4 mr-2" />
                    <span>Assignments: {assignments.length}</span>
                  </div>
                  
                  <div className="flex items-center text-sm text-gray-600">
                    <Users className="w-4 h-4 mr-2" />
                    <span>Profile: {volunteer.isProfileComplete ? 'Complete' : 'Incomplete'}</span>
                  </div>
                </div>

                {/* Venue Assignments */}
                {assignments.length > 0 && (
                  <div className="border-t pt-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Venue Assignments:</h4>
                    <div className="flex flex-wrap gap-2">
                      {assignments.map((assignment, index) => (
                        <span key={index} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {assignment.venueName}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}