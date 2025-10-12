import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import NotFound from "@/pages/not-found";
import Login from "@/pages/login";
import ResetPassword from "@/pages/reset-password";
import AcceptInvitation from "@/pages/accept-invitation";
import Dashboard from "@/pages/dashboard";
import SuperAdminDashboard from "@/pages/super-admin-dashboard";
import ClientAdminDashboard from "@/pages/client-admin-dashboard";
import Contacts from "@/pages/contacts";
import Appointments from "@/pages/appointments";
import ContactAnalytics from "@/pages/contact-analytics";
import Calls from "@/pages/calls";
import TenantManagement from "@/pages/tenant-management";
import SystemSettings from "@/pages/system-settings";
import Profile from "@/pages/profile";
import HealthMonitoring from "@/pages/health-monitoring";
import AnalyticsCenter from "@/pages/analytics-center";
import Compliance from "@/pages/compliance";
import AbuseProtection from "@/pages/abuse-protection";
import SuperAdminGuide from "@/pages/super-admin-guide";
import ClientAdminGuide from "@/pages/client-admin-guide";
import TeamManagement from "@/pages/team-management";
import AuditTrail from "@/pages/audit-trail";

// Role-based route protection component
function ProtectedRoute({ 
  component: Component, 
  allowedRoles, 
  user 
}: { 
  component: React.ComponentType; 
  allowedRoles: string[]; 
  user: any;
}) {
  if (!allowedRoles.includes(user?.role)) {
    return <NotFound />;
  }
  return <Component />;
}

function Router() {
  const { user, isLoading } = useAuth();
  
  // Check if this is the reset password page (with or without trailing slash)
  const pathname = window.location.pathname.replace(/\/$/, ''); // Remove trailing slash
  const isResetPasswordPage = pathname === '/reset-password';
  const isAcceptInvitationPage = pathname === '/accept-invitation';
  
  // Allow access to reset password and accept invitation pages without authentication
  if (isResetPasswordPage) {
    return <ResetPassword />;
  }
  
  if (isAcceptInvitationPage) {
    return <AcceptInvitation />;
  }

  // Check if this is the login page
  const isLoginPage = pathname === '/login' || pathname === '';
  
  if (isLoading && !isLoginPage) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      
      {/* Super Admin Only Routes */}
      <Route path="/super-admin">
        <ProtectedRoute component={SuperAdminDashboard} allowedRoles={['super_admin']} user={user} />
      </Route>
      <Route path="/tenants">
        <ProtectedRoute component={TenantManagement} allowedRoles={['super_admin']} user={user} />
      </Route>
      <Route path="/analytics-center">
        <ProtectedRoute component={AnalyticsCenter} allowedRoles={['super_admin']} user={user} />
      </Route>
      <Route path="/health">
        <ProtectedRoute component={HealthMonitoring} allowedRoles={['super_admin']} user={user} />
      </Route>
      <Route path="/compliance">
        <ProtectedRoute component={Compliance} allowedRoles={['super_admin']} user={user} />
      </Route>
      <Route path="/abuse-protection">
        <ProtectedRoute component={AbuseProtection} allowedRoles={['super_admin']} user={user} />
      </Route>
      <Route path="/system">
        <ProtectedRoute component={SystemSettings} allowedRoles={['super_admin']} user={user} />
      </Route>
      <Route path="/super-admin-guide">
        <ProtectedRoute component={SuperAdminGuide} allowedRoles={['super_admin']} user={user} />
      </Route>
      
      {/* Client Admin and Client User Routes */}
      <Route path="/client-admin">
        <ProtectedRoute component={ClientAdminDashboard} allowedRoles={['client_admin', 'client_user']} user={user} />
      </Route>
      <Route path="/contacts">
        <ProtectedRoute component={Contacts} allowedRoles={['client_admin', 'client_user']} user={user} />
      </Route>
      <Route path="/calls">
        <ProtectedRoute component={Calls} allowedRoles={['client_admin', 'client_user']} user={user} />
      </Route>
      <Route path="/appointments">
        <ProtectedRoute component={Appointments} allowedRoles={['client_admin', 'client_user']} user={user} />
      </Route>
      <Route path="/analytics">
        <ProtectedRoute component={ContactAnalytics} allowedRoles={['client_admin', 'client_user']} user={user} />
      </Route>
      <Route path="/client-admin-guide">
        <ProtectedRoute component={ClientAdminGuide} allowedRoles={['client_admin', 'client_user']} user={user} />
      </Route>
      <Route path="/team">
        <ProtectedRoute component={TeamManagement} allowedRoles={['client_admin']} user={user} />
      </Route>
      <Route path="/audit-trail">
        <ProtectedRoute component={AuditTrail} allowedRoles={['client_admin', 'super_admin']} user={user} />
      </Route>
      
      {/* All authenticated users routes */}
      <Route path="/profile" component={Profile} />
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
