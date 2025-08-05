import { addVolunteer } from '@/lib/actions/admin/volunteerManagement';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import Link from 'next/link';
import AddVolunteerForm from './AddVolunteerForm';

interface PageProps {
  params: Promise<{
    lang: string;
  }>;
}

export default async function AddVolunteerPage({ params }: PageProps) {
  const { lang } = await params;

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Add Volunteer</h1>
          <p className="text-gray-600 mt-2">Add a new volunteer to help manage the tournament</p>
        </div>
        
        <Link href={`/${lang}/admin/users/volunteers`}>
          <Button variant="outline">
            ← Back to Volunteers
          </Button>
        </Link>
      </div>

      {/* Form */}
      <div className="max-w-2xl">
        <AddVolunteerForm />
      </div>
    </div>
  );
}