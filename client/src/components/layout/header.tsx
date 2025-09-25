import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import SystemHealthStatus from "@/components/health/SystemHealthStatus";
import AlertsBanner from "@/components/health/AlertsBanner";

interface PageConfig {
  title: string;
  description: string;
  actions?: React.ReactNode;
}

const getPageConfig = (location: string, userRole: string): PageConfig => {
  switch (location) {
    case '/':
      return {
        title: userRole === 'super_admin' ? 'Platform Overview' : 'Dashboard',
        description: userRole === 'super_admin' 
          ? 'Monitor system-wide performance and manage tenants'
          : 'Monitor your business performance and manage appointments',
      };
    case '/tenants':
      return {
        title: 'Tenant Management',
        description: 'Manage all tenants across the platform',
      };
    case '/contacts':
      return {
        title: 'Contact Management',
        description: 'Manage your contacts and appointments',
      };
    case '/calls':
      return {
        title: 'Call Management',
        description: 'Monitor and manage voice appointment reminders',
      };
    case '/appointments':
      return {
        title: 'Appointments',
        description: 'View and manage scheduled appointments',
      };
    case '/analytics':
      return {
        title: 'Analytics',
        description: 'Detailed performance insights and reports',
      };
    case '/configuration':
      return {
        title: 'Configuration',
        description: 'Configure your business settings and integrations',
      };
    case '/users':
      return {
        title: 'User Management',
        description: 'Manage user accounts and permissions',
      };
    case '/integrations':
      return {
        title: 'Integrations',
        description: 'Connect with calendar and voice AI services',
      };
    case '/compliance':
      return {
        title: 'Compliance & Security',
        description: 'Monitor security and compliance across the platform',
      };
    case '/system':
      return {
        title: 'System Settings',
        description: 'Platform-wide configuration and maintenance',
      };
    case '/profile':
      return {
        title: 'Profile Settings',
        description: 'Manage your account settings and business information',
      };
    default:
      return {
        title: 'Dashboard',
        description: 'Welcome to VioConcierge',
      };
  }
};

export default function Header() {
  const { user } = useAuth();
  const [location] = useLocation();

  if (!user) return null;

  const pageConfig = getPageConfig(location, user.role);

  const getQuickActions = () => {
    if (user.role === 'super_admin' && location === '/') {
      return (
        <Link href="/tenants">
          <Button data-testid="button-quick-add-tenant">
            <i className="fas fa-plus text-sm mr-2"></i>
            New Tenant
          </Button>
        </Link>
      );
    }

    // Removed all Add Contact buttons from header - they're handled within their respective pages
    return null;
  };

  return (
    <>
      {/* Critical Alerts Banner (Super Admin Only) */}
      {user.role === 'super_admin' && <AlertsBanner />}
      
      <header className="bg-card border-b border-border px-6 py-4" data-testid="header">
        <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground" data-testid="page-title">
            {pageConfig.title}
          </h2>
          <p className="text-sm text-muted-foreground" data-testid="page-description">
            {pageConfig.description}
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* System Health Status (Super Admin Only) */}
          {user.role === 'super_admin' && (
            <SystemHealthStatus compact={true} data-testid="header-health-status" />
          )}
          
          {/* Notifications */}
          <button 
            className="relative p-2 text-muted-foreground hover:text-foreground transition-colors"
            data-testid="button-notifications"
            title="Notifications"
          >
            <i className="fas fa-bell text-lg"></i>
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-destructive rounded-full"></span>
          </button>
          
          {/* Quick Actions */}
          <div className="flex items-center space-x-2">
            {getQuickActions()}
          </div>

          {/* User Menu */}
          <div className="flex items-center space-x-3 pl-4 border-l border-border">
            <div className="text-right">
              <p className="text-sm font-medium text-foreground">{user.fullName}</p>
              <p className="text-xs text-muted-foreground">
                {user.role === 'super_admin' ? 'Super Admin' 
                 : user.role === 'client_admin' ? 'Client Admin'
                 : 'Client User'}
              </p>
            </div>
            <div className="w-8 h-8 bg-accent rounded-full flex items-center justify-center">
              <span className="text-xs font-semibold text-accent-foreground">
                {user.fullName.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
    </>
  );
}
