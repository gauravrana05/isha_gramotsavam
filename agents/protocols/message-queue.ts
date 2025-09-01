import { Message, MessageSchema } from './types';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

export class MessageQueue {
  private queuePath: string;

  constructor(projectId: string) {
    this.queuePath = join(process.cwd(), 'agents', 'state', projectId, 'messages');
    this.ensureDirectory();
  }

  private ensureDirectory() {
    if (!existsSync(this.queuePath)) {
      mkdirSync(this.queuePath, { recursive: true });
    }
  }

  async sendMessage(message: Omit<Message, 'id' | 'timestamp'>): Promise<string> {
    const fullMessage: Message = {
      ...message,
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
    };

    const validated = MessageSchema.parse(fullMessage);
    const filePath = join(this.queuePath, `${validated.id}.json`);
    writeFileSync(filePath, JSON.stringify(validated, null, 2));
    
    return validated.id;
  }

  async getMessages(agentName: string, status?: string): Promise<Message[]> {
    const files = require('fs').readdirSync(this.queuePath);
    const messages: Message[] = [];

    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      
      const content = readFileSync(join(this.queuePath, file), 'utf-8');
      const message = JSON.parse(content);
      message.timestamp = new Date(message.timestamp);
      
      if (message.to === agentName && (!status || message.status === status)) {
        messages.push(message);
      }
    }

    return messages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  async updateMessageStatus(messageId: string, status: Message['status']): Promise<void> {
    const filePath = join(this.queuePath, `${messageId}.json`);
    if (!existsSync(filePath)) return;

    const content = readFileSync(filePath, 'utf-8');
    const message = JSON.parse(content);
    message.status = status;
    
    writeFileSync(filePath, JSON.stringify(message, null, 2));
  }
}
