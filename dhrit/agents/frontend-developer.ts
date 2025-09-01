import { BaseAgent } from './base-agent';

export class FrontendDeveloperAgent extends BaseAgent {
  constructor(projectId: string) {
    super(projectId, 'frontend-developer');
  }

  getCapabilities(): string[] {
    return [
      'react-components',
      'nextjs-pages',
      'tailwind-styling',
      'form-handling',
      'state-management',
      'responsive-design'
    ];
  }

  async processTask(task: string, requirements: string, context?: any): Promise<any> {
    const taskType = this.identifyTaskType(task);
    
    switch (taskType) {
      case 'component':
        return await this.createComponent(requirements);
      case 'page':
        return await this.createPage(requirements);
      case 'form':
        return await this.createForm(requirements);
      default:
        return await this.handleGenericTask(task, requirements);
    }
  }

  private identifyTaskType(task: string): string {
    const taskLower = task.toLowerCase();
    if (taskLower.includes('component')) return 'component';
    if (taskLower.includes('page')) return 'page';
    if (taskLower.includes('form')) return 'form';
    return 'generic';
  }

  private async createComponent(requirements: string): Promise<any> {
    const componentName = this.extractComponentName(requirements);
    const props = this.extractProps(requirements);
    const code = this.generateComponentCode(componentName, props, requirements);
    
    return {
      type: 'component',
      name: componentName,
      code,
      props,
      filePath: `src/components/${componentName}.tsx`,
      dependencies: ['react', 'tailwindcss']
    };
  }

  private async createPage(requirements: string): Promise<any> {
    const pageName = this.extractPageName(requirements);
    const code = this.generatePageCode(pageName, requirements);
    
    return {
      type: 'page',
      name: pageName,
      code,
      filePath: `src/app/${pageName.toLowerCase()}/page.tsx`,
      dependencies: ['next']
    };
  }

  private async createForm(requirements: string): Promise<any> {
    const formName = this.extractFormName(requirements);
    const fields = this.extractFormFields(requirements);
    const code = this.generateFormCode(formName, fields, requirements);
    
    return {
      type: 'form',
      name: formName,
      code,
      fields,
      filePath: `src/components/forms/${formName}.tsx`,
      dependencies: ['react-hook-form', 'zod']
    };
  }

  private async handleGenericTask(task: string, requirements: string): Promise<any> {
    return {
      type: 'generic',
      task,
      requirements,
      output: `Frontend Developer processed: ${task}`,
      nextSteps: ['Create components', 'Style with Tailwind', 'Add interactivity']
    };
  }

  private extractComponentName(requirements: string): string {
    // Simple extraction - in real implementation, use NLP
    const words = requirements.split(' ');
    const componentWords = words.filter(word => 
      word.toLowerCase().includes('button') ||
      word.toLowerCase().includes('card') ||
      word.toLowerCase().includes('modal')
    );
    return componentWords[0] || 'CustomComponent';
  }

  private extractPageName(requirements: string): string {
    const words = requirements.split(' ');
    const pageWords = words.filter(word => 
      word.toLowerCase().includes('login') ||
      word.toLowerCase().includes('dashboard') ||
      word.toLowerCase().includes('profile')
    );
    return pageWords[0] || 'CustomPage';
  }

  private extractFormName(requirements: string): string {
    const words = requirements.split(' ');
    const formWords = words.filter(word => 
      word.toLowerCase().includes('login') ||
      word.toLowerCase().includes('register') ||
      word.toLowerCase().includes('contact')
    );
    return `${formWords[0] || 'Custom'}Form`;
  }

  private extractProps(requirements: string): any[] {
    return [
      { name: 'className', type: 'string', optional: true },
      { name: 'children', type: 'React.ReactNode', optional: true }
    ];
  }

  private extractFormFields(requirements: string): any[] {
    const fields = [];
    const req = requirements.toLowerCase();
    
    if (req.includes('email')) fields.push({ name: 'email', type: 'email', required: true });
    if (req.includes('password')) fields.push({ name: 'password', type: 'password', required: true });
    if (req.includes('name')) fields.push({ name: 'name', type: 'text', required: true });
    
    return fields;
  }

  private generateComponentCode(name: string, props: any[], requirements: string): string {
    return `import React from 'react';
import { cn } from '@/lib/utils';

interface ${name}Props {
  ${props.map(p => `${p.name}${p.optional ? '?' : ''}: ${p.type};`).join('\n  ')}
}

export function ${name}({ className, children, ...props }: ${name}Props) {
  return (
    <div className={cn("", className)} {...props}>
      {children}
    </div>
  );
}`;
  }

  private generatePageCode(name: string, requirements: string): string {
    return `import React from 'react';

export default function ${name}Page() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">${name}</h1>
      <p className="text-gray-600">
        ${requirements}
      </p>
    </div>
  );
}`;
  }

  private generateFormCode(name: string, fields: any[], requirements: string): string {
    return `import React from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

const ${name}Schema = z.object({
  ${fields.map(f => `${f.name}: z.string()${f.required ? '' : '.optional()'}`).join(',\n  ')}
});

type ${name}Data = z.infer<typeof ${name}Schema>;

export function ${name}() {
  const { register, handleSubmit, formState: { errors } } = useForm<${name}Data>();

  const onSubmit = (data: ${name}Data) => {
    console.log(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      ${fields.map(f => `
      <div>
        <label className="block text-sm font-medium mb-1">
          ${f.name.charAt(0).toUpperCase() + f.name.slice(1)}
        </label>
        <input
          type="${f.type}"
          {...register('${f.name}')}
          className="w-full px-3 py-2 border rounded-md"
        />
        {errors.${f.name} && (
          <p className="text-red-500 text-sm mt-1">{errors.${f.name}?.message}</p>
        )}
      </div>`).join('')}
      
      <button
        type="submit"
        className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600"
      >
        Submit
      </button>
    </form>
  );
}`;
  }
}
