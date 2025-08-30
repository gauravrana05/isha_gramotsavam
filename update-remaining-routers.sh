#!/bin/bash

# Update teams API calls to use new modular structure
find /Users/gauravrana/Desktop/Technical/Developement/isha_gramotsavam/src -name "*.tsx" -o -name "*.ts" | xargs sed -i '' \
  -e 's/api\.teams\.getById/api.teams.management.getById/g' \
  -e 's/api\.teams\.getMyTeam/api.teams.management.getMyTeam/g' \
  -e 's/api\.teams\.getMyTeams/api.teams.management.getMyTeams/g' \
  -e 's/api\.teams\.create\([^A]\)/api.teams.management.create\1/g' \
  -e 's/api\.teams\.createAndPromoteCaptain/api.teams.management.createAndPromoteCaptain/g' \
  -e 's/api\.teams\.update/api.teams.management.update/g' \
  -e 's/api\.teams\.uploadPhoto/api.teams.management.uploadPhoto/g' \
  -e 's/api\.teams\.createVenueAssignment/api.teams.management.createVenueAssignment/g' \
  -e 's/api\.teams\.updateVenueAssignment/api.teams.management.updateVenueAssignment/g' \
  -e 's/api\.teams\.getPlayers/api.teams.players.getPlayers/g' \
  -e 's/api\.teams\.addPlayer/api.teams.players.addPlayer/g' \
  -e 's/api\.teams\.removePlayer/api.teams.players.removePlayer/g' \
  -e 's/api\.teams\.makeCaptain/api.teams.players.makeCaptain/g' \
  -e 's/api\.teams\.getPlayerTeamById/api.teams.players.getPlayerTeamById/g' \
  -e 's/api\.teams\.getForVerification/api.teams.verification.getForVerification/g' \
  -e 's/api\.teams\.getForVerificationDetail/api.teams.verification.getForVerificationDetail/g' \
  -e 's/api\.teams\.verifyPlayer/api.teams.verification.verifyPlayer/g' \
  -e 's/api\.teams\.verifyPlayersBulk/api.teams.verification.verifyPlayersBulk/g' \
  -e 's/api\.teams\.getMyTeamFixtures/api.teams.fixtures.getMyTeamFixtures/g' \
  -e 's/api\.teams\.getMyTeamMatches/api.teams.fixtures.getMyTeamMatches/g'

# Update tournaments API calls to use new modular structure
find /Users/gauravrana/Desktop/Technical/Developement/isha_gramotsavam/src -name "*.tsx" -o -name "*.ts" | xargs sed -i '' \
  -e 's/api\.tournaments\.events\.getById/api.tournaments.events.getById/g' \
  -e 's/api\.tournaments\.events\.getAll/api.tournaments.events.getAll/g' \
  -e 's/api\.tournaments\.events\.create/api.tournaments.events.create/g' \
  -e 's/api\.tournaments\.events\.update/api.tournaments.events.update/g' \
  -e 's/api\.tournaments\.events\.delete/api.tournaments.events.delete/g' \
  -e 's/api\.tournaments\.checkInTeam/api.tournaments.matches.checkInTeam/g' \
  -e 's/api\.tournaments\.enterResult/api.tournaments.matches.enterResult/g'

# Update volunteers API calls to use new modular structure  
find /Users/gauravrana/Desktop/Technical/Developement/isha_gramotsavam/src -name "*.tsx" -o -name "*.ts" | xargs sed -i '' \
  -e 's/api\.volunteers\.getMyAssignments/api.volunteers.assignments.getMyAssignments/g' \
  -e 's/api\.volunteers\.getVenueTeams/api.volunteers.venue.getVenueTeams/g' \
  -e 's/api\.volunteers\.getVenueCheckedInTeams/api.volunteers.venue.getVenueCheckedInTeams/g' \
  -e 's/api\.volunteers\.getVenueFixtures/api.volunteers.venue.getVenueFixtures/g' \
  -e 's/api\.volunteers\.getVenueMatches/api.volunteers.venue.getVenueMatches/g' \
  -e 's/api\.volunteers\.getFixtureDetails/api.volunteers.venue.getFixtureDetails/g' \
  -e 's/api\.volunteers\.getTeamForMatchDay/api.volunteers.verification.getTeamForMatchDay/g' \
  -e 's/api\.volunteers\.verifyPlayerForMatchDay/api.volunteers.verification.verifyPlayerForMatchDay/g' \
  -e 's/api\.volunteers\.verifyPlayersForMatchDayBulk/api.volunteers.verification.verifyPlayersForMatchDayBulk/g' \
  -e 's/api\.volunteers\.getTeamsByIds/api.volunteers.verification.getTeamsByIds/g'

echo "✅ Updated all teams, tournaments, and volunteers API calls to use new modular structure"
