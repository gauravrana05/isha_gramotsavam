import { VolunteerNav } from '@/components/volunteer/VolunteerNav';

export default function VolunteerVenueLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6">
        <VolunteerNav />
        {children}
      </div>
    </div>
  );
}
