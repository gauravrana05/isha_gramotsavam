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
            projectId: { type: 'string', description: 'Unique project identifier' },
            task: { type: 'string', description: 'Specific design system task to perform' },
            requirements: { type: 'string', description: 'Detailed requirements for the task' }
          },
          required: ['projectId', 'task', 'requirements']
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
      // Training Tools
      {
        name: 'train-domain',
        description: 'Train an agent with domain-specific knowledge',
        inputSchema: {
          type: 'object',
          properties: {
            agentName: { type: 'string', enum: ['roop', 'mool', 'kosh', 'dhar', 'kalp', 'bandh', 'gati', 'pal'] },
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
  const { projectId, task, requirements } = args;
  
  try {
    const result = await qExecutor.executeAgent(agentName, task, requirements, { projectId });
    
    return {
      content: [{
        type: 'text',
        text: `${agentName.toUpperCase()} Agent Result:\n\n${result}`
      }]
    };
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

async function handleDomainTraining(args) {
  const { agentName, domainKnowledge = {} } = args;
  
  try {
    const result = await domainTrainer.trainAgent(agentName, domainKnowledge);
    
    return {
      content: [{
        type: 'text',
        text: `Domain Training Complete for ${agentName}:\n\n${result}`
      }]
    };
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: `Domain Training Failed for ${agentName}: ${error.message}`
      }],
      isError: true
    };
  }
}

async function handleProtocolTraining(args) {
  const { agentName } = args;
  
  try {
    const result = await protocolTrainer.trainAgentProtocol(agentName);
    
    return {
      content: [{
        type: 'text',
        text: `Protocol Training Complete for ${agentName}:\n\n${result}`
      }]
    };
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: `Protocol Training Failed for ${agentName}: ${error.message}`
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

async function handleProjectInit(args) {
  const { projectId, requirements } = args;
  
  try {
    const result = await coordinator.initializeProject(projectId, requirements);
    
    return {
      content: [{
        type: 'text',
        text: `Project Initialized: ${projectId}\n\n${JSON.stringify(result, null, 2)}`
      }]
    };
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: `Project Initialization Failed: ${error.message}`
      }],
      isError: true
    };
  }
}

async function handleProjectStatus(args) {
  const { projectId } = args;
  
  try {
    const status = await coordinator.getProjectStatus(projectId);
    
    return {
      content: [{
        type: 'text',
        text: `Project Status: ${projectId}\n\n${JSON.stringify(status, null, 2)}`
      }]
    };
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: `Failed to get project status: ${error.message}`
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
