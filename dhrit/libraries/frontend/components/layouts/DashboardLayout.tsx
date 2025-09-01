import React, { ReactNode } from 'react';
import { Sidebar } from '../navigation/Sidebar';
import { Header } from '../navigation/Header';

interface DashboardLayoutProps {
  children: ReactNode;
  title?: string;
}

export function DashboardLayout({ children, title }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-neutral-50">
      <Sidebar />
      <div className="pl-64">
        <Header title={title} />
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
