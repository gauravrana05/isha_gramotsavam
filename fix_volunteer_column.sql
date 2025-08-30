-- Rename the column to match what the code expects
ALTER TABLE volunteer_assignments 
RENAME COLUMN venue_location_mapping_id TO venue_level_mapping_id;

-- Update the index name to match
DROP INDEX IF EXISTS idx_volunteer_assignments_venue_location_mapping_id;
CREATE INDEX idx_volunteer_assignments_venue_level_mapping_id ON volunteer_assignments(venue_level_mapping_id);
