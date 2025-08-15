'use client'

import { AdvancedTable } from '@/components/ui/AdvancedTable';
import { Card } from '@/components/ui/Card';
import { ArrowRight, Trash2, Edit } from 'lucide-react';

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

interface ClusterDivisionMappingTableProps {
  mappings: ClusterDivisionMapping[];
  onDelete: (mappingId: string) => Promise<void>;
}

export default function ClusterDivisionMappingTable({ mappings, onDelete }: ClusterDivisionMappingTableProps) {
  const handleDeleteMapping = async (mappingId: string) => {
    if (!confirm('Are you sure you want to remove this mapping?')) return;
    
    try {
      await onDelete(mappingId);
    } catch (error) {
      console.error('Failed to delete mapping:', error);
    }
  };

  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold mb-4">Current Cluster-Division Mappings</h2>
      <AdvancedTable
        data={mappings}
        searchable={true}
        searchPlaceholder="Search by cluster name, division name, or state..."
        searchFields={['clusterVenueName', 'divisionVenueName', 'clusterState']}
        columns={[
          {
            key: 'clusterVenueName',
            header: 'Cluster Venue',
            sortable: true,
            render: (_, row) => (
              <div>
                <div className="font-medium text-blue-600">{row.clusterVenueName}</div>
                <div className="text-sm text-gray-500">{row.clusterDistrict}, {row.clusterState}</div>
              </div>
            )
          },
          {
            key: 'mapping',
            header: 'Mapping',
            sortable: false,
            className: 'text-center',
            render: () => (
              <ArrowRight className="w-4 h-4 text-gray-400 mx-auto" />
            )
          },
          {
            key: 'divisionVenueName',
            header: 'Division Venue',
            sortable: true,
            render: (_, row) => (
              <div>
                <div className="font-medium text-green-600">{row.divisionVenueName}</div>
                <div className="text-sm text-gray-500">{row.divisionDistrict}</div>
              </div>
            )
          },
          {
            key: 'clusterState',
            header: 'State',
            sortable: true
          },
          {
            key: 'autoMapped',
            header: 'Type',
            sortable: true,
            render: (value) => (
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                value ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
              }`}>
                {value ? 'Auto-mapped' : 'Manual'}
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
            label: 'Remove',
            icon: Trash2,
            onClick: (row) => handleDeleteMapping(row.id),
            variant: 'danger' as const
          }
        ]}
        pagination={{ enabled: true, pageSize: 25, pageSizeOptions: [10, 25, 50] }}
        emptyMessage="No cluster-division mappings found."
        keyExtractor={(mapping) => mapping.id}
      />
    </Card>
  );
}