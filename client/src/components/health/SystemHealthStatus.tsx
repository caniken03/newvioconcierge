import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Heart, AlertTriangle, CheckCircle, XCircle, Clock } from "lucide-react";

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

interface SystemHealthStatusProps {
  compact?: boolean;
  onClick?: () => void;
}

export default function SystemHealthStatus({ compact = false, onClick }: SystemHealthStatusProps) {
  const { data: health, isLoading } = useQuery<SystemHealth>({
    queryKey: ['/api/admin/health'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  if (isLoading || !health) {
    return (
      <div 
        className={`flex items-center space-x-2 ${onClick ? 'cursor-pointer' : ''}`}
        onClick={onClick}
        data-testid="health-status-loading"
      >
        <div className="w-4 h-4 rounded-full bg-gray-400 animate-pulse"></div>
        {!compact && <span className="text-sm text-muted-foreground">Checking...</span>}
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'operational': return 'text-green-600 bg-green-100';
      case 'degraded': return 'text-yellow-600 bg-yellow-100';
      case 'critical': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'operational': return <CheckCircle className="w-4 h-4" />;
      case 'degraded': return <AlertTriangle className="w-4 h-4" />;
      case 'critical': return <XCircle className="w-4 h-4" />;
      default: return <Heart className="w-4 h-4" />;
    }
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  if (compact) {
    return (
      <div 
        className={`flex items-center space-x-2 ${onClick ? 'cursor-pointer hover:opacity-80' : ''}`}
        onClick={onClick}
        data-testid="health-status-compact"
      >
        <div className={`w-6 h-6 rounded-full flex items-center justify-center ${getStatusColor(health.status)}`}>
          {getStatusIcon(health.status)}
        </div>
        <span className="text-sm font-medium">{health.status}</span>
        {health.alerts.length > 0 && (
          <Badge variant="destructive" className="text-xs">
            {health.alerts.length}
          </Badge>
        )}
      </div>
    );
  }

  return (
    <Card className="w-full" data-testid="health-status-detailed">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center space-x-2">
            <Heart className="w-5 h-5" />
            <span>System Health</span>
          </span>
          <Badge className={getStatusColor(health.status)}>
            {health.status.toUpperCase()}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Status:</span>
          <span className="font-medium">{health.message}</span>
        </div>
        
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Uptime:</span>
          <span className="font-medium flex items-center space-x-1">
            <Clock className="w-3 h-3" />
            <span>{formatUptime(health.uptime)}</span>
          </span>
        </div>

        {health.alerts.length > 0 && (
          <div className="border-t pt-3">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-muted-foreground">Active Alerts:</span>
              <Badge variant="destructive">{health.alerts.length}</Badge>
            </div>
            <div className="space-y-1">
              {health.alerts.slice(0, 3).map((alert) => (
                <div key={alert.id} className="text-xs bg-red-50 p-2 rounded text-red-800">
                  {alert.message}
                </div>
              ))}
              {health.alerts.length > 3 && (
                <div className="text-xs text-muted-foreground">
                  +{health.alerts.length - 3} more alerts
                </div>
              )}
            </div>
          </div>
        )}

        <div className="border-t pt-3">
          <div className="text-sm text-muted-foreground mb-2">Services:</div>
          <div className="grid grid-cols-3 gap-2">
            {Object.entries(health.services).map(([service, data]) => (
              <div key={service} className="flex items-center space-x-1 text-xs">
                <div className={`w-2 h-2 rounded-full ${
                  data.status === 'up' ? 'bg-green-500' : 'bg-red-500'
                }`}></div>
                <span className="capitalize">{service}</span>
                {data.responseTime && (
                  <span className="text-muted-foreground">({data.responseTime}ms)</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {onClick && (
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full"
            onClick={onClick}
            data-testid="button-view-health-details"
          >
            View Health Dashboard
          </Button>
        )}
      </CardContent>
    </Card>
  );
}