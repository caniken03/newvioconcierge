import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";

export default function SuperAdminDashboard() {
  const { data: tenants = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/admin/tenants'],
  });

  const { data: analytics = {} } = useQuery<any>({
    queryKey: ['/api/admin/dashboard/analytics'],
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

      {/* Tenant Management Table */}
      <Card>
        <div className="px-6 py-4 border-b border-border">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-foreground">Tenant Overview</h3>
            <div className="flex items-center space-x-3">
              <div className="relative">
                <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground text-sm"></i>
                <Input
                  type="text"
                  placeholder="Search tenants..."
                  className="pl-10 pr-4 py-2 text-sm"
                  data-testid="input-search-tenants"
                />
              </div>
              <Link href="/tenants">
                <Button data-testid="button-add-tenant">
                  <i className="fas fa-plus text-sm mr-2"></i>
                  Add Tenant
                </Button>
              </Link>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/30">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Tenant
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Status
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Calls Today
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Success Rate
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Last Active
                </th>
                <th className="text-center px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {tenants.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center">
                    <div className="text-muted-foreground">
                      <i className="fas fa-building text-4xl mb-4"></i>
                      <p className="text-lg font-medium">No tenants found</p>
                      <p className="text-sm">Create your first tenant to get started</p>
                    </div>
                  </td>
                </tr>
              ) : (
                tenants.map((tenant: any) => (
                  <tr key={tenant.id} className="hover:bg-muted/30 transition-colors" data-testid={`row-tenant-${tenant.id}`}>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-primary text-primary-foreground rounded-lg flex items-center justify-center">
                          <span className="text-sm font-semibold">
                            {tenant.name.substring(0, 2).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{tenant.name}</p>
                          <p className="text-xs text-muted-foreground">{tenant.contactEmail}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge
                        variant={tenant.status === 'active' ? 'default' : 'secondary'}
                        className={
                          tenant.status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : tenant.status === 'suspended'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }
                      >
                        {tenant.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-sm text-foreground font-medium">-</td>
                    <td className="px-6 py-4 text-sm text-foreground">-</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {new Date(tenant.updatedAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center space-x-2">
                        <button
                          className="text-muted-foreground hover:text-primary transition-colors"
                          data-testid={`button-view-tenant-${tenant.id}`}
                        >
                          <i className="fas fa-eye text-sm"></i>
                        </button>
                        <button
                          className="text-muted-foreground hover:text-primary transition-colors"
                          data-testid={`button-edit-tenant-${tenant.id}`}
                        >
                          <i className="fas fa-edit text-sm"></i>
                        </button>
                        <button
                          className="text-muted-foreground hover:text-destructive transition-colors"
                          data-testid={`button-pause-tenant-${tenant.id}`}
                        >
                          <i className="fas fa-pause text-sm"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
