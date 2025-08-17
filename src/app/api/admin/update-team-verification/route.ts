import { NextRequest, NextResponse } from 'next/server';
import { updateTeamVerificationRecord } from '@/lib/actions/verification/verifyTeam';

export async function POST(request: NextRequest) {
  try {
    const { teamId } = await request.json();
    
    if (!teamId) {
      return NextResponse.json(
        { success: false, error: 'Team ID is required' },
        { status: 400 }
      );
    }

    console.log(`🔄 Running updateTeamVerificationRecord for team: ${teamId}`);
    
    await updateTeamVerificationRecord(teamId);
    
    return NextResponse.json({
      success: true,
      message: 'Team verification record updated successfully'
    });
    
  } catch (error) {
    console.error('Error updating team verification record:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const teamId = url.searchParams.get('teamId');
  
  if (!teamId) {
    return NextResponse.json(
      { success: false, error: 'Team ID is required as query parameter' },
      { status: 400 }
    );
  }

  try {
    console.log(`🔄 Running updateTeamVerificationRecord for team: ${teamId}`);
    
    await updateTeamVerificationRecord(teamId);
    
    return NextResponse.json({
      success: true,
      message: 'Team verification record updated successfully'
    });
    
  } catch (error) {
    console.error('Error updating team verification record:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}