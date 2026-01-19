import { Link, useLocation } from 'react-router-dom';
import { 
  Home, 
  Wallet, 
  User, 
  CreditCard, 
  ChevronRight,
  LogOut,
  ChevronDown
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAccountHolders } from '@/hooks/useAccountHolders';
import { useCurrentUser } from '@/contexts/CurrentUserContext';
import { isEducationAccount, getAccountTypeLabel, getAccountTypeBadgeClass } from '@/lib/accountTypeUtils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Base menu items - Account Balance will be conditionally added for Education Accounts only
const baseMenuItems = [
  { 
    label: 'Dashboard', 
    icon: Home, 
    path: '/eservice',
    exact: true 
  },
  { 
    label: 'Your Courses', 
    icon: CreditCard, 
    path: '/eservice/fees' 
  },
  { 
    label: 'My Profile', 
    icon: User, 
    path: '/eservice/profile' 
  },
];

// Account Balance menu item - only for Education Accounts
const accountBalanceMenuItem = { 
  label: 'Account Balance', 
  icon: Wallet, 
  path: '/eservice/balance' 
};

export function EServiceSidebar() {
  const location = useLocation();
  const { data: accountHolders = [] } = useAccountHolders();
  const { currentUserId, setCurrentUserId } = useCurrentUser();
  
  // Get current user based on context
  const currentUser = accountHolders.find(u => u.id === currentUserId) || accountHolders[0];

  // Build menu items based on account type
  // Education Accounts see Account Balance, Student Accounts don't
  const menuItems = currentUser && isEducationAccount(currentUser.account_type, currentUser.residential_status)
    ? [baseMenuItems[0], accountBalanceMenuItem, ...baseMenuItems.slice(1)]
    : baseMenuItems;

  const isActive = (path: string, exact?: boolean) => {
    if (exact) {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  return (
    <aside className="hidden lg:flex w-64 flex-col border-r border-border bg-card">
      <div className="p-4 border-b border-border">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg bg-accent/5 hover:bg-accent/10 transition-colors cursor-pointer">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-accent-foreground">
                <span className="text-sm font-semibold">
                  {currentUser ? currentUser.name.split(' ').map(n => n[0]).join('') : '—'}
                </span>
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-sm font-medium text-foreground truncate">
                  {currentUser?.name || 'Loading...'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {currentUser?.nric || '—'}
                </p>
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
              Switch User (Prototype)
            </div>
            {accountHolders.map((user) => (
              <DropdownMenuItem 
                key={user.id}
                onClick={() => setCurrentUserId(user.id)}
                className={cn(
                  "cursor-pointer",
                  user.id === currentUserId && "bg-accent"
                )}
              >
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-accent text-accent-foreground text-xs font-medium">
                    {user.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{user.name}</p>
                    <p className="text-xs text-muted-foreground">{user.nric}</p>
                  </div>
                </div>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      
      <nav className="flex-1 p-4 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-smooth",
                active
                  ? "bg-accent text-accent-foreground shadow-sm"
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
        <Link
          to="/"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-smooth"
        >
          <LogOut className="h-4 w-4" />
          <span>Sign Out</span>
        </Link>
      </div>
    </aside>
  );
}
