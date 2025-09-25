import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, AlertTriangle, Shield, Pause } from "lucide-react";
import { useState } from "react";

interface Alert {
  id: string;
  type: 'system_outage' | 'security_breach' | 'auto_pause_events' | 'compliance_violations';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: Date;
  acknowledged: boolean;
}

interface AlertsResponse {
  alerts: Alert[];
  alertCount: number;
  criticalCount: number;
}

export default function AlertsBanner() {
  const [isDismissed, setIsDismissed] = useState(false);
  
  const { data: alertsData } = useQuery<AlertsResponse>({
    queryKey: ['/api/admin/health/alerts'],
    refetchInterval: 15000, // Refresh every 15 seconds for alerts
  });

  // Don't show if dismissed or no alerts
  if (isDismissed || !alertsData || alertsData.alertCount === 0) {
    return null;
  }

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'system_outage': return <AlertTriangle className="w-4 h-4" />;
      case 'security_breach': return <Shield className="w-4 h-4" />;
      case 'auto_pause_events': return <Pause className="w-4 h-4" />;
      case 'compliance_violations': return <AlertTriangle className="w-4 h-4" />;
      default: return <AlertTriangle className="w-4 h-4" />;
    }
  };

  const getAlertBackground = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-600 text-white';
      case 'high': return 'bg-orange-500 text-white';
      case 'medium': return 'bg-yellow-500 text-black';
      case 'low': return 'bg-blue-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const criticalAlerts = alertsData.alerts.filter(alert => alert.severity === 'critical');
  const displayAlert = criticalAlerts[0] || alertsData.alerts[0];

  const handleDismiss = () => {
    setIsDismissed(true);
  };

  const handleViewAll = () => {
    // Navigate to alerts page or open alerts modal
    console.log('View all alerts clicked');
  };

  return (
    <div 
      className={`w-full h-12 flex items-center justify-between px-4 ${getAlertBackground(displayAlert.severity)} relative z-10`}
      data-testid="alerts-banner"
      style={{ pointerEvents: 'auto' }}
    >
      <div className="flex items-center space-x-3">
        {getAlertIcon(displayAlert.type)}
        <span className="font-medium">
          {displayAlert.message}
        </span>
        {alertsData.alertCount > 1 && (
          <Badge variant="secondary" className="bg-white/20 text-white">
            +{alertsData.alertCount - 1} more
          </Badge>
        )}
      </div>
      
      <div className="flex items-center space-x-2">
        <Button 
          variant="ghost" 
          size="sm"
          className="text-white hover:bg-white/20 h-8"
          data-testid="button-view-all-alerts"
          onClick={handleViewAll}
        >
          View All
        </Button>
        <Button 
          variant="ghost" 
          size="sm"
          className="text-white hover:bg-white/20 h-8 w-8 p-0"
          data-testid="button-dismiss-banner"
          onClick={handleDismiss}
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}