import { PageLoader } from '@/components/ui/loaders';

export default function Loading() {
  return (
    <PageLoader 
      title="Loading Isha Gramotsavam..."
      subtitle="Please wait while we prepare everything for you"
      variant="brand"
      size="lg"
    />
  );
}