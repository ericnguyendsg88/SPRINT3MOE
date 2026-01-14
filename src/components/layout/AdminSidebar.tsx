import { Link, useLocation } from 'react-router-dom';
import { 
  Users, 
  CreditCard, 
  BookOpen, 
  Settings, 
  BarChart3,
  ChevronRight,
  Wallet
} from 'lucide-react';
import { cn } from '@/lib/utils';

const menuItems: {
  label: string;
  icon: typeof BarChart3;
  path: string;
  exact?: boolean;
  disabled?: boolean;
  devLabel?: string;
}[] = [
  { 
    label: 'Dashboard', 
    icon: BarChart3, 
    path: '/admin',
    exact: true 
  },
  { 
    label: 'Account Management', 
    icon: Users, 
    path: '/admin/accounts' 
  },
  { 
    label: 'Top-up Management', 
    icon: Wallet, 
    path: '/admin/topup'
  },
  { 
    label: 'Course Management', 
    icon: BookOpen, 
    path: '/admin/courses' 
  },
  { 
    label: 'Settings', 
    icon: Settings, 
    path: '/admin/settings' 
  },
];

export function AdminSidebar() {
  const location = useLocation();

  const isActive = (path: string, exact?: boolean) => {
    if (exact) {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  return (
    <aside className="hidden lg:flex w-64 flex-col border-r border-border bg-card">
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-primary/5">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <span className="text-sm font-semibold">A</span>
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">Admin User</p>
            <p className="text-xs text-muted-foreground">Administrator</p>
          </div>
        </div>
      </div>
      
      <nav className="flex-1 p-4 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const active = !item.disabled && isActive(item.path, item.exact);
          
          if (item.disabled) {
            return (
              <div
                key={item.path}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground/50 cursor-not-allowed"
              >
                <Icon className="h-4 w-4" />
                <span className="flex-1">{item.label}</span>
                {item.devLabel && (
                  <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                    {item.devLabel}
                  </span>
                )}
              </div>
            );
          }
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-smooth",
                active
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              <span className="flex-1">{item.label}</span>
              {active && <ChevronRight className="h-4 w-4" />}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-border">
        <div className="px-3 py-2 rounded-lg bg-muted/50">
          <p className="text-xs text-muted-foreground">System Status</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
            <span className="text-sm font-medium text-foreground">All systems operational</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
