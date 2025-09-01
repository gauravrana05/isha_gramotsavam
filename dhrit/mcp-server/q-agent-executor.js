import { spawn } from 'child_process';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';

export class QAgentExecutor {
  constructor() {
    // Map our agent names to Q /agent names
    this.agentMapping = {
      'frontend-developer': 'frontend',
      'backend-developer': 'backend', 
      'database-admin': 'database',
      'qa-devops': 'devops'
    };
  }

  async executeAgent(agentName, task, requirements, projectContext = {}) {
    const qAgentName = this.agentMapping[agentName] || agentName;
    const userMessage = this.buildUserMessage(task, requirements, projectContext);
    
    return new Promise((resolve, reject) => {
      const qProcess = spawn('q', ['/agent', qAgentName], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env }
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
          resolve(this.parseAgentResponse(output));
        } else {
          reject(new Error(`Agent ${qAgentName} failed: ${errorOutput}`));
        }
      });

      // Send task directly to /agent (no system prompt needed)
      const agentInput = `${userMessage}\n\n/quit\n`;
      qProcess.stdin.write(agentInput);
      qProcess.stdin.end();
    });
  }

  buildUserMessage(task, requirements, context) {
    let message = `Task: ${task}\nRequirements: ${requirements}\n`;
    
    if (context.projectId) {
      message += `Project ID: ${context.projectId}\n`;
    }
    
    if (context.currentStage) {
      message += `Current Stage: ${context.currentStage}\n`;
    }
    
    if (context.dependencies) {
      message += `Dependencies: ${JSON.stringify(context.dependencies, null, 2)}\n`;
    }
    
    message += '\nPlease provide a complete implementation with code examples and next steps.';
    
    return message;
  }

  parseAgentResponse(output) {
    // Extract the actual response from Q CLI output
    const lines = output.split('\n');
    const responseStart = lines.findIndex(line => line.includes('User:')) + 1;
    const responseEnd = lines.findIndex(line => line.includes('/quit'));
    
    if (responseStart > 0 && responseEnd > responseStart) {
      return lines.slice(responseStart, responseEnd).join('\n').trim();
    }
    
    return output.trim();
  }
}
