'use client';

import LanguageSwitcher from '@/components/common/LanguageSwitcher';
import { LanguageCode } from '@/lib/utils/i18n-server';
import { storeLanguage } from '@/lib/utils/languageStorage';

interface PublicLanguageSwitcherProps {
  isCollapsed?: boolean;
  showText?: boolean;
}

export default function PublicLanguageSwitcher(props: PublicLanguageSwitcherProps) {
  const handleLanguageChange = (language: LanguageCode) => {
    // Store in localStorage for non-authenticated users
    storeLanguage(language, true);
  };

  return (
    <LanguageSwitcher 
      {...props}
      persistToDatabase={false}
      onLanguageChange={handleLanguageChange}
    />
  );
}
