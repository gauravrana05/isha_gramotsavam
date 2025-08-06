'use client'
import React from 'react'
import Link from 'next/link'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { AlertCircle, User, ArrowRight } from 'lucide-react'

interface ProfileCompletionModalProps {
  isOpen: boolean
  onClose: () => void
  lang: string
  actionType?: 'register' | 'general'
  sportName?: string
}

export default function ProfileCompletionModal({
  isOpen,
  onClose,
  lang,
  actionType = 'general',
  sportName
}: ProfileCompletionModalProps) {
  const getTitle = () => {
    switch (actionType) {
      case 'register':
        return 'Complete Your Profile to Register'
      default:
        return 'Profile Incomplete'
    }
  }

  const getDescription = () => {
    switch (actionType) {
      case 'register':
        return sportName 
          ? `To register for ${sportName}, please complete your profile with all required information.`
          : 'To register for a team, please complete your profile with all required information.'
      default:
        return 'Your profile is incomplete. Please add all required information to continue.'
    }
  }

  const footer = (
    <div className="flex flex-col sm:flex-row gap-3 w-full">
      <button
        onClick={onClose}
        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#F28C38] font-fira"
      >
        Cancel
      </button>
      <Link
        href={`/${lang}/profile/complete`}
        className="flex-1 sm:flex-none"
      >
        <Button
          variant="primary"
          size="base"
          className="w-full sm:w-auto inline-flex items-center justify-center"
        >
          Complete Profile
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </Link>
    </div>
  )

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={getTitle()}
      description={getDescription()}
      size="base"
      footer={footer}
      closeOnOverlayClick={true}
      showCloseButton={true}
    >
      <div className="flex flex-col items-center text-center py-4">
        <div className="w-16 h-16 bg-[#F28C38]/10 rounded-full flex items-center justify-center mb-4">
          <User className="w-8 h-8 text-[#F28C38]" />
        </div>
        
        <div className="space-y-3">
          <h4 className="text-lg font-semibold text-[#4A2F1D] font-fira">
            Missing Required Information
          </h4>
          
          <div className="text-sm text-gray-600 font-fira">
            <p className="mb-2">Please complete the following sections:</p>
            <ul className="text-left list-disc list-inside space-y-1 bg-gray-50 p-3 rounded-lg">
              <li>Personal Details (Name, Date of Birth, Gender)</li>
              <li>Contact Information (Phone, Address)</li>
              <li>Location Details (Panchayat, District, State)</li>
              <li>Identity Verification (Aadhaar)</li>
            </ul>
          </div>
          
          <div className="flex items-start gap-3 bg-blue-50 p-3 rounded-lg mt-4">
            <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-blue-800 text-left font-fira">
              <strong>Why is this required?</strong><br />
              Complete profile information is necessary for team registration, 
              eligibility verification, and match participation in Isha Gramotsavam.
            </p>
          </div>
        </div>
      </div>
    </Modal>
  )
}