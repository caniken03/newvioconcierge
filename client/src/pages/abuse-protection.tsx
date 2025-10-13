import { useAuth } from "@/hooks/use-auth";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { 
  Shield, 
  AlertTriangle, 
  Eye, 
  Ban, 
  Clock,
  CheckCircle,
  XCircle,
  TrendingUp,
  Activity,
  Users,
  Phone,
  Timer,
  AlertCircle,
  ShieldCheck,
  Zap,
  BarChart3,
  RefreshCw,
  PlayCircle,
  PauseCircle
} from "lucide-react";

export default function AbuseProtection() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedTenant, setSelectedTenant] = useState<string>("");
  const [selectedSeverity, setSelectedSeverity] = useState<string>("");
  const [visibleEventsCount, setVisibleEventsCount] = useState<number>(15);

  if (!user || user.role !== 'super_admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-muted-foreground">You don't have permission to access abuse protection.</p>
        </div>
      </div>
    );
  }

  // Fetch abuse protection dashboard data
  const { data: dashboard, isLoading: dashboardLoading, refetch: refetchDashboard, isFetching: dashboardFetching } = useQuery({
    queryKey: ['/api/admin/abuse-protection/dashboard'],
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  // Fetch abuse detection events
  const { data: abuseEvents, isLoading: eventsLoading, refetch: refetchEvents } = useQuery({
    queryKey: (selectedTenant && selectedTenant !== 'all') || (selectedSeverity && selectedSeverity !== 'all')
      ? ['/api/admin/abuse-protection/events', selectedTenant, selectedSeverity]
      : ['/api/admin/abuse-protection/events']
  });

  // Fetch active suspensions
  const { data: activeSuspensions, isLoading: suspensionsLoading, refetch: refetchSuspensions } = useQuery({
    queryKey: ['/api/admin/abuse-protection/suspensions']
  });

  // Fetch all tenants for selection
  const { data: tenants } = useQuery({
    queryKey: ['/api/admin/tenants']
  });

  // Reset visible events count when filters change
  useEffect(() => {
    setVisibleEventsCount(15);
  }, [selectedTenant, selectedSeverity]);

  // Mutation to resolve abuse events
  const resolveEventMutation = useMutation({
    mutationFn: async (eventId: string) => {
      const token = localStorage.getItem('auth_token');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`/api/admin/abuse-protection/events/${eventId}/resolve`, {
        method: 'PATCH',
        headers,
        credentials: 'include'
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        console.error('Resolve event error:', response.status, errorData);
        throw new Error(errorData.message || `Failed to resolve event (${response.status})`);
      }
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Event resolved successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/abuse-protection/events'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/abuse-protection/dashboard'] });
    },
    onError: (error: any) => {
      console.error('Mutation error:', error);
      toast({ 
        title: "Failed to resolve event", 
        description: error.message || 'An error occurred',
        variant: "destructive" 
      });
    }
  });

  // Mutation to suspend tenant
  const suspendTenantMutation = useMutation({
    mutationFn: async (data: { tenantId: string; reason: string }) => {
      const token = localStorage.getItem('auth_token');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch('/api/admin/abuse-protection/suspend', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          tenantId: data.tenantId,
          suspensionType: 'manual',
          reason: data.reason,
          triggeredBy: 'admin_action'
        })
      });
      if (!response.ok) throw new Error('Failed to suspend tenant');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Tenant suspended successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/abuse-protection/suspensions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/abuse-protection/dashboard'] });
    },
    onError: () => {
      toast({ title: "Failed to suspend tenant", variant: "destructive" });
    }
  });

  // Mutation to reactivate tenant
  const reactivateTenantMutation = useMutation({
    mutationFn: async (tenantId: string) => {
      const token = localStorage.getItem('auth_token');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`/api/admin/abuse-protection/reactivate/${tenantId}`, {
        method: 'POST',
        headers,
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to reactivate tenant');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Tenant reactivated successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/abuse-protection/suspensions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/abuse-protection/dashboard'] });
    },
    onError: () => {
      toast({ title: "Failed to reactivate tenant", variant: "destructive" });
    }
  });

  const handleRefresh = () => {
    refetchDashboard();
    refetchEvents();
    refetchSuspensions();
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const getEventTypeIcon = (eventType: string) => {
    switch (eventType) {
      case 'rate_limit_violation': return <Timer className="w-4 h-4" />;
      case 'business_hours_violation': return <Clock className="w-4 h-4" />;
      case 'suspicious_pattern': return <Eye className="w-4 h-4" />;
      default: return <AlertTriangle className="w-4 h-4" />;
    }
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto bg-background p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-foreground" data-testid="abuse-protection-page">
                  Abuse Protection & Security
                </h1>
                <p className="text-muted-foreground mt-1">
                  Real-time monitoring and protection against platform abuse
                </p>
              </div>
              <Button 
                variant="outline" 
                onClick={handleRefresh}
                disabled={dashboardFetching}
                data-testid="button-refresh-dashboard"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${dashboardFetching ? 'animate-spin' : ''}`} />
                {dashboardFetching ? 'Refreshing...' : 'Refresh'}
              </Button>
            </div>

            {/* Protection Status Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Active Violations</p>
                      <p className="text-3xl font-bold text-foreground">
                        {dashboardLoading ? "..." : (dashboard as any)?.totalViolations || 0}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-red-100 text-red-600 rounded-lg flex items-center justify-center">
                      <AlertTriangle className="w-6 h-6" />
                    </div>
                  </div>
                  <div className="flex items-center mt-4">
                    <TrendingUp className="w-4 h-4 text-red-500 mr-1" />
                    <span className="text-sm font-medium text-red-500">Requires attention</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Suspended Tenants</p>
                      <p className="text-3xl font-bold text-foreground">
                        {dashboardLoading ? "..." : (dashboard as any)?.activeSuspensions || 0}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-lg flex items-center justify-center">
                      <Ban className="w-6 h-6" />
                    </div>
                  </div>
                  <div className="flex items-center mt-4">
                    <PauseCircle className="w-4 h-4 text-orange-500 mr-1" />
                    <span className="text-sm font-medium text-orange-500">Auto-suspended</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Risk Tenants</p>
                      <p className="text-3xl font-bold text-foreground">
                        {dashboardLoading ? "..." : (dashboard as any)?.riskTenants || 0}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-yellow-100 text-yellow-600 rounded-lg flex items-center justify-center">
                      <Users className="w-6 h-6" />
                    </div>
                  </div>
                  <div className="flex items-center mt-4">
                    <Eye className="w-4 h-4 text-yellow-500 mr-1" />
                    <span className="text-sm font-medium text-yellow-500">Monitoring</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Protection Status</p>
                      <p className="text-3xl font-bold text-green-600">Active</p>
                    </div>
                    <div className="w-12 h-12 bg-green-100 text-green-600 rounded-lg flex items-center justify-center">
                      <ShieldCheck className="w-6 h-6" />
                    </div>
                  </div>
                  <div className="flex items-center mt-4">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-1" />
                    <span className="text-sm font-medium text-green-500">All systems operational</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Detailed Management Tabs */}
            <Tabs defaultValue="events" className="space-y-6">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="events" data-testid="tab-abuse-events">
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  Abuse Events
                </TabsTrigger>
                <TabsTrigger value="suspensions" data-testid="tab-suspensions">
                  <Ban className="w-4 h-4 mr-2" />
                  Suspensions
                </TabsTrigger>
                <TabsTrigger value="protection" data-testid="tab-protection-rules">
                  <Shield className="w-4 h-4 mr-2" />
                  Protection Rules
                </TabsTrigger>
                <TabsTrigger value="analytics" data-testid="tab-analytics">
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Analytics
                </TabsTrigger>
              </TabsList>

              {/* Abuse Events Management */}
              <TabsContent value="events">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Abuse Detection Events</CardTitle>
                        <CardDescription>Monitor and resolve security violations</CardDescription>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Select value={selectedSeverity} onValueChange={setSelectedSeverity}>
                          <SelectTrigger className="w-40">
                            <SelectValue placeholder="Filter by severity" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Severities</SelectItem>
                            <SelectItem value="critical">Critical</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="low">Low</SelectItem>
                          </SelectContent>
                        </Select>
                        <Select value={selectedTenant} onValueChange={setSelectedTenant}>
                          <SelectTrigger className="w-48">
                            <SelectValue placeholder="Filter by tenant" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Tenants</SelectItem>
                            {tenants?.map((tenant: any) => (
                              <SelectItem key={tenant.id} value={tenant.id}>
                                {tenant.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {eventsLoading ? (
                        <div className="flex items-center justify-center py-8">
                          <div className="text-muted-foreground">Loading abuse events...</div>
                        </div>
                      ) : !abuseEvents || (Array.isArray(abuseEvents) && abuseEvents.length === 0) ? (
                        <div className="text-center py-8">
                          <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-500" />
                          <p className="text-muted-foreground">No abuse events detected</p>
                        </div>
                      ) : (
                        <>
                          {Array.isArray(abuseEvents) && abuseEvents.slice(0, visibleEventsCount).map((event: any) => (
                            <div key={event.id} className="flex items-start space-x-4 p-4 border rounded-lg">
                              <div className="flex-shrink-0">
                                {getEventTypeIcon(event.eventType)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center space-x-2">
                                    <Badge variant="outline" className={`${getSeverityColor(event.severity)} text-white`}>
                                      {event.severity.toUpperCase()}
                                    </Badge>
                                    <span className="text-sm font-medium">{event.eventType.replace('_', ' ')}</span>
                                  </div>
                                  <span className="text-xs text-muted-foreground">
                                    {new Date(event.createdAt).toLocaleString()}
                                  </span>
                                </div>
                                <p className="text-sm text-muted-foreground mb-2">{event.description}</p>
                                <div className="flex items-center justify-between">
                                  <span className="text-xs text-muted-foreground">
                                    Tenant: {(tenants as any)?.find((t: any) => t.id === event.tenantId)?.name || event.tenantId}
                                  </span>
                                  {!event.isResolved && (
                                    <Button 
                                      size="sm" 
                                      variant="outline"
                                      onClick={() => resolveEventMutation.mutate(event.id)}
                                      disabled={resolveEventMutation.isPending}
                                      data-testid={`button-resolve-${event.id}`}
                                    >
                                      <CheckCircle className="w-3 h-3 mr-1" />
                                      Resolve
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                          
                          {/* Load More Button */}
                          {Array.isArray(abuseEvents) && abuseEvents.length > visibleEventsCount && (
                            <div className="flex justify-center pt-4">
                              <Button
                                variant="outline"
                                onClick={() => setVisibleEventsCount(prev => prev + 15)}
                                data-testid="button-load-more-events"
                              >
                                Load More Events ({abuseEvents.length - visibleEventsCount} remaining)
                              </Button>
                            </div>
                          )}

                          {/* Showing X of Y indicator */}
                          {Array.isArray(abuseEvents) && abuseEvents.length > 0 && (
                            <div className="text-center text-sm text-muted-foreground pt-2">
                              Showing {Math.min(visibleEventsCount, abuseEvents.length)} of {abuseEvents.length} events
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Tenant Suspensions */}
              <TabsContent value="suspensions">
                <Card>
                  <CardHeader>
                    <CardTitle>Active Tenant Suspensions</CardTitle>
                    <CardDescription>Manage suspended tenants and reactivation</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {suspensionsLoading ? (
                        <div className="flex items-center justify-center py-8">
                          <div className="text-muted-foreground">Loading suspensions...</div>
                        </div>
                      ) : (activeSuspensions as any)?.length === 0 ? (
                        <div className="text-center py-8">
                          <PlayCircle className="w-12 h-12 mx-auto mb-4 text-green-500" />
                          <p className="text-muted-foreground">No active suspensions</p>
                        </div>
                      ) : (
                        (activeSuspensions as any)?.map((suspension: any) => (
                          <div key={suspension.id} className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-2">
                                <Badge variant="destructive">{suspension.suspensionType.toUpperCase()}</Badge>
                                <span className="font-medium">
                                  {(tenants as any)?.find((t: any) => t.id === suspension.tenantId)?.name || suspension.tenantId}
                                </span>
                              </div>
                              <p className="text-sm text-muted-foreground mb-1">{suspension.reason}</p>
                              <p className="text-xs text-muted-foreground">
                                Suspended: {new Date(suspension.suspendedAt).toLocaleString()}
                              </p>
                            </div>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="outline" size="sm" data-testid={`button-reactivate-${suspension.tenantId}`}>
                                  <PlayCircle className="w-3 h-3 mr-1" />
                                  Reactivate
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Reactivate Tenant</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to reactivate this tenant? They will be able to make calls again.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction 
                                    onClick={() => reactivateTenantMutation.mutate(suspension.tenantId)}
                                    disabled={reactivateTenantMutation.isPending}
                                  >
                                    Reactivate
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Protection Rules */}
              <TabsContent value="protection">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <Timer className="w-5 h-5" />
                        <span>Rate Limiting Rules</span>
                      </CardTitle>
                      <CardDescription>Control call volume and frequency</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div>
                          <div className="font-medium">15-Minute Window</div>
                          <div className="text-sm text-muted-foreground">Maximum 25 calls per 15 minutes</div>
                        </div>
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          Active
                        </Badge>
                      </div>

                      <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div>
                          <div className="font-medium">Hourly Limit</div>
                          <div className="text-sm text-muted-foreground">Maximum 100 calls per hour</div>
                        </div>
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          Active
                        </Badge>
                      </div>

                      <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div>
                          <div className="font-medium">Daily Limit</div>
                          <div className="text-sm text-muted-foreground">Maximum 300 calls per day</div>
                        </div>
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          Active
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <Clock className="w-5 h-5" />
                        <span>Business Hours Protection</span>
                      </CardTitle>
                      <CardDescription>Prevent calls outside business hours</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div>
                          <div className="font-medium">Weekday Hours</div>
                          <div className="text-sm text-muted-foreground">Monday-Friday: 8:00 AM - 8:00 PM</div>
                        </div>
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          Active
                        </Badge>
                      </div>

                      <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div>
                          <div className="font-medium">Weekend Restrictions</div>
                          <div className="text-sm text-muted-foreground">Saturday-Sunday: No calling allowed</div>
                        </div>
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          Active
                        </Badge>
                      </div>

                      <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div>
                          <div className="font-medium">Holiday Protection</div>
                          <div className="text-sm text-muted-foreground">UK bank holidays respected</div>
                        </div>
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          Active
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Analytics */}
              <TabsContent value="analytics">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Protection Effectiveness</CardTitle>
                      <CardDescription>How well the system is preventing abuse</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Rate Limit Blocks</span>
                          <span className="text-sm font-bold">2,847</span>
                        </div>
                        <Progress value={92} className="w-full" />
                        
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Business Hours Blocks</span>
                          <span className="text-sm font-bold">1,243</span>
                        </div>
                        <Progress value={78} className="w-full" />
                        
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Harassment Prevention</span>
                          <span className="text-sm font-bold">456</span>
                        </div>
                        <Progress value={65} className="w-full" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Violation Trends</CardTitle>
                      <CardDescription>Recent abuse detection patterns</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                          <div className="flex items-center space-x-2">
                            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                            <span className="text-sm font-medium">Critical Violations</span>
                          </div>
                          <span className="text-sm font-bold">3</span>
                        </div>
                        
                        <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                          <div className="flex items-center space-x-2">
                            <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                            <span className="text-sm font-medium">High Violations</span>
                          </div>
                          <span className="text-sm font-bold">12</span>
                        </div>
                        
                        <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                          <div className="flex items-center space-x-2">
                            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                            <span className="text-sm font-medium">Medium Violations</span>
                          </div>
                          <span className="text-sm font-bold">28</span>
                        </div>
                        
                        <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                          <div className="flex items-center space-x-2">
                            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                            <span className="text-sm font-medium">Low Violations</span>
                          </div>
                          <span className="text-sm font-bold">67</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>

          </div>
        </main>
      </div>
    </div>
  );
}