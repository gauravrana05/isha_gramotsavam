'use client'

import React, { useState, useEffect } from 'react'
import { EnhancedModal } from '@/components/ui/EnhancedModal'
import { StatusSelector } from '@/components/ui/StatusSelector'
import { api } from '@/server/trpc/react'
import { useNotification } from '@/context/NotificationContext'
import { z } from 'zod'


const venueSchema = z.object({
  name: z.string().min(1, 'Venue name is required').max(200),
  capacity: z.number().min(1).optional(),
  panchayat: z.string().max(100).optional(),
  taluk: z.string().max(100).optional(),
  district: z.string().min(1, 'District is required').max(100),
  state: z.string().min(1, 'State is required').max(100),
  pincode: z.string().max(10).optional(),
  contactPhone: z.string().max(20).optional(),
  contactEmail: z.string().email('Invalid email').optional(),
  contactPerson: z.string().max(100).optional(),
  facilities: z.string().optional(),
  isActive: z.boolean(),
})

type VenueFormData = z.infer<typeof venueSchema>

interface VenueDetailModalProps {
  isOpen: boolean
  onClose: () => void
  venueId: string | null
  onSuccess: () => void
}

export const VenueDetailModal: React.FC<VenueDetailModalProps> = ({
  isOpen,
  onClose,
  venueId,
  onSuccess,
}) => {
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState<VenueFormData>({
    name: '',
    capacity: undefined,
    panchayat: '',
    taluk: '',
    district: '',
    state: '',
    pincode: '',
    contactPhone: '',
    contactEmail: '',
    contactPerson: '',
    facilities: '',
    isActive: true,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const { data: venue, isPending } = api.admin.venues.getVenueById.useQuery(
    { id: venueId! },
    { enabled: !!venueId && isOpen }
  )

  const { addNotification } = useNotification();

  const updateVenueMutation = api.admin.venues.updateVenue.useMutation({
    onSuccess: () => {
      addNotification('Venue updated successfully', 'success');
      setIsEditing(false)
      onSuccess()
    },
    onError: (error) => {
      addNotification(error.message || 'Failed to update venue', 'error');
    },
  })

  const updateStatusMutation = api.admin.venues.updateVenueStatus.useMutation({
    onSuccess: () => {

      addNotification('Venue status updated successfully', 'success')
      onSuccess()
    },
    onError: (error) => {
      addNotification(error.message || 'Failed to update venue status', 'error');
    },
  })

  useEffect(() => {
    if (venue) {
      setFormData({
        name: venue.name,
        capacity: venue.capacity || undefined,
        panchayat: venue.panchayat || '',
        taluk: venue.taluk || '',
        district: venue.district,
        state: venue.state,
        pincode: venue.pincode || '',
        contactPhone: venue.contactPhone || '',
        contactEmail: venue.contactEmail || '',
        contactPerson: venue.contactPerson || '',
        facilities: venue.facilities || '',
        isActive: venue.isActive,
      })
    }
  }, [venue])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!venueId) return

    try {
      const validatedData = venueSchema.parse(formData)
      setErrors({})
      updateVenueMutation.mutate({
        id: venueId,
        ...validatedData,
      })
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {}
        error.issues.forEach((err) => {
          if (err.path[0]) {
            fieldErrors[err.path[0] as string] = err.message
          }
        })
        setErrors(fieldErrors)
      }
    }
  }

  const handleInputChange = (field: keyof VenueFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const handleStatusChange = (isActive: boolean) => {
    if (!venueId) return
    updateStatusMutation.mutate({ venueId, isActive })
  }

  const handleClose = () => {
    if (!updateVenueMutation.isPending && !updateStatusMutation.isPending) {
      setIsEditing(false)
      setErrors({})
      onClose()
    }
  }

  if (isPending) {
    return (
      <EnhancedModal isOpen={isOpen} onClose={handleClose} title="Venue Details" size="lg">
        <div className="space-y-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
              <div className="h-8 bg-gray-100 rounded"></div>
            </div>
          ))}
        </div>
      </EnhancedModal>
    )
  }

  if (!venue) {
    return (
      <EnhancedModal isOpen={isOpen} onClose={handleClose} title="Venue Not Found" size="lg">
        <p className="text-gray-600">The requested venue could not be found.</p>
      </EnhancedModal>
    )
  }

  return (
    <EnhancedModal
      isOpen={isOpen}
      onClose={handleClose}
      title={isEditing ? 'Edit Venue' : 'Venue Details'}
      size="lg"
      headerActions={
        !isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="px-3 py-1 text-sm bg-[#4A2F1D] text-white rounded hover:bg-[#3A251A]"
          >
            Edit
          </button>
        )
      }
      footer={
        isEditing ? (
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                setIsEditing(false)
                setErrors({})
                if (venue) {
                  setFormData({
                    name: venue.name,
                    capacity: venue.capacity || undefined,
                    panchayat: venue.panchayat || '',
                    taluk: venue.taluk || '',
                    district: venue.district,
                    state: venue.state,
                    pincode: venue.pincode || '',
                    contactPhone: venue.contactPhone || '',
                    contactEmail: venue.contactEmail || '',
                    contactPerson: venue.contactPerson || '',
                    facilities: venue.facilities || '',
                    isActive: venue.isActive,
                  })
                }
              }}
              disabled={updateVenueMutation.isPending}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="venue-edit-form"
              disabled={updateVenueMutation.isPending}
              className="px-4 py-2 bg-[#4A2F1D] text-white rounded-lg hover:bg-[#3A251A] disabled:opacity-50 flex items-center gap-2"
            >
              {updateVenueMutation.isPending && (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              Save Changes
            </button>
          </div>
        ) : undefined
      }
    >
      <div className="space-y-6">
        {/* Status */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div>
            <h3 className="font-medium text-gray-900">Venue Status</h3>
            <p className="text-sm text-gray-600">Control venue availability</p>
          </div>
          <StatusSelector
            value={venue.isActive ? 'active' : 'inactive'}
            onChange={(status) => handleStatusChange(status === 'active')}
            options={[
              { value: 'active', label: 'Active', color: 'green' },
              { value: 'inactive', label: 'Inactive', color: 'red' },
            ]}
            disabled={updateStatusMutation.isPending}
          />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{venue._count.teams}</div>
            <div className="text-sm text-blue-800">Teams Assigned</div>
          </div>
          <div className="p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{venue._count.events}</div>
            <div className="text-sm text-green-800">Events Hosted</div>
          </div>
        </div>

        {isEditing ? (
          <form id="venue-edit-form" onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Basic Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Venue Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#4A2F1D] focus:border-transparent ${
                      errors.name ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Capacity
                  </label>
                  <input
                    type="number"
                    value={formData.capacity || ''}
                    onChange={(e) => handleInputChange('capacity', e.target.value ? parseInt(e.target.value) : undefined)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4A2F1D] focus:border-transparent"
                    min="1"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Facilities
                </label>
                <textarea
                  value={formData.facilities}
                  onChange={(e) => handleInputChange('facilities', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4A2F1D] focus:border-transparent"
                  rows={3}
                />
              </div>
            </div>

            {/* Location Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Location</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    State *
                  </label>
                  <input
                    type="text"
                    value={formData.state}
                    onChange={(e) => handleInputChange('state', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#4A2F1D] focus:border-transparent ${
                      errors.state ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.state && <p className="text-red-500 text-sm mt-1">{errors.state}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    District *
                  </label>
                  <input
                    type="text"
                    value={formData.district}
                    onChange={(e) => handleInputChange('district', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#4A2F1D] focus:border-transparent ${
                      errors.district ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.district && <p className="text-red-500 text-sm mt-1">{errors.district}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Taluk
                  </label>
                  <input
                    type="text"
                    value={formData.taluk}
                    onChange={(e) => handleInputChange('taluk', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4A2F1D] focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Panchayat
                  </label>
                  <input
                    type="text"
                    value={formData.panchayat}
                    onChange={(e) => handleInputChange('panchayat', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4A2F1D] focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Pincode
                  </label>
                  <input
                    type="text"
                    value={formData.pincode}
                    onChange={(e) => handleInputChange('pincode', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4A2F1D] focus:border-transparent"
                    maxLength={10}
                  />
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Contact Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Person
                  </label>
                  <input
                    type="text"
                    value={formData.contactPerson}
                    onChange={(e) => handleInputChange('contactPerson', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4A2F1D] focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Phone
                  </label>
                  <input
                    type="tel"
                    value={formData.contactPhone}
                    onChange={(e) => handleInputChange('contactPhone', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4A2F1D] focus:border-transparent"
                    maxLength={20}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Email
                  </label>
                  <input
                    type="email"
                    value={formData.contactEmail}
                    onChange={(e) => handleInputChange('contactEmail', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#4A2F1D] focus:border-transparent ${
                      errors.contactEmail ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.contactEmail && <p className="text-red-500 text-sm mt-1">{errors.contactEmail}</p>}
                </div>
              </div>
            </div>
          </form>
        ) : (
          <div className="space-y-6">
            {/* View Mode */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Basic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Venue Name</label>
                  <p className="text-gray-900">{venue.name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Capacity</label>
                  <p className="text-gray-900">{venue.capacity || 'Not specified'}</p>
                </div>
              </div>
              {venue.facilities && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Facilities</label>
                  <p className="text-gray-900">{venue.facilities}</p>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Location</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">State</label>
                  <p className="text-gray-900">{venue.state}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">District</label>
                  <p className="text-gray-900">{venue.district}</p>
                </div>
                {venue.taluk && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Taluk</label>
                    <p className="text-gray-900">{venue.taluk}</p>
                  </div>
                )}
                {venue.panchayat && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Panchayat</label>
                    <p className="text-gray-900">{venue.panchayat}</p>
                  </div>
                )}
                {venue.pincode && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Pincode</label>
                    <p className="text-gray-900">{venue.pincode}</p>
                  </div>
                )}
              </div>
            </div>

            {(venue.contactPerson || venue.contactPhone || venue.contactEmail) && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Contact Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {venue.contactPerson && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Contact Person</label>
                      <p className="text-gray-900">{venue.contactPerson}</p>
                    </div>
                  )}
                  {venue.contactPhone && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Contact Phone</label>
                      <p className="text-gray-900">{venue.contactPhone}</p>
                    </div>
                  )}
                  {venue.contactEmail && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Contact Email</label>
                      <p className="text-gray-900">{venue.contactEmail}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Teams and Events */}
            {(venue.teams.length > 0 || venue.events.length > 0) && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Assignments</h3>
                
                {venue.teams.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-700 mb-2">Assigned Teams</h4>
                    <div className="space-y-2">
                      {venue.teams.slice(0, 5).map((team) => (
                        <div key={team.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                          <span className="font-medium">{team.teamName}</span>
                          <span className="text-sm text-gray-600">
                            {team.captainUser.firstName} {team.captainUser.lastName}
                          </span>
                        </div>
                      ))}
                      {venue.teams.length > 5 && (
                        <p className="text-sm text-gray-500">
                          +{venue.teams.length - 5} more teams
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {venue.events.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-700 mb-2">Hosted Events</h4>
                    <div className="space-y-2">
                      {venue.events.slice(0, 5).map((event) => (
                        <div key={event.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                          <span className="font-medium">{event.name}</span>
                          <span className="text-sm text-gray-600">
                            {new Date(event.startDate).toLocaleDateString()}
                          </span>
                        </div>
                      ))}
                      {venue.events.length > 5 && (
                        <p className="text-sm text-gray-500">
                          +{venue.events.length - 5} more events
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </EnhancedModal>
  )
}
