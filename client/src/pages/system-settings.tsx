import { useAuth } from "@/hooks/use-auth";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

export default function SystemSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isDownloadingLogs, setIsDownloadingLogs] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);

  const handleCreateBackup = async () => {
    try {
      setIsBackingUp(true);
      const token = localStorage.getItem('auth_token');
      
      const response = await fetch('/api/admin/compliance/backup', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to create backup');
      }
      
      const data = await response.json();
      
      toast({
        title: "Backup Created",
        description: `System backup completed successfully. ${data.recordsBackedUp} records backed up.`,
      });
    } catch (error: any) {
      toast({
        title: "Backup Failed",
        description: error.message || "Failed to create system backup",
        variant: "destructive",
      });
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleDownloadLogs = async () => {
    try {
      setIsDownloadingLogs(true);
      const token = localStorage.getItem('auth_token');
      
      const response = await fetch('/api/admin/compliance/logs', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to download logs');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `system-logs-${new Date().toISOString().split('T')[0]}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Logs Downloaded",
        description: "System logs have been downloaded successfully",
      });
    } catch (error: any) {
      toast({
        title: "Download Failed",
        description: error.message || "Failed to download system logs",
        variant: "destructive",
      });
    } finally {
      setIsDownloadingLogs(false);
    }
  };

  const handleCleanTemporaryData = async () => {
    try {
      setIsCleaning(true);
      const token = localStorage.getItem('auth_token');
      
      const response = await fetch('/api/admin/compliance/clean', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to clean temporary data');
      }
      
      const data = await response.json();
      
      toast({
        title: "Cleanup Complete",
        description: `Successfully cleaned ${data.recordsDeleted} temporary records`,
      });
    } catch (error: any) {
      toast({
        title: "Cleanup Failed",
        description: error.message || "Failed to clean temporary data",
        variant: "destructive",
      });
    } finally {
      setIsCleaning(false);
    }
  };

  if (!user || user.role !== 'super_admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-muted-foreground">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto bg-background p-6">
          <div className="max-w-4xl mx-auto space-y-6">
            <div>
              <h1 className="text-2xl font-bold" data-testid="page-title">System Settings</h1>
              <p className="text-muted-foreground">Configure platform-wide settings and security options.</p>
            </div>

            <div className="grid gap-6">
              {/* Security Settings */}
              <Card>
                <CardHeader>
                  <CardTitle>Security Settings</CardTitle>
                  <CardDescription>Configure authentication and security policies</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Require Two-Factor Authentication</Label>
                      <p className="text-sm text-muted-foreground">Force all users to enable 2FA</p>
                    </div>
                    <Switch data-testid="setting-2fa" />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Session Timeout (hours)</Label>
                      <p className="text-sm text-muted-foreground">Automatically log out inactive users</p>
                    </div>
                    <Input 
                      type="number" 
                      defaultValue="8" 
                      className="w-20"
                      data-testid="setting-session-timeout"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Platform Settings */}
              <Card>
                <CardHeader>
                  <CardTitle>Platform Settings</CardTitle>
                  <CardDescription>Configure platform-wide operational settings</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Maintenance Mode</Label>
                      <p className="text-sm text-muted-foreground">Temporarily disable platform access</p>
                    </div>
                    <Switch data-testid="setting-maintenance" />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Default Rate Limit (calls/day)</Label>
                      <p className="text-sm text-muted-foreground">Default call limit for new tenants</p>
                    </div>
                    <Input 
                      type="number" 
                      defaultValue="300" 
                      className="w-24"
                      data-testid="setting-default-rate-limit"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* System Health */}
              <Card>
                <CardHeader>
                  <CardTitle>System Health</CardTitle>
                  <CardDescription>Monitor platform performance and status</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-green-600">99.9%</div>
                      <div className="text-sm text-muted-foreground">Uptime</div>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">145ms</div>
                      <div className="text-sm text-muted-foreground">Avg Response Time</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Actions */}
              <Card>
                <CardHeader>
                  <CardTitle>System Actions</CardTitle>
                  <CardDescription>Perform system-wide maintenance tasks</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-4">
                    <Button 
                      variant="outline" 
                      data-testid="button-backup"
                      onClick={handleCreateBackup}
                      disabled={isBackingUp}
                    >
                      {isBackingUp && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Create System Backup
                    </Button>
                    <Button 
                      variant="outline" 
                      data-testid="button-logs"
                      onClick={handleDownloadLogs}
                      disabled={isDownloadingLogs}
                    >
                      {isDownloadingLogs && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Download System Logs
                    </Button>
                    <Button 
                      variant="outline" 
                      data-testid="button-cleanup"
                      onClick={handleCleanTemporaryData}
                      disabled={isCleaning}
                    >
                      {isCleaning && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Clean Temporary Data
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}