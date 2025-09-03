'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';
import { volunteerFAQ, getContextualFAQs, searchFAQs, type FAQItem } from '@/lib/data/volunteerFAQ';
import { 
  HelpCircle, 
  X, 
  Search, 
  ChevronRight,
  ArrowLeft,
  MessageCircle
} from 'lucide-react';

export default function VolunteerHelpBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFAQ, setSelectedFAQ] = useState<FAQItem | null>(null);
  const [currentPage, setCurrentPage] = useState('');
  const [translations, setTranslations] = useState<any>({});
  const [isLoading, setIsLoading] = useState(true);
  
  const pathname = usePathname();
  const { currentLanguage } = useLanguage();

  // Load translations
  useEffect(() => {
    const loadTranslations = async () => {
      setIsLoading(true);
      try {
        const lang = currentLanguage || 'en';
        let translationModule;
        
        switch (lang) {
          case 'ta':
            translationModule = await import('@/lib/locales/ta.json');
            break;
          case 'hi':
            translationModule = await import('@/lib/locales/hi.json');
            break;
          case 'ml':
            translationModule = await import('@/lib/locales/ml.json');
            break;
          case 'te':
            translationModule = await import('@/lib/locales/te.json');
            break;
          case 'kn':
            translationModule = await import('@/lib/locales/kn.json');
            break;
          case 'or':
            translationModule = await import('@/lib/locales/or.json');
            break;
          default:
            translationModule = await import('@/lib/locales/en.json');
        }
        
        setTranslations(translationModule.default || translationModule);
        console.log('Translations loaded:', Object.keys(translationModule.default || translationModule));
        console.log('FAQ section exists:', !!(translationModule.default || translationModule).faq);
        console.log('Fixtures section exists:', !!(translationModule.default || translationModule).faq?.fixtures);
      } catch (error) {
        console.error('Failed to load translations:', error);
        // Fallback to English
        try {
          const enModule = await import('@/lib/locales/en.json');
          setTranslations(enModule.default || enModule);
        } catch (fallbackError) {
          console.error('Failed to load fallback translations:', fallbackError);
          setTranslations({});
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadTranslations();
  }, [currentLanguage]);

  // Simple translation function with nested key support
  const t = (key: string, fallback?: string) => {
    if (!translations || Object.keys(translations).length === 0) {
      console.log('No translations loaded:', key);
      return fallback || key;
    }

    const keys = key.split('.');
    let value = translations;
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        console.log('Translation key not found:', key, 'missing segment:', k);
        return fallback || key;
      }
    }
    
    return typeof value === 'string' ? value : (fallback || key);
  };

  // Extract current page context from pathname
  useEffect(() => {
    const pathSegments = pathname.split('/').filter(Boolean);
    const lastSegment = pathSegments[pathSegments.length - 1];
    
    console.log('Full pathname:', pathname);
    console.log('Path segments:', pathSegments);
    console.log('Last segment:', lastSegment);
    
    // Map URL segments to context names
    const pageMap: Record<string, string> = {
      'teams': 'teams',
      'fixtures': 'fixtures', 
      'matches': 'matches',
      'media': 'media',
      'post': 'post',
      'chat': 'chat',
      'notifications': 'notifications',
      'dashboard': 'dashboard'
    };
    
    setCurrentPage(pageMap[lastSegment] || 'general');
    console.log('Current page detected:', pageMap[lastSegment] || 'general', 'from segment:', lastSegment);
  }, [pathname]);

  // Get relevant FAQs based on search or context
  const displayFAQs = searchQuery 
    ? searchFAQs(searchQuery, currentPage)
    : getContextualFAQs(currentPage);

  console.log('Display FAQs:', displayFAQs.length, 'for page:', currentPage);

  const handleFAQClick = (faq: FAQItem) => {
    setSelectedFAQ(faq);
  };

  const handleBack = () => {
    setSelectedFAQ(null);
    setSearchQuery('');
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 bg-[#F28C38] text-white p-4 rounded-full shadow-lg hover:bg-[#E67A26] transition-colors"
        aria-label="Open help"
      >
        <HelpCircle className="w-6 h-6" />
      </button>
    );
  }

  if (isLoading) {
    return (
      <div className="fixed bottom-6 right-6 z-50 w-80 max-w-[90vw] bg-white rounded-lg shadow-xl border border-gray-200">
        <div className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#F28C38] mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">Loading help...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-80 max-w-[90vw] bg-white rounded-lg shadow-xl border border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-[#F28C38] text-white rounded-t-lg">
        <div className="flex items-center gap-2">
          {selectedFAQ && (
            <button onClick={handleBack} className="p-1 hover:bg-white/20 rounded">
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <MessageCircle className="w-5 h-5" />
          <h3 className="font-medium">
            {selectedFAQ ? t('faq.help_details', 'Help Details') : t('faq.volunteer_help', 'Volunteer Help')}
          </h3>
        </div>
        <button 
          onClick={() => setIsOpen(false)}
          className="p-1 hover:bg-white/20 rounded"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="max-h-96 overflow-y-auto">
        {selectedFAQ ? (
          // FAQ Details View
          <div className="p-4">
            <h4 className="font-medium text-gray-900 mb-3">
              {t(selectedFAQ.questionKey, 'Question not found')}
            </h4>
            <p className="text-gray-700 mb-4">
              {t(selectedFAQ.answerKey, 'Answer not found')}
            </p>
            
            {selectedFAQ.stepsKey && (
              <div className="bg-gray-50 p-3 rounded-lg">
                <h5 className="font-medium text-gray-900 mb-2">
                  {t('faq.steps', 'Steps:')}
                </h5>
                <div className="space-y-1 text-sm text-gray-700">
                  <div className="text-xs text-gray-500">
                    {t('faq.steps_coming_soon', 'Detailed steps coming soon...')}
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          // FAQ List View
          <>
            {/* Search */}
            <div className="p-4 border-b border-gray-100">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder={t('faq.search_placeholder', 'Search for help...')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F28C38] focus:border-transparent"
                />
              </div>
            </div>

            {/* Context indicator */}
            {!searchQuery && currentPage !== 'general' && (
              <div className="px-4 py-2 bg-orange-50 border-b border-gray-100">
                <p className="text-xs text-orange-700">
                  {t('faq.showing_for_page', `Showing help for: ${currentPage}`)}
                </p>
              </div>
            )}

            {/* FAQ List */}
            <div className="divide-y divide-gray-100">
              {displayFAQs.length > 0 ? (
                displayFAQs.slice(0, 8).map((faq) => (
                  <button
                    key={`faq-${faq.id}`}
                    onClick={() => handleFAQClick(faq)}
                    className="w-full p-4 text-left hover:bg-gray-50 transition-colors flex items-center justify-between group"
                  >
                    <span className="text-sm text-gray-700 group-hover:text-gray-900">
                      {t(faq.questionKey, 'Question not available')}
                    </span>
                    <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
                  </button>
                ))
              ) : (
                <div className="p-4 text-center text-gray-500">
                  <p className="text-sm">
                    {t('faq.no_results', 'No help topics found. Try different keywords.')}
                  </p>
                </div>
              )}
            </div>

            {/* Contact Support */}
            <div className="p-4 border-t border-gray-100 bg-gray-50">
              <p className="text-xs text-gray-600 mb-2">
                {t('faq.still_need_help', 'Still need help?')}
              </p>
              <button className="text-xs text-[#F28C38] hover:text-[#E67A26] font-medium">
                {t('faq.contact_support', 'Contact Support')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
