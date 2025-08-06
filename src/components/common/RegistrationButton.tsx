'use client'
import React from 'react'
import { Button } from '@/components/ui/Button'
import { useProfileCompletion } from '@/hooks/useProfileCompletion'
import ProfileCompletionModal from './ProfileCompletionModal'

interface RegistrationButtonProps {
  lang: string
  sport: string
  size?: 'sm' | 'base' | 'lg' | 'xl'
  className?: string
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success'
  children?: React.ReactNode
}

export default function RegistrationButton({
  lang,
  sport,
  size = 'lg',
  className = '',
  variant = 'primary',
  children = 'Register Now'
}: RegistrationButtonProps) {
  const { isModalOpen, closeModal, handleAction } = useProfileCompletion({
    lang,
    actionType: 'register',
    sportName: sport.charAt(0).toUpperCase() + sport.slice(1)
  })

  const handleClick = () => {
    const targetUrl = `/${lang}/public/register/team/${sport}`
    handleAction(targetUrl)
  }

  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={className}
        onClick={handleClick}
      >
        {children}
      </Button>
      
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