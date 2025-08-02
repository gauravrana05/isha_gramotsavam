'use client'

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { addVolunteer } from '@/lib/actions/admin/volunteerManagement';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export default function AddVolunteerForm() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sameAsWhatsapp, setSameAsWhatsapp] = useState(true);
  const router = useRouter();

  const handleSubmit = async (formData: FormData) => {
    setLoading(true);
    setError('');

    try {
      // Add the sameAsWhatsapp flag to formData
      formData.append('sameAsWhatsapp', sameAsWhatsapp.toString());
      
      const result = await addVolunteer(formData);
      
      if (result.success) {
        router.push('/en/admin/users/volunteers');
      } else {
        setError(result.error || 'Failed to add volunteer');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-6">
      <form action={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="text-red-800 text-sm">{error}</div>
          </div>
        )}

        {/* Personal Information */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Personal Information</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
                First Name *
              </label>
              <input
                type="text"
                id="firstName"
                name="firstName"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter first name"
              />
            </div>

            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
                Last Name *
              </label>
              <input
                type="text"
                id="lastName"
                name="lastName"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter last name"
              />
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Contact Information</h3>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number *
              </label>
              <input
                type="tel"
                id="phoneNumber"
                name="phoneNumber"
                required
                pattern="[+]?[0-9\s\-\(\)]*"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="+91 9876543210"
              />
            </div>

            <div>
              <div className="flex items-center mb-2">
                <input
                  type="checkbox"
                  id="sameAsWhatsapp"
                  checked={sameAsWhatsapp}
                  onChange={(e) => setSameAsWhatsapp(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="sameAsWhatsapp" className="ml-2 block text-sm text-gray-700">
                  WhatsApp number is same as phone number
                </label>
              </div>
              
              {!sameAsWhatsapp && (
                <input
                  type="tel"
                  name="whatsappNumber"
                  required={!sameAsWhatsapp}
                  pattern="[+]?[0-9\s\-\(\)]*"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="+91 9876543210"
                />
              )}
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email Address *
              </label>
              <input
                type="email"
                id="email"
                name="email"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="volunteer@example.com"
              />
            </div>
          </div>
        </div>

        {/* Role Selection */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Volunteer Role</h3>
          
          <div>
            <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
              Select Role *
            </label>
            <select
              id="role"
              name="role"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select a role</option>
              <option value="verification_volunteer">Verification Volunteer</option>
              <option value="general_volunteer">General Volunteer</option>
              <option value="technical_volunteer">Technical Volunteer</option>
            </select>
            <p className="mt-1 text-sm text-gray-500">
              • <strong>Verification Volunteer:</strong> Document verification and player eligibility<br/>
              • <strong>General Volunteer:</strong> General event support and coordination<br/>
              • <strong>Technical Volunteer:</strong> Tournament management and match coordination
            </p>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end space-x-3 pt-6 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={loading}
            className="bg-[#3A7F3F] hover:bg-green-700"
          >
            {loading ? 'Adding...' : 'Add Volunteer'}
          </Button>
        </div>
      </form>
    </Card>
  );
}