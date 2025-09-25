import { useAuth } from "@/hooks/use-auth";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";

export default function Sidebar() {
  const { user, logout } = useAuth();
  const [location] = useLocation();

  if (!user) return null;

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  const isActive = (path: string) => {
    if (path === "/" && location === "/") return true;
    if (path !== "/" && location.startsWith(path)) return true;
    return false;
  };

  const NavLink = ({ href, children, icon, testId }: {
    href: string;
    children: React.ReactNode;
    icon: string;
    testId?: string;
  }) => (
    <Link href={href}>
      <a 
        className={cn(
          "flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors",
          isActive(href) 
            ? "bg-accent text-accent-foreground" 
            : "hover:bg-accent hover:text-accent-foreground"
        )}
        data-testid={testId}
      >
        <i className={`${icon} w-5 text-center`}></i>
        <span>{children}</span>
      </a>
    </Link>
  );

  return (
    <div className="w-64 bg-card border-r border-border flex flex-col" data-testid="sidebar">
      {/* Logo */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-primary text-primary-foreground rounded-lg flex items-center justify-center">
            <i className="fas fa-phone-volume text-sm"></i>
          </div>
          <h1 className="font-bold text-lg">VioConcierge</h1>
        </div>
      </div>

      {/* User Info */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-accent rounded-full flex items-center justify-center">
            <span className="text-sm font-semibold text-accent-foreground">
              {getInitials(user.fullName)}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user.fullName}</p>
            <p className="text-xs text-muted-foreground truncate">
              {user.role === 'super_admin' ? 'Super Administrator' 
               : user.role === 'client_admin' ? 'Client Administrator'
               : 'Client User'}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {/* Super Admin Navigation */}
        {user.role === 'super_admin' && (
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 py-1">
              Platform Management
            </h3>
            <NavLink href="/" icon="fas fa-tachometer-alt" testId="nav-platform-overview">
              Platform Overview
            </NavLink>
            <NavLink href="/tenants" icon="fas fa-building" testId="nav-tenant-management">
              Tenant Management
            </NavLink>
            <NavLink href="/health" icon="fas fa-heartbeat" testId="nav-health-monitoring">
              Health Monitoring
            </NavLink>
            <NavLink href="/compliance" icon="fas fa-shield-alt" testId="nav-compliance">
              Compliance & Security
            </NavLink>
            <NavLink href="/system" icon="fas fa-cog" testId="nav-system-settings">
              System Settings
            </NavLink>
          </div>
        )}

        {/* Client Navigation */}
        {(user.role === 'client_admin' || user.role === 'client_user') && (
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 py-1">
              Business Management
            </h3>
            <NavLink href="/" icon="fas fa-chart-line" testId="nav-dashboard">
              Dashboard
            </NavLink>
            <NavLink href="/contacts" icon="fas fa-address-book" testId="nav-contacts">
              Contacts
            </NavLink>
            <NavLink href="/calls" icon="fas fa-phone" testId="nav-call-management">
              Call Management
            </NavLink>
            <NavLink href="/appointments" icon="fas fa-calendar-alt" testId="nav-appointments">
              Appointments
            </NavLink>
            <NavLink href="/analytics" icon="fas fa-chart-bar" testId="nav-analytics">
              Analytics
            </NavLink>
          </div>
        )}

      </nav>

      {/* Bottom Actions */}
      <div className="p-4 border-t border-border space-y-2">
        <NavLink href="/profile" icon="fas fa-user-cog" testId="nav-profile">
          Profile Settings
        </NavLink>
        <button 
          onClick={logout}
          className="w-full flex items-center justify-center space-x-2 px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          data-testid="button-logout"
        >
          <i className="fas fa-sign-out-alt"></i>
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
}
