'use client';

import React, { useState } from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { SessionUser } from '@/lib/auth';
import { NotificationProvider } from '@/context/NotificationContext';

interface AppLayoutProps {
  user: SessionUser;
  children: React.ReactNode;
}

export default function AppLayout({ user, children }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="app-container">
      <Sidebar
        user={user}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="app-main">
        <Topbar
          user={user}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        />
        <main className="page-container">{children}</main>
      </div>
    </div>
  );
}
