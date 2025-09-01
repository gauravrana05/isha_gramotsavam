// src/components/common/Footer.tsx
'use client'
import React from 'react'
import Link from 'next/link'
import { Phone, Mail } from 'lucide-react'
import { api } from '@/server/trpc/react'
import { useParams } from 'next/navigation'

export default function Footer() {
  const params = useParams()
  const lang = (params?.lang as string) || 'en'
  
  // Fetch sports data for navigation
  const sportsQuery = api.sports.getAllWithCategories.useQuery()
  return (
    <footer className="bg-secondary-900 text-white mt-auto font-fira">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Contact Information */}
          <div>
            <h3 className="text-lg font-semibold mb-4 text-primary-600">Contact Us</h3>
            
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <Phone className="w-4 h-4 text-primary-600" />
                <span className="text-gray-300">+91 83000 30999</span>
              </div>
              
              <div className="flex items-center space-x-3">
                <Mail className="w-4 h-4 text-primary-600" />
                <a 
                  href="mailto:ishagramotsavam@ishaoutreach.org"
                  className="text-gray-300 hover:text-primary-500 transition-colors"
                >
                  ishagramotsavam@ishaoutreach.org
                </a>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-semibold mb-4 text-primary-600">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link 
                  href={`/${lang}/public/sports`} 
                  className="text-gray-300 hover:text-primary-500 transition-colors"
                >
                  Sports
                </Link>
              </li>
              <li>
                <Link 
                  href={`/${lang}/public/about`} 
                  className="text-gray-300 hover:text-primary-500 transition-colors"
                >
                  About Us
                </Link>
              </li>
            </ul>
          </div>

          {/* Sports */}
          <div>
            <h3 className="text-lg font-semibold mb-4 text-primary-600">Sports</h3>
            <ul className="space-y-2">
              {Array.isArray(sportsQuery.data) && sportsQuery.data.map((sport) => (
                <li key={sport.id}>
                  <Link 
                    href={`/${lang}/public/sports/${sport.id}`} 
                    className="text-gray-300 hover:text-primary-500 transition-colors"
                  >
                    {sport.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="mt-8 pt-6 border-t border-gray-600">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <p className="text-gray-400 text-sm text-center md:text-left">
              © 2025 Isha Gramotsavam. All rights reserved.
            </p>
            <p className="text-gray-400 text-sm text-center md:text-right">
              Aug - Sep 2025
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}