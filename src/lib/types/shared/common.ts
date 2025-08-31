// Common utility types
export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  totalCount: number;
  hasMore: boolean;
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
  };
}

export interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface SortConfig {
  field: string;
  direction: 'asc' | 'desc';
}
