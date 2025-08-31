/**
 * Conflict Resolution System for Volunteer Data Sync
 * Handles data conflicts with intelligent merge strategies and user interaction
 * Supports automatic resolution for simple conflicts and manual intervention for complex ones
 */

import { getVolunteerStorage, VolunteerDocument } from './volunteerStorage';

export interface DataConflict {
  id: string;
  type: 'version_mismatch' | 'concurrent_edit' | 'missing_dependency' | 'data_corruption' | 'schema_change';
  entity: 'team' | 'player' | 'match' | 'venue' | 'post' | 'media';
  entityId: string;
  
  // Conflict data
  localData: any;
  serverData: any;
  baseData?: any; // Common ancestor if available
  
  // Metadata
  conflictPath: string[]; // Path to conflicted field
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  
  // Resolution
  status: 'detected' | 'resolving' | 'resolved' | 'failed' | 'manual_required';
  resolution?: ConflictResolution;
  resolvedData?: any;
  
  // Timing
  detectedAt: number;
  resolvedAt?: number;
  
  // Context
  userId: string;
  venueId?: string;
  actionId?: string; // ID of sync action that caused conflict
}

export interface ConflictResolution {
  strategy: 'merge_auto' | 'merge_manual' | 'use_local' | 'use_server' | 'use_both' | 'custom';
  reasoning: string;
  confidence: number; // 0-1, how confident we are in the resolution
  userConfirmed?: boolean; // Whether user confirmed the resolution
  mergeDetails?: {
    mergedFields: string[];
    conflictedFields: string[];
    userChoices: Record<string, 'local' | 'server' | 'both'>;
  };
}

export interface MergeStrategy {
  name: string;
  description: string;
  canResolve: (conflict: DataConflict) => boolean;
  resolve: (conflict: DataConflict) => Promise<ConflictResolution>;
  confidence: number; // Base confidence level
}

export interface ConflictStats {
  totalConflicts: number;
  resolvedConflicts: number;
  pendingConflicts: number;
  failedConflicts: number;
  
  byType: Record<DataConflict['type'], number>;
  byEntity: Record<DataConflict['entity'], number>;
  bySeverity: Record<DataConflict['severity'], number>;
  
  autoResolutionRate: number; // percentage
  averageResolutionTime: number; // milliseconds
  
  topConflictSources: Array<{
    field: string;
    count: number;
    entity: string;
  }>;
}

export class ConflictResolver {
  private storage: Awaited<ReturnType<typeof getVolunteerStorage>> | null = null;
  private conflicts: Map<string, DataConflict> = new Map();
  private strategies: MergeStrategy[] = [];
  
  // Callbacks
  private onConflictDetected?: (conflict: DataConflict) => void;
  private onConflictResolved?: (conflict: DataConflict, resolution: ConflictResolution) => void;
  private onManualInterventionRequired?: (conflict: DataConflict) => Promise<ConflictResolution>;

  constructor(
    onConflictDetected?: (conflict: DataConflict) => void,
    onConflictResolved?: (conflict: DataConflict, resolution: ConflictResolution) => void,
    onManualInterventionRequired?: (conflict: DataConflict) => Promise<ConflictResolution>
  ) {
    this.onConflictDetected = onConflictDetected;
    this.onConflictResolved = onConflictResolved;
    this.onManualInterventionRequired = onManualInterventionRequired;
    
    this.initializeStrategies();
  }

  /**
   * Initialize conflict resolver
   */
  async initialize(): Promise<void> {
    if (!this.storage) {
      this.storage = await getVolunteerStorage();
    }
    
    // Load pending conflicts from storage
    await this.loadPendingConflicts();
    
    console.log('⚔️ Conflict resolver initialized');
  }

  /**
   * Detect conflict between local and server data
   */
  async detectConflict(
    entity: DataConflict['entity'],
    entityId: string,
    localData: any,
    serverData: any,
    context: {
      userId: string;
      venueId?: string;
      actionId?: string;
      baseData?: any;
    }
  ): Promise<DataConflict | null> {
    // Quick check - if data is identical, no conflict
    if (this.deepEqual(localData, serverData)) {
      return null;
    }
    
    const conflict: DataConflict = {
      id: `conflict_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: this.determineConflictType(localData, serverData, context.baseData),
      entity,
      entityId,
      localData,
      serverData,
      baseData: context.baseData,
      conflictPath: this.findConflictPath(localData, serverData),
      description: this.generateConflictDescription(entity, localData, serverData),
      severity: this.assessConflictSeverity(entity, localData, serverData),
      status: 'detected',
      detectedAt: Date.now(),
      userId: context.userId,
      venueId: context.venueId,
      actionId: context.actionId,
    };
    
    // Store conflict
    this.conflicts.set(conflict.id, conflict);
    await this.storeConflict(conflict);
    
    // Notify callback
    if (this.onConflictDetected) {
      this.onConflictDetected(conflict);
    }
    
    console.log(`⚔️ Conflict detected:`, {
      type: conflict.type,
      entity: conflict.entity,
      entityId: conflict.entityId,
      severity: conflict.severity,
    });
    
    return conflict;
  }

  /**
   * Resolve a conflict automatically or request manual intervention
   */
  async resolveConflict(conflictId: string): Promise<ConflictResolution> {
    const conflict = this.conflicts.get(conflictId);
    if (!conflict || conflict.status === 'resolved') {
      throw new Error(`Conflict ${conflictId} not found or already resolved`);
    }
    
    conflict.status = 'resolving';
    this.conflicts.set(conflictId, conflict);
    
    try {
      // Try automatic resolution strategies in order of confidence
      const applicableStrategies = this.strategies
        .filter(strategy => strategy.canResolve(conflict))
        .sort((a, b) => b.confidence - a.confidence);
      
      for (const strategy of applicableStrategies) {
        try {
          const resolution = await strategy.resolve(conflict);
          
          // Use automatic resolution if confidence is high enough
          if (resolution.confidence >= 0.8 || conflict.severity === 'low') {
            conflict.resolution = resolution;
            conflict.resolvedData = await this.applyResolution(conflict, resolution);
            conflict.status = 'resolved';
            conflict.resolvedAt = Date.now();
            
            this.conflicts.set(conflictId, conflict);
            await this.storeConflict(conflict);
            
            if (this.onConflictResolved) {
              this.onConflictResolved(conflict, resolution);
            }
            
            console.log(`✅ Conflict auto-resolved using ${strategy.name}:`, conflictId);
            return resolution;
          }
        } catch (error) {
          console.warn(`Strategy ${strategy.name} failed for conflict ${conflictId}:`, error);
        }
      }
      
      // If no automatic resolution worked, request manual intervention
      if (this.onManualInterventionRequired) {
        conflict.status = 'manual_required';
        this.conflicts.set(conflictId, conflict);
        
        const manualResolution = await this.onManualInterventionRequired(conflict);
        manualResolution.userConfirmed = true;
        
        conflict.resolution = manualResolution;
        conflict.resolvedData = await this.applyResolution(conflict, manualResolution);
        conflict.status = 'resolved';
        conflict.resolvedAt = Date.now();
        
        this.conflicts.set(conflictId, conflict);
        await this.storeConflict(conflict);
        
        if (this.onConflictResolved) {
          this.onConflictResolved(conflict, manualResolution);
        }
        
        console.log(`✅ Conflict manually resolved:`, conflictId);
        return manualResolution;
      }
      
      // No resolution possible
      conflict.status = 'failed';
      this.conflicts.set(conflictId, conflict);
      await this.storeConflict(conflict);
      
      throw new Error('No resolution strategy available and no manual intervention handler');
      
    } catch (error) {
      conflict.status = 'failed';
      this.conflicts.set(conflictId, conflict);
      await this.storeConflict(conflict);
      
      console.error(`❌ Failed to resolve conflict ${conflictId}:`, error);
      throw error;
    }
  }

  /**
   * Get conflict statistics
   */
  async getConflictStats(): Promise<ConflictStats> {
    const allConflicts = Array.from(this.conflicts.values());
    
    const resolvedConflicts = allConflicts.filter(c => c.status === 'resolved').length;
    const pendingConflicts = allConflicts.filter(c => ['detected', 'resolving', 'manual_required'].includes(c.status)).length;
    const failedConflicts = allConflicts.filter(c => c.status === 'failed').length;
    
    const byType: Record<DataConflict['type'], number> = {
      version_mismatch: 0,
      concurrent_edit: 0,
      missing_dependency: 0,
      data_corruption: 0,
      schema_change: 0,
    };
    
    const byEntity: Record<DataConflict['entity'], number> = {
      team: 0,
      player: 0,
      match: 0,
      venue: 0,
      post: 0,
      media: 0,
    };
    
    const bySeverity: Record<DataConflict['severity'], number> = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    };
    
    allConflicts.forEach(conflict => {
      byType[conflict.type]++;
      byEntity[conflict.entity]++;
      bySeverity[conflict.severity]++;
    });
    
    const autoResolved = allConflicts.filter(c => 
      c.status === 'resolved' && c.resolution && !c.resolution.userConfirmed
    ).length;
    const autoResolutionRate = resolvedConflicts > 0 ? (autoResolved / resolvedConflicts) * 100 : 0;
    
    const resolvedWithTime = allConflicts.filter(c => c.status === 'resolved' && c.resolvedAt);
    const averageResolutionTime = resolvedWithTime.length > 0
      ? resolvedWithTime.reduce((sum, c) => sum + (c.resolvedAt! - c.detectedAt), 0) / resolvedWithTime.length
      : 0;
    
    // Analyze top conflict sources
    const fieldConflicts = new Map<string, { count: number; entity: string }>();
    allConflicts.forEach(conflict => {
      conflict.conflictPath.forEach(field => {
        const key = `${conflict.entity}.${field}`;
        const existing = fieldConflicts.get(key) || { count: 0, entity: conflict.entity };
        fieldConflicts.set(key, { ...existing, count: existing.count + 1 });
      });
    });
    
    const topConflictSources = Array.from(fieldConflicts.entries())
      .sort(([, a], [, b]) => b.count - a.count)
      .slice(0, 10)
      .map(([field, data]) => ({
        field: field.split('.')[1],
        entity: data.entity,
        count: data.count,
      }));
    
    return {
      totalConflicts: allConflicts.length,
      resolvedConflicts,
      pendingConflicts,
      failedConflicts,
      byType,
      byEntity,
      bySeverity,
      autoResolutionRate,
      averageResolutionTime,
      topConflictSources,
    };
  }

  /**
   * Initialize merge strategies
   */
  private initializeStrategies(): void {
    // Strategy 1: Timestamp-based resolution
    this.strategies.push({
      name: 'timestamp_winner',
      description: 'Choose data with latest timestamp',
      confidence: 0.7,
      canResolve: (conflict) => {
        return this.hasTimestamp(conflict.localData) && this.hasTimestamp(conflict.serverData);
      },
      resolve: async (conflict) => {
        const localTime = this.getTimestamp(conflict.localData);
        const serverTime = this.getTimestamp(conflict.serverData);
        
        const useServer = serverTime > localTime;
        return {
          strategy: useServer ? 'use_server' : 'use_local',
          reasoning: `Server data is ${useServer ? 'newer' : 'older'} (${Math.abs(serverTime - localTime)}ms difference)`,
          confidence: 0.8,
        };
      },
    });

    // Strategy 2: Field-level merge for non-conflicting changes
    this.strategies.push({
      name: 'field_merge',
      description: 'Merge non-conflicting field changes',
      confidence: 0.9,
      canResolve: (conflict) => {
        return typeof conflict.localData === 'object' && typeof conflict.serverData === 'object';
      },
      resolve: async (conflict) => {
        const mergedData = this.mergeObjects(conflict.localData, conflict.serverData, conflict.baseData);
        const hasConflicts = this.hasUnresolvableConflicts(conflict.localData, conflict.serverData);
        
        return {
          strategy: 'merge_auto',
          reasoning: hasConflicts 
            ? 'Partial merge - some fields require manual resolution'
            : 'All fields merged successfully',
          confidence: hasConflicts ? 0.6 : 0.9,
          mergeDetails: {
            mergedFields: Object.keys(mergedData),
            conflictedFields: hasConflicts ? this.getConflictedFields(conflict.localData, conflict.serverData) : [],
            userChoices: {},
          },
        };
      },
    });

    // Strategy 3: Status field priority resolution
    this.strategies.push({
      name: 'status_priority',
      description: 'Resolve based on status field priority',
      confidence: 0.85,
      canResolve: (conflict) => {
        return conflict.conflictPath.includes('status') && 
               this.isValidStatus(conflict.localData.status) && 
               this.isValidStatus(conflict.serverData.status);
      },
      resolve: async (conflict) => {
        const localPriority = this.getStatusPriority(conflict.localData.status);
        const serverPriority = this.getStatusPriority(conflict.serverData.status);
        
        const useServer = serverPriority > localPriority;
        return {
          strategy: useServer ? 'use_server' : 'use_local',
          reasoning: `Status '${useServer ? conflict.serverData.status : conflict.localData.status}' has higher priority`,
          confidence: 0.85,
        };
      },
    });

    // Strategy 4: Additive merge for arrays
    this.strategies.push({
      name: 'array_merge',
      description: 'Merge arrays by combining unique items',
      confidence: 0.8,
      canResolve: (conflict) => {
        return conflict.conflictPath.some(path => Array.isArray(this.getNestedValue(conflict.localData, path)));
      },
      resolve: async (conflict) => {
        return {
          strategy: 'merge_auto',
          reasoning: 'Arrays merged with unique items from both sources',
          confidence: 0.8,
        };
      },
    });

    // Strategy 5: User preference based resolution
    this.strategies.push({
      name: 'user_preference',
      description: 'Resolve based on user who made the change',
      confidence: 0.6,
      canResolve: (conflict) => {
        return conflict.localData.modifiedBy && conflict.serverData.modifiedBy;
      },
      resolve: async (conflict) => {
        const isLocalUser = conflict.localData.modifiedBy === conflict.userId;
        return {
          strategy: isLocalUser ? 'use_local' : 'use_server',
          reasoning: `Favoring ${isLocalUser ? 'local' : 'server'} changes made by ${isLocalUser ? 'current user' : 'other user'}`,
          confidence: 0.6,
        };
      },
    });
  }

  /**
   * Apply resolution to create merged data
   */
  private async applyResolution(conflict: DataConflict, resolution: ConflictResolution): Promise<any> {
    switch (resolution.strategy) {
      case 'use_local':
        return conflict.localData;
      
      case 'use_server':
        return conflict.serverData;
      
      case 'use_both':
        // Create array or object containing both versions
        return {
          local: conflict.localData,
          server: conflict.serverData,
          mergedAt: Date.now(),
        };
      
      case 'merge_auto':
      case 'merge_manual':
        return this.mergeObjects(conflict.localData, conflict.serverData, conflict.baseData);
      
      case 'custom':
        // Custom resolution would be provided in resolvedData
        return resolution.mergeDetails || conflict.serverData;
      
      default:
        throw new Error(`Unknown resolution strategy: ${resolution.strategy}`);
    }
  }

  /**
   * Merge two objects intelligently
   */
  private mergeObjects(local: any, server: any, base?: any): any {
    if (typeof local !== 'object' || typeof server !== 'object') {
      return server; // Default to server for primitive values
    }
    
    const merged = { ...local };
    
    for (const [key, serverValue] of Object.entries(server)) {
      if (!(key in local)) {
        // New field in server
        merged[key] = serverValue;
      } else if (Array.isArray(local[key]) && Array.isArray(serverValue)) {
        // Merge arrays
        merged[key] = this.mergeArrays(local[key], serverValue);
      } else if (typeof local[key] === 'object' && typeof serverValue === 'object') {
        // Recursively merge objects
        merged[key] = this.mergeObjects(local[key], serverValue, base?.[key]);
      } else if (local[key] !== serverValue) {
        // Conflicting primitive values - use server as default
        merged[key] = serverValue;
      }
      // If values are the same, keep local value (already in merged)
    }
    
    return merged;
  }

  /**
   * Merge arrays by combining unique items
   */
  private mergeArrays(local: any[], server: any[]): any[] {
    const merged = [...local];
    
    for (const serverItem of server) {
      const isDuplicate = merged.some(localItem => 
        this.deepEqual(localItem, serverItem) || 
        (localItem.id && serverItem.id && localItem.id === serverItem.id)
      );
      
      if (!isDuplicate) {
        merged.push(serverItem);
      }
    }
    
    return merged;
  }

  /**
   * Determine conflict type
   */
  private determineConflictType(local: any, server: any, base?: any): DataConflict['type'] {
    // Check for version mismatch
    if (local.version && server.version && local.version !== server.version) {
      return 'version_mismatch';
    }
    
    // Check for schema changes
    if (this.hasSchemaChanges(local, server)) {
      return 'schema_change';
    }
    
    // Check for data corruption
    if (this.hasDataCorruption(local, server)) {
      return 'data_corruption';
    }
    
    // Check for missing dependencies
    if (this.hasMissingDependencies(local, server)) {
      return 'missing_dependency';
    }
    
    // Default to concurrent edit
    return 'concurrent_edit';
  }

  /**
   * Find the path to conflicted fields
   */
  private findConflictPath(local: any, server: any, path: string[] = []): string[] {
    const conflicts: string[] = [];
    
    if (typeof local !== 'object' || typeof server !== 'object') {
      return path;
    }
    
    const allKeys = new Set([...Object.keys(local), ...Object.keys(server)]);
    
    for (const key of allKeys) {
      const currentPath = [...path, key];
      
      if (!(key in local) || !(key in server)) {
        conflicts.push(...currentPath);
      } else if (!this.deepEqual(local[key], server[key])) {
        if (typeof local[key] === 'object' && typeof server[key] === 'object') {
          conflicts.push(...this.findConflictPath(local[key], server[key], currentPath));
        } else {
          conflicts.push(...currentPath);
        }
      }
    }
    
    return conflicts;
  }

  /**
   * Generate human-readable conflict description
   */
  private generateConflictDescription(entity: string, local: any, server: any): string {
    const entityName = entity.charAt(0).toUpperCase() + entity.slice(1);
    
    if (local.name && server.name && local.name !== server.name) {
      return `${entityName} name changed from "${local.name}" to "${server.name}"`;
    }
    
    if (local.status && server.status && local.status !== server.status) {
      return `${entityName} status changed from "${local.status}" to "${server.status}"`;
    }
    
    return `${entityName} has conflicting changes`;
  }

  /**
   * Assess conflict severity
   */
  private assessConflictSeverity(entity: string, local: any, server: any): DataConflict['severity'] {
    // Critical conflicts
    if (entity === 'match' && (local.status !== server.status || local.score !== server.score)) {
      return 'critical';
    }
    
    if (entity === 'player' && local.verificationStatus !== server.verificationStatus) {
      return 'high';
    }
    
    if (entity === 'team' && local.status !== server.status) {
      return 'high';
    }
    
    // Check number of conflicted fields
    const conflictCount = this.findConflictPath(local, server).length;
    if (conflictCount > 5) {
      return 'high';
    } else if (conflictCount > 2) {
      return 'medium';
    }
    
    return 'low';
  }

  /**
   * Helper methods
   */
  private deepEqual(a: any, b: any): boolean {
    if (a === b) return true;
    if (a == null || b == null) return false;
    if (typeof a !== typeof b) return false;
    
    if (typeof a === 'object') {
      const keysA = Object.keys(a);
      const keysB = Object.keys(b);
      
      if (keysA.length !== keysB.length) return false;
      
      return keysA.every(key => this.deepEqual(a[key], b[key]));
    }
    
    return false;
  }

  private hasTimestamp(data: any): boolean {
    return data.timestamp || data.lastModified || data.updatedAt || data.createdAt;
  }

  private getTimestamp(data: any): number {
    return data.timestamp || data.lastModified || data.updatedAt || data.createdAt || 0;
  }

  private hasSchemaChanges(local: any, server: any): boolean {
    const localKeys = Object.keys(local || {});
    const serverKeys = Object.keys(server || {});
    
    // Significant difference in field count might indicate schema change
    return Math.abs(localKeys.length - serverKeys.length) > 3;
  }

  private hasDataCorruption(local: any, server: any): boolean {
    // Check for null/undefined in critical fields
    const criticalFields = ['id', 'status'];
    return criticalFields.some(field => 
      (local[field] == null && server[field] != null) ||
      (local[field] != null && server[field] == null)
    );
  }

  private hasMissingDependencies(local: any, server: any): boolean {
    // Check for missing referenced IDs
    const referenceFields = ['teamId', 'playerId', 'venueId', 'matchId'];
    return referenceFields.some(field => 
      local[field] && !server[field] || !local[field] && server[field]
    );
  }

  private hasUnresolvableConflicts(local: any, server: any): boolean {
    // Check for conflicts that can't be automatically merged
    const criticalFields = ['id', 'status'];
    return criticalFields.some(field => 
      local[field] && server[field] && local[field] !== server[field]
    );
  }

  private getConflictedFields(local: any, server: any): string[] {
    return this.findConflictPath(local, server);
  }

  private isValidStatus(status: any): boolean {
    const validStatuses = ['pending', 'active', 'completed', 'cancelled', 'verified', 'checked_in'];
    return typeof status === 'string' && validStatuses.includes(status);
  }

  private getStatusPriority(status: string): number {
    const priorities: Record<string, number> = {
      'cancelled': 1,
      'pending': 2,
      'active': 3,
      'checked_in': 4,
      'verified': 5,
      'completed': 6,
    };
    return priorities[status] || 0;
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Store conflict in IndexedDB
   */
  private async storeConflict(conflict: DataConflict): Promise<void> {
    if (!this.storage) return;
    
    const document: VolunteerDocument = {
      id: conflict.id,
      data: conflict,
      timestamp: conflict.detectedAt,
      lastModified: Date.now(),
      userId: conflict.userId,
      venueId: conflict.venueId,
      version: 1,
      synced: false,
      priority: conflict.severity === 'critical' ? 'high' : 'medium',
      size: new Blob([JSON.stringify(conflict)]).size,
    };
    
    await this.storage.store('conflicts', document);
  }

  /**
   * Load pending conflicts from storage
   */
  private async loadPendingConflicts(): Promise<void> {
    if (!this.storage) return;
    
    try {
      const storedConflicts = await this.storage.query('conflicts', {
        filter: (doc) => !doc.deleted && doc.data.status !== 'resolved'
      });
      
      for (const storedConflict of storedConflicts) {
        const conflict = storedConflict.data as DataConflict;
        this.conflicts.set(conflict.id, conflict);
      }
      
      console.log(`⚔️ Loaded ${this.conflicts.size} pending conflicts from storage`);
    } catch (error) {
      console.error('Failed to load pending conflicts:', error);
    }
  }
}

// Singleton instance
let conflictResolverInstance: ConflictResolver | null = null;

/**
 * Get the singleton conflict resolver instance
 */
export const getConflictResolver = (
  onConflictDetected?: (conflict: DataConflict) => void,
  onConflictResolved?: (conflict: DataConflict, resolution: ConflictResolution) => void,
  onManualInterventionRequired?: (conflict: DataConflict) => Promise<ConflictResolution>
): ConflictResolver => {
  if (!conflictResolverInstance) {
    conflictResolverInstance = new ConflictResolver(
      onConflictDetected,
      onConflictResolved,
      onManualInterventionRequired
    );
  }
  return conflictResolverInstance;
};

export default ConflictResolver;