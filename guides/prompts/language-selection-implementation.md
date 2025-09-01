# Language Selection Implementation for Public and Player Sections

## Overview

Implement the same multi-language selection functionality that exists in the volunteer section for both the public (pre-login) and player (post-login) sections of the Isha Gramotsavam application.

## Current Implementation Reference

The volunteer section currently has a complete language selection implementation with:
- **VolunteerLanguageSwitcher component** at `/src/components/volunteer/VolunteerLanguageSwitcher.tsx`
- **Integrated in VolunteerSidebar** with collapsed and expanded states
- **Database persistence** of user language preferences
- **URL-based language routing** with dynamic path updates
- **Real-time UI language switching** using i18n system

## Requirements

### 1. Public Section Language Selection (Pre-Login)

**Location**: `/src/app/[lang]/public/*` routes

**Implementation Requirements**:
- Create `PublicLanguageSwitcher` component based on `VolunteerLanguageSwitcher`
- Integrate into public header (where current language selector exists)
- **No database persistence** (users not logged in)
- **Session/cookie storage** for language preference
- **URL routing** to maintain language across navigation
- **Fallback behavior** for users without preferences

**Key Differences from Volunteer Implementation**:
```typescript
// Volunteer (with user profile update)
await updateProfileMutation.mutateAsync({
  preferredLanguage: newLanguage,
});

// Public (session/cookie storage only)
// Store in localStorage/sessionStorage
localStorage.setItem('preferred-language', newLanguage);
```

**Integration Points**:
- Replace existing language selector in `/src/components/common/Header.tsx`
- Ensure mobile responsiveness in public header
- Maintain consistency with existing public UI patterns

### 2. Player Section Language Selection (Post-Login)

**Location**: `/src/app/[lang]/player/*` routes

**Implementation Requirements**:
- Create `PlayerLanguageSwitcher` component based on `VolunteerLanguageSwitcher`
- Integrate into PlayerSidebar (footer section like volunteer)
- **Database persistence** of user language preferences
- **URL routing** with dynamic path updates
- **Profile synchronization** with user preferences

**Integration Points**:
- Add to `/src/components/navigation/PlayerSidebar.tsx` in footer actions
- Follow exact placement pattern from VolunteerSidebar
- Support both collapsed and expanded states
- Maintain consistency with existing player UI patterns

## Technical Implementation Details

### Step 1: Create Base Language Switcher Components

**File**: `/src/components/common/LanguageSwitcher.tsx`
```typescript
'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useTranslation } from '@/lib/utils/i18n';
import { SUPPORTED_LANGUAGES, LanguageCode } from '@/lib/utils/i18n-server';
import { Globe } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/AdvancedSelect';

interface LanguageSwitcherProps {
  isCollapsed?: boolean;
  showText?: boolean;
  persistToDatabase?: boolean; // New prop to control database vs session storage
  onLanguageChange?: (language: LanguageCode) => void; // Custom callback
}

export default function LanguageSwitcher({ 
  isCollapsed = false,
  showText = true,
  persistToDatabase = false,
  onLanguageChange
}: LanguageSwitcherProps) {
  // Implementation based on VolunteerLanguageSwitcher
  // With conditional database persistence
}
```

### Step 2: Create Specialized Components

**File**: `/src/components/public/PublicLanguageSwitcher.tsx`
```typescript
'use client';

import LanguageSwitcher from '@/components/common/LanguageSwitcher';
import { LanguageCode } from '@/lib/utils/i18n-server';

export default function PublicLanguageSwitcher(props: any) {
  const handleLanguageChange = (language: LanguageCode) => {
    // Store in localStorage for non-authenticated users
    localStorage.setItem('preferred-language', language);
    // Additional public-specific logic
  };

  return (
    <LanguageSwitcher 
      {...props}
      persistToDatabase={false}
      onLanguageChange={handleLanguageChange}
    />
  );
}
```

**File**: `/src/components/player/PlayerLanguageSwitcher.tsx`
```typescript
'use client';

import { useAuth } from '@/context/AuthContext';
import { api } from '@/server/trpc/react';
import { useNotification } from '@/context/NotificationContext';
import LanguageSwitcher from '@/components/common/LanguageSwitcher';
import { LanguageCode } from '@/lib/utils/i18n-server';

export default function PlayerLanguageSwitcher(props: any) {
  const { user } = useAuth();
  const { addNotification } = useNotification();

  // Update user profile mutation (same as volunteer)
  const updateProfileMutation = api.profile.update.useMutation({
    onSuccess: () => {
      addNotification('Language updated successfully', 'success');
    },
    onError: (error) => {
      addNotification(error.message || 'Failed to update language preference', 'error');
    },
  });

  const handleLanguageChange = async (language: LanguageCode) => {
    if (user) {
      await updateProfileMutation.mutateAsync({
        preferredLanguage: language,
      });
    }
  };

  return (
    <LanguageSwitcher 
      {...props}
      persistToDatabase={true}
      onLanguageChange={handleLanguageChange}
    />
  );
}
```

### Step 3: Integration into Existing Components

**Update**: `/src/components/common/Header.tsx`
```typescript
// Replace existing language dropdown with PublicLanguageSwitcher
import PublicLanguageSwitcher from '@/components/public/PublicLanguageSwitcher';

// In desktop header navigation
<PublicLanguageSwitcher showText={true} isCollapsed={false} />

// In mobile header
<PublicLanguageSwitcher showText={false} isCollapsed={true} />
```

**Update**: `/src/components/navigation/PlayerSidebar.tsx`
```typescript
// Add to imports
import PlayerLanguageSwitcher from '@/components/player/PlayerLanguageSwitcher';

// In footer actions section (same location as VolunteerSidebar)
<div className="border-t border-gray-200 p-3 space-y-1">
  {/* Language Switcher */}
  <PlayerLanguageSwitcher 
    isCollapsed={isDesktopCollapsed} 
    showText={showContent}
  />
  
  {/* Existing profile and logout buttons */}
</div>
```

### Step 4: URL Routing Enhancement

**Enhance**: URL path management for language switching
```typescript
// In all language switcher components
const handleLanguageChange = async (newLanguage: LanguageCode) => {
  if (newLanguage === currentLang) return;

  try {
    // Handle database/storage persistence
    await persistLanguagePreference(newLanguage);

    // Navigate to new language route
    const currentPath = window.location.pathname;
    const pathSegments = currentPath.split('/');
    
    // Replace the language segment in the URL
    if (pathSegments[1]) {
      pathSegments[1] = newLanguage;
      const newPath = pathSegments.join('/');
      router.push(newPath);
    }
  } catch (error) {
    // Error handling
  }
};
```

### Step 5: Session Storage for Public Users

**File**: `/src/lib/utils/languageStorage.ts`
```typescript
export const getStoredLanguage = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('preferred-language') || sessionStorage.getItem('preferred-language');
};

export const storeLanguage = (language: string, persistent: boolean = true) => {
  if (typeof window === 'undefined') return;
  
  if (persistent) {
    localStorage.setItem('preferred-language', language);
  } else {
    sessionStorage.setItem('preferred-language', language);
  }
};

export const clearStoredLanguage = () => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('preferred-language');
  sessionStorage.removeItem('preferred-language');
};
```

## Design Consistency Requirements

### Visual Consistency
- **Icons**: Use same Globe icon (`<Globe className="w-4 h-4" />`)
- **Typography**: Follow existing patterns (`text-xs font-medium`)
- **Colors**: Match existing hover states (`hover:bg-gray-100`)
- **Spacing**: Consistent with sidebar patterns (`p-3 space-y-1`)

### Interaction Patterns
- **Select Component**: Use existing `AdvancedSelect` component
- **Loading States**: Show loading during language switch
- **Error Handling**: Use notification system for errors
- **Disabled States**: Disable during updates

### Responsive Design
- **Mobile**: Icon-only in collapsed state
- **Desktop**: Full text display in expanded state
- **Touch Targets**: Minimum 44px for mobile interaction

## Testing Requirements

### Functional Testing
- [ ] Language switching works in public header
- [ ] Language switching works in player sidebar
- [ ] URL routing maintains language across navigation
- [ ] Database persistence works for authenticated users
- [ ] Session storage works for public users
- [ ] Language preferences survive page refresh

### Cross-Device Testing
- [ ] Mobile phones (320px-767px)
- [ ] Tablets (768px-1023px)
- [ ] Desktop (1024px+)
- [ ] Different browsers (Chrome, Safari, Firefox)

### Integration Testing
- [ ] No conflicts with existing volunteer language switcher
- [ ] Proper fallback when language preference missing
- [ ] Correct behavior during login/logout transitions
- [ ] Language consistency across role switches

## Implementation Priority

1. **Phase 1**: Create base `LanguageSwitcher` component
2. **Phase 2**: Implement `PublicLanguageSwitcher` and integrate into public header
3. **Phase 3**: Implement `PlayerLanguageSwitcher` and integrate into player sidebar
4. **Phase 4**: Add session storage utilities and URL routing enhancements
5. **Phase 5**: Testing and refinement

## Files to Create/Modify

### New Files
- `/src/components/common/LanguageSwitcher.tsx`
- `/src/components/public/PublicLanguageSwitcher.tsx`
- `/src/components/player/PlayerLanguageSwitcher.tsx`
- `/src/lib/utils/languageStorage.ts`

### Files to Modify
- `/src/components/common/Header.tsx` - Replace language dropdown
- `/src/components/navigation/PlayerSidebar.tsx` - Add language switcher
- Any additional i18n configuration files as needed

## Success Criteria

✅ **Public users** can change language from header and preference persists in session
✅ **Player users** can change language from sidebar and preference persists in database
✅ **URL routing** works seamlessly for all language changes
✅ **Visual consistency** matches volunteer section implementation exactly
✅ **Mobile responsiveness** works across all device sizes
✅ **No regressions** in existing volunteer language functionality

This implementation will provide consistent multi-language support across all user types while maintaining the high-quality UX standards established in the volunteer section.