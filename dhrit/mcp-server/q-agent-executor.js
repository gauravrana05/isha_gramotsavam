import { spawn } from 'child_process';

export class QAgentExecutor {
  constructor(redisManager, dbManager) {
    this.redis = redisManager;
    this.db = dbManager;
    this.agentMapping = {
      'roop': 'frontend',
      'mool': 'backend',
      'kosh': 'database',
      'dhar': 'devops',
      'kalp': 'design',
      'bandh': 'security',
      'gati': 'performance',
      'pal': 'architecture'
    };
  }

  async executeAgent(agentName, task, requirements, context = {}) {
    const startTime = Date.now();
    
    try {
      console.log(`Executing ${agentName} agent...`);
      
      const qAgentType = this.agentMapping[agentName] || 'general';
      const result = await this.runQAgent(qAgentType, task, requirements, context);
      
      const duration = Date.now() - startTime;
      
      // Record performance
      if (this.db) {
        await this.db.recordAgentPerformance(agentName, task, duration, true);
      }
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      // Record failure
      if (this.db) {
        await this.db.recordAgentPerformance(agentName, task, duration, false, error.message);
      }
      
      throw error;
    }
  }

  async runQAgent(qAgentType, task, requirements, context) {
    return new Promise((resolve, reject) => {
      const qProcess = spawn('q', ['/agent', qAgentType], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let output = '';
      let errorOutput = '';

      qProcess.stdout.on('data', (data) => {
        output += data.toString();
      });

      qProcess.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      qProcess.on('close', (code) => {
        if (code === 0) {
          resolve(output);
        } else {
          reject(new Error(`Q Agent failed: ${errorOutput}`));
        }
      });

      qProcess.on('error', (error) => {
        reject(new Error(`Failed to start Q Agent: ${error.message}`));
      });

      // Send task to agent
      const prompt = this.buildAgentPrompt(task, requirements, context);
      qProcess.stdin.write(prompt);
      qProcess.stdin.end();
    });
  }

  buildAgentPrompt(task, requirements, context) {
    return `DHRIT AGENT TASK

Task: ${task}

Requirements: ${requirements}

Context: ${JSON.stringify(context, null, 2)}

Please complete this task following Dhrit platform standards and coordination protocols.`;
  }
}
