
import { db } from '@/lib/db';

/**
 * Gets the current assignment for a volunteer.
 * 
 * @param volunteerId The ID of the volunteer.
 * @returns The volunteer's current assignment.
 */
export async function getVolunteerCurrentAssignment(volunteerId: string) {
  const assignment = await db.volunteerAssignment.findFirst({
    where: {
      volunteerId,
      status: 'active',
    },
    include: {
      venueLevelMapping: {
        include: {
          venue: true,
        },
      },
    },
  });

  return assignment;
}

/**
 * Smartly detects the entity (fixture or match) based on the volunteer's assignment.
 * 
 * @param assignment The volunteer's assignment.
 * @param entityType The type of entity to detect.
 * @returns The detected entity.
 */
export async function smartDetectEntity(assignment: any, entityType: 'fixture' | 'match') {
  if (!assignment) {
    return null;
  }

  if (entityType === 'fixture') {
    const fixture = await db.fixture.findFirst({
      where: {
        venueLevelMappingId: assignment.venueLevelMappingId,
        status: 'in_progress',
      },
    });
    return fixture;
  } else if (entityType === 'match') {
    const match = await db.match.findFirst({
      where: {
        venueLevelMappingId: assignment.venueLevelMappingId,
        status: 'in_progress',
      },
    });
    return match;
  }

  return null;
}

/**
 * Gets suggested matches for a volunteer.
 * 
 * @param volunteerId The ID of the volunteer.
 * @returns A list of suggested matches.
 */
export async function getSuggestedMatches(volunteerId: string) {
  const assignment = await getVolunteerCurrentAssignment(volunteerId);
  if (!assignment) {
    return [];
  }

  const matches = await db.match.findMany({
    where: {
      venueLevelMappingId: assignment.venueLevelMappingId,
      status: 'in_progress',
    },
  });

  return matches;
}
