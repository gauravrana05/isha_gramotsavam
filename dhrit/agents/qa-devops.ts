import { BaseAgent } from './base-agent';

export class QADevOpsAgent extends BaseAgent {
  constructor(projectId: string) {
    super(projectId, 'qa-devops');
  }

  getCapabilities(): string[] {
    return [
      'unit-testing',
      'integration-testing',
      'e2e-testing',
      'linting',
      'deployment',
      'ci-cd',
      'monitoring'
    ];
  }

  async processTask(task: string, requirements: string, context?: any): Promise<any> {
    const taskType = this.identifyTaskType(task);
    
    switch (taskType) {
      case 'test':
        return await this.createTests(requirements);
      case 'deploy':
        return await this.setupDeployment(requirements);
      case 'ci-cd':
        return await this.setupCICD(requirements);
      case 'lint':
        return await this.setupLinting(requirements);
      default:
        return await this.handleGenericTask(task, requirements);
    }
  }

  private identifyTaskType(task: string): string {
    const taskLower = task.toLowerCase();
    if (taskLower.includes('test')) return 'test';
    if (taskLower.includes('deploy')) return 'deploy';
    if (taskLower.includes('ci') || taskLower.includes('pipeline')) return 'ci-cd';
    if (taskLower.includes('lint')) return 'lint';
    return 'generic';
  }

  private async createTests(requirements: string): Promise<any> {
    const testType = this.extractTestType(requirements);
    const testFiles = this.generateTestFiles(testType, requirements);
    
    return {
      type: 'test',
      testType,
      files: testFiles,
      dependencies: ['jest', '@testing-library/react', '@testing-library/jest-dom']
    };
  }

  private async setupDeployment(requirements: string): Promise<any> {
    const platform = this.extractDeploymentPlatform(requirements);
    const config = this.generateDeploymentConfig(platform, requirements);
    
    return {
      type: 'deployment',
      platform,
      config,
      files: this.getDeploymentFiles(platform)
    };
  }

  private async setupCICD(requirements: string): Promise<any> {
    const platform = this.extractCICDPlatform(requirements);
    const pipeline = this.generatePipelineConfig(platform, requirements);
    
    return {
      type: 'ci-cd',
      platform,
      pipeline,
      files: this.getCICDFiles(platform)
    };
  }

  private async setupLinting(requirements: string): Promise<any> {
    const linters = this.extractLinters(requirements);
    const configs = this.generateLintingConfigs(linters);
    
    return {
      type: 'linting',
      linters,
      configs,
      dependencies: ['eslint', 'prettier', '@typescript-eslint/parser']
    };
  }

  private async handleGenericTask(task: string, requirements: string): Promise<any> {
    return {
      type: 'generic',
      task,
      requirements,
      output: `QA & DevOps processed: ${task}`,
      nextSteps: ['Write tests', 'Setup CI/CD', 'Configure deployment']
    };
  }

  private extractTestType(requirements: string): string {
    const req = requirements.toLowerCase();
    if (req.includes('unit')) return 'unit';
    if (req.includes('integration')) return 'integration';
    if (req.includes('e2e') || req.includes('end-to-end')) return 'e2e';
    return 'unit';
  }

  private extractDeploymentPlatform(requirements: string): string {
    const req = requirements.toLowerCase();
    if (req.includes('vercel')) return 'vercel';
    if (req.includes('aws') || req.includes('amplify')) return 'aws';
    if (req.includes('netlify')) return 'netlify';
    return 'vercel';
  }

  private extractCICDPlatform(requirements: string): string {
    const req = requirements.toLowerCase();
    if (req.includes('github')) return 'github-actions';
    if (req.includes('gitlab')) return 'gitlab-ci';
    if (req.includes('aws')) return 'aws-codepipeline';
    return 'github-actions';
  }

  private extractLinters(requirements: string): string[] {
    const linters = ['eslint'];
    const req = requirements.toLowerCase();
    
    if (req.includes('prettier')) linters.push('prettier');
    if (req.includes('typescript')) linters.push('typescript-eslint');
    
    return linters;
  }

  private generateTestFiles(testType: string, requirements: string): any[] {
    const files = [];
    
    if (testType === 'unit') {
      files.push({
        path: '__tests__/components/Button.test.tsx',
        content: this.generateUnitTestCode('Button', requirements)
      });
    }
    
    if (testType === 'integration') {
      files.push({
        path: '__tests__/api/auth.test.ts',
        content: this.generateIntegrationTestCode('auth', requirements)
      });
    }
    
    return files;
  }

  private generateUnitTestCode(componentName: string, requirements: string): string {
    return `import { render, screen } from '@testing-library/react';
import { ${componentName} } from '@/components/${componentName}';

describe('${componentName}', () => {
  it('renders correctly', () => {
    render(<${componentName}>Test</${componentName}>);
    expect(screen.getByText('Test')).toBeInTheDocument();
  });

  it('handles click events', () => {
    const handleClick = jest.fn();
    render(<${componentName} onClick={handleClick}>Click me</${componentName}>);
    
    screen.getByText('Click me').click();
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});`;
  }

  private generateIntegrationTestCode(feature: string, requirements: string): string {
    return `import { createTRPCMsw } from 'msw-trpc';
import { appRouter } from '@/server/api/root';

const trpcMsw = createTRPCMsw(appRouter);

describe('${feature} API', () => {
  it('handles authentication flow', async () => {
    // Test implementation for ${feature}
    // Requirements: ${requirements}
    expect(true).toBe(true);
  });
});`;
  }

  private generateDeploymentConfig(platform: string, requirements: string): any {
    if (platform === 'vercel') {
      return {
        'vercel.json': {
          version: 2,
          builds: [{ src: 'package.json', use: '@vercel/next' }],
          env: {
            DATABASE_URL: '@database-url'
          }
        }
      };
    }
    
    return {};
  }

  private generatePipelineConfig(platform: string, requirements: string): any {
    if (platform === 'github-actions') {
      return {
        '.github/workflows/ci.yml': `name: CI/CD

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test
      - run: npm run build`
      };
    }
    
    return {};
  }

  private generateLintingConfigs(linters: string[]): any {
    const configs = {};
    
    if (linters.includes('eslint')) {
      configs['.eslintrc.json'] = {
        extends: ['next/core-web-vitals', '@typescript-eslint/recommended'],
        rules: {
          '@typescript-eslint/no-unused-vars': 'error'
        }
      };
    }
    
    if (linters.includes('prettier')) {
      configs['.prettierrc'] = {
        semi: true,
        trailingComma: 'es5',
        singleQuote: true,
        printWidth: 80
      };
    }
    
    return configs;
  }

  private getDeploymentFiles(platform: string): string[] {
    const files = {
      vercel: ['vercel.json'],
      aws: ['amplify.yml'],
      netlify: ['netlify.toml']
    };
    
    return files[platform] || [];
  }

  private getCICDFiles(platform: string): string[] {
    const files = {
      'github-actions': ['.github/workflows/ci.yml'],
      'gitlab-ci': ['.gitlab-ci.yml'],
      'aws-codepipeline': ['buildspec.yml']
    };
    
    return files[platform] || [];
  }
}
