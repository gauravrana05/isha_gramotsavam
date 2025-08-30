#!/bin/bash

# Update all admin API calls to use new modular structure
find /Users/gauravrana/Desktop/Technical/Developement/isha_gramotsavam/src -name "*.tsx" -o -name "*.ts" | xargs sed -i '' \
  -e 's/api\.admin\.getDashboardOverview/api.admin.dashboard.getDashboardOverview/g' \
  -e 's/api\.admin\.getTournamentOverview/api.admin.dashboard.getTournamentOverview/g' \
  -e 's/api\.admin\.getAdminTeamStats/api.admin.teams.getAdminTeamStats/g' \
  -e 's/api\.admin\.getUsers/api.admin.users.getUsers/g' \
  -e 's/api\.admin\.searchUserByPhone/api.admin.users.searchUserByPhone/g' \
  -e 's/api\.admin\.updateUserRole/api.admin.users.updateUserRole/g' \
  -e 's/api\.admin\.verifyUser/api.admin.users.verifyUser/g' \
  -e 's/api\.admin\.getAdminTeams/api.admin.teams.getAdminTeams/g' \
  -e 's/api\.admin\.createTeam/api.admin.teams.createTeam/g' \
  -e 's/api\.admin\.deleteTeam/api.admin.teams.deleteTeam/g' \
  -e 's/api\.admin\.getTeamById/api.admin.teams.getTeamById/g' \
  -e 's/api\.admin\.addPlayerToTeam/api.admin.teams.addPlayerToTeam/g' \
  -e 's/api\.admin\.removePlayerFromTeam/api.admin.teams.removePlayerFromTeam/g' \
  -e 's/api\.admin\.updatePlayerPosition/api.admin.teams.updatePlayerPosition/g' \
  -e 's/api\.admin\.getVenues/api.admin.venues.getVenues/g' \
  -e 's/api\.admin\.getVenuesByLevel/api.admin.venues.getVenuesByLevel/g' \
  -e 's/api\.admin\.getAvailableVenuesForTeam/api.admin.venues.getAvailableVenuesForTeam/g' \
  -e 's/api\.admin\.autoAssignTeamVenue/api.admin.venues.autoAssignTeamVenue/g' \
  -e 's/api\.admin\.getVenueLocationMappings/api.admin.venues.getVenueLocationMappings/g' \
  -e 's/api\.admin\.createVenueLocationMapping/api.admin.venues.createVenueLocationMapping/g' \
  -e 's/api\.admin\.updateVenueLocationMapping/api.admin.venues.updateVenueLocationMapping/g' \
  -e 's/api\.admin\.deleteVenueLocationMapping/api.admin.venues.deleteVenueLocationMapping/g' \
  -e 's/api\.admin\.getSports/api.admin.events.getSports/g' \
  -e 's/api\.admin\.createSport/api.admin.events.createSport/g' \
  -e 's/api\.admin\.updateSport/api.admin.events.updateSport/g' \
  -e 's/api\.admin\.deleteSport/api.admin.events.deleteSport/g' \
  -e 's/api\.admin\.getSportById/api.admin.events.getSportById/g' \
  -e 's/api\.admin\.getEvents/api.admin.events.getEvents/g' \
  -e 's/api\.admin\.createEvent/api.admin.events.createEvent/g' \
  -e 's/api\.admin\.updateEvent/api.admin.events.updateEvent/g' \
  -e 's/api\.admin\.deleteEvent/api.admin.events.deleteEvent/g' \
  -e 's/api\.admin\.getEventById/api.admin.events.getEventById/g' \
  -e 's/api\.admin\.getFixtures/api.admin.events.getFixtures/g' \
  -e 's/api\.admin\.getTalukClusterMappings/api.admin.mappings.getTalukClusterMappings/g' \
  -e 's/api\.admin\.createTalukClusterMapping/api.admin.mappings.createTalukClusterMapping/g' \
  -e 's/api\.admin\.updateTalukClusterMapping/api.admin.mappings.updateTalukClusterMapping/g' \
  -e 's/api\.admin\.deleteTalukClusterMapping/api.admin.mappings.deleteTalukClusterMapping/g' \
  -e 's/api\.admin\.bulkCreateTalukMappings/api.admin.mappings.bulkCreateTalukMappings/g'

echo "✅ Updated all admin API calls to use new modular structure"
