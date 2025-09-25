import { useAuth } from "@/hooks/use-auth";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export default function Sidebar() {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  if (!user) return null;

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  const isActive = (path: string) => {
    if (path === "/" && location === "/") return true;
    if (path !== "/" && location.startsWith(path)) return true;
    return false;
  };

  const NavLink = ({ href, children, icon, testId, badge }: {
    href: string;
    children: React.ReactNode;
    icon: string;
    testId?: string;
    badge?: { count: number; variant?: 'default' | 'destructive' | 'outline' | 'secondary' };
  }) => {
    const linkContent = (
      <Link href={href}>
        <a 
          className={cn(
            "flex items-center justify-between px-3 py-2 rounded-lg transition-colors group",
            isActive(href) 
              ? "bg-accent text-accent-foreground" 
              : "hover:bg-accent hover:text-accent-foreground"
          )}
          data-testid={testId}
        >
          <div className={cn("flex items-center", collapsed ? "justify-center" : "space-x-3")}>
            <i className={`${icon} w-5 text-center`}></i>
            {!collapsed && <span>{children}</span>}
          </div>
          {!collapsed && badge && badge.count > 0 && (
            <Badge variant={badge.variant || 'default'} className="h-5 px-1.5 text-xs">
              {badge.count > 99 ? '99+' : badge.count}
            </Badge>
          )}
          {collapsed && badge && badge.count > 0 && (
            <div className="absolute right-1 top-1 w-2 h-2 bg-destructive rounded-full"></div>
          )}
        </a>
      </Link>
    );

    if (collapsed) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              {linkContent}
            </TooltipTrigger>
            <TooltipContent side="right" className="ml-2">
              <p>{children}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    return linkContent;
  };

  return (
    <div className={cn(
      "bg-card border-r border-border flex flex-col transition-all duration-300",
      collapsed ? "w-16" : "w-64"
    )} data-testid="sidebar">
      {/* Logo */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary text-primary-foreground rounded-lg flex items-center justify-center">
              <i className="fas fa-phone-volume text-sm"></i>
            </div>
            {!collapsed && <h1 className="font-bold text-lg">VioConcierge</h1>}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCollapsed(!collapsed)}
            className="p-1 h-6 w-6"
            data-testid="button-toggle-sidebar"
          >
            <i className={`fas ${collapsed ? 'fa-angle-right' : 'fa-angle-left'} text-xs`}></i>
          </Button>
        </div>
      </div>

      {/* User Info */}
      <div className="p-4 border-b border-border">
        {collapsed ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex justify-center">
                  <div className="w-10 h-10 bg-accent rounded-full flex items-center justify-center">
                    <span className="text-sm font-semibold text-accent-foreground">
                      {getInitials(user.fullName)}
                    </span>
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent side="right" className="ml-2">
                <div>
                  <p className="font-medium">{user.fullName}</p>
                  <p className="text-xs text-muted-foreground">
                    {user.role === 'super_admin' ? 'Super Administrator' 
                     : user.role === 'client_admin' ? 'Client Administrator'
                     : 'Client User'}
                  </p>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
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
        )}
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {/* Super Admin Navigation */}
        {user.role === 'super_admin' && (
          <div className="space-y-2">
            {!collapsed && (
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 py-1">
                Platform Management
              </h3>
            )}
            <NavLink href="/" icon="fas fa-tachometer-alt" testId="nav-platform-overview">
              Platform Overview
            </NavLink>
            <NavLink 
              href="/tenants" 
              icon="fas fa-building" 
              testId="nav-tenant-management"
              badge={{ count: 12, variant: 'secondary' }}
            >
              Tenant Management
            </NavLink>
            <NavLink 
              href="/analytics-center" 
              icon="fas fa-chart-bar" 
              testId="nav-analytics-center"
            >
              Analytics Center
            </NavLink>
            <NavLink 
              href="/health" 
              icon="fas fa-heartbeat" 
              testId="nav-health-monitoring"
              badge={{ count: 1, variant: 'destructive' }}
            >
              Health Monitoring
            </NavLink>
            <NavLink href="/compliance" icon="fas fa-shield-alt" testId="nav-compliance">
              Compliance & Security
            </NavLink>
            <NavLink 
              href="/abuse-protection" 
              icon="fas fa-user-shield" 
              testId="nav-abuse-protection"
            >
              Abuse Protection
            </NavLink>
            <NavLink href="/system" icon="fas fa-cog" testId="nav-system-settings">
              System Settings
            </NavLink>
          </div>
        )}

        {/* Client Navigation */}
        {(user.role === 'client_admin' || user.role === 'client_user') && (
          <div className="space-y-2">
            {!collapsed && (
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 py-1">
                Business Management
              </h3>
            )}
            <NavLink href="/" icon="fas fa-chart-line" testId="nav-dashboard">
              Dashboard
            </NavLink>
            <NavLink 
              href="/contacts" 
              icon="fas fa-address-book" 
              testId="nav-contacts"
              badge={{ count: 247, variant: 'secondary' }}
            >
              Contacts
            </NavLink>
            <NavLink 
              href="/calls" 
              icon="fas fa-phone" 
              testId="nav-call-management"
              badge={{ count: 5, variant: 'default' }}
            >
              Call Management
            </NavLink>
            <NavLink 
              href="/appointments" 
              icon="fas fa-calendar-alt" 
              testId="nav-appointments"
              badge={{ count: 23, variant: 'default' }}
            >
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
        {collapsed ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button 
                  onClick={logout}
                  className="w-full flex items-center justify-center px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-accent"
                  data-testid="button-logout"
                >
                  <i className="fas fa-sign-out-alt"></i>
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="ml-2">
                <p>Sign Out</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          <button 
            onClick={logout}
            className="w-full flex items-center justify-center space-x-2 px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            data-testid="button-logout"
          >
            <i className="fas fa-sign-out-alt"></i>
            <span>Sign Out</span>
          </button>
        )}
      </div>
    </div>
  );
}
