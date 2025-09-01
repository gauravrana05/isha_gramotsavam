#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { QAgentExecutor } from './q-agent-executor.js';
import { AgentCoordinator } from './agent-coordinator.js';
import { DomainTrainer } from '../training/domain-trainer.js';
import { ProtocolTrainer } from '../training/protocol-trainer.js';
import { RedisManager } from './redis-manager.js';
import { DatabaseManager } from './database-manager.js';
import { ProjectStorage } from './project-storage.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const server = new Server(
  {
    name: 'dhrit-platform',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Initialize managers
const redisManager = new RedisManager();
const dbManager = new DatabaseManager();
const projectStorage = new ProjectStorage();
const qExecutor = new QAgentExecutor(redisManager, dbManager);
const coordinator = new AgentCoordinator(redisManager, dbManager);
const domainTrainer = new DomainTrainer();
const protocolTrainer = new ProtocolTrainer();

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      // Core Agents
      {
        name: 'roop',
        description: 'Frontend Developer Agent - Next.js, React, Tailwind CSS, AWS Amplify',
        inputSchema: {
          type: 'object',
          properties: {
            projectId: { type: 'string', description: 'Unique project identifier' },
            task: { type: 'string', description: 'Specific frontend task to perform' },
            requirements: { type: 'string', description: 'Detailed requirements for the task' }
          },
          required: ['projectId', 'task', 'requirements']
        }
      },
      {
        name: 'mool',
        description: 'Backend Developer Agent - tRPC, Prisma, Node.js, Authentication',
        inputSchema: {
          type: 'object',
          properties: {
            projectId: { type: 'string', description: 'Unique project identifier' },
            task: { type: 'string', description: 'Specific backend task to perform' },
            requirements: { type: 'string', description: 'Detailed requirements for the task' }
          },
          required: ['projectId', 'task', 'requirements']
        }
      },
      {
        name: 'kosh',
        description: 'Database Admin Agent - Prisma, PostgreSQL, Schema Design',
        inputSchema: {
          type: 'object',
          properties: {
            projectId: { type: 'string', description: 'Unique project identifier' },
            task: { type: 'string', description: 'Specific database task to perform' },
            requirements: { type: 'string', description: 'Detailed requirements for the task' }
          },
          required: ['projectId', 'task', 'requirements']
        }
      },
      {
        name: 'dhar',
        description: 'QA & DevOps Agent - Testing, CI/CD, Deployment',
        inputSchema: {
          type: 'object',
          properties: {
            projectId: { type: 'string', description: 'Unique project identifier' },
            task: { type: 'string', description: 'Specific QA/DevOps task to perform' },
            requirements: { type: 'string', description: 'Detailed requirements for the task' }
          },
          required: ['projectId', 'task', 'requirements']
        }
      },
      // Enterprise Agents
      {
        name: 'kalp',
        description: 'Design System Agent - Design tokens, component systems, brand identity',
        inputSchema: {
          type: 'object',
          properties: {
            mode: { type: 'string', enum: ['train', 'work'], description: 'Mode: train (learn from saved data) or work (execute task)', default: 'work' },
            projectId: { type: 'string', description: 'Unique project identifier (required for work mode)' },
            task: { type: 'string', description: 'Specific design system task to perform (required for work mode)' },
            requirements: { type: 'string', description: 'Detailed requirements for the task (required for work mode)' }
          },
          required: []
        }
      },
      {
        name: 'bandh',
        description: 'Security Agent - Security audits, compliance, vulnerability scanning',
        inputSchema: {
          type: 'object',
          properties: {
            projectId: { type: 'string', description: 'Unique project identifier' },
            task: { type: 'string', description: 'Specific security task to perform' },
            requirements: { type: 'string', description: 'Detailed requirements for the task' }
          },
          required: ['projectId', 'task', 'requirements']
        }
      },
      {
        name: 'gati',
        description: 'Performance Agent - Optimization, caching, load testing',
        inputSchema: {
          type: 'object',
          properties: {
            projectId: { type: 'string', description: 'Unique project identifier' },
            task: { type: 'string', description: 'Specific performance task to perform' },
            requirements: { type: 'string', description: 'Detailed requirements for the task' }
          },
          required: ['projectId', 'task', 'requirements']
        }
      },
      {
        name: 'pal',
        description: 'Architecture Agent - Microservices, system design, scalability patterns',
        inputSchema: {
          type: 'object',
          properties: {
            projectId: { type: 'string', description: 'Unique project identifier' },
            task: { type: 'string', description: 'Specific architecture task to perform' },
            requirements: { type: 'string', description: 'Detailed requirements for the task' }
          },
          required: ['projectId', 'task', 'requirements']
        }
      },
      // Agent Coordination Tools
      {
        name: 'request',
        description: 'Request something from another agent',
        inputSchema: {
          type: 'object',
          properties: {
            fromAgent: { type: 'string', enum: ['roop', 'mool', 'kosh', 'dhar', 'kalp', 'bandh', 'gati', 'pal'] },
            toAgent: { type: 'string', enum: ['roop', 'mool', 'kosh', 'dhar', 'kalp', 'bandh', 'gati', 'pal'] },
            projectId: { type: 'string', description: 'Project identifier' },
            requestType: { type: 'string', description: 'Type of request (types, review, approval, feedback)' },
            message: { type: 'string', description: 'Detailed request message' },
            priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' }
          },
          required: ['fromAgent', 'toAgent', 'projectId', 'requestType', 'message']
        }
      },
      {
        name: 'respond',
        description: 'Respond to a request from another agent',
        inputSchema: {
          type: 'object',
          properties: {
            requestId: { type: 'string', description: 'ID of the request being responded to' },
            fromAgent: { type: 'string', enum: ['roop', 'mool', 'kosh', 'dhar', 'kalp', 'bandh', 'gati', 'pal'] },
            response: { type: 'string', description: 'Response message' },
            status: { type: 'string', enum: ['approved', 'rejected', 'needs_changes', 'completed'], description: 'Response status' },
            attachments: { type: 'object', description: 'Any files or data being shared' }
          },
          required: ['requestId', 'fromAgent', 'response', 'status']
        }
      },
      // Project Management Tools
      {
        name: 'init',
        description: 'Initialize a new project with actual code structure',
        inputSchema: {
          type: 'object',
          properties: {
            projectId: { type: 'string', description: 'Unique project identifier' },
            projectType: { type: 'string', enum: ['nextjs', 'react', 'node'], description: 'Type of project to create', default: 'nextjs' },
            location: { type: 'string', description: 'Where to create the project (optional, defaults to dhrit/projects/{projectId}/code)' }
          },
          required: ['projectId']
        }
      },
      // Training Tools
      {
        name: 'train-domain',
        description: 'Train an agent with domain-specific knowledge',
        inputSchema: {
          type: 'object',
          properties: {
            agentName: { type: 'string', enum: ['roop', 'mool', 'kosh', 'dhar', 'kalp', 'bandh', 'gati', 'pal'] },
            trainingContent: { type: 'string', description: 'Detailed training content for the agent' },
            domainKnowledge: { type: 'object', description: 'Additional domain-specific knowledge' }
          },
          required: ['agentName']
        }
      },
      {
        name: 'train-protocol',
        description: 'Train an agent on coordination protocols',
        inputSchema: {
          type: 'object',
          properties: {
            agentName: { type: 'string', enum: ['roop', 'mool', 'kosh', 'dhar', 'kalp', 'bandh', 'gati', 'pal'] }
          },
          required: ['agentName']
        }
      },
      {
        name: 'train-all-agents',
        description: 'Train all agents with domain knowledge and protocols',
        inputSchema: {
          type: 'object',
          properties: {
            domainKnowledge: { type: 'object', description: 'Domain-specific knowledge for all agents' }
          }
        }
      },
      // Project Management
      {
        name: 'init',
        description: 'Initialize a new project with requirements',
        inputSchema: {
          type: 'object',
          properties: {
            projectId: { type: 'string', description: 'Unique project identifier' },
            requirements: { type: 'string', description: 'Project requirements and specifications' }
          },
          required: ['projectId', 'requirements']
        }
      },
      {
        name: 'status',
        description: 'Get current project status and progress',
        inputSchema: {
          type: 'object',
          properties: {
            projectId: { type: 'string', description: 'Unique project identifier' }
          },
          required: ['projectId']
        }
      },
      {
        name: 'build',
        description: 'Execute full project development with all agents',
        inputSchema: {
          type: 'object',
          properties: {
            projectId: { type: 'string', description: 'Unique project identifier' },
            requirements: { type: 'string', description: 'Complete project requirements' }
          },
          required: ['projectId', 'requirements']
        }
      }
    ]
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      // Core Agents
      case 'roop':
        return await handleAgentTask('roop', args);
      case 'mool':
        return await handleAgentTask('mool', args);
      case 'kosh':
        return await handleAgentTask('kosh', args);
      case 'dhar':
        return await handleAgentTask('dhar', args);
      
      // Enterprise Agents
      case 'kalp':
        return await handleAgentTask('kalp', args);
      case 'bandh':
        return await handleAgentTask('bandh', args);
      case 'gati':
        return await handleAgentTask('gati', args);
      case 'pal':
        return await handleAgentTask('pal', args);

      // Agent Coordination
      case 'request':
        return await handleAgentRequest(args);
      case 'respond':
        return await handleAgentResponse(args);

      // Project Management
      case 'init':
        return await handleProjectInit(args);
      case 'status':
        return await handleProjectStatus(args);

      // Training
      case 'train-domain':
        return await handleDomainTraining(args);
      case 'train-protocol':
        return await handleProtocolTraining(args);
      case 'train-all-agents':
        return await handleTrainAllAgents(args);

      // Project Management
      case 'init':
        return await handleProjectInit(args);
      case 'status':
        return await handleProjectStatus(args);
      case 'build':
        return await handleFullProjectBuild(args);

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: `Error: ${error.message}`
      }],
      isError: true
    };
  }
});

// Handler functions
async function handleAgentTask(agentName, args) {
  const { mode = 'work', projectId, task, requirements } = args;
  
  try {
    if (mode === 'train') {
      // Training mode - read saved training data and train the agent
      const trainingResult = await trainAgentFromSavedData(agentName);
      return {
        content: [{
          type: 'text',
          text: `✅ ${agentName.toUpperCase()} Agent Training Complete:\n\n${trainingResult}`
        }]
      };
    } else {
      // Work mode - execute the task and save to project
      
      // Initialize project if it doesn't exist
      if (projectId) {
        projectStorage.initializeProject(projectId);
      }
      
      const result = await qExecutor.executeAgent(agentName, task, requirements, { projectId });
      
      // Save agent output to project storage
      if (projectId) {
        const outputType = task.toLowerCase().replace(/\s+/g, '-');
        const filePath = projectStorage.saveAgentOutput(projectId, agentName, outputType, {
          task,
          requirements,
          result,
          agentName
        });
        
        return {
          content: [{
            type: 'text',
            text: `✅ ${agentName.toUpperCase()} Agent Result:\n\n${result}\n\n📁 Output saved to: ${filePath}\n\n🔄 Project Status: Use 'status --projectId "${projectId}"' to see coordination status`
          }]
        };
      }
      
      return {
        content: [{
          type: 'text',
          text: `${agentName.toUpperCase()} Agent Result:\n\n${result}`
        }]
      };
    }
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: `${agentName.toUpperCase()} Agent Failed: ${error.message}`
      }],
      isError: true
    };
  }
}

async function handleAgentRequest(args) {
  const { fromAgent, toAgent, projectId, requestType, message, priority = 'medium' } = args;
  
  try {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const request = {
      requestId,
      fromAgent,
      toAgent,
      projectId,
      requestType,
      message,
      priority,
      status: 'pending',
      createdAt: new Date().toISOString()
    };
    
    const path = await import('path');
    const fs = await import('fs');
    const requestPath = path.join(process.cwd(), 'dhrit', 'projects', projectId, 'coordination', 'requests');
    
    if (!fs.existsSync(requestPath)) {
      fs.mkdirSync(requestPath, { recursive: true });
    }
    
    fs.writeFileSync(
      path.join(requestPath, `${requestId}.json`),
      JSON.stringify(request, null, 2)
    );
    
    return {
      content: [{
        type: 'text',
        text: `📨 Request sent from ${fromAgent.toUpperCase()} to ${toAgent.toUpperCase()}

🆔 Request ID: ${requestId}
📋 Type: ${requestType}
💬 Message: ${message}

To respond: respond --requestId "${requestId}" --fromAgent "${toAgent}" --response "your response" --status "approved"`
      }]
    };
    
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: `❌ Failed to send request: ${error.message}`
      }],
      isError: true
    };
  }
}

async function handleAgentResponse(args) {
  const { requestId, fromAgent, response, status } = args;
  
  try {
    const path = await import('path');
    const fs = await import('fs');
    
    const projectsPath = path.join(process.cwd(), 'dhrit', 'projects');
    const projects = fs.readdirSync(projectsPath);
    
    let requestFile = null;
    let projectId = null;
    
    for (const project of projects) {
      const requestPath = path.join(projectsPath, project, 'coordination', 'requests', `${requestId}.json`);
      if (fs.existsSync(requestPath)) {
        requestFile = requestPath;
        projectId = project;
        break;
      }
    }
    
    if (!requestFile) {
      return {
        content: [{
          type: 'text',
          text: `❌ Request ${requestId} not found`
        }],
        isError: true
      };
    }
    
    const requestData = JSON.parse(fs.readFileSync(requestFile, 'utf8'));
    requestData.response = response;
    requestData.status = status;
    requestData.respondedAt = new Date().toISOString();
    
    fs.writeFileSync(requestFile, JSON.stringify(requestData, null, 2));
    
    return {
      content: [{
        type: 'text',
        text: `✅ Response sent from ${fromAgent.toUpperCase()} to ${requestData.fromAgent.toUpperCase()}

📋 Request: ${requestData.requestType}
✅ Status: ${status}
💬 Response: ${response}`
      }]
    };
    
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: `❌ Failed to respond: ${error.message}`
      }],
      isError: true
    };
  }
}

async function handleProjectInit(args) {
  const { projectId, projectType = 'nextjs', location } = args;
  
  try {
    const { spawn } = await import('child_process');
    const path = await import('path');
    
    // Determine project location
    const projectLocation = location || path.join(process.cwd(), 'dhrit', 'projects', projectId, 'code');
    
    // Initialize project storage structure
    projectStorage.initializeProject(projectId);
    
    // Create actual code project
    let createCommand, createArgs;
    
    switch (projectType) {
      case 'nextjs':
        createCommand = 'npx';
        createArgs = ['create-next-app@latest', projectLocation, '--typescript', '--tailwind', '--eslint', '--app', '--src-dir', '--import-alias', '@/*'];
        break;
      case 'react':
        createCommand = 'npx';
        createArgs = ['create-react-app', projectLocation, '--template', 'typescript'];
        break;
      case 'node':
        createCommand = 'npm';
        createArgs = ['init', '-y'];
        break;
      default:
        throw new Error(`Unsupported project type: ${projectType}`);
    }
    
    return new Promise((resolve, reject) => {
      const process = spawn(createCommand, createArgs, { stdio: 'pipe' });
      
      let output = '';
      let errorOutput = '';
      
      process.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      process.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });
      
      process.on('close', (code) => {
        if (code === 0) {
          resolve({
            content: [{
              type: 'text',
              text: `✅ Project "${projectId}" initialized successfully!\n\n📁 Location: ${projectLocation}\n🚀 Type: ${projectType}\n\n${output}\n\n🔄 Ready for agent coordination. Start with:\npal --projectId "${projectId}" --task "Design architecture" --requirements "Your requirements"`
            }]
          });
        } else {
          reject(new Error(`Project initialization failed: ${errorOutput || 'Unknown error'}`));
        }
      });
      
      process.on('error', (error) => {
        reject(new Error(`Failed to initialize project: ${error.message}`));
      });
    });
    
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: `❌ Project initialization failed: ${error.message}`
      }],
      isError: true
    };
  }
}

async function handleProjectStatus(args) {
  const { projectId } = args;
  
  try {
    if (!projectId) {
      // List all projects
      const projects = projectStorage.listProjects();
      const projectList = projects.map(p => `• ${p.projectId} (${p.status}) - ${p.createdAt}`).join('\n');
      
      return {
        content: [{
          type: 'text',
          text: `📋 All Projects:\n\n${projectList || 'No projects found'}\n\nUse: status --projectId "project-name" for detailed status`
        }]
      };
    }
    
    // Get specific project status
    const status = projectStorage.getProjectStatus(projectId);
    
    if (!status) {
      return {
        content: [{
          type: 'text',
          text: `❌ Project "${projectId}" not found`
        }],
        isError: true
      };
    }
    
    const agentStatus = status.agents.map(agent => 
      `• ${agent.agent.toUpperCase()}: ${agent.status} (${agent.outputs} outputs) ${agent.lastUpdated ? '- ' + agent.lastUpdated : ''}`
    ).join('\n');
    
    return {
      content: [{
        type: 'text',
        text: `📊 Project Status: ${projectId}\n\n🔄 Overall: ${status.overallStatus}\n📅 Created: ${status.createdAt}\n\n👥 Agent Status:\n${agentStatus}`
      }]
    };
    
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: `❌ Failed to get project status: ${error.message}`
      }],
      isError: true
    };
  }
}

async function trainAgentFromSavedData(agentName) {
  try {
    // Read saved training data
    const fs = await import('fs');
    const path = await import('path');
    
    const trainingFile = path.join(process.cwd(), 'training', 'domains', `${agentName}-training.json`);
    
    if (!fs.existsSync(trainingFile)) {
      return `No training data found for ${agentName}. Please run train-domain first.`;
    }
    
    const trainingData = JSON.parse(fs.readFileSync(trainingFile, 'utf8'));
    
    // Send training to Q Developer agent
    const trainingContent = trainingData.trainingContent || `You are ${agentName}, a specialist agent in the Dhrit platform.`;
    
    const result = await qExecutor.trainAgent(agentName, trainingContent);
    
    return `${agentName} has been trained with saved domain knowledge:\n\n${result}`;
  } catch (error) {
    return `Training failed for ${agentName}: ${error.message}`;
  }
}

async function handleDomainTraining(args) {
  const { agentName, trainingContent, domainKnowledge = {} } = args;
  
  try {
    // Use trainingContent if provided, otherwise use domainKnowledge
    const knowledge = trainingContent ? { trainingContent } : domainKnowledge;
    const result = await domainTrainer.trainAgent(agentName, knowledge);
    
    return {
      content: [{
        type: 'text',
        text: `✅ Domain Training Complete for ${agentName}:\n\n${result}`
      }]
    };
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: `❌ Domain Training Failed for ${agentName}: ${error.message}`
      }],
      isError: true
    };
  }
}

async function handleProtocolTraining(args) {
  const { agentName, protocols } = args;
  
  try {
    // Read saved protocol data
    const fs = await import('fs');
    const path = await import('path');
    
    const protocolFile = path.join(process.cwd(), 'dhrit', 'training', 'protocols', `${agentName}-protocols.json`);
    
    if (!fs.existsSync(protocolFile)) {
      return {
        content: [{
          type: 'text',
          text: `❌ No protocol data found for ${agentName}. Please run the protocol training script first.`
        }],
        isError: true
      };
    }
    
    const protocolData = JSON.parse(fs.readFileSync(protocolFile, 'utf8'));
    
    // Send protocol training to Q Developer agent
    const protocolContent = protocolData.protocolContent || `You are ${agentName}, coordination protocols activated.`;
    
    const result = await qExecutor.trainAgent(agentName, protocolContent);
    
    return {
      content: [{
        type: 'text',
        text: `✅ Protocol Training Complete for ${agentName.toUpperCase()}:\n\n${result}\n\n🔄 Coordination protocols activated:\n- Handoff procedures\n- Dependency management\n- Quality gates\n- Communication standards`
      }]
    };
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: `❌ Protocol Training Failed for ${agentName}: ${error.message}`
      }],
      isError: true
    };
  }
}

async function handleTrainAllAgents(args) {
  const { domainKnowledge = {} } = args;
  const agents = ['roop', 'mool', 'kosh', 'dhar', 'kalp', 'bandh', 'gati', 'pal'];
  
  try {
    let response = 'Training All Dhrit Agents:\n\n';
    
    // Domain training for all agents
    for (const agent of agents) {
      try {
        const domainResult = await domainTrainer.trainAgent(agent, domainKnowledge);
        response += `✅ ${agent} - Domain Training Complete\n`;
      } catch (error) {
        response += `❌ ${agent} - Domain Training Failed: ${error.message}\n`;
      }
    }
    
    response += '\n--- Protocol Training ---\n\n';
    
    // Protocol training for all agents
    for (const agent of agents) {
      try {
        const protocolResult = await protocolTrainer.trainAgentProtocol(agent);
        response += `✅ ${agent} - Protocol Training Complete\n`;
      } catch (error) {
        response += `❌ ${agent} - Protocol Training Failed: ${error.message}\n`;
      }
    }
    
    response += '\n🎯 All Dhrit agents are now trained and ready for coordinated development!';
    
    return {
      content: [{
        type: 'text',
        text: response
      }]
    };
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: `Training All Agents Failed: ${error.message}`
      }],
      isError: true
    };
  }
}

async function handleFullProjectBuild(args) {
  const { projectId, requirements } = args;
  
  try {
    const result = await coordinator.executeFullProject(projectId, requirements);
    
    return {
      content: [{
        type: 'text',
        text: `Full Project Build Complete: ${projectId}\n\n${JSON.stringify(result, null, 2)}`
      }]
    };
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: `Full Project Build Failed: ${error.message}`
      }],
      isError: true
    };
  }
}

async function main() {
  // Initialize Redis and Database connections
  await redisManager.connect();
  await dbManager.connect();
  
  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  console.error('Dhrit Platform MCP server running on stdio');
}

main().catch(console.error);
