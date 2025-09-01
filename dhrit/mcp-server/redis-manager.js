import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

export class RedisManager {
  constructor() {
    this.redis = null;
    this.isConnected = false;
  }

  async connect() {
    try {
      this.redis = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD || undefined,
        db: process.env.REDIS_DB || 0,
        retryDelayOnFailover: 100,
        enableReadyCheck: false,
        maxRetriesPerRequest: null,
      });

      this.redis.on('connect', () => {
        console.log('Redis connected');
        this.isConnected = true;
      });

      this.redis.on('error', (err) => {
        console.error('Redis connection error:', err);
        this.isConnected = false;
      });

      // Test connection
      await this.redis.ping();
      return true;
    } catch (error) {
      console.error('Failed to connect to Redis:', error);
      return false;
    }
  }

  async disconnect() {
    if (this.redis) {
      await this.redis.disconnect();
      this.isConnected = false;
    }
  }

  // Agent coordination methods
  async sendAgentMessage(projectId, agentName, message) {
    const key = `dhrit:project:${projectId}:messages`;
    const messageData = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      from: 'coordinator',
      to: agentName,
      type: 'task',
      payload: message,
      status: 'pending',
      timestamp: new Date().toISOString()
    };

    await this.redis.xadd(key, '*', 'data', JSON.stringify(messageData));
    return messageData.id;
  }

  async getAgentMessages(projectId, agentName, count = 10) {
    const key = `dhrit:project:${projectId}:messages`;
    const messages = await this.redis.xrevrange(key, '+', '-', 'COUNT', count);
    
    return messages
      .map(([id, fields]) => ({
        id,
        data: JSON.parse(fields[1])
      }))
      .filter(msg => msg.data.to === agentName || msg.data.from === agentName);
  }

  async updateMessageStatus(projectId, messageId, status, result = null) {
    const key = `dhrit:project:${projectId}:message_status`;
    const statusData = {
      messageId,
      status,
      result,
      timestamp: new Date().toISOString()
    };

    await this.redis.hset(key, messageId, JSON.stringify(statusData));
  }

  // Project state methods
  async setProjectState(projectId, state) {
    const key = `dhrit:project:${projectId}:state`;
    await this.redis.set(key, JSON.stringify(state));
  }

  async getProjectState(projectId) {
    const key = `dhrit:project:${projectId}:state`;
    const state = await this.redis.get(key);
    return state ? JSON.parse(state) : null;
  }

  async updateProjectStage(projectId, stage) {
    const key = `dhrit:project:${projectId}:state`;
    const currentState = await this.getProjectState(projectId) || {};
    currentState.currentStage = stage;
    currentState.lastUpdated = new Date().toISOString();
    
    await this.setProjectState(projectId, currentState);
  }

  // Agent coordination locks
  async acquireAgentLock(projectId, agentName, timeout = 300000) {
    const key = `dhrit:lock:${projectId}:${agentName}`;
    const lockValue = `${Date.now()}_${Math.random()}`;
    
    const result = await this.redis.set(key, lockValue, 'PX', timeout, 'NX');
    return result === 'OK' ? lockValue : null;
  }

  async releaseAgentLock(projectId, agentName, lockValue) {
    const key = `dhrit:lock:${projectId}:${agentName}`;
    
    const script = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `;
    
    return await this.redis.eval(script, 1, key, lockValue);
  }

  // Agent status tracking
  async setAgentStatus(agentName, status, projectId = null) {
    const key = `dhrit:agent:${agentName}:status`;
    const statusData = {
      status,
      projectId,
      timestamp: new Date().toISOString()
    };
    
    await this.redis.set(key, JSON.stringify(statusData));
  }

  async getAgentStatus(agentName) {
    const key = `dhrit:agent:${agentName}:status`;
    const status = await this.redis.get(key);
    return status ? JSON.parse(status) : null;
  }

  // Caching for agent libraries
  async cacheAgentLibrary(agentName, libraryType, componentName, componentData) {
    const key = `dhrit:library:${agentName}:${libraryType}:${componentName}`;
    await this.redis.set(key, JSON.stringify(componentData), 'EX', 86400); // 24 hour cache
  }

  async getFromAgentLibrary(agentName, libraryType, componentName) {
    const key = `dhrit:library:${agentName}:${libraryType}:${componentName}`;
    const data = await this.redis.get(key);
    return data ? JSON.parse(data) : null;
  }

  async listAgentLibraryComponents(agentName, libraryType) {
    const pattern = `dhrit:library:${agentName}:${libraryType}:*`;
    const keys = await this.redis.keys(pattern);
    return keys.map(key => key.split(':').pop());
  }

  // Performance monitoring
  async recordAgentPerformance(agentName, taskType, duration, success) {
    const key = `dhrit:performance:${agentName}`;
    const performanceData = {
      taskType,
      duration,
      success,
      timestamp: new Date().toISOString()
    };
    
    await this.redis.lpush(key, JSON.stringify(performanceData));
    await this.redis.ltrim(key, 0, 99); // Keep last 100 records
  }

  async getAgentPerformanceStats(agentName) {
    const key = `dhrit:performance:${agentName}`;
    const records = await this.redis.lrange(key, 0, -1);
    
    return records.map(record => JSON.parse(record));
  }
}
