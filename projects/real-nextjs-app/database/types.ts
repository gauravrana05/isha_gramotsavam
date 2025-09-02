// TypeScript types generated from Prisma schema
export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: 'ADMIN' | 'MANAGER' | 'MEMBER';
  createdAt: Date;
  updatedAt: Date;
}

export interface Team {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  status: 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';
  teamId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'DONE';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  dueDate?: Date;
  projectId: string;
  assigneeId?: string;
  creatorId: string;
  parentId?: string;
  createdAt: Date;
  updatedAt: Date;
}