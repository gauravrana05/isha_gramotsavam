import { useState, useEffect } from 'react';
import { getVolunteerService } from '@/lib/services/offline/volunteerService';

export function useOfflineAssignments() {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const service = getVolunteerService();
        const assignments = await service.getMyAssignments();
        setData(assignments);
      } catch (err) {
        setError(err);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  return { data, isLoading, error };
}
