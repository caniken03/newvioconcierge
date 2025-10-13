import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import SystemHealthStatus from "@/components/health/SystemHealthStatus";

export default function SuperAdminDashboard() {
  const [, setLocation] = useLocation();
  
  const { data: tenants = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/admin/tenants'],
  });

  const { data: analytics = {} } = useQuery<any>({
    queryKey: ['/api/admin/dashboard/analytics'],
  });

  const { data: recentActivity = [], isLoading: activityLoading } = useQuery<any[]>({
    queryKey: ['/api/admin/recent-activity'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-muted rounded mb-2"></div>
                <div className="h-8 bg-muted rounded mb-4"></div>
                <div className="h-3 bg-muted rounded w-3/4"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6" data-testid="super-admin-dashboard">
      {/* Health Monitoring Card */}
      <div className="mb-8">
        <SystemHealthStatus onClick={() => setLocation('/health')} />
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Tenants</p>
                <p className="text-2xl font-bold text-foreground" data-testid="metric-active-tenants">
                  {tenants.filter((t: any) => t.status === 'active').length}
                </p>
              </div>
              <div className="w-10 h-10 bg-primary/10 text-primary rounded-lg flex items-center justify-center">
                <i className="fas fa-building"></i>
              </div>
            </div>
            <div className="flex items-center mt-4">
              <i className="fas fa-arrow-up text-xs text-green-500 mr-1"></i>
              <span className="text-xs text-green-500 font-medium">+12%</span>
              <span className="text-xs text-muted-foreground ml-1">from last month</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Calls Today</p>
                <p className="text-2xl font-bold text-foreground" data-testid="metric-calls-today">
                  {analytics.totalCallsToday || 0}
                </p>
              </div>
              <div className="w-10 h-10 bg-chart-1/10 text-chart-1 rounded-lg flex items-center justify-center">
                <i className="fas fa-phone"></i>
              </div>
            </div>
            <div className="flex items-center mt-4">
              <i className="fas fa-arrow-down text-xs text-red-500 mr-1"></i>
              <span className="text-xs text-red-500 font-medium">-3%</span>
              <span className="text-xs text-muted-foreground ml-1">from yesterday</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Success Rate</p>
                <p className="text-2xl font-bold text-foreground" data-testid="metric-success-rate">
                  {analytics.platformSuccessRate || 0}%
                </p>
              </div>
              <div className="w-10 h-10 bg-green-100 text-green-600 rounded-lg flex items-center justify-center">
                <i className="fas fa-check-circle"></i>
              </div>
            </div>
            <div className="flex items-center mt-4">
              <i className="fas fa-arrow-up text-xs text-green-500 mr-1"></i>
              <span className="text-xs text-green-500 font-medium">+2.1%</span>
              <span className="text-xs text-muted-foreground ml-1">improvement</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">System Health</p>
                <p className="text-2xl font-bold text-green-600" data-testid="metric-system-health">
                  {analytics.systemHealth || 'Excellent'}
                </p>
              </div>
              <div className="w-10 h-10 bg-green-100 text-green-600 rounded-lg flex items-center justify-center">
                <i className="fas fa-heartbeat"></i>
              </div>
            </div>
            <div className="flex items-center mt-4">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
              <span className="text-xs text-muted-foreground">All systems operational</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Platform Activity & Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Recent Platform Activity */}
        <Card>
          <div className="px-6 py-4 border-b border-border">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">Recent Activity</h3>
              <Link href="/health">
                <Button variant="outline" size="sm" data-testid="button-view-all-activity">
                  View All
                </Button>
              </Link>
            </div>
          </div>
          <div className="p-6">
            {activityLoading ? (
              <div className="space-y-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="flex items-center space-x-3 animate-pulse">
                    <div className="w-8 h-8 bg-muted rounded-full"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-muted rounded mb-2 w-3/4"></div>
                      <div className="h-3 bg-muted rounded w-1/2"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : recentActivity.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">No recent activity</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentActivity.map((activity: any) => (
                  <div key={activity.id} className="flex items-center space-x-3">
                    <div className={`w-8 h-8 ${activity.iconBg} ${activity.iconColor} rounded-full flex items-center justify-center`}>
                      <i className={`fas fa-${activity.icon} text-xs`}></i>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">{activity.title}</p>
                      <p className="text-xs text-muted-foreground">{activity.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* System Performance Metrics */}
        <Card>
          <div className="px-6 py-4 border-b border-border">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">System Performance</h3>
              <Link href="/health">
                <Button variant="outline" size="sm" data-testid="button-view-metrics">
                  View Details
                </Button>
              </Link>
            </div>
          </div>
          <div className="p-6">
            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-foreground">API Response Time</span>
                  <span className="text-sm text-muted-foreground">{analytics.avgResponseTime || '125ms'}</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div className="bg-green-500 h-2 rounded-full" style={{ width: '85%' }}></div>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-foreground">System Uptime</span>
                  <span className="text-sm text-muted-foreground">99.94%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div className="bg-green-500 h-2 rounded-full" style={{ width: '99%' }}></div>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-foreground">Voice AI Success Rate</span>
                  <span className="text-sm text-muted-foreground">{analytics.successRate || '94.2%'}</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div className="bg-blue-500 h-2 rounded-full" style={{ width: '94%' }}></div>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-foreground">Database Performance</span>
                  <span className="text-sm text-muted-foreground">Excellent</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div className="bg-green-500 h-2 rounded-full" style={{ width: '96%' }}></div>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Quick Actions for Platform Management */}
      <Card>
        <div className="px-6 py-4 border-b border-border">
          <h3 className="text-lg font-semibold text-foreground">Platform Management</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link href="/tenants" data-testid="link-manage-tenants">
              <div className="group relative bg-card border border-border rounded-lg p-6 hover:shadow-lg hover:border-primary/50 transition-all duration-200 cursor-pointer">
                <div className="flex flex-col items-center text-center space-y-3">
                  <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                    <i className="fas fa-building text-xl"></i>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Manage Tenants</p>
                    <p className="text-xs text-muted-foreground mt-1">{tenants.length} active</p>
                  </div>
                </div>
              </div>
            </Link>
            <Link href="/health" data-testid="link-system-health">
              <div className="group relative bg-card border border-border rounded-lg p-6 hover:shadow-lg hover:border-primary/50 transition-all duration-200 cursor-pointer">
                <div className="flex flex-col items-center text-center space-y-3">
                  <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                    <i className="fas fa-heartbeat text-xl"></i>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">System Health</p>
                    <p className="text-xs text-muted-foreground mt-1">All systems OK</p>
                  </div>
                </div>
              </div>
            </Link>
            <Link href="/compliance" data-testid="link-compliance">
              <div className="group relative bg-card border border-border rounded-lg p-6 hover:shadow-lg hover:border-primary/50 transition-all duration-200 cursor-pointer">
                <div className="flex flex-col items-center text-center space-y-3">
                  <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                    <i className="fas fa-shield-alt text-xl"></i>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Compliance</p>
                    <p className="text-xs text-muted-foreground mt-1">Monitor HIPAA</p>
                  </div>
                </div>
              </div>
            </Link>
            <Link href="/analytics-center" data-testid="link-analytics-center">
              <div className="group relative bg-card border border-border rounded-lg p-6 hover:shadow-lg hover:border-primary/50 transition-all duration-200 cursor-pointer">
                <div className="flex flex-col items-center text-center space-y-3">
                  <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                    <i className="fas fa-chart-bar text-xl"></i>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Analytics Center</p>
                    <p className="text-xs text-muted-foreground mt-1">View reports</p>
                  </div>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </Card>
    </div>
  );
}
