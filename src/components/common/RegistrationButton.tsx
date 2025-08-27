'use client'
import React from 'react'
import { Button } from '@/components/ui/Button'
import { useProfileCompletion } from '@/hooks/useProfileCompletion'
import ProfileCompletionModal from './ProfileCompletionModal'
import { PageLoader } from '@/components/ui/loaders'

interface RegistrationButtonProps {
  lang: string
  sport: string
  sportId:string
  size?: 'sm' | 'base' | 'lg' | 'xl'
  className?: string
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success'
  children?: React.ReactNode
  disabled?: boolean
  disabledMessage?: string
}

export default function RegistrationButton({
  lang,
  sport,
  sportId,
  size = 'lg',
  className = '',
  variant = 'primary',
  children = 'Register Now',
  disabled = false,
  disabledMessage = ''
}: RegistrationButtonProps) {
  const { isModalOpen, closeModal, handleAction, loading } = useProfileCompletion({
    lang,
    actionType: 'register',
    sportName: sport.charAt(0).toUpperCase() + sport.slice(1)
  })

  const handleClick = () => {
    if (disabled) return
    const targetUrl = `/${lang}/public/register/team/${sportId}`
    handleAction(targetUrl)
  }

  // Show page loader when checking profile completion
  if (loading) {
    return (
      <PageLoader
        title="Checking profile..."
        variant="brand"
        size="sm"
      />
    )
  }

  return (
    <>
      <div className={disabled ? "group relative inline-block" : ""}>
        <Button
          variant={variant}
          size={size}
          className={`${className} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          onClick={handleClick}
          disabled={disabled}
        >
          {children}
        </Button>
        
        {disabled && disabledMessage && (
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-4 py-2 bg-gray-800 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-20">
            {disabledMessage}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
          </div>
        )}
      </div>
      
      <ProfileCompletionModal
        isOpen={isModalOpen}
        onClose={closeModal}
        lang={lang}
        actionType="register"
        sportName={sport.charAt(0).toUpperCase() + sport.slice(1)}
      />
    </>
  )
}