import { QAgentExecutor } from './q-agent-executor.js';

export class AgentCoordinator {
  constructor() {
    this.qExecutor = new QAgentExecutor();
    this.activeAgents = new Map();
  }

  async coordinateAgents(projectId, requirements) {
    const plan = this.createExecutionPlan(requirements);
    const results = [];

    for (const stage of plan.stages) {
      console.log(`Executing stage: ${stage.name}`);
      
      const stageResults = await Promise.all(
        stage.agents.map(async (agentTask) => {
          const context = {
            projectId,
            stage: stage.name,
            dependencies: results.filter(r => agentTask.dependencies?.includes(r.agent))
          };

          return await this.qExecutor.executeAgent(
            agentTask.agent,
            agentTask.task,
            agentTask.requirements,
            context
          );
        })
      );

      results.push(...stageResults.map((result, index) => ({
        agent: stage.agents[index].agent,
        stage: stage.name,
        result
      })));
    }

    return results;
  }

  createExecutionPlan(requirements) {
    // Analyze requirements and create execution plan
    const hasAuth = requirements.toLowerCase().includes('auth') || 
                   requirements.toLowerCase().includes('login') ||
                   requirements.toLowerCase().includes('user');
    
    const hasDatabase = requirements.toLowerCase().includes('data') ||
                       requirements.toLowerCase().includes('store') ||
                       requirements.toLowerCase().includes('user');

    const plan = {
      stages: [
        {
          name: 'database-design',
          agents: hasDatabase ? [{
            agent: 'database-admin',
            task: 'Design database schema',
            requirements: `Based on: ${requirements}`,
            dependencies: []
          }] : []
        },
        {
          name: 'backend-development',
          agents: [{
            agent: 'backend-developer',
            task: 'Create API endpoints',
            requirements: `Based on: ${requirements}`,
            dependencies: hasDatabase ? ['database-admin'] : []
          }]
        },
        {
          name: 'frontend-development',
          agents: [{
            agent: 'frontend-developer',
            task: 'Build user interface',
            requirements: `Based on: ${requirements}`,
            dependencies: ['backend-developer']
          }]
        },
        {
          name: 'testing-deployment',
          agents: [{
            agent: 'qa-devops',
            task: 'Setup testing and deployment',
            requirements: `Based on: ${requirements}`,
            dependencies: ['frontend-developer', 'backend-developer']
          }]
        }
      ]
    };

    // Filter out empty stages
    plan.stages = plan.stages.filter(stage => stage.agents.length > 0);
    
    return plan;
  }

  async getAgentStatus(projectId) {
    // Return status of all agents for a project
    return {
      projectId,
      activeAgents: Array.from(this.activeAgents.keys()),
      timestamp: new Date().toISOString()
    };
  }
}
