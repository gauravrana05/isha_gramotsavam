'use server'

import { advanceClusterWinnersToDivision, advanceDivisionWinnersToFinals } from './teamVenueAssignment';

export async function triggerAdvanceClusterWinners() {
  try {
    const result = await advanceClusterWinnersToDivision();
    
    return {
      success: true,
      message: `Successfully processed ${result.processedVenues} cluster venues. ${result.successfulProgressions} teams were advanced to division venues.`,
      details: result
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      message: 'Failed to advance cluster winners'
    };
  }
}

export async function triggerAdvanceDivisionWinners() {
  try {
    const result = await advanceDivisionWinnersToFinals();
    
    return {
      success: true,
      message: `Successfully processed ${result.processedVenues} division venues. ${result.successfulProgressions} teams were advanced to finals at Isha Yoga Center.`,
      details: result
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      message: 'Failed to advance division winners'
    };
  }
}

export async function triggerAdvanceAllWinners() {
  try {
    const clusterResult = await advanceClusterWinnersToDivision();
    const divisionResult = await advanceDivisionWinnersToFinals();
    
    const totalClusterAdvanced = clusterResult.successfulProgressions || 0;
    const totalDivisionAdvanced = divisionResult.successfulProgressions || 0;
    
    return {
      success: true,
      message: `Advanced ${totalClusterAdvanced} teams from cluster to division and ${totalDivisionAdvanced} teams from division to finals.`,
      clusterResult,
      divisionResult
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      message: 'Failed to advance tournament winners'
    };
  }
}