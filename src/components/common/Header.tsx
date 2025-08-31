// src/components/common/Header.tsx
'use client'

import React, { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ChevronDown, Menu, X, User as UserIcon } from 'lucide-react'
import LanguageSelector from './LanguageSelector'
import { useAuth } from '@/context/AuthContext'
import { api } from '@/server/trpc/react'
import { useLanguage } from '@/context/LanguageContext'
import { useTranslation } from '@/lib/utils/i18n'

interface HeaderProps {
  lang: string
}

export default function Header({ lang }: HeaderProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isSportsDropdownOpen, setIsSportsDropdownOpen] = useState(false)
  const [isLanguageDropdownOpen, setIsLanguageDropdownOpen] = useState(false)
  const { user } = useAuth()
  const { language, switchLanguage, isLoading: languageLoading } = useLanguage()
  const { supportedLanguages } = useTranslation()

  // Timer refs for dropdown delays
  const sportsDropdownTimer = useRef<NodeJS.Timeout | null>(null)
  const languageDropdownTimer = useRef<NodeJS.Timeout | null>(null)

  // Fetch profile image data for authenticated users
  const profileImageQuery = api.profile.checkCompletion.useQuery(
    { userId: user?.id || '' },
    { 
      enabled: !!user?.id,
      staleTime: 10 * 60 * 1000, // Consider data fresh for 10 minutes in header
      gcTime: 15 * 60 * 1000, // Keep in cache for 15 minutes
      refetchOnWindowFocus: false, // Don't refetch on window focus
      refetchOnReconnect: false, // Don't refetch on reconnect
      refetchOnMount: false, // Don't refetch on component mount if cache exists
    }
  )

  // Fetch sports data for navigation
  const sportsQuery = api.sports.getAllWithCategories.useQuery()

  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen)
  const closeMobileMenu = () => setIsMobileMenuOpen(false)
  
  const getCurrentLanguageName = () => {
    return supportedLanguages.find(lang => lang.code === language)?.name || 'English'
  }

  // Sports dropdown handlers
  const handleSportsMouseEnter = () => {
    if (sportsDropdownTimer.current) {
      clearTimeout(sportsDropdownTimer.current)
      sportsDropdownTimer.current = null
    }
    setIsSportsDropdownOpen(true)
  }

  const handleSportsMouseLeave = () => {
    sportsDropdownTimer.current = setTimeout(() => {
      setIsSportsDropdownOpen(false)
    }, 100)
  }

  // Language dropdown handlers  
  const handleLanguageMouseEnter = () => {
    if (languageDropdownTimer.current) {
      clearTimeout(languageDropdownTimer.current)
      languageDropdownTimer.current = null
    }
    setIsLanguageDropdownOpen(true)
  }

  const handleLanguageMouseLeave = () => {
    languageDropdownTimer.current = setTimeout(() => {
      setIsLanguageDropdownOpen(false)
    }, 100)
  }

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (sportsDropdownTimer.current) {
        clearTimeout(sportsDropdownTimer.current)
      }
      if (languageDropdownTimer.current) {
        clearTimeout(languageDropdownTimer.current)
      }
    }
  }, [])

  return (
    <header className="bg-secondary-900 text-white sticky top-0 z-50">
      {/* Desktop Header */}
      <div className="hidden lg:block">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <div className="flex items-center">
              <Link href={`/${lang}/public`} className="flex items-center">
                <Image
                  src="/images/logos/light.png"
                  alt="Isha Gramotsavam"
                  width={80}
                  height={80}
                  className="h-16 w-auto"
                />
              </Link>
            </div>

            {/* Navigation */}
            <nav className="flex items-center space-x-8 font-fira">
              {/* Sports Dropdown */}
              <div 
                className="relative"
                onMouseEnter={handleSportsMouseEnter}
                onMouseLeave={handleSportsMouseLeave}
              >
                <button className="flex items-center space-x-1 text-white hover:text-primary-500 transition-colors duration-200 py-2">
                  <Link
                    href={`/${lang}/public/sports`}
                    className="text-white hover:text-primary-500 transition-colors duration-200 font-medium"
                  >
                    Sports
                  </Link>
                  <ChevronDown className="w-4 h-4" />
                </button>

                {isSportsDropdownOpen && (
                  <div className="absolute top-full left-0 mt-1 w-48 bg-white shadow-lg rounded-md border border-gray-200 py-2 z-50">
                    {sportsQuery.data?.map((sport) => (
                      <Link
                        key={sport.id}
                        href={`/${lang}/public/sports/${sport.id}`}
                        className="block px-4 py-2 text-gray-800 hover:bg-secondary-100 hover:text-primary-500 transition-colors"
                      >
                        {sport.name}
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              <Link
                href={`/${lang}/public/about`}
                className="text-white hover:text-primary-500 transition-colors duration-200 font-medium"
              >
                About Us
              </Link>

              {/* Language Dropdown */}
              <div 
                className="relative"
                onMouseEnter={handleLanguageMouseEnter}
                onMouseLeave={handleLanguageMouseLeave}
              >
                <button
                  className="flex items-center space-x-1 text-white hover:text-primary-500 transition-colors duration-200 py-2"
                  disabled={languageLoading}
                >
                  <span className="font-medium">{getCurrentLanguageName()}</span>
                  <ChevronDown className="w-4 h-4" />
                </button>

                {isLanguageDropdownOpen && (
                  <div className="absolute top-full right-0 mt-1 w-48 bg-white shadow-lg rounded-md border border-gray-200 py-2 z-50">
                    {supportedLanguages.map((lang) => (
                      <button
                        key={lang.code}
                        onClick={() => {
                          switchLanguage(lang.code as any)
                          setIsLanguageDropdownOpen(false)
                        }}
                        className={`block w-full text-left px-4 py-2 text-gray-800 hover:bg-secondary-100 hover:text-primary-500 transition-colors ${
                          language === lang.code ? 'bg-secondary-50 text-primary-500' : ''
                        }`}
                      >
                        {lang.nativeName}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {user ? (
                /* Profile with Image - only on web */
                <Link
                  href={`/${lang}/profile`}
                  className="flex items-center space-x-2 text-white hover:text-primary-500 transition-colors duration-200 font-medium"
                >
                  <span>Profile</span>
                  <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-white/20 hover:border-primary-500 transition-colors bg-gray-200 flex items-center justify-center">
                    {profileImageQuery.data?.userProfileImages?.profilePhotoPath ? (
                      <Image
                        src={profileImageQuery.data.userProfileImages.profilePhotoPath}
                        alt={`${user.firstName || 'User'} profile`}
                        width={32}
                        height={32}
                        className="w-full h-full object-cover"
                        unoptimized
                      />
                    ) : (
                      <UserIcon className="w-4 h-4 text-gray-500" />
                    )}
                  </div>
                </Link>
              ) : (
                <Link
                  href={`/${lang}/login`}
                  className="text-white hover:text-primary-500 transition-colors duration-200 font-medium"
                >
                  Login
                </Link>
              )}
            </nav>
          </div>
        </div>
      </div>

      {/* Mobile Header */}
      <div className="lg:hidden">
        <div className="flex items-center justify-between h-16 px-4">
          {/* Mobile Logo */}
          <Link href={`/${lang}/public`} className="flex items-center">
            <Image
              src="/images/logos/light.png"
              alt="Isha Gramotsavam"
              width={40}
              height={40}
              className="h-10 w-auto"
            />
          </Link>

          <div className="flex items-center space-x-4">
            {/* Mobile Language Selector */}
            <LanguageSelector 
              variant="small" 
              className="w-32 text-xs" 
              showNativeNames={true}
            />

            {/* Mobile Menu Button */}
            <button
              onClick={toggleMobileMenu}
              className="text-white p-2"
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="bg-secondary-900 border-t border-gray-600 font-fira">
            <div className="px-4 py-4 space-y-4">
              {/* Mobile Sports Section */}
              <div>
                <div className="text-white font-medium mb-2">Sports</div>
                <div className="pl-4 space-y-2">
                  {sportsQuery.data?.map((sport) => (
                    <Link
                      key={sport.id}
                      href={`/${lang}/public/sports/${sport.id}`}
                      className="block text-gray-300 hover:text-primary-500 transition-colors"
                      onClick={closeMobileMenu}
                    >
                      {sport.name}
                    </Link>
                  ))}
                </div>
              </div>

              <Link
                href={`/${lang}/public/about`}
                className="block text-white hover:text-primary-500 transition-colors font-medium"
                onClick={closeMobileMenu}
              >
                About Us
              </Link>

              {user ? (
                <Link
                  href={`/${lang}/profile`}
                  className="block text-white hover:text-primary-500 transition-colors font-medium"
                  onClick={closeMobileMenu}
                >
                  Profile
                </Link>
              ) : (
                <Link
                  href={`/${lang}/login`}
                  className="block text-white hover:text-primary-500 transition-colors font-medium"
                  onClick={closeMobileMenu}
                >
                  Login
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  )
}