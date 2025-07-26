import LoadingSpinner from '@/components/ui/LoadingSpinner';

export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <LoadingSpinner size="large" />
        <h2 className="mt-4 text-lg font-medium text-gray-900 font-roboto">
          Loading Isha Gramotsavam...
        </h2>
        <p className="mt-2 text-sm text-gray-600 font-roboto">
          Please wait while we prepare everything for you
        </p>
      </div>
    </div>
  );
}