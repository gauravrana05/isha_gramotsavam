'use client'

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Plus } from 'lucide-react';
import LocationMappingTable from './LocationMappingTable';
import VenueTalukMappingModal from './VenueTalukMappingModal';

interface Venue {
  id: string;
  name: string;
  address: {
    state: string;
    district: string;
    taluk?: string;
    panchayat?: string;
  };
  type?: string;
}

interface ExistingMapping {
  id: string;
  mappingId: string;
  venueName: string;
  venueId: string;
  assignedLocations: {
    districts?: string[];
    taluks?: string[];
    state?: string;
  };
  maxTeams: number;
  isActive: boolean;
  createdAt?: any;
}

interface LocationMappingContainerProps {
  venues: Venue[];
  mappings: ExistingMapping[];
  districtsWithMultipleVenues: { district: string; count: number; state: string }[];
  headerButtonOnly?: boolean;
}

export default function LocationMappingContainer({
  venues,
  mappings,
  districtsWithMultipleVenues,
  headerButtonOnly = false
}: LocationMappingContainerProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMapping, setEditingMapping] = useState<ExistingMapping | null>(null);

  const handleAddMapping = () => {
    setEditingMapping(null);
    setIsModalOpen(true);
  };

  const handleEditMapping = (mapping: ExistingMapping) => {
    setEditingMapping(mapping);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingMapping(null);
  };

  // Check if there are eligible venues for mapping
  const getEligibleVenues = () => {
    return venues.filter(venue => {
      const isInMultiVenueDistrict = districtsWithMultipleVenues.some(d => d.district === venue.address.district);
      const isAlreadyAssigned = mappings.some(mapping => 
        mapping.venueId === venue.id && mapping.isActive
      );
      return isInMultiVenueDistrict && !isAlreadyAssigned;
    });
  };

  const hasEligibleVenues = getEligibleVenues().length > 0;

  if (headerButtonOnly) {
    return (
      <>
        {/* Header Button Only */}
        <Button 
          onClick={handleAddMapping}
          disabled={!hasEligibleVenues}
          className="flex items-center gap-2"
          size="sm"
        >
          <Plus className="h-4 w-4" />
          Add Venue Mapping
        </Button>

        {/* Modal */}
        <VenueTalukMappingModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          venues={venues}
          existingMappings={mappings}
          districtsWithMultipleVenues={districtsWithMultipleVenues}
          editingMapping={editingMapping}
        />
      </>
    );
  }

  return (
    <>
      {/* Mappings Table */}
      <LocationMappingTable 
        mappings={mappings} 
        onEdit={(mapping) => handleEditMapping(mapping as ExistingMapping)}
      />

      {/* Modal */}
      <VenueTalukMappingModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        venues={venues}
        existingMappings={mappings}
        districtsWithMultipleVenues={districtsWithMultipleVenues}
        editingMapping={editingMapping}
      />
    </>
  );
}