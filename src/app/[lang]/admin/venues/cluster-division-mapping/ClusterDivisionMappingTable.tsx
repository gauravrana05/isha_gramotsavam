'use client'

import { useState } from 'react';
import { AdvancedTable } from '@/components/ui/AdvancedTable';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ArrowRight, Trash2, Edit, X, AlertTriangle } from 'lucide-react';

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

// Delete Confirmation Modal Component
interface DeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  mapping: ClusterDivisionMapping | null;
  isDeleting: boolean;
}

function DeleteConfirmationModal({ isOpen, onClose, onConfirm, mapping, isDeleting }: DeleteModalProps) {
  if (!isOpen || !mapping) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center">
            <AlertTriangle className="w-6 h-6 text-red-500 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900">Remove Mapping</h2>
          </div>
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-gray-600 mb-4">
            Are you sure you want to remove the mapping between:
          </p>
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-blue-600">{mapping.clusterVenueName}</div>
                <div className="text-sm text-gray-500">{mapping.clusterDistrict}, {mapping.clusterState}</div>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-400 mx-4" />
              <div>
                <div className="font-medium text-green-600">{mapping.divisionVenueName}</div>
                <div className="text-sm text-gray-500">{mapping.divisionDistrict}</div>
              </div>
            </div>
          </div>
          <p className="text-sm text-gray-600">
            This action cannot be undone. Teams from {mapping.clusterVenueName} will no longer be able to advance to {mapping.divisionVenueName}.
          </p>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3 p-6 border-t">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={onConfirm}
            loading={isDeleting}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            Remove Mapping
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function ClusterDivisionMappingTable({ mappings, onDelete }: ClusterDivisionMappingTableProps) {
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    mapping: ClusterDivisionMapping | null;
    isDeleting: boolean;
  }>({
    isOpen: false,
    mapping: null,
    isDeleting: false
  });

  const handleDeleteMapping = (mapping: ClusterDivisionMapping) => {
    setDeleteModal({
      isOpen: true,
      mapping,
      isDeleting: false
    });
  };

  const handleConfirmDelete = async () => {
    if (!deleteModal.mapping) return;
    
    setDeleteModal(prev => ({ ...prev, isDeleting: true }));
    
    try {
      await onDelete(deleteModal.mapping.id);
      setDeleteModal({
        isOpen: false,
        mapping: null,
        isDeleting: false
      });
    } catch (error) {
      console.error('Failed to delete mapping:', error);
      setDeleteModal(prev => ({ ...prev, isDeleting: false }));
    }
  };

  const handleCloseModal = () => {
    if (deleteModal.isDeleting) return;
    setDeleteModal({
      isOpen: false,
      mapping: null,
      isDeleting: false
    });
  };

  return (
    <>
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
              onClick: (row) => handleDeleteMapping(row),
              variant: 'danger' as const
            }
          ]}
          pagination={{ enabled: true, pageSize: 25, pageSizeOptions: [10, 25, 50] }}
          keyExtractor={(mapping) => mapping.id}
          
        />
      </Card>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={deleteModal.isOpen}
        onClose={handleCloseModal}
        onConfirm={handleConfirmDelete}
        mapping={deleteModal.mapping}
        isDeleting={deleteModal.isDeleting}
      />
    </>
  );
}