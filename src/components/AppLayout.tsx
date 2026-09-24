'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { SessionUser } from '@/lib/auth';
import { NotificationProvider } from '@/context/NotificationContext';
import { downloadAllSchoolData } from '@/lib/deviceCache';

interface AppLayoutProps {
  user: SessionUser;
  children: React.ReactNode;
}

export default function AppLayout({ user, children }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Automatically pre-download and refresh 100% of school data into device cache on login/mount
  useEffect(() => {
    if (user && (user.role === 'TEACHER' || user.role === 'SCHOOL_ADMIN' || user.role === 'DEVELOPER')) {
      downloadAllSchoolData().catch((err) => console.warn('Background sync error:', err));
    }
  }, [user]);

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

