// API utilities for notifications
export const api = {
  notifications: {
    create: async (data: any) => {
      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      return response.json();
    },
    
    getAll: async () => {
      const response = await fetch('/api/notifications');
      return response.json();
    },
    
    update: async (id: string, data: any) => {
      const response = await fetch(`/api/notifications/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      return response.json();
    },
    
    delete: async (id: string) => {
      const response = await fetch(`/api/notifications/${id}`, {
        method: 'DELETE'
      });
      return response.json();
    }
  }
};

export default api;
