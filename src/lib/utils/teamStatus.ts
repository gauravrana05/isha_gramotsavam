export type TeamStatus = 'draft' | 'submitted' | 'verified' | 'rejected' | 'checked_in';

export const TEAM_STATUS_TRANSITIONS: Record<TeamStatus, TeamStatus[]> = {
  draft: ['submitted'],
  submitted: ['verified', 'rejected'],
  verified: ['checked_in'],
  rejected: ['draft'],
  checked_in: [],
};

export function canTransitionTo(currentStatus: TeamStatus, newStatus: TeamStatus): boolean {
  return TEAM_STATUS_TRANSITIONS[currentStatus].includes(newStatus);
}

export function canModifyTeam(status: TeamStatus): boolean {
  return status === 'draft';
}

export function canSubmitTeam(status: TeamStatus): boolean {
  return status === 'draft';
}

export function getStatusDisplayName(status: TeamStatus): string {
  const statusNames: Record<TeamStatus, string> = {
    draft: 'Draft',
    submitted: 'Submitted for Verification',
    verified: 'Verified',
    rejected: 'Rejected',
    checked_in: 'Checked In',
  };
  return statusNames[status];
}
