'use client'

import { AdvancedTable } from '@/components/ui/AdvancedTable';
import { Card } from '@/components/ui/Card';
import { Trash2, Edit } from 'lucide-react';
import { deleteVenueLocationMapping } from '@/lib/actions/admin/venueMapping';

interface LocationMapping {
  id: string;
  mappingId: string;
  venueName: string;
  assignedLocations: {
    districts?: string[];
    taluks?: string[];
  };
  maxTeams: number;
  isActive: boolean;
  createdAt?: any;
}

interface LocationMappingTableProps {
  mappings: LocationMapping[];
  onEdit: (mapping: LocationMapping) => void;
}

export default function LocationMappingTable({ mappings, onEdit }: LocationMappingTableProps) {
  const handleDeleteMapping = async (mappingId: string) => {
    try {
      await deleteVenueLocationMapping(mappingId);
      // The page will automatically revalidate due to revalidatePath in the server action
    } catch (error) {
      // Error handling removed
      // You could add toast notification here
    }
  };

  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold mb-4">Existing Location Mappings</h2>
      <AdvancedTable
        data={mappings.map(mapping => ({
          ...mapping,
          districts: mapping.assignedLocations.districts?.join(', ') || '',
          taluks: mapping.assignedLocations.taluks?.join(', ') || 'No taluks assigned',
          statusBadge: mapping.isActive ? 'Active' : 'Inactive',
          createdDate: mapping.createdAt ? new Date(mapping.createdAt).toLocaleDateString() : 'N/A'
        }))}
        searchable={true}
        searchPlaceholder="Search by venue name, district, or taluk..."
        searchFields={['venueName', 'districts', 'taluks']}
        columns={[
          {
            key: 'venueName',
            header: 'Venue Name',
            sortable: true
          },
          {
            key: 'districts',
            header: 'District',
            sortable: true
          },
          {
            key: 'taluks',
            header: 'Assigned Taluks',
            sortable: false,
            width: '300px',
            className: 'max-w-[300px]',
            render: (value) => (
              <div className="whitespace-normal break-words leading-relaxed text-sm">
                {value === 'No taluks assigned' ? (
                  <span className="text-gray-500 italic">{value}</span>
                ) : (
                  <div className="space-y-1">
                    {value.split(', ').map((taluk: string, index: number) => (
                      <span
                        key={index}
                        className="inline-block bg-blue-50 text-blue-700 px-2 py-1 rounded-full text-xs mr-1 mb-1"
                      >
                        {taluk.trim()}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )
          },
          {
            key: 'maxTeams',
            header: 'Max Teams',
            sortable: true,
            className: 'text-center',
            render: (value) => <span className="font-medium">{value}</span>
          },
          {
            key: 'statusBadge',
            header: 'Status',
            sortable: true,
            render: (value, row) => (
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                row.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {value}
              </span>
            )
          },
          {
            key: 'createdDate',
            header: 'Created',
            sortable: true
          }
        ]}
        actions={[
          {
            label: 'Edit',
            icon: Edit,
            onClick: (row) => onEdit(row),
            variant: 'secondary' as const
          },
          {
            label: 'Deactivate',
            icon: Trash2,
            onClick: (row) => handleDeleteMapping(row.id),
            variant: 'danger' as const
          }
        ]}
        pagination={{ enabled: true, pageSize: 10, pageSizeOptions: [10, 25, 50] }}
        emptyMessage="No location mappings found."
      />
    </Card>
  );
}