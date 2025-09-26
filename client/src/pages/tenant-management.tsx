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

  const handleViewTenant = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setIsViewModalOpen(true);
  };

  const handleEditTenant = (tenantId: string) => {
    // Navigate to tenant edit page or open edit modal
    // For now, we'll show a toast indicating the feature
    toast({
      title: "Edit Tenant",
      description: "Tenant editing functionality will be implemented here.",
    });
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
                      placeholder="Search tenants..."
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
                        <td colSpan={5} className="px-6 py-12 text-center">
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
                                data-testid={`button-edit-tenant-${tenant.id}`}
                                title="Edit tenant"
                              >
                                <i className="fas fa-edit text-sm"></i>
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
              {selectedTenant && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Tenant Name</label>
                      <p className="text-sm font-medium">{selectedTenant.name}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Company Name</label>
                      <p className="text-sm">{selectedTenant.companyName || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Contact Email</label>
                      <p className="text-sm">{selectedTenant.contactEmail || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Status</label>
                      <Badge
                        variant={selectedTenant.status === 'active' ? 'default' : 'secondary'}
                        className={
                          selectedTenant.status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : selectedTenant.status === 'suspended'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }
                      >
                        {selectedTenant.status}
                      </Badge>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Created Date</label>
                      <p className="text-sm">{new Date(selectedTenant.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Tenant Number</label>
                      <p className="text-sm">{selectedTenant.tenantNumber || 'N/A'}</p>
                    </div>
                  </div>
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
