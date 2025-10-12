import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link, useLocation } from "wouter";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import SystemHealthStatus from "@/components/health/SystemHealthStatus";
import AlertsBanner from "@/components/health/AlertsBanner";
import { ThemeToggle } from "@/components/theme-toggle";
import { useState } from "react";

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
  const [searchQuery, setSearchQuery] = useState("");

  if (!user) return null;

  const pageConfig = getPageConfig(location, user.role);

  const getQuickActions = () => {
    if (user.role === 'super_admin') {
      return (
        <div className="flex items-center space-x-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="default" data-testid="button-quick-actions">
                <i className="fas fa-plus text-sm mr-2"></i>
                Quick Actions
                <i className="fas fa-chevron-down text-xs ml-2"></i>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem asChild>
                <Link href="/tenants" className="w-full">
                  <i className="fas fa-building mr-2"></i>
                  Create New Tenant
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/users" className="w-full">
                  <i className="fas fa-user-plus mr-2"></i>
                  Add User Account
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/system" className="w-full">
                  <i className="fas fa-cog mr-2"></i>
                  System Configuration
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/compliance" className="w-full">
                  <i className="fas fa-shield-alt mr-2"></i>
                  Security Review
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    }

    if (user.role === 'client_admin' || user.role === 'client_user') {
      return (
        <div className="flex items-center space-x-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="default" data-testid="button-quick-actions">
                <i className="fas fa-plus text-sm mr-2"></i>
                Quick Actions
                <i className="fas fa-chevron-down text-xs ml-2"></i>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem asChild>
                <Link href="/contacts?new=true" className="w-full">
                  <i className="fas fa-user-plus mr-2"></i>
                  Add New Contact
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/appointments" className="w-full">
                  <i className="fas fa-calendar-plus mr-2"></i>
                  Schedule Appointment
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/calls" className="w-full">
                  <i className="fas fa-phone mr-2"></i>
                  Manual Call
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    }

    return null;
  };

  const getContextualHelp = () => {
    const helpContent = {
      '/': user.role === 'super_admin' 
        ? 'Platform Overview shows system-wide metrics, tenant status, and health monitoring. Use the quick actions to manage tenants and access key administrative functions.'
        : 'Your business dashboard shows key metrics, recent appointments, and call performance. Use the sidebar to navigate between contacts, calls, and analytics.',
      '/tenants': 'Manage all tenants on the platform. You can create new tenants, view their status, configure their settings, and monitor their usage.',
      '/health': 'Monitor system health in real-time. This includes database connectivity, external service status, and system performance metrics.',
      '/contacts': 'Manage your customer contacts and their appointment history. You can add new contacts, edit existing ones, and view their call logs.',
      '/calls': 'Monitor and manage voice appointment reminders. View call status, schedules, and configure voice AI settings.',
      '/appointments': 'View and manage scheduled appointments. You can see upcoming appointments, reschedule them, and track their status.',
      '/analytics': 'Detailed performance insights including call success rates, appointment conversion, and business growth metrics.',
    };

    const currentHelp = helpContent[location] || 'Welcome to VioConcierge - your intelligent voice appointment management platform.';

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="sm" data-testid="button-contextual-help">
              <i className="fas fa-question-circle text-lg"></i>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs">
            <p className="text-sm">{currentHelp}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
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
          {/* Global Search */}
          <div className="hidden md:flex items-center space-x-2">
            <div className="relative">
              <Input
                type="text"
                placeholder={user.role === 'super_admin' ? 'Search tenants, users...' : 'Search contacts, appointments...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-64 pl-8"
                data-testid="input-global-search"
              />
              <i className="fas fa-search absolute left-2.5 top-1/2 transform -translate-y-1/2 text-muted-foreground text-sm"></i>
            </div>
          </div>

          {/* System Health Status (Super Admin Only) */}
          {user.role === 'super_admin' && (
            <SystemHealthStatus compact={true} data-testid="header-health-status" />
          )}
          
          {/* Enhanced Notifications with Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button 
                className="relative p-2 text-muted-foreground hover:text-foreground transition-colors"
                data-testid="button-notifications"
              >
                <i className="fas fa-bell text-lg"></i>
                <Badge variant="destructive" className="absolute -top-2 -right-2 h-5 w-5 p-0 text-xs flex items-center justify-center">
                  3
                </Badge>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 max-h-96 overflow-y-auto">
              <div className="p-3 border-b border-border">
                <h3 className="font-semibold text-sm">Notifications</h3>
                <p className="text-xs text-muted-foreground">You have 3 unread notifications</p>
              </div>
              <div className="max-h-64 overflow-y-auto">
                <div className="p-3 border-b border-border hover:bg-accent cursor-pointer" data-testid="notification-item">
                  <div className="flex items-start space-x-2">
                    <div className="w-2 h-2 bg-destructive rounded-full mt-2 flex-shrink-0"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">System Alert</p>
                      <p className="text-xs text-muted-foreground">Storage system issues detected</p>
                      <p className="text-xs text-muted-foreground mt-1">5 minutes ago</p>
                    </div>
                  </div>
                </div>
                <div className="p-3 border-b border-border hover:bg-accent cursor-pointer" data-testid="notification-item">
                  <div className="flex items-start space-x-2">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2 flex-shrink-0"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">New Tenant Registration</p>
                      <p className="text-xs text-muted-foreground">Dental Practice has completed setup</p>
                      <p className="text-xs text-muted-foreground mt-1">2 hours ago</p>
                    </div>
                  </div>
                </div>
                <div className="p-3 border-b border-border hover:bg-accent cursor-pointer" data-testid="notification-item">
                  <div className="flex items-start space-x-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Performance Update</p>
                      <p className="text-xs text-muted-foreground">Monthly platform analytics report ready</p>
                      <p className="text-xs text-muted-foreground mt-1">1 day ago</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-3 border-t border-border">
                <Button variant="outline" size="sm" className="w-full" data-testid="button-view-all-notifications">
                  View All Notifications
                </Button>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
          
          {/* Contextual Help */}
          {getContextualHelp()}
          
          {/* Theme Toggle */}
          <ThemeToggle />
          
          {/* Quick Actions Toolbar */}
          <div className="flex items-center space-x-2">
            {getQuickActions()}
          </div>

          {/* User Menu */}
          <div className="flex items-center space-x-3 pl-4 border-l border-border">
            <div className="text-right hidden sm:block">
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
