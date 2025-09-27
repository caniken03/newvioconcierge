import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import TenantSetupWizard from "@/components/tenant-wizard/TenantSetupWizard";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter 
} from "@/components/ui/dialog";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { Tenant } from "@/types";

// Wizard state management (no form schema needed since wizard handles its own validation)

export default function TenantManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [tenantToDelete, setTenantToDelete] = useState<string | null>(null);

  // Fetch tenants
  const { data: tenants = [], isLoading } = useQuery<Tenant[]>({
    queryKey: ['/api/admin/tenants'],
    enabled: !!user && user.role === 'super_admin',
  });


  // Search tenants
  const { data: searchResults = [], isLoading: searchLoading } = useQuery<Tenant[]>({
    queryKey: ['/api/admin/tenants/search', { q: searchQuery }],
    enabled: !!searchQuery && searchQuery.length > 2,
  });

  // Update tenant status mutation  
  const updateTenantMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      await apiRequest('PATCH', `/api/admin/tenants/${id}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/tenants'] });
      toast({
        title: "Tenant updated",
        description: "Tenant status has been updated.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update tenant",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete tenant mutation
  const deleteTenantMutation = useMutation({
    mutationFn: async (tenantId: string) => {
      await apiRequest('DELETE', `/api/admin/tenants/${tenantId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/tenants'] });
      toast({
        title: "Tenant deleted",
        description: "Tenant has been successfully deleted.",
      });
      setTenantToDelete(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete tenant",
        description: error.message,
        variant: "destructive",
      });
      setTenantToDelete(null);
    },
  });

  const handleStatusChange = (tenantId: string, status: string) => {
    updateTenantMutation.mutate({ id: tenantId, status });
  };

  const handleWizardComplete = () => {
    queryClient.invalidateQueries({ queryKey: ['/api/admin/tenants'] });
  };

  // Fetch detailed tenant information when viewing details
  const { data: tenantDetails, isLoading: isLoadingDetails, error: tenantDetailsError } = useQuery<any>({
    queryKey: ['/api/admin/tenants', selectedTenant?.id, 'details'],
    queryFn: async () => {
      if (!selectedTenant?.id) return null;
      const response = await apiRequest('GET', `/api/admin/tenants/${selectedTenant.id}/details`);
      return response;
    },
    enabled: !!selectedTenant?.id && isViewModalOpen,
  });

  const handleViewTenant = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setIsViewModalOpen(true);
  };

  // Tenant impersonation mutation
  const impersonateTenantMutation = useMutation({
    mutationFn: async (tenantId: string) => {
      const response = await apiRequest('POST', `/api/admin/tenants/${tenantId}/impersonate`);
      return response.json();
    },
    onSuccess: async (response: any) => {
      console.log('Impersonation response:', response); // Debug log
      
      // Handle the response format from backend: { impersonationToken, tenant, ... }
      const token = response?.impersonationToken;
      const tenant = response?.tenant;
      
      if (!token || !tenant) {
        console.error('Invalid impersonation response:', response);
        toast({
          title: "Failed to visit tenant",
          description: "Invalid response from server. Please try again or contact support.",
          variant: "destructive",
        });
        return;
      }

      // Store the impersonation token
      localStorage.setItem('auth_token', token);
      
      // Invalidate auth queries to refresh context
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/tenants'] });
      
      toast({
        title: "Visiting Tenant",
        description: `Now acting as admin for ${tenant.name}. You can make changes on their behalf.`,
      });
      
      // Brief delay then redirect to allow auth context to update
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 100);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to visit tenant",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleEditTenant = (tenantId: string) => {
    // Show confirmation dialog before impersonating
    if (confirm('This will switch your session to act as this tenant\'s administrator. You\'ll be able to access their dashboard and make changes on their behalf. Continue?')) {
      impersonateTenantMutation.mutate(tenantId);
    }
  };

  const handleDeleteTenant = (tenantId: string) => {
    setTenantToDelete(tenantId);
  };

  const confirmDeleteTenant = () => {
    if (tenantToDelete) {
      deleteTenantMutation.mutate(tenantToDelete);
    }
  };

  const displayedTenants = searchQuery.length > 2 ? searchResults : tenants;

  if (!user || user.role !== 'super_admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <i className="fas fa-shield-alt text-6xl text-muted-foreground mb-4"></i>
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
          
          {/* Page Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-foreground mb-2">Tenant Management</h1>
            <p className="text-muted-foreground">Manage all tenants across the platform</p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Tenants</p>
                    <p className="text-2xl font-bold text-foreground" data-testid="stat-total-tenants">
                      {tenants.length}
                    </p>
                  </div>
                  <div className="w-10 h-10 bg-primary/10 text-primary rounded-lg flex items-center justify-center">
                    <i className="fas fa-building"></i>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Active</p>
                    <p className="text-2xl font-bold text-foreground" data-testid="stat-active-tenants">
                      {tenants.filter((t: Tenant) => t.status === 'active').length}
                    </p>
                  </div>
                  <div className="w-10 h-10 bg-green-100 text-green-600 rounded-lg flex items-center justify-center">
                    <i className="fas fa-check-circle"></i>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Suspended</p>
                    <p className="text-2xl font-bold text-foreground" data-testid="stat-suspended-tenants">
                      {tenants.filter((t: Tenant) => t.status === 'suspended').length}
                    </p>
                  </div>
                  <div className="w-10 h-10 bg-yellow-100 text-yellow-600 rounded-lg flex items-center justify-center">
                    <i className="fas fa-pause"></i>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">This Month</p>
                    <p className="text-2xl font-bold text-foreground">
                      {tenants.filter((t: Tenant) => 
                        new Date(t.createdAt).getMonth() === new Date().getMonth()
                      ).length}
                    </p>
                  </div>
                  <div className="w-10 h-10 bg-chart-1/10 text-chart-1 rounded-lg flex items-center justify-center">
                    <i className="fas fa-plus"></i>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tenants Table */}
          <Card>
            <div className="px-6 py-4 border-b border-border">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <h3 className="text-lg font-semibold text-foreground">All Tenants</h3>
                
                <div className="flex items-center space-x-3">
                  {/* Search */}
                  <div className="relative">
                    <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground text-sm"></i>
                    <Input
                      type="text"
                      placeholder="Search by name, company, email or tenant number..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 pr-4 py-2 text-sm w-64"
                      data-testid="input-search-tenants"
                    />
                  </div>

                  <Button 
                    onClick={() => setIsWizardOpen(true)}
                    data-testid="button-create-tenant"
                  >
                    <i className="fas fa-plus text-sm mr-2"></i>
                    Create New Tenant
                  </Button>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              {isLoading || (searchQuery.length > 2 && searchLoading) ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Loading tenants...</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead className="bg-muted/30">
                    <tr>
                      <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Tenant
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Tenant #
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Status
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Created
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Activity
                      </th>
                      <th className="text-center px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {displayedTenants.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center">
                          <div className="text-muted-foreground">
                            <i className="fas fa-building text-4xl mb-4"></i>
                            <p className="text-lg font-medium mb-2">No tenants found</p>
                            <p className="text-sm">
                              {searchQuery 
                                ? "Try adjusting your search terms"
                                : "Create your first tenant to get started"
                              }
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      displayedTenants.map((tenant: Tenant) => (
                        <tr 
                          key={tenant.id} 
                          className="hover:bg-muted/30 transition-colors"
                          data-testid={`row-tenant-${tenant.id}`}
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 bg-primary text-primary-foreground rounded-lg flex items-center justify-center">
                                <span className="text-sm font-semibold">
                                  {tenant.name.substring(0, 2).toUpperCase()}
                                </span>
                              </div>
                              <div>
                                <p className="font-medium text-foreground">{tenant.name}</p>
                                {tenant.companyName && (
                                  <p className="text-sm text-muted-foreground">{tenant.companyName}</p>
                                )}
                                {tenant.contactEmail && (
                                  <p className="text-xs text-muted-foreground">{tenant.contactEmail}</p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm">
                              <span className="font-mono text-muted-foreground" data-testid={`text-tenant-number-${tenant.id}`}>
                                {tenant.tenantNumber || 'Not assigned'}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <Select
                              value={tenant.status}
                              onValueChange={(value) => handleStatusChange(tenant.id, value)}
                            >
                              <SelectTrigger className="w-32">
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
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="suspended">Suspended</SelectItem>
                                <SelectItem value="inactive">Inactive</SelectItem>
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="px-6 py-4 text-sm text-muted-foreground">
                            {new Date(tenant.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm">
                              <div className="flex items-center space-x-2">
                                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                <span className="text-muted-foreground">Active today</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <div className="flex items-center justify-center space-x-2">
                              <button
                                onClick={() => handleViewTenant(tenant)}
                                className="text-muted-foreground hover:text-primary transition-colors"
                                data-testid={`button-view-tenant-${tenant.id}`}
                                title="View details"
                              >
                                <i className="fas fa-eye text-sm"></i>
                              </button>
                              <button
                                onClick={() => handleEditTenant(tenant.id)}
                                className="text-muted-foreground hover:text-primary transition-colors"
                                data-testid={`button-visit-tenant-${tenant.id}`}
                                title="Visit tenant (impersonate as admin)"
                                disabled={impersonateTenantMutation.isPending}
                              >
                                <i className={`fas ${impersonateTenantMutation.isPending ? 'fa-spinner fa-spin' : 'fa-sign-in-alt'} text-sm`}></i>
                              </button>
                              <button
                                onClick={() => handleDeleteTenant(tenant.id)}
                                className="text-muted-foreground hover:text-destructive transition-colors"
                                data-testid={`button-delete-tenant-${tenant.id}`}
                                title="Delete tenant"
                              >
                                <i className="fas fa-trash text-sm"></i>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </Card>

          {/* 7-Step Tenant Creation Wizard */}
          <TenantSetupWizard
            isOpen={isWizardOpen}
            onClose={() => setIsWizardOpen(false)}
            onComplete={handleWizardComplete}
          />

          {/* Tenant Details Modal */}
          <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Tenant Details</DialogTitle>
              </DialogHeader>
              {isLoadingDetails ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  <span className="ml-2 text-muted-foreground">Loading tenant details...</span>
                </div>
              ) : tenantDetails ? (
                <div className="space-y-6 max-h-[70vh] overflow-y-auto">
                  {/* Basic Information */}
                  <div>
                    <h4 className="font-semibold text-lg mb-3 border-b pb-2">Basic Information</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Tenant Name</label>
                        <p className="text-sm font-medium">{tenantDetails.name}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Company Name</label>
                        <p className="text-sm">{tenantDetails.companyName || 'N/A'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Contact Email</label>
                        <p className="text-sm">{tenantDetails.contactEmail || 'N/A'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Status</label>
                        <Badge
                          variant={tenantDetails.status === 'active' ? 'default' : 'secondary'}
                          className={
                            tenantDetails.status === 'active'
                              ? 'bg-green-100 text-green-800'
                              : tenantDetails.status === 'suspended'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }
                        >
                          {tenantDetails.status}
                        </Badge>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Created Date</label>
                        <p className="text-sm">{new Date(tenantDetails.createdAt).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Tenant ID</label>
                        <p className="text-sm font-mono text-blue-600">{tenantDetails.id}</p>
                      </div>
                    </div>
                  </div>

                  {/* Configuration Status */}
                  <div>
                    <h4 className="font-semibold text-lg mb-3 border-b pb-2">Configuration Status</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Retell AI Integration</span>
                          <Badge variant={tenantDetails.configuration?.retellConfigured ? "default" : "secondary"}>
                            {tenantDetails.configuration?.retellConfigured ? "✓ Configured" : "✗ Not Set"}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Calendar Integration</span>
                          <Badge variant={tenantDetails.configuration?.calendarConfigured ? "default" : "secondary"}>
                            {tenantDetails.configuration?.calendarConfigured ? "✓ Configured" : "✗ Not Set"}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Business Hours</span>
                          <Badge variant={tenantDetails.configuration?.businessHoursConfigured ? "default" : "secondary"}>
                            {tenantDetails.configuration?.businessHoursConfigured ? "✓ Set" : "✗ Default"}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Webhooks</span>
                          <Badge variant={tenantDetails.configuration?.webhooksConfigured ? "default" : "secondary"}>
                            {tenantDetails.configuration?.webhooksConfigured ? "✓ Active" : "✗ None"}
                          </Badge>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Timezone</label>
                          <p className="text-sm">{tenantDetails.configuration?.timezone || 'N/A'}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Business Type</label>
                          <p className="text-sm capitalize">{tenantDetails.configuration?.businessType || 'N/A'}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Call Limits</label>
                          <p className="text-sm">{tenantDetails.configuration?.maxCallsPer15Min || 'N/A'}/15min, {tenantDetails.configuration?.maxCallsPerDay || 'N/A'}/day</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Quiet Hours</label>
                          <p className="text-sm">{tenantDetails.configuration?.quietHours || 'N/A'}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Users & Activity */}
                  <div>
                    <h4 className="font-semibold text-lg mb-3 border-b pb-2">Users & Activity</h4>
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">User Statistics</label>
                          <div className="mt-1 space-y-1">
                            <p className="text-sm">👥 Total Users: <span className="font-medium">{tenantDetails.users?.total || 0}</span></p>
                            <p className="text-sm">👑 Admin Users: <span className="font-medium">{tenantDetails.users?.admins || 0}</span></p>
                            <p className="text-sm">👤 Regular Users: <span className="font-medium">{tenantDetails.users?.regular || 0}</span></p>
                          </div>
                        </div>
                        {tenantDetails.users?.adminEmails && tenantDetails.users.adminEmails.length > 0 && (
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">Admin Contacts</label>
                            <div className="mt-1 space-y-1">
                              {tenantDetails.users.adminEmails?.map((email: string, idx: number) => (
                                <p key={idx} className="text-xs text-blue-600">{email}</p>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="space-y-3">
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Activity Overview</label>
                          <div className="mt-1 space-y-1">
                            <p className="text-sm">📞 Total Contacts: <span className="font-medium">{tenantDetails.activity?.totalContacts || 0}</span></p>
                            <p className="text-sm">📈 Recent Calls (30d): <span className="font-medium">{tenantDetails.activity?.recentCalls || 0}</span></p>
                            {tenantDetails.activity?.lastActivity && (
                              <p className="text-sm">⏰ Last Activity: <span className="font-medium">{new Date(tenantDetails.activity.lastActivity).toLocaleDateString()}</span></p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Integrations */}
                  <div>
                    <h4 className="font-semibold text-lg mb-3 border-b pb-2">Integration Details</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Retell AI Voice</label>
                        {tenantDetails.integrations?.retell?.configured ? (
                          <div className="mt-1 space-y-1">
                            <p className="text-xs">🤖 Agent ID: <span className="font-mono">{tenantDetails.integrations?.retell?.agentId || 'N/A'}</span></p>
                            {tenantDetails.integrations?.retell?.phoneNumber && (
                              <p className="text-xs">📞 Phone: <span className="font-mono">{tenantDetails.integrations.retell.phoneNumber}</span></p>
                            )}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground mt-1">Not configured</p>
                        )}
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Calendar System</label>
                        {tenantDetails.integrations?.calendar?.configured ? (
                          <div className="mt-1">
                            <p className="text-xs">🗓️ Type: <span className="font-medium">{tenantDetails.integrations?.calendar?.type || 'N/A'}</span></p>
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground mt-1">Not configured</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Health Score */}
                  <div>
                    <h4 className="font-semibold text-lg mb-3 border-b pb-2">Health Score</h4>
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <p className="text-sm font-medium">Configuration Completeness</p>
                        <p className="text-xs text-muted-foreground">{tenantDetails.health?.configurationScore || 0}/{tenantDetails.health?.totalConfigurationItems || 0} items configured</p>
                      </div>
                      <div className="text-right">
                        <Badge 
                          variant={(tenantDetails.health?.configurationScore || 0) >= 3 ? "default" : (tenantDetails.health?.configurationScore || 0) >= 2 ? "secondary" : "destructive"}
                          className={
                            (tenantDetails.health?.configurationScore || 0) >= 3 
                              ? 'bg-green-100 text-green-800'
                              : (tenantDetails.health?.configurationScore || 0) >= 2
                              ? 'bg-yellow-100 text-yellow-800' 
                              : 'bg-red-100 text-red-800'
                          }
                        >
                          {Math.round(((tenantDetails.health?.configurationScore || 0) / (tenantDetails.health?.totalConfigurationItems || 1)) * 100)}% Complete
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              ) : selectedTenant && (
                <div className="text-center py-8 text-muted-foreground">
                  Failed to load tenant details
                </div>
              )}
              <DialogFooter>
                <Button onClick={() => setIsViewModalOpen(false)}>
                  Close
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Delete Confirmation Dialog */}
          <AlertDialog open={!!tenantToDelete} onOpenChange={() => setTenantToDelete(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete the tenant
                  and all associated data.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={confirmDeleteTenant}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  disabled={deleteTenantMutation.isPending}
                >
                  {deleteTenantMutation.isPending ? 'Deleting...' : 'Delete'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </main>
      </div>
    </div>
  );
}
