import { z } from 'zod';

// Message Types
export const MessageSchema = z.object({
  id: z.string(),
  from: z.string(),
  to: z.string(),
  type: z.enum(['task', 'response', 'handoff', 'error', 'context']),
  payload: z.any(),
  timestamp: z.date(),
  status: z.enum(['pending', 'in-progress', 'completed', 'failed']),
  dependencies: z.array(z.string()).optional(),
});

export type Message = z.infer<typeof MessageSchema>;

// State Machine
export const ProjectStateSchema = z.object({
  id: z.string(),
  currentStage: z.enum(['requirements', 'design', 'database', 'backend', 'frontend', 'testing', 'deployment']),
  requirements: z.string(),
  stageOutputs: z.record(z.any()),
  blockers: z.array(z.string()),
  nextAgents: z.array(z.string()),
  completedStages: z.array(z.string()),
});

export type ProjectState = z.infer<typeof ProjectStateSchema>;

// Agent Types
export const AgentSchema = z.object({
  name: z.enum(['linker', 'frontend-developer', 'backend-developer', 'database-admin', 'qa-devops']),
  capabilities: z.array(z.string()),
  status: z.enum(['idle', 'working', 'blocked']),
});

export type Agent = z.infer<typeof AgentSchema>;
