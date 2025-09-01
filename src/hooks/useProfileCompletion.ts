'use client'
import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { api } from '@/server/trpc/react'

interface UseProfileCompletionOptions {
  lang: string
  redirectOnComplete?: boolean
  actionType?: 'register' | 'general'
  sportName?: string
}

export const useProfileCompletion = (options: UseProfileCompletionOptions) => {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const { user, loading } = useAuth()
  const router = useRouter()

  // Fetch profile completion data using the new API
  const profileDataQuery = api.profile.checkCompletion.useQuery(
    { userId: user?.id! },
    { 
      enabled: !!user?.id && 
               user.id.length > 0 && 
               !['admin', 'general_volunteer', 'technical_volunteer', 'verification_volunteer'].includes(user.role),
      staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
      gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
      refetchOnWindowFocus: false, // Don't refetch on window focus
      refetchOnReconnect: false, // Don't refetch on reconnect
    }
  )

  const checkProfileCompletion = useCallback(() => {
    // Don't check if still loading auth or profile data
    if (loading || profileDataQuery.isLoading) return { canProceed: false, needsAuth: true }
    
    // Check if user is authenticated
    if (!user) {
      return { canProceed: false, needsAuth: true }
    }

    // Check if profile data exists
    if (!profileDataQuery.data) {
      return { canProceed: false, needsAuth: false, needsProfile: true }
    }

    // Check if profile is complete using the new API data
    if (!profileDataQuery.data.profileComplete) {
      return { canProceed: false, needsAuth: false, needsProfile: false, needsCompletion: true }
    }

    return { canProceed: true }
  }, [user, loading, profileDataQuery.isLoading, profileDataQuery.data])

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
    isProfileComplete: profileDataQuery.data?.profileComplete || false,
    isAuthenticated: !!user,
    loading: loading || profileDataQuery.isLoading
  }
}