import { ProjectState, ProjectStateSchema } from './types';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

export class StateMachine {
  private statePath: string;

  constructor(private projectId: string) {
    this.statePath = join(process.cwd(), 'agents', 'state', projectId, 'project-state.json');
    this.ensureDirectory();
  }

  private ensureDirectory() {
    const dir = join(process.cwd(), 'agents', 'state', this.projectId);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }

  async initializeProject(requirements: string): Promise<ProjectState> {
    const initialState: ProjectState = {
      id: this.projectId,
      currentStage: 'requirements',
      requirements,
      stageOutputs: {},
      blockers: [],
      nextAgents: ['database-admin'],
      completedStages: [],
    };

    await this.saveState(initialState);
    return initialState;
  }

  async getCurrentState(): Promise<ProjectState | null> {
    if (!existsSync(this.statePath)) return null;
    
    const content = readFileSync(this.statePath, 'utf-8');
    const state = JSON.parse(content);
    return ProjectStateSchema.parse(state);
  }

  async transitionTo(stage: ProjectState['currentStage'], outputs?: any): Promise<void> {
    const currentState = await this.getCurrentState();
    if (!currentState) throw new Error('No project state found');

    // Save current stage output
    if (outputs) {
      currentState.stageOutputs[currentState.currentStage] = outputs;
    }

    // Mark current stage as completed
    if (!currentState.completedStages.includes(currentState.currentStage)) {
      currentState.completedStages.push(currentState.currentStage);
    }

    // Update to new stage
    currentState.currentStage = stage;
    currentState.nextAgents = this.getNextAgents(stage);
    currentState.blockers = [];

    await this.saveState(currentState);
  }

  private getNextAgents(stage: ProjectState['currentStage']): string[] {
    const stageAgents = {
      requirements: ['database-admin'],
      design: ['database-admin'],
      database: ['backend-developer'],
      backend: ['frontend-developer'],
      frontend: ['qa-devops'],
      testing: ['qa-devops'],
      deployment: [],
    };
    return stageAgents[stage] || [];
  }

  private async saveState(state: ProjectState): Promise<void> {
    const validated = ProjectStateSchema.parse(state);
    writeFileSync(this.statePath, JSON.stringify(validated, null, 2));
  }
}
