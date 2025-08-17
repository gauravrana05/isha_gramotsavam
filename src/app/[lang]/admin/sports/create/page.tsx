"use client";

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase/config';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import Container from '@/components/ui/Container';
import Button from '@/components/ui/Button';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/AdvancedSelect';

interface SportFormData {
  name: string;
  displayName: string;
  description: string;
  category: 'individual' | 'team';
  genderCategories: string[];
  minPlayers: number;
  maxPlayers: number;
  minSubstitutes: number;
  maxSubstitutes: number;
  minAge: number;
  maxAge: number | null;
  maxPlayersUnder21: number;
  allowPET: boolean;
  restrictedToStates: string[];
  pointsToWin: number;
  setsToWin: number | null;
  timeLimit: number | null;
  customRules: string[];
  iconURL: string;
  bannerImageURL: string;
  rulesPDF: string;
  isActive: boolean;
  availableInEvents: string[];
}

export default function CreateSportPage() {
  const router = useRouter();
  const { lang } = useParams();
  const { user, userProfile } = useAuth();

  const [formData, setFormData] = useState<SportFormData>({
    name: '',
    displayName: '',
    description: '',
    category: 'team',
    genderCategories: [],
    minPlayers: 1,
    maxPlayers: 1,
    minSubstitutes: 0,
    maxSubstitutes: 0,
    minAge: 16,
    maxAge: null,
    maxPlayersUnder21: 0,
    allowPET: false,
    restrictedToStates: [],
    pointsToWin: 15,
    setsToWin: null,
    timeLimit: null,
    customRules: [],
    iconURL: '',
    bannerImageURL: '',
    rulesPDF: '',
    isActive: true,
    availableInEvents: ['isha_gramotsavam']
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = (field: keyof SportFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  const handleGenderChange = (gender: string, checked: boolean) => {
    if (checked) {
      setFormData(prev => ({
        ...prev,
        genderCategories: [...prev.genderCategories, gender]
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        genderCategories: prev.genderCategories.filter(g => g !== gender)
      }));
    }
  };

  const handleCustomRuleChange = (index: number, value: string) => {
    const newRules = [...formData.customRules];
    newRules[index] = value;
    setFormData(prev => ({ ...prev, customRules: newRules }));
  };

  const addCustomRule = () => {
    setFormData(prev => ({
      ...prev,
      customRules: [...prev.customRules, '']
    }));
  };

  const removeCustomRule = (index: number) => {
    setFormData(prev => ({
      ...prev,
      customRules: prev.customRules.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      setError('Sport name is required');
      return;
    }
    
    if (!formData.displayName.trim()) {
      setError('Display name is required');
      return;
    }
    
    if (formData.genderCategories.length === 0) {
      setError('At least one gender category is required');
      return;
    }

    setLoading(true);
    try {
      const sportData = {
        ...formData,
        scoringSystem: {
          pointsToWin: formData.pointsToWin,
          setsToWin: formData.setsToWin,
          timeLimit: formData.timeLimit,
          customRules: formData.customRules.filter(rule => rule.trim() !== '')
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      // Remove the separate scoring fields from the main object
      const { pointsToWin, setsToWin, timeLimit, customRules, ...finalData } = sportData;
      
      await addDoc(collection(db, 'sports'), finalData);
      router.push(`/${lang}/admin/sports`);
    } catch (err: any) {
      console.error('Error creating sport:', err);
      setError('Failed to create sport. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!user || userProfile?.role !== 'admin') {
    return null;
  }

  return (
    <Container>
      <div className="max-w-4xl mx-auto py-8">
        {/* Header */}
        <div className="flex items-center mb-6">
          <Button
            onClick={() => router.back()}
            variant="outline"
            className="mr-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Create New Sport</h1>
            <p className="text-gray-600 text-sm">Add a new sport to the system</p>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="bg-white rounded-lg border p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sport Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#CE4520] focus:border-[#CE4520]"
                  placeholder="e.g., Volleyball"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Display Name *
                </label>
                <input
                  type="text"
                  value={formData.displayName}
                  onChange={(e) => handleInputChange('displayName', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#CE4520] focus:border-[#CE4520]"
                  placeholder="e.g., Volleyball (Men)"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#CE4520] focus:border-[#CE4520]"
                  placeholder="Brief description of the sport"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => handleInputChange('category', value as 'individual' | 'team')}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="team">Team Sport</SelectItem>
                    <SelectItem value="individual">Individual Sport</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Gender Categories *
                </label>
                <div className="flex space-x-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.genderCategories.includes('men')}
                      onChange={(e) => handleGenderChange('men', e.target.checked)}
                      className="rounded border-gray-300 text-[#CE4520] focus:ring-[#CE4520]"
                    />
                    <span className="ml-2">Men</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.genderCategories.includes('women')}
                      onChange={(e) => handleGenderChange('women', e.target.checked)}
                      className="rounded border-gray-300 text-[#CE4520] focus:ring-[#CE4520]"
                    />
                    <span className="ml-2">Women</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Player Configuration */}
          <div className="bg-white rounded-lg border p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Player Configuration</h3>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Min Players
                </label>
                <input
                  type="number"
                  value={formData.minPlayers}
                  onChange={(e) => handleInputChange('minPlayers', parseInt(e.target.value))}
                  min="1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#CE4520] focus:border-[#CE4520]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Players
                </label>
                <input
                  type="number"
                  value={formData.maxPlayers}
                  onChange={(e) => handleInputChange('maxPlayers', parseInt(e.target.value))}
                  min="1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#CE4520] focus:border-[#CE4520]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Min Substitutes
                </label>
                <input
                  type="number"
                  value={formData.minSubstitutes}
                  onChange={(e) => handleInputChange('minSubstitutes', parseInt(e.target.value))}
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#CE4520] focus:border-[#CE4520]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Substitutes
                </label>
                <input
                  type="number"
                  value={formData.maxSubstitutes}
                  onChange={(e) => handleInputChange('maxSubstitutes', parseInt(e.target.value))}
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#CE4520] focus:border-[#CE4520]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Min Age
                </label>
                <input
                  type="number"
                  value={formData.minAge}
                  onChange={(e) => handleInputChange('minAge', parseInt(e.target.value))}
                  min="1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#CE4520] focus:border-[#CE4520]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Age (optional)
                </label>
                <input
                  type="number"
                  value={formData.maxAge || ''}
                  onChange={(e) => handleInputChange('maxAge', e.target.value ? parseInt(e.target.value) : null)}
                  min="1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#CE4520] focus:border-[#CE4520]"
                  placeholder="No limit"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Players Under 21
                </label>
                <input
                  type="number"
                  value={formData.maxPlayersUnder21}
                  onChange={(e) => handleInputChange('maxPlayersUnder21', parseInt(e.target.value))}
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#CE4520] focus:border-[#CE4520]"
                />
              </div>

              <div className="flex items-center">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.allowPET}
                    onChange={(e) => handleInputChange('allowPET', e.target.checked)}
                    className="rounded border-gray-300 text-[#CE4520] focus:ring-[#CE4520]"
                  />
                  <span className="ml-2">Allow PET</span>
                </label>
              </div>
            </div>
          </div>

          {/* Scoring System */}
          <div className="bg-white rounded-lg border p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Scoring System</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Points to Win
                </label>
                <input
                  type="number"
                  value={formData.pointsToWin}
                  onChange={(e) => handleInputChange('pointsToWin', parseInt(e.target.value))}
                  min="1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#CE4520] focus:border-[#CE4520]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sets to Win (optional)
                </label>
                <input
                  type="number"
                  value={formData.setsToWin || ''}
                  onChange={(e) => handleInputChange('setsToWin', e.target.value ? parseInt(e.target.value) : null)}
                  min="1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#CE4520] focus:border-[#CE4520]"
                  placeholder="No sets"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Time Limit (minutes)
                </label>
                <input
                  type="number"
                  value={formData.timeLimit || ''}
                  onChange={(e) => handleInputChange('timeLimit', e.target.value ? parseInt(e.target.value) : null)}
                  min="1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#CE4520] focus:border-[#CE4520]"
                  placeholder="No limit"
                />
              </div>
            </div>

            {/* Custom Rules */}
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Custom Rules
              </label>
              {formData.customRules.map((rule, index) => (
                <div key={index} className="flex mb-2">
                  <input
                    type="text"
                    value={rule}
                    onChange={(e) => handleCustomRuleChange(index, e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#CE4520] focus:border-[#CE4520]"
                    placeholder="Enter a custom rule"
                  />
                  <button
                    type="button"
                    onClick={() => removeCustomRule(index)}
                    className="ml-2 px-3 py-2 text-red-600 hover:text-red-800"
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addCustomRule}
                className="text-[#CE4520] hover:text-[#1565C0] text-sm"
              >
                + Add Custom Rule
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end space-x-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-[#CE4520] hover:bg-[#1565C0]"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Create Sport
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </Container>
  );
}