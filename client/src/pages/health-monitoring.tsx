import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import SystemHealthStatus from "@/components/health/SystemHealthStatus";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Activity, Database, Server, Smartphone, AlertTriangle } from "lucide-react";

interface SystemHealth {
  status: 'operational' | 'degraded' | 'critical';
  message: string;
  uptime: number;
  lastCheck: Date;
  services: {
    database: { status: 'up' | 'down'; responseTime?: number };
    retell: { status: 'up' | 'down'; responseTime?: number };
    storage: { status: 'up' | 'down'; responseTime?: number };
  };
  alerts: Array<{
    id: string;
    type: 'system_outage' | 'security_breach' | 'auto_pause_events' | 'compliance_violations';
    severity: 'low' | 'medium' | 'high' | 'critical';
    message: string;
    timestamp: Date;
    acknowledged: boolean;
  }>;
}

export default function HealthMonitoring() {
  const { user } = useAuth();
  
  const { data: health, isLoading, refetch } = useQuery<SystemHealth>({
    queryKey: ['/api/admin/health'],
    refetchInterval: 30000, // Refresh every 30 seconds
    enabled: !!user && user.role === 'super_admin',
  });

  if (!user || user.role !== 'super_admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-muted-foreground">You don't have permission to access health monitoring.</p>
        </div>
      </div>
    );
  }

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) return `${days} days, ${hours} hours, ${minutes} minutes`;
    if (hours > 0) return `${hours} hours, ${minutes} minutes`;
    return `${minutes} minutes`;
  };

  const getServiceIcon = (service: string) => {
    switch (service) {
      case 'database': return <Database className="w-5 h-5" />;
      case 'retell': return <Smartphone className="w-5 h-5" />;
      case 'storage': return <Server className="w-5 h-5" />;
      default: return <Activity className="w-5 h-5" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto bg-background p-6">
          
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground mb-2">System Health Dashboard</h1>
              <p className="text-muted-foreground">Real-time platform monitoring and alerts</p>
            </div>
            <Button 
              onClick={() => refetch()}
              variant="outline"
              data-testid="button-refresh-health"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="h-4 bg-muted rounded mb-2"></div>
                    <div className="h-8 bg-muted rounded mb-4"></div>
                    <div className="h-3 bg-muted rounded w-3/4"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : health ? (
            <div className="space-y-6">
              
              {/* System Overview */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2">
                  <SystemHealthStatus />
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Activity className="w-5 h-5" />
                      <span>System Uptime</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-green-600 mb-2">
                      {formatUptime(health.uptime)}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Last check: {new Date(health.lastCheck).toLocaleTimeString()}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Service Status */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Server className="w-5 h-5" />
                    <span>Service Status</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {Object.entries(health.services).map(([service, data]) => (
                      <div 
                        key={service}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="flex items-center space-x-3">
                          {getServiceIcon(service)}
                          <div>
                            <div className="font-medium capitalize">{service}</div>
                            {data.responseTime && (
                              <div className="text-xs text-muted-foreground">
                                {data.responseTime}ms response
                              </div>
                            )}
                          </div>
                        </div>
                        <Badge 
                          variant={data.status === 'up' ? 'default' : 'destructive'}
                          className={data.status === 'up' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}
                        >
                          {data.status.toUpperCase()}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Active Alerts */}
              {health.alerts.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span className="flex items-center space-x-2">
                        <AlertTriangle className="w-5 h-5" />
                        <span>Active Alerts</span>
                      </span>
                      <Badge variant="destructive">{health.alerts.length}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {health.alerts.map((alert) => (
                        <div 
                          key={alert.id}
                          className={`p-4 rounded-lg border ${getSeverityColor(alert.severity)}`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-1">
                                <Badge variant="outline" className="text-xs">
                                  {alert.type.replace('_', ' ').toUpperCase()}
                                </Badge>
                                <Badge 
                                  variant="outline" 
                                  className={`text-xs ${getSeverityColor(alert.severity)}`}
                                >
                                  {alert.severity.toUpperCase()}
                                </Badge>
                              </div>
                              <p className="font-medium mb-1">{alert.message}</p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(alert.timestamp).toLocaleString()}
                              </p>
                            </div>
                            <Button 
                              variant="outline" 
                              size="sm"
                              data-testid={`button-acknowledge-${alert.id}`}
                            >
                              Acknowledge
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* No Alerts Message */}
              {health.alerts.length === 0 && (
                <Card>
                  <CardContent className="p-8 text-center">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Activity className="w-8 h-8 text-green-600" />
                    </div>
                    <h3 className="text-lg font-medium mb-2">All Clear!</h3>
                    <p className="text-muted-foreground">
                      No active alerts. All systems are operating normally.
                    </p>
                  </CardContent>
                </Card>
              )}

            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Health Check Failed</h3>
                <p className="text-muted-foreground mb-4">
                  Unable to retrieve system health information.
                </p>
                <Button onClick={() => refetch()}>
                  Try Again
                </Button>
              </CardContent>
            </Card>
          )}

        </main>
      </div>
    </div>
  );
}