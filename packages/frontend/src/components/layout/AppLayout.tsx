import React from 'react';
import { cn } from '@/lib/utils';
import { Sidebar } from './Sidebar';
import { MobileNav } from './MobileNav';
import { TopBar } from './TopBar';

interface AppLayoutProps {
  children: React.ReactNode;
  title?: string;
}

export function AppLayout({ children, title }: AppLayoutProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop Sidebar — hidden on mobile */}
      <div className="hidden lg:flex lg:flex-shrink-0">
        <Sidebar />
      </div>

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar (mobile: logo + menu; desktop: page title) */}
        <TopBar title={title} />

        {/* Scrollable main content */}
        <main
          className={cn(
            'flex-1 overflow-y-auto',
            'p-4 lg:p-6',
            'pb-24 lg:pb-6', // Extra bottom padding on mobile for bottom nav
          )}
        >
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation — hidden on desktop */}
      <div className="fixed inset-x-0 bottom-0 z-50 lg:hidden">
        <MobileNav />
      </div>
    </div>
  );
}
