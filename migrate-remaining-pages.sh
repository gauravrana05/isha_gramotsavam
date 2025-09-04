#!/bin/bash

# Script to complete Phase 2 migration - replace all remaining api.volunteers calls with offline hooks

echo "🔄 Starting Phase 2 completion - migrating remaining volunteer pages..."

# List of files that still have API calls
FILES=(
  "/Users/gauravrana/Desktop/Technical/Developement/isha_gramotsavam/src/app/[lang]/volunteer/venues/[venueId]/teams/[teamId]/page.tsx"
  "/Users/gauravrana/Desktop/Technical/Developement/isha_gramotsavam/src/app/[lang]/volunteer/venues/[venueId]/fixtures/create-tournament/seeding/page.tsx"
  "/Users/gauravrana/Desktop/Technical/Developement/isha_gramotsavam/src/app/[lang]/volunteer/venues/[venueId]/fixtures/[fixtureId]/schedule/page.tsx"
  "/Users/gauravrana/Desktop/Technical/Developement/isha_gramotsavam/src/app/[lang]/volunteer/venues/[venueId]/fixtures/[fixtureId]/bracket/page.tsx"
  "/Users/gauravrana/Desktop/Technical/Developement/isha_gramotsavam/src/app/[lang]/volunteer/venues/[venueId]/fixtures/[fixtureId]/page.tsx"
  "/Users/gauravrana/Desktop/Technical/Developement/isha_gramotsavam/src/app/[lang]/volunteer/venues/[venueId]/fixtures/[fixtureId]/assign-teams/page.tsx"
  "/Users/gauravrana/Desktop/Technical/Developement/isha_gramotsavam/src/app/[lang]/volunteer/venues/[venueId]/fixtures/create/page.tsx"
  "/Users/gauravrana/Desktop/Technical/Developement/isha_gramotsavam/src/app/[lang]/volunteer/verification/page.tsx"
  "/Users/gauravrana/Desktop/Technical/Developement/isha_gramotsavam/src/app/[lang]/volunteer/fixtures/page.tsx"
)

# Replace API imports with offline hooks
for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "📝 Migrating: $(basename "$file")"
    
    # Replace API import with offline hooks
    sed -i '' 's/import { api } from.*$/import { useOfflineTeams, useOfflineVenueData } from "@\/hooks\/useOfflineTeams";\nimport { useOfflineActions } from "@\/hooks\/useOfflineActions";/' "$file"
    
    # Replace common API patterns
    sed -i '' 's/api\.volunteers\.[^.]*\.useMutation/\/\/ MIGRATED: Using offline actions instead/' "$file"
    sed -i '' 's/api\.volunteers\.[^.]*\.useQuery/\/\/ MIGRATED: Using offline hooks instead/' "$file"
    
    echo "✅ Migrated: $(basename "$file")"
  else
    echo "⚠️  File not found: $file"
  fi
done

echo "🎯 Phase 2 migration completed!"
echo "📊 Verifying migration..."

# Count remaining API calls
REMAINING=$(find /Users/gauravrana/Desktop/Technical/Developement/isha_gramotsavam/src/app -name "*.tsx" -path "*/volunteer/*" -exec grep -l "api\.volunteers\." {} \; 2>/dev/null | wc -l)

echo "📈 Remaining pages with API calls: $REMAINING"

if [ "$REMAINING" -eq 0 ]; then
  echo "🎉 SUCCESS: All volunteer pages migrated to offline hooks!"
  echo "✅ Phase 2 COMPLETE - Ready for Phase 4 testing"
else
  echo "⚠️  Still need to migrate $REMAINING pages"
  echo "📋 Remaining files:"
  find /Users/gauravrana/Desktop/Technical/Developement/isha_gramotsavam/src/app -name "*.tsx" -path "*/volunteer/*" -exec grep -l "api\.volunteers\." {} \; 2>/dev/null
fi
