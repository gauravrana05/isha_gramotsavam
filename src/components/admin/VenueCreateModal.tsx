'use client'

import React, { useState } from 'react'
import { EnhancedModal } from '@/components/ui/EnhancedModal'
import { api } from '@/server/trpc/react'
import { z } from 'zod'
import { useNotification } from '@/context/NotificationContext'

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

interface VenueCreateModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export const VenueCreateModal: React.FC<VenueCreateModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
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

  const {addNotification} = useNotification();

  const [errors, setErrors] = useState<Record<string, string>>({})

  const createVenueMutation = api.admin.venues.createVenue.useMutation({
    onSuccess: () => {
      addNotification('Venue created successfully', 'success');
      onSuccess()
      onClose()
      resetForm()
    },
    onError: (error) => {
      addNotification(error.message || 'Failed to create venue', 'error');
    },
  })

  const resetForm = () => {
    setFormData({
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
    setErrors({})
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const validatedData = venueSchema.parse(formData)
      setErrors({})
      createVenueMutation.mutate(validatedData)
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

  const handleClose = () => {
    if (!createVenueMutation.isPending) {
      onClose()
      resetForm()
    }
  }

  return (
    <EnhancedModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Add New Venue"
      size="lg"
      footer={
        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleClose}
            disabled={createVenueMutation.isPending}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="venue-create-form"
            disabled={createVenueMutation.isPending}
            className="px-4 py-2 bg-[#4A2F1D] text-white rounded-lg hover:bg-[#3A251A] disabled:opacity-50 flex items-center gap-2"
          >
            {createVenueMutation.isPending && (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
            Create Venue
          </button>
        </div>
      }
    >
      <form id="venue-create-form" onSubmit={handleSubmit} className="space-y-6">
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
                placeholder="Enter venue name"
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
                placeholder="Enter capacity"
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
              placeholder="Describe available facilities"
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
                placeholder="Enter state"
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
                placeholder="Enter district"
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
                placeholder="Enter taluk"
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
                placeholder="Enter panchayat"
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
                placeholder="Enter pincode"
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
                placeholder="Enter contact person name"
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
                placeholder="Enter phone number"
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
                placeholder="Enter email address"
              />
              {errors.contactEmail && <p className="text-red-500 text-sm mt-1">{errors.contactEmail}</p>}
            </div>
          </div>
        </div>

        {/* Status */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Status</h3>
          
          <div className="flex items-center">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => handleInputChange('isActive', e.target.checked)}
              className="w-4 h-4 text-[#4A2F1D] border-gray-300 rounded focus:ring-[#4A2F1D]"
            />
            <label htmlFor="isActive" className="ml-2 text-sm text-gray-700">
              Active venue (available for assignments)
            </label>
          </div>
        </div>
      </form>
    </EnhancedModal>
  )
}
