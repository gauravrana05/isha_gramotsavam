'use client'

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Plus } from 'lucide-react';
import ClusterDivisionMappingTable from './ClusterDivisionMappingTable';
import ClusterDivisionMappingModal from './ClusterDivisionMappingModal';

interface Venue {
  id: string;
  name: string;
  type: 'cluster' | 'division' | 'final';
  state: string;
  district: string;
  isActive: boolean;
}

interface ClusterDivisionMapping {
  id: string;
  mappingId: string;
  divisionVenueId?: string; // For editing purposes - division venue ID
  divisionVenueName: string;
  divisionState: string; // Division venue state for editing
  divisionDistrict: string; // Division venue district for editing
  assignedClusters: string[]; // For display purposes - array of cluster names
  assignedClusterIds?: string[]; // For editing purposes - array of cluster venue IDs
  state?: string; // State information for editing
  autoMapped: boolean;
  isActive: boolean;
  createdDate: string;
}

interface ClusterDivisionMappingContainerProps {
  venues: Venue[];
  mappings: ClusterDivisionMapping[];
  onDelete: (mappingId: string) => Promise<void>;
  headerButtonOnly?: boolean;
  statesRequiringMapping?: { state: string; divisionsCount: number; clustersCount: number }[];
}

export default function ClusterDivisionMappingContainer({
  venues,
  mappings,
  onDelete,
  headerButtonOnly = false,
  statesRequiringMapping = []
}: ClusterDivisionMappingContainerProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMapping, setEditingMapping] = useState<ClusterDivisionMapping | null>(null);

  const handleAddMapping = () => {
    setEditingMapping(null);
    setIsModalOpen(true);
  };

  const handleEditMapping = (mapping: ClusterDivisionMapping) => {
    setEditingMapping(mapping);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingMapping(null);
  };

  const clusterVenues = venues.filter(v => v.type === 'cluster');
  const divisionVenues = venues.filter(v => v.type === 'division');

  // Check if there are eligible division venues for mapping
  const getEligibleDivisionVenues = () => {
    const statesNeedingMapping = statesRequiringMapping.map(s => s.state);
    return divisionVenues.filter(v => {
      const isInStateNeedingMapping = statesNeedingMapping.includes(v.state);
      const isAlreadyMapped = mappings.some(m => m.divisionVenueName === v.name && m.isActive);
      return isInStateNeedingMapping && !isAlreadyMapped;
    });
  };

  const hasEligibleVenues = getEligibleDivisionVenues().length > 0;

  if (headerButtonOnly) {
    return (
      <>
        {/* Header Button Only */}
        <Button 
          onClick={handleAddMapping}
          disabled={!hasEligibleVenues}
          leftIcon={Plus}
          variant="primary"
          size="sm"
        >
          Add Mapping
        </Button>

        {/* Modal */}
        <ClusterDivisionMappingModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          clusterVenues={clusterVenues}
          divisionVenues={divisionVenues}
          existingMappings={mappings}
          statesRequiringMapping={statesRequiringMapping}
          editingMapping={editingMapping}
        />
      </>
    );
  }

  return (
    <>
      {/* Mappings Table */}
      <ClusterDivisionMappingTable 
        mappings={mappings} 
        onDelete={onDelete}
        onEdit={handleEditMapping}
      />

      {/* Modal */}
      <ClusterDivisionMappingModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        clusterVenues={clusterVenues}
        divisionVenues={divisionVenues}
        existingMappings={mappings}
        statesRequiringMapping={statesRequiringMapping}
        editingMapping={editingMapping}
      />
    </>
  );
}