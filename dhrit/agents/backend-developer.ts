import { BaseAgent } from './base-agent';

export class BackendDeveloperAgent extends BaseAgent {
  constructor(projectId: string) {
    super(projectId, 'backend-developer');
  }

  getCapabilities(): string[] {
    return [
      'trpc-routers',
      'api-endpoints',
      'business-logic',
      'validation',
      'authentication',
      'database-integration'
    ];
  }

  async processTask(task: string, requirements: string, context?: any): Promise<any> {
    const taskType = this.identifyTaskType(task);
    
    switch (taskType) {
      case 'router':
        return await this.createRouter(requirements);
      case 'procedure':
        return await this.createProcedure(requirements);
      case 'auth':
        return await this.createAuthLogic(requirements);
      default:
        return await this.handleGenericTask(task, requirements);
    }
  }

  private identifyTaskType(task: string): string {
    const taskLower = task.toLowerCase();
    if (taskLower.includes('router') || taskLower.includes('api')) return 'router';
    if (taskLower.includes('procedure') || taskLower.includes('endpoint')) return 'procedure';
    if (taskLower.includes('auth') || taskLower.includes('login')) return 'auth';
    return 'generic';
  }

  private async createRouter(requirements: string): Promise<any> {
    const routerName = this.extractRouterName(requirements);
    const procedures = this.extractProcedures(requirements);
    const code = this.generateRouterCode(routerName, procedures, requirements);
    
    return {
      type: 'router',
      name: routerName,
      code,
      procedures,
      filePath: `src/server/api/routers/${routerName.toLowerCase()}.ts`,
      dependencies: ['@trpc/server', 'zod']
    };
  }

  private async createProcedure(requirements: string): Promise<any> {
    const procedureName = this.extractProcedureName(requirements);
    const inputSchema = this.generateInputSchema(requirements);
    const code = this.generateProcedureCode(procedureName, inputSchema, requirements);
    
    return {
      type: 'procedure',
      name: procedureName,
      code,
      inputSchema,
      dependencies: ['@trpc/server', 'zod']
    };
  }

  private async createAuthLogic(requirements: string): Promise<any> {
    const authType = this.extractAuthType(requirements);
    const code = this.generateAuthCode(authType, requirements);
    
    return {
      type: 'auth',
      authType,
      code,
      filePath: 'src/server/auth.ts',
      dependencies: ['bcryptjs', 'jsonwebtoken']
    };
  }

  private async handleGenericTask(task: string, requirements: string): Promise<any> {
    return {
      type: 'generic',
      task,
      requirements,
      output: `Backend Developer processed: ${task}`,
      nextSteps: ['Create tRPC procedures', 'Add validation', 'Integrate with database']
    };
  }

  private extractRouterName(requirements: string): string {
    const words = requirements.split(' ');
    const routerWords = words.filter(word => 
      word.toLowerCase().includes('user') ||
      word.toLowerCase().includes('post') ||
      word.toLowerCase().includes('auth')
    );
    return routerWords[0] || 'custom';
  }

  private extractProcedureName(requirements: string): string {
    const words = requirements.toLowerCase().split(' ');
    if (words.includes('create')) return 'create';
    if (words.includes('get') || words.includes('fetch')) return 'get';
    if (words.includes('update')) return 'update';
    if (words.includes('delete')) return 'delete';
    return 'custom';
  }

  private extractAuthType(requirements: string): string {
    const req = requirements.toLowerCase();
    if (req.includes('jwt')) return 'jwt';
    if (req.includes('session')) return 'session';
    return 'basic';
  }

  private extractProcedures(requirements: string): any[] {
    const procedures = [];
    const req = requirements.toLowerCase();
    
    if (req.includes('create')) procedures.push({ name: 'create', type: 'mutation' });
    if (req.includes('get') || req.includes('list')) procedures.push({ name: 'get', type: 'query' });
    if (req.includes('update')) procedures.push({ name: 'update', type: 'mutation' });
    if (req.includes('delete')) procedures.push({ name: 'delete', type: 'mutation' });
    
    return procedures.length > 0 ? procedures : [{ name: 'get', type: 'query' }];
  }

  private generateInputSchema(requirements: string): string {
    const req = requirements.toLowerCase();
    let schema = 'z.object({';
    
    if (req.includes('id')) schema += '\n  id: z.string(),';
    if (req.includes('email')) schema += '\n  email: z.string().email(),';
    if (req.includes('name')) schema += '\n  name: z.string(),';
    if (req.includes('password')) schema += '\n  password: z.string().min(6),';
    
    schema += '\n})';
    return schema;
  }

  private generateRouterCode(name: string, procedures: any[], requirements: string): string {
    return `import { z } from 'zod';
import { createTRPCRouter, publicProcedure, protectedProcedure } from '@/server/api/trpc';

export const ${name}Router = createTRPCRouter({
${procedures.map(proc => `
  ${proc.name}: ${proc.type === 'query' ? 'publicProcedure' : 'publicProcedure'}
    .input(z.object({
      // Add input validation here
    }))
    .${proc.type}(async ({ input, ctx }) => {
      // Implementation for ${proc.name}
      return { success: true };
    }),`).join('')}
});`;
  }

  private generateProcedureCode(name: string, inputSchema: string, requirements: string): string {
    return `${name}: publicProcedure
  .input(${inputSchema})
  .${name.includes('get') ? 'query' : 'mutation'}(async ({ input, ctx }) => {
    // Implementation for ${name}
    // Requirements: ${requirements}
    
    try {
      // Add your business logic here
      return { success: true, data: input };
    } catch (error) {
      throw new Error('Failed to process request');
    }
  }),`;
  }

  private generateAuthCode(authType: string, requirements: string): string {
    return `import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export class AuthService {
  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
  }

  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  static generateToken(userId: string): string {
    return jwt.sign({ userId }, process.env.JWT_SECRET!, { expiresIn: '7d' });
  }

  static verifyToken(token: string): { userId: string } | null {
    try {
      return jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
    } catch {
      return null;
    }
  }
}`;
  }
}
