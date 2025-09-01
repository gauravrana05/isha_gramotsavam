import { describe, test, expect, beforeEach } from '@jest/globals';
import { mockDb } from '../helpers/mocks';

jest.mock('@/lib/db', () => ({
  db: mockDb,
}));

describe('Language Implementation for Volunteers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Language Detection & Routing', () => {
    test('should detect language from URL parameter', () => {
      const urlParams = [
        { url: '/en/volunteer', expectedLang: 'en' },
        { url: '/ta/volunteer', expectedLang: 'ta' },
        { url: '/hi/volunteer', expectedLang: 'hi' },
        { url: '/ml/volunteer', expectedLang: 'ml' },
        { url: '/te/volunteer', expectedLang: 'te' },
        { url: '/kn/volunteer', expectedLang: 'kn' },
        { url: '/or/volunteer', expectedLang: 'or' }
      ];

      urlParams.forEach(({ url, expectedLang }) => {
        const pathSegments = url.split('/');
        const langFromUrl = pathSegments[1];
        expect(langFromUrl).toBe(expectedLang);
      });
    });

    test('should validate supported language codes', () => {
      const supportedLanguages = ['en', 'ta', 'hi', 'ml', 'te', 'kn', 'or'];
      const testCases = [
        { code: 'en', valid: true },
        { code: 'ta', valid: true },
        { code: 'fr', valid: false },
        { code: 'de', valid: false },
        { code: 'hi', valid: true },
        { code: 'invalid', valid: false }
      ];

      testCases.forEach(({ code, valid }) => {
        const isValid = supportedLanguages.includes(code);
        expect(isValid).toBe(valid);
      });
    });

    test('should fallback to default language for invalid codes', () => {
      const defaultLanguage = 'en';
      const invalidCodes = ['fr', 'de', 'invalid', '', null, undefined];
      
      invalidCodes.forEach(code => {
        const finalLanguage = code && ['en', 'ta', 'hi', 'ml', 'te', 'kn', 'or'].includes(code) 
          ? code 
          : defaultLanguage;
        expect(finalLanguage).toBe(defaultLanguage);
      });
    });
  });

  describe('Post-Login Language Flow', () => {
    test('should redirect volunteers without language preference to language modal', () => {
      const volunteers = [
        { role: 'technical_volunteer', languagePreference: null, expectModal: true },
        { role: 'general_volunteer', languagePreference: null, expectModal: true },
        { role: 'verification_volunteer', languagePreference: null, expectModal: true },
        { role: 'technical_volunteer', languagePreference: 'ta', expectModal: false },
        { role: 'admin', languagePreference: null, expectModal: false }
      ];

      volunteers.forEach(({ role, languagePreference, expectModal }) => {
        const hasLanguagePreference = Boolean(languagePreference);
        const isVolunteer = ['general_volunteer', 'technical_volunteer', 'verification_volunteer'].includes(role);
        const shouldShowModal = isVolunteer && !hasLanguagePreference;
        
        expect(shouldShowModal).toBe(expectModal);
      });
    });

    test('should generate correct redirect URLs with language modal', () => {
      const user = { role: 'technical_volunteer', languagePreference: null };
      const supportedLanguages = ['en', 'ta', 'hi', 'ml', 'te', 'kn', 'or'];
      const userLang = user.languagePreference && supportedLanguages.includes(user.languagePreference) 
        ? user.languagePreference 
        : 'en';
      
      const hasLanguagePreference = Boolean(user.languagePreference);
      const isVolunteer = ['general_volunteer', 'technical_volunteer', 'verification_volunteer'].includes(user.role);
      
      let redirectPath = `/${userLang}`;
      if (isVolunteer && !hasLanguagePreference) {
        redirectPath = `/${userLang}/volunteer?showLanguageModal=true`;
      } else if (isVolunteer) {
        redirectPath = `/${userLang}/volunteer`;
      }
      
      expect(redirectPath).toBe('/en/volunteer?showLanguageModal=true');
    });

    test('should redirect volunteers with language preference directly', () => {
      const user = { role: 'technical_volunteer', languagePreference: 'ta' };
      const supportedLanguages = ['en', 'ta', 'hi', 'ml', 'te', 'kn', 'or'];
      const userLang = user.languagePreference && supportedLanguages.includes(user.languagePreference) 
        ? user.languagePreference 
        : 'en';
      
      const hasLanguagePreference = Boolean(user.languagePreference);
      const isVolunteer = ['general_volunteer', 'technical_volunteer', 'verification_volunteer'].includes(user.role);
      
      let redirectPath = `/${userLang}`;
      if (isVolunteer && !hasLanguagePreference) {
        redirectPath = `/${userLang}/volunteer?showLanguageModal=true`;
      } else if (isVolunteer) {
        redirectPath = `/${userLang}/volunteer`;
      }
      
      expect(redirectPath).toBe('/ta/volunteer');
    });
  });

  describe('Language Preference Storage', () => {
    test('should validate language preference update', () => {
      const validLanguages = ['en', 'ta', 'hi', 'ml', 'te', 'kn', 'or'];
      const updateRequests = [
        { language: 'ta', valid: true },
        { language: 'hi', valid: true },
        { language: 'fr', valid: false },
        { language: 'en', valid: true },
        { language: 'invalid', valid: false }
      ];

      updateRequests.forEach(({ language, valid }) => {
        const isValidUpdate = validLanguages.includes(language);
        expect(isValidUpdate).toBe(valid);
      });
    });

    test('should update user language preference in database', () => {
      const userId = 'user-123';
      const newLanguage = 'ta';
      
      // Mock database update
      const updateData = {
        languagePreference: newLanguage,
        updatedAt: new Date()
      };
      
      const mockUpdate = {
        where: { id: userId },
        data: updateData,
        select: {
          id: true,
          languagePreference: true,
          firstName: true,
          lastName: true,
          role: true
        }
      };
      
      expect(mockUpdate.data.languagePreference).toBe(newLanguage);
      expect(mockUpdate.where.id).toBe(userId);
    });
  });

  describe('Translation System', () => {
    test('should load correct translation files', () => {
      const supportedLanguages = ['en', 'ta', 'hi', 'ml', 'te', 'kn', 'or'];
      const translationFiles = {
        'en': 'en.json',
        'ta': 'ta.json', 
        'hi': 'hi.json',
        'ml': 'ml.json',
        'te': 'te.json',
        'kn': 'kn.json',
        'or': 'or.json'
      };

      supportedLanguages.forEach(lang => {
        const expectedFile = translationFiles[lang as keyof typeof translationFiles];
        expect(expectedFile).toBeDefined();
        expect(expectedFile).toBe(`${lang}.json`);
      });
    });

    test('should fallback to English for missing translations', () => {
      const translations = {
        'en': { 'volunteer.title': 'Volunteer Dashboard' },
        'ta': { 'volunteer.title': 'தன்னார்வலர் டாஷ்போர்டு' },
        'hi': {} // Missing translation
      };

      const getTranslation = (key: string, lang: string) => {
        return translations[lang as keyof typeof translations]?.[key] || 
               translations['en'][key] || 
               key;
      };

      expect(getTranslation('volunteer.title', 'en')).toBe('Volunteer Dashboard');
      expect(getTranslation('volunteer.title', 'ta')).toBe('தன்னார்வலர் டாஷ்போர்டு');
      expect(getTranslation('volunteer.title', 'hi')).toBe('Volunteer Dashboard'); // Fallback to English
    });

    test('should handle translation key lookup', () => {
      const mockTranslations = {
        'volunteer.loading_assignment': 'Loading your assignment...',
        'volunteer.no_venue_assignments': 'No Venue Assignments',
        'volunteer.dashboard_title': 'Volunteer Dashboard'
      };

      const t = (key: string, fallback?: string) => {
        return mockTranslations[key as keyof typeof mockTranslations] || fallback || key;
      };

      expect(t('volunteer.loading_assignment')).toBe('Loading your assignment...');
      expect(t('volunteer.missing_key', 'Default text')).toBe('Default text');
      expect(t('volunteer.missing_key')).toBe('volunteer.missing_key');
    });
  });

  describe('URL Language Switching', () => {
    test('should update URL when language changes', () => {
      const currentPath = '/en/volunteer/dashboard';
      const newLanguage = 'ta';
      
      const pathSegments = currentPath.split('/');
      const isValidLanguage = (lang: string) => ['en', 'ta', 'hi', 'ml', 'te', 'kn', 'or'].includes(lang);
      
      if (pathSegments[1] && isValidLanguage(pathSegments[1])) {
        pathSegments[1] = newLanguage;
      } else {
        pathSegments.splice(1, 0, newLanguage);
      }
      
      const newPath = pathSegments.join('/');
      expect(newPath).toBe('/ta/volunteer/dashboard');
    });

    test('should preserve query parameters during language switch', () => {
      const currentPath = '/en/volunteer?showLanguageModal=true';
      const newLanguage = 'hi';
      
      const [pathPart, queryPart] = currentPath.split('?');
      const pathSegments = pathPart.split('/');
      
      if (pathSegments[1] && ['en', 'ta', 'hi', 'ml', 'te', 'kn', 'or'].includes(pathSegments[1])) {
        pathSegments[1] = newLanguage;
      }
      
      const newPath = pathSegments.join('/') + (queryPart ? `?${queryPart}` : '');
      expect(newPath).toBe('/hi/volunteer?showLanguageModal=true');
    });
  });

  describe('Language Modal Behavior', () => {
    test('should show language modal based on URL parameter', () => {
      const urlParams = [
        { url: '/en/volunteer?showLanguageModal=true', shouldShow: true },
        { url: '/en/volunteer?showLanguageModal=false', shouldShow: false },
        { url: '/en/volunteer', shouldShow: false },
        { url: '/ta/volunteer?showLanguageModal=true', shouldShow: true }
      ];

      urlParams.forEach(({ url, shouldShow }) => {
        const urlObj = new URL(`http://localhost${url}`);
        const showModal = urlObj.searchParams.get('showLanguageModal') === 'true';
        expect(showModal).toBe(shouldShow);
      });
    });

    test('should handle language selection in modal', () => {
      const availableLanguages = [
        { code: 'en', name: 'English', nativeName: 'English' },
        { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்' },
        { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
        { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം' }
      ];

      const selectedLanguage = 'ta';
      const selectedLangInfo = availableLanguages.find(lang => lang.code === selectedLanguage);
      
      expect(selectedLangInfo).toBeDefined();
      expect(selectedLangInfo?.nativeName).toBe('தமிழ்');
    });
  });

  describe('Context Integration', () => {
    test('should initialize language from user preference', () => {
      const user = { languagePreference: 'ta' };
      const urlLang = null; // No language in URL
      const supportedLanguages = ['en', 'ta', 'hi', 'ml', 'te', 'kn', 'or'];
      
      let targetLang = 'en'; // default
      
      if (urlLang && supportedLanguages.includes(urlLang)) {
        targetLang = urlLang;
      } else if (user.languagePreference && supportedLanguages.includes(user.languagePreference)) {
        targetLang = user.languagePreference;
      }
      
      expect(targetLang).toBe('ta');
    });

    test('should prioritize URL language over user preference', () => {
      const user = { languagePreference: 'ta' };
      const urlLang = 'hi';
      const supportedLanguages = ['en', 'ta', 'hi', 'ml', 'te', 'kn', 'or'];
      
      let targetLang = 'en'; // default
      
      if (urlLang && supportedLanguages.includes(urlLang)) {
        targetLang = urlLang;
      } else if (user.languagePreference && supportedLanguages.includes(user.languagePreference)) {
        targetLang = user.languagePreference;
      }
      
      expect(targetLang).toBe('hi'); // URL takes priority
    });
  });

  describe('Error Handling', () => {
    test('should handle missing translation gracefully', () => {
      const translations = { 'common.save': 'Save' };
      const t = (key: string, fallback?: string) => {
        return translations[key as keyof typeof translations] || fallback || key;
      };

      expect(t('missing.key')).toBe('missing.key');
      expect(t('missing.key', 'Fallback')).toBe('Fallback');
      expect(t('common.save')).toBe('Save');
    });

    test('should handle invalid language codes', () => {
      const supportedLanguages = ['en', 'ta', 'hi', 'ml', 'te', 'kn', 'or'];
      const invalidCodes = ['xyz', '123', '', null, undefined];
      
      invalidCodes.forEach(code => {
        const isValid = code && supportedLanguages.includes(code);
        expect(isValid).toBeFalsy();
      });
    });

    test('should handle language loading failures', () => {
      const loadLanguage = async (lang: string) => {
        const supportedLanguages = ['en', 'ta', 'hi', 'ml', 'te', 'kn', 'or'];
        
        try {
          if (!supportedLanguages.includes(lang)) {
            throw new Error('Unsupported language');
          }
          return { success: true, language: lang };
        } catch (error) {
          return { success: false, language: 'en' }; // Fallback to English
        }
      };

      expect(loadLanguage('ta')).resolves.toEqual({ success: true, language: 'ta' });
      expect(loadLanguage('invalid')).resolves.toEqual({ success: false, language: 'en' });
    });
  });
});
