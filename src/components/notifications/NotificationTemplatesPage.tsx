'use client'
import React, { useState } from 'react';
import { 
  Plus, 
  Edit3, 
  Trash2, 
  Copy,
  Eye,
  Filter,
  Tag
} from 'lucide-react';
import { Button, AdvancedTable, StatusBadge, EmptyState } from '@/components/ui';
import { EnhancedModal } from '@/components/ui/EnhancedModal';
import type { Column, ActionButton } from '@/components/ui/Table';
import { cn } from '@/lib/component-patterns';
import { api } from '@/lib/api';
import { useNotification } from '@/context/NotificationContext';

interface NotificationTemplate {
  id: string;
  name: string;
  title: string;
  message: string;
  type: string;
  category: string;
  isActive: boolean;
  variables: Record<string, string>;
  createdAt: Date;
  createdByUser: {
    id: string;
    firstName: string | null;
    lastName: string | null;
  };
}

export const NotificationTemplatesPage: React.FC = () => {
  const { addNotification } = useNotification();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<NotificationTemplate | null>(null);
  const [selectedTemplates, setSelectedTemplates] = useState<Set<string>>(new Set());
  const [filterCategory, setFilterCategory] = useState<string>('all');
  
  // Fetch templates
  const { 
    data: templates = [], 
    isLoading,
    refetch 
  } = api.notifications.getTemplates.useQuery({
    category: filterCategory === 'all' ? undefined : filterCategory as any,
  });

  // Create template mutation
  const createTemplateMutation = api.notifications.createTemplate.useMutation({
    onSuccess: () => {
      refetch();
      addNotification('Template created successfully', 'success');
      setShowCreateModal(false);
    },
    onError: (error) => {
      addNotification(error.message, 'error');
    },
  });

  // Define columns for templates table
  const columns: Column<NotificationTemplate>[] = [
    {
      key: 'name',
      label: 'Template Name',
      width: 'w-48',
      render: (template) => (
        <div>
          <div className="font-medium text-gray-900">{template.name}</div>
          <div className="text-sm text-gray-500 truncate">
            {template.title}
          </div>
        </div>
      ),
    },
    {
      key: 'category',
      label: 'Category',
      width: 'w-24',
      render: (template) => {
        const categoryColors = {
          general: 'gray',
          match: 'green',
          team: 'blue',
          verification: 'purple',
          system: 'red',
          emergency: 'red',
        };
        
        return (
          <StatusBadge
            status={template.category}
            variant={categoryColors[template.category as keyof typeof categoryColors] as any}
            size="sm"
          />
        );
      },
    },
    {
      key: 'type',
      label: 'Type',
      width: 'w-24',
      render: (template) => {
        const typeColors = {
          info: 'blue',
          success: 'green',
          warning: 'yellow',
          error: 'red',
          team_invitation: 'purple',
          verification_update: 'blue',
          match_result: 'green',
          venue_assignment: 'blue',
          system_announcement: 'red',
          match_reminder: 'orange',
          tournament_update: 'blue',
        };
        
        return (
          <StatusBadge
            status={template.type}
            variant={typeColors[template.type as keyof typeof typeColors] as any}
            size="sm"
          />
        );
      },
    },
    {
      key: 'message',
      label: 'Message Preview',
      width: 'w-64',
      render: (template) => (
        <div className="text-sm text-gray-600 truncate">
          {template.message.substring(0, 80)}...
        </div>
      ),
    },
    {
      key: 'variables',
      label: 'Variables',
      width: 'w-32',
      render: (template) => (
        <div className="text-sm">
          {Object.keys(template.variables).length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {Object.keys(template.variables).slice(0, 2).map((key) => (
                <span
                  key={key}
                  className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-700"
                >
                  {key}
                </span>
              ))}
              {Object.keys(template.variables).length > 2 && (
                <span className="text-xs text-gray-500">
                  +{Object.keys(template.variables).length - 2}
                </span>
              )}
            </div>
          ) : (
            <span className="text-gray-500">None</span>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      width: 'w-20',
      render: (template) => (
        <StatusBadge
          status={template.isActive ? 'active' : 'inactive'}
          variant={template.isActive ? 'green' : 'gray'}
          size="sm"
        />
      ),
    },
    {
      key: 'createdBy',
      label: 'Created By',
      width: 'w-32',
      render: (template) => (
        <div className="text-sm">
          <div className="font-medium text-gray-900">
            {template.createdByUser.firstName} {template.createdByUser.lastName}
          </div>
          <div className="text-xs text-gray-500">
            {new Date(template.createdAt).toLocaleDateString()}
          </div>
        </div>
      ),
    },
  ];

  // Define action buttons
  const actionButtons: ActionButton<NotificationTemplate>[] = [
    {
      label: 'View Details',
      icon: Eye,
      onClick: (template) => {
        // TODO: Implement view details modal
        addNotification('View details coming soon', 'info');
      },
      variant: 'ghost',
    },
    {
      label: 'Edit Template',
      icon: Edit3,
      onClick: (template) => {
        setEditingTemplate(template);
        setShowCreateModal(true);
      },
      variant: 'ghost',
    },
    {
      label: 'Duplicate',
      icon: Copy,
      onClick: (template) => {
        // TODO: Implement duplicate functionality
        addNotification('Duplicate functionality coming soon', 'info');
      },
      variant: 'ghost',
    },
    {
      label: 'Delete',
      icon: Trash2,
      onClick: (template) => {
        // TODO: Implement delete functionality
        addNotification('Delete functionality coming soon', 'info');
      },
      variant: 'ghost',
      className: 'text-red-600 hover:text-red-700',
    },
  ];

  const categories = [
    { value: 'all', label: 'All Categories' },
    { value: 'general', label: 'General' },
    { value: 'match', label: 'Match' },
    { value: 'team', label: 'Team' },
    { value: 'verification', label: 'Verification' },
    { value: 'system', label: 'System' },
    { value: 'emergency', label: 'Emergency' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notification Templates</h1>
          <p className="text-gray-600 mt-1">
            Create and manage reusable notification templates
          </p>
        </div>
        
        <Button
          onClick={() => {
            setEditingTemplate(null);
            setShowCreateModal(true);
          }}
          className="bg-primary-600 hover:bg-primary-700 text-white w-full sm:w-auto"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Template
        </Button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg w-fit overflow-x-auto">
        {categories.map((category) => (
          <button
            key={category.value}
            onClick={() => setFilterCategory(category.value)}
            className={cn(
              'px-4 py-2 text-sm font-medium rounded-md transition-all whitespace-nowrap',
              filterCategory === category.value
                ? 'bg-white text-primary-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            )}
          >
            {category.label}
          </button>
        ))}
      </div>

      {/* Templates Table */}
      <div className="bg-white rounded-lg border border-gray-200">
        {templates.length === 0 && !isLoading ? (
          <EmptyState
            title="No templates found"
            description={
              filterCategory === 'all'
                ? "You haven't created any notification templates yet."
                : `No ${filterCategory} templates found.`
            }
            action={{
              label: 'Create First Template',
              onClick: () => {
                setEditingTemplate(null);
                setShowCreateModal(true);
              },
            }}
          />
        ) : (
          <AdvancedTable
            data={templates}
            columns={columns}
            actions={actionButtons}
            isLoading={isLoading}
            selectable
            selectedItems={selectedTemplates}
            onSelectionChange={setSelectedTemplates}
            searchable
            searchPlaceholder="Search templates..."
            pagination={{
              pageSize: 20,
            }}
          />
        )}
      </div>

      {/* Create/Edit Template Modal */}
      <TemplateModal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setEditingTemplate(null);
        }}
        onSubmit={async (data) => {
          await createTemplateMutation.mutateAsync(data);
        }}
        template={editingTemplate}
        isLoading={createTemplateMutation.isLoading}
      />
    </div>
  );
};

// Template creation/editing modal
interface TemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  template?: NotificationTemplate | null;
  isLoading: boolean;
}

const TemplateModal: React.FC<TemplateModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  template,
  isLoading,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    title: '',
    message: '',
    type: 'info',
    category: 'general',
    variables: {} as Record<string, string>,
  });

  React.useEffect(() => {
    if (template) {
      setFormData({
        name: template.name,
        title: template.title,
        message: template.message,
        type: template.type,
        category: template.category,
        variables: template.variables,
      });
    } else {
      setFormData({
        name: '',
        title: '',
        message: '',
        type: 'info',
        category: 'general',
        variables: {},
      });
    }
  }, [template, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
  };

  return (
    <EnhancedModal
      isOpen={isOpen}
      onClose={onClose}
      title={template ? 'Edit Template' : 'Create Template'}
      size="lg"
      mobileFullScreen
      scrollableBody
      footer={
        <div className="flex flex-col-reverse sm:flex-row gap-3 sm:gap-2 sm:justify-end">
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={isLoading}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading}
            className="w-full sm:w-auto bg-primary-600 hover:bg-primary-700 text-white"
          >
            <Tag className="w-4 h-4 mr-2" />
            {isLoading ? 'Saving...' : template ? 'Update Template' : 'Create Template'}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Template Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Template Name *
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Enter template name"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            required
          />
        </div>

        {/* Category and Type */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Category *
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              required
            >
              <option value="general">General</option>
              <option value="match">Match</option>
              <option value="team">Team</option>
              <option value="verification">Verification</option>
              <option value="system">System</option>
              <option value="emergency">Emergency</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Type *
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              required
            >
              <option value="info">Information</option>
              <option value="success">Success</option>
              <option value="warning">Warning</option>
              <option value="error">Error</option>
              <option value="team_invitation">Team Invitation</option>
              <option value="verification_update">Verification Update</option>
              <option value="match_result">Match Result</option>
              <option value="venue_assignment">Venue Assignment</option>
              <option value="system_announcement">System Announcement</option>
              <option value="match_reminder">Match Reminder</option>
              <option value="tournament_update">Tournament Update</option>
            </select>
          </div>
        </div>

        {/* Title and Message */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Enter notification title"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Message *
            </label>
            <textarea
              value={formData.message}
              onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
              placeholder="Enter notification message. Use {{variable}} for dynamic content."
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Use double braces for variables: {'{{userName}}'}, {'{{teamName}}'}, etc.
            </p>
          </div>
        </div>
      </form>
    </EnhancedModal>
  );
};