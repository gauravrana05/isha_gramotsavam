// src/components/common/Header.tsx
'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ChevronDown, Menu, X } from 'lucide-react'

interface HeaderProps {
  lang: string
}

export default function Header({ lang }: HeaderProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isLanguageDropdownOpen, setIsLanguageDropdownOpen] = useState(false)
  const [isSportsDropdownOpen, setIsSportsDropdownOpen] = useState(false)

  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen)
  const closeMobileMenu = () => setIsMobileMenuOpen(false)

  return (
    <header className="bg-[#28231e] text-white sticky top-0 z-50">
      {/* Desktop Header */}
      <div className="hidden lg:block">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <div className="flex items-center">
              <Link href={`/${lang}/public`} className="flex items-center">
                <Image
                  src="/images/logos/isha_gramotsavam.png"
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
              <div className="relative">
                <button
                  className="flex items-center space-x-1 text-white hover:text-[#F28C38] transition-colors duration-200 py-2"
                  onMouseEnter={() => setIsSportsDropdownOpen(true)}
                  onMouseLeave={() => setIsSportsDropdownOpen(false)}
                >
                  <Link
                    href={`/${lang}/public/sports`}
                    className="text-white hover:text-[#F28C38] transition-colors duration-200 font-medium"
                  >
                    Sports
                  </Link>
                  {/* <span className="font-medium">Sports</span> */}
                  <ChevronDown className="w-4 h-4" />
                </button>

                {isSportsDropdownOpen && (
                  <div
                    className="absolute top-full left-0 mt-1 w-48 bg-white shadow-lg rounded-md border border-gray-200 py-2 z-50"
                    onMouseEnter={() => setIsSportsDropdownOpen(true)}
                    onMouseLeave={() => setIsSportsDropdownOpen(false)}
                  >
                    <Link
                      href={`/${lang}/public/sports/volleyball`}
                      className="block px-4 py-2 text-gray-800 hover:bg-[#F3F0E5] hover:text-[#F28C38] transition-colors"
                    >
                      Volleyball
                    </Link>
                    <Link
                      href={`/${lang}/public/sports/throwball`}
                      className="block px-4 py-2 text-gray-800 hover:bg-[#F3F0E5] hover:text-[#F28C38] transition-colors"
                    >
                      Throwball
                    </Link>
                  </div>
                )}
              </div>

              <Link
                href={`/${lang}/public/cultural`}
                className="text-white hover:text-[#F28C38] transition-colors duration-200 font-medium"
              >
                Cultural Events
              </Link>

              <Link
                href={`/${lang}/public/about`}
                className="text-white hover:text-[#F28C38] transition-colors duration-200 font-medium"
              >
                About Us
              </Link>

              {/* Language Dropdown */}
              <div className="relative">
                <button
                  className="flex items-center space-x-1 text-white hover:text-[#F28C38] transition-colors duration-200"
                  onClick={() => setIsLanguageDropdownOpen(!isLanguageDropdownOpen)}
                >
                  <span className="font-medium">English</span>
                  <ChevronDown className="w-4 h-4" />
                </button>

                {isLanguageDropdownOpen && (
                  <div className="absolute top-full right-0 mt-1 w-32 bg-white shadow-lg rounded-md border border-gray-200 py-2 z-50">
                    <Link
                      href="/en/public"
                      className="block px-4 py-2 text-gray-800 hover:bg-[#F3F0E5] hover:text-[#F28C38] transition-colors"
                    >
                      English
                    </Link>
                    <Link
                      href="/ta/public"
                      className="block px-4 py-2 text-gray-800 hover:bg-[#F3F0E5] hover:text-[#F28C38] transition-colors"
                    >
                      தமிழ்
                    </Link>
                    <Link
                      href="/hi/public"
                      className="block px-4 py-2 text-gray-800 hover:bg-[#F3F0E5] hover:text-[#F28C38] transition-colors"
                    >
                      हिंदी
                    </Link>
                  </div>
                )}
              </div>
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
              src="/images/logos/isha_gramotsavam.png"
              alt="Isha Gramotsavam"
              width={40}
              height={40}
              className="h-10 w-auto"
            />
          </Link>

          <div className="flex items-center space-x-4">
            {/* Mobile Language Selector */}
            <div className="relative">
              <button
                className="flex items-center space-x-1 text-white"
                onClick={() => setIsLanguageDropdownOpen(!isLanguageDropdownOpen)}
              >
                <span className="text-sm">English</span>
                <ChevronDown className="w-3 h-3" />
              </button>

              {isLanguageDropdownOpen && (
                <div className="absolute top-full right-0 mt-1 w-24 bg-white shadow-lg rounded-md border border-gray-200 py-1 z-50">
                  <Link
                    href="/en/public"
                    className="block px-3 py-2 text-xs text-gray-800 hover:bg-[#F3F0E5]"
                    onClick={() => setIsLanguageDropdownOpen(false)}
                  >
                    English
                  </Link>
                  <Link
                    href="/ta/public"
                    className="block px-3 py-2 text-xs text-gray-800 hover:bg-[#F3F0E5]"
                    onClick={() => setIsLanguageDropdownOpen(false)}
                  >
                    தமிழ்
                  </Link>
                  <Link
                    href="/hi/public"
                    className="block px-3 py-2 text-xs text-gray-800 hover:bg-[#F3F0E5]"
                    onClick={() => setIsLanguageDropdownOpen(false)}
                  >
                    हिंदी
                  </Link>
                </div>
              )}
            </div>

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
          <div className="bg-[#28231e] border-t border-gray-600">
            <div className="px-4 py-4 space-y-4">
              {/* Mobile Sports Section */}
              <div>
                <div className="text-white font-medium mb-2">Sports</div>
                <div className="pl-4 space-y-2">
                  <Link
                    href={`/${lang}/public/sports/volleyball`}
                    className="block text-gray-300 hover:text-[#F28C38] transition-colors"
                    onClick={closeMobileMenu}
                  >
                    Volleyball
                  </Link>
                  <Link
                    href={`/${lang}/public/sports/throwball`}
                    className="block text-gray-300 hover:text-[#F28C38] transition-colors"
                    onClick={closeMobileMenu}
                  >
                    Throwball
                  </Link>
                </div>
              </div>

              <Link
                href={`/${lang}/public/cultural`}
                className="block text-white hover:text-[#F28C38] transition-colors font-medium"
                onClick={closeMobileMenu}
              >
                Cultural Events
              </Link>

              <Link
                href={`/${lang}/public/about`}
                className="block text-white hover:text-[#F28C38] transition-colors font-medium"
                onClick={closeMobileMenu}
              >
                About Us
              </Link>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}