'use client';

import { Button } from '@/components/ui/button';

interface NavigationProps {
  currentView: 'report' | 'history' | 'projects' | 'setup';
  onViewChange: (view: 'report' | 'history' | 'projects' | 'setup') => void;
}

export function Navigation({ currentView, onViewChange }: NavigationProps) {
  const navItems = [
    { id: 'report', label: 'New Report', icon: '📋' },
    { id: 'history', label: 'History', icon: '📊' },
    { id: 'projects', label: 'Projects', icon: '🏗️' },
    { id: 'setup', label: 'Setup', icon: '⚙️' },
  ] as const;

  return (
    <nav className="border-b border-border bg-background sticky top-0 z-50">
      <div className="container px-4 md:px-6">
        <div className="flex gap-2 overflow-x-auto">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                currentView === item.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <span className="mr-2">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
}
