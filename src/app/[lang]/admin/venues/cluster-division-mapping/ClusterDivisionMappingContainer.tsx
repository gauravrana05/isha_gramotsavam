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
  clusterVenueName: string;
  divisionVenueName: string;
  clusterState: string;
  clusterDistrict: string;
  divisionDistrict: string;
  autoMapped: boolean;
  isActive: boolean;
  createdDate: string;
}

interface ClusterDivisionMappingContainerProps {
  venues: Venue[];
  mappings: ClusterDivisionMapping[];
  onDelete: (mappingId: string) => Promise<void>;
  headerButtonOnly?: boolean;
}

export default function ClusterDivisionMappingContainer({
  venues,
  mappings,
  onDelete,
  headerButtonOnly = false
}: ClusterDivisionMappingContainerProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleAddMapping = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const clusterVenues = venues.filter(v => v.type === 'cluster');
  const divisionVenues = venues.filter(v => v.type === 'division');

  if (headerButtonOnly) {
    return (
      <>
        {/* Header Button Only */}
        <Button 
          onClick={handleAddMapping}
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
      />

      {/* Modal */}
      <ClusterDivisionMappingModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        clusterVenues={clusterVenues}
        divisionVenues={divisionVenues}
        existingMappings={mappings}
      />
    </>
  );
}