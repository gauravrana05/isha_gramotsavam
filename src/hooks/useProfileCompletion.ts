'use client'
import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'

interface UseProfileCompletionOptions {
  lang: string
  redirectOnComplete?: boolean
  actionType?: 'register' | 'general'
  sportName?: string
}

export const useProfileCompletion = (options: UseProfileCompletionOptions) => {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const { user, userProfile, loading } = useAuth()
  const router = useRouter()

  const checkProfileCompletion = useCallback(() => {
    // Don't check if still loading auth
    if (loading) return { canProceed: false, needsAuth: true }
    
    // Check if user is authenticated
    if (!user) {
      return { canProceed: false, needsAuth: true }
    }

    // Check if user profile exists
    if (!userProfile) {
      return { canProceed: false, needsAuth: false, needsProfile: true }
    }

    // Check if profile is complete
    if (!userProfile.isProfileComplete) {
      return { canProceed: false, needsAuth: false, needsProfile: false, needsCompletion: true }
    }

    return { canProceed: true }
  }, [user, userProfile, loading])

  const handleAction = useCallback((targetUrl?: string) => {
    const result = checkProfileCompletion()
    
    if (result.needsAuth) {
      router.push(`/${options.lang}/login`)
      return false
    }

    if (result.needsProfile) {
      router.push(`/${options.lang}/public`)
      return false
    }

    if (result.needsCompletion) {
      setIsModalOpen(true)
      return false
    }

    // Profile is complete, proceed with action
    if (targetUrl) {
      router.push(targetUrl)
    }
    
    return true
  }, [checkProfileCompletion, router, options.lang])

  const closeModal = useCallback(() => {
    setIsModalOpen(false)
  }, [])

  return {
    isModalOpen,
    closeModal,
    handleAction,
    checkProfileCompletion,
    isProfileComplete: userProfile?.isProfileComplete || false,
    isAuthenticated: !!user,
    loading
  }
}