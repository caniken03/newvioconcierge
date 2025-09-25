import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import NotFound from "@/pages/not-found";
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import SuperAdminDashboard from "@/pages/super-admin-dashboard";
import ClientAdminDashboard from "@/pages/client-admin-dashboard";
import Contacts from "@/pages/contacts";
import Appointments from "@/pages/appointments";
import ContactAnalytics from "@/pages/contact-analytics";
import TenantManagement from "@/pages/tenant-management";
import SystemSettings from "@/pages/system-settings";
import Profile from "@/pages/profile";

function Router() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
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
      <Route path="/super-admin" component={SuperAdminDashboard} />
      <Route path="/client-admin" component={ClientAdminDashboard} />
      <Route path="/contacts" component={Contacts} />
      <Route path="/appointments" component={Appointments} />
      <Route path="/analytics" component={ContactAnalytics} />
      <Route path="/tenants" component={TenantManagement} />
      <Route path="/system" component={SystemSettings} />
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
