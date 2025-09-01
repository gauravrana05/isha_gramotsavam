import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

export class DatabaseManager {
  constructor() {
    this.pgPool = null;
    this.isConnected = false;
  }

  async connect() {
    try {
      await this.connectPostgreSQL();
      await this.initializeTables();
      this.isConnected = true;
      return true;
    } catch (error) {
      console.error('Failed to connect to database:', error);
      return false;
    }
  }

  async connectPostgreSQL() {
    this.pgPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false
      },
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    // Test connection
    const client = await this.pgPool.connect();
    client.release();
  }

  async disconnect() {
    if (this.pgPool) {
      await this.pgPool.end();
    }
    this.isConnected = false;
  }

  async initializeTables() {
    const tables = [
      // Projects table
      `CREATE TABLE IF NOT EXISTS projects (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        requirements TEXT,
        current_stage VARCHAR(100),
        status VARCHAR(50) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        metadata JSONB
      )`,
      
      // Agent tasks table
      `CREATE TABLE IF NOT EXISTS agent_tasks (
        id SERIAL PRIMARY KEY,
        project_id VARCHAR(255) REFERENCES projects(id),
        agent_name VARCHAR(100) NOT NULL,
        task_type VARCHAR(100) NOT NULL,
        requirements TEXT,
        status VARCHAR(50) DEFAULT 'pending',
        result TEXT,
        started_at TIMESTAMP,
        completed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        metadata JSONB
      )`,
      
      // Agent libraries table
      `CREATE TABLE IF NOT EXISTS agent_libraries (
        id SERIAL PRIMARY KEY,
        agent_name VARCHAR(100) NOT NULL,
        library_type VARCHAR(100) NOT NULL,
        component_name VARCHAR(255) NOT NULL,
        component_data JSONB NOT NULL,
        version INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(agent_name, library_type, component_name)
      )`,
      
      // Project files table
      `CREATE TABLE IF NOT EXISTS project_files (
        id SERIAL PRIMARY KEY,
        project_id VARCHAR(255) REFERENCES projects(id),
        file_path VARCHAR(500) NOT NULL,
        file_content TEXT,
        file_type VARCHAR(100),
        agent_name VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      
      // Agent performance table
      `CREATE TABLE IF NOT EXISTS agent_performance (
        id SERIAL PRIMARY KEY,
        agent_name VARCHAR(100) NOT NULL,
        task_type VARCHAR(100),
        duration_ms INTEGER,
        success BOOLEAN,
        error_message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        metadata JSONB
      )`,
      
      // Training records table
      `CREATE TABLE IF NOT EXISTS agent_training (
        id SERIAL PRIMARY KEY,
        agent_name VARCHAR(100) NOT NULL,
        training_type VARCHAR(100) NOT NULL,
        training_data JSONB,
        status VARCHAR(50) DEFAULT 'completed',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
    ];

    for (const table of tables) {
      await this.query(table);
    }

    // Create indexes
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status)',
      'CREATE INDEX IF NOT EXISTS idx_agent_tasks_project_agent ON agent_tasks(project_id, agent_name)',
      'CREATE INDEX IF NOT EXISTS idx_agent_tasks_status ON agent_tasks(status)',
      'CREATE INDEX IF NOT EXISTS idx_agent_libraries_agent_type ON agent_libraries(agent_name, library_type)',
      'CREATE INDEX IF NOT EXISTS idx_project_files_project ON project_files(project_id)',
      'CREATE INDEX IF NOT EXISTS idx_agent_performance_agent ON agent_performance(agent_name)'
    ];

    for (const index of indexes) {
      await this.query(index);
    }
  }

  async query(text, params = []) {
    const client = await this.pgPool.connect();
    try {
      const result = await client.query(text, params);
      return result;
    } finally {
      client.release();
    }
  }

  // Project methods
  async createProject(projectId, name, requirements) {
    const result = await this.query(
      'INSERT INTO projects (id, name, requirements, current_stage, status, metadata) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [projectId, name, requirements, 'initialization', 'active', JSON.stringify({})]
    );
    return result.rows[0];
  }

  async getProject(projectId) {
    const result = await this.query('SELECT * FROM projects WHERE id = $1', [projectId]);
    return result.rows[0];
  }

  async updateProjectStage(projectId, stage) {
    const result = await this.query(
      'UPDATE projects SET current_stage = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [stage, projectId]
    );
    return result.rows[0];
  }

  // Agent task methods
  async createAgentTask(projectId, agentName, taskType, requirements) {
    const result = await this.query(
      'INSERT INTO agent_tasks (project_id, agent_name, task_type, requirements, status) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [projectId, agentName, taskType, requirements, 'pending']
    );
    return result.rows[0];
  }

  async updateAgentTaskStatus(taskId, status, result = null) {
    const updateData = [status];
    let query = 'UPDATE agent_tasks SET status = $1';
    
    if (result) {
      query += ', result = $2';
      updateData.push(result);
    }
    
    if (status === 'completed') {
      query += ', completed_at = CURRENT_TIMESTAMP';
    }
    
    if (status === 'in_progress') {
      query += ', started_at = CURRENT_TIMESTAMP';
    }
    
    query += ' WHERE id = $' + (updateData.length + 1) + ' RETURNING *';
    updateData.push(taskId);
    
    const queryResult = await this.query(query, updateData);
    return queryResult.rows[0];
  }

  // Agent library methods
  async saveToAgentLibrary(agentName, libraryType, componentName, componentData) {
    const result = await this.query(
      `INSERT INTO agent_libraries (agent_name, library_type, component_name, component_data) 
       VALUES ($1, $2, $3, $4) 
       ON CONFLICT (agent_name, library_type, component_name) 
       DO UPDATE SET component_data = $4, updated_at = CURRENT_TIMESTAMP 
       RETURNING *`,
      [agentName, libraryType, componentName, JSON.stringify(componentData)]
    );
    return result.rows[0];
  }

  async getFromAgentLibrary(agentName, libraryType, componentName) {
    const result = await this.query(
      'SELECT * FROM agent_libraries WHERE agent_name = $1 AND library_type = $2 AND component_name = $3',
      [agentName, libraryType, componentName]
    );
    return result.rows[0];
  }

  // Performance tracking
  async recordAgentPerformance(agentName, taskType, duration, success, errorMessage = null) {
    const result = await this.query(
      'INSERT INTO agent_performance (agent_name, task_type, duration_ms, success, error_message) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [agentName, taskType, duration, success, errorMessage]
    );
    return result.rows[0];
  }
}
