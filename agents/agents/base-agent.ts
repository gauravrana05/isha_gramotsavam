import { MessageQueue } from '../protocols/message-queue';
import { StateMachine } from '../protocols/state-machine';
import { Message } from '../protocols/types';

export abstract class BaseAgent {
  protected messageQueue: MessageQueue;
  protected stateMachine: StateMachine;
  
  constructor(protected projectId: string, protected agentName: string) {
    this.messageQueue = new MessageQueue(projectId);
    this.stateMachine = new StateMachine(projectId);
  }

  abstract getCapabilities(): string[];
  abstract processTask(task: string, requirements: string, context?: any): Promise<any>;

  async handleMessage(message: Message): Promise<void> {
    try {
      await this.messageQueue.updateMessageStatus(message.id, 'in-progress');
      
      const result = await this.processTask(
        message.payload.task,
        message.payload.requirements,
        message.payload.context
      );

      await this.messageQueue.sendMessage({
        from: this.agentName,
        to: message.from,
        type: 'response',
        payload: { result, originalTaskId: message.id },
        status: 'completed'
      });

      await this.messageQueue.updateMessageStatus(message.id, 'completed');
    } catch (error) {
      await this.messageQueue.sendMessage({
        from: this.agentName,
        to: message.from,
        type: 'error',
        payload: { error: error.message, originalTaskId: message.id },
        status: 'failed'
      });

      await this.messageQueue.updateMessageStatus(message.id, 'failed');
    }
  }

  async getPendingTasks(): Promise<Message[]> {
    return await this.messageQueue.getMessages(this.agentName, 'pending');
  }
}
