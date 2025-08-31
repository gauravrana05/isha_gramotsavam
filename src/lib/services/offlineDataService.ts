export interface OfflineData {
  id: string;
  type: string;
  data: any;
  timestamp: number;
  synced: boolean;
}

class OfflineDataService {
  private storageKey = 'offline_data';

  save(type: string, data: any): string {
    const id = `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const offlineData: OfflineData = {
      id,
      type,
      data,
      timestamp: Date.now(),
      synced: false
    };

    const existing = this.getAll();
    existing.push(offlineData);
    localStorage.setItem(this.storageKey, JSON.stringify(existing));
    
    return id;
  }

  getAll(): OfflineData[] {
    try {
      const data = localStorage.getItem(this.storageKey);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  getByType(type: string): OfflineData[] {
    return this.getAll().filter(item => item.type === type);
  }

  markSynced(id: string): void {
    const data = this.getAll();
    const item = data.find(d => d.id === id);
    if (item) {
      item.synced = true;
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    }
  }

  clear(): void {
    localStorage.removeItem(this.storageKey);
  }
}

export const offlineDataService = new OfflineDataService();
