import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Shield, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import logo from '@/assets/logo.png';

export function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const isAdmin = location.pathname.startsWith('/admin');
  const isEService = location.pathname.startsWith('/eservice');

  const handleLogoClick = () => {
    if (isAdmin) {
      navigate('/eservice');
    } else {
      navigate('/admin');
    }
  };

  const currentPortal = isAdmin ? 'Admin Portal' : 'e-Service Portal';
  const CurrentIcon = isAdmin ? Shield : User;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={handleLogoClick}
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-lg transition-all duration-200 hover:scale-105 cursor-pointer",
              isAdmin ? "bg-primary" : "bg-accent"
            )}
            title={`Switch to ${isAdmin ? 'e-Service' : 'Admin'} Portal`}
          >
            <img src={logo} alt="EduCredit Logo" className="h-8 w-8 rounded-lg" />
          </button>
          <Link to="/" className="flex flex-col transition-smooth hover:opacity-80">
            <span className="text-lg font-semibold text-foreground">EduCredit</span>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <CurrentIcon className="h-3 w-3" />
              <span>{currentPortal}</span>
            </div>
          </Link>
        </div>
      </div>
    </header>
  );
}
